/**
 * 53. «Не сдал теорию — не моё» — улица, машина у обочины (старый формат: белые человечки + гравюра, `engine3.ts`).
 * История-гравюра: легенда о Роберте Брюсе (Шотландия, 1306) — король, проигравший шесть сражений, прятался в пещере,
 * смотрел, как паук раз за разом пытается натянуть нить между стенами, и на седьмой попытке паук справился;
 * Брюс вернулся к борьбе (легенда закреплена Вальтером Скоттом: https://en.wikipedia.org/wiki/Robert_the_Bruce#Legend_of_the_spider).
 * Инфографика: 7 попыток; в игре ошибки возвращаются через 1, 3 и 7 дней.
 */
import { carSide, floorLine, person, streetLamp } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { battlement } from '../etch2.ts';
import { cloud, fig, ground, ink, rock, sky, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 190, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'chin'], hair: 'curly', face: 'sad' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'long', face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${streetLamp(1010, 1300, C.accent)}
  ${carSide(560, 1300, DLG.fill, false)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: пещера ──────────────────────────────────────────────────────────

const GROUND = 1760;
const L: [number, number] = [330, 1060]; // левый угол свода (куда крепится нить)
const R: [number, number] = [790, 1090];

/** Паук: тело, голова, восемь ног; начало — центр тела. */
const spider = (k = 1) => `<g transform="scale(${k})"><ellipse cx="0" cy="0" rx="22" ry="17" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><circle cx="-24" cy="-4" r="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><path d="M-8,-8 q8,8 16,0 M-4,2 h10" stroke="${C.ink}" stroke-width="3" fill="none"/>
  ${[-1, 1].map((d) => [-28, -10, 8, 26].map((x, i) => `<path d="M${x},${i % 2 ? 4 : -4} q${d * 14},${-18 - i * 3} ${d * 30},${i * 7 - 4} q${d * 8},16 ${d * 14},26" fill="none" stroke="${C.paper}" stroke-width="4"/>`).join('')).join('')}</g>`;

const tableau = `
  ${sky()}
  ${cloud(180, 520, 380)}${cloud(880, 640, 300)}
  ${rock('hill', `M-400,${GROUND} L-400,1100 L-120,960 L180,860 L420,800 L700,820 L960,900 L1240,1020 L1500,1100 L1500,${GROUND} Z`, [-420, 780, 1960, 1000], 120, 17, 0.35)}
  ${ink(`M200,${GROUND} L200,1330 Q210,1040 540,1000 Q870,1040 880,1330 L880,${GROUND} Z`)}
  <path d="M200,${GROUND} L200,1330 Q210,1040 540,1000 Q870,1040 880,1330 L880,${GROUND}" stroke-width="7" fill="none"/>
  ${ground(GROUND)}
  <!-- шесть зарубок -->
  <g>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${420 + i * 36},1180 v70" stroke="${C.paper}" stroke-width="8" stroke-linecap="round"/>`).join('')}</g>
  <!-- нить паука: до успеха, повисает -->
  <g class="s-fail">
    <circle cx="${L[0]}" cy="${L[1]}" r="6" fill="${C.paper}"/><circle cx="${R[0]}" cy="${R[1]}" r="6" fill="${C.paper}"/>
    <g id="sp1"><path d="M${L[0]},${L[1]} Q440,1280 560,1330" stroke="${C.paper}" stroke-width="3" fill="none"/><g transform="translate(560 1350) scale(1)">${spider(1.3)}</g></g>
  </g>
  <!-- седьмая попытка: нить натянута -->
  <g class="s-ok" opacity="0">
    <circle cx="${L[0]}" cy="${L[1]}" r="6" fill="${C.paper}"/><circle cx="${R[0]}" cy="${R[1]}" r="6" fill="${C.paper}"/>
    <path d="M${L[0]},${L[1]} L${R[0]},${R[1]}" stroke="${C.paper}" stroke-width="4"/>
    <g transform="translate(560 1070) rotate(8)">${spider(1.2)}</g>
  </g>
  <!-- паутина «после» -->
  <g class="st-a">
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M555,1280 L${(555 + 250 * Math.cos((i * Math.PI) / 4)).toFixed(0)},${(1280 + 250 * Math.sin((i * Math.PI) / 4) * 0.85).toFixed(0)}" stroke="${C.paper}" stroke-width="2.4"/>`).join('')}
    ${[60, 120, 180, 235].map((r) => `<path d="${[0, 1, 2, 3, 4, 5, 6, 7, 0].map((i, k) => `${k ? 'L' : 'M'}${(555 + r * Math.cos((i * Math.PI) / 4)).toFixed(0)},${(1280 + r * Math.sin((i * Math.PI) / 4) * 0.85).toFixed(0)}`).join(' ')}" stroke="${C.paper}" stroke-width="2.2" fill="none"/>`).join('')}
  </g>
  <!-- Брюс -->
  <g id="bruce">
    ${fig({ x: 380, y: 1556, lean: 6, nod: -14, arm: [30, 40], arm2: [20, 30], leg: [12, 10], leg2: [-12, 0], dress: 'coat', pat: 'a60', hair: 'crown', beard: true, face: 'sad' })}
  </g>
  <g class="st-a">${battlement(-380, 880, 360, 280)}${wh('M-210,880 V760')}<path d="M-210,880 V740" stroke-width="6"/><path d="M-210,740 L-110,764 L-210,790 z" fill="${C.accent}" stroke-width="3"/></g>`;

const story = [
  { fx: 540, fy: 1260, s: 1.0, label: 'Шотландия, 1306 год' },
  { fx: 400, fy: 1480, s: 1.9, label: 'Король проиграл шесть сражений' },
  { fx: 430, fy: 1260, s: 2.2, label: 'Шесть зарубок на стене пещеры' },
  { fx: 560, fy: 1250, s: 1.9, label: 'Паук раз за разом срывался' },
  { fx: 560, fy: 1130, s: 1.9, label: 'А на седьмой раз — получилось', on: '.s-ok', off: '.s-fail' },
  { fx: 420, fy: 1470, s: 1.8, label: 'Брюс встал и вернулся к борьбе' },
];
const after = [
  { fx: 540, fy: 1260, s: 1.0 },
  { fx: 555, fy: 1280, s: 2.2 },
  { fx: 400, fy: 1480, s: 1.9 },
  { fx: 540, fy: 1260, s: 1.1, ds: 1.1 },
];

// ─── Инфографика: семь попыток ────────────────────────────────────────────────

const circle = (i: number, cls: string, fill: string) =>
  `<circle class="${cls}" id="${cls}${i}" cx="${540 + (i - 3) * 130}" cy="760" r="48" fill="${fill}" stroke="${i === 6 ? C.accent : '#fff'}" stroke-width="7"/>`;
const info = {
  html: `
    ${itext('i-h', 470, 40, 'ПО ЛЕГЕНДЕ, 1306 ГОД')}
    ${isvg([0, 1, 2, 3, 4, 5, 6].map((i) => circle(i, 'cw', 'none')).join('') + [0, 1, 2, 3, 4, 5, 6].map((i) => `<text class="cx" id="cx${i}" x="${540 + (i - 3) * 130}" y="784" text-anchor="middle" font-size="64" font-weight="900" fill="#fff">${i < 6 ? '×' : '✓'}</text>`).join('') + circle(6, 'co', C.accent))}
    ${itext('i-n', 880, 120, '7-Я ПОПЫТКА', C.accent, 900, 'white-space:nowrap')}
    ${itext('i-s', 1080, 46, 'ОШИБКА — НЕ КОНЕЦ.<br>ВАЖНО НЕ БРОСАТЬ')}
    ${itext('i-y', 1260, 30, 'В ИГРЕ ОШИБКИ ВОЗВРАЩАЮТСЯ ЧЕРЕЗ 1, 3 И 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => pop(`#cw${i}`, t[0] + 0.04 * i)),
      `tl.set('.cx', { opacity: 0 }, 0);`,
      ...[0, 1, 2, 3, 4, 5].map((i) => `tl.set('#cx${i}', { opacity: 1 }, ${(t[0] + 0.12 + 0.05 * i).toFixed(3)});`),
      `tl.set('#co6', { opacity: 0 }, 0);`,
      `tl.set('#co6', { opacity: 1 }, ${t[1].toFixed(3)}); tl.set('#cx6', { opacity: 1 }, ${t[1].toFixed(3)});`,
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v53: Video3 = {
  id: '53-bruce',
  title: 'Реклама: Роберт Брюс и паук',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Не сдал теорию.<br>Видимо, не моё»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Сколько раз сдавал?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Один…»', cams: ['a', 'a'], a: 'tired' },
    { text: '«Король Шотландии<br>проиграл шесть битв»', cams: ['b', [540, 1180, 2.2]], b: 'cool' },
    { text: '«И что он сделал?»', cams: ['a', 'wide'], a: 'doubt' },
    { text: '«Спрятался в пещере<br>и смотрел на паука»', cams: ['ab', 'b'], b: 'smile' },
    { text: '«На паука?»', cams: ['a', [560, 1140, 2.4]], a: 'shock' },
    { text: '«А паук плёл с седьмой попытки»', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  extra: (T) =>
    [
      `tl.fromTo('#sp1', { rotation: -5, transformOrigin: '${L[0]}px ${L[1]}px' }, { rotation: 5, duration: 0.5, repeat: 8, yoyo: true, ease: 'sine.inOut' }, ${T.story[0]});`,
      `tl.fromTo('#bruce', { y: 0 }, { y: -4, duration: 0.7, repeat: 12, yoyo: true, ease: 'sine.inOut' }, ${T.story[0]});`,
    ].join('\n      '),
  info,
  cta: { lines: ['Не бросай.', 'Пересдай', 'с седьмой'], accent: 2 },
  bioGlyph: '<circle cy="0" r="14"/><path d="M-14,0 l-22,-14 M-14,4 l-24,6 M14,0 l22,-14 M14,4 l24,6 M-10,12 l-14,24 M10,12 l14,24"/>',
};
