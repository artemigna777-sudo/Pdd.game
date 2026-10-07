/**
 * 27. «800 вопросов… Я тону» — стол, листы на полу.
 * История-гравюра: лабиринт Минотавра — Ариадна дала Тесею нить, по ней он дошёл и нашёл выход.
 * Инфографика: 800 вопросов — это 40 билетов по 20; идти по порядку, билет за билетом.
 */
import { chair, desk, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { fig, figPts, ground, sh, sky, type FigOpts } from '../etch.ts';
import { bullHead, maze, sword, tube } from '../etch2.ts';
import { DASH } from '../kit.ts';

const A = person(DLG, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['chin', 'table'], table: 1170, hair: 'ponytail', face: 'tired' });
const B = person(DLG, { id: 'B', x: 850, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'neutral' });

const papers = [[120, 1290, -14], [560, 1286, 10], [660, 1292, -6], [980, 1290, 16], [470, 1160, -4], [600, 1158, 6]]
  .map(([x, y, a]) => `<rect x="${x - 30}" y="${y - 10}" width="60" height="18" transform="rotate(${a} ${x} ${y})" stroke-width="3"/>`)
  .join('');
const scene = `
  ${floorLine(1300)}
  ${chair(330, 1300, 1, 110)}
  ${desk(440, 720, 1170, 1300)}
  ${papers}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const M = maze(90, 470, 9, 9, 100, 12);
const walls = tube(M.walls, 16, 'b30');
const ariadne: FigOpts = { x: 330, y: 1580, s: 0.9, f: 1, dress: 'dress', pat: 'a30', hair: 'braids', arm: [70, 20], arm2: [10, 10] };
const ballAt = figPts(ariadne).hand;
const theseusIn: FigOpts = { x: 610, y: 1590, s: 0.95, f: -1, dress: 'tunic', pat: 'a120', legs: 'c90', hair: 'curly', arm: [60, 30], arm2: [10, 10], hand2: `<g transform="rotate(-150)">${sword(120)}</g>` };
const theseusOut: FigOpts = { x: 610, y: 1590, s: 0.95, f: -1, dress: 'tunic', pat: 'a120', legs: 'c90', hair: 'curly', arm: [160, 10], arm2: [20, 10], hand: sword(150) };

const tableau = `
  ${sky()}
  ${ground(1400)}
  <rect x="70" y="450" width="940" height="940" fill="${C.paper}" stroke="none"/><rect x="70" y="450" width="940" height="940" fill="url(#c30)" stroke="none" opacity="0.6"/>
  ${walls}
  ${bullHead(M.center[0], M.center[1] + 20, 0.55)}
  <path class="thread" d="${M.thread}" ${DASH} stroke-width="8"/>
  <path d="${M.thread}" stroke-width="8" class="st-a"/>
  <g class="in">${fig(theseusIn)}</g>
  <g class="out" opacity="0">${fig(theseusOut)}</g>
  ${fig(ariadne)}
  <g transform="translate(${ballAt[0]} ${ballAt[1]})">${sh('M-24,0 a24,24 0 1 0 48,0 a24,24 0 1 0 -48,0 Z', 'b30')}<path d="M-18,-14 Q0,-4 18,-16 M-22,4 Q0,14 22,2" stroke-width="2"/></g>
  <path d="M${ballAt[0] + 20},${ballAt[1] + 10} Q${(ballAt[0] + M.entry[0]) / 2},${ballAt[1] + 60} ${M.entry[0]},${M.entry[1]}" stroke-width="4"/>`;

// ─── Инфографика: 800 = 40 × 20 ───────────────────────────────────────────────

const tickets = Array.from({ length: 40 }, (_, i) => {
  const x = 150 + (i % 8) * 100;
  const y = 760 + Math.floor(i / 8) * 96;
  return `<rect class="tw" id="tw${i}" x="${x}" y="${y}" width="80" height="76" rx="10" fill="none" stroke="#fff" stroke-width="5"/><rect class="to" id="to${i}" x="${x}" y="${y}" width="80" height="76" rx="10" fill="${C.accent}" stroke="${C.accent}" stroke-width="5"/>`;
}).join('');

const info = {
  html: `
    ${itext('i-n', 420, 130, '800', C.accent, 900)}
    ${itext('i-h', 590, 44, 'ВОПРОСОВ')}
    ${isvg(tickets)}
    ${itext('i-s', 1270, 46, '= 40 БИЛЕТОВ ПО 20')}
    ${itext('i-y', 1360, 40, 'БИЛЕТ ЗА БИЛЕТОМ', C.accent)}`,
  tweens: (t: number[]) =>
    [
      pop('#i-n', t[0], 0.22),
      show('#i-h', t[0] + 0.1),
      `tl.set('.tw, .to', { opacity: 0 }, 0);`,
      ...Array.from({ length: 40 }, (_, i) => `tl.set('#tw${i}', { opacity: 1 }, ${(t[1] + 0.008 * i).toFixed(3)});`),
      show('#i-s', t[1]),
      ...Array.from({ length: 40 }, (_, i) => `tl.set('#to${i}', { opacity: 1 }, ${(t[2] + 0.02 * i).toFixed(3)});`),
      show('#i-y', t[2]),
    ].join('\n      '),
};

export const v27: Video3 = {
  id: '27-ariadna',
  title: 'Реклама: Ариаднина нить',
  format: 'short',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«800 вопросов…<br>Я тону»', cams: ['wide', 'a'], a: 'tired', b: 'neutral' },
    { text: '«Ты по порядку идёшь?»', cams: ['b', 'ab'], b: 'think' },
    { text: '«Я хожу по кругу»', cams: ['a', 'a'], a: 'sad' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Лабиринт Минотавра' },
    { fx: 470, fy: 1460, s: 2.0, label: 'Ариадна дала Тесею нить' },
    { fx: 540, fy: 940, s: 1.12, ds: 1.02, label: 'Он шёл, разматывая нить' },
    { fx: 520, fy: 1420, s: 1.7, label: 'И нашёл выход', on: '.out', off: '.in' },
  ],
  after: [{ fx: 540, fy: 1060, s: 1.02, ds: 1.06 }],
  extra: (T) => `tl.to('.thread', { attr: { 'stroke-dashoffset': 0 }, duration: ${(T.story[3] - T.story[2] - 0.05).toFixed(3)}, ease: 'power1.inOut' }, ${T.story[2]});`,
  info,
  cta: { lines: ['Иди', 'по нити'], accent: 1 },
  bioGlyph: '<circle r="20"/><path d="M-14,-10 Q0,0 14,-12 M-18,4 Q0,12 18,2 M18,10 Q40,30 20,40 Q0,46 -30,34"/>',
};
