import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';

export interface MeetingCaptionLine {
  id: string;
  speakerName: string;
  /** Language the speaker is assumed to be using */
  sourceLang: MeetingLanguageCode;
  text: Record<MeetingLanguageCode, string>;
}

export const MOCK_MEETING_CAPTIONS: MeetingCaptionLine[] = [
  {
    id: 'c1',
    speakerName: 'Host',
    sourceLang: 'en',
    text: {
      en: 'Hey! So glad you made it — how’s your day going?',
      es: '¡Hola! Me alegra que hayas venido — ¿cómo va tu día?',
      fr: 'Salut ! Content que tu sois là — comment se passe ta journée ?',
      de: 'Hey! Schön, dass du da bist — wie läuft dein Tag?',
      pt: 'Oi! Que bom que você veio — como está seu dia?',
      ja: 'やあ！来てくれて嬉しいよ — 今日はどう？',
      ko: '안녕! 와줘서 반가워 — 오늘 어때?',
      zh: '嗨！很高兴你来了——今天过得怎么样？',
    },
  },
  {
    id: 'c2',
    speakerName: 'You',
    sourceLang: 'en',
    text: {
      en: 'Pretty good! I love the vibe of this meetup.',
      es: '¡Muy bien! Me encanta el ambiente de este encuentro.',
      fr: 'Plutôt bien ! J’adore l’ambiance de ce rendez-vous.',
      de: 'Ganz gut! Ich mag die Stimmung hier.',
      pt: 'Muito bem! Adoro a vibe deste encontro.',
      ja: 'いい感じ！このミートアップの雰囲気が好き。',
      ko: '꽤 좋아! 이 미팅 분위기 마음에 들어.',
      zh: '挺好的！我很喜欢这次聚会的氛围。',
    },
  },
  {
    id: 'c3',
    speakerName: 'Host',
    sourceLang: 'en',
    text: {
      en: 'Same here. Want to swap a fun fact before we dive in?',
      es: 'Igual. ¿Intercambiamos un dato curioso antes de empezar?',
      fr: 'Pareil. On échange un fun fact avant de commencer ?',
      de: 'Geht mir auch so. Lust auf einen Fun Fact zum Start?',
      pt: 'Também. Quer trocar uma curiosidade antes de começar?',
      ja: '私も。始める前に面白い事実を交換しない？',
      ko: '나도. 시작 전에 재밌는 사실 하나 바꿀래?',
      zh: '我也是。开始前要不要互相分享一个有趣的事实？',
    },
  },
  {
    id: 'c4',
    speakerName: 'You',
    sourceLang: 'en',
    text: {
      en: 'Sure — I once hiked at sunrise just for the coffee after.',
      es: 'Claro — una vez caminé al amanecer solo por el café después.',
      fr: 'OK — j’ai déjà fait une rando à l’aube juste pour le café après.',
      de: 'Klar — ich bin schon mal bei Sonnenaufgang gewandert, nur für den Kaffee danach.',
      pt: 'Claro — já fiz trilha ao nascer do sol só pelo café depois.',
      ja: 'いいよ — 一度、後のコーヒーのために日の出ハイキングした。',
      ko: '좋아 — 한번은 일출 등산 후 커피 때문에 갔어.',
      zh: '好啊——我有一次为了之后的咖啡去看了日出徒步。',
    },
  },
];

export function getCaptionText(line: MeetingCaptionLine, lang: MeetingLanguageCode): string {
  return line.text[lang] ?? line.text.en;
}
