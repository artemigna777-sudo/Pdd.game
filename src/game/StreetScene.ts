import * as Phaser from 'phaser';
import { carLook } from '../progress/garage.ts';
import { onProgressChange, progress } from '../progress/progress.ts';
import { bakedImage, bakedTexture } from './bake.ts';
import { drawPlayerCar } from './city/art.ts';
import { PIXEL_RATIO } from './display.ts';

/**
 * Фон стартового экрана: вид сверху на городскую улицу, по которой едет машина курьера.
 * Всё рисуется векторной графикой в коде, без файлов изображений.
 * Координаты в CSS-пикселях, камера увеличена на PIXEL_RATIO.
 */

const COLORS = {
  grass: 0x4c8c4a,
  sidewalk: 0xaab2bd,
  curb: 0xd5dae1,
  asphalt: 0x3b4049,
  marking: 0xe9ecef,
  tree: 0x2f6f3a,
  treeLight: 0x3f8f4c,
  player: 0xffb703,
  playerRoof: 0xffd166,
  parcel: 0xc77d3a,
  glass: 0x1d3557,
  headlight: 0xfff3b0,
  taillight: 0xe63946,
  shadow: 0x000000,
};
const CAR_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x8d99ae, 0x6a4c93, 0xf1faee];
const ROOF_COLORS = [0xc8553d, 0x588b8b, 0xe0a458, 0x8e7dbe, 0x9c6644, 0x6d7b8d];

/** Скорость «камеры» вперёд, пикселей в секунду. */
const CRUISE_SPEED = 140;
const DASH = 34;
const GAP = 30;

interface Car {
  gfx: Phaser.GameObjects.Image;
  lane: number;
  /** Собственная скорость машины по направлению её движения. */
  speed: number;
  oncoming: boolean;
}

interface Prop {
  /** Дом (прямоугольники дёшевы и рисуются как есть) или дерево (готовая картинка). */
  gfx: Phaser.GameObjects.Container;
  side: -1 | 1;
  height: number;
}

export class StreetScene extends Phaser.Scene {
  private ground!: Phaser.GameObjects.Graphics;
  private markings!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private cars: Car[] = [];
  private props: Prop[] = [];
  private speed = CRUISE_SPEED;
  private markingOffset = 0;
  private frames = 0;

  // Раскладка, пересчитывается при изменении размера экрана.
  private viewW = 0;
  private viewH = 0;
  private roadX = 0;
  private roadW = 0;
  private laneW = 0;

  constructor() {
    super('street');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(PIXEL_RATIO);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.speed = 0;

    this.ground = this.add.graphics();
    this.markings = this.add.graphics();
    this.player = this.add.image(0, 0, '__DEFAULT').setDepth(3);
    this.updatePlayerLook();
    const unsubscribe = onProgressChange(() => this.updatePlayerLook());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  private layout(): void {
    this.viewW = this.scale.width / PIXEL_RATIO;
    this.viewH = this.scale.height / PIXEL_RATIO;
    this.roadW = Phaser.Math.Clamp(Math.round(this.viewW * 0.5), 180, 400);
    this.roadX = Math.round((this.viewW - this.roadW) / 2);
    this.laneW = this.roadW / 4;

    this.drawGround();
    this.drawMarkings();
    this.spawnProps();
    this.spawnTraffic();

    this.placePlayer();
  }

  /**
   * Машина курьера — в просвете между заголовком и панелью меню, чтобы её покраску было видно.
   * Высота панели меняется (строка статуса, крупный шрифт), поэтому место пересчитывается.
   */
  private placePlayer(): void {
    const top = document.querySelector('.hero')?.getBoundingClientRect().bottom;
    const bottom = document.querySelector('.menu')?.getBoundingClientRect().top;
    const y = top !== undefined && bottom !== undefined && bottom > top ? Math.min((top + bottom) / 2, bottom - 40) : Math.min(this.viewH * 0.52, this.viewH - 330);
    this.player.y = Math.round(Math.min(y, this.viewH - 40));
  }

  /** Центр полосы: 0 и 1 — встречные, 2 и 3 — попутные. */
  private laneCenter(lane: number): number {
    return this.roadX + this.laneW * (lane + 0.5);
  }

  private drawGround(): void {
    const g = this.ground.clear();
    const { viewW: w, viewH: h, roadX: x, roadW: rw } = this;
    const walk = 18;

    g.fillStyle(COLORS.grass).fillRect(0, 0, w, h);
    g.fillStyle(COLORS.sidewalk).fillRect(x - walk, 0, walk, h).fillRect(x + rw, 0, walk, h);
    g.fillStyle(COLORS.curb).fillRect(x - 3, 0, 3, h).fillRect(x + rw, 0, 3, h);
    g.fillStyle(COLORS.asphalt).fillRect(x, 0, rw, h);
  }

  private drawMarkings(): void {
    const g = this.markings.clear();
    const period = DASH + GAP;
    const { roadX: x, roadW: rw, laneW: lw, viewH: h } = this;

    g.fillStyle(COLORS.marking);
    // Сплошная двойная по центру и прерывистые между попутными полосами.
    g.fillRect(x + rw / 2 - 4, 0, 2.5, h).fillRect(x + rw / 2 + 1.5, 0, 2.5, h);
    // Края проезжей части.
    g.fillRect(x + 5, 0, 2, h).fillRect(x + rw - 7, 0, 2, h);
    for (let y = -period + this.markingOffset; y < h; y += period) {
      g.fillRect(x + lw - 1.5, y, 3, DASH);
      g.fillRect(x + lw * 3 - 1.5, y, 3, DASH);
    }
  }

  private spawnProps(): void {
    for (const p of this.props) p.gfx.destroy();
    this.props = [];
    for (const side of [-1, 1] as const) {
      let y = -40;
      while (y < this.viewH + 120) {
        const prop = this.makeProp(side);
        prop.gfx.y = y;
        y += prop.height + Phaser.Math.Between(12, 36);
        this.props.push(prop);
      }
    }
  }

  /** Машина курьера — с покраской и наклейкой из гаража, чуть крупнее, чем в городе. */
  private updatePlayerLook(): void {
    const look = carLook(progress());
    const k = 30 / 22;
    const key = bakedTexture(this, `street-player:${look.color}:${look.sticker}`, 40, 66, (g) => {
      g.scaleCanvas(k, k);
      drawPlayerCar(g, look.color, look.sticker);
    });
    this.player.setTexture(key).setScale(1 / PIXEL_RATIO);
  }

  /** Машина — готовая картинка (текстура рисуется один раз на цвет). */
  private carTexture(color: number, courier = false): string {
    return bakedTexture(this, `street-car:${color}:${courier}`, 40, 66, (g) => drawCar(g, color, { courier }));
  }

  private carImage(color: number, courier = false): Phaser.GameObjects.Image {
    return this.add.image(0, 0, this.carTexture(color, courier)).setScale(1 / PIXEL_RATIO);
  }

  private makeProp(side: -1 | 1): Prop {
    const gfx = this.add.container(0, 0).setDepth(1);
    const prop: Prop = { gfx, side, height: 0 };
    this.redrawProp(prop);
    return prop;
  }

  /** Дом (крыша сверху) или дерево на обочине. */
  private redrawProp(prop: Prop): void {
    prop.gfx.removeAll(true);
    const margin = this.roadX - 18;
    const available = Math.max(margin - 12, 0);

    if (available > 46 && Math.random() < 0.55) {
      const bw = Phaser.Math.Between(Math.min(46, available), Math.min(available, 110));
      const bh = Phaser.Math.Between(50, 110);
      const color = Phaser.Utils.Array.GetRandom(ROOF_COLORS);
      const x = prop.side < 0 ? margin - 8 - bw : this.viewW - margin + 8;
      const g = this.add.graphics();
      prop.gfx.add(g);
      g.fillStyle(COLORS.shadow, 0.18).fillRect(x + 5, 5, bw, bh);
      g.fillStyle(color).fillRect(x, 0, bw, bh);
      g.lineStyle(2, 0x000000, 0.15).strokeRect(x + 5, 5, bw - 10, bh - 10);
      g.fillStyle(0xffffff, 0.12).fillRect(x, 0, bw, 6);
      prop.height = bh;
    } else {
      const r = Phaser.Math.Between(11, 17);
      const cx = prop.side < 0 ? margin - 6 - r - Math.random() * Math.max(available - 2 * r, 0) : this.viewW - margin + 6 + r + Math.random() * Math.max(available - 2 * r, 0);
      const tree = bakedImage(this, `street-tree:${r}`, r * 2 + 12, r * 2 + 12, (g) => {
        g.fillStyle(COLORS.shadow, 0.2).fillCircle(4, 4, r);
        g.fillStyle(COLORS.tree).fillCircle(0, 0, r);
        g.fillStyle(COLORS.treeLight).fillCircle(-r * 0.3, -r * 0.3, r * 0.55);
      });
      prop.gfx.add(tree.setPosition(cx, r));
      prop.height = r * 2;
    }
  }

  private spawnTraffic(): void {
    for (const c of this.cars) c.gfx.destroy();
    this.cars = [];
    const plan: Array<[number, boolean]> = [
      [0, true],
      [1, true],
      [1, true],
      [3, false],
      [3, false],
      [2, false],
    ];
    plan.forEach(([lane, oncoming], i) => {
      const gfx = this.carImage(CAR_COLORS[0]).setDepth(2);
      const car: Car = { gfx, lane, oncoming, speed: 0 };
      this.resetCar(car, (i / plan.length) * this.viewH * 1.6 - this.viewH * 0.3);
      this.cars.push(car);
    });
  }

  private resetCar(car: Car, y: number): void {
    car.speed = car.oncoming ? Phaser.Math.Between(90, 160) : Phaser.Math.Between(80, 200);
    // Попутная машина в полосе игрока едет медленнее, чтобы не наезжать на него.
    if (!car.oncoming && car.lane === 2) car.speed = Phaser.Math.Between(60, 100);
    const color = Phaser.Utils.Array.GetRandom(CAR_COLORS);
    car.gfx.setTexture(this.carTexture(color));
    car.gfx.setAngle(car.oncoming ? 180 : 0);
    car.gfx.setPosition(this.laneCenter(car.lane) + Phaser.Math.Between(-3, 3), y);
  }

  update(time: number, delta: number): void {
    if (this.speed === 0) return;
    const dt = Math.min(delta, 50) / 1000;
    const scroll = this.speed * dt;
    const period = DASH + GAP;

    this.markingOffset = (this.markingOffset + scroll) % period;
    this.drawMarkings();

    for (const prop of this.props) {
      prop.gfx.y += scroll;
      if (prop.gfx.y > this.viewH + 20) {
        const top = Math.min(...this.props.filter((p) => p.side === prop.side).map((p) => p.gfx.y));
        this.redrawProp(prop);
        prop.gfx.y = Math.min(top, 0) - prop.height - Phaser.Math.Between(12, 36);
      }
    }

    for (const car of this.cars) {
      // Относительно камеры: встречные летят вниз быстрее дороги, попутные — по разнице скоростей.
      const v = car.oncoming ? this.speed + car.speed : this.speed - car.speed;
      car.gfx.y += v * dt;
      if (car.gfx.y > this.viewH + 80) this.resetCar(car, -80 - Math.random() * 200);
      else if (car.gfx.y < -240) this.resetCar(car, this.viewH + 60 + Math.random() * 120);
    }

    this.player.x = this.laneCenter(2) + Math.sin(time / 900) * 2;
    if (++this.frames % 30 === 0) this.placePlayer();
  }
}

/** Машина сверху, носом вверх. Центр в (0, 0), размер примерно 30×56. */
function drawCar(g: Phaser.GameObjects.Graphics, color: number, opts: { courier?: boolean }): void {
  const w = 30;
  const h = 56;
  g.fillStyle(COLORS.shadow, 0.25).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 9);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
  g.fillStyle(COLORS.glass).fillRoundedRect(-w / 2 + 4, -h / 2 + 11, w - 8, 9, 3);
  g.fillStyle(opts.courier ? COLORS.playerRoof : 0xffffff, opts.courier ? 1 : 0.22).fillRoundedRect(-w / 2 + 4, -h / 2 + 21, w - 8, 20, 4);
  if (opts.courier) {
    g.fillStyle(COLORS.parcel).fillRect(-7, -h / 2 + 25, 14, 12);
    g.fillStyle(0x9c5c26).fillRect(-7, -h / 2 + 30, 14, 2);
  }
  g.fillStyle(COLORS.glass).fillRoundedRect(-w / 2 + 5, h / 2 - 13, w - 10, 7, 2);
  g.fillStyle(COLORS.headlight).fillRect(-w / 2 + 3, -h / 2 + 1, 6, 3).fillRect(w / 2 - 9, -h / 2 + 1, 6, 3);
  g.fillStyle(COLORS.taillight).fillRect(-w / 2 + 3, h / 2 - 3, 6, 2).fillRect(w / 2 - 9, h / 2 - 3, 6, 2);
}
