/**
 * Живой город: поток машин по полосам и пешеходы на тротуарах и переходах. Чистая модель без
 * Phaser — её проверяют тесты, а рисует src/game/city/trafficView.ts.
 *
 * Машины соблюдают правила так, чтобы это было видно и не мешало игроку:
 *  - на регулируемом перекрёстке едут только на зелёный (жёлтый и красный — стоп у стоп-линии);
 *  - на нерегулируемом уступают тем, кто справа; в перекрёсток въезжают по одному (встречные
 *    прямо — вдвоём), на кольцо — когда на нём никого нет;
 *  - держат дистанцию до машины впереди и не въезжают на перекрёсток, если за ним нет места;
 *  - пропускают пешеходов на переходе.
 *
 * Поток не мешает игроку: уступает ему на перекрёстке, едет за ним с дистанцией, а машина,
 * которая оказалась прямо перед игроком и должна остановиться, плавно исчезает. В зонах, где
 * идёт сцена с вопросом, потока нет.
 *
 * Пешеходы ходят по тротуарам вокруг кварталов и переходят дорогу только по переходам: на
 * регулируемом перекрёстке — когда машинам на этой дороге горит красный, на нерегулируемом
 * переходе — когда рядом нет машин. Перед машиной игрока пешеход выходит, только если она
 * успевает затормозить: пропустить пешехода — забота игрока (этап 8).
 *
 * Светофоры и переходы — из правил района (src/world/districtRules.ts).
 */
import { Polyline, add, distance, dot, headingAngle, normalize, projectOnSegment, rightNormal, scale, sub, type Vec } from './geometry.ts';
import type { MapNode, MapPoint, MapRoad } from './map.ts';
import { LANE_WIDTH, SIDEWALK, roadHalfWidth, type Lane, type RoadGraph, type Turn } from './roadGraph.ts';
import { JUNCTION_ZEBRA, STOP_LINE, districtRules, districtZebras, type DistrictRules } from './districtRules.ts';

export type CarKind = 'car' | 'truck' | 'bus' | 'moto';

/**
 * Нарушитель (режим «Один день Соколова», этап 12): проедет на красный, превысит скорость или
 * остановится в зоне «Остановка запрещена». Нарушение потом проверяет модуль правил (rules.ts).
 */
export type CarViolation =
  | { kind: 'red-light' }
  | { kind: 'speeding' }
  | { kind: 'no-stopping'; lane: Lane; s: number; /** Сколько ещё стоять (с). */ hold: number };
export type Light = 'green' | 'yellow' | 'red';

/** Круг, где идёт сцена с вопросом: потока там нет. */
export interface Zone {
  x: number;
  y: number;
  r: number;
}

export interface PlayerInfo {
  pos: Vec;
  /** Полоса и положение на ней, если машина игрока не в узле. */
  lane?: Lane;
  s?: number;
  speed: number;
  /** Направление носа машины. */
  heading: Vec;
}

export interface TrafficEnv {
  player: PlayerInfo;
  zones: readonly Zone[];
  /** Сигнал светофора для полосы, въезжающей в регулируемый перекрёсток. */
  signal(laneId: string): Light | undefined;
  /** Видимая область (для появления и исчезновения за краем экрана). */
  view: { x: number; y: number; w: number; h: number };
}

export interface Car {
  id: number;
  kind: CarKind;
  color: number;
  /** Половина длины. */
  half: number;
  lane: Lane;
  s: number;
  /** Куда поедет на следующем узле. */
  next: Lane;
  turn?: Turn;
  t: number;
  speed: number;
  /** Доля от разрешённой скорости полосы. */
  cruise: number;
  /** Сдвиг поперёк полосы: 0 — правая полоса, −LANE_WIDTH — левая на дороге с двумя полосами. */
  shift: number;
  shiftTarget: number;
  /** Решение проехать узел принято (остановиться уже не успеть). */
  committed: boolean;
  /** Сколько секунд стоит перед узлом. */
  wait: number;
  /** Сколько секунд вообще не двигается (например, за стоящей машиной игрока). */
  stuck: number;
  alpha: number;
  fading: boolean;
  gone: boolean;
  pos: Vec;
  heading: number;
  /** Соперник игрока (Артём на мопеде): не исчезает вдали. */
  rival?: boolean;
  /** Нарушитель (этап 12). */
  violate?: CarViolation;
  /** Остановлен инспектором: прижимается к обочине и стоит. */
  held?: boolean;
}

export interface Walker {
  id: number;
  /** Вид (цвет одежды). */
  seed: number;
  road: MapRoad;
  from: MapNode;
  to: MapNode;
  /** Сторона тротуара относительно направления ходьбы: 1 — справа, −1 — слева. */
  side: 1 | -1;
  a: Vec;
  b: Vec;
  s: number;
  len: number;
  speed: number;
  /** Переход дороги (или поворот за угол) по ломаной. */
  path?: Polyline;
  pathT: number;
  /** Ключ перехода, который сейчас занят этим пешеходом. */
  crossing?: string;
  /** Что делать после ломаной: продолжить по этому отрезку. */
  after?: { road: MapRoad; from: MapNode; to: MapNode; side: 1 | -1; s: number };
  /** Ждёт у перехода (секунд). */
  wait: number;
  /** Переход на участке дороги (id точки), который этот пешеход уже решил не переходить. */
  skipped?: string;
  alpha: number;
  fading: boolean;
  gone: boolean;
  pos: Vec;
  heading: number;
  step: number;
}

interface Zebra {
  key: string;
  center: Vec;
  /** Для перехода у регулируемого перекрёстка: полоса, въезжающая в перекрёсток по этой дороге. */
  signalLane?: string;
  node?: string;
  road: MapRoad;
}

/** Тормозной путь машины игрока с запасом на реакцию: ближе этого пешеход перед ней не выходит. */
export function playerStopDistance(speed: number): number {
  return 60 + speed * 0.9 + (speed * speed) / (2 * 300);
}

const ACCEL = 110;
/** Сдвиг к обочине машины, которая остановилась (нарушитель, остановленный инспектором). */
const CURB_SHIFT = 12;
const BRAKE = 170;
const MIN_GAP = 14;
const WALK_SPEED = [26, 38] as const;
const DESPAWN = 1400;
const SPAWN_MAX = 1050;
/** Пешеходы идут медленно — держим их поближе к игроку, иначе их почти не видно. */
const WALK_DESPAWN = 950;
const WALK_SPAWN_MAX = 620;

const SIZES: Record<CarKind, number> = { car: 20, truck: 31, bus: 43, moto: 12 };
/** Заездные карманы у точек (длина, как на карте): тротуар здесь идёт за карманом. */
const POCKETS: Partial<Record<string, number>> = { 'bus-stop': 150, parking: 190, inspector: 120, 'first-aid': 120 };
/** Ширина кармана: на столько тротуар за ним дальше от дороги. */
const POCKET_WIDTH = 28;
const COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x8d99ae, 0x6a4c93, 0xf1faee, 0x264653];

const inRect = (p: Vec, r: { x: number; y: number; w: number; h: number }, m = 0) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m;

export class TrafficSim {
  readonly cars: Car[] = [];
  readonly walkers: Walker[] = [];
  private nextId = 1;
  private readonly zebras = new Map<string, Zebra>();
  /** Переходы на полосе: где (s) и какой. */
  private readonly laneZebras = new Map<string, Array<{ key: string; s: number }>>();
  /** Сколько пешеходов сейчас на переходе. */
  private readonly busy = new Map<string, number>();
  /** Переходы на участках дорог (id точки → переход), чтобы пешеход мог его заметить. */
  private readonly roadCrossings = new Map<string, Array<{ key: string; center: Vec }>>();
  /** Карманы на дорогах: середина кармана на оси дороги, сторона, половина длины. */
  private readonly pockets = new Map<string, Array<{ center: Vec; side: Vec; dir: Vec; half: number }>>();
  private readonly signalized = new Set<string>();
  private readonly cityRoads: MapRoad[];
  readonly carTarget: number;
  readonly walkerTarget: number;
  /** Сколько раз машина исчезла, чтобы не помешать игроку (для тестов и отладки). */
  yielded = 0;

  constructor(
    readonly graph: RoadGraph,
    points: readonly MapPoint[],
    private readonly rnd: () => number = Math.random,
    opts: { cars?: number; walkers?: number; rules?: DistrictRules } = {},
  ) {
    const rules = opts.rules ?? districtRules(graph, points);
    for (const point of points) {
      const pocket = POCKETS[point.template];
      if (pocket) {
        const stop = graph.pointStop(point);
        const list = this.pockets.get(stop.lane.road.id) ?? [];
        list.push({ center: stop.anchor, side: stop.lane.normal, dir: stop.lane.dir, half: pocket / 2 });
        this.pockets.set(stop.lane.road.id, list);
      }
    }
    for (const id of rules.signals) this.signalized.add(id);
    for (const z of districtZebras(graph, rules)) {
      this.addZebra({ key: z.key, center: z.center, signalLane: z.signalLane, node: z.node, road: z.road }, z.lanes);
      if (!z.node) {
        const list = this.roadCrossings.get(z.road.id) ?? [];
        list.push({ key: z.key, center: z.center });
        this.roadCrossings.set(z.road.id, list);
      }
    }
    this.cityRoads = graph.map.roads.filter((r) => (r.kind ?? 'city') === 'city' && r.lanes !== 2);
    const laneTotal = [...graph.lanes.values()].reduce((sum, l) => sum + l.length, 0);
    const cityTotal = this.cityRoads.reduce((sum, r) => sum + distance(graph.node(r.from), graph.node(r.to)), 0);
    this.carTarget = opts.cars ?? Math.round(Math.max(8, Math.min(18, laneTotal / 1300)));
    this.walkerTarget = opts.walkers ?? Math.round(Math.max(6, Math.min(14, cityTotal / 600)));
  }

  // ─── Переходы ────────────────────────────────────────────────────────────────

  private addZebra(zebra: Zebra, lanes: Array<{ lane: Lane; s: number }>) {
    this.zebras.set(zebra.key, zebra);
    for (const { lane, s } of lanes) {
      const list = this.laneZebras.get(lane.id) ?? [];
      list.push({ key: zebra.key, s });
      this.laneZebras.set(lane.id, list);
    }
  }

  /**
   * Пешеход прямо сейчас начинает переходить дорогу по этому переходу (с правого по ходу
   * полосы `key` тротуара на левый). Для проверки правил в автотестах и отладки.
   */
  crossNow(key: string): Walker | undefined {
    const zebra = this.zebras.get(key);
    if (!zebra || zebra.node) return undefined;
    const road = zebra.road;
    // Положение перехода на линии тротуара (она начинается у края перекрёстка).
    const along = distance(this.graph.node(road.from), zebra.center) - this.graph.radius(road.from) - SIDEWALK / 2;
    const w = this.spawnWalker(road, true, 1, along);
    const { n } = this.walkLine(road, w.from, w.to, 1);
    const wide = roadHalfWidth(road) + SIDEWALK / 2;
    w.path = new Polyline([add(zebra.center, scale(n, wide)), add(zebra.center, scale(n, -wide))]);
    w.pathT = 0;
    w.alpha = 1;
    w.crossing = key;
    this.busy.set(key, (this.busy.get(key) ?? 0) + 1);
    w.after = { road, from: w.from, to: w.to, side: -1, s: along };
    this.placeWalker(w);
    return w;
  }

  /** Где сейчас пешеходы, переходящие по этому переходу. */
  walkersOn(key: string): Vec[] {
    return this.walkers.filter((w) => w.crossing === key && !w.gone).map((w) => w.pos);
  }

  isBusy(key: string): boolean {
    return (this.busy.get(key) ?? 0) > 0;
  }

  // ─── Машины ──────────────────────────────────────────────────────────────────

  private stopS(lane: Lane, half: number): number {
    const extra = this.signalized.has(lane.to.id) ? STOP_LINE : 3;
    return lane.length - half - extra;
  }

  private inZone(p: Vec, zones: readonly Zone[], pad = 0): boolean {
    return zones.some((z) => distance(p, z) < z.r + pad);
  }

  private laneNearZone(lane: Lane, zones: readonly Zone[]): boolean {
    return zones.some((z) => distance(projectOnSegment(z, lane.start, lane.end).point, z) < z.r);
  }

  /** Куда повернуть на следующем узле: случайный съезд, в обход зон со сценой. */
  private chooseNext(lane: Lane, zones: readonly Zone[]): Lane {
    const exits = this.graph.exits(lane);
    const free = exits.filter((l) => !this.laneNearZone(l, zones));
    const pool = free.length ? free : exits;
    // Прямо чаще, чем в повороты: так поток выглядит спокойнее.
    const weights = pool.map((l) => (this.graph.turnKind(lane, l) === 'straight' ? 2 : 1));
    let roll = this.rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  private placeCar(car: Car) {
    if (car.turn) {
      const line = car.turn.path;
      const t = Math.min(line.length, car.t);
      const k = line.length ? t / line.length : 1;
      const d = line.directionAt(t);
      // На дороге с двумя полосами машина из левой полосы плавно перестраивается на повороте.
      car.pos = add(line.pointAt(t), scale(rightNormal(d), car.shift * (1 - k)));
      car.heading = headingAngle(d);
      return;
    }
    const p = this.graph.pointOnLane(car.lane, Math.min(car.s, car.lane.length));
    car.pos = add(p, scale(car.lane.normal, car.shift));
    car.heading = headingAngle(car.lane.dir);
  }

  spawnCar(lane: Lane, s: number, opts: Partial<Pick<Car, 'kind' | 'color' | 'rival' | 'cruise'>> = {}, zones: readonly Zone[] = []): Car {
    const roll = this.rnd();
    const city = (lane.road.kind ?? 'city') === 'city';
    const kind: CarKind = opts.kind ?? (roll < 0.1 ? 'moto' : roll < 0.22 ? 'truck' : roll < 0.3 && city ? 'bus' : 'car');
    const twoLane = lane.road.lanes === 2;
    const shift = twoLane && this.rnd() < 0.5 ? -LANE_WIDTH : 0;
    const car: Car = {
      id: this.nextId++,
      kind,
      color: opts.color ?? COLORS[Math.floor(this.rnd() * COLORS.length)],
      half: SIZES[kind],
      lane,
      s,
      next: this.chooseNext(lane, zones),
      t: 0,
      speed: 0,
      cruise: opts.cruise ?? 0.72 + this.rnd() * 0.2 + (shift ? 0.15 : 0),
      shift,
      shiftTarget: shift,
      committed: false,
      wait: 0,
      stuck: 0,
      alpha: 0,
      fading: false,
      gone: false,
      pos: { x: 0, y: 0 },
      heading: 0,
      rival: opts.rival,
    };
    car.speed = lane.speed * car.cruise * 0.6;
    this.placeCar(car);
    this.cars.push(car);
    return car;
  }

  /** Машина впереди на той же полосе (и в том же ряду): расстояние между бамперами. */
  private leaderGap(car: Car, env: TrafficEnv): number {
    let gap = Infinity;
    for (const o of this.cars) {
      if (o === car || o.gone || o.turn || o.lane !== car.lane || Math.abs(o.shift - car.shift) > 10) continue;
      if (o.s <= car.s) continue;
      gap = Math.min(gap, o.s - o.half - (car.s + car.half));
    }
    const p = env.player;
    if (p.lane === car.lane && p.s !== undefined && p.s > car.s && Math.abs(car.shift) < 10) gap = Math.min(gap, p.s - 22 - (car.s + car.half));
    return gap;
  }

  /** Игрок сзади на той же полосе и близко: машина ему не мешает. */
  private playerBehind(car: Car, env: TrafficEnv): number {
    const p = env.player;
    if (car.turn || p.lane !== car.lane || p.s === undefined || p.s >= car.s || Math.abs(car.shift) > 10) return Infinity;
    return car.s - p.s;
  }

  /** Кто сейчас в узле или уже решил в него въехать (остановиться не успеет). */
  private occupants(node: MapNode, except?: Car): Car[] {
    return this.cars.filter((c) => c !== except && !c.gone && ((c.turn && c.turn.from.to === node) || (!c.turn && c.committed && c.lane.to === node)));
  }

  private turnOf(c: Car): Turn {
    return c.turn ?? this.graph.turn(c.lane, c.next);
  }

  /** Можно ли въехать в узел прямо сейчас. */
  mayEnter(car: Car, env: TrafficEnv): boolean {
    const lane = car.lane;
    const node = lane.to;
    const light = env.signal(lane.id);
    // Нарушитель едет на красный (пешеходов на переходе он всё же пропускает — проверка ниже).
    if (light && light !== 'green' && car.violate?.kind !== 'red-light') return false;

    // Переход перед перекрёстком занят пешеходом.
    for (const z of this.laneZebras.get(lane.id) ?? []) if (z.s > car.s && z.s > lane.length - 40 && this.isBusy(z.key)) return false;
    for (const z of this.laneZebras.get(car.next.id) ?? []) if (z.s < 40 && this.isBusy(z.key)) return false;

    // Игрок в узле или подъезжает к нему — уступить.
    const r = this.graph.radius(node.id);
    const p = env.player;
    const dp = distance(p.pos, node);
    if (dp < r + 16) return false;
    if (p.speed > 5 && dp < r + 90 && dot(p.heading, sub(node, p.pos)) > 0) return false;

    // В узле уже кто-то есть.
    const kind = this.graph.turnKind(lane, car.next);
    for (const o of this.occupants(node, car)) {
      const ot = this.turnOf(o);
      if (ot.from === lane) return false;
      // На кольце едут несколько машин: въезжать можно, если у места въезда никого нет.
      if (node.kind === 'roundabout') {
        if (distance(o.pos, lane.end) < 100) return false;
        continue;
      }
      const okind = ot.kind;
      const opposite = dot(ot.from.dir, lane.dir) < -0.7;
      const pair = opposite && ((kind === 'straight' && okind === 'straight') || (kind === 'right' && okind === 'right'));
      if (!pair) return false;
    }

    // За узлом должно быть место.
    for (const o of this.cars) {
      if (o === car || o.gone || o.turn || o.lane !== car.next) continue;
      if (o.s - o.half < car.half * 2 + 10) return false;
    }
    if (p.lane === car.next && p.s !== undefined && p.s < car.half * 2 + 34) return false;

    // Помеха справа (нерегулируемый перекрёсток): кто подъехал справа — едет первым.
    if (!light && node.kind !== 'roundabout' && node.kind !== 'end' && car.wait < 2.5) {
      const right = rightNormal(lane.dir);
      for (const o of this.cars) {
        if (o === car || o.gone || o.turn || o.lane.to !== node) continue;
        if (dot(o.lane.dir, right) > -0.7) continue;
        if (o.s > this.stopS(o.lane, o.half) - 45) return false;
      }
    }
    return true;
  }

  private stepCar(car: Car, dt: number, env: TrafficEnv) {
    // Плавное перестроение между полосами дороги с двумя полосами.
    car.shift += Math.max(-30 * dt, Math.min(30 * dt, car.shiftTarget - car.shift));

    // Остановлен инспектором: тормозит, прижимается к обочине и стоит.
    if (car.held) {
      car.speed = Math.max(0, car.speed - BRAKE * 1.5 * dt);
      if (car.turn) car.t = Math.min(car.turn.path.length, car.t + car.speed * dt);
      else car.s = Math.min(car.lane.length - car.half, car.s + car.speed * dt);
      // К обочине — поток объезжает (машины в другом «ряду» друг другу не помеха).
      if (!car.turn) car.shiftTarget = CURB_SHIFT;
      this.placeCar(car);
      return;
    }

    if (car.turn) {
      const speeder = car.violate?.kind === 'speeding' && car.turn.kind === 'straight';
      const target = speeder ? car.turn.from.speed * car.cruise : car.turn.speed * Math.min(1, car.cruise + 0.15);
      car.speed = car.speed < target ? Math.min(target, car.speed + ACCEL * dt) : Math.max(target, car.speed - BRAKE * dt);
      car.t += car.speed * dt;
      if (car.t >= car.turn.path.length) {
        const rest = car.t - car.turn.path.length;
        car.lane = car.next;
        car.s = rest;
        car.turn = undefined;
        car.committed = false;
        car.wait = 0;
        car.shift = 0;
        car.shiftTarget = car.lane.road.lanes === 2 && this.rnd() < 0.5 ? -LANE_WIDTH : 0;
        car.next = this.chooseNext(car.lane, env.zones);
      }
      this.placeCar(car);
      return;
    }

    const lane = car.lane;
    const stop = this.stopS(lane, car.half);
    const behind = this.playerBehind(car, env);
    const escort = behind < 150;
    // Игрок сзади: машина прибавляет, чтобы не мешать (игрок едет на 20% быстрее потока).
    let target = lane.speed * (escort ? Math.max(1.35, car.cruise) : car.cruise);

    const gap = this.leaderGap(car, env);
    if (gap < Infinity) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, gap - MIN_GAP)));

    // Переход посреди дороги: пропустить пешехода.
    for (const z of this.laneZebras.get(lane.id) ?? []) {
      if (z.s <= car.s || !this.isBusy(z.key)) continue;
      const before = z.s - 14 - car.half - car.s;
      if (before > -car.half) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, before)));
    }

    let hold = false;
    // Нарушитель остановится в зоне «Остановка запрещена» и постоит.
    const v = car.violate;
    if (v?.kind === 'no-stopping' && v.lane === lane && v.hold > 0) {
      const before = v.s - car.s;
      if (before > -car.half) {
        target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, before)));
        if (before < 60) car.shiftTarget = CURB_SHIFT;
        if (before < 2 && car.speed < 4) {
          v.hold -= dt;
          hold = true;
          if (v.hold <= 0) car.shiftTarget = 0;
        }
      }
    }
    const toStop = stop - car.s;
    const brakeDist = (car.speed * car.speed) / (2 * BRAKE);
    // Решение проехать действует, только пока остановиться уже не успеть (например, машина
    // притормозила за другой — тогда светофор и помехи проверяются заново).
    if (car.committed && toStop > brakeDist + 10) car.committed = false;
    if (!car.committed) {
      if (toStop < 110) {
        const ok = this.mayEnter(car, env);
        if (ok && toStop <= brakeDist + 6) car.committed = true;
        if (!ok) {
          if (toStop <= 0.5 && brakeDist < 2) hold = true;
          target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, toStop)));
          if (car.speed < 3) car.wait += dt;
        }
      }
    }
    // Перед поворотом — медленнее (лихач, который едет прямо, не тормозит).
    const turn = this.graph.turn(lane, car.next);
    if (!(car.violate?.kind === 'speeding' && turn.kind === 'straight')) target = Math.min(target, Math.sqrt(turn.speed ** 2 + 2 * BRAKE * Math.max(0, lane.length - car.s)));

    car.speed = car.speed < target ? Math.min(target, car.speed + ACCEL * dt) : Math.max(target, car.speed - BRAKE * 1.6 * dt);
    if (hold) car.speed = 0;
    car.s += car.speed * dt;
    if (!car.committed && car.s > stop) {
      car.s = Math.max(stop, car.s - car.speed * dt);
      car.speed = 0;
    }

    // Машина прямо перед игроком должна остановиться — она не станет помехой, а исчезнет.
    if (escort && behind < 75 && car.speed < lane.speed * 0.5 && !car.rival) this.fade(car, true);
    // Долго стоит (за машиной игрока, в заторе) — тихо уезжает из кадра.
    car.stuck = car.speed < 3 && !hold ? car.stuck + dt : 0;
    if (car.stuck > 14 && !car.rival) this.fade(car);

    if (car.s >= lane.length) {
      car.turn = turn;
      car.t = car.s - lane.length;
      car.committed = false;
    }
    this.placeCar(car);
  }

  private fade(car: Car, forPlayer = false) {
    if (car.fading) return;
    car.fading = true;
    if (forPlayer) this.yielded++;
  }

  // ─── Пешеходы ────────────────────────────────────────────────────────────────

  private walkLine(road: MapRoad, from: MapNode, to: MapNode, side: 1 | -1): { a: Vec; b: Vec; d: Vec; n: Vec } {
    const d = normalize(sub(to, from));
    const n = scale(rightNormal(d), side);
    const w = roadHalfWidth(road) + SIDEWALK / 2;
    const a = add(add(from, scale(d, this.graph.radius(from.id) + SIDEWALK / 2)), scale(n, w));
    const b = add(sub(to, scale(d, this.graph.radius(to.id) + SIDEWALK / 2)), scale(n, w));
    return { a, b, d, n };
  }

  private setWalk(w: Walker, road: MapRoad, from: MapNode, to: MapNode, side: 1 | -1, s: number) {
    const { a, b } = this.walkLine(road, from, to, side);
    w.road = road;
    w.from = from;
    w.to = to;
    w.side = side;
    w.a = a;
    w.b = b;
    w.len = distance(a, b);
    w.s = Math.max(0, Math.min(w.len, s));
    w.skipped = undefined;
  }

  spawnWalker(road: MapRoad, forward: boolean, side: 1 | -1, s: number): Walker {
    const from = this.graph.node(forward ? road.from : road.to);
    const to = this.graph.node(forward ? road.to : road.from);
    const w: Walker = {
      id: this.nextId++,
      seed: Math.floor(this.rnd() * 24),
      road,
      from,
      to,
      side,
      a: from,
      b: to,
      s: 0,
      len: 0,
      speed: WALK_SPEED[0] + this.rnd() * (WALK_SPEED[1] - WALK_SPEED[0]),
      pathT: 0,
      wait: 0,
      alpha: 0,
      fading: false,
      gone: false,
      pos: { x: 0, y: 0 },
      heading: 0,
      step: this.rnd() * 10,
    };
    this.setWalk(w, road, from, to, side, s);
    this.placeWalker(w);
    this.walkers.push(w);
    return w;
  }

  private placeWalker(w: Walker) {
    if (w.path) {
      w.pos = w.path.pointAt(w.pathT);
      w.heading = headingAngle(w.path.directionAt(w.pathT));
      return;
    }
    const d = w.len ? scale(sub(w.b, w.a), 1 / w.len) : { x: 0, y: -1 };
    const p = add(w.a, scale(d, w.s));
    // У кармана остановки или парковки тротуар проходит за карманом.
    const out = scale(rightNormal(d), w.side);
    let extra = 0;
    for (const pk of this.pockets.get(w.road.id) ?? []) {
      if (dot(out, pk.side) < 0.5) continue;
      const along = Math.abs(dot(sub(p, pk.center), pk.dir));
      extra = Math.max(extra, POCKET_WIDTH * Math.max(0, Math.min(1, (pk.half + 18 - along) / 16)));
    }
    w.pos = add(p, scale(out, extra));
    w.heading = headingAngle(d);
  }

  /** Сдвиг тротуара от оси дороги в точке p этой дороги на стороне side (для тестов). */
  pocketAt(roadId: string, p: Vec, side: Vec): { half: number; along: number } | undefined {
    let best: { half: number; along: number } | undefined;
    for (const pk of this.pockets.get(roadId) ?? []) {
      if (dot(side, pk.side) < 0.5) continue;
      const along = Math.abs(dot(sub(p, pk.center), pk.dir));
      if (!best || along - pk.half < best.along - best.half) best = { half: pk.half, along };
    }
    return best;
  }

  /** Городская дорога из узла в направлении dir. */
  private roadFrom(node: MapNode, dir: Vec, cityOnly: boolean): MapRoad | undefined {
    for (const lane of this.graph.outgoing.get(node.id) ?? []) {
      if (dot(lane.dir, dir) < 0.9) continue;
      if (cityOnly && !this.cityRoads.includes(lane.road)) return undefined;
      return lane.road;
    }
    return undefined;
  }

  private otherEnd(road: MapRoad, node: MapNode): MapNode {
    return this.graph.node(road.from === node.id ? road.to : road.from);
  }

  /** Можно ли пешеходу сейчас переходить по этому переходу. */
  private mayCross(zebra: Zebra, env: TrafficEnv): boolean {
    // Перед машиной игрока — только если она успевает затормозить.
    const p = env.player;
    if (distance(p.pos, zebra.center) < playerStopDistance(p.speed)) return false;
    if (this.inZone(zebra.center, env.zones, 40)) return false;
    if (zebra.signalLane) {
      if (env.signal(zebra.signalLane) !== 'red') return false;
      // К перекрёстку подъезжает нарушитель, который поедет на красный, — пешеходы ждут.
      if (this.cars.some((c) => !c.gone && c.violate?.kind === 'red-light' && (c.turn ? c.turn.from.to.id === zebra.node : c.lane.to.id === zebra.node && c.lane.length - c.s < 320))) return false;
      // Никто не заканчивает поворот через этот переход.
      for (const c of this.occupants(this.graph.node(zebra.node!))) if (this.turnOf(c).to.road === zebra.road) return false;
      return true;
    }
    // Нерегулируемый переход: рядом не должно быть машин.
    return !this.cars.some((c) => !c.gone && distance(c.pos, zebra.center) < 130);
  }

  /** Пешеход дошёл до угла квартала: повернуть, пойти прямо, перейти дорогу или вернуться. */
  private atCorner(w: Walker, dt: number, env: TrafficEnv) {
    const node = w.to;
    const { d, n } = this.walkLine(w.road, w.from, w.to, w.side);
    const kind = node.kind ?? 'junction';
    const back = () => this.setWalk(w, w.road, w.to, w.from, (-w.side) as 1 | -1, 0);
    if (kind !== 'junction') return back();

    const sideCity = this.roadFrom(node, n, true);
    const sideAny = this.roadFrom(node, n, false);
    const straight = this.roadFrom(node, d, true);
    const zebra = sideAny ? this.zebras.get(`${node.id}|${sideAny.id}`) : undefined;

    // Перейти дорогу по переходу (на регулируемом перекрёстке) и идти прямо.
    if (zebra && straight && (w.wait > 0 || this.rnd() < 0.5)) {
      if (!this.mayCross(zebra, env)) {
        w.wait += dt;
        if (w.wait < 14) return; // ждёт зелёного у края тротуара
      } else {
        const r = this.graph.radius(node.id);
        const across = r + JUNCTION_ZEBRA;
        const off = r + SIDEWALK / 2;
        const p0 = w.b;
        const p1 = add(add(node, scale(d, -off)), scale(n, across));
        const p2 = add(add(node, scale(d, off)), scale(n, across));
        const next = this.otherEnd(straight, node);
        const start = this.walkLine(straight, node, next, w.side).a;
        w.path = new Polyline([p0, p1, p2, start]);
        w.pathT = 0;
        w.crossing = zebra.key;
        this.busy.set(zebra.key, (this.busy.get(zebra.key) ?? 0) + 1);
        w.after = { road: straight, from: node, to: next, side: w.side, s: 0 };
        w.wait = 0;
        return;
      }
    }
    w.wait = 0;
    // Вокруг перекрёстка тротуар идёт по краю перекрёстка (у широкой дороги он дальше от оси).
    const edge = this.graph.radius(node.id) + SIDEWALK / 2;
    const corner = (along: number) => add(add(node, scale(d, along)), scale(n, edge));
    if (sideCity) {
      const next = this.otherEnd(sideCity, node);
      return this.walkVia(w, [w.b, corner(-edge), this.walkLine(sideCity, node, next, w.side).a], { road: sideCity, from: node, to: next, side: w.side, s: 0 });
    }
    if (!sideAny && straight) {
      const next = this.otherEnd(straight, node);
      return this.walkVia(w, [w.b, corner(-edge), corner(edge), this.walkLine(straight, node, next, w.side).a], { road: straight, from: node, to: next, side: w.side, s: 0 });
    }
    back();
  }

  /** Пройти по ломаной (угол квартала), потом — по тротуару `after`. */
  private walkVia(w: Walker, points: Vec[], after: NonNullable<Walker['after']>) {
    const pts = points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > 0.5);
    if (pts.length < 2) return this.setWalk(w, after.road, after.from, after.to, after.side, after.s);
    w.path = new Polyline(pts);
    w.pathT = 0;
    w.after = after;
  }

  private stepWalker(w: Walker, dt: number, env: TrafficEnv) {
    w.step += dt * w.speed * 0.25;
    if (w.path) {
      // На переходе игрок едет прямо на пешехода — пешеход ускоряет шаг, а совсем рядом исчезает.
      let hurry = 1;
      if (w.crossing) {
        const p = env.player;
        const dp = distance(p.pos, w.pos);
        if (dp < 28) {
          w.fading = true;
          this.yielded++;
        } else if (dp < 240 && p.speed > 5 && dot(p.heading, sub(w.pos, p.pos)) > 0) hurry = 2.6;
      }
      w.pathT += w.speed * hurry * dt;
      if (w.pathT >= w.path.length) {
        if (w.crossing) this.busy.set(w.crossing, Math.max(0, (this.busy.get(w.crossing) ?? 1) - 1));
        w.crossing = undefined;
        const after = w.after!;
        w.path = undefined;
        w.after = undefined;
        this.setWalk(w, after.road, after.from, after.to, after.side, after.s);
      }
      this.placeWalker(w);
      return;
    }
    if (w.s >= w.len) {
      this.atCorner(w, dt, env);
      this.placeWalker(w);
      return;
    }
    const before = w.s;
    w.s = Math.min(w.len, w.s + w.speed * dt);

    // Нерегулируемый переход на этом участке: иногда перейти на другую сторону.
    for (const rc of this.roadCrossings.get(w.road.id) ?? []) {
      if (w.skipped === rc.key) continue;
      const along = projectOnSegment(rc.center, w.a, w.b).t * w.len;
      if (along < before || along > w.s + 0.001) continue;
      const zebra = this.zebras.get(rc.key)!;
      if (this.rnd() > 0.45 || !this.mayCross(zebra, env)) {
        w.skipped = rc.key;
        continue;
      }
      const { n } = this.walkLine(w.road, w.from, w.to, w.side);
      const wide = roadHalfWidth(w.road) + SIDEWALK / 2;
      const p0 = add(rc.center, scale(n, wide));
      const p1 = add(rc.center, scale(n, -wide));
      w.path = new Polyline([p0, p1]);
      w.pathT = 0;
      w.crossing = rc.key;
      this.busy.set(rc.key, (this.busy.get(rc.key) ?? 0) + 1);
      w.after = { road: w.road, from: w.from, to: w.to, side: (-w.side) as 1 | -1, s: along };
      break;
    }
    this.placeWalker(w);
  }

  // ─── Кадр ────────────────────────────────────────────────────────────────────

  update(dt: number, env: TrafficEnv) {
    for (const car of this.cars) {
      if (car.gone) continue;
      if (!car.fading) {
        this.stepCar(car, dt, env);
        // Вот-вот коснётся машины игрока (встречные по своей полосе проходят в 30 px) или
        // оказалась в зоне сцены — исчезнуть.
        if (distance(car.pos, env.player.pos) < 25) this.fade(car, true);
        if (this.inZone(car.pos, env.zones)) this.fade(car);
      } else {
        // Исчезающая машина чуть катится по инерции.
        if (car.turn) car.t += car.speed * dt;
        else car.s = Math.min(car.lane.length, car.s + car.speed * dt);
        car.speed = Math.max(0, car.speed - BRAKE * dt);
        this.placeCar(car);
      }
      car.alpha = car.fading ? Math.max(0, car.alpha - dt * 3.5) : Math.min(1, car.alpha + dt * 2.5);
      if (car.fading && car.alpha <= 0) car.gone = true;
    }
    for (const w of this.walkers) {
      if (w.gone) continue;
      if (!w.fading) {
        this.stepWalker(w, dt, env);
        if (this.inZone(w.pos, env.zones)) w.fading = true;
      }
      w.alpha = w.fading ? Math.max(0, w.alpha - dt * 3) : Math.min(1, w.alpha + dt * 2);
      if (w.fading && w.alpha <= 0) {
        w.gone = true;
        if (w.crossing) this.busy.set(w.crossing, Math.max(0, (this.busy.get(w.crossing) ?? 1) - 1));
        w.crossing = undefined;
      }
    }
  }

  /**
   * Поддерживать поток вокруг видимой области: далёкие машины и пешеходы убираются, новые
   * появляются за краем экрана. `initial` — первое заполнение (можно и в кадре, но не у игрока).
   */
  maintain(env: TrafficEnv, initial = false) {
    const center = { x: env.view.x + env.view.w / 2, y: env.view.y + env.view.h / 2 };
    const far = (p: Vec, limit: number) => distance(p, center) > limit && !inRect(p, env.view, 60);
    for (const c of this.cars) if (!c.gone && !c.rival && far(c.pos, DESPAWN)) c.gone = true;
    for (const w of this.walkers) if (!w.gone && far(w.pos, WALK_DESPAWN)) {
      w.gone = true;
      if (w.crossing) this.busy.set(w.crossing, Math.max(0, (this.busy.get(w.crossing) ?? 1) - 1));
    }
    for (let i = this.cars.length - 1; i >= 0; i--) if (this.cars[i].gone) this.cars.splice(i, 1);
    for (let i = this.walkers.length - 1; i >= 0; i--) if (this.walkers[i].gone) this.walkers.splice(i, 1);

    const okSpot = (p: Vec, limit = SPAWN_MAX) =>
      (initial ? distance(p, env.player.pos) > 160 : !inRect(p, env.view, 50)) && distance(p, center) < limit && !this.inZone(p, env.zones, 60);

    const lanes = [...this.graph.lanes.values()].filter((l) => l.length > 80);
    const maxTries = initial ? 300 : 40;
    let tries = 0;
    while (this.cars.filter((c) => !c.rival).length < this.carTarget && tries++ < maxTries) {
      const lane = lanes[Math.floor(this.rnd() * lanes.length)];
      const s = 20 + this.rnd() * Math.max(1, lane.length - 90);
      const p = this.graph.pointOnLane(lane, s);
      if (!okSpot(p)) continue;
      if (this.cars.some((c) => distance(c.pos, p) < 90)) continue;
      if (env.player.lane === lane && env.player.s !== undefined && Math.abs(env.player.s - s) < 200) continue;
      this.spawnCar(lane, s, {}, env.zones);
    }
    tries = 0;
    while (this.walkers.length < this.walkerTarget && this.cityRoads.length && tries++ < maxTries) {
      const road = this.cityRoads[Math.floor(this.rnd() * this.cityRoads.length)];
      const forward = this.rnd() < 0.5;
      const side: 1 | -1 = this.rnd() < 0.5 ? 1 : -1;
      const len = distance(this.graph.node(road.from), this.graph.node(road.to));
      const w = this.spawnWalker(road, forward, side, this.rnd() * len);
      if (!okSpot(w.pos, WALK_SPAWN_MAX) || w.len < 20) {
        this.walkers.pop();
        continue;
      }
    }
  }
}
