/**
 * 30. «800 вопросов — как этот узел» — запутанные наушники.
 * История-гравюра: Гордиев узел, 333 до н. э. — никто не мог развязать; Александр разрубил его мечом.
 * Инфографика: каждый билет собран по одной схеме — 2–4 знаки, 13–15 перекрёстки (данные игры).
 */
import { floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { fig, ground, sky, type FigOpts } from '../etch.ts';
import { cart, knot, sword, temple, tube } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 330, floor: 1300, pose: 'stand', f: 1, arms: ['front', 'down'], hair: 'curly', face: 'tired' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'bun', face: 'neutral' });

const tangle = `<g transform="translate(450 1100)"><path d="M-30,0 C-60,-40 20,-60 30,-20 C40,20 -40,40 -20,-10 C0,-50 50,10 10,30 C-20,44 -50,10 -30,-30 C-10,-60 40,-30 20,10 M30,-20 L60,-80 M-30,30 L-50,90" stroke-width="4"/><circle cx="60" cy="-86" r="10" stroke-width="4"/><circle cx="-50" cy="96" r="10" stroke-width="4"/></g>`;
const scene = `
  ${floorLine(1300)}
  ${tangle}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const FL = 1520;
const KX = 860;
const KY = 1250;
const crowd = [80, 170, 990, 1060]
  .map((x, i) => fig({ x, y: FL - 120 - 110, s: 0.55, f: x < 500 ? 1 : -1, dress: i % 2 ? 'robe' : 'tunic', pat: i % 2 ? 'a30' : 'a120', legs: 'c90', hair: i % 3 ? 'short' : 'long', arm: [i % 2 ? 140 : 20, 20], arm2: [10, 10] }))
  .join('');
const alexUp: FigOpts = { x: 690, y: FL - 206, s: 1, f: 1, dress: 'armor', pat: 'a0', legs: 'c90', hair: 'helmet', arm: [175, -10], arm2: [40, 40], leg: [18, 0], leg2: [-20, 6], hand: sword(220), nod: 6 };
const alexDown: FigOpts = { ...alexUp, arm: [95, 0], lean: 14, leg: [30, 20], hand: `<g transform="rotate(100)">${sword(220)}</g>` };

const halves = `
  ${tube(`M${KX - 140},${KY + 4} C${KX - 100},${KY - 40} ${KX - 40},${KY + 60} ${KX - 20},${KY + 10} C${KX - 10},${KY - 20} ${KX - 50},${KY - 50} ${KX - 30},${KY - 70}`, 12, 'b60')}
  ${tube(`M${KX + 160},${KY - 20} C${KX + 120},${KY + 30} ${KX + 60},${KY - 50} ${KX + 30},${KY + 20} C${KX + 20},${KY + 50} ${KX + 50},${KY + 90} ${KX + 20},${KY + 120}`, 12, 'b60')}
  <path d="M${KX - 110},${KY - 150} L${KX + 100},${KY + 150}" stroke-width="7" stroke-dasharray="26 12"/>
  <path d="M${KX - 150},${KY - 110} q-30,40 -10,90 M${KX - 120},${KY - 170} q-50,30 -50,80" stroke-width="4"/>`;

const tableau = `
  ${sky()}
  ${temple(540, 1060, 760, 7)}
  ${ground(1060)}
  ${crowd}
  ${cart(420, FL)}
  <path d="M960,${KY - 10} L1080,${KY - 20}" stroke-width="14"/>
  <g class="whole">${knot(KX, KY, 70, 5)}${knot(KX + 10, KY - 6, 52, 9)}${fig(alexUp)}</g>
  <g class="cut" opacity="0">${halves}${fig(alexDown)}</g>`;

// ─── Инфографика: схема билета ────────────────────────────────────────────────

const cellX = (i: number) => 80 + (i % 10) * 94;
const cellY = (i: number) => 650 + Math.floor(i / 10) * 120;
const cells = Array.from({ length: 20 }, (_, i) => `<g class="cw" id="cw${i}"><rect x="${cellX(i)}" y="${cellY(i)}" width="80" height="96" rx="10" fill="none" stroke="#fff" stroke-width="5"/><text x="${cellX(i) + 40}" y="${cellY(i) + 62}" text-anchor="middle" font-size="34" font-weight="800" fill="#fff">${i + 1}</text></g>`).join('');
const hot = (ids: number[], cls: string) =>
  ids.map((i) => `<g class="${cls}"><rect x="${cellX(i)}" y="${cellY(i)}" width="80" height="96" rx="10" fill="${C.accent}" stroke="${C.accent}" stroke-width="5"/><text x="${cellX(i) + 40}" y="${cellY(i) + 62}" text-anchor="middle" font-size="34" font-weight="800" fill="#000">${i + 1}</text></g>`).join('');

const info = {
  html: `
    ${itext('i-h', 450, 40, 'КАЖДЫЙ БИЛЕТ —<br>ПО ОДНОЙ СХЕМЕ')}
    ${isvg(`${cells}${hot([1, 2, 3], 'h1')}${hot([12, 13, 14], 'h2')}`)}
    ${itext('i-a', 960, 60, '2–4: ЗНАКИ', C.accent, 900)}
    ${itext('i-b', 1060, 60, '13–15: ПЕРЕКРЁСТКИ', C.accent, 900)}
    ${itext('i-s', 1200, 40, 'РАЗБЕРИ ПО БЛОКАМ', '#fff')}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 20 }, (_, i) => pop(`#cw${i}`, t[0] + 0.015 * i)),
      `tl.set('.h1, .h2', { opacity: 0 }, 0); tl.set('.h1', { opacity: 1 }, ${t[1].toFixed(3)}); tl.set('.h2', { opacity: 1 }, ${(t[1] + 0.5).toFixed(3)});`,
      pop('#i-a', t[1], 0.2),
      pop('#i-b', t[1] + 0.5, 0.2),
      show('#i-s', t[2]),
    ].join('\n      '),
};

export const v30: Video3 = {
  id: '30-uzel',
  title: 'Реклама: Гордиев узел',
  format: 'short',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«800 вопросов —<br>как этот узел»', cams: ['wide', [450, 1060, 2.2]], a: 'tired', b: 'neutral' },
    { text: '«Распутываешь<br>по одному?»', cams: ['b', 'ab'], b: 'think' },
    { text: '«А как ещё?»', cams: ['a', 'a'], a: 'doubt' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1050, s: 1.0, label: 'Гордиев узел, 333 до н. э.' },
    { fx: KX, fy: KY, s: 2.3, label: 'Его никто не мог развязать' },
    { fx: 730, fy: 1150, s: 1.6, label: 'Александр не стал распутывать' },
    { fx: KX - 40, fy: KY - 40, s: 2.0, label: 'Он разрубил его мечом', on: '.cut', off: '.whole' },
  ],
  after: [{ fx: 600, fy: 1200, s: 1.15, ds: 1.08 }],
  info,
  cta: { lines: ['Не распутывай —', 'разруби'], accent: 1 },
  bioGlyph: '<path d="M-30,-10 C-50,-40 10,-50 20,-20 C30,10 -30,30 -16,-8 C0,-40 40,0 10,20 M-40,40 L40,-40"/>',
};
