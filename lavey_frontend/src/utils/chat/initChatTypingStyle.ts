import { applyChatTypingStyleToDocument, loadChatTypingStyle } from './chatTypingStyleStorage';

/** Apply saved chat typing style before first paint */
export function initChatTypingStyle(): void {
  applyChatTypingStyleToDocument(loadChatTypingStyle());
}
