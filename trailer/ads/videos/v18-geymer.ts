/**
 * 18. «Виртуальный гонщик, а прав всё нет» — пиксельный терминал, игровое место с рулём.
 * История: 2011–2013 — победитель конкурса в гоночной игре через два года стал третьим в классе в «24 часах Ле-Мана».
 */
import { floorLine, person } from '../draw.ts';
import { gamingChair, simRig } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.pixel;
const h = th.hist;
const A = person(th, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 112, f: 1, arms: ['wheel', 'wheel'], hair: 'spiky', face: 'neutral' });
const B = person(th, { id: 'B', x: 880, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'long', face: 'grin' });

const scene = `
  ${floorLine(1300)}
  ${gamingChair(330, 1300, 1, th.fill)}
  ${simRig(540, 1300, th.fill, th.accent)}
  ${A.svg}${B.svg}`;

// ─── История: 2011–2013 ────────────────────────────────────────────────────────

const flag = `
  ${Array.from({ length: 30 }, (_, i) => `<rect x="${300 + (i % 6) * 80}" y="${880 + Math.floor(i / 6) * 80}" width="80" height="80" ${(i + Math.floor(i / 6)) % 2 ? `fill="${h.ink}"` : `fill="${h.fill}"`}/>`).join('')}
  <path d="M300,880 V1560" stroke-width="10"/>`;

const winner = `
  <path d="M40,1500 H1040"/>
  ${gamingChair(300, 1500, 1, h.fill)}
  ${still(h, { x: 300, floor: 1500, pose: 'sit', seat: 112, f: 1, arms: ['up', 'up'], hair: 'spiky', face: 'grin' })}
  <rect x="620" y="1000" width="300" height="200" fill="${h.fill}"/>${text(770, 1120, 60, h.ink, '1st')}
  <path d="M770,1200 V1300 M700,1300 H840"/>`;

const helmet = `
  <path d="M260,1300 Q260,860 560,860 Q820,860 840,1120 L840,1300 Z" fill="${h.fill}"/>
  <path d="M480,1020 H840 V1160 H520 Q470,1160 480,1100 Z" fill="${h.ink}"/>
  <path d="M260,1300 H840 M300,1200 H420" stroke-width="6"/>`;

const raceCar = `
  <path d="M40,1460 H1040"/>
  <path d="M120,1380 L200,1300 H460 L560,1220 H700 L760,1300 H960 L980,1380 Z" fill="${h.fill}"/>
  <path d="M100,1300 V1220 H220 V1300" fill="${h.fill}"/>
  <rect x="200" y="1360" width="160" height="100" fill="${h.fill}"/><rect x="740" y="1360" width="160" height="100" fill="${h.fill}"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${40 + i * 90}" y="1500" width="45" height="30" ${i % 2 ? `fill="${h.ink}"` : `fill="${h.fill}"`}/>`).join('')}`;

const night = `
  <path d="M40,1460 H1040"/>
  <path d="M120,1380 L200,1300 H460 L560,1220 H700 L760,1300 H960 L980,1380 Z" fill="${h.fill}"/>
  <rect x="200" y="1360" width="160" height="100" fill="${h.fill}"/><rect x="740" y="1360" width="160" height="100" fill="${h.fill}"/>
  <path d="M980,1340 L1080,1260 M980,1360 L1080,1400" stroke-width="4"/>
  ${text(540, 1000, 140, h.ink, '24 ч')}`;

const podium = `
  <path d="M40,1500 H1040"/>
  <path d="M400,1500 V1180 H680 V1500 M120,1500 V1300 H400 M680,1500 V1360 H960 V1500" fill="${h.fill}"/>
  ${text(540, 1300, 80, h.ink, '1')}${text(260, 1420, 80, h.ink, '2')}${text(820, 1470, 80, h.ink, '3')}
  ${still(h, { x: 820, floor: 1360, pose: 'stand', f: 1, arms: ['up', 'up'], hair: 'spiky', face: 'grin' })}`;

const toWheel = `
  <rect x="160" y="920" width="320" height="220" fill="${h.fill}"/><path d="M320,1140 V1220 M260,1220 H380"/>
  <path d="M520,1030 H600 M570,1000 L610,1030 L570,1060" stroke-width="8"/>
  <circle cx="790" cy="1030" r="140" fill="${h.fill}"/><circle cx="790" cy="1030" r="34"/><path d="M756,1040 L660,1070 M824,1040 L920,1070 M790,1064 V1170" stroke-width="7"/>`;

export const v18: Video = {
  id: '18-geymer',
  title: 'Реклама: из игры за руль',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 600, fy: 1110, s: 1.25 },
  lines: [
    { shot: 'wide', text: 'Виртуальный гонщик,<br>а прав всё нет', a: 'neutral', b: 'grin' },
    { shot: 'a', text: 'Из игры тоже можно<br>в настоящую машину', a: 'cool' },
    { shot: 'b', text: 'Ага, конечно', b: 'doubt' },
    { shot: 'a', text: 'Один геймер так попал<br>на «24 часа Ле-Мана»', a: 'smile' },
    { shot: 'b', text: 'Не может быть!', b: 'shock' },
    { shot: 'a', text: 'И сразу на подиум', a: 'grin' },
    { shot: 'wide', text: 'Ладно… А ПДД<br>в игре есть?', a: 'happy', b: 'think' },
  ],
  story: [
    { label: 'Великобритания, 2011', shots: [{ art: flag }] },
    { label: 'Янн Марденборо выиграл<br>конкурс в гоночной игре', shots: [{ art: winner }] },
    { label: 'Потом — тренировки<br>в настоящей гоночной машине', shots: [{ art: helmet }, { art: raceCar }] },
    { label: '2013, «24 часа Ле-Мана» —<br>третье место в классе', shots: [{ art: night }, { art: podium }] },
    { label: 'Из игры — за руль', shots: [{ art: toWheel }] },
  ],
  table: {
    left: 'ПРОСТО ИГРАТЬ',
    right: 'ИГРАТЬ С ЦЕЛЬЮ',
    leftIcon: '<path d="M-30,-14 H30 Q42,-14 42,2 L44,18 Q44,30 32,28 L18,14 H-18 L-32,28 Q-44,30 -44,18 L-42,2 Q-42,-14 -30,-14 Z"/>',
    rightIcon: '<path d="M-20,-30 H20 V-6 Q20,16 0,18 Q-20,16 -20,-6 Z M0,18 V28 M-14,34 H14"/>',
    rows: [
      ['время уходит', 'навык растёт'],
      ['ничего не меняется', 'права всё ближе'],
      ['родители ворчат', 'родители в шоке'],
    ],
  },
  cta: ['Играешь?', 'Тогда играй', 'на права'],
  bioGlyph: '<path d="M-38,14 A38,38 0 0 1 38,-4 V22 H-38 Z M-8,0 H38"/>',
};
