/**
 * Анимированные сцены сюжета (этап 18): короткий «мультик» над репликами в больших развилках.
 * Нарисованы кодом в SVG и оживают анимациями браузера (Web Animations) — без видеофайлов, поэтому
 * почти ничего не весят и работают без интернета. Герои — те же портреты, что в диалогах.
 *
 * Сам рисунок — последний кадр сцены: анимации прячут то, что появится позже. Поэтому если анимации
 * выключены (настройка телефона «Уменьшить движение») или браузер их не умеет, видна итоговая картинка.
 * Внутри нет id и ссылок: сцену можно вставить на экран сколько угодно раз.
 */
import type { SoundName } from '../audio/feedback.ts';
import { portraitArt, type PortraitId } from './portraits.ts';

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
  svg: string;
  steps: FilmStep[];
  sounds?: { at: number; name: SoundName }[];
}

const W = 360;
const H = 200;
/** Масштаб и поворот вокруг центра самого элемента. */
const BOX = 'style="transform-box:fill-box;transform-origin:center"';
const BOX_BOTTOM = 'style="transform-box:fill-box;transform-origin:50% 100%"';
const BOX_TOP = 'style="transform-box:fill-box;transform-origin:50% 0%"';
const svg = (body: string) => `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const text = (x: number, y: number, size: number, fill: string, body: string, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="900" fill="${fill}" text-anchor="middle" font-family="system-ui, sans-serif" ${extra}>${body}</text>`;
/** Портрет героя: левый верхний угол и размер (портрет квадратный). */
const bust = (id: PortraitId, x: number, y: number, size: number) => `<g transform="translate(${x} ${y}) scale(${size / 96})">${portraitArt(id)}</g>`;

const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const pop: Keyframe[] = [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.2)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }];
const BOUNCE = 'cubic-bezier(.2,1.5,.4,1)';

// ─── Улица у «Стрелы» ночью ─────────────────────────────────────────────────────

const NIGHT = '#1c2541';
const stars = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = (seed * 37 + i * 61) % W;
    const y = 8 + ((seed * 13 + i * 29) % 60);
    return `<circle cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.4}" fill="#fff" opacity="${i % 2 ? 0.5 : 0.85}"/>`;
  }).join('');

const street = `
  <rect width="${W}" height="${H}" fill="${NIGHT}"/>${stars(16, 3)}
  <circle cx="318" cy="30" r="12" fill="#f1f1d0"/><circle cx="324" cy="26" r="11" fill="${NIGHT}"/>
  <rect x="8" y="52" width="122" height="102" fill="#2e3a59"/>
  <rect x="24" y="62" width="90" height="20" rx="4" fill="#ffd166"/>${text(69, 77, 13, '#1b2430', 'СТРЕЛА')}
  <rect x="22" y="94" width="26" height="22" fill="#ffe8a3"/><rect x="58" y="94" width="26" height="22" fill="#ffe8a3" opacity="0.4"/><rect x="94" y="94" width="24" height="22" fill="#ffe8a3"/>
  <rect x="60" y="124" width="22" height="30" fill="#1b2430"/>
  <path d="M150 156V70Q150 62 158 62H170" stroke="#5b6478" stroke-width="4" fill="none"/>
  <path d="M164 64L196 156H136Z" fill="#ffe8a3" opacity="0.12"/><rect x="164" y="58" width="12" height="7" rx="2" fill="#ffe8a3"/>
  <rect y="154" width="${W}" height="10" fill="#3a4256"/><rect y="164" width="${W}" height="36" fill="#262b36"/>
  <path d="M0 184H${W}" stroke="#cfd4dc" stroke-width="2.5" stroke-dasharray="14 10"/>`;

/** Артём в полный рост (вид сбоку, смотрит вправо): начало координат — у ног. */
const artemMini = `
  <path d="M-4 -22L-5 0M4 -22L5 0" stroke="#1b2430" stroke-width="5" stroke-linecap="round"/>
  <rect x="-10" y="-50" width="20" height="31" rx="7" fill="#ffd166"/>
  <path d="M8 -44L16 -32" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/>
  <circle cx="0" cy="-61" r="10" fill="#f2c6a0"/>
  <path d="M-10 -62Q-11 -74 0 -74Q11 -74 10 -63Q5 -68 0 -67Q-5 -68 -10 -62Z" fill="#b5651d"/>
  <rect x="-2" y="-71" width="9" height="5" rx="2" fill="#9ad1f5" stroke="#333" stroke-width="1"/>
  <circle cx="5" cy="-60" r="1.4" fill="#2b2b2b"/>`;

/** Старый мопед «Стрелы» (вид сбоку): начало координат — на земле посередине. */
const moped = (body: string) => `
  <circle cx="-18" cy="-9" r="9" fill="#111" stroke="#666" stroke-width="2"/><circle cx="18" cy="-9" r="9" fill="#111" stroke="#666" stroke-width="2"/>
  <path d="M-24 -12H12L18 -28H24L22 -12L28 -9H-28Z" fill="${body}"/>
  <rect x="-16" y="-20" width="20" height="5" rx="2" fill="#1b2430"/><path d="M19 -28L15 -36H24" stroke="#888" stroke-width="2.5" fill="none"/>`;

/** Чёрный внедорожник «Турбо» (вид сбоку, едет влево). */
const suv = `
  <path d="M-62 -34L-230 -60L-230 2L-62 -27Z" fill="#fff6c8" opacity="0.14" class="f-beam"/>
  <path d="M-62 -14V-34Q-60 -40 -52 -40H-34L-22 -56H38Q48 -56 52 -46L62 -34V-14Z" fill="#14161f"/>
  <path d="M-18 -52H4V-41H-30ZM8 -52H36Q42 -52 46 -44L48 -41H8Z" fill="#3a4458"/>
  <path d="M4 -37L-6 -25H1L-8 -13L12 -29H5L11 -37Z" fill="#f77f00"/>
  <path d="M-62 -24H62" stroke="#f77f00" stroke-width="2"/>
  <rect x="-63" y="-34" width="7" height="6" rx="2" fill="#fff6c8"/><rect x="57" y="-34" width="5" height="6" rx="1" fill="#e63946"/>
  <circle cx="-36" cy="-11" r="11" fill="#111" stroke="#444" stroke-width="3"/><circle cx="-36" cy="-11" r="3.5" fill="#999"/>
  <circle cx="36" cy="-11" r="11" fill="#111" stroke="#444" stroke-width="3"/><circle cx="36" cy="-11" r="3.5" fill="#999"/>`;

/** Ключи от нового мопеда на брелоке «Турбо». */
const keys = `
  <path d="M0 0V18" stroke="#c0c4cc" stroke-width="2.5"/><circle cx="0" cy="24" r="7" fill="none" stroke="#c0c4cc" stroke-width="3"/>
  <path d="M-2 30V52H4V48H8V44H4V30Z" fill="#c0c4cc"/>
  <rect x="4" y="28" width="22" height="28" rx="5" fill="#f77f00"/><path d="M17 32L11 42H15L10 52L21 39H17L21 32Z" fill="#14161f"/>`;

const sparkle = (x: number, y: number, r: number, cls: string) =>
  `<path class="${cls}" ${BOX} d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" fill="#ffd166"/>`;

/** Лучи «вспышки» из центра кадра. */
const burst = (cx: number, cy: number, color: string) =>
  Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const b = a + Math.PI / 22;
    const R = 420;
    return `<path d="M${cx} ${cy}L${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}L${(cx + R * Math.cos(b)).toFixed(1)} ${(cy + R * Math.sin(b)).toFixed(1)}Z" fill="${color}"/>`;
  }).join('');

// ─── Выбор: «Стрела» или «Турбо» ──────────────────────────────────────────────

const STRELA = '#ffd166';
const TURBO = '#14161f';
const crossroads = (turboClass = '') => `
  <rect width="${W}" height="${H}" fill="${STRELA}"/>
  <path d="M0 0H196L164 ${H}H0Z" fill="${STRELA}"/>
  <path class="f-glow-l" d="M0 0H196L164 ${H}H0Z" fill="#fff" opacity="0"/>
  <g transform="translate(70 30)"><path d="M-30 0H8V-10L30 6L8 22V12H-30Z" fill="#1b2430"/>${text(0, 46, 16, '#1b2430', 'СТРЕЛА')}</g>
  <g class="${turboClass}">
    <path d="M196 0H${W}V${H}H164Z" fill="${TURBO}"/>
    <path class="f-glow-r" d="M196 0H${W}V${H}H164Z" fill="#f77f00" opacity="0"/>
    <g transform="translate(290 30)"><path d="M8 -12L-10 14H0L-12 38L16 6H5L14 -12Z" fill="#f77f00"/>${text(0, 60, 16, '#f77f00', 'ТУРБО')}</g>
  </g>`;

const artemCenter = `<g class="f-sway" ${BOX_BOTTOM}>${bust('artem', 103, 50, 154)}</g>`;

// ─── Сцены главы 3: Артёма зовут в «Турбо» ────────────────────────────────────

const OFFER: Film = {
  title: 'Чёрный внедорожник «Турбо» подъезжает к Артёму. Турбин крутит ключами от нового мопеда: зарплата вдвое больше. «Правила — для медленных».',
  svg: svg(`
    <g class="f-shake">
      <g>${street}
        <g transform="translate(92 164)">${moped('#8e44ad')}</g>
        <g transform="translate(62 164)">${artemMini}</g>
        <g class="f-suv"><g transform="translate(250 164)">${suv}</g></g>
      </g>
      <g class="f-shot2" ${BOX}>
        <rect width="${W}" height="${H}" fill="#0f1118"/>${burst(250, 90, '#1d2130')}
        ${bust('turbin', 180, 22, 180)}
        <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="22" fill="none" stroke="#000" stroke-width="12"/>
        <g class="f-keys" ${BOX_TOP}><g transform="translate(150 40)">${keys}</g></g>
        <g class="f-x2" ${BOX}><circle cx="78" cy="78" r="34" fill="#f77f00"/>${text(78, 90, 32, '#fff', '×2')}</g>
      </g>
      <g class="f-shot3">
        <rect width="${W}" height="${H}" fill="#8e44ad"/>${burst(180, 110, '#9d55bd')}
        <g class="f-zoom" ${BOX}>${bust('artem', 90, 14, 186)}</g>
        ${sparkle(76, 54, 14, 'f-spark')}${sparkle(292, 70, 18, 'f-spark')}${sparkle(268, 150, 10, 'f-spark')}${sparkle(60, 150, 9, 'f-spark')}
        <rect class="f-dim" width="${W}" height="${H}" fill="#000" opacity="0"/>
      </g>
      <g class="f-stamp" ${BOX}>
        <rect x="16" y="72" width="328" height="56" rx="8" fill="#14161f" stroke="#f77f00" stroke-width="4" transform="rotate(-4 180 100)"/>
        ${text(180, 108, 21, '#f77f00', 'ПРАВИЛА — ДЛЯ МЕДЛЕННЫХ', 'textLength="300" lengthAdjust="spacingAndGlyphs" transform="rotate(-4 180 100)"')}
      </g>
    </g>`),
  steps: [
    // Внедорожник въезжает справа и тормозит с покачиванием, фары мигают.
    { sel: '.f-suv', at: 0.2, dur: 1.4, kf: [{ transform: 'translateX(260px)' }, { transform: 'translateX(0px)' }], ease: 'cubic-bezier(.15,.7,.3,1)' },
    { sel: '.f-suv', at: 1.6, dur: 0.35, kf: [{ transform: 'translateY(0px)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0px)' }] },
    { sel: '.f-beam', at: 1.7, dur: 0.18, kf: [{ opacity: 0.14 }, { opacity: 0.4 }], times: 4, alt: true },
    // Крупно: Турбин и ключи от нового мопеда, «×2».
    { sel: '.f-shot2', at: 3, dur: 0.3, kf: fadeIn },
    { sel: '.f-shot2', at: 3, dur: 2.6, kf: [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], ease: 'ease-out' },
    { sel: '.f-keys', at: 3.3, dur: 0.55, kf: [{ transform: 'rotate(-16deg)' }, { transform: 'rotate(16deg)' }], ease: 'ease-in-out', times: 6, alt: true },
    { sel: '.f-x2', at: 3.9, dur: 0.45, kf: pop, ease: BOUNCE },
    // Крупно: Артём, глаза разбегаются.
    { sel: '.f-shot3', at: 5.6, dur: 0.25, kf: fadeIn },
    { sel: '.f-zoom', at: 5.6, dur: 3, kf: [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }] },
    { sel: '.f-spark', at: 5.9, dur: 0.5, kf: [{ opacity: 0, transform: 'scale(0.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1) rotate(45deg)' }], times: 4, alt: true },
    // Печать: «Правила — для медленных».
    { sel: '.f-stamp', at: 7.3, dur: 0.3, kf: [{ opacity: 0, transform: 'scale(2.4) rotate(-6deg)' }, { opacity: 1, transform: 'scale(1) rotate(0deg)' }], ease: 'cubic-bezier(.3,1.3,.5,1)' },
    { sel: '.f-dim', at: 7.6, dur: 0.4, kf: [{ opacity: 0 }, { opacity: 0.45 }] },
    { sel: '.f-shake', at: 7.6, dur: 0.12, kf: [{ transform: 'translate(0px, 0px)' }, { transform: 'translate(-5px, 3px)' }, { transform: 'translate(5px, -3px)' }, { transform: 'translate(0px, 0px)' }], times: 3 },
  ],
  sounds: [
    { at: 0.2, name: 'rev' },
    { at: 3.9, name: 'coins' },
    { at: 7.3, name: 'stamp' },
  ],
};

const CHOICE: Film = {
  title: 'Артём между «Стрелой» и «Турбо» и не знает, куда идти.',
  svg: svg(`${crossroads()}${artemCenter}
    <g class="f-ask" ${BOX}><circle cx="252" cy="58" r="20" fill="#fff"/><path d="M240 70L234 84L250 74Z" fill="#fff"/>${text(252, 67, 26, '#1b2430', '?')}</g>`),
  steps: [
    { sel: '.f-sway', at: 0, dur: 1.4, kf: [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }], ease: 'ease-in-out', times: Infinity, alt: true },
    { sel: '.f-glow-l', at: 0, dur: 1.4, kf: [{ opacity: 0.22 }, { opacity: 0 }], ease: 'ease-in-out', times: Infinity, alt: true },
    { sel: '.f-glow-r', at: 0, dur: 1.4, kf: [{ opacity: 0 }, { opacity: 0.22 }], ease: 'ease-in-out', times: Infinity, alt: true },
    { sel: '.f-ask', at: 0.2, dur: 0.4, kf: pop, ease: BOUNCE },
  ],
};

/** Конфетти: разноцветные полоски падают сверху. */
const CONFETTI = ['#e63946', '#2a9d8f', '#8e44ad', '#1b2430', '#f77f00', '#457b9d'];
const confetti = Array.from({ length: 16 }, (_, i) => `<rect class="f-conf${i % 4}" x="${12 + i * 22}" y="${-18 - (i % 3) * 14}" width="7" height="12" rx="2" fill="${CONFETTI[i % CONFETTI.length]}" ${BOX}/>`).join('');
const fall = (at: number) => ({ at, dur: 1.8, kf: [{ transform: 'translateY(0px) rotate(0deg)' }, { transform: 'translateY(290px) rotate(540deg)' }], ease: 'ease-in' });

const STAY: Film = {
  title: 'Артём остаётся в «Стреле»: «Турбо» исчезает, Марина несёт пиццу.',
  svg: svg(`${crossroads('f-away')}${artemCenter}
    <g class="f-pizza"><g transform="translate(14 136)"><rect width="78" height="52" rx="6" fill="#d4a373"/><rect x="6" y="8" width="66" height="10" rx="3" fill="#e63946"/>${text(39, 40, 13, '#5c3d1e', 'ПИЦЦА')}</g></g>
    <g class="f-marina" ${BOX}><circle cx="300" cy="138" r="44" fill="#2a9d8f"/>${bust('marina', 256, 94, 88)}</g>
    ${confetti}`),
  steps: [
    { sel: '.f-away', at: 0.1, dur: 0.6, kf: [{ transform: 'translateX(0px)' }, { transform: 'translateX(240px)' }], ease: 'ease-in' },
    { sel: '.f-sway', at: 0.6, dur: 0.45, kf: [{ transform: 'translateY(0px)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0px)' }], ease: 'ease-out' },
    ...[0, 1, 2, 3].map((k) => ({ sel: `.f-conf${k}`, ...fall(0.7 + k * 0.25) })),
    { sel: '.f-pizza', at: 1.2, dur: 0.5, kf: [{ transform: 'translateX(-120px)' }, { transform: 'translateX(0px)' }], ease: BOUNCE },
    { sel: '.f-marina', at: 1.6, dur: 0.45, kf: pop, ease: BOUNCE },
  ],
  sounds: [{ at: 0.6, name: 'reward' }],
};

const ticket = (i: number) => `<g class="f-t${i}" ${BOX_BOTTOM}><g transform="translate(160 92)"><rect width="40" height="56" rx="5" fill="#fff" stroke="#1b2430" stroke-width="2"/>${text(20, 20, 8, '#1b2430', 'БИЛЕТ')}${text(20, 42, 16, '#e63946', String(i + 1))}</g></g>`;
const FAN = [-28, -14, 0, 14, 28];

const STUDY: Film = {
  title: 'Артём и Виктор Петрович садятся за билеты вместе.',
  svg: svg(`
    <rect width="${W}" height="${H}" fill="#f1e9d2"/><rect x="70" y="16" width="220" height="62" rx="6" fill="#2f5d50"/>
    ${text(180, 56, 20, '#f1f1f1', '800 вопросов', 'opacity="0.9"')}
    <rect y="160" width="${W}" height="40" fill="#b07d4f"/>
    <g class="f-left">${bust('artem', 6, 68, 132)}</g><g class="f-right">${bust('victor', 222, 68, 132)}</g>
    ${FAN.map((_, i) => ticket(i)).join('')}
    <g class="f-star" ${BOX}><path d="M180 64L186 80H203L189 90L194 106L180 96L166 106L171 90L157 80H174Z" fill="#ffb703" stroke="#c77d00" stroke-width="2"/></g>`),
  steps: [
    { sel: '.f-left', at: 0, dur: 0.5, kf: [{ transform: 'translateX(-150px)' }, { transform: 'translateX(0px)' }], ease: 'ease-out' },
    { sel: '.f-right', at: 0.15, dur: 0.5, kf: [{ transform: 'translateX(150px)' }, { transform: 'translateX(0px)' }], ease: 'ease-out' },
    ...FAN.map((deg, i) => ({
      sel: `.f-t${i}`,
      at: 0.6 + i * 0.15,
      dur: 0.45,
      kf: [{ opacity: 0, transform: 'translateY(90px) rotate(0deg)' }, { opacity: 1, transform: `translateY(0px) rotate(${deg}deg)` }],
      ease: BOUNCE,
    })),
    { sel: '.f-star', at: 1.6, dur: 0.5, kf: pop, ease: BOUNCE },
  ],
  sounds: [{ at: 1.6, name: 'correct' }],
};

const FREE: Film = {
  title: 'Артём уезжает на мопеде «Турбо» в ночь. В окне «Стрелы» пустой стул.',
  svg: svg(`
    <rect width="${W}" height="${H}" fill="#141a2e"/>${stars(14, 7)}
    <path d="M0 92H${W}V96H0Z" fill="#0b0e18"/><path d="M120 92V80H134V72H150V92ZM210 92V76H226V84H244V92Z" fill="#0b0e18"/>
    <path d="M40 ${H}L172 94H188L320 ${H}Z" fill="#262b36"/>
    <path d="M178 100H182L183 112H177ZM176 126H184L186 146H174ZM172 164H188L192 ${H}H168Z" fill="#cfd4dc" opacity="0.6"/>
    <g transform="translate(14 40)"><rect width="96" height="112" fill="#2e3a59"/><rect class="f-window" x="14" y="18" width="68" height="58" fill="#ffe8a3"/>
      <path d="M36 70V50H58V58H40V70M40 58H58V70" stroke="#2e3a59" stroke-width="4" fill="none"/><rect x="14" y="80" width="68" height="6" fill="#ffd166"/></g>
    <g class="f-ride" ${BOX}><g transform="translate(180 178)">
      <path d="M-14 -6H14L10 -26H-10Z" fill="#14161f"/><path d="M-12 -18H12" stroke="#f77f00" stroke-width="3"/>
      <circle cx="0" cy="-34" r="8" fill="#b5651d"/><rect x="-16" y="-4" width="32" height="10" rx="3" fill="#f77f00"/>
      <circle class="f-tail" cx="0" cy="1" r="4" fill="#ff3b30"/></g></g>`),
  steps: [
    { sel: '.f-ride', at: 0.3, dur: 3.2, kf: [{ transform: 'translateY(0px) scale(1.5)', opacity: 1 }, { transform: 'translateY(-80px) scale(0.15)', opacity: 1, offset: 0.92 }, { transform: 'translateY(-82px) scale(0.1)', opacity: 0 }], ease: 'cubic-bezier(.4,0,.9,.6)' },
    { sel: '.f-tail', at: 0.3, dur: 0.3, kf: [{ opacity: 1 }, { opacity: 0.4 }], times: 10, alt: true },
    { sel: '.f-window', at: 3.4, dur: 1.2, kf: [{ opacity: 1 }, { opacity: 0.35 }] },
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
