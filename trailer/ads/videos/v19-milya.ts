/**
 * 19. «Говорят, теорию с первого раза не сдать» — тушь кистью, стадион.
 * История: Оксфорд, 1954 — Роджер Баннистер первым пробежал милю быстрее 4 минут; через 46 дней рекорд побил Джон Лэнди.
 */
import { ICON, floorLine, person } from '../draw.ts';
import { runner } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.sumi;
const h = th.hist;
const A = person(th, { id: 'A', x: 300, floor: 1300, pose: 'stand', f: 1, arms: ['hip', 'down'], hair: 'ponytail', face: 'sad' });
const B = person(th, { id: 'B', x: 790, floor: 1300, pose: 'stand', f: -1, arms: ['down', 'hip'], hair: 'cap', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  <path d="M-200,1380 H1300 M-200,1460 H1300" stroke-width="5"/>
  <path d="M560,1300 v160" stroke-width="12"/>
  <circle cx="860" cy="640" r="90" fill="${th.accent}" stroke="none" opacity="0.85"/>
  <path d="M-100,1000 Q300,940 700,1000 T1300,990" stroke-width="5" opacity="0.5"/>
  ${A.svg}${B.svg}`;

// ─── История: Оксфорд, 1954 ────────────────────────────────────────────────────

const oxford = `
  <path d="M40,1480 H1040"/>
  <path d="M160,1480 V1060 H360 V1480 M720,1480 V1060 H920 V1480" fill="${h.fill}"/>
  <path d="M440,1480 V900 H640 V1480" fill="${h.fill}"/><path d="M440,900 L540,700 L640,900" fill="${h.fill}"/>
  <path d="M500,1480 V1300 Q540,1240 580,1300 V1480 M180,1060 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50 M740,1060 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50 l20,-50 l20,50" stroke-width="4"/>`;

const wall = `
  <circle cx="540" cy="1000" r="190" fill="${h.fill}"/><path d="M540,1000 V860 M540,800 v-30 M500,770 h80" stroke-width="8"/>
  ${text(540, 1080, 64, h.ink, '4:00')}
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${140 + (i % 4) * 200 + (Math.floor(i / 4) % 2) * 100}" y="${1260 + Math.floor(i / 4) * 80}" width="200" height="80" fill="${h.fill}"/>`).join('')}`;

const run = `
  <path d="M40,1480 H1040"/>
  ${runner(h.fill, 520, 1480, 1)}
  <path d="M200,1200 h-120 M230,1280 h-170 M210,1360 h-130" stroke-width="5"/>
  <path d="M760,1480 V1140 M880,1480 V1140 M760,1240 H880" stroke-width="4"/>`;

const time = `
  ${text(540, 1150, 220, h.accent, '3:59,4')}
  <path d="M200,1300 L470,1340 M610,1330 L880,1290" stroke-width="7"/>
  <path d="M200,1300 v-60 M880,1290 v-60" stroke-width="5"/>`;

const calendar = `
  <rect x="220" y="820" width="640" height="660" rx="20" fill="${h.fill}"/>
  <path d="M220,960 H860 M380,780 v80 M700,780 v80"/>
  ${text(540, 1250, 220, h.ink, '46')}${text(540, 1380, 60, h.ink, 'дней')}`;

const second = `
  <path d="M40,1480 H1040"/>
  ${runner(h.fill, 620, 1480, 1)}
  <path d="M860,1480 V1100 M860,1260 L560,1270" stroke-width="5"/>
  ${text(300, 1000, 120, h.accent, '3:58')}`;

const many = `
  <path d="M40,1480 H1040"/>
  ${runner(h.fill, 260, 1480, 1)}${runner(h.fill, 540, 1480, 1)}${runner(h.fill, 820, 1480, 1)}`;

export const v19: Video = {
  id: '19-milya',
  title: 'Реклама: невозможное — пока не сделал',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1110, s: 1.25 },
  lines: [
    { shot: 'wide', text: '«Говорят, теорию<br>с первого раза не сдать»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«Кто говорит?»', b: 'doubt' },
    { shot: 'a', text: '«Все…»', a: 'tired' },
    { shot: 'b', text: '«Про милю за 4 минуты<br>тоже так говорили»', b: 'cool' },
    { shot: 'a', text: '«И что?»', a: 'doubt' },
    { shot: 'b', text: '«Пока один не пробежал.<br>А за ним — другие»', b: 'smile' },
    { shot: 'wide', text: '«Значит, и я смогу?»', a: 'smile', b: 'happy' },
  ],
  story: [
    { label: 'Оксфорд, 1954', shots: [{ art: oxford }] },
    { label: 'Милю быстрее 4 минут<br>не пробегал никто и никогда', shots: [{ art: wall }] },
    { label: 'Студент-медик Роджер Баннистер<br>пробежал за 3:59,4', shots: [{ art: run }, { art: time }] },
    { label: 'А через 46 дней его рекорд<br>побил Джон Лэнди', shots: [{ art: calendar }, { art: second }] },
    { label: 'Невозможное — пока не сделал', shots: [{ art: many }] },
  ],
  table: {
    left: 'МИФ',
    right: 'ФАКТ',
    leftIcon: ICON.cross,
    rightIcon: ICON.check,
    rows: [
      ['«все валят теорию»', 'кто готов — сдаёт'],
      ['«там одни подвохи»', 'там те же 800 вопросов'],
      ['«надо зубрить ночами»', 'по чуть-чуть в день'],
    ],
  },
  cta: ['Сдай', 'с первого раза', 'назло мифам'],
  bioGlyph: '<circle cy="6" r="32"/><path d="M0,6 V-14 M-8,-34 H8 M0,-34 V-26"/>',
};
