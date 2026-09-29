/**
 * Машина игрока: едет по маршруту из частей (полосы и проезды узлов), плавно разгоняется,
 * тормозит перед поворотами и точно останавливается в конце маршрута. Перед поворотом
 * сама включает указатель поворота.
 *
 * Педали (этап 8): «Тормоз» — пока нажат, машина стоит; «Газ» — едет быстрее обычного, до
 * разрешённой скорости +40 км/ч (превышение — забота игрока). Без педалей машина держит
 * скорость по дороге, как круиз-контроль, а на красный и перед пешеходами тормозит игрок.
 */
import * as Phaser from 'phaser';
import { Polyline, headingAngle, type Vec } from '../../world/geometry.ts';
import { partLength, type Lane, type PathPart, type RoadGraph } from '../../world/roadGraph.ts';
import { bakedImage } from '../bake.ts';
import { carLook } from '../../progress/garage.ts';
import { progress } from '../../progress/progress.ts';
import { KMH_PER_PX, PLAYER_PACE, speedLimit } from '../../world/rules.ts';
import { drawPlayerCar } from './art.ts';

const ACCEL = 150;
const BRAKE = 190;
/** Торможение педалью. */
export const PEDAL_BRAKE = BRAKE * 1.6;
/** Разгон на «газу» выше обычной скорости — плавный (7 км/ч в секунду), чтобы было время отпустить. */
const GAS_ACCEL = 7 / KMH_PER_PX;
/** Экстренная остановка (свисток инспектора). */
const HALT_BRAKE = 1400;
/** «Газ»: до разрешённой скорости + столько км/ч. */
const GAS_OVER = 40;
const LOOKAHEAD = 260;
const BLINK_BEFORE = 90;

export class Player {
  readonly container: Phaser.GameObjects.Container;
  private readonly blinkers: Phaser.GameObjects.Graphics;
  private parts: PathPart[] = [];
  private starts: number[] = [];
  private line: Polyline;
  /** Пройдено вдоль текущего маршрута. */
  private s = 0;
  speed = 0;
  /** Ограничение скорости от джойстика (0…1). */
  throttle = 1;
  /** Педаль тормоза нажата. */
  brake = false;
  /** Педаль газа нажата. */
  gas = false;
  /** Экстренная остановка: машина стоит, пока её не отпустят. */
  halted = false;
  private heading = 0;
  private arrived = true;
  private blinkTime = 0;
  /** Сдвиг вправо от полосы (прижаться к обочине, пропуская скорую). */
  private nudge = 0;
  private nudgeTarget = 0;
  onArrive?: () => void;

  constructor(
    scene: Phaser.Scene,
    private readonly graph: RoadGraph,
    lane: Lane,
    s: number,
  ) {
    // Покраска и наклейка из гаража.
    const look = carLook(progress());
    const body = bakedImage(scene, `player-car:${look.color}:${look.sticker}`, 40, 56, (g) => drawPlayerCar(g, look.color, look.sticker));
    this.blinkers = scene.add.graphics();
    this.container = scene.add.container(0, 0, [body, this.blinkers]).setDepth(6);
    this.line = new Polyline([graph.pointOnLane(lane, s)]);
    this.parts = [graph.lanePart(lane, s, s)];
    this.rebuild();
    this.heading = headingAngle(lane.dir);
    this.place();
  }

  get position(): Vec {
    return this.line.pointAt(this.s);
  }

  get angle(): number {
    return this.heading;
  }

  get isMoving(): boolean {
    return this.speed > 1 || this.remaining() > 0.5;
  }

  remaining(): number {
    return this.line.length - this.s;
  }

  /** Текущая часть маршрута и позиция внутри неё. */
  current(): { part: PathPart; index: number; offset: number } {
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > this.s) i--;
    return { part: this.parts[i], index: i, offset: this.s - this.starts[i] };
  }

  /** Где машина на полосе (если не в узле). */
  lanePosition(): { lane: Lane; s: number } | null {
    const { part, offset } = this.current();
    if (part.kind !== 'lane') return null;
    return { lane: part.lane, s: Math.min(part.s1, part.s0 + offset) };
  }

  /** Части маршрута, оставшиеся впереди (текущая — с текущего места). */
  ahead(): PathPart[] {
    const { part, index, offset } = this.current();
    const rest = this.parts.slice(index + 1);
    if (part.kind === 'lane') {
      const s = Math.min(part.s1, part.s0 + offset);
      return [this.graph.lanePart(part.lane, s, part.s1), ...rest];
    }
    const line = new Polyline(part.points);
    const remainingPoints = [line.pointAt(offset), ...part.points.filter((_, i) => line.cum[i] > offset)];
    return [{ ...part, points: remainingPoints }, ...rest];
  }

  /** Заменить маршрут. Первая часть должна начинаться в текущей позиции машины. */
  setPath(parts: PathPart[]) {
    this.parts = parts.length ? parts : [this.stationaryPart()];
    this.s = 0;
    this.arrived = false;
    this.rebuild();
  }

  /** Поставить машину в точку полосы (без поездки) — например, перед следующим вопросом серии. */
  placeAt(lane: Lane, s: number) {
    this.parts = [this.graph.lanePart(lane, s, s)];
    this.s = 0;
    this.speed = 0;
    this.arrived = true;
    this.rebuild();
    this.heading = headingAngle(lane.dir);
    this.place();
  }

  /** Добавить части в конец маршрута. */
  append(parts: PathPart[]) {
    if (!parts.length) return;
    const passed = this.s;
    this.parts = [...this.parts, ...parts];
    this.rebuild();
    this.s = passed;
    this.arrived = false;
  }

  /** Машина останавливается по своей воле: тормоз, конец маршрута впереди. */
  get stopping(): boolean {
    return this.brake || this.halted || this.remaining() < (this.speed * this.speed) / (2 * BRAKE) + 12;
  }

  /** Остановиться как можно раньше (с плавным торможением). */
  stopSoon() {
    const brakeDistance = (this.speed * this.speed) / (2 * PEDAL_BRAKE) + 2;
    this.truncate(this.s + brakeDistance);
  }

  /** Обрезать маршрут на расстоянии `at` от начала текущего маршрута. */
  truncate(at: number) {
    if (at >= this.line.length) return;
    const passed = this.s;
    this.parts = this.graph.splitPath(this.parts, at)[0];
    if (!this.parts.length) this.parts = [this.stationaryPart()];
    this.rebuild();
    this.s = Math.min(passed, this.line.length);
  }

  /** Последняя часть маршрута (куда машина приедет). */
  lastPart(): PathPart {
    return this.parts[this.parts.length - 1];
  }

  private stationaryPart(): PathPart {
    const pos = this.lanePosition();
    if (pos) return this.graph.lanePart(pos.lane, pos.s, pos.s);
    const p = this.position;
    const { part } = this.current();
    return { ...part, points: [p, p] };
  }

  private rebuild() {
    const points: Vec[] = [];
    this.starts = [];
    let acc = 0;
    for (const part of this.parts) {
      this.starts.push(acc);
      acc += partLength(part);
      points.push(...(points.length ? part.points.slice(1) : part.points));
    }
    this.line = new Polyline(points);
  }

  /**
   * Скорость, которую машина держит на части маршрута: обычная (на 20% быстрее потока), а на
   * «газу» — до разрешённой +40 км/ч, в том числе прямо через перекрёсток. В повороте — как обычно.
   */
  private allowed(part: PathPart): number {
    const normal = part.speed * PLAYER_PACE;
    if (!this.gas) return normal;
    if (part.kind === 'lane') return Math.max(normal, (speedLimit(part.lane) + GAS_OVER) / KMH_PER_PX);
    if (part.turn.kind === 'straight') return Math.max(normal, (speedLimit(part.turn.from) + GAS_OVER) / KMH_PER_PX);
    return normal;
  }

  update(dt: number) {
    const { part, index } = this.current();
    const cruise = part.speed * PLAYER_PACE * this.throttle;
    let target = Math.max(cruise, this.allowed(part) * (this.gas ? 1 : this.throttle));
    const remaining = this.remaining();
    target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, remaining - 0.3)));
    for (let j = index + 1; j < this.parts.length; j++) {
      const dist = this.starts[j] - this.s;
      if (dist > LOOKAHEAD) break;
      target = Math.min(target, Math.sqrt(this.allowed(this.parts[j]) ** 2 + 2 * BRAKE * Math.max(0, dist)));
    }
    if (this.brake || this.halted) target = 0;
    if (this.speed < target) {
      // Выше обычной скорости машина разгоняется медленно.
      const accel = this.speed >= cruise ? GAS_ACCEL : ACCEL;
      this.speed = Math.min(target, this.speed + accel * dt);
    } else {
      const decel = this.halted ? HALT_BRAKE : this.brake ? PEDAL_BRAKE : BRAKE * 1.6;
      this.speed = Math.max(target, this.speed - decel * dt);
    }
    this.s = Math.min(this.line.length, this.s + this.speed * dt);

    if (this.remaining() < 0.4 && this.speed < 6) {
      this.speed = 0;
      this.s = this.line.length;
      if (!this.arrived) {
        this.arrived = true;
        this.onArrive?.();
      }
    }

    if (this.line.length > 0.5 && this.speed > 0.5) {
      const dir = this.line.directionAt(Math.min(this.line.length, this.s + 4));
      const targetAngle = headingAngle(dir);
      const diff = Phaser.Math.Angle.Wrap(targetAngle - this.heading);
      this.heading += diff * Math.min(1, dt * 12);
    }
    this.nudge += Math.max(-20 * dt, Math.min(20 * dt, this.nudgeTarget - this.nudge));
    this.place();
    this.updateBlinkers(dt, index);
  }

  /** Прижаться вправо на `px` (0 — вернуться в полосу). */
  setNudge(px: number) {
    this.nudgeTarget = px;
  }

  private place() {
    const p = this.position;
    const right = { x: Math.cos(this.heading), y: Math.sin(this.heading) };
    this.container.setPosition(p.x + right.x * this.nudge, p.y + right.y * this.nudge).setRotation(this.heading);
  }

  /** Указатель поворота: за BLINK_BEFORE до поворота и во время него. */
  private updateBlinkers(dt: number, index: number) {
    let side: 'left' | 'right' | null = null;
    for (let j = index; j < this.parts.length; j++) {
      const part = this.parts[j];
      if (j > index && this.starts[j] - this.s > BLINK_BEFORE) break;
      if (part.kind === 'turn' && (part.turn.kind === 'left' || part.turn.kind === 'right' || part.turn.kind === 'uturn')) {
        side = part.turn.kind === 'right' ? 'right' : 'left';
        break;
      }
    }
    this.blinkTime += dt;
    const on = side !== null && this.blinkTime % 0.7 < 0.35;
    this.blinkers.clear();
    if (on) {
      const x = side === 'right' ? 8 : -12;
      this.blinkers.fillStyle(0xff9f1c).fillRect(x, -20, 4, 4).fillRect(x, 16, 4, 4);
    }
  }
}
