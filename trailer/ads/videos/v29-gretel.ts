/**
 * 29. «Вчера всё выучила — сегодня пусто» — комната, кровать, окно с луной.
 * История-гравюра: «Гензель и Гретель» (братья Гримм) — белые камешки вывели детей домой,
 * а хлебные крошки склевали птицы, и дети заблудились.
 * Инфографика: повторять через 1, 3 и 7 дней, а не всё за один вечер (так устроены повторы в игре).
 */
import { bed, floorLine, moon, person, windowFrame } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { fig, ground, sky } from '../etch.ts';
import { band, bird, cottage, etree, starDots } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 112, f: 1, arms: ['lap', 'down'], hair: 'long', face: 'sad' });
const B = person(DLG, { id: 'B', x: 850, floor: 1300, pose: 'stand', f: -1, arms: ['down', 'hip'], hair: 'spiky', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${windowFrame(470, 600, 220, 260, moon(530, 670, 34, C.night))}
  ${bed(160, 560, 1188, 1300, C.night)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const pebbles = [[300, 860], [340, 900], [400, 950], [450, 1000], [470, 1060], [455, 1120], [430, 1180], [425, 1240]]
  .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${9 - i * 0.2}" ry="6" fill="${C.paper}" stroke-width="2.5"/><path d="M${x - 14},${y - 10} l-6,-6 M${x + 14},${y - 10} l6,-6" stroke-width="2"/>`)
  .join('');
const crumbs = [[470, 1320], [520, 1380], [560, 1440], [610, 1500], [660, 1560], [700, 1620], [760, 1680], [820, 1730]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${C.ink}"/><circle cx="${x + 12}" cy="${y + 6}" r="3" fill="${C.ink}"/>`)
  .join('');
const birds = `${bird(520, 1395, 0.9, 1)}${bird(640, 1540, 0.9, -1)}${bird(730, 1630, 0.85, 1)}`;
const flying = `<path d="M560,1300 q16,-18 32,0 q16,-18 32,0 M680,1240 q14,-16 28,0 q14,-16 28,0 M780,1320 q16,-18 32,0 q16,-18 32,0" stroke-width="4"/>`;

const kids = `
  ${fig({ x: 860, y: 1650, s: 0.7, f: -1, dress: 'dress', pat: 'a30', hair: 'braids', arm: [40, 20], arm2: [70, 30], nod: -10, face: 'sad' })}
  ${fig({ x: 950, y: 1640, s: 0.74, f: -1, dress: 'tunic', pat: 'a120', legs: 'c90', hair: 'short', arm: [30, 10], arm2: [150, 30], nod: -20, face: 'shout' })}`;

const tableau = `
  ${sky()}
  <rect x="-400" y="-400" width="1880" height="1100" fill="url(#a0)" stroke="none"/>
  ${starDots(-200, -100, 1500, 700, 70, 13)}
  <circle cx="860" cy="360" r="80" fill="${C.paper}" stroke-width="4"/><circle cx="836" cy="340" r="14" stroke-width="2"/><circle cx="886" cy="390" r="9" stroke-width="2"/>
  ${ground(700)}
  ${etree(80, 720, 340, 2)}${etree(560, 700, 300, 3)}${etree(760, 720, 360, 4)}${etree(990, 700, 320, 5)}
  ${cottage(260, 820, 200)}
  ${band([[290, 830, 26], [380, 940, 36], [470, 1060, 46], [430, 1240, 58], [560, 1440, 70], [700, 1600, 80], [860, 1760, 90], [980, 1900, 100]], 'c0')}
  ${pebbles}
  <g class="st-b">${crumbs}${birds}</g>
  <g class="st-a">${flying}</g>
  ${etree(120, 1300, 620, 6, true)}${etree(960, 1260, 600, 7)}
  ${etree(70, 1820, 720, 8)}
  ${etree(1130, 1960, 700, 9, true)}
  ${kids}`;

// ─── Инфографика: 1 · 3 · 7 ───────────────────────────────────────────────────

const nodes = [
  [160, 'ОШИБКА'],
  [400, '+1 ДЕНЬ'],
  [660, '+3 ДНЯ'],
  [920, '+7 ДНЕЙ'],
] as const;
const line = `<path d="M160,820 H920" stroke="#fff" stroke-width="6"/>${nodes.map(([x, t], i) => `<g class="nw" id="nw${i}"><circle cx="${x}" cy="820" r="30" fill="#000" stroke="#fff" stroke-width="6"/><text x="${x}" y="900" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">${t}</text></g><circle class="no" id="no${i}" cx="${x}" cy="820" r="30" fill="${C.accent}" stroke="${C.accent}" stroke-width="6"/>`).join('')}`;

const info = {
  html: `
    ${itext('i-h', 560, 40, 'ЧТОБЫ НЕ ЗАБЫТЬ —')}
    ${isvg(line)}
    ${itext('i-n', 980, 120, '1 · 3 · 7', C.accent, 900)}
    ${itext('i-p', 1130, 46, 'ПОВТОРЫ ЧЕРЕЗ ДНИ')}
    ${itext('i-s', 1250, 46, 'А НЕ ВСЁ<br>ЗА ОДИН ВЕЧЕР', C.dim)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...nodes.map((_, i) => pop(`#nw${i}`, t[0] + 0.08 * i)),
      `tl.set('.no', { opacity: 0 }, 0);`,
      ...nodes.map((_, i) => `tl.set('#no${i}', { opacity: 1 }, ${(t[1] + 0.12 * i).toFixed(3)});`),
      pop('#i-n', t[1], 0.22),
      show('#i-p', t[1] + 0.2),
      show('#i-s', t[2]),
    ].join('\n      '),
};

export const v29: Video3 = {
  id: '29-gretel',
  title: 'Реклама: Гензель и Гретель',
  format: 'short',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Вчера всё выучила.<br>Сегодня — пусто»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Ты учила<br>за один вечер?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Ну да. Всё разом…»', cams: ['a', [580, 730, 2.4]], a: 'tired' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1060, s: 1.0, label: 'Гензель и Гретель' },
    { fx: 380, fy: 980, s: 1.7, label: 'Камешки вывели их домой' },
    { fx: 630, fy: 1520, s: 1.9, label: 'А крошки склевали птицы' },
    { fx: 860, fy: 1560, s: 2.0, label: 'И они заблудились' },
  ],
  after: [{ fx: 600, fy: 1300, s: 1.2, ds: 1.08 }],
  info,
  cta: { lines: ['Не крошки,', 'а камешки'], accent: 1 },
  bioGlyph: '<ellipse cx="-18" cy="10" rx="16" ry="11"/><ellipse cx="18" cy="-4" rx="14" ry="10"/><ellipse cx="2" cy="-30" rx="10" ry="7"/>',
};
