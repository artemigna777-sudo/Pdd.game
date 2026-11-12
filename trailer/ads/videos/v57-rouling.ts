/**
 * 57. «Две пересдачи — и всё. Не моё» — стол с лампой и рукописью (старый формат: белые человечки + гравюра, `engine3.ts`).
 * Тот же приём, что у роликов 53–56: узнаваемая боль в первой фразе, потом история про упорство.
 * История-гравюра: рукопись «Гарри Поттера» Дж. К. Роулинг отклонили 12 издательств; тринадцатым её взяло Bloomsbury
 * (1996), книга вышла в 1997 году. Сумму аванса источники называют по-разному, поэтому в ролике её нет.
 * https://en.wikipedia.org/wiki/J._K._Rowling · https://en.wikipedia.org/wiki/Barry_Cunningham_(publisher)
 */
import { books, desk, floorLine, lamp, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, fig, ground, rng, sh, sky, wh } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 200, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'chin'], hair: 'bun', face: 'sad' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'calm' });

const scene = `
  ${floorLine(1300)}
  ${desk(400, 720, 1130, 1300)}
  ${books(480, 1130, 5)}
  ${lamp(650, 1130)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: стол писательницы → 12 конвертов → книги на полке ───────────────

const G = 1760;

const sign = (x: number, n: string, hatch: string) => `
  <path d="M${x},${G} V1380" stroke-width="10"/>
  ${sh(`M${x - 150},1250 h300 v140 h-300 Z`, hatch)}<path d="M${x - 150},1250 h300 v140 h-300 Z" fill="none" stroke-width="6"/>
  ${wh(`M${x - 130},1266 h260 v108 h-260 Z`)}
  <text x="${x}" y="1346" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="82" fill="${C.ink}" stroke="none">${n}</text>`;

/** Конверт: прямоугольник и «клапан». Начало — центр. */
const envelope = (x: number, y: number, k = 1, rot = 0) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" stroke-width="${(4 / k).toFixed(1)}">
    ${wh('M-60,-38 h120 v76 h-120 Z')}
    <path d="M-60,-38 L0,6 L60,-38 M-60,38 L-14,0 M60,38 L14,0" fill="none"/>
  </g>`;

/** Книга стоя: обложка, корешок и две строчки названия. Начало — низ по центру. */
const book = (x: number, y: number, h = 190, w = 62, fill = 'a60') => `
  ${sh(`M${x - w / 2},${y} v${-h} h${w} v${h} Z`, fill)}<path d="M${x - w / 2},${y} v${-h} h${w} v${h} Z M${x - w / 2 + 10},${y - h + 30} h${w - 20} M${x - w / 2 + 10},${y - h + 48} h${w - 34}" fill="none" stroke-width="4"/>`;

/** Куча из 12 конвертов: 5 + 4 + 3. */
const pile = (() => {
  const r = rng(21);
  const out: string[] = [];
  const rows = [5, 4, 3];
  rows.forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      out.push(envelope(1040 + (i - (n - 1) / 2) * 118 + (r() - 0.5) * 10, G - 40 - row * 78, 0.9, (r() - 0.5) * 14));
    }
  });
  return out.join('');
})();

/** Стол писательницы: столешница с рукописью. */
const writingDesk = (x: number) => `
  ${sh(`M${x - 210},${G - 190} h420 v26 h-420 Z`, 'b30')}<path d="M${x - 210},${G - 190} h420 v26 h-420 Z" fill="none" stroke-width="6"/>
  <path d="M${x - 180},${G - 164} V${G} M${x + 180},${G - 164} V${G}" stroke-width="8"/>
  ${wh(`M${x + 40},${G - 206} h150 v16 h-150 Z`)}${wh(`M${x + 52},${G - 222} h126 v16 h-126 Z`)}
  <path d="M${x + 60},${G - 216} h90 M${x + 70},${G - 232} h70" stroke-width="3"/>`;

const author = (x: number, o: Parameters<typeof fig>[0] extends infer T ? Partial<T> : never) =>
  fig({ x, y: 1556, dress: 'robe', pat: 'a60', sleeve: 'a60', legs: 'a30', hair: 'long', ...(o as object) } as Parameters<typeof fig>[0]);

const tableau = `
  ${sky()}
  <rect x="1470" y="-400" width="1500" height="2800" fill="${C.paper}" stroke="none"/><rect x="1470" y="-400" width="1500" height="2800" fill="url(#sky)" stroke="none"/>
  ${cloud(160, 560, 400)}${cloud(980, 680, 340)}${cloud(1500, 520, 300)}
  ${ground(G, -400, 2900)}
  <!-- 1995: рукопись готова -->
  ${sign(300, '1995', 'c60')}${writingDesk(600)}
  ${author(430, { lean: 10, nod: 14, arm: [40, 50], arm2: [30, 40], leg: [6, 4], leg2: [-6, 2], face: 'sad' })}
  <!-- 12 отказов -->
  ${sign(840, '×12', 'c120')}
  ${pile}
  ${author(1380, { f: -1, lean: 10, nod: 16, arm: [20, 30], arm2: [10, 20], leg: [8, 4], leg2: [-10, 4], face: 'sad' })}
  <!-- 1997: книга вышла -->
  ${sign(1700, '1997', 'a0')}
  ${sh(`M1950,${G} V${G - 150} H2430 V${G} Z`, 'b30')}<path d="M1950,${G} V${G - 150} H2430 V${G}" fill="none" stroke-width="6"/>
  <g class="st-a">
    ${Array.from({ length: 11 }, (_, i) => {
      const a = (-80 + i * 16) * (Math.PI / 180);
      return `<path d="M2190,${G - 480} L${(2190 + 300 * Math.sin(a)).toFixed(0)},${(G - 480 - 300 * Math.cos(a)).toFixed(0)}" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('')}
  </g>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => book(2000 + i * 66, G - 150, 170 + (i % 3) * 14)).join('')}
  ${author(1850, { arm: [160, 20], arm2: [150, 30], nod: -14, leg: [6, 4], leg2: [-6, 2], face: 'shout' })}`;

const story = [
  { fx: 1000, fy: 1400, s: 0.62, label: 'Англия, 1990-е' },
  { fx: 470, fy: 1480, s: 1.9, label: 'Рукопись «Гарри Поттера» готова' },
  { fx: 1100, fy: 1610, s: 1.8, label: 'Издательства отвечают «нет»' },
  { fx: 1120, fy: 1590, s: 1.35, label: '12 отказов подряд' },
  { fx: 1380, fy: 1500, s: 1.9, label: 'Но она отправила ещё раз' },
  { fx: 2200, fy: 1650, s: 1.7, label: '1997: книга вышла' },
];
const after = [
  { fx: 1000, fy: 1400, s: 0.62 },
  { fx: 2190, fy: 1600, s: 1.7 },
  { fx: 1850, fy: 1490, s: 2.0 },
  { fx: 1000, fy: 1400, s: 0.62, ds: 1.1 },
];

// ─── Инфографика: 12 отказов и одно «да» ──────────────────────────────────────

const N = 13;
const info = {
  html: `
    ${itext('i-h', 330, 40, 'ДЖ. К. РОУЛИНГ')}
    ${isvg(Array.from({ length: N }, (_, i) => {
      const x = 540 + (i - (N - 1) / 2) * 76;
      const win = i === N - 1;
      return `<g class="gx${win ? ' gwin' : ''}"><circle cx="${x}" cy="640" r="31" fill="${win ? C.accent : 'none'}" stroke="${win ? C.accent : '#fff'}" stroke-width="5"/>
        <text x="${x}" y="654" text-anchor="middle" font-size="38" font-weight="900" fill="${win ? '#000' : '#fff'}">${win ? '✓' : '×'}</text></g>`;
    }).join(''))}
    ${itext('i-a', 800, 110, '12 ОТКАЗОВ', '#fff', 900, 'white-space:nowrap')}
    ${itext('i-n', 1000, 120, '13-Е: «ДА»', C.accent, 900, 'white-space:nowrap')}
    ${itext('i-s', 1230, 44, 'ИЗДАТЕЛЬСТВО BLOOMSBURY<br>ВЗЯЛО КНИГУ, В 1997-М ОНА ВЫШЛА')}
    ${itext('i-y', 1470, 30, 'В ИГРЕ ОШИБКИ ВОЗВРАЩАЮТСЯ ЧЕРЕЗ 1, 3 И 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.set('.gx', { opacity: 0 }, 0);`,
      `tl.to('.gx:not(.gwin)', { opacity: 1, duration: 0.02, stagger: 0.02 }, ${(t[0] + 0.05).toFixed(3)});`,
      pop('#i-a', t[0] + 0.2, 0.22),
      pop('.gwin', t[1], 0.22),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v57: Video3 = {
  id: '57-rouling',
  title: 'Реклама: Роулинг и 12 отказов',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«Две пересдачи — и всё.<br>Не моё это»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Знаешь, сколько отказов<br>получил «Гарри Поттер»?»', cams: ['b', 'ab'], b: 'cool' },
    { text: '«Ну, один? Два?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Двенадцать издательств»', cams: ['b', [540, 1180, 2.2]], b: 'smile' },
    { text: '«Двенадцать?!»', cams: ['a', 'wide'], a: 'shock' },
    { text: '«А она отправила<br>в тринадцатое»', cams: ['ab', 'b'], b: 'cool' },
    { text: '«И что, взяли?»', cams: ['a', [A.head.x, A.head.y + 40, 2.5]], a: 'doubt' },
    { text: '«В 1997-м книга<br>вышла»', cams: ['wide', 'b'], a: 'think', b: 'calm' },
  ],
  tableau,
  story,
  after,
  info,
  cta: { lines: ['Не бросай.', 'Пересдай', 'и услышь «да»'], accent: 2 },
  bioGlyph: '<path d="M-30,-22 h60 v44 h-60 Z M-30,-22 L0,4 L30,-22" fill="none"/>',
};
