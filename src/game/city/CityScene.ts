/**
 * Город: карта района, машина игрока, управление, точки интереса с вопросами.
 *
 * Ход сцены у точки: машина плавно останавливается → сцена оживает (участники движения,
 * светофоры, знаки) → интерфейс показывает карточку вопроса → ответ:
 *  - правильно: сначала проезжают те, кому нужно уступить, машина едет дальше;
 *  - неправильно: анимация последствия (помеха, инспектор, штраф), затем пояснение.
 */
import * as Phaser from 'phaser';
import type { Question } from '../../data/types.ts';
import type { ControlMode } from '../../settings.ts';
import { distance, dot, headingAngle, normalize, rightNormal, type Vec } from '../../world/geometry.ts';
import type { MapPoint } from '../../world/map.ts';
import { MAPS, pointQueues, type Mapping, type Placement } from '../../world/mapping.ts';
import { RoadGraph, type Lane, type PathPart } from '../../world/roadGraph.ts';
import { TEMPLATES, type Maneuver, type TemplateInfo } from '../../world/templates.ts';
import { PIXEL_RATIO } from '../display.ts';
import type { InteriorScene, MinigameKind } from '../interior/InteriorScene.ts';
import { Atmosphere } from './atmosphere.ts';
import { MapRenderer } from './mapRenderer.ts';
import { Player } from './Player.ts';
import { SceneKit } from './sceneKit.ts';
import { createScript, sceneConditions, type SceneScript } from './sceneScripts.ts';
import { TrafficLightView } from './signs.ts';

/** Вопрос в серии точки интереса. */
export interface SeriesInfo {
  /** Номер вопроса в серии, с 0. */
  index: number;
  total: number;
  /** Подпись точки на карте. */
  point: string;
  /** Подпись от сцены (для мини-игр — шаг, номер вопроса викторины). */
  caption?: string;
}

export interface CityHost {
  /** Машина стоит у точки, сцена ожила — показать вопрос. */
  showQuestion(question: Question, placement: Placement, template: TemplateInfo, series: SeriesInfo): void;
  onOverviewChange?(on: boolean): void;
  /** Машина остановилась у точки: сцена оживает (мини-игра может ждать касания). */
  onSceneStart?(minigame: boolean): void;
  /** Серия вопросов точки пройдена. */
  onPointDone?(done: number, total: number): void;
}

export interface CityData {
  host: CityHost;
  questions: Question[];
  mapping: Mapping;
  chapter: string;
  control: ControlMode;
}

interface Poi {
  point: MapPoint;
  lane: Lane;
  s: number;
  anchor: Vec;
  dir: Vec;
  /** Вопросы серии по порядку. */
  queue: Placement[];
  cooldown: boolean;
  /** Серия пройдена хотя бы раз за поездку. */
  done: boolean;
  marker: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Graphics;
  mark: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text;
}

interface Signal {
  node: string;
  byLane: Map<string, TrafficLightView>;
  paused: boolean;
  t: number;
}

interface ActiveScene {
  poi: Poi;
  placement: Placement;
  /** Номер вопроса в серии точки. */
  index: number;
  /** Сцена на дороге (для мини-игр её нет). */
  kit?: SceneKit;
  /** Мини-игра поверх города. */
  interior?: InteriorScene;
  script: SceneScript;
  exit: PathPart[];
  /** Сколько траектории выезда уже проехано (заезд на кольцо, рывок). */
  exitOffset: number;
  focus: Vec;
}

const SIGNAL_CYCLE = 16;
const TAP_MOVE_LIMIT = 10;
const JOY_RADIUS = 56;

export class CityScene extends Phaser.Scene {
  private host!: CityHost;
  private questions = new Map<string, Question>();
  private mapping!: Mapping;
  private chapter = 'ch1';
  private points: MapPoint[] = [];
  private interior?: InteriorScene;
  private control: ControlMode = 'tap';

  private graph!: RoadGraph;
  private mapView!: MapRenderer;
  private atmosphere!: Atmosphere;
  private player!: Player;
  private pois: Poi[] = [];
  private signals: Signal[] = [];

  private active?: ActiveScene;
  private leaving?: { kit: SceneKit; anchor: Vec; since: number; signal?: Signal };
  private pendingPoi?: Poi;
  private destination?: { lane: Lane; s: number };
  private leadResolve?: () => void;
  private overview = false;

  private pinGfx!: Phaser.GameObjects.Graphics;
  private joyGfx!: Phaser.GameObjects.Graphics;
  private pointerDown?: { x: number; y: number; time: number };
  private joy = { active: false, dir: { x: 0, y: -1 } as Vec, mag: 0, knob: { x: 0, y: 0 } };
  private joyWasActive = false;

  constructor() {
    super('city');
  }

  init(data: CityData) {
    this.host = data.host;
    this.questions = new Map(data.questions.map((q) => [q.id, q]));
    this.mapping = data.mapping;
    this.chapter = data.chapter;
    this.control = data.control;
    this.pois = [];
    this.signals = [];
    this.active = undefined;
    this.leaving = undefined;
    this.pendingPoi = undefined;
    this.destination = undefined;
    this.overview = false;
    this.interior = undefined;
  }

  create() {
    const chapter = this.mapping.chapters.find((c) => c.id === this.chapter)!;
    const map = MAPS[chapter.map];
    this.points = chapter.points;
    this.graph = new RoadGraph(map);
    this.mapView = new MapRenderer(this, this.graph, this.points);
    this.atmosphere = new Atmosphere(this);
    this.buildPois();
    this.buildSignals();

    this.player = new Player(this, this.graph, this.startLane(), 30);
    this.player.onArrive = () => this.onArrive();
    this.pinGfx = this.add.graphics().setDepth(4.5);
    this.joyGfx = this.add.graphics().setDepth(30);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#5b9a4f');
    cam.setZoom(PIXEL_RATIO);
    cam.setBounds(map.bounds.x, map.bounds.y, map.bounds.width, map.bounds.height);
    cam.startFollow(this.player.container, true, 0.1, 0.1);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive('interior') || this.scene.isPaused('interior')) this.scene.stop('interior');
    });
  }

  /** Старт: городская улица без точек интереса, чтобы машину было видно в движении сразу. */
  private startLane(): Lane {
    const busy = new Set(this.pois.map((p) => p.lane));
    const lanes = [...this.graph.lanes.values()].filter((l) => l.length > 200);
    return lanes.find((l) => !busy.has(l) && !this.pois.some((p) => p.lane.from === l.to && distance(p.anchor, l.to) < 200)) ?? lanes[0];
  }

  // ─── Публичные команды для интерфейса ────────────────────────────────────────

  setControl(mode: ControlMode) {
    this.control = mode;
    this.joy.active = false;
    this.player.throttle = 1;
  }

  /** Ответ на вопрос: промис выполняется, когда анимация закончилась. */
  async answer(correct: boolean): Promise<void> {
    const a = this.active;
    if (!a) return;
    if (correct) await a.script.success();
    else await a.script.fail(a.placement.params.consequence ?? TEMPLATES[a.placement.template].consequence);
  }

  /** Есть ли в серии точки ещё вопросы после текущего. */
  get hasNextInSeries(): boolean {
    const a = this.active;
    return !!a && a.index + 1 < a.poi.queue.length;
  }

  /** После ответа: следующий вопрос серии или едем дальше. */
  proceed() {
    const a = this.active;
    if (!a) return;
    if (a.index + 1 < a.poi.queue.length) {
      void this.nextInSeries(a);
      return;
    }
    a.script.leave();
    this.markDone(a.poi);
    if (a.interior) {
      const interior = a.interior;
      this.interior = undefined;
      void interior.close().then(() => this.driveOn(a));
      return;
    }
    this.driveOn(a);
  }

  /** Следующий вопрос серии в той же точке: сцена собирается заново, машина — на месте остановки. */
  private async nextInSeries(a: ActiveScene) {
    a.script.leave();
    if (a.kit) {
      this.atmosphere.clear();
      const signal = this.signalAt(a.poi);
      await a.kit.fadeOut(300);
      if (signal) signal.paused = false;
      this.player.placeAt(a.poi.lane, a.poi.s);
    }
    await this.startScene(a.poi, a.index + 1);
  }

  private driveOn(a: ActiveScene) {
    this.active = undefined;
    a.poi.cooldown = true;

    let parts = this.graph.splitPath(a.exit, a.exitOffset)[1];
    const last = parts[parts.length - 1];
    if (this.destination && this.control === 'tap' && last?.kind === 'lane') {
      const onward = this.graph.route(last.lane, last.s1, this.destination.lane, this.destination.s);
      if (onward) parts = [...parts, ...onward.slice(1)];
    }
    const clipped = this.clip(parts);
    this.pendingPoi = clipped.poi;
    this.player.setPath(clipped.parts);
    if (a.kit) this.leaving = { kit: a.kit, anchor: a.poi.anchor, since: 0, signal: this.signalAt(a.poi) };
    const b = this.graph.map.bounds;
    this.cameras.main.setBounds(b.x, b.y, b.width, b.height);
    this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
  }

  /** Сдвинуть камеру так, чтобы сцена была видна над карточкой (visible — доля высоты экрана сверху). */
  focusVisible(visible: number) {
    const a = this.active;
    if (!a) return;
    if (a.interior) {
      a.interior.focus(visible);
      return;
    }
    const cam = this.cameras.main;
    const viewH = cam.height / cam.zoom;
    const target = { x: a.focus.x, y: a.focus.y + (0.5 - visible / 2) * viewH };
    cam.stopFollow();
    // У края карты камера должна иметь возможность сдвинуться за границу.
    cam.removeBounds();
    cam.pan(target.x, target.y, 600, 'Sine.easeInOut', true);
  }

  toggleOverview(): boolean {
    this.setOverview(!this.overview);
    return this.overview;
  }

  // ─── Точки интереса и светофоры ──────────────────────────────────────────────

  private buildPois() {
    const queues = pointQueues(this.mapping, this.chapter);
    for (const point of this.points) {
      const queue = queues.get(point.id) ?? [];
      if (!queue.length) continue;
      const stop = this.graph.pointStop(point);
      const p = this.graph.pointOnLane(stop.lane, stop.s);
      const ring = this.add.graphics();
      const minigame = TEMPLATES[point.template].minigame;
      this.drawMarker(ring, minigame ? 0x3a86ff : 0xffb703);
      const q = this.add.text(0, 0, minigame ? '!' : '?', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: minigame ? '#ffffff' : '#1b2430' }).setOrigin(0.5).setResolution(4);
      const title = this.add
        .text(0, 26, point.title, { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1b2430cc', padding: { x: 5, y: 2 } })
        .setOrigin(0.5, 0)
        .setResolution(4)
        .setAlpha(0);
      const marker = this.add.container(p.x, p.y, [ring, q, title]).setDepth(4);
      this.tweens.add({ targets: ring, scale: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.pois.push({ point, lane: stop.lane, s: stop.s, anchor: stop.anchor, dir: stop.dir, queue, cooldown: false, done: false, marker, ring, mark: q, title });
    }
  }

  private drawMarker(ring: Phaser.GameObjects.Graphics, color: number) {
    ring.clear();
    ring.fillStyle(color, 0.25).fillCircle(0, 0, 22);
    ring.lineStyle(3, color).strokeCircle(0, 0, 18);
    ring.fillStyle(color).fillCircle(0, 0, 11);
  }

  /** Точка пройдена: зелёная отметка (заехать ещё раз можно — серия начнётся сначала). */
  private markDone(poi: Poi) {
    if (poi.done) return;
    poi.done = true;
    this.drawMarker(poi.ring, 0x1f8a43);
    poi.mark.setText('✓').setColor('#ffffff');
    this.host.onPointDone?.(this.pois.filter((p) => p.done).length, this.pois.length);
  }

  private buildSignals() {
    for (const point of this.points) {
      if (point.template !== 'signalized') continue;
      const node = this.graph.node(point.toward);
      const r = this.graph.radius(node.id);
      const byLane = new Map<string, TrafficLightView>();
      for (const lane of this.graph.lanes.values()) {
        if (lane.to.id !== node.id) continue;
        const view = new TrafficLightView(this);
        const pos = { x: node.x - lane.dir.x * (r + 30) + lane.normal.x * (r + 14), y: node.y - lane.dir.y * (r + 30) + lane.normal.y * (r + 14) };
        view.container.setPosition(pos.x, pos.y).setDepth(7);
        byLane.set(lane.id, view);
      }
      this.signals.push({ node: node.id, byLane, paused: false, t: 0 });
    }
  }

  private signalAt(poi: Poi): Signal | undefined {
    return poi.point.template === 'signalized' ? this.signals.find((s) => s.node === poi.lane.to.id) : undefined;
  }

  private updateSignals(dt: number) {
    for (const s of this.signals) {
      for (const view of s.byLane.values()) view.update(dt);
      if (s.paused) continue;
      const before = s.t;
      s.t = (s.t + dt) % SIGNAL_CYCLE;
      const phase = (t: number) => (t < 6 ? 0 : t < 8 ? 1 : t < 14 ? 2 : 3);
      if (before !== 0 && phase(before) === phase(s.t)) continue;
      const ph = phase(s.t);
      for (const [id, view] of s.byLane) {
        const vertical = Math.abs(this.graph.lane(id).dir.y) > 0.5;
        const mine = vertical ? ph < 2 : ph >= 2;
        view.setState(mine ? (ph % 2 === 0 ? 'green' : 'yellow') : 'red');
      }
    }
  }

  // ─── Маршруты ────────────────────────────────────────────────────────────────

  /** Обрезать маршрут у первой активной точки интереса на пути. */
  private clip(parts: PathPart[]): { parts: PathPart[]; poi?: Poi } {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.kind !== 'lane') continue;
      let hit: Poi | undefined;
      for (const poi of this.pois) {
        if (poi.cooldown || poi.lane !== part.lane) continue;
        if (poi.s >= part.s0 - 0.01 && poi.s <= part.s1 + 0.01 && (!hit || poi.s < hit.s)) hit = poi;
      }
      if (hit) return { parts: [...parts.slice(0, i), this.graph.lanePart(part.lane, part.s0, hit.s)], poi: hit };
    }
    return { parts };
  }

  private routeFromHere(lane: Lane, s: number): PathPart[] | null {
    const ahead = this.player.ahead();
    const first = ahead[0];
    if (first.kind === 'lane') return this.graph.route(first.lane, first.s0, lane, s);
    const rest = this.graph.route(first.turn.to, 0, lane, s);
    return rest ? [first, ...rest] : null;
  }

  private driveTo(target: { lane: Lane; s: number }) {
    const parts = this.routeFromHere(target.lane, target.s);
    if (!parts) return;
    const clipped = this.clip(parts);
    this.pendingPoi = clipped.poi;
    this.player.setPath(clipped.parts);
    this.drawPin(this.graph.pointOnLane(target.lane, target.s));
  }

  /** Траектория после вопроса: манёвр на перекрёстке или прямо по дороге. */
  private exitPath(poi: Poi, maneuver: Maneuver | undefined): PathPart[] {
    const lane = poi.lane;
    if (TEMPLATES[poi.point.template].anchor === 'road') {
      return [this.graph.lanePart(lane, poi.s, Math.min(lane.length, poi.s + 220))];
    }
    const want = maneuver ?? 'straight';
    const exits = this.graph.outgoing.get(lane.to.id) ?? [];
    const right = rightNormal(lane.dir);
    const score = (out: Lane) => {
      const d = out.dir;
      switch (want) {
        case 'straight':
          return dot(d, lane.dir);
        case 'right':
          return dot(d, right);
        case 'left':
          return -dot(d, right);
        case 'uturn':
          return -dot(d, lane.dir);
      }
    };
    const out = [...exits].sort((a, b) => score(b) - score(a))[0];
    return [
      this.graph.lanePart(lane, poi.s, lane.length),
      this.graph.turnPart(this.graph.turn(lane, out)),
      this.graph.lanePart(out, 0, Math.min(out.length, 160)),
    ];
  }

  private onArrive() {
    if (this.leadResolve) {
      const resolve = this.leadResolve;
      this.leadResolve = undefined;
      resolve();
      return;
    }
    if (this.pendingPoi && !this.active) {
      const poi = this.pendingPoi;
      this.pendingPoi = undefined;
      void this.startScene(poi);
      return;
    }
    if (this.destination) {
      const pos = this.player.lanePosition();
      if (pos && pos.lane === this.destination.lane && Math.abs(pos.s - this.destination.s) < 2) {
        this.destination = undefined;
        this.pinGfx.clear();
      }
    }
  }

  // ─── Сцена у точки ───────────────────────────────────────────────────────────

  private async startScene(poi: Poi, index = 0) {
    const placement = poi.queue[index];
    const question = this.questions.get(placement.id);
    if (!question) return;
    if (this.leaving) this.finishLeaving(true);
    if (this.destination && this.destination.lane === poi.lane && Math.abs(this.destination.s - poi.s) < 2) {
      this.destination = undefined;
      this.pinGfx.clear();
    }

    const info = TEMPLATES[placement.template];
    const series: SeriesInfo = { index, total: poi.queue.length, point: poi.point.title };
    this.host.onSceneStart?.(info.minigame);
    if (info.minigame) {
      await this.startMinigame(poi, index, placement, question, series);
      return;
    }
    const kit = new SceneKit(this, poi.anchor, headingAngle(poi.dir));
    const playerLocal = kit.toLocal(this.player.position);
    const focusLocal = info.anchor === 'node' ? { x: 0, y: playerLocal.y * 0.45 } : { x: 0, y: playerLocal.y - 120 };
    const active: ActiveScene = {
      poi,
      placement,
      index,
      kit,
      script: undefined as unknown as SceneScript,
      exit: this.exitPath(poi, placement.params.maneuver),
      exitOffset: 0,
      focus: kit.toWorld(focusLocal),
    };
    this.active = active;
    poi.marker.setVisible(false);

    const signal = this.signalAt(poi);
    if (signal) signal.paused = true;
    const lights = signal ? this.lightsFor(poi, signal) : undefined;

    active.script = createScript(placement.template, {
      kit,
      params: placement.params,
      player: playerLocal,
      radius: this.graph.radius(poi.lane.to.id),
      leadIn: (d) => this.leadIn(active, d),
      lurch: () => this.leadIn(active, 14),
      lights,
    });
    this.atmosphere.set(sceneConditions(placement.template, placement.params));
    this.focusVisible(1);

    await active.script.enter();
    if (this.active !== active) return;
    this.host.showQuestion(question, placement, info, { ...series, caption: active.script.caption });
  }

  /** Мини-игра: машина стоит у здания, поверх города открывается сцена мини-игры. */
  private async startMinigame(poi: Poi, index: number, placement: Placement, question: Question, series: SeriesInfo) {
    poi.marker.setVisible(false);
    const active: ActiveScene = {
      poi,
      placement,
      index,
      script: undefined as unknown as SceneScript,
      exit: this.exitPath(poi, undefined),
      exitOffset: 0,
      focus: poi.anchor,
    };
    this.active = active;
    const interior = this.interior ?? (await this.launchInterior());
    if (this.active !== active) return;
    this.interior = interior;
    active.interior = interior;
    await interior.open(placement.template as MinigameKind);
    active.script = interior.script({ placement, index, total: poi.queue.length });
    await active.script.enter();
    if (this.active !== active) return;
    this.host.showQuestion(question, placement, TEMPLATES[placement.template], { ...series, caption: active.script.caption });
  }

  private launchInterior(): Promise<InteriorScene> {
    return new Promise((resolve) => {
      this.scene.launch('interior', { onReady: (scene: InteriorScene) => resolve(scene) });
    });
  }

  private leadIn(active: ActiveScene, dist: number): Promise<void> {
    const rest = this.graph.splitPath(active.exit, active.exitOffset)[1];
    const segment = this.graph.splitPath(rest, dist)[0];
    active.exitOffset += dist;
    return new Promise((resolve) => {
      this.leadResolve = resolve;
      this.player.setPath(segment);
    });
  }

  /** Светофоры перекрёстка относительно игрока: свой, встречный, слева, справа. */
  private lightsFor(poi: Poi, signal: Signal) {
    const own = poi.lane.dir;
    const right = rightNormal(own);
    const pick = (want: Vec) => {
      let best: TrafficLightView | undefined;
      let score = -Infinity;
      for (const [id, view] of signal.byLane) {
        const s = dot(this.graph.lane(id).dir, want);
        if (s > score) {
          score = s;
          best = view;
        }
      }
      return best!;
    };
    return {
      own: signal.byLane.get(poi.lane.id)!,
      oncoming: pick({ x: -own.x, y: -own.y }),
      // Слева подъезжают машины, едущие вправо относительно игрока, и наоборот.
      left: pick(right),
      right: pick({ x: -right.x, y: -right.y }),
    };
  }

  private finishLeaving(immediate = false) {
    const l = this.leaving;
    if (!l) return;
    this.leaving = undefined;
    if (l.signal) l.signal.paused = false;
    this.atmosphere.clear();
    if (immediate) l.kit.destroy();
    else void l.kit.fadeOut(500);
  }

  // ─── Управление ──────────────────────────────────────────────────────────────

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    this.pointerDown = { x: pointer.x, y: pointer.y, time: this.time.now };
    if (this.control === 'joystick' && !this.active && !this.overview) {
      this.joy = { active: true, dir: this.joy.dir, mag: 0, knob: { x: 0, y: 0 } };
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pointerDown || !this.joy.active) return;
    const dx = (pointer.x - this.pointerDown.x) / PIXEL_RATIO;
    const dy = (pointer.y - this.pointerDown.y) / PIXEL_RATIO;
    const l = Math.hypot(dx, dy);
    const k = l > JOY_RADIUS ? JOY_RADIUS / l : 1;
    this.joy.knob = { x: dx * k, y: dy * k };
    this.joy.mag = Math.min(1, l / JOY_RADIUS);
    if (l > 4) this.joy.dir = normalize({ x: dx, y: dy });
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    const down = this.pointerDown;
    this.pointerDown = undefined;
    this.joy.active = false;
    this.joy.mag = 0;
    if (!down || this.active) return;
    const moved = Math.hypot(pointer.x - down.x, pointer.y - down.y) / PIXEL_RATIO;
    if (moved > TAP_MOVE_LIMIT) return;
    if (this.control === 'tap' || this.overview) this.handleTap(this.cameras.main.getWorldPoint(pointer.x, pointer.y));
  }

  private handleTap(world: Vec) {
    const worldZoom = this.cameras.main.zoom / PIXEL_RATIO;
    let target: { lane: Lane; s: number } | undefined;
    for (const poi of this.pois) {
      if (poi.cooldown) continue;
      if (distance(world, { x: poi.marker.x, y: poi.marker.y }) < 30 / Math.min(1, worldZoom)) target = { lane: poi.lane, s: poi.s };
    }
    if (!target) {
      const near = this.graph.nearest(world);
      if (!near || near.dist > 60 / Math.min(1, worldZoom)) {
        this.showMiss(world);
        return;
      }
      target = { lane: near.lane, s: Phaser.Math.Clamp(near.s, 0, near.lane.length) };
    }
    this.destination = target;
    this.driveTo(target);
    if (this.overview) this.setOverview(false);
  }

  private driveJoystick() {
    if (this.active) return;
    if (!this.joy.active || this.joy.mag < 0.25) {
      if (this.joyWasActive) {
        this.joyWasActive = false;
        // Палец отпустили — машина плавно останавливается. Точка интереса остаётся целью,
        // только если до неё уже не успеть затормозить.
        const before = this.player.remaining();
        this.player.stopSoon();
        if (this.player.remaining() < before - 0.5) this.pendingPoi = undefined;
      }
      return;
    }
    this.joyWasActive = true;
    this.player.throttle = 0.35 + 0.65 * this.joy.mag;
    const heading = { x: Math.sin(this.player.angle), y: -Math.cos(this.player.angle) };

    // Потянули назад на медленном ходу — разворот на дороге.
    if (dot(this.joy.dir, heading) < -0.75 && this.player.speed < 25) {
      const pos = this.player.lanePosition();
      const u = pos ? this.graph.uTurnOnRoad(pos.lane, pos.s) : null;
      if (u) {
        const clipped = this.clip(u);
        this.pendingPoi = clipped.poi;
        this.player.setPath(clipped.parts);
        return;
      }
    }
    if (this.pendingPoi) return;

    // Пересмотреть ещё не начатый поворот, если джойстик повернули в другую сторону.
    const ahead = this.player.ahead();
    const turnIndex = ahead.findIndex((p, i) => i > 0 && p.kind === 'turn');
    if (turnIndex > 0) {
      const turn = ahead[turnIndex];
      const before = ahead.slice(0, turnIndex).reduce((s, p) => s + (p.kind === 'lane' ? p.s1 - p.s0 : 0), 0);
      if (turn.kind === 'turn' && before > 25) {
        const best = this.chooseExit(turn.turn.from);
        if (best && best !== turn.turn.to) {
          this.player.setPath(ahead.slice(0, turnIndex));
        }
      }
    }

    if (this.player.remaining() < 160) {
      const last = this.player.lastPart();
      let extra: PathPart[] = [];
      if (last.kind === 'lane') {
        if (last.s1 < last.lane.length - 0.5) extra = [this.graph.lanePart(last.lane, last.s1, last.lane.length)];
        else {
          const next = this.chooseExit(last.lane);
          if (next) extra = [this.graph.turnPart(this.graph.turn(last.lane, next)), this.graph.lanePart(next, 0, next.length)];
        }
      } else extra = [this.graph.lanePart(last.turn.to, 0, last.turn.to.length)];
      const clipped = this.clip(extra);
      this.pendingPoi = clipped.poi;
      this.player.append(clipped.parts);
    }
  }

  private chooseExit(lane: Lane): Lane | undefined {
    const all = this.graph.outgoing.get(lane.to.id) ?? [];
    const candidates = all.filter((l) => l.to.id !== lane.from.id || all.length === 1 || lane.to.kind === 'end');
    let best: Lane | undefined;
    let score = -Infinity;
    for (const c of candidates) {
      const s = dot(this.joy.dir, c.dir);
      if (s > score) {
        score = s;
        best = c;
      }
    }
    return best;
  }

  private setOverview(on: boolean) {
    this.overview = on;
    const cam = this.cameras.main;
    const b = this.graph.map.bounds;
    if (on) {
      cam.stopFollow();
      // Карта целиком может быть меньше экрана — без границ её можно поставить по центру.
      cam.removeBounds();
      const zoom = Math.min(cam.width / b.width, cam.height / b.height);
      cam.zoomTo(zoom, 450, 'Sine.easeInOut', true);
      cam.pan(b.x + b.width / 2, b.y + b.height / 2, 450, 'Sine.easeInOut', true);
    } else {
      cam.setBounds(b.x, b.y, b.width, b.height);
      cam.zoomTo(PIXEL_RATIO, 450, 'Sine.easeInOut', true);
      cam.startFollow(this.player.container, true, 0.1, 0.1);
    }
    this.host.onOverviewChange?.(on);
  }

  // ─── Кадр ────────────────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.control === 'joystick') this.driveJoystick();
    this.player.update(dt);
    this.active?.kit?.update(dt);
    this.updateSignals(dt);

    if (this.leaving) {
      this.leaving.kit.update(dt);
      this.leaving.since += dt;
      if (this.leaving.since > 5 || distance(this.player.position, this.leaving.anchor) > 260) this.finishLeaving();
    }
    for (const poi of this.pois) {
      if (poi.cooldown && poi !== this.active?.poi && distance(this.player.position, poi.anchor) > 260) {
        poi.cooldown = false;
        poi.marker.setVisible(true);
      }
    }

    const cam = this.cameras.main;
    const worldZoom = cam.zoom / PIXEL_RATIO;
    const k = worldZoom < 0.6 ? Math.min(3.2, 0.6 / worldZoom) : 1;
    for (const poi of this.pois) {
      poi.marker.setScale(k);
      // В обзоре подписаны только здания мини-игр, иначе подписи налезают друг на друга.
      poi.title.setAlpha(worldZoom < 0.6 && TEMPLATES[poi.point.template].minigame ? 1 : 0);
    }

    const sources = [{ p: this.player.position, angle: this.player.angle, high: false }];
    if (this.active?.kit) sources.push(...this.active.kit.headlightSources());
    if (this.leaving) sources.push(...this.leaving.kit.headlightSources());
    this.atmosphere.update(dt, sources);

    const v = cam.worldView;
    // Обзор включается и во время плавного отдаления, чтобы не запекать весь район по кускам.
    this.mapView.update({ x: v.x, y: v.y, w: v.width, h: v.height }, this.overview || worldZoom < 0.7);
    this.drawJoystick();
  }

  private drawJoystick() {
    const g = this.joyGfx.clear();
    if (this.control !== 'joystick' || !this.joy.active || !this.pointerDown) return;
    const cam = this.cameras.main;
    const scaleK = PIXEL_RATIO / cam.zoom;
    const base = cam.getWorldPoint(this.pointerDown.x, this.pointerDown.y);
    g.fillStyle(0x000000, 0.25).fillCircle(base.x, base.y, JOY_RADIUS * scaleK);
    g.lineStyle(2 * scaleK, 0xffffff, 0.6).strokeCircle(base.x, base.y, JOY_RADIUS * scaleK);
    g.fillStyle(0xffb703, 0.9).fillCircle(base.x + this.joy.knob.x * scaleK, base.y + this.joy.knob.y * scaleK, 22 * scaleK);
  }

  private drawPin(p: Vec) {
    const g = this.pinGfx.clear();
    g.fillStyle(0x000000, 0.25).fillEllipse(p.x + 2, p.y + 2, 14, 6);
    g.fillStyle(0x3a86ff).fillCircle(p.x, p.y - 16, 8);
    g.fillTriangle(p.x - 6, p.y - 12, p.x + 6, p.y - 12, p.x, p.y);
    g.fillStyle(0xffffff).fillCircle(p.x, p.y - 16, 3);
  }

  private showMiss(p: Vec) {
    const g = this.add.graphics().setDepth(20);
    g.lineStyle(3, 0xd62839).lineBetween(p.x - 8, p.y - 8, p.x + 8, p.y + 8).lineBetween(p.x - 8, p.y + 8, p.x + 8, p.y - 8);
    this.tweens.add({ targets: g, alpha: 0, duration: 600, delay: 200, onComplete: () => g.destroy() });
  }
}
