/**
 * 5. «Третий раз завалил теорию» — чертёж, парковка у машины.
 * История: США, 1969 — школа лётчиков TOPGUN: учебные бои и разбор каждой ошибки.
 */
import { ICON, carSide, floorLine, person } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, pop, shot, still, text } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.blueprint;
const h = th.hist;
const A = person(th, { id: 'A', x: 150, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'none', face: 'sad' });
const B = person(th, { id: 'B', x: 950, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'neutral' });

const skyline = `<path d="M-100,1300 V980 H60 V900 H180 V1020 H300 V860 H420 V960 H520 V880 H660 V1000 H760 V840 H880 V940 H1000 V1010 H1180 V1300" stroke-width="3" opacity="0.35"/>`;
const scene = `
  ${skyline}
  ${floorLine(1300)}
  <path d="M200,1340 H920" stroke-width="3" stroke-dasharray="30 20" opacity="0.5"/>
  ${carSide(550, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// Демо: вид из-за руля — ситуации на дороге появляются и «понимаются» (✓).
const [t0, t1, t2, t3] = T.demo;
const check = (id: string, x: number, y: number) => `<g id="${id}" opacity="0" stroke="${th.accent}" stroke-width="9">${at(ICON.check, x, y, 1.4)}</g>`;
const demoSvg = `
  <path d="M110,620 H970 L1030,1250 H50 Z"/>
  <path d="M90,840 H990" stroke-width="3" opacity="0.5"/>
  <path d="M330,1250 L520,840 M750,1250 L560,840" stroke-width="5"/>
  <path d="M540,860 v30 M540,940 v40 M540,1040 v60 M540,1160 v70" stroke-width="5"/>
  <g id="dsign" opacity="0"><path d="M300,1060 V930"/><path d="M240,930 L300,820 L360,930 Z" fill="${th.fill}"/>${text(300, 912, 60, th.ink, '!')}</g>
  ${check('dk0', 300, 760)}
  <g id="dlight" opacity="0"><path d="M780,1000 V900"/><rect x="745" y="720" width="70" height="180" rx="14" fill="${th.fill}"/><circle cx="780" cy="760" r="20" fill="${th.accent}" stroke="${th.accent}"/><circle cx="780" cy="810" r="20"/><circle cx="780" cy="860" r="20"/></g>
  ${check('dk1', 880, 760)}
  <g id="dzebra" opacity="0">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${400 + i * 52},1110 h30" stroke-width="16"/>`).join('')}</g>
  ${check('dk2', 540, 1180)}
  <path d="M50,1250 Q540,1190 1030,1250 V1560 H50 Z" fill="${th.fill}"/>
  <circle cx="540" cy="1620" r="300"/><circle cx="540" cy="1620" r="250" stroke-width="3"/>
  <path d="M290,1580 Q540,1500 790,1580" stroke-width="10"/>`;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1080, 1),
  pop('#dsign', t0 + 0.15, 0.2, 0.6),
  pop('#dk0', t0 + 0.55),
  pop('#dlight', t1 + 0.05, 0.2, 0.6),
  pop('#dk1', t1 + 0.5),
  pop('#dzebra', t1 + 0.95, 0.2, 0.8),
  pop('#dk2', t1 + 1.4),
  shot('#dcam', t2, t3 - t2, 800, 820, 1.8),
].join('\n      ');

// ─── История: США, 1969 ────────────────────────────────────────────────────────

const jet = (x: number, y: number, s: number, rot: number, fill = h.fill, stroke = h.ink) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}" stroke="${stroke}"><path d="M0,-150 Q14,-120 16,-60 L120,30 V56 L16,30 L12,90 L48,124 V144 L0,132 L-48,144 V124 L-12,90 L-16,30 L-120,56 V30 L-16,-60 Q-14,-120 0,-150 Z"/><path d="M0,-110 V-70" stroke-width="4"/></g>`;

const jets1 = `${jet(540, 1150, 2, 0)}<path d="M120,1500 H960" stroke-width="3" opacity="0.5"/>`;

const jets2 = `
  ${jet(330, 1000, 1, 35)}
  ${jet(700, 1250, 0.9, 150)}
  <path d="M660,1180 C560,1080 520,980 420,900 C330,830 260,860 200,800" stroke-width="5" stroke-dasharray="4 16" opacity="0.7"/>
  <path d="M740,1320 q30,40 10,80 q40,10 30,60 q50,0 40,60" stroke="${h.accent}" stroke-width="10"/>`;

const jets3 = `
  <path d="M540,1160 m-330,0 a330,220 0 1 0 660,0 a330,220 0 1 0 -660,0" stroke-width="4" stroke-dasharray="18 16"/>
  ${jet(210, 1150, 0.8, 180)}
  ${jet(870, 1170, 0.8, 0)}
  ${text(540, 1190, 80, h.ink, 'TOPGUN', 'letter-spacing="8"')}`;

const debrief = `
  <path d="M60,1480 H1020"/>
  <rect x="340" y="820" width="620" height="440" fill="${h.fill}"/><path d="M420,1260 L380,1480 M880,1260 L920,1480"/>
  ${at(ICON.plane, 480, 920, 1.2, 'stroke-width="4"')}${at(ICON.plane, 820, 1150, 1.2, 'stroke-width="4" transform-origin="0 0"')}
  <path d="M520,940 C640,960 700,1040 770,1120" stroke-width="5" stroke-dasharray="14 10"/>
  <path d="M600,1000 l40,40 M640,1000 l-40,40" stroke="${h.accent}" stroke-width="8"/>
  ${still(h, { x: 200, floor: 1480, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'helmet', face: 'calm' })}`;

const ratio = `
  <path d="M160,1440 H920"/>
  <rect x="230" y="${1440 - 2.4 * 60}" width="220" height="${2.4 * 60}" fill="${h.fill}"/>
  <rect x="630" y="${1440 - 12.5 * 52}" width="220" height="${12.5 * 52}" fill="${h.accent}" stroke="${h.accent}"/>
  ${text(340, 1440 - 2.4 * 60 - 34, 72, h.ink, '2,4 : 1')}${text(740, 1440 - 12.5 * 52 - 34, 72, h.ink, '12,5 : 1')}
  ${text(340, 1510, 40, h.ink, 'до школы')}${text(740, 1510, 40, h.ink, 'после')}`;

const tactics = `
  <rect x="140" y="760" width="800" height="800" fill="${h.fill}"/>
  <path d="M140,1060 H940 M140,1260 H940 M440,760 V1560 M640,760 V1560" stroke-width="4"/>
  <rect x="470" y="1330" width="60" height="100" rx="12" fill="${h.accent}" stroke="${h.accent}"/>
  <rect x="740" y="1170" width="100" height="60" rx="12" fill="${h.fill}"/>
  <rect x="550" y="830" width="60" height="100" rx="12" fill="${h.fill}"/>
  <path d="M500,1310 V1200 Q500,1120 420,1120 H260" stroke="${h.accent}" stroke-width="8" stroke-dasharray="20 14"/>
  <path d="M290,1100 l-34,20 l34,20" stroke="${h.accent}" stroke-width="8"/>
  <path d="M720,1200 H400" stroke-width="5" stroke-dasharray="14 12"/>`;

export const v05: Video = {
  id: '05-topgun',
  title: 'Реклама: разбор ошибок',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Третий раз<br>завалил теорию»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«Как готовился?»', b: 'doubt' },
    { shot: 'a', text: '«Выучил ответы.<br>А там всё перемешано»', a: 'tired' },
    { shot: 'b', text: '«Надо не ответы учить,<br>а понимать ситуацию»', b: 'calm' },
    { shot: 'a', text: '«И как это понять?»', a: 'think' },
    { shot: 'b', text: '«Разбирать каждую ошибку.<br>Как лётчики»', b: 'cool' },
    { shot: 'wide', text: '«Так учат<br>лётчиков-истребителей»', a: 'shock', b: 'smile' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'США, 1969', art: jets1 },
    { label: 'Лётчики флота проигрывали<br>слишком много боёв', art: jets2 },
    { label: 'Открыли школу TOPGUN:<br>учебный бой за боем', art: jets3 },
    { label: 'После боя — разбор<br>каждой ошибки', art: debrief },
    { label: 'Счёт в воздушных боях<br>вырос в пять раз', art: ratio },
    { label: 'Ситуация за ситуацией —<br>так учат и ПДД', art: tactics },
  ],
  table: {
    left: 'ЗАУЧИВАТЬ',
    right: 'ПОНИМАТЬ',
    leftIcon: ICON.card,
    rightIcon: ICON.eye,
    rows: [
      ['помнишь ответ', 'видишь ситуацию'],
      ['новый вопрос — ступор', 'новый вопрос — ясен'],
      ['сдаёшь с 3-го раза', 'сдаёшь с первого'],
    ],
  },
  cta: ['Хватит', 'учить ответы', 'начни понимать'],
  bioGlyph: ICON.plane,
};
