/**
 * 48. «Сразу за руль, без учёбы» — ночная улица, машина у обочины.
 * История-гравюра: миф о Фаэтоне (Овидий, «Метаморфозы», II) — сын Гелиоса попросил колесницу Солнца, не удержал коней
 * и сжёг землю; Зевс остановил его молнией, и Фаэтон упал в реку Эридан.
 * Инфографика без выдуманной статистики: одна попытка и ни одной тренировки — по мифу.
 */
import { carSide, floorLine, person, streetLamp } from '../draw.ts';
import { C, DLG, icon, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { bolt, etree, temple } from '../etch2.ts';
import { cloud, feather, fig, figPts, front, ground, rock, sea, sh, sky, sun, wh } from '../etch.ts';
import { chariotBody, flame, horse, wheel } from '../etch3.ts';

const A = person(DLG, { id: 'A', x: 190, floor: 1300, pose: 'stand', f: 1, arms: ['hip', 'down'], hair: 'spiky', face: 'cool' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'bun', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${streetLamp(1010, 1300, C.accent)}
  ${carSide(550, 1300, DLG.fill, false)}
  <path d="M236,1086 h-30 M236,1126 h-30" stroke-width="3"/>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const PH = { x: -6, y: -262, s: 0.92, f: 1 as const, dress: 'tunic' as const, pat: 'a30', hair: 'curly' as const, arm: [72, 14] as [number, number], arm2: [80, 8] as [number, number], leg: [14, 10] as [number, number], leg2: [-6, 6] as [number, number], lean: 14, nod: -8 };
const hand = figPts({ ...PH, face: 'shout' }).hand;

/** Колесница с конями: начало — на земле под осью колеса, кони смотрят вправо. */
const rig = (pose: 'gallop' | 'rear') => `
  ${horse(520, -70, 0.9, pose, 'b120')}
  ${horse(400, 0, 0.98, pose, 'a120')}
  <path d="M${hand[0]},${hand[1]} Q180,-310 408,-336 M${hand[0]},${hand[1] + 6} Q220,-300 478,-340" stroke-width="3"/>
  ${chariotBody()}
  ${wheel(0, -88, 88, 18)}
  ${fig({ ...PH, face: 'shout' })}`;

const flames = [
  [770, 1480, 150], [840, 1480, 190], [700, 1480, 110], [910, 1480, 130], [530, 1480, 120], [620, 1480, 150], [980, 1480, 100],
].map(([x, y, h]) => flame(x, y, h)).join('');

const smoke = `${cloud(900, 1130, 320)}${cloud(620, 1190, 240)}${cloud(1000, 1010, 220)}`;

const helios = (sad: boolean) =>
  fig({
    x: 330, y: 1270, s: 0.95, f: 1, dress: 'robe', pat: 'a120', sleeve: 'c60', hair: 'crown', beard: true,
    ...(sad
      ? { lean: 18, nod: 22, arm: [118, 150] as [number, number], arm2: [108, 140] as [number, number], face: 'closed' as const }
      : { arm: [140, 24] as [number, number], arm2: [96, 40] as [number, number], face: 'shout' as const }),
  });

const zeus = fig({
  x: 200, y: 480, s: 1.0, f: 1, dress: 'robe', pat: 'b120', sleeve: 'c60', hair: 'long', beard: true,
  arm: [145, 28], arm2: [100, 30], face: 'shout', hand: `<g transform="rotate(-8) translate(-8 -26)">${bolt(0, 0, 0.55)}</g>`,
});

const burnt = `${etree(560, 1480, 250, 3, true)}${etree(1030, 1480, 220, 6, true)}`;

const fall = front({ x: 770, y: 1470, s: 0.85, rot: 168, arms: [40, 30], legs: [10, 30], dress: 'tunic', pat: 'a30', hair: 'curly', face: 'shout' });

const tableau = `
  ${sky()}
  ${sun(840, 300, 120)}
  ${cloud(150, 330, 260)}${cloud(980, 640, 240)}
  ${ground(1480)}
  ${temple(190, 1480, 340, 5)}
  ${rock('hill', 'M-80,1480 L-60,1360 L120,1330 L420,1320 L560,1380 L600,1480 Z', [-90, 1300, 700, 200], 90, 17)}
  ${helios(false).replace('<g', '<g class="st-b"')}
  <g class="st-a">${helios(true)}</g>
  ${cloud(200, 700, 440)}
  ${zeus}
  <g class="st-b">${burnt}</g>
  <g class="zap" opacity="0">${bolt(470, 640, 2.4)}</g>
  <g class="st-b rig" transform="translate(500 1000) rotate(-16) scale(0.78)">${rig('gallop')}</g>
  <g class="st-b">${flames}${smoke}</g>
  ${sea(1640)}
  <path d="M60,1700 l50,-8 M300,1760 l60,-6 M700,1730 l50,-8" stroke-width="3"/>
  <g class="fall" opacity="0">${fall}</g>
  <g class="st-a">
    ${wheel(690, 1690, 66, 20)}
    ${feather(560, 1660, 100, 52)}${feather(850, 1700, 80, 48)}
    <ellipse cx="716" cy="1706" rx="120" ry="14" stroke-width="3"/><ellipse cx="716" cy="1716" rx="190" ry="22" stroke-width="2"/>
  </g>`;

// ─── Инфографика: одна попытка ────────────────────────────────────────────────

const xs = [210, 410, 610, 810];
const horses = Array.from({ length: 4 }, (_, i) => `<g class="ph" id="ph${i}">${icon(xs[i], 650, 1.6, '#fff')}</g>`).join('');

const info = {
  html: `
    ${itext('i-h', 450, 40, 'КОЛЕСНИЦА СОЛНЦА')}
    ${isvg(`${horses}`)}
    ${itext('i-n', 1000, 150, '1 ПОПЫТКА', C.accent, 900)}
    ${itext('i-s', 1240, 46, 'И НИ ОДНОЙ<br>ТРЕНИРОВКИ')}
    ${itext('i-y', 1430, 30, 'ОВИДИЙ, «МЕТАМОРФОЗЫ», КНИГА II', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 4 }, (_, i) => pop(`#ph${i}`, t[0] + 0.05 * i)),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v48: Video3 = {
  id: '48-faeton',
  title: 'Реклама: Фаэтон',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Есть план: не учить билеты»', cams: ['wide', 'a'], a: 'cool', b: 'neutral' },
    { text: '«Какой?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Сразу сяду за руль.<br>На месте разберусь»', cams: ['a', 'a'], a: 'grin' },
    { text: '«А знаки? А приоритет?»', cams: ['b', [540, 1180, 2.2]], b: 'shock' },
    { text: '«Там всё интуитивно»', cams: ['a', 'wide'], a: 'smile' },
    { text: '«Это не велосипед»', cams: ['ab', 'b'], b: 'calm' },
    { text: '«Справлюсь»', cams: ['a', [560, 1140, 2.4]], a: 'cool' },
    { text: '«Фаэтон тоже<br>так говорил»', cams: ['wide', 'b'], a: 'doubt', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Миф о Фаэтоне' },
    { fx: 330, fy: 1260, s: 2.0, dy: -40, label: 'Гелиос предупредил:<br>«Это не по силам даже Зевсу»' },
    { fx: 520, fy: 790, s: 1.9, label: 'Фаэтон всё равно взял вожжи<br>колесницы Солнца' },
    { fx: 800, fy: 790, s: 2.0, dx: 30, label: 'Кони почуяли слабую руку' },
    { fx: 760, fy: 1380, s: 1.7, dy: 60, label: 'Колесница понеслась.<br>Земля загорелась' },
    { fx: 520, fy: 1060, s: 1.12, label: 'Зевс сразил его молнией.<br>Фаэтон упал в реку', on: '.zap,.fall', off: '.rig' },
  ],
  after: [
    { fx: 540, fy: 1060, s: 1.05, off: '.fall,.zap' },
    { fx: 710, fy: 1670, s: 2.4 },
    { fx: 320, fy: 1250, s: 2.1 },
    { fx: 760, fy: 1640, s: 1.4, ds: 1.08 },
  ],
  info,
  cta: { lines: ['Тренируйся', 'там, где можно', 'ошибаться'], accent: 2 },
  bioGlyph: '<circle r="30" fill="none"/><path d="M-44,0 H44 M0,-44 V44 M-31,-31 L31,31 M31,-31 L-31,31"/>',
};
