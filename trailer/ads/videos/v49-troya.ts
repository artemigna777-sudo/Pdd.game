/**
 * 49. «Если б знать вопросы заранее» — остановка ночью.
 * История-гравюра: Троянский конь (Вергилий, «Энеида», II) — после десяти лет осады греки оставили у стен деревянного коня,
 * Лаокоон предупредил: «Бойтесь данайцев, дары приносящих», троянцы втащили коня в город, ночью из него вышли воины.
 * Мораль: подвох в невнимательности, читай вопрос до конца. Вопросы билетов известны заранее — в открытом банке ГИБДД.
 * Инфографика: 10 лет осады (по Гомеру и Вергилию) — без выдуманной статистики.
 */
import { busStop, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { battlement, shield, spear, starDots } from '../etch2.ts';
import { cloud, fig, ground, ink, rock, sh, sky, wh } from '../etch.ts';
import { flame, horse } from '../etch3.ts';

const A = person(DLG, { id: 'A', x: 190, floor: 1300, pose: 'stand', f: 1, arms: ['hip', 'down'], hair: 'ponytail', face: 'think' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${busStop(360, 700, 1300, DLG.fill)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const moon = ink('M850,170 A95,95 0 1 0 850,360 A72,95 0 1 1 850,170 Z');

const wall = `
  ${battlement(-80, 1040, 640, 440)}
  ${battlement(420, 900, 140, 580)}
  ${sh('M150,1480 V1330 Q150,1260 220,1260 Q290,1260 290,1330 V1480 Z', 'b0')}
  <path d="M220,1260 V1480 M150,1370 H290" stroke-width="3" stroke="${C.paper}"/>
  ${wh('M470,1180 h26 v60 h-26 Z')}`;

/** Деревянный конь на колёсах: стоит, штриховка «доски». */
const woodHorse = `
  ${horse(700, 1470, 1.2, 'stand', 'x45')}
  ${wh('M530,1478 H890 V1500 H530 Z')}
  ${[580, 680, 770, 850].map((x) => `<circle cx="${x}" cy="1506" r="22" fill="${C.paper}"/><circle cx="${x}" cy="1506" r="6" fill="${C.ink}"/>`).join('')}`;

const rope = `<path d="M610,1230 Q420,1290 290,1380 M640,1290 Q440,1340 290,1410" stroke-width="5"/>`;

const laocoon = fig({
  x: 470, y: 1260, s: 0.95, f: 1, dress: 'robe', pat: 'a120', sleeve: 'c60', hair: 'short', beard: true,
  lean: 10, nod: -6, arm: [96, 18], arm2: [60, 50], face: 'shout',
});

const soldier = (x: number, y: number, k: number) =>
  fig({
    x, y, s: 0.72, f: k, dress: 'armor', pat: 'a60', sleeve: 'c60', hair: 'helmet', face: 'shout', arm: [100, 20], arm2: [30, 40],
    hand: `<g transform="scale(${k})">${spear(-10, 60, 20, -160)}</g>`,
  });
const soldiers = `${soldier(620, 1480, 1)}${soldier(710, 1480, -1)}${soldier(800, 1480, 1)}${shield(880, 1430, 38)}`;

const fires = [[30, 1040, 150], [160, 1040, 190], [300, 1040, 130], [450, 900, 170], [530, 900, 130], [60, 1480, 120], [330, 1480, 140]]
  .map(([x, y, h]) => flame(x, y, h))
  .join('');
const smoke = `${cloud(250, 760, 340)}${cloud(620, 620, 260)}${cloud(120, 560, 220)}`;

const tableau = `
  ${sky()}
  ${starDots(0, 40, 1080, 700, 46)}
  ${moon}
  ${ground(1480)}
  ${wall}
  <g class="st-b">${rope}</g>
  ${woodHorse}
  <g class="st-b">${laocoon}</g>
  <g class="sold" opacity="0">${soldiers}</g>
  <g class="flame" opacity="0">${fires}${smoke}</g>
  ${rock('rk', 'M1000,1480 L1060,1400 L1180,1390 L1240,1480 Z', [990, 1380, 280, 110], 60, 5)}`;

// ─── Инфографика: десять лет ──────────────────────────────────────────────────

const tally = Array.from({ length: 10 }, (_, i) => {
  const x = 150 + i * 86;
  return `<g class="yr" id="yr${i}"><path d="M${x},560 v150" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g>`;
}).join('');

const info = {
  html: `
    ${itext('i-h', 450, 40, 'ТРОЯ ВЫДЕРЖАЛА')}
    ${isvg(tally)}
    ${itext('i-n', 960, 170, '10 ЛЕТ', C.accent, 900)}
    ${itext('i-s', 1200, 44, 'И ПАЛА ЗА ОДНУ НОЧЬ<br>ИЗ-ЗА ПОДАРКА, КОТОРЫЙ<br>НИКТО НЕ ПРОВЕРИЛ')}
    ${itext('i-y', 1480, 28, 'ВЕРГИЛИЙ, «ЭНЕИДА», КНИГА II', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 10 }, (_, i) => pop(`#yr${i}`, t[0] + 0.035 * i)),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v49: Video3 = {
  id: '49-troya',
  title: 'Реклама: Троянский конь',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Если б знать вопросы<br>заранее!»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Они известны заранее»', cams: ['b', 'ab'], b: 'calm' },
    { text: '«Ага, конечно»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Все 800 — в открытом<br>банке вопросов ГИБДД»', cams: ['b', [540, 1180, 2.2]], b: 'cool' },
    { text: '«Тогда в чём подвох?»', cams: ['a', 'wide'], a: 'shock' },
    { text: '«В невнимательности.<br>Читай вопрос до конца»', cams: ['ab', 'b'], b: 'smile' },
    { text: '«Подумаешь, слово<br>пропустить»', cams: ['a', [560, 1140, 2.4]], a: 'smirk' },
    { text: '«Троянцы тоже не вгляделись»', cams: ['wide', 'b'], a: 'doubt', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1180, s: 1.0, label: 'Троя. Десять лет осады' },
    { fx: 700, fy: 1250, s: 1.8, label: 'Греки оставили у стен<br>деревянного коня' },
    { fx: 470, fy: 1230, s: 2.0, label: 'Лаокоон предупредил:<br>«Бойтесь данайцев, дары приносящих»' },
    { fx: 440, fy: 1300, s: 1.7, label: 'Троянцы втащили коня в город' },
    { fx: 710, fy: 1330, s: 2.0, label: 'Ночью из коня вышли воины', on: '.sold' },
    { fx: 260, fy: 1050, s: 1.4, label: 'Троя пала', on: '.flame' },
  ],
  after: [
    { fx: 540, fy: 1180, s: 1.0 },
    { fx: 710, fy: 1330, s: 2.3 },
    { fx: 250, fy: 1000, s: 1.8 },
    { fx: 540, fy: 1200, s: 1.2, ds: 1.08 },
  ],
  info,
  cta: { lines: ['Читай вопрос', 'до последнего', 'слова'], accent: 2 },
  bioGlyph: '<path d="M-44,-20 H44 M-44,0 H44 M-44,20 H20"/><circle cx="34" cy="26" r="14" fill="none"/>',
};
