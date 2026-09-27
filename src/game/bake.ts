/**
 * «Запекание» векторной графики: рисунок один раз отрисовывается в текстуру в разрешении экрана,
 * а дальше на экране — готовая картинка. Phaser не пересчитывает фигуры каждый кадр, и кадр
 * становится заметно дешевле (особенно скруглённые прямоугольники и круги машин, людей, деревьев).
 */
import type * as Phaser from 'phaser';
import { PIXEL_RATIO } from './display.ts';

/**
 * Текстура из рисунка (создаётся один раз на ключ и дальше переиспользуется всеми сценами).
 * `draw` рисует вокруг (0, 0); `w` и `h` — размер области рисунка с запасом. Возвращает ключ текстуры.
 */
export function bakedTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
  /** Где в текстуре точка (0, 0) рисунка, в долях размера (по умолчанию — в центре). */
  origin = { x: 0.5, y: 0.5 },
): string {
  const res = PIXEL_RATIO;
  const name = `baked:${key}@${res}`;
  if (!scene.textures.exists(name)) {
    const tw = Math.ceil(w * res);
    const th = Math.ceil(h * res);
    const texture = scene.textures.addDynamicTexture(name, tw, th);
    const g = scene.make.graphics({}, false);
    draw(g);
    g.setScale(res);
    texture?.draw(g, tw * origin.x, th * origin.y);
    g.destroy();
  }
  return name;
}

/** Картинка из рисунка — см. bakedTexture. */
export function bakedImage(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void, x = 0, y = 0): Phaser.GameObjects.Image {
  return scene.add.image(x, y, bakedTexture(scene, key, w, h, draw)).setScale(1 / PIXEL_RATIO);
}
