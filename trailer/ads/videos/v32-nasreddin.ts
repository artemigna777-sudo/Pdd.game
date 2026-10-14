/**
 * 32. «Опять первый билет?» — как ролик 31 (образец «Обломов»: 20 секунд, 4 реплики, история на картинках,
 * вывод из двух строк), но картинки нарисованы кодом «под гравюру» (`etch.ts`), без Gemini: на ролик 31
 * TikTok повесил плашку «создано ИИ».
 * История: анекдот о Ходже Насреддине — ищет ключ под фонарём, хотя потерял его дома: «тут светлее».
 * (И. Шах, «Подвиги несравненного Муллы Насреддина», 1966; отсюда «эффект уличного фонаря».)
 * Вывод: «Ищи там, где ошибаешься» — а не перерешивай билеты, которые и так знаешь.
 */
import { desk, floorLine, lamp, person } from '../draw.ts';
import { C, DLG } from '../engine3.ts';
import type { Video4 } from '../engine4.ts';
import { fig, rng, sh, wh, type FigOpts } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'sit', seat: 112, f: 1, arms: ['table', 'table'], table: 1160, hair: 'spiky', face: 'calm' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'doubt' });

/** Билет на столе «уголком»: лист с номером. */
const ticket = (x: number, top: number) =>
  `<path d="M${x - 80},${top} l12,-170 h150 l-12,170 z" stroke-width="4"/>
   <text x="${x + 6}" y="${top - 98}" font-family="Montserrat" font-weight="800" font-size="26" letter-spacing="2" text-anchor="middle" fill="${C.line}" stroke="none">БИЛЕТ</text>
   <text x="${x + 2}" y="${top - 30}" font-family="Montserrat" font-weight="900" font-size="64" text-anchor="middle" fill="${C.line}" stroke="none">1</text>`;

const scene = `
  ${floorLine(1300)}
  ${desk(400, 660, 1160, 1300)}
  ${ticket(560, 1160)}
  ${lamp(450, 1160)}
  ${A.svg}${B.svg}`;

// ─── Гравюра: ночная улица, фонарь, Насреддин ─────────────────────────────────

const P = C.paper;
const GY = 1250; // где стены домов встают на улицу
const LX = 660; // фонарь
const LIT = { cx: 650, cy: 1480, rx: 380, ry: 175 }; // круг света на мостовой
const KEY = { x: 250, y: 1302 }; // ключ — у порога дома, в темноте

/** Звёзды — белые крестики на ночном небе, подальше от фонаря и луны. */
const stars = (() => {
  const r = rng(32);
  let d = '';
  for (let i = 0; i < 46; i++) {
    const x = -380 + r() * 1840;
    const y = -380 + r() * 1300;
    if (Math.hypot(x - LX, y - 740) < 260 || Math.hypot(x - 880, y - 300) < 110) continue;
    const k = 5 + r() * 7;
    d += `M${(x - k).toFixed(0)},${y.toFixed(0)} h${(2 * k).toFixed(0)} M${x.toFixed(0)},${(y - k).toFixed(0)} v${(2 * k).toFixed(0)} `;
  }
  return `<path d="${d}" stroke="${P}" stroke-width="4"/>`;
})();

/** Булыжники: ряды овалов, обрезанные кругом света. */
const cobbles = (() => {
  const r = rng(7);
  let d = '';
  for (let y = LIT.cy - LIT.ry - 20, j = 0; y < LIT.cy + LIT.ry + 30; y += 34, j++)
    for (let x = LIT.cx - LIT.rx - 60 + (j % 2) * 32; x < LIT.cx + LIT.rx + 60; x += 64) {
      const w = 26 + r() * 6;
      const h = 13 + r() * 3;
      d += `M${(x - w).toFixed(0)},${y.toFixed(0)} a${w.toFixed(1)},${h.toFixed(1)} 0 1 0 ${(2 * w).toFixed(1)},0 a${w.toFixed(1)},${h.toFixed(1)} 0 1 0 ${(-2 * w).toFixed(1)},0 `;
    }
  return `<defs><clipPath id="lit"><ellipse cx="${LIT.cx}" cy="${LIT.cy}" rx="${LIT.rx}" ry="${LIT.ry}"/></clipPath></defs><g clip-path="url(#lit)"><path d="${d}" stroke-width="2.2"/></g>`;
})();

/** Свет фонаря: ореол с тонкими лучами и конус до мостовой. */
const light = `
  <path d="M${LX - 46},800 L${LX + 46},800 L${LIT.cx + LIT.rx - 20},${LIT.cy} L${LIT.cx - LIT.rx + 20},${LIT.cy} Z" fill="${P}" stroke="none"/>
  <path d="M${LX - 46},800 L${LX + 46},800 L${LIT.cx + LIT.rx - 20},${LIT.cy} L${LIT.cx - LIT.rx + 20},${LIT.cy} Z" fill="url(#c0)" stroke="none" opacity="0.45"/>
  <circle cx="${LX}" cy="745" r="170" fill="${P}" stroke="none"/>
  <path d="${Array.from({ length: 28 }, (_, i) => {
    const a = (i * Math.PI * 2) / 28;
    const r1 = 62;
    const r2 = i % 2 ? 120 : 160;
    return `M${(LX + Math.cos(a) * r1).toFixed(0)},${(745 + Math.sin(a) * r1).toFixed(0)} L${(LX + Math.cos(a) * r2).toFixed(0)},${(745 + Math.sin(a) * r2).toFixed(0)}`;
  }).join(' ')}" stroke-width="1.6"/>`;

/** Фонарь на столбе. */
const lantern = `
  <path d="M${LX},1492 V800" stroke-width="18"/><path d="M${LX - 30},1500 h60 l-12,-26 h-36 z" fill="${C.ink}"/>
  <path d="M${LX - 26},800 h52 M${LX - 14},812 h28" stroke-width="6"/>
  ${wh(`M${LX - 34},792 L${LX - 44},714 L${LX + 44},714 L${LX + 34},792 Z`, 'stroke-width="5"')}
  <path d="M${LX - 14},792 L${LX - 16},714 M${LX + 14},792 L${LX + 16},714" stroke-width="2.5"/>
  <path d="M${LX},772 c-12,-10 -10,-26 0,-40 c10,14 12,30 0,40 z" fill="${C.ink}"/>
  <path d="M${LX - 56},714 L${LX},672 L${LX + 56},714 Z" fill="${C.ink}"/><circle cx="${LX}" cy="664" r="9" fill="${C.ink}"/>
  <ellipse cx="${LX + 10}" cy="1500" rx="90" ry="12" fill="url(#b0)" stroke="none"/>`;

/** Купол и минарет вдалеке, за домами. */
const skyline = `
  ${sh('M350,1250 V1010 H590 V1250 Z', 'b30')}
  ${sh('M346,1012 C346,880 594,880 594,1012 Z', 'b30')}<path d="M470,888 v-36" stroke-width="4"/><path d="M462,840 a14,14 0 1 0 22,-14 a11,11 0 1 1 -22,14 z" fill="${C.ink}"/>
  ${sh('M298,1250 V600 H344 V1250 Z', 'b120')}${wh('M286,700 h70 v18 h-70 z', 'stroke-width="3"')}${sh('M294,600 L321,500 L348,600 Z', 'b30')}`;

/** Дома: слева — дом Насреддина с приоткрытой дверью, справа — соседский. */
const houses = `
  ${sh(`M-400,620 H330 V${GY} H-400 Z`, 'b90')}
  <path d="M-400,640 H330" stroke-width="5"/><path d="M-360,640 v-22 M-240,640 v-22 M-120,640 v-22 M0,640 v-22 M120,640 v-22 M240,640 v-22" stroke-width="10"/>
  ${sh(`M150,${GY} V1070 A70,70 0 0 1 290,1070 V${GY} Z`, 'x45')}
  ${sh(`M150,${GY} V1070 A70,70 0 0 1 200,1004 L216,${GY} Z`, 'a90')}<path d="M150,${GY} V1070 A70,70 0 0 1 290,1070 V${GY}" stroke-width="6"/>
  ${sh('M10,950 V860 A44,44 0 0 1 98,860 V950 Z', 'x45')}<path d="M54,816 V950 M10,890 H98" stroke-width="4"/>
  ${wh(`M130,${GY} h180 v18 h-180 z`, 'stroke-width="3"')}
  ${sh(`M800,700 H1480 V${GY} H800 Z`, 'b90')}
  <path d="M800,720 H1480" stroke-width="5"/><path d="M840,720 v-22 M960,720 v-22 M1080,720 v-22 M1200,720 v-22" stroke-width="10"/>
  ${sh(`M880,${GY} V1090 A60,60 0 0 1 1000,1090 V${GY} Z`, 'a90')}<path d="M920,1060 V${GY} M960,1060 V${GY}" stroke-width="2.5"/><circle cx="986" cy="1170" r="6" fill="${C.ink}"/>
  ${sh('M1060,980 V890 A40,40 0 0 1 1140,890 V980 Z', 'x45')}`;

/** Мостовая: темно везде, кроме круга света. */
const street = `
  <rect x="-400" y="${GY}" width="1880" height="1150" fill="${P}" stroke="none"/>
  <rect x="-400" y="${GY}" width="1880" height="1150" fill="url(#b0)" stroke="none"/>
  <rect x="-400" y="${GY}" width="1880" height="1150" fill="url(#x45)" stroke="none" opacity="0.6"/>
  <path d="M-400,${GY} H1480" stroke-width="5"/>
  <ellipse cx="${LIT.cx}" cy="${LIT.cy}" rx="${LIT.rx + 60}" ry="${LIT.ry + 40}" fill="${P}" stroke="none"/>
  <ellipse cx="${LIT.cx}" cy="${LIT.cy}" rx="${LIT.rx + 60}" ry="${LIT.ry + 40}" fill="url(#a0)" stroke="none"/>
  <ellipse cx="${LIT.cx}" cy="${LIT.cy}" rx="${LIT.rx}" ry="${LIT.ry}" fill="${P}" stroke="none"/>
  ${cobbles}`;

/** Ключ у порога и блик на нём. */
const key = `<g transform="translate(${KEY.x} ${KEY.y}) rotate(-14)">
    <path d="M-34,-36 l-8,-10 M-6,-40 v-14 M22,-34 l10,-10 M-48,-10 h-14 M38,-6 h16" stroke="${P}" stroke-width="5"/>
    ${wh('M-22,0 a12,12 0 1 0 0.1,0 Z M-10,-3 H30 V3 H24 V12 H18 V3 H12 V9 H6 V3 H-10 Z', 'stroke-width="3"')}
  </g>`;

/** Луна — серп. */
const moon = `<circle cx="880" cy="300" r="66" fill="${P}" stroke-width="3"/><circle cx="908" cy="284" r="62" fill="${P}" stroke="none"/><circle cx="908" cy="284" r="62" fill="url(#x45)" stroke="none"/>`;

const base = `
  <rect x="-400" y="-400" width="1880" height="${GY + 400}" fill="${P}" stroke="none"/>
  <rect x="-400" y="-400" width="1880" height="${GY + 400}" fill="url(#x45)" stroke="none"/>
  ${stars}${moon}${skyline}${light}${houses}${street}${key}${lantern}`;

// ─── Герои ────────────────────────────────────────────────────────────────────

const nasr: FigOpts = { x: 0, y: 0, dress: 'coat', pat: 'a60', sleeve: 'a60', legs: 'a0', hair: 'turban', beard: true };
const neigh: FigOpts = { x: 0, y: 0, dress: 'robe', pat: 'a120', sleeve: 'a120', hair: 'kerchief' };

/** 1. Насреддин на четвереньках шарит по мостовой под фонарём. */
const searching = fig({ ...nasr, x: 830, y: 1396, lean: 72, nod: 24, leg: [0, 90], leg2: [6, 92], arm: [6, -8], arm2: [18, -14] });
/** 2–4. Стоит на коленях лицом к соседу (влево). */
const kneel = (o: Partial<FigOpts>) => fig({ ...nasr, x: 790, y: 1396, f: -1, leg: [0, 90], leg2: [6, 92], ...o });
const neighbour = (o: Partial<FigOpts>) => fig({ ...neigh, x: 460, y: 1330, f: 1, ...o });

export const v32: Video4 = {
  id: '32-nasreddin',
  title: 'Реклама: Насреддин и ключ',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1110, s: 1.45 },
  lines: [
    { text: '«Опять первый билет?»', cams: ['wide'], a: 'calm', b: 'doubt' },
    { text: '«Его я хоть знаю»', cams: [[420, 1050, 1.9], [560, 1000, 2.4]], a: 'smile' },
    { text: '«Как Насреддин<br>с ключом»', cams: [[860, 1060, 2.0], 'wide'], b: 'smile' },
    { text: '«…С каким ключом?»', cams: [[420, 1050, 1.9], 'wide'], a: 'doubt', b: 'smile' },
  ],
  pics: ['ищет под фонарём', 'где потерял? дома', 'зачем здесь?', 'тут светлее'],
  art: [
    `${base}${searching}`,
    `${base}${neighbour({ arm: [40, 95], arm2: [10, 10], face: 'calm' })}${kneel({ arm: [140, -4], arm2: [10, 12], nod: -10 })}`,
    `${base}${neighbour({ arm: [125, 25], arm2: [105, 30], face: 'shout' })}${kneel({ arm: [20, 40], arm2: [10, 12], nod: -4, face: 'calm' })}`,
    `${base}${neighbour({ arm: [10, 10], arm2: [6, 6], face: 'sad', nod: 8 })}${kneel({ arm: [168, 4], arm2: [10, 12], nod: -26 })}`,
  ],
  shots: [
    { img: 1, fx: 560, fy: 1060, s: 1, dx: 160, dy: 110, ds: 1.16, label: 'Насреддин искал ключ под фонарём' },
    { img: 2, fx: 620, fy: 1300, s: 1.55, label: '«Где потерял?» — «Дома»' },
    { img: 2, fx: 330, fy: 1210, s: 1.55, dx: -40 },
    { img: 3, fx: 480, fy: 1250, s: 1.9, label: '«Зачем ищешь здесь?»' },
    { img: 3, fx: 760, fy: 1300, s: 1.9 },
    { img: 4, fx: 700, fy: 1150, s: 1.45, dy: -30, label: '«Тут светлее»' },
    { img: 4, fx: 560, fy: 1180, s: 1.1, dx: -320, dy: 110, ds: 2.1, label: '' },
  ],
  cta: { lines: ['Ищи там,', 'где ошибаешься'], accent: 1 },
  music: 'plan.wav',
};
