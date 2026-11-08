/**
 * 55. «Три раза не сдал теорию. Наверное, тупой» — стол с лампой и книгами (старый формат: белые человечки + гравюра, `engine3.ts`).
 * Тот же приём, что у роликов 53 и 54: узнаваемая боль в первой фразе, потом история про упорство.
 * История-гравюра: Джеймс Дайсон (Англия) примерно за пять лет и 5127 прототипов сделал пылесос без мешка;
 * в 1983 году выпустил G-Force (https://en.wikipedia.org/wiki/James_Dyson — «after five years and about 5,127 prototypes,
 * Dyson launched the "G-Force" cleaner in 1983»). Источники расходятся в датах окончания работы (1982–1984), поэтому
 * в ролике — «пять лет», «5127» и «1983».
 */
import { books, desk, floorLine, lamp, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, fig, ground, rng, sh, sky, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 200, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'chin'], hair: 'curly', face: 'sad' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'ponytail', face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${desk(400, 720, 1130, 1300)}
  ${books(480, 1130, 4)}
  ${lamp(650, 1130)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: мастерская, гора прототипов, витрина ────────────────────────────

const G = 1760;

/** Прототип пылесоса: корпус, конус циклона, шланг, колёса. Начало — низ корпуса по центру. */
const proto = (x: number, y: number, k = 1, rot = 0) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" stroke-width="${(5 / k).toFixed(1)}">
    ${wh('M-52,0 h104 v-52 h-104 Z')}
    ${wh('M-34,-52 v-64 h68 v64 Z')}
    <path d="M-34,-116 L0,-52 L34,-116" fill="none" stroke-width="3"/>
    ${wh('M-22,-116 v-26 h44 v26')}
    <path d="M52,-26 q74,-6 66,60" fill="none"/>
    ${wh('M-36,0 a15,15 0 1 0 0.1,0 Z', 'stroke-width="3"')}
    ${wh('M36,0 a15,15 0 1 0 0.1,0 Z', 'stroke-width="3"')}
  </g>`;

const sign = (x: number, n: string, hatch: string) => `
  <path d="M${x},${G} V1380" stroke-width="10"/>
  ${sh(`M${x - 150},1250 h300 v140 h-300 Z`, hatch)}<path d="M${x - 150},1250 h300 v140 h-300 Z" fill="none" stroke-width="6"/>
  ${wh(`M${x - 130},1266 h260 v108 h-260 Z`)}
  <text x="${x}" y="1346" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="82" fill="${C.ink}" stroke="none">${n}</text>`;

/** Верстак: столешница, ножки, полка. */
const bench = (x: number) => `
  ${sh(`M${x - 200},${G - 190} h400 v26 h-400 Z`, 'b30')}<path d="M${x - 200},${G - 190} h400 v26 h-400 Z" fill="none" stroke-width="6"/>
  <path d="M${x - 170},${G - 164} V${G} M${x + 170},${G - 164} V${G} M${x - 170},${G - 70} H${x + 170}" stroke-width="8"/>`;

/** Куча неудачных прототипов — пирамидой. */
const heap = (() => {
  const r = rng(11);
  const out: string[] = [];
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const n = 9 - row;
    for (let i = 0; i < n; i++) {
      const x = 1040 + (i - (n - 1) / 2) * 62 + (r() - 0.5) * 10;
      const y = G - 8 - row * 66 + (r() - 0.5) * 6;
      out.push(proto(x, y, 0.55, (r() - 0.5) * 36));
    }
  }
  return out.join('');
})();

const dyson = (x: number, o: Parameters<typeof fig>[0] extends infer T ? Partial<T> : never) =>
  fig({ x, y: 1556, dress: 'tunic', pat: 'a60', sleeve: 'a60', legs: 'a30', hair: 'short', ...(o as object) } as Parameters<typeof fig>[0]);

const tableau = `
  ${sky()}
  <rect x="1470" y="-400" width="1500" height="2800" fill="${C.paper}" stroke="none"/><rect x="1470" y="-400" width="1500" height="2800" fill="url(#sky)" stroke="none"/>
  ${cloud(160, 560, 400)}${cloud(980, 680, 340)}${cloud(1500, 520, 300)}
  ${ground(G, -400, 2900)}
  <!-- 1979: верстак -->
  ${sign(300, '1979', 'c60')}${bench(560)}
  ${proto(520, G - 190, 0.9, 0)}
  ${dyson(400, { lean: 8, nod: 12, arm: [40, 50], arm2: [30, 40], leg: [6, 4], leg2: [-6, 2], face: 'sad', hand: proto(0, 40, 0.42, 14) })}
  <!-- 5127: куча -->
  ${sign(840, '5127', 'c120')}
  ${heap}
  ${dyson(1380, { f: -1, lean: 10, nod: 16, arm: [20, 30], arm2: [10, 20], leg: [8, 4], leg2: [-10, 4], face: 'sad' })}
  <!-- 1983: готовый -->
  ${sign(1700, '1983', 'a0')}
  ${sh(`M1990,${G} V${G - 230} H2210 V${G} Z`, 'b30')}<path d="M1990,${G} V${G - 230} H2210 V${G}" fill="none" stroke-width="6"/>
  ${wh(`M1970,${G - 250} h260 v24 h-260 Z`)}<path d="M1970,${G - 250} h260 v24 h-260 Z" fill="none" stroke-width="5"/>
  <g class="st-a">
    ${Array.from({ length: 11 }, (_, i) => {
      const a = (-80 + i * 16) * (Math.PI / 180);
      return `<path d="M2100,${G - 420} L${(2100 + 280 * Math.sin(a)).toFixed(0)},${(G - 420 - 280 * Math.cos(a)).toFixed(0)}" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('')}
  </g>
  ${proto(2100, G - 250, 1.15, 0)}
  ${dyson(1850, { arm: [160, 20], arm2: [150, 30], nod: -14, leg: [6, 4], leg2: [-6, 2], face: 'shout' })}`;

const story = [
  { fx: 1000, fy: 1400, s: 0.62, label: 'Англия, 1979 год' },
  { fx: 430, fy: 1480, s: 1.9, label: 'Дайсон хочет пылесос без мешка' },
  { fx: 1040, fy: 1620, s: 1.9, label: 'Прототип за прототипом' },
  { fx: 1100, fy: 1560, s: 1.35, label: '5127 прототипов за 5 лет' },
  { fx: 1380, fy: 1500, s: 1.9, label: 'Но не сдался' },
  { fx: 1960, fy: 1470, s: 1.5, label: '1983: пылесос готов' },
];
const after = [
  { fx: 1000, fy: 1400, s: 0.62 },
  { fx: 2100, fy: 1480, s: 1.8 },
  { fx: 1850, fy: 1490, s: 2.0 },
  { fx: 1000, fy: 1400, s: 0.62, ds: 1.1 },
];

// ─── Инфографика: 5126 неудач и один пылесос ──────────────────────────────────

const COLS = 10;
const ROWS = 8;
const cells = Array.from({ length: COLS * ROWS }, (_, i) => i);
const info = {
  html: `
    ${itext('i-h', 330, 40, 'ДЖЕЙМС ДАЙСОН')}
    ${isvg(cells.map((i) => {
      const x = 180 + (i % COLS) * 80;
      const y = 560 + Math.floor(i / COLS) * 80;
      const win = i === cells.length - 1;
      return `<g class="gx${win ? ' gwin' : ''}"><circle cx="${x}" cy="${y}" r="29" fill="${win ? C.accent : 'none'}" stroke="${win ? C.accent : '#fff'}" stroke-width="5"/>
        <text x="${x}" y="${y + 13}" text-anchor="middle" font-size="36" font-weight="900" fill="${win ? '#000' : '#fff'}">${win ? '✓' : '×'}</text></g>`;
    }).join(''))}
    ${itext('i-n', 1260, 150, '5127', C.accent, 900, 'white-space:nowrap')}
    ${itext('i-s', 1450, 44, 'ПРОТОТИПОВ ЗА 5 ЛЕТ.<br>РАБОТАЛ ТОЛЬКО ПОСЛЕДНИЙ')}
    ${itext('i-y', 1640, 30, 'В ИГРЕ ОШИБКИ ВОЗВРАЩАЮТСЯ ЧЕРЕЗ 1, 3 И 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.set('.gx', { opacity: 0 }, 0);`,
      `tl.to('.gx', { opacity: 1, duration: 0.02, stagger: 0.005 }, ${(t[0] + 0.05).toFixed(3)});`,
      pop('.gwin', t[1], 0.22),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v55: Video3 = {
  id: '55-dyson',
  title: 'Реклама: Дайсон и 5127 прототипов',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Три раза не сдал теорию.<br>Наверное, не моё»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Пылесос Дайсона знаешь?»', cams: ['b', 'ab'], b: 'cool' },
    { text: '«Ну знаю. И что?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Он сделал<br>5127 прототипов»', cams: ['b', [540, 1180, 2.2]], b: 'smile' },
    { text: '«Пять тысяч?!»', cams: ['a', 'wide'], a: 'shock' },
    { text: '«И почти все<br>не работали»', cams: ['ab', 'b'], b: 'cool' },
    { text: '«И он не бросил?»', cams: ['a', [A.head.x, A.head.y + 40, 2.5]], a: 'doubt' },
    { text: '«Делал следующий.<br>Пять лет»', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  info,
  cta: { lines: ['Не бросай.', 'Разбирай', 'ошибки'], accent: 2 },
  bioGlyph: '<circle cy="-6" r="22"/><path d="M-22,-6 L-8,40 H8 L22,-6" fill="none"/>',
};
