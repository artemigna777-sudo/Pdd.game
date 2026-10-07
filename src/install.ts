/**
 * Как добавить игру на главный экран: где она открыта (Safari, другой браузер на iPhone, Android,
 * браузер внутри TikTok и т. п.) и что для этого нажать. Без DOM — проверяется автотестами.
 */
import { GAME_TITLE } from './config.ts';

export type InstallPlatform = 'installed' | 'in-app-ios' | 'in-app-android' | 'ios-safari' | 'ios-other' | 'android' | 'desktop';

/** Приложения со своим встроенным браузером: из него игру на главный экран не добавить. */
const IN_APP: [RegExp, string][] = [
  [/musical_ly|BytedanceWebview|TikTok|trill_/i, 'TikTok'],
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/Telegram/i, 'Telegram'],
  [/VKAndroidApp|vkclient|com\.vk\./i, 'VK'],
  [/Snapchat/i, 'Snapchat'],
  [/Pinterest/i, 'Pinterest'],
  [/\bLine\//, 'LINE'],
];

export interface Device {
  ua: string;
  /** Открыта с главного экрана. */
  standalone: boolean;
  /** iPad в режиме «как на компьютере» называет себя Mac, но у него сенсорный экран. */
  touchMac?: boolean;
}

export const isIosUa = (d: Device) => /iphone|ipad|ipod/i.test(d.ua) || Boolean(d.touchMac && /Macintosh/.test(d.ua));

/** Приложение, внутри которого открыта игра, если это не настоящий браузер. */
export function inAppName(ua: string): string | undefined {
  return IN_APP.find(([re]) => re.test(ua))?.[1];
}

export function detectPlatform(d: Device): InstallPlatform {
  if (d.standalone) return 'installed';
  const ios = isIosUa(d);
  const android = /Android/i.test(d.ua);
  if (ios) {
    if (inAppName(d.ua)) return 'in-app-ios';
    // Другие браузеры на iPhone называют себя по-своему.
    if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/i.test(d.ua)) return 'ios-other';
    // У Safari в описании есть «Safari/», у встроенных браузеров приложений — нет.
    return /Safari\//.test(d.ua) ? 'ios-safari' : 'in-app-ios';
  }
  if (android) {
    // «; wv)» — встроенный браузер Android (WebView) любого приложения.
    if (inAppName(d.ua) || /;\s*wv\)/.test(d.ua)) return 'in-app-android';
    return 'android';
  }
  return 'desktop';
}

/** Показывать ли подсказку про главный экран: только на телефоне и только не с главного экрана. */
export const canAddToHomeScreen = (p: InstallPlatform) => p !== 'installed' && p !== 'desktop';

export interface InstallGuide {
  /** Первая строка: что сделать в целом. */
  lead: string;
  steps: string[];
  /** Кнопка «Установить» (системное окно Chrome). */
  prompt?: boolean;
  /** Кнопка «Скопировать ссылку», если пункта «Открыть в браузере» нет. */
  copyLink?: boolean;
  /** Прогресс отсюда на главный экран сам не переедет. */
  progressNote?: boolean;
}

export const INSTALL_BENEFIT = 'С главного экрана игра открывается в одно касание, на весь экран и без интернета.';
export const SAFARI_BENEFIT = 'И Safari не сотрёт прогресс, если долго не заходить.';
export const PROGRESS_NOTE =
  'Прогресс отсюда на главный экран сам не переедет. Сохрани его в файл («Настройки» → «Резервная копия» → «Сохранить прогресс в файл») и восстанови уже в игре с главного экрана.';

const HOME = '«На экран „Домой“»';
const SHARE = '«Поделиться» (квадрат со стрелкой)';
const icon = `На экране появится значок «${GAME_TITLE}».`;

/**
 * Инструкция для этого телефона. `canPrompt` — Chrome уже готов показать своё окно установки,
 * `answered` — сколько вопросов игрок уже ответил здесь (тогда предупредить про прогресс).
 */
export function installGuide(platform: InstallPlatform, opts: { canPrompt?: boolean; app?: string; answered?: number } = {}): InstallGuide {
  const inside = opts.app ? `внутри ${opts.app}` : 'внутри приложения';
  const hasProgress = (opts.answered ?? 0) > 0;
  switch (platform) {
    case 'in-app-ios':
      return {
        lead: `Ссылка открылась ${inside}. Сначала открой игру в Safari:`,
        steps: ['Нажми «⋯» в углу экрана и выбери «Открыть в браузере».', `В Safari нажми ${SHARE} → ${HOME} → «Добавить».`],
        copyLink: true,
        progressNote: hasProgress,
      };
    case 'in-app-android':
      return {
        lead: `Ссылка открылась ${inside}. Сначала открой игру в Chrome:`,
        steps: ['Нажми «⋮» или «⋯» в углу экрана и выбери «Открыть в браузере».', 'В Chrome открой меню «⋮» → «Установить приложение» или «Добавить на главный экран».'],
        copyLink: true,
        progressNote: hasProgress,
      };
    case 'ios-safari':
      return {
        lead: 'Три касания в Safari:',
        steps: [`Нажми ${SHARE} внизу экрана. Не видно — сначала нажми «⋯».`, `Пролистай список вниз и выбери ${HOME}.`, `Нажми «Добавить». ${icon}`],
        progressNote: hasProgress,
      };
    case 'ios-other':
      return {
        lead: 'Три касания в браузере:',
        steps: [
          `Нажми ${SHARE} в адресной строке или в меню «⋯».`,
          `Выбери ${HOME} и нажми «Добавить». ${icon}`,
          'Нет такого пункта — открой игру в Safari и добавь оттуда.',
        ],
        copyLink: true,
        progressNote: hasProgress,
      };
    case 'android':
      return {
        lead: opts.canPrompt ? 'Нажми «Установить» — Chrome сам добавит игру на главный экран.' : 'Три касания в браузере:',
        steps: [
          'Открой меню браузера — «⋮» вверху справа (в Samsung Internet — «≡» внизу).',
          'Выбери «Установить приложение» или «Добавить на главный экран».',
          `Подтверди. ${icon}`,
        ],
        prompt: opts.canPrompt,
      };
    default:
      return { lead: '', steps: [] };
  }
}
