/**
 * 14. «Как вы так быстро ходите?» — нуар, шахматный столик в парке ночью.
 * История: США, 1973 — мастер запоминает настоящую позицию почти целиком, а случайную — не лучше новичка.
 */
import { ICON, floorLine, person, streetLamp } from '../draw.ts';
import { chessTable, stool } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.noir;
const h = th.hist;
const A = person(th, { id: 'A', x: 330, floor: 1300, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'spiky', table: 1110, face: 'doubt' });
const B = person(th, { id: 'B', x: 760, floor: 1300, pose: 'sit', f: -1, arms: ['table', 'chin'], beard: true, glasses: true, table: 1110, face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${streetLamp(110, 1300, th.ink)}
  <path d="M110,860 L-40,1300 M110,860 L260,1300" stroke-width="2" opacity="0.25"/>
  ${stool(330, 1300, th.fill)}${stool(760, 1300, th.fill)}
  ${chessTable(545, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// ─── История: США, 1973 ────────────────────────────────────────────────────────

/** Доска сверху: фигуры — кружки с буквой. */
const board = (x: number, y: number, size: number, pieces: [number, number, string][], dim = false) => {
  const c = size / 8;
  const squares = Array.from({ length: 64 }, (_, i) => ((i + Math.floor(i / 8)) % 2 ? `<rect x="${x + (i % 8) * c}" y="${y + Math.floor(i / 8) * c}" width="${c}" height="${c}" fill="${h.ink}" stroke="none" opacity="0.18"/>` : '')).join('');
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${h.fill}"/>${squares}${pieces
    .map(([col, row, p]) => `<g opacity="${dim ? 0.25 : 1}"><circle cx="${x + (col + 0.5) * c}" cy="${y + (row + 0.5) * c}" r="${c * 0.36}" fill="${h.fill}"/>${text(x + (col + 0.5) * c, y + (row + 0.5) * c + c * 0.14, c * 0.4, h.ink, p)}</g>`)
    .join('')}`;
};
const REAL: [number, number, string][] = [
  [0, 7, 'Л'], [2, 7, 'С'], [4, 7, 'Ф'], [6, 7, 'Кр'], [5, 6, 'п'], [6, 6, 'п'], [7, 6, 'п'], [2, 5, 'К'], [3, 4, 'п'], [4, 4, 'п'],
  [0, 0, 'Л'], [4, 0, 'Кр'], [3, 0, 'Ф'], [5, 1, 'п'], [6, 1, 'п'], [7, 1, 'п'], [2, 2, 'К'], [3, 3, 'п'], [5, 2, 'С'], [1, 1, 'п'],
];
const RANDOM: [number, number, string][] = REAL.map(([c, r, p], i) => [(c * 3 + i * 5) % 8, (r * 5 + i * 3) % 8, p]);

const clock = `
  <rect x="220" y="1020" width="640" height="360" rx="30" fill="${h.fill}"/>
  <circle cx="390" cy="1200" r="120" fill="${h.fill}"/><circle cx="690" cy="1200" r="120" fill="${h.fill}"/>
  <path d="M390,1200 V1110 M690,1200 L750,1150 M330,1020 v-40 h60 M690,1020 v-40" stroke-width="6"/>
  <path d="M120,1380 H960"/>`;

const glance = `
  ${board(260, 840, 560, REAL)}
  <circle cx="860" cy="790" r="70" fill="${h.fill}"/><path d="M860,790 V740 M860,790 l34,20" stroke-width="6"/>
  ${text(860, 900, 40, h.ink, '5 сек')}`;

const bubble = (x: number, y: number, inner: string) => `<path d="M${x - 230},${y - 240} H${x + 230} V${y + 200} H${x + 40} L${x - 20},${y + 270} L${x - 10},${y + 200} H${x - 230} Z" fill="${h.fill}"/>${inner}`;
const master = `
  <path d="M40,1560 H1040"/>
  ${still(h, { x: 300, floor: 1560, pose: 'stand', f: 1, arms: ['chin', 'down'], beard: true, glasses: true, face: 'smile' })}
  ${bubble(680, 900, board(500, 700, 360, REAL))}`;
const novice = `
  <path d="M40,1560 H1040"/>
  ${still(h, { x: 300, floor: 1560, pose: 'stand', f: 1, arms: ['chin', 'down'], hair: 'spiky', face: 'doubt' })}
  ${bubble(680, 900, board(500, 700, 360, REAL.filter((_, i) => i % 3 === 0)))}`;

const random = board(260, 840, 560, RANDOM);
const both = `
  <path d="M40,1560 H1040"/>
  ${still(h, { x: 230, floor: 1560, pose: 'stand', f: 1, arms: ['chin', 'down'], beard: true, glasses: true, face: 'doubt' })}
  ${still(h, { x: 850, floor: 1560, pose: 'stand', f: -1, arms: ['chin', 'down'], hair: 'spiky', face: 'doubt' })}
  <circle cx="540" cy="980" r="130" fill="${h.fill}"/>${text(540, 1030, 160, h.ink, '?')}
  ${text(540, 1250, 54, h.ink, '3–4 фигуры')}`;

const road = `
  <rect x="160" y="800" width="760" height="760" fill="${h.fill}"/>
  <path d="M160,1090 H920 M160,1270 H920 M450,800 V1560 M630,800 V1560" stroke-width="5"/>
  <rect x="480" y="1330" width="56" height="96" rx="12" fill="${h.ink}"/>
  <rect x="740" y="1150" width="96" height="56" rx="12" fill="${h.fill}"/>
  <path d="M310,1060 V960"/><path d="M262,960 L310,880 L358,960 Z" fill="${h.fill}"/>
  <path d="M508,1320 V1180 Q508,1130 560,1130 H700" stroke-width="7" stroke-dasharray="18 12"/>`;

export const v14: Video = {
  id: '14-shahmaty',
  title: 'Реклама: мастер видит ситуацию',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1150, s: 1.4 },
  lines: [
    { shot: 'wide', text: '«Как вы так быстро ходите?»', a: 'doubt', b: 'calm' },
    { shot: 'b', text: '«Я эту позицию<br>видел сто раз»', b: 'smile' },
    { shot: 'a', text: '«А я в билетах<br>всё время путаюсь»', a: 'sad' },
    { shot: 'b', text: '«Ты учишь буквы,<br>а не картинку»', b: 'think' },
    { shot: 'a', text: '«Какую картинку?»', a: 'doubt' },
    { shot: 'b', text: '«Ситуацию на дороге.<br>Видел — значит, знаешь»', b: 'cool' },
    { shot: 'wide', text: '«Так мастера<br>и запоминают»', a: 'think', b: 'happy' },
  ],
  story: [
    { label: 'США, 1973', shots: [{ art: clock }] },
    { label: 'Учёные показывали шахматистам<br>доску на несколько секунд', shots: [{ art: glance }] },
    { label: 'Мастер запоминал почти всё,<br>новичок — треть', shots: [{ art: master }, { art: novice }] },
    { label: 'Но если фигуры стояли наугад,<br>мастер помнил не больше новичка', shots: [{ art: random }, { art: both }] },
    { label: 'Опыт — это знакомые ситуации', shots: [{ art: road }] },
  ],
  table: {
    left: 'ЗАПОМИНАТЬ',
    right: 'УЗНАВАТЬ',
    leftIcon: ICON.book,
    rightIcon: ICON.eye,
    rows: [
      ['каждый вопрос заново', 'ситуация знакома'],
      ['путаешь похожие', 'видишь разницу'],
      ['долго думаешь', 'отвечаешь сразу'],
    ],
  },
  cta: ['Не зубри', 'буквы,', 'узнавай ситуации'],
  bioGlyph: '<path d="M-24,36 H24 L16,10 H-16 Z M-16,10 Q-22,-2 -8,-8 A16,16 0 1 1 8,-8 Q22,-2 16,10"/>',
};
