/**
 * 56. «Опять провалил теорию. Не моё это» — площадка с баскетбольным кольцом (старый формат: белые человечки + гравюра, `engine3.ts`).
 * Тот же приём, что у роликов 53–55: узнаваемая боль в первой фразе, потом история про упорство.
 * История-гравюра: Майкл Джордан в 1978 не попал в основной состав школьной команды (Laney High School; он сам называл это «cut»);
 * в рекламе Nike «Failure» (1997) он говорит: «Я промахнулся больше 9000 раз, проиграл почти 300 игр, 26 раз мне доверяли
 * решающий бросок — и я промахивался. Я проваливался снова и снова. Именно поэтому я побеждаю». Шесть титулов NBA: 1991–1993, 1996–1998.
 * https://en.wikipedia.org/wiki/Michael_Jordan · https://cmoe.com/blog/michael-jordan-failure/
 */
import { floorLine, person, streetLamp } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, fig, ground, rng, sh, sky, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 200, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'chin'], hair: 'cap', face: 'sad' });
const B = person(DLG, { id: 'B', x: 880, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'long', face: 'calm' });

/** Кольцо на стойке: столб, щит, обруч, сетка. Стойка слева от кольца. */
const hoop = (x: number, floor: number, h = 520) => `
  <path d="M${x},${floor} V${floor - h} h-70"/>
  <path d="M${x - 70},${floor - h - 70} V${floor - h + 70}"/>
  <path d="M${x - 74},${floor - h + 30} h-90 M${x - 164},${floor - h + 30} l12,56 M${x - 74},${floor - h + 30} l-12,56 M${x - 152},${floor - h + 86} h66"/>`;

/** Баскетбольный мяч с швами. Начало — центр. */
const ball = (x: number, y: number, r = 34) => `<g transform="translate(${x} ${y})">${wh(`M${-r},0 a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`)}<path d="M${-r},0 H${r} M0,${-r} V${r} M${-r * 0.7},${-r * 0.7} q${r * 0.5},${r * 0.7} 0,${r * 1.4} M${r * 0.7},${-r * 0.7} q${-r * 0.5},${r * 0.7} 0,${r * 1.4}" fill="none" stroke-width="3"/></g>`;

const scene = `
  ${floorLine(1300)}
  ${streetLamp(1010, 1300, C.accent)}
  ${hoop(1090, 1300, 480)}
  ${ball(360, 1266)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: школа 1978 → гора мячей → кубки ────────────────────────────────

const G = 1760;
const sign = (x: number, n: string, hatch: string) => `
  <path d="M${x},${G} V1380" stroke-width="10"/>
  ${sh(`M${x - 150},1250 h300 v140 h-300 Z`, hatch)}<path d="M${x - 150},1250 h300 v140 h-300 Z" fill="none" stroke-width="6"/>
  ${wh(`M${x - 130},1266 h260 v108 h-260 Z`)}
  <text x="${x}" y="1346" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="82" fill="${C.ink}" stroke="none">${n}</text>`;

/** Кубок: чаша, ножка, основание, ручки. Начало — низ основания. */
const cup = (x: number, y: number, k = 1) => `
  <g transform="translate(${x} ${y}) scale(${k})" stroke-width="${(5 / k).toFixed(1)}">
    ${wh('M-34,-30 h68 v14 h-68 Z')}
    ${wh('M-8,-30 v-26 h16 v26')}
    ${wh('M-46,-132 h92 q0,70 -46,76 q-46,-6 -46,-76 Z')}
    <path d="M-46,-120 q-30,4 -26,28 q4,18 30,20 M46,-120 q30,4 26,28 q-4,18 -30,20" fill="none"/>
  </g>`;

/** Куча мячей, пирамидой. */
const heap = (() => {
  const r = rng(5);
  const out: string[] = [];
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const n = 10 - row;
    for (let i = 0; i < n; i++) {
      out.push(ball(1040 + (i - (n - 1) / 2) * 64 + (r() - 0.5) * 8, G - 34 - row * 58 + (r() - 0.5) * 6, 30));
    }
  }
  return out.join('');
})();

const player = (x: number, o: Parameters<typeof fig>[0] extends infer T ? Partial<T> : never) =>
  fig({ x, y: 1556, dress: 'tunic', pat: 'a60', sleeve: 'a60', legs: 'a30', hair: 'short', ...(o as object) } as Parameters<typeof fig>[0]);

const tableau = `
  ${sky()}
  <rect x="1470" y="-400" width="1500" height="2800" fill="${C.paper}" stroke="none"/><rect x="1470" y="-400" width="1500" height="2800" fill="url(#sky)" stroke="none"/>
  ${cloud(160, 560, 400)}${cloud(980, 680, 340)}${cloud(1500, 520, 300)}
  ${ground(G, -400, 2900)}
  <!-- 1978: не взяли в основной состав -->
  ${sign(300, '1978', 'c60')}
  ${player(470, { lean: 12, nod: 18, arm: [10, 20], arm2: [4, 14], leg: [6, 4], leg2: [-6, 2], face: 'sad', hand: ball(0, 36, 26) })}
  <!-- 9000: гора мячей под кольцом -->
  ${sign(840, '9000', 'c120')}
  ${heap}
  ${hoop(1480, G, 560)}
  ${player(1320, { f: 1, lean: -4, nod: -8, arm: [150, 20], arm2: [140, 30], leg: [6, 4], leg2: [-6, 2], face: 'sad' })}
  <!-- 1991: кубки -->
  ${sign(1760, '1991', 'a0')}
  ${sh(`M1950,${G} V${G - 150} H2410 V${G} Z`, 'b30')}<path d="M1950,${G} V${G - 150} H2410 V${G}" fill="none" stroke-width="6"/>
  <g class="st-a">
    ${Array.from({ length: 11 }, (_, i) => {
      const a = (-80 + i * 16) * (Math.PI / 180);
      return `<path d="M2180,${G - 460} L${(2180 + 300 * Math.sin(a)).toFixed(0)},${(G - 460 - 300 * Math.cos(a)).toFixed(0)}" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('')}
  </g>
  ${[0, 1, 2, 3, 4, 5].map((i) => cup(2000 + i * 72, G - 150, 0.62)).join('')}
  ${player(1850, { arm: [160, 20], arm2: [150, 30], nod: -14, leg: [6, 4], leg2: [-6, 2], face: 'shout' })}`;

const story = [
  { fx: 1000, fy: 1400, s: 0.62, label: 'США, 1978 год' },
  { fx: 470, fy: 1480, s: 1.9, label: 'Не попал в основной состав школы' },
  { fx: 1240, fy: 1560, s: 1.8, label: 'Тысячи промахов' },
  { fx: 1180, fy: 1560, s: 1.35, label: 'Больше 9000 промахов за карьеру' },
  { fx: 1850, fy: 1450, s: 1.5, dx: 110, label: '1991: первый титул' },
  { fx: 2200, fy: 1650, s: 1.9, label: 'Всего шесть титулов чемпиона' },
];
const after = [
  { fx: 1000, fy: 1400, s: 0.62 },
  { fx: 2180, fy: 1560, s: 1.8 },
  { fx: 1850, fy: 1490, s: 2.0 },
  { fx: 1000, fy: 1400, s: 0.62, ds: 1.1 },
];

// ─── Инфографика: что он сам говорил в рекламе ────────────────────────────────

const info = {
  html: `
    ${itext('i-h', 320, 36, 'МАЙКЛ ДЖОРДАН · РЕКЛАМА NIKE, 1997')}
    ${itext('i-a', 530, 84, '9000+ ПРОМАХОВ', '#fff', 900, 'white-space:nowrap')}
    ${itext('i-b', 690, 46, 'ПОЧТИ 300 ПРОИГРАННЫХ ИГР', '#fff', 800, 'white-space:nowrap')}
    ${itext('i-c', 790, 46, '26 РЕШАЮЩИХ БРОСКОВ МИМО', '#fff', 800, 'white-space:nowrap')}
    ${itext('i-n', 980, 150, '6 ТИТУЛОВ', C.accent, 900, 'white-space:nowrap')}
    ${itext('i-s', 1230, 44, '«Я ПРОВАЛИВАЛСЯ СНОВА И СНОВА.<br>И ПОЭТОМУ ПОБЕЖДАЮ»')}
    ${itext('i-y', 1450, 30, 'В ИГРЕ ОШИБКИ ВОЗВРАЩАЮТСЯ ЧЕРЕЗ 1, 3 И 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      pop('#i-a', t[0] + 0.12, 0.22),
      pop('#i-b', t[0] + 0.24, 0.22),
      pop('#i-c', t[0] + 0.36, 0.22),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v56: Video3 = {
  id: '56-jordan',
  title: 'Реклама: Джордан и 9000 промахов',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Опять провалил теорию.<br>Не моё это»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Знаешь, сколько бросков<br>промазал Джордан?»', cams: ['b', 'ab'], b: 'cool' },
    { text: '«Ну, штук сто?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Больше девяти тысяч»', cams: ['b', [540, 1180, 2.2]], b: 'smile' },
    { text: '«Девять тысяч?!»', cams: ['a', 'wide'], a: 'shock' },
    { text: '«И почти 300 игр<br>проиграл»', cams: ['ab', 'b'], b: 'cool' },
    { text: '«И всё равно легенда?»', cams: ['a', [A.head.x, A.head.y + 40, 2.5]], a: 'doubt' },
    { text: '«Шесть раз<br>стал чемпионом»', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  info,
  cta: { lines: ['Не бросай.', 'Пересдай', 'и побеждай'], accent: 2 },
  bioGlyph: '<circle cy="0" r="30"/><path d="M-30,0 H30 M0,-30 V30 M-21,-21 q15,21 0,42 M21,-21 q-15,21 0,42" fill="none"/>',
};
