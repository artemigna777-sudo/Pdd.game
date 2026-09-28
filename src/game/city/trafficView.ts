/**
 * Картинки потока: машины и пешеходы из модели src/world/traffic.ts. Каждый участник — одна
 * готовая картинка (см. bake.ts), каждый кадр меняются только положение, поворот и прозрачность.
 */
import * as Phaser from 'phaser';
import type { TrafficSim } from '../../world/traffic.ts';
import { bakedTexture } from '../bake.ts';
import { PIXEL_RATIO } from '../display.ts';
import { VEHICLE_SIZE, drawPedestrian, drawVehicle } from './art.ts';

export class TrafficView {
  private readonly cars = new Map<number, Phaser.GameObjects.Image>();
  private readonly walkers = new Map<number, Phaser.GameObjects.Image>();
  private readonly tags = new Map<number, Phaser.GameObjects.Text>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: TrafficSim,
  ) {}

  private carImage(id: number, kind: keyof typeof VEHICLE_SIZE, color: number): Phaser.GameObjects.Image {
    let img = this.cars.get(id);
    if (!img) {
      const k = kind === 'player' ? 'car' : kind;
      const size = VEHICLE_SIZE[k];
      // Те же ключи и размеры, что у машин в сценах: текстуры общие.
      const key = bakedTexture(this.scene, `vehicle:${k}:${color}`, size.w + 24, size.h + 24, (g) => drawVehicle(g, k, color));
      img = this.scene.add.image(0, 0, key).setScale(1 / PIXEL_RATIO).setDepth(3.9);
      this.cars.set(id, img);
    }
    return img;
  }

  private walkerImage(id: number, seed: number): Phaser.GameObjects.Image {
    let img = this.walkers.get(id);
    if (!img) {
      const key = bakedTexture(this.scene, `pedestrian:${seed}`, 28, 24, (g) => drawPedestrian(g, seed));
      img = this.scene.add.image(0, 0, key).setScale(1 / PIXEL_RATIO).setDepth(3.8);
      this.walkers.set(id, img);
    }
    return img;
  }

  /** Подпись над машиной (Артём на мопеде). */
  private tag(id: number, text: string): Phaser.GameObjects.Text {
    let t = this.tags.get(id);
    if (!t) {
      t = this.scene.add
        .text(0, 0, text, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#8e44adcc', padding: { x: 4, y: 1 } })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setDepth(3.95);
      this.tags.set(id, t);
    }
    return t;
  }

  update(visible: boolean, view: Phaser.Geom.Rectangle) {
    const margin = 60;
    const inView = (x: number, y: number) => x > view.x - margin && x < view.right + margin && y > view.y - margin && y < view.bottom + margin;
    const alive = new Set<number>();
    for (const car of this.sim.cars) {
      if (car.gone) continue;
      alive.add(car.id);
      const img = this.carImage(car.id, car.kind, car.color);
      const show = visible && inView(car.pos.x, car.pos.y);
      img.setVisible(show);
      if (show) img.setPosition(car.pos.x, car.pos.y).setRotation(car.heading).setAlpha(car.alpha);
      if (car.rival) {
        const t = this.tag(car.id, 'Артём');
        t.setVisible(show).setPosition(car.pos.x, car.pos.y - 16).setAlpha(car.alpha);
      }
    }
    for (const [id, img] of this.cars) {
      if (alive.has(id)) continue;
      img.destroy();
      this.cars.delete(id);
      this.tags.get(id)?.destroy();
      this.tags.delete(id);
    }
    alive.clear();
    for (const w of this.sim.walkers) {
      if (w.gone) continue;
      alive.add(w.id);
      const img = this.walkerImage(w.id, w.seed);
      const show = visible && inView(w.pos.x, w.pos.y);
      img.setVisible(show);
      if (!show) continue;
      // Шаги: плечи чуть покачиваются.
      const sway = Math.sin(w.step) * 0.08;
      img.setPosition(w.pos.x, w.pos.y).setRotation(w.heading + sway).setAlpha(w.alpha);
    }
    for (const [id, img] of this.walkers) {
      if (alive.has(id)) continue;
      img.destroy();
      this.walkers.delete(id);
    }
  }

  destroy() {
    for (const img of this.cars.values()) img.destroy();
    for (const img of this.walkers.values()) img.destroy();
    for (const t of this.tags.values()) t.destroy();
    this.cars.clear();
    this.walkers.clear();
    this.tags.clear();
  }
}
