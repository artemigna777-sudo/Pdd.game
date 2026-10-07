/**
 * 17. «Пробные экзамены? Сдам и так» — светодиодное табло, крыша ночью с телескопом.
 * История: «Аполлон-13», 1970 — после аварии каждый шаг спасения проверили на тренажёре, экипаж вернулся.
 */
import { ICON, floorLine, moon, person, stars } from '../draw.ts';
import { apollo, panel, roof, telescope } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { at, still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = { ...THEMES2.dots, lineDash: '0.1 13' };
const h = th.hist;
const A = person(th, { id: 'A', x: 260, floor: 1300, pose: 'stand', f: 1, arms: ['hip', 'down'], hair: 'ponytail', face: 'cool' });
const B = person(th, { id: 'B', x: 820, floor: 1300, pose: 'stand', f: -1, arms: ['down', 'down'], hair: 'cap', face: 'neutral' });

const scene = `
  ${moon(880, 640, 56, th.fill)}
  ${stars([[140, 620], [640, 560]])}
  ${roof(1300)}
  ${floorLine(1300)}
  ${telescope(540, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// ─── История: «Аполлон-13», 1970 ───────────────────────────────────────────────

const houston = `
  <path d="M40,1480 H1040"/>
  ${[0, 1, 2].map((i) => `<path d="M${120 + i * 300},1480 V1240 H${360 + i * 300} V1480" fill="${h.fill}"/>${panel(150 + i * 300, 1150, 2, 1, h.fill)}`).join('')}
  <rect x="200" y="860" width="680" height="240" fill="${h.fill}"/><path d="M240,1060 C380,920 520,1060 640,940 S800,960 840,900" stroke-width="5" stroke-dasharray="12 10"/>`;

const blast = `
  <circle cx="300" cy="1350" r="200" fill="${h.fill}"/><path d="M160,1300 q60,-40 120,0 q60,40 120,0 M180,1400 q70,30 160,-10" stroke-width="4"/>
  ${apollo(560, 1000, h.fill)}
  <path d="M440,1090 l-60,90 M480,1100 l10,110 M410,1060 l-110,40" stroke="${h.accent}" stroke-width="9"/>
  <circle cx="450" cy="1080" r="34" fill="${h.accent}" stroke="${h.accent}"/>`;

const switches = panel(200, 860, 7, 6, h.fill);

const checklist = `
  <rect x="270" y="800" width="540" height="740" fill="${h.fill}"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="320" y="${880 + i * 80}" width="40" height="40"/><path d="M390,${900 + i * 80} H${700 - (i % 3) * 60}" stroke-width="4"/>${i < 5 ? `<path d="M326,${898 + i * 80} l12,14 l26,-30" stroke-width="6"/>` : ''}`).join('')}`;

const sim = `
  <path d="M40,1500 H1040"/>
  <path d="M220,1500 V1080 L540,860 L860,1080 V1500" fill="${h.fill}"/>
  ${still(h, { x: 480, floor: 1500, pose: 'sit', f: 1, arms: ['front', 'lap'], hair: 'helmet', face: 'think' })}
  ${panel(600, 1150, 2, 2, h.fill)}`;

const control = `
  <path d="M40,1500 H1040"/>
  ${[180, 540, 900].map((x) => `${still(h, { x, floor: 1500, pose: 'sit', f: 1, arms: ['table', 'chin'], table: 1330, face: 'think' })}`).join('')}
  <path d="M60,1330 H1020"/>
  <rect x="240" y="820" width="600" height="300" fill="${h.fill}"/>${text(540, 1000, 60, h.ink, 'ТРЕНАЖЁР')}`;

const home = `
  <path d="M40,1480 q60,-30 120,0 q60,30 120,0 q60,-30 120,0 q60,30 120,0 q60,-30 120,0 q60,30 120,0 q60,-30 120,0 q60,30 120,0 q60,-30 120,0" />
  <path d="M480,1340 L600,1340 L560,1240 L520,1240 Z" fill="${h.fill}"/>
  <path d="M520,1240 L360,900 M540,1240 L540,880 M560,1240 L720,900" stroke-width="3"/>
  ${[360, 540, 720].map((x) => `<path d="M${x - 100},${900} Q${x},${760} ${x + 100},${900} Z" fill="${h.fill}"/>`).join('')}
  <g stroke-width="8">${at(ICON.check, 860, 1200, 1.4)}</g>`;

export const v17: Video = {
  id: '17-apollon',
  title: 'Реклама: репетиция спасает',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1110, s: 1.25 },
  lines: [
    { shot: 'wide', text: '«Пробные экзамены?<br>Сдам и так»', a: 'cool', b: 'neutral' },
    { shot: 'b', text: '«А если растеряешься?»', b: 'doubt' },
    { shot: 'a', text: '«С чего бы?»', a: 'smile' },
    { shot: 'b', text: '«Даже астронавты<br>всё репетируют»', b: 'calm' },
    { shot: 'a', text: '«Ну это космос…»', a: 'doubt' },
    { shot: 'b', text: '«Однажды репетиция<br>их и спасла»', b: 'cool' },
    { shot: 'wide', text: '«Расскажи!»', a: 'think', b: 'happy' },
  ],
  story: [
    { label: 'Хьюстон, 1970', shots: [{ art: houston }] },
    { label: 'На «Аполлоне-13»<br>взорвался кислородный бак', shots: [{ art: blast }] },
    { label: 'Чтобы вернуться, корабль надо<br>было включить по-новому', shots: [{ art: switches }, { art: checklist }] },
    { label: 'Каждый шаг на Земле<br>проверили на тренажёре', shots: [{ art: sim }, { art: control }] },
    { label: 'Экипаж вернулся домой', shots: [{ art: home }] },
  ],
  table: {
    left: 'БЕЗ РЕПЕТИЦИИ',
    right: 'С РЕПЕТИЦИЕЙ',
    leftIcon: ICON.question,
    rightIcon: ICON.check,
    rows: [
      ['всё впервые', 'всё знакомо'],
      ['растерялся', 'действуешь'],
      ['экзамен — стресс', 'экзамен — повтор'],
    ],
  },
  cta: ['Отрепетируй', 'экзамен', 'заранее'],
  bioGlyph: '<path d="M0,-40 C16,-24 16,10 12,24 H-12 C-16,10 -16,-24 0,-40 Z M-12,10 L-24,30 H-12 M12,10 L24,30 H12 M-6,30 L0,42 L6,30"/><circle cy="-8" r="6"/>',
};
