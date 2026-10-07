/**
 * 6. «Опять в телефоне?!» — комикс: папа ругается на дочь.
 * История: США, 2007 — хирурги, которые играли в видеоигры, ошибались реже и работали быстрее.
 */
import { ICON, beanbag, floorLine, person } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, shot, still, text } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.comic;
const h = th.hist;
const A = person(th, { id: 'A', x: 230, floor: 1300, pose: 'stand', f: 1, arms: ['point', 'hip'], mustache: true, glasses: true, face: 'angry' });
const B = person(th, { id: 'B', x: 820, floor: 1300, pose: 'beanbag', f: -1, arms: ['phone', 'lap'], hair: 'ponytail', face: 'relaxed' });

const scene = `
  ${floorLine(1300)}
  <rect x="430" y="600" width="250" height="250" fill="${th.fill}"/><path d="M555,600 V850 M430,725 H680" stroke-width="5"/>
  <path d="M60,1300 V1120 H170 V1300 M60,1180 H170" stroke-width="5"/>
  ${beanbag(820, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// Демо: ошибки по дням тают.
const [t0, , t2, t3] = T.demo;
const ERR = [26, 19, 13, 7, 2];
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт'];
const demoSvg = `
  <path d="M130,1420 H950"/>
  ${text(240, 700, 50, th.ink, 'ошибки')}
  ${ERR.map((n, i) => {
    const x = 220 + i * 160;
    const hgt = n * 24;
    const last = i === ERR.length - 1;
    return `<g id="dbar${i}"><rect x="${x - 55}" y="${1420 - hgt}" width="110" height="${hgt}" fill="${last ? th.accent : th.fill}"/>${text(x, 1420 - hgt - 26, 48, th.ink, String(n))}</g>${text(x, 1490, 44, th.ink, DAYS[i])}`;
  }).join('')}`;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1060, 1),
  ...ERR.map(
    (_, i) =>
      `tl.fromTo('#dbar${i}', { opacity: 0, scaleY: 0, transformOrigin: '50% 100%' }, { opacity: 1, scaleY: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${(t0 + 0.1 + i * ((t2 - t0 - 0.5) / 5)).toFixed(3)});`,
  ),
  shot('#dcam', t2, t3 - t2, 780, 1300, 1.9),
].join('\n      ');

// ─── История: США, 2007 ────────────────────────────────────────────────────────

const hospital = `
  <path d="M60,1460 H1020"/>
  <path d="M180,1460 V960 H900 V1460" fill="${h.fill}"/>
  <circle cx="540" cy="860" r="90" fill="${h.fill}"/><path d="M540,810 V910 M490,860 H590" stroke-width="22"/>
  ${[240, 380, 620, 760].map((x) => `<rect x="${x}" y="1020" width="80" height="90"/><rect x="${x}" y="1170" width="80" height="90"/>`).join('')}
  <path d="M470,1460 V1320 H610 V1460"/>`;

const mask = (x: number, y: number) => `<path d="M${x - 36},${y + 4} H${x + 36} V${y + 36} Q${x},${y + 52} ${x - 36},${y + 36} Z" fill="${h.fill}"/>`;
const surgeon = `
  <path d="M60,1480 H1020"/>
  ${still(h, { x: 300, floor: 1480, pose: 'stand', f: 1, arms: ['front', 'front'], hair: 'scarf', face: 'calm' })}
  ${mask(302, 1138)}
  <path d="M520,1230 H900 V1480 M540,1230 V1480"/>
  <path d="M560,1230 L620,1120 H860 L900,1230 Z" fill="${h.fill}"/>
  <path d="M400,1220 L680,1170 M400,1250 L760,1180" stroke-width="5"/>`;

const gamer = `
  ${at(ICON.gamepad, 400, 1100, 5, 'stroke-width="1.4"')}
  <circle cx="800" cy="1300" r="130" fill="${h.fill}"/><path d="M800,1300 V1210 M800,1300 L860,1340" stroke-width="8"/>
  ${text(540, 1560, 64, h.accent, '3+ ч в неделю')}`;

const minus37 = `
  ${text(540, 1200, 260, h.accent, '−37%')}
  ${text(540, 1340, 64, h.ink, 'ошибок')}
  ${[[220, 900], [860, 920], [260, 1480], [820, 1460]].map(([x, y]) => `<path d="M${x - 30},${y - 30} l60,60 M${x + 30},${y - 30} l-60,60" stroke-width="9"/>`).join('')}`;

const stopwatch = `
  <circle cx="540" cy="1120" r="230" fill="${h.fill}"/><path d="M540,890 V840 M500,840 H580 M700,950 l30,-30" stroke-width="10"/>
  <path d="M540,1120 V960 M540,1120 L640,1180" stroke-width="10"/>
  <path d="M180,1050 H260 M140,1120 H260 M180,1190 H260" stroke-width="8"/>
  ${text(540, 1500, 88, h.accent, 'на 27% быстрее')}`;

const dumbbell = `
  <path d="M300,1150 H780" stroke-width="20"/>
  <rect x="200" y="980" width="90" height="340" rx="20" fill="${h.accent}" stroke="${h.accent}"/><rect x="120" y="1040" width="80" height="220" rx="20" fill="${h.fill}"/>
  <rect x="790" y="980" width="90" height="340" rx="20" fill="${h.accent}" stroke="${h.accent}"/><rect x="880" y="1040" width="80" height="220" rx="20" fill="${h.fill}"/>
  ${at(ICON.gamepad, 540, 1150, 2.2, `stroke-width="3" fill="${h.fill}"`)}`;

export const v06: Video = {
  id: '06-hirurgi',
  title: 'Реклама: хирурги и игры',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Опять в телефоне?!»', a: 'angry', b: 'relaxed' },
    { shot: 'b', text: '«Я учу ПДД, пап»', b: 'calm' },
    { shot: 'a', text: '«В игре?! Не смеши»', a: 'doubt' },
    { shot: 'b', text: '«Хирурги, которые играют,<br>оперируют лучше»', b: 'cool' },
    { shot: 'a', text: '«Это кто сказал?!»', a: 'shock' },
    { shot: 'b', text: '«Учёные. В 2007 году»', b: 'smile' },
    { shot: 'wide', text: '«А моя игра —<br>все 800 билетов»', a: 'think', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'США, 2007', art: hospital },
    { label: 'Учёные проверили хирургов<br>на тренажёре операций', art: surgeon },
    { label: 'Кто играл в видеоигры<br>больше 3 часов в неделю,', art: gamer },
    { label: 'ошибался на 37% реже', art: minus37 },
    { label: 'и работал на 27% быстрее', art: stopwatch },
    { label: 'Правильная игра —<br>это тренировка', art: dumbbell },
  ],
  table: {
    left: 'ИГРЫ ПРОСТО ТАК',
    right: 'ИГРА ПО БИЛЕТАМ',
    leftIcon: ICON.gamepad,
    rightIcon: ICON.card,
    rows: [
      ['убил вечер', 'выучил билеты'],
      ['родители ругают', 'родители рады'],
      ['экзамен — мимо', 'экзамен — сдан'],
    ],
  },
  cta: ['Хватит', 'прятать телефон', 'играй с пользой'],
  bioGlyph: ICON.trophy,
};
