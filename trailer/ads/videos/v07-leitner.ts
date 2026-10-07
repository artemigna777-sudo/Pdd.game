/**
 * 7. «Бабуль, ты правда сдала теорию?» — вырезанная бумага, кухня.
 * История: Германия, 1972 — коробка Лайтнера: верные карточки повторяются реже, ошибки — чаще.
 */
import { ICON, chair, clockFace, floorLine, person } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { at, fadeIn, pop, set, shot, text, to } from '../kit.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.paper;
const h = th.hist;
const A = person(th, { id: 'A', x: 240, floor: 1260, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'spiky', table: 1100, face: 'doubt' });
const B = person(th, { id: 'B', x: 840, floor: 1260, pose: 'sit', f: -1, arms: ['table', 'lap'], hair: 'scarf', table: 1100, hold: 'cup', face: 'smile' });

const scene = `
  ${floorLine(1260)}
  <rect x="420" y="560" width="240" height="260" fill="${th.fill}"/><path d="M540,560 V820 M420,690 H660" stroke-width="4"/>
  <path d="M400,550 H680 M410,550 q20,120 -10,280 M670,550 q-20,120 10,280" stroke-width="4"/>
  ${clockFace(860, 640, 50, 10, 10, th.fill)}
  ${chair(240, 1260, 1)}${chair(840, 1260, -1)}
  <path d="M340,1100 H740 M362,1100 V1260 M718,1100 V1260"/>
  <path d="M480,1100 q-10,-70 60,-74 q70,4 60,74 Z M600,1060 q40,-10 50,-40 M520,1026 q20,-24 40,0" fill="${th.fill}"/>
  ${A.svg}${B.svg}`;

// Демо: три отделения коробки; верная карточка едет дальше, ошибка — в первое отделение.
const [t0, t1, t2, t3] = T.demo;
const BOX = [230, 540, 850];
const NAMES = ['каждый день', 'через 3 дня', 'через неделю'];
const cardG = (id: string, x: number, y: number, mark: 'ok' | 'bad') =>
  `<g id="${id}" transform="translate(${x} ${y})"><g><rect x="-60" y="-80" width="120" height="160" rx="10" fill="${th.fill}"/>${
    mark === 'ok' ? `<g stroke-width="8">${at(ICON.check, 0, 0, 1.5)}</g>` : `<g stroke="${th.accent}" stroke-width="9">${at(ICON.cross, 0, 0, 1.4)}</g>`
  }</g></g>`;
const demoSvg = `
  ${BOX.map((x, i) => `<path d="M${x - 135},1120 V1340 H${x + 135} V1120" fill="${th.fill}"/>${text(x, 1420, 40, th.ink, NAMES[i])}${text(x, 1290, 70, th.ink, String(i + 1), 'opacity="0.35"')}`).join('')}
  ${cardG('dc1', 230, 1060, 'ok')}
  ${cardG('dc3', 540, 1060, 'bad')}`;
const hop = (id: string, dx: number, t: number, d = 0.5) =>
  [to(id, { x: `${dx < 0 ? '-' : '+'}=${Math.abs(dx)}` }, t, d, 'power1.inOut'), to(id, { y: '-=160' }, t, d / 2, 'power1.out'), to(id, { y: '+=160' }, t + d / 2, d / 2, 'power1.in')].join(' ');
const demoTweens = [
  shot('#dcam', t0, t2 - t0, 540, 1150, 1.15),
  fadeIn('#dc1', t0 + 0.05, 0.15),
  set('#dc3', { opacity: 0 }, t0),
  hop('#dc1', 310, t0 + 0.3),
  hop('#dc1', 310, t1 + 0.05),
  fadeIn('#dc3', t1 + 0.6, 0.15),
  pop('#dc3 > g', t1 + 0.85, 0.2, 1.3),
  hop('#dc3', -310, t1 + 1.2, 0.6),
  shot('#dcam', t2, t3 - t2, 260, 1150, 1.8),
].join('\n      ');

// ─── История: Германия, 1972 ───────────────────────────────────────────────────

const typewriter = `
  <path d="M220,1400 L300,1120 H780 L860,1400 Z" fill="${h.fill}"/>
  <rect x="360" y="840" width="360" height="300" fill="${h.fill}"/>
  <path d="M400,900 H680 M400,950 H640 M400,1000 H660" stroke-width="4"/>
  <path d="M260,1120 H820" stroke-width="12"/>
  ${[0, 1, 2]
    .map((r) =>
      Array.from({ length: 8 - r }, (_, i) => `<circle cx="${330 + r * 22 + i * 60}" cy="${1200 + r * 60}" r="18" fill="${h.fill}"/>`).join(''),
    )
    .join('')}
  <path d="M60,1400 H1020"/>`;

const box5 = (counts: number[], extra = '') => `
  <path d="M120,1100 V1400 H960 V1100" fill="${h.fill}"/>
  ${[1, 2, 3, 4].map((i) => `<path d="M${120 + i * 168},1150 V1400"/>`).join('')}
  ${counts
    .map((n, i) =>
      Array.from({ length: n }, (_, k) => `<rect x="${140 + i * 168 + k * 8}" y="${1020 + k * 6}" width="110" height="140" rx="6" fill="${h.fill}" stroke-width="4"/>`).join(''),
    )
    .join('')}
  ${[1, 2, 3, 4, 5].map((n, i) => text(204 + i * 168, 1470, 44, h.ink, String(n))).join('')}
  ${extra}`;
const forward = box5(
  [3, 2, 2, 1, 1],
  `<rect x="330" y="760" width="110" height="140" rx="6" fill="${h.fill}"/><path d="M362,830 l18,20 l34,-40" stroke-width="7"/><path d="M460,830 C560,780 620,860 640,960" stroke-width="6"/><path d="M612,940 l28,26 l14,-36" stroke-width="6"/>`,
);
const back = box5(
  [3, 2, 2, 1, 1],
  `<rect x="700" y="760" width="110" height="140" rx="6" fill="${h.fill}" stroke="${h.accent}"/><path d="M735,810 l40,40 M775,810 l-40,40" stroke="${h.accent}" stroke-width="7"/><path d="M690,820 C500,700 280,760 210,960" stroke="${h.accent}" stroke-width="6"/><path d="M190,930 l20,34 l26,-30" stroke="${h.accent}" stroke-width="6"/>`,
);
const often = box5([7, 4, 3, 2, 1], `${text(204, 980, 44, h.accent, 'часто')}${text(876, 980, 44, h.ink, 'редко')}`);

const card = (x: number, r: number, body: string) =>
  `<g transform="rotate(${r} ${x} 1500)"><rect x="${x - 130}" y="920" width="260" height="360" rx="14" fill="${h.fill}"/>${body}</g>`;
const fan = `
  ${card(330, -14, text(330, 1140, 110, h.ink, 'А'))}
  ${card(540, 0, text(540, 1140, 100, h.ink, 'x²'))}
  ${card(750, 14, `<path d="M680,1180 L750,1050 L820,1180 Z" stroke="${h.accent}" stroke-width="10"/>${text(750, 1166, 60, h.accent, '!')}`)}`;

export const v07: Video = {
  id: '07-leitner',
  title: 'Реклама: повторяй ошибки',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Бабуль, ты правда<br>сдала теорию?»', a: 'doubt', b: 'smile' },
    { shot: 'b', text: '«С первого раза, внучок»', b: 'cool' },
    { shot: 'a', text: '«А я дважды завалил…»', a: 'sad' },
    { shot: 'b', text: '«Потому что гоняешь<br>всё подряд»', b: 'calm' },
    { shot: 'a', text: '«А надо как?»', a: 'think' },
    { shot: 'b', text: '«Только то,<br>в чём ошибся»', b: 'smile' },
    { shot: 'wide', text: '«Игра мне ошибки<br>сама подсовывала»', a: 'shock', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'Германия, 1972', art: typewriter },
    { label: 'Журналист Себастьян Лайтнер<br>придумал коробку для карточек', art: box5([3, 2, 2, 1, 1]) },
    { label: 'Ответил верно —<br>карточка едет дальше', art: forward },
    { label: 'Ошибся — назад,<br>в первое отделение', art: back },
    { label: 'Трудное повторяешь часто,<br>лёгкое — редко', art: often },
    { label: 'Так до сих пор учат<br>слова, формулы, правила', art: fan },
  ],
  table: {
    left: 'ВСЁ ПОДРЯД',
    right: 'ТОЛЬКО ОШИБКИ',
    leftIcon: ICON.boxes,
    rightIcon: ICON.cross,
    rows: [
      ['800 вопросов по кругу', 'то, что не знаешь'],
      ['знакомое — по 10 раз', 'знакомое — реже'],
      ['ошибки теряются', 'ошибки исчезают'],
    ],
  },
  cta: ['Хватит', 'гонять всё подряд', 'повторяй ошибки'],
  bioGlyph: ICON.card,
};
