/**
 * 54. «Опять не сдал теорию. Всё, бросаю» — скамейка у остановки (старый формат: белые человечки + гравюра, `engine3.ts`).
 * Тот же приём, что у ролика 53 (залетел): узнаваемая боль в первой фразе, потом история про упорство.
 * История-гравюра: Авраам Линкольн проиграл выборы в законодательное собрание Иллинойса (1832) и в Сенат США (1858)
 * и всё же был избран президентом в 1860 — через 28 лет после первого поражения.
 * https://en.wikipedia.org/wiki/Abraham_Lincoln · https://en.wikipedia.org/wiki/1858_United_States_Senate_election_in_Illinois
 */
import { bench, floorLine, person, streetLamp } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { temple } from '../etch2.ts';
import { cloud, fig, ground, sh, sky, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 230, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'chin'], hair: 'spiky', face: 'sad' });
const B = person(DLG, { id: 'B', x: 880, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'bun', face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${streetLamp(1010, 1300, C.accent)}
  ${bench(380, 740, 1300)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: три сцены слева направо ─────────────────────────────────────────

const G = 1760;
const sign = (x: number, n: string, hatch: string) => `
  <path d="M${x},${G} V1380" stroke-width="10"/>
  ${sh(`M${x - 150},1250 h300 v140 h-300 Z`, hatch)}<path d="M${x - 150},1250 h300 v140 h-300 Z" fill="none" stroke-width="6"/>
  ${wh(`M${x - 130},1266 h260 v108 h-260 Z`)}
  <text x="${x}" y="1346" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="82" fill="${C.ink}" stroke="none">${n}</text>`;
const ballotBox = (x: number) => `
  ${sh(`M${x - 90},${G - 170} h180 v170 h-180 Z`, 'a60')}<path d="M${x - 90},${G - 170} h180 v170 h-180 Z M${x - 50},${G - 140} h100" fill="none" stroke-width="6"/>
  ${wh(`M${x - 60},${G - 205} h120 v22 h-120 Z`)}<path d="M${x + 6},${G - 260} l20,52 l-52,0 z" fill="${C.paper}" stroke-width="3"/>`;
const podium = (x: number) => `
  ${sh(`M${x - 110},${G} V${G - 260} H${x + 110} V${G} Z`, 'b30')}<path d="M${x - 110},${G} V${G - 260} H${x + 110} V${G}" fill="none" stroke-width="6"/>
  ${wh(`M${x - 130},${G - 280} h260 v24 h-260 Z`)}<path d="M${x - 130},${G - 280} h260 v24 h-260 Z" fill="none" stroke-width="5"/>
  ${wh(`M${x - 70},${G - 220} h140 v110 h-140 Z`)}<path d="M${x - 40},${G - 190} h80 M${x - 40},${G - 160} h80 M${x - 40},${G - 130} h50" stroke-width="4"/>`;
const crowd = (x: number, y: number, n: number) =>
  Array.from({ length: n }, (_, i) => `<g transform="translate(${x + i * 48} ${y - (i % 2) * 8})">${wh('M-14,0 q0,-34 14,-34 q14,0 14,34 Z')}<circle cx="0" cy="-48" r="14" fill="${C.paper}"/><circle cx="0" cy="-48" r="14" fill="none" stroke-width="3"/><path d="M-6,-92 l-16,-24 M6,-92 l16,-24" stroke-width="4"/></g>`).join('');

const lincoln = (x: number, o: Parameters<typeof fig>[0] extends infer T ? Partial<T> : never) =>
  fig({ x, y: 1556, dress: 'coat', pat: 'a60', hair: 'hat', beard: true, ...(o as object) } as Parameters<typeof fig>[0]);

const tableau = `
  ${sky()}
  ${cloud(160, 560, 400)}${cloud(980, 680, 340)}${cloud(1380, 520, 300)}
  ${ground(G)}
  <!-- 1832 -->
  ${sign(300, '1832', 'c60')}${ballotBox(560)}
  ${lincoln(430, { lean: 14, nod: 14, arm: [10, 24], arm2: [4, 18], leg: [8, 6], leg2: [-8, 0], face: 'sad' })}
  <!-- 1858 -->
  ${sign(900, '1858', 'c120')}${podium(1180)}
  ${lincoln(1000, { lean: 10, nod: 18, arm: [18, 30], arm2: [10, 20], leg: [8, 4], leg2: [-10, 4], face: 'sad' })}
  <!-- 1860 -->
  ${sign(1560, '1860', 'a0')}
  ${temple(2080, G, 520, 5)}
  <path d="M2080,${G - 480} V${G - 640}" stroke-width="6"/><path d="M2080,${G - 640} l110,22 l-110,26 z" fill="${C.accent}" stroke-width="3"/>
  ${lincoln(1840, { arm: [160, 20], arm2: [150, 30], nod: -14, leg: [6, 4], leg2: [-6, 2], face: 'shout' })}
  <g class="st-a">${crowd(1640, G - 20, 8)}${crowd(2160, G - 20, 6)}</g>`;

const story = [
  { fx: 1000, fy: 1400, s: 0.62, label: 'США, XIX век' },
  { fx: 430, fy: 1470, s: 1.9, label: '1832: проиграл первые выборы' },
  { fx: 1060, fy: 1460, s: 1.9, label: '1858: проиграл выборы в Сенат' },
  { fx: 1200, fy: 1430, s: 1.45, label: 'Но не сдался' },
  { fx: 1840, fy: 1400, s: 1.5, dx: 120, label: '1860: избран президентом США' },
  { fx: 1880, fy: 1500, s: 1.9, label: 'Через 28 лет после первого поражения' },
];
const after = [
  { fx: 1000, fy: 1400, s: 0.62 },
  { fx: 2080, fy: 1380, s: 1.4 },
  { fx: 1840, fy: 1490, s: 2.0 },
  { fx: 1000, fy: 1400, s: 0.62, ds: 1.1 },
];

// ─── Инфографика: 1832 → 1858 → 1860 ──────────────────────────────────────────

const years = [
  { y: '1832', mark: '×' },
  { y: '1858', mark: '×' },
  { y: '1860', mark: '✓' },
];
const info = {
  html: `
    ${itext('i-h', 450, 40, 'АВРААМ ЛИНКОЛЬН')}
    ${isvg(years.map((v, i) => {
      const x = 540 + (i - 1) * 300;
      const win = i === 2;
      return `<g class="yr" id="yr${i}"><circle cx="${x}" cy="740" r="82" fill="${win ? C.accent : 'none'}" stroke="${win ? C.accent : '#fff'}" stroke-width="7"/>
        <text x="${x}" y="772" text-anchor="middle" font-size="90" font-weight="900" fill="${win ? '#000' : '#fff'}">${v.mark}</text>
        <text x="${x}" y="880" text-anchor="middle" font-size="46" font-weight="800" fill="#fff" letter-spacing="2">${v.y}</text></g>`;
    }).join(''))}
    ${itext('i-n', 960, 140, '28 ЛЕТ', C.accent, 900, 'white-space:nowrap')}
    ${itext('i-s', 1170, 44, 'ОТ ПЕРВОГО ПОРАЖЕНИЯ<br>ДО ПРЕЗИДЕНТСТВА')}
    ${itext('i-y', 1340, 30, 'А ТЕОРИЮ ПЕРЕСДАЮТ ЧЕРЕЗ 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...years.map((_, i) => pop(`#yr${i}`, t[0] + 0.07 * i, 0.22)),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v54: Video3 = {
  id: '54-linkoln',
  title: 'Реклама: Линкольн и поражения',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Опять не сдал теорию.<br>Всё, бросаю»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Одна неудача — не приговор»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Это не моё»', cams: ['a', 'a'], a: 'tired' },
    { text: '«Линкольн проиграл<br>первые выборы в 1832-м»', cams: ['b', [540, 1180, 2.2]], b: 'cool' },
    { text: '«Он же потом<br>стал президентом»', cams: ['a', 'wide'], a: 'doubt' },
    { text: '«А в 1858-м проиграл<br>ещё и Сенат»', cams: ['ab', 'b'], b: 'smile' },
    { text: '«И всё равно<br>стал президентом?»', cams: ['a', [A.head.x, A.head.y + 40, 2.5]], a: 'shock' },
    { text: '«Через 28 лет после<br>первого поражения»', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  info,
  cta: { lines: ['Не бросай.', 'Пересдай', 'и дойди'], accent: 2 },
  bioGlyph: '<path d="M-36,28 L-6,-26 L8,-4 L26,-36 L40,28 z"/>',
};
