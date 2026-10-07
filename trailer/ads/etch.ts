/**
 * Рисунки «под гравюру» для третьей серии: штриховка, камни из граней, вода, небо, люди в одеждах.
 * Всё — тушь одного цвета на бумаге; штриховки заданы в `engine3.ts` (a/b/c + угол, sky, x45, hw, hd).
 */
import { C } from './engine3.ts';

const P = C.paper;
const I = C.ink;
const r1 = (n: number) => Math.round(n * 10) / 10;
type Pt = [number, number];
const pt = ([x, y]: Pt) => `${r1(x)},${r1(y)}`;
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
/** Направление: 0° — вниз, 90° — вперёд (вправо), 180° — вверх. */
const dir = (deg: number): Pt => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)];
/** Поворот точки по часовой стрелке (как `rotate` в SVG). */
const rot = ([x, y]: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

/** Детерминированный генератор случайных чисел. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

// ─── Основа ───────────────────────────────────────────────────────────────────

/** Заштрихованная фигура: бумага, штриховка, контур. */
export const sh = (d: string, pat: string, extra = '') => `<path d="${d}" fill="${P}" stroke="none"/><path d="${d}" fill="url(#${pat})" ${extra}/>`;
/** Белая (бумажная) фигура с контуром. */
export const wh = (d: string, extra = '') => `<path d="${d}" fill="${P}" ${extra}/>`;
/** Сплошная тушь. */
export const ink = (d: string, extra = '') => `<path d="${d}" fill="${I}" ${extra}/>`;
/** Группа с классом/ид и непрозрачностью. */
export const g = (attrs: string, body: string) => `<g ${attrs}>${body}</g>`;

/** Фон-небо: бумага в тонкую горизонтальную линию, как у образцов. */
export const sky = (y1 = -400, y2 = 2400) => `<rect x="-400" y="${y1}" width="1880" height="${y2 - y1}" fill="${P}" stroke="none"/><rect x="-400" y="${y1}" width="1880" height="${y2 - y1}" fill="url(#sky)" stroke="none"/>`;

/** Земля: горизонтальная штриховка и пучки травы. */
export function ground(y: number, x1 = -400, x2 = 1480, seed = 3, y2 = 2400): string {
  const r = rng(seed);
  const tufts = Array.from({ length: Math.round((x2 - x1) / 70) }, (_, i) => {
    const x = x1 + i * 70 + r() * 50;
    const yy = y + 40 + r() * (Math.min(y2, y + 500) - y - 60);
    return `M${r1(x)},${r1(yy)} l-5,-14 M${r1(x + 5)},${r1(yy)} l2,-18 M${r1(x + 10)},${r1(yy)} l7,-12`;
  }).join(' ');
  return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${y2 - y}" fill="${P}" stroke="none"/><rect x="${x1}" y="${y}" width="${x2 - x1}" height="${y2 - y}" fill="url(#a0)" stroke="none" opacity="0.75"/>
    <path d="M${x1},${y} H${x2}" stroke-width="4"/><path d="${tufts}" stroke-width="2.5"/>`;
}

/** Море: волны штрихом и несколько крупных гребней. */
export function sea(y: number, x1 = -400, x2 = 1480, seed = 5, y2 = 2400): string {
  const r = rng(seed);
  const rows: string[] = [];
  for (let yy = y + 30, k = 0; yy < y2; yy += 34 + k * 3, k++) {
    let d = '';
    for (let x = x1 + r() * 80; x < x2; x += 120 + r() * 120) {
      const w = 40 + r() * 50;
      d += `M${r1(x)},${r1(yy)} q${r1(w / 2)},-${r1(8 + r() * 6)} ${r1(w)},0 `;
    }
    rows.push(d);
  }
  return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${y2 - y}" fill="${P}" stroke="none"/><rect x="${x1}" y="${y}" width="${x2 - x1}" height="${y2 - y}" fill="url(#hw)" stroke="none" opacity="0.8"/>
    <path d="M${x1},${y} H${x2}" stroke-width="4"/><path d="${rows.join(' ')}" stroke-width="3"/>`;
}

/**
 * Камень, скала, гора: контур, разбитый на грани; каждая грань — своя штриховка (как у образцов).
 * `box` — прямоугольник, который покрывают грани; лишнее отрезается контуром.
 */
export function rock(id: string, outline: string, box: [number, number, number, number], cell = 110, seed = 1, dark = 0.3): string {
  const [x0, y0, w, h] = box;
  const r = rng(seed);
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / (cell * 0.8)) + 1;
  const p: Pt[][] = [];
  for (let j = 0; j <= rows; j++) {
    p.push([]);
    for (let i = 0; i <= cols; i++) {
      const jx = i === 0 || i === cols ? 0 : (r() - 0.5) * cell * 0.7;
      const jy = j === 0 || j === rows ? 0 : (r() - 0.5) * cell * 0.6;
      p[j].push([x0 + i * cell + (j % 2) * cell * 0.35 + jx, y0 + j * cell * 0.8 + jy]);
    }
  }
  const angles = [0, 30, 60, 90, 120, 150];
  let quads = '';
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const q = [p[j][i], p[j][i + 1], p[j + 1][i + 1], p[j + 1][i]];
      const k = r();
      const pat = `${k < dark ? 'b' : k < 0.75 ? 'a' : 'c'}${angles[Math.floor(r() * 6)]}`;
      quads += `<path d="M${q.map(pt).join(' L')} Z" fill="url(#${pat})" stroke-width="2.4"/>`;
    }
  return `<defs><clipPath id="${id}"><path d="${outline}"/></clipPath></defs>
    <path d="${outline}" fill="${P}" stroke="none"/><g clip-path="url(#${id})">${quads}</g><path d="${outline}" stroke-width="5"/>`;
}

/** Солнце: круг, лучи прямые и волнистые попеременно. */
export function sun(x: number, y: number, r: number, n = 24): string {
  const rays = Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n;
    const [dx, dy] = dir(a);
    const a1: Pt = [x + dx * (r + 18), y + dy * (r + 18)];
    const a2: Pt = [x + dx * (r + (i % 2 ? 70 : 120)), y + dy * (r + (i % 2 ? 70 : 120))];
    if (i % 2) return `M${pt(a1)} L${pt(a2)}`;
    const [nx, ny] = dir(a + 90);
    const m: Pt = [(a1[0] + a2[0]) / 2 + nx * 12, (a1[1] + a2[1]) / 2 + ny * 12];
    return `M${pt(a1)} Q${pt(m)} ${pt(a2)}`;
  }).join(' ');
  return `<path d="${rays}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r}" fill="${P}"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#c30)" stroke-width="4"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.72}" stroke-width="2"/>`;
}

/** Облако: клубы с тенью снизу. */
export function cloud(x: number, y: number, w: number): string {
  const k = w / 300;
  const d = `M${x - 150 * k},${y + 30 * k} C${x - 190 * k},${y + 30 * k} ${x - 190 * k},${y - 30 * k} ${x - 140 * k},${y - 30 * k} C${x - 140 * k},${y - 80 * k} ${x - 70 * k},${y - 90 * k} ${x - 40 * k},${y - 60 * k} C${x - 20 * k},${y - 110 * k} ${x + 60 * k},${y - 110 * k} ${x + 70 * k},${y - 50 * k} C${x + 120 * k},${y - 80 * k} ${x + 180 * k},${y - 40 * k} ${x + 150 * k},${y + 30 * k} Z`;
  return `${wh(d, 'stroke-width="3"')}<path d="M${x - 150 * k},${y + 30 * k} H${x + 150 * k} C${x + 100 * k},${y + 10 * k} ${x - 100 * k},${y + 10 * k} ${x - 150 * k},${y + 30 * k} Z" fill="url(#b0)" stroke="none"/>`;
}

/** Птицы вдали. */
export const birds = (pts: Pt[]) => pts.map(([x, y]) => `M${x - 16},${y} q8,-10 16,0 q8,-10 16,0`).join(' ');

/** Перо: от основания (x, y) в сторону угла a (0 — вниз), длина len. */
export function feather(x: number, y: number, a: number, len: number, pat = 'a30'): string {
  const d = dir(a);
  const n = dir(a + 90);
  const tip: Pt = [x + d[0] * len, y + d[1] * len];
  const w = len * 0.22;
  const m1: Pt = [x + d[0] * len * 0.5 + n[0] * w, y + d[1] * len * 0.5 + n[1] * w];
  const m2: Pt = [x + d[0] * len * 0.5 - n[0] * w, y + d[1] * len * 0.5 - n[1] * w];
  const path = `M${r1(x)},${r1(y)} Q${pt(m1)} ${pt(tip)} Q${pt(m2)} ${r1(x)},${r1(y)} Z`;
  return `${sh(path, pat, 'stroke-width="2.5"')}<path d="M${r1(x - d[0] * len * 0.15)},${r1(y - d[1] * len * 0.15)} L${pt(tip)}" stroke-width="2.5"/>`;
}

/** Крыло из перьев вдоль линии от плеча `a` до кисти `b`; перья свисают в сторону `down` (градусы). */
export function wing(a: Pt, b: Pt, down: number, n = 9, len = 150, spread = -18): string {
  let out = '';
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const base: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    out += feather(base[0], base[1], down + t * spread, len * (0.55 + t * 0.6), i % 2 ? 'a60' : 'c60');
  }
  return out;
}

// ─── Люди ──────────────────────────────────────────────────────────────────────

export type Hair = 'short' | 'curly' | 'long' | 'bald' | 'helmet' | 'crown' | 'hat' | 'kerchief' | 'braids' | 'cap';
export interface FigOpts {
  /** Точка таза. */
  x: number;
  y: number;
  s?: number;
  f?: 1 | -1;
  /** Поворот всей фигуры (падение, полёт). */
  rot?: number;
  /** Наклон корпуса вперёд, градусы. */
  lean?: number;
  /** Наклон головы относительно корпуса. */
  nod?: number;
  /** Ближняя рука: плечо (0 — вниз, 90 — вперёд, 180 — вверх) и сгиб локтя (+ вперёд/вверх). */
  arm?: [number, number];
  arm2?: [number, number];
  /** Ближняя нога: бедро (+ вперёд) и сгиб колена (+ назад). */
  leg?: [number, number];
  leg2?: [number, number];
  dress?: 'tunic' | 'robe' | 'none' | 'coat' | 'dress' | 'armor' | 'gown';
  /** Штриховка одежды. */
  pat?: string;
  /** Штриховка рукавов и штанин; нет — голая кожа. */
  sleeve?: string;
  legs?: string;
  hair?: Hair;
  beard?: boolean;
  face?: 'calm' | 'sad' | 'shout' | 'closed';
  /** Рисунки в ближней и дальней руке (начало координат — кисть). */
  hand?: string;
  hand2?: string;
  /** Крылья на руках (Икар, Дедал). */
  wings?: boolean;
  attrs?: string;
}

/** Человек в профиль (смотрит вправо при f = 1): ноги, одежда, голова, руки — с контуром и штриховкой. */
export function fig(o: FigOpts): string {
  const s = o.s ?? 1;
  const f = o.f ?? 1;
  const lean = o.lean ?? 0;
  const nod = o.nod ?? 0;
  const pat = o.pat ?? 'a60';
  const N = rot([0, -142], lean);
  const S = rot([-4, -124], lean);
  const Hc = add(N, rot([4, -36], lean + nod));
  const armPts = ([a1, a2]: [number, number]): Pt[] => {
    const E = add(S, mul(dir(a1), 86));
    return [S, E, add(E, mul(dir(a1 + a2), 80))];
  };
  const legPts = ([t, k]: [number, number]): Pt[] => {
    const K = mul(dir(t), 104);
    return [[0, -6], K, add(K, mul(dir(t - k), 100))];
  };
  const limb = (pts: Pt[], w: number, hp?: string) => {
    const d = `M${pts.map(pt).join(' L')}`;
    return `<path d="${d}" stroke="${I}" stroke-width="${w + 6}"/><path d="${d}" stroke="${P}" stroke-width="${w}"/>${hp ? `<path d="${d}" stroke="url(#${hp})" stroke-width="${w}"/>` : ''}`;
  };
  const boot = (pts: Pt[], shin: number) => {
    const A = pts[2];
    const fd = dir(shin + 90);
    const tip = add(A, mul(fd, 30));
    return `<path d="M${pt(add(A, mul(fd, -10)))} L${pt(tip)}" stroke="${I}" stroke-width="20"/>`;
  };
  const hand = (pts: Pt[], item?: string) => `<circle cx="${r1(pts[2][0])}" cy="${r1(pts[2][1])}" r="10" fill="${P}" stroke-width="3"/>${item ? `<g transform="translate(${pt(pts[2])})">${item}</g>` : ''}`;
  const armB = armPts(o.arm2 ?? [8, 10]);
  const armF = armPts(o.arm ?? [-6, 10]);
  const lB = o.leg2 ?? [-8, 0];
  const lF = o.leg ?? [8, 0];
  const legB = legPts(lB);
  const legF = legPts(lF);
  const dress = o.dress ?? 'tunic';
  const hemY = dress === 'robe' || dress === 'dress' ? 214 : dress === 'coat' || dress === 'gown' ? 120 : dress === 'none' ? 36 : 76;
  const hemW = dress === 'robe' || dress === 'dress' ? 64 : dress === 'coat' || dress === 'gown' ? 56 : dress === 'none' ? 32 : 48;
  const skirt = `M-27,-12 L27,-12 C${34 + hemW * 0.1},${hemY * 0.3} ${hemW - 6},${hemY * 0.7} ${hemW},${hemY} C${hemW * 0.4},${hemY + 10} ${-hemW * 0.4},${hemY + 10} ${-hemW},${hemY} C${-hemW + 6},${hemY * 0.7} ${-34 - hemW * 0.1},${hemY * 0.3} -27,-12 Z`;
  const folds = `M-8,0 L${-hemW * 0.35},${hemY} M10,0 L${hemW * 0.3},${hemY} M-20,-4 L${-hemW * 0.75},${hemY - 4}`;
  const torso = `M-24,-132 C-6,-140 16,-138 28,-128 C36,-96 34,-50 28,-8 L-26,-8 C-32,-50 -34,-96 -24,-132 Z`;
  const skin = dress === 'none';
  const torsoSvg = `<g transform="rotate(${lean})">${skin ? sh(torso, 'c90') : sh(torso, pat)}
    ${dress === 'armor' ? `<path d="M-26,-60 H30 M-26,-36 H30 M-24,-100 Q4,-90 30,-104" stroke-width="3"/>` : ''}
    ${dress === 'coat' ? `<path d="M22,-130 L14,-8 M12,-110 l6,0 M10,-80 l6,0 M8,-50 l6,0" stroke-width="3"/>` : ''}
  </g>`;
  const legsSvg = `${limb(legB, 24, o.legs)}${boot(legB, lB[0] - lB[1])}${limb(legF, 26, o.legs)}${boot(legF, lF[0] - lF[1])}`;
  const skirtSvg = dress === 'none' ? sh(skirt, 'a30') : `${sh(skirt, pat)}<path d="${folds}" stroke-width="2.5"/><path d="M-28,-10 H28" stroke-width="7"/>`;
  const wingB = o.wings ? wing(armB[0], armB[2], 30, 8, 150) : '';
  const wingF = o.wings ? wing(armF[0], armF[2], 20, 9, 170) : '';
  const svg = `${wingB}${limb(armB, 20, o.sleeve)}${hand(armB, o.hand2)}${legsSvg}${skirtSvg}${torsoSvg}
    <g transform="translate(${pt(Hc)}) rotate(${lean + nod})">${head(o.hair ?? 'short', o.beard ?? false, o.face ?? 'calm')}</g>
    ${wingF}${limb(armF, 20, o.sleeve)}${hand(armF, o.hand)}`;
  return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot ?? 0}) scale(${s * f} ${s})" stroke-width="3" ${o.attrs ?? ''}>${svg}</g>`;
}

/** Голова в профиль (центр 0,0, радиус ~34, смотрит вправо). */
function head(hair: Hair, beard: boolean, face: 'calm' | 'sad' | 'shout' | 'closed'): string {
  const skull = 'M2,-36 C22,-36 33,-24 33,-8 L42,4 L33,9 C33,14 31,17 28,19 C28,24 24,30 14,32 C0,36 -20,32 -28,18 C-36,4 -34,-20 -22,-30 C-16,-35 -8,-36 2,-36 Z';
  const eyes = {
    calm: '<path d="M16,-9 q5,-3 10,0" stroke-width="2.5"/><circle cx="21" cy="-7" r="2.6" fill="#1e1d1b"/>',
    sad: '<path d="M14,-14 l12,4" stroke-width="2.5"/><circle cx="21" cy="-5" r="2.6" fill="#1e1d1b"/>',
    shout: '<circle cx="21" cy="-8" r="4.5" fill="#e3dfd6" stroke-width="2.5"/><circle cx="22" cy="-8" r="1.8" fill="#1e1d1b"/>',
    closed: '<path d="M15,-6 q5,3 10,0" stroke-width="2.5"/>',
  }[face];
  const mouth = face === 'shout' ? '<ellipse cx="27" cy="21" rx="5" ry="7" fill="#1e1d1b"/>' : face === 'sad' ? '<path d="M21,23 q4,-3 8,1" stroke-width="2.5"/>' : '<path d="M22,21 q4,1 7,-1" stroke-width="2.5"/>';
  const hairs: Record<Hair, string> = {
    short: sh('M-30,8 C-38,-18 -24,-40 4,-40 C24,-40 34,-28 33,-14 C22,-24 10,-26 0,-22 C-8,-18 -10,-6 -14,6 Z', 'b30'),
    curly: `${sh('M-31,10 C-40,-16 -26,-42 4,-42 C26,-42 36,-28 34,-12 C22,-24 10,-26 0,-22 C-8,-18 -10,-6 -14,8 Z', 'hd')}<path d="M-30,-14 q-6,-6 0,-12 M-20,-34 q0,-8 8,-8 M0,-42 q6,-6 12,0 M22,-36 q8,0 8,8" stroke-width="2.5"/>`,
    long: sh('M26,-30 C10,-46 -30,-42 -34,-6 C-36,18 -32,44 -22,58 L-6,46 C-12,22 -8,2 -2,-14 C6,-22 16,-24 26,-30 Z', 'b60'),
    braids: `${sh('M26,-30 C10,-46 -30,-42 -34,-6 C-34,8 -30,18 -24,24 L-10,14 C-10,0 -6,-10 -2,-16 C6,-22 16,-24 26,-30 Z', 'b60')}<path d="M-26,20 q-8,10 0,20 q8,10 0,20 q-8,10 0,20" stroke-width="7"/>`,
    bald: '<path d="M-26,-10 q-4,-6 -2,-14" stroke-width="2.5"/>',
    helmet: `${sh('M-34,6 C-38,-34 -14,-48 6,-46 C26,-44 36,-30 36,-12 L36,-4 L16,-4 L14,10 L-34,10 Z', 'a0')}<path d="M-28,-40 C-14,-76 22,-74 34,-50" stroke-width="12"/><path d="M-28,-40 C-14,-76 22,-74 34,-50" stroke="${P}" stroke-width="5"/>`,
    crown: `${sh('M-30,8 C-38,-18 -24,-40 4,-40 C24,-40 34,-28 33,-14 C22,-24 10,-26 0,-22 C-8,-18 -10,-6 -14,6 Z', 'b30')}${wh('M-26,-34 L-24,-62 L-12,-46 L0,-66 L10,-46 L22,-62 L26,-32 Q0,-40 -26,-34 Z')}`,
    hat: `${sh('M-26,-24 C-24,-60 22,-64 26,-28 Z', 'b120')}<path d="M-44,-22 Q0,-34 46,-24" stroke-width="7"/><path d="M-10,-56 q-20,-34 -50,-30" stroke-width="3"/>`,
    kerchief: sh('M-36,10 C-42,-30 -12,-48 10,-44 C32,-40 40,-22 36,-8 L30,-14 C14,-30 -12,-26 -18,0 L-12,34 L-30,30 Z', 'hd'),
    cap: `${sh('M-32,-8 C-34,-40 24,-46 32,-14 Z', 'b0')}<path d="M24,-14 L52,-8" stroke-width="7"/>`,
  };
  const beardSvg = beard ? sh('M32,12 C32,30 22,50 4,52 C-12,52 -22,38 -24,22 C-12,30 0,32 12,26 C22,22 28,18 32,12 Z', 'b120') : '';
  return `${wh(skull)}<path d="M-6,-4 q-9,0 -9,9 q0,9 9,9" stroke-width="2.5"/>${hairs[hair]}${eyes}${beard ? '' : mouth}${beardSvg}`;
}

// ─── Постройки и предметы ──────────────────────────────────────────────────────

/** Колонна с капителью. */
export const column = (x: number, top: number, floor: number, w = 60) =>
  `${sh(`M${x - w / 2},${top + 30} H${x + w / 2} V${floor - 20} H${x - w / 2} Z`, 'c90')}<path d="M${x - w / 6},${top + 30} V${floor - 20} M${x + w / 6},${top + 30} V${floor - 20}" stroke-width="2"/>
   ${wh(`M${x - w / 2 - 16},${top} H${x + w / 2 + 16} V${top + 30} H${x - w / 2 - 16} Z`)}${wh(`M${x - w / 2 - 10},${floor - 20} H${x + w / 2 + 10} V${floor} H${x - w / 2 - 10} Z`)}`;

/** Кирпичная или каменная стена. */
export function bricks(x: number, y: number, w: number, h: number, bw = 70, bh = 34, pat = 'c0'): string {
  let d = '';
  for (let j = 0; j * bh < h; j++) {
    d += `M${x},${y + j * bh} H${x + w} `;
    for (let i = (j % 2) * (bw / 2); i < w; i += bw) d += `M${x + i},${y + j * bh} v${Math.min(bh, h - j * bh)} `;
  }
  return `${sh(`M${x},${y} h${w} v${h} h${-w} Z`, pat)}<path d="${d}" stroke-width="2.5"/>`;
}

/** Парусник (нос вправо): x — середина, y — ватерлиния. */
export const ship = (x: number, y: number, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})">
    ${sh('M-150,-40 H160 L120,30 H-120 Z', 'b0')}<path d="M-130,-14 H140" stroke-width="2"/>
    <path d="M-20,-40 V-330 M70,-40 V-260" stroke-width="6"/>
    ${sh('M-16,-310 C40,-280 50,-170 -16,-90 Z', 'c90')}${sh('M-24,-300 C-90,-260 -110,-160 -24,-96 Z', 'a90')}${sh('M74,-240 C120,-210 124,-130 74,-80 Z', 'c90')}
    <path d="M-20,-330 l40,-14 v20 z" fill="${I}"/>
  </g>`;

/** Человек анфас: руки и ноги расходятся симметрично (полёт, падение, «руки вверх»). */
export interface FrontOpts {
  x: number;
  y: number;
  s?: number;
  rot?: number;
  /** Угол рук от «вниз» наружу (90 — в стороны, 150 — вверх) и сгиб локтя. */
  arms?: [number, number];
  /** Разворот ног наружу и сгиб колен. */
  legs?: [number, number];
  dress?: 'tunic' | 'robe' | 'none';
  pat?: string;
  hair?: 'curly' | 'short' | 'long';
  face?: 'calm' | 'shout';
  /** Крылья: число перьев (0 — без крыльев). */
  wings?: number;
  attrs?: string;
}
export function front(o: FrontOpts): string {
  const [aa, ab] = o.arms ?? [20, 0];
  const [la, lb] = o.legs ?? [6, 0];
  const pat = o.pat ?? 'a60';
  const side = (k: 1 | -1) => {
    const S: Pt = [34 * k, -124];
    const E = add(S, mul([Math.sin((aa * Math.PI) / 180) * k, Math.cos((aa * Math.PI) / 180)], 86));
    const W = add(E, mul([Math.sin(((aa + ab) * Math.PI) / 180) * k, Math.cos(((aa + ab) * Math.PI) / 180)], 80));
    const Hh: Pt = [12 * k, -6];
    const K = add(Hh, mul([Math.sin((la * Math.PI) / 180) * k, Math.cos((la * Math.PI) / 180)], 104));
    const A = add(K, mul([Math.sin(((la - lb) * Math.PI) / 180) * k, Math.cos(((la - lb) * Math.PI) / 180)], 100));
    return { arm: [S, E, W] as Pt[], leg: [Hh, K, A] as Pt[] };
  };
  const L = side(-1);
  const R = side(1);
  const limb = (pts: Pt[], w: number, hp?: string) => {
    const d = `M${pts.map(pt).join(' L')}`;
    return `<path d="${d}" stroke="${I}" stroke-width="${w + 6}"/><path d="${d}" stroke="${P}" stroke-width="${w}"/>${hp ? `<path d="${d}" stroke="url(#${hp})" stroke-width="${w}"/>` : ''}`;
  };
  const n = o.wings ?? 0;
  const wings = n ? `${wing(L.arm[0], L.arm[2], -25, n, 190, 30)}${wing(R.arm[0], R.arm[2], 25, n, 190, -30)}` : '';
  const torso = 'M-34,-132 C-20,-140 20,-140 34,-132 L30,-10 L-30,-10 Z';
  const skirtY = o.dress === 'robe' ? 210 : o.dress === 'none' ? 34 : 72;
  const skirt = `M-31,-12 L31,-12 L${skirtY > 100 ? 62 : 46},${skirtY} Q0,${skirtY + 10} ${skirtY > 100 ? -62 : -46},${skirtY} Z`;
  const hair = {
    curly: `${sh('M-31,-6 C-36,-34 -20,-44 0,-44 C20,-44 36,-34 31,-6 C24,-24 12,-30 0,-30 C-12,-30 -24,-24 -31,-6 Z', 'hd')}<path d="M-28,-24 q-8,-4 -4,-12 M-14,-40 q0,-8 8,-8 M8,-44 q8,-4 12,4 M26,-30 q8,0 6,10" stroke-width="2.5"/>`,
    short: sh('M-31,-6 C-36,-34 -20,-44 0,-44 C20,-44 36,-34 31,-6 C24,-24 12,-30 0,-30 C-12,-30 -24,-24 -31,-6 Z', 'b30'),
    long: sh('M-31,30 C-40,-34 -20,-44 0,-44 C20,-44 40,-34 31,30 L24,30 C26,-10 14,-30 0,-30 C-14,-30 -26,-10 -24,30 Z', 'b90'),
  }[o.hair ?? 'curly'];
  const eyes = o.face === 'shout' ? '<circle cx="-11" cy="-4" r="4" fill="#e3dfd6" stroke-width="2.5"/><circle cx="11" cy="-4" r="4" fill="#e3dfd6" stroke-width="2.5"/><ellipse cx="0" cy="22" rx="6" ry="8" fill="#1e1d1b"/>' : '<path d="M-16,-4 q5,-4 10,0 M6,-4 q5,-4 10,0" stroke-width="2.5"/><path d="M-7,22 q7,4 14,0" stroke-width="2.5"/>';
  const headSvg = `<g transform="translate(0 -178)">${wh('M0,-38 C20,-38 31,-22 31,0 C31,24 17,40 0,40 C-17,40 -31,24 -31,0 C-31,-22 -20,-38 0,-38 Z')}${hair}${eyes}<path d="M0,0 L-4,13 L4,13" stroke-width="2.5"/></g>`;
  const hands = [L.arm[2], R.arm[2]].map((h) => `<circle cx="${r1(h[0])}" cy="${r1(h[1])}" r="10" fill="${P}" stroke-width="3"/>`).join('');
  const feet = [L.leg[2], R.leg[2]].map((h) => `<circle cx="${r1(h[0])}" cy="${r1(h[1])}" r="12" fill="${I}"/>`).join('');
  return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot ?? 0}) scale(${o.s ?? 1})" stroke-width="3" ${o.attrs ?? ''}>
    ${wings}${limb(L.arm, 20)}${limb(R.arm, 20)}${hands}${limb(L.leg, 26)}${limb(R.leg, 26)}${feet}
    ${o.dress === 'none' ? sh(skirt, 'a30') : `${sh(skirt, pat)}<path d="M-12,0 L-22,${skirtY} M12,0 L22,${skirtY}" stroke-width="2.5"/><path d="M-30,-10 H30" stroke-width="7"/>`}
    ${o.dress === 'none' ? sh(torso, 'c90') : sh(torso, pat)}${headSvg}
  </g>`;
}

/** Точки фигуры в координатах рисунка: кисти, пятки, голова (чтобы вложить предмет или прицелиться). */
export function figPts(o: FigOpts): { hand: Pt; hand2: Pt; heel: Pt; heel2: Pt; toe: Pt; toe2: Pt; head: Pt; hip: Pt } {
  const s = o.s ?? 1;
  const f = o.f ?? 1;
  const lean = o.lean ?? 0;
  const W = (p: Pt): Pt => {
    const q = rot([p[0] * s * f, p[1] * s], o.rot ?? 0);
    return [r1(o.x + q[0]), r1(o.y + q[1])];
  };
  const S = rot([-4, -124], lean);
  const hand = ([a1, a2]: [number, number]) => add(add(S, mul(dir(a1), 86)), mul(dir(a1 + a2), 80));
  const foot = ([t, k]: [number, number]) => {
    const K = mul(dir(t), 104);
    const A = add(K, mul(dir(t - k), 100));
    const fd = dir(t - k + 90);
    return { heel: add(A, mul(fd, -10)), toe: add(A, mul(fd, 30)) };
  };
  const l1 = foot(o.leg ?? [8, 0]);
  const l2 = foot(o.leg2 ?? [-8, 0]);
  return {
    hand: W(hand(o.arm ?? [-6, 10])),
    hand2: W(hand(o.arm2 ?? [8, 10])),
    heel: W(l1.heel),
    heel2: W(l2.heel),
    toe: W(l1.toe),
    toe2: W(l2.toe),
    head: W(add(rot([0, -142], lean), rot([4, -36], lean + (o.nod ?? 0)))),
    hip: [o.x, o.y],
  };
}
