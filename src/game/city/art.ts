/**
 * Векторная графика города: транспорт, люди, деревья, здания. Всё рисуется кодом.
 * Транспорт рисуется «носом вверх» с центром в (0, 0).
 */
import * as Phaser from 'phaser';
import type { VehicleKind } from '../../world/templates.ts';

export const COLORS = {
  grass: 0x5b9a4f,
  grassDark: 0x4a8741,
  field: 0x8fb35a,
  fieldDark: 0x7ea24c,
  sidewalk: 0xb7bec8,
  curb: 0xdde1e7,
  asphalt: 0x40454e,
  asphaltDark: 0x363a42,
  marking: 0xeef0f2,
  markingYellow: 0xf2c200,
  tree: 0x2f6f3a,
  treeLight: 0x43914e,
  glass: 0x1d3557,
  headlight: 0xfff3b0,
  taillight: 0xe63946,
  player: 0xffb703,
  playerRoof: 0xffd166,
  parcel: 0xc77d3a,
  shadow: 0x000000,
  rail: 0x8a8f99,
  sleeper: 0x6b4f3a,
};

export const CAR_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x8d99ae, 0x6a4c93, 0xf1faee, 0x264653];
export const ROOF_COLORS = [0xc8553d, 0x588b8b, 0xe0a458, 0x8e7dbe, 0x9c6644, 0x6d7b8d, 0xb56576, 0x7f8c8d];
const SHIRTS = [0xe76f51, 0x2a9d8f, 0x264653, 0xe9c46a, 0x8338ec, 0x3a86ff, 0xfb5607, 0x6c757d];

/** Размеры транспорта (ширина × длина) для расстановки в сценах. */
export const VEHICLE_SIZE: Record<VehicleKind | 'player', { w: number; h: number }> = {
  player: { w: 22, h: 40 },
  car: { w: 22, h: 40 },
  police: { w: 22, h: 42 },
  ambulance: { w: 24, h: 46 },
  truck: { w: 26, h: 62 },
  bus: { w: 26, h: 86 },
  tram: { w: 26, h: 100 },
  tractor: { w: 22, h: 34 },
  moto: { w: 10, h: 24 },
  bicycle: { w: 8, h: 22 },
};

function body(g: Phaser.GameObjects.Graphics, w: number, h: number, color: number, radius: number) {
  g.fillStyle(COLORS.shadow, 0.25).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, radius);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
}

function lights(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  g.fillStyle(COLORS.headlight).fillRect(-w / 2 + 2, -h / 2 + 1, 5, 3).fillRect(w / 2 - 7, -h / 2 + 1, 5, 3);
  g.fillStyle(COLORS.taillight).fillRect(-w / 2 + 2, h / 2 - 3, 5, 2).fillRect(w / 2 - 7, h / 2 - 3, 5, 2);
}

/** Легковой автомобиль; вариант курьера — жёлтый, с посылкой на крыше. */
export function drawCar(g: Phaser.GameObjects.Graphics, color: number, courier = false) {
  const { w, h } = VEHICLE_SIZE.car;
  body(g, w, h, color, 7);
  g.fillStyle(COLORS.glass).fillRoundedRect(-w / 2 + 3, -h / 2 + 8, w - 6, 7, 2);
  g.fillStyle(courier ? COLORS.playerRoof : 0xffffff, courier ? 1 : 0.22).fillRoundedRect(-w / 2 + 3, -h / 2 + 16, w - 6, 14, 3);
  if (courier) {
    g.fillStyle(COLORS.parcel).fillRect(-5, -h / 2 + 18, 10, 9);
    g.fillStyle(0x9c5c26).fillRect(-5, -h / 2 + 21.5, 10, 2);
  }
  g.fillStyle(COLORS.glass).fillRoundedRect(-w / 2 + 4, h / 2 - 9, w - 8, 5, 2);
  lights(g, w, h);
}

export type CarSticker = 'none' | 'stripes' | 'flash' | 'star' | 'heart' | 'flames' | 'checker' | 'triangle' | 'diamond' | 'ring' | 'arrow';

/** Машина курьера с покраской и наклейкой из гаража (размер как у легковой). */
export function drawPlayerCar(g: Phaser.GameObjects.Graphics, color: number, sticker: CarSticker) {
  drawCar(g, color, true);
  const { w, h } = VEHICLE_SIZE.car;
  const hood = -h / 2 + 4;
  switch (sticker) {
    case 'stripes':
      g.fillStyle(0xffffff, 0.9).fillRect(-4, -h / 2, 2.5, h).fillRect(1.5, -h / 2, 2.5, h);
      break;
    case 'flash':
      g.fillStyle(0xffd60a).fillTriangle(1, hood - 3, -3, hood + 1.5, 0, hood + 1.5).fillTriangle(0, hood + 0.5, 3, hood + 0.5, -1, hood + 5);
      break;
    case 'star':
      g.fillStyle(0xffffff).fillTriangle(0, hood - 3, -3, hood + 2.5, 3, hood + 2.5).fillTriangle(0, hood + 4, -3, hood - 1, 3, hood - 1);
      break;
    case 'heart':
      g.fillStyle(0xff4d6d).fillCircle(-1.3, hood - 0.5, 1.6).fillCircle(1.3, hood - 0.5, 1.6).fillTriangle(-2.9, hood, 2.9, hood, 0, hood + 3.2);
      break;
    case 'flames':
      g.fillStyle(0xff5400).fillTriangle(-w / 2 + 1, -h / 2 + 2, -w / 2 + 5, -h / 2 + 2, -w / 2 + 2, -h / 2 + 14).fillTriangle(w / 2 - 1, -h / 2 + 2, w / 2 - 5, -h / 2 + 2, w / 2 - 2, -h / 2 + 14);
      g.fillStyle(0xffbd00).fillTriangle(-w / 2 + 1.5, -h / 2 + 2, -w / 2 + 4, -h / 2 + 2, -w / 2 + 2.3, -h / 2 + 9).fillTriangle(w / 2 - 1.5, -h / 2 + 2, w / 2 - 4, -h / 2 + 2, w / 2 - 2.3, -h / 2 + 9);
      break;
    case 'checker':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) g.fillStyle(0x1b1b1b).fillRect(-4 + i * 2, hood - 2 + j * 2, 2, 2);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 1) g.fillStyle(0xffffff).fillRect(-4 + i * 2, hood - 2 + j * 2, 2, 2);
      break;
    // Наклейки за группы знаков в Знакодексе.
    case 'triangle':
      g.fillStyle(0xe63946).fillTriangle(0, hood - 3.5, -4, hood + 3, 4, hood + 3);
      g.fillStyle(0xffffff).fillTriangle(0, hood - 1, -2.2, hood + 2, 2.2, hood + 2);
      break;
    case 'diamond':
      g.fillStyle(0xffffff).fillTriangle(0, hood - 4, -4, hood, 4, hood).fillTriangle(0, hood + 4, -4, hood, 4, hood);
      g.fillStyle(0xffd60a).fillTriangle(0, hood - 2.6, -2.6, hood, 2.6, hood).fillTriangle(0, hood + 2.6, -2.6, hood, 2.6, hood);
      break;
    case 'ring':
      g.fillStyle(0xe63946).fillCircle(0, hood, 3.6);
      g.fillStyle(0xffffff).fillCircle(0, hood, 2.4);
      break;
    case 'arrow':
      g.fillStyle(0x1d6fd6).fillCircle(0, hood, 3.6);
      g.fillStyle(0xffffff).fillTriangle(0, hood - 2.6, -1.9, hood - 0.4, 1.9, hood - 0.4).fillRect(-0.7, hood - 0.6, 1.4, 3);
      break;
    case 'none':
      break;
  }
}

export function drawVehicle(g: Phaser.GameObjects.Graphics, kind: VehicleKind, color?: number) {
  const { w, h } = VEHICLE_SIZE[kind];
  switch (kind) {
    case 'car':
      drawCar(g, color ?? CAR_COLORS[0]);
      break;
    case 'police':
    case 'ambulance': {
      drawCar(g, 0xf8f9fa);
      const stripe = kind === 'police' ? 0x1d4ed8 : 0xd62839;
      g.fillStyle(stripe).fillRect(-w / 2, -2, w, 5);
      break;
    }
    case 'truck':
      body(g, w, h, 0xd9dde3, 4);
      g.fillStyle(color ?? 0x3a6ea5).fillRoundedRect(-w / 2, -h / 2, w, 18, 5);
      g.fillStyle(COLORS.glass).fillRect(-w / 2 + 3, -h / 2 + 4, w - 6, 5);
      g.lineStyle(1, 0x000000, 0.15).strokeRect(-w / 2 + 1, -h / 2 + 21, w - 2, h - 23);
      lights(g, w, h);
      break;
    case 'bus':
      body(g, w, h, color ?? 0x7cc043, 6);
      g.fillStyle(0xffffff, 0.85).fillRect(-w / 2 + 3, -h / 2 + 10, w - 6, h - 18);
      g.fillStyle(color ?? 0x7cc043).fillRect(-w / 2 + 6, -h / 2 + 14, w - 12, h - 26);
      g.fillStyle(COLORS.glass).fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 5);
      lights(g, w, h);
      break;
    case 'tram':
      body(g, w, h, color ?? 0xef6c33, 8);
      g.fillStyle(0xf8f9fa).fillRect(-w / 2 + 3, -h / 2 + 12, w - 6, h - 24);
      g.fillStyle(0x333333).fillRect(-1.5, -h / 2 + 30, 3, 26);
      g.fillStyle(COLORS.glass).fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 6).fillRect(-w / 2 + 4, h / 2 - 9, w - 8, 6);
      break;
    case 'tractor':
      body(g, w, h, color ?? 0x2d6a4f, 4);
      g.fillStyle(0x1b1b1b).fillRect(-w / 2 - 3, h / 2 - 16, 5, 14).fillRect(w / 2 - 2, h / 2 - 16, 5, 14);
      g.fillStyle(0x1b1b1b).fillRect(-w / 2 - 1, -h / 2 + 3, 3, 8).fillRect(w / 2 - 2, -h / 2 + 3, 3, 8);
      g.fillStyle(COLORS.glass).fillRect(-w / 2 + 4, 0, w - 8, 8);
      break;
    case 'moto':
    case 'bicycle': {
      g.fillStyle(COLORS.shadow, 0.25).fillEllipse(3, 4, w + 2, h);
      g.fillStyle(0x1b1b1b).fillRect(-1.5, -h / 2, 3, h);
      g.fillStyle(kind === 'moto' ? (color ?? 0xb5179e) : (color ?? 0x2a9d8f)).fillEllipse(0, 1, w, h * 0.55);
      g.fillStyle(kind === 'moto' ? 0xf8f9fa : 0xe9c46a).fillCircle(0, 0, 4.5);
      if (kind === 'moto') g.fillStyle(COLORS.headlight).fillCircle(0, -h / 2 + 1, 2);
      break;
    }
  }
}

/** Пешеход сверху: плечи и голова. */
export function drawPedestrian(g: Phaser.GameObjects.Graphics, seed: number) {
  g.fillStyle(COLORS.shadow, 0.2).fillEllipse(2, 3, 16, 10);
  g.fillStyle(SHIRTS[seed % SHIRTS.length]).fillEllipse(0, 0, 15, 9);
  g.fillStyle(seed % 3 === 0 ? 0x3d2b1f : seed % 3 === 1 ? 0xe0b27a : 0x1b1b1b).fillCircle(0, 0, 4.5);
}

/** Регулировщик: форма, белая фуражка, жезл. */
export function drawController(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(COLORS.shadow, 0.25).fillEllipse(2, 3, 20, 12);
  g.fillStyle(0x1d3557).fillEllipse(0, 0, 19, 10);
  g.fillStyle(0xf8f9fa).fillCircle(0, 0, 5.5);
  g.fillStyle(0x1b1b1b).fillCircle(0, 0, 2);
  g.fillStyle(0xf8f9fa).fillRect(9, -1.5, 12, 3);
  g.fillStyle(0xe63946).fillRect(12, -1.5, 2, 3).fillRect(17, -1.5, 2, 3);
}

export function drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.fillStyle(COLORS.shadow, 0.18).fillCircle(x + r * 0.35, y + r * 0.35, r);
  g.fillStyle(COLORS.tree).fillCircle(x, y, r);
  g.fillStyle(COLORS.treeLight).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55);
}

export function drawBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(COLORS.shadow, 0.22).fillRect(x + 6, y + 6, w, h);
  g.fillStyle(color).fillRect(x, y, w, h);
  g.lineStyle(2, 0x000000, 0.14).strokeRect(x + 5, y + 5, w - 10, h - 10);
  g.fillStyle(0xffffff, 0.12).fillRect(x, y, w, 5);
  // Надстройки на крыше.
  g.fillStyle(0x000000, 0.12).fillRect(x + w * 0.2, y + h * 0.3, Math.min(14, w * 0.2), Math.min(10, h * 0.2));
}

export { seeded } from '../../world/random.ts';
