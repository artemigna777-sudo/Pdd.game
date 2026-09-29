/**
 * Правила района (этап 8): где стоят светофоры и пешеходные переходы, на какой дороге сплошная
 * осевая линия (1.1) и где действует знак «Остановка запрещена» (3.27). Считается из карты и
 * точек главы всегда одинаково — игра, поток и тесты видят один и тот же город.
 *
 * Светофоры и переходы точек интереса остаются как есть. К ним добавляются «городские», чтобы
 * в каждом районе было не меньше двух регулируемых перекрёстков и двух нерегулируемых
 * переходов, а ещё одна дорога со сплошной осевой и одна зона «Остановка запрещена».
 * Их ставим подальше от сцен с вопросами: картинка сцены не должна расходиться с вопросом.
 */
import { add, distance, scale, type Vec } from './geometry.ts';
import type { MapPoint, MapRoad } from './map.ts';
import { roadHalfWidth, type Lane, type RoadGraph } from './roadGraph.ts';
import { TEMPLATES } from './templates.ts';

/** Нерегулируемый пешеходный переход на участке дороги. */
export interface Crossing {
  /** Ключ перехода (так его знает поток). */
  key: string;
  road: string;
  /** Узел, к которому ведёт полоса отсчёта. */
  toward: string;
  /** Доля пути между центрами узлов, считая от противоположного `toward` узла. */
  at: number;
  /** Переход точки интереса «Пешеходный переход» (знаки ставит сцена). */
  poi?: boolean;
}

/** Зона знака «Остановка запрещена» на правой стороне полосы. */
export interface NoStopZone {
  road: string;
  toward: string;
  /** Начало и конец зоны — доли длины полосы. */
  from: number;
  to: number;
}

export interface DistrictRules {
  /** Регулируемые перекрёстки (id узлов). */
  signals: string[];
  crossings: Crossing[];
  /** Дороги со сплошной осевой линией: разворачиваться через неё нельзя. */
  solid: string[];
  noStop: NoStopZone[];
}

/** Пешеходный переход в мире: середина, направление дороги, полуширина проезжей части. */
export interface Zebra {
  key: string;
  center: Vec;
  /** Направление дороги (вдоль него машины пересекают переход). */
  along: Vec;
  halfWidth: number;
  road: MapRoad;
  /** Переход у регулируемого перекрёстка: узел и полоса, въезжающая в перекрёсток по этой дороге. */
  node?: string;
  signalLane?: string;
  /** Нерегулируемый переход: полосы и места перехода на них. */
  lanes: Array<{ lane: Lane; s: number }>;
}

/** Половина ширины «зебры» вдоль дороги. */
export const ZEBRA_HALF_DEPTH = 8;
/** Середина перехода у регулируемого перекрёстка — на столько дальше края перекрёстка. */
export const JUNCTION_ZEBRA = 12;
/** Стоп-линия — на столько раньше края регулируемого перекрёстка. */
export const STOP_LINE = 26;

const MIN_SIGNALS = 2;
const MIN_CROSSINGS = 2;
/** Городские переходы не ставим ближе этого к сценам с вопросами. */
const SCENE_CLEARANCE = 170;
/** Светофор не ставим на перекрёсток, к которому ближе этого подъезжает сцена на дороге… */
const SCENE_AHEAD = 250;
/** …и совсем рядом за сценой. */
const SCENE_BEHIND = 100;

const isCity = (r: MapRoad) => (r.kind ?? 'city') === 'city' && r.lanes !== 2;
const nodeDist = (graph: RoadGraph, r: MapRoad) => distance(graph.node(r.from), graph.node(r.to));

/** Где сцена точки на участке дороги (как в roadGraph.pointStop). */
function roadAnchor(graph: RoadGraph, p: MapPoint): Vec {
  const lane = graph.laneFor(p.road, p.toward);
  return add(lane.from, scale(lane.dir, (p.at ?? 0.5) * distance(lane.from, lane.to)));
}

/** Середина нерегулируемого перехода. */
export function crossingCenter(graph: RoadGraph, c: Pick<Crossing, 'road' | 'toward' | 'at'>): Vec {
  const lane = graph.laneFor(c.road, c.toward);
  return add(lane.from, scale(lane.dir, c.at * distance(lane.from, lane.to)));
}

/**
 * Кандидат подальше от уже выбранных (не ближе `min`); первый — поближе к середине района.
 * Детерминированно: при равенстве побеждает стоящий раньше.
 */
function spread<T>(candidates: T[], chosen: Vec[], at: (c: T) => Vec, min: number, center: Vec): T | undefined {
  let best: T | undefined;
  let score = -Infinity;
  for (const c of candidates) {
    const p = at(c);
    const d = chosen.length ? Math.min(...chosen.map((q) => distance(q, p))) : Infinity;
    if (d < min) continue;
    const s = chosen.length ? d : -distance(p, center);
    if (s > score + 1e-6) {
      score = s;
      best = c;
    }
  }
  return best;
}

export function districtRules(graph: RoadGraph, points: readonly MapPoint[]): DistrictRules {
  const map = graph.map;
  const roadPois = points.filter((p) => TEMPLATES[p.template].anchor === 'road');
  const nodePois = points.filter((p) => TEMPLATES[p.template].anchor === 'node');
  const sceneRoads = new Set(roadPois.map((p) => p.road));
  const approachRoads = new Set(nodePois.map((p) => p.road));
  const sceneAnchors = [...roadPois.map((p) => roadAnchor(graph, p)), ...nodePois.map((p) => graph.node(p.toward) as Vec)];
  const incident = (id: string) => map.roads.filter((r) => r.from === id || r.to === id);
  const xs = map.nodes.map((n) => n.x);
  const ys = map.nodes.map((n) => n.y);
  const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };

  // ─── Светофоры ───
  const signals = [...new Set(points.filter((p) => p.template === 'signalized').map((p) => p.toward))];
  const busyNodes = new Set(nodePois.map((p) => p.toward));
  // Сцена на дороге смотрит вперёд, на узел, к которому едет игрок: там светофор мог бы
  // разойтись с картинкой вопроса. Мини-игры идут в помещении — им светофор не мешает.
  const roadScenes = roadPois.filter((p) => !TEMPLATES[p.template].minigame);
  const seenByScene = (nodeId: string) =>
    roadScenes.some((p) => (p.toward === nodeId && distance(roadAnchor(graph, p), graph.node(nodeId)) < SCENE_AHEAD) || distance(roadAnchor(graph, p), graph.node(nodeId)) < SCENE_BEHIND);
  const nodeCandidates = map.nodes.filter((n) => {
    const roads = incident(n.id);
    return (n.kind ?? 'junction') === 'junction' && roads.length >= 3 && roads.every((r) => r.lanes !== 2) && roads.filter(isCity).length >= 2 && !busyNodes.has(n.id) && !seenByScene(n.id);
  });
  while (signals.length < MIN_SIGNALS) {
    const chosen = signals.map((id) => graph.node(id) as Vec);
    const pick = spread(
      nodeCandidates.filter((n) => !signals.includes(n.id)),
      chosen,
      (n) => n,
      400,
      center,
    );
    if (!pick) break;
    signals.push(pick.id);
  }

  // ─── Переходы ───
  const crossings: Crossing[] = points
    .filter((p) => p.template === 'crosswalk')
    .map((p) => ({ key: `poi:${p.id}`, road: p.road, toward: p.toward, at: p.at ?? 0.5, poi: true }));
  const roadCandidates = (extra: (r: MapRoad) => boolean) =>
    map.roads.filter((r) => isCity(r) && !sceneRoads.has(r.id) && nodeDist(graph, r) >= 400 && extra(r));
  // Сначала — подъезды к перекрёсткам с вопросами (там всё равно не ставятся флажок доставки и поручения).
  const byPreference = (list: MapRoad[]) => [...list.filter((r) => approachRoads.has(r.id)), ...list.filter((r) => !approachRoads.has(r.id))];
  const mid = (r: MapRoad): Crossing => ({ key: `x:${r.id}`, road: r.id, toward: r.to, at: 0.5 });
  const clearOfScenes = (c: Crossing) => sceneAnchors.every((a) => distance(a, crossingCenter(graph, c)) > SCENE_CLEARANCE);
  while (crossings.length < MIN_CROSSINGS) {
    const used = new Set(crossings.map((c) => c.road));
    const pool = byPreference(roadCandidates((r) => !used.has(r.id) && clearOfScenes(mid(r))));
    const chosen = crossings.map((c) => crossingCenter(graph, c));
    // Из подъездов к перекрёсткам — самый далёкий от уже выбранных; если таких нет — из остальных.
    const pick =
      spread(
        pool.filter((r) => approachRoads.has(r.id)),
        chosen,
        (r) => crossingCenter(graph, mid(r)),
        500,
        center,
      ) ?? spread(pool, chosen, (r) => crossingCenter(graph, mid(r)), 300, center);
    if (!pick) break;
    crossings.push(mid(pick));
  }

  // ─── Сплошная осевая: самая длинная дорога без сцен и переходов ───
  const crossingRoads = new Set(crossings.map((c) => c.road));
  const solidPool = map.roads
    .filter((r) => r.kind !== 'highway' && !sceneRoads.has(r.id) && !crossingRoads.has(r.id) && nodeDist(graph, r) >= 400)
    .sort((a, b) => Number(approachRoads.has(a.id)) - Number(approachRoads.has(b.id)) || nodeDist(graph, b) - nodeDist(graph, a) || a.id.localeCompare(b.id));
  const solid = solidPool.length ? [solidPool[0].id] : [];

  // ─── Зона «Остановка запрещена» ───
  const zonePool = byPreference(roadCandidates((r) => !crossingRoads.has(r.id) && !solid.includes(r.id)));
  const noStop: NoStopZone[] = [];
  const zoneRoad = zonePool[0];
  if (zoneRoad) {
    // На подъезде к перекрёстку с вопросом — зона на встречной ему полосе, подальше от места сцены.
    const poi = nodePois.find((p) => p.road === zoneRoad.id);
    const toward = poi ? (poi.toward === zoneRoad.to ? zoneRoad.from : zoneRoad.to) : zoneRoad.to;
    noStop.push({ road: zoneRoad.id, toward, from: 0.25, to: 0.7 });
  }

  return { signals, crossings, solid, noStop };
}

/** Все пешеходные переходы района: у регулируемых перекрёстков (на каждом подходе) и на участках дорог. */
export function districtZebras(graph: RoadGraph, rules: DistrictRules): Zebra[] {
  const zebras: Zebra[] = [];
  for (const nodeId of rules.signals) {
    const node = graph.node(nodeId);
    const r = graph.radius(nodeId);
    for (const out of graph.outgoing.get(nodeId) ?? []) {
      const into = graph.opposite(out);
      zebras.push({
        key: `${nodeId}|${out.road.id}`,
        center: add(node, scale(out.dir, r + JUNCTION_ZEBRA)),
        along: out.dir,
        halfWidth: roadHalfWidth(out.road),
        road: out.road,
        node: nodeId,
        signalLane: into.id,
        lanes: [
          { lane: into, s: into.length - JUNCTION_ZEBRA },
          { lane: out, s: JUNCTION_ZEBRA },
        ],
      });
    }
  }
  for (const c of rules.crossings) {
    const lane = graph.laneFor(c.road, c.toward);
    const back = graph.opposite(lane);
    const s = graph.laneDistanceAt(lane, c.at);
    zebras.push({
      key: c.key,
      center: crossingCenter(graph, c),
      along: lane.dir,
      halfWidth: roadHalfWidth(lane.road),
      road: lane.road,
      lanes: [
        { lane, s },
        { lane: back, s: back.length - s },
      ],
    });
  }
  return zebras;
}

/** Полоса зоны «Остановка запрещена» и её границы вдоль полосы. */
export function noStopLane(graph: RoadGraph, z: NoStopZone): { lane: Lane; s0: number; s1: number } {
  const lane = graph.laneFor(z.road, z.toward);
  return { lane, s0: lane.length * z.from, s1: lane.length * z.to };
}
