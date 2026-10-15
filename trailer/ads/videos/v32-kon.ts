/**
 * 32. «Опять три ошибки в билете» — стол с билетами.
 * История-гравюра: Рим, трактат Вегеция (IV–V век) — новобранцев учили садиться на коня на деревянном коне:
 * сначала без оружия, потом в доспехах и с мечом, слева и справа; и только потом — настоящий конь.
 * «После»: на том же деревянном коне — ученик с телефоном, в телефоне — игра (без названия).
 * Инфографика: ошибка на тренировке ничего не стоит, а пересдача теории — не раньше чем через 7 дней.
 */
import { chair, floorLine, person, table } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, fig, figPts, ground, sh, sky, wh, type FigOpts } from '../etch.ts';
import { sword, tube } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 320, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['table', 'chin'], table: 1170, hair: 'ponytail', face: 'sad' });
const B = person(DLG, { id: 'B', x: 850, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'curly', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${chair(320, 1300, 1, 110)}
  ${table(440, 700, 1170, 1300)}
  ${[0, 1, 2].map((i) => `<g transform="translate(${520 + i * 70} ${1150 - i * 4}) rotate(${-8 + i * 7})"><rect x="-30" y="-20" width="60" height="40" rx="3" fill="${C.night}"/><path d="M-20,-8 h40 M-20,4 h30" stroke-width="3"/></g>`).join('')}
  <text x="590" y="1100" text-anchor="middle" font-size="60" font-weight="800" fill="${C.accent}" stroke="none">✕ ✕ ✕</text>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const P = C.paper;
const I = C.ink;
const FLOOR = 1500;

/** Лагерный частокол и палатки на заднем плане. */
const camp = `
  ${sh('M-400,1260 L-100,1120 L140,1200 L380,1080 L640,1190 L860,1100 L1120,1210 L1480,1090 L1480,1500 L-400,1500 Z', 'c30')}
  ${[-60, 120, 900, 1060].map((x, i) => sh(`M${x - 90},1300 L${x},${1180 - (i % 2) * 20} L${x + 90},1300 Z`, i % 2 ? 'a60' : 'a120') + `<path d="M${x},${1180 - (i % 2) * 20} L${x - 20},1300 M${x},${1180 - (i % 2) * 20} V1300" stroke-width="2.5"/>`).join('')}
  ${Array.from({ length: 46 }, (_, i) => {
    const x = -400 + i * 40;
    return sh(`M${x},1390 V1290 L${x + 18},1262 L${x + 36},1290 V1390 Z`, i % 3 ? 'a90' : 'b90');
  }).join('')}
  <path d="M-400,1318 H1480 M-400,1362 H1480" stroke-width="5"/>`;

/** Деревянный конь: бочка на козлах, шея-столб и резная голова. */
const woodHorse = `
  ${tube('M250,1300 L200,1500 M300,1300 L330,1500', 22, 'a0')}
  ${tube('M430,1300 L400,1500 M480,1300 L530,1500', 22, 'a0')}
  ${tube('M215,1440 H520', 12, 'a0')}
  ${sh('M200,1246 C200,1222 220,1214 250,1214 H470 C500,1214 520,1222 520,1246 V1300 C520,1322 500,1330 470,1330 H250 C220,1330 200,1322 200,1300 Z', 'a0')}
  <path d="M206,1250 H514 M204,1272 H516 M204,1296 H516" stroke-width="2.5"/>
  ${[260, 330, 400, 460].map((x) => `<circle cx="${x}" cy="1236" r="4" fill="${I}"/><circle cx="${x}" cy="1312" r="4" fill="${I}"/>`).join('')}
  ${sh('M478,1222 L520,1110 L556,1122 L522,1236 Z', 'a60')}
  ${sh('M512,1104 C520,1072 560,1062 588,1080 L640,1112 C652,1120 648,1138 634,1140 L580,1140 L548,1132 Z', 'a30')}
  ${sh('M520,1086 L522,1050 L544,1078 Z', 'b30')}<circle cx="566" cy="1098" r="5" fill="${I}"/>
  <path d="M524,1122 q-24,30 -40,70" stroke-width="3"/>
  ${sh('M180,1240 C170,1270 160,1330 176,1370 C196,1330 200,1280 206,1250 Z', 'b120')}
  ${sh('M300,1210 C300,1180 400,1180 410,1212 Z', 'b0')}`;

/** Настоящий конь (смотрит вправо); (x, y) — земля под серединой. Спина — на высоте 300·s. */
const horse = (x: number, y: number, s = 1, saddle = true) => `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="3">
  ${sh('M-150,-268 C-196,-250 -212,-170 -196,-108 C-178,-160 -168,-210 -140,-244 Z', 'b120')}
  ${tube('M-118,-205 L-142,-108 L-126,0 M-86,-198 L-74,-104 L-92,0', 24, 'a90')}
  ${sh('M-150,-250 C-150,-300 -100,-306 -40,-300 C40,-296 110,-306 150,-282 C176,-262 170,-206 140,-190 C60,-176 -60,-176 -120,-190 C-156,-200 -162,-230 -150,-250 Z', 'a120')}
  <path d="M-130,-206 C-60,-196 60,-196 128,-206 M-138,-262 C-150,-230 -140,-206 -120,-196" stroke-width="2.5"/>
  ${tube('M108,-196 L116,-104 L108,0 M140,-204 L152,-104 L154,0', 24, 'a90')}
  ${['M-138,0 h28', 'M-104,0 h28', 'M96,0 h28', 'M142,0 h28'].map((d) => `<path d="${d}" stroke-width="14"/>`).join('')}
  ${sh('M92,-284 C118,-350 160,-402 200,-432 L242,-402 C214,-362 182,-300 164,-212 Z', 'a60')}
  ${sh('M194,-442 C210,-466 246,-466 260,-446 L314,-370 C322,-354 308,-340 290,-344 L254,-354 L220,-394 Z', 'a30')}
  ${sh('M204,-448 L200,-484 L226,-454 Z', 'b30')}<circle cx="238" cy="-424" r="6" fill="${I}"/><circle cx="300" cy="-358" r="4" fill="${I}"/>
  ${sh('M96,-298 C120,-362 160,-412 196,-442 C186,-402 152,-350 132,-288 Z', 'b90')}
  ${saddle ? `${sh('M-56,-304 C-20,-298 30,-298 56,-304 L50,-232 L-50,-232 Z', 'b0')}<path d="M0,-232 V-150 M-14,-150 h28" stroke-width="4"/>` : ''}
</g>`;

/** Новобранец у деревянного коня: прыжок, посадка в доспехах, прыжок с другой стороны. */
const r1 = fig({ x: 300, y: 1238, lean: 36, nod: -14, arm: [140, -30], arm2: [150, -40], leg: [70, 90], leg2: [-30, 30], dress: 'tunic', pat: 'a30', hair: 'short', face: 'calm' });
const r2 = fig({ x: 350, y: 1206, leg: [40, 50], leg2: [30, 46], arm: [168, -10], arm2: [70, 40], dress: 'armor', pat: 'a60', sleeve: 'c60', legs: 'c90', hair: 'helmet', face: 'shout', hand: `<g transform="rotate(-20)">${sword(170)}</g>` });
const r3 = fig({ x: 420, y: 1240, f: -1, lean: 36, nod: -14, arm: [140, -30], arm2: [150, -40], leg: [70, 90], leg2: [-30, 30], dress: 'armor', pat: 'a60', sleeve: 'c60', hair: 'helmet', face: 'calm', hand2: `<g transform="rotate(160)">${sword(150)}</g>` });

/** Центурион с жезлом. */
const centurion = fig({ x: 90, y: FLOOR - 204, arm: [100, -20], arm2: [20, 30], dress: 'armor', pat: 'b60', sleeve: 'c60', legs: 'c90', hair: 'helmet', beard: true, face: 'shout', hand: '<path d="M0,0 L60,-60" stroke-width="8"/>' });

/** Всадник в доспехах на настоящем коне. */
const RIDER: FigOpts = { x: 790, y: FLOOR - 0.85 * 300 + 6, leg: [40, 50], leg2: [30, 46], arm: [160, 0], arm2: [80, 30], dress: 'armor', pat: 'a60', sleeve: 'c60', legs: 'c90', hair: 'helmet', face: 'calm', hand: sword(190) };
const cavalry = `${horse(800, FLOOR, 0.85)}${fig(RIDER)}`;

/** Ученик сегодня: сидит на деревянном коне и смотрит в телефон. */
const KID: FigOpts = { x: 340, y: 1206, leg: [40, 50], leg2: [30, 46], lean: 6, nod: 34, arm: [70, 70], arm2: [60, 80], dress: 'coat', pat: 'a120', sleeve: 'a120', legs: 'c90', hair: 'cap', face: 'calm' };
const kidHand = figPts(KID).hand;

/** Телефон с игрой: вид на перекрёсток сверху, машина курьера, карточка вопроса. Только рисунок, без слов. */
const phone = (x: number, y: number) => `<g transform="translate(${x} ${y}) rotate(-8) scale(1.1)">
  <rect x="-40" y="-76" width="80" height="152" rx="12" fill="${I}"/>
  <rect x="-34" y="-64" width="68" height="128" rx="4" fill="${P}" stroke-width="1.5"/>
  <g stroke-width="1.6">
    <rect x="-34" y="-64" width="68" height="16" fill="url(#c0)"/>
    <path d="M-34,-24 H34 M-34,-4 H34 M-10,-48 V-24 M10,-48 V-24 M-10,-4 V22 M10,-4 V22"/>
    <path d="M0,-46 V-28 M0,0 V20 M-32,-14 H-14 M14,-14 H32" stroke-dasharray="4 4"/>
    ${[-8, -3, 2, 7].map((xx) => `<path d="M${xx},-2 V2" stroke-width="2.5"/>`).join('')}
    <circle cx="16" cy="-30" r="3" fill="${I}"/>
  </g>
  <rect x="2" y="4" width="7" height="12" rx="2" fill="${C.accent}" stroke-width="1.2"/>
  <rect x="-30" y="24" width="60" height="36" rx="4" fill="${P}" stroke-width="1.6"/>
  <path d="M-25,32 h40 M-25,42 h32 M-25,52 h36" stroke-width="2"/>
  <rect x="-27" y="38" width="54" height="9" rx="2" stroke="${C.accent}" stroke-width="1.8"/>
</g>`;

const today = `${fig(KID)}${phone(kidHand[0] + 6, kidHand[1] - 50)}`;

const tableau = `
  ${sky()}
  ${cloud(200, 620, 300)}${cloud(900, 820, 240)}
  ${camp}
  ${ground(FLOOR)}
  ${woodHorse}
  <g class="st-b">${centurion}</g>
  <g class="st-b"><g class="r1">${r1}</g><g class="r2" opacity="0">${r2}</g><g class="r3" opacity="0">${r3}</g></g>
  <g class="st-b">${cavalry}</g>
  <g class="st-a">${today}</g>
  <g class="st-a">${horse(800, FLOOR, 0.85, false)}</g>`;

// ─── Инфографика: ошибка на тренировке и на экзамене ──────────────────────────

const info = {
  html: `
    ${itext('i-a', 470, 40, 'ОШИБКА НА ТРЕНИРОВКЕ')}
    ${itext('i-a2', 540, 92, 'НИЧЕГО<br>НЕ СТОИТ')}
    ${isvg(`<path id="i-line" d="M240,830 H840" stroke="#555" stroke-width="4" opacity="0"/>`)}
    ${itext('i-b', 900, 40, 'ОШИБКА НА ЭКЗАМЕНЕ')}
    ${itext('i-n', 965, 150, '7 ДНЕЙ', C.accent, 900)}
    ${itext('i-s', 1150, 46, 'ДО ПЕРЕСДАЧИ')}`,
  tweens: (t: number[]) =>
    [show('#i-a', t[0]), pop('#i-a2', t[0] + 0.15, 0.22), show('#i-line', t[1]), show('#i-b', t[1]), pop('#i-n', t[2], 0.22), show('#i-s', t[3])].join('\n      '),
};

export const v32: Video3 = {
  id: '32-kon',
  title: 'Реклама: деревянный конь',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Опять три ошибки в билете»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«И хорошо»', cams: ['b', 'ab'], b: 'calm' },
    { text: '«Чего хорошего?!»', cams: ['a', 'a'], a: 'angry' },
    { text: '«Лучше сейчас,<br>чем в ГИБДД»', cams: ['b', [590, 1110, 2.6]], b: 'smile' },
    { text: '«Я просто читаю билеты»', cams: ['a', 'wide'], a: 'tired' },
    { text: '«Читать — мало»', cams: ['ab', 'b'], b: 'think' },
    { text: '«А как ещё?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Римляне знали»', cams: ['wide', 'b'], a: 'doubt', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1180, s: 1.0, label: 'Рим, трактат Вегеция' },
    { fx: 380, fy: 1300, s: 1.9, dx: 20, label: 'Новобранцев учили на коне' },
    { fx: 330, fy: 1250, s: 2.3, label: 'Сначала — без оружия' },
    { fx: 390, fy: 1160, s: 2.1, dy: -30, label: 'Потом — в доспехах, с мечом', on: '.r2', off: '.r1' },
    { fx: 420, fy: 1250, s: 2.2, label: 'Слева и справа, снова и снова', on: '.r3', off: '.r2' },
    { fx: 830, fy: 1230, s: 1.7, dy: -30, label: 'И только потом — в бой' },
  ],
  after: [
    { fx: 540, fy: 1200, s: 1.05 },
    { fx: kidHand[0] + 6, fy: kidHand[1] - 50, s: 4.2, ds: 1.1 },
    { fx: 400, fy: 1100, s: 2.4 },
    { fx: 540, fy: 1220, s: 1.2, ds: 1.06 },
  ],
  info,
  cta: { lines: ['Ошибайся', 'на тренировке,', 'а не на экзамене'], accent: 2 },
  bioGlyph: '<rect x="-20" y="-36" width="40" height="72" rx="8"/><path d="M-8,-26 h16"/>',
};
