/**
 * 3. «Я их не учила. Я их проехала» — светящиеся линии ночью, остановка автобуса.
 * История: Древняя Греция, легенда о Симониде — «метод мест»: память держится за места.
 */
import { ICON, bench, floorLine, moon, person, stars } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { DASH, at, draw, fadeIn, fadeOut, place, pop, shot, still, text } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.glow;
const h = th.hist;
const A = person(th, { id: 'A', x: 380, floor: 1300, pose: 'sit', seat: 92, f: 1, arms: ['lap', 'lap'], hair: 'curly', face: 'doubt' });
const B = person(th, { id: 'B', x: 860, floor: 1300, pose: 'stand', f: -1, arms: ['phone', 'down'], hair: 'long', face: 'smile' });

const scene = `
  ${floorLine(1300)}
  ${bench(250, 560, 1300)}
  <path d="M680,1300 V880"/><circle cx="680" cy="840" r="40" fill="${th.fill}"/>${text(680, 856, 44, th.ink, 'А')}
  ${moon(930, 600, 46, th.fill)}
  ${stars([[120, 640], [760, 560], [560, 700], [1010, 780]])}
  ${A.svg}${B.svg}`;

// Демо: на карте падают метки, маршрут проходит через все, «?» становится «✓».
const [t0, t1, t2, t3] = T.demo;
const PINS: [number, number][] = [
  [240, 1350],
  [540, 1050],
  [540, 750],
  [840, 1050],
];
const streets = [240, 540, 840].map((x) => `<path d="M${x},600 V1500"/>`).join('') + [750, 1050, 1350].map((y) => `<path d="M120,${y} H960"/>`).join('');
const pins = PINS.map(
  ([x, y], i) => `
  ${place(`dpin${i}`, x, y - 42, 1.3, `<path d="M0,34 C-22,6 -26,-6 -26,-12 A26,26 0 1 1 26,-12 C26,-6 22,6 0,34 Z" fill="${th.fill}"/><circle cy="-12" r="9" fill="${th.ink}" stroke="none"/>`, 'opacity="0"')}
  <g id="dq${i}" opacity="0">${text(x + 78, y - 70, 54, th.ink, '?')}</g>
  <g id="dk${i}" opacity="0" stroke="${th.accent}" stroke-width="7">${at(ICON.check, x + 78, y - 88, 0.9)}</g>`,
).join('');
const demoSvg = `
  <g stroke-width="3" opacity="0.45">${streets}</g>
  <path id="droute" d="M240,1350 V1050 H540 V750 H840 V1050" ${DASH} stroke="${th.accent}" stroke-width="9"/>
  ${pins}`;
const seg = (t2 - t1 - 0.15) / 4;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1050, 1),
  ...PINS.map((_, i) => `tl.fromTo('#dpin${i}', { opacity: 0, y: -160 }, { opacity: 1, y: 0, duration: 0.3, ease: 'bounce.out' }, ${(t0 + 0.05 + i * 0.16).toFixed(3)});`),
  ...PINS.map((_, i) => fadeIn(`#dq${i}`, t0 + 0.3 + i * 0.16, 0.12)),
  draw('#droute', t1, t2 - t1 - 0.15, 'none'),
  ...PINS.map((_, i) => fadeOut(`#dq${i}`, t1 + i * seg + 0.05, 0.08)),
  ...PINS.map((_, i) => pop(`#dk${i}`, t1 + i * seg + 0.08)),
  shot('#dcam', t2, t3 - t2, 860, 960, 1.9),
].join('\n      ');

// ─── История: Древняя Греция ───────────────────────────────────────────────────

const meander = (y: number) =>
  `<path d="M60,${y - 10} H1020 M60,${y + 60} H1020" stroke-width="4"/>` +
  Array.from({ length: 16 }, (_, i) => {
    const x = 80 + i * 60;
    return `<path d="M${x},${y + 45} V${y + 5} H${x + 40} V${y + 35} H${x + 18} V${y + 20}" stroke-width="4"/>`;
  }).join('');

const temple = `
  <path d="M160,1440 H920 M190,1400 H890 M220,1360 H860"/>
  ${[270, 380, 490, 590, 700, 810].map((x) => `<path d="M${x - 18},1360 V1040 M${x + 18},1360 V1040 M${x - 28},1040 h56"/>`).join('')}
  <path d="M220,1040 H860 V990 H220 Z" fill="${h.fill}"/>
  <path d="M200,990 L540,820 L880,990 Z" fill="${h.fill}"/><circle cx="540" cy="930" r="26"/>
  ${meander(1560)}`;

const collapse = `
  <path d="M160,1440 H920"/>
  ${[300, 780].map((x) => `<path d="M${x - 20},1440 V1080 M${x + 20},1440 V1080"/>`).join('')}
  <path d="M220,1080 H470 L500,1110 L460,1140 L220,1140 Z" fill="${h.fill}"/>
  <path d="M860,1080 H640 L600,1120 L650,1140 H860 Z" fill="${h.fill}"/>
  <g transform="rotate(18 540 1000)"><rect x="470" y="960" width="160" height="60" fill="${h.fill}"/></g>
  <g transform="rotate(-24 470 1230)"><rect x="430" y="1205" width="90" height="50" fill="${h.fill}"/></g>
  <g transform="rotate(30 640 1300)"><rect x="600" y="1280" width="80" height="44" fill="${h.fill}"/></g>
  <path d="M420,900 v60 M540,860 v70 M660,900 v60" stroke-width="4" stroke-dasharray="10 12"/>
  ${meander(1560)}`;

const poet = `
  <path d="M120,1440 H960"/>
  <path d="M560,1440 V1060 H920 V1440" fill="${h.fill}"/><path d="M540,1060 H940 L740,960 Z" fill="${h.fill}"/>
  <path d="M700,1060 l-30,90 l40,60 l-20,90 M820,1060 l20,80 l-30,70" stroke-width="4"/>
  ${still(h, { x: 280, floor: 1440, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'curly', beard: true, face: 'shock' })}
  ${meander(1560)}`;

const SEATS: [number, number][] = [
  [330, 1000], [470, 1000], [610, 1000], [750, 1000],
  [330, 1400], [470, 1400], [610, 1400], [750, 1400],
  [200, 1200], [880, 1200],
];
const feast = `
  <rect x="270" y="1080" width="540" height="240" rx="30" fill="${h.fill}"/>
  ${SEATS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="44" ${i % 3 === 1 ? `fill="${h.accent}" stroke="${h.accent}"` : `fill="${h.fill}"`}/>`).join('')}
  <path d="M360,1160 h50 M520,1230 h50 M680,1160 h50" stroke-width="4"/>
  ${meander(1560)}`;

const amphora = (x: number, y: number) => `<path d="M${x - 20},${y - 130} h40 M${x - 12},${y - 130} q0,30 -40,60 q-30,40 0,70 h104 q30,-30 0,-70 q-40,-30 -40,-60" fill="${h.fill}"/>`;
const lyre = (x: number, y: number) => `<path d="M${x - 40},${y} q-20,-80 0,-140 M${x + 40},${y} q20,-80 0,-140 M${x - 46},${y - 110} H${x + 46} M${x - 40},${y} H${x + 40} M${x - 14},${y} V${y - 110} M${x},${y} V${y - 110} M${x + 14},${y} V${y - 110}"/>`;
const scroll = (x: number, y: number) => `<rect x="${x - 40}" y="${y - 120}" width="80" height="120" fill="${h.fill}"/><path d="M${x - 50},${y - 120} h100 M${x - 50},${y} h100 M${x - 24},${y - 90} h48 M${x - 24},${y - 66} h48 M${x - 24},${y - 42} h36" stroke-width="4"/>`;
const loci = `
  <path d="M100,1400 H980"/>
  ${[140, 400, 680, 940].map((x) => `<path d="M${x - 16},1400 V960 M${x + 16},1400 V960 M${x - 26},960 h52"/>`).join('')}
  <path d="M100,940 H980"/>
  ${amphora(270, 1400)}${lyre(540, 1400)}${scroll(810, 1400)}
  ${[270, 540, 810].map((x, i) => text(x, 1490, 52, h.ink, String(i + 1))).join('')}
  ${meander(1560)}`;

const crossing = `
  <path d="M120,1050 H960 M120,1250 H960 M440,760 V1540 M640,760 V1540"/>
  <path d="M160,1150 H400 M680,1150 H920 M540,800 V1010 M540,1290 V1500" stroke-width="4" stroke-dasharray="24 18"/>
  ${[[300, 980], [760, 1330], [570, 900]].map(([x, y]) => at(`<path d="M0,34 C-22,6 -26,-6 -26,-12 A26,26 0 1 1 26,-12 C26,-6 22,6 0,34 Z" fill="${h.fill}"/><circle cy="-12" r="9" fill="${h.ink}"/>`, x, y, 1.4)).join('')}
  ${meander(1560)}`;

export const v03: Video = {
  id: '03-mesta',
  title: 'Реклама: метод мест',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Как ты запомнила<br>все 800 вопросов?»', a: 'doubt', b: 'smile' },
    { shot: 'b', text: '«Я их не учила.<br>Я их проехала»', b: 'cool' },
    { shot: 'a', text: '«В смысле — проехала?»', a: 'think' },
    { shot: 'b', text: '«Каждый вопрос —<br>на своём перекрёстке»', b: 'smile' },
    { shot: 'a', text: '«И ты всё помнишь?!»', a: 'shock' },
    { shot: 'b', text: '«Вспоминаю дорогу —<br>вспоминаю ответ»', b: 'calm' },
    { shot: 'wide', text: '«Так запоминали<br>ещё древние греки»', a: 'happy', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'Древняя Греция', art: temple },
    { label: 'По легенде, на пиру<br>обрушился потолок', art: collapse },
    { label: 'Поэт Симонид<br>за миг до этого вышел', art: poet },
    { label: 'Он вспомнил всех гостей —<br>по тому, кто где сидел', art: feast },
    { label: 'Так появился<br>«метод мест»', art: loci },
    { label: 'Память держится за места.<br>Даже за перекрёстки', art: crossing },
  ],
  table: {
    left: 'СПИСОК',
    right: 'ГОРОД',
    leftIcon: ICON.card,
    rightIcon: ICON.map,
    rows: [
      ['строчка за строчкой', 'улица за улицей'],
      ['всё сливается', 'у всего своё место'],
      ['вспоминаешь с трудом', 'вспоминаешь дорогу'],
    ],
  },
  cta: ['Хватит', 'учить списком', 'учи по дороге'],
  bioGlyph: ICON.pin,
};
