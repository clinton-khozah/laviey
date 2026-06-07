import { MEETING_LANGUAGES, type MeetingLanguageCode } from './meetingLanguages';

export type MeetingStringKey =
  | 'live'
  | 'youAreHosting'
  | 'withHost'
  | 'host'
  | 'you'
  | 'startingCamera'
  | 'muteMic'
  | 'unmuteMic'
  | 'cameraOff'
  | 'cameraOn'
  | 'leave'
  | 'leaveMeetup'
  | 'captionsOn'
  | 'captionsOff'
  | 'captionLanguage'
  | 'autoTranslatedFrom'
  | 'doubleDate'
  | 'oneOnOne';

const STRINGS: Record<MeetingStringKey, Record<MeetingLanguageCode, string>> = {
  live: {
    en: 'Live',
    es: 'En vivo',
    fr: 'En direct',
    de: 'Live',
    pt: 'Ao vivo',
    ja: 'ライブ',
    ko: '라이브',
    zh: '直播',
  },
  youAreHosting: {
    en: 'You are hosting',
    es: 'Tú organizas',
    fr: 'Vous animez',
    de: 'Du hostest',
    pt: 'Você está hospedando',
    ja: 'あなたがホスト',
    ko: '호스트 중',
    zh: '你正在主持',
  },
  withHost: {
    en: 'With {name}',
    es: 'Con {name}',
    fr: 'Avec {name}',
    de: 'Mit {name}',
    pt: 'Com {name}',
    ja: '{name}と',
    ko: '{name}와 함께',
    zh: '与 {name}',
  },
  host: {
    en: 'Host',
    es: 'Anfitrión',
    fr: 'Hôte',
    de: 'Host',
    pt: 'Anfitrião',
    ja: 'ホスト',
    ko: '호스트',
    zh: '主持人',
  },
  you: {
    en: 'You',
    es: 'Tú',
    fr: 'Vous',
    de: 'Du',
    pt: 'Você',
    ja: 'あなた',
    ko: '나',
    zh: '你',
  },
  startingCamera: {
    en: 'Starting camera…',
    es: 'Iniciando cámara…',
    fr: 'Démarrage de la caméra…',
    de: 'Kamera wird gestartet…',
    pt: 'Iniciando câmera…',
    ja: 'カメラを起動中…',
    ko: '카메라 시작 중…',
    zh: '正在启动摄像头…',
  },
  muteMic: {
    en: 'Mute microphone',
    es: 'Silenciar micrófono',
    fr: 'Couper le micro',
    de: 'Mikrofon stummschalten',
    pt: 'Silenciar microfone',
    ja: 'マイクをミュート',
    ko: '마이크 음소거',
    zh: '静音麦克风',
  },
  unmuteMic: {
    en: 'Unmute microphone',
    es: 'Activar micrófono',
    fr: 'Activer le micro',
    de: 'Mikrofon aktivieren',
    pt: 'Ativar microfone',
    ja: 'マイクをオン',
    ko: '마이크 켜기',
    zh: '取消静音',
  },
  cameraOff: {
    en: 'Turn off camera',
    es: 'Apagar cámara',
    fr: 'Désactiver la caméra',
    de: 'Kamera ausschalten',
    pt: 'Desligar câmera',
    ja: 'カメラをオフ',
    ko: '카메라 끄기',
    zh: '关闭摄像头',
  },
  cameraOn: {
    en: 'Turn on camera',
    es: 'Encender cámara',
    fr: 'Activer la caméra',
    de: 'Kamera einschalten',
    pt: 'Ligar câmera',
    ja: 'カメラをオン',
    ko: '카메라 켜기',
    zh: '打开摄像头',
  },
  leave: {
    en: 'Leave',
    es: 'Salir',
    fr: 'Quitter',
    de: 'Verlassen',
    pt: 'Sair',
    ja: '退出',
    ko: '나가기',
    zh: '离开',
  },
  leaveMeetup: {
    en: 'Leave meetup',
    es: 'Salir del encuentro',
    fr: 'Quitter le rendez-vous',
    de: 'Meetup verlassen',
    pt: 'Sair do encontro',
    ja: 'ミートアップを退出',
    ko: '미팅 나가기',
    zh: '离开约会',
  },
  captionsOn: {
    en: 'Subtitles on',
    es: 'Subtítulos activados',
    fr: 'Sous-titres activés',
    de: 'Untertitel ein',
    pt: 'Legendas ativadas',
    ja: '字幕オン',
    ko: '자막 켜짐',
    zh: '字幕已开启',
  },
  captionsOff: {
    en: 'Subtitles off',
    es: 'Subtítulos desactivados',
    fr: 'Sous-titres désactivés',
    de: 'Untertitel aus',
    pt: 'Legendas desativadas',
    ja: '字幕オフ',
    ko: '자막 꺼짐',
    zh: '字幕已关闭',
  },
  captionLanguage: {
    en: 'Subtitle language',
    es: 'Idioma de subtítulos',
    fr: 'Langue des sous-titres',
    de: 'Untertitelsprache',
    pt: 'Idioma das legendas',
    ja: '字幕の言語',
    ko: '자막 언어',
    zh: '字幕语言',
  },
  autoTranslatedFrom: {
    en: 'Auto-translated from {lang}',
    es: 'Traducción automática del {lang}',
    fr: 'Traduit automatiquement depuis le {lang}',
    de: 'Automatisch übersetzt aus {lang}',
    pt: 'Traduzido automaticamente do {lang}',
    ja: '{lang}から自動翻訳',
    ko: '{lang}에서 자동 번역',
    zh: '自动翻译自{lang}',
  },
  doubleDate: {
    en: 'Double date',
    es: 'Cita doble',
    fr: 'Double rendez-vous',
    de: 'Doppel-Date',
    pt: 'Encontro duplo',
    ja: 'ダブルデート',
    ko: '더블 데이트',
    zh: '双人约会',
  },
  oneOnOne: {
    en: '1-on-1',
    es: 'Uno a uno',
    fr: 'En tête-à-tête',
    de: '1-zu-1',
    pt: 'Um a um',
    ja: '1対1',
    ko: '1:1',
    zh: '一对一',
  },
};

export function meetingString(
  key: MeetingStringKey,
  lang: MeetingLanguageCode,
  vars?: Record<string, string>,
): string {
  let text = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function sourceLanguageLabel(code: MeetingLanguageCode): string {
  return MEETING_LANGUAGES.find((l) => l.code === code)?.label ?? 'English';
}
