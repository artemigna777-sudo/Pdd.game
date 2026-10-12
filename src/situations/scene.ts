/**
 * Сцена ситуации (этап 15): вид сверху в цветах города, нарисованный в SVG. Машина игрока —
 * жёлтая машина курьера внизу, едет вверх. Знаки, светофоры и регулировщик ещё и показаны
 * крупно в карточках слева вверху, чтобы их было видно на маленьком экране.
 *
 * Сцена только иллюстрирует ситуацию: текст, варианты и ответ — в карточке под ней.
 */
import { portraitSvg } from '../story/portraits.ts';
import { LIGHT_ITEM, REGULATOR_ITEM, SIGN_ITEM, type SituationScene } from './types.ts';

export const SCENE_W = 360;
export const SCENE_H = 300;

const C = {
  grass: '#5b9a4f',
  grassDark: '#4a8741',
  field: '#8fb35a',
  shoulder: '#a99f8e',
  sidewalk: '#b7bec8',
  curb: '#dde1e7',
  asphalt: '#40454e',
  asphaltDark: '#363a42',
  dirt: '#8b6b4a',
  marking: '#eef0f2',
  yellow: '#f2c200',
  glass: '#1d3557',
  headlight: '#fff3b0',
  taillight: '#e63946',
  amber: '#ffb000',
  player: '#ffb703',
  playerRoof: '#ffd166',
  parcel: '#c77d3a',
  water: '#3d7ab8',
  roofs: ['#c8553d', '#588b8b', '#e0a458', '#8e7dbe', '#9c6644', '#6d7b8d'],
  cars: ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#8d99ae', '#6a4c93', '#264653'],
};

/** Геометрия дороги, по которой едет игрок (вертикальная, снизу вверх). */
interface Road {
  left: number;
  right: number;
  center: number;
  /** Свои полосы: правая (крайняя) первой, затем левее. */
  our: number[];
  /** Встречные полосы: ближняя к осевой первой. */
  onc: number[];
  /** Разделительная полоса автомагистрали. */
  median?: boolean;
}

type Layout = 'straight' | 'cross' | 'ring' | 'exit' | 'parking';

interface Ctx {
  scene: SituationScene;
  has: (item: string) => boolean;
  layout: Layout;
  road: Road;
  /** Где машина игрока. */
  px: number;
  py: number;
  /** Адрес картинок знаков (с базовым путём сайта). */
  base: string;
  night: boolean;
}

const f = (n: number) => +n.toFixed(1);

// ─── Транспорт и люди ───────────────────────────────────────────────────────────

interface CarOpts {
  color?: string;
  kind?: 'car' | 'bus' | 'moto' | 'bike' | 'ambulance' | 'player';
  brake?: boolean;
  hazard?: boolean;
  blink?: 'l' | 'r';
  /** Задний ход: белые фонари. */
  reverse?: boolean;
  door?: boolean;
}

/** Транспорт «носом вверх» с центром в (x, y), повёрнутый на rot градусов. */
function vehicle(x: number, y: number, rot: number, o: CarOpts = {}): string {
  const kind = o.kind ?? 'car';
  const size = { car: [24, 44], player: [24, 44], ambulance: [26, 48], bus: [28, 92], moto: [10, 26], bike: [8, 22] }[kind];
  const [w, h] = size;
  const hw = w / 2;
  const hh = h / 2;
  let s = '';
  if (kind === 'moto' || kind === 'bike') {
    const col = o.color ?? (kind === 'moto' ? '#1f2937' : '#2a9d8f');
    s += `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="${hw}" fill="${col}"/>`;
    s += `<rect x="${-hw - 4}" y="${-hh + 6}" width="${w + 8}" height="2.5" rx="1" fill="#9aa3ad"/>`;
    s += `<circle cx="0" cy="${hh * 0.15}" r="5.5" fill="${kind === 'moto' ? '#e63946' : '#f4a261'}"/><circle cx="0" cy="${hh * 0.15}" r="3.4" fill="#2b2d42"/>`;
    if (kind === 'moto') s += `<rect x="-2.5" y="${-hh}" width="5" height="3" fill="${C.headlight}"/>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${s}</g>`;
  }
  const color = kind === 'player' ? C.player : kind === 'ambulance' ? '#f8f9fa' : (o.color ?? C.cars[0]);
  s += `<rect x="${-hw + 3}" y="${-hh + 4}" width="${w}" height="${h}" rx="7" fill="#000" opacity=".25"/>`;
  s += `<rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="${kind === 'bus' ? 5 : 7}" fill="${color}"/>`;
  if (kind === 'bus') {
    s += `<rect x="${-hw + 3}" y="${-hh + 4}" width="${w - 6}" height="7" rx="2" fill="${C.glass}"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="${-hw + 4}" y="${-hh + 18 + i * 14}" width="${w - 8}" height="9" rx="2" fill="#fff" opacity=".25"/>`;
  } else {
    s += `<rect x="${-hw + 3}" y="${-hh + 8}" width="${w - 6}" height="8" rx="2" fill="${C.glass}"/>`;
    s += `<rect x="${-hw + 3}" y="${-hh + 17}" width="${w - 6}" height="14" rx="3" fill="${kind === 'player' ? C.playerRoof : '#fff'}" opacity="${kind === 'player' ? 1 : 0.22}"/>`;
    if (kind === 'player') s += `<rect x="-5" y="${-hh + 19}" width="10" height="9" fill="${C.parcel}"/><rect x="-5" y="${-hh + 22.5}" width="10" height="2" fill="#9c5c26"/>`;
    s += `<rect x="${-hw + 4}" y="${hh - 10}" width="${w - 8}" height="5" rx="2" fill="${C.glass}"/>`;
  }
  if (kind === 'ambulance') {
    s += `<rect x="${-hw}" y="-2" width="${w}" height="5" fill="#d62839"/>`;
    s += `<rect class="sc-blink" x="-7" y="${-hh + 2}" width="14" height="4" rx="2" fill="#2f6bff"/>`;
  }
  s += `<rect x="${-hw + 2}" y="${-hh + 1}" width="5" height="3" fill="${C.headlight}"/><rect x="${hw - 7}" y="${-hh + 1}" width="5" height="3" fill="${C.headlight}"/>`;
  const tail = o.reverse ? '#ffffff' : C.taillight;
  s += `<rect x="${-hw + 2}" y="${hh - 3}" width="5" height="2.5" fill="${tail}"/><rect x="${hw - 7}" y="${hh - 3}" width="5" height="2.5" fill="${tail}"/>`;
  if (o.brake) s += `<circle cx="${-hw + 4.5}" cy="${hh - 1}" r="6" fill="${C.taillight}" opacity=".55"/><circle cx="${hw - 4.5}" cy="${hh - 1}" r="6" fill="${C.taillight}" opacity=".55"/>`;
  const amber = (sides: ('l' | 'r')[]) =>
    `<g class="sc-blink">${sides
      .flatMap((side) => {
        const x0 = side === 'l' ? -hw : hw;
        return [`<circle cx="${x0}" cy="${-hh + 3}" r="4.5" fill="${C.amber}"/>`, `<circle cx="${x0}" cy="${hh - 3}" r="4.5" fill="${C.amber}"/>`];
      })
      .join('')}</g>`;
  if (o.hazard) s += amber(['l', 'r']);
  else if (o.blink) s += amber([o.blink]);
  // Открытая водительская (левая) дверь.
  if (o.door) s += `<rect x="${-hw - 16}" y="${-hh + 13}" width="16" height="3.5" rx="1.5" fill="${color}" stroke="#222" stroke-width=".6" transform="rotate(40 ${-hw} ${-hh + 14})"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${s}</g>`;
}

/** Пешеход сверху: плечи и голова. dark — тёмная одежда. */
function person(x: number, y: number, rot = 0, o: { color?: string; child?: boolean; dark?: boolean; uniform?: boolean } = {}): string {
  const k = o.child ? 0.8 : 1;
  const body = o.dark ? '#1b1b22' : o.uniform ? '#1e3a8a' : (o.color ?? '#e76f51');
  const head = o.uniform ? '#f1f5f9' : o.dark ? '#3a2a20' : '#6b4226';
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${k})"><ellipse cx="2" cy="3" rx="9" ry="6" fill="#000" opacity=".2"/><ellipse cx="0" cy="0" rx="9" ry="5.5" fill="${body}"/><circle cx="0" cy="0" r="4.6" fill="${head}"/></g>`;
}

function dog(x: number, y: number): string {
  return `<g transform="translate(${x} ${y}) rotate(-70) scale(1.7)"><ellipse cx="0" cy="0" rx="5" ry="10" fill="#9c6644"/><circle cx="0" cy="-11" r="4.4" fill="#7f4f2c"/><path d="M0 9 q4 5 2 9" stroke="#7f4f2c" stroke-width="2" fill="none"/></g>`;
}

// ─── Дорога ─────────────────────────────────────────────────────────────────────

function roadFor(scene: SituationScene, has: (i: string) => boolean): Road {
  if (scene.place === 'highway' && !has('bridge')) return { left: 50, right: 310, center: 180, our: [271, 213], onc: [147, 89], median: true };
  if (has('bridge')) return { left: 80, right: 280, center: 180, our: [255, 205], onc: [155, 105] };
  if (has('narrow-road')) return { left: 140, right: 220, center: 180, our: [200], onc: [160] };
  if (has('car-blindspot-left') || has('dense-traffic') || has('loud-car')) return { left: 60, right: 300, center: 180, our: [270, 210], onc: [150, 90] };
  return { left: 120, right: 240, center: 180, our: [210], onc: [150] };
}

function layoutFor(scene: SituationScene, has: (i: string) => boolean): Layout {
  if (has('roundabout')) return 'ring';
  if (has('reverse-parking')) return 'parking';
  if (has('yard-exit') || has('gas-station-exit')) return 'exit';
  if (has('equal-crossroad') || has('car-stuck-in-crossroad') || has('car-right-turning-right') || scene.items.some((i) => LIGHT_ITEM.test(i) || REGULATOR_ITEM.test(i)) || has('car-left-close') || has('sign:2.1')) return 'cross';
  return 'straight';
}

/** Края дороги, тротуары, разметка вертикальной дороги от y0 до y1. */
function verticalRoad(ctx: Ctx, y0: number, y1: number, d = ''): string {
  const { road: r, scene } = ctx;
  const city = scene.place === 'city' || scene.place === 'yard';
  const dirt = ctx.has('dirt-road');
  let s = '';
  const h = y1 - y0;
  if (city) s += `<rect x="${r.left - 26}" y="${y0}" width="26" height="${h}" fill="${C.sidewalk}"/><rect x="${r.right}" y="${y0}" width="26" height="${h}" fill="${C.sidewalk}"/>`;
  else if (!ctx.has('bridge')) s += `<rect x="${r.left - 12}" y="${y0}" width="12" height="${h}" fill="${dirt ? '#6f5a3d' : C.shoulder}"/><rect x="${r.right}" y="${y0}" width="12" height="${h}" fill="${dirt ? '#6f5a3d' : C.shoulder}"/>`;
  s += `<rect x="${r.left}" y="${y0}" width="${r.right - r.left}" height="${h}" fill="${dirt ? C.dirt : C.asphalt}"/>`;
  if (city) s += `<rect x="${r.left - 2}" y="${y0}" width="2" height="${h}" fill="${C.curb}"/><rect x="${r.right}" y="${y0}" width="2" height="${h}" fill="${C.curb}"/>`;
  if (dirt) {
    for (const x of [r.our[0] - 8, r.our[0] + 8, r.onc[0] - 8, r.onc[0] + 8]) s += `<rect x="${x - 2}" y="${y0}" width="4" height="${h}" fill="#5e4a33" opacity=".7"/>`;
    return s;
  }
  if (ctx.has('no-markings')) return s;
  // Осевая: сплошная, двойная на широкой дороге, у автомагистрали — разделительная полоса.
  if (r.median) {
    s += `<rect x="${r.center - 6}" y="${y0}" width="12" height="${h}" fill="${C.grassDark}"/><rect x="${r.center - 1}" y="${y0}" width="2" height="${h}" fill="#c9cdd3"/>`;
    s += `<rect x="${r.center - 9}" y="${y0}" width="2" height="${h}" fill="${C.marking}"/><rect x="${r.center + 7}" y="${y0}" width="2" height="${h}" fill="${C.marking}"/>`;
  } else if (r.our.length > 1 && !ctx.has('one-way-oncoming')) s += `<rect x="${r.center - 4}" y="${y0}" width="2" height="${h}" fill="${C.marking}"/><rect x="${r.center + 2}" y="${y0}" width="2" height="${h}" fill="${C.marking}"/>`;
  else if (ctx.has('solid-center')) s += `<rect x="${r.center - 1.5}" y="${y0}" width="3" height="${h}" fill="${C.marking}"/>`;
  else s += `<line x1="${r.center}" y1="${y0}" x2="${r.center}" y2="${y1}" stroke="${C.marking}" stroke-width="3" stroke-dasharray="18 14" ${d}/>`;
  // Между полосами одного направления — прерывистая.
  const lanes = (xs: number[]) => {
    for (let i = 1; i < xs.length; i++) s += `<line x1="${(xs[i] + xs[i - 1]) / 2}" y1="${y0}" x2="${(xs[i] + xs[i - 1]) / 2}" y2="${y1}" stroke="${C.marking}" stroke-width="2.5" stroke-dasharray="14 16"/>`;
  };
  lanes(r.our);
  lanes(r.onc);
  return s;
}

function background(ctx: Ctx): string {
  const { scene } = ctx;
  if (ctx.has('bridge')) return `<rect width="${SCENE_W}" height="${SCENE_H}" fill="${C.water}"/><path d="M0 40 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 M0 160 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#5b97cf" stroke-width="2" fill="none"/>`;
  if (scene.place === 'city' || scene.place === 'yard') {
    let s = `<rect width="${SCENE_W}" height="${SCENE_H}" fill="${C.grass}"/>`;
    // Дома вдоль улицы.
    const roofs = [
      [6, 10, 44, 70],
      [4, 100, 46, 90],
      [8, 210, 40, 80],
      [312, 6, 44, 90],
      [314, 112, 42, 70],
      [310, 200, 46, 92],
    ];
    roofs.forEach(([x, y, w, h], i) => (s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${C.roofs[i % C.roofs.length]}"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="#fff" opacity=".12"/>`));
    return s;
  }
  let s = `<rect width="${SCENE_W}" height="${SCENE_H}" fill="${scene.weather === 'snow' || scene.weather === 'ice' ? '#e8eef4' : C.field}"/>`;
  const trees = [
    [24, 30],
    [40, 120],
    [18, 220],
    [334, 60],
    [320, 170],
    [338, 260],
  ];
  if (scene.place !== 'highway') for (const [x, y] of trees) s += `<circle cx="${x}" cy="${y}" r="15" fill="#2f6f3a"/><circle cx="${x - 4}" cy="${y - 4}" r="8" fill="#43914e"/>`;
  return s;
}

function crossRoads(ctx: Ctx): string {
  const r = ctx.road;
  const city = ctx.scene.place === 'city';
  let s = verticalRoad(ctx, 0, SCENE_H);
  // Поперечная дорога y 60…180, полосы: на запад — 90, на восток — 150.
  if (city) s += `<rect x="0" y="34" width="${SCENE_W}" height="26" fill="${C.sidewalk}"/><rect x="0" y="180" width="${SCENE_W}" height="26" fill="${C.sidewalk}"/>`;
  s += `<rect x="0" y="60" width="${SCENE_W}" height="120" fill="${C.asphalt}"/>`;
  s += `<line x1="0" y1="120" x2="${r.left - 14}" y2="120" stroke="${C.marking}" stroke-width="3" stroke-dasharray="18 14"/><line x1="${r.right + 14}" y1="120" x2="${SCENE_W}" y2="120" stroke="${C.marking}" stroke-width="3" stroke-dasharray="18 14"/>`;
  // Стоп-линия и переходы.
  s += `<rect x="${r.center}" y="206" width="${r.right - r.center}" height="4" fill="${C.marking}"/>`;
  if (city) for (let x = r.left + 4; x < r.right - 6; x += 14) s += `<rect x="${x}" y="184" width="8" height="18" fill="${C.marking}" opacity=".9"/>`;
  return s;
}

function ringRoads(ctx: Ctx): string {
  let s = verticalRoad(ctx, 150, SCENE_H);
  s += `<rect x="0" y="45" width="${SCENE_W}" height="120" fill="${C.asphalt}"/><rect x="120" y="0" width="120" height="60" fill="${C.asphalt}"/>`;
  s += `<circle cx="180" cy="105" r="88" fill="${C.asphalt}"/><circle cx="180" cy="105" r="34" fill="${C.grass}" stroke="${C.curb}" stroke-width="3"/>`;
  s += `<circle cx="180" cy="105" r="61" fill="none" stroke="${C.marking}" stroke-width="2.5" stroke-dasharray="12 12"/>`;
  return s;
}

function exitRoads(ctx: Ctx): string {
  let s = '';
  s += `<rect x="0" y="150" width="${SCENE_W}" height="26" fill="${C.sidewalk}"/><rect x="0" y="22" width="${SCENE_W}" height="26" fill="${C.sidewalk}"/>`;
  s += `<rect x="0" y="48" width="${SCENE_W}" height="102" fill="${C.asphalt}"/><line x1="0" y1="99" x2="${SCENE_W}" y2="99" stroke="${C.marking}" stroke-width="3" stroke-dasharray="18 14"/>`;
  s += `<rect x="168" y="150" width="64" height="${SCENE_H - 150}" fill="${C.asphaltDark}"/><rect x="166" y="150" width="2" height="26" fill="${C.curb}"/><rect x="232" y="150" width="2" height="26" fill="${C.curb}"/>`;
  if (ctx.has('gas-station-exit')) {
    s += `<rect x="40" y="210" width="110" height="70" rx="4" fill="#e9ecef"/><rect x="48" y="226" width="16" height="30" rx="3" fill="#e63946"/><rect x="84" y="226" width="16" height="30" rx="3" fill="#e63946"/><rect x="120" y="226" width="16" height="30" rx="3" fill="#e63946"/><text x="95" y="274" font-size="11" text-anchor="middle" fill="#495057" font-weight="700">АЗС</text>`;
  } else {
    s += `<rect x="20" y="200" width="130" height="100" rx="3" fill="${C.roofs[0]}"/><rect x="250" y="200" width="100" height="100" rx="3" fill="${C.roofs[1]}"/>`;
  }
  return s;
}

function parkingLot(): string {
  let s = `<rect x="20" y="0" width="320" height="${SCENE_H}" fill="${C.asphalt}"/>`;
  for (const x of [60, 120, 240, 300]) s += `<rect x="${x - 1}" y="70" width="2" height="90" fill="${C.marking}"/>`;
  for (const x of [120, 240]) s += `<rect x="${x - 1}" y="70" width="2" height="90" fill="${C.marking}"/>`;
  s += `<rect x="0" y="260" width="${SCENE_W}" height="40" fill="${C.sidewalk}"/>`;
  return s;
}

// ─── Знаки, светофоры, регулировщик ─────────────────────────────────────────────

/** Знак ограничения скорости: белый (временный — жёлтый) круг с красной каймой и числом. */
function speedSign(n: string, temp: boolean, size: number): string {
  const r = size / 2;
  return `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="${temp ? '#ffd60a' : '#fff'}" stroke="#d62828" stroke-width="${size * 0.13}"/><text x="${r}" y="${r + size * 0.15}" font-size="${size * 0.42}" font-weight="800" text-anchor="middle" fill="#111" font-family="Arial, sans-serif">${n}</text>`;
}

function signGraphic(item: string, size: number, base: string): string {
  const m = /^sign(-temp)?:([\d.]+?)(?:-(\d+))?$/.exec(item)!;
  const temp = !!m[1];
  const code = m[2];
  if (code === '3.24' && m[3]) return speedSign(m[3], temp, size);
  if (code === '6.18.1')
    return `<rect x="1" y="${size * 0.15}" width="${size - 2}" height="${size * 0.7}" rx="3" fill="#1d6fd6" stroke="#fff" stroke-width="2"/><path d="M${size * 0.22} ${size * 0.6} h${size * 0.36} v${-size * 0.18} l${size * 0.22} ${size * 0.13} l${-size * 0.22} ${size * 0.13} v${-size * 0.08} h${-size * 0.36}z" fill="#fff"/>`;
  const img = `<image href="${base}signs/${code}.svg" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
  return temp ? `<rect width="${size}" height="${size}" rx="4" fill="#ffd60a"/>${img}` : img;
}

const LIGHT = { red: '#ff3b30', yellow: '#ffcc00', green: '#34c759', off: '#3d4148' };

/** Светофор: корпус и три секции; flash — мигающая секция; arrow — доп. секция со стрелкой направо. */
function lightHead(state: string, w: number): string {
  const [main, arrow] = state.split('+');
  const h = w * 2.6;
  const r = w * 0.32;
  const on = (sec: 'red' | 'yellow' | 'green') => main === sec || (main === 'flash-yellow' && sec === 'yellow') || (main === 'flash-red' && sec === 'red');
  const flash = main.startsWith('flash');
  let s = `<rect x="0" y="0" width="${w}" height="${h}" rx="${w * 0.25}" fill="#1f2328"/>`;
  (['red', 'yellow', 'green'] as const).forEach((sec, i) => {
    const cy = h * (0.19 + i * 0.31);
    s += `<circle cx="${w / 2}" cy="${cy}" r="${r}" fill="${on(sec) ? LIGHT[sec] : LIGHT.off}" ${on(sec) && flash ? 'class="sc-blink"' : ''}/>`;
    if (on(sec)) s += `<circle cx="${w / 2}" cy="${cy}" r="${r * 1.6}" fill="${LIGHT[sec]}" opacity=".25" ${flash ? 'class="sc-blink"' : ''}/>`;
  });
  if (arrow) {
    const ax = w * 1.08;
    const cy = h * 0.81;
    s += `<rect x="${ax}" y="${h * 0.62}" width="${w}" height="${w}" rx="${w * 0.25}" fill="#1f2328"/><circle cx="${ax + w / 2}" cy="${cy}" r="${r}" fill="#0b0d10"/>`;
    s += `<path d="M${ax + w * 0.26} ${cy} h${w * 0.32} M${ax + w * 0.5} ${cy - w * 0.16} l${w * 0.16} ${w * 0.16} l${-w * 0.16} ${w * 0.16}" stroke="${LIGHT.green}" stroke-width="${w * 0.1}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}

/** Регулировщик спереди: up — жезл вверх, side — руки в стороны, wave — машет жезлом, chest — лицом. */
function regulatorFigure(g: string, w: number): string {
  const k = w / 40;
  const arm = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1 * k}" y1="${y1 * k}" x2="${x2 * k}" y2="${y2 * k}" stroke="#1e3a8a" stroke-width="${5 * k}" stroke-linecap="round"/>`;
  const baton = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1 * k}" y1="${y1 * k}" x2="${x2 * k}" y2="${y2 * k}" stroke="#fff" stroke-width="${3.4 * k}" stroke-linecap="round"/><line x1="${x1 * k}" y1="${y1 * k}" x2="${x2 * k}" y2="${y2 * k}" stroke="#e63946" stroke-width="${3.4 * k}" stroke-dasharray="${3 * k} ${3 * k}" stroke-linecap="round"/>`;
  let s = `<circle cx="${20 * k}" cy="${8 * k}" r="${5.5 * k}" fill="#f1c9a5"/><rect x="${14 * k}" y="${1.5 * k}" width="${12 * k}" height="${4 * k}" rx="${1.5 * k}" fill="#1e3a8a"/>`;
  s += `<rect x="${13.5 * k}" y="${14 * k}" width="${13 * k}" height="${20 * k}" rx="${3 * k}" fill="#1e3a8a"/><rect x="${14.5 * k}" y="${17 * k}" width="${11 * k}" height="${7 * k}" fill="#d9f99d" opacity=".9"/>`;
  s += `<line x1="${17 * k}" y1="${34 * k}" x2="${16 * k}" y2="${48 * k}" stroke="#111827" stroke-width="${5 * k}" stroke-linecap="round"/><line x1="${23 * k}" y1="${34 * k}" x2="${24 * k}" y2="${48 * k}" stroke="#111827" stroke-width="${5 * k}" stroke-linecap="round"/>`;
  if (g === 'up') s += arm(24, 16, 30, 4) + baton(30, 4, 31, -8) + arm(16, 16, 12, 30);
  else if (g === 'side') {
    // Боком к нам: руки вытянуты к нам и от нас — видна только ближняя кисть у плеча.
    s = `<circle cx="${20 * k}" cy="${8 * k}" r="${5.5 * k}" fill="#f1c9a5"/><rect x="${15 * k}" y="${1.5 * k}" width="${12 * k}" height="${4 * k}" rx="${1.5 * k}" fill="#1e3a8a"/>`;
    s += `<rect x="${16.5 * k}" y="${14 * k}" width="${8 * k}" height="${20 * k}" rx="${3 * k}" fill="#1e3a8a"/><rect x="${17.5 * k}" y="${17 * k}" width="${6 * k}" height="${7 * k}" fill="#d9f99d" opacity=".9"/>`;
    s += `<line x1="${20 * k}" y1="${34 * k}" x2="${20 * k}" y2="${48 * k}" stroke="#111827" stroke-width="${5 * k}" stroke-linecap="round"/>`;
    s += `<circle cx="${20 * k}" cy="${18 * k}" r="${4.5 * k}" fill="#f1c9a5" stroke="#1e3a8a" stroke-width="${2 * k}"/>`;
  }
  else if (g === 'wave') s += arm(25, 17, 36, 10) + baton(36, 10, 42, 2) + arm(15, 17, 9, 30) + `<path d="M${40 * k} ${-2 * k} q${6 * k} ${4 * k} ${4 * k} ${11 * k}" stroke="#fff" stroke-width="${1.6 * k}" fill="none"/>`;
  else s += arm(25, 17, 31, 30) + baton(31, 30, 33, 38) + arm(15, 17, 9, 30);
  return s;
}

/** Крупные карточки знаков и сигналов слева вверху. */
function callouts(ctx: Ctx): string {
  const cards: { svg: string; w: number }[] = [];
  for (const item of ctx.scene.items) {
    if (SIGN_ITEM.test(item)) cards.push({ w: 52, svg: `<rect x="-4" y="-4" width="52" height="52" rx="10" fill="#fff" opacity=".92"/>${signGraphic(item, 44, ctx.base)}` });
    else if (LIGHT_ITEM.test(item)) {
      const w = item.includes('+') ? 60 : 36;
      cards.push({ w, svg: `<rect x="-6" y="-4" width="${w}" height="72" rx="10" fill="#fff" opacity=".92"/><g transform="translate(0 2)">${lightHead(item.slice(6), 24)}</g>` });
    } else if (REGULATOR_ITEM.test(item)) cards.push({ w: 56, svg: `<rect x="-4" y="-8" width="56" height="64" rx="10" fill="#fff" opacity=".92"/><g transform="translate(2 2)">${regulatorFigure(item.slice(10), 40)}</g>` });
  }
  let x = 10;
  return cards
    .map((c) => {
      const out = `<g transform="translate(${x} 12)">${c.svg}</g>`;
      x += c.w + 10;
      return out;
    })
    .join('');
}

/** Знак на стойке у правого края дороги. */
function signPost(item: string, x: number, y: number, base: string): string {
  return `<g transform="translate(${x} ${y})"><rect x="-1.5" y="0" width="3" height="16" fill="#6c757d"/><g transform="translate(-11 -22)">${signGraphic(item, 22, base)}</g></g>`;
}

// ─── Предметы ───────────────────────────────────────────────────────────────────

function items(ctx: Ctx): { under: string; over: string } {
  const { road: r, px, py, has, layout } = ctx;
  const our = r.our[0];
  const onc = r.onc[0];
  let s = '';
  let over = '';
  // Знаки на стойках.
  const signs = ctx.scene.items.filter((i) => SIGN_ITEM.test(i));
  signs.forEach((item, i) => {
    const y = layout === 'cross' ? 220 + i * 26 : layout === 'ring' ? 190 + i * 30 : 150 - i * 50;
    s += signPost(item, r.right + 14, y, ctx.base);
  });
  // Светофор и регулировщик на перекрёстке.
  for (const item of ctx.scene.items) {
    if (LIGHT_ITEM.test(item)) s += `<g transform="translate(${r.right + 6} 186)">${lightHead(item.slice(6), 10)}</g>`;
    if (REGULATOR_ITEM.test(item)) s += person(180, 120, item.endsWith('side') ? 90 : 0, { uniform: true }) + `<line x1="184" y1="114" x2="${item.endsWith('up') ? 186 : 196}" y2="${item.endsWith('up') ? 102 : 108}" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (has('car-behind')) s += vehicle(our, py + 62, 0, { color: C.cars[1] });
  if (has('car-ahead-brake')) s += vehicle(our, py - 92, 0, { color: C.cars[2], brake: true });
  if (has('car-ahead-close')) {
    s += vehicle(our, py - 56, 0, { color: C.cars[3] });
    over += `<g><line x1="${our + 22}" y1="${py - 33}" x2="${our + 22}" y2="${py - 22}" stroke="#ff4d4f" stroke-width="2"/><text x="${our + 26}" y="${py - 24}" font-size="13" font-weight="800" fill="#ff4d4f">&lt; 2 с</text></g>`;
  }
  if (has('oncoming-car') || has('oncoming-highbeam')) s += vehicle(onc, 60, 180, { color: C.cars[4] });
  if (has('car-left-close')) s += vehicle(layout === 'exit' ? 90 : 96, layout === 'exit' ? 125 : 150, 90, { color: C.cars[0] });
  if (has('car-on-road')) s += vehicle(60, 125, 90, { color: C.cars[5] });
  if (has('pedestrian-sidewalk')) s += person(140, 163, 90, { color: '#8338ec' });
  if (has('yard-exit-right-car')) s += `<rect x="${r.right}" y="96" width="60" height="44" fill="${C.asphaltDark}"/>` + vehicle(r.right + 12, 118, -90, { color: C.cars[1] });
  if (has('bus-stop')) s += `<rect x="${r.right + 4}" y="58" width="18" height="44" rx="3" fill="#2b2d42" opacity=".85"/><rect x="${r.right + 6}" y="60" width="14" height="40" rx="2" fill="#a5d8ff" opacity=".5"/>`;
  if (has('bus-leaving')) s += vehicle(our + 6, 92, -6, { kind: 'bus', color: '#3a86ff', blink: 'l' });
  if (has('bus-hazard')) s += vehicle(our + 8, 96, 0, { kind: 'bus', color: '#ffb703', hazard: true }) + person(r.right + 14, 60, 0, { color: '#2a9d8f', child: true });
  if (has('car-right-turning-right')) s += vehicle(300, 90, -90, { color: C.cars[3], blink: 'r' });
  if (has('car-right-waiting')) s += vehicle(r.right + 34, 90, -90, { color: C.cars[2] });
  if (has('car-stuck-in-crossroad')) s += vehicle(150, 120, -80, { color: C.cars[6] });
  if (has('parked-car-own-side')) s += vehicle(our, 118, 0, { color: C.cars[5] });
  if (has('parked-car-oncoming-side')) s += vehicle(onc, 140, 180, { color: C.cars[5] });
  if (has('dense-traffic')) {
    if (layout === 'exit') for (const [x, i] of [[40, 0], [110, 1], [250, 2], [320, 3]]) s += vehicle(x, 125, 90, { color: C.cars[i] }) + vehicle(x + 30, 75, -90, { color: C.cars[i + 2] });
    else {
      s += vehicle(r.our[0], py - 70, 0, { color: C.cars[0] }) + vehicle(r.our[1], py - 30, 0, { color: C.cars[2] }) + vehicle(r.our[1], py + 50, 0, { color: C.cars[3] }) + vehicle(r.our[0], py - 150, 0, { color: C.cars[1] });
      s += vehicle(r.onc[0], 40, 180, { color: C.cars[4] }) + vehicle(r.onc[1], 120, 180, { color: C.cars[5] });
    }
  }
  if (has('spray-ahead')) s += `<ellipse cx="${our}" cy="${py - 60}" rx="26" ry="30" fill="#e6edf3" opacity=".7"/>` + vehicle(our, py - 100, 0, { color: C.cars[1] }) + `<ellipse cx="${our}" cy="${py - 66}" rx="18" ry="22" fill="#fff" opacity=".6"/>`;
  if (has('speed-bump')) for (let x = r.left; x < r.right; x += 16) s += `<rect x="${x}" y="140" width="8" height="12" fill="${(x / 16) % 2 ? '#fff' : C.yellow}"/>`;
  if (has('roadworks')) {
    for (let i = 0; i < 5; i++) s += `<path d="M${r.right - 8 - i * 6} ${70 + i * 20} l6 -12 l6 12z" fill="#ff7b00" stroke="#fff" stroke-width="1.5"/>`;
    s += `<rect x="${r.right - 40}" y="30" width="36" height="8" fill="#ff7b00"/><rect x="${r.right - 36}" y="30" width="6" height="8" fill="#fff"/><rect x="${r.right - 24}" y="30" width="6" height="8" fill="#fff"/>`;
  }
  if (has('ambulance-behind')) {
    s += vehicle(our, py + 64, 0, { kind: 'ambulance' });
    over += `<g class="sc-blink" fill="none" stroke="#2f6bff" stroke-width="2.5" opacity=".8"><path d="M${our - 22} ${py + 36} q-8 6 0 12"/><path d="M${our + 22} ${py + 36} q8 6 0 12"/></g>`;
  }
  if (has('car-blindspot-left')) {
    over += `<path d="M${px - 12} ${py + 10} L${r.our[1] - 30} ${py + 90} L${r.our[1] + 22} ${py + 90} Z" fill="#ff4d4f" opacity=".18"/>`;
    s += vehicle(r.our[1], py + 54, 0, { color: C.cars[1] });
  }
  if (has('motorcycle-blindspot')) {
    over += `<path d="M${px - 12} ${py + 10} L${onc - 26} ${py + 80} L${onc + 20} ${py + 80} Z" fill="#ff4d4f" opacity=".18"/>`;
    s += vehicle(onc + 6, py + 46, -4, { kind: 'moto' });
  }
  if (has('car-hazard-ahead')) s += vehicle(our, py - 110, 0, { color: C.cars[6], hazard: true });
  if (has('loud-car')) {
    s += vehicle(r.our[1], py, 0, { color: '#6a4c93' });
    over += `<text x="${r.our[1] - 34}" y="${py - 14}" font-size="16" fill="#ffd166">♪</text><text x="${r.our[1] - 30}" y="${py + 12}" font-size="13" fill="#ffd166">♫</text>`;
  }
  if (has('one-way-oncoming')) s += vehicle(onc, 110, 180, { color: C.cars[0], brake: false });
  if (has('overtaking-car')) s += vehicle(onc, py - 26, -3, { color: C.cars[0], blink: 'r' });
  if (has('accident-ahead')) {
    s += vehicle(our - 4, 96, 24, { color: C.cars[0], hazard: true }) + vehicle(our + 8, 52, -30, { color: C.cars[1], hazard: true });
    s += `<path d="M${our} 150 l8 -14 l8 14z" fill="none" stroke="#e63946" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${our - 20 + i * 8}" y="${120 + (i % 3) * 5}" width="3" height="3" fill="#cfd4da"/>`;
  }
  if (has('people-on-road')) s += person(our - 26, 116, 20, { color: '#e9c46a' }) + person(our + 26, 128, -40, { color: '#3a86ff' }) + person(onc + 4, 86, 70, { color: '#fb5607' });
  if (has('pothole') || has('puddle')) {
    const col = has('puddle') ? '#5d7f9e' : '#1f2226';
    s += `<path d="M${our - 20} 130 q-6 -14 10 -18 q14 -6 26 2 q12 8 4 18 q-10 12 -26 8 q-12 -2 -14 -10z" fill="${col}" opacity="${has('puddle') ? 0.85 : 1}"/>`;
    if (has('puddle')) s += `<path d="M${our - 8} 122 q8 -4 16 0" stroke="#cfe2f3" stroke-width="2" fill="none"/>`;
  }
  if (has('pedestrian-shoulder')) s += person(r.right + 6, 120, 180, { color: '#e76f51' }) + person(r.right + 6, 96, 180, { color: '#2a9d8f' });
  // Пешеход в тёмной одежде ночью: еле виден в свете фар.
  if (has('pedestrian-dark')) over += `<g opacity=".8">${person(r.right - 10, 110, 90, { dark: true })}</g><ellipse cx="${r.right - 10}" cy="110" rx="11" ry="7" fill="none" stroke="#fff3b0" stroke-width="1" opacity=".35"/>`;
  if (has('parked-cars')) for (const y of [40, 100, 160]) s += vehicle(r.right - 14, y, 0, { color: C.cars[(y / 60) | 0], door: has('door-opening') && y === 100 });
  if (has('child-runout')) {
    s += person(r.right - 34, 130, -90, { color: '#ff006e' });
    over += `<path d="M${r.right - 20} 122 h12 M${r.right - 20} 130 h16 M${r.right - 20} 138 h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (has('cyclist-right')) s += vehicle(r.right - 10, py + 6, 0, { kind: 'bike' });
  if (has('cyclist-lane')) s += vehicle(our, 120, 0, { kind: 'bike' });
  if (has('animal')) s += dog(our - 10, 116);
  if (has('car-on-ring')) s += vehicle(180 - 61 * Math.SQRT1_2, 105 + 61 * Math.SQRT1_2, 135, { color: C.cars[2] });
  if (has('child-behind-car')) s += person(180, 214, 0, { child: true, color: '#ff006e' });
  if (layout === 'parking') {
    s += vehicle(90, 112, 0, { color: C.cars[1] }) + vehicle(270, 112, 0, { color: C.cars[3] }) + vehicle(330, 112, 0, { color: C.cars[5] }) + vehicle(30, 112, 0, { color: C.cars[2] });
    over += `<path d="M180 168 v26 m-8 -8 l8 8 l8 -8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`;
  }
  return { under: s, over };
}

// ─── Погода и ночь ──────────────────────────────────────────────────────────────

function weather(ctx: Ctx): string {
  const w = ctx.scene.weather;
  let s = '';
  if (w === 'ice' && ctx.has('curve')) s += `<path d="${curvePath(ctx)}" stroke="#cfe8ff" stroke-width="${ctx.road.right - ctx.road.left}" fill="none" opacity=".28"/>`;
  else if (w === 'ice') s += `<rect x="${ctx.road.left}" y="0" width="${ctx.road.right - ctx.road.left}" height="${SCENE_H}" fill="#cfe8ff" opacity=".28"/>` + [40, 120, 210].map((y) => `<path d="M${ctx.road.left + 20} ${y} l40 10 M${ctx.road.right - 70} ${y + 30} l36 8" stroke="#fff" stroke-width="2" opacity=".6"/>`).join('');
  if (w === 'rain') {
    const dense = ctx.has('heavy-rain') ? 90 : 46;
    let drops = '';
    for (let i = 0; i < dense; i++) {
      const x = (i * 73) % SCENE_W;
      const y = (i * 131) % (SCENE_H + 40);
      drops += `<line x1="${x}" y1="${y - 40}" x2="${x - 4}" y2="${y - 26}"/>`;
    }
    s += `<g class="sc-rain" stroke="#dbe7f3" stroke-width="1.4" opacity=".7">${drops}</g>`;
    if (ctx.has('heavy-rain')) s += `<rect width="${SCENE_W}" height="${SCENE_H}" fill="#9fb3c8" opacity=".35"/>`;
  }
  if (w === 'snow') {
    let flakes = '';
    for (let i = 0; i < 70; i++) flakes += `<circle cx="${(i * 67) % SCENE_W}" cy="${((i * 113) % (SCENE_H + 40)) - 40}" r="${1.5 + (i % 3)}"/>`;
    s += `<rect width="${SCENE_W}" height="${SCENE_H}" fill="#fff" opacity=".25"/><g class="sc-snow" fill="#fff" opacity=".9">${flakes}</g>`;
  }
  if (w === 'fog') s += `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#fog)"/>`;
  return s;
}

function night(ctx: Ctx): string {
  const { px, py } = ctx;
  let s = `<rect width="${SCENE_W}" height="${SCENE_H}" fill="#08112a" opacity=".72"/>`;
  // Свет фар игрока: ближний конус.
  s += `<path d="M${px - 9} ${py - 22} L${px - 46} ${py - 150} L${px + 46} ${py - 150} L${px + 9} ${py - 22} Z" fill="url(#beam)"/>`;
  return s;
}

// ─── Сборка ─────────────────────────────────────────────────────────────────────

/** SVG сцены. base — адрес сайта для картинок знаков (import.meta.env.BASE_URL). */
export function sceneSvg(scene: SituationScene, base = '/'): string {
  const has = (i: string) => scene.items.includes(i);
  const layout = layoutFor(scene, has);
  const road = roadFor(scene, has);
  // Вдоль припаркованных машин игрок едет левее, ближе к осевой.
  const px = layout === 'exit' || layout === 'parking' ? (layout === 'parking' ? 180 : 200) : road.our[0] - (has('parked-cars') ? 10 : 0);
  const py = layout === 'exit' ? 225 : layout === 'parking' ? 120 : layout === 'cross' ? 248 : layout === 'ring' ? 258 : 214;
  const ctx: Ctx = { scene, has, layout, road, px, py, base, night: scene.time === 'night' };

  let ground = background(ctx);
  if (layout === 'cross') ground += crossRoads(ctx);
  else if (layout === 'ring') ground += ringRoads(ctx);
  else if (layout === 'exit') ground += exitRoads(ctx);
  else if (layout === 'parking') ground += parkingLot();
  else if (has('curve')) ground += curveRoad(ctx);
  else ground += verticalRoad(ctx, 0, SCENE_H);
  if (has('bridge')) ground += `<rect x="${road.left - 8}" y="0" width="6" height="${SCENE_H}" fill="#adb5bd"/><rect x="${road.right + 2}" y="0" width="6" height="${SCENE_H}" fill="#adb5bd"/>`;
  if (has('hill')) ground += `<rect x="${road.left}" y="0" width="${road.right - road.left}" height="${SCENE_H}" fill="url(#hill)"/><text x="${road.left + 8}" y="${SCENE_H - 12}" font-size="12" font-weight="700" fill="#fff" opacity=".85">▲ подъём</text>`;

  const { under, over } = items(ctx);
  // Машина игрока.
  const blink: CarOpts['blink'] = has('car-blindspot-left') || has('motorcycle-blindspot') ? 'l' : has('player-blinker') ? 'r' : undefined;
  const rot = has('car-blindspot-left') ? -10 : has('motorcycle-blindspot') ? -16 : has('skid') ? 28 : 0;
  let player = vehicle(px, py, rot, { kind: 'player', blink, reverse: layout === 'parking', brake: has('car-ahead-brake') || has('child-runout') || has('animal') });
  if (has('skid')) player = `<path d="M${px - 8} ${py + 60} q-4 -30 2 -50 M${px + 8} ${py + 64} q4 -30 -2 -50" stroke="#1b1e22" stroke-width="4" fill="none" opacity=".5"/>` + player;
  if (has('curb')) player = `<rect x="${road.right - 3}" y="0" width="4" height="${SCENE_H}" fill="#fff"/>` + vehicle(road.right - 16, py, -6, { kind: 'player' });

  const defs = `<defs>
    <radialGradient id="glare"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset=".45" stop-color="#fff3b0" stop-opacity=".55"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3b0" stop-opacity=".55"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>
    <radialGradient id="fog" cx="${px / SCENE_W}" cy="${py / SCENE_H}" r=".55"><stop offset=".12" stop-color="#e9edf1" stop-opacity=".15"/><stop offset=".55" stop-color="#e9edf1" stop-opacity=".9"/><stop offset="1" stop-color="#e9edf1" stop-opacity=".97"/></radialGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
  </defs>`;
  const inspector = has('inspector-in-car')
    ? `<g transform="translate(10 ${SCENE_H - 70})"><rect x="-4" y="-4" width="64" height="64" rx="12" fill="#fff" opacity=".92"/><g transform="translate(4 0) scale(.5)"><clipPath id="insp"><rect width="96" height="96" rx="16"/></clipPath><g clip-path="url(#insp)">${portraitSvg('sokolov').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></g><text x="28" y="56" font-size="9" font-weight="700" text-anchor="middle" fill="#1f2328">Инспектор</text></g>`
    : '';
  const dark = ctx.night ? night(ctx) : '';
  // Ночью фары и светящиеся предметы — поверх темноты.
  const lit = ctx.night ? `<g>${has('oncoming-car') || has('oncoming-highbeam') ? `<circle cx="${road.onc[0] - 6}" cy="82" r="5" fill="#fffbe6"/><circle cx="${road.onc[0] + 6}" cy="82" r="5" fill="#fffbe6"/>` : ''}${has('oncoming-highbeam') ? `<circle cx="${road.onc[0]}" cy="84" r="90" fill="url(#glare)"/>` : ''}</g>` : '';
  // Свои id градиентов у каждой сцены: одинаковые id в соседних (или скрытых) SVG браузер путает.
  const uid = `s${++sceneCount}`;
  const svg = (
    `<svg class="sit-scene__svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" font-family="Inter, system-ui, sans-serif">${defs}` +
    ground +
    under +
    player +
    (ctx.night ? '' : over) +
    weather(ctx) +
    dark +
    lit +
    (ctx.night ? over : '') +
    callouts(ctx) +
    inspector +
    `</svg>`
  );
  return svg.replace(/id="(glare|beam|fog|hill|insp)"/g, `id="$1-${uid}"`).replace(/url\(#(glare|beam|fog|hill|insp)\)/g, `url(#$1-${uid})`);
}

let sceneCount = 0;

const curvePath = (ctx: Ctx) => `M${ctx.road.center} ${SCENE_H + 10} L${ctx.road.center} 170 Q${ctx.road.center} 60 ${SCENE_W + 20} 60`;

/** Поворот направо впереди (гололёд перед поворотом). */
function curveRoad(ctx: Ctx): string {
  const r = ctx.road;
  const w = r.right - r.left;
  const path = curvePath(ctx);
  return (
    `<path d="${path}" stroke="${C.shoulder}" stroke-width="${w + 24}" fill="none"/>` +
    `<path d="${path}" stroke="${C.asphalt}" stroke-width="${w}" fill="none"/>` +
    `<path d="${path}" stroke="${C.marking}" stroke-width="3" fill="none" stroke-dasharray="18 14"/>`
  );
}
