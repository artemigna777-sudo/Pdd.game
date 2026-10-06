/**
 * 9. «Боюсь экзамена» — газета, лавочка в парке.
 * История: США, 1902 — братья Райт сделали сотни полётов на планере, прежде чем полететь на самолёте.
 */
import { ICON, bench, floorLine, person, tree } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, fadeIn, pop, shot, still, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.news;
const h = th.hist;
const A = person(th, { id: 'A', x: 380, floor: 1300, pose: 'sit', seat: 92, f: 1, arms: ['lap', 'lap'], hair: 'none', face: 'sad' });
const B = person(th, { id: 'B', x: 700, floor: 1300, pose: 'sit', seat: 92, f: -1, arms: ['front', 'lap'], hair: 'bun', hold: 'cup', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${tree(110, 1300, th.fill)}${tree(990, 1300, th.fill)}
  <path d="M60,1340 H1020" stroke-width="3" opacity="0.5"/>
  ${bench(250, 830, 1300)}
  ${A.svg}${B.svg}`;

// Демо: прыжки по ступенькам к флажку, каждая — пробный экзамен.
const [t0, t1, t2, t3] = T.demo;
const STONES: [number, number][] = [
  [170, 1460],
  [350, 1340],
  [530, 1220],
  [710, 1100],
  [890, 980],
];
const demoSvg = `
  ${STONES.map(([x, y]) => `<path d="M${x - 75},${y} H${x + 75} V${y + 50} H${x - 75} Z" fill="${th.fill}"/>`).join('')}
  ${STONES.slice(1, 4)
    .map(([x, y], i) => `<g id="dk${i}" opacity="0" stroke-width="8">${at(ICON.check, x, y + 120, 1.1)}</g>`)
    .join('')}
  <g id="dflag" opacity="0"><path d="M890,980 V700"/><path d="M890,710 H1010 L980,760 L1010,810 H890 Z" fill="${th.accent}" stroke="${th.accent}"/></g>
  ${text(890, 650, 48, th.ink, 'экзамен', 'id="dexam" opacity="0"')}
  <g id="dball" transform="translate(170 1428)"><circle r="30" fill="${th.ink}"/></g>`;
const HOP = 0.52;
const hops = STONES.slice(1).map(([x, y], i) => {
  const [px, py] = STONES[i];
  const t = t0 + 0.45 + i * (HOP + 0.04);
  return [
    to('#dball', { x: `+=${x - px}` }, t, HOP, 'none'),
    to('#dball', { y: `-=${py - y + 140}` }, t, HOP / 2, 'power1.out'),
    to('#dball', { y: '+=140' }, t + HOP / 2, HOP / 2, 'power1.in'),
    i < 3 ? pop(`#dk${i}`, t + HOP) : '',
  ].join(' ');
});
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 530, 1140, 1.12),
  ...hops,
  pop('#dflag', t2 - 0.2, 0.25, 0.5),
  fadeIn('#dexam', t2 - 0.05),
  shot('#dcam', t2, t3 - t2, 880, 860, 1.7),
].join('\n      ');

// ─── История: США, 1902 ────────────────────────────────────────────────────────

const dunes = `
  <path d="M40,1460 C200,1300 360,1300 520,1420 S860,1280 1040,1400"/>
  <path d="M40,1540 C260,1460 520,1500 700,1540 S940,1500 1040,1520" stroke-width="3"/>
  <path d="M640,1340 V1200 L740,1140 L840,1200 V1320" fill="${h.fill}"/><path d="M710,1320 V1250 H770 V1320" stroke-width="4"/>
  <path d="M120,820 q30,-20 60,0 q30,-20 60,0 M760,760 q24,-16 48,0 q24,-16 48,0" stroke-width="4"/>`;

const glider = (x: number, y: number, s = 1, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-260,-70 H260 M-260,0 H260" stroke-width="7"/>${[-220, -110, 0, 110, 220]
    .map((dx) => `<path d="M${dx},-70 V0" stroke-width="4"/>`)
    .join('')}<path d="M-260,-70 V0 M260,-70 V0" stroke-width="4"/><path d="M-60,-30 L-200,40 H-280 M-280,20 V60" stroke-width="4"/><path d="M200,-34 L320,-20 M300,-50 V10" stroke-width="5"/></g>`;

const brothers = `
  <path d="M40,1460 H1040"/>
  ${glider(600, 1380, 0.9)}
  ${still(h, { x: 160, floor: 1460, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'cap', face: 'smile' })}
  ${still(h, { x: 300, floor: 1460, pose: 'stand', f: 1, arms: ['hip', 'down'], hair: 'cap', mustache: true, face: 'think' })}`;

const flying = `
  <path d="M40,1500 C200,1380 360,1380 520,1480 S860,1360 1040,1460"/>
  ${glider(540, 1030, 1.2, -6)}
  <path d="M520,1000 h90" stroke-width="12"/><circle cx="500" cy="996" r="16" fill="${h.ink}"/>
  <path d="M140,1150 H320 M180,1210 H360" stroke-width="4" stroke-dasharray="20 14"/>`;

const crash = `
  <path d="M40,1460 C260,1400 520,1460 760,1430 S960,1400 1040,1420"/>
  ${glider(600, 1340, 0.85, 14)}
  ${still(h, { x: 200, floor: 1460, pose: 'stand', f: 1, arms: ['up', 'down'], hair: 'cap', face: 'tired' })}
  <path d="M258,1080 l30,-40 l20,16 l-30,40 z" fill="${h.ink}"/>
  <path d="M760,1200 l20,-30 M820,1210 l30,-20 M700,1180 l-10,-34" stroke-width="5"/>`;

const flyer = `
  <path d="M40,1500 H1040"/>
  <g transform="translate(540 1040)">
    <path d="M-300,-80 H300 M-300,0 H300" stroke-width="8"/>${[-260, -150, -50, 50, 150, 260].map((dx) => `<path d="M${dx},-80 V0" stroke-width="4"/>`).join('')}
    <path d="M300,-40 L420,-40 M420,-80 V0" stroke-width="5"/><path d="M-300,-40 H-400 M-400,-90 V10" stroke-width="5"/>
    <ellipse cx="-80" cy="-40" rx="14" ry="60" fill="${h.accent}" stroke="${h.accent}"/><ellipse cx="80" cy="-40" rx="14" ry="60" fill="${h.accent}" stroke="${h.accent}"/>
  </g>
  <path d="M160,1260 H360 M120,1320 H300" stroke-width="4" stroke-dasharray="20 14"/>
  ${text(540, 1400, 120, h.ink, '1903')}`;

const steps = `
  ${at(ICON.steps, 540, 1200, 7, 'stroke-width="1.2"')}
  <path d="M820,990 V780" stroke-width="7"/><path d="M820,790 H960 L925,845 L960,900 H820 Z" fill="${h.accent}" stroke="${h.accent}"/>
  ${text(300, 1480, 44, h.ink, 'тренировка')}${text(800, 1100, 44, h.ink, 'полёт')}`;

export const v09: Video = {
  id: '09-rait',
  title: 'Реклама: сначала тренировка',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 540, fy: 1150, s: 1.3 },
  lines: [
    { shot: 'wide', text: '«Боюсь экзамена.<br>Вдруг опять провалю»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«Сколько раз<br>ты его сдавал?»', b: 'doubt' },
    { shot: 'a', text: '«Один. И провалил»', a: 'tired' },
    { shot: 'b', text: '«А я — сотни раз»', b: 'cool' },
    { shot: 'a', text: '«Сотни?! Это как?»', a: 'shock' },
    { shot: 'b', text: '«Пробные экзамены.<br>Каждый день»', b: 'smile' },
    { shot: 'wide', text: '«На настоящем<br>даже не волновалась»', a: 'think', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'США, 1902', art: dunes },
    { label: 'Братья Райт мечтали<br>о самолёте', art: brothers },
    { label: 'Сначала — сотни полётов<br>на планере', art: flying },
    { label: 'Падали, чинили<br>и снова взлетали', art: crash },
    { label: 'А в 1903-м —<br>первый полёт на самолёте', art: flyer },
    { label: 'Сначала тренировка —<br>потом настоящий полёт', art: steps },
  ],
  table: {
    left: 'ВСЛЕПУЮ',
    right: 'С ТРЕНИРОВКОЙ',
    leftIcon: ICON.question,
    rightIcon: ICON.steps,
    rows: [
      ['экзамен — впервые', 'экзамен — сотый раз'],
      ['трясутся руки', 'спокойно'],
      ['одна ошибка — паника', 'ошибки уже позади'],
    ],
  },
  cta: ['Хватит', 'бояться экзамена', 'начни тренироваться'],
  bioGlyph: ICON.flag,
};
