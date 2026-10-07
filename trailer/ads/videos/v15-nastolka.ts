/**
 * 15. «Правила ПДД такие скучные» — вышивка, вечер настолок.
 * История: США, 1904 — Лиззи Мэги придумала настольную игру, чтобы объяснять экономику; из неё выросла знаменитая настолка.
 */
import { ICON, floorLine, person, table } from '../draw.ts';
import { stool } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.stitch;
const h = th.hist;
const A = person(th, { id: 'A', x: 230, floor: 1300, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'long', table: 1130, face: 'tired' });
const B = person(th, { id: 'B', x: 860, floor: 1300, pose: 'sit', f: -1, arms: ['table', 'lap'], hair: 'curly', table: 1130, hold: 'cards', face: 'neutral' });

const bunting = `<path d="M-40,600 Q540,700 1120,600" stroke-width="4"/>${[60, 200, 340, 480, 620, 760, 900, 1040]
  .map((x, i) => {
    const y = 600 + 100 * (1 - ((x - 540) / 580) ** 2) - 2;
    return `<path d="M${x - 34},${y} L${x},${y + 60} L${x + 34},${y} Z" ${i % 3 === 1 ? `fill="${th.accent}" stroke="${th.accent}"` : `fill="${th.fill}"`}/>`;
  })
  .join('')}`;
const scene = `
  ${bunting}
  ${floorLine(1300)}
  ${stool(230, 1300, th.fill)}${stool(860, 1300, th.fill)}
  ${table(360, 720, 1130, 1300)}
  <path d="M400,1130 L430,1100 H650 L680,1130" fill="${th.fill}"/>
  <path d="M470,1100 v-24 h20 v24 M560,1100 v-30 l12,-10 l12,10 v30" fill="${th.fill}"/>
  <rect x="600" y="1080" width="22" height="22" rx="4" fill="${th.fill}"/>
  ${A.svg}${B.svg}`;

// ─── История: США, 1904 ────────────────────────────────────────────────────────

const house = `
  <path d="M40,1480 H1040"/>
  <path d="M260,1480 V1060 H820 V1480" fill="${h.fill}"/><path d="M220,1060 L540,820 L860,1060 Z" fill="${h.fill}"/>
  <path d="M300,1260 H780 M300,1260 V1480 M780,1260 V1480 M330,1260 v-60 M750,1260 v-60" stroke-width="4"/>
  <path d="M480,1480 V1320 H600 V1480 M320,1100 h100 v100 h-100 z M660,1100 h100 v100 h-100 z" stroke-width="4"/>
  <path d="M940,1480 V1340 M900,1340 h80 v-50 h-80 z" stroke-width="4"/>`;

const lizzie = `
  <path d="M40,1480 H1040"/>
  ${still(h, { x: 260, floor: 1480, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'bun', table: 1290, face: 'smile' })}
  <path d="M360,1290 H900 M380,1290 V1480 M880,1290 V1480"/>
  <path d="M460,1290 L520,1230 H820 L880,1290 Z" fill="${h.fill}"/>
  <path d="M540,1230 L520,1290 M800,1230 L820,1290 M500,1260 H860" stroke-width="3"/>`;

const lecture = `
  <path d="M40,1480 H1040"/>
  <path d="M440,1480 V1180 H640 V1480" fill="${h.fill}"/>
  ${still(h, { x: 540, floor: 1180, pose: 'stand', f: 1, arms: ['point', 'down'], mustache: true, face: 'neutral' }).replace(/<path d="M516,1180[^"]*"\/>/, '')}
  <path d="M170,1080 h40 l-40,40 h40 M220,1020 h30 l-30,30 h30 M860,1060 h40 l-40,40 h40" stroke-width="5"/>
  ${text(540, 1580, 52, h.ink, 'скучно…')}`;

const boardTop = `
  <rect x="190" y="820" width="700" height="700" fill="${h.fill}"/>
  <rect x="320" y="950" width="440" height="440"/>
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${320 + i * 88},820 V950 M${320 + i * 88},1390 V1520 M190,${950 + i * 88} H320 M760,${950 + i * 88} H890" stroke-width="3"/>`).join('')}
  ${[[370, 880], [590, 1450], [820, 1080], [250, 1300]].map(([x, y]) => `<path d="M${x - 22},${y + 18} V${y - 4} L${x},${y - 24} L${x + 22},${y - 4} V${y + 18} Z" fill="${h.accent}" stroke="${h.accent}"/>`).join('')}
  <circle cx="480" cy="1120" r="44" fill="${h.fill}"/>${text(480, 1138, 50, h.ink, '$')}
  <circle cx="600" cy="1220" r="44" fill="${h.fill}"/>${text(600, 1238, 50, h.ink, '$')}`;

const box = `
  <path d="M220,1100 L540,960 L860,1100 L540,1240 Z" fill="${h.fill}"/>
  <path d="M220,1100 V1300 L540,1440 L860,1300 V1100 M540,1240 V1440" fill="${h.fill}"/>
  <path d="M400,1090 L540,1030 L680,1090 L540,1150 Z" stroke-width="4"/>`;

const shelf = `
  <path d="M120,1500 H960 M120,1100 H960 M140,1100 V1500 M940,1100 V1500"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${170 + i * 125}" y="${1180 + (i % 2) * 30}" width="110" height="${320 - (i % 2) * 30}" fill="${h.fill}"/>`).join('')}
  ${[0, 1, 2].map((i) => `<rect x="${260 + i * 200}" y="${930 + i * 10}" width="180" height="${170 - i * 10}" fill="${h.fill}"/>`).join('')}`;

const play = `
  <rect x="300" y="900" width="480" height="480" fill="${h.fill}"/>
  <rect x="400" y="1000" width="280" height="280"/>
  <rect x="460" y="1060" width="64" height="64" rx="10" fill="${h.fill}"/><circle cx="476" cy="1076" r="6" fill="${h.ink}"/><circle cx="508" cy="1108" r="6" fill="${h.ink}"/>
  <rect x="560" y="1130" width="64" height="64" rx="10" fill="${h.fill}"/><circle cx="592" cy="1162" r="6" fill="${h.ink}"/>
  <path d="M330,1580 V1420 M750,1580 V1420" stroke-width="4"/>`;

export const v15: Video = {
  id: '15-nastolka',
  title: 'Реклама: правила в игре',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1120, s: 1.3 },
  lines: [
    { shot: 'wide', text: '«Правила ПДД<br>такие скучные…»', a: 'tired', b: 'neutral' },
    { shot: 'b', text: '«А правила настолок?»', b: 'doubt' },
    { shot: 'a', text: '«Это другое.<br>Это же игра!»', a: 'smile' },
    { shot: 'b', text: '«Одну настолку придумали,<br>чтобы объяснять законы»', b: 'cool' },
    { shot: 'a', text: '«Серьёзно?!»', a: 'shock' },
    { shot: 'b', text: '«В игре правила<br>понимаешь сам»', b: 'calm' },
    { shot: 'wide', text: '«Вот и ПДД так учи»', a: 'think', b: 'happy' },
  ],
  story: [
    { label: 'США, 1904', shots: [{ art: house }] },
    { label: 'Лиззи Мэги придумала<br>настольную игру', shots: [{ art: lizzie }] },
    { label: 'Чтобы объяснить экономику —<br>не лекцией, а игрой', shots: [{ art: lecture }, { art: boardTop }] },
    { label: 'Из неё выросла одна из самых<br>известных настолок мира', shots: [{ art: box }, { art: shelf }] },
    { label: 'Правила лучше учить играя', shots: [{ art: play }] },
  ],
  table: {
    left: 'ПРАВИЛА В КНИГЕ',
    right: 'ПРАВИЛА В ИГРЕ',
    leftIcon: ICON.book,
    rightIcon: '<rect x="-30" y="-30" width="60" height="60" rx="10"/><circle cx="-14" cy="-14" r="5"/><circle cx="14" cy="14" r="5"/><circle r="5"/>',
    rows: [
      ['скучно', 'азартно'],
      ['забываешь', 'помнишь'],
      ['непонятно зачем', 'понятно зачем'],
    ],
  },
  cta: ['Правила', 'запоминаются,', 'когда играешь'],
  bioGlyph: '<rect x="-30" y="-30" width="60" height="60" rx="10"/><circle cx="-14" cy="-14" r="5"/><circle cx="14" cy="14" r="5"/><circle r="5"/>',
};
