/**
 * 10. «Три часа ночи, а я ещё учу билеты» — лунный свет, видеозвонок из двух комнат.
 * История: США, 1924 — после сна выученное забывается меньше (Дженкинс и Далленбах).
 */
import { ICON, bed, books, chair, clockFace, floorLine, lamp, moon, person, stars } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, fadeIn, fadeOut, pop, shot, still, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.moon;
const h = th.hist;
const A = person(th, { id: 'A', x: 150, floor: 1300, pose: 'sit', f: 1, arms: ['table', 'chin'], hair: 'spiky', table: 1150, face: 'tired' });
const B = person(th, { id: 'B', x: 680, floor: 1140, pose: 'lie', f: 1, arms: ['phone', 'down'], hair: 'long', face: 'sleepy' });

const scene = `
  ${floorLine(1300)}
  <path d="M540,690 V1300" stroke-dasharray="18 16" stroke-width="4"/>
  ${clockFace(420, 720, 50, 3, 0, th.fill)}
  ${text(420, 815, 34, th.accent, '03:00')}
  ${chair(150, 1300, 1)}
  <path d="M240,1150 H500 M262,1150 V1300 M478,1150 V1300"/>
  ${books(330, 1150, 4)}${lamp(440, 1150)}
  <rect x="740" y="560" width="220" height="240" fill="${th.fill}"/><path d="M850,560 V800 M740,680 H960" stroke-width="4"/>
  ${moon(900, 620, 30, th.fill)}
  ${stars([[790, 600], [800, 760], [930, 750]])}
  ${bed(600, 1040, 1200, 1300, th.fill)}
  ${A.svg}${B.svg}`;

// Демо: ночь в 3:00 превращается в неделю по 20 минут.
const [t0, t1, t2, t3] = T.demo;
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const demoSvg = `
  <g id="dclock">${clockFace(540, 900, 230, 3, 0, th.fill)}${text(540, 1280, 72, th.ink, '03:00')}</g>
  <g id="dzzz" opacity="0" stroke="${th.accent}" stroke-width="6">${at(ICON.zzz, 820, 640, 2)}</g>
  ${DAYS.map((d, i) => {
    const x = 150 + i * 130;
    return `<g id="dday${i}" opacity="0"><rect x="${x - 52}" y="900" width="104" height="104" rx="18" fill="${th.fill}"/><rect class="dfill" x="${x - 40}" y="912" width="80" height="80" rx="12" fill="${th.accent}" stroke="none" opacity="0"/>${text(x, 860, 36, th.ink, d)}</g>`;
  }).join('')}
  ${text(540, 1140, 60, th.ink, 'по 20 минут', 'id="dmin" opacity="0"')}
  ${text(540, 1220, 60, th.ink, 'и спать', 'id="dsleep" opacity="0"')}`;
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1000, 1),
  `tl.fromTo('#dclock', { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(1.6)' }, ${(t0 + 0.05).toFixed(3)});`,
  pop('#dzzz', t0 + 0.35, 0.25),
  to('#dclock', { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, t1, 0.25, 'power2.in'),
  fadeOut('#dzzz', t1, 0.15),
  ...DAYS.map((_, i) => pop(`#dday${i}`, t1 + 0.25 + i * 0.07, 0.15, 0.6)),
  ...DAYS.map((_, i) => fadeIn(`#dday${i} .dfill`, t1 + 0.8 + i * 0.14, 0.1)),
  fadeIn('#dmin', t1 + 0.9),
  fadeIn('#dsleep', t1 + 1.6),
  shot('#dcam', t2, t3 - t2, 540, 1010, 1.15),
].join('\n      ');

// ─── История: США, 1924 ────────────────────────────────────────────────────────

const night = `
  <path d="M60,1460 H1020"/>
  <path d="M300,1460 V1080 L540,900 L780,1080 V1460" fill="${h.fill}"/>
  <rect x="380" y="1140" width="110" height="120" fill="${h.accent}" stroke="${h.ink}"/><rect x="590" y="1140" width="110" height="120"/>
  <path d="M480,1460 V1320 H600 V1460" stroke-width="4"/>
  ${moon(860, 760, 60, h.fill)}${stars([[180, 820], [300, 700], [700, 680], [960, 920]])}`;

const learner = `
  <path d="M60,1460 H1020"/>
  ${chair(330, 1460, 1)}
  <path d="M420,1300 H820 M440,1300 V1460 M800,1300 V1460"/>
  ${still(h, { x: 330, floor: 1460, pose: 'sit', f: 1, arms: ['table', 'chin'], table: 1300, hold: 'cards', face: 'think' })}
  ${lamp(740, 1300)}`;

const sleepDay = `
  <path d="M540,820 V1520" stroke-dasharray="16 14"/>
  <path d="M60,1460 H1020"/>
  ${bed(90, 500, 1360, 1460, h.fill)}
  ${still(h, { x: 170, floor: 1300, pose: 'lie', f: 1, face: 'sleepy' })}
  ${moon(300, 980, 50, h.fill)}
  ${at(ICON.sun, 800, 980, 1.8, 'stroke-width="3"')}
  ${still(h, { x: 800, floor: 1460, pose: 'stand', f: 1, arms: ['down', 'hip'], face: 'neutral' })}`;

const result = `
  <path d="M160,1440 H920"/>
  <rect x="230" y="900" width="220" height="540" fill="${h.accent}" stroke="${h.accent}"/>
  <rect x="630" y="1240" width="220" height="200" fill="${h.fill}"/>
  ${at(ICON.moon, 340, 1530, 1.1, 'stroke-width="5"')}${at(ICON.sun, 740, 1530, 1.1, 'stroke-width="5"')}
  ${text(340, 860, 56, h.ink, 'после сна')}${text(740, 1200, 56, h.ink, 'после дня')}`;

const brain = `
  ${at(ICON.brain, 540, 1180, 7, 'stroke-width="1.2"')}
  ${moon(840, 820, 70, h.fill)}
  ${at(ICON.zzz, 280, 860, 1.6, 'stroke-width="4"')}`;

const rest = `
  ${at(ICON.bed, 540, 1240, 7, 'stroke-width="1.1"')}
  ${at(ICON.sun, 820, 860, 2.4, `stroke="${h.accent}" stroke-width="3.5"`)}`;

export const v10: Video = {
  id: '10-son',
  title: 'Реклама: учись и высыпайся',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 520, fy: 1100, s: 1.2 },
  lines: [
    { shot: 'wide', text: '«Три часа ночи,<br>а я учу билеты»', a: 'tired', b: 'sleepy' },
    { shot: 'b', text: '«Ты чего не спишь?»', b: 'doubt' },
    { shot: 'a', text: '«Экзамен в девять.<br>Не успеваю!»', a: 'shock' },
    { shot: 'b', text: '«Ложись. Сон тоже учит»', b: 'calm' },
    { shot: 'a', text: '«Это как?»', a: 'doubt' },
    { shot: 'b', text: '«Пока спишь, мозг<br>сохраняет выученное»', b: 'smile' },
    { shot: 'wide', text: '«Я так и сдала.<br>И выспалась»', a: 'think', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'США, 1924', art: night },
    { label: 'Учёные проверяли,<br>когда забывается меньше', art: learner },
    { label: 'После учёбы — то сон,<br>то обычный день', art: sleepDay },
    { label: 'После сна помнили<br>намного больше', art: result },
    { label: 'Сон закрепляет<br>выученное', art: brain },
    { label: 'Учи понемногу —<br>и высыпайся', art: rest },
  ],
  table: {
    left: 'ВСЁ ЗА НОЧЬ',
    right: 'ПО ЧУТЬ-ЧУТЬ',
    leftIcon: ICON.moon,
    rightIcon: ICON.sun,
    rows: [
      ['не спал до утра', 'спишь по 8 часов'],
      ['голова как вата', 'голова свежая'],
      ['на экзамене — туман', 'на экзамене — ясно'],
    ],
  },
  cta: ['Хватит', 'учить до утра', 'учись и высыпайся'],
  bioGlyph: ICON.bed,
};
