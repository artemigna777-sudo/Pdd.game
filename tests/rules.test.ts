/**
 * Этап 8: правила за рулём. Где в районах стоят светофоры, переходы, сплошная и зона
 * «Остановка запрещена»; как город замечает каждое нарушение и какие подсказки видит новичок.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { add, scale, type Vec } from '../src/world/geometry.ts';
import { MAPS, type Mapping } from '../src/world/mapping.ts';
import { CAR_HALF_LENGTH, RoadGraph, type Lane, type Turn } from '../src/world/roadGraph.ts';
import { TEMPLATES } from '../src/world/templates.ts';
import { STOP_LINE, crossingCenter, districtRules, districtZebras, noStopLane, type DistrictRules } from '../src/world/districtRules.ts';
import { RULE_QUESTIONS, RuleWatcher, SPEED_LIMITS, isSpeeding, kmh, questionsFor, type DriveFrame, type Violation, type WatchEnv } from '../src/world/rules.ts';
import type { Light } from '../src/world/traffic.ts';

const MAPPING: Mapping = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const QUESTIONS: { id: string; topic: string }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const TOPIC = new Map(QUESTIONS.map((q) => [q.id, q.topic]));

function chapter(id: string) {
  const ch = MAPPING.chapters.find((c) => c.id === id)!;
  const graph = new RoadGraph(MAPS[ch.map]);
  return { ch, graph, rules: districtRules(graph, ch.points) };
}

test('в каждом районе — светофоры, переходы, сплошная и зона «Остановка запрещена», в стороне от сцен', () => {
  for (const c of MAPPING.chapters) {
    const { graph, rules } = chapter(c.id);
    const again = districtRules(graph, c.points);
    assert.deepEqual(again, rules, `${c.id}: расстановка должна быть одинаковой`);
    assert.ok(rules.signals.length >= 2, `${c.id}: светофоров ${rules.signals.length}`);
    assert.ok(rules.crossings.length >= 2, `${c.id}: переходов ${rules.crossings.length}`);
    assert.equal(rules.solid.length, 1, `${c.id}: сплошная`);
    assert.equal(rules.noStop.length, 1, `${c.id}: зона «Остановка запрещена»`);

    const roadScenes = new Set(c.points.filter((p) => TEMPLATES[p.template].anchor === 'road').map((p) => p.road));
    const nodeScenes = c.points.filter((p) => TEMPLATES[p.template].anchor === 'node');
    for (const id of rules.signals) {
      const node = graph.node(id);
      assert.equal(node.kind ?? 'junction', 'junction', `${c.id}: светофор на ${id}`);
      // На перекрёстке со светофорами — только сцены регулируемого перекрёстка.
      for (const p of nodeScenes) if (p.toward === id) assert.equal(p.template, 'signalized', `${c.id}: у ${id} сцена ${p.template}`);
    }
    for (const x of rules.crossings) {
      if (x.poi) continue;
      assert.ok(!roadScenes.has(x.road), `${c.id}: переход на дороге со сценой ${x.road}`);
      assert.equal(graph.map.roads.find((r) => r.id === x.road)!.kind ?? 'city', 'city');
    }
    for (const id of rules.solid) assert.ok(!roadScenes.has(id), `${c.id}: сплошная на дороге со сценой ${id}`);
    for (const z of rules.noStop) {
      assert.ok(!roadScenes.has(z.road), `${c.id}: зона на дороге со сценой ${z.road}`);
      const { lane, s0, s1 } = noStopLane(graph, z);
      assert.ok(s0 > 0 && s1 < lane.length && s1 - s0 > 100, `${c.id}: зона внутри полосы`);
    }
    // Флажку доставки и поручению остаётся место: хотя бы две городские улицы без сцен, переходов и зон.
    const busy = new Set([...c.points.map((p) => p.road), ...rules.crossings.map((x) => x.road), ...rules.noStop.map((z) => z.road)]);
    const free = graph.map.roads.filter((r) => (r.kind ?? 'city') === 'city' && !busy.has(r.id));
    assert.ok(free.length >= 2, `${c.id}: свободных улиц ${free.length}`);
  }
});

test('вопросы про каждое правило — из базы и по теме', () => {
  const topics: Record<keyof typeof RULE_QUESTIONS, string[]> = {
    redLight: ['Сигналы светофора и регулировщика', 'Проезд перекрёстков'],
    pedestrianCrossing: ['Пешеходные переходы и остановки', 'Проезд перекрёстков', 'Дорожные знаки'],
    pedestrianTurn: ['Проезд перекрёстков'],
    speedCity: ['Скорость движения', 'Безопасность и техника управления'],
    speedCountry: ['Скорость движения', 'Безопасность и техника управления'],
    speedHighway: ['Скорость движения', 'Безопасность и техника управления'],
    oncoming: ['Дорожная разметка', 'Расположение на проезжей части'],
    stopCrosswalk: ['Остановка и стоянка', 'Пешеходные переходы и остановки'],
    stopJunction: ['Остановка и стоянка'],
    stopRailway: ['Железнодорожные переезды'],
    stopZone: ['Дорожные знаки', 'Дорожная разметка'],
  };
  for (const [pool, ids] of Object.entries(RULE_QUESTIONS) as Array<[keyof typeof RULE_QUESTIONS, readonly string[]]>) {
    assert.ok(ids.length >= 3, pool);
    assert.equal(new Set(ids).size, ids.length, `${pool}: повтор`);
    for (const id of ids) {
      assert.ok(TOPIC.has(id), `${pool}: нет вопроса ${id}`);
      assert.ok(topics[pool].includes(TOPIC.get(id)!), `${pool}: ${id} — тема «${TOPIC.get(id)}»`);
    }
  }
  const pick = (v: Violation) => questionsFor(v);
  assert.equal(pick({ kind: 'red-light' }), RULE_QUESTIONS.redLight);
  assert.equal(pick({ kind: 'pedestrian', atJunction: true }), RULE_QUESTIONS.pedestrianTurn);
  assert.equal(pick({ kind: 'pedestrian' }), RULE_QUESTIONS.pedestrianCrossing);
  assert.equal(pick({ kind: 'speeding', road: 'city' }), RULE_QUESTIONS.speedCity);
  assert.equal(pick({ kind: 'speeding', road: 'country' }), RULE_QUESTIONS.speedCountry);
  assert.equal(pick({ kind: 'speeding', road: 'highway' }), RULE_QUESTIONS.speedHighway);
  assert.equal(pick({ kind: 'oncoming' }), RULE_QUESTIONS.oncoming);
  assert.equal(pick({ kind: 'no-stopping', place: 'crosswalk' }), RULE_QUESTIONS.stopCrosswalk);
  assert.equal(pick({ kind: 'no-stopping', place: 'junction' }), RULE_QUESTIONS.stopJunction);
  assert.equal(pick({ kind: 'no-stopping', place: 'railway' }), RULE_QUESTIONS.stopRailway);
  assert.equal(pick({ kind: 'no-stopping', place: 'zone' }), RULE_QUESTIONS.stopZone);
});

test('скорость: в городе 60, за городом 90, на автомагистрали 110; нарушение — от +20 км/ч', () => {
  // Обычный ход машины игрока в городе — 180 px/s (на 20% быстрее потока), это 60 км/ч.
  assert.equal(kmh(180), 60);
  assert.deepEqual(SPEED_LIMITS, { city: 60, country: 90, highway: 110 });
  assert.equal(isSpeeding(79, 60), false);
  assert.equal(isSpeeding(80, 60), true);
  assert.equal(isSpeeding(109, 90), false);
  assert.equal(isSpeeding(130, 110), true);
});

// ─── Езда по кадрам ─────────────────────────────────────────────────────────────

interface Scenario {
  graph: RoadGraph;
  rules: DistrictRules;
  watcher: RuleWatcher;
  light: Light | undefined;
  walkers: Map<string, Vec[]>;
  env: WatchEnv;
}

function scenario(id = 'ch1', difficulty: 'novice' | 'expert' = 'expert'): Scenario {
  const { graph, rules } = chapter(id);
  const watcher = new RuleWatcher(graph, rules);
  watcher.difficulty = difficulty;
  const sc: Scenario = {
    graph,
    rules,
    watcher,
    light: 'red',
    walkers: new Map(),
    env: {
      signal: (laneId) => (rules.signals.includes(graph.lane(laneId).to.id) ? sc.light : undefined),
      walkersOn: (key) => sc.walkers.get(key) ?? [],
    },
  };
  return sc;
}

const onLane = (lane: Lane, s: number, speed: number, extra: Partial<DriveFrame> = {}): DriveFrame => ({
  pos: add(lane.start, scale(lane.dir, s)),
  heading: lane.dir,
  speed,
  lane,
  s,
  braking: false,
  exempt: false,
  ...extra,
});

/** Проехать по полосе от s0 до s1 со скоростью speed; вернуть первое нарушение и все подсказки. */
function drive(sc: Scenario, lane: Lane, s0: number, s1: number, speed: number, extra: Partial<DriveFrame> = {}) {
  const dt = 1 / 30;
  const hints: string[] = [];
  let clean = 0;
  for (let s = s0; s <= s1; s += speed * dt) {
    const r = sc.watcher.update(dt, onLane(lane, s, speed, extra), sc.env);
    clean += r.clean;
    if (r.hint) hints.push(r.hint.kind);
    if (r.violation) return { violation: r.violation, hints, clean, s };
  }
  return { violation: undefined, hints, clean, s: s1 };
}

/** Постоять на месте `seconds` секунд. */
function stand(sc: Scenario, frame: DriveFrame, seconds: number) {
  const dt = 1 / 30;
  const hints: string[] = [];
  for (let t = 0; t < seconds; t += dt) {
    const r = sc.watcher.update(dt, { ...frame, speed: 0 }, sc.env);
    if (r.hint) hints.push(r.hint.kind);
    if (r.violation) return { violation: r.violation, hints, t };
  }
  return { violation: undefined, hints, t: seconds };
}

const signalLane = (sc: Scenario) => [...sc.graph.lanes.values()].find((l) => sc.rules.signals.includes(l.to.id) && l.length > 300)!;

test('красный: пересёк стоп-линию на красный — нарушение; на жёлтый и зелёный — нет', () => {
  for (const [light, expected] of [
    ['red', 'red-light'],
    ['yellow', undefined],
    ['green', undefined],
  ] as const) {
    const sc = scenario();
    sc.light = light;
    const lane = signalLane(sc);
    const r = drive(sc, lane, lane.length - 200, lane.length - 1, 150);
    assert.equal(r.violation?.kind, expected, `свет ${light}`);
    if (expected) assert.ok(Math.abs(r.s + CAR_HALF_LENGTH - (lane.length - STOP_LINE)) < 6, 'нарушение — на стоп-линии');
  }
});

test('красный: остановился перед стоп-линией, дождался зелёного — нарушения нет; новичку — подсказка', () => {
  const sc = scenario('ch1', 'novice');
  const lane = signalLane(sc);
  const line = lane.length - STOP_LINE;
  // Подъезжает на красный, не тормозя, — подсказка.
  const approach = drive(sc, lane, line - 260, line - 180, 150);
  assert.ok(approach.hints.includes('red-light'));
  // Тормозит — подсказки нет, стоит перед линией.
  const braking = drive(sc, lane, line - 179, line - 60, 60, { braking: true });
  assert.ok(!braking.hints.includes('red-light'));
  const wait = stand(sc, onLane(lane, line - CAR_HALF_LENGTH - 8, 0), 8);
  assert.equal(wait.violation, undefined, 'ожидание на красный — не остановка в запрещённом месте');
  sc.light = 'green';
  assert.equal(drive(sc, lane, line - CAR_HALF_LENGTH - 8, lane.length - 1, 80).violation, undefined);
});

test('пешеход: въехал на переход, по которому идут, — нарушение; переход пустой — нет', () => {
  const sc = scenario();
  const crossing = sc.rules.crossings.find((c) => !c.poi)!;
  const lane = sc.graph.laneFor(crossing.road, crossing.toward);
  const center = crossingCenter(sc.graph, crossing);
  const zs = sc.graph.laneDistanceAt(lane, crossing.at);
  assert.equal(drive(sc, lane, zs - 200, zs + 60, 150).violation, undefined, 'пустой переход');

  const sc2 = scenario('ch1', 'novice');
  // Пешеход на встречной половине перехода.
  const key = districtZebras(sc2.graph, sc2.rules).find((z) => !z.node)!.key;
  sc2.walkers.set(key, [add(center, scale(lane.normal, -15))]);
  const r = drive(sc2, lane, zs - 250, zs + 60, 150);
  assert.equal(r.violation?.kind, 'pedestrian');
  assert.equal(r.violation?.atJunction, false);
  assert.ok(r.hints.includes('pedestrian'), 'новичку — подсказка заранее');
  // Машина на месте нарушения: бампер у края перехода, не на пешеходе.
  assert.ok(r.s + CAR_HALF_LENGTH <= zs + 2 && r.s + CAR_HALF_LENGTH >= zs - 16, `бампер: ${(r.s + CAR_HALF_LENGTH - zs).toFixed(1)}`);
});

test('пешеход на переходе у регулируемого перекрёстка — нарушение «на перекрёстке»', () => {
  const sc = scenario();
  sc.light = 'green';
  const lane = signalLane(sc);
  const zebra = districtZebras(sc.graph, sc.rules).find((z) => z.signalLane === lane.id)!;
  sc.walkers.set(zebra.key, [zebra.center]);
  const r = drive(sc, lane, lane.length - 200, lane.length - 1, 150);
  assert.equal(r.violation?.kind, 'pedestrian');
  assert.equal(r.violation?.atJunction, true);
});

test('скорость: 80 км/ч в городе — нарушение, 78 — нет (новичку — подсказка)', () => {
  const sc = scenario('ch1', 'novice');
  const lane = [...sc.graph.lanes.values()].find((l) => l.length > 300 && !sc.rules.signals.includes(l.to.id))!;
  const slow = drive(sc, lane, 50, 250, 234);
  assert.equal(slow.violation, undefined);
  assert.ok(slow.hints.includes('speeding'));
  const fast = drive(sc, lane, 50, 250, 240);
  assert.deepEqual(fast.violation, { kind: 'speeding', kmh: 80, limit: 60, road: 'city' });
  // Пока идёт разговор с инспектором — ничего не проверяется.
  assert.equal(drive(sc, lane, 50, 250, 330).violation, undefined);
  sc.watcher.resume(lane.start);
  assert.equal(drive(sc, lane, 50, 250, 330).violation?.kind, 'speeding');
});

test('разворот через сплошную — выезд на встречную; через прерывистую — можно', () => {
  const sc = scenario();
  const solid = sc.graph.laneFor(sc.rules.solid[0], sc.graph.map.roads.find((r) => r.id === sc.rules.solid[0])!.to);
  const dashed = [...sc.graph.lanes.values()].find((l) => !sc.rules.solid.includes(l.road.id) && l.length > 300 && (l.road.kind ?? 'city') === 'city')!;
  const uturn = (lane: Lane) => {
    const parts = sc.graph.uTurnOnRoad(lane, lane.length / 2)!;
    const turn = (parts[0] as { turn: Turn }).turn;
    assert.ok(turn.onRoad);
    const dt = 1 / 30;
    for (let t = 0; t <= turn.path.length; t += 55 * dt) {
      const pos = turn.path.pointAt(t);
      const r = sc.watcher.update(dt, { pos, heading: turn.path.directionAt(t), speed: 55, turn, turnT: t, braking: false, exempt: false }, sc.env);
      if (r.violation) return r.violation;
    }
    return undefined;
  };
  assert.equal(uturn(dashed), undefined);
  assert.equal(uturn(solid)?.kind, 'oncoming');
});

test('остановка: на переходе, в зоне 3.27, на перекрёстке — нарушение через 3 секунды (новичку — через 5)', () => {
  // Зона «Остановка запрещена».
  const inZone = (sc: Scenario) => {
    const zone = noStopLane(sc.graph, sc.rules.noStop[0]);
    return onLane(zone.lane, (zone.s0 + zone.s1) / 2, 0);
  };
  let sc = scenario('ch1', 'expert');
  assert.equal(stand(sc, inZone(sc), 2.8).violation, undefined, 'меньше 3 секунд — можно');
  sc = scenario('ch1', 'expert');
  assert.deepEqual(stand(sc, inZone(sc), 3.2).violation, { kind: 'no-stopping', place: 'zone' });
  sc = scenario('ch1', 'novice');
  const novice = stand(sc, inZone(sc), 6);
  assert.ok(novice.t > 4.9 && novice.t < 5.2, `новичку — 5 секунд (${novice.t.toFixed(2)})`);
  assert.ok(novice.hints.includes('no-stopping'), 'новичку — подсказка');
  // После разговора с инспектором на том же месте второй раз не штрафуют, пока машина не отъедет.
  sc.watcher.resume(inZone(sc).pos);
  assert.equal(stand(sc, inZone(sc), 8).violation, undefined);

  // На переходе.
  sc = scenario('ch1', 'expert');
  const crossing = sc.rules.crossings.find((c) => !c.poi)!;
  const lane = sc.graph.laneFor(crossing.road, crossing.toward);
  const onZebra = onLane(lane, sc.graph.laneDistanceAt(lane, crossing.at), 0);
  assert.deepEqual(stand(sc, onZebra, 4).violation, { kind: 'no-stopping', place: 'crosswalk' });
  // Перед переходом, пропуская пешехода, стоять можно.
  sc = scenario('ch1', 'expert');
  const key = districtZebras(sc.graph, sc.rules).find((z) => !z.node && z.road.id === crossing.road)!.key;
  sc.walkers.set(key, [crossingCenter(sc.graph, crossing)]);
  const before = onLane(lane, sc.graph.laneDistanceAt(lane, crossing.at) - 40, 0);
  assert.equal(stand(sc, before, 6).violation, undefined);

  // На перекрёстке (в повороте).
  sc = scenario('ch1', 'expert');
  const from = [...sc.graph.lanes.values()].find((l) => (l.to.kind ?? 'junction') === 'junction' && sc.graph.exits(l).length >= 2)!;
  const turn = sc.graph.turn(from, sc.graph.exits(from)[0]);
  const mid = turn.path.length / 2;
  const inJunction: DriveFrame = { pos: turn.path.pointAt(mid), heading: turn.path.directionAt(mid), speed: 0, turn, turnT: mid, braking: true, exempt: false };
  assert.deepEqual(stand(sc, inJunction, 4).violation, { kind: 'no-stopping', place: 'junction' });
});

test('во время сцены, события и разговора с инспектором правила не проверяются и чистая езда не копится', () => {
  const sc = scenario();
  const lane = signalLane(sc);
  const r = drive(sc, lane, lane.length - 200, lane.length - 1, 300, { exempt: true });
  assert.equal(r.violation, undefined);
  assert.equal(r.clean, 0);
  const ok = drive(sc, lane, 10, 160, 150);
  assert.ok(Math.abs(ok.clean - 150) < 8, `чистая езда: ${ok.clean}`);
});

test('во всех районах город замечает красный, непропущенного пешехода и превышение скорости', () => {
  for (const c of MAPPING.chapters) {
    // Красный — на каждом регулируемом перекрёстке района.
    for (const node of chapter(c.id).rules.signals) {
      const sc = scenario(c.id);
      const lane = [...sc.graph.lanes.values()].find((l) => l.to.id === node)!;
      const r = drive(sc, lane, Math.max(0, lane.length - 200), lane.length - 1, 150);
      assert.equal(r.violation?.kind, 'red-light', `${c.id}: красный у ${node}`);
    }
    // Пешеход — на каждом переходе на участке дороги.
    for (const x of chapter(c.id).rules.crossings) {
      const sc = scenario(c.id);
      const lane = sc.graph.laneFor(x.road, x.toward);
      const zs = sc.graph.laneDistanceAt(lane, x.at);
      sc.walkers.set(x.key, [crossingCenter(sc.graph, x)]);
      assert.equal(drive(sc, lane, zs - 200, zs + 40, 150).violation?.kind, 'pedestrian', `${c.id}: переход ${x.key}`);
    }
    // Скорость — на городской улице.
    const sc = scenario(c.id);
    const lane = [...sc.graph.lanes.values()].find((l) => (l.road.kind ?? 'city') === 'city' && l.length > 300)!;
    assert.equal(drive(sc, lane, 20, 200, 250).violation?.kind, 'speeding', `${c.id}: скорость`);
  }
});
