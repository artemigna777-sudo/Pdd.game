/**
 * 24. «Экзамен через месяц — успею, начну потом» — комната, кресло-мешок, календарь.
 * История-гравюра: басня Крылова «Стрекоза и Муравей» (1808): лето пропела — зимой помощи нет.
 * Инфографика: 800 вопросов по 20 в день — это 40 дней.
 */
import { beanbag, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, ground, sh, sky, sun, wh } from '../etch.ts';
import { ant, anthill, dragonfly, etree, flower, note, snow, wheat } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'beanbag', f: 1, arms: ['phone', 'down'], hair: 'spiky', face: 'relaxed' });
const B = person(DLG, { id: 'B', x: 840, floor: 1300, pose: 'stand', f: -1, arms: ['point', 'down'], hair: 'bun', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${beanbag(300, 1300, C.night)}
  <rect x="480" y="640" width="200" height="190" fill="${C.night}"/><path d="M480,690 H680" stroke-width="4"/>
  <text x="580" y="790" text-anchor="middle" font-size="76" font-weight="800" fill="${C.line}" stroke="none">30</text>
  <path d="M520,640 v-24 M640,640 v-24" stroke-width="5"/>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const F = 1350;
const smallAnts = [[470, 0.32], [540, 0.3], [1010, 0.3]].map(([x, s]) => ant(x, F, s, 1, 'carry')).join('');

const summer = `<g class="summer">
  ${sun(860, 380, 90)}
  ${cloud(240, 520, 260)}
  ${flower(250, F, 500)}
  ${dragonfly(262, 862, 1.05, 1, 'sing')}
  ${note(380, 640, 1.2)}${note(450, 560, 1)}${note(350, 520, 0.9)}
  ${[560, 620, 680, 990, 1040].map((x, i) => wheat(x, F, 300 + (i % 3) * 40, i % 2 ? 20 : -16)).join('')}
  ${ant(680, F, 0.62, 1, 'carry')}
  ${smallAnts}
</g>`;

const winter = `<g class="winter" opacity="0">
  <rect x="-400" y="-400" width="1880" height="${F + 400}" fill="url(#c120)" stroke="none" opacity="0.7"/>
  ${wh(`M-400,${F + 4} Q-100,${F - 40} 200,${F - 10} Q420,${F - 50} 640,${F - 12} Q900,${F - 40} 1480,${F - 8} V2400 H-400 Z`, 'stroke-width="4"')}
  ${wh(`M${840 - 200},${F - 20} C${840 - 170},${F - 266} ${840 + 170},${F - 266} ${840 + 200},${F - 20} C${840 + 126},${F - 176} ${840 - 126},${F - 176} ${840 - 200},${F - 20} Z`, 'stroke-width="3"')}
  <path d="M250,${F} C240,${F - 140} 262,${F - 240} 280,${F - 300} q20,40 0,80 M268,${F - 200} q-40,10 -60,40" stroke-width="5"/>
  ${etree(110, F, 520, 4, true)}
  <g id="flakes">${snow(-300, -200, 1680, 2000, 160, 21)}</g>
</g>`;

const cold1 = `<g class="cold1" opacity="0">${dragonfly(340, F + 6, 0.95, 1, 'cold')}</g>`;
const beg = `<g class="beg" opacity="0">
  <path d="M790,${F} V${F - 110} Q840,${F - 170} 890,${F - 110} V${F} Z" fill="${C.ink}"/>
  ${dragonfly(660, F + 6, 0.95, 1, 'cold')}
  <g class="antstand">${ant(800, F, 0.62, -1, 'stand')}</g>
</g>`;
const point = `<g class="point" opacity="0">${ant(800, F, 0.62, -1, 'point')}</g>`;
const alone = `<g class="st-a">
  ${dragonfly(330, F + 6, 0.95, -1, 'cold')}
  ${sh(`M${840 + 0.16 * 420},${F - 0.3 * 420} h50 v40 h-50 Z`, 'c0')}
  ${ant(944, F - 0.3 * 420 + 48, 0.18, -1, 'stand')}
</g>`;

const tableau = `
  ${sky()}
  ${ground(F)}
  ${etree(-40, F, 600, 2)}
  ${anthill(840, F, 420)}
  ${summer}${winter}${cold1}${beg}${point}${alone}`;

// ─── Инфографика: 800 / 20 = 40 дней ──────────────────────────────────────────

const sq = Array.from({ length: 40 }, (_, i) => {
  const x = 150 + (i % 8) * 100;
  const y = 600 + Math.floor(i / 8) * 96;
  return `<rect class="sw" id="sw${i}" x="${x}" y="${y}" width="80" height="76" rx="10" fill="none" stroke="#fff" stroke-width="5"/><rect class="so" id="so${i}" x="${x}" y="${y}" width="80" height="76" rx="10" fill="${C.accent}" stroke="${C.accent}" stroke-width="5"/>`;
}).join('');

const info = {
  html: `
    ${itext('i-h', 450, 40, '800 ВОПРОСОВ')}
    ${isvg(sq)}
    ${itext('i-s', 1110, 46, 'ПО 20 В ДЕНЬ')}
    ${itext('i-n', 1200, 140, '= 40 ДНЕЙ', C.accent, 900)}
    ${itext('i-y', 1400, 30, 'ВОТ ЧТО ЗНАЧИТ «ЗАРАНЕЕ»', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 40 }, (_, i) => pop(`#sw${i}`, t[0] + 0.008 * i, 0.12)),
      `tl.set('.so', { opacity: 0 }, 0);`,
      show('#i-s', t[1]),
      ...Array.from({ length: 40 }, (_, i) => `tl.set('#so${i}', { opacity: 1 }, ${(t[1] + 0.011 * i).toFixed(3)});`),
      pop('#i-n', t[2], 0.22),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v24: Video3 = {
  id: '24-strekoza',
  title: 'Реклама: Стрекоза и Муравей',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Экзамен через месяц»', cams: ['wide', 'b'], a: 'relaxed', b: 'neutral' },
    { text: '«Успею. Начну потом»', cams: ['a', 'ab'], a: 'relaxed' },
    { text: '«Это когда?»', cams: ['b', 'b'], b: 'doubt' },
    { text: '«Ну, за недельку до»', cams: ['a', [580, 730, 2.4]], a: 'smile' },
    { text: '«800 вопросов<br>за неделю?»', cams: ['b', 'ab'], b: 'shock' },
    { text: '«Выучу за ночь,<br>если что»', cams: ['a', 'a'], a: 'cool' },
    { text: '«Крылов про тебя писал»', cams: ['b', 'wide'], a: 'doubt', b: 'calm' },
    { text: '«Ты всё пела?<br>Это дело…»', cams: ['b', 'b'], b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Басня Крылова, 1808' },
    { fx: 300, fy: 740, s: 1.8, label: 'Стрекоза пела всё лето' },
    { fx: 660, fy: 1210, s: 2.1, label: 'Муравей носил по зёрнышку' },
    { fx: 540, fy: 1060, s: 1.05, label: 'Пришла зима', on: '.winter, .cold1', off: '.summer' },
    { fx: 740, fy: 1220, s: 1.9, label: 'Стрекоза просит помощи', on: '.beg', off: '.cold1' },
    { fx: 760, fy: 1230, s: 2.3, label: '«Так поди же, попляши!»', on: '.point', off: '.antstand' },
  ],
  after: [
    { fx: 540, fy: 1060, s: 1.02, off: '.beg, .point' },
    { fx: 330, fy: 1230, s: 2.0 },
    { fx: 930, fy: 1200, s: 2.6 },
    { fx: 540, fy: 900, s: 1.3, ds: 1.08 },
  ],
  extra: (T) => `tl.fromTo('#flakes', { y: 0 }, { y: 160, duration: ${(T.after[4] - T.story[3]).toFixed(3)}, ease: 'none' }, ${T.story[3]});`,
  info,
  cta: { lines: ['Начни', 'сегодня,', 'а не «потом»'], accent: 1 },
  bioGlyph: '<path d="M-6,-30 C-30,-60 -60,-30 -40,-10 C-20,6 -6,-10 -6,-30 Z M6,-30 C30,-60 60,-30 40,-10 C20,6 6,-10 6,-30 Z M0,-34 V40" />',
};
