/**
 * Рисовка ролика-истории: плоские цвета, тёмный контур от руки, свет и цветокоррекция кадра — как у
 * образца Артёма (мультяшная история с героем). Всё рисуется кодом в SVG (1080×1920 на кадр).
 */

export const W = 1080;
export const H = 1920;

/** Контур и основные цвета. */
export const OL = '#2a221d';
export const SW = 5;
export const COL = {
  skin: '#efc39b',
  skinShade: '#d9a37a',
  hair: '#1d1a1e',
  hoodie: '#d9a33d',
  hoodieShade: '#b5832a',
  jeans: '#3d4b66',
  shoe: '#e9e4da',
  dadHair: '#8f8b86',
  dadSweater: '#6f5442',
  dadSweaterShade: '#58402f',
  shirt: '#e8e4dc',
  wall: '#c9c2b4',
  floor: '#9c8c76',
  wood: '#a87b52',
  woodDark: '#80593a',
  screen: '#dfe7ee',
  red: '#d2443a',
  green: '#3fa45b',
  sky: '#9fb4c2',
};

const attrs = (fill: string, sw: number, extra: string) =>
  `fill="${fill}" stroke="${sw ? OL : 'none'}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}`;
export const path = (d: string, fill = 'none', sw = SW, extra = '') => `<path d="${d}" ${attrs(fill, sw, extra)}/>`;
export const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, sw = SW, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${attrs(fill, sw, extra)}/>`;
export const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, sw = SW, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs(fill, sw, extra)}/>`;
/** Трубка с контуром: руки, ноги, провода. */
export const tube = (d: string, color: string, w: number, extra = '') =>
  `<g ${extra}><path d="${d}" fill="none" stroke="${OL}" stroke-width="${w + SW * 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
/** Группа. Если у неё есть id/класс (её двигает анимация), сдвиг кладётся во внешнюю группу: GSAP
 *  заменяет атрибут transform у того, что анимирует. */
export const g = (body: string, tr = '', extra = '') =>
  tr && extra ? `<g transform="${tr}"><g ${extra}>${body}</g></g>` : `<g ${tr ? `transform="${tr}"` : ''} ${extra}>${body}</g>`;
export const text = (x: number, y: number, s: string, size: number, fill: string, weight = 800, extra = '') =>
  `<text ${extra} x="${x}" y="${y}" font-family="Montserrat" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle">${s}</text>`;

/** Общие фильтры и градиенты: дрожание линии «от руки», размытие фона, свечение. */
export const DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
  <filter id="blur6" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur14" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
  <radialGradient id="glowW"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowY"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB"><stop offset="0" stop-color="#cfe6ff" stop-opacity="0.95"/><stop offset="1" stop-color="#6f9fd8" stop-opacity="0"/></radialGradient>
  <linearGradient id="sunbeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.85"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient>
</defs></svg>`;

export const glow = (cx: number, cy: number, r: number, id: 'glowW' | 'glowY' | 'glowB', op = 1, extra = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})" opacity="${op}" ${extra}/>`;

// ─── Лица ─────────────────────────────────────────────────────────────────────

export type Expr = 'neutral' | 'sad' | 'cry' | 'tired' | 'focus' | 'smile' | 'joy' | 'surprise' | 'sleep' | 'determined' | 'skeptic';

const IRIS = '#3b2a22';
/** Открытый глаз: белок-миндаль, радужка, блик и верхнее веко. `lid` — насколько прикрыт (0…1). */
function eye(cx: number, cy: number, f: number, lx: number, ly: number, lid: number, wet = false) {
  const w = 17;
  const almond = `M${cx - w},${cy} Q${cx},${cy - 13} ${cx + w},${cy} Q${cx},${cy + 9} ${cx - w},${cy}Z`;
  let s = path(almond, '#fbf8f2', 0);
  s += `<circle cx="${cx + lx}" cy="${cy + 1 + ly}" r="7.5" fill="${IRIS}"/>`;
  s += `<circle cx="${cx + lx - 2.5}" cy="${cy - 2 + ly}" r="${wet ? 3.4 : 2.3}" fill="#fff"/>`;
  if (wet) s += `<path d="M${cx - w + 4},${cy + 4} Q${cx},${cy + 10} ${cx + w - 4},${cy + 4}" fill="none" stroke="#bfe0ff" stroke-width="3" opacity="0.9"/>`;
  if (lid > 0) {
    const y = cy - 11 + lid * 16;
    s += path(`M${cx - w - 3},${cy + 1} Q${cx - w},${cy - 16} ${cx},${cy - 16} Q${cx + w},${cy - 16} ${cx + w + 3},${cy + 1} L${cx + w + 3},${y} Q${cx},${y + 5} ${cx - w - 3},${y}Z`, COL.skin, 0);
    s += path(`M${cx - w - 2},${y} Q${cx},${y + 5} ${cx + w + 2},${y}`, 'none', 4.5);
  } else s += path(`M${cx - w - 2},${cy + 1} Q${cx},${cy - 15} ${cx + w + 2},${cy}`, 'none', 4.5);
  void f;
  return s;
}
const closedEye = (cx: number, cy: number, up: boolean) =>
  path(up ? `M${cx - 16},${cy + 3} Q${cx},${cy - 11} ${cx + 16},${cy + 3}` : `M${cx - 16},${cy - 2} Q${cx},${cy + 9} ${cx + 16},${cy - 2}`, 'none', 4.5);
const brow = (x1: number, y1: number, x2: number, y2: number, bend = -4) => path(`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) + bend} ${x2},${y2}`, 'none', 5);

/** Глаза, брови и рот героя (центр лица 0,0; глаза на y = 6). */
export function face(e: Expr, look: [number, number] = [0, 0]) {
  const [lx, ly] = look;
  const L = -27;
  const R = 27;
  const ey = 6;
  let eyes = '';
  let brows = '';
  let mouth = '';
  let more = '';
  switch (e) {
    case 'neutral':
      eyes = eye(L, ey, 1, lx, ly, 0.15) + eye(R, ey, 1, lx, ly, 0.15);
      brows = brow(-45, -16, -11, -17) + brow(11, -17, 45, -16);
      mouth = path('M-12,48 Q0,51 12,48', 'none', 4.5);
      break;
    case 'sad':
    case 'cry':
      eyes = eye(L, ey, 1, lx, ly + 3, 0.45, e === 'cry') + eye(R, ey, 1, lx, ly + 3, 0.45, e === 'cry');
      brows = brow(-45, -10, -11, -22, -2) + brow(11, -22, 45, -10, -2);
      mouth = path('M-15,53 Q0,44 15,53', 'none', 4.5);
      break;
    case 'tired':
      eyes = eye(L, ey, 1, lx, ly + 2, 0.6) + eye(R, ey, 1, lx, ly + 2, 0.6);
      brows = brow(-45, -12, -11, -14, -1) + brow(11, -14, 45, -12, -1);
      mouth = path('M-11,50 H11', 'none', 4.5);
      more = path(`M${L - 12},${ey + 14} Q${L},${ey + 20} ${L + 12},${ey + 14} M${R - 12},${ey + 14} Q${R},${ey + 20} ${R + 12},${ey + 14}`, 'none', 3, 'stroke="#b07c5c" opacity="0.8"');
      break;
    case 'focus':
      eyes = eye(L, ey, 1, lx, ly, 0.2) + eye(R, ey, 1, lx, ly, 0.2);
      brows = brow(-45, -16, -11, -12, -3) + brow(11, -12, 45, -16, -3);
      mouth = path('M-11,49 Q1,55 13,46', 'none', 4.5);
      break;
    case 'smile':
      eyes = eye(L, ey, 1, lx, ly, 0.2) + eye(R, ey, 1, lx, ly, 0.2);
      brows = brow(-45, -18, -11, -18, -6) + brow(11, -18, 45, -18, -6);
      mouth = path('M-18,45 Q0,60 18,45', 'none', 4.5);
      break;
    case 'joy':
      eyes = closedEye(L, ey, true) + closedEye(R, ey, true);
      brows = brow(-45, -20, -11, -22, -7) + brow(11, -22, 45, -20, -7);
      mouth = path('M-24,40 Q0,78 24,40 Z', '#7c2f2c', 4.5) + path('M-19,43 Q0,50 19,43 L17,49 Q0,55 -17,49Z', '#fff', 0);
      more = ell(-44, 30, 12, 7, '#ff8f7a', 0, 'opacity="0.35"') + ell(44, 30, 12, 7, '#ff8f7a', 0, 'opacity="0.35"');
      break;
    case 'surprise':
      eyes = eye(L, ey, 1, lx, ly, 0) + eye(R, ey, 1, lx, ly, 0);
      brows = brow(-45, -26, -11, -28, -6) + brow(11, -28, 45, -26, -6);
      mouth = ell(0, 50, 9, 11, '#7c2f2c', 4.5);
      break;
    case 'sleep':
      eyes = closedEye(L, ey + 2, false) + closedEye(R, ey + 2, false);
      brows = brow(-45, -12, -11, -13) + brow(11, -13, 45, -12);
      mouth = ell(0, 50, 6, 5, '#7c2f2c', 4);
      break;
    case 'determined':
      eyes = eye(L, ey, 1, lx, ly, 0.3) + eye(R, ey, 1, lx, ly, 0.3);
      brows = brow(-45, -18, -11, -10, -2) + brow(11, -10, 45, -18, -2);
      mouth = path('M-14,48 Q2,52 15,45', 'none', 4.5);
      break;
    case 'skeptic':
      eyes = eye(L, ey, 1, lx, ly, 0.45) + eye(R, ey, 1, lx, ly, 0.1);
      brows = brow(-45, -12, -11, -10, -1) + brow(11, -24, 45, -28, -8);
      mouth = path('M-14,50 Q2,46 14,52', 'none', 4.5);
      break;
  }
  const nose = path('M-1,18 Q7,30 -3,33', 'none', 4);
  return more + eyes + brows + nose + mouth;
}

/** Голова героя (центр 0,0): лицо, уши, тёмные лохматые волосы с чёлкой. */
export function heroHead(e: Expr, look: [number, number] = [0, 0], extra = '') {
  return g(
    rect(-18, 52, 36, 50, COL.skinShade) +
      ell(-70, 12, 12, 19, COL.skin) +
      ell(70, 12, 12, 19, COL.skin) +
      path('M-70,-6 C-74,52 -40,86 0,86 C40,86 74,52 70,-6 C66,-58 34,-84 0,-84 C-34,-84 -66,-58 -70,-6Z', COL.skin) +
      face(e, look) +
      path(
        'M-78,14 C-88,-58 -46,-104 4,-102 C52,-104 90,-62 78,12 L70,-10 L62,-30 L50,-22 L42,-42 L28,-28 L18,-46 L4,-30 L-8,-46 L-20,-28 L-32,-42 L-42,-24 L-56,-36 L-62,-14 L-70,-24 Z',
        COL.hair,
      ) +
      path('M-24,-90 Q-6,-98 14,-92', 'none', 3, 'stroke="#4a4550"') +
      extra,
  );
}

/** Голова папы: седые волосы с залысинами, усы, очки по желанию. */
export function dadHead(e: Expr, look: [number, number] = [0, 0], glasses = true) {
  const gl = glasses
    ? `<g fill="none" stroke="${OL}" stroke-width="4"><rect x="-48" y="-8" width="38" height="28" rx="9"/><rect x="10" y="-8" width="38" height="28" rx="9"/><path d="M-10,2 H10"/></g>`
    : '';
  return g(
    rect(-20, 56, 40, 46, COL.skinShade) +
      ell(-74, 14, 12, 19, COL.skin) +
      ell(74, 14, 12, 19, COL.skin) +
      path('M-74,-4 C-78,58 -42,94 0,94 C42,94 78,58 74,-4 C70,-60 36,-86 0,-86 C-36,-86 -70,-60 -74,-4Z', COL.skin) +
      face(e, look) +
      path('M-34,40 Q-18,30 0,36 Q18,30 34,40 Q20,48 0,42 Q-20,48 -34,40Z', '#6d6560', 4) +
      gl +
      path('M-80,10 C-86,-40 -68,-74 -40,-82 L-46,-50 L-60,-36 L-66,-6 Z', COL.dadHair) +
      path('M80,10 C86,-40 68,-74 40,-82 L46,-50 L60,-36 L66,-6 Z', COL.dadHair) +
      path('M-40,-82 Q0,-96 40,-82 Q20,-74 0,-76 Q-20,-74 -40,-82Z', COL.dadHair),
  );
}

/** Плечи в худи (под головой героя, шея на y = 90). */
export function hoodieBust(w = 1, color = COL.hoodie, shade = COL.hoodieShade) {
  return g(
    path(`M${-170 * w},420 C${-170 * w},200 ${-120 * w},116 -44,104 L44,104 C${120 * w},116 ${170 * w},200 ${170 * w},420 Z`, color) +
      path('M-66,100 Q0,154 66,100 Q44,84 0,98 Q-44,84 -66,100Z', shade) +
      path(`M${-90 * w},200 Q${-96 * w},300 ${-104 * w},420 M${90 * w},200 Q${96 * w},300 ${104 * w},420`, 'none', 4, `stroke="${shade}"`) +
      tube('M-16,128 L-20,188', '#f3ead8', 5) +
      tube('M16,128 L20,188', '#f3ead8', 5),
  );
}
export function sweaterBust(w = 1) {
  return g(
    path(`M${-180 * w},420 C${-180 * w},200 ${-126 * w},118 -46,108 L46,108 C${126 * w},118 ${180 * w},200 ${180 * w},420 Z`, COL.dadSweater) +
      path('M-46,106 L0,150 L46,106 Q0,124 -46,106Z', COL.shirt) +
      path('M-42,114 L-10,148 M42,114 L10,148', 'none', 4, `stroke="${COL.dadSweaterShade}"`),
  );
}

/** Рука-ладонь (круглая с пальцами), центр 0,0. */
export const palm = (r = 26, color = COL.skin) =>
  g(ell(0, 0, r, r * 0.92, color) + path(`M${-r * 0.4},${-r * 0.6} q${r * 0.2},${-r * 0.5} ${r * 0.4},0 M${r * 0.05},${-r * 0.7} q${r * 0.2},${-r * 0.5} ${r * 0.4},0`, 'none', 3.5));

/** Человек в полный рост: худи, джинсы. `legs`/`arms` — пути от бедра/плеча; x,y — середина бёдер. */
export interface Body {
  head: string;
  arms: [string, string];
  legs: [string, string];
  torso?: string;
  coat?: string;
  coatShade?: string;
  pants?: string;
  hands?: boolean;
}
export function body(b: Body) {
  const coat = b.coat ?? COL.hoodie;
  const shade = b.coatShade ?? COL.hoodieShade;
  const end = (d: string) => {
    const m = d.match(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)\s*$/);
    return m ? [Number(m[1]), Number(m[2])] : [0, 0];
  };
  const legs = b.legs.map((d) => tube(d, b.pants ?? COL.jeans, 46)).join('');
  const feet = b.legs
    .map((d) => {
      const [x, y] = end(d);
      return ell(x + 8, y + 10, 30, 15, COL.shoe);
    })
    .join('');
  const arms = b.arms.map((d) => tube(d, coat, 40)).join('');
  const hands = b.hands === false ? '' : b.arms.map((d) => g(palm(19), `translate(${end(d).join(' ')})`)).join('');
  const torso = b.torso ?? `M-78,-250 C-96,-200 -92,-60 -76,0 L76,0 C92,-60 96,-200 78,-250 Q0,-276 -78,-250Z`;
  return legs + feet + path(torso, coat) + path('M-50,-252 Q0,-214 50,-252', 'none', 4, `stroke="${shade}"`) + arms + hands + g(b.head, 'translate(0 -350) scale(0.95)');
}

// ─── Предметы ─────────────────────────────────────────────────────────────────

/** Телефон (центр 0,0), экран — свой SVG в координатах 0..w, 0..h. */
export function phone(w: number, h: number, screen: string, tilt = 0, extra = '') {
  const id = `ph${Math.round(w)}${Math.round(h)}${Math.round(tilt * 10)}${screen.length}`;
  return g(
    rect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24, '#1d1d22', 34) +
      `<clipPath id="${id}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="24"/></clipPath>` +
      g(g(screen, `translate(${-w / 2} ${-h / 2})`), '', `clip-path="url(#${id})"`) +
      rect(-36, -h / 2 - 4, 72, 14, '#1d1d22', 7, 0),
    `rotate(${tilt})`,
    extra,
  );
}

/** Экран игры: вид сверху на перекрёсток, жёлтая машина, пешеход на зебре, кнопки вариантов. */
export function gameScreen(w: number, h: number, opts: { check?: boolean; map?: boolean } = {}) {
  if (opts.map) {
    // Карта района с пройденными точками.
    let s = rect(0, 0, w, h, '#6f8b5e', 0, 0);
    for (let i = 0; i < 4; i++) s += rect(0, 90 + i * (h / 4), w, 46, '#5c5c63', 0, 0) + rect(40 + i * (w / 4), 0, 46, h, '#5c5c63', 0, 0);
    const pts = [
      [63, 113], [63 + w / 4, 113], [63 + w / 2, 113 + h / 4], [63 + (3 * w) / 4, 113 + h / 2], [63, 113 + h / 2], [63 + w / 4, 113 + (3 * h) / 4], [63 + w / 2, 113 + (3 * h) / 4], [63 + (3 * w) / 4, 113],
    ];
    pts.forEach(([x, y], i) => (s += g(`<circle r="22" fill="${COL.green}" stroke="#fff" stroke-width="4"/><path d="M-9,0 l6,7 l12,-13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`, `translate(${x} ${y})`, `class="mapchk" data-i="${i}"`)));
    s += g(rect(-16, -26, 32, 52, '#f2c230', 8, 3) + rect(-11, -14, 22, 14, '#3a4a5a', 3, 0), `translate(${63 + w / 2} ${113 + h / 4 + 70})`);
    return s;
  }
  const road = '#5d5d64';
  let s = rect(0, 0, w, h, '#7a9468', 0, 0);
  s += rect(w * 0.36, 0, w * 0.28, h, road, 0, 0) + rect(0, h * 0.28, w, h * 0.16, road, 0, 0);
  for (let i = 0; i < 6; i++) s += rect(w * 0.37 + i * (w * 0.045), h * 0.46, w * 0.03, h * 0.045, '#f1f1ea', 0, 0);
  s += g(rect(-17, -30, 34, 60, '#f2c230', 9, 3) + rect(-12, -16, 24, 15, '#3a4a5a', 3, 0), `translate(${w * 0.55} ${h * 0.6})`, 'id="gcar"');
  s += g(`<circle r="11" fill="#e05a4a" stroke="${OL}" stroke-width="3"/>`, `translate(${w * 0.42} ${h * 0.48})`, 'id="gped"');
  // Карточка вопроса: три варианта (без текста — мелко, как в игре на расстоянии).
  s += rect(14, h * 0.62, w - 28, h * 0.36, '#fbfaf6', 18, 0);
  s += rect(30, h * 0.64, w * 0.7, 12, '#c9c6bf', 6, 0) + rect(30, h * 0.665, w * 0.5, 12, '#c9c6bf', 6, 0);
  [0, 1, 2].forEach((i) => {
    const y = h * 0.71 + i * h * 0.085;
    const ok = opts.check && i === 1;
    s += rect(30, y, w - 60, h * 0.065, ok ? '#d9f2df' : '#eeece6', 12, 0, ok ? `stroke="${COL.green}" stroke-width="4" id="gopt"` : '');
    s += rect(48, y + h * 0.025, w * 0.42, 10, ok ? '#7fbf8f' : '#c9c6bf', 5, 0);
  });
  if (opts.check)
    s += g(`<circle r="34" fill="${COL.green}"/><path d="M-15,0 l10,11 l20,-22" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`, `translate(${w * 0.82} ${h * 0.2})`, 'id="gchk"');
  return s;
}

/** Монитор экзамена (центр 0,0): результат «сдан / не сдан» или ход экзамена. */
export function examMonitor(kind: 'fail' | 'fail2' | 'pass' | 'run', w = 900, h = 600) {
  const top = -h / 2;
  let scr = rect(-w / 2, top, w, h, COL.screen, 6, 0) + rect(-w / 2, top, w, 64, '#2f5d8a', 0, 0);
  scr += text(-w / 2 + 30, top + 42, 'ЭКЗАМЕН  ·  ТЕОРИЯ', 26, '#fff', 700, 'text-anchor="start" letter-spacing="2"');
  if (kind === 'run') {
    scr += text(-w / 2 + 40, top + 120, 'Вопрос <tspan id="qn">1</tspan> из 20', 36, '#2b3440', 800, 'text-anchor="start"');
    for (let i = 0; i < 20; i++) scr += rect(-w / 2 + 40 + i * ((w - 80) / 20), top + 150, (w - 80) / 20 - 8, 22, '#c8d1d9', 4, 0, `class="qcell" data-i="${i}"`);
    scr += rect(-w / 2 + 40, top + 210, w * 0.55, 150, '#c9d3dc', 8, 0) + rect(w * 0.12, top + 210, w * 0.33, 18, '#b3bdc6', 6, 0) + rect(w * 0.12, top + 244, w * 0.26, 18, '#b3bdc6', 6, 0);
    [0, 1, 2].forEach((i) => (scr += rect(-w / 2 + 40, top + 390 + i * 62, w - 80, 48, '#eef2f5', 10, 0, 'stroke="#9fb0bf" stroke-width="3"') + rect(-w / 2 + 64, top + 408 + i * 62, 300 - i * 40, 12, '#b9c3cc', 6, 0)));
  } else {
    const ok = kind === 'pass';
    const c = ok ? COL.green : COL.red;
    scr += g(`<circle r="62" fill="${c}"/>` + (ok ? '<path d="M-28,0 l18,20 l38,-42" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-24,-24 L24,24 M24,-24 L-24,24" stroke="#fff" stroke-width="14" stroke-linecap="round"/>'), `translate(0 ${top + 200})`);
    scr += text(0, top + 348, ok ? 'ЭКЗАМЕН СДАН' : 'ЭКЗАМЕН НЕ СДАН', 66, c, 900);
    scr += text(0, top + 420, ok ? 'Ошибок: 0 из 20' : kind === 'fail' ? 'Ошибок: 3 из 20' : 'Ошибок: 2 в одном блоке', 36, '#3a4450', 700);
    scr += text(0, top + 480, kind === 'fail2' ? 'Попытка 2' : kind === 'fail' ? 'Попытка 1' : 'Попытка 3', 30, '#7a8590', 600);
  }
  return g(
    rect(-w / 2 - 34, top - 34, w + 68, h + 68, '#2d3036', 22) + scr + rect(-70, h / 2 + 34, 140, 120, '#2d3036', 0) + rect(-200, h / 2 + 150, 400, 30, '#2d3036', 12),
  );
}

/** Курсор-стрелка. */
export const cursor = (x: number, y: number, extra = '') => g(path('M0,0 L0,58 L15,44 L26,70 L37,65 L26,40 L46,40 Z', '#fff', 4), `translate(${x} ${y})`, extra);

/** Капли дождя (класс .rain — анимируются сдвигом вниз). */
export function rain(n: number, seed = 1, w = W, h = H) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * (w + 200) - 100;
    const y = rnd() * h * 2 - h;
    s += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l-10,46" stroke="#dfe8f0" stroke-width="3" opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`;
  }
  return s;
}

/** Здание ГИБДД (фасад), x — центр, y — земля. */
export function gibdd(x: number, y: number, sunny: boolean) {
  const wall = sunny ? '#d8d2c4' : '#a7aaad';
  let s = rect(x - 470, y - 900, 940, 900, wall);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) s += rect(x - 410 + c * 170, y - 820 + r * 200, 110, 130, sunny ? '#9fc3d8' : '#6f7d88', 4, 4);
  s += rect(x - 220, y - 1010, 440, 100, '#2f5d8a', 8) + text(x, y - 942, 'ГИБДД', 64, '#fff', 900, 'letter-spacing="8"');
  s += rect(x - 110, y - 260, 220, 260, '#5c6670', 4) + path(`M${x},${y - 260} V${y}`, 'none', 4);
  s += rect(x - 160, y - 30, 320, 30, '#8d8f90', 0, 4) + rect(x - 200, y, 400, 30, '#8d8f90', 0, 4);
  return s;
}

/** Окно с рамой (x, y — левый верх). */
export const windowFrame = (x: number, y: number, w: number, h: number, glass: string) =>
  rect(x, y, w, h, glass, 4, 7) + path(`M${x + w / 2},${y} V${y + h} M${x},${y + h * 0.42} H${x + w}`, 'none', 7) + rect(x - 24, y + h, w + 48, 26, '#e7e2d7', 4);

/** Стопка распечатанных билетов. */
export function ticketPile(x: number, y: number, n = 7) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const dx = ((i * 37) % 23) - 11;
    s += g(rect(-130, -14, 260, 28, '#f6f3ea', 3, 4), `translate(${x + dx} ${y - i * 26}) rotate(${((i * 13) % 9) - 4})`);
  }
  s += g(rect(-150, -100, 300, 200, '#fbf9f2', 4, 4) + text(0, -40, 'БИЛЕТЫ ПДД', 30, '#2b2b2b', 900) + rect(-110, -6, 220, 10, '#cfcac0', 4, 0) + rect(-110, 20, 180, 10, '#cfcac0', 4, 0) + rect(-110, 46, 200, 10, '#cfcac0', 4, 0), `translate(${x} ${y - n * 26 - 60}) rotate(-5)`);
  return s;
}

/** Настенные часы. */
export const clock = (x: number, y: number, r: number, h: number, m: number, extra = '') => {
  const a = (deg: number, len: number) => `M0,0 L${(Math.sin((deg * Math.PI) / 180) * len).toFixed(1)},${(-Math.cos((deg * Math.PI) / 180) * len).toFixed(1)}`;
  let ticks = '';
  for (let i = 0; i < 12; i++) ticks += path(a(i * 30, r - 6).replace('M0,0 L', `M${(Math.sin((i * Math.PI) / 6) * (r - 18)).toFixed(1)},${(-Math.cos((i * Math.PI) / 6) * (r - 18)).toFixed(1)} L`), 'none', 4);
  return g(`<circle r="${r}" fill="#f4f0e6" stroke="${OL}" stroke-width="6"/>` + ticks + path(a((h % 12) * 30 + m / 2, r * 0.5), 'none', 7) + g(path(a(m * 6, r * 0.78), 'none', 5), '', 'class="minute"') + `<circle r="7" fill="${OL}"/>`, `translate(${x} ${y})`, extra);
};

/** Легковая машина сбоку (x — центр, y — земля). */
export function carSide(x: number, y: number, color: string, f: 1 | -1 = 1, extra = '') {
  return g(
    path('M-250,-40 Q-250,-110 -190,-118 L-110,-124 Q-60,-200 40,-200 Q130,-200 170,-124 L230,-112 Q262,-100 262,-40 Z', color) +
      path('M-96,-126 Q-56,-186 24,-186 L28,-126 Z M48,-126 L44,-186 Q118,-182 150,-126 Z', '#b9d3e2') +
      ell(-150, -30, 48, 48, '#2a2a2e') +
      ell(-150, -30, 20, 20, '#b8b8b8', 4) +
      ell(150, -30, 48, 48, '#2a2a2e') +
      ell(150, -30, 20, 20, '#b8b8b8', 4) +
      rect(236, -96, 22, 18, '#ffe9a0', 4, 4),
    `translate(${x} ${y}) scale(${f} 1)`,
    extra,
  );
}

/** Дорожный знак «Главная дорога» на столбе. */
export const mainRoadSign = (x: number, y: number, s = 1) =>
  g(rect(-8, 0, 16, 420, '#9a9a9a', 0, 4) + g(rect(-60, -60, 120, 120, '#fff', 6, 5) + rect(-40, -40, 80, 80, '#f2c230', 4, 4), 'rotate(45)'), `translate(${x} ${y}) scale(${s})`);
/** Светофор. */
export const trafficLight = (x: number, y: number, on: 'red' | 'yellow' | 'green', s = 1) =>
  g(
    rect(-10, 120, 20, 500, '#55595e', 0, 4) +
      rect(-48, -60, 96, 220, '#2e3135', 16) +
      (['red', 'yellow', 'green'] as const).map((c, i) => `<circle cx="0" cy="${-10 + i * 64}" r="24" fill="${c === on ? { red: '#ff4a3a', yellow: '#ffc93a', green: '#4ae07a' }[c] : '#4a4d52'}" stroke="${OL}" stroke-width="4"/>`).join('') +
      (on ? glow(0, on === 'red' ? -10 : on === 'yellow' ? 54 : 118, 90, 'glowY', 0.5) : ''),
    `translate(${x} ${y}) scale(${s})`,
  );
