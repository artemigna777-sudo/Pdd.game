/**
 * 52. «Позанимаюсь, когда будет настроение» — комната днём. Плоская цветная рисовка (`engine9.ts`, `flat.ts`).
 * История: Майкл Фелпс — 23 олимпийских золота (28 медалей); по его словам и словам тренера Боба Боумена, он около пяти
 * лет подряд тренировался без выходных, включая праздники и день рождения (в источниках 5–6 лет).
 * https://en.wikipedia.org/wiki/Michael_Phelps · https://www.dailyathlete.ca/phelps
 */
import { pop, show, type Key } from '../engine3.ts';
import type { Video9 } from '../engine9.ts';
import { FL, bedroom, fperson } from '../flat.ts';

const FLOOR = 1180;
const A = fperson({ id: 'A', x: 790, floor: FLOOR, f: -1, pose: 'sit', coat: '#c9774a', hat: 'curly', hair: '#2b1d16', arms: ['down', 'chin'], face: 'smirk' });
const B = fperson({ id: 'B', x: 300, floor: FLOOR + 30, f: 1, coat: FL.blue, pants: FL.jeans, hat: 'short', hair: '#3a2416', scarf: FL.red, arms: ['hip', 'mug'], face: 'calm' });
const scene = `${bedroom(FLOOR)}${B.svg}${A.svg}`;

// ─── Картина: бассейн, календарь, пьедестал ───────────────────────────────────

const lanes = Array.from({ length: 6 }, (_, i) => `<g><rect x="-100" y="${420 + i * 86}" width="1280" height="6" fill="#ffd36b"/>${Array.from({ length: 24 }, (_, k) => `<circle cx="${-90 + k * 54}" cy="${423 + i * 86}" r="8" fill="${k % 2 ? '#e8473d' : '#fff'}"/>`).join('')}</g>`).join('');
const tiles = Array.from({ length: 36 }, (_, i) => `<path d="M-100,${380 + i * 16} H1180" stroke="#fff" stroke-opacity="0.07" stroke-width="3"/>`).join('');
const waves = Array.from({ length: 26 }, (_, i) => `<path d="M${(i * 211) % 1100},${440 + ((i * 97) % 480)} q20,-12 40,0 t40,0" stroke="#fff" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');

const swimmer = `<g id="swim" transform="translate(300 590)">
  <path d="M-120,40 q60,-30 140,-6 l0,22 q-70,-10 -140,10 z" fill="${FL.skin2}"/>
  <path d="M30,16 q70,-70 150,-30 l-8,24 q-60,-28 -120,14 z" fill="${FL.skin}"/>
  <circle cx="-12" cy="26" r="36" fill="${FL.skin}"/><path d="M-48,22 a36,36 0 0 1 72,-8 q-30,-12 -72,8 z" fill="#2b4fb0"/>
  <path d="M-30,24 h38" stroke="#1c1c24" stroke-width="12" stroke-linecap="round"/><circle cx="-16" cy="26" r="3.5" fill="#1c1c24"/>
  <ellipse cx="-4" cy="62" rx="90" ry="14" fill="#fff" opacity="0.55"/><ellipse cx="120" cy="58" rx="40" ry="8" fill="#fff" opacity="0.4"/></g>`;

const calendarCells = Array.from({ length: 35 }, (_, i) => {
  const c = i % 7;
  const r = Math.floor(i / 7);
  const x = 195 + c * 98;
  const y = 1120 + r * 98;
  const birthday = i === 17;
  const cross = `<path d="M${x + 12},${y + 12} l50,50 M${x + 62},${y + 12} l-50,50" stroke="#e8473d" stroke-width="9" stroke-linecap="round" class="x9" ${birthday ? 'opacity="0"' : ''}/>`;
  return `<rect x="${x}" y="${y}" width="88" height="88" rx="8" fill="#f7f1df"/><text x="${x + 12}" y="${y + 30}" font-family="Oswald" font-weight="700" font-size="26" fill="#5a5247">${i + 1}</text>${cross}
    ${birthday ? `<circle cx="${x + 44}" cy="${y + 50}" r="40" fill="none" stroke="#e8473d" stroke-width="6" class="bd9"/><g class="bd9" transform="translate(${x + 44} ${y + 54})"><rect x="-18" y="-6" width="36" height="22" rx="4" fill="#f2a6b8"/><rect x="-3" y="-24" width="6" height="18" fill="#fff"/><path d="M0,-34 q-8,10 0,14 q8,-4 0,-14" fill="#ffb03a"/></g>${cross.replace('class="x9"', 'class="xb9"').replace('opacity="0"', 'opacity="0" id="xbd"')}` : ''}`;
}).join('');

const podium = `<g>
  <rect x="150" y="1790" width="240" height="150" fill="#9aa3b5"/><rect x="420" y="1730" width="240" height="210" fill="#e0b04f"/><rect x="690" y="1830" width="240" height="110" fill="#b97a46"/>
  <text x="270" y="1870" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="70" fill="#fff" opacity="0.8">2</text>
  <text x="540" y="1830" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="90" fill="#fff" opacity="0.9">1</text>
  <text x="810" y="1900" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="60" fill="#fff" opacity="0.8">3</text>
  <rect x="90" y="1940" width="900" height="30" fill="#6b4e33"/></g>`;
const medals = Array.from({ length: 23 }, (_, i) => {
  const x = 130 + (i % 12) * 74;
  const y = 1380 + Math.floor(i / 12) * 96;
  return `<g class="med9" transform="translate(${x} ${y})"><path d="M-10,-50 l10,26 l10,-26 z" fill="#2b4fb0"/><circle r="30" fill="#f0c24a"/><circle r="22" fill="none" stroke="#c99a22" stroke-width="4"/><path d="M-8,-4 l8,-12 l8,12 l-8,10 z" fill="#c99a22" opacity="0.7"/></g>`;
}).join('');

const champ = fperson({ id: 'C', x: 540, floor: 1730, f: 1, s: 0.32, coat: '#2b4fb0', pants: '#2b4fb0', hat: 'short', hair: '#2b1d16', arms: ['wave', 'wave'], face: 'grin', faces: ['grin'] });

const tableau = `
  <defs><linearGradient id="poolg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#37b3d6"/><stop offset="1" stop-color="#1b6aa5"/></linearGradient>
    <linearGradient id="hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3b5e"/><stop offset="1" stop-color="#46547d"/></linearGradient></defs>
  <rect x="-500" y="-500" width="2080" height="3100" fill="${FL.night}"/>
  <rect x="-500" y="-100" width="2080" height="480" fill="url(#hall)"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${-80 + i * 120}" y="-40" width="64" height="200" rx="8" fill="#e9e4cf" opacity="0.1"/>`).join('')}
  <text x="540" y="260" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="96" fill="#fff" opacity="0.15" letter-spacing="14">ОЛИМПИАДА</text>
  <rect x="-500" y="380" width="2080" height="560" fill="url(#poolg)"/>${tiles}${waves}${lanes}${swimmer}
  <rect x="-500" y="930" width="2080" height="26" fill="#d9d2c0"/>
  <rect x="140" y="1040" width="800" height="720" rx="26" fill="#3b2a22"/><rect x="170" y="1060" width="740" height="56" rx="12" fill="#c2413a"/>
  <text x="540" y="1100" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="40" fill="#fff" letter-spacing="8">ТРЕНИРОВКИ</text>
  <rect x="180" y="1110" width="720" height="680" fill="none"/>
  ${calendarCells}
  ${Array.from({ length: 5 }, (_, i) => `<circle cx="${230 + i * 150}" cy="1050" r="9" fill="#d9d2c0"/>`).join('')}
  <rect x="-500" y="1800" width="2080" height="1400" fill="#2a2f40"/>
  <g transform="translate(0 480)">${podium}
  <g class="st-b"><text x="540" y="1620" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="64" fill="#fff" opacity="0.25" letter-spacing="6">ПОКА ПУСТО</text></g>
  <g class="st-a">${medals}${champ.svg}
    ${Array.from({ length: 40 }, (_, i) => `<rect class="conf9" x="${(i * 97) % 1000 + 40}" y="${1420 + ((i * 53) % 300)}" width="14" height="22" rx="3" fill="${['#e8473d', '#ffcf73', '#3f9bd4', '#7bc47a'][i % 4]}" transform="rotate(${(i * 37) % 360} ${(i * 97) % 1000 + 47} ${1420 + ((i * 53) % 300) + 11})"/>`).join('')}
  </g></g>`;

const story: Key[] = [
  { fx: 540, fy: 640, s: 1.0, label: 'Майкл Фелпс, пловец' },
  { fx: 330, fy: 620, s: 2.2, dx: 120, label: 'Тренировка каждый день' },
  { fx: 540, fy: 1250, s: 1.1, label: 'Праздники и выходные — тоже' },
  { fx: 490, fy: 1260, s: 2.4, on: '#xbd', label: 'Даже в день рождения' },
  { fx: 540, fy: 1250, s: 0.9, ds: 1.1, label: 'Около пяти лет без выходных' },
  { fx: 540, fy: 2100, s: 1.0, label: 'Пять Олимпиад' },
];
const after: Key[] = [
  { fx: 540, fy: 2090, s: 1.05 },
  { fx: 540, fy: 2000, s: 1.9, dx: 20 },
  { fx: 540, fy: 2110, s: 2.8, dy: -20 },
  { fx: 540, fy: 2090, s: 1.0, ds: 1.1 },
];

const dots = Array.from({ length: 23 }, (_, i) => `<circle class="dot9" cx="${150 + (i % 8) * 110}" cy="${480 + Math.floor(i / 8) * 110}" r="42" fill="#f0c24a"/><circle class="dot9" cx="${150 + (i % 8) * 110}" cy="${480 + Math.floor(i / 8) * 110}" r="28" fill="none" stroke="#c99a22" stroke-width="6"/>`).join('');
const info = {
  html: `
    <div id="i-h" style="position:absolute;left:40px;right:40px;top:300px;text-align:center;font-size:44px;font-weight:700;color:#fff;letter-spacing:3px;opacity:0">ОЛИМПИЙСКИХ ЗОЛОТА</div>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0">${dots}</svg>
    <div id="i-n" style="position:absolute;left:40px;right:40px;top:900px;text-align:center;font-size:190px;font-weight:700;color:${FL.orange};opacity:0">23</div>
    <div id="i-s" style="position:absolute;left:40px;right:40px;top:1160px;text-align:center;font-size:56px;font-weight:700;color:#fff;line-height:1.15;opacity:0">А ВСЕГО — 28 МЕДАЛЕЙ.<br>И ПОЧТИ ВСЕ — ПО ГРАФИКУ</div>
    <div id="i-y" style="position:absolute;left:40px;right:40px;top:1380px;text-align:center;font-size:44px;font-weight:500;color:#c9cfdb;line-height:1.2;opacity:0">РЕЖИМ ВАЖНЕЕ НАСТРОЕНИЯ:<br>20 МИНУТ В ДЕНЬ БЕЗ ПРОПУСКОВ</div>
    <div id="i-src" style="position:absolute;left:40px;right:40px;top:1580px;text-align:center;font-size:26px;font-weight:400;color:#7d8597;letter-spacing:2px;opacity:0">ДАННЫЕ: ОЛИМПИЙСКИЕ ИГРЫ 2000–2016</div>`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('.dot9', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.14, stagger: 0.012, ease: 'back.out(2)' }, ${t[0].toFixed(3)});`,
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
      show('#i-src', t[3] + 0.15),
    ].join('\n      '),
};

export const v52: Video9 = {
  id: '52-felps',
  title: 'Реклама: Фелпс и тренировки',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 540, fy: 830, s: 1.0 },
  ab: { fx: 540, fy: 760, s: 1.25 },
  note: ['Суббота', 'учить билеты — потом'],
  lines: [
    { text: 'Позанимаюсь, когда будет *настроение*', cams: ['wide', 'a'], a: 'smirk', b: 'calm' },
    { text: 'Фелпс так *не думал*', cams: ['b', 'ab'], b: 'doubt' },
    { text: 'Кто? Этот *пловец*?', cams: ['a', 'a'], a: 'think' },
    { text: '23 золота. Пять лет *без выходных*', cams: ['b', [B.head.x + 40, B.head.y + 80, 2.5]], b: 'smile' },
    { text: 'Даже в *Новый год*?', cams: ['a', 'wide'], a: 'shock' },
    { text: 'Даже в *день рождения*', cams: ['ab', 'b'], b: 'calm', a: 'shock' },
    { text: 'Ну хоть по *чуть-чуть*…', cams: ['a', [A.head.x - 20, A.head.y + 70, 2.6]], a: 'sad' },
    { text: 'Вот так оно и *работает*', cams: ['wide', 'b'], a: 'think', b: 'smile' },
  ],
  tableau,
  story,
  after,
  stamps: [{ text: 'Без выходных', at: 1, top: 1260 }],
  info,
  cta: { lines: ['Не по настроению.', 'Каждый день', 'по чуть-чуть'], accent: 2 },
  bioGlyph: '<circle cy="-6" r="24"/><path d="M-26,34 q26,-26 52,0"/>',
  extra: () =>
    [
      `tl.fromTo('#swim', { x: -140 }, { x: 140, duration: 3.6, ease: 'none' }, 15.6);`,
      `tl.fromTo('.x9', { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.04 }, 17.6);`,
      `tl.fromTo('.med9', { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.12, stagger: 0.03, ease: 'back.out(2)' }, 23.6);`,
      `tl.fromTo('.conf9', { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.02 }, 23.7);`,
      `tl.fromTo('.steam', { y: 0, opacity: 0.9 }, { y: -14, opacity: 0.3, duration: 1.2, repeat: 12, yoyo: true, ease: 'sine.inOut' }, 0);`,
      `tl.to('#secHand', { rotation: 360, transformOrigin: '1.5px 50px', duration: 15.6, ease: 'none' }, 0);`,
    ].join('\n      '),
};
