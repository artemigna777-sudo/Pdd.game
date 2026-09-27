/**
 * Инструменты для сборки сцены у точки интереса.
 *
 * Локальная система координат сцены: начало — в центре сцены (перекрёсток или точка на
 * дороге), игрок подъезжает снизу (+y) и едет вверх (−y), ось x — вправо от игрока.
 * Контейнер сцены повёрнут так, чтобы это совпадало с реальным направлением подъезда.
 * Знаки, светофоры и подписи стоят «лицом» к экрану и не поворачиваются.
 */
import * as Phaser from 'phaser';
import { Polyline, headingAngle, rotate, type Vec } from '../../world/geometry.ts';
import type { VehicleKind } from '../../world/templates.ts';
import { CAR_COLORS, drawController, drawPedestrian, drawVehicle } from './art.ts';
import { createSign, TrafficLightView } from './signs.ts';

export interface Actor {
  obj: Phaser.GameObjects.Container;
  kind: VehicleKind | 'pedestrian' | 'controller';
  /** Светит ли фарами (для тёмного времени суток). */
  headlights: boolean;
  highBeam?: boolean;
  blinker?: 'left' | 'right';
}

interface Motion {
  actor: Actor;
  line: Polyline;
  s: number;
  speed: number;
  rotate: boolean;
  resolve: () => void;
}

const deg = (a: number) => (a * Math.PI) / 180;

export class SceneKit {
  readonly root: Phaser.GameObjects.Container;
  readonly billboards: Phaser.GameObjects.Container;
  readonly markings: Phaser.GameObjects.Graphics;
  readonly actors: Actor[] = [];
  private readonly motions: Motion[] = [];
  private readonly timers: Array<{ at: number; fn: () => void }> = [];
  private readonly flashers: Array<{ g: Phaser.GameObjects.Graphics }> = [];
  private readonly blinkers: Array<{ actor: Actor; g: Phaser.GameObjects.Graphics }> = [];
  readonly lights: TrafficLightView[] = [];
  private time = 0;
  private destroyed = false;

  constructor(
    readonly scene: Phaser.Scene,
    readonly anchor: Vec,
    readonly angle: number,
  ) {
    this.markings = scene.add.graphics().setDepth(2.5).setPosition(anchor.x, anchor.y).setRotation(angle);
    this.root = scene.add.container(anchor.x, anchor.y).setDepth(5).setRotation(angle);
    this.billboards = scene.add.container(anchor.x, anchor.y).setDepth(7);
  }

  toWorld(p: Vec): Vec {
    const r = rotate(p, this.angle);
    return { x: this.anchor.x + r.x, y: this.anchor.y + r.y };
  }

  toLocal(p: Vec): Vec {
    return rotate({ x: p.x - this.anchor.x, y: p.y - this.anchor.y }, -this.angle);
  }

  /** Транспорт. angle — куда смотрит нос, в градусах: 0 — вперёд (как игрок), 90 — вправо, 180 — навстречу. */
  vehicle(kind: VehicleKind, x: number, y: number, angle: number, color?: number): Actor {
    const g = this.scene.add.graphics();
    drawVehicle(g, kind, color ?? CAR_COLORS[(this.actors.length * 3 + 1) % CAR_COLORS.length]);
    const obj = this.scene.add.container(x, y, [g]).setRotation(deg(angle));
    this.root.add(obj);
    const actor: Actor = { obj, kind, headlights: kind !== 'bicycle' };
    this.actors.push(actor);
    if (kind === 'police' || kind === 'ambulance') this.addFlasher(obj);
    return actor;
  }

  pedestrian(x: number, y: number, angle = 0): Actor {
    const g = this.scene.add.graphics();
    drawPedestrian(g, this.actors.length);
    const obj = this.scene.add.container(x, y, [g]).setRotation(deg(angle));
    this.root.add(obj);
    const actor: Actor = { obj, kind: 'pedestrian', headlights: false };
    this.actors.push(actor);
    return actor;
  }

  controller(x: number, y: number, angle: number): Actor {
    const g = this.scene.add.graphics();
    drawController(g);
    const obj = this.scene.add.container(x, y, [g]).setRotation(deg(angle));
    this.root.add(obj);
    const actor: Actor = { obj, kind: 'controller', headlights: false };
    this.actors.push(actor);
    return actor;
  }

  /** Знак на обочине (основание стойки в локальной точке). */
  sign(code: string, x: number, y: number, caption?: string) {
    const w = rotate({ x, y }, this.angle);
    const sign = createSign(this.scene, code).setPosition(w.x, w.y).setScale(0.001);
    this.billboards.add(sign);
    this.scene.tweens.add({ targets: sign, scale: 1, duration: 320, ease: 'Back.easeOut', delay: 120 * this.billboards.length });
    if (caption) this.caption(caption, x, y, 14);
  }

  light(x: number, y: number, arrow?: 'left' | 'right'): TrafficLightView {
    const view = new TrafficLightView(this.scene, arrow);
    const w = rotate({ x, y }, this.angle);
    view.container.setPosition(w.x, w.y);
    this.billboards.add(view.container);
    this.lights.push(view);
    return view;
  }

  /** Подпись-облачко над точкой сцены. */
  say(text: string, x: number, y: number, tone: 'info' | 'bad' | 'good' = 'info', hold = 0): Phaser.GameObjects.Text {
    const colors = { info: '#1b2430', bad: '#c62839', good: '#1f8a43' };
    const w = rotate({ x, y }, this.angle);
    const label = this.scene.add
      .text(w.x, w.y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: colors[tone],
        padding: { x: 8, y: 5 },
        align: 'center',
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setScale(0.2);
    this.billboards.add(label);
    this.scene.tweens.add({ targets: label, scale: 1, duration: 260, ease: 'Back.easeOut' });
    if (hold > 0) this.after(hold, () => this.scene.tweens.add({ targets: label, alpha: 0, duration: 300, onComplete: () => label.destroy() }));
    return label;
  }

  /** Маленькая неподвижная подпись (например, буквы у знаков). */
  caption(text: string, x: number, y: number, dy = 0) {
    const w = rotate({ x, y }, this.angle);
    const t = this.scene.add
      .text(w.x, w.y + dy, text, { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#1b2430', backgroundColor: '#ffffffcc', padding: { x: 3, y: 1 } })
      .setOrigin(0.5, 0)
      .setResolution(4);
    this.billboards.add(t);
  }

  /** Двигать актёра по точкам (локальные координаты) с заданной скоростью. */
  move(actor: Actor, points: Vec[], speed: number, rotateAlong = true): Promise<void> {
    const existing = this.motions.findIndex((m) => m.actor === actor);
    if (existing >= 0) {
      this.motions[existing].resolve();
      this.motions.splice(existing, 1);
    }
    return new Promise((resolve) => {
      if (this.destroyed) return resolve();
      const line = new Polyline([{ x: actor.obj.x, y: actor.obj.y }, ...points]);
      this.motions.push({ actor, line, s: 0, speed, rotate: rotateAlong, resolve });
    });
  }

  stop(actor: Actor) {
    const i = this.motions.findIndex((m) => m.actor === actor);
    if (i >= 0) {
      this.motions[i].resolve();
      this.motions.splice(i, 1);
    }
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.after(ms, resolve));
  }

  after(ms: number, fn: () => void) {
    this.timers.push({ at: this.time + ms / 1000, fn });
  }

  /** Мигающий указатель поворота у актёра. */
  blink(actor: Actor, side: 'left' | 'right') {
    actor.blinker = side;
    const g = this.scene.add.graphics();
    actor.obj.add(g);
    this.blinkers.push({ actor, g });
  }

  private addFlasher(obj: Phaser.GameObjects.Container) {
    const g = this.scene.add.graphics();
    obj.add(g);
    this.flashers.push({ g });
  }

  update(dt: number) {
    if (this.destroyed) return;
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].at <= this.time) {
        const { fn } = this.timers[i];
        this.timers.splice(i, 1);
        fn();
      }
    }
    for (let i = this.motions.length - 1; i >= 0; i--) {
      const m = this.motions[i];
      const left = m.line.length - m.s;
      const ease = Math.min(1, left / 40 + 0.3);
      m.s = Math.min(m.line.length, m.s + m.speed * ease * dt);
      const p = m.line.pointAt(m.s);
      m.actor.obj.setPosition(p.x, p.y);
      if (m.rotate && m.line.length > 1) {
        const target = headingAngle(m.line.directionAt(Math.min(m.line.length, m.s + 2)));
        m.actor.obj.rotation += Phaser.Math.Angle.Wrap(target - m.actor.obj.rotation) * Math.min(1, dt * 10);
      }
      if (m.s >= m.line.length - 0.01) {
        this.motions.splice(i, 1);
        m.resolve();
      }
    }
    const phase = Math.floor(this.time / 0.2) % 2;
    for (const f of this.flashers) {
      f.g.clear();
      f.g.fillStyle(phase ? 0xff2d2d : 0x2d6bff).fillRect(-8, -4, 7, 4);
      f.g.fillStyle(phase ? 0x2d6bff : 0xff2d2d).fillRect(1, -4, 7, 4);
    }
    const on = this.time % 0.7 < 0.35;
    for (const b of this.blinkers) {
      b.g.clear();
      if (on && b.actor.blinker) {
        const x = b.actor.blinker === 'right' ? 7 : -11;
        b.g.fillStyle(0xff9f1c).fillRect(x, -12, 4, 4).fillRect(x, 8, 4, 4);
      }
    }
    for (const l of this.lights) l.update(dt);
  }

  /** Мировые позиции и направления фар актёров (для ночи). */
  headlightSources(): Array<{ p: Vec; angle: number; high: boolean }> {
    return this.actors
      .filter((a) => a.headlights && a.obj.active)
      .map((a) => ({ p: this.toWorld({ x: a.obj.x, y: a.obj.y }), angle: this.angle + a.obj.rotation, high: a.highBeam ?? false }));
  }

  /** Плавно убрать сцену. */
  fadeOut(ms = 400): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: [this.root, this.billboards, this.markings],
        alpha: 0,
        duration: ms,
        onComplete: () => {
          this.destroy();
          resolve();
        },
      });
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const m of this.motions) m.resolve();
    this.motions.length = 0;
    this.timers.length = 0;
    this.root.destroy();
    this.billboards.destroy();
    this.markings.destroy();
  }
}
