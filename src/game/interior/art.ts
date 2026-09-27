/**
 * Графика мини-игр: люди «лицом к нам», машины сбоку и сверху, предметы.
 * Всё рисуется кодом, как и город.
 */
import type * as Phaser from 'phaser';
import { COLORS, drawCar, drawVehicle } from '../city/art.ts';

type G = Phaser.GameObjects.Graphics;

export const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac];

export interface FigureStyle {
  shirt: number;
  pants?: number;
  skin?: number;
  hair?: number;
  /** Фуражка инспектора, кепка механика или без головного убора. */
  cap?: 'police' | 'mechanic';
  /** Жилет со светоотражающими полосами. */
  vest?: boolean;
}

/** Человек в полный рост лицом к нам; (0, 0) — середина туловища. Рост около 100. */
export function drawFigure(g: G, s: FigureStyle) {
  const skin = s.skin ?? SKIN[0];
  g.fillStyle(0x000000, 0.18).fillEllipse(3, 52, 44, 10);
  g.fillStyle(s.pants ?? 0x2b2d42).fillRoundedRect(-11, 16, 9, 34, 3).fillRoundedRect(2, 16, 9, 34, 3);
  g.fillStyle(0x1b1b1b).fillRoundedRect(-13, 46, 12, 6, 2).fillRoundedRect(1, 46, 12, 6, 2);
  g.fillStyle(s.shirt).fillRoundedRect(-16, -18, 32, 38, 8);
  g.fillStyle(s.shirt).fillRoundedRect(-23, -15, 8, 30, 4).fillRoundedRect(15, -15, 8, 30, 4);
  g.fillStyle(skin).fillCircle(-19, 17, 4).fillCircle(19, 17, 4);
  if (s.vest) {
    g.fillStyle(0xd9f23a).fillRoundedRect(-16, -18, 32, 34, 6);
    g.fillStyle(0xe8ecef).fillRect(-16, -2, 32, 3).fillRect(-16, 6, 32, 3);
  }
  g.fillStyle(skin).fillRect(-4, -24, 8, 7);
  g.fillStyle(skin).fillCircle(0, -34, 13);
  g.fillStyle(0x1b1b1b).fillCircle(-5, -35, 1.8).fillCircle(5, -35, 1.8);
  g.lineStyle(2, 0x7a3e2b).beginPath().arc(0, -31, 5, 0.3, Math.PI - 0.3).strokePath();
  if (s.cap === 'police') {
    g.fillStyle(0x2e4a2e).fillRoundedRect(-15, -52, 30, 11, 4);
    g.fillStyle(0x1b1b1b).fillRoundedRect(-16, -43, 32, 5, 2);
    g.fillStyle(0xe63946).fillRect(-15, -44, 30, 2);
    g.fillStyle(0xf4c20d).fillCircle(0, -47, 3);
  } else if (s.cap === 'mechanic') {
    g.fillStyle(0x1d4ed8).fillRoundedRect(-14, -50, 28, 10, 5);
    g.fillStyle(0x1d4ed8).fillRoundedRect(-2, -43, 20, 4, 2);
  } else {
    g.fillStyle(s.hair ?? 0x3d2b1f).fillRoundedRect(-13, -49, 26, 11, 6);
  }
}

/** Легковой автомобиль сбоку, нос вправо; (0, 0) — середина днища. Длина около 170. */
export function drawCarSide(g: G, color: number, police = false) {
  g.fillStyle(0x000000, 0.2).fillEllipse(0, 6, 180, 14);
  g.fillStyle(color).fillRoundedRect(-86, -40, 172, 36, 12);
  g.fillStyle(color).fillPoints(
    [
      { x: -52, y: -38 },
      { x: -32, y: -70 },
      { x: 34, y: -70 },
      { x: 58, y: -38 },
    ],
    true,
  );
  g.fillStyle(COLORS.glass).fillPoints(
    [
      { x: -44, y: -40 },
      { x: -28, y: -64 },
      { x: -2, y: -64 },
      { x: -2, y: -40 },
    ],
    true,
  );
  g.fillStyle(COLORS.glass).fillPoints(
    [
      { x: 4, y: -40 },
      { x: 4, y: -64 },
      { x: 30, y: -64 },
      { x: 48, y: -40 },
    ],
    true,
  );
  g.fillStyle(0x000000, 0.18).fillRect(1, -40, 2, 34);
  g.fillStyle(COLORS.headlight).fillRoundedRect(76, -32, 10, 8, 3);
  g.fillStyle(COLORS.taillight).fillRoundedRect(-86, -32, 8, 8, 3);
  if (police) {
    g.fillStyle(0x1d4ed8).fillRect(-86, -24, 172, 7);
    g.fillStyle(0x1b1b1b).fillRoundedRect(-18, -80, 36, 9, 3);
  }
  for (const x of [-52, 52]) {
    g.fillStyle(0x1b1b1b).fillCircle(x, -4, 17);
    g.fillStyle(0xb7bec8).fillCircle(x, -4, 8);
  }
}

/** Мигалка на крыше полицейской машины сбоку (меняется каждые 0,2 с). */
export function drawBeacon(g: G, phase: number) {
  g.clear();
  g.fillStyle(phase ? 0xff2d2d : 0x2d6bff).fillRoundedRect(-17, -80, 16, 8, 3);
  g.fillStyle(phase ? 0x2d6bff : 0xff2d2d).fillRoundedRect(1, -80, 16, 8, 3);
}

/** Машина сверху в крупном масштабе (для гаража и места ДТП). */
export function drawCarTop(g: G, color: number, kind: 'car' | 'ambulance' = 'car') {
  if (kind === 'car') drawCar(g, color, true);
  else drawVehicle(g, 'ambulance');
}

/** Пострадавший лежит на траве (вид сверху), голова влево. */
export function drawVictim(g: G) {
  g.fillStyle(0x000000, 0.15).fillEllipse(4, 4, 96, 34);
  g.fillStyle(0x3a86ff).fillRoundedRect(-30, -14, 50, 28, 10);
  g.fillStyle(0x2b2d42).fillRoundedRect(18, -13, 34, 11, 5).fillRoundedRect(18, 2, 34, 11, 5);
  g.fillStyle(0x3a86ff).fillRoundedRect(-24, -26, 30, 10, 5).fillRoundedRect(-24, 16, 30, 10, 5);
  g.fillStyle(SKIN[1]).fillCircle(-40, 0, 12);
  g.fillStyle(0x3d2b1f).fillCircle(-44, 0, 9);
}

/** Аптечка: красный чемоданчик с белым крестом; открытая — с бинтами внутри. */
export function drawKit(g: G, open: boolean) {
  g.clear();
  g.fillStyle(0x000000, 0.2).fillRoundedRect(-22, -12, 48, 34, 6);
  g.fillStyle(0xd62839).fillRoundedRect(-24, -16, 48, 34, 6);
  if (open) {
    g.fillStyle(0xf8f9fa).fillRoundedRect(-19, -11, 38, 24, 4);
    g.fillStyle(0xe9ecef).fillCircle(-9, 1, 6).fillCircle(4, 1, 6);
    g.fillStyle(0xd62839).fillRect(12, -7, 5, 14);
  } else {
    g.fillStyle(0xffffff).fillRect(-4, -11, 8, 24).fillRect(-12, -3, 24, 8);
    g.fillStyle(0x9d1c2a).fillRoundedRect(-8, -21, 16, 6, 2);
  }
}

/** Знак аварийной остановки. */
export function drawTriangle(g: G) {
  g.fillStyle(0xd62839).fillTriangle(0, -16, 15, 11, -15, 11);
  g.fillStyle(0xffffff).fillTriangle(0, -8, 8, 6, -8, 6);
}

/** Значок у точки касания: документы, алкотестер, телефон, ремень, треугольник. */
export function drawIcon(g: G, icon: 'doc' | 'breath' | 'phone' | 'belt' | 'triangle' | 'kit' | 'wrench') {
  switch (icon) {
    case 'doc':
      g.fillStyle(0xf8f9fa).fillRoundedRect(-16, -11, 32, 22, 3);
      g.fillStyle(0xe63946).fillRect(-16, -11, 32, 5);
      g.fillStyle(0x6c757d).fillRect(-11, -1, 12, 2).fillRect(-11, 4, 18, 2);
      g.fillStyle(0x3a86ff).fillRect(5, -3, 7, 8);
      break;
    case 'breath':
      g.fillStyle(0x264653).fillRoundedRect(-9, -16, 18, 32, 5);
      g.fillStyle(0x9be15d).fillRect(-6, -10, 12, 7);
      g.fillStyle(0xe9ecef).fillRect(-2, -24, 4, 9);
      break;
    case 'phone':
      g.fillStyle(0x1b1b1b).fillRoundedRect(-10, -17, 20, 34, 4);
      g.fillStyle(0x3a86ff).fillRect(-7, -12, 14, 22);
      break;
    case 'belt':
      g.lineStyle(6, 0x4a4e57).lineBetween(-14, -14, 14, 14);
      g.fillStyle(0xb7bec8).fillRoundedRect(4, 4, 12, 9, 2);
      break;
    case 'triangle':
      drawTriangle(g);
      break;
    case 'kit':
      drawKit(g, false);
      break;
    case 'wrench':
      g.lineStyle(6, 0xd62839).lineBetween(-12, 12, 8, -8);
      g.fillStyle(0xd62839).fillCircle(10, -10, 7);
      g.fillStyle(0xffffff).fillCircle(13, -13, 3);
      break;
  }
}
