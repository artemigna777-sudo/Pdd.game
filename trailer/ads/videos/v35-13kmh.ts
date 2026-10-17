/**
 * 35. «Его оштрафовали за 13 км/ч» — по формуле cwex (`engine6.ts`), как ролик 34: реальная история → гравюра →
 * расчёт → итог → вывод.
 *
 * История (Guinness World Records): 28 января 1896 года Уолтера Арнольда в Кенте признали виновным в превышении
 * скорости — 8 миль/ч (13 км/ч) при лимите 2 мили/ч (3 км/ч). Обвинений было четыре: машина без лошади, меньше
 * трёх человек при машине, скорость выше 2 миль/ч, нет имени и адреса на машине. Погоню на велосипеде и сумму
 * штрафа источники расходятся — их в ролике нет. Гравюра: закон 1865 года («закон о красном флаге»): 4 мили/ч за
 * городом, 2 — в городе, впереди идёт человек с красным флагом; в 1896 году лимит подняли до 14 миль/ч (23 км/ч),
 * водители отметили это пробегом в Брайтон, его повторяют с 1927 года. Расчёт: ×4 к лимиту в городе (60 км/ч) =
 * 240 км/ч, превышение больше 80 км/ч — лишение прав на полгода или 7 500 ₽ (КоАП 12.9, ч. 5). Источники — README.
 */
import { floorLine, person, tree } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { cloud, fig, ground, sh, sky, wh } from '../etch.ts';
import { cottage, etree } from '../etch2.ts';
import { text } from '../kit.ts';

// ─── Завязка: светящиеся человечки ────────────────────────────────────────────

const N = C.night;
const L = C.line;

const spokes = (cx: number, cy: number, r: number, n = 8) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * Math.PI * 2) / n;
    return `M${cx},${cy} L${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

/** Колесо со спицами (светящееся). */
const wheelG = (id: string, cx: number, floor: number, r: number) =>
  `<g id="${id}"><circle cx="${cx}" cy="${floor - r}" r="${r}" fill="${N}" stroke-width="7"/><path d="${spokes(cx, floor - r, r - 6)}" stroke-width="3"/><circle cx="${cx}" cy="${floor - r}" r="9" fill="${L}"/></g>`;

/** Котелок над головой человечка. */
const bowler = (hx: number, hy: number) =>
  `<path d="M${hx - 44},${hy - 32} Q${hx - 44},${hy - 96} ${hx},${hy - 98} Q${hx + 44},${hy - 96} ${hx + 44},${hy - 32} Z" fill="${N}"/><path d="M${hx - 72},${hy - 30} Q${hx},${hy - 46} ${hx + 72},${hy - 30}"/>`;

/** «Самодвижущийся экипаж» 1896 года (нос вправо) с водителем в котелке; x — середина, floor — земля. */
function oldCar(x: number, floor: number, face: 'cool' | 'shock' | 'neutral', id = 'D') {
  const driver = person(DLG, { id, x: x - 110, floor: floor - 120, pose: 'drive', seat: 110, f: 1, arms: ['wheel', 'wheel'], mustache: true, face });
  return `<g id="sc-car">
    ${driver.svg}${bowler(driver.head.x, driver.head.y)}
    <path d="M${x - 250},${floor - 100} L${x - 246},${floor - 226} Q${x - 244},${floor - 252} ${x - 218},${floor - 252} H${x - 150} Q${x - 128},${floor - 252} ${x - 126},${floor - 226} L${x - 120},${floor - 176} H${x + 170} Q${x + 206},${floor - 176} ${x + 210},${floor - 140} L${x + 212},${floor - 100} Z" fill="${N}"/>
    <path d="M${x - 242},${floor - 140} H${x + 208}" stroke-width="3"/>
    <path d="M${x - 10},${floor - 176} L${x + 22},${floor - 266} M${x + 6},${floor - 274} h34"/>
    <circle cx="${x + 196}" cy="${floor - 206}" r="16" fill="${C.accent}" stroke-width="4"/><path d="M${x + 196},${floor - 190} V${floor - 176}"/>
    ${wheelG('sc-w1', x - 160, floor, 88)}${wheelG('sc-w2', x + 122, floor, 72)}
  </g>`;
}

/** Полицейский в высоком шлеме, смотрит влево, рука поднята — «стой». */
function constable(x: number, floor: number) {
  const p = person(DLG, { id: 'P', x, floor, pose: 'stand', f: -1, arms: ['up', 'down'], face: 'angry' });
  const { x: hx, y: hy } = p.head;
  return `${p.svg}<path d="M${hx - 50},${hy - 22} Q${hx - 54},${hy - 128} ${hx},${hy - 134} Q${hx + 54},${hy - 128} ${hx + 50},${hy - 22} Z" fill="${N}"/>
    <circle cx="${hx}" cy="${hy - 70}" r="13" fill="${C.accent}" stroke-width="4"/><path d="M${hx - 50},${hy - 22} Q${hx},${hy + 6} ${hx + 50},${hy - 22}" stroke-width="3"/>
    <g id="sc-whistle"><path d="M${hx - 84},${hy - 10} l-38,-18 M${hx - 88},${hy + 12} l-44,0 M${hx - 84},${hy + 34} l-38,18" stroke="${C.accent}" stroke-width="6"/></g>`;
}

const road = `
  ${floorLine(1500)}
  ${tree(80, 1500, N)}${tree(960, 1500, N)}
  <path d="M-200,1580 h140 M40,1580 h140 M280,1580 h140 M520,1580 h140 M760,1580 h140 M1000,1580 h140" stroke-width="5"/>
  <g id="sc-speed"><path d="M210,1250 h-130 M230,1320 h-170 M200,1390 h-120" stroke-width="5"/></g>
  ${oldCar(540, 1500, 'cool')}`;

const stop = `
  ${floorLine(1500)}
  ${tree(1040, 1500, N)}
  ${oldCar(380, 1500, 'shock')}
  ${constable(820, 1500)}`;

const flagMan = person(DLG, { id: 'F', x: 500, floor: 1520, pose: 'stand', f: 1, arms: ['up', 'down'], face: 'neutral' });
const flag = `
  ${floorLine(1520)}
  ${flagMan.svg}${bowler(flagMan.head.x, flagMan.head.y)}
  <path d="M558,1214 V930" stroke-width="7"/>
  <g id="sc-cloth"><path d="M558,936 h150 q-22,42 0,84 h-150 Z" fill="${C.accent}" stroke="${C.accent}"/></g>`;

// ─── Карточки завязки ──────────────────────────────────────────────────────────

const bar = (id: string, label: string, value: string, top: number, accent = false) => `
  <div style="position:absolute;left:44px;right:44px;top:${top}px;display:flex;align-items:baseline;font-size:32px;font-weight:700">
    <span>${label}</span><span style="margin-left:auto;font-size:44px;font-weight:900;color:${accent ? C.accent : '#fff'}">${value}</span></div>
  <div style="position:absolute;left:44px;right:44px;top:${top + 60}px;height:30px;border-radius:15px;background:#1b2332;overflow:hidden">
    <div id="${id}" style="width:0;height:100%;border-radius:15px;background:${accent ? C.accent : '#fff'}"></div></div>`;
const speeds = `<div class="card" style="left:120px;top:520px;width:840px;height:560px">
  <div class="ch">Скорость, км/ч<span class="tag">1896</span></div>
  ${bar('bv0', 'Его машина', '13', 140)}
  ${bar('bv1', 'Пешеход идёт', '≈5', 270)}
  ${bar('bv2', 'Разрешено', '3', 400, true)}
</div>`;

const charges = ['Ехал без лошади', 'При машине меньше трёх человек', 'Быстрее 3 км/ч', 'Нет имени и адреса на машине'];
const ROWCSS = 'box-sizing:border-box;height:84px;margin:0 24px 14px;padding:0 24px';
const protocol = `<div class="card" style="left:110px;top:540px;width:860px;height:556px">
  <div class="ch">Протокол · 1896<span class="tag">4 нарушения</span></div>
  <div style="padding-top:18px">${charges
    .map((c, i) => `<div class="row${i === 0 ? ' hot' : ''}" id="ch${i}" style="${ROWCSS};opacity:0">${c}<span class="x">✕</span></div>`)
    .join('')}</div>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [t0, t1, t2, t3, t4] = T.hook;
  const tw: string[] = [];
  // Машина едет, колёса крутятся, линии скорости мигают.
  tw.push(`tl.fromTo('#s0-car', { x: -90 }, { x: 70, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
  tw.push(`tl.fromTo('#s0-w1', { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 300, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
  tw.push(`tl.fromTo('#s0-w2', { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 420, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
  tw.push(`tl.fromTo('#s0-speed', { opacity: 0.25 }, { opacity: 1, duration: 0.22, repeat: 13, yoyo: true, ease: 'none' }, ${t0});`);
  // Скорости: полоски растут.
  [100, 38, 23].forEach((w, i) => tw.push(`tl.fromTo('#bv${i}', { width: '0%' }, { width: '${w}%', duration: 0.5, ease: 'power2.out' }, ${(t1 + 0.25 + i * 0.55).toFixed(3)});`));
  // Остановка: машина доезжает и встаёт, свисток.
  tw.push(`tl.fromTo('#s2-car', { x: 90 }, { x: 0, duration: 0.7, ease: 'power3.out' }, ${t2});`);
  tw.push(`tl.fromTo('#s2-w1', { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 140, duration: 0.7, ease: 'power3.out' }, ${t2});`);
  tw.push(`tl.fromTo('#s2-w2', { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 190, duration: 0.7, ease: 'power3.out' }, ${t2});`);
  tw.push(`tl.fromTo('#s2-whistle', { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 5, yoyo: true, ease: 'none' }, ${(t2 + 0.3).toFixed(3)});`);
  // Протокол: нарушения по одному.
  charges.forEach((_, i) => tw.push(`tl.fromTo('#ch${i}', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.18 }, ${(t3 + 0.2 + i * 0.5).toFixed(3)});`));
  // Мост: флаг разворачивается.
  tw.push(`tl.fromTo('#s4-cloth', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.3, ease: 'back.out(2)' }, ${t4});`);
  return tw.join('\n      ');
};

// ─── Гравюра: закон о красном флаге ───────────────────────────────────────────

const P = C.paper;
const I = C.ink;
const espokes = (cx: number, cy: number, r: number, n = 10) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * Math.PI * 2) / n;
    return `M${cx},${cy} l${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
/** Колесо гравюрой. */
const ewheel = (cx: number, floor: number, r: number) =>
  `<circle cx="${cx}" cy="${floor - r}" r="${r}" fill="${P}" stroke-width="9"/><circle cx="${cx}" cy="${floor - r}" r="${(r * 0.86).toFixed(1)}" stroke-width="3"/><path d="${espokes(cx, floor - r, r * 0.86)}" stroke-width="6"/><circle cx="${cx}" cy="${floor - r}" r="${(r * 0.16).toFixed(1)}" fill="${I}"/>`;

/** Красный флаг на древке (начало координат — кисть). */
const eflag = `<path d="M0,40 V-210" stroke-width="7"/><path d="M0,-206 h-120 q20,38 0,76 h120 Z" fill="${C.accent}" stroke-width="4"/>`;

/** Паровой экипаж: большие колёса, котёл, труба с дымом; водитель дремлет. */
const steam = `<g class="steam">
  ${cloud(420, 960, 190)}${cloud(300, 860, 150)}${cloud(500, 1040, 120)}
  ${fig({ x: 225, y: 1170, s: 0.85, f: 1, dress: 'coat', pat: 'a120', sleeve: 'a60', legs: 'b90', hair: 'hat', face: 'closed', leg: [6, 0], leg2: [-8, 0], arm: [80, 40], arm2: [70, 50], nod: 14 })}
  ${sh('M150,1340 H560 V1386 H150 Z', 'b0', 'stroke-width="4"')}
  ${sh('M300,1236 H528 Q558,1236 558,1278 Q558,1320 528,1320 H300 Z', 'c0', 'stroke-width="4"')}
  <path d="M360,1236 V1320 M440,1236 V1320" stroke-width="5"/>
  ${sh('M508,1236 V1080 H536 V1236 Z', 'b0', 'stroke-width="4"')}<path d="M496,1080 H548 V1062 H496 Z" fill="${I}"/>
  ${ewheel(250, 1470, 124)}${ewheel(486, 1470, 84)}
</g>`;

/** Человек с флагом идёт впереди (f1) и бросает флаг (f2). */
const flagWalker = `<g class="f1">${fig({ x: 740, y: 1284, s: 1, f: 1, dress: 'coat', pat: 'a60', sleeve: 'a30', legs: 'b90', hair: 'hat', face: 'calm', leg: [24, 14], leg2: [-20, 4], arm: [140, 25], arm2: [20, 30], hand: eflag })}</g>`;
const flagDown = `<g class="f2" opacity="0">
  <path d="M600,1500 L830,1470" stroke-width="7"/><path d="M830,1470 q-30,-40 -110,-22 q8,26 -4,38 q60,-14 114,-16 Z" fill="${C.accent}" stroke-width="4"/>
  ${fig({ x: 740, y: 1284, s: 1, f: 1, dress: 'coat', pat: 'a60', sleeve: 'a30', legs: 'b90', hair: 'hat', face: 'shout', leg: [10, 0], leg2: [-12, 0], arm: [172, 6], arm2: [166, 8] })}
</g>`;

/** Объявление у дороги: лимиты закона 1865 года. */
const notice = `<path d="M955,1170 V1400" stroke-width="12"/>
  ${wh('M845,990 H1065 V1170 H845 Z', 'stroke-width="5"')}<path d="M857,1002 H1053 V1158 H857 Z" stroke-width="2"/>
  ${text(955, 1034, 17, I, 'LOCOMOTIVES', 'letter-spacing="2"')}${text(955, 1100, 50, I, '4 MPH')}${text(955, 1142, 19, I, 'IN TOWNS 2 MPH')}`;

/** Машина 1896 года гравюрой (нос вправо): водитель в шляпе машет. */
function ecar(x: number, floor: number) {
  return `${fig({ x: x - 110, y: floor - 190, s: 0.8, f: 1, dress: 'coat', pat: 'a120', sleeve: 'a60', legs: 'b90', hair: 'hat', face: 'shout', leg: [88, 92], leg2: [82, 86], arm: [70, 50], arm2: [160, 14] })}
    ${sh(`M${x - 195},${floor - 92} L${x - 172},${floor - 190} H${x - 30} L${x - 20},${floor - 132} H${x + 150} L${x + 176},${floor - 92} Z`, 'a60', 'stroke-width="4"')}
    ${sh(`M${x - 176},${floor - 186} L${x - 198},${floor - 270} H${x - 164} L${x - 150},${floor - 186} Z`, 'b0')}
    <path d="M${x - 8},${floor - 132} L${x + 30},${floor - 218}" stroke-width="6"/>
    <path d="M${x - 240},${floor - 120} h-130 M${x - 250},${floor - 170} h-90 M${x - 236},${floor - 70} h-110" stroke-width="3"/>
    ${ewheel(x - 110, floor, 72)}${ewheel(x + 118, floor, 54)}`;
}
const cars = `<g class="cars" opacity="0">${ecar(330, 1478)}${ecar(820, 1478)}</g>`;

const tableau = `
  ${sky()}
  ${cloud(860, 560, 220)}${cloud(160, 420, 160)}
  ${sh('M-400,1250 L-120,1160 L220,1214 L560,1140 L880,1206 L1180,1150 L1480,1214 V1260 H-400 Z', 'c30')}
  ${ground(1250)}
  ${cottage(660, 1262, 120)}${etree(560, 1262, 200, 3)}${etree(-20, 1262, 330, 5)}
  ${wh('M-400,1332 H1480 V1532 H-400 Z')}<path d="M-400,1332 H1480 M-400,1532 H1480" stroke-width="4"/><path d="M-400,1432 H1480" stroke-width="2" stroke-dasharray="30 26"/>
  ${notice}
  ${steam}
  ${flagWalker}
  ${flagDown}
  ${cars}`;

// ─── Расчёт: а если бы сегодня ─────────────────────────────────────────────────

const steps = ['60', '120', '180', '240'];
const info = {
  html: `
    ${itext('i-h', 330, 40, 'А ЕСЛИ БЫ ОН ЕХАЛ ТАК<br>СЕГОДНЯ?')}
    <div class="card" id="i-rule" style="left:130px;top:500px;width:820px;height:150px;opacity:0">
      <div style="position:absolute;left:34px;top:30px;width:90px;height:90px;border:9px solid ${C.accent};border-radius:50%;box-sizing:border-box;background:#fff;color:#111;font-size:34px;font-weight:900;display:flex;align-items:center;justify-content:center">60</div>
      <div style="position:absolute;left:150px;right:30px;top:32px;font-size:31px;font-weight:700;line-height:1.3">В городе — не больше <span style="color:${C.accent}">60 км/ч</span><br><span style="color:#8b93a3;font-size:26px">ПДД, пункт 10.2</span></div>
    </div>
    ${itext('i-n', 720, 130, '×4', '#fff', 900)}
    ${itext('i-nl', 870, 34, 'БЫСТРЕЕ ЛИМИТА', C.dim, 800)}
    ${itext('i-x', 930, 64, '60 × 4', '#fff', 900)}
    <div id="i-d" style="position:absolute;left:40px;right:40px;top:1030px;text-align:center;font-size:64px;font-weight:900;opacity:0">= ${steps
      .map((s, i) => `<span id="d${i}" style="display:none">${s}</span>`)
      .join('')} КМ/Ч</div>
    ${isvg(`<g id="i-bar" opacity="0"><path d="M150,1200 H930" stroke="#2b3446" stroke-width="16" stroke-linecap="round"/>
      <path id="i-fill" d="M150,1200 H930" stroke="${C.accent}" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path d="M345,1176 V1224" stroke="#fff" stroke-width="5"/>
      <text x="345" y="1262" text-anchor="middle" font-size="28" font-weight="800" fill="#8b93a3">60</text><text x="930" y="1262" text-anchor="end" font-size="28" font-weight="800" fill="#8b93a3">240</text></g>`)}
    ${itext('i-big', 1290, 104, 'ЛИШЕНИЕ ПРАВ', C.accent, 900)}
    ${itext('i-s', 1420, 30, 'НА ПОЛГОДА ИЛИ 7 500 ₽ · КОАП 12.9', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('#i-rule', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t[0] + 0.25).toFixed(3)});`,
      pop('#i-n', t[1], 0.2),
      show('#i-nl', t[1] + 0.1),
      pop('#i-x', t[2], 0.2),
      show('#i-d', t[3]),
      `tl.set('#d0', { display: 'inline' }, ${t[3]});`,
      ...steps.slice(1).map((_, i) => `tl.set('#d${i}', { display: 'none' }, ${(t[3] + 0.1 * (i + 1)).toFixed(3)}); tl.set('#d${i + 1}', { display: 'inline' }, ${(t[3] + 0.1 * (i + 1)).toFixed(3)});`),
      show('#i-bar', t[4], 0.15),
      `tl.to('#i-fill', { attr: { 'stroke-dashoffset': 0 }, duration: 0.85, ease: 'power1.inOut' }, ${t[4]});`,
      pop('#i-big', t[5], 0.22),
      show('#i-s', t[5] + 0.25),
    ].join('\n      '),
};

export const v35: Video6 = {
  id: '35-13kmh',
  title: 'Реклама: штраф за 13 км/ч',
  scenes: { road, stop, flag },
  shots: [
    { scene: 'road', cam: [540, 1250, 1.15], to: [520, 1250, 1.22], cap: 'Его оштрафовали<br>за 13 км/ч', sub: 'Англия, 1896 · реальная история', faces: { D: 'cool' } },
    { cap: 'Разрешено было — 3 км/ч.<br>Медленнее пешехода', ui: speeds },
    { scene: 'stop', cam: [600, 1240, 1.05], to: [600, 1240, 1.1], cap: 'Его остановил полицейский', faces: { D: 'shock', P: 'angry' } },
    { cap: 'Обвинений — четыре.<br>Первое: «без лошади»', ui: protocol },
    { scene: 'flag', cam: [560, 1180, 1.2], to: [560, 1180, 1.3], cap: 'А всё из-за закона<br>о красном флаге', accent: true },
  ],
  hookTweens,
  tableau,
  story: [
    { fx: 540, fy: 1110, s: 1.0, ds: 1.04, label: 'Англия, 1865.<br>Закон о красном флаге' },
    { fx: 720, fy: 1150, s: 1.6, label: 'Перед машиной шёл человек<br>с красным флагом' },
    { fx: 955, fy: 1100, s: 2.1, label: 'За городом — 6 км/ч,<br>в городе — 3 км/ч' },
    { fx: 260, fy: 1150, s: 1.9, ds: 1.03, label: 'Так ездили 30 лет' },
    { fx: 720, fy: 1260, s: 1.6, label: '1896: лимит подняли<br>до 23 км/ч', on: '.f2', off: '.f1' },
    { fx: 560, fy: 1180, s: 1.05, ds: 1.05, label: 'Водители отметили это<br>пробегом до Брайтона', on: '.cars', off: '.steam, .f2' },
  ],
  info,
  outcome: { title: 'Этот пробег в Брайтон<br>повторяют до сих пор', sub: `каждый ноябрь · с <span style="color:${C.accent}">1927</span> года` },
  cta: { lines: ['Правила кажутся', 'смешными —', 'пока штраф', 'не тебе.'], accent: 3 },
  bioGlyph: '<path d="M-26,44 V-44"/><path d="M-26,-40 H30 L18,-20 L30,0 H-26"/>',
};
