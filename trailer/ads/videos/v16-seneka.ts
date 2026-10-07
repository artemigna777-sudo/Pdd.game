/**
 * 16. «Объясни мне перекрёстки» — трафарет на бетоне, школьный коридор со шкафчиками.
 * История: Рим, I век — Сенека: «Уча других, мы учимся сами».
 */
import { ICON, floorLine, person } from '../draw.ts';
import { lockers } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.stencil;
const h = th.hist;
const A = person(th, { id: 'A', x: 300, floor: 1300, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'none', face: 'neutral' });
const B = person(th, { id: 'B', x: 790, floor: 1300, pose: 'stand', f: -1, arms: ['front', 'down'], hair: 'long', hold: 'book', face: 'sad' });

const scene = `
  ${lockers(-20, 10, 820, 1300, th.fill)}
  ${floorLine(1300)}
  ${A.svg}${B.svg}`;

// ─── История: Рим, I век ───────────────────────────────────────────────────────

const colosseum = `
  <path d="M40,1480 H1040"/>
  <path d="M140,1480 V900 Q540,820 940,900 V1480" fill="${h.fill}"/>
  ${[0, 1, 2]
    .map((r) =>
      Array.from({ length: 7 }, (_, i) => {
        const x = 180 + i * 108;
        const y = 1000 + r * 160;
        return `<path d="M${x},${y + 120} V${y + 40} A36,36 0 0 1 ${x + 72},${y + 40} V${y + 120}" stroke-width="4"/>`;
      }).join(''),
    )
    .join('')}
  <path d="M140,980 Q540,900 940,980 M140,1140 Q540,1080 940,1140 M140,1300 Q540,1250 940,1300" stroke-width="4"/>`;

const toga = (x: number, floor: number) => `<path d="M${x - 50},${floor - 10} L${x - 20},${floor - 250} Q${x + 40},${floor - 280} ${x + 40},${floor - 230} L${x + 60},${floor - 10} Z" fill="${h.fill}"/>`;
const seneca = `
  <path d="M40,1480 H1040"/>
  ${still(h, { x: 300, floor: 1480, pose: 'sit', f: 1, arms: ['table', 'lap'], beard: true, table: 1300, hold: 'paper', face: 'think' })}
  <path d="M400,1300 H860 M420,1300 V1480 M840,1300 V1480"/>
  <path d="M760,1300 v-80 M740,1220 h40 M760,1220 q-14,-30 0,-56 q14,26 0,56" stroke-width="4"/>
  <path d="M170,1480 V900 M130,900 h80 M890,1480 V900 M850,900 h80" stroke-width="5"/>`;

const scroll = `
  <path d="M260,820 H820 V1440 H260 Z" fill="${h.fill}"/>
  <path d="M230,800 H850 M230,1460 H850" stroke-width="16"/>
  ${['HOMINES', 'DUM DOCENT', 'DISCUNT'].map((w, i) => text(540, 1020 + i * 120, 66, h.ink, w, 'font-family="serif" letter-spacing="4"')).join('')}
  ${text(540, 1380, 34, h.ink, 'Сенека, письмо 7')}`;

const teach = `
  <path d="M40,1500 H1040"/>
  ${still(h, { x: 280, floor: 1500, pose: 'stand', f: 1, arms: ['point', 'down'], beard: true, face: 'smile' })}
  ${toga(280, 1500)}
  ${still(h, { x: 800, floor: 1500, pose: 'stand', f: -1, arms: ['chin', 'down'], hair: 'curly', face: 'think' })}
  ${toga(800, 1500)}
  <circle cx="300" cy="880" r="46" fill="${h.accent}" stroke="${h.accent}"/><circle cx="800" cy="880" r="46" fill="${h.accent}" stroke="${h.accent}"/>
  <path d="M300,800 v-30 M800,800 v-30 M240,840 l-24,-18 M860,840 l24,-18 M360,840 l24,-18 M740,840 l-24,-18" stroke-width="5"/>`;

const gate = `
  <path d="M40,1480 H1040"/>
  <path d="M200,1480 V980 H880 V1480 M300,1480 V1120 Q540,940 780,1120 V1480" fill="${h.fill}"/>
  <path d="M170,980 H910 L540,820 Z" fill="${h.fill}"/>
  <rect x="290" y="1010" width="500" height="70" fill="${h.fill}"/>${text(540, 1058, 34, h.ink, 'DOCENDO DISCIMUS', 'letter-spacing="3"')}`;

const cap = `
  <path d="M200,1080 L540,940 L880,1080 L540,1220 Z" fill="${h.fill}"/>
  <path d="M340,1140 V1310 Q540,1400 740,1310 V1140" fill="${h.fill}"/>
  <path d="M540,1080 L800,1160 V1330" stroke="${h.accent}" stroke-width="7"/><circle cx="800" cy="1340" r="14" fill="${h.accent}" stroke="${h.accent}"/>`;

const duel = `
  <path d="M40,1500 H1040"/>
  ${still(h, { x: 260, floor: 1500, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'none', face: 'grin' })}
  ${still(h, { x: 820, floor: 1500, pose: 'stand', f: -1, arms: ['point', 'down'], hair: 'long', face: 'grin' })}
  ${text(540, 1100, 120, h.accent, 'VS')}`;

export const v16: Video = {
  id: '16-seneka',
  title: 'Реклама: объясни другу',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1110, s: 1.3 },
  lines: [
    { shot: 'wide', text: 'Объясни мне перекрёстки,<br>я не понимаю', a: 'neutral', b: 'sad' },
    { shot: 'a', text: 'Я и сам не уверен…', a: 'doubt' },
    { shot: 'b', text: 'Ну попробуй', b: 'smile' },
    { shot: 'a', text: 'Помеха справа, значит…<br>О, вот оно что!', a: 'shock' },
    { shot: 'b', text: 'Понял, пока объяснял?', b: 'grin' },
    { shot: 'a', text: 'Похоже, да. Давай ещё!', a: 'happy' },
    { shot: 'wide', text: 'Устроим дуэль<br>по билетам?', a: 'grin', b: 'cool' },
  ],
  story: [
    { label: 'Рим, I век', shots: [{ art: colosseum }] },
    { label: 'Философ Сенека<br>писал письма другу', shots: [{ art: seneca }] },
    { label: 'И заметил: «Уча других,<br>мы учимся сами»', shots: [{ art: scroll }, { art: teach }] },
    { label: 'Сегодня это девиз<br>нескольких университетов', shots: [{ art: gate }, { art: cap }] },
    { label: 'Объясни другу — поймёшь сам', shots: [{ art: duel }] },
  ],
  table: {
    left: 'ЗУБРИТЬ ОДНОМУ',
    right: 'ОБЪЯСНЯТЬ ДРУГУ',
    leftIcon: ICON.book,
    rightIcon: '<circle cx="-16" cy="-12" r="13"/><circle cx="18" cy="-12" r="13"/><path d="M-38,32 Q-16,4 6,32 M0,32 Q18,4 40,32"/>',
    rows: [
      ['скучно', 'весело'],
      ['кажется, понял', 'точно понял'],
      ['сам с собой', 'вдвоём быстрее'],
    ],
  },
  cta: ['Позови друга', 'и вызови его', 'на дуэль по ПДД'],
  bioGlyph: '<circle cx="-16" cy="-12" r="13"/><circle cx="18" cy="-12" r="13"/><path d="M-38,32 Q-16,4 6,32 M0,32 Q18,4 40,32"/>',
};
