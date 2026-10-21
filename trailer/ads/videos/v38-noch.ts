/**
 * Ролик 38 «Ночь перед теорией» — сценка по образцам с двигающимися человечками (`engine7.ts`).
 * Ночь, общий стол: один по кругу перечитывает билеты с выделенными ответами, второй объясняет, что так
 * через неделю помнится треть (Karpicke, Roediger, Science, 2008), а проверять себя — вдвое лучше.
 * Ошибки повторяют через 1, 3 и 7 дней; «кто будет напоминать?» — игра. Телефон крупно, телефон из рук в руки.
 */
import { CW7, K, SIT, blink, camAt, endCard, face, figure, gesture, look, pose, toPose, type Pose, type Video7 } from '../engine7.ts';

const [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16] = CW7.cuts;
const A_X = 330;
const B_X = 1000;
const HIP = 1345;
const FLOOR = 1500;
const TOP = 1240;

// ─── Вещи в руках ─────────────────────────────────────────────────────────────

/** Лист билета: держится за нижний угол, тянется вперёд. */
const sheet = `<g id="A-sheet"><g id="A-flip" transform="translate(56 -78) scale(1 1)">
  <rect x="-74" y="-96" width="148" height="196" rx="4" fill="#ebe7de" stroke="#ebe7de" stroke-width="2"/>
  <g stroke="#9c9a94" stroke-width="5">${[-70, -50, -22, -2, 26, 46, 74].map((y) => `<path d="M-56,${y} H${y % 4 === 0 ? 44 : 30}"/>`).join('')}</g>
  <g stroke="#f5d547" stroke-width="12" opacity="0.85"><path d="M-58,-34 H34"/><path d="M-58,14 H20"/><path d="M-58,62 H40"/></g>
</g></g>`;
/** Телефон экраном к себе. */
const phone = (id: string, show: boolean) => `<g id="${id}" opacity="${show ? 1 : 0}">
  <rect x="-25" y="-92" width="50" height="96" rx="10" fill="${K.head}" stroke="${K.line}" stroke-width="5"/>
  <rect x="-17" y="-82" width="34" height="76" rx="5" fill="#2a3b52" stroke="none" id="${id}-scr"/>
</g>`;

// ─── Сцена ────────────────────────────────────────────────────────────────────

const books = (x: number, y: number, w: number, seed: number) => {
  const cols = ['#5a3b38', '#3d4a5c', '#3c5446', '#5c5338', '#4a3f57', '#2f3b46'];
  let out = '';
  let cx = x;
  let i = seed;
  while (cx < x + w - 14) {
    const bw = 16 + ((i * 7) % 14);
    const bh = 70 + ((i * 13) % 34);
    out += `<rect x="${cx}" y="${y - bh}" width="${bw}" height="${bh}" fill="${cols[i % cols.length]}" stroke="none"/>`;
    cx += bw + 3;
    i++;
  }
  return out;
};
const shelf = (x: number, w: number, tops: number[]) =>
  `<rect x="${x}" y="${tops[0] - 130}" width="${w}" height="${tops[tops.length - 1] - tops[0] + 150}" fill="#17181c" stroke="#33363d" stroke-width="5"/>` +
  tops.map((y, i) => books(x + 14, y, w - 28, i * 5 + x) + `<path d="M${x},${y} H${x + w}" stroke="#3a3d45" stroke-width="7"/>`).join('');

const bg = `
  <rect x="-500" y="-300" width="2400" height="${FLOOR + 300}" fill="url(#wall)"/>
  <rect x="-500" y="${FLOOR}" width="2400" height="900" fill="#08080a"/>
  <g>
    <rect x="470" y="360" width="390" height="500" fill="#0c1628" stroke="#3a4150" stroke-width="10"/>
    <path d="M665,360 V860 M470,610 H860" stroke="#3a4150" stroke-width="8"/>
    ${[[520, 420], [610, 470], [790, 410], [720, 560], [540, 690], [820, 720], [650, 780]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#cfd8ea"/>`).join('')}
    <circle cx="790" cy="470" r="30" fill="#e9e6da" opacity="0.85"/>
  </g>
  ${shelf(-360, 520, [700, 920, 1140])}
  ${shelf(1150, 520, [700, 920, 1140])}
  <g transform="translate(1000 700)">
    <rect x="-70" y="-90" width="140" height="170" fill="#d9d6cf" stroke="none" rx="6"/>
    <rect x="-70" y="-90" width="140" height="40" fill="#b84a3a" stroke="none" rx="6"/>
    <g fill="#8d8a84">${Array.from({ length: 12 }, (_, i) => `<rect x="${-58 + (i % 4) * 32}" y="${-36 + Math.floor(i / 4) * 34}" width="20" height="20"/>`).join('')}</g>
    <circle cx="38" cy="32" r="20" fill="none" stroke="${K.accent}" stroke-width="6"/>
  </g>`;

const chair = (x: number, f: 1 | -1) => {
  const back = x - f * 62;
  return `<g stroke="${K.line}" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M${back},${HIP + 12} H${x + f * 105}"/>
    <path d="M${back},${HIP + 12} V${HIP - 220}"/>
    <path d="M${back + f * 8},${HIP + 12} V${FLOOR}"/><path d="M${x + f * 98},${HIP + 12} V${FLOOR}"/>
  </g>`;
};

const SHEET_UP: Partial<Pose> = { tor: -6, hd: 3, ua1: -36, fa1: -98, ua2: -30, fa2: -96 };

const A = figure('A', { x: A_X, y: HIP, f: 1, pose: pose(SHEET_UP), hair: true, items1: sheet + phone('A-ph', false) });
const B = figure('B', { x: B_X, y: HIP, f: -1, pose: pose({ tor: -6 }), glasses: true, items1: phone('B-ph', false) });

const fg = `
  ${chair(A_X, 1)}${chair(B_X, -1)}
  <g stroke="${K.line}" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M440,${TOP} H890" stroke-width="9"/><path d="M450,${TOP + 18} H880" stroke="#8a8a88" stroke-width="5"/>
    <path d="M472,${TOP + 18} V${FLOOR}"/><path d="M858,${TOP + 18} V${FLOOR}"/>
    <path d="M-400,${FLOOR} H1800" stroke-width="5"/>
  </g>
  <g id="lamp">
    <path d="M665,${TOP - 4} V${TOP - 150}" stroke="#c9b48a" stroke-width="7"/>
    <ellipse cx="665" cy="${TOP - 6}" rx="46" ry="9" fill="#c9b48a"/>
    <path d="M590,${TOP - 150} L612,${TOP - 196} H718 L740,${TOP - 150} Z" fill="#2f6b4f" stroke="#4d8f6d" stroke-width="4"/>
  </g>
  <g>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${492 + (i % 2) * 6}" y="${TOP - 8 - i * 6}" width="118" height="5" fill="#e6e2d8"/>`).join('')}
    <rect x="500" y="${TOP - 50}" width="110" height="8" fill="#e6e2d8" transform="rotate(-8 555 ${TOP - 46})"/></g>
  <g transform="translate(800 ${TOP})">
    <rect x="-46" y="-50" width="92" height="50" rx="8" fill="${K.head}" stroke="${K.line}" stroke-width="5"/>
    <text x="0" y="-15" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="27" fill="${K.accent}">02:47</text>
  </g>
  ${A}${B}`;

/** Свет лампы и окна (поверх, в режиме «экран»). */
const glow = `
  <ellipse cx="665" cy="${TOP - 60}" rx="460" ry="330" fill="url(#lampGlow)"/>
  <ellipse cx="665" cy="610" rx="300" ry="330" fill="url(#winGlow)"/>`;

const defs = `<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16171c"/><stop offset="1" stop-color="#101114"/></linearGradient>
  <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffcf87" stop-opacity="0.34"/><stop offset="0.5" stop-color="#ffb35c" stop-opacity="0.12"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
  <radialGradient id="winGlow"><stop offset="0" stop-color="#5c7bb5" stop-opacity="0.16"/><stop offset="1" stop-color="#5c7bb5" stop-opacity="0"/></radialGradient>
</defs>`;

const SVG = (body: string, extra = '') =>
  `<svg viewBox="0 0 1080 1920" width="1080" height="1920" overflow="visible" class="layer" ${extra}>${defs}${body}</svg>`;

/** Передний размытый человечек («через плечо»): голова и плечо у края кадра. */
const fgHead = (id: string, side: 'l' | 'r') => {
  const x = side === 'l' ? -330 : 610;
  return `<div class="fg" id="${id}" style="left:${x}px;top:1180px;width:800px;height:1000px;opacity:0">
    <svg viewBox="0 0 800 1000" width="800" height="1000"><circle cx="400" cy="330" r="260" fill="#26272c" stroke="#3a3b41" stroke-width="14"/>
    <path d="M40,1000 Q80,640 400,610 Q720,640 760,1000 Z" fill="#202126"/></svg></div>`;
};

// ─── Крупно сверху: руки, лист, телефон ──────────────────────────────────────

/** Кисть-перчатка (вид сверху): ладонь, пальцы, рука уходит за кадр под углом `rot`. */
const mitten = (x: number, y: number, rot: number, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="#111" stroke-width="6" stroke-linejoin="round">
  <path d="M-30,40 L-38,700 H38 L30,40" fill="${K.line}"/>
  ${[-42, -16, 10, 36].map((fx, i) => `<rect x="${fx - 12}" y="${-70 + Math.abs(i - 1.5) * 10}" width="26" height="70" rx="13" fill="${K.line}"/>`).join('')}
  <ellipse cx="0" cy="10" rx="56" ry="52" fill="${K.line}"/>
  <rect x="44" y="-6" width="24" height="56" rx="12" transform="rotate(-35 56 22)" fill="${K.line}"/>
</g>`;

const desk = `<rect x="0" y="0" width="1080" height="1920" fill="#201b17"/>
  <g stroke="#2a241f" stroke-width="3">${Array.from({ length: 14 }, (_, i) => `<path d="M0,${80 + i * 140} Q540,${60 + i * 140} 1080,${90 + i * 140}"/>`).join('')}</g>
  <ellipse cx="540" cy="700" rx="760" ry="900" fill="url(#lampGlow)"/>
  <g transform="translate(540 330)"><rect x="-160" y="-40" width="320" height="80" rx="40" fill="#2f6b4f" stroke="#4d8f6d" stroke-width="5"/>
    <circle cx="0" cy="62" r="42" fill="#3b3226" stroke="#c9b48a" stroke-width="5"/></g>`;

const ticket = `<g transform="translate(540 1080) rotate(-3)">
  <rect x="-300" y="-400" width="600" height="800" fill="#ebe7de" rx="6"/>
  <text x="-250" y="-330" font-family="Montserrat" font-weight="800" font-size="38" fill="#3a3834">БИЛЕТ 23</text>
  ${[0, 1, 2, 3].map((i) => {
    const y = -260 + i * 165;
    return `<g stroke-linecap="round"><path d="M-250,${y} H230 M-250,${y + 34} H120" stroke="#9c9a94" stroke-width="12"/>
      <path d="M-250,${y + 84} H${150 - i * 30}" stroke="#f5d547" stroke-width="30" opacity="0.8"/><path d="M-250,${y + 84} H${150 - i * 30}" stroke="#77736b" stroke-width="10"/></g>`;
  }).join('')}
</g>`;

/** Лист, который закрывает ответы (B подкладывает справа). */
const cover = `<g id="cover"><g transform="translate(560 1110) rotate(2)"><rect x="-320" y="-330" width="640" height="560" fill="#d5d1c7" stroke="#b9b5ab" stroke-width="4" rx="6"/></g>
  ${mitten(880, 1180, -95, 0.95)}</g>`;

const prop = `<div class="clip scene" id="prop" data-start="${c7}" data-duration="${(c8 - c7).toFixed(3)}">
  ${SVG(`${desk}${ticket}<g id="cvr" transform="translate(760 0)">${cover}</g>${mitten(170, 1540, 20)}${mitten(900, 1560, -24)}`)}
</div>`;

// Экран игры (HTML внутри телефона): карта главы, вопрос на перекрёстке, верный ответ.
const map = (car: string) => `<svg viewBox="0 0 540 560" width="540" height="560" style="display:block">
  <rect width="540" height="560" fill="#3f8a4a"/>
  ${[[30, 30], [330, 30], [30, 340], [330, 340]].map(([x, y]) => `<rect x="${x}" y="${y}" width="180" height="190" rx="14" fill="#5c9a5f"/><rect x="${x + 30}" y="${y + 30}" width="120" height="120" rx="8" fill="#c9b79a"/>`).join('')}
  <rect x="0" y="240" width="540" height="80" fill="#3b4049"/><rect x="230" y="0" width="80" height="560" fill="#3b4049"/>
  <g fill="#f4f4f4">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 80 + 10}" y="277" width="40" height="6" rx="3"/>`).join('')}${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="267" y="${i * 80 + 10}" width="6" height="40" rx="3"/>`).join('')}</g>
  <g id="${car}-poi" transform="translate(270 280)"><circle r="34" fill="#ffd166" stroke="#1d3557" stroke-width="6"/><text y="13" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="38" fill="#1d3557">?</text></g>
  <g id="${car}" transform="translate(290 520)"><rect x="-22" y="-40" width="44" height="80" rx="14" fill="#ffb703" stroke="#7a5200" stroke-width="3"/><rect x="-16" y="-24" width="32" height="14" rx="4" fill="#1d3557"/><rect x="-17" y="6" width="34" height="22" rx="5" fill="#ffd166"/></g>
</svg>`;

const OPTS = ['Только автобусу.', 'Только легковому автомобилю.', 'Никому.'];
const question = (id: string) => `<div id="${id}" style="position:absolute;left:0;right:0;bottom:0;height:560px;background:#151b26;border-radius:34px 34px 0 0;padding:30px 28px;border-top:3px solid #2b3446">
  <div style="font-size:21px;font-weight:700;color:#8b93a3;letter-spacing:1px">БИЛЕТ 1 · ВОПРОС 15</div>
  <div style="margin-top:14px;font-size:29px;font-weight:700;line-height:1.28">Кому Вы обязаны уступить дорогу при повороте налево?</div>
  ${OPTS.map((o, i) => `<div id="${id}-o${i}" style="margin-top:${i ? 14 : 26}px;padding:20px 22px;border-radius:16px;background:#1f2735;border:3px solid #2e3a4f;font-size:26px;font-weight:700">${i + 1}. ${o}</div>`).join('')}
  <div id="${id}-ok" style="position:absolute;left:28px;right:28px;top:-86px;padding:16px 0;border-radius:18px;background:${K.green};color:#06240f;text-align:center;font-size:30px;font-weight:900;opacity:0">Верно! +10 опыта</div>
</div>`;

const screen = (id: string) => `<div style="position:absolute;inset:0;background:#0f141d;overflow:hidden;font-family:Montserrat;color:#fff">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:56px 26px 18px;font-size:21px;font-weight:700;color:#aeb6c4">
    <span>Глава 1 · Учебный городок</span><span style="padding:5px 12px;border:2px solid ${K.accent};border-radius:20px;color:${K.accent}">Повторы: 3</span></div>
  ${map(`${id}-car`)}
  ${question(`${id}-q`)}
</div>`;

const phoneBig = `<div class="clip scene" id="pclose" data-start="${c12}" data-duration="${(c13 - c12).toFixed(3)}">
  <div id="pcl" style="position:absolute;left:250px;top:560px;width:580px;height:1180px;border:9px solid ${K.line};border-radius:74px;background:#000;padding:14px;box-shadow:0 0 120px rgba(90,140,255,0.18)">
    <div style="position:relative;width:100%;height:100%;border-radius:58px;overflow:hidden">${screen('pc')}</div>
    <div style="position:absolute;left:50%;top:22px;width:130px;height:30px;margin-left:-65px;border-radius:15px;background:#000"></div>
  </div>
  <svg viewBox="0 0 1080 1920" width="1080" height="1920" class="layer" style="pointer-events:none">
    <g fill="${K.head}" stroke="${K.line}" stroke-width="8" stroke-linejoin="round">
      ${[0, 1, 2, 3].map((i) => `<rect x="196" y="${1300 + i * 92}" width="96" height="70" rx="35"/>`).join('')}
      <path d="M820,1560 Q860,1520 900,1560 L960,1700 Q990,1800 1000,1960 H700 Q760,1760 820,1560 Z"/>
      <rect x="770" y="1470" width="70" height="130" rx="35" transform="rotate(28 805 1535)"/>
    </g>
  </svg>
</div>`;

/** Развязка сверху: стопка билетов отодвинута, в руках телефон, верный ответ. */
const finalTop = `<div class="clip scene" id="ftop" data-start="${c15}" data-duration="${(c16 - c15).toFixed(3)}">
  ${SVG(`${desk}
    <g transform="translate(250 640) rotate(-18)">${[0, 1, 2, 3].map((i) => `<rect x="${-200 + i * 8}" y="${-260 + i * 6}" width="400" height="530" fill="${i === 3 ? '#ebe7de' : '#d9d5cb'}" stroke="#b9b5ab" stroke-width="3" rx="5"/>`).join('')}
      <text x="-150" y="-180" font-family="Montserrat" font-weight="800" font-size="30" fill="#3a3834">БИЛЕТ 23</text></g>`)}
  <div id="ftp" style="position:absolute;left:330px;top:820px;width:430px;height:860px;border:8px solid #111;border-radius:58px;background:#000;padding:12px;transform:rotate(4deg);box-shadow:0 0 0 6px ${K.line}">
    <div style="position:relative;width:100%;height:100%;border-radius:46px;overflow:hidden;transform:scale(1)"><div style="position:absolute;left:0;top:0;width:540px;height:1080px;transform:scale(0.75);transform-origin:0 0">${screen('ft')}</div></div>
    <div id="ftGlow" style="position:absolute;inset:-40px;border-radius:90px;box-shadow:0 0 140px 40px rgba(62,207,110,0.55);opacity:0"></div>
  </div>
  ${SVG(`${mitten(300, 1500, 32)}${mitten(810, 1520, -30)}`, 'style="pointer-events:none"')}
</div>`;

// ─── Инфографика ──────────────────────────────────────────────────────────────

const info1 = `<div class="clip scene" id="info1" data-start="${c5}" data-duration="${(c6 - c5).toFixed(3)}" style="background:transparent">
  <div class="ihead" id="i1h" style="top:560px">ЧЕРЕЗ НЕДЕЛЮ ВСПОМНИЛИ<br><span style="color:${K.accent}">ВЫУЧЕННЫХ СЛОВ</span></div>
  <div class="blab" id="i1l0" style="top:770px">ТОЛЬКО ПЕРЕЧИТЫВАЛИ</div>
  <div class="bar" id="i1b0" style="top:814px;width:0;background:#e9e9e6"><b>36%</b></div>
  <div class="blab" id="i1l1" style="top:932px">ПРОВЕРЯЛИ СЕБЯ</div>
  <div class="bar" id="i1b1" style="top:976px;width:0;background:${K.accent}"><b>80%</b></div>
  <div class="ihead" id="i1big" style="top:1120px;font-size:84px;font-weight:900;letter-spacing:0;color:${K.accent}">ВДВОЕ БОЛЬШЕ</div>
  <div class="src" id="i1s">Karpicke, Roediger, Science, 2008:<br>слова на суахили, итоговый тест через неделю</div>
</div>`;

const node = (i: number, x: number, top: string, bottom: string, cross = false) => `<div id="n${i}" style="position:absolute;left:${x - 90}px;top:850px;width:180px;text-align:center">
  <div style="margin:0 auto;width:74px;height:74px;border-radius:50%;background:${cross ? '#1a1b1f' : K.accent};border:5px solid ${cross ? K.accent : K.accent};display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;color:${cross ? K.accent : '#111'}">${cross ? '✕' : '✓'}</div>
  <div style="margin-top:18px;font-size:23px;font-weight:800;letter-spacing:1px;line-height:1.3;color:#e3e4e8">${top}<br><span style="color:#8c8f97">${bottom}</span></div>
</div>`;
const info2 = `<div class="clip scene" id="info2" data-start="${c9}" data-duration="${(c10 - c9).toFixed(3)}" style="background:transparent">
  <div class="ihead" id="i2h" style="top:600px">ЧТОБЫ ОШИБКА НЕ ПОВТОРИЛАСЬ<br><span style="color:${K.accent}">ТРИ ПОВТОРА</span></div>
  <div id="i2line" style="position:absolute;left:140px;top:885px;height:6px;width:0;background:${K.accent};border-radius:3px"></div>
  ${node(0, 150, 'ОШИБКА', 'СЕГОДНЯ', true)}${node(1, 410, 'ПОВТОР', 'ЧЕРЕЗ 1 ДЕНЬ')}${node(2, 670, 'ПОВТОР', 'ЕЩЁ ЧЕРЕЗ 3')}${node(3, 930, 'ПОВТОР', 'ЕЩЁ ЧЕРЕЗ 7')}
  <div class="ihead" id="i2big" style="top:1150px;font-size:76px;font-weight:900;letter-spacing:0;color:${K.accent}">И ОНА ЗАПОМНИЛАСЬ</div>
</div>`;

// ─── Подписи ──────────────────────────────────────────────────────────────────

const CAPS: [number, number, string][] = [
  [c0, c1, '«Ты эти билеты по кругу уже третий час читаешь»'],
  [c1, c2, '«Завтра теория»'],
  [c2, c3, '«И сколько из этого запомнилось?»'],
  [c3, c4, '«Всё. Там же правильные ответы выделены»'],
  [c4, c6, '«Знаешь, сколько помнят через неделю, если только перечитывать? Треть»'],
  [c6, c7, '«Да ладно…»'],
  [c7, c8, '«Закрой ответы — и отвечай сам»'],
  [c8, c10, '«Где ошибся — повтори через день. Потом через три и через семь»'],
  [c10, c11, '«…И кто мне это будет напоминать?»'],
  [c11, c13, '«Игра. В «Курьере ПДД» ошибки сами возвращаются, когда пора»'],
  [c13, c14, '«В игру?..»'],
  [c14, c15, '«Ладно. Дай глянуть»'],
];
const caps = CAPS.map(([a, b, t], i) => `<div class="clip cap7" id="cap${i}" data-start="${a}" data-duration="${(b - a).toFixed(3)}">${t}</div>`).join('\n      ');

// ─── Кадры и анимация ────────────────────────────────────────────────────────

const tw: string[] = [];
const add = (...s: string[]) => tw.push(...s);

/** Кадр: камера (центр, масштаб) и наезд к концу кадра; фон размыт сильнее на крупных планах. */
const shot = (t0: number, t1: number, fx: number, fy: number, s: number, push = 1.04, blur = 5) => {
  add(`tl.set('#cam', ${JSON.stringify(camAt(fx, fy, s))}, ${t0.toFixed(3)});`);
  add(`tl.to('#cam', { ...${JSON.stringify(camAt(fx, fy, s * push))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0.toFixed(3)});`);
  add(`tl.set('#bgL', { filter: 'blur(${blur}px)' }, ${t0.toFixed(3)});`);
};
const fgOn = (id: string, t0: number, t1: number) => add(`tl.set('#${id}', { opacity: 1 }, ${t0.toFixed(3)}); tl.set('#${id}', { opacity: 0 }, ${t1.toFixed(3)});`);
const dim = (t0: number, t1: number) =>
  add(`tl.to('#world', { filter: 'blur(14px) brightness(0.32)', duration: 0.3 }, ${t0.toFixed(3)}); tl.set('#world', { filter: 'blur(0px) brightness(1)' }, ${t1.toFixed(3)});`);

let pa: Pose = pose(SHEET_UP);
let pb: Pose = pose({ tor: -6 });
const A_ = (p: Partial<Pose>, t: number, d = 0, ease?: string) => {
  const r = toPose('A', p, pa, t, d, ease);
  pa = r.pose;
  add(r.tw);
};
const B_ = (p: Partial<Pose>, t: number, d = 0, ease?: string) => {
  const r = toPose('B', p, pb, t, d, ease);
  pb = r.pose;
  add(r.tw);
};

// 0. Общий план: A читает лист, перелистывает; B подкалывает.
shot(c0, c1, 665, 930, 1.08, 1.04, 3);
add(face('A', 'tired', 0), look('A', 1, 0.6, 0), face('B', 'smirk', 0), look('B', 1, 0.2, 0));
add(`tl.to('#A-flip', { attr: { transform: 'translate(56 -78) scale(0.04 1)' }, duration: 0.13, ease: 'power1.in' }, 1.55); tl.to('#A-flip', { attr: { transform: 'translate(56 -78) scale(1 1)' }, duration: 0.15, ease: 'power1.out' }, 1.68);`);
add(gesture('B', 1, -62, -26, 0.35, 2, 0.3));
A_({ hd: 6 }, 0.2, 1.4, 'sine.inOut');

// 1. A крупно: «Завтра теория» — опускает лист, вздыхает.
shot(c1, c2, 350, 1080, 1.75, 1.04);
A_({ ua1: -30, fa1: -84, hd: -4, tor: -2 }, c1);
add(look('A', 1, 0, c1), face('A', 'tired', c1));
A_({ tor: -8, hd: 2 }, c1 + 0.3, 1.1, 'sine.inOut');

// 2. B через плечо: «И сколько из этого запомнилось?» — рука поднята, брови.
shot(c2, c3, 960, 1085, 1.75, 1.04);
fgOn('fgA', c2, c3);
B_({ tor: 2, ua1: -22, fa1: -138 }, c2);
add(face('B', 'doubt', c2), look('B', 1, 0, c2), gesture('B', 1, -138, -18, c2 + 0.25, 3, 0.28));

// 3. A крупно: «Всё. Там же правильные ответы выделены» — показывает лист.
shot(c3, c4, 380, 1080, 1.75, 1.04);
fgOn('fgB', c3, c4);
A_({ tor: 4, ua1: -62, fa1: -70, hd: 0 }, c3);
add(face('A', 'grin', c3), look('A', 1, 0, c3));
A_({ ua1: -70, fa1: -64 }, c3 + 0.4, 0.25, 'back.out(2)');

// 4. B крупно: «Знаешь, сколько помнят через неделю…? Треть» — подаётся вперёд, указывает.
shot(c4, c5, 985, 1070, 1.9, 1.04, 6);
B_({ tor: 10, ua1: -72, fa1: -28 }, c4);
add(face('B', 'think', c4), look('B', 1, 0, c4), face('B', 'smirk', c4 + 2.0));
add(gesture('B', 1, -28, -14, c4 + 0.3, 2, 0.26));

// 5. Инфографика 1.
dim(c5, c6);
add(`tl.fromTo('#i1h', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(c5 + 0.15).toFixed(3)});`);
add(`tl.fromTo('#i1l0', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${(c5 + 0.55).toFixed(3)});`);
add(`tl.fromTo('#i1b0', { width: 0 }, { width: ${Math.round(860 * 0.36)}, duration: 0.55, ease: 'power2.out' }, ${(c5 + 0.6).toFixed(3)});`);
add(`tl.fromTo('#i1l1', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${(c5 + 1.25).toFixed(3)});`);
add(`tl.fromTo('#i1b1', { width: 0 }, { width: ${Math.round(860 * 0.8)}, duration: 0.8, ease: 'power2.out' }, ${(c5 + 1.3).toFixed(3)});`);
add(`tl.fromTo('#i1big', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${(c5 + 2.4).toFixed(3)});`);
add(`tl.fromTo('#i1s', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${(c5 + 0.3).toFixed(3)});`);

// 6. A крупно: шок, «Да ладно…».
shot(c6, c7, 345, 1065, 2.0, 1.08, 6);
A_({ tor: 4, ua1: -24, fa1: -60, hd: 0 }, c6);
add(face('A', 'shock', c6), look('A', 1, 0, c6));
A_({ tor: -4 }, c6 + 0.05, 0.25, 'power2.out');

// 7. Сверху: B закрывает выделенные ответы листом.
add(`tl.fromTo('#cvr', { attr: { transform: 'translate(760 0)' } }, { attr: { transform: 'translate(0 0)' }, duration: 0.55, ease: 'power3.out' }, ${(c7 + 0.15).toFixed(3)});`);

// 8. B через плечо: «Где ошибся — повтори…» — считает на пальцах.
shot(c8, c10, 960, 1085, 1.75, 1.06);
fgOn('fgA', c8, c9);
A_({ ...SIT, hd: 0 }, c8);
add(`tl.set('#A-sheet', { opacity: 0 }, ${c8.toFixed(3)});`);
B_({ tor: 0, ua1: -24, fa1: -146 }, c8);
add(face('B', 'smile', c8), look('B', 1, 0, c8), gesture('B', 1, -146, -16, c8 + 0.2, 3, 0.3));

// 9. Инфографика 2: ошибка → три повтора.
dim(c9, c10);
add(`tl.fromTo('#i2h', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(c9 + 0.12).toFixed(3)});`);
add(`tl.fromTo('#i2line', { width: 0 }, { width: 790, duration: 1.3, ease: 'none' }, ${(c9 + 0.45).toFixed(3)});`);
[0, 1, 2, 3].forEach((i) => add(`tl.fromTo('#n${i}', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, ${(c9 + 0.35 + i * 0.42).toFixed(3)});`));
add(`tl.fromTo('#i2big', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${(c9 + 2.0).toFixed(3)});`);

// 10. A крупно: «…И кто мне это будет напоминать?» — смотрит в стол, потом на B.
shot(c10, c11, 355, 1085, 1.75, 1.04);
fgOn('fgB', c10, c11);
A_({ tor: 2, hd: 8 }, c10);
add(face('A', 'sad', c10), look('A', 0.4, 1, c10), look('A', 1, 0, c10 + 0.7, 0.15));
A_({ hd: 0 }, c10 + 0.65, 0.3);

// 11. B крупно: достаёт телефон.
shot(c11, c12, 990, 1080, 1.9, 1.03, 6);
B_({ tor: -2, ua1: -30, fa1: -122 }, c11);
add(`tl.set('#B-ph', { opacity: 1 }, ${c11.toFixed(3)});`);
add(face('B', 'grin', c11), look('B', 1, 0, c11));
B_({ ua1: -40, fa1: -118 }, c11 + 0.1, 0.4, 'back.out(1.6)');

// 12. Телефон крупно: машина едет к перекрёстку, вопрос, верный ответ.
dim(c12, c13);
add(`tl.fromTo('#pcl', { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, ${c12.toFixed(3)});`);
add(`tl.fromTo('#pc-car', { attr: { transform: 'translate(290 520)' } }, { attr: { transform: 'translate(290 336)' }, duration: 1.0, ease: 'power1.inOut' }, ${(c12 + 0.25).toFixed(3)});`);
add(`tl.to('#pc-car-poi', { attr: { transform: 'translate(270 280) scale(1.25)' }, duration: 0.25, yoyo: true, repeat: 3 }, ${(c12 + 0.2).toFixed(3)});`);
add(`tl.fromTo('#pc-q', { y: 600 }, { y: 0, duration: 0.4, ease: 'power3.out' }, ${(c12 + 1.3).toFixed(3)});`);
add(`tl.set('#pc-q-o2', { background: '${K.green}', borderColor: '${K.green}', color: '#06240f' }, ${(c12 + 2.45).toFixed(3)});`);
add(`tl.fromTo('#pc-q-ok', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, ${(c12 + 2.55).toFixed(3)});`);

// 13. A крупно: «В игру?..» — сомнение, потом улыбка.
shot(c13, c14, 355, 1080, 1.8, 1.04);
fgOn('fgB', c13, c14);
A_({ tor: -2, hd: 0 }, c13);
add(face('A', 'doubt', c13), look('A', 1, 0, c13), face('A', 'smile', c13 + 0.6));

// 14. Общий: B протягивает телефон, A берёт.
shot(c14, c15, 665, 940, 1.14, 1.03, 3);
add(face('A', 'smile', c14), face('B', 'smile', c14));
B_({ tor: 14, ua1: -80, fa1: -10, hd: 0 }, c14 + 0.02, 0.35);
A_({ tor: 14, ua1: -78, fa1: -12 }, c14 + 0.15, 0.35);
add(`tl.set('#B-ph', { opacity: 0 }, ${(c14 + 0.55).toFixed(3)}); tl.set('#A-ph', { opacity: 1 }, ${(c14 + 0.55).toFixed(3)});`);
A_({ tor: -4, ua1: -32, fa1: -112 }, c14 + 0.6, 0.4);
B_({ tor: -6, ua1: -28, fa1: -62 }, c14 + 0.6, 0.4);
add(look('A', 0.6, 0.6, c14 + 0.8, 0.1));

// 15. Сверху: телефон в руках, «Верно!» и зелёный свет.
add(`tl.fromTo('#ftp', { y: 60 }, { y: 0, duration: 2.0, ease: 'power1.out' }, ${c15.toFixed(3)});`);
add(`tl.fromTo('#ft-car', { attr: { transform: 'translate(290 520)' } }, { attr: { transform: 'translate(290 336)' }, duration: 0.6, ease: 'power1.inOut' }, ${c15.toFixed(3)});`);
add(`tl.set('#ft-q', { y: 0 }, ${c15.toFixed(3)});`);
add(`tl.set('#ft-q-o2', { background: '${K.green}', borderColor: '${K.green}', color: '#06240f' }, ${(c15 + 0.9).toFixed(3)});`);
add(`tl.fromTo('#ft-q-ok', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, ${(c15 + 1.0).toFixed(3)});`);
add(`tl.fromTo('#ftGlow', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${(c15 + 1.0).toFixed(3)});`);

// Моргания.
for (const t of [1.1, 5.6, 8.9, 11.2, 19.7, 24.9, 28.6, 31.0]) add(blink('A', t));
for (const t of [2.4, 6.9, 10.6, 12.4, 20.4, 22.6, 26.0, 29.5]) add(blink('B', t));
add(`tl.set('#pc-q', { y: 600 }, 0);`);

const end = endCard(c16, CW7.end, 'Курьер ПДД — ссылка в био');

const html = `
      <div class="clip scene" id="world" data-start="0" data-duration="${c15.toFixed(3)}" style="background:${K.bg}">
        <div class="cam" id="cam">
          <div class="layer" id="bgL" style="filter:blur(3px)">${SVG(bg)}</div>
          ${SVG(fg)}
          ${SVG(glow, 'style="mix-blend-mode:screen"')}
        </div>
        ${fgHead('fgA', 'l')}${fgHead('fgB', 'r')}
      </div>
      ${prop}
      ${info1}
      ${info2}
      ${phoneBig}
      ${finalTop}
      ${caps}
      ${end.html}`;

export const v38: Video7 = {
  id: '38-noch',
  title: 'Реклама: ночь перед теорией',
  html,
  tweens: [...tw, end.tweens].join('\n      '),
};

