/**
 * 23. «Я все темы знаю… кроме перекрёстков» — гостиная с кубком на полке.
 * История-гравюра: Ахиллес неуязвим везде, кроме пятки, — туда и попала стрела Париса.
 * Инфографика: на экзамене 4 блока по 5 вопросов; 2 ошибки в одном блоке — провал.
 */
import { ICON, couch, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { fig, figPts, front, ground, sh, sky, type FigOpts } from '../etch.ts';
import { arrow, battlement, bowDrawn, shield, spear } from '../etch2.ts';
import { at } from '../kit.ts';

const A = person(DLG, { id: 'A', x: 290, floor: 1300, pose: 'stand', f: 1, arms: ['hip', 'hip'], hair: 'spiky', face: 'grin' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'sit', seat: 110, f: -1, arms: ['lap', 'down'], hair: 'ponytail', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${couch(690, 1000, 1300, C.night)}
  <path d="M120,800 H460" stroke-width="5"/>${at(ICON.trophy, 210, 750, 1.3)}${at(ICON.book2, 330, 755, 0.8)}${at(ICON.book2, 380, 755, 0.8)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const hero: FigOpts = { x: 300, y: 1206, s: 1.1, f: -1, dress: 'armor', pat: 'a0', legs: 'c90', hair: 'helmet', arm: [150, 20], arm2: [62, 50], leg: [14, 0], leg2: [-24, 14], face: 'calm', hand: spear(-170, 80, 190, -96) };
const heroPts = figPts(hero);
const heel = heroPts.heel2;

const fallen: FigOpts = { x: 320, y: 1294, s: 1.1, f: -1, dress: 'armor', pat: 'a0', legs: 'c90', hair: 'helmet', leg: [80, 90], leg2: [-10, 100], lean: 26, nod: 30, arm: [-30, 40], arm2: [40, 40], face: 'closed' };
const heel2 = figPts(fallen).heel2;

const paris: FigOpts = { x: 860, y: 312, s: 1, f: -1, dress: 'tunic', pat: 'a30', legs: 'c90', hair: 'hat', arm: [55, 0], arm2: [70, 100], hand: `<g transform="rotate(35)">${bowDrawn}</g>` };
const bowHand = figPts(paris).hand;

const thetis: FigOpts = { x: 880, y: 1584, s: 1, f: -1, dress: 'gown', pat: 'a30', hair: 'long', leg: [80, 90], leg2: [-10, 100], lean: 30, nod: 20, arm: [100, 0], arm2: [90, 10], face: 'calm' };
const tHand = figPts(thetis).hand;
const baby = front({ x: tHand[0] - 3, y: tHand[1] + 110, s: 0.55, rot: 180, dress: 'none', hair: 'curly', arms: [30, 10], legs: [3, 0] });

const sh2 = heroPts.hand2;
const tableau = `
  ${sky()}
  ${battlement(260, 640, 980, 380)}
  <path d="M520,1020 V860 Q600,780 680,860 V1020 Z" fill="${C.ink}"/>
  ${battlement(760, 520, 220, 500)}
  ${fig(paris)}
  ${ground(1020)}
  ${spear(90, 1440, 250, 1418, true)}${spear(470, 1452, 610, 1440, true)}${arrow(560, 1400, 470, 1430)}${arrow(150, 1380, 60, 1420)}
  <g class="st-b">
    ${fig(hero)}
    ${shield(sh2[0], sh2[1], 74)}${arrow(sh2[0] + 70, sh2[1] - 110, sh2[0] + 10, sh2[1] - 30)}${arrow(sh2[0] - 90, sh2[1] - 80, sh2[0] - 20, sh2[1] - 10)}
  </g>
  <g class="arrow" opacity="0">
    <path d="M${bowHand[0]},${bowHand[1]} L${heel[0]},${heel[1]}" stroke-width="3" stroke-dasharray="14 12"/>
    ${arrow(heel[0] + 46, heel[1] - 100, heel[0] + 4, heel[1] - 6)}
  </g>
  <g class="st-a">
    ${shield(150, 1440, 64)}${spear(60, 1470, 300, 1460)}
    ${fig(fallen)}
    ${arrow(heel2[0] + 50, heel2[1] - 110, heel2[0] + 4, heel2[1] - 6)}
  </g>
  ${fig(thetis)}
  ${baby}
  ${sh('M-400,1662 L716,1662 C740,1700 760,1740 806,1758 L1500,1768 V2400 H-400 Z', 'b0')}
  <path d="M-400,1662 L716,1662 C740,1700 760,1740 806,1758 L1500,1768" stroke-width="5"/>
  <path d="M40,1720 q40,-12 80,0 M260,1760 q50,-12 100,0 M520,1730 q40,-12 80,0 M120,1830 q60,-14 120,0 M420,1850 q50,-12 100,0 M760,1840 q50,-12 100,0" stroke="${C.paper}" stroke-width="4"/>`;

// ─── Инфографика: 4 блока по 5 ────────────────────────────────────────────────

const sq = (r: number, c: number) => [540 + (c - 2) * 122 - 48, 650 + r * 118];
const grid = Array.from({ length: 20 }, (_, i) => {
  const [x, y] = sq(Math.floor(i / 5), i % 5);
  return `<g class="gw" id="gw${i}"><rect x="${x}" y="${y}" width="96" height="96" rx="12" stroke="#fff" stroke-width="5" fill="none"/></g>`;
}).join('');
const marks = [12, 14]
  .map((i) => {
    const [x, y] = sq(Math.floor(i / 5), i % 5);
    return `<g class="gx"><rect x="${x}" y="${y}" width="96" height="96" rx="12" fill="${C.accent}" stroke="${C.accent}" stroke-width="5"/><path d="M${x + 26},${y + 26} l44,44 M${x + 70},${y + 26} l-44,44" stroke="#000" stroke-width="10" stroke-linecap="round"/></g>`;
  })
  .join('');
const ring = `<rect class="gx" x="${sq(2, 0)[0] - 18}" y="${sq(2, 0)[1] - 14}" width="${4 * 122 + 96 + 36}" height="124" rx="20" fill="none" stroke="${C.accent}" stroke-width="5"/>`;

const info = {
  html: `
    ${itext('i-h', 450, 38, 'ЭКЗАМЕН: 4 БЛОКА ПО 5')}
    ${isvg(`${grid}${ring}${marks}`)}
    ${itext('i-n', 1160, 130, '2 ОШИБКИ', C.accent, 900)}
    ${itext('i-s', 1330, 46, 'В ОДНОМ БЛОКЕ = ПРОВАЛ')}
    ${itext('i-y', 1420, 30, 'ПРАВИЛА ГИБДД', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 20 }, (_, i) => pop(`#gw${i}`, t[0] + 0.015 * i)),
      `tl.set('.gx', { opacity: 0 }, 0); tl.set('.gx', { opacity: 1 }, ${t[1].toFixed(3)});`,
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v23: Video3 = {
  id: '23-ahill',
  title: 'Реклама: Ахиллесова пята',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Я все темы знаю<br>на отлично»', cams: ['wide', 'a'], a: 'grin', b: 'neutral' },
    { text: '«Прямо все?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Ну… кроме перекрёстков»', cams: ['a', 'a'], a: 'think' },
    { text: '«А на экзамене<br>их три подряд»', cams: ['b', 'b'], b: 'cool' },
    { text: '«Да ладно,<br>две ошибки можно»', cams: ['a', 'wide'], a: 'smile' },
    { text: '«Только не в одном блоке»', cams: ['b', 'ab'], b: 'calm' },
    { text: '«Серьёзно?»', cams: ['a', 'a'], a: 'shock' },
    { text: '«Одно слабое место —<br>и всё»', cams: ['b', 'wide'], a: 'sad', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Ахиллес — непобедимый герой' },
    { fx: 760, fy: 1580, s: 1.9, label: 'Мать окунула его в Стикс' },
    { fx: tHand[0], fy: tHand[1] + 30, s: 3.0, label: 'Держа за пятку' },
    { fx: 330, fy: 1200, s: 1.7, label: 'Его не брало ни одно оружие' },
    { fx: 840, fy: 420, s: 1.9, label: 'Но Парис выстрелил' },
    { fx: heel[0] + 30, fy: heel[1] - 60, s: 2.5, label: 'Прямо в пятку', on: '.arrow' },
  ],
  after: [
    { fx: 540, fy: 1020, s: 1.02, off: '.arrow' },
    { fx: 320, fy: 1280, s: 2.0 },
    { fx: 840, fy: 440, s: 1.8 },
    { fx: heel2[0] + 30, fy: heel2[1] - 40, s: 2.6 },
  ],
  info,
  cta: { lines: ['Найди', 'слабое место', 'до экзамена'], accent: 1 },
  bioGlyph: '<path d="M-20,-36 V16 Q-20,34 0,34 H30 Q36,34 36,26 Q36,18 26,16 L8,12 V-36 Z"/><path d="M40,-40 L14,6" stroke-width="5"/>',
};
