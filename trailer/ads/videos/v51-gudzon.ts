/**
 * 51. «Зубрю всю ночь» — комната ночью перед теорией. Плоская цветная рисовка (`engine9.ts`, `flat.ts`).
 * История: «Чудо на Гудзоне» — 15 января 2009 года рейс US Airways 1549 сразу после взлёта из Ла-Гуардии
 * столкнулся со стаей канадских гусей, отказали оба двигателя; капитан Чесли Салленбергер посадил самолёт
 * на реку Гудзон, все 155 человек на борту выжили. От удара птиц до посадки — около 3,5 минуты.
 * https://en.wikipedia.org/wiki/US_Airways_Flight_1549 · https://en.wikipedia.org/wiki/Sully_Sullenberger
 * Самолёт нарисован без названия авиакомпании и логотипов.
 */
import { pop, show, type Key } from '../engine3.ts';
import type { Video9 } from '../engine9.ts';
import { FL, bedroom, ferry, fperson, goose, mini, plane, stars, tower } from '../flat.ts';

const FLOOR = 1180;
const A = fperson({ id: 'A', x: 790, floor: FLOOR, f: -1, pose: 'sit', coat: FL.green, hat: 'beanie', hatColor: '#2b2c36', arms: ['down', 'chin'], face: 'tired' });
const B = fperson({ id: 'B', x: 300, floor: FLOOR + 30, f: 1, coat: '#8d5aa0', pants: FL.jeans, hat: 'bun', hair: '#6a3b22', scarf: FL.orange, arms: ['hip', 'mug'], face: 'calm' });

const scene = `${bedroom(FLOOR)}${B.svg}${A.svg}`;

// ─── Картина: Нью-Йорк, Гудзон ────────────────────────────────────────────────

const RIVER = 1150;
const skyline = [
  [430, 70, 260, '#3c4a6b'], [505, 60, 360, '#4a5878'], [570, 80, 300, '#35425f'], [655, 56, 470, '#52617f'], [716, 90, 330, '#3f4c6c'],
  [812, 64, 540, '#5a6987'], [880, 84, 380, '#3a4766'], [970, 70, 300, '#4b5978'], [1045, 90, 420, '#38445f'], [1140, 80, 260, '#45526f'],
]
  .map(([x, w, h, c], i) => tower(x as number, RIVER, w as number, h as number, c as string, 0.3, i + 1))
  .join('');
const ripples = Array.from({ length: 34 }, (_, i) => {
  const x = ((i * 173) % 1500) - 200;
  const y = RIVER + 40 + ((i * 97) % 900);
  return `<path d="M${x},${y} h${60 + (i % 4) * 30}" stroke="#fff" stroke-opacity="${0.12 + (i % 3) * 0.06}" stroke-width="5" stroke-linecap="round"/>`;
}).join('');
const ice = [[-60, 1260, 70], [180, 1700, 50], [930, 1300, 60], [1050, 1650, 80], [120, 1980, 70], [820, 1880, 55]]
  .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r as number) * 0.3}" fill="#e9f0f6" opacity="0.8"/>`)
  .join('');

/** Самолёт на воде: люди на крыле и на надувном трапе. */
const onWater = `<g id="pl3" style="opacity:0">
  ${plane(560, 1420, 1.0, 0)}
  <rect x="200" y="1452" width="760" height="70" fill="#2f4866" opacity="0.92"/>
  <path d="M200,1452 q190,-14 380,0 t380,0" stroke="#fff" stroke-opacity="0.5" stroke-width="6" fill="none"/>
  <path d="M410,1462 L470,1438 L640,1438 L700,1462 z" fill="#aeb5c4"/>
  ${mini(450, 1446, FL.red, 0.9, true)}${mini(492, 1444, '#e0b04f', 0.9)}${mini(530, 1442, FL.blue, 0.9, true)}${mini(568, 1442, FL.green, 0.9)}${mini(606, 1442, '#d9d2c0', 0.9, true)}${mini(644, 1444, '#8d5aa0', 0.9)}
  <path d="M700,1408 L760,1470 h120 q20,0 20,-20 v-10 z" fill="#f08a2a"/>
  ${mini(790, 1460, '#c9774a', 0.8, true)}${mini(830, 1460, FL.blue, 0.8)}${mini(866, 1458, FL.red, 0.8, true)}
</g>`;

const pilot = fperson({ id: 'P', x: 700, floor: 1446, f: 1, s: 0.12, coat: '#1d2a44', pants: '#1d2a44', hat: 'pilot', arms: ['down', 'wave'], face: 'calm', faces: ['calm'] });

const tableau = `
  <defs><linearGradient id="nySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4c72"/><stop offset="0.55" stop-color="#8f9ab4"/><stop offset="1" stop-color="#f2c69c"/></linearGradient>
    <linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d7898"/><stop offset="1" stop-color="#22354c"/></linearGradient></defs>
  <rect x="-500" y="-500" width="2080" height="${RIVER + 500}" fill="url(#nySky)"/>
  ${stars(10, -100, -300, 1300, 300, 11)}
  <circle cx="890" cy="1010" r="80" fill="#fff3d6" opacity="0.85"/><circle cx="890" cy="1010" r="150" fill="#fff3d6" opacity="0.15"/>
  <path d="M-500,${RIVER} V1090 q160,-40 300,-20 q160,20 300,-10 q120,-20 200,30 V${RIVER} z" fill="#4c5a74"/>
  ${tower(-160, RIVER, 80, 120, '#3d4963', 0.25, 21)}${tower(-60, RIVER, 60, 90, '#465370', 0.25, 22)}${tower(60, RIVER, 90, 150, '#3a4660', 0.25, 23)}
  ${skyline}
  <rect x="-500" y="${RIVER}" width="2080" height="1400" fill="url(#river)"/>
  <rect x="-500" y="${RIVER}" width="2080" height="10" fill="#c9d6e4" opacity="0.6"/>
  ${ripples}${ice}
  <!-- в воздухе: гуси и самолёт -->
  <g id="pl1">${plane(330, 520, 0.9, -8)}</g>
  <g id="f1" style="opacity:0"><g transform="translate(300 560)">
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${-70 - i * 80}" cy="${10 + i * 24}" r="${26 + i * 14}" fill="#4f535d" opacity="${0.8 - i * 0.13}"/>`).join('')}
    <path d="M-10,0 q-40,-14 -80,8 q34,6 44,20 q-34,8 -56,28 q46,0 92,-26 z" fill="#ff8a2a"/><path d="M-10,4 q-26,-6 -44,8 q22,4 44,6 z" fill="#ffe08a"/></g>
    ${[[420, 470], [470, 560], [380, 440]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M0,0 l10,-18 l4,16 l16,-6 l-10,14 l14,10 l-18,0 z" fill="#ffdf7a"/></g>`).join('')}
  </g>
  ${[[600, 430, 0.9, 1], [690, 380, 0.8, 0], [760, 470, 0.85, 1], [540, 360, 0.7, 0], [840, 400, 0.75, 1], [700, 520, 0.7, 0], [900, 470, 0.6, 1], [620, 300, 0.6, 1]]
    .map(([x, y, s, u]) => goose(x, y, s, !!u))
    .join('')}
  <g id="pl2" style="opacity:0">${plane(560, 1000, 0.8, 7, { smoke: true })}</g>
  ${onWater}
  <g class="st-a">
    ${ferry(1000, 1560, 0.9, -1)}${ferry(120, 1620, 0.8, 1)}
    <path d="M840,1600 q80,-10 160,0 M60,1660 q70,-8 130,0" stroke="#fff" stroke-width="6" stroke-opacity="0.6" fill="none"/>
    ${mini(940, 1500, FL.orange, 0.7, true)}${mini(980, 1500, '#e9e6df', 0.7)}${mini(150, 1556, FL.orange, 0.7, true)}
    ${pilot.svg}
  </g>`;

const story: Key[] = [
  { fx: 540, fy: 860, s: 1.0, label: 'Нью-Йорк, 15 января 2009' },
  { fx: 520, fy: 450, s: 1.8, dx: 30, label: 'Сразу после взлёта — стая гусей' },
  { fx: 330, fy: 540, s: 2.3, on: '#f1', label: 'Отказали оба двигателя' },
  { fx: 560, fy: 1010, s: 1.5, on: '#pl2', off: '#pl1, #f1, .goose', label: 'До аэропорта не дотянуть' },
  { fx: 560, fy: 1380, s: 1.5, on: '#pl3', off: '#pl2', label: 'Капитан сажает самолёт на реку' },
  { fx: 640, fy: 1430, s: 2.3, label: 'Все 155 человек живы' },
];
const after: Key[] = [
  { fx: 560, fy: 1300, s: 1.05 },
  { fx: 680, fy: 1400, s: 3.4, dy: -10 },
  { fx: 880, fy: 1480, s: 1.9, dx: 40 },
  { fx: 540, fy: 1150, s: 0.95, ds: 1.1 },
];

// ─── Инфографика ──────────────────────────────────────────────────────────────

const dots = Array.from({ length: 155 }, (_, i) => {
  const c = i % 16;
  const r = Math.floor(i / 16);
  return `<circle class="dot9" cx="${180 + c * 48}" cy="${430 + r * 48}" r="17" fill="${FL.orange}"/>`;
}).join('');
const info = {
  html: `
    <div id="i-h" style="position:absolute;left:40px;right:40px;top:300px;text-align:center;font-size:44px;font-weight:700;color:#fff;letter-spacing:3px;opacity:0">ЛЮДЕЙ НА БОРТУ</div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">${dots}</svg>
    <div id="i-n" style="position:absolute;left:40px;right:40px;top:960px;text-align:center;font-size:170px;font-weight:700;color:${FL.orange};opacity:0">155 ИЗ 155</div>
    <div id="i-s" style="position:absolute;left:40px;right:40px;top:1180px;text-align:center;font-size:56px;font-weight:700;color:#fff;line-height:1.15;opacity:0">ВЫЖИЛИ. ВСЁ РЕШИЛИ<br>3,5 МИНУТЫ</div>
    <div id="i-y" style="position:absolute;left:40px;right:40px;top:1360px;text-align:center;font-size:44px;font-weight:500;color:#c9cfdb;line-height:1.2;opacity:0">А ДО ЭТОГО У КАПИТАНА —<br>ПОЧТИ 20 000 ЧАСОВ ПОЛЁТОВ</div>
    <div id="i-src" style="position:absolute;left:40px;right:40px;top:1560px;text-align:center;font-size:26px;font-weight:400;color:#7d8597;letter-spacing:2px;opacity:0">РЕЙС 1549 · 15.01.2009 · ДАННЫЕ NTSB</div>`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('.dot9', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.12, stagger: 0.0028, ease: 'back.out(2)' }, ${t[0].toFixed(3)});`,
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
      show('#i-src', t[3] + 0.15),
    ].join('\n      '),
};

export const v51: Video9 = {
  id: '51-gudzon',
  title: 'Реклама: Чудо на Гудзоне',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 540, fy: 830, s: 1.0 },
  ab: { fx: 540, fy: 760, s: 1.25 },
  note: ['Ночь перед теорией', '02:40 · экзамен в 9:00'],
  lines: [
    { text: 'Завтра теория. *Зубрю* всю ночь', cams: ['wide', 'a'], a: 'tired', b: 'calm' },
    { text: 'А на время *решать* пробовал?', cams: ['b', 'ab'], b: 'doubt' },
    { text: 'Зачем? Я все *ответы* прочитал', cams: ['a', 'a'], a: 'smirk' },
    { text: 'На экзамене *волнение*. Голова пустеет', cams: ['b', [B.head.x + 40, B.head.y + 80, 2.5]], b: 'neutral' },
    { text: 'И что тогда *делать*?', cams: ['a', 'wide'], a: 'shock' },
    { text: 'Решать, пока руки не делают *сами*', cams: ['ab', 'b'], b: 'smile', a: 'think' },
    { text: 'Это как вообще?', cams: ['a', [A.head.x - 20, A.head.y + 70, 2.6]], a: 'doubt' },
    { text: 'Как пилот на *Гудзоне*', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  stamps: [{ text: 'Тяги нет', at: 2, top: 1260 }],
  info,
  cta: { lines: ['Не зубри.', 'Тренируй', 'до автомата'], accent: 2 },
  bioGlyph: '<path d="M-40,10 L40,-20 L20,10 L40,30 z"/>',
  extra: () =>
    [
      `tl.to('#secHand', { rotation: 360, transformOrigin: '1.5px 50px', duration: 15.6, ease: 'none' }, 0);`,
      `tl.fromTo('.steam', { y: 0, opacity: 0.9 }, { y: -14, opacity: 0.3, duration: 1.2, repeat: 12, yoyo: true, ease: 'sine.inOut' }, 0);`,
      `tl.fromTo('.twk1', { opacity: 0.2 }, { opacity: 1, duration: 0.7, repeat: 22, yoyo: true }, 0);`,
      `tl.fromTo('.cone', { opacity: 0.85 }, { opacity: 1, duration: 0.15, repeat: 9, yoyo: true }, 10.2);`,
      `tl.fromTo('.goose', { y: 0 }, { y: -12, duration: 0.25, repeat: 18, yoyo: true, ease: 'sine.inOut' }, 15.6);`,
      `tl.fromTo('#pl1', { x: 0 }, { x: 60, duration: 2.9, ease: 'none' }, 15.6);`,
      `tl.fromTo('#pl2', { x: -60, y: -30 }, { x: 40, y: 20, duration: 1.0, ease: 'none' }, 18.6);`,
    ].join('\n      '),
};
