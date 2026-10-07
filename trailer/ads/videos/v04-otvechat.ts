/**
 * 4. «Я перечитала билеты пять раз» — карандаш в тетради, библиотека.
 * История: США, 2006 — вспоминать полезнее, чем перечитывать («эффект тестирования»).
 */
import { ICON, books, chair, floorLine, lamp, person } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, set, shot, still, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.pencil;
const h = th.hist;
const A = person(th, { id: 'A', x: 230, floor: 1260, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'long', table: 1110, face: 'tired' });
const B = person(th, { id: 'B', x: 850, floor: 1260, pose: 'sit', f: -1, arms: ['table', 'lap'], hair: 'curly', glasses: true, table: 1110, hold: 'cards', face: 'neutral' });

const shelf = `
  <rect x="300" y="520" width="480" height="380" fill="${th.fill}"/>
  <path d="M300,647 H780 M300,773 H780"/>
  ${[0, 1, 2]
    .map((r) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((i) => {
          const x = 318 + i * 44 + (r % 2) * 10;
          const y = 520 + r * 126;
          const tall = (i * 7 + r * 3) % 4 === 0 ? 30 : 10;
          return `<rect x="${x}" y="${y + tall}" width="34" height="${126 - tall}" stroke-width="3"/>`;
        })
        .join(''),
    )
    .join('')}`;

const scene = `
  ${floorLine(1260)}
  ${shelf}
  ${chair(230, 1260, 1)}${chair(850, 1260, -1)}
  <path d="M330,1110 H750 M352,1110 V1260 M728,1110 V1260"/>
  ${books(430, 1110, 5)}
  ${lamp(660, 1110)}
  ${A.svg}${B.svg}`;

// Демо: карточки «?» переворачиваются в «✓», память растёт.
const [t0, t1, t2, t3] = T.demo;
const CARDS = [230, 540, 850];
const card = (i: number, x: number) => `
  <g transform="translate(${x} 960)">
    <g id="dfront${i}" opacity="0"><rect x="-120" y="-165" width="240" height="330" rx="18" fill="${th.fill}"/>${text(0, 40, 130, th.ink, '?')}</g>
    <g id="dback${i}"><rect x="-120" y="-165" width="240" height="330" rx="18" fill="${th.fill}" stroke="${th.accent}"/><g stroke="${th.accent}" stroke-width="10">${at(ICON.check, 0, 0, 2.6)}</g></g>
  </g>`;
const demoSvg = `
  ${CARDS.map((x, i) => card(i, x)).join('')}
  <rect x="110" y="1300" width="860" height="56" rx="28" fill="${th.fill}"/>
  <rect id="dbar" x="118" y="1308" width="844" height="40" rx="20" fill="${th.accent}" stroke="none"/>
  ${text(540, 1440, 48, th.ink, 'память')}`;
const flip = (i: number, t: number) =>
  [
    to(`#dfront${i}`, { scaleX: 0, transformOrigin: '50% 50%' }, t, 0.13, 'power1.in'),
    `tl.fromTo('#dback${i}', { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.13, ease: 'power1.out' }, ${(t + 0.13).toFixed(3)});`,
    to('#dbar', { scaleX: (i + 1) / 3 }, t + 0.13, 0.25, 'power2.out'),
  ].join(' ');
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1080, 1),
  set('[id^="dback"]', { scaleX: 0, transformOrigin: '50% 50%' }, t0),
  set('#dbar', { scaleX: 0.04, transformOrigin: '0% 50%' }, t0),
  ...CARDS.map((_, i) => `tl.fromTo('#dfront${i}', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, ${(t0 + 0.05 + i * 0.12).toFixed(3)});`),
  flip(0, t1),
  flip(1, t1 + 0.7),
  flip(2, t1 + 1.4),
  shot('#dcam', t2, t3 - t2, 540, 1110, 1.15),
].join('\n      ');

// ─── История: США, 2006 ────────────────────────────────────────────────────────

const campus = `
  <path d="M60,1440 H1020"/>
  <path d="M120,1440 V1120 H420 V1440 M660,1440 V1120 H960 V1440" fill="${h.fill}"/>
  <path d="M420,1440 V900 H660 V1440" fill="${h.fill}"/>
  <path d="M440,900 L540,780 L640,900 Z" fill="${h.fill}"/>
  <circle cx="540" cy="980" r="46" fill="${h.fill}"/><path d="M540,980 V950 M540,980 l22,12" stroke-width="4"/>
  <path d="M500,1440 V1300 Q540,1250 580,1300 V1440"/>
  ${[160, 260, 700, 800].map((x) => `<path d="M${x},1180 h60 v90 h-60 z M${x},1320 h60 v80 h-60 z" stroke-width="4"/>`).join('')}`;

const reading = `
  <path d="M60,1460 H1020"/>
  ${[260, 700]
    .map(
      (x) =>
        `${chair(x, 1460, 1)}<path d="M${x + 110},1300 H${x + 300} M${x + 130},1300 V1460 M${x + 280},1300 V1460"/>${still(h, { x, floor: 1460, pose: 'sit', f: 1, arms: ['table', 'lap'], table: 1300, hold: 'paper', face: 'neutral' })}`,
    )
    .join('')}`;

const split = `
  <path d="M540,800 V1500" stroke-dasharray="16 14"/>
  <path d="M60,1460 H1020"/>
  ${still(h, { x: 220, floor: 1460, pose: 'stand', f: 1, arms: ['front', 'front'], hold: 'book', face: 'tired' })}
  ${still(h, { x: 720, floor: 1460, pose: 'stand', f: 1, arms: ['chin', 'down'], face: 'think' })}
  <path d="M840,1000 q0,-80 90,-80 q90,0 90,80 q0,80 -90,80 l-40,30 l6,-34 q-56,-20 -56,-76 z" fill="${h.fill}"/>${text(930, 1030, 76, h.ink, '?')}
  ${text(300, 900, 40, h.ink, 'перечитывали')}${text(800, 900, 40, h.ink, 'вспоминали')}`;

const bars = `
  <path d="M140,1440 H940"/>
  <rect x="230" y="${1440 - 40 * 9}" width="220" height="${40 * 9}" fill="${h.fill}" stroke-dasharray="14 10"/>
  <rect x="630" y="${1440 - 61 * 9}" width="220" height="${61 * 9}" fill="${h.ink}"/>
  ${text(340, 1440 - 40 * 9 - 30, 76, h.ink, '40%')}${text(740, 1440 - 61 * 9 - 30, 76, h.ink, '61%')}
  ${text(340, 1510, 36, h.ink, 'перечитывали')}${text(740, 1510, 36, h.ink, 'вспоминали')}`;

const brain = `
  ${at(ICON.brain, 540, 1140, 7, 'stroke-width="1.2"')}
  <path d="M220,880 l-50,-40 M860,880 l50,-40 M180,1140 h-70 M900,1140 h70 M240,1400 l-50,40 M840,1400 l50,40" stroke-width="7"/>`;

const test = `
  <rect x="240" y="760" width="600" height="800" fill="${h.fill}"/>
  <path d="M300,850 H780" stroke-width="7"/>
  ${[0, 1, 2, 3, 4]
    .map((i) => {
      const y = 960 + i * 120;
      return `<rect x="300" y="${y - 30}" width="60" height="60"/><path d="M400,${y} H${720 - (i % 2) * 90}" stroke-width="4"/><path d="M308,${y - 2} l20,22 l40,-50" stroke-width="7"/>`;
    })
    .join('')}`;

export const v04: Video = {
  id: '04-otvechat',
  title: 'Реклама: вспоминать, а не перечитывать',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Я перечитала билеты<br>пять раз»', a: 'tired', b: 'neutral' },
    { shot: 'b', text: '«И как, отвечаешь?»', b: 'doubt' },
    { shot: 'a', text: '«Читаю — всё понятно.<br>Закрываю — пусто»', a: 'sad' },
    { shot: 'b', text: '«Узнавать и вспоминать —<br>разные вещи»', b: 'calm' },
    { shot: 'a', text: '«И что же делать?»', a: 'think' },
    { shot: 'b', text: '«Не перечитывай.<br>Отвечай»', b: 'cool' },
    { shot: 'wide', text: '«Каждый ответ<br>укрепляет память»', a: 'smile', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'США, 2006', art: campus },
    { label: 'Студенты читали<br>один и тот же текст', art: reading },
    { label: 'Одни только перечитывали,<br>другие — вспоминали', art: split },
    { label: 'Через неделю помнили:<br>40% против 61%', art: bars },
    { label: 'Вспоминать полезнее,<br>чем перечитывать', art: brain },
    { label: 'Это назвали<br>«эффектом тестирования»', art: test },
  ],
  table: {
    left: 'ПЕРЕЧИТЫВАТЬ',
    right: 'ОТВЕЧАТЬ',
    leftIcon: ICON.book,
    rightIcon: ICON.question,
    rows: [
      ['кажется, что знаешь', 'точно знаешь'],
      ['узнаёшь ответ', 'вспоминаешь ответ'],
      ['через неделю — 40%', 'через неделю — 61%'],
    ],
  },
  cta: ['Хватит', 'перечитывать', 'начни отвечать'],
  bioGlyph: ICON.question,
};
