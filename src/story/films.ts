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

// ─── Глава 6: «Калач» на грани закрытия ──────────────────────────────────────

const ch6 = (name: string) => sceneArt('ch6', name);
const ch9 = (name: string) => sceneArt('ch9', name);

/** Мопед «Турбо» (вырезан из зелёного фона, едет влево) со шлейфом скорости позади. */
const moped = (cls: string, style: string) =>
  `<div class="f-l f-moped ${cls}" style="${style}"><img class="f-fill" src="${ch6('moped')}" alt="" draggable="false" decoding="async"><div class="f-trail"></div></div>`;
/** Пар над пирожками: три облачка поднимаются по очереди. */
const steam = (x: number, y: number) => [0, 1, 2].map((i) => `<div class="f-puff f-puff${i}" style="left:${x + (i - 1) * 2.5}%;top:${y}%"></div>`).join('');
const steamSteps = (at: number): FilmStep[] =>
  [0, 1, 2].map((i) => ({
    sel: `.f-puff${i}`,
    at: at + i * 0.45,
    dur: 1.6,
    kf: [
      { opacity: 0, transform: 'translateY(0) scale(0.6)' },
      { opacity: 0.85, transform: 'translateY(-3vh) scale(1)', offset: 0.35 },
      { opacity: 0, transform: 'translateY(-9vh) scale(1.5)' },
    ],
    ease: 'linear',
    times: Infinity,
  }));
/** Тряска кадра на ударе. */
const jolt = (at: number): FilmStep => ({
  sel: '.f-shake',
  at,
  dur: 0.1,
  kf: [{ transform: 'translate(0px,0px)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(6px,-3px)' }, { transform: 'translate(0px,0px)' }],
  times: 3,
});
/** Кадр выбора приподнят: герой над кнопками, камера медленно «дышит». */
const raisedCam = (sel: string, from: number, to: number): FilmStep[] => [
  { sel, at: 0, dur: 1.6, kf: [{ transform: `translateY(-4%) scale(${from})` }, { transform: `translateY(${to}%) scale(1.04)` }], ease: 'cubic-bezier(.2,.7,.3,1)' },
  { sel, at: 1.6, dur: 3.2, kf: [{ transform: `translateY(${to}%) scale(1.04)` }, { transform: `translateY(${to}%) scale(1.08)` }], times: Infinity, alt: true, ease: 'ease-in-out' },
];
/** Мигалка: красный и синий по очереди. */
const flashers = (red: string, blue: string, at = 0): FilmStep[] => [
  { sel: red, at, dur: 0.32, kf: pulse(0.15, 1), times: Infinity, alt: true },
  { sel: blue, at, dur: 0.32, kf: pulse(1, 0.15), times: Infinity, alt: true },
];

/** Разговор: мимо «Калача» проносятся мопеды «Турбо», Галина Ивановна у телефона, Турбин с договором, табличка «Продаётся». */
const BAKERY: Film = {
  title: 'Утро у пекарни «Калач»: мимо витрины проносятся мопеды «Турбо». Галина Ивановна с тревогой говорит по телефону. В дверях Турбин протягивает договор, на двери качается табличка «Продаётся».',
  images: ['street', 'moped', 'phone', 'turbin'].map(ch6),
  html: `<div class="f-shake">
    ${shot(
      'f-b1',
      '60% 50%',
      `${full(ch6('street'))}
      ${glow('f-win', 74, 46, 52, 'rgba(255,214,140,.45)')}
      ${glow('f-lampb', 25, 33, 20, 'rgba(255,226,160,.7)')}
      ${moped('f-mp2', 'left:44%;bottom:17%;width:26%')}
      ${moped('f-mp1', 'left:30%;bottom:3%;width:40%')}`,
    )}
    ${shot('f-b2', '60% 38%', `${full(ch6('phone'))}${glow('f-ring', 57, 41, 22, 'rgba(255,240,200,.75)')}`)}
    ${shot(
      'f-b3',
      '70% 42%',
      `${full(ch6('turbin'))}${glow('f-bolt', 69, 61, 30, 'rgba(255,130,30,.55)')}<div class="f-sign" style="left:42%;top:40%;width:27%"><span>Продаётся</span></div>`,
      '<div class="f-dim"></div>',
    )}
  </div>`,
  steps: [
    // Улица: камера медленно наезжает, мимо витрины один за другим проносятся мопеды «Турбо».
    { sel: '.f-b1-cam', at: 0, dur: 3.4, kf: zoom(1, 1.06), ease: 'linear' },
    { sel: '.f-win', at: 0, dur: 1.4, kf: pulse(0.7, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-lampb', at: 0, dur: 1.1, kf: pulse(0.6, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-mp1', at: 0.2, dur: 1.5, kf: [{ transform: 'translateX(190%)' }, { transform: 'translateX(-190%)' }], ease: 'linear' },
    { sel: '.f-mp2', at: 1.6, dur: 1.2, kf: [{ transform: 'translateX(230%)' }, { transform: 'translateX(-280%)' }], ease: 'linear' },
    // Галина Ивановна у телефона: камера подъезжает к лицу, трубка звенит.
    { sel: '.f-b2', at: 3.2, dur: 0.25, kf: fadeIn },
    { sel: '.f-b2-cam', at: 3.2, dur: 3.2, kf: zoom(1, 1.16), ease: 'ease-out' },
    { sel: '.f-ring', at: 3.2, dur: 0.12, kf: pulse(0.2, 1), times: 6, alt: true },
    // Турбин с договором: камера отъезжает, молния светится, на дверь падает табличка и качается.
    { sel: '.f-b3', at: 6.3, dur: 0.25, kf: fadeIn },
    { sel: '.f-b3-cam', at: 6.3, dur: 3.4, kf: zoom(1.14, 1.02), ease: 'ease-out' },
    { sel: '.f-bolt', at: 6.3, dur: 0.24, kf: pulse(0.5, 1), times: 8, alt: true },
    { sel: '.f-sign', at: 7.6, dur: 0.4, kf: [{ opacity: 0, transform: 'translateY(-30vh) rotate(-14deg)' }, { opacity: 1, transform: 'translateY(0) rotate(-7deg)' }], ease: 'cubic-bezier(.5,0,.7,1)' },
    { sel: '.f-sign', at: 8, dur: 0.45, kf: [{ transform: 'translateY(0) rotate(-7deg)' }, { transform: 'translateY(0) rotate(5deg)' }], times: 4, alt: true, ease: 'ease-in-out' },
    jolt(8),
    { sel: '.f-dim', at: 8, dur: 0.5, kf: pulse(0, 0.3) },
  ],
  sounds: [
    { at: 0.4, name: 'zip' },
    { at: 1.8, name: 'zip' },
    { at: 3.2, name: 'ring' },
    { at: 8, name: 'stamp' },
  ],
};

/** Выбор: Галина Ивановна на пороге с подносом — тёплый свет «Калача» против неона «Турбо». */
const BAKERY_CHOICE: Film = {
  title: 'Сумерки. Галина Ивановна стоит на пороге пекарни с подносом пирожков: слева тёплый свет витрины, через дорогу — чёрный внедорожник «Турбо» в оранжевом неоне.',
  images: [ch6('choice')],
  html: shot(
    'f-bc',
    '50% 50%',
    `${full(ch6('choice'))}
    ${glow('f-warm6', 14, 40, 70, 'rgba(255,214,120,.45)')}
    ${glow('f-neon6', 79, 49, 46, 'rgba(255,120,30,.45)')}
    ${glow('f-head6', 98, 50, 18, 'rgba(255,245,200,.7)')}
    ${steam(57, 46)}`,
  ),
  steps: [
    { sel: '.f-bc', at: 0, dur: 0.5, kf: fadeIn },
    ...raisedCam('.f-bc-cam', 1.14, -12),
    { sel: '.f-warm6', at: 0, dur: 1.6, kf: pulse(1, 0.4), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-neon6', at: 0, dur: 0.2, kf: pulse(0.35, 1), times: Infinity, alt: true },
    { sel: '.f-head6', at: 0.5, dur: 0.18, kf: pulse(0.4, 1), times: 6, alt: true },
    ...steamSteps(0.3),
  ],
};

/** «Стрела» возит пирожки: Марина грузит тёплые коробки в машину курьера, Галина Ивановна машет. */
const BAKERY_SAVE: Film = {
  title: 'Раннее утро у «Калача»: Марина грузит коробки с горячими пирожками в машину «Стрелы», Галина Ивановна машет из двери.',
  images: [ch6('save')],
  html: shot('f-sv', '45% 60%', `${full(ch6('save'))}${glow('f-win6', 76, 43, 40, 'rgba(255,214,140,.5)')}${glow('f-sun', 8, 34, 60, 'rgba(255,200,140,.35)')}${steam(47, 61)}`),
  steps: [
    { sel: '.f-sv', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-sv-cam', at: 0, dur: 5, kf: zoom(1.1, 1), ease: 'ease-out' },
    { sel: '.f-win6', at: 0, dur: 1.3, kf: pulse(0.7, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-sun', at: 0, dur: 4, kf: pulse(0.2, 1), ease: 'ease-out' },
    ...steamSteps(0.2),
  ],
  sounds: [{ at: 0.4, name: 'reward' }],
};

/** Своя доставка: Галина Ивановна у нового фургончика «Калач-экспресса» с бантом и шариками. */
const BAKERY_OWN: Film = {
  title: 'Открытие «Калач-экспресса»: Галина Ивановна гордо стоит у жёлтого фургончика с кренделем на борту, бант, шарики, конфетти.',
  images: [ch6('own')],
  html: shot(
    'f-ow',
    '40% 60%',
    `${full(ch6('own'))}${glow('f-hl6 f-hl6a', 44, 67, 12, 'rgba(255,250,210,.9)')}${glow('f-hl6 f-hl6b', 59.5, 67.5, 12, 'rgba(255,250,210,.9)')}${spark('f-bow', 52, 66, 9)}`,
    confetti,
  ),
  steps: [
    { sel: '.f-ow', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-ow-cam', at: 0, dur: 4.5, kf: zoom(1.1, 1), ease: 'ease-out' },
    { sel: '.f-hl6', at: 0.6, dur: 0.22, kf: pulse(0, 1), times: 4, alt: true },
    { sel: '.f-bow', at: 1, dur: 0.5, kf: twinkle, times: 4, alt: true },
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

/** «Калач» продан: дождь, Галина Ивановна уходит с коробкой, над дверью загорается молния «Турбо». */
const BAKERY_SELL: Film = {
  title: 'Вечер, дождь. Галина Ивановна уходит от пекарни с коробкой вещей. Над дверью рабочие вешают вывеску «Турбо» — оранжевая молния загорается.',
  images: [ch6('sell')],
  html: shot(
    'f-sl',
    '30% 55%',
    `${full(ch6('sell'))}${glow('f-lamp6', 25, 33, 22, 'rgba(255,226,160,.7)')}${glow('f-bolt6', 64, 24, 34, 'rgba(255,120,30,.6)')}`,
    '<div class="f-rain"></div><div class="f-flash"></div><div class="f-dim"></div>',
  ),
  steps: [
    { sel: '.f-sl', at: 0, dur: 0.5, kf: fadeIn },
    { sel: '.f-sl-cam', at: 0, dur: 6, kf: zoom(1, 1.12), ease: 'ease-in' },
    { sel: '.f-lamp6', at: 0, dur: 0.6, kf: pulse(0.3, 0.9), times: Infinity, alt: true, ease: 'steps(2)' },
    { sel: '.f-flash', at: 1.1, dur: 0.5, kf: [{ opacity: 0 }, { opacity: 0.7, offset: 0.15 }, { opacity: 0.1, offset: 0.35 }, { opacity: 0.5, offset: 0.5 }, { opacity: 0 }] },
    { sel: '.f-bolt6', at: 2, dur: 1.2, kf: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.2, offset: 0.35 }, { opacity: 1 }], ease: 'linear' },
    { sel: '.f-dim', at: 3, dur: 3, kf: pulse(0, 0.35) },
  ],
  sounds: [
    { at: 1.1, name: 'thunder' },
    { at: 2.4, name: 'away' },
  ],
};

// ─── Глава 9: запись видеорегистратора ────────────────────────────────────────

/** Интерфейс регистратора поверх кадра: запись, время, уголки рамки, строки развёртки. */
const DASH_UI = `<div class="f-dashui">
  <div class="f-rec"><i class="f-recdot"></i>REC</div><div class="f-time">21:47:13</div>
  <div class="f-cn f-cn1"></div><div class="f-cn f-cn2"></div><div class="f-cn f-cn3"></div><div class="f-cn f-cn4"></div>
  <div class="f-pause">❚❚ Стоп-кадр</div>
</div>`;

/** Запись регистратора: мопед «Турбо» проскакивает на красный перед мальчиком — стоп-кадр, увеличение. */
const DASHCAM: Film = {
  title: 'Ночная запись видеорегистратора: горит красный, мопед «Турбо» проскакивает через переход прямо перед мальчиком. Стоп-кадр, увеличение на мопед.',
  images: [ch9('dashcam'), ch6('moped')],
  html: shot(
    'f-dc',
    '86% 50%',
    `${full(ch9('dashcam'))}
    ${glow('f-red9', 81, 22.5, 22, 'rgba(255,40,40,.7)')}
    ${moped('f-night f-mp9', 'left:47%;bottom:33%;width:21%')}
    <div class="f-focus" style="left:45%;top:51%;width:25%;height:18%"></div>`,
    `<div class="f-rain"></div><div class="f-flash"></div>${DASH_UI}`,
  ),
  steps: [
    // Камера регистратора: кадр приближен и чуть плывёт.
    { sel: '.f-dc-cam', at: 0, dur: 1.9, kf: zoom(1.55, 1.6), ease: 'linear' },
    { sel: '.f-red9', at: 0, dur: 0.9, kf: pulse(0.6, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
    { sel: '.f-recdot', at: 0, dur: 0.5, kf: pulse(1, 0.15), times: Infinity, alt: true, ease: 'steps(1)' },
    // Мопед проскакивает на красный прямо перед мальчиком — и кадр замирает.
    { sel: '.f-mp9', at: 0.6, dur: 1.2, kf: [{ transform: 'translateX(200%)' }, { transform: 'translateX(0%)' }], ease: 'cubic-bezier(.2,.6,.4,1)' },
    { sel: '.f-flash', at: 1.8, dur: 0.35, kf: [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0 }] },
    { sel: '.f-pause', at: 1.8, dur: 0.2, kf: fadeIn },
    { sel: '.f-focus', at: 2, dur: 0.3, kf: [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)' }], ease: 'cubic-bezier(.3,1.3,.5,1)' },
    { sel: '.f-focus', at: 2.4, dur: 0.4, kf: [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.35, transform: 'scale(1)' }], times: Infinity, alt: true },
    // Увеличение на мопед: камера сдвигается к нему.
    { sel: '.f-dc-cam', at: 2.4, dur: 1.8, kf: [{ transform: 'translate(0%,0%) scale(1.6)' }, { transform: 'translate(22%,-20%) scale(1.95)' }], ease: 'ease-in-out' },
  ],
  sounds: [
    { at: 0.6, name: 'zip' },
    { at: 1.8, name: 'tick' },
  ],
};

/** Выбор: Соколов у окна в отсветах мигалок, потом вид из салона — регистратор на панели, Соколов ждёт под дождём. */
const VIDEO_CHOICE: Film = {
  title: 'Лейтенант Соколов наклоняется к окну машины «Стрелы» в отсветах мигалок. Из салона виден регистратор на панели, за мокрым стеклом ждёт Соколов.',
  images: [ch9('sokolov'), ch9('choice')],
  html: `${shot('f-sk', '55% 32%', `${full(ch9('sokolov'))}${glow('f-skr', 28, 30, 70, 'rgba(255,40,60,.45)')}${glow('f-skb', 78, 36, 70, 'rgba(40,110,255,.45)')}`)}
    ${shot(
      'f-vc',
      '55% 50%',
      `${full(ch9('choice'))}
      ${glow('f-vcr', 96, 41, 18, 'rgba(255,40,50,.85)')}
      ${glow('f-vcb', 82, 41, 18, 'rgba(50,120,255,.85)')}
      ${glow('f-vch', 60, 52, 16, 'rgba(255,245,210,.6)')}
      ${glow('f-vch', 90, 52, 16, 'rgba(255,245,210,.6)')}
      ${glow('f-scr', 54, 67, 26, 'rgba(190,225,255,.6)')}`,
      '<div class="f-rain"></div>',
    )}`,
  steps: [
    // Соколов крупно: камера отъезжает, мигалка красит лицо то красным, то синим.
    { sel: '.f-sk', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-sk-cam', at: 0, dur: 3, kf: zoom(1.14, 1.02), ease: 'ease-out' },
    ...flashers('.f-skr', '.f-skb'),
    // Вид из салона: регистратор светится, за стеклом мигалка; кадр приподнят над кнопками.
    { sel: '.f-vc', at: 2.8, dur: 0.4, kf: fadeIn },
    { sel: '.f-vc-cam', at: 2.8, dur: 1.6, kf: [{ transform: 'translateY(-4%) scale(1.12)' }, { transform: 'translateY(-14%) scale(1.04)' }], ease: 'cubic-bezier(.2,.7,.3,1)' },
    { sel: '.f-vc-cam', at: 4.4, dur: 3.2, kf: [{ transform: 'translateY(-14%) scale(1.04)' }, { transform: 'translateY(-14%) scale(1.08)' }], times: Infinity, alt: true, ease: 'ease-in-out' },
    ...flashers('.f-vcr', '.f-vcb', 2.8),
    { sel: '.f-scr', at: 2.8, dur: 1.2, kf: pulse(0.55, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
  ],
  sounds: [{ at: 0.2, name: 'siren' }],
};

/** Запись — Соколову: карта памяти у него в руке, патрульные машины выезжают. */
const VIDEO_GIVE: Film = {
  title: 'Ночь, дождь. Лейтенант Соколов держит карту памяти и уважительно кивает; позади на дорогу выезжают патрульные машины с мигалками.',
  images: [ch9('give')],
  html: shot(
    'f-gv',
    '90% 45%',
    `${full(ch9('give'))}${glow('f-gvb', 9, 45, 22, 'rgba(50,120,255,.8)')}${glow('f-gvr', 28, 43, 16, 'rgba(255,40,50,.8)')}${glow('f-gvr', 55, 43, 14, 'rgba(255,40,50,.8)')}${spark('f-card', 43.5, 52.5, 10)}`,
    '<div class="f-rain"></div>',
  ),
  steps: [
    { sel: '.f-gv', at: 0, dur: 0.4, kf: fadeIn },
    { sel: '.f-gv-cam', at: 0, dur: 5, kf: zoom(1.2, 1.1), ease: 'ease-out' },
    ...flashers('.f-gvr', '.f-gvb'),
    { sel: '.f-card', at: 0.8, dur: 0.5, kf: twinkle, times: 4, alt: true },
  ],
  sounds: [{ at: 0.8, name: 'reward' }],
};

/** Разговор с курьером: рассвет у «Калача», курьер «Турбо» сидит на бордюре со шлемом в руках, фонарь гаснет. */
const VIDEO_TALK: Film = {
  title: 'Рассвет у пекарни. Курьер «Турбо» сидит на бордюре в капюшоне, шлем в руках. Фонарь гаснет, небо светлеет.',
  images: [ch9('talk')],
  html: shot('f-tk', '30% 78%', `${full(ch9('talk'))}${glow('f-lamp9', 25, 33, 22, 'rgba(255,226,160,.8)')}${glow('f-win9', 78, 42, 40, 'rgba(255,214,140,.45)')}`, '<div class="f-dawn"></div>'),
  steps: [
    { sel: '.f-tk', at: 0, dur: 0.5, kf: fadeIn },
    // Кадр приподнят: курьер над субтитрами.
    { sel: '.f-tk-cam', at: 0, dur: 6, kf: [{ transform: 'translateY(-6%) scale(1.04)' }, { transform: 'translateY(-13%) scale(1.1)' }], ease: 'ease-in-out' },
    { sel: '.f-lamp9', at: 0, dur: 3, kf: [{ opacity: 1 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0.2, offset: 0.75 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], ease: 'linear' },
    { sel: '.f-dawn', at: 0.5, dur: 4.5, kf: pulse(0, 1), ease: 'ease-in-out' },
    { sel: '.f-win9', at: 0, dur: 1.5, kf: pulse(0.6, 1), times: Infinity, alt: true, ease: 'ease-in-out' },
  ],
  sounds: [{ at: 2.2, name: 'correct' }],
};

/** Стереть запись: на экране регистратора «Удалить запись?», полоса удаления, помехи — экран гаснет. */
const VIDEO_ERASE: Film = {
  title: 'Тёмный салон машины. На экране видеорегистратора идёт удаление записи, помехи — и экран гаснет.',
  images: [ch9('erase')],
  html: shot(
    'f-er',
    '54% 46%',
    `${full(ch9('erase'))}${glow('f-erg', 54, 46, 34, 'rgba(170,205,255,.45)')}
    <div class="f-screen" style="left:44.4%;top:41.3%;width:20.4%;height:8.9%">
      <div class="f-scr f-scr-q">Удалить запись?</div>
      <div class="f-scr f-scr-del">Удаление…<div class="f-bar"><div class="f-barfill"></div></div></div>
      <div class="f-scr f-scr-done">Запись удалена</div>
      <div class="f-scr f-scr-noise"></div>
      <div class="f-scr f-scr-off"></div>
    </div>`,
    '<div class="f-dim"></div>',
  ),
  steps: [
    { sel: '.f-er', at: 0, dur: 0.5, kf: fadeIn },
    { sel: '.f-er-cam', at: 0, dur: 5, kf: zoom(1.25, 1.5), ease: 'ease-in-out' },
    { sel: '.f-scr-q', at: 0, dur: 1.4, kf: [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], ease: 'linear' },
    { sel: '.f-scr-del', at: 1.3, dur: 1.9, kf: [{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.94 }, { opacity: 0 }], ease: 'linear' },
    { sel: '.f-barfill', at: 1.4, dur: 1.6, kf: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], ease: 'linear' },
    { sel: '.f-scr-done', at: 3.2, dur: 1.2, kf: [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], ease: 'linear' },
    { sel: '.f-scr-noise', at: 4.3, dur: 0.7, kf: [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.4, offset: 0.4 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], ease: 'linear' },
    { sel: '.f-scr-off', at: 4.9, dur: 0.2, kf: fadeIn },
    { sel: '.f-erg', at: 4.9, dur: 0.6, kf: [{ opacity: 1 }, { opacity: 0 }] },
    { sel: '.f-dim', at: 5, dur: 2, kf: pulse(0, 0.4) },
  ],
  sounds: [{ at: 1.4, name: 'erase' }],
};

export const FILMS = {
  'ch3-offer': OFFER,
  'ch3-choice': CHOICE,
  'ch3-stay': STAY,
  'ch3-study': STUDY,
  'ch3-free': FREE,
  'ch6-call': BAKERY,
  'ch6-choice': BAKERY_CHOICE,
  'ch6-save': BAKERY_SAVE,
  'ch6-own': BAKERY_OWN,
  'ch6-sell': BAKERY_SELL,
  'ch9-video': DASHCAM,
  'ch9-choice': VIDEO_CHOICE,
  'ch9-give': VIDEO_GIVE,
  'ch9-talk': VIDEO_TALK,
  'ch9-erase': VIDEO_ERASE,
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
