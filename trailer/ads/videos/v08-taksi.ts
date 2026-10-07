/**
 * 8. «Опять завалил теорию» — ночной город, разговор с таксистом.
 * История: Лондон — таксисты годами изъезжают город, и отдел мозга, который помнит дорогу, у них больше.
 */
import { ICON, carSide, floorLine, moon, person, stars, streetLamp } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { DASH, at, draw, pop, set, shot, still, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.night;
const h = th.hist;
const A = person(th, { id: 'A', x: 140, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'none', face: 'sad' });
const B = person(th, { id: 'B', x: 960, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], mustache: true, face: 'neutral' });

const houses = `<g stroke-width="3" opacity="0.5"><path d="M-80,1300 V940 H120 V1300 M180,1300 V860 H360 V1300 M420,1300 V990 H620 V1300 M680,1300 V900 H880 V1300 M940,1300 V960 H1160 V1300"/></g>
  ${[[30, 1000], [250, 920], [300, 1040], [500, 1050], [760, 960], [1000, 1020]].map(([x, y]) => `<rect x="${x}" y="${y}" width="34" height="44" fill="${th.accent}" stroke="none" opacity="0.7"/>`).join('')}`;
const scene = `
  ${houses}
  ${moon(860, 600, 44, th.fill)}
  ${stars([[160, 620], [420, 560]])}
  ${streetLamp(700, 1300, th.accent)}
  ${floorLine(1300)}
  ${carSide(560, 1300, th.fill, true, th.accent)}
  ${A.svg}${B.svg}`;

// Демо: такси проезжает по городу, улицы за ним загораются, места запоминаются.
const [t0, t1, t2, t3] = T.demo;
const grid = [200, 540, 860].map((x) => `<path d="M${x},560 V1560"/>`).join('') + [700, 1100, 1450].map((y) => `<path d="M100,${y} H980"/>`).join('');
const SEG = [
  { d: 'M200,1450 H540', t: t0 + 0.1, len: 0.7, to: { x: '+=340' }, rot: 0 },
  { d: 'M540,1450 V1100', t: t1, len: 0.55, to: { y: '-=350' }, rot: -90 },
  { d: 'M540,1100 H860', t: t1 + 0.6, len: 0.55, to: { x: '+=320' }, rot: 0 },
  { d: 'M860,1100 V700', t: t1 + 1.2, len: 0.6, to: { y: '-=400' }, rot: -90 },
];
const MARKS: [string, number, number, number][] = [
  [ICON.trophy, 370, 1370, t0 + 0.45],
  [ICON.clock, 460, 1270, t1 + 0.3],
  [ICON.pin, 700, 1020, t1 + 0.9],
  [ICON.flag, 940, 760, t1 + 1.7],
];
const demoSvg = `
  <g stroke-width="3" opacity="0.35">${grid}</g>
  ${SEG.map((s, i) => `<path id="ds${i}" d="${s.d}" ${DASH} stroke="${th.accent}" stroke-width="10"/>`).join('')}
  ${MARKS.map(([g, x, y], i) => `<g id="dm${i}" opacity="0">${at(g, x, y, 1.1, 'stroke-width="5"')}</g>`).join('')}
  <g id="dcar" transform="translate(200 1450)"><g id="dcarb"><rect x="-46" y="-28" width="92" height="56" rx="14" fill="${th.accent}" stroke="${th.accent}"/><path d="M14,-20 V20" stroke="#111" stroke-width="6"/></g></g>`;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1060, 1),
  set('#dcarb', { transformOrigin: '50% 50%', rotation: 0 }, t0),
  ...SEG.map((s, i) => `${draw(`#ds${i}`, s.t, s.len, 'none')} ${to('#dcar', s.to, s.t, s.len, 'none')} ${to('#dcarb', { rotation: s.rot }, s.t, 0.12)}`),
  ...MARKS.map(([, , , t], i) => pop(`#dm${i}`, t)),
  shot('#dcam', t2, t3 - t2, 860, 760, 1.9),
].join('\n      ');

// ─── История: Лондон ───────────────────────────────────────────────────────────

const tower = `
  <path d="M60,1460 H1020"/>
  <path d="M460,1460 V880 H620 V1460" fill="${h.fill}"/>
  <path d="M440,880 H640 L600,800 H480 Z M480,800 L540,640 L600,800" fill="${h.fill}"/>
  <circle cx="540" cy="960" r="54" fill="${h.fill}"/><path d="M540,960 V925 M540,960 l24,10" stroke-width="5"/>
  ${[1060, 1180, 1300].map((y) => `<path d="M500,${y} h80" stroke-width="4"/>`).join('')}
  <path d="M100,1460 V1220 H300 V1460 M780,1460 V1180 H980 V1460" stroke-width="4"/>`;

const maze = `
  <rect x="140" y="760" width="800" height="800" fill="${h.fill}"/>
  <path d="M140,860 C300,900 420,820 560,880 S800,960 940,900 M140,1060 H420 C520,1060 560,1000 700,1020 S880,1100 940,1080 M140,1300 C260,1260 380,1340 520,1300 S760,1220 940,1280 M140,1460 H940
           M260,760 C240,900 300,1060 260,1200 S240,1450 280,1560 M480,760 V1560 M700,760 C720,920 660,1080 700,1240 S760,1460 720,1560 M860,760 C840,1000 900,1200 860,1560" stroke-width="4"/>
  ${[[480, 1060], [700, 1240], [260, 1300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${h.accent}" stroke="${h.accent}"/>`).join('')}`;

const moped = `
  <path d="M60,1460 H1020"/>
  <circle cx="320" cy="1380" r="80" fill="${h.fill}"/><circle cx="760" cy="1380" r="80" fill="${h.fill}"/>
  <path d="M320,1380 L420,1260 H640 L700,1160 M700,1160 L760,1380 M660,1160 H740" stroke-width="7"/>
  <path d="M400,1260 Q420,1200 520,1200 H620 Q640,1260 600,1290 H420 Z" fill="${h.fill}"/>
  <rect x="690" y="1050" width="150" height="100" fill="${h.fill}"/><path d="M710,1080 h70 M710,1110 h100" stroke-width="3"/>
  ${still(h, { x: 520, floor: 1360, pose: 'sit', seat: 160, f: 1, arms: ['wheel', 'wheel'], hair: 'helmet', face: 'calm' })}`;

const mri = `
  <path d="M60,1460 H1020"/>
  <circle cx="680" cy="1150" r="260" fill="${h.fill}"/><circle cx="680" cy="1150" r="150"/>
  <path d="M160,1290 H900 V1340 H160 Z" fill="${h.fill}"/><path d="M220,1340 V1460 M840,1340 V1460"/>
  ${still(h, { x: 600, floor: 1220, pose: 'lie', f: 1, face: 'calm' })}`;

const brain = `
  ${at(ICON.brain, 540, 1120, 7, 'stroke-width="1.2"')}
  <circle cx="660" cy="1210" r="70" fill="${h.accent}" stroke="${h.accent}" opacity="0.85"/>
  <path d="M740,1260 C820,1320 860,1400 880,1460" stroke="${h.accent}" stroke-width="6"/>
  ${text(880, 1520, 48, h.accent, 'дорога')}`;

const route = `
  ${at(ICON.map, 540, 1150, 8, 'stroke-width="0.9"')}
  <path d="M290,1380 C380,1260 460,1300 520,1180 S640,1000 780,920" stroke="${h.accent}" stroke-width="12" stroke-dasharray="26 16"/>
  <circle cx="780" cy="920" r="22" fill="${h.accent}" stroke="${h.accent}"/>`;

export const v08: Video = {
  id: '08-taksi',
  title: 'Реклама: что сам проехал',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Опять завалил теорию»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«Зубрил, небось?»', b: 'doubt' },
    { shot: 'a', text: '«Ночами. Толку ноль»', a: 'tired' },
    { shot: 'b', text: '«А я весь город<br>помню наизусть»', b: 'cool' },
    { shot: 'a', text: '«Тоже зубрили?»', a: 'doubt' },
    { shot: 'b', text: '«Нет. Сам всё изъездил»', b: 'smile' },
    { shot: 'wide', text: '«Что сам проехал —<br>то и помнишь»', a: 'think', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'Лондон', art: tower },
    { label: 'Таксисты сдают «Знание»:<br>тысячи улиц наизусть', art: maze },
    { label: 'Годами изъезжают город<br>на мопеде с картой', art: moped },
    { label: 'В 2000 году учёные<br>сделали им МРТ мозга', art: mri },
    { label: 'Отдел, который помнит дорогу,<br>оказался больше', art: brain },
    { label: 'Мозг запоминает путь,<br>который проехал сам', art: route },
  ],
  table: {
    left: 'НАИЗУСТЬ',
    right: 'В ДОРОГЕ',
    leftIcon: ICON.book,
    rightIcon: ICON.car,
    rows: [
      ['зубришь ответы', 'проезжаешь ситуации'],
      ['путаешь похожие', 'помнишь, где было'],
      ['забыл за неделю', 'помнишь надолго'],
    ],
  },
  cta: ['Хватит', 'учить наизусть', 'учись в дороге'],
  bioGlyph: ICON.map,
};
