/**
 * Кат-сцены сюжета (этап 18): на весь экран, по рисованным кадрам, с движением камеры, светом,
 * дождём, искрами и звуком; реплики — субтитрами снизу, выбор выезжает в конце.
 *
 * Кадры нарисованы в Gemini по просьбе Артёма (герои — по листам персонажей с портретами из игры),
 * подготовлены скриптом `scripts/scene-art.py` и лежат в `public/scenes/<глава>/` (WebP, ~1 МБ на главу).
 * Оживляет их код: слои, камера и эффекты — элементы с CSS-классами `f-…` (`style.css`), шаги анимации
 * (Web Animations) находят их по классу. Кадр сцены без анимаций — её последний кадр: если анимации
 * выключены («Уменьшить движение»), видна итоговая картинка.
 *
 * Положения — в процентах «сцены» 9:16 (`.f-stage`), которая растягивается на весь экран с обрезкой краёв.
 */
import type { SoundName } from '../audio/feedback.ts';

/** Шаг анимации: элементы по CSS-классу, ключевые кадры, время в секундах. */
export interface FilmStep {
  /** `.класс` — все элементы сцены с этим классом. */
  sel: string;
  at: number;
  dur: number;
  kf: Keyframe[];
  ease?: string;
  /** Повторов (по умолчанию 1); `Infinity` — пока сцена на экране. */
  times?: number;
  /** Туда-обратно (для повторов). */
  alt?: boolean;
}

export interface Film {
  /** Что происходит — для экранного диктора. */
  title: string;
  /** Разметка сцены (внутри `.f-stage`). */
  html: string;
  /** Картинки сцены — заранее загрузить, чтобы кадр не появлялся пустым. */
  images: string[];
  steps: FilmStep[];
  sounds?: { at: number; name: SoundName }[];
}

/** Адрес сайта (на GitHub Pages — `/Pdd.game/`); в тестах без Vite — корень. */
const BASE: string = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
export const sceneArt = (chapter: string, name: string) => `${BASE}scenes/${chapter}/${name}.webp`;

const ch3 = (name: string) => sceneArt('ch3', name);
/** Кадр во весь экран. */
const full = (src: string, cls = '') => `<img class="f-full ${cls}" src="${src}" alt="" draggable="false" decoding="async">`;
/** Вырезанный слой (персонаж, машина): положение и ширина в процентах сцены. */
const layer = (src: string, cls: string, style: string) => `<img class="f-l ${cls}" src="${src}" alt="" draggable="false" decoding="async" style="${style}">`;
/** Свечение: центр (x, y) и диаметр в процентах ширины сцены. */
const glow = (cls: string, x: number, y: number, size: number, color: string) => `<div class="f-glow ${cls}" style="left:${x}%;top:${y}%;width:${size}%;--c:${color}"></div>`;
/** Искорка-блик. */
const spark = (cls: string, x: number, y: number, size = 7) => `<div class="f-spark ${cls}" style="left:${x}%;top:${y}%;width:${size}%"></div>`;
const shot = (cls: string, origin: string, body: string, after = '') => `<div class="f-shot ${cls}"><div class="f-cam ${cls}-cam" style="transform-origin:${origin}">${body}</div>${after}</div>`;

const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const zoom = (from: number, to: number): Keyframe[] => [{ transform: `scale(${from})` }, { transform: `scale(${to})` }];
const twinkle: Keyframe[] = [
  { opacity: 0, transform: 'scale(0.2) rotate(0deg)' },
  { opacity: 1, transform: 'scale(1) rotate(45deg)' },
];
const pulse = (lo: number, hi: number): Keyframe[] => [{ opacity: lo }, { opacity: hi }];

// ─── Глава 3: Артёма зовут в «Турбо» ──────────────────────────────────────────

/** Разговор: внедорожник «Турбо» подъезжает к Артёму, Турбин с ключами, Артём загорелся, печать. */
const OFFER: Film = {
  title: 'Ночь у «Стрелы». К Артёму подъезжает чёрный внедорожник с оранжевой молнией. Турбин в окне покачивает ключами от нового мопеда. У Артёма загораются глаза. «Правила — для медленных».',
  images: ['street', 'suv', 'artem-moped', 'turbin', 'artem-close'].map(ch3),
  html: `<div class="f-shake">
    ${shot(
      'f-s1',
      '42% 62%',
      `${full(ch3('street'))}
      ${glow('f-lamp', 73, 22, 48, 'rgba(255,214,140,.5)')}
      <div class="f-l f-suv" style="left:37%;bottom:15%;width:92%"><img class="f-fill" src="${ch3('suv')}" alt="" draggable="false" decoding="async"><div class="f-beam"></div></div>
      ${layer(ch3('artem-moped'), 'f-artem', 'left:-6%;bottom:3%;width:64%')}`,
      '<div class="f-rain"></div>',
    )}
    ${shot('f-s2', '60% 36%', `${full(ch3('turbin'))}${glow('f-neon', 14, 18, 80, 'rgba(255,120,30,.32)')}${spark('f-key', 37.5, 73.5, 9)}`)}
    ${shot('f-s3', '60% 47%', `${full(ch3('artem-close'))}${spark('f-eye', 47, 46.5, 6)}${spark('f-eye', 73, 46.5, 6)}`, '<div class="f-dim"></div>')}
    <div class="f-stamp"><span>Правила — для медленных</span></div>
  </div>`,
  steps: [
    // Улица: камера медленно наезжает, фонарь дышит, справа въезжает и тормозит внедорожник.
    { sel: '.f-s1-cam', at: 0, dur: 3.6, kf: zoom(1, 1.07), ease: 'linear' },
    { sel: '.f-lamp', at: 0, dur: 1.3, kf: pulse(0.75, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-suv', at: 0.3, dur: 1.5, kf: [{ transform: 'translateX(115%)' }, { transform: 'translateX(0%)' }], ease: 'cubic-bezier(.12,.7,.25,1)' },
    { sel: '.f-suv', at: 1.8, dur: 0.4, kf: [{ transform: 'translateY(0px)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0px)' }] },
    { sel: '.f-beam', at: 1.9, dur: 0.16, kf: pulse(0.55, 1), times: 4, alt: true },
    { sel: '.f-artem', at: 1.6, dur: 0.5, kf: [{ transform: 'translateX(0px)' }, { transform: 'translateX(-6px)' }], ease: 'ease-out' },
    // Турбин в окне: камера отъезжает от лица, ключи блестят, неон мигает.
    { sel: '.f-s2', at: 3.5, dur: 0.25, kf: fadeIn },
    { sel: '.f-s2-cam', at: 3.5, dur: 2.8, kf: zoom(1.14, 1.02), ease: 'ease-out' },
    { sel: '.f-neon', at: 3.5, dur: 0.22, kf: pulse(0.6, 1), times: 9, alt: true },
    { sel: '.f-key', at: 4.1, dur: 0.45, kf: twinkle, times: 4, alt: true },
    // Артём крупно: камера наезжает, в глазах искры.
    { sel: '.f-s3', at: 6.1, dur: 0.2, kf: fadeIn },
    { sel: '.f-s3-cam', at: 6.1, dur: 3.6, kf: zoom(1, 1.12), ease: 'ease-out' },
    { sel: '.f-eye', at: 6.5, dur: 0.4, kf: twinkle, times: 4, alt: true },
    // Печать «Правила — для медленных»: удар, кадр вздрагивает и темнеет.
    { sel: '.f-stamp', at: 7.7, dur: 0.28, kf: [{ opacity: 0, transform: 'scale(2.6) rotate(-9deg)' }, { opacity: 1, transform: 'scale(1) rotate(-5deg)' }], ease: 'cubic-bezier(.3,1.35,.5,1)' },
    { sel: '.f-dim', at: 7.95, dur: 0.4, kf: pulse(0, 0.45) },
    { sel: '.f-shake', at: 7.95, dur: 0.1, kf: [{ transform: 'translate(0px,0px)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(7px,-4px)' }, { transform: 'translate(0px,0px)' }], times: 3 },
  ],
  sounds: [
    { at: 0.3, name: 'rev' },
    { at: 4.1, name: 'coins' },
    { at: 7.7, name: 'stamp' },
  ],
};

/** Выбор: Артём на развилке — тёплый свет «Стрелы» слева, неон «Турбо» справа. */
const CHOICE: Film = {
  title: 'Артём стоит на развилке ночной дороги: слева тёплый свет «Стрелы», справа неон и внедорожник «Турбо».',
  images: [ch3('crossroads')],
  html: shot(
    'f-c',
    '50% 64%',
    `${full(ch3('crossroads'))}
    ${glow('f-warm', 24, 27, 74, 'rgba(255,200,90,.42)')}
    ${glow('f-cold', 90, 38, 74, 'rgba(255,110,40,.4)')}
    ${glow('f-head', 98, 51, 30, 'rgba(255,245,200,.6)')}`,
    '<div class="f-rain"></div>',
  ),
  steps: [
    { sel: '.f-c', at: 0, dur: 0.5, kf: fadeIn },
    // Кадр приподнят: Артём над кнопками выбора, а не под ними.
    { sel: '.f-c-cam', at: 0, dur: 1.6, kf: [{ transform: 'translateY(-4%) scale(1.14)' }, { transform: 'translateY(-15%) scale(1.04)' }], ease: 'cubic-bezier(.2,.7,.3,1)' },
    { sel: '.f-c-cam', at: 1.6, dur: 3.2, kf: [{ transform: 'translateY(-15%) scale(1.04)' }, { transform: 'translateY(-15%) scale(1.08)' }], times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-warm', at: 0, dur: 1.6, kf: pulse(1, 0.35), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-cold', at: 0, dur: 1.6, kf: pulse(0.35, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-head', at: 0.4, dur: 0.18, kf: pulse(0.5, 1), times: 6, alt: true },
  ],
};

const CONFETTI = ['#e63946', '#2a9d8f', '#3a86ff', '#ffbe0b', '#8338ec', '#fb5607'];
const confetti = Array.from(
  { length: 22 },
  (_, i) => `<div class="f-conf f-conf${i % 4}" style="left:${(i * 37 + 9) % 96}%;top:${-4 - (i % 3) * 4}%;background:${CONFETTI[i % CONFETTI.length]}"></div>`,
).join('');

/** «Не уходи»: Артём остаётся, Марина несёт пиццу, конфетти. */
const STAY: Film = {
  title: 'Артём остаётся в «Стреле»: он смеётся, Марина несёт пиццу, сыплется конфетти.',
  images: [ch3('stay')],
  html: shot(
    'f-st',
    '50% 55%',
    `${full(ch3('stay'))}
    ${[8, 17, 26, 35, 44, 53].map((x, i) => glow(`f-bulb f-bulb${i % 2}`, x, 18.5 + (i % 3) * 0.6, 7, 'rgba(255,230,150,.9)')).join('')}`,
    confetti,
  ),
  steps: [
    { sel: '.f-st', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-st-cam', at: 0, dur: 4.5, kf: zoom(1.1, 1), ease: 'ease-out' },
    { sel: '.f-bulb0', at: 0, dur: 0.7, kf: pulse(0.3, 1), times: Infinity, alt: true },
    { sel: '.f-bulb1', at: 0.35, dur: 0.7, kf: pulse(0.3, 1), times: Infinity, alt: true },
    ...[0, 1, 2, 3].map((k) => ({
      sel: `.f-conf${k}`,
      at: 0.3 + k * 0.35,
      dur: 2.6 + k * 0.3,
      kf: [{ transform: 'translateY(0px) rotate(0deg)' }, { transform: `translateY(1400px) rotate(${540 + k * 90}deg)` }],
      ease: 'cubic-bezier(.3,.1,.7,1)',
      times: 2,
    })),
  ],
  sounds: [{ at: 0.4, name: 'reward' }],
};

/** «Учить билеты вместе»: Артём и Виктор Петрович за билетами под лампой. */
const STUDY: Film = {
  title: 'Вечер в автошколе: Артём и Виктор Петрович разбирают билеты под настольной лампой.',
  images: [ch3('study')],
  html: shot('f-sd', '45% 72%', `${full(ch3('study'))}${glow('f-lampd', 79, 57, 46, 'rgba(255,200,110,.55)')}${spark('f-star', 50, 76, 8)}`),
  steps: [
    { sel: '.f-sd', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-sd-cam', at: 0, dur: 5, kf: zoom(1, 1.1), ease: 'ease-out' },
    { sel: '.f-lampd', at: 0, dur: 1.4, kf: pulse(0.7, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-star', at: 1.2, dur: 0.5, kf: twinkle, times: 4, alt: true },
  ],
  sounds: [{ at: 1.2, name: 'correct' }],
};

/** «Решай сам»: Артём уезжает на мопеде «Турбо», в окне «Стрелы» гаснет свет над пустым стулом. */
const FREE: Film = {
  title: 'Артём уезжает в ночь на оранжевом мопеде «Турбо». В окне «Стрелы» гаснет свет над пустым стулом.',
  images: [ch3('free')],
  html: shot(
    'f-fr',
    '80% 34%',
    `${full(ch3('free'))}${glow('f-tail', 40.5, 69.5, 34, 'rgba(255,40,30,.6)')}<div class="f-shade" style="left:3%;top:26%;width:23%;height:17%"></div>`,
    '<div class="f-dim"></div>',
  ),
  steps: [
    { sel: '.f-fr', at: 0, dur: 0.5, kf: fadeIn },
    { sel: '.f-fr-cam', at: 0, dur: 6, kf: zoom(1, 1.18), ease: 'ease-in' },
    { sel: '.f-tail', at: 0.3, dur: 0.5, kf: pulse(0.45, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-shade', at: 2.6, dur: 1.6, kf: pulse(0, 0.78) },
    { sel: '.f-dim', at: 3.2, dur: 2.4, kf: pulse(0, 0.35) },
  ],
  sounds: [{ at: 0.3, name: 'away' }],
};

export const FILMS = {
  'ch3-offer': OFFER,
  'ch3-choice': CHOICE,
  'ch3-stay': STAY,
  'ch3-study': STUDY,
  'ch3-free': FREE,
} satisfies Record<string, Film>;

export type FilmId = keyof typeof FILMS;
export const FILM_IDS = Object.keys(FILMS) as FilmId[];

/** Заранее загрузить картинки сцен (из кэша игры они придут сразу). */
export function preloadFilms(ids: readonly FilmId[]): void {
  if (typeof Image === 'undefined') return;
  for (const src of new Set(ids.flatMap((id) => FILMS[id].images))) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
