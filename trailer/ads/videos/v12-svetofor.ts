/**
 * 12. «Опять ошиблась в пробном билете» — театр теней, переход на закате, цветной только светофор.
 * История: Лондон, 1868 — первый в мире светофор взорвался через месяц; в 1914-м светофор стал электрическим.
 */
import { ICON, floorLine, person } from '../draw.ts';
import { carriage, gasLamp, semaphore, trafficLight, zebra } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { at, still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.silhouette;
const h = th.hist;
const A = person(th, { id: 'A', x: 290, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'hip'], hair: 'ponytail', face: 'sad' });
const B = person(th, { id: 'B', x: 800, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'spiky', face: 'neutral' });

const skyline = `<path d="M-100,1300 V1020 H40 V940 H170 V1060 H260 V900 H400 V1000 H470 V960 H640 V880 H760 V1010 H880 V930 H1010 V990 H1200 V1300 Z" fill="rgba(20,20,20,0.16)" stroke="none"/>`;
const scene = `
  <circle cx="830" cy="660" r="130" fill="#f9f3e8" stroke="none"/>
  ${skyline}
  ${floorLine(1300)}
  <g opacity="0.8">${zebra(80, 1020, 1360)}</g>
  ${trafficLight(545, 1300, 720, th.fill, 'red', th.accent)}
  ${A.svg}${B.svg}`;

// ─── История: Лондон, 1868 ─────────────────────────────────────────────────────

const street = `
  <path d="M40,1480 H1040"/>
  ${carriage(520, 1480, h.fill)}
  ${gasLamp(140, 1480, h.fill)}${gasLamp(960, 1480, h.fill)}`;

const first = `
  <path d="M40,1480 H1040"/>
  <path d="M640,1480 V980 H1000 V1480 M660,980 L820,860 L980,980" stroke-width="4"/>
  ${[700, 780, 860, 940].map((x) => `<path d="M${x},1040 v120 M${x},1240 v120" stroke-width="4"/>`).join('')}
  ${semaphore(400, 1480, h.fill, h.accent)}
  ${still(h, { x: 170, floor: 1480, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'helmet', face: 'smile' })}`;

const boom = `
  <path d="M40,1480 H1040"/>
  ${semaphore(540, 1480, h.fill, h.accent)}
  <path d="M540,1400 l-120,-60 M540,1400 l120,-70 M540,1420 l-150,10 M540,1420 l150,20 M540,1380 l-60,-130 M540,1380 l70,-120" stroke="${h.accent}" stroke-width="10"/>
  <circle cx="540" cy="1420" r="60" fill="${h.accent}" stroke="${h.accent}"/>`;

const smoke = `
  <path d="M40,1480 H1040"/>
  <path d="M540,1480 V1200 M500,1480 h80"/>
  <path d="M600,1460 l170,-20 l0,24 z" fill="${h.fill}"/>
  <path d="M460,1180 q-40,-60 20,-100 q20,-80 100,-60 q70,-40 110,30 q60,30 20,100 q-20,40 -90,30 q-60,40 -120,10 q-50,10 -40,-10 z" fill="${h.fill}" stroke-dasharray="14 10"/>
  <path d="M520,1020 q-30,-60 20,-90 q60,-40 100,10 q40,40 0,80" stroke-dasharray="14 10"/>`;

const bulb = `
  <path d="M540,800 a170,170 0 0 1 100,307 v80 h-200 v-80 a170,170 0 0 1 100,-307 z" fill="${h.fill}"/>
  <path d="M460,1220 h160 M470,1260 h140 M500,1300 h80"/>
  <path d="M490,1100 q50,-160 100,0" stroke="${h.accent}" stroke-width="8"/>
  <path d="M300,880 l-60,-40 M780,880 l60,-40 M260,1040 h-70 M820,1040 h70" stroke-width="7"/>`;

const electric = `
  <path d="M40,1480 H1040"/>
  ${trafficLight(540, 1480, 760, h.fill, 'red', h.accent)}
  ${text(540, 1650, 120, h.ink, '1914')}`;

const now = `
  <path d="M40,1480 H1040"/>
  ${zebra(140, 940, 1530)}
  ${trafficLight(300, 1480, 820, h.fill, 'green', h.ink)}
  <g stroke-width="10">${at(ICON.check, 720, 1100, 3)}</g>`;

export const v12: Video = {
  id: '12-svetofor',
  title: 'Реклама: первый светофор',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1120, s: 1.25 },
  lines: [
    { shot: 'wide', text: '«Опять ошиблась<br>в пробном билете»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«И что? Он же пробный»', b: 'calm' },
    { shot: 'a', text: '«Боюсь ошибиться<br>на настоящем»', a: 'tired' },
    { shot: 'b', text: '«Вот и ошибайся сейчас»', b: 'smile' },
    { shot: 'a', text: '«В смысле?»', a: 'doubt' },
    { shot: 'b', text: '«Первый светофор тоже<br>начинал с ошибки»', b: 'cool' },
    { shot: 'wide', text: '«Он вообще взорвался!»', a: 'shock', b: 'grin' },
  ],
  story: [
    { label: 'Лондон, 1868', shots: [{ art: street }] },
    { label: 'У парламента поставили<br>первый в мире светофор', shots: [{ art: first }] },
    { label: 'Через месяц он взорвался:<br>подвёл газ', shots: [{ art: boom }, { art: smoke }] },
    { label: 'А в 1914-м светофор<br>стал электрическим', shots: [{ art: bulb }, { art: electric }] },
    { label: 'Ошибка — это шаг вперёд', shots: [{ art: now }] },
  ],
  table: {
    left: 'БОЯТЬСЯ ОШИБОК',
    right: 'УЧИТЬСЯ НА НИХ',
    leftIcon: ICON.cross,
    rightIcon: ICON.check,
    rows: [
      ['ошибся — расстроился', 'ошибся — разобрался'],
      ['ошибка повторится', 'ошибка не вернётся'],
      ['на экзамене — впервые', 'на экзамене — знакомо'],
    ],
  },
  cta: ['Ошибайся', 'в игре,', 'а не на экзамене'],
  bioGlyph: '<rect x="-20" y="-42" width="40" height="84" rx="9"/><circle cy="-22" r="7"/><circle r="7"/><circle cy="22" r="7"/>',
};
