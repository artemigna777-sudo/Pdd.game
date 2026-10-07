/**
 * Простые рисунки для рекламных роликов: человечки с лицами, мебель и значки. Всё — линии одного цвета
 * (цвет и толщину задаёт тема ролика), без деталей: «нарисовано просто».
 */

/** Цвета, которые нужны рисункам: линия, заливка (цвет фона), акцент; тёмная или светлая тема. */
export interface Pen {
  ink: string;
  fill: string;
  accent: string;
  dark: boolean;
  /** Цвет линий лица, если голова залита цветом линий (силуэты). */
  faceInk?: string;
}

export type Face = 'happy' | 'neutral' | 'grin' | 'shock' | 'doubt' | 'cool' | 'calm' | 'relaxed' | 'sad' | 'tired' | 'angry' | 'think' | 'smile' | 'sleepy';
export const FACE_KEYS: Face[] = ['happy', 'neutral', 'grin', 'shock', 'doubt', 'cool', 'calm', 'relaxed', 'sad', 'tired', 'angry', 'think', 'smile', 'sleepy'];

/** Глаз: на тёмном фоне — белый с чёрным зрачком, на светлом — обведённый, с тёмным зрачком. */
function eye(p: Pen, x: number, y: number, r = 10, px = 0, py = 0, pupil = 0.5): string {
  const white = p.dark ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="none"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.fill}" stroke="${p.ink}" stroke-width="3"/>`;
  return `${white}<circle cx="${x + px}" cy="${y + py}" r="${r * pupil}" fill="${p.dark ? '#000' : p.ink}" stroke="none"/>`;
}

/** Лица (центр головы в 0,0, радиус 52); смотрят вправо, если f = 1. */
export function faces(p: Pen, f: 1 | -1): Record<Face, string> {
  const e = (x: number, y: number, r?: number, px = 0, py = 0, pu?: number) => eye(p, x * f, y, r, px * f, py, pu);
  const m = (d: string) => `<path d="${d}" transform="scale(${f} 1)"/>`;
  const solid = p.dark ? '#fff' : p.ink;
  return {
    happy: m('M-26,-6 q9,-12 18,0 M8,-6 q9,-12 18,0 M-15,14 q15,14 30,0'),
    neutral: `${e(-17, -6, 10, 3)}${e(17, -6, 10, 3)}${m('M-8,20 h16')}`,
    grin: `${e(-15, -8, 10, 4, -2)}${e(17, -8, 10, 4, -2)}<path d="M-17,12 q17,24 34,0 z" fill="${solid}" transform="scale(${f} 1)"/>`,
    shock: `${e(-18, -9, 13, 0, 0, 0.36)}${e(18, -9, 13, 0, 0, 0.36)}<circle cx="0" cy="24" r="7"/>${m('M-30,-31 l18,-7 M12,-38 l18,7')}`,
    doubt: `${e(-17, -5, 10, 4)}${e(17, -5, 10, 4)}${m('M-28,-24 l20,-4 M8,-30 l20,6 M-11,22 l22,-6')}`,
    cool: `<path d="M-36,-16 h30 q0,20 -15,20 q-15,0 -15,-20 z M6,-16 h30 q0,20 -15,20 q-15,0 -15,-20 z" fill="${p.dark ? '#111' : p.ink}" stroke-width="3.5" transform="scale(${f} 1)"/>${m('M-6,-14 h12 M-7,22 q13,5 22,-7')}`,
    calm: `${e(-17, -4, 10, 2, 2)}${e(17, -4, 10, 2, 2)}${m('M-29,-8 h24 M5,-8 h24 M-9,19 q10,6 19,-2')}`,
    relaxed: `${e(-17, -5, 10, 4, 3)}${e(17, -5, 10, 4, 3)}${m('M-10,19 q10,7 20,0')}`,
    sad: `${e(-17, -4, 10, 0, 4)}${e(17, -4, 10, 0, 4)}${m('M-28,-20 l18,-8 M10,-28 l18,8 M-12,26 q12,-11 24,0')}`,
    tired: `${e(-17, -2, 10, 0, 3)}${e(17, -2, 10, 0, 3)}${m('M-28,-6 h22 M6,-6 h22 M-26,12 q8,4 14,0 M12,12 q8,4 14,0 M-9,26 h18')}`,
    angry: `${e(-17, -4, 10, 2)}${e(17, -4, 10, 2)}${m('M-30,-26 l22,10 M8,-16 l22,-10 M-12,26 q12,-8 24,0')}`,
    think: `${e(-17, -6, 10, 4, -5)}${e(17, -6, 10, 4, -5)}${m('M-6,22 q8,-4 14,2 M14,-30 l14,-4')}`,
    smile: `${e(-17, -6, 10, 3)}${e(17, -6, 10, 3)}${m('M-15,13 q15,15 30,0')}`,
    sleepy: m('M-27,-4 h19 M8,-4 h19 M-6,22 q6,4 12,0'),
  };
}

export type Hair = 'none' | 'bun' | 'ponytail' | 'spiky' | 'cap' | 'scarf' | 'long' | 'curly' | 'helmet' | 'bald';
export type Arm = 'down' | 'hip' | 'point' | 'up' | 'phone' | 'front' | 'lap' | 'table' | 'wheel' | 'wave' | 'chin';
export type Hold = 'none' | 'phone' | 'gamepad' | 'book' | 'cup' | 'paper' | 'cards';

export interface PersonOpts {
  id: string;
  x: number;
  floor: number;
  pose: 'stand' | 'sit' | 'beanbag' | 'lie' | 'drive';
  f?: 1 | -1;
  arms?: [Arm, Arm];
  hair?: Hair;
  glasses?: boolean;
  mustache?: boolean;
  beard?: boolean;
  seat?: number;
  table?: number;
  hold?: Hold;
  /** Выражение лица в первом кадре. */
  face?: Face;
}

/** Предмет в руке (центр — в кисти). */
function held(p: Pen, kind: Hold, x: number, y: number, f: number): string {
  switch (kind) {
    case 'phone':
      return `<g transform="translate(${x} ${y}) rotate(${12 * f})"><rect x="-16" y="-30" width="32" height="60" rx="7" fill="${p.fill}"/><rect x="-10" y="-22" width="20" height="38" rx="3" fill="${p.accent}" stroke="none" opacity="0.9"/></g>`;
    case 'gamepad':
      return `<g transform="translate(${x} ${y})"><path d="M-34,-14 H34 Q46,-14 46,4 L44,18 Q42,30 30,26 L20,14 H-20 L-30,26 Q-42,30 -44,18 L-46,4 Q-46,-14 -34,-14 Z" fill="${p.fill}"/><path d="M-30,0 h14 M-23,-7 v14" stroke-width="3"/><circle cx="20" cy="-3" r="3" fill="${p.ink}"/><circle cx="29" cy="4" r="3" fill="${p.ink}"/></g>`;
    case 'book':
      return `<g transform="translate(${x} ${y})"><path d="M-40,-20 Q-20,-30 0,-20 Q20,-30 40,-20 V22 Q20,12 0,22 Q-20,12 -40,22 Z M0,-20 V22" fill="${p.fill}"/></g>`;
    case 'cup':
      return `<g transform="translate(${x} ${y})"><path d="M-14,-18 h28 v26 q0,10 -14,10 q-14,0 -14,-10 z M14,-10 q14,0 14,10 q0,10 -14,8" fill="${p.fill}"/></g>`;
    case 'paper':
      return `<g transform="translate(${x} ${y}) rotate(${-8 * f})"><rect x="-26" y="-34" width="52" height="68" fill="${p.fill}"/><path d="M-16,-20 h32 M-16,-8 h32 M-16,4 h26 M-16,16 h30" stroke-width="2.5"/></g>`;
    case 'cards':
      return `<g transform="translate(${x} ${y})"><rect x="-22" y="-30" width="44" height="60" rx="5" fill="${p.fill}" transform="rotate(-10)"/><rect x="-22" y="-30" width="44" height="60" rx="5" fill="${p.fill}" transform="rotate(8)"/><text x="0" y="8" text-anchor="middle" font-size="26" font-weight="800" fill="${p.accent}" stroke="none" transform="rotate(8)">?</text></g>`;
    default:
      return '';
  }
}

function hair(p: Pen, kind: Hair, f: number): string {
  const s = (d: string, fill = 'none') => `<path d="${d}" fill="${fill}" transform="scale(${f} 1)"/>`;
  switch (kind) {
    case 'bun':
      return `<circle cx="${-26 * f}" cy="-58" r="20" fill="${p.fill}"/>${s('M-48,-22 Q-40,-56 0,-56 Q36,-54 46,-26')}`;
    case 'ponytail':
      return s('M-46,-26 Q-36,-58 2,-56 Q38,-54 48,-20 M-44,-30 Q-80,-20 -76,30 Q-74,52 -60,60');
    case 'spiky':
      return s('M-30,-42 l-6,-22 l18,12 l6,-24 l14,22 l14,-20 l2,26 l20,-10 l-8,22');
    case 'cap':
      return s('M-50,-14 Q-48,-62 0,-64 Q48,-62 50,-14 Z M44,-18 L86,-10 Q80,-2 46,-6', p.fill) + s('M-30,-40 h56', 'none');
    case 'scarf':
      return s('M-56,8 Q-60,-66 0,-66 Q60,-66 56,8 Q40,-36 0,-40 Q-40,-36 -56,8 Z M-10,48 l-16,22 M10,48 l14,22', p.fill);
    case 'long':
      return s('M-50,-10 Q-52,-62 0,-62 Q52,-62 50,-10 M-50,-10 Q-58,50 -42,74 M50,-10 Q58,50 42,74 M-40,-46 Q0,-30 40,-46');
    case 'curly':
      return s('M-44,-30 q-6,-18 12,-24 q4,-20 24,-14 q12,-16 30,-4 q20,-6 22,14 q14,8 6,24');
    case 'helmet':
      return s('M-54,-10 Q-50,-64 0,-66 Q50,-64 54,-10 Z M0,-66 V-98 M-8,-98 h16', p.fill);
    default:
      return '';
  }
}

/** Человечек. Возвращает рисунок и центр головы (для камеры и лиц). */
export function person(p: Pen, o: PersonOpts): { svg: string; head: { x: number; y: number } } {
  const f = o.f ?? 1;
  const [armA, armB] = o.arms ?? ['down', 'down'];
  const seat = o.seat ?? 110;
  let hip: [number, number];
  let neck: [number, number];
  let legs = '';
  let body = '';
  if (o.pose === 'stand') {
    hip = [o.x, o.floor - 150];
    neck = [o.x, o.floor - 290];
    legs = `<path d="M${o.x - 24},${o.floor} L${hip[0]},${hip[1]} L${o.x + 24},${o.floor}"/>`;
  } else if (o.pose === 'beanbag') {
    hip = [o.x, o.floor - 92];
    neck = [o.x + 16 * f, o.floor - 196];
    legs = `<path d="M${hip[0]},${hip[1]} L${o.x + 96 * f},${o.floor - 132} L${o.x + 158 * f},${o.floor}"/><path d="M${hip[0] - 6 * f},${hip[1] + 8} L${o.x + 84 * f},${o.floor - 112} L${o.x + 124 * f},${o.floor}"/>`;
  } else if (o.pose === 'lie') {
    // Лёжа на подушке: голова слева, тело под одеялом.
    const hx = o.x;
    const hy = o.floor;
    const head = { x: hx, y: hy };
    const blanket = `<path d="M${hx + 40},${hy + 40} Q${hx + 170},${hy - 10} ${hx + 330},${hy + 34} L${hx + 330},${hy + 70} L${hx + 40},${hy + 70} Z" fill="${p.fill}"/>`;
    const arm = armA === 'phone' ? `<path d="M${hx + 60},${hy + 40} L${hx + 92},${hy - 6} L${hx + 70},${hy - 52}"/>${held(p, 'phone', hx + 66, hy - 76, f)}` : '';
    return {
      svg: `<g>${blanket}${arm}<circle cx="${hx}" cy="${hy}" r="52" fill="${p.fill}"/><g transform="translate(${hx} ${hy})">${hair(p, o.hair ?? 'none', f)}</g>${faceGroups(p, o, head, f)}</g>`,
      head,
    };
  } else {
    // Сидя (на стуле или за рулём).
    hip = [o.x, o.floor - seat];
    neck = [o.x + 6 * f, hip[1] - 138];
    const knee: [number, number] = [o.x + 86 * f, hip[1] + 2];
    legs = `<path d="M${hip[0]},${hip[1]} L${knee[0]},${knee[1]} L${knee[0]},${o.floor} L${knee[0] + 22 * f},${o.floor}"/><path d="M${hip[0] + 8 * f},${hip[1] - 4} L${knee[0] + 14 * f},${knee[1] - 6} L${knee[0] + 16 * f},${o.floor} L${knee[0] + 38 * f},${o.floor}"/>`;
  }
  body = `<path d="M${hip[0]},${hip[1]} L${neck[0]},${neck[1]}"/>`;
  const head = { x: neck[0] + 2 * f, y: neck[1] - 52 };
  const sh: [number, number] = [neck[0], neck[1] + 28];
  const tableY = o.table ?? sh[1] + 70;
  const arm = (kind: Arm, back: boolean): string => {
    const k = back ? -0.6 : 1;
    const [sx, sy] = sh;
    const F = f;
    switch (kind) {
      case 'hip':
        return `<path d="M${sx},${sy} L${sx + 46 * F * k},${sy + 54} L${sx + 12 * F * k},${sy + 104}"/>`;
      case 'point':
        return `<path d="M${sx},${sy} L${sx + 56 * F},${sy + 18} L${sx + 110 * F},${sy - 22}"/>`;
      case 'up':
        return `<path d="M${sx},${sy} L${sx + 42 * F * k},${sy - 30} L${sx + 58 * F * k},${sy - 96}"/>`;
      case 'wave':
        return `<path d="M${sx},${sy} L${sx + 60 * F},${sy - 6} L${sx + 74 * F},${sy - 70}"/>`;
      case 'phone':
        return `<path d="M${sx},${sy} L${sx + 42 * F},${sy + 58} L${sx + 56 * F},${sy - 8}"/>${held(p, o.hold ?? 'phone', sx + 66 * F, sy - 34, F)}`;
      case 'front':
        return `<path d="M${sx},${sy} L${sx + 36 * F},${sy + 62} L${sx + 84 * F},${sy + 46}"/>${back ? '' : held(p, o.hold ?? 'none', sx + 100 * F, sy + 40, F)}`;
      case 'lap':
        return `<path d="M${sx},${sy} L${sx + 30 * F},${sy + 66} L${sx + 74 * F},${sy + 98}"/>`;
      case 'table':
        return `<path d="M${sx},${sy} L${sx + 40 * F},${tableY - 30} L${sx + 104 * F},${tableY - 6}"/>${back ? '' : held(p, o.hold ?? 'none', sx + 118 * F, tableY - 24, F)}`;
      case 'wheel':
        return `<path d="M${sx},${sy} L${sx + 48 * F},${sy + 50} L${sx + 92 * F},${sy + 14}"/>`;
      case 'chin':
        return `<path d="M${sx},${sy} L${sx + 34 * F},${sy + 50} L${sx + 30 * F},${sy - 30}"/>`;
      default:
        return `<path d="M${sx},${sy} L${sx + 12 * F * k},${sy + 70} L${sx + 18 * F * k},${sy + 134}"/>`;
    }
  };
  const svg = `<g>${arm(armB, true)}${legs}${body}${arm(armA, false)}
    <circle cx="${head.x}" cy="${head.y}" r="52" fill="${p.fill}"/>
    <g transform="translate(${head.x} ${head.y})">${hair(p, o.hair ?? 'none', f)}${o.beard ? `<path d="M-46,10 Q-40,64 0,70 Q40,64 46,10 Q20,40 0,38 Q-20,40 -46,10 Z" fill="${p.ink}" opacity="0.85"/>` : ''}</g>
    ${faceGroups(p, o, head, f)}
    ${o.glasses ? `<g transform="translate(${head.x} ${head.y})" stroke-width="3"><circle cx="-17" cy="-6" r="15" fill="none"/><circle cx="17" cy="-6" r="15" fill="none"/><path d="M-2,-6 h4"/></g>` : ''}
    ${o.mustache ? `<path d="M${head.x - 22},${head.y + 14} q11,-10 22,-2 q11,-8 22,2 q-11,8 -22,2 q-11,6 -22,-2 z" fill="${p.ink}"/>` : ''}
  </g>`;
  return { svg, head };
}

function faceGroups(p: Pen, o: PersonOpts, head: { x: number; y: number }, f: 1 | -1): string {
  const set = faces(p, f);
  return FACE_KEYS.map(
    (k) => `<g id="face${o.id}_${k}" class="face${o.id}" transform="translate(${head.x} ${head.y})" ${p.faceInk ? `stroke="${p.faceInk}"` : ''} stroke-width="4" opacity="${k === (o.face ?? 'neutral') ? 1 : 0}">${set[k]}</g>`,
  ).join('');
}

// ─── Мебель и места ────────────────────────────────────────────────────────────

export const floorLine = (y: number, x1 = -600, x2 = 1700) => `<path d="M${x1},${y} H${x2}"/>`;
export const desk = (x1: number, x2: number, top: number, floor: number) => `<path d="M${x1},${top} H${x2} M${x1 + 22},${top} V${floor} M${x2 - 22},${top} V${floor}"/>`;
export const chair = (x: number, floor: number, f: 1 | -1, seat = 110) =>
  `<path d="M${x - 50 * f},${floor - seat} H${x + 56 * f} M${x - 44 * f},${floor - seat} L${x - 52 * f},${floor - seat - 150} M${x - 40 * f},${floor - seat} V${floor} M${x + 50 * f},${floor - seat} V${floor}"/>`;
export const couch = (x1: number, x2: number, floor: number, fill: string) =>
  `<path d="M${x1},${floor - 20} V${floor - 150} Q${x1},${floor - 176} ${x1 + 30},${floor - 176} H${x2 - 30} Q${x2},${floor - 176} ${x2},${floor - 150} V${floor - 20} Z" fill="${fill}"/><path d="M${x1 + 26},${floor - 100} H${x2 - 26} M${x1},${floor - 20} V${floor} M${x2},${floor - 20} V${floor}"/><path d="M${x1 - 20},${floor - 20} V${floor - 110} Q${x1 - 20},${floor - 126} ${x1},${floor - 126} M${x2 + 20},${floor - 20} V${floor - 110} Q${x2 + 20},${floor - 126} ${x2},${floor - 126} M${x1 - 20},${floor - 20} H${x2 + 20}"/>`;
export const beanbag = (x: number, floor: number, fill: string) =>
  `<path d="M${x - 112},${floor - 2} C${x - 138},${floor - 60} ${x - 126},${floor - 132} ${x - 58},${floor - 152} C${x + 10},${floor - 172} ${x + 74},${floor - 142} ${x + 92},${floor - 90} C${x + 106},${floor - 50} ${x + 103},${floor - 14} ${x + 88},${floor - 2} Z" fill="${fill}"/>`;
export const bed = (x1: number, x2: number, top: number, floor: number, fill: string) =>
  `<path d="M${x1},${floor} V${top - 90} M${x1},${top} H${x2} V${floor} M${x1},${top + 40} H${x2}"/><path d="M${x1 + 10},${top - 6} q50,-46 110,-10 q-50,22 -110,10 z" fill="${fill}"/>`;
export const windowFrame = (x: number, y: number, w: number, h: number, inner = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>${inner}<path d="M${x + w / 2},${y} V${y + h} M${x},${y + h / 2} H${x + w}"/>`;
export const moon = (x: number, y: number, r: number, fill: string) => `<path d="M${x},${y - r} A${r},${r} 0 1 0 ${x},${y + r} A${r * 0.75},${r} 0 1 1 ${x},${y - r} Z" fill="${fill}"/>`;
export const stars = (pts: [number, number][]) => pts.map(([x, y]) => `<path d="M${x - 8},${y} H${x + 8} M${x},${y - 8} V${y + 8}" stroke-width="2.5"/>`).join('');
export const tree = (x: number, floor: number, fill: string) =>
  `<path d="M${x},${floor} V${floor - 150}"/><path d="M${x - 70},${floor - 170} C${x - 100},${floor - 240} ${x - 40},${floor - 300} ${x},${floor - 290} C${x + 50},${floor - 310} ${x + 100},${floor - 250} ${x + 74},${floor - 180} C${x + 60},${floor - 140} ${x - 50},${floor - 130} ${x - 70},${floor - 170} Z" fill="${fill}"/>`;
export const bench = (x1: number, x2: number, floor: number) => `<path d="M${x1},${floor - 92} H${x2} M${x1 + 10},${floor - 92} V${floor} M${x2 - 10},${floor - 92} V${floor} M${x1},${floor - 120} H${x2} M${x1},${floor - 150} H${x2} M${x1 + 30},${floor - 150} V${floor - 92} M${x2 - 30},${floor - 150} V${floor - 92}"/>`;
export const streetLamp = (x: number, floor: number, accent: string) =>
  `<path d="M${x},${floor} V${floor - 420} Q${x},${floor - 450} ${x + 40},${floor - 450} H${x + 70}"/><path d="M${x + 50},${floor - 452} h44 l-8,20 h-28 z" fill="${accent}" stroke-width="3"/>`;
export const busStop = (x1: number, x2: number, floor: number, fill: string) =>
  `<path d="M${x1 - 20},${floor - 330} H${x2 + 20} L${x2 + 10},${floor - 300} H${x1 - 10} Z" fill="${fill}"/><path d="M${x1},${floor - 300} V${floor} M${x2},${floor - 300} V${floor} M${x1 + 20},${floor - 96} H${x2 - 20} M${x1 + 30},${floor - 96} V${floor} M${x2 - 30},${floor - 96} V${floor}"/><path d="M${x2 + 70},${floor} V${floor - 380}"/><circle cx="${x2 + 70}" cy="${floor - 410}" r="34" fill="${fill}"/><text x="${x2 + 70}" y="${floor - 398}" text-anchor="middle" font-size="36" font-weight="800" stroke="none" fill="currentColor">А</text>`;
/** Машина сбоку (нос вправо), x — середина, floor — земля. */
export const carSide = (x: number, floor: number, fill: string, taxi = false, accent = '') =>
  `<path d="M${x - 300},${floor - 60} V${floor - 130} Q${x - 300},${floor - 150} ${x - 270},${floor - 152} L${x - 190},${floor - 160} L${x - 120},${floor - 250} Q${x - 110},${floor - 262} ${x - 90},${floor - 262} H${x + 90} Q${x + 112},${floor - 262} ${x + 124},${floor - 248} L${x + 190},${floor - 164} L${x + 280},${floor - 150} Q${x + 310},${floor - 144} ${x + 310},${floor - 116} V${floor - 60} Z" fill="${fill}"/>
   <path d="M${x - 100},${floor - 160} L${x - 88},${floor - 240} H${x - 6} V${floor - 160} Z M${x + 12},${floor - 160} V${floor - 240} H${x + 96} L${x + 160},${floor - 160} Z" stroke-width="3"/>
   <circle cx="${x - 190}" cy="${floor - 58}" r="52" fill="${fill}"/><circle cx="${x - 190}" cy="${floor - 58}" r="18"/><circle cx="${x + 190}" cy="${floor - 58}" r="52" fill="${fill}"/><circle cx="${x + 190}" cy="${floor - 58}" r="18"/>
   ${taxi ? `<rect x="${x - 50}" y="${floor - 300}" width="100" height="38" rx="8" fill="${accent}" stroke-width="3"/><text x="${x}" y="${floor - 272}" text-anchor="middle" font-size="24" font-weight="800" stroke="none" fill="#111">TAXI</text>` : ''}`;
export const table = (x1: number, x2: number, top: number, floor: number) => `<path d="M${x1 - 20},${top} H${x2 + 20} M${x1},${top} L${x1 + 20},${floor} M${x2},${top} L${x2 - 20},${floor}"/>`;
export const lamp = (x: number, top: number) => `<path d="M${x},${top} v-90 l40,-40 M${x + 22},${top - 150} l46,22 l-22,30 z"/><path d="M${x - 24},${top} h48"/>`;
export const books = (x: number, top: number, n = 3) => Array.from({ length: n }, (_, i) => `<rect x="${x - 50 + i * 4}" y="${top - 14 * (i + 1)}" width="${100 - i * 8}" height="14"/>`).join('');
export const clockFace = (x: number, y: number, r: number, h: number, m: number, fill: string) => {
  const a = (deg: number, len: number) => `${x + Math.sin((deg * Math.PI) / 180) * len},${y - Math.cos((deg * Math.PI) / 180) * len}`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/><path d="M${x},${y} L${a((h % 12) * 30 + m / 2, r * 0.5)} M${x},${y} L${a(m * 6, r * 0.78)}"/>${[0, 90, 180, 270].map((d) => `<path d="M${a(d, r * 0.82)} L${a(d, r * 0.95)}" stroke-width="3"/>`).join('')}`;
};

// ─── Значки (центр в 0,0, размер около 80) ─────────────────────────────────────

export const ICON = {
  gamepad: `<path d="M-30,-14 H30 Q42,-14 42,2 L44,18 Q44,30 32,28 L18,14 H-18 L-32,28 Q-44,30 -44,18 L-42,2 Q-42,-14 -30,-14 Z"/><path d="M-26,0 h14 M-19,-7 v14"/><circle cx="18" cy="-3" r="3"/><circle cx="27" cy="5" r="3"/>`,
  wheel: `<circle r="36"/><circle r="10"/><path d="M-10,2 L-34,10 M10,2 L34,10 M0,10 V36"/>`,
  book: `<path d="M-34,-20 Q-17,-28 0,-20 Q17,-28 34,-20 V22 Q17,14 0,22 Q-17,14 -34,22 Z M0,-20 V22"/>`,
  calendar: `<rect x="-32" y="-26" width="64" height="58" rx="6"/><path d="M-32,-8 H32 M-16,-34 v14 M16,-34 v14"/><path d="M-18,8 h8 M-4,8 h8 M10,8 h8 M-18,20 h8 M-4,20 h8"/>`,
  card: `<rect x="-26" y="-34" width="52" height="68" rx="6"/><path d="M-14,-14 h28 M-14,0 h28 M-14,14 h18"/>`,
  brain: `<path d="M-4,-30 C-20,-36 -38,-24 -34,-8 C-46,0 -40,20 -26,22 C-24,34 -6,36 -4,26 Z M4,-30 C20,-36 38,-24 34,-8 C46,0 40,20 26,22 C24,34 6,36 4,26 Z"/><path d="M-20,-14 q8,6 2,14 M20,-14 q-8,6 -2,14"/>`,
  clock: `<circle r="34"/><path d="M0,0 V-22 M0,0 L16,10"/>`,
  moon: `<path d="M6,-32 A32,32 0 1 0 30,14 A26,26 0 1 1 6,-32 Z"/>`,
  sun: `<circle r="16"/><path d="M0,-36 v-10 M0,36 v10 M-36,0 h-10 M36,0 h10 M-26,-26 l-7,-7 M26,26 l7,7 M-26,26 l-7,7 M26,-26 l7,-7"/>`,
  check: `<path d="M-24,0 L-8,16 L26,-20"/>`,
  cross: `<path d="M-20,-20 L20,20 M20,-20 L-20,20"/>`,
  eye: `<path d="M-40,0 Q0,-34 40,0 Q0,34 -40,0 Z"/><circle r="12"/>`,
  question: `<circle r="34"/><path d="M-11,-10 q0,-14 11,-14 q12,0 12,12 q0,9 -11,13 v8"/><circle cx="1" cy="20" r="2.5"/>`,
  pin: `<path d="M0,34 C-22,6 -26,-6 -26,-12 A26,26 0 1 1 26,-12 C26,-6 22,6 0,34 Z"/><circle cy="-12" r="9"/>`,
  map: `<path d="M-36,-26 L-12,-34 L12,-26 L36,-34 V26 L12,34 L-12,26 L-36,34 Z M-12,-34 V26 M12,-26 V34"/>`,
  boxes: `<rect x="-40" y="-20" width="24" height="40"/><rect x="-12" y="-20" width="24" height="40"/><rect x="16" y="-20" width="24" height="40"/>`,
  car: `<rect x="-22" y="-36" width="44" height="72" rx="12"/><path d="M-14,-18 h28 M-14,20 h28"/>`,
  bed: `<path d="M-40,20 V-20 M-40,6 H40 V20 M-40,6 V-6 H10 Q24,-6 24,6"/><circle cx="-24" cy="-6" r="8"/>`,
  trophy: `<path d="M-20,-30 H20 V-6 Q20,16 0,18 Q-20,16 -20,-6 Z M-20,-22 Q-36,-22 -32,-4 Q-28,6 -18,4 M20,-22 Q36,-22 32,-4 Q28,6 18,4 M0,18 V28 M-14,34 H14"/>`,
  plane: `<path d="M-40,4 L30,-4 Q44,-4 44,0 Q44,4 30,4 Z M-6,0 L-20,-26 H-8 L12,0 M-6,2 L-20,28 H-8 L12,2 M-34,2 L-42,-14 H-34 L-26,2"/>`,
  book2: `<rect x="-26" y="-34" width="52" height="68" rx="4"/><path d="M-18,-34 V34"/>`,
  zzz: `<path d="M-24,-20 h16 l-16,16 h16 M0,-34 h12 l-12,12 h12 M16,-6 h20 l-20,20 h20"/>`,
  flag: `<path d="M-20,34 V-34 M-20,-30 H24 L14,-16 L24,-2 H-20"/>`,
  steps: `<path d="M-40,30 H-20 V10 H0 V-10 H20 V-30 H40"/>`,
};

/** Значок в рамке-уголках для «Ссылки в био». */
export const bracketIcon = (glyph: string, ink: string, accent: string) => `<svg viewBox="-100 -100 200 200" width="200" height="200">
  <path d="M-90,-48 V-90 H-48 M48,-90 H90 V-48 M90,48 V90 H48 M-48,90 H-90 V48" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
  <g fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="scale(1.15)">${glyph}</g>
</svg>`;
