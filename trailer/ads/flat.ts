/**
 * Плоская детальная рисовка «как в мультике-объяснялке» (образец Артёма 03.11.2026): заливки без обводок,
 * тени — чуть темнее основного цвета, крупные головы, шапки, шарфы, тёплый свет ламп на тёмно-синей ночи.
 * Всё рисуется кодом, своих персонажей и логотипов нет.
 */
import type { Face } from './draw.ts';

export const FL = {
  night: '#121829',
  night2: '#1d2440',
  wall: '#2c3555',
  wall2: '#273050',
  floor: '#4a3426',
  floor2: '#3e2b20',
  wood: '#7a5236',
  wood2: '#5e3f2a',
  wood3: '#94673f',
  frame: '#e7e2d6',
  warm: '#ffcf73',
  moon: '#f3ead2',
  skin: '#eab48c',
  skin2: '#d39a72',
  ink: '#2a1d18',
  red: '#c23b33',
  red2: '#9a2c26',
  green: '#56733f',
  green2: '#435b31',
  blue: '#3f6fa8',
  blue2: '#2f5584',
  jeans: '#33405e',
  jeans2: '#283350',
  shoe: '#1f1f26',
  white: '#f4f1ea',
  grey: '#8b93a6',
  orange: '#ffb03a',
};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// ─── Лица ─────────────────────────────────────────────────────────────────────

/** Лица в центре головы (радиус 62). `f` — куда смотрят зрачки. */
export function flatFaces(f: 1 | -1): Partial<Record<Face, string>> {
  const I = FL.ink;
  const px = 3 * f;
  const eyes = (dy = 0, rx = 6, ry = 8) =>
    `<ellipse cx="${-21 + px}" cy="${-2 + dy}" rx="${rx}" ry="${ry}" fill="${I}"/><ellipse cx="${21 + px}" cy="${-2 + dy}" rx="${rx}" ry="${ry}" fill="${I}"/>
     <circle cx="${-19 + px}" cy="${-5 + dy}" r="2" fill="#fff"/><circle cx="${23 + px}" cy="${-5 + dy}" r="2" fill="#fff"/>`;
  const p = (d: string, w = 4.5) => `<path d="${d}" fill="none" stroke="${I}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const blush = `<ellipse cx="-34" cy="18" rx="10" ry="6" fill="#e58f7c" opacity="0.55"/><ellipse cx="34" cy="18" rx="10" ry="6" fill="#e58f7c" opacity="0.55"/>`;
  return {
    neutral: `${blush}${eyes()}${p('M-30,-20 q9,-4 18,-1 M12,-21 q9,-3 18,1')}${p('M-9,26 h18')}`,
    tired: `${blush}<path d="M-28,-1 h14 v4 a7,5 0 0 1 -14,0 z M14,-1 h14 v4 a7,5 0 0 1 -14,0 z" fill="${I}"/>${p('M-30,-2 h18 M12,-2 h18 M-28,12 q7,4 13,0 M15,12 q7,4 13,0', 3.5)}${p('M-8,28 q8,-3 16,0')}`,
    doubt: `${blush}${eyes(1)}${p('M-31,-16 q9,-3 18,0 M12,-28 q9,-6 18,-1')}${p('M-10,28 q10,-2 20,-9')}`,
    smirk: `${blush}${eyes(1, 6, 7)}${p('M-31,-17 h18 M12,-20 q9,-4 18,0')}${p('M-12,25 q14,6 26,-8')}`,
    calm: `${blush}${p('M-28,-1 q7,-6 14,0 M14,-1 q7,-6 14,0')}${p('M-30,-18 q9,-4 18,-1 M12,-19 q9,-3 18,1')}${p('M-12,23 q12,9 24,0')}`,
    shock: `<circle cx="-21" cy="-3" r="12" fill="#fff"/><circle cx="21" cy="-3" r="12" fill="#fff"/><circle cx="${-21 + px}" cy="-3" r="6" fill="${I}"/><circle cx="${21 + px}" cy="-3" r="6" fill="${I}"/>${p('M-33,-27 q10,-8 20,-2 M13,-29 q10,-6 20,2')}<ellipse cx="0" cy="30" rx="9" ry="12" fill="${I}"/>`,
    smile: `${blush}${eyes()}${p('M-30,-20 q9,-5 18,-1 M12,-21 q9,-4 18,1')}${p('M-15,20 q15,14 30,0')}`,
    grin: `${blush}${eyes(-1)}${p('M-30,-22 q9,-5 18,-1 M12,-23 q9,-4 18,1')}<path d="M-18,17 q18,26 36,0 z" fill="${I}"/><path d="M-12,19 h24 v4 h-24 z" fill="#fff"/>`,
    think: `${blush}<ellipse cx="${-21 + px}" cy="-4" rx="6" ry="8" fill="${I}"/><ellipse cx="${21 + px}" cy="-4" rx="6" ry="8" fill="${I}"/><circle cx="${-20 + px}" cy="-9" r="2.4" fill="#fff"/><circle cx="${22 + px}" cy="-9" r="2.4" fill="#fff"/>${p('M-31,-19 q9,-4 18,0 M12,-27 q9,-5 18,0')}${p('M-4,26 q8,-4 14,1')}`,
    sad: `${blush}${eyes(2)}${p('M-30,-14 q8,-8 18,-10 M12,-24 q10,2 18,10')}${p('M-12,30 q12,-11 24,0')}`,
    shout: `${blush}${eyes()}${p('M-32,-26 l20,8 M12,-18 l20,-8')}<ellipse cx="0" cy="28" rx="14" ry="13" fill="${I}"/>`,
  };
}

// ─── Человек ──────────────────────────────────────────────────────────────────

export type FHat = 'beanie' | 'short' | 'bun' | 'pilot' | 'curly';
export type FArm = 'down' | 'phone' | 'mug' | 'point' | 'chin' | 'desk' | 'wave' | 'hip';
export interface FPerson {
  id: string;
  x: number;
  floor: number;
  f?: 1 | -1;
  pose?: 'stand' | 'sit';
  coat?: string;
  pants?: string;
  scarf?: string;
  hat?: FHat;
  hatColor?: string;
  hair?: string;
  arms?: [FArm, FArm];
  face?: Face;
  faces?: Face[];
  /** Масштаб (1 = рост около 560). */
  s?: number;
}

/** Рука от плеча (sx,sy) до кисти; рукав — толстая линия с закруглением, кисть — кружок. */
const arm = (sx: number, sy: number, mx: number, my: number, hx: number, hy: number, coat: string) =>
  `<path d="M${sx},${sy} Q${mx},${my} ${hx},${hy}" fill="none" stroke="${shade(coat, 0.86)}" stroke-width="38" stroke-linecap="round"/>
   <circle cx="${hx}" cy="${hy}" r="17" fill="${FL.skin}"/>`;

export function fperson(o: FPerson): { svg: string; head: { x: number; y: number } } {
  const f = o.f ?? 1;
  const s = o.s ?? 1;
  const coat = o.coat ?? FL.green;
  const pants = o.pants ?? FL.jeans;
  const sit = o.pose === 'sit';
  const hatC = o.hatColor ?? '#2b2c36';
  const hairC = o.hair ?? '#4a3020';
  // Локальные координаты: ноги на y=0, x=0 — центр, смотрит вправо при f=1 (кроме лица, оно анфас).
  const hipY = sit ? -230 : -250;
  const shY = hipY - 210;
  const headY = shY - 78;
  const legs = sit
    ? `<path d="M-40,${hipY} h${110} v52 h-110 z" fill="${pants}"/><rect x="40" y="${hipY}" width="52" height="${-hipY - 22}" rx="12" fill="${shade(pants, 0.85)}"/>
       <path d="M-8,${hipY} h${90}" stroke="${shade(pants, 0.8)}" stroke-width="4"/>
       <rect x="30" y="-28" width="82" height="30" rx="14" fill="${FL.shoe}"/>`
    : `<rect x="-52" y="${hipY}" width="48" height="${-hipY - 24}" rx="14" fill="${pants}"/><rect x="4" y="${hipY}" width="48" height="${-hipY - 24}" rx="14" fill="${shade(pants, 0.88)}"/>
       <rect x="-62" y="-32" width="66" height="34" rx="15" fill="${FL.shoe}"/><rect x="-2" y="-32" width="66" height="34" rx="15" fill="${FL.shoe}"/>`;
  // Куртка: тело с подолом, молния, карман, тень на дальней стороне.
  const torso = `<path d="M-72,${shY + 18} q0,-24 26,-26 h92 q26,2 26,26 l8,${hipY - shY + 30} q-80,14 -160,0 z" fill="${coat}"/>
     <path d="M8,${shY - 6} h38 q26,2 26,26 l8,${hipY - shY + 30} q-36,7 -72,6 z" fill="${shade(coat, 0.88)}"/>
     <path d="M0,${shY - 4} V${hipY + 34}" stroke="${shade(coat, 0.7)}" stroke-width="4"/>
     <rect x="-58" y="${hipY - 40}" width="44" height="30" rx="6" fill="${shade(coat, 0.9)}"/>
     <path d="M-58,${hipY - 40} h44" stroke="${shade(coat, 0.72)}" stroke-width="4"/>`;
  const scarf = o.scarf
    ? `<path d="M-40,${shY - 14} q40,22 80,0 v22 q-40,20 -80,0 z" fill="${o.scarf}"/><rect x="${10 * f - 12}" y="${shY + 4}" width="26" height="80" rx="8" fill="${shade(o.scarf, 0.85)}"/>`
    : `<rect x="-20" y="${shY - 22}" width="40" height="30" fill="${FL.skin2}"/>`;
  const H = (x: number, y: number) => [x * f, y] as const;
  const armSvg = (a: FArm, side: -1 | 1) => {
    const sx = 64 * side;
    const sy = shY + 20;
    const pt = (x: number, y: number) => `${x}`; // eslint-disable-line @typescript-eslint/no-unused-vars
    void pt;
    switch (a) {
      case 'phone': {
        const [hx, hy] = [28 * side * -1 + 20, shY + 70];
        return `${arm(sx, sy, sx + 20 * side, sy + 120, hx, hy, coat)}<rect x="${hx - 22}" y="${hy - 52}" width="44" height="76" rx="8" fill="#15161d"/><rect x="${hx - 17}" y="${hy - 46}" width="34" height="58" rx="4" fill="#9fd3ff"/>`;
      }
      case 'mug': {
        const [hx, hy] = [sx + 34 * side, shY + 120];
        return `${arm(sx, sy, sx + 40 * side, sy + 150, hx, hy, coat)}<rect x="${hx - 26}" y="${hy - 40}" width="52" height="58" rx="10" fill="${FL.red}"/><path d="M${hx + 26 * side},${hy - 26} q${22 * side},4 0,26" fill="none" stroke="${FL.red}" stroke-width="8"/>
          <g class="steam"><path d="M${hx - 8},${hy - 52} q-10,-20 0,-36 q10,-16 0,-32 M${hx + 10},${hy - 50} q-10,-18 0,-32" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round"/></g>`;
      }
      case 'point':
        return arm(sx, sy, sx + 110 * side, sy + 10, sx + 170 * side, sy - 40, coat);
      case 'wave':
        return arm(sx, sy, sx + 70 * side, sy - 60, sx + 60 * side, sy - 170, coat);
      case 'chin':
        return arm(sx, sy, sx + 30 * side, sy + 170, 26 * side, headY + 66, coat);
      case 'desk':
        return arm(sx, sy, sx + 40 * side, sy + 160, sx + 150 * side, sy + 170, coat);
      case 'hip':
        return arm(sx, sy, sx + 70 * side, sy + 90, sx + 26 * side, sy + 180, coat);
      default:
        return arm(sx, sy, sx + 18 * side, sy + 100, sx + 14 * side, sy + 210, coat);
    }
  };
  const arms = o.arms ?? ['down', 'down'];
  // f=1: правая рука (side 1) — ближняя к зрителю справа. Дальнюю рисуем до тела, ближнюю после.
  const backArm = armSvg(arms[0], -1);
  const frontArm = armSvg(arms[1], 1);
  // Голова и прическа.
  const R = 62;
  let hat = '';
  let back = '';
  switch (o.hat ?? 'short') {
    case 'beanie':
      hat = `<g transform="translate(0 -18)"><path d="M-66,-6 q0,-72 66,-72 q66,0 66,72 z" fill="${hatC}"/><rect x="-70" y="-22" width="140" height="30" rx="12" fill="${shade(hatC, 0.8)}"/><circle cx="0" cy="-80" r="13" fill="${shade(hatC, 1.25)}"/>
             <path d="M-40,-40 v-20 M-20,-46 v-24 M0,-48 v-26 M20,-46 v-24 M40,-40 v-20" stroke="${shade(hatC, 0.85)}" stroke-width="3"/></g>`;
      break;
    case 'bun':
      back = `<circle cx="0" cy="-70" r="30" fill="${hairC}"/><path d="M-64,0 q-8,60 14,80 h30 q-20,-30 -18,-80 z M64,0 q8,60 -14,80 h-30 q20,-30 18,-80 z" fill="${hairC}"/>`;
      hat = `<path d="M-64,4 q-4,-70 64,-70 q68,0 64,70 q-20,-40 -64,-38 q-40,0 -64,38 z" fill="${hairC}"/>`;
      break;
    case 'curly':
      hat = [[-50, -30], [-30, -54], [0, -62], [30, -54], [50, -30], [-58, -2], [58, -2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="${hairC}"/>`).join('');
      break;
    case 'pilot':
      hat = `<path d="M-60,-34 q0,-44 60,-44 q60,0 60,44 z" fill="#1d2a44"/><rect x="-66" y="-38" width="132" height="22" rx="8" fill="#1d2a44"/><path d="M-70,-18 h140 q-10,16 -70,16 q-60,0 -70,-16 z" fill="#111827"/><rect x="-14" y="-60" width="28" height="16" rx="4" fill="${FL.orange}"/>`;
      break;
    default:
      hat = `<path d="M-64,0 q-6,-70 64,-70 q60,0 64,60 q-30,-34 -70,-30 q-30,4 -46,30 z" fill="${hairC}"/>`;
  }
  const faces = flatFaces(f);
  const want = o.faces ?? (Object.keys(faces) as Face[]);
  const face0 = o.face ?? 'neutral';
  const faceSvg = want
    .filter((k) => faces[k])
    .map((k) => `<g class="face${o.id}" id="face${o.id}_${k}" opacity="${k === face0 ? 1 : 0}">${faces[k]}</g>`)
    .join('');
  const head = `<g transform="translate(0 ${headY})">${back}
      <ellipse cx="-62" cy="6" rx="12" ry="16" fill="${FL.skin2}"/><ellipse cx="62" cy="6" rx="12" ry="16" fill="${FL.skin2}"/>
      <circle r="${R}" fill="${FL.skin}"/><path d="M${R - 4},-20 a${R},${R} 0 0 1 -30,78 a70,70 0 0 0 30,-78 z" fill="${FL.skin2}" opacity="0.5"/>
      ${faceSvg}${hat}</g>`;
  const svg = `<g id="p${o.id}" transform="translate(${o.x} ${o.floor}) scale(${s})">
    <ellipse cx="0" cy="2" rx="${sit ? 120 : 90}" ry="14" fill="#000" opacity="0.28"/>
    <g transform="scale(${f} 1)">${legs}${backArm}${torso}</g>${scarf}<g transform="scale(${f} 1)">${frontArm}</g>${head}</g>`;
  void H;
  return { svg, head: { x: o.x, y: o.floor + headY * s } };
}

// ─── Комната ──────────────────────────────────────────────────────────────────

export const stars = (n: number, x0: number, y0: number, w: number, h: number, seed = 7) => {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => `<circle class="twk${i % 3}" cx="${(x0 + rnd() * w).toFixed(0)}" cy="${(y0 + rnd() * h).toFixed(0)}" r="${(1.2 + rnd() * 2.2).toFixed(1)}" fill="#fff" opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`).join('');
};

export const moon = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="${FL.moon}" opacity="0.08"/><circle cx="${x}" cy="${y}" r="${r * 1.5}" fill="${FL.moon}" opacity="0.12"/><circle cx="${x}" cy="${y}" r="${r}" fill="${FL.moon}"/>
   <circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#ddd2b5"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.12}" fill="#ddd2b5"/>`;

/** Домик за окном (силуэт с окнами), как у образца. */
export const cottage = (x: number, y: number, s: number, lit = true) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-60" y="-70" width="120" height="70" fill="${FL.wood2}"/><path d="M-74,-66 L0,-120 L74,-66 z" fill="#3b2a22"/>
  <rect x="-40" y="-52" width="26" height="28" fill="${lit ? FL.warm : '#2a2f40'}"/><rect x="14" y="-52" width="26" height="28" fill="${lit ? FL.warm : '#2a2f40'}"/>
  <path d="M-40,-38 h26 M-27,-52 v28 M14,-38 h26 M27,-52 v28" stroke="${FL.frame}" stroke-width="3"/><rect x="30" y="-140" width="14" height="40" fill="#3b2a22"/></g>`;

/** Ночная комната: стены, окно с луной и посёлком, стол с лампой, полка, кровать, часы. Пол — y = floor. */
export function bedroom(floor = 1180): string {
  const wallTop = 120;
  const fy = floor - 100; // линия, где стена встречает пол
  const plank = Array.from({ length: 9 }, (_, i) => `<path d="M0,${fy + 30 + i * 34} H1080" stroke="${FL.floor2}" stroke-width="3"/>`).join('');
  const stripes = Array.from({ length: 28 }, (_, i) => `<rect x="${i * 40}" y="${wallTop}" width="14" height="${fy - wallTop}" fill="${FL.wall2}"/>`).join('');
  const books = [['#b8413a', 26, 120], ['#3f6fa8', 22, 110], ['#e0b04f', 30, 128], ['#56733f', 20, 100], ['#8d5aa0', 26, 118], ['#d9d2c0', 18, 96]]
    .map(([c, w, h], i, a) => {
      const x = 640 + a.slice(0, i).reduce((s, b) => s + (b[1] as number) + 4, 0);
      return `<rect x="${x}" y="${470 - (h as number)}" width="${w}" height="${h}" rx="3" fill="${c}"/><rect x="${x}" y="${470 - (h as number) + 18}" width="${w}" height="8" fill="#000" opacity="0.18"/>`;
    })
    .join('');
  return `
  <defs>
    <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${FL.warm}" stop-opacity="0.55"/><stop offset="1" stop-color="${FL.warm}" stop-opacity="0"/></radialGradient>
    <linearGradient id="winSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1222"/><stop offset="1" stop-color="#253058"/></linearGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FL.warm}" stop-opacity="0.45"/><stop offset="1" stop-color="${FL.warm}" stop-opacity="0"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FL.night}" stop-opacity="0"/><stop offset="1" stop-color="${FL.night}"/></linearGradient>
  </defs>
  <rect x="-400" y="-400" width="1880" height="2720" fill="${FL.night}"/>
  <rect x="0" y="${wallTop}" width="1080" height="${fy - wallTop}" fill="${FL.wall}"/>${stripes}
  <rect x="0" y="${wallTop}" width="1080" height="26" fill="${FL.wood2}"/>
  <rect x="0" y="${fy}" width="1080" height="${floor + 260 - fy}" fill="${FL.floor}"/>${plank}
  <rect x="0" y="${fy - 22}" width="1080" height="22" fill="${FL.wood3}"/>
  <circle cx="860" cy="680" r="430" fill="url(#lampGlow)"/>
  <!-- окно -->
  <g id="window">
    <rect x="330" y="230" width="380" height="380" fill="url(#winSky)"/>
    ${stars(26, 340, 240, 360, 220, 3)}
    ${moon(600, 320, 40)}
    <rect x="330" y="520" width="380" height="90" fill="#141a2c"/>
    ${cottage(410, 560, 0.62)}${cottage(560, 572, 0.5, false)}${cottage(670, 560, 0.55)}
    <rect x="330" y="580" width="380" height="30" fill="#e9eef7" opacity="0.9"/>
    <rect x="316" y="216" width="408" height="18" fill="${FL.frame}"/><rect x="316" y="606" width="408" height="22" fill="${FL.frame}"/>
    <rect x="316" y="216" width="18" height="410" fill="${FL.frame}"/><rect x="706" y="216" width="18" height="410" fill="${FL.frame}"/>
    <rect x="511" y="216" width="18" height="410" fill="${FL.frame}"/><rect x="316" y="410" width="408" height="14" fill="${FL.frame}"/>
    <rect x="296" y="622" width="448" height="20" rx="4" fill="#cfc8b8"/>
    <path d="M270,190 h70 q-10,240 20,460 h-90 z" fill="${FL.red2}"/><path d="M286,190 v450" stroke="${shade(FL.red2, 0.8)}" stroke-width="6"/>
    <path d="M770,190 h-70 q10,240 -20,460 h90 z" fill="${FL.red2}"/><path d="M754,190 v450" stroke="${shade(FL.red2, 0.8)}" stroke-width="6"/>
    <rect x="250" y="178" width="540" height="16" rx="8" fill="${FL.wood2}"/>
  </g>
  <!-- батарея -->
  <g>${Array.from({ length: 8 }, (_, i) => `<rect x="${380 + i * 36}" y="700" width="28" height="150" rx="10" fill="#c9c4b8"/>`).join('')}<rect x="372" y="752" width="296" height="12" fill="#a9a497"/></g>
  <!-- плакат: знак «Стоп» -->
  <g transform="translate(150 420)"><rect x="-90" y="-120" width="180" height="250" fill="${FL.white}"/><rect x="-90" y="-120" width="180" height="250" fill="none" stroke="#c7c0ae" stroke-width="6"/>
    <path d="M-25,-75 h50 l35,35 v50 l-35,35 h-50 l-35,-35 v-50 z" fill="${FL.red}"/><text x="0" y="-2" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="34" fill="#fff">STOP</text>
    <rect x="-60" y="70" width="120" height="10" fill="#b9b2a2"/><rect x="-60" y="92" width="80" height="10" fill="#b9b2a2"/><circle cx="0" cy="-112" r="6" fill="${FL.red}"/></g>
  <!-- часы -->
  <g transform="translate(900 270)"><circle r="62" fill="${FL.white}"/><circle r="62" fill="none" stroke="${FL.wood2}" stroke-width="10"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-52" width="6" height="${i % 3 ? 8 : 14}" fill="${FL.ink}" transform="rotate(${i * 30})"/>`).join('')}
    <rect x="-4" y="-34" width="8" height="38" rx="4" fill="${FL.ink}" transform="rotate(80)"/><rect x="-3" y="-48" width="6" height="52" rx="3" fill="${FL.ink}" transform="rotate(240)"/>
    <rect id="secHand" x="-1.5" y="-50" width="3" height="56" fill="${FL.red}"/><circle r="6" fill="${FL.ink}"/></g>
  <!-- полка с книгами -->
  <rect x="620" y="470" width="270" height="18" fill="${FL.wood3}"/><rect x="630" y="488" width="14" height="30" fill="${FL.wood2}"/><rect x="866" y="488" width="14" height="30" fill="${FL.wood2}"/>
  ${books}
  <g transform="translate(860 470)"><rect x="-3" y="-80" width="6" height="80" fill="#999"/><circle cx="0" cy="-92" r="22" fill="#3f6fa8"/><circle cx="0" cy="-92" r="22" fill="none" stroke="#fff" stroke-width="4"/><path d="M-10,-92 h20" stroke="#fff" stroke-width="6"/></g>
  <!-- кровать слева -->
  <g><rect x="-20" y="${fy - 90}" width="250" height="150" rx="16" fill="${FL.wood2}"/><rect x="-20" y="${fy - 150}" width="40" height="210" rx="10" fill="${FL.wood}"/>
    <rect x="-20" y="${fy - 100}" width="250" height="60" rx="20" fill="#4c6fa3"/><rect x="0" y="${fy - 130}" width="110" height="46" rx="20" fill="${FL.white}"/>
    <path d="M60,${fy - 96} q80,-14 170,0 v58 h-170 z" fill="#3e5d8c"/></g>
  <!-- ковёр -->
  <ellipse cx="520" cy="${floor + 30}" rx="430" ry="64" fill="#7b3a35"/><ellipse cx="520" cy="${floor + 30}" rx="380" ry="48" fill="none" stroke="#c7795a" stroke-width="6" stroke-dasharray="18 12"/>
  <!-- стол и лампа -->
  <g id="desk">
    <path d="M820,${fy - 330} l-40,-170 l70,-60" fill="none" stroke="#2f2f38" stroke-width="12" stroke-linecap="round"/>
    <path d="M850,${fy - 560} l60,-10 l20,70 q-60,30 -110,-4 z" fill="#d9a43c"/>
    <path d="M820,${fy - 504} L640,${fy - 210} L1000,${fy - 210} L900,${fy - 520} z" fill="url(#cone)" class="cone"/>
    <rect x="790" y="${fy - 340}" width="70" height="14" rx="6" fill="#2f2f38"/>
    <rect x="600" y="${fy - 220}" width="460" height="30" rx="6" fill="${FL.wood3}"/><rect x="600" y="${fy - 190}" width="460" height="14" fill="${FL.wood2}"/>
    <rect x="620" y="${fy - 176}" width="24" height="${floor - fy + 176}" fill="${FL.wood2}"/><rect x="1020" y="${fy - 176}" width="24" height="${floor - fy + 176}" fill="${FL.wood2}"/>
    <rect x="860" y="${fy - 176}" width="170" height="150" fill="${FL.wood}"/><rect x="880" y="${fy - 150}" width="130" height="50" fill="${FL.wood3}"/><circle cx="945" cy="${fy - 125}" r="6" fill="${FL.wood2}"/>
    <g transform="translate(720 ${fy - 222})">
      <rect x="-70" y="-16" width="150" height="16" fill="#efe9da" transform="rotate(-4)"/><rect x="-66" y="-30" width="150" height="16" fill="#e5dfcf" transform="rotate(3)"/>
      <rect x="-72" y="-46" width="150" height="16" fill="#f4efe2" transform="rotate(-2)"/>
      <rect x="-58" y="-90" width="130" height="44" fill="${FL.white}" transform="rotate(-6)"/>
      <text x="0" y="-60" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="24" fill="${FL.red}" transform="rotate(-6)">БИЛЕТЫ 1–40</text></g>
    <g transform="translate(980 ${fy - 222})"><rect x="-26" y="-56" width="52" height="56" rx="8" fill="${FL.blue}"/><path d="M26,-44 q22,4 0,28" fill="none" stroke="${FL.blue}" stroke-width="8"/>
      <g class="steam"><path d="M-8,-66 q-10,-20 0,-36 q10,-16 0,-32 M10,-64 q-10,-18 0,-32" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round"/></g></g>
  </g>
  <!-- стул -->
  <g><rect x="700" y="${floor - 236}" width="170" height="24" rx="8" fill="#38425e"/><rect x="852" y="${floor - 420}" width="24" height="200" rx="8" fill="#38425e"/>
    <rect x="712" y="${floor - 212}" width="16" height="212" fill="#2a3248"/><rect x="842" y="${floor - 212}" width="16" height="212" fill="#2a3248"/></g>
  <!-- дверь -->
  <g><rect x="40" y="${fy - 520}" width="0" height="0"/></g>
  <rect x="0" y="${floor + 120}" width="1080" height="160" fill="url(#fade)"/>`;
}

// ─── Улица, Нью-Йорк, самолёт ─────────────────────────────────────────────────

/** Пассажирский самолёт сбоку, без надписей и логотипов. Начало — центр фюзеляжа, нос вправо. */
export function plane(x: number, y: number, s = 1, rot = 0, opts: { smoke?: boolean; fire?: boolean; id?: string; cls?: string } = {}) {
  const win = Array.from({ length: 18 }, (_, i) => `<rect x="${-190 + i * 22}" y="-18" width="11" height="15" rx="4" fill="#26324d"/>`).join('');
  const smoke = opts.smoke
    ? `<g class="smoke">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${-60 - i * 70}" cy="${30 - i * 18}" r="${26 + i * 12}" fill="#5a5e68" opacity="${0.75 - i * 0.12}"/>`).join('')}</g>`
    : '';
  const fire = opts.fire ? `<g class="fire"><path d="M-30,30 q-40,-10 -70,10 q30,4 40,18 q-30,6 -50,24 q40,0 80,-22 z" fill="#ff8a2a"/><path d="M-30,32 q-24,-4 -40,8 q20,4 40,6 z" fill="#ffe08a"/></g>` : '';
  return `<g ${opts.id ? `id="${opts.id}"` : ''} ${opts.cls ? `class="${opts.cls}"` : ''} transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    ${smoke}
    <path d="M-250,-40 L-210,-130 L-170,-130 L-150,-36 z" fill="#d9dde6"/><path d="M-226,-96 L-205,-128 L-178,-128 L-170,-96 z" fill="${FL.blue}"/>
    <path d="M-246,-30 L-280,-20 L-240,-6 z" fill="#c6cbd6"/>
    <path d="M-240,-40 H200 q70,0 90,40 q-20,40 -90,40 H-230 q-26,0 -26,-40 q0,-40 16,-40 z" fill="#f2f4f8"/>
    <path d="M-250,8 H290 q-14,32 -90,32 H-230 q-20,0 -20,-32 z" fill="#d6dbe5"/>
    <path d="M-240,6 H284" stroke="${FL.blue}" stroke-width="9"/>
    ${win}
    <path d="M232,-30 q34,2 48,22 h-48 z" fill="#26324d"/>
    <rect x="70" y="-30" width="22" height="44" rx="4" fill="none" stroke="#b9bfcc" stroke-width="3"/>
    <path d="M-60,10 L-150,90 L-110,90 L20,14 z" fill="#aeb5c4"/>
    <rect x="-70" y="22" width="90" height="38" rx="18" fill="#8f97a8"/><ellipse cx="20" cy="41" rx="8" ry="19" fill="#262b36"/>
    ${fire}
  </g>`;
}

/** Гусь в полёте (силуэт), смотрит влево (навстречу самолёту). */
export const goose = (x: number, y: number, s = 1, up = true) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="goose">
  <path d="M-40,0 q20,-14 60,-6 q24,4 30,10 q-30,10 -60,8 q-20,0 -30,-12 z" fill="#3b3a3a"/>
  <path d="M-38,-2 q-14,-10 -30,-6 l-10,4 l12,4 q14,0 28,4 z" fill="#1f1f1f"/><circle cx="-62" cy="-6" r="3" fill="#fff"/>
  <path d="M0,-4 ${up ? 'q10,-50 40,-62 q-6,40 -20,62' : 'q10,40 40,52 q-6,-30 -20,-52'} z" fill="#565452"/>
  <path d="M40,2 l22,-4 l-6,10 z" fill="#2a2a2a"/></g></g>`;

/** Небоскрёб с окнами. */
export const tower = (x: number, base: number, w: number, h: number, c: string, lit = 0.35, seed = 1) => {
  let r = seed * 97;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const cols = Math.floor((w - 16) / 16);
  const rows = Math.floor((h - 20) / 22);
  const wins: string[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) if (rnd() < lit) wins.push(`<rect x="${x + 10 + i * 16}" y="${base - h + 14 + j * 22}" width="8" height="11" fill="${FL.warm}" opacity="${(0.6 + rnd() * 0.4).toFixed(2)}"/>`);
  return `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${c}"/><rect x="${x + w * 0.7}" y="${base - h}" width="${w * 0.3}" height="${h}" fill="#000" opacity="0.14"/>${wins.join('')}`;
};

/** Маленький человечек для толпы (на крыле): ~70 px. */
export const mini = (x: number, y: number, c: string, s = 1, wave = false) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-10" y="-26" width="8" height="26" fill="#2a3048"/><rect x="2" y="-26" width="8" height="26" fill="#2a3048"/>
  <rect x="-14" y="-62" width="28" height="40" rx="8" fill="${c}"/>${wave ? `<path d="M12,-56 l14,-26" stroke="${c}" stroke-width="8" stroke-linecap="round"/>` : ''}
  <circle cx="0" cy="-74" r="13" fill="${FL.skin}"/></g>`;

/** Паром / катер (без надписей). */
export const ferry = (x: number, y: number, s = 1, f: 1 | -1 = 1) => `<g transform="translate(${x} ${y}) scale(${s * f} ${s})">
  <path d="M-150,0 h300 l-30,44 h-240 z" fill="#2c4a7a"/><rect x="-110" y="-56" width="200" height="56" fill="${FL.white}"/><rect x="-80" y="-96" width="120" height="40" fill="#e6e2d6"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${-100 + i * 24}" y="-44" width="14" height="16" rx="3" fill="#26324d"/>`).join('')}
  <rect x="-10" y="-130" width="20" height="36" fill="${FL.orange}"/><path d="M-150,40 q150,20 300,0" stroke="#fff" stroke-width="5" fill="none" opacity="0.6"/></g>`;
