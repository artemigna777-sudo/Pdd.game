import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distance } from '../src/world/geometry.ts';
import { testDistrict, testPoints } from '../src/world/maps/testDistrict.ts';
import { RoadGraph, partLength, type PathPart } from '../src/world/roadGraph.ts';

const graph = new RoadGraph(testDistrict);

/** Части маршрута стыкуются без разрывов. */
function assertContinuous(parts: PathPart[]) {
  for (let i = 1; i < parts.length; i++) {
    const a = parts[i - 1].points.at(-1)!;
    const b = parts[i].points[0];
    assert.ok(distance(a, b) < 0.5, `разрыв между частями ${i - 1} и ${i}: ${distance(a, b).toFixed(2)}`);
  }
}

test('у всех полос положительная длина', () => {
  for (const lane of graph.lanes.values()) assert.ok(lane.length > 50, `${lane.id}: ${lane.length}`);
});

test('маршрут через весь район непрерывен и заканчивается в цели', () => {
  const from = graph.laneFor('JK', 'K');
  const to = graph.laneFor('CH1', 'H1');
  const parts = graph.route(from, 10, to, 100);
  assert.ok(parts);
  assertContinuous(parts);
  const last = parts.at(-1)!;
  assert.equal(last.kind, 'lane');
  assert.ok(distance(last.points.at(-1)!, graph.pointOnLane(to, 100)) < 0.5);
});

test('цель позади на той же полосе достижима (объезд или разворот)', () => {
  const lane = graph.laneFor('AB', 'B');
  const parts = graph.route(lane, 300, lane, 50);
  assert.ok(parts);
  assertContinuous(parts);
  assert.ok(parts.length > 2);
});

test('в тупике можно развернуться', () => {
  const down = graph.laneFor('KN', 'N');
  const up = graph.laneFor('KN', 'K');
  const parts = graph.route(down, down.length - 30, up, 100);
  assert.ok(parts);
  assertContinuous(parts);
  assert.ok(parts.some((p) => p.kind === 'turn' && p.turn.kind === 'uturn'));
});

test('кольцо проезжается против часовой стрелки', () => {
  // Въезд с севера (едем на юг), съезд на восток — это третий съезд: машина проходит западную часть кольца.
  const turn = graph.turn(graph.laneFor('ER', 'R'), graph.laneFor('RI', 'I'));
  assert.equal(turn.kind, 'ring');
  const r = graph.node('R');
  assert.ok(turn.path.points.some((p) => p.x < r.x - 40), 'должна пройти западнее центра');
  // А поворот направо (на запад) — первый съезд, без объезда кольца.
  const right = graph.turn(graph.laneFor('ER', 'R'), graph.laneFor('GR', 'G'));
  assert.ok(right.path.points.every((p) => p.x < r.x + 30), 'первый съезд не должен обходить кольцо с востока');
});

test('точки интереса лежат на своих полосах', () => {
  for (const point of testPoints) {
    const stop = graph.pointStop(point);
    assert.ok(stop.s > 0 && stop.s < stop.lane.length, `${point.id}: s=${stop.s}, длина ${stop.lane.length}`);
  }
});

test('переезд стоит на железной дороге', () => {
  const railway = testPoints.find((p) => p.template === 'railway')!;
  assert.equal(graph.pointStop(railway).anchor.y, testDistrict.railwayY);
});

test('ближайшая полоса к точке на дороге находится', () => {
  const lane = graph.laneFor('BE', 'E');
  const p = graph.pointOnLane(lane, 120);
  const found = graph.nearest(p)!;
  assert.equal(found.lane.id, lane.id);
  assert.ok(Math.abs(found.s - 120) < 1);
});

test('маршрут режется на две непрерывные части нужной длины', () => {
  const parts = graph.route(graph.laneFor('AB', 'B'), 20, graph.laneFor('BE', 'E'), 200)!;
  const total = parts.reduce((s, p) => s + partLength(p), 0);
  const [before, after] = graph.splitPath(parts, 250);
  assert.ok(Math.abs(before.reduce((s, p) => s + partLength(p), 0) - 250) < 0.5);
  assert.ok(Math.abs(after.reduce((s, p) => s + partLength(p), 0) - (total - 250)) < 0.5);
  assertContinuous([...before, ...after]);
});

test('разворот посреди дороги: дальше маршрут идёт с места выезда на встречную полосу', () => {
  const target = graph.laneFor('CH1', 'H1');
  let checked = 0;
  for (const lane of graph.lanes.values()) {
    const u = graph.uTurnOnRoad(lane, lane.length / 2);
    if (!u) continue;
    const turn = u[0];
    assert.equal(turn.kind, 'turn');
    if (turn.kind !== 'turn') continue;
    // Выезд — посреди встречной полосы, не в её начале.
    assert.ok(graph.exitS(turn.turn) > 0, lane.id);
    const rest = graph.route(turn.turn.to, graph.exitS(turn.turn), target, 100);
    assert.ok(rest, lane.id);
    assertContinuous([turn, ...rest]);
    checked++;
  }
  assert.ok(checked > 10);
});

test('поворот, оборванный посередине, продолжается остатком поворота, а не напрямик', () => {
  const lane = graph.laneFor('AB', 'B');
  const turns = [graph.turnPart(graph.turn(lane, graph.exits(lane)[0])), graph.uTurnOnRoad(lane, 200)![0]];
  for (const full of turns) {
    if (full.kind !== 'turn') continue;
    const len = partLength(full);
    for (const cut of [0.2, 0.5, 0.9]) {
      // Машина остановилась посреди поворота, потом поехала дальше.
      const [before] = graph.splitPath([full], len * cut);
      const stopped = before.at(-1)!;
      assert.equal(stopped.kind, 'turn');
      if (stopped.kind !== 'turn') continue;
      const next = graph.afterTurn(stopped);
      assertContinuous([...before, ...next]);
      // Остаток поворота той же длины, что и недоеханная часть: поворот не срезается.
      const tail = graph.turnTail(stopped).reduce((s, p) => s + partLength(p), 0);
      assert.ok(Math.abs(tail - len * (1 - cut)) < 0.5, `${full.turn.kind} ${cut}: ${tail.toFixed(1)}`);
      const lanePart = next.at(-1)!;
      assert.ok(lanePart.kind === 'lane' && Math.abs(lanePart.s0 - graph.exitS(full.turn)) < 1e-6);
    }
    // Поворот пройден целиком — остатка нет.
    assert.deepEqual(graph.turnTail(full), []);
  }
});
