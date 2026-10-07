/**
 * Ещё рисунки «под гравюру» для третьей серии: звери, корабли, постройки, лабиринт, оружие.
 * Начало координат у зверей и предметов — на земле под серединой, смотрят вправо (f = -1 — влево).
 */
import { C } from './engine3.ts';
import { rng, rock, sh, wh } from './etch.ts';

const P = C.paper;
const I = C.ink;
const r1 = (n: number) => Math.round(n * 10) / 10;
const at = (x: number, y: number, s: number, f: 1 | -1, body: string, attrs = '') =>
  `<g transform="translate(${x} ${y}) scale(${r1(s * f * 100) / 100} ${s})" stroke-width="3" ${attrs}>${body}</g>`;
/** Толстая линия с контуром и штриховкой (лапы, верёвки, стены). */
export const tube = (d: string, w: number, pat?: string) =>
  `<path d="${d}" stroke="${I}" stroke-width="${w + 6}"/><path d="${d}" stroke="${P}" stroke-width="${w}"/>${pat ? `<path d="${d}" stroke="url(#${pat})" stroke-width="${w}"/>` : ''}`;

// ─── Природа ───────────────────────────────────────────────────────────────────

/** Валун: круг из граней. */
export const boulder = (id: string, cx: number, cy: number, r: number, seed = 7) =>
  rock(id, `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`, [cx - r - 10, cy - r - 10, 2 * r + 20, 2 * r + 20], r * 0.55, seed, 0.35);

/** Дерево: ствол и крона из клубов (или голые ветви). */
export function etree(x: number, floor: number, h: number, seed = 1, bare = false, pat = 'a120'): string {
  const r = rng(seed);
  const trunk = `M${x - h * 0.05},${floor} C${x - h * 0.04},${floor - h * 0.4} ${x - h * 0.03},${floor - h * 0.6} ${x - h * 0.02},${floor - h * 0.75} L${x + h * 0.02},${floor - h * 0.75} C${x + h * 0.03},${floor - h * 0.6} ${x + h * 0.04},${floor - h * 0.4} ${x + h * 0.06},${floor} Z`;
  if (bare) {
    let br = '';
    for (let i = 0; i < 7; i++) {
      const y = floor - h * (0.35 + i * 0.09);
      const side = i % 2 ? 1 : -1;
      const len = h * (0.32 - i * 0.03);
      br += `M${x},${r1(y)} q${r1(side * len * 0.4)},${r1(-len * 0.3)} ${r1(side * len)},${r1(-len * 0.55 - r() * 20)} `;
      br += `M${r1(x + side * len * 0.6)},${r1(y - len * 0.3)} l${r1(side * 26)},${r1(-30 - r() * 10)} `;
    }
    return `${sh(trunk, 'b90')}<path d="${br} M${x},${floor - h * 0.75} V${floor - h}" stroke-width="5"/>`;
  }
  const clumps = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + r();
    const cx = x + Math.cos(a) * h * 0.18;
    const cy = floor - h * 0.72 + Math.sin(a) * h * 0.16;
    const rr = h * (0.13 + r() * 0.05);
    return `M${r1(cx - rr)},${r1(cy)} a${r1(rr)},${r1(rr * 0.85)} 0 1 0 ${r1(2 * rr)},0 a${r1(rr)},${r1(rr * 0.85)} 0 1 0 ${r1(-2 * rr)},0 Z`;
  });
  return `${sh(trunk, 'b90')}${clumps.map((d, i) => sh(d, i % 3 ? pat : 'b120', 'stroke-width="3"')).join('')}`;
}

/** Звёзды: светлые точки и несколько крестиков (на тёмном небе). */
export function starDots(x: number, y: number, w: number, h: number, n: number, seed = 9): string {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const sx = r1(x + r() * w);
    const sy = r1(y + r() * h);
    return i % 6 === 0
      ? `<path d="M${sx - 16},${sy} H${sx + 16} M${sx},${sy - 16} V${sy + 16}" stroke="${P}" stroke-width="5"/><circle cx="${sx}" cy="${sy}" r="5" fill="${P}" stroke="none"/>`
      : `<circle cx="${sx}" cy="${sy}" r="${r1(3 + r() * 3.5)}" fill="${P}" stroke="none"/>`;
  }).join('');
}

/** Снег: снежинки-звёздочки. */
export function snow(x: number, y: number, w: number, h: number, n: number, seed = 11): string {
  const r = rng(seed);
  return `<g stroke-width="2.5">${Array.from({ length: n }, () => {
    const sx = r1(x + r() * w);
    const sy = r1(y + r() * h);
    const k = 5 + r() * 6;
    return `<path d="M${sx - k},${sy} H${sx + k} M${r1(sx - k * 0.5)},${r1(sy - k * 0.86)} L${r1(sx + k * 0.5)},${r1(sy + k * 0.86)} M${r1(sx - k * 0.5)},${r1(sy + k * 0.86)} L${r1(sx + k * 0.5)},${r1(sy - k * 0.86)}"/>`;
  }).join('')}</g>`;
}

/** Цветок на стебле. */
export const flower = (x: number, floor: number, h: number, petals = 7) =>
  `<path d="M${x},${floor} C${x - 10},${floor - h * 0.4} ${x + 10},${floor - h * 0.7} ${x},${floor - h}" stroke-width="5"/>
   ${sh(`M${x},${floor - h * 0.45} q40,-30 70,-10 q-30,26 -70,10 Z`, 'c60')}
   ${Array.from({ length: petals }, (_, i) => `<ellipse cx="${x}" cy="${floor - h - 34}" rx="16" ry="34" fill="${P}" transform="rotate(${(i * 360) / petals} ${x} ${floor - h})"/>`).join('')}
   <circle cx="${x}" cy="${floor - h}" r="18" fill="url(#hd)"/><circle cx="${x}" cy="${floor - h}" r="18"/>`;

/** Колос. */
export const wheat = (x: number, floor: number, h: number, droop = 0) =>
  `<path d="M${x},${floor} Q${x + droop * 0.3},${floor - h * 0.6} ${x + droop},${floor - h}" stroke-width="3"/>${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${r1(x + droop * (0.8 + i * 0.05) - 8)}" cy="${floor - h + 10 + i * 14}" rx="7" ry="12" fill="${P}" transform="rotate(-25 ${r1(x + droop - 8)} ${floor - h + 10 + i * 14})"/><ellipse cx="${r1(x + droop * (0.8 + i * 0.05) + 8)}" cy="${floor - h + 10 + i * 14}" rx="7" ry="12" fill="${P}" transform="rotate(25 ${r1(x + droop + 8)} ${floor - h + 10 + i * 14})"/>`).join('')}`;

// ─── Постройки и вещи ──────────────────────────────────────────────────────────

/** Храм с колоннами и фронтоном; x — середина, y — низ ступеней. */
export function temple(x: number, y: number, w: number, n = 5): string {
  const h = w * 0.62;
  const cols = Array.from({ length: n }, (_, i) => {
    const cx = x - w / 2 + w * 0.1 + (i * w * 0.8) / (n - 1);
    return `${sh(`M${r1(cx - w * 0.035)},${y - 24} V${r1(y - h)} H${r1(cx + w * 0.035)} V${y - 24} Z`, 'c90')}<path d="M${r1(cx - w * 0.05)},${r1(y - h)} h${r1(w * 0.1)}" stroke-width="5"/>`;
  }).join('');
  return `${wh(`M${x - w / 2 - 20},${y} h${w + 40} v-12 h-10 v-12 h${-w - 20} v12 h-10 Z`)}${cols}
    ${sh(`M${x - w / 2 - 14},${r1(y - h)} h${w + 28} v-26 h${-w - 28} Z`, 'a0')}
    ${wh(`M${x - w / 2 - 20},${r1(y - h - 26)} L${x},${r1(y - h - 26 - w * 0.22)} L${x + w / 2 + 20},${r1(y - h - 26)} Z`)}
    ${sh(`M${x - w / 2 + 20},${r1(y - h - 34)} L${x},${r1(y - h - 26 - w * 0.17)} L${x + w / 2 - 20},${r1(y - h - 34)} Z`, 'b0')}`;
}

/** Молния. */
export const bolt = (x: number, y: number, k = 1) =>
  `<path d="M${x},${y} l${-30 * k},${120 * k} l${40 * k},${-10 * k} l${-50 * k},${150 * k} l${90 * k},${-190 * k} l${-42 * k},${10 * k} l${32 * k},${-80 * k} Z" fill="${I}" stroke-width="2"/>`;

/** Крепостная стена с зубцами; y — верх стены. */
export function battlement(x: number, y: number, w: number, h: number): string {
  let teeth = '';
  for (let i = 0; i < w; i += 56) teeth += `M${x + i},${y} v-36 h32 v36 `;
  let d = '';
  for (let j = 0, yy = y; yy < y + h; j++, yy += 40) {
    d += `M${x},${yy} H${x + w} `;
    for (let i = (j % 2) * 40; i < w; i += 80) d += `M${x + i},${yy} v40 `;
  }
  return `${sh(`M${x},${y} h${w} v${h} h${-w} Z`, 'c0')}<path d="${d}" stroke-width="2.5"/>${sh(teeth, 'a0')}`;
}

/** Стрела от (x1, y1) к (x2, y2). */
export function arrow(x1: number, y1: number, x2: number, y2: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const p = (u: number, v: number) => `${r1(x2 + u * c - v * s)},${r1(y2 + u * s + v * c)}`;
  const q = (u: number, v: number) => `${r1(x1 + u * c - v * s)},${r1(y1 + u * s + v * c)}`;
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke-width="5"/><path d="M${p(0, 0)} L${p(-30, -12)} L${p(-30, 12)} Z" fill="${I}"/><path d="M${q(0, 0)} L${q(26, -14)} M${q(12, 0)} L${q(38, -14)} M${q(0, 0)} L${q(26, 14)} M${q(12, 0)} L${q(38, 14)}" stroke-width="3"/>`;
}

/** Копьё (обломок, если broken). */
export function spear(x1: number, y1: number, x2: number, y2: number, broken = false): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const p = (u: number, v: number) => `${r1(x2 + u * c - v * s)},${r1(y2 + u * s + v * c)}`;
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke-width="7"/>${broken ? `<path d="M${p(0, 0)} l${r1(10 * c + 8 * s)},${r1(10 * s - 8 * c)} l${r1(6 * c - 10 * s)},${r1(6 * s + 10 * c)}" stroke-width="4"/>` : sh(`M${p(50, 0)} L${p(0, -16)} L${p(-14, 0)} L${p(0, 16)} Z`, 'b30')}`;
}

/** Круглый щит. */
export const shield = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${P}"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#a30)" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${r * 0.7}" fill="${P}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r * 0.7}" fill="url(#c120)"/><circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="${I}"/>`;

/** Лук с натянутой тетивой (в руке — начало координат, стреляет вправо). */
export const bowDrawn = `<path d="M-10,-90 Q50,0 -10,90" stroke-width="7"/><path d="M-10,-90 L-60,0 L-10,90" stroke-width="2"/>`;

/** Меч остриём вверх (рукоять в начале координат). */
export const sword = (len = 220) =>
  `<path d="M-30,0 H30" stroke-width="9"/><path d="M0,0 V40" stroke-width="10"/><circle cx="0" cy="46" r="8" fill="${I}"/>${sh(`M-11,0 V${-len + 30} L0,${-len} L11,${-len + 30} V0 Z`, 'c90')}<path d="M0,-6 V${-len + 34}" stroke-width="2"/>`;

/** Трон с высокой спинкой; x — середина, floor — пол. */
export const throne = (x: number, floor: number) =>
  `${sh(`M${x - 110},${floor - 560} Q${x},${floor - 640} ${x + 110},${floor - 560} V${floor - 230} H${x - 110} Z`, 'a90')}
   ${wh(`M${x - 80},${floor - 520} Q${x},${floor - 580} ${x + 80},${floor - 520} V${floor - 250} H${x - 80} Z`)}${sh(`M${x - 80},${floor - 520} Q${x},${floor - 580} ${x + 80},${floor - 520} V${floor - 250} H${x - 80} Z`, 'c60')}
   ${sh(`M${x - 140},${floor - 230} H${x + 140} V${floor - 190} H${x - 140} Z`, 'b0')}
   <path d="M${x - 120},${floor - 190} V${floor} M${x + 120},${floor - 190} V${floor}" stroke-width="16"/>
   ${sh(`M${x - 150},${floor - 330} h40 v140 h-40 Z M${x + 110},${floor - 330} h40 v140 h-40 Z`, 'b90')}
   <circle cx="${x - 130}" cy="${floor - 340}" r="16" fill="${P}"/><circle cx="${x + 130}" cy="${floor - 340}" r="16" fill="${P}"/>`;

/** Пиршественный стол с кубками, виноградом и хлебом; top — столешница. */
export const feast = (x1: number, x2: number, top: number, floor: number) =>
  `${sh(`M${x1},${top} H${x2} V${top + 60} Q${(x1 + x2) / 2},${top + 90} ${x1},${top + 60} Z`, 'a90')}<path d="M${x1 + 30},${top + 70} V${floor} M${x2 - 30},${top + 70} V${floor}" stroke-width="10"/>
   ${[x1 + 50, x2 - 70].map((x) => `${wh(`M${x - 22},${top - 80} h44 q0,40 -22,46 q-22,-6 -22,-46 Z`)}<path d="M${x},${top - 34} V${top - 6} M${x - 18},${top - 4} h36" stroke-width="5"/>`).join('')}
   ${Array.from({ length: 9 }, (_, i) => `<circle cx="${(x1 + x2) / 2 - 30 + (i % 3) * 20 + (Math.floor(i / 3) % 2) * 10}" cy="${top - 14 - Math.floor(i / 3) * 18}" r="11" fill="url(#hd)"/>`).join('')}
   ${sh(`M${(x1 + x2) / 2 + 40},${top} q50,-70 110,0 Z`, 'c30')}`;

/** Изба с соломенной крышей и окошком; x — середина. */
export const cottage = (x: number, floor: number, w = 300) =>
  `${sh(`M${x - w / 2},${floor} V${floor - w * 0.5} H${x + w / 2} V${floor} Z`, 'c0')}
   ${Array.from({ length: 6 }, (_, i) => `<path d="M${x - w / 2},${floor - i * w * 0.085} H${x + w / 2}" stroke-width="3"/>`).join('')}
   ${sh(`M${x - w / 2 - 40},${floor - w * 0.5} L${x},${floor - w * 1.05} L${x + w / 2 + 40},${floor - w * 0.5} Z`, 'a120')}
   ${wh(`M${x - w * 0.12},${floor - w * 0.4} h${w * 0.24} v${w * 0.2} h${-w * 0.24} Z`)}<path d="M${x},${floor - w * 0.4} v${w * 0.2} M${x - w * 0.12},${floor - w * 0.3} h${w * 0.24}" stroke-width="3"/>
   ${sh(`M${x + w * 0.18},${floor - w * 0.86} h${w * 0.1} v-${w * 0.2} h-${w * 0.1} Z`, 'b90')}`;

/** Телега (вид сбоку), дышло вперёд; x — середина, floor — земля. */
export function cart(x: number, floor: number): string {
  const wheel = (cx: number) =>
    `<circle cx="${cx}" cy="${floor - 110}" r="110" fill="${P}" stroke-width="10"/><circle cx="${cx}" cy="${floor - 110}" r="96" stroke-width="3"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${cx},${floor - 110} l${r1(Math.cos((i * Math.PI) / 3) * 100)},${r1(Math.sin((i * Math.PI) / 3) * 100)}" stroke-width="8"/>`).join('')}<circle cx="${cx}" cy="${floor - 110}" r="20" fill="${I}"/>`;
  return `${sh(`M${x - 260},${floor - 300} H${x + 160} L${x + 140},${floor - 170} H${x - 240} Z`, 'a0')}<path d="M${x - 250},${floor - 260} H${x + 155} M${x - 245},${floor - 215} H${x + 150}" stroke-width="3"/>
    ${wheel(x - 130)}${wheel(x + 60)}
    <path d="M${x + 140},${floor - 210} L${x + 520},${floor - 260}" stroke-width="14"/>`;
}

/** Узел из верёвки: путаница петель. */
export function knot(x: number, y: number, r: number, seed = 4): string {
  const g = rng(seed);
  let d = `M${x - r * 1.3},${y + r * 0.2} `;
  for (let i = 0; i < 16; i++) {
    const a = g() * Math.PI * 2;
    const b = g() * Math.PI * 2;
    const rr = r * (0.4 + g() * 0.6);
    d += `C${r1(x + Math.cos(a) * r * 1.2)},${r1(y + Math.sin(a) * r)} ${r1(x + Math.cos(b) * r * 1.2)},${r1(y + Math.sin(b) * r)} ${r1(x + Math.cos(a + b) * rr)},${r1(y + Math.sin(a + b) * rr * 0.8)} `;
  }
  d += `L${x + r * 1.4},${y - r * 0.1}`;
  return tube(d, 12, 'b60');
}

/** Пароход с четырьмя трубами (нос вправо); y — ватерлиния. */
export function steamer(x: number, y: number, k = 1): string {
  const funnels = [-210, -70, 70, 210]
    .map((fx) => `${wh(`M${fx - 28},-200 L${fx - 40},-370 L${fx + 14},-370 L${fx + 26},-200 Z`)}${sh(`M${fx - 37},-345 L${fx - 40},-370 L${fx + 14},-370 L${fx + 17},-345 Z`, 'b0')}`)
    .join('');
  const ports = Array.from({ length: 28 }, (_, i) => `<circle cx="${-380 + i * 28}" cy="-70" r="5" fill="${P}" stroke-width="2"/>`).join('');
  const wins = Array.from({ length: 20 }, (_, i) => `<rect x="${-320 + i * 32}" y="-176" width="16" height="16" stroke-width="2"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="M-420,-130 V-470 M400,-130 V-460" stroke-width="7"/><path d="M-420,-460 L400,-450" stroke-width="2"/>
    <path d="M-420,-460 L-320,-200 M400,-450 L300,-200" stroke-width="2"/>
    ${funnels}
    ${wh('M-350,-200 H330 V-130 H-350 Z')}${wins}
    ${sh('M-470,-130 L450,-130 L430,40 L-400,40 Q-450,10 -470,-60 Z', 'b0')}
    ${wh('M-465,-130 L448,-130 L444,-96 L-458,-96 Z')}${ports}
  </g>`;
}

/** Айсберг; x — середина, y — вода. */
export const iceberg = (x: number, y: number, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})">
    ${wh('M-260,0 L-200,-120 L-150,-140 L-110,-260 L-40,-300 L20,-220 L70,-250 L130,-140 L180,-110 L240,0 Z')}
    ${sh('M20,-220 L70,-250 L130,-140 L180,-110 L240,0 L60,0 L40,-120 Z', 'a120')}${sh('M-110,-260 L-40,-300 L-60,-150 L-150,-140 Z', 'c60')}
    <path d="M-260,0 L-320,120 L-200,260 L120,280 L300,140 L240,0" stroke-width="3" stroke-dasharray="14 12"/>
  </g>`;

/** Шлюпка с людьми. */
export const lifeboat = (x: number, y: number, n = 4) =>
  `${sh(`M${x - 80},${y - 30} H${x + 80} L${x + 60},${y + 4} H${x - 60} Z`, 'a0')}${Array.from({ length: n }, (_, i) => `<circle cx="${x - 54 + i * (108 / Math.max(1, n - 1))}" cy="${y - 46}" r="12" fill="${P}"/>`).join('')}`;

// ─── Звери ────────────────────────────────────────────────────────────────────

const leg4 = (pts: [number, number][], w: number, pat?: string) => pts.map(([a, b], i) => tube(`M${a},${b} L${a + (i % 2 ? 6 : -6)},0`, w, pat)).join('');

/** Заяц сидит. */
export const hare = (x: number, y: number, s = 1, f: 1 | -1 = 1) =>
  at(x, y, s, f, `
    ${sh('M38,-170 C26,-238 36,-270 54,-272 C64,-246 62,-206 56,-170 Z', 'c60')}
    ${sh('M-62,0 C-96,-14 -96,-96 -44,-128 C-10,-146 32,-126 42,-92 C52,-60 42,-22 30,0 Z', 'a60')}
    ${sh('M-74,0 C-86,-44 -44,-56 -10,-32 L22,0 Z', 'b60')}
    <circle cx="-92" cy="-44" r="15" fill="${P}"/>
    ${wh('M18,-122 C8,-164 50,-184 82,-164 C104,-152 106,-130 92,-120 C72,-108 40,-104 18,-122 Z')}
    ${sh('M52,-172 C44,-240 56,-272 72,-272 C80,-248 76,-208 68,-170 Z', 'c60')}
    <circle cx="72" cy="-148" r="5" fill="${I}"/><path d="M98,-128 l6,0" stroke-width="3"/>
    ${tube('M34,-84 L42,-6', 12)}`);

/** Волк стоит. */
export const wolf = (x: number, y: number, s = 1, f: 1 | -1 = 1) =>
  at(x, y, s, f, `
    ${sh('M-110,-140 C-150,-120 -176,-60 -164,-24 C-144,-58 -128,-96 -100,-108 Z', 'b120')}
    ${leg4([[-86, -90], [-46, -86]], 18, 'a90')}
    ${sh('M-114,-150 C-60,-182 60,-180 100,-152 C122,-130 116,-90 90,-80 C40,-70 -60,-70 -100,-86 C-126,-98 -132,-136 -114,-150 Z', 'a120')}
    ${leg4([[54, -86], [84, -92]], 18, 'a90')}
    ${sh('M78,-150 C80,-196 128,-214 150,-192 L214,-166 C220,-156 210,-148 198,-148 L150,-138 C118,-128 88,-128 78,-150 Z', 'a60')}
    ${sh('M104,-190 L112,-232 L130,-196 Z', 'b60')}<circle cx="148" cy="-178" r="5" fill="${I}"/><path d="M178,-150 l30,-4" stroke-width="3"/>`);

/** Медведь стоит. */
export const bear = (x: number, y: number, s = 1, f: 1 | -1 = 1) =>
  at(x, y, s, f, `
    ${leg4([[-110, -80], [-60, -70]], 40, 'b90')}
    ${sh('M-150,-180 C-100,-252 80,-252 130,-190 C162,-150 150,-90 120,-70 C40,-50 -80,-50 -140,-80 C-172,-100 -176,-150 -150,-180 Z', 'b120')}
    ${leg4([[60, -70], [110, -80]], 40, 'b90')}
    ${sh('M96,-200 C104,-252 170,-262 200,-232 L236,-206 C242,-196 232,-184 220,-184 L184,-174 C150,-160 108,-166 96,-200 Z', 'a120')}
    <circle cx="140" cy="-244" r="17" fill="${P}"/><circle cx="140" cy="-244" r="17" fill="url(#b120)"/><circle cx="182" cy="-216" r="5" fill="${I}"/><circle cx="234" cy="-200" r="7" fill="${I}"/>`);

/** Лиса сидит; nose — что лежит на кончике носа. */
export const fox = (x: number, y: number, s = 1, f: 1 | -1 = 1, opts: { nose?: string; licking?: boolean } = {}) =>
  at(x, y, s, f, `
    ${sh('M-46,-12 C-150,-10 -184,-90 -160,-140 C-136,-94 -104,-56 -36,-42 Z', 'a60')}${wh('M-160,-140 C-170,-120 -170,-104 -164,-96 C-150,-104 -146,-124 -160,-140 Z')}
    ${sh('M-52,0 C-72,-42 -62,-132 -12,-172 C20,-192 52,-172 52,-130 C52,-80 42,-30 30,0 Z', 'a30')}
    ${wh('M22,-160 C40,-130 42,-80 30,-20 C18,-60 12,-110 22,-160 Z')}
    ${tube('M18,-60 L24,-4 M38,-60 L42,-4', 9)}
    ${sh('M-2,-192 C-2,-232 40,-248 62,-232 L124,-206 C128,-198 122,-192 112,-192 L62,-180 C30,-170 4,-170 -2,-192 Z', 'a60')}
    ${sh('M8,-226 L2,-274 L34,-238 Z M28,-236 L30,-278 L54,-236 Z', 'b60')}
    <circle cx="66" cy="-214" r="5" fill="${I}"/><circle cx="122" cy="-200" r="6" fill="${I}"/>
    ${opts.licking ? `<path d="M100,-188 q10,14 22,4" fill="${P}" stroke-width="3"/>` : ''}
    ${opts.nose ? `<g transform="translate(118 -238)">${opts.nose}</g>` : ''}`);

/** Колобок: круглый, с лицом. */
export const kolobok = (r = 40, mouth: 'smile' | 'sing' = 'sing') =>
  `<circle r="${r}" fill="${P}"/><circle r="${r}" fill="url(#c30)" stroke-width="4"/><circle r="${r * 0.62}" fill="url(#hd)" opacity="0.6" stroke="none"/>
   <circle cx="${r * 0.15}" cy="${-r * 0.2}" r="${r * 0.1}" fill="${I}"/><circle cx="${r * 0.5}" cy="${-r * 0.2}" r="${r * 0.1}" fill="${I}"/>
   ${mouth === 'sing' ? `<ellipse cx="${r * 0.35}" cy="${r * 0.3}" rx="${r * 0.14}" ry="${r * 0.18}" fill="${I}"/>` : `<path d="M${r * 0.1},${r * 0.25} q${r * 0.25},${r * 0.25} ${r * 0.5},0" stroke-width="3"/>`}`;

/** Нота. */
export const note = (x: number, y: number, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="13" ry="9" fill="${I}" transform="rotate(-20)"/><path d="M11,-4 V-56 q18,8 22,28" stroke-width="4"/></g>`;

/** Птица клюёт (голова внизу) или стоит. */
export const bird = (x: number, y: number, s = 1, f: 1 | -1 = 1, peck = true) =>
  at(x, y, s, f, `
    ${sh('M-40,-34 L-82,-52 L-78,-40 L-84,-30 L-42,-24 Z', 'b30')}
    <path d="M-4,-14 L-8,0 M10,-14 L12,0 M-14,0 h10 M6,0 h10" stroke-width="3"/>
    ${wh('M-46,-30 C-40,-60 10,-64 28,-44 C38,-30 30,-14 14,-12 L-30,-14 C-44,-16 -50,-22 -46,-30 Z')}
    ${sh('M-38,-34 C-22,-56 8,-54 16,-38 C0,-30 -20,-28 -38,-34 Z', 'a30')}
    ${peck ? `${wh('M18,-24 C24,-36 46,-30 44,-14 C42,-2 26,0 20,-8 Z')}<path d="M43,-12 L58,0 L40,-4 Z" fill="${I}"/><circle cx="34" cy="-20" r="3.5" fill="${I}"/>` : `${wh('M20,-46 C22,-68 50,-70 54,-52 C56,-40 40,-36 26,-38 Z')}<path d="M54,-56 L72,-52 L54,-48 Z" fill="${I}"/><circle cx="40" cy="-56" r="3.5" fill="${I}"/>`}`);

/** Муравей стоит на двух лапах; carry — зёрнышко над головой. */
export const ant = (x: number, y: number, s = 1, f: 1 | -1 = 1, mode: 'carry' | 'point' | 'stand' = 'carry') =>
  at(x, y, s, f, `
    ${tube('M-4,-150 L-22,-80 L-12,-4', 8)}${tube('M6,-150 L22,-80 L28,-4', 8)}
    ${sh('M-62,-148 C-74,-110 -54,-64 -20,-66 C8,-68 8,-120 -12,-146 C-26,-164 -52,-170 -62,-148 Z', 'b60')}
    ${sh('M-18,-150 C-24,-176 -10,-200 6,-200 C22,-200 28,-174 18,-148 C10,-136 -10,-136 -18,-150 Z', 'a30')}
    ${tube('M-6,-170 L-34,-130 L-46,-104', 7)}
    ${sh('M-2,-226 C-4,-250 20,-262 38,-252 C54,-242 52,-214 34,-206 C14,-200 0,-208 -2,-226 Z', 'a60')}
    <circle cx="34" cy="-232" r="7" fill="${I}"/>
    <path d="M24,-252 q16,-40 46,-40 M10,-254 q4,-46 26,-58" stroke-width="3"/>
    ${mode === 'carry' ? `${tube('M8,-184 L36,-224 L22,-280', 7)}${sh('M-30,-292 C-30,-320 40,-326 52,-300 C58,-280 30,-268 0,-270 C-20,-272 -30,-280 -30,-292 Z', 'a30')}<path d="M-20,-296 Q10,-312 44,-298" stroke-width="2"/>` : mode === 'point' ? tube('M8,-184 L60,-200 L110,-216', 7) : tube('M8,-184 L30,-140 L44,-110', 7)}`);

/** Стрекоза: сидит на цветке (поёт) или мёрзнет. */
export function dragonfly(x: number, y: number, s = 1, f: 1 | -1 = 1, mode: 'sing' | 'cold' = 'sing'): string {
  const seg = Array.from({ length: 8 }, (_, i) => `<ellipse cx="${-10 - i * 3}" cy="${-110 + i * 22}" rx="${11 - i * 0.6}" ry="13" fill="${P}" stroke-width="3"/>`).join('');
  const wingSet = mode === 'sing' ? [-150, -130, -30, -50] : [-110, -100, -70, -80];
  const wings = wingSet
    .map((a, i) => `<ellipse cx="-20" cy="-168" rx="${i % 2 ? 96 : 110}" ry="20" fill="${P}" transform="rotate(${a} -20 -168) translate(${i % 2 ? -96 : -110} 0)" stroke-width="2.5"/><ellipse cx="-20" cy="-168" rx="${i % 2 ? 96 : 110}" ry="20" fill="url(#c${i % 2 ? 30 : 150})" transform="rotate(${a} -20 -168) translate(${i % 2 ? -96 : -110} 0)" stroke="none"/>`)
    .join('');
  const arms = mode === 'sing' ? `${tube('M6,-170 L50,-196 L76,-236', 6)}${tube('M-4,-170 L-40,-200 L-56,-240', 6)}` : `${tube('M6,-166 L30,-140 L-6,-130', 6)}${tube('M-4,-166 L-24,-140 L6,-128', 6)}`;
  const mouth = mode === 'sing' ? `<ellipse cx="22" cy="-206" rx="6" ry="8" fill="${I}"/>` : `<path d="M14,-204 q6,-4 12,0" stroke-width="3"/>`;
  return at(x, y, s, f, `${wings}${seg}${tube('M-6,-130 L-20,-60 L-4,-20 M6,-130 L20,-70 L30,-24', 5)}
    ${sh('M-22,-140 C-26,-170 -10,-190 4,-190 C20,-190 26,-168 20,-140 C14,-124 -16,-124 -22,-140 Z', 'a60')}${arms}
    ${wh('M-20,-224 C-20,-252 22,-256 30,-230 C36,-210 20,-196 4,-196 C-12,-196 -20,-208 -20,-224 Z')}
    <circle cx="16" cy="-232" r="13" fill="url(#b30)"/><circle cx="16" cy="-232" r="13"/><circle cx="-6" cy="-234" r="11" fill="url(#b30)"/><circle cx="-6" cy="-234" r="11"/>${mouth}`);
}

/** Муравейник-домик: купол с дверью и окошком. */
export const anthill = (x: number, floor: number, w = 380, door: 'open' | 'closed' = 'closed') =>
  `${sh(`M${x - w / 2},${floor} C${x - w * 0.4},${floor - w * 0.62} ${x + w * 0.4},${floor - w * 0.62} ${x + w / 2},${floor} Z`, 'hd')}
   ${Array.from({ length: 14 }, (_, i) => `<path d="M${x - w * 0.4 + (i % 7) * w * 0.12},${floor - 20 - Math.floor(i / 7) * w * 0.16 - (i % 3) * 14} l14,-6" stroke-width="3"/>`).join('')}
   ${door === 'open' ? `<path d="M${x - 40},${floor} V${floor - 90} Q${x},${floor - 130} ${x + 40},${floor - 90} V${floor} Z" fill="${I}"/>` : `${sh(`M${x - 40},${floor} V${floor - 90} Q${x},${floor - 130} ${x + 40},${floor - 90} V${floor} Z`, 'a90')}<circle cx="${x + 24}" cy="${floor - 50}" r="5" fill="${I}"/>`}
   ${wh(`M${x + w * 0.16},${floor - w * 0.3} h50 v40 h-50 Z`)}<path d="M${x + w * 0.16 + 25},${floor - w * 0.3} v40 M${x + w * 0.16},${floor - w * 0.3 + 20} h50" stroke-width="3"/>`;

// ─── Лабиринт ─────────────────────────────────────────────────────────────────

/** Лабиринт (вид сверху): стены и путь по нитке от входа (снизу посередине) к центру. */
export function maze(x0: number, y0: number, cols: number, rows: number, cell: number, seed = 3): { walls: string; thread: string; center: [number, number]; entry: [number, number] } {
  const g = rng(seed);
  const id = (c: number, r: number) => r * cols + c;
  const open = new Set<string>();
  const seen = new Set<number>();
  const stack: [number, number][] = [[Math.floor(cols / 2), rows - 1]];
  seen.add(id(Math.floor(cols / 2), rows - 1));
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const nb = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
      .map(([dc, dr]) => [c + dc, r + dr] as [number, number])
      .filter(([cc, rr]) => cc >= 0 && rr >= 0 && cc < cols && rr < rows && !seen.has(id(cc, rr)));
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const [nc, nr] = nb[Math.floor(g() * nb.length)];
    open.add([id(c, r), id(nc, nr)].sort((a, b) => a - b).join('-'));
    seen.add(id(nc, nr));
    stack.push([nc, nr]);
  }
  const isOpen = (a: number, b: number) => open.has([a, b].sort((p, q) => p - q).join('-'));
  let d = '';
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++) {
      const top = r === 0 || r === rows || !isOpen(id(c, r - 1), id(c, r));
      const entry = r === rows && c === Math.floor(cols / 2);
      if (top && !entry) d += `M${x0 + c * cell},${y0 + r * cell} h${cell} `;
    }
  for (let c = 0; c <= cols; c++)
    for (let r = 0; r < rows; r++) {
      const left = c === 0 || c === cols || !isOpen(id(c - 1, r), id(c, r));
      if (left) d += `M${x0 + c * cell},${y0 + r * cell} v${cell} `;
    }
  // Путь от входа к центру — поиск в ширину.
  const start = id(Math.floor(cols / 2), rows - 1);
  const goal = id(Math.floor(cols / 2), Math.floor(rows / 2));
  const prev = new Map<number, number>([[start, -1]]);
  const q = [start];
  while (q.length) {
    const v = q.shift()!;
    if (v === goal) break;
    const c = v % cols;
    const r = Math.floor(v / cols);
    for (const [cc, rr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as [number, number][]) {
      if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
      const u = id(cc, rr);
      if (!prev.has(u) && isOpen(v, u)) {
        prev.set(u, v);
        q.push(u);
      }
    }
  }
  const path: number[] = [];
  for (let v = goal; v !== -1; v = prev.get(v)!) path.unshift(v);
  const cx = (v: number) => x0 + ((v % cols) + 0.5) * cell;
  const cy = (v: number) => y0 + (Math.floor(v / cols) + 0.5) * cell;
  const entry: [number, number] = [x0 + (Math.floor(cols / 2) + 0.5) * cell, y0 + rows * cell + cell * 0.6];
  const thread = `M${entry[0]},${entry[1]} ${path.map((v) => `L${cx(v)},${cy(v)}`).join(' ')}`;
  return { walls: d, thread, center: [cx(goal), cy(goal)], entry };
}

/** Полоса (дорожка, тропа) по точкам [x, y, полуширина]; края — по нормалям. */
export function band(pts: [number, number, number][], pat = 'c0'): string {
  const L: string[] = [];
  const R: string[] = [];
  pts.forEach(([x, y, w], i) => {
    const [px, py] = pts[Math.max(0, i - 1)];
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = nx - px;
    const dy = ny - py;
    const k = Math.hypot(dx, dy) || 1;
    L.push(`${r1(x - (dy / k) * w)},${r1(y + (dx / k) * w)}`);
    R.push(`${r1(x + (dy / k) * w)},${r1(y - (dx / k) * w)}`);
  });
  return `<path d="M${L.join(' L')} L${R.reverse().join(' L')} Z" fill="${P}" stroke="none"/><path d="M${L.join(' L')} L${R.join(' L')} Z" fill="url(#${pat})" stroke="none"/><path d="M${L.reverse().join(' L')}" stroke-width="4"/><path d="M${R.join(' L')}" stroke-width="4"/>`;
}

/** Голова быка (Минотавр) сверху-спереди. */
export const bullHead = (x: number, y: number, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})">${sh('M-60,-50 C-90,-60 -110,-90 -100,-120 C-80,-90 -60,-80 -36,-76 Z M60,-50 C90,-60 110,-90 100,-120 C80,-90 60,-80 36,-76 Z', 'c0')}
    ${sh('M-44,-80 C-44,-110 44,-110 44,-80 L36,10 C30,40 -30,40 -36,10 Z', 'a60')}${wh('M-26,10 C-26,-6 26,-6 26,10 C26,30 -26,30 -26,10 Z')}
    <circle cx="-12" cy="12" r="5" fill="${I}"/><circle cx="12" cy="12" r="5" fill="${I}"/><circle cx="-20" cy="-50" r="7" fill="${I}"/><circle cx="20" cy="-50" r="7" fill="${I}"/></g>`;
