/**
 * Тёмное время суток и погода поверх сцены: темнота со светом фар, туман, дождь, снег.
 * Слои живут в координатах мира и каждый кадр подгоняются под видимую область камеры.
 */
import * as Phaser from 'phaser';
import type { Vec } from '../../world/geometry.ts';
import type { Conditions } from '../../world/templates.ts';

export interface LightSource {
  p: Vec;
  angle: number;
  high: boolean;
}

export class Atmosphere {
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly lights: Phaser.GameObjects.Graphics;
  private readonly particles: Phaser.GameObjects.Graphics;
  private conditions: Conditions = {};
  private level = 0;
  private target = 0;
  private drops: Array<{ x: number; y: number; v: number }> = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.shade = scene.add.rectangle(0, 0, 10, 10, 0x0b1020, 1).setOrigin(0).setDepth(8).setAlpha(0);
    this.lights = scene.add.graphics().setDepth(8.5).setBlendMode(Phaser.BlendModes.ADD);
    this.particles = scene.add.graphics().setDepth(8.6);
  }

  /** Погода во всём районе (событие в пути). Сцена у точки её перекрывает, пока идёт. */
  private base: Conditions = {};
  private override = false;

  private apply(conditions: Conditions) {
    this.conditions = conditions;
    const active = conditions.time === 'night' || (conditions.weather && conditions.weather !== 'clear');
    this.target = active ? 1 : 0;
    this.drops = [];
  }

  /** Условия сцены у точки. */
  set(conditions: Conditions) {
    this.override = true;
    this.apply(conditions);
  }

  /** Сцена закончилась: вернуть погоду района (или плавно убрать всё). */
  clear() {
    this.override = false;
    if (this.base.weather || this.base.time) this.apply(this.base);
    else this.target = 0;
  }

  /** Погода района (пусто — ясно). */
  setBase(conditions: Conditions) {
    this.base = conditions;
    if (this.override) return;
    if (conditions.weather || conditions.time) this.apply(conditions);
    else this.target = 0;
  }

  get baseWeather(): Conditions['weather'] {
    return this.base.weather;
  }

  get active(): boolean {
    return this.level > 0.01;
  }

  update(dt: number, sources: LightSource[]) {
    this.level += Phaser.Math.Clamp(this.target - this.level, -dt * 1.5, dt * 1.5);
    const view = this.scene.cameras.main.worldView;
    const night = this.conditions.time === 'night';
    const weather = this.conditions.weather;
    this.shade.setPosition(view.x - 20, view.y - 20).setSize(view.width + 40, view.height + 40);

    let alpha = 0;
    let color = 0x0b1020;
    if (night) alpha = 0.74;
    else if (weather === 'fog') {
      alpha = 0.6;
      color = 0xdfe5ea;
    } else if (weather === 'rain' || weather === 'snow') alpha = 0.22;
    this.shade.setFillStyle(color).setAlpha(alpha * this.level);

    this.lights.clear();
    if (night && this.level > 0.01) {
      for (const s of sources) {
        const reach = s.high ? 260 : 150;
        const spread = s.high ? 0.42 : 0.34;
        const dir = { x: Math.sin(s.angle), y: -Math.cos(s.angle) };
        const tip = { x: s.p.x + dir.x * 16, y: s.p.y + dir.y * 16 };
        const a = s.angle - spread;
        const b = s.angle + spread;
        this.lights.fillStyle(0xfff3c4, (s.high ? 0.5 : 0.34) * this.level);
        this.lights.fillTriangle(tip.x, tip.y, tip.x + Math.sin(a) * reach, tip.y - Math.cos(a) * reach, tip.x + Math.sin(b) * reach, tip.y - Math.cos(b) * reach);
        this.lights.fillStyle(0xfff3c4, 0.5 * this.level).fillCircle(tip.x, tip.y, s.high ? 10 : 6);
      }
    }

    this.particles.clear();
    if ((weather === 'rain' || weather === 'snow') && this.level > 0.01) {
      const count = weather === 'rain' ? 90 : 70;
      while (this.drops.length < count) {
        this.drops.push({ x: Math.random() * view.width, y: Math.random() * view.height, v: 0.6 + Math.random() * 0.8 });
      }
      for (const d of this.drops) {
        if (weather === 'rain') {
          d.y += 520 * d.v * dt;
          d.x -= 90 * d.v * dt;
        } else {
          d.y += 60 * d.v * dt;
          d.x += Math.sin(d.y / 30) * 20 * dt;
        }
        if (d.y > view.height) d.y -= view.height;
        if (d.x < 0) d.x += view.width;
        if (d.x > view.width) d.x -= view.width;
        const x = view.x + d.x;
        const y = view.y + d.y;
        if (weather === 'rain') this.particles.lineStyle(1.2, 0xc8d6e5, 0.6 * this.level).lineBetween(x, y, x - 4, y + 14);
        else this.particles.fillStyle(0xffffff, 0.85 * this.level).fillCircle(x, y, 1.8 * d.v);
      }
    }
  }
}
