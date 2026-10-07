/**
 * Реквизит второй серии роликов: места для диалогов и рисунки для историй. Всё — простые линии.
 */
import { text } from './kit.ts';

/** Знак «У» на крыше учебной машины. */
export const learnerSign = (x: number, y: number, fill: string, accent: string, ink: string) =>
  `<path d="M${x - 46},${y} L${x},${y - 80} L${x + 46},${y} Z" fill="${fill}" stroke="${accent}" stroke-width="9"/>${text(x, y - 14, 44, ink, 'У')}`;

/** Светофор на столбе; горит один сигнал. */
export const trafficLight = (x: number, floor: number, top: number, fill: string, lit: 'red' | 'yellow' | 'green', color: string) => {
  const ys = { red: top + 40, yellow: top + 100, green: top + 160 };
  return `<path d="M${x},${floor} V${top + 200}"/><rect x="${x - 40}" y="${top}" width="80" height="200" rx="16" fill="${fill}"/>
    ${(['red', 'yellow', 'green'] as const).map((k) => `<circle cx="${x}" cy="${ys[k]}" r="22" ${k === lit ? `fill="${color}" stroke="${color}"` : ''}/>`).join('')}`;
};

/** Пешеходный светофор с человечком. */
export const walkLight = (x: number, floor: number, top: number, fill: string, color: string) =>
  `<path d="M${x},${floor} V${top + 150}"/><rect x="${x - 38}" y="${top}" width="76" height="150" rx="14" fill="${fill}"/>
   <circle cx="${x}" cy="${top + 40}" r="9" fill="${color}" stroke="${color}"/><path d="M${x},${top + 52} V${top + 86} M${x - 14},${top + 64} H${x + 14} M${x},${top + 86} l-12,24 M${x},${top + 86} l12,24" stroke="${color}" stroke-width="7"/>`;

/** Зебра сбоку — полосы на асфальте. */
export const zebra = (x1: number, x2: number, y: number) =>
  Array.from({ length: Math.floor((x2 - x1) / 60) }, (_, i) => `<path d="M${x1 + i * 60},${y} h34" stroke-width="12"/>`).join('');

/** Заправочная колонка. */
export const gasPump = (x: number, floor: number, fill: string, accent: string) =>
  `<rect x="${x - 70}" y="${floor - 330}" width="140" height="330" rx="12" fill="${fill}"/>
   <rect x="${x - 46}" y="${floor - 300}" width="92" height="64" rx="6"/><path d="M${x - 30},${floor - 268} h60" stroke-width="4"/>
   <path d="M${x + 70},${floor - 220} q60,0 60,70 V${floor - 60} q0,30 -30,30" stroke-width="7"/>
   <rect x="${x - 40}" y="${floor - 180}" width="80" height="40" fill="${accent}" stroke="${accent}"/>
   <path d="M${x - 90},${floor} H${x + 90}" stroke-width="10"/>`;

/** Навес заправки. */
export const canopy = (x1: number, x2: number, y: number, fill: string) =>
  `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="60" fill="${fill}"/><path d="M${x1 + 80},${y + 60} V1300 M${x2 - 80},${y + 60} V1300"/>`;

/** Шахматный столик в парке (вид сбоку) с фигурами. */
export const chessTable = (x: number, floor: number, fill: string) =>
  `<path d="M${x - 170},${floor - 190} H${x + 170} M${x},${floor - 190} V${floor} M${x - 60},${floor} H${x + 60}"/>
   <rect x="${x - 130}" y="${floor - 204}" width="260" height="14" fill="${fill}"/>
   ${[-100, -60, -20, 30, 70, 105]
     .map((dx, i) => (i % 2 ? `<path d="M${x + dx - 10},${floor - 204} h20 l-6,-26 a8,8 0 1 0 -8,0 z" fill="${fill}"/>` : `<path d="M${x + dx - 12},${floor - 204} h24 l-6,-40 h-12 z M${x + dx - 10},${floor - 250} h20" fill="${fill}"/>`))
     .join('')}`;

/** Пенёк-табурет. */
export const stool = (x: number, floor: number, fill: string, h = 110) =>
  `<path d="M${x - 50},${floor - h} H${x + 50} M${x - 40},${floor - h} L${x - 50},${floor} M${x + 40},${floor - h} L${x + 50},${floor}"/><rect x="${x - 54}" y="${floor - h - 12}" width="108" height="14" rx="6" fill="${fill}"/>`;

/** Шкафчики в школьном коридоре. */
export const lockers = (x1: number, n: number, top: number, floor: number, fill: string) =>
  Array.from({ length: n }, (_, i) => {
    const x = x1 + i * 120;
    return `<rect x="${x}" y="${top}" width="120" height="${floor - top}" fill="${fill}"/>${[0, 1, 2].map((k) => `<path d="M${x + 30},${top + 40 + k * 18} h60" stroke-width="3"/>`).join('')}<path d="M${x + 96},${top + 220} v40" stroke-width="5"/>`;
  }).join('');

/** Телескоп на треноге. */
export const telescope = (x: number, floor: number, fill: string) =>
  `<path d="M${x},${floor - 200} L${x - 70},${floor} M${x},${floor - 200} L${x + 70},${floor} M${x},${floor - 200} V${floor}"/>
   <g transform="rotate(-32 ${x} ${floor - 210})"><rect x="${x - 110}" y="${floor - 236}" width="230" height="52" rx="10" fill="${fill}"/><rect x="${x + 120}" y="${floor - 244}" width="30" height="68" rx="6" fill="${fill}"/></g>`;

/** Крыша дома: край и антенна. */
export const roof = (y: number) => `<path d="M-200,${y} H1300"/><path d="M80,${y} V${y - 260} M40,${y - 220} h80 M50,${y - 180} h60" stroke-width="4"/>`;

/** Стол с монитором, рулём и педалями (игровое место). */
export const simRig = (x: number, floor: number, fill: string, accent: string) =>
  `<path d="M${x - 150},${floor - 240} H${x + 200} M${x - 130},${floor - 240} V${floor} M${x + 180},${floor - 240} V${floor}"/>
   <rect x="${x - 40}" y="${floor - 560}" width="260" height="170" rx="10" fill="${fill}"/><path d="M${x + 90},${floor - 390} V${floor - 250} M${x + 50},${floor - 248} h80"/>
   <path d="M${x},${floor - 480} q60,-50 120,-20 q50,26 80,-10" stroke="${accent}" stroke-width="6"/>
   <circle cx="${x - 70}" cy="${floor - 290}" r="44" fill="${fill}"/><circle cx="${x - 70}" cy="${floor - 290}" r="12"/>`;

/** Игровое кресло (спинка и основание). */
export const gamingChair = (x: number, floor: number, f: 1 | -1, fill: string) =>
  `<path d="M${x - 70 * f},${floor - 120} L${x - 90 * f},${floor - 420} Q${x - 92 * f},${floor - 460} ${x - 50 * f},${floor - 456} L${x - 30 * f},${floor - 120} Z" fill="${fill}"/>
   <path d="M${x - 60 * f},${floor - 112} H${x + 70 * f} M${x},${floor - 112} V${floor - 30} M${x - 60},${floor - 20} H${x + 60}"/>`;

/** Беговая дорожка стадиона и трибуна. */
export const track = (y: number) =>
  `<path d="M-200,${y} H1300"/><path d="M-200,${y + 70} H1300 M-200,${y + 140} H1300" stroke-width="4"/>
   <path d="M760,${y} v140" stroke-width="10"/>
   <path d="M-100,${y - 470} H1200 M-100,${y - 400} H1200 M-100,${y - 330} H1200" stroke-width="3" opacity="0.6"/>`;

/** Платформа электрички и вагон за ней. */
export const platform = (y: number, fill: string, accent: string) =>
  `<rect x="-100" y="${y - 520}" width="1300" height="360" rx="30" fill="${fill}"/>
   ${[40, 300, 560, 820].map((x) => `<rect x="${x}" y="${y - 470}" width="200" height="130" rx="12"/>`).join('')}
   <path d="M-100,${y - 230} H1200" stroke="${accent}" stroke-width="10"/>
   <path d="M-200,${y} H1300"/><path d="M-200,${y + 30} H1300" stroke-width="4" stroke-dasharray="20 18"/>`;

/** Пешеход сбоку (маленький, для историй). */
export const tinyCar = (x: number, y: number, rot = 0, fill = 'none', stroke = 'currentColor') =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-26" y="-44" width="52" height="88" rx="14" fill="${fill}" stroke="${stroke}"/><path d="M-16,-22 h32 M-16,24 h32" stroke-width="4"/></g>`;

/** Старинный автомобиль конца XIX века (вид сбоку). */
export const oldCar = (x: number, floor: number, fill: string) =>
  `<circle cx="${x - 140}" cy="${floor - 90}" r="90" fill="${fill}"/><circle cx="${x + 150}" cy="${floor - 60}" r="60" fill="${fill}"/>
   ${[0, 45, 90, 135].map((a) => `<path d="M${x - 140 - 90 * Math.cos((a * Math.PI) / 180)},${floor - 90 - 90 * Math.sin((a * Math.PI) / 180)} L${x - 140 + 90 * Math.cos((a * Math.PI) / 180)},${floor - 90 + 90 * Math.sin((a * Math.PI) / 180)}" stroke-width="3"/>`).join('')}
   <path d="M${x - 200},${floor - 150} H${x + 200} V${floor - 260} H${x - 40} V${floor - 330} H${x - 200} Z" fill="${fill}"/>
   <path d="M${x + 110},${floor - 260} L${x + 60},${floor - 380} M${x + 30},${floor - 380} h60"/>`;

/** Трёхколёсный «Моторваген» 1886–1888 годов. */
export const motorwagen = (x: number, floor: number, fill: string) =>
  `<circle cx="${x - 120}" cy="${floor - 110}" r="110" fill="${fill}"/>${[0, 30, 60, 90, 120, 150].map((a) => `<path d="M${x - 120 - 110 * Math.cos((a * Math.PI) / 180)},${floor - 110 - 110 * Math.sin((a * Math.PI) / 180)} L${x - 120 + 110 * Math.cos((a * Math.PI) / 180)},${floor - 110 + 110 * Math.sin((a * Math.PI) / 180)}" stroke-width="3"/>`).join('')}
   <circle cx="${x + 190}" cy="${floor - 60}" r="60" fill="${fill}"/>
   <path d="M${x - 200},${floor - 230} H${x + 60} L${x + 190},${floor - 60} M${x - 170},${floor - 230} V${floor - 330} H${x + 20} V${floor - 230}" fill="${fill}"/>
   <path d="M${x + 60},${floor - 230} L${x + 100},${floor - 380} M${x + 70},${floor - 380} h60"/>`;

/** Бегун (вид сбоку). */
export const runner = (fill: string, x: number, floor: number, f: 1 | -1 = 1) => `
  <path d="M${x + 5 * f},${floor - 290} L${x - 10 * f},${floor - 160}"/>
  <path d="M${x - 10 * f},${floor - 160} L${x + 50 * f},${floor - 90} L${x + 30 * f},${floor}"/>
  <path d="M${x - 10 * f},${floor - 160} L${x - 60 * f},${floor - 80} L${x - 120 * f},${floor - 110}"/>
  <path d="M${x},${floor - 260} L${x + 60 * f},${floor - 220} L${x + 90 * f},${floor - 270}"/>
  <path d="M${x},${floor - 260} L${x - 50 * f},${floor - 210} L${x - 80 * f},${floor - 160}"/>
  <circle cx="${x + 10 * f}" cy="${floor - 330}" r="40" fill="${fill}"/>`;

/** Лошадь с каретой (вид сбоку, морда вправо). */
export const carriage = (x: number, floor: number, fill: string) => `
  <path d="M${x + 60},${floor - 160} q0,-40 40,-50 h160 q40,0 50,40 q10,40 -20,50 h-190 q-40,0 -40,-40 z" fill="${fill}"/>
  <path d="M${x + 280},${floor - 190} l50,-90 q20,-20 40,0 l20,40 l-20,10 l-30,-20 l-30,70" fill="${fill}"/>
  <path d="M${x + 110},${floor - 120} l-10,120 M${x + 140},${floor - 120} l10,120 M${x + 250},${floor - 120} l-10,120 M${x + 280},${floor - 130} l20,130 M${x + 60},${floor - 170} q-30,30 -20,80"/>
  <path d="M${x - 260},${floor - 100} V${floor - 330} H${x - 20} V${floor - 100} Z" fill="${fill}"/>
  <path d="M${x - 220},${floor - 290} h80 v80 h-80 z M${x - 100},${floor - 290} h50 v80 h-50 z" stroke-width="4"/>
  <circle cx="${x - 200}" cy="${floor - 70}" r="70" fill="${fill}"/><circle cx="${x - 60}" cy="${floor - 70}" r="70" fill="${fill}"/>
  <path d="M${x - 20},${floor - 160} H${x + 70}"/>`;

/** Газовый фонарь. */
export const gasLamp = (x: number, floor: number, fill: string) =>
  `<path d="M${x},${floor} V${floor - 420} M${x - 30},${floor} h60"/><path d="M${x - 34},${floor - 420} h68 l-12,-70 h-44 z" fill="${fill}"/><path d="M${x - 20},${floor - 500} h40 l-20,-20 z"/>`;

/** Семафор-светофор 1868 года: столб, два крыла и фонарь наверху. */
export const semaphore = (x: number, floor: number, fill: string, lamp: string) =>
  `<path d="M${x - 40},${floor} h80 M${x},${floor} V${floor - 560}"/><path d="M${x},${floor - 520} l-170,0 l0,24 l170,6 M${x},${floor - 520} l170,0 l0,24 l-170,6" fill="${fill}"/>
   <path d="M${x - 40},${floor - 560} h80 l-14,-90 h-52 z" fill="${fill}"/><circle cx="${x}" cy="${floor - 610}" r="20" fill="${lamp}" stroke="${lamp}"/>`;

/** Нос скоростного поезда (вид сбоку). */
export const bulletTrain = (x: number, y: number, fill: string) =>
  `<path d="M${x - 600},${y - 160} H${x + 60} C${x + 260},${y - 160} ${x + 380},${y - 60} ${x + 420},${y} H${x - 600} Z" fill="${fill}"/>
   <path d="M${x + 120},${y - 150} C${x + 210},${y - 140} ${x + 260},${y - 110} ${x + 290},${y - 80} H${x + 140} Z" stroke-width="4"/>
   ${[-540, -400, -260, -120].map((dx) => `<rect x="${x + dx}" y="${y - 130}" width="90" height="50" rx="8" stroke-width="4"/>`).join('')}
   <path d="M${x - 600},${y - 50} H${x + 360}" stroke-width="5"/>`;

/** Пульт: ряды переключателей. */
export const panel = (x: number, y: number, cols: number, rows: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${cols * 80 + 40}" height="${rows * 90 + 40}" rx="16" fill="${fill}"/>` +
  Array.from({ length: cols * rows }, (_, i) => {
    const cx = x + 60 + (i % cols) * 80;
    const cy = y + 65 + Math.floor(i / cols) * 90;
    return `<circle cx="${cx}" cy="${cy}" r="16"/><path d="M${cx},${cy} l${i % 3 === 0 ? 10 : -10},-14" stroke-width="5"/>`;
  }).join('');

/** Корабль «Аполлон»: командный и служебный модули. */
export const apollo = (x: number, y: number, fill: string) =>
  `<path d="M${x - 260},${y - 90} H${x + 60} V${y + 90} H${x - 260} Z" fill="${fill}"/><path d="M${x + 60},${y - 90} L${x + 220},${y - 20} V${y + 20} L${x + 60},${y + 90} Z" fill="${fill}"/>
   <path d="M${x - 260},${y - 60} l-70,-30 v180 l70,-30" fill="${fill}"/><path d="M${x - 200},${y - 90} V${y + 90} M${x - 100},${y - 90} V${y + 90}" stroke-width="4"/>`;
