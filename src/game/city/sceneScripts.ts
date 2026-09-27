/**
 * Шаблоны сцен: как ситуация собирается из параметров вопроса, как она «оживает»,
 * что происходит при правильном ответе и какое последствие показывается при ошибке.
 *
 * Координаты локальные (см. SceneKit): игрок подъезжает снизу и едет вверх, x — вправо.
 */
import type { Vec } from '../../world/geometry.ts';
import { CAR_HALF_LENGTH, LANE_WIDTH, RING_OUTER } from '../../world/roadGraph.ts';
import type { Consequence, SceneParams, Side, TemplateId, VehicleKind } from '../../world/templates.ts';
import { VEHICLE_SIZE } from './art.ts';
import type { Actor, SceneKit } from './sceneKit.ts';
import type { TrafficLightView } from './signs.ts';

export interface ScriptContext {
  kit: SceneKit;
  params: SceneParams;
  /** Где стоит игрок (локально). */
  player: Vec;
  /** Полуразмер узла (для перекрёстков). */
  radius: number;
  /** Проехать вперёд по будущей траектории на `distance` и снова встать. */
  leadIn(distance: number): Promise<void>;
  /** Резкий рывок вперёд и торможение (почти столкновение). */
  lurch(): Promise<void>;
  /** Постоянные светофоры перекрёстка относительно подъезда игрока. */
  lights?: { own: TrafficLightView; oncoming: TrafficLightView; left: TrafficLightView; right: TrafficLightView };
}

export interface SceneScript {
  /** Подпись к карточке вопроса (для мини-игр: шаг, номер вопроса викторины). */
  caption?: string;
  /** Сцена оживает; когда промис выполнен — можно показывать вопрос. */
  enter(): Promise<void>;
  /** Правильный ответ: сначала проезжают те, кому нужно уступить. */
  success(): Promise<void>;
  /** Неправильный ответ: анимация последствия. */
  fail(kind: Consequence): Promise<void>;
  /** Игрок уезжает: остальные участники тоже разъезжаются. */
  leave(): void;
}

const HALF = LANE_WIDTH / 2;
const len = (kind: VehicleKind) => VEHICLE_SIZE[kind].h;

/** Общие последствия ошибки. */
async function consequence(ctx: ScriptContext, kind: Consequence, conflict?: { actor: Actor; to: Vec }) {
  const { kit, player } = ctx;
  switch (kind) {
    case 'inspector': {
      const police = kit.vehicle('police', player.x, player.y + 320, 0);
      await kit.move(police, [{ x: player.x, y: player.y + 60 }], 260);
      kit.say('Инспектор ДПС: «Нарушение!»', player.x, player.y + 30, 'bad');
      await kit.wait(1500);
      return;
    }
    case 'fine': {
      kit.say('Штраф!', player.x, player.y - 30, 'bad');
      kit.scene.cameras.main.shake(200, 0.003);
      await kit.wait(1500);
      return;
    }
    case 'instructor': {
      kit.say('Инструктор: «Неверно. Давай разберём»', player.x, player.y - 34, 'bad');
      await kit.wait(1500);
      return;
    }
    case 'hazard': {
      if (conflict) {
        void ctx.lurch();
        await kit.move(conflict.actor, [conflict.to], 230);
        kit.say('Опасно!', conflict.to.x, conflict.to.y - 20, 'bad');
      } else {
        // Некому помешать — значит, помеха сзади: водитель сигналит замешкавшемуся игроку.
        const car = kit.vehicle('car', player.x, player.y + 260, 0);
        await kit.move(car, [{ x: player.x, y: player.y + 56 }], 280);
        kit.say('БИП!', player.x, player.y + 30, 'bad');
      }
      kit.scene.cameras.main.shake(260, 0.005);
      await kit.wait(1400);
    }
  }
}

function sayCorrect(ctx: ScriptContext) {
  ctx.kit.say('Верно!', ctx.player.x, ctx.player.y - 34, 'good', 1200);
}

// ─── Перекрёстки ────────────────────────────────────────────────────────────────

interface Approaches {
  left?: Actor;
  right?: Actor;
  oncoming?: Actor;
  emergency?: Actor;
  pedestrians: Actor[];
  cyclist?: Actor;
}

/** Точки ожидания и проезда для участников с трёх сторон перекрёстка. */
function crossing(r: number, ring: boolean) {
  const hold = (kind: VehicleKind) => r + 8 + len(kind) / 2;
  return {
    right: {
      angle: -90,
      start: (k: VehicleKind) => ({ x: hold(k) + 240, y: -HALF }),
      hold: (k: VehicleKind) => ({ x: hold(k), y: -HALF }),
      through: ring
        ? [{ x: r - 10, y: -40 }, { x: 40, y: -r + 8 }, { x: HALF, y: -r - 30 }, { x: HALF, y: -r - 420 }]
        : [{ x: -r - 420, y: -HALF }],
      conflict: { x: 26, y: -HALF + 4 },
    },
    left: {
      angle: 90,
      start: (k: VehicleKind) => ({ x: -hold(k) - 240, y: HALF }),
      hold: (k: VehicleKind) => ({ x: -hold(k), y: HALF }),
      through: ring
        ? [{ x: -r + 10, y: 40 }, { x: -40, y: r - 8 }, { x: -HALF, y: r + 30 }, { x: -HALF, y: r + 420 }]
        : [{ x: r + 420, y: HALF }],
      conflict: { x: -8, y: HALF },
    },
    oncoming: {
      angle: 180,
      start: (k: VehicleKind) => ({ x: -HALF, y: -hold(k) - 240 }),
      hold: (k: VehicleKind) => ({ x: -HALF, y: -hold(k) }),
      through: ring
        ? [{ x: -40, y: -r + 10 }, { x: -r + 8, y: -40 }, { x: -r - 30, y: -HALF }, { x: -r - 420, y: -HALF }]
        : [{ x: -HALF, y: r + 420 }],
      conflict: { x: -HALF + 6, y: 4 },
    },
  };
}

/** Переход, который пересекает игрок при манёвре (для пешеходов и велосипедиста). */
function crosswalkFor(maneuver: SceneParams['maneuver'], r: number) {
  const d = r + 12;
  if (maneuver === 'left') return { from: { x: -d, y: -44 }, to: { x: -d, y: 44 } };
  if (maneuver === 'right') return { from: { x: d, y: 44 }, to: { x: d, y: -44 } };
  return { from: { x: -44, y: -d }, to: { x: 44, y: -d } };
}

function spawnApproaches(ctx: ScriptContext, ring = false): { a: Approaches; arrivals: Promise<void>[] } {
  const { kit, params, radius } = ctx;
  const geo = crossing(radius, ring);
  const a: Approaches = { pedestrians: [] };
  const arrivals: Promise<void>[] = [];
  for (const side of ['right', 'left', 'oncoming'] as const) {
    const kind = side === 'right' ? params.fromRight : side === 'left' ? params.fromLeft : params.oncoming;
    if (!kind) continue;
    const g = geo[side];
    const s = g.start(kind);
    const actor = kit.vehicle(kind, s.x, s.y, g.angle);
    a[side] = actor;
    arrivals.push(kit.move(actor, [g.hold(kind)], 170));
  }
  if (params.emergency) {
    const g = geo.left;
    const s = g.start('ambulance');
    a.emergency = kit.vehicle('ambulance', s.x - 60, s.y, g.angle);
    arrivals.push(kit.move(a.emergency, [{ x: g.hold('ambulance').x - 30, y: g.hold('ambulance').y }], 190));
  }
  const walk = crosswalkFor(params.maneuver, radius);
  if (params.pedestrians === 'crossing' || params.pedestrians === 'waiting') {
    for (let i = 0; i < 2; i++) {
      const p = kit.pedestrian(walk.from.x + i * 8, walk.from.y - i * 10);
      a.pedestrians.push(p);
      if (params.pedestrians === 'crossing') {
        const mid = { x: (walk.from.x + walk.to.x) / 2 + i * 6, y: (walk.from.y + walk.to.y) / 2 - i * 6 };
        arrivals.push(kit.move(p, [mid], 26 + i * 4));
      }
    }
  }
  if (params.cyclist) {
    a.cyclist = kit.vehicle('bicycle', walk.from.x - 30, walk.from.y - 26, 180);
    arrivals.push(kit.move(a.cyclist, [{ x: walk.from.x, y: walk.from.y - 6 }], 60));
  }
  return { a, arrivals };
}

function actorsFor(a: Approaches, sides: SceneParams['yieldTo']): Array<{ actor: Actor; key: Side | 'pedestrians' | 'cyclist' }> {
  const list: Array<{ actor: Actor; key: Side | 'pedestrians' | 'cyclist' }> = [];
  for (const key of sides ?? []) {
    if (key === 'pedestrians') a.pedestrians.forEach((actor) => list.push({ actor, key }));
    else if (key === 'cyclist') {
      if (a.cyclist) list.push({ actor: a.cyclist, key });
    } else {
      const actor = a[key];
      if (actor) list.push({ actor, key });
    }
  }
  return list;
}

function intersectionScript(ctx: ScriptContext, template: TemplateId): SceneScript {
  const { kit, params, radius: r } = ctx;
  const ring = template === 'roundabout';
  const geo = crossing(r, ring);
  const walk = crosswalkFor(params.maneuver, r);
  let a: Approaches = { pedestrians: [] };
  const passThrough = (actor: Actor, key: Side | 'pedestrians' | 'cyclist', speed = 170) => {
    if (key === 'pedestrians') return kit.move(actor, [{ x: walk.to.x, y: walk.to.y }], 34, false);
    if (key === 'cyclist') return kit.move(actor, [{ x: walk.to.x - 4, y: walk.to.y }, { x: walk.to.x - 4, y: walk.to.y + 300 }], 70);
    return kit.move(actor, geo[key].through, speed);
  };

  const signsFor = () => {
    // Пустой список знаков — на перекрёстке знаков нет совсем (например, выезд с грунтовой дороги).
    if (params.signs && params.signs.length === 0) return;
    let own = params.signs;
    if (!own) {
      if (template === 'uncontrolled-priority') own = [params.playerOn === 'secondary' ? '2.4' : '2.1'];
      if (template === 'roundabout') own = ['4.3'];
    }
    own?.forEach((code, i) => kit.sign(code, r + 18, r + 44 + i * 34));
    if (template === 'uncontrolled-priority') {
      const cross = params.playerOn === 'secondary' ? '2.1' : '2.4';
      kit.sign(cross, -r - 44, r + 18);
      kit.sign(cross, r + 44, -r - 18);
    }
    if (template === 'roundabout') {
      kit.sign('4.3', -r - 18, -r - 44);
      kit.sign('4.3', -r - 44, r + 18);
      kit.sign('4.3', r + 44, -r - 18);
    }
  };

  return {
    async enter() {
      signsFor();
      if (template === 'signalized' && ctx.lights) {
        const own = params.controller ? 'off' : (params.light ?? 'green');
        ctx.lights.own.setState(own);
        ctx.lights.oncoming.setState(own);
        const cross = own === 'green' || own === 'green-blink' || own === 'yellow' ? 'red' : own === 'red' ? 'green' : own;
        ctx.lights.left.setState(cross);
        ctx.lights.right.setState(cross);
        ctx.lights.own.setArrow(params.controller ? undefined : params.arrow);
        if (params.controller) {
          kit.controller(0, 0, params.controller === 'side' ? 90 : 180);
          if (params.controller === 'up') kit.say('Жезл поднят вверх', 0, -30, 'info');
          if (params.controller === 'right-arm') kit.say('Правая рука вытянута вперёд', 0, -30, 'info');
        }
      }
      const spawned = spawnApproaches(ctx, ring);
      a = spawned.a;
      if (ring && params.playerOnRing) spawned.arrivals.push(ctx.leadIn(RING_OUTER - 10));
      await Promise.all(spawned.arrivals);
      await kit.wait(350);
    },
    async success() {
      sayCorrect(ctx);
      const first = actorsFor(a, params.yieldTo);
      if (a.emergency) first.unshift({ actor: a.emergency, key: 'left' });
      await Promise.all(first.map(({ actor, key }) => passThrough(actor, key)));
    },
    async fail(kind) {
      const target = actorsFor(a, params.yieldTo)[0] ?? (a.emergency ? { actor: a.emergency, key: 'left' as const } : undefined);
      if (kind === 'hazard' && target && target.key !== 'pedestrians' && target.key !== 'cyclist') {
        await consequence(ctx, kind, { actor: target.actor, to: geo[target.key].conflict });
      } else if (kind === 'hazard' && target) {
        void ctx.lurch();
        kit.say('Пешеход в опасности!', target.actor.obj.x, target.actor.obj.y - 16, 'bad');
        kit.scene.cameras.main.shake(260, 0.005);
        await kit.wait(1500);
      } else await consequence(ctx, kind);
    },
    leave() {
      ctx.lights?.own.setArrow(undefined);
      for (const side of ['right', 'left', 'oncoming'] as const) {
        const actor = a[side];
        if (actor) kit.after(700, () => void passThrough(actor, side));
      }
      a.pedestrians.forEach((p) => void kit.move(p, [walk.to], 34, false));
      if (a.cyclist) void passThrough(a.cyclist, 'cyclist');
      if (a.emergency) void kit.move(a.emergency, geo.left.through, 200);
    },
  };
}

// ─── Участки дороги ─────────────────────────────────────────────────────────────

function markingLine(kit: SceneKit, style: SceneParams['marking'], from: number, to: number) {
  const g = kit.markings;
  // Перекрываем обычную разметку асфальтом и рисуем нужную.
  g.fillStyle(0x40454e).fillRect(-3, from, 6, to - from);
  g.fillStyle(0xeef0f2);
  if (style === 'solid') g.fillRect(-1, from, 2, to - from);
  else if (style === 'double') g.fillRect(-3, from, 2, to - from).fillRect(1, from, 2, to - from);
  else for (let y = from; y < to; y += 34) g.fillRect(-1, y, 2, Math.min(18, to - y));
}

function signRow(kit: SceneKit, codes: string[] | undefined, x: number, y0: number, step: number, letters = false) {
  const names = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
  codes?.forEach((code, i) => kit.sign(code, x, y0 + i * step, letters && codes.length > 1 ? names[i] : undefined));
}

function crosswalkScript(ctx: ScriptContext): SceneScript {
  const { kit, params } = ctx;
  const peds: Actor[] = [];
  const jam: Actor[] = [];
  let oncoming: Actor | undefined;
  return {
    async enter() {
      kit.sign('5.19.1', 44, 12);
      kit.sign('5.19.2', -44, -12);
      const arrivals: Promise<void>[] = [];
      const mode = params.pedestrians ?? 'crossing';
      if (mode !== 'none') {
        for (let i = 0; i < 2; i++) {
          const p = kit.pedestrian(52 + i * 10, -4 + i * 8, -90);
          peds.push(p);
          if (mode === 'crossing') arrivals.push(kit.move(p, [{ x: 8 - i * 12, y: -4 + i * 8 }], 28));
        }
      }
      if (params.jam) {
        for (let i = 0; i < 4; i++) {
          const car = kit.vehicle('car', HALF, -34 - CAR_HALF_LENGTH - i * 48, 0);
          jam.push(car);
        }
        kit.say('Затор сразу за переходом', HALF, -60, 'info', 2500);
      }
      if (params.oncoming) {
        oncoming = kit.vehicle(params.oncoming, -HALF, -420, 180);
        arrivals.push(kit.move(oncoming, [{ x: -HALF, y: -60 }], 150));
      }
      await Promise.all(arrivals);
      await kit.wait(300);
    },
    async success() {
      sayCorrect(ctx);
      await Promise.all(peds.map((p, i) => kit.move(p, [{ x: -52 - i * 10, y: p.obj.y }], 36, false)));
      if (jam.length) {
        await Promise.all(jam.map((c) => kit.move(c, [{ x: HALF, y: c.obj.y - 260 }], 90)));
      }
    },
    async fail(kind) {
      if (kind === 'hazard' && peds[0]) {
        void ctx.lurch();
        kit.say('Пешеход в опасности!', peds[0].obj.x, peds[0].obj.y - 16, 'bad');
        void kit.move(peds[0], [{ x: peds[0].obj.x + 18, y: peds[0].obj.y }], 60, false);
        kit.scene.cameras.main.shake(260, 0.005);
        await kit.wait(1500);
      } else await consequence(ctx, kind);
    },
    leave() {
      peds.forEach((p, i) => void kit.move(p, [{ x: -60 - i * 10, y: p.obj.y }], 36, false));
      jam.forEach((c) => void kit.move(c, [{ x: HALF, y: c.obj.y - 400 }], 120));
      if (oncoming) void kit.move(oncoming, [{ x: -HALF, y: 500 }], 170);
    },
  };
}

function busStopScript(ctx: ScriptContext): SceneScript {
  const { kit, params } = ctx;
  let bus: Actor | undefined;
  const people: Actor[] = [];
  let oncoming: Actor | undefined;
  const bay = LANE_WIDTH + 14;
  return {
    async enter() {
      kit.sign(params.vehicle === 'tram' ? '5.17' : '5.16', bay + 30, -52);
      if (params.vehicle !== 'none') {
        bus = kit.vehicle(params.vehicle ?? 'bus', bay, -8, 0);
        if (params.leaving) kit.blink(bus, 'left');
      }
      for (let i = 0; i < 3; i++) people.push(kit.pedestrian(bay + 26 + (i % 2) * 10, -30 + i * 16, -90));
      if (params.pedestrians === 'crossing' && bus) {
        // Пассажиры идут к автобусу (трамваю) и от него.
        people.forEach((p, i) => void kit.move(p, [{ x: bay + 16, y: -30 + i * 16 }], 22, false));
      }
      if (params.oncoming) {
        oncoming = kit.vehicle(params.oncoming, -HALF, -420, 180);
        await kit.move(oncoming, [{ x: -HALF, y: -120 }], 160);
      }
      await kit.wait(600);
    },
    async success() {
      sayCorrect(ctx);
      if (bus && params.leaving) await kit.move(bus, [{ x: bay - 4, y: -40 }, { x: HALF, y: -120 }, { x: HALF, y: -460 }], 110);
    },
    async fail(kind) {
      if (kind === 'hazard' && bus) {
        await consequence(ctx, kind, { actor: bus, to: { x: HALF + 6, y: -44 } });
      } else await consequence(ctx, kind);
    },
    leave() {
      if (bus) void kit.move(bus, [{ x: HALF, y: -140 }, { x: HALF, y: -600 }], 120);
      if (oncoming) void kit.move(oncoming, [{ x: -HALF, y: 600 }], 180);
    },
  };
}

function railwayScript(ctx: ScriptContext): SceneScript {
  const { kit, params } = ctx;
  let train: Actor | undefined;
  const signal = kit.scene.add.graphics();
  let blinking = false;
  const drawBarrier = (closed: boolean) => {
    const g = kit.markings;
    g.fillStyle(0x6b7280).fillRect(LANE_WIDTH + 4, 26, 5, 5).fillRect(-LANE_WIDTH - 9, -31, 5, 5);
    if (!closed) return;
    for (let x = 0; x < LANE_WIDTH + 4; x += 8) g.fillStyle(x % 16 ? 0xffffff : 0xd62839).fillRect(x, 27, 8, 3);
    for (let x = -LANE_WIDTH - 4; x < 0; x += 8) g.fillStyle(x % 16 ? 0xffffff : 0xd62839).fillRect(x, -30, 8, 3);
  };
  return {
    async enter() {
      kit.sign('1.3.1', 44, 30);
      kit.sign('1.3.1', -44, -30);
      signRow(kit, params.signs?.filter((s) => s !== '1.3.1'), 44, 64, 34);
      drawBarrier(params.barrier === 'closed');
      if (params.ahead) {
        // Впереди стоит машина: перед шлагбаумом или сразу за переездом.
        const beyond = params.barrier !== 'closed';
        kit.vehicle(params.ahead, HALF, beyond ? -70 - len(params.ahead) / 2 : 40 + len(params.ahead) / 2, 0);
      }
      kit.billboards.add(signal);
      const w = kit.toWorld({ x: 58, y: 40 });
      signal.setPosition(w.x - kit.anchor.x, w.y - kit.anchor.y);
      if (params.train || params.barrier === 'closed' || params.light === 'red') blinking = true;
      const tick = () => {
        if (!signal.active) return;
        signal.clear();
        signal.fillStyle(0x1f2328).fillRoundedRect(-12, -40, 24, 12, 4);
        const on = Math.floor(Date.now() / 450) % 2;
        signal.fillStyle(blinking && on ? 0xff3b30 : 0x4a1d1d).fillCircle(-6, -34, 4);
        signal.fillStyle(blinking && !on ? 0xff3b30 : 0x4a1d1d).fillCircle(6, -34, 4);
        signal.fillStyle(0x6b7280).fillRect(-1, -28, 2, 28);
        kit.after(150, tick);
      };
      tick();
      if (params.train) {
        const g = kit.scene.add.graphics();
        g.fillStyle(0x000000, 0.25).fillRoundedRect(-18, -100 + 4, 40, 380, 6);
        g.fillStyle(0x2f6f9f).fillRoundedRect(-14, -100, 28, 60, 8);
        g.fillStyle(0x1d3557).fillRect(-10, -96, 20, 8);
        for (let i = 0; i < 4; i++) g.fillStyle(0x3b6ea5).fillRect(-14, -34 + i * 74, 28, 68);
        const obj = kit.scene.add.container(-900, 0, [g]).setRotation(Math.PI / 2);
        kit.root.add(obj);
        train = { obj, kind: 'truck', headlights: true };
        kit.actors.push(train);
        await kit.move(train, [{ x: -230, y: 0 }], 260, false);
      }
      await kit.wait(400);
    },
    async success() {
      sayCorrect(ctx);
      if (train) await kit.move(train, [{ x: 900, y: 0 }], 300, false);
      blinking = false;
    },
    async fail(kind) {
      if (kind === 'hazard') {
        void ctx.lurch();
        kit.say('ТУ-ТУУУ! Поезд!', 0, -40, 'bad');
        kit.scene.cameras.main.shake(300, 0.006);
        if (train) await kit.move(train, [{ x: 60, y: 0 }], 420, false);
        await kit.wait(1100);
      } else await consequence(ctx, kind);
    },
    leave() {
      if (train) void kit.move(train, [{ x: 1000, y: 0 }], 320, false);
      blinking = false;
    },
  };
}

function overtakingScript(ctx: ScriptContext): SceneScript {
  const { kit, params, player } = ctx;
  let ahead: Actor | undefined;
  let oncoming: Actor | undefined;
  return {
    async enter() {
      markingLine(kit, params.marking ?? 'dashed', -520, 220);
      signRow(kit, params.signs, 44, player.y - 60, -36);
      const arrivals: Promise<void>[] = [];
      if (params.obstacle) {
        // Препятствие на своей полосе: стоящая машина со знаком аварийной остановки.
        kit.vehicle('car', HALF, player.y - 150, 0, 0x8d99ae);
        const g = kit.markings;
        const ty = player.y - 104;
        g.fillStyle(0xd62839).fillTriangle(HALF, ty - 8, HALF + 8, ty + 6, HALF - 8, ty + 6);
        g.fillStyle(0xffffff).fillTriangle(HALF, ty - 3, HALF + 4, ty + 3.5, HALF - 4, ty + 3.5);
      } else if (params.ahead || !params.oncoming) {
        const kind = params.ahead ?? 'truck';
        ahead = kit.vehicle(kind, HALF, player.y - 180, 0);
        arrivals.push(kit.move(ahead, [{ x: HALF, y: player.y - 40 - len(kind) / 2 - CAR_HALF_LENGTH }], 110));
        if (params.leftSignal) kit.blink(ahead, 'left');
      }
      if (params.oncoming !== undefined || !params.ahead) {
        oncoming = kit.vehicle(params.oncoming ?? 'car', -HALF, player.y - 700, 180);
        arrivals.push(kit.move(oncoming, [{ x: -HALF, y: player.y - 330 }], 200));
      }
      await Promise.all(arrivals);
      await kit.wait(300);
    },
    async success() {
      sayCorrect(ctx);
      const moves: Promise<void>[] = [];
      if (oncoming) moves.push(kit.move(oncoming, [{ x: -HALF, y: player.y + 400 }], 220));
      if (ahead && params.leftSignal) moves.push(kit.move(ahead, [{ x: -6, y: ahead.obj.y - 70 }, { x: -90, y: ahead.obj.y - 120 }, { x: -260, y: ahead.obj.y - 150 }], 90));
      else if (ahead) moves.push(kit.move(ahead, [{ x: HALF, y: player.y - 800 }], 150));
      await Promise.all(moves);
    },
    async fail(kind) {
      if (kind === 'hazard' && oncoming) {
        void ctx.lurch();
        await kit.move(oncoming, [{ x: -HALF, y: player.y - 120 }], 260);
        kit.say('Встречная! БИП!', -HALF, player.y - 150, 'bad');
        kit.scene.cameras.main.shake(260, 0.005);
        await kit.wait(1300);
      } else await consequence(ctx, kind);
    },
    leave() {
      if (oncoming) void kit.move(oncoming, [{ x: -HALF, y: player.y + 500 }], 220);
      if (ahead) void kit.move(ahead, [{ x: HALF, y: -900 }], 150);
    },
  };
}

function parkingScript(ctx: ScriptContext): SceneScript {
  const { kit, params, player } = ctx;
  const bay = LANE_WIDTH + 13;
  let oncoming: Actor | undefined;
  return {
    async enter() {
      kit.vehicle('car', bay, 70, 0);
      kit.vehicle('car', bay, -72, 0, 0x8d99ae);
      if (params.crosswalkAhead) {
        const g = kit.markings;
        g.fillStyle(0xeef0f2);
        for (let x = -LANE_WIDTH + 4; x < LANE_WIDTH - 2; x += 8) g.fillRect(x, -150, 5, 16);
        kit.sign('5.19.1', 44, -128);
      }
      if (params.marking) markingLine(kit, params.marking, -300, 200);
      signRow(kit, params.signs, 62, -20, -36);
      if (params.oncoming) {
        oncoming = kit.vehicle(params.oncoming, -HALF, -400, 180);
        await kit.move(oncoming, [{ x: -HALF, y: -150 }], 160);
      }
      await kit.wait(500);
    },
    async success() {
      sayCorrect(ctx);
    },
    fail: (kind) => consequence(ctx, kind),
    leave() {
      if (oncoming) void kit.move(oncoming, [{ x: -HALF, y: player.y + 500 }], 180);
    },
  };
}

function straightRoadScript(ctx: ScriptContext, template: TemplateId): SceneScript {
  const { kit, params, player } = ctx;
  const highway = template === 'highway';
  const night = template === 'night-road';
  const actors: Actor[] = [];
  let oncoming: Actor | undefined;
  let running = true;
  const laneX = highway ? { ownLeft: 21, own: 51, oncomingNear: -21, oncomingFar: -51 } : { ownLeft: HALF, own: HALF, oncomingNear: -HALF, oncomingFar: -HALF };
  const traffic = () => {
    // Поток на автомагистрали: машины обгоняют по левой полосе и идут навстречу.
    if (!running) return;
    const car = kit.vehicle('car', laneX.ownLeft, player.y + 300, 0);
    void kit.move(car, [{ x: laneX.ownLeft, y: player.y - 900 }], 260).then(() => car.obj.destroy());
    const back = kit.vehicle(Math.random() < 0.3 ? 'truck' : 'car', Math.random() < 0.5 ? laneX.oncomingNear : laneX.oncomingFar, player.y - 700, 180);
    void kit.move(back, [{ x: back.obj.x, y: player.y + 600 }], 240).then(() => back.obj.destroy());
    kit.after(1600 + Math.random() * 1200, traffic);
  };
  return {
    async enter() {
      if (params.marking) markingLine(kit, params.marking, -400, 200);
      const signX = highway ? 84 : 44;
      signRow(kit, params.signs, signX, player.y - 70, -40, template === 'signs-marking');
      const arrivals: Promise<void>[] = [];
      if (template === 'street' && !params.ahead && !params.oncoming) {
        // Обычная улица: навстречу проезжает машина.
        oncoming = kit.vehicle('car', laneX.oncomingNear, player.y - 700, 180);
        arrivals.push(kit.move(oncoming, [{ x: laneX.oncomingNear, y: player.y - 320 }], 190));
      }
      if (params.ahead) {
        const a = kit.vehicle(params.ahead, laneX.own, player.y - 300, 0);
        actors.push(a);
        arrivals.push(kit.move(a, [{ x: laneX.own, y: player.y - 90 }], 150));
      }
      if (params.oncoming || night) {
        oncoming = kit.vehicle(params.oncoming ?? 'car', laneX.oncomingNear, player.y - 800, 180);
        if (params.highBeam) oncoming.highBeam = true;
        arrivals.push(kit.move(oncoming, [{ x: laneX.oncomingNear, y: player.y - (night ? 200 : 300) }], 190));
      }
      if (highway) traffic();
      await Promise.all(arrivals);
      await kit.wait(400);
    },
    async success() {
      sayCorrect(ctx);
      if (oncoming) {
        if (oncoming.highBeam) {
          oncoming.highBeam = false;
          kit.say('Встречный переключил свет на ближний', oncoming.obj.x, oncoming.obj.y + 30, 'info', 1400);
          await kit.wait(700);
        }
        await kit.move(oncoming, [{ x: oncoming.obj.x, y: player.y + 500 }], 220);
      }
    },
    async fail(kind) {
      if (kind === 'hazard' && oncoming) {
        void ctx.lurch();
        oncoming.highBeam = true;
        await kit.move(oncoming, [{ x: oncoming.obj.x, y: player.y - 150 }], 260);
        kit.scene.cameras.main.flash(450, 255, 250, 220);
        kit.say(night ? 'Ослепление! БИП!' : 'Опасно! БИП!', oncoming.obj.x, oncoming.obj.y - 30, 'bad');
        await kit.wait(1400);
      } else await consequence(ctx, kind);
    },
    leave() {
      running = false;
      if (oncoming) void kit.move(oncoming, [{ x: oncoming.obj.x, y: player.y + 600 }], 220);
      actors.forEach((a) => {
        if (a.kind !== 'pedestrian') void kit.move(a, [{ x: a.obj.x, y: -1000 }], 160);
      });
    },
  };
}

export function createScript(template: TemplateId, ctx: ScriptContext): SceneScript {
  switch (template) {
    case 'signalized':
    case 'uncontrolled-equal':
    case 'uncontrolled-priority':
    case 'roundabout':
      return intersectionScript(ctx, template);
    case 'crosswalk':
      return crosswalkScript(ctx);
    case 'bus-stop':
      return busStopScript(ctx);
    case 'railway':
      return railwayScript(ctx);
    case 'overtaking':
      return overtakingScript(ctx);
    case 'parking':
      return parkingScript(ctx);
    case 'signs-marking':
    case 'street':
    case 'highway':
    case 'night-road':
      return straightRoadScript(ctx, template);
    case 'classroom':
    case 'inspector':
    case 'garage':
    case 'first-aid':
      throw new Error(`«${template}» — мини-игра, её сценарий в InteriorScene`);
  }
}

/** Условия (время суток, погода) сцены: по параметрам, для ночной дороги по умолчанию — ночь. */
export function sceneConditions(template: TemplateId, params: SceneParams) {
  const c = { ...(params.conditions ?? {}) };
  if (template === 'night-road' && !c.time && !c.weather) c.time = 'night';
  return c;
}
