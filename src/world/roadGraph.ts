/**
 * Дорожный граф района: полосы (направленные дороги), траектории через перекрёстки и кольцо,
 * поиск маршрута. Без Phaser — это чистая геометрия, её проверяют тесты.
 *
 * Полоса идёт от границы одного узла до границы другого, со сдвигом вправо от оси дороги
 * (правостороннее движение). Игрок едет по крайней правой полосе.
 */
import {
  Polyline,
  add,
  cross,
  cubicBezier,
  distance,
  dot,
  intersectLines,
  lerp,
  normalize,
  projectOnSegment,
  quadBezier,
  rightNormal,
  scale,
  sub,
  vec,
  type Vec,
} from './geometry.ts';
import type { CityMap, MapNode, MapPoint, MapRoad } from './map.ts';
import { TEMPLATES } from './templates.ts';

export const LANE_WIDTH = 30;
export const MEDIAN_WIDTH = 12;
export const RING_OUTER = 88;
export const RING_INNER = 46;
export const RING_LANE = (RING_OUTER + RING_INNER) / 2;
export const DEAD_END_RADIUS = 46;
/** Половина длины машины: позиция машины — её центр, останавливаемся передним бампером. */
export const CAR_HALF_LENGTH = 20;

const SPEED = { city: 150, country: 200, highway: 240, turn: 80, ring: 75, uturn: 55 } as const;

export type TurnKind = 'straight' | 'left' | 'right' | 'uturn' | 'ring';

export interface Lane {
  id: string;
  road: MapRoad;
  from: MapNode;
  to: MapNode;
  dir: Vec;
  normal: Vec;
  start: Vec;
  end: Vec;
  length: number;
  speed: number;
}

export interface Turn {
  from: Lane;
  to: Lane;
  kind: TurnKind;
  path: Polyline;
  speed: number;
}

/** Часть маршрута: отрезок полосы или проезд через узел. */
export type PathPart =
  | { kind: 'lane'; lane: Lane; s0: number; s1: number; points: Vec[]; speed: number }
  | { kind: 'turn'; turn: Turn; points: Vec[]; speed: number };

export const partLength = (part: PathPart): number =>
  part.kind === 'lane' ? part.s1 - part.s0 : new Polyline(part.points).length;

export const roadHalfWidth = (road: MapRoad): number =>
  road.lanes === 2 ? MEDIAN_WIDTH / 2 + 2 * LANE_WIDTH : LANE_WIDTH;

/** Сдвиг крайней правой полосы от оси дороги. */
export const laneOffset = (road: MapRoad): number =>
  road.lanes === 2 ? MEDIAN_WIDTH / 2 + 1.5 * LANE_WIDTH : LANE_WIDTH / 2;

/** Сглаживание ломаной (алгоритм Чайкина), концы сохраняются. */
function chaikin(points: Vec[], iterations: number): Vec[] {
  let pts = points;
  for (let k = 0; k < iterations; k++) {
    const next: Vec[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(lerp(pts[i], pts[i + 1], 0.25), lerp(pts[i], pts[i + 1], 0.75));
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

export class RoadGraph {
  readonly map: CityMap;
  readonly nodes = new Map<string, MapNode>();
  readonly lanes = new Map<string, Lane>();
  /** Полосы, выходящие из узла. */
  readonly outgoing = new Map<string, Lane[]>();
  private readonly radii = new Map<string, number>();
  private readonly turnCache = new Map<string, Turn>();

  constructor(map: CityMap) {
    this.map = map;
    for (const node of map.nodes) {
      this.nodes.set(node.id, node);
      this.outgoing.set(node.id, []);
    }
    for (const node of map.nodes) this.radii.set(node.id, this.computeRadius(node));
    for (const road of map.roads) {
      this.addLane(road, road.from, road.to);
      this.addLane(road, road.to, road.from);
    }
  }

  private computeRadius(node: MapNode): number {
    if (node.kind === 'roundabout') return RING_OUTER;
    if (node.kind === 'end') return DEAD_END_RADIUS;
    const incident = this.map.roads.filter((r) => r.from === node.id || r.to === node.id);
    return Math.max(LANE_WIDTH, ...incident.map(roadHalfWidth));
  }

  radius(nodeId: string): number {
    return this.radii.get(nodeId) ?? LANE_WIDTH;
  }

  private addLane(road: MapRoad, fromId: string, toId: string) {
    const from = this.node(fromId);
    const to = this.node(toId);
    const dir = normalize(sub(to, from));
    const normal = rightNormal(dir);
    const shift = scale(normal, laneOffset(road));
    const start = add(add(from, scale(dir, this.radius(fromId))), shift);
    const end = add(sub(to, scale(dir, this.radius(toId))), shift);
    const lane: Lane = {
      id: `${road.id}>${toId}`,
      road,
      from,
      to,
      dir,
      normal,
      start,
      end,
      length: distance(start, end),
      speed: SPEED[road.kind ?? 'city'],
    };
    this.lanes.set(lane.id, lane);
    this.outgoing.get(fromId)!.push(lane);
  }

  node(id: string): MapNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Нет узла «${id}»`);
    return node;
  }

  lane(id: string): Lane {
    const lane = this.lanes.get(id);
    if (!lane) throw new Error(`Нет полосы «${id}»`);
    return lane;
  }

  laneFor(roadId: string, towardNodeId: string): Lane {
    return this.lane(`${roadId}>${towardNodeId}`);
  }

  /** Встречная полоса той же дороги. */
  opposite(lane: Lane): Lane {
    return this.lane(`${lane.road.id}>${lane.from.id}`);
  }

  pointOnLane(lane: Lane, s: number): Vec {
    return add(lane.start, scale(lane.dir, s));
  }

  /** Расстояние вдоль полосы до точки, лежащей на доле `at` между центрами узлов. */
  laneDistanceAt(lane: Lane, at: number): number {
    return at * distance(lane.from, lane.to) - this.radius(lane.from.id);
  }

  /** Ближайшая к точке позиция на какой-либо полосе. */
  nearest(p: Vec): { lane: Lane; s: number; dist: number } | null {
    let best: { lane: Lane; s: number; dist: number } | null = null;
    for (const lane of this.lanes.values()) {
      const { point, t } = projectOnSegment(p, lane.start, lane.end);
      const d = distance(p, point);
      if (!best || d < best.dist) best = { lane, s: t * lane.length, dist: d };
    }
    return best;
  }

  turnKind(from: Lane, to: Lane): TurnKind {
    if (from.to.kind === 'roundabout') return 'ring';
    const d = dot(from.dir, to.dir);
    if (d > 0.7) return 'straight';
    if (d < -0.7) return 'uturn';
    return cross(from.dir, to.dir) > 0 ? 'right' : 'left';
  }

  /** Траектория проезда узла из полосы `from` в полосу `to` (выходящую из того же узла). */
  turn(from: Lane, to: Lane): Turn {
    const key = `${from.id}|${to.id}`;
    const cached = this.turnCache.get(key);
    if (cached) return cached;

    const kind = this.turnKind(from, to);
    let points: Vec[];
    let speed: number;
    if (kind === 'ring') {
      points = this.ringPath(from, to);
      speed = SPEED.ring;
    } else if (kind === 'straight') {
      points = [from.end, to.start];
      speed = Math.min(from.speed, to.speed);
    } else if (kind === 'uturn') {
      const k = this.radius(from.to.id) * 0.9;
      points = cubicBezier(from.end, add(from.end, scale(from.dir, k)), add(to.start, scale(from.dir, k)), to.start, 14);
      speed = SPEED.uturn;
    } else {
      const control = intersectLines(from.end, from.dir, to.start, to.dir) ?? lerp(from.end, to.start, 0.5);
      points = quadBezier(from.end, control, to.start, 12);
      speed = SPEED.turn;
    }
    const turn: Turn = { from, to, kind, path: new Polyline(points), speed };
    this.turnCache.set(key, turn);
    return turn;
  }

  /** Кольцо: въезд, движение против часовой стрелки (как принято в России), съезд. */
  private ringPath(from: Lane, to: Lane): Vec[] {
    const c = from.to;
    const angle = (p: Vec) => Math.atan2(p.y - c.y, p.x - c.x);
    // При оси y вниз уменьшение угла — движение против часовой стрелки на экране.
    const a0 = angle(from.end) - 0.45;
    let a1 = angle(to.start) + 0.45;
    while (a1 >= a0 - 0.05) a1 -= Math.PI * 2;
    const steps = Math.max(6, Math.ceil((a0 - a1) / 0.2));
    const arc: Vec[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      arc.push(vec(c.x + Math.cos(a) * RING_LANE, c.y + Math.sin(a) * RING_LANE));
    }
    return chaikin([from.end, ...arc, to.start], 2);
  }

  /** Съезды из узла, куда ведёт полоса (без разворота, если есть другие варианты). */
  exits(lane: Lane): Lane[] {
    const all = this.outgoing.get(lane.to.id) ?? [];
    const forward = all.filter((l) => l.to.id !== lane.from.id);
    return forward.length ? forward : all;
  }

  /**
   * Маршрут от позиции (полоса, s) до позиции (полоса, s). Кратчайший по длине, с небольшими
   * штрафами за повороты; разворот на перекрёстке — только если иначе заметно дольше.
   */
  route(fromLane: Lane, fromS: number, toLane: Lane, toS: number): PathPart[] | null {
    if (fromLane === toLane && toS >= fromS) return [this.lanePart(fromLane, fromS, toS)];

    // Дейкстра по полосам: стоимость — длина пути до начала полосы.
    // Стартовая позиция — отдельный источник, сама стартовая полоса — обычная вершина.
    const cost = new Map<string, number>();
    const prev = new Map<string, Lane | 'start'>();
    const done = new Set<string>();
    const queue: Array<{ lane: Lane; cost: number }> = [];

    const relax = (lane: Lane, endCost: number, via: Lane | 'start') => {
      for (const next of this.outgoing.get(lane.to.id) ?? []) {
        const turn = this.turn(lane, next);
        const penalty = turn.kind === 'uturn' ? (lane.to.kind === 'end' ? 10 : 250) : turn.kind === 'straight' ? 0 : 10;
        const c = endCost + turn.path.length + penalty;
        if (c < (cost.get(next.id) ?? Infinity)) {
          cost.set(next.id, c);
          prev.set(next.id, via === 'start' ? 'start' : lane);
          queue.push({ lane: next, cost: c });
        }
      }
    };

    relax(fromLane, fromLane.length - fromS, 'start');
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const { lane, cost: c } = queue.shift()!;
      if (done.has(lane.id)) continue;
      done.add(lane.id);
      if (lane === toLane) break;
      relax(lane, c + lane.length, lane);
    }
    if (!done.has(toLane.id)) return null;

    const chain: Lane[] = [];
    for (let cur: Lane = toLane; ; ) {
      chain.unshift(cur);
      const p = prev.get(cur.id);
      if (!p || p === 'start') break;
      cur = p;
    }

    const parts: PathPart[] = [this.lanePart(fromLane, fromS, fromLane.length), this.turnPart(this.turn(fromLane, chain[0]))];
    chain.forEach((lane, i) => {
      const last = i === chain.length - 1;
      parts.push(this.lanePart(lane, 0, last ? toS : lane.length));
      if (!last) parts.push(this.turnPart(this.turn(lane, chain[i + 1])));
    });
    return parts;
  }

  /** Разрезать маршрут на расстоянии `at` от начала: до и после. */
  splitPath(parts: PathPart[], at: number): [PathPart[], PathPart[]] {
    const before: PathPart[] = [];
    const after: PathPart[] = [];
    let acc = 0;
    for (const part of parts) {
      const len = partLength(part);
      if (acc + len <= at + 1e-6) before.push(part);
      else if (acc >= at) after.push(part);
      else {
        const cut = at - acc;
        if (part.kind === 'lane') {
          before.push(this.lanePart(part.lane, part.s0, part.s0 + cut));
          after.push(this.lanePart(part.lane, part.s0 + cut, part.s1));
        } else {
          const line = new Polyline(part.points);
          const p = line.pointAt(cut);
          before.push({ ...part, points: [...part.points.filter((_, k) => line.cum[k] < cut), p] });
          after.push({ ...part, points: [p, ...part.points.filter((_, k) => line.cum[k] > cut)] });
        }
      }
      acc += len;
    }
    return [before, after];
  }

  lanePart(lane: Lane, s0: number, s1: number): PathPart {
    return { kind: 'lane', lane, s0, s1, points: [this.pointOnLane(lane, s0), this.pointOnLane(lane, s1)], speed: lane.speed };
  }

  turnPart(turn: Turn): PathPart {
    return { kind: 'turn', turn, points: turn.path.points, speed: turn.speed };
  }

  /** Разворот посреди дороги на встречную полосу (кроме автомагистрали). */
  uTurnOnRoad(lane: Lane, s: number): PathPart[] | null {
    if (lane.road.kind === 'highway') return null;
    const back = this.opposite(lane);
    const backS = Math.max(0, Math.min(back.length, back.length - s - 34));
    const p = this.pointOnLane(lane, s);
    const q = this.pointOnLane(back, backS);
    const k = 30;
    const points = cubicBezier(p, add(p, scale(lane.dir, k)), add(q, scale(lane.dir, k)), q, 14);
    const turn: Turn = { from: lane, to: back, kind: 'uturn', path: new Polyline(points), speed: SPEED.uturn };
    return [this.turnPart(turn), this.lanePart(back, backS, backS)];
  }

  /**
   * Где игрок останавливается у точки интереса: полоса подъезда и расстояние вдоль неё
   * (центр машины), а также точка и направление сцены.
   */
  pointStop(point: MapPoint): { lane: Lane; s: number; anchor: Vec; dir: Vec } {
    const lane = this.laneFor(point.road, point.toward);
    const info = TEMPLATES[point.template];
    if (info.anchor === 'node') {
      return { lane, s: lane.length - CAR_HALF_LENGTH - 4, anchor: vec(lane.to.x, lane.to.y), dir: lane.dir };
    }
    const sAnchor = this.laneDistanceAt(lane, point.at ?? 0.5);
    const along = add(lane.from, scale(lane.dir, (point.at ?? 0.5) * distance(lane.from, lane.to)));
    return {
      lane,
      s: Math.max(0, sAnchor - info.stopOffset - CAR_HALF_LENGTH),
      anchor: along,
      dir: lane.dir,
    };
  }
}
