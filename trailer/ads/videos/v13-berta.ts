/**
 * 13. «За руль сесть страшно» — наклейки, заправка.
 * История: Германия, 1888 — Берта Бенц тайком проехала 106 км и сама решила все поломки в пути.
 */
import { ICON, floorLine, person } from '../draw.ts';
import { canopy, gasPump, motorwagen } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { at, still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.sticker;
const h = th.hist;
const A = person(th, { id: 'A', x: 290, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'bun', face: 'sad' });
const B = person(th, { id: 'B', x: 800, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], glasses: true, face: 'neutral' });

const scene = `
  ${canopy(110, 970, 640, th.fill)}
  ${floorLine(1300)}
  ${gasPump(545, 1300, th.fill, th.accent)}
  ${A.svg}${B.svg}`;

// ─── История: Германия, 1888 ───────────────────────────────────────────────────

const fachwerk = (x: number, w: number, hgt: number) =>
  `<path d="M${x},1480 V${1480 - hgt} H${x + w} V1480" fill="${h.fill}"/><path d="M${x - 20},${1480 - hgt} L${x + w / 2},${1480 - hgt - 140} L${x + w + 20},${1480 - hgt} Z" fill="${h.fill}"/>
   <path d="M${x},${1480 - hgt / 2} H${x + w} M${x},${1480 - hgt} L${x + w / 2},${1480 - hgt / 2} L${x + w},${1480 - hgt} M${x + w / 2},${1480 - hgt / 2} V1480" stroke-width="4"/>`;
const town = `<path d="M40,1480 H1040"/>${fachwerk(120, 240, 320)}${fachwerk(420, 240, 400)}${fachwerk(720, 240, 300)}`;

const dress = (x: number, floor: number) => `<path d="M${x - 60},${floor} L${x - 10},${floor - 160} H${x + 10} L${x + 60},${floor} Z" fill="${h.fill}"/>`;
const bertha = `
  <path d="M40,1480 H1040"/>
  ${motorwagen(640, 1480, h.fill)}
  ${still(h, { x: 220, floor: 1480, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'bun', face: 'smile' })}
  ${dress(220, 1480)}`;

const drive = `
  <path d="M40,1480 C300,1440 500,1500 1040,1460"/>
  <path d="M40,1300 C200,1180 340,1180 480,1290 C600,1200 760,1160 1040,1280" stroke-width="3"/>
  ${motorwagen(560, 1470, h.fill)}
  <path d="M220,1300 h-120 M240,1360 h-160 M230,1420 h-110" stroke-width="5"/>`;

const map = `
  <rect x="180" y="820" width="720" height="680" fill="${h.fill}"/>
  <path d="M300,920 C380,1080 300,1180 470,1250 S700,1300 760,1400" stroke-width="8" stroke-dasharray="22 14"/>
  <circle cx="300" cy="920" r="20" fill="${h.ink}"/><circle cx="760" cy="1400" r="20" fill="${h.ink}"/>
  ${text(360, 890, 36, h.ink, 'Мангейм')}${text(740, 1460, 36, h.ink, 'Пфорцхайм')}
  ${text(640, 1130, 64, h.ink, '106 км')}`;

const hatpin = `
  <path d="M120,1150 H560 Q600,1150 600,1190 V1500" stroke-width="22"/>
  <path d="M120,1150 H560 Q600,1150 600,1190 V1500" stroke="${h.fill}" stroke-width="10"/>
  <path d="M900,820 L560,1140" stroke-width="7"/><circle cx="910" cy="810" r="26" fill="${h.fill}"/>
  <circle cx="440" cy="1150" r="16" fill="${h.ink}"/><path d="M380,1110 l-30,-40 M420,1100 l0,-50 M470,1105 l25,-45" stroke-width="5"/>`;

const pharmacy = `
  <path d="M40,1480 H1040"/>
  <path d="M200,1480 V900 H880 V1480" fill="${h.fill}"/>
  <rect x="260" y="940" width="560" height="90" fill="${h.fill}"/>${text(540, 1002, 50, h.ink, 'APOTHEKE')}
  <path d="M300,1480 V1120 H500 V1480 M600,1100 H820 V1300 H600 Z" stroke-width="4"/>
  <path d="M690,1150 h40 v40 h40 v40 h-40 v40 h-40 v-40 h-40 v-40 h40 z" fill="${h.ink}"/>
  <path d="M880,1480 v-130 a30,30 0 0 1 30,-30 h20 a30,30 0 0 1 30,30 v130 z M900,1320 v-40 h40 v40" fill="${h.fill}"/>`;

const ready = `
  <path d="M300,1560 L480,980 M780,1560 L600,980"/>
  <path d="M540,1530 v-60 M540,1410 v-50 M540,1310 v-40 M540,1230 v-30 M540,1160 v-20" stroke-width="5"/>
  <path d="M540,980 V820"/><path d="M540,830 H660 L630,870 L660,910 H540" fill="${h.fill}"/>
  <g stroke-width="8">${at(ICON.check, 330, 1180, 1.3)}${at(ICON.check, 760, 1180, 1.3)}</g>`;

export const v13: Video = {
  id: '13-berta',
  title: 'Реклама: первая дальняя поездка',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1110, s: 1.22 },
  lines: [
    { shot: 'wide', text: '«Теорию учу, а за руль<br>сесть страшно»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«Почему?»', b: 'doubt' },
    { shot: 'a', text: '«Вдруг что-то случится,<br>а я не знаю, что делать»', a: 'tired' },
    { shot: 'b', text: '«Так в билетах<br>всё это есть»', b: 'calm' },
    { shot: 'a', text: '«Там просто вопросы»', a: 'doubt' },
    { shot: 'b', text: '«Это 800 случаев на дороге.<br>Пройди их заранее»', b: 'cool' },
    { shot: 'wide', text: '«Первая водительница<br>тоже всё решала в пути»', a: 'think', b: 'smile' },
  ],
  story: [
    { label: 'Германия, 1888', shots: [{ art: town }] },
    { label: 'Берта Бенц тайком взяла<br>машину мужа', shots: [{ art: bertha }] },
    { label: 'И проехала 106 км —<br>первая дальняя поездка', shots: [{ art: drive }, { art: map }] },
    { label: 'Засор прочистила шпилькой,<br>топливо купила в аптеке', shots: [{ art: hatpin }, { art: pharmacy }] },
    { label: 'Кто готов — тот едет', shots: [{ art: ready }] },
  ],
  table: {
    left: 'НАУДАЧУ',
    right: 'ЗАРАНЕЕ',
    leftIcon: ICON.question,
    rightIcon: ICON.check,
    rows: [
      ['случилось — паника', 'знаешь, что делать'],
      ['ответы наугад', 'ответы из опыта'],
      ['страшно за рулём', 'спокойно за рулём'],
    ],
  },
  cta: ['Пройди', 'все 800 ситуаций', 'до первой поездки'],
  bioGlyph: '<path d="M0,-38 C14,-16 28,0 28,14 A28,28 0 1 1 -28,14 C-28,0 -14,-16 0,-38 Z"/>',
};
