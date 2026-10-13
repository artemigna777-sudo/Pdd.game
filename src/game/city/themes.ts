/**
 * Темы города из магазина (этап 17): палитра карты и улицы в меню и лёгкий эффект поверх
 * города — снег, листопад, неоновая виньетка или крупные пиксели. Только внешний вид.
 *
 * Тема применяется при создании сцены: карта «запекается» в текстуры с цветами `COLORS`,
 * поэтому `applyCityTheme` меняет их до отрисовки.
 */
import * as Phaser from 'phaser';
import { COLORS, ROOF_COLORS } from './art.ts';

type Palette = Partial<Record<keyof typeof COLORS, number>>;

interface ThemeLook {
  palette: Palette;
  roofs: number[];
  fx?: 'snow' | 'leaves' | 'neon' | 'pixel';
}

const BASE: Record<string, number> = { ...COLORS };
const BASE_ROOFS = [...ROOF_COLORS];

export const THEME_LOOKS: Record<string, ThemeLook> = {
  winter: {
    palette: {
      grass: 0xe6eff6,
      grassDark: 0xd3e1ec,
      field: 0xf0f5f9,
      fieldDark: 0xdde8f0,
      sidewalk: 0xcbd5e1,
      curb: 0xffffff,
      asphalt: 0x575e6c,
      asphaltDark: 0x4a505d,
      tree: 0x2b5a4c,
      treeLight: 0xdfeef0,
    },
    roofs: [0xf4f7fb, 0xe6edf5, 0xd9e3ee, 0xc9d6e4, 0xeef3f8, 0xb9c8d8, 0xdce6f0, 0xf9fbfd],
    fx: 'snow',
  },
  autumn: {
    palette: { grass: 0xa58a3d, grassDark: 0x927834, field: 0xc8a24c, fieldDark: 0xb18e3f, tree: 0xc0532a, treeLight: 0xe8a33a },
    roofs: [0x9c4a2f, 0xb5651d, 0x7f4f24, 0xc97b3a, 0x8a3b2b, 0x6f5843, 0xa8553a, 0x93714d],
    fx: 'leaves',
  },
  toy: {
    palette: {
      grass: 0x8fe08f,
      grassDark: 0x7dd47d,
      field: 0xb6ec90,
      fieldDark: 0xa4e07c,
      sidewalk: 0xffd1dc,
      curb: 0xffffff,
      asphalt: 0x7d84b2,
      asphaltDark: 0x6d739e,
      marking: 0xfffbe6,
      markingYellow: 0xffd166,
      tree: 0x2ec4b6,
      treeLight: 0x7ae7c7,
    },
    roofs: [0xff8fab, 0x9bf6ff, 0xffd166, 0xcdb4db, 0xa0c4ff, 0xffadad, 0xcaffbf, 0xfdffb6],
  },
  neon: {
    palette: {
      grass: 0x150d2b,
      grassDark: 0x110a24,
      field: 0x1d1238,
      fieldDark: 0x180f30,
      sidewalk: 0x2b1d4d,
      curb: 0xff2bd6,
      asphalt: 0x0e0b1d,
      asphaltDark: 0x0a0816,
      marking: 0x00f0ff,
      markingYellow: 0xff2bd6,
      tree: 0x0b4f5c,
      treeLight: 0x14b8a6,
      rail: 0x6c5ce7,
      sleeper: 0x3b2a5c,
    },
    roofs: [0xff2bd6, 0x00f0ff, 0x7c4dff, 0xffe600, 0x00ff9c, 0xff6b00, 0xb388ff, 0x18ffff],
    fx: 'neon',
  },
  retro: {
    palette: {
      grass: 0x00a800,
      grassDark: 0x008800,
      field: 0x58d854,
      fieldDark: 0x00a844,
      sidewalk: 0xbcbcbc,
      curb: 0xfcfcfc,
      asphalt: 0x545454,
      asphaltDark: 0x404040,
      marking: 0xfcfcfc,
      markingYellow: 0xf8b800,
      tree: 0x005800,
      treeLight: 0x00b800,
    },
    roofs: [0xf83800, 0x0078f8, 0xf8b800, 0x6844fc, 0xa81000, 0x008888, 0xd800cc, 0x881400],
    fx: 'pixel',
  },
};

let current: string | undefined;

/** Применить тему (`undefined` — обычный город) к палитре до отрисовки сцены. */
export function applyCityTheme(id: string | undefined): void {
  const look = id ? THEME_LOOKS[id] : undefined;
  current = look ? id : undefined;
  Object.assign(COLORS, BASE, look?.palette ?? {});
  ROOF_COLORS.splice(0, ROOF_COLORS.length, ...(look?.roofs ?? BASE_ROOFS));
}

/** Какая тема применена сейчас (для ключей запечённых картинок). */
export function cityThemeId(): string {
  return current ?? 'classic';
}

/**
 * Эффект темы поверх города: снежинки или листья в координатах экрана, неоновая виньетка,
 * крупные пиксели. На недорогих телефонах — пара десятков частиц, без лишних текстур.
 */
export class ThemeFx {
  private readonly g?: Phaser.GameObjects.Graphics;
  private readonly bits: Array<{ x: number; y: number; v: number; s: number; phase: number }> = [];
  private readonly kind?: ThemeLook['fx'];

  constructor(
    private readonly scene: Phaser.Scene,
    /** Плотность пикселей: частицы одного размера на любом экране. */
    private readonly zoom: number,
  ) {
    this.kind = current ? THEME_LOOKS[current]?.fx : undefined;
    const cam = scene.cameras.main;
    const fx = (cam as unknown as { postFX?: Phaser.GameObjects.Components.FX }).postFX;
    if (this.kind === 'pixel') fx?.addPixelate(Math.max(2, Math.round(2 * zoom)));
    if (this.kind === 'neon') fx?.addVignette(0.5, 0.5, 0.75, 0.45);
    if (this.kind !== 'snow' && this.kind !== 'leaves') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    this.g = scene.add.graphics().setDepth(9);
    const count = this.kind === 'snow' ? 36 : 18;
    for (let i = 0; i < count; i++) this.bits.push({ x: Math.random(), y: Math.random(), v: 0.04 + Math.random() * 0.05, s: 1 + Math.random() * 2, phase: Math.random() * Math.PI * 2 });
  }

  update(deltaMs: number): void {
    if (!this.g) return;
    // Частицы живут в координатах мира и каждый кадр раскладываются по видимой области камеры
    // (как погода в `atmosphere.ts`); размер — постоянный на экране при любом приближении.
    const view = this.scene.cameras.main.worldView;
    const k = this.zoom / this.scene.cameras.main.zoom;
    const dt = deltaMs / 1000;
    const g = this.g.clear();
    for (const b of this.bits) {
      b.y += b.v * dt;
      b.phase += dt * 1.6;
      if (b.y > 1.05) {
        b.y = -0.05;
        b.x = Math.random();
      }
      const x = view.x + (b.x + Math.sin(b.phase) * 0.015) * view.width;
      const y = view.y + b.y * view.height;
      // Прямоугольники: круги Phaser каждый кадр разбивает на треугольники, а это дороже.
      if (this.kind === 'snow') g.fillStyle(0xffffff, 0.85).fillRect(x, y, b.s * 1.6 * k, b.s * 1.6 * k);
      else g.fillStyle(b.s > 2 ? 0xe76f24 : 0xf2b134, 0.9).fillRect(x, y, (4 + b.s) * k, (2 + b.s / 2) * k);
    }
  }
}
