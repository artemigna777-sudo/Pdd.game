/**
 * Правила за рулём (этап 8): город замечает нарушения игрока. Каждое нарушение проверяется одним
 * понятным правилом:
 *  - красный — передний бампер пересёк стоп-линию, когда горел красный;
 *  - пешеход — машина въехала на пешеходный переход, когда по нему шёл пешеход;
 *  - скорость — быстрее разрешённого на 20 км/ч и больше (в городе можно 60, за городом 90,
 *    на автомагистрали 110);
 *  - встречная — разворот посреди дороги через сплошную осевую линию, то есть выезд на встречную;
 *  - остановка — машина стоит на пешеходном переходе, на перекрёстке, на железнодорожном переезде
 *    или в зоне знака «Остановка запрещена» дольше 3 секунд (новичку — 5), хотя стоять незачем:
 *    впереди не красный и никто не переходит дорогу.
 *
 * За нарушение машину останавливает лейтенант Соколов и задаёт вопрос из базы именно про это
 * правило (оригинальная карточка, правило 3 ТЗ). Модуль без Phaser — его проверяют тесты.
 */
import { distance, dot, rightNormal, scale, sub, add, type Vec } from './geometry.ts';
import { CAR_HALF_LENGTH, type Lane, type RoadGraph, type Turn } from './roadGraph.ts';
import { STOP_LINE, ZEBRA_HALF_DEPTH, districtZebras, noStopLane, type DistrictRules, type Zebra } from './districtRules.ts';
import type { Light } from './traffic.ts';

export type ViolationKind = 'red-light' | 'pedestrian' | 'speeding' | 'oncoming' | 'no-stopping';
export type RoadKind = 'city' | 'country' | 'highway';
/** Где машина остановилась там, где нельзя. */
export type StopPlace = 'crosswalk' | 'junction' | 'railway' | 'zone';

export interface Violation {
  kind: ViolationKind;
  /** Превышение: скорость и ограничение, км/ч. */
  kmh?: number;
  limit?: number;
  road?: RoadKind;
  /** Остановка: где. */
  place?: StopPlace;
  /** Пешеход: переход у перекрёстка (игрок поворачивал или ехал на красный). */
  atJunction?: boolean;
}

/** Подсказка новичку перед нарушением. */
export type Hint =
  | { kind: 'red-light'; node: string; lane: string }
  | { kind: 'pedestrian'; zebra: string }
  | { kind: 'speeding'; limit: number }
  | { kind: 'no-stopping'; place: StopPlace; left: number };

/**
 * Машина игрока едет на 20% быстрее обычной скорости дороги (её держит поток): так по району
 * ездится бодрее. Обычный ход машины в городе — 180 px/s, и на спидометре это 60 км/ч.
 */
export const PLAYER_PACE = 1.2;
/** Перевод скорости машины игрока: пиксели в секунду → км/ч. */
export const KMH_PER_PX = 60 / (150 * PLAYER_PACE);
/** Разрешённая скорость, км/ч (ПДД, п. 10.2–10.3). */
export const SPEED_LIMITS: Record<RoadKind, number> = { city: 60, country: 90, highway: 110 };
/** Превышение с этого запаса — нарушение (как штраф по КоАП 12.9). */
export const SPEEDING_MARGIN = 20;
/** Сколько секунд можно простоять в запрещённом месте, пока это не стало остановкой. */
export const STOP_GRACE = { novice: 5, expert: 3 } as const;
export type Difficulty = keyof typeof STOP_GRACE;

export const kmh = (pxPerSecond: number): number => Math.round(pxPerSecond * KMH_PER_PX);
export const roadKind = (lane: Lane): RoadKind => lane.road.kind ?? 'city';
export const speedLimit = (lane: Lane): number => SPEED_LIMITS[roadKind(lane)];
/** Превышение — нарушение? */
export const isSpeeding = (speedKmh: number, limit: number): boolean => speedKmh >= limit + SPEEDING_MARGIN;

export interface RuleInfo {
  /** Коротко — заголовок карточки. */
  title: string;
  /** Что сказал лейтенант Соколов. */
  says: (v: Violation) => string;
}

const STOP_PLACES: Record<StopPlace, string> = {
  crosswalk: 'на пешеходном переходе',
  junction: 'на перекрёстке',
  railway: 'на железнодорожном переезде',
  zone: 'в зоне знака «Остановка запрещена»',
};

export const RULES: Record<ViolationKind, RuleInfo> = {
  'red-light': { title: 'Проезд на красный', says: () => 'Вы пересекли стоп-линию на красный сигнал светофора.' },
  pedestrian: { title: 'Не пропущен пешеход', says: () => 'Вы въехали на пешеходный переход, когда по нему шёл пешеход.' },
  speeding: { title: 'Превышение скорости', says: (v) => `Радар показал ${v.kmh} км/ч, а здесь можно ${v.limit}.` },
  oncoming: { title: 'Выезд на встречную', says: () => 'Вы развернулись через сплошную линию — это выезд на встречную полосу.' },
  'no-stopping': { title: 'Остановка запрещена', says: (v) => `Вы остановились ${STOP_PLACES[v.place ?? 'zone']}, а здесь останавливаться нельзя.` },
};

/**
 * Вопросы из data/questions.json про каждое правило — отобраны вручную по тексту и картинке
 * билета (номер билета и вопроса: B29-Q06 — билет 29, вопрос 6).
 */
export const RULE_QUESTIONS = {
  /** Сигналы светофора: где остановиться на красный, жёлтый, мигающий зелёный, красный с жёлтым. */
  redLight: ['B29-Q06', 'B17-Q06', 'B05-Q06', 'B01-Q06', 'B35-Q06', 'B15-Q06', 'B10-Q13'],
  /** Нерегулируемый переход: когда уступить пешеходам. */
  pedestrianCrossing: ['B30-Q16', 'B24-Q15', 'B30-Q04', 'B26-Q16'],
  /** Поворот на перекрёстке: уступить пешеходам на переходе. */
  pedestrianTurn: ['B04-Q14', 'B12-Q13', 'B23-Q13', 'B37-Q13', 'B13-Q14', 'B25-Q14', 'B01-Q13'],
  speedCity: ['B12-Q10', 'B19-Q10', 'B31-Q10', 'B18-Q10', 'B32-Q10', 'B25-Q19', 'B23-Q20'],
  speedCountry: ['B13-Q10', 'B16-Q10', 'B01-Q10', 'B11-Q20', 'B36-Q20', 'B25-Q19'],
  speedHighway: ['B06-Q10', 'B36-Q20', 'B11-Q20', 'B25-Q19'],
  /** Сплошная линия и полоса встречного движения. */
  oncoming: ['B31-Q05', 'B33-Q10', 'B17-Q05', 'B32-Q05', 'B02-Q10'],
  stopCrosswalk: ['B25-Q12', 'B34-Q12', 'B38-Q12', 'B26-Q16'],
  stopJunction: ['B02-Q12', 'B40-Q12', 'B21-Q12'],
  stopRailway: ['B35-Q16', 'B24-Q16', 'B27-Q16'],
  /** Знак 3.27 «Остановка запрещена» и жёлтая линия 1.4. */
  stopZone: ['B07-Q03', 'B20-Q03', 'B27-Q03', 'B16-Q05'],
} as const;

/** Вопросы для нарушения — про это правило и это место. */
export function questionsFor(v: Violation): readonly string[] {
  switch (v.kind) {
    case 'red-light':
      return RULE_QUESTIONS.redLight;
    case 'pedestrian':
      return v.atJunction ? RULE_QUESTIONS.pedestrianTurn : RULE_QUESTIONS.pedestrianCrossing;
    case 'speeding':
      return v.road === 'highway' ? RULE_QUESTIONS.speedHighway : v.road === 'country' ? RULE_QUESTIONS.speedCountry : RULE_QUESTIONS.speedCity;
    case 'oncoming':
      return RULE_QUESTIONS.oncoming;
    case 'no-stopping':
      return v.place === 'crosswalk'
        ? RULE_QUESTIONS.stopCrosswalk
        : v.place === 'junction'
          ? RULE_QUESTIONS.stopJunction
          : v.place === 'railway'
            ? RULE_QUESTIONS.stopRailway
            : RULE_QUESTIONS.stopZone;
  }
}

// ─── Наблюдение за ездой ─────────────────────────────────────────────────────────

/** Состояние машины игрока в кадре. */
export interface DriveFrame {
  /** Середина машины. */
  pos: Vec;
  /** Куда смотрит нос (единичный вектор). */
  heading: Vec;
  /** px/s */
  speed: number;
  /** На полосе: полоса и положение середины машины. */
  lane?: Lane;
  s?: number;
  /** В узле или на развороте посреди дороги: траектория и сколько по ней проехано. */
  turn?: Turn;
  turnT?: number;
  /** Игрок тормозит (или отпустил джойстик). */
  braking: boolean;
  /** Сцена у точки, событие в пути, остановка инспектором: правила не проверяются. */
  exempt: boolean;
}

export interface WatchEnv {
  /** Сигнал светофора для полосы, въезжающей в регулируемый перекрёсток. */
  signal(laneId: string): Light | undefined;
  /** Где сейчас пешеходы, переходящие по этому переходу. */
  walkersOn(zebraKey: string): readonly Vec[];
}

export interface WatchResult {
  violation?: Violation;
  hint?: Hint;
  /** Сколько проехано в этом кадре без нарушений (px). */
  clean: number;
}

/** Подсказки: красный — за столько до стоп-линии, пешеход — за столько до перехода (px). */
const HINT_RED = 250;
const HINT_WALKER = 230;
/** Пешеход «на переходе», если он в прямоугольнике «зебры» с таким запасом. */
const WALKER_MARGIN = 3;

export class RuleWatcher {
  readonly zebras: Zebra[];
  private readonly signals: Set<string>;
  private readonly solid: Set<string>;
  private readonly zones: Array<{ lane: Lane; s0: number; s1: number }>;
  private prev?: { lane?: Lane; front?: number; zebras: Set<string> };
  private still = 0;
  /** Где машина остановилась и уже получила нарушение за остановку (пока не отъедет). */
  private stopFined?: Vec;
  private uturnFined?: Turn;
  private paused = false;
  difficulty: Difficulty = 'novice';

  constructor(
    private readonly graph: RoadGraph,
    rules: DistrictRules,
  ) {
    this.zebras = districtZebras(graph, rules);
    this.signals = new Set(rules.signals);
    this.solid = new Set(rules.solid);
    this.zones = rules.noStop.map((z) => noStopLane(graph, z));
  }

  /** Нарушение показано (инспектор остановил машину): до resume() правила не проверяются. */
  get stopped(): boolean {
    return this.paused;
  }

  /** Продолжить после сцены с инспектором. */
  resume(pos: Vec) {
    this.paused = false;
    this.prev = undefined;
    this.still = 0;
    this.stopFined ??= pos;
  }

  /** Середина стоп-линии полосы, въезжающей в регулируемый перекрёсток (расстояние вдоль полосы). */
  stopLine(lane: Lane): number | undefined {
    return this.signals.has(lane.to.id) ? lane.length - STOP_LINE : undefined;
  }

  update(dt: number, f: DriveFrame, env: WatchEnv): WatchResult {
    if (f.exempt || this.paused) {
      this.prev = undefined;
      this.still = 0;
      return { clean: 0 };
    }
    const front = add(f.pos, scale(f.heading, CAR_HALF_LENGTH));
    const frontS = f.lane && f.s !== undefined ? f.s + CAR_HALF_LENGTH : undefined;
    const inZebras = new Set(this.zebras.filter((z) => this.frontInside(z, front)).map((z) => z.key));
    const prev = this.prev;
    this.prev = { lane: f.lane, front: frontS, zebras: inZebras };

    if (f.speed < 2) this.still += dt;
    else this.still = 0;
    if (this.stopFined && distance(this.stopFined, f.pos) > 30) this.stopFined = undefined;
    if (this.uturnFined && f.turn !== this.uturnFined) this.uturnFined = undefined;

    const violation = this.detect(f, env, prev, frontS, inZebras);
    if (violation) {
      this.paused = true;
      if (violation.kind === 'no-stopping') this.stopFined = f.pos;
      return { violation, clean: 0 };
    }
    return { hint: this.hint(f, env, front, frontS), clean: f.speed * dt };
  }

  private detect(f: DriveFrame, env: WatchEnv, prev: RuleWatcher['prev'], frontS: number | undefined, inZebras: Set<string>): Violation | undefined {
    // Красный: бампер пересёк стоп-линию.
    if (f.lane && prev?.lane === f.lane && prev.front !== undefined && frontS !== undefined) {
      const line = this.stopLine(f.lane);
      if (line !== undefined && prev.front < line && frontS >= line && env.signal(f.lane.id) === 'red') return { kind: 'red-light' };
    }
    // Пешеход: въехали на переход, по которому идут.
    if (prev) {
      for (const key of inZebras) {
        if (prev.zebras.has(key)) continue;
        const z = this.zebras.find((x) => x.key === key)!;
        if (this.walkersInside(z, env).length) return { kind: 'pedestrian', atJunction: !!z.node };
      }
    }
    // Скорость.
    const lane = f.lane ?? f.turn?.from;
    if (lane) {
      const speed = kmh(f.speed);
      const limit = speedLimit(lane);
      if (isSpeeding(speed, limit)) return { kind: 'speeding', kmh: speed, limit, road: roadKind(lane) };
    }
    // Разворот через сплошную.
    const t = f.turn;
    if (t?.onRoad && this.solid.has(t.from.road.id) && (f.turnT ?? 0) >= t.path.length * 0.3 && this.uturnFined !== t) {
      this.uturnFined = t;
      return { kind: 'oncoming' };
    }
    // Остановка в запрещённом месте.
    const place = this.stopPlace(f);
    if (place && !this.stopFined && this.still >= STOP_GRACE[this.difficulty] && !this.mustWait(f, env)) return { kind: 'no-stopping', place };
    return undefined;
  }

  private hint(f: DriveFrame, env: WatchEnv, front: Vec, frontS: number | undefined): Hint | undefined {
    const moving = f.speed > 15 && !f.braking;
    // Красный впереди.
    if (moving && f.lane && frontS !== undefined) {
      const line = this.stopLine(f.lane);
      if (line !== undefined && env.signal(f.lane.id) === 'red' && line - frontS > 0 && line - frontS < HINT_RED) return { kind: 'red-light', node: f.lane.to.id, lane: f.lane.id };
    }
    // Пешеход на переходе впереди.
    if (moving) {
      for (const z of this.zebras) {
        const ahead = dot(sub(z.center, front), f.heading) - ZEBRA_HALF_DEPTH;
        if (ahead <= 0 || ahead > HINT_WALKER) continue;
        const side = Math.abs(dot(sub(z.center, front), rightNormal(f.heading)));
        if (side > z.halfWidth + 30) continue;
        if (this.walkersInside(z, env).length) return { kind: 'pedestrian', zebra: z.key };
      }
    }
    // Скорость выше разрешённой.
    const lane = f.lane ?? f.turn?.from;
    if (lane && kmh(f.speed) > speedLimit(lane) + 4) return { kind: 'speeding', limit: speedLimit(lane) };
    // Стоит там, где нельзя.
    const place = this.stopPlace(f);
    if (place && !this.stopFined && this.still > 0.3 && !this.mustWait(f, env)) return { kind: 'no-stopping', place, left: Math.max(0, STOP_GRACE[this.difficulty] - this.still) };
    return undefined;
  }

  /** Бампер на переходе (или вот-вот на нём). */
  private frontInside(z: Zebra, front: Vec): boolean {
    const d = sub(front, z.center);
    return Math.abs(dot(d, z.along)) <= ZEBRA_HALF_DEPTH + 6 && Math.abs(dot(d, rightNormal(z.along))) <= z.halfWidth;
  }

  private walkersInside(z: Zebra, env: WatchEnv): readonly Vec[] {
    return env.walkersOn(z.key).filter((p) => {
      const d = sub(p, z.center);
      return Math.abs(dot(d, z.along)) <= ZEBRA_HALF_DEPTH + WALKER_MARGIN && Math.abs(dot(d, rightNormal(z.along))) <= z.halfWidth + WALKER_MARGIN;
    });
  }

  /** Место, где стоять нельзя (или undefined). */
  stopPlace(f: DriveFrame): StopPlace | undefined {
    if (f.turn && !f.turn.onRoad) return 'junction';
    for (const z of this.zebras) {
      const d = sub(f.pos, z.center);
      if (Math.abs(dot(d, z.along)) <= ZEBRA_HALF_DEPTH + CAR_HALF_LENGTH - 2 && Math.abs(dot(d, rightNormal(z.along))) <= z.halfWidth) return 'crosswalk';
    }
    const rail = this.graph.map.railwayY;
    if (rail !== undefined && Math.abs(f.pos.y - rail) < 22 + CAR_HALF_LENGTH * Math.abs(f.heading.y)) return 'railway';
    if (f.lane && f.s !== undefined) {
      for (const z of this.zones) if (z.lane === f.lane && f.s >= z.s0 && f.s <= z.s1) return 'zone';
    }
    return undefined;
  }

  /** Стоять приходится: впереди не зелёный или по переходу рядом идут пешеходы. */
  private mustWait(f: DriveFrame, env: WatchEnv): boolean {
    if (f.lane && f.s !== undefined && this.signals.has(f.lane.to.id) && env.signal(f.lane.id) !== 'green' && f.lane.length - f.s < 160) return true;
    const front = add(f.pos, scale(f.heading, CAR_HALF_LENGTH));
    for (const z of this.zebras) {
      if (distance(z.center, front) > z.halfWidth + 70) continue;
      if (this.walkersInside(z, env).length || env.walkersOn(z.key).length) return true;
    }
    return false;
  }
}
