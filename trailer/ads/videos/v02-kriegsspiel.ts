/**
 * 2. «Игрой экзамен не сдашь!» — тушь на бумаге. Мама ругается, что сын играет перед экзаменом.
 * История: Пруссия, 1824 — офицеров учили войне игрой на карте (Kriegsspiel).
 */
import { ICON, couch, floorLine, person } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { DASH, draw, fadeIn, fadeOut, place, pop, shot, still, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.ink;
const h = th.hist;
const A = person(th, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 100, f: 1, arms: ['front', 'lap'], hair: 'spiky', hold: 'gamepad', face: 'relaxed' });
const B = person(th, { id: 'B', x: 810, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'hip'], hair: 'bun', face: 'angry' });

const scene = `
  ${floorLine(1300)}
  <path d="M60,1300 V860 M20,1300 h80 M20,860 h80 l-16,-70 h-48 z" fill="${th.fill}"/>
  <rect x="620" y="560" width="260" height="280"/><path d="M750,560 V840 M620,700 H880" stroke-width="4"/>
  ${couch(160, 560, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// Демо: геймпад превращается в руль.
const [t0, t1, t2, t3] = T.demo;
const demoSvg = `
  ${place('dpad', 540, 900, 5, ICON.gamepad, 'stroke-width="1.3" opacity="0"')}
  ${place('dwheel', 540, 900, 5.5, ICON.wheel, `stroke-width="1.2" stroke="${th.accent}" opacity="0"`)}
  <path id="droad" d="M300,1500 L470,1180 M780,1500 L610,1180 M540,1480 V1440 M540,1390 V1350 M540,1300 V1270 M540,1230 V1210" ${DASH} stroke-width="5" opacity="0.6"/>
  ${text(540, 1300, 56, th.ink, 'играешь', 'id="dw1" opacity="0"')}
  ${text(540, 1300, 56, th.accent, 'едешь', 'id="dw2" opacity="0"')}`;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1000, 1),
  pop('#dpad', t0 + 0.05, 0.25, 0.6),
  fadeIn('#dw1', t0 + 0.25),
  to('#dpad', { rotation: 90, opacity: 0, transformOrigin: '50% 50%' }, t1, 0.3, 'power2.in'),
  fadeOut('#dw1', t1, 0.15),
  `tl.fromTo('#dwheel', { opacity: 0, rotation: -120, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, rotation: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, ${(t1 + 0.2).toFixed(3)});`,
  fadeIn('#dw2', t1 + 0.35),
  to('#dwheel', { rotation: -18 }, t1 + 0.7, 0.45),
  to('#dwheel', { rotation: 14 }, t1 + 1.15, 0.5),
  to('#dwheel', { rotation: 0 }, t1 + 1.65, 0.4),
  to('#dw2', { y: 380 }, t1 + 0.6, 0.01),
  draw('#droad', t1 + 0.6, 0.6),
  shot('#dcam', t2, t3 - t2, 540, 960, 1.55),
].join('\n      ');

// ─── История: Пруссия, 1824 ────────────────────────────────────────────────────

const palace = `
  <path d="M60,1420 H1020"/>
  <path d="M140,1420 V1020 H940 V1420" fill="${h.fill}"/>
  <path d="M110,1020 H970 M380,1020 L540,890 L700,1020 Z" fill="${h.fill}"/>
  ${[410, 464, 518, 572, 626, 680].map((x) => `<path d="M${x - 10},1040 V1420"/>`).join('')}
  ${[180, 260, 760, 840].map((x) => `<rect x="${x}" y="1080" width="46" height="90"/><rect x="${x}" y="1240" width="46" height="90"/>`).join('')}
  <path d="M540,890 V770 M540,774 h70 l-16,22 l16,22 h-70" fill="${h.fill}"/>`;

const mapTable = `
  <path d="M330,1150 L1010,1150 L1060,1330 L280,1330 Z" fill="${h.fill}"/>
  <path d="M300,1330 V1500 M1040,1330 V1500"/>
  <path d="M420,1180 C520,1230 600,1170 700,1240 S900,1300 980,1270" stroke-width="3" stroke-dasharray="10 8"/>
  <path d="M380,1300 q60,-40 120,-10 q60,30 120,0" stroke-width="3"/>
  ${[[520, 1190], [600, 1260], [820, 1200]].map(([x, y]) => `<rect x="${x}" y="${y}" width="40" height="22" fill="${h.ink}"/>`).join('')}
  ${[[700, 1290], [890, 1290]].map(([x, y]) => `<rect x="${x}" y="${y}" width="40" height="22" fill="${h.accent}" stroke="${h.accent}"/>`).join('')}`;
const officer = still(h, { x: 190, floor: 1500, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'cap', mustache: true, face: 'smile' });

const general = `<g transform="translate(540 1350) scale(2) translate(-540 -1350)">
  ${still(h, { x: 540, floor: 1560, pose: 'stand', f: 1, arms: ['up', 'hip'], mustache: true, face: 'shock' })}</g>`;

const boxes = Array.from({ length: 12 }, (_, i) => {
  const x = 170 + (i % 4) * 190;
  const y = 1410 - Math.floor(i / 4) * 150;
  return `<rect x="${x}" y="${y - 130}" width="170" height="130" fill="${h.fill}"/><path d="M${x},${y - 100} H${x + 170}" stroke-width="3"/><path d="M${x + 65},${y - 60} l40,40 M${x + 105},${y - 60} l-40,40" stroke-width="4"/>`;
}).join('');

const mapTop = `
  <rect x="150" y="820" width="780" height="700" fill="${h.fill}"/>
  <ellipse cx="380" cy="1040" rx="150" ry="100" stroke-width="3"/><ellipse cx="380" cy="1040" rx="90" ry="56" stroke-width="3"/><ellipse cx="380" cy="1040" rx="34" ry="20" stroke-width="3"/>
  <path d="M150,1300 C350,1240 500,1380 700,1300 S880,1220 930,1260" stroke-width="10"/>
  ${[[560, 980], [640, 1060], [720, 960]].map(([x, y]) => `<rect x="${x}" y="${y}" width="56" height="30" fill="${h.ink}"/>`).join('')}
  <g transform="translate(420 1420) rotate(-30)"><rect x="-28" y="-15" width="56" height="30" fill="${h.accent}" stroke="${h.accent}"/></g>
  <path d="M400,1385 l40,40 M440,1385 l-40,40" stroke="${h.ink}" stroke-width="5"/>
  <rect x="760" y="1360" width="90" height="90" rx="12" fill="${h.fill}"/>${[[785, 1385], [825, 1425], [805, 1405]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${h.ink}"/>`).join('')}`;

const board = `
  <rect x="160" y="820" width="760" height="760" rx="20" fill="${h.fill}"/>
  <path d="M160,1130 H920 M160,1270 H920 M470,820 V1580 M610,820 V1580"/>
  <path d="M200,1200 H440 M640,1200 H880 M540,860 V1100 M540,1300 V1540" stroke-width="4" stroke-dasharray="22 18"/>
  <g transform="translate(540 1420)"><rect x="-34" y="-58" width="68" height="116" rx="16" fill="${h.accent}" stroke="${h.accent}"/><path d="M-22,-30 h44 M-22,30 h44" stroke="${h.fill}" stroke-width="5"/></g>
  <path d="M700,1090 V990"/><path d="M630,990 L700,870 L770,990 Z" fill="${h.fill}"/>${text(700, 975, 64, h.ink, '!')}
  <rect x="250" y="1360" width="110" height="110" rx="14" fill="${h.fill}" transform="rotate(-12 305 1415)"/>${[[280, 1390], [330, 1440], [305, 1415]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${h.ink}"/>`).join('')}`;

export const v02: Video = {
  id: '02-kriegsspiel',
  title: 'Реклама: игра на карте',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Опять играешь?<br>Через неделю экзамен!»', a: 'relaxed', b: 'angry' },
    { shot: 'a', text: '«Мам, я к нему<br>и готовлюсь»', a: 'calm' },
    { shot: 'b', text: '«Игрой экзамен не сдашь!»', b: 'angry' },
    { shot: 'a', text: '«Прусские генералы<br>думали иначе»', a: 'cool' },
    { shot: 'b', text: '«Какие ещё генералы?!»', b: 'shock' },
    { shot: 'wide', text: '«Их учили войне —<br>игрой на карте»', a: 'smile', b: 'doubt' },
    { shot: 'b', text: '«…Ладно. Покажешь?»', b: 'think' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'Пруссия, 1824', art: palace },
    { label: 'Лейтенант фон Райсвиц<br>показал игру на карте', art: `${mapTable}${officer}` },
    { label: 'Начальник штаба:<br>«Это не игра. Это школа войны!»', art: general },
    { label: 'Король велел выдать<br>игру каждому полку', art: boxes },
    { label: 'Ошибались на карте —<br>а не в бою', art: mapTop },
    { label: 'Сегодня игрой<br>учат и ПДД', art: board },
  ],
  table: {
    left: 'УЧЕБНИК',
    right: 'ИГРА',
    leftIcon: ICON.book,
    rightIcon: ICON.gamepad,
    rows: [
      ['засыпаешь над ним', 'не оторваться'],
      ['читаешь правила', 'применяешь правила'],
      ['ошибка — двойка', 'ошибка — урок'],
    ],
  },
  cta: ['Хватит', 'читать учебник', 'начни играть'],
  bioGlyph: ICON.gamepad,
};
