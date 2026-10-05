/**
 * «Один день Соколова» (этап 12): игрок — инспектор ДПС у регулируемого перекрёстка района.
 * Машины потока иногда нарушают: едут на красный, превышают скорость, останавливаются в зоне
 * «Остановка запрещена». Нарушение каждой такой машины проверяет тот же модуль правил, что и
 * у игрока (rules.ts, этап 8). Касание нарушителя — «Поймал!», касание добросовестного водителя
 * (или того, кто ещё ничего не нарушил) — ошибка. Модуль без Phaser — его проверяют тесты.
 */
import { add, distance, scale, type Vec } from './geometry.ts';
import { roadHalfWidth, type Lane, type RoadGraph } from './roadGraph.ts';
import { districtRules, type DistrictRules, type NoStopZone } from './districtRules.ts';
import type { MapPoint } from './map.ts';
import { RuleWatcher, kmh, speedLimit, type Violation } from './rules.ts';
import type { Car, Light, TrafficEnv, TrafficSim } from './traffic.ts';

/** Длительность смены (с). */
export const SHIFT_SECONDS = 180;
/** Цикл светофоров: как в городе (CityScene). */
export const SIGNAL_CYCLE = 16;
/** Нарушитель после нарушения ещё столько секунд считается «пойманным вовремя». */
const CATCH_WINDOW = 12;
/** Через столько секунд после нарушителя — следующий (случайно в этих пределах). */
const GAP = [3, 6] as const;
/** Касание засчитывается по машине не дальше этого (px мира). */
export const TAP_RADIUS = 34;

export type PatrolKind = 'red-light' | 'speeding' | 'no-stopping';
export const PATROL_KINDS: readonly PatrolKind[] = ['red-light', 'speeding', 'no-stopping'];

/** Сигнал светофора для полосы, въезжающей в регулируемый перекрёсток (как в городе). */
export function lightAt(t: number, lane: Lane): Light {
  const ph = t % SIGNAL_CYCLE < 6 ? 0 : t % SIGNAL_CYCLE < 8 ? 1 : t % SIGNAL_CYCLE < 14 ? 2 : 3;
  const vertical = Math.abs(lane.dir.y) > 0.5;
  const mine = vertical ? ph < 2 : ph >= 2;
  return mine ? (ph % 2 === 0 ? 'green' : 'yellow') : 'red';
}

/** Через сколько секунд полосе загорится красный (0 — уже красный) и сколько он ещё продлится. */
export function redWindow(t: number, lane: Lane): { until: number; left: number } {
  let until = 0;
  while (until < SIGNAL_CYCLE && lightAt(t + until, lane) !== 'red') until += 0.1;
  let left = until;
  while (left < until + SIGNAL_CYCLE && lightAt(t + left, lane) === 'red') left += 0.1;
  return { until, left: left - until };
}

/** Светофоры района: сигнал для полосы, въезжающей в регулируемый перекрёсток. */
export function patrolSignals(graph: RoadGraph, rules: DistrictRules, clock: () => number): TrafficEnv['signal'] {
  const nodes = new Set(rules.signals);
  return (laneId) => {
    const lane = graph.lane(laneId);
    return nodes.has(lane.to.id) ? lightAt(clock(), lane) : undefined;
  };
}

/** Обстановка для потока: игрока на дороге нет (он в машине ДПС), видно область камеры. */
export function patrolEnv(view: TrafficEnv['view'], signal: TrafficEnv['signal']): TrafficEnv {
  return { player: { pos: { x: -1e6, y: -1e6 }, speed: 0, heading: { x: 0, y: -1 } }, zones: [], signal, view };
}

export interface PatrolPost {
  /** Перекрёсток поста. */
  node: string;
  /** Правила района с зоной «Остановка запрещена» прямо у поста. */
  rules: DistrictRules;
  /** Полоса зоны и её границы. */
  zone: { lane: Lane; s0: number; s1: number };
  /** Куда смотрит камера. */
  view: Vec;
  /** Где стоит машина ДПС. */
  car: { pos: Vec; angle: number };
}

/** Пост: регулируемый перекрёсток района поближе к середине и зона запрета остановки у него. */
export function patrolPost(graph: RoadGraph, points: readonly MapPoint[]): PatrolPost {
  const base = districtRules(graph, points);
  const node = graph.node(base.signals[0]);
  // Зона — на выезде с перекрёстка по вертикальной городской улице (по высоте экрана видно больше).
  const outs = (graph.outgoing.get(node.id) ?? []).filter((l) => (l.road.kind ?? 'city') === 'city' && l.length > 260);
  const lane = outs.find((l) => l.dir.y > 0.5) ?? outs.find((l) => Math.abs(l.dir.y) > 0.5) ?? outs[0] ?? graph.outgoing.get(node.id)![0];
  const s0 = Math.min(70, lane.length * 0.2);
  const s1 = Math.min(lane.length - 40, s0 + 150);
  const toward = lane.to.id;
  const zone: NoStopZone = { road: lane.road.id, toward, from: s0 / lane.length, to: s1 / lane.length };
  const rules: DistrictRules = { ...base, noStop: [...base.noStop.filter((z) => z.road !== lane.road.id), zone] };
  // Машина ДПС — у обочины перед перекрёстком на встречной зоне стороне, носом к перекрёстку.
  const into = graph.opposite(lane);
  const r = graph.radius(node.id);
  const pos = add(add(node, scale(lane.dir, r + 70)), scale(into.normal, roadHalfWidth(lane.road) + 12));
  const angle = Math.atan2(into.dir.x, -into.dir.y);
  // Камера — между перекрёстком и серединой зоны: в кадре и светофоры, и вся зона.
  const zoneMid = distance(node, graph.pointOnLane(lane, (s0 + s1) / 2));
  return { node: node.id, rules, zone: { lane, s0, s1 }, view: add(node, scale(lane.dir, zoneMid / 2)), car: { pos, angle } };
}

export interface Suspect {
  car: Car;
  kind: PatrolKind;
  watcher: RuleWatcher;
  /** Когда назначен (с от начала смены). */
  since: number;
  /** Когда нарушил (с от начала смены) и что именно. */
  at?: number;
  violation?: Violation;
  /** Пойман или упущен. */
  done?: 'caught' | 'missed';
}

export type TapResult = { kind: 'caught'; suspect: Suspect } | { kind: 'innocent'; car: Car } | { kind: 'empty' };

export interface PatrolEvent {
  kind: 'violation' | 'missed';
  suspect: Suspect;
}

/** Режиссёр смены: назначает нарушителей, следит за ними и разбирает касания. */
export class PatrolDirector {
  readonly suspects: Suspect[] = [];
  /** Время смены (с), не считая пауз. */
  time = 0;
  private nextAt = 3;
  /** Когда последний раз подавали машину к посту. */
  private fedAt = -10;

  constructor(
    private readonly graph: RoadGraph,
    private readonly post: PatrolPost,
    private readonly sim: TrafficSim,
    private readonly rnd: () => number = Math.random,
    /** Часы светофоров (с). */
    private readonly clock: () => number = () => this.time,
  ) {}

  /** Виды нарушений: сначала те, что за смену встречались реже, — так видны все три. */
  private kinds(): PatrolKind[] {
    const count = (k: PatrolKind) => this.suspects.filter((x) => x.kind === k && x.violation).length;
    const tie = new Map(PATROL_KINDS.map((k) => [k, this.rnd()]));
    return [...PATROL_KINDS].sort((a, b) => count(a) - count(b) || tie.get(a)! - tie.get(b)!);
  }

  private active(): Suspect[] {
    return this.suspects.filter((s) => !s.done && !s.car.gone);
  }

  private visible(p: Vec, view: TrafficEnv['view'], margin = 0): boolean {
    return p.x > view.x - margin && p.x < view.x + view.w + margin && p.y > view.y - margin && p.y < view.y + view.h + margin;
  }

  /** Кандидат в нарушители: машина, которая проедет через пост и ещё ничего не делает. */
  private pick(kind: PatrolKind, env: TrafficEnv): Car | undefined {
    const node = this.post.node;
    const free = (c: Car) => !c.gone && !c.fading && !c.violate && !c.held && !c.rival && !c.turn && c.alpha > 0.5;
    const toStop = (c: Car) => c.lane.length - 26 - c.half - c.s;
    const clearAhead = (c: Car) => !this.sim.cars.some((o) => o !== c && !o.gone && !o.turn && o.lane === c.lane && o.s > c.s);
    const cars = this.sim.cars.filter(free);
    if (kind === 'red-light') {
      // Подъедет к стоп-линии, когда уже горит красный, и «проскочит» — или первым стоит на
      // красный и не дождался зелёного.
      return cars.find((c) => {
        if (c.lane.to.id !== node || !env.signal(c.lane.id) || !clearAhead(c)) return false;
        const red = redWindow(this.clock(), c.lane);
        if (toStop(c) < 6 && c.speed < 3) return red.until === 0 && red.left > 3;
        if (c.speed < 40 || toStop(c) < 50 || toStop(c) > 420) return false;
        const eta = toStop(c) / Math.max(c.speed, c.lane.speed * c.cruise);
        return eta > red.until + 0.4 && eta < red.until + red.left - 1;
      });
    }
    if (kind === 'speeding') {
      // Едет к посту издалека — успеет разогнаться и проедет перекрёсток прямо.
      const c = cars.find((x) => x.lane.to.id === node && x.s < x.lane.length * 0.6 && toStop(x) > 200 && clearAhead(x) && this.graph.exits(x.lane).some((l) => this.graph.turnKind(x.lane, l) === 'straight'));
      if (c) c.next = this.graph.exits(c.lane).find((l) => this.graph.turnKind(c.lane, l) === 'straight')!;
      return c;
    }
    // Остановка: машина въедет на улицу с зоной запрета и встанет в ней.
    const zone = this.post.zone;
    const onZone = cars.find((x) => x.lane === zone.lane && x.s < zone.s0 - 40);
    if (onZone) return onZone;
    const c = cars.find((x) => x.lane.to.id === node && this.graph.exits(x.lane).includes(zone.lane) && this.graph.turnKind(x.lane, zone.lane) !== 'uturn');
    if (c) c.next = zone.lane;
    return c;
  }

  private assign(kind: PatrolKind, car: Car) {
    const zone = this.post.zone;
    if (kind === 'red-light') car.violate = { kind };
    else if (kind === 'speeding') {
      car.violate = { kind };
      car.cruise = 1.8;
    } else car.violate = { kind, lane: zone.lane, s: (zone.s0 + zone.s1) / 2 + car.half / 2, hold: 8 };
    const watcher = new RuleWatcher(this.graph, this.post.rules);
    watcher.difficulty = 'expert';
    this.suspects.push({ car, kind, watcher, since: this.time });
  }

  /**
   * Подходящей машины нет — подать новую на въезд к посту из-за края кадра: по полосе, с которой
   * можно сделать нужное нарушение.
   */
  private feed(kind: PatrolKind, env: TrafficEnv) {
    const node = this.post.node;
    const zone = this.post.zone.lane;
    const lanes = [...this.graph.lanes.values()].filter((l) => {
      if (l.to.id !== node || l.length < 200) return false;
      if (kind === 'no-stopping') return this.graph.exits(l).includes(zone) && this.graph.turnKind(l, zone) !== 'uturn';
      if (kind === 'speeding') return this.graph.exits(l).some((x) => this.graph.turnKind(l, x) === 'straight');
      return true;
    });
    if (!lanes.length) return;
    // Не создавать затор: машин в кадре и так много.
    if (this.sim.cars.filter((c) => !c.gone && this.visible(c.pos, env.view)).length >= 9) return;
    const lane = lanes[Math.floor(this.rnd() * lanes.length)];
    // Первая точка полосы в кадре — машина появится чуть раньше, за краем.
    let s = 20;
    while (s < lane.length - 60 && !this.visible(this.graph.pointOnLane(lane, s), env.view, 30)) s += 10;
    s = Math.max(20, s - 70);
    const p = this.graph.pointOnLane(lane, s);
    if (this.sim.cars.some((c) => !c.gone && distance(c.pos, p) < 90)) return;
    const car = this.sim.spawnCar(lane, s, { kind: 'car' });
    car.speed = lane.speed * car.cruise;
    this.fedAt = this.time;
  }

  /** Кадр смены. Возвращает нарушения и упущенных нарушителей этого кадра. */
  update(dt: number, env: TrafficEnv): PatrolEvent[] {
    this.time += dt;
    const events: PatrolEvent[] = [];
    // Новый нарушитель — когда пришло время и предыдущий уже нарушил (или пропал).
    if (this.time >= this.nextAt && this.active().filter((s) => !s.violation).length === 0) {
      const kinds = this.kinds();
      let assigned = false;
      for (const kind of kinds) {
        const car = this.pick(kind, env);
        if (!car) continue;
        this.assign(kind, car);
        this.nextAt = this.time + GAP[0] + this.rnd() * (GAP[1] - GAP[0]);
        assigned = true;
        break;
      }
      if (!assigned && this.time - this.fedAt > 2.5) this.feed(kinds[0], env);
    }
    for (const s of this.suspects) {
      if (s.done) continue;
      const car = s.car;
      if (!s.violation && !car.gone && !car.held) {
        const heading = { x: Math.sin(car.heading), y: -Math.cos(car.heading) };
        const r = s.watcher.update(dt, {
          pos: car.pos,
          heading,
          speed: car.speed,
          lane: car.turn ? undefined : car.lane,
          // Машина потока встаёт ровно у стоп-линии — это не нарушение.
          s: car.turn ? undefined : car.s - 1,
          turn: car.turn,
          turnT: car.turn ? car.t : undefined,
          braking: false,
          exempt: false,
        }, { signal: env.signal, walkersOn: (key) => this.sim.walkersOn(key) });
        // Смена — про три вида нарушений: другое (редкий случай в потоке) не засчитывается.
        if (r.violation && r.violation.kind !== s.kind) s.watcher.resume(car.pos);
        else if (r.violation) {
          s.violation = r.violation;
          s.at = this.time;
          events.push({ kind: 'violation', suspect: s });
        }
      }
      // Упущен: нарушил и уехал из кадра (или прошло много времени).
      if (s.violation && !car.held && (car.gone || car.fading || this.time - s.at! > CATCH_WINDOW || !this.visible(car.pos, env.view, 40))) {
        s.done = 'missed';
        events.push({ kind: 'missed', suspect: s });
      }
      // Так и не нарушил (успел на жёлтый, свернул, исчез) — забыть и вернуть обычное поведение.
      const passed = s.kind === 'red-light' && !!car.turn;
      if (!s.violation && !s.done && (car.gone || car.fading || passed || this.time - s.since > 15)) {
        s.done = 'missed';
        car.violate = undefined;
        if (s.kind === 'speeding') car.cruise = 0.85;
      }
    }
    return events;
  }

  /** Касание в точке мира. Нарушителя ловит и не совсем точное касание (он быстро едет). */
  tap(p: Vec): TapResult {
    const near = this.suspects
      .filter((x) => x.violation && !x.done && !x.car.gone && distance(x.car.pos, p) < TAP_RADIUS * 1.5)
      .sort((a, b) => distance(a.car.pos, p) - distance(b.car.pos, p))[0];
    if (near) {
      near.done = 'caught';
      near.car.held = true;
      return { kind: 'caught', suspect: near };
    }
    let best: Car | undefined;
    let bestD = TAP_RADIUS;
    for (const c of this.sim.cars) {
      if (c.gone || c.alpha < 0.5) continue;
      const d = distance(c.pos, p);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best ? { kind: 'innocent', car: best } : { kind: 'empty' };
  }

  /** Пойманный нарушитель отпущен (после вопроса) — уезжает из кадра. */
  release(s: Suspect) {
    s.car.held = false;
    s.car.fading = true;
  }

  /** Самая быстрая машина в кадре — для радара (км/ч) и ограничение на её дороге. */
  radar(view: TrafficEnv['view']): { kmh: number; limit: number } | undefined {
    let best: { kmh: number; limit: number } | undefined;
    for (const c of this.sim.cars) {
      if (c.gone || c.alpha < 0.5 || !this.visible(c.pos, view)) continue;
      const v = kmh(c.speed);
      if (!best || v > best.kmh) best = { kmh: v, limit: speedLimit(c.turn ? c.turn.from : c.lane) };
    }
    return best;
  }
}
