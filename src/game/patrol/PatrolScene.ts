/**
 * «Один день Соколова» (этап 12): вид сверху на регулируемый перекрёсток района, рядом машина
 * ДПС. Поток машин и пешеходов — тот же, что в городе; нарушителей назначает и проверяет
 * src/world/patrol.ts. Касание машины — «Поймал!» или ошибка; что дальше, решает экран
 * (src/ui/patrolScreen.ts): вопрос, счёт, конец смены.
 */
import * as Phaser from 'phaser';
import { add, distance, scale, type Vec } from '../../world/geometry.ts';
import type { MapPoint } from '../../world/map.ts';
import { MAPS } from '../../world/mapping.ts';
import { PatrolDirector, lightAt, patrolEnv, patrolPost, patrolSignals, type PatrolPost, type Suspect, type TapResult } from '../../world/patrol.ts';
import { LANE_WIDTH, RoadGraph, roadHalfWidth } from '../../world/roadGraph.ts';
import { crossingCenter, noStopLane, ZEBRA_HALF_DEPTH } from '../../world/districtRules.ts';
import { TrafficSim, type Light, type TrafficEnv } from '../../world/traffic.ts';
import { bakedTexture } from '../bake.ts';
import { PIXEL_RATIO } from '../display.ts';
import { VEHICLE_SIZE, drawVehicle } from '../city/art.ts';
import { MapRenderer } from '../city/mapRenderer.ts';
import { TrafficLightView, createSign } from '../city/signs.ts';
import { TrafficView } from '../city/trafficView.ts';

export interface PatrolHost {
  /** Пойман нарушитель: машина у обочины, сцена ждёт release(). */
  onCatch(s: Suspect): void;
  /** Касание добросовестного водителя. */
  onInnocent(): void;
  /** Нарушитель уехал непойманным. */
  onMiss(s: Suspect): void;
  /** Радар: самая быстрая машина в кадре. */
  onRadar(r: { kmh: number; limit: number } | undefined): void;
}

export interface PatrolData {
  host: PatrolHost;
  /** Карта района (MAPS) и точки главы — как в городе. */
  map: string;
  points: MapPoint[];
}

/** Сколько точек мира должно поместиться по ширине экрана. */
const VIEW_WIDTH = 440;

export class PatrolScene extends Phaser.Scene {
  private host!: PatrolHost;
  private mapKey = '';
  private points: MapPoint[] = [];
  private graph!: RoadGraph;
  private post!: PatrolPost;
  private mapView!: MapRenderer;
  private traffic!: TrafficSim;
  private trafficView!: TrafficView;
  private director!: PatrolDirector;
  private signalViews: Array<{ lane: string; view: TrafficLightView; state?: Light }> = [];
  private signal!: TrafficEnv['signal'];
  private clock = 0;
  private maintainClock = 0;
  private radarClock = 0;
  private fx!: Phaser.GameObjects.Graphics;
  private beacon!: Phaser.GameObjects.Graphics;

  constructor() {
    super('patrol');
  }

  init(data: PatrolData) {
    this.host = data.host;
    this.mapKey = data.map;
    this.points = data.points;
    this.signalViews = [];
    this.clock = 0;
    this.maintainClock = 0;
    this.radarClock = 0;
  }

  create() {
    const map = MAPS[this.mapKey];
    this.graph = new RoadGraph(map);
    this.post = patrolPost(this.graph, this.points);
    this.mapView = new MapRenderer(this, this.graph, this.points, this.post.rules);
    this.signal = patrolSignals(this.graph, this.post.rules, () => this.clock);
    this.buildLights();
    this.buildSigns();
    this.buildPoliceCar();
    this.fx = this.add.graphics().setDepth(4.2);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#5b9a4f');
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this));

    this.traffic = new TrafficSim(this.graph, this.points, Math.random, { rules: this.post.rules, cars: 22, walkers: 12 });
    this.trafficView = new TrafficView(this, this.traffic);
    this.director = new PatrolDirector(this.graph, this.post, this.traffic, Math.random, () => this.clock);
    this.traffic.maintain(this.env(), true);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onTap(this.cameras.main.getWorldPoint(p.x, p.y)));
  }

  /** Перекрёсток целиком на экране: масштаб по ширине, центр чуть выше середины (внизу — подсказка). */
  private fitCamera() {
    const cam = this.cameras.main;
    const widthCss = cam.width / PIXEL_RATIO;
    const zoom = Math.min(1, widthCss / VIEW_WIDTH);
    cam.setZoom(PIXEL_RATIO * zoom);
    cam.centerOn(this.post.view.x, this.post.view.y);
  }

  private env(): TrafficEnv {
    const v = this.cameras.main.worldView;
    return patrolEnv({ x: v.x, y: v.y, w: v.width, h: v.height }, this.signal);
  }

  /** Светофоры у всех регулируемых перекрёстков района (видны те, что в кадре). */
  private buildLights() {
    for (const nodeId of this.post.rules.signals) {
      const node = this.graph.node(nodeId);
      const r = this.graph.radius(nodeId);
      for (const lane of this.graph.lanes.values()) {
        if (lane.to.id !== nodeId) continue;
        const view = new TrafficLightView(this);
        const pos = { x: node.x - lane.dir.x * (r + 30) + lane.normal.x * (r + 14), y: node.y - lane.dir.y * (r + 30) + lane.normal.y * (r + 14) };
        view.container.setPosition(pos.x, pos.y).setDepth(7);
        this.signalViews.push({ lane: lane.id, view });
      }
    }
  }

  /** «Пешеходный переход» у городских переходов и «Остановка запрещена» в начале зоны у поста. */
  private buildSigns() {
    const put = (code: string, p: Vec) => createSign(this, code).setPosition(p.x, p.y).setDepth(7);
    for (const c of this.post.rules.crossings) {
      const center = crossingCenter(this.graph, c);
      const lane = this.graph.laneFor(c.road, c.toward);
      for (const l of [lane, this.graph.opposite(lane)]) {
        const side = roadHalfWidth(l.road) + 7;
        put('5.19.1', { x: center.x - l.dir.x * (ZEBRA_HALF_DEPTH + 4) + l.normal.x * side, y: center.y - l.dir.y * (ZEBRA_HALF_DEPTH + 4) + l.normal.y * side });
      }
    }
    for (const z of this.post.rules.noStop) {
      const { lane, s0 } = noStopLane(this.graph, z);
      const p = this.graph.pointOnLane(lane, s0);
      put('3.27', { x: p.x + lane.normal.x * (LANE_WIDTH / 2 + 7), y: p.y + lane.normal.y * (LANE_WIDTH / 2 + 7) });
    }
  }

  /** Машина ДПС у поста и мигалка на крыше. */
  private buildPoliceCar() {
    const size = VEHICLE_SIZE.police;
    const key = bakedTexture(this, 'vehicle:police:0', size.w + 24, size.h + 24, (g) => drawVehicle(g, 'police'));
    const { pos, angle } = this.post.car;
    this.add.image(pos.x, pos.y, key).setScale(1 / PIXEL_RATIO).setRotation(angle).setDepth(4);
    this.beacon = this.add.graphics().setDepth(4.1).setPosition(pos.x, pos.y).setRotation(angle);
  }

  private onTap(p: Vec) {
    if (!this.sys.isActive()) return;
    const r: TapResult = this.director.tap(p);
    if (r.kind === 'caught') {
      this.cameras.main.shake(120, 0.003);
      this.host.onCatch(r.suspect);
    } else if (r.kind === 'innocent') {
      this.showCross(r.car.pos);
      this.host.onInnocent();
    }
  }

  /** После вопроса нарушитель уезжает. */
  release(s: Suspect) {
    this.director.release(s);
  }

  get stats() {
    return this.director.suspects;
  }

  private showCross(p: Vec) {
    const g = this.add.graphics().setDepth(20);
    g.lineStyle(4, 0xd62839).lineBetween(p.x - 10, p.y - 10, p.x + 10, p.y + 10).lineBetween(p.x - 10, p.y + 10, p.x + 10, p.y - 10);
    this.tweens.add({ targets: g, alpha: 0, duration: 700, delay: 250, onComplete: () => g.destroy() });
  }

  /** Аварийка у стоящего нарушителя и у остановленной машины, мигалка ДПС. */
  private drawFx() {
    const blink = Math.floor(this.clock * 3) % 2 === 0;
    const g = this.fx.clear();
    for (const c of this.traffic.cars) {
      if (c.gone || c.alpha < 0.3) continue;
      const stopped = c.violate?.kind === 'no-stopping' && c.violate.hold > 0 && c.speed < 4 && c.lane === c.violate.lane && Math.abs(c.s - c.violate.s) < 6;
      if (!(stopped || c.held) || !blink) continue;
      const d = { x: Math.sin(c.heading), y: -Math.cos(c.heading) };
      const n = { x: -d.y, y: d.x };
      g.fillStyle(0xffa62b, 0.95);
      for (const along of [c.half - 3, -(c.half - 3)]) for (const side of [-6, 6]) {
        const p = add(add(c.pos, scale(d, along)), scale(n, side));
        g.fillCircle(p.x, p.y, 2.6);
      }
    }
    const b = this.beacon.clear();
    const t = Math.floor(this.clock * 4) % 2;
    b.fillStyle(t ? 0x1d4ed8 : 0xe63946, 1).fillRect(-6, -2, 6, 4);
    b.fillStyle(t ? 0xe63946 : 0x1d4ed8, 1).fillRect(0, -2, 6, 4);
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.clock += dt;
    for (const l of this.signalViews) {
      l.view.update(dt);
      const state = lightAt(this.clock, this.graph.lane(l.lane));
      if (state !== l.state) {
        l.state = state;
        l.view.setState(state);
      }
    }
    const env = this.env();
    this.traffic.update(dt, env);
    this.maintainClock += dt;
    if (this.maintainClock > 0.5) {
      this.maintainClock = 0;
      this.traffic.maintain(env);
    }
    for (const e of this.director.update(dt, env)) if (e.kind === 'missed') this.host.onMiss(e.suspect);
    this.radarClock += dt;
    if (this.radarClock > 0.25) {
      this.radarClock = 0;
      this.host.onRadar(this.director.radar(env.view));
    }

    const cam = this.cameras.main;
    const view = cam.worldView;
    const margin = 60;
    for (const l of this.signalViews) l.view.container.setVisible(l.view.container.x > view.x - margin && l.view.container.x < view.right + margin && l.view.container.y > view.y - margin && l.view.container.y < view.bottom + margin);
    this.trafficView.update(true, view);
    this.drawFx();
    this.mapView.update({ x: view.x, y: view.y, w: view.width, h: view.height }, false);
  }

  /** Для автотестов: где нарушитель (если есть) и где добросовестная машина. */
  debugTargets(kind?: string): { violator?: Vec; innocent?: Vec } {
    const cam = this.cameras.main;
    const toScreen = (p: Vec) => ({ x: (p.x - cam.worldView.x) * (cam.zoom / PIXEL_RATIO), y: (p.y - cam.worldView.y) * (cam.zoom / PIXEL_RATIO) });
    const s = this.director.suspects.find((x) => x.violation && !x.done && !x.car.gone && (!kind || x.kind === kind));
    const v = cam.worldView;
    const innocent = this.traffic.cars.find(
      (c) => !c.gone && c.alpha > 0.9 && !c.violate && !c.held && c.pos.x > v.x + 30 && c.pos.x < v.right - 30 && c.pos.y > v.y + 120 && c.pos.y < v.bottom - 160 && this.traffic.cars.every((o) => o === c || o.gone || distance(o.pos, c.pos) > 60),
    );
    return { violator: s ? toScreen(s.car.pos) : undefined, innocent: innocent ? toScreen(innocent.pos) : undefined };
  }
}
