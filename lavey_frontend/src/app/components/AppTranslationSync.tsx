import { useEffect, useRef } from 'react';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import { useMeetingLanguage } from '@/hooks';
import { appTranslationService } from '@/services/translation/appTranslationService';

const SKIPPED_SELECTOR = [
  '[data-no-translate]',
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'input',
  'textarea',
  'select',
  'option',
  '[contenteditable="true"]',
].join(',');

const HAS_WORDS = /[\p{L}]/u;

function decodeGoogleText(value: string): string {
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
}

function shouldTranslate(node: Text): boolean {
  const parent = node.parentElement;
  const value = node.nodeValue?.trim() ?? '';
  return Boolean(parent && value && value.length <= 500 && HAS_WORDS.test(value) && !parent.closest(SKIPPED_SELECTOR));
}

export function AppTranslationSync() {
  const { language } = useMeetingLanguage();
  const originalsRef = useRef(new WeakMap<Text, string>());
  const renderedRef = useRef(new WeakMap<Text, string>());
  const trackedRef = useRef(new Set<Text>());
  const cacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    document.documentElement.lang = language;
    let disposed = false;
    let timer: number | null = null;
    let requestVersion = 0;

    const restoreEnglish = () => {
      trackedRef.current.forEach((node) => {
        if (!node.isConnected) {
          trackedRef.current.delete(node);
          return;
        }
        const original = originalsRef.current.get(node);
        const rendered = renderedRef.current.get(node);
        if (original !== undefined && rendered !== undefined && node.nodeValue === rendered) {
          node.nodeValue = original;
        }
        renderedRef.current.delete(node);
      });
    };

    if (language === 'en') {
      restoreEnglish();
      return;
    }

    const translateVisibleText = async () => {
      const root = document.getElementById('root');
      if (!root || disposed) return;
      const version = ++requestVersion;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodesByText = new Map<string, Text[]>();
      let current = walker.nextNode() as Text | null;

      while (current) {
        if (shouldTranslate(current)) {
          const rendered = renderedRef.current.get(current);
          if (rendered === undefined || current.nodeValue !== rendered) {
            originalsRef.current.set(current, current.nodeValue ?? '');
          }
          trackedRef.current.add(current);
          const original = originalsRef.current.get(current) ?? current.nodeValue ?? '';
          const source = original.trim();
          const cached = cacheRef.current.get(`${language}:${source}`);
          if (cached !== undefined) {
            const translatedValue = original.replace(source, cached);
            if (current.nodeValue !== translatedValue) current.nodeValue = translatedValue;
            renderedRef.current.set(current, translatedValue);
          } else {
            const group = nodesByText.get(source) ?? [];
            group.push(current);
            nodesByText.set(source, group);
          }
        }
        current = walker.nextNode() as Text | null;
      }

      const sources = [...nodesByText.keys()];
      for (let start = 0; start < sources.length; start += 80) {
        const batch = sources.slice(start, start + 80);
        try {
          const translated = await appTranslationService.translate(
            batch,
            language as Exclude<MeetingLanguageCode, 'en'>,
          );
          if (disposed || version !== requestVersion) return;
          batch.forEach((source, index) => {
            const result = decodeGoogleText(translated[index] ?? source);
            cacheRef.current.set(`${language}:${source}`, result);
            nodesByText.get(source)?.forEach((node) => {
              if (!node.isConnected) return;
              const original = originalsRef.current.get(node) ?? node.nodeValue ?? '';
              const translatedValue = original.replace(source, result);
              node.nodeValue = translatedValue;
              renderedRef.current.set(node, translatedValue);
            });
          });
        } catch (error) {
          console.warn('App translation is unavailable; keeping the original interface text.', error);
          return;
        }
      }
    };

    const scheduleTranslation = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void translateVisibleText(), 120);
    };

    const observer = new MutationObserver(scheduleTranslation);
    observer.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    scheduleTranslation();

    return () => {
      disposed = true;
      requestVersion += 1;
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [language]);

  return null;
}
