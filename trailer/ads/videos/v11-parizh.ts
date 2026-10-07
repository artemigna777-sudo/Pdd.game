/**
 * 11. «Вызубрил все билеты» — маркер на белой доске, у учебной машины с инструктором.
 * История: Париж, 1893 — первый экзамен для водителей: завести, повернуть, остановить.
 */
import { ICON, carSide, floorLine, person } from '../draw.ts';
import { learnerSign, oldCar } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { at, still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.marker;
const h = th.hist;
const A = person(th, { id: 'A', x: 160, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'hip'], hair: 'curly', face: 'smile' });
const B = person(th, { id: 'B', x: 960, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', mustache: true, face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  <path d="M-100,1380 H1200" stroke-width="5" stroke-dasharray="50 40"/>
  ${carSide(560, 1300, th.fill)}
  ${learnerSign(560, 1032, th.fill, th.accent, th.ink)}
  <path d="M60,1300 l30,-110 h20 l30,110 z" fill="${th.fill}"/><path d="M78,1240 h44" stroke="${th.accent}" stroke-width="9"/>
  ${A.svg}${B.svg}`;

// ─── История: Париж, 1893 ──────────────────────────────────────────────────────

const eiffel = `
  <path d="M60,1480 H1020"/>
  <path d="M380,1480 Q470,1150 520,760 L540,560 L560,760 Q610,1150 700,1480"/>
  <path d="M430,1480 Q540,1300 650,1480" />
  <path d="M455,1180 H625 M500,930 H580 M522,760 H558 M540,560 V490"/>
  <path d="M470,1180 L610,1000 M610,1180 L470,1000 M505,930 L575,800 M575,930 L505,800" stroke-width="3"/>
  <path d="M100,1480 V1260 H260 V1480 M120,1300 h30 v40 h-30 z M190,1300 h30 v40 h-30 z M820,1480 V1220 H990 V1480 M850,1270 h30 v40 h-30 z M920,1270 h30 v40 h-30 z" stroke-width="4"/>`;

const police = `
  <path d="M40,1480 H1040"/>
  ${oldCar(620, 1480, h.fill)}
  ${still(h, { x: 220, floor: 1480, pose: 'stand', f: 1, arms: ['up', 'down'], hair: 'cap', mustache: true, face: 'calm' })}`;

const crank = `
  <path d="M40,1480 H1040"/>
  ${oldCar(460, 1480, h.fill)}
  <path d="M660,1390 h70 v-50" stroke-width="7"/>
  ${still(h, { x: 830, floor: 1480, pose: 'stand', f: -1, arms: ['front', 'down'], hair: 'cap', face: 'think' })}
  <path d="M700,1300 a40,40 0 1 1 60,10" stroke-width="4" stroke-dasharray="10 8"/>`;

const corner = `
  <path d="M300,1560 V1100 Q300,900 500,900 H1000 M560,1560 V1180 Q560,1160 580,1160 H1000"/>
  <path d="M430,1540 V1180 Q430,1030 580,1030 H980" stroke-width="5" stroke-dasharray="26 18"/>
  <path d="M300,1300 H560" stroke-width="12"/>
  ${text(430, 1360, 40, h.ink, 'СТОП')}
  <path d="M440,1490 V1220 Q440,1090 600,1090 H860" stroke-width="7"/><path d="M830,1060 l40,30 l-40,30" stroke-width="7"/>
  <g transform="translate(440 1490)"><rect x="-30" y="-50" width="60" height="100" rx="14" fill="${h.fill}"/></g>`;

const school = `
  <path d="M40,1480 H1040"/>
  <rect x="380" y="820" width="620" height="400" fill="${h.fill}"/>
  <g transform="translate(690 1060) scale(0.55)">${oldCar(0, 120, h.fill)}</g>
  ${still(h, { x: 240, floor: 1480, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'cap', mustache: true, face: 'smile' })}`;

const permis = `
  <g transform="rotate(-4 540 1150)">
    <rect x="210" y="900" width="660" height="440" rx="18" fill="${h.fill}"/>
    <rect x="250" y="980" width="170" height="210" fill="${h.fill}"/><circle cx="335" cy="1060" r="40"/><path d="M275,1180 q60,-80 120,0" />
    ${text(640, 970, 34, h.ink, 'PERMIS DE CONDUIRE')}
    <path d="M460,1030 H830 M460,1080 H800 M460,1130 H830 M460,1180 H760 M250,1260 H830" stroke-width="4"/>
  </g>`;

const today = `
  <path d="M380,1560 L500,980 M700,1560 L580,980"/>
  <path d="M540,1540 v-60 M540,1420 v-50 M540,1320 v-40 M540,1240 v-30 M540,1170 v-20 M540,1120 v-14" stroke-width="5"/>
  <path d="M300,1300 V1150"/><path d="M250,1150 L300,1060 L350,1150 Z" fill="${h.fill}"/>
  <path d="M780,1300 V1160"/><circle cx="780" cy="1110" r="50" fill="${h.fill}"/><path d="M745,1110 h70" stroke-width="12"/>
  <g stroke-width="9">${at(ICON.check, 300, 970, 1.3)}${at(ICON.check, 780, 980, 1.3)}${at(ICON.check, 540, 900, 1.3)}</g>`;

export const v11: Video = {
  id: '11-parizh',
  title: 'Реклама: первый экзамен на права',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Завтра экзамен.<br>Вызубрил все билеты!»', a: 'smile', b: 'neutral' },
    { shot: 'b', text: '«А ехать-то умеешь?»', b: 'doubt' },
    { shot: 'a', text: '«Там же вопросы,<br>а не езда!»', a: 'doubt' },
    { shot: 'b', text: '«Каждый вопрос —<br>про езду»', b: 'calm' },
    { shot: 'a', text: '«Не думал об этом…»', a: 'think' },
    { shot: 'b', text: '«Первый экзамен на права<br>вообще был за рулём»', b: 'cool' },
    { shot: 'wide', text: '«Представь дорогу —<br>и ответ найдётся»', a: 'smile', b: 'happy' },
  ],
  story: [
    { label: 'Париж, 1893', shots: [{ art: eiffel }] },
    { label: 'Машин — горстка, но полиция<br>уже требует экзамен', shots: [{ art: police }] },
    { label: 'Проверяли, сможешь ли<br>завести, повернуть, остановить', shots: [{ art: crank }, { art: corner }] },
    { label: 'В 1917-м — первые автошколы,<br>в 1922-м — права', shots: [{ art: school }, { art: permis }] },
    { label: 'А сегодня билеты можно проехать', shots: [{ art: today }] },
  ],
  table: {
    left: 'БИЛЕТЫ',
    right: 'ДОРОГА',
    leftIcon: ICON.card,
    rightIcon: ICON.wheel,
    rows: [
      ['читаешь вопрос', 'видишь ситуацию'],
      ['угадываешь ответ', 'знаешь, как ехать'],
      ['экзамен — лотерея', 'экзамен — понятен'],
    ],
  },
  cta: ['Хватит', 'читать билеты', 'проезжай их'],
  bioGlyph: ICON.wheel,
};
