/**
 * 21. «Сегодня теория, а я не готовился» — кухня утром.
 * История-гравюра: миф об Икаре — взлетел слишком высоко, солнце растопило воск, и он упал в море.
 * Инфографика: 6 из 10 не сдают теорию с первого раза (Россия, 2024).
 */
import { chair, clockFace, floorLine, person, table, windowFrame } from '../draw.ts';
import { C, DLG, icon, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, feather, fig, front, rock, sea, ship, sky, sun, birds, sh, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['table', 'down'], table: 1170, hold: 'cup', hair: 'spiky', face: 'cool' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'bun', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${windowFrame(60, 560, 240, 250, `<circle cx="120" cy="620" r="24" stroke-width="4"/><path d="M120,580 v-12 M120,660 v12 M80,620 h-12 M160,620 h12 M92,592 l-8,-8 M148,648 l8,8 M92,648 l-8,8 M148,592 l8,-8" stroke-width="3"/>`)}
  ${clockFace(560, 760, 48, 8, 0, C.night)}
  ${chair(300, 1300, 1, 110)}
  ${table(420, 680, 1170, 1300)}
  <g transform="translate(570 1150) rotate(-6)"><rect x="-56" y="-14" width="112" height="22" rx="3" fill="${C.night}"/><path d="M-46,-3 h92" stroke-width="3"/></g>
  <text x="570" y="1126" text-anchor="middle" font-size="22" font-weight="800" fill="${C.line}" stroke="none">БИЛЕТЫ</text>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const pot = `
  <path d="M296,1166 L318,1124 M352,1166 L334,1124" stroke-width="4"/>
  <path d="M312,1150 q8,-22 14,-4 q6,-24 14,2" stroke-width="3"/>
  ${sh('M290,1086 Q292,1128 326,1128 Q360,1128 362,1086 Z', 'b0')}<ellipse cx="326" cy="1086" rx="36" ry="9" fill="${C.paper}" stroke-width="3"/>
  <path d="M296,1088 q2,14 6,16 M350,1088 q-2,12 -6,18" stroke-width="3"/>`;

const daedalus = (sad: boolean) =>
  fig({
    x: 190, y: 968, s: 0.95, f: 1, dress: 'robe', pat: 'a120', sleeve: 'c60', hair: 'bald', beard: true,
    ...(sad
      ? { lean: 20, nod: 26, arm: [120, 146] as [number, number], arm2: [110, 150] as [number, number], face: 'closed' as const }
      : { nod: -30, arm: [150, 10] as [number, number], arm2: [70, 40] as [number, number], face: 'shout' as const, hand2: '' }),
  });

const flyer = front({ x: 600, y: 720, s: 0.9, rot: 28, arms: [118, 6], legs: [4, 10], dress: 'tunic', pat: 'a30', hair: 'curly', wings: 9 });
const faller = front({ x: 690, y: 1360, s: 0.85, rot: 168, arms: [40, 30], legs: [10, 30], dress: 'tunic', pat: 'a30', hair: 'curly', face: 'shout', wings: 3 });

const drops = [[640, 520], [690, 560], [600, 580], [720, 610], [660, 640]]
  .map(([x, y]) => `<path d="M${x},${y} q-7,12 0,16 q7,-4 0,-16 z" fill="${C.ink}"/>`)
  .join('');

const falling = [
  [690, 860, 40], [610, 980, -30], [740, 1080, 70], [640, 1200, 10], [720, 1290, -50], [600, 1420, 30],
].map(([x, y, a], i) => `<g id="ff${i}">${feather(x, y, a, 70)}</g>`).join('');

const floating = [[560, 1590, 100], [800, 1650, 80], [640, 1700, 95], [910, 1720, 70]]
  .map(([x, y, a]) => feather(x, y, a, 60))
  .join('');

const legs = `
  <path d="M686,1600 L672,1500 L716,1430" stroke="${C.ink}" stroke-width="32"/><path d="M686,1600 L672,1500 L716,1430" stroke="${C.paper}" stroke-width="26"/>
  <path d="M722,1600 L744,1490 L792,1450" stroke="${C.ink}" stroke-width="32"/><path d="M722,1600 L744,1490 L792,1450" stroke="${C.paper}" stroke-width="26"/>
  <path d="M706,1424 l22,-8 M786,1444 l22,-6" stroke-width="18"/>
  ${wh('M610,1606 q30,-34 60,-6 q20,-30 50,-4 q30,-30 60,0 q28,-24 54,6 q-60,14 -224,4 Z')}
  <path d="M600,1560 l-14,-18 M626,1540 l-4,-22 M800,1544 l10,-20 M824,1566 l18,-12" stroke-width="3"/>
  <ellipse cx="704" cy="1616" rx="150" ry="20" stroke-width="3"/><ellipse cx="704" cy="1626" rx="210" ry="30" stroke-width="2"/>`;

const tableau = `
  ${sky()}
  ${cloud(170, 640, 300)}${cloud(960, 1000, 240)}
  <path d="${birds([[420, 330], [470, 372], [380, 392]])}" stroke-width="3"/>
  ${sun(820, 380, 110)}
  ${sea(1560)}
  ${ship(890, 1590, 0.9)}
  ${rock('cliff', 'M-80,1190 L60,1172 L250,1166 L340,1174 L384,1250 L414,1420 L456,1640 L-80,1640 Z', [-90, 1150, 560, 500], 96, 21)}
  ${pot}
  ${feather(380, 1150, 110, 50)}${feather(420, 1160, 70, 44)}${feather(250, 1162, 95, 40)}
  <g class="st-b">${daedalus(false)}</g>
  <g class="st-a">${daedalus(true)}</g>
  <g class="st-b fly">${flyer}${drops}</g>
  <g class="st-b">${falling}</g>
  <g class="fall" opacity="0">${faller}</g>
  <g class="st-a">${legs}${floating}</g>`;

// ─── Инфографика: 6 из 10 ─────────────────────────────────────────────────────

const xs = [190, 365, 540, 715, 890];
const people = (color: string, cls: string, n: number) =>
  Array.from({ length: n }, (_, i) => `<g class="${cls}" id="${cls}${i}">${icon(xs[i % 5], i < 5 ? 620 : 880, 1.45, color)}</g>`).join('');

const info = {
  html: `
    ${itext('i-h', 450, 40, 'ТЕОРИЮ В ГИБДД')}
    ${isvg(`${people('#fff', 'pw', 10)}${people(C.accent, 'po', 6)}`)}
    ${itext('i-n', 1110, 140, '6 ИЗ 10', C.accent, 900)}
    ${itext('i-s', 1300, 46, 'НЕ СДАЮТ<br>С ПЕРВОГО РАЗА')}
    ${itext('i-y', 1470, 30, 'РОССИЯ, 2024', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 10 }, (_, i) => pop(`#pw${i}`, t[0] + 0.03 * i)),
      `tl.set('.po', { opacity: 0 }, 0);`,
      ...Array.from({ length: 6 }, (_, i) => `tl.set('#po${i}', { opacity: 1 }, ${(t[1] + 0.04 * i).toFixed(3)});`),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v21: Video3 = {
  id: '21-ikar',
  title: 'Реклама: Икар',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 540, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Сегодня теория в ГИБДД»', cams: ['wide', 'a'], a: 'cool', b: 'neutral' },
    { text: '«Готовился?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Зачем? Я же умный»', cams: ['a', 'a'], a: 'grin' },
    { text: '«Билеты хоть открывал?»', cams: ['b', [570, 1140, 2.8]], b: 'think' },
    { text: '«Пару раз.<br>Там всё логично»', cams: ['a', 'wide'], a: 'cool' },
    { text: '«Многие так думали»', cams: ['ab', 'b'], b: 'calm' },
    { text: '«Ну я-то сдам»', cams: ['a', [560, 790, 2.6]], a: 'smile' },
    { text: '«Икар тоже так думал»', cams: ['wide', 'b'], a: 'doubt', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 960, s: 1.0, label: 'Миф об Икаре' },
    { fx: 260, fy: 1010, s: 2.0, dx: 20, label: 'Дедал склеил крылья воском' },
    { fx: 600, fy: 700, s: 1.8, dy: -40, label: 'Икар взлетел выше всех' },
    { fx: 730, fy: 520, s: 2.0, label: 'Солнце растопило воск' },
    { fx: 660, fy: 1110, s: 1.7, dy: 100, label: 'Перья посыпались' },
    { fx: 680, fy: 1420, s: 1.8, label: 'И он упал в море', on: '.fall', off: '.fly' },
  ],
  after: [
    { fx: 540, fy: 1020, s: 1.05, off: '.fall' },
    { fx: 700, fy: 1560, s: 2.3 },
    { fx: 230, fy: 1000, s: 2.1 },
    { fx: 760, fy: 1560, s: 1.5, ds: 1.08 },
  ],
  extra: (T) =>
    Array.from({ length: 6 }, (_, i) => `tl.to('#ff${i}', { y: '+=${90 + i * 10}', rotation: ${i % 2 ? 30 : -30}, transformOrigin: '50% 50%', duration: ${(T.story[6] - T.story[3]).toFixed(3)}, ease: 'sine.inOut' }, ${T.story[3]});`).join('\n      '),
  info,
  cta: { lines: ['Сначала', 'научись', 'летать'], accent: 1 },
  bioGlyph: '<path d="M-30,32 C-14,-6 8,-28 34,-36 C26,-8 4,16 -30,32 Z M-30,32 L12,-12"/>',
};
