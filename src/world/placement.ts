/**
 * Расстановка точек интереса на карте района.
 *
 * Вопросы главы собраны в серии (несколько вопросов одного шаблона подряд в одной точке).
 * Каждой серии нужно место на карте:
 *  - перекрёсткам — подъезд к узлу: регулируемым — к узлу со светофорами, остальным — к
 *    обычному перекрёстку с четырьмя дорогами, кольцу — к кольцу;
 *  - сценам на дороге и мини-играм — место на участке дороги, переезду — там, где дорога
 *    пересекает железную дорогу, автомагистрали — на автомагистрали.
 * Места выбираются детерминированно и вразнобой, чтобы разные шаблоны перемешались по району.
 */
import { distance } from './geometry.ts';
import type { CityMap, MapNode, MapPoint, MapRoad } from './map.ts';
import { DEAD_END_RADIUS, LANE_WIDTH, RING_OUTER, roadHalfWidth } from './roadGraph.ts';
import { TEMPLATES, type TemplateId } from './templates.ts';

export interface SeriesRequest {
  template: TemplateId;
  /** id вопросов по порядку. */
  questions: string[];
}

export interface PlacedSeries {
  point: MapPoint;
  questions: string[];
}

interface RoadSlot {
  road: MapRoad;
  toward: string;
  at: number;
  /** Расстояние от начала полосы до места сцены. */
  sAnchor: number;
  kind: 'city' | 'country' | 'highway' | 'railway';
}

/** Минимальный запас от начала полосы до места остановки игрока. */
const MIN_STOP = 40;
/** Место сцены на дороге — не ближе этого к краю узла. */
const NODE_CLEARANCE = 100;
/** Сцены на дороге — не ближе этого к переезду. */
const RAILWAY_CLEARANCE = 200;

function seeded(seedText: string): () => number {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nodeRadius(map: CityMap, node: MapNode): number {
  if (node.kind === 'roundabout') return RING_OUTER;
  if (node.kind === 'end') return DEAD_END_RADIUS;
  const incident = map.roads.filter((r) => r.from === node.id || r.to === node.id);
  return Math.max(LANE_WIDTH, ...incident.map(roadHalfWidth));
}

/** Места на участках дорог (в обе стороны), подходящие для сцен. */
export function roadSlots(map: CityMap): RoadSlot[] {
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  const slots: RoadSlot[] = [];
  for (const road of map.roads) {
    for (const [fromId, toId] of [
      [road.from, road.to],
      [road.to, road.from],
    ]) {
      const from = nodes.get(fromId)!;
      const to = nodes.get(toId)!;
      const len = distance(from, to);
      const rFrom = nodeRadius(map, from);
      const rTo = nodeRadius(map, to);
      const kind = road.kind === 'highway' ? 'highway' : road.kind === 'country' ? 'country' : 'city';
      const add = (at: number, slotKind: RoadSlot['kind']) => slots.push({ road, toward: toId, at, sAnchor: at * len - rFrom, kind: slotKind });

      const y = map.railwayY;
      let crossing: number | undefined;
      // Автомагистраль пересекает железную дорогу по мосту — переезда на ней нет.
      if (y !== undefined && kind !== 'highway' && from.x === to.x && (from.y - y) * (to.y - y) < 0) {
        crossing = (y - from.y) / (to.y - from.y);
        add(crossing, 'railway');
      }
      const count = len >= 1100 ? 4 : len >= 700 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const at = count === 2 ? [0.31, 0.69][i] : (i + 1) / (count + 1);
        const d = at * len;
        if (d < rFrom + NODE_CLEARANCE || len - d < rTo + NODE_CLEARANCE) continue;
        if (crossing !== undefined && Math.abs(at - crossing) * len < RAILWAY_CLEARANCE) continue;
        add(at, kind);
      }
    }
  }
  return slots;
}

interface Approach {
  node: MapNode;
  road: MapRoad;
}

function approaches(map: CityMap, node: MapNode): Approach[] {
  return map.roads.filter((r) => r.from === node.id || r.to === node.id).map((road) => ({ node, road }));
}

/** Обычный перекрёсток с четырьмя городскими дорогами. */
function isCrossroads(map: CityMap, node: MapNode): boolean {
  const incident = map.roads.filter((r) => r.from === node.id || r.to === node.id);
  return !node.kind && incident.length === 4 && incident.every((r) => (r.kind ?? 'city') === 'city');
}

/** Узлы по очереди «самый дальний от уже выбранных» — светофоры разойдутся по району. */
function spreadOrder(nodes: MapNode[]): MapNode[] {
  if (!nodes.length) return [];
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  const rest = [...nodes].sort((a, b) => distance(a, { x: cx, y: cy }) - distance(b, { x: cx, y: cy }) || a.id.localeCompare(b.id));
  const order = [rest.shift()!];
  while (rest.length) {
    let best = 0;
    let bestD = -1;
    rest.forEach((n, i) => {
      const d = Math.min(...order.map((o) => distance(o, n)));
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    });
    order.push(rest.splice(best, 1)[0]);
  }
  return order;
}

/** Подъезды к узлам по кругу: сначала по одному к каждому узлу, потом по второму и т. д. */
function roundRobin(map: CityMap, nodes: MapNode[], rnd: () => number): Approach[] {
  const lists = nodes.map((n) => shuffle(approaches(map, n), rnd));
  const out: Approach[] = [];
  for (let round = 0; lists.some((l) => l.length > round); round++) {
    for (const l of lists) if (l[round]) out.push(l[round]);
  }
  return out;
}

/** Перемешать серии разных шаблонов: по одной серии каждого шаблона по кругу. */
function interleave(requests: SeriesRequest[]): SeriesRequest[] {
  const byTemplate = new Map<TemplateId, SeriesRequest[]>();
  for (const r of requests) byTemplate.set(r.template, [...(byTemplate.get(r.template) ?? []), r]);
  const groups = [...byTemplate.values()].sort((a, b) => b.length - a.length);
  const out: SeriesRequest[] = [];
  for (let i = 0; groups.some((g) => g.length > i); i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

export function placeSeries(map: CityMap, requests: SeriesRequest[]): PlacedSeries[] {
  const rnd = seeded(map.id);
  const placed: PlacedSeries[] = [];
  const point = (template: TemplateId, road: MapRoad, toward: string, at?: number): MapPoint => ({
    id: `p${placed.length + 1}`,
    template,
    title: TEMPLATES[template].short,
    road: road.id,
    toward,
    ...(at === undefined ? {} : { at: Math.round(at * 1000) / 1000 }),
  });

  // Перекрёстки.
  const signal = requests.filter((r) => r.template === 'signalized');
  const plain = interleave(requests.filter((r) => r.template === 'uncontrolled-equal' || r.template === 'uncontrolled-priority'));
  const ring = requests.filter((r) => r.template === 'roundabout');
  const crossroads = spreadOrder(map.nodes.filter((n) => isCrossroads(map, n)));
  const signalCount = signal.length ? Math.min(crossroads.length, Math.max(1, Math.ceil(signal.length / 3))) : 0;
  const signalNodes = crossroads.slice(0, signalCount);
  const plainNodes = crossroads.slice(signalCount);
  const ringNodes = map.nodes.filter((n) => n.kind === 'roundabout');
  const assignNodes = (series: SeriesRequest[], nodes: MapNode[], what: string) => {
    const slots = roundRobin(map, nodes, rnd);
    if (series.length > slots.length) {
      throw new Error(`Карта «${map.id}»: для «${what}» нужно ${series.length} подъездов к узлам, есть ${slots.length}`);
    }
    series.forEach((s, i) => placed.push({ point: point(s.template, slots[i].road, slots[i].node.id), questions: s.questions }));
  };
  assignNodes(signal, signalNodes, 'регулируемых перекрёстков');
  assignNodes(plain, plainNodes, 'нерегулируемых перекрёстков');
  assignNodes(ring, ringNodes, 'колец');

  // Участки дорог.
  const all = shuffle(roadSlots(map), rnd);
  const used = new Set<RoadSlot>();
  const onRoad = interleave(requests.filter((r) => TEMPLATES[r.template].anchor === 'road'));
  for (const s of onRoad) {
    const info = TEMPLATES[s.template];
    const fits = (slot: RoadSlot) => !used.has(slot) && slot.sAnchor - info.stopOffset - 20 >= MIN_STOP;
    let candidates: RoadSlot[];
    if (info.place === 'railway') candidates = all.filter((x) => x.kind === 'railway' && fits(x));
    else if (info.place === 'highway') candidates = all.filter((x) => x.kind === 'highway' && fits(x));
    else {
      // Обгону и ночной дороге — сначала загородные дороги, остальным — сначала городские.
      const preferCountry = s.template === 'overtaking' || s.template === 'night-road';
      const free = all.filter((x) => (x.kind === 'city' || x.kind === 'country') && fits(x));
      candidates = [...free.filter((x) => (x.kind === 'country') === preferCountry), ...free.filter((x) => (x.kind === 'country') !== preferCountry)];
    }
    const slot = candidates[0];
    if (!slot) throw new Error(`Карта «${map.id}»: не хватило места для «${s.template}»`);
    used.add(slot);
    // На той же полосе рядом больше ничего не ставим.
    for (const other of all) {
      if (other.road === slot.road && other.toward === slot.toward && Math.abs(other.at - slot.at) * distance(nodeOf(map, slot.road.from), nodeOf(map, slot.road.to)) < 150) {
        used.add(other);
      }
    }
    placed.push({ point: point(s.template, slot.road, slot.toward, slot.at), questions: s.questions });
  }
  return placed;
}

function nodeOf(map: CityMap, id: string): MapNode {
  return map.nodes.find((n) => n.id === id)!;
}

/** Разбить вопросы шаблона на серии и раздать их по сериям по кругу (серии получаются разнообразнее). */
export function makeSeries(template: TemplateId, questions: string[]): SeriesRequest[] {
  const size = TEMPLATES[template].series;
  const count = Math.ceil(questions.length / size);
  const series: SeriesRequest[] = Array.from({ length: count }, () => ({ template, questions: [] }));
  questions.forEach((id, i) => series[i % count].questions.push(id));
  return series;
}
