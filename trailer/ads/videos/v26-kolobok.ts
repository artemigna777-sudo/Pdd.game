/**
 * 26. «Я выучил все ответы наизусть» — кафе, тарелка с булочками.
 * История-гравюра: сказка о Колобке — ушёл от всех, но лиса похвалила песню и съела его.
 * Инфографика: на экзамене 1 ошибка — +5 вопросов, и в них ошибаться нельзя (правила ГИБДД).
 */
import { chair, floorLine, person, table } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { ground, sky, sun } from '../etch.ts';
import { band, bear, cottage, etree, fox, hare, kolobok, note, wolf } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['table', 'down'], table: 1170, hair: 'spiky', face: 'cool' });
const B = person(DLG, { id: 'B', x: 790, floor: 1300, pose: 'sit', seat: 110, f: -1, arms: ['table', 'down'], table: 1170, hair: 'bun', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${chair(300, 1300, 1, 110)}${chair(790, 1300, -1, 110)}
  ${table(430, 660, 1170, 1300)}
  <path d="M480,1162 Q545,1180 610,1162" stroke-width="4"/>
  <circle cx="520" cy="1136" r="24" stroke-width="4"/><circle cx="568" cy="1136" r="24" stroke-width="4"/><circle cx="544" cy="1100" r="24" stroke-width="4"/>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const path = band([[520, 2050, 190], [500, 1800, 160], [600, 1520, 130], [470, 1250, 100], [560, 1000, 70], [500, 790, 40]], 'c0');
const foxAt = { x: 760, y: 1820, s: 1.15 };

const tableau = `
  ${sky()}
  ${sun(880, 380, 80)}
  ${ground(720)}
  ${etree(120, 760, 360, 3)}${etree(330, 740, 300, 5)}${etree(800, 750, 320, 6)}${etree(990, 770, 380, 7)}
  ${cottage(520, 780, 170)}
  ${path}
  ${bear(250, 1060, 0.7, 1)}
  ${etree(940, 1080, 460, 8)}
  ${wolf(860, 1300, 0.85, -1)}
  ${etree(70, 1420, 520, 9)}
  ${hare(250, 1560, 0.95, 1)}
  <g class="roll">
    <g transform="translate(540 1400)">${kolobok(44)}</g>
    <path d="M600,1440 q30,10 50,40 M610,1410 q40,10 66,44" stroke-width="4"/>
    ${note(450, 1300, 1)}${note(620, 1300, 0.85)}
  </g>
  ${etree(1010, 1720, 560, 10)}
  <g class="nose" opacity="0">${fox(foxAt.x, foxAt.y, foxAt.s, -1, { nose: `<g transform="translate(-8 -6)">${kolobok(40)}</g>` })}${note(520, 1460, 1.1)}${note(470, 1380, 0.9)}</g>
  <g class="fox0">${fox(foxAt.x, foxAt.y, foxAt.s, -1)}</g>
  <g class="gulp" opacity="0">${fox(foxAt.x, foxAt.y, foxAt.s, -1, { licking: true })}<circle cx="580" cy="1600" r="6" fill="${C.ink}"/><circle cx="600" cy="1650" r="4" fill="${C.ink}"/><circle cx="560" cy="1680" r="5" fill="${C.ink}"/></g>`;

// ─── Инфографика: 1 ошибка → +5 ───────────────────────────────────────────────

const five = Array.from({ length: 5 }, (_, i) => `<rect class="fw" id="fw${i}" x="${540 + (i - 2) * 130 - 50}" y="840" width="100" height="100" rx="14" fill="none" stroke="#fff" stroke-width="6"/>`).join('');

const info = {
  html: `
    ${itext('i-h', 440, 40, 'НА ЭКЗАМЕНЕ')}
    ${itext('i-n', 540, 130, '1 ОШИБКА', C.accent, 900)}
    ${isvg(five)}
    ${itext('i-p', 990, 96, '+5 ВОПРОСОВ', '#fff', 900)}
    ${itext('i-s', 1160, 46, 'И ОШИБИТЬСЯ В НИХ<br>УЖЕ НЕЛЬЗЯ', C.accent)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      pop('#i-n', t[0] + 0.15, 0.22),
      ...Array.from({ length: 5 }, (_, i) => pop(`#fw${i}`, t[1] + 0.05 * i)),
      pop('#i-p', t[1] + 0.1, 0.22),
      show('#i-s', t[2]),
    ].join('\n      '),
};

export const v26: Video3 = {
  id: '26-kolobok',
  title: 'Реклама: Колобок',
  format: 'short',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Я выучил все ответы<br>наизусть»', cams: ['wide', 'a'], a: 'cool', b: 'neutral' },
    { text: '«А если вопрос<br>с подвохом?»', cams: ['b', [544, 1130, 2.8]], b: 'doubt' },
    { text: '«…С каким подвохом?»', cams: ['a', 'a'], a: 'shock' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1060, s: 1.0, label: 'Сказка о Колобке' },
    { fx: 540, fy: 1300, s: 1.45, label: 'Он ушёл от всех' },
    { fx: 640, fy: 1560, s: 1.9, label: 'Но лиса похвалила песню', on: '.nose', off: '.roll, .fox0' },
    { fx: 660, fy: 1600, s: 2.3, label: 'И съела его', on: '.gulp', off: '.nose' },
  ],
  after: [{ fx: 560, fy: 1300, s: 1.25, ds: 1.08 }],
  info,
  cta: { lines: ['Не попадись', 'лисе'], accent: 1 },
  bioGlyph: '<circle r="30"/><path d="M-12,8 q12,12 24,0"/><circle cx="-10" cy="-8" r="3"/><circle cx="10" cy="-8" r="3"/>',
};
