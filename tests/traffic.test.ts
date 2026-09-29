/**
 * Живой город (этап 7): поток машин и пешеходы. Модель гоняется без графики по картам глав.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { seeded } from '../src/world/random.ts';
import { distance, projectOnSegment } from '../src/world/geometry.ts';
import { MAPS, type Mapping } from '../src/world/mapping.ts';
import { RoadGraph, SIDEWALK, roadHalfWidth, type Lane } from '../src/world/roadGraph.ts';
import { TrafficSim, type Light, type TrafficEnv, type Zone } from '../src/world/traffic.ts';

const MAPPING: Mapping = JSON.parse(readFileSync('data/mapping.json', 'utf8'));

function setup(chapterId: string, seed = 1) {
  const chapter = MAPPING.chapters.find((c) => c.id === chapterId)!;
  const graph = new RoadGraph(MAPS[chapter.map]);
  const sim = new TrafficSim(graph, chapter.points, seeded(seed));
  const signalNodes = new Set(chapter.points.filter((p) => p.template === 'signalized').map((p) => p.toward));
  let clock = 0;
  // Как в городе: 6 с зелёный вертикальным, 2 с жёлтый, 6 с зелёный горизонтальным, 2 с жёлтый.
  const signal = (laneId: string): Light | undefined => {
    const lane = graph.lane(laneId);
    if (!signalNodes.has(lane.to.id)) return undefined;
    const t = clock % 16;
    const ph = t < 6 ? 0 : t < 8 ? 1 : t < 14 ? 2 : 3;
    const vertical = Math.abs(lane.dir.y) > 0.5;
    const mine = vertical ? ph < 2 : ph >= 2;
    return mine ? (ph % 2 === 0 ? 'green' : 'yellow') : 'red';
  };
  return { graph, sim, chapter, signal, tick: (dt: number) => (clock += dt), signalNodes };
}

function envFor(graph: RoadGraph, lane: Lane, s: number, signal: TrafficEnv['signal'], zones: Zone[] = []): TrafficEnv {
  const pos = graph.pointOnLane(lane, s);
  const b = graph.map.bounds;
  return {
    player: { pos, lane, s, speed: 0, heading: lane.dir },
    zones,
    signal,
    // Смотрим на весь район, чтобы машины появлялись везде.
    view: { x: b.x, y: b.y, w: b.width, h: b.height },
  };
}

test('поток: машины не наезжают друг на друга, не едут на красный, держатся подальше от игрока', () => {
  for (const chapterId of ['ch3', 'ch6', 'ch8']) {
    const { graph, sim, signal, tick } = setup(chapterId, 7);
    const lane = [...graph.lanes.values()].find((l) => l.length > 300)!;
    const env = envFor(graph, lane, lane.length / 2, signal);
    sim.maintain(env, true);
    assert.ok(sim.cars.length >= 8, `${chapterId}: машин ${sim.cars.length}`);
    const turned = new Map<number, string>();
    let moved = 0;
    const start = new Map(sim.cars.map((c) => [c.id, { ...c.pos }]));
    for (let i = 0; i < 30 * 90; i++) {
      const dt = 1 / 30;
      tick(dt);
      sim.update(dt, env);
      if (i % 30 === 0) sim.maintain(env);
      const live = sim.cars.filter((c) => !c.fading && !c.gone);
      for (const c of live) {
        // На красный в перекрёсток не въезжает.
        if (c.turn && turned.get(c.id) !== c.turn.from.id + c.turn.to.id) {
          turned.set(c.id, c.turn.from.id + c.turn.to.id);
          assert.notEqual(signal(c.turn.from.id), 'red', `${chapterId}: машина ${c.id} въехала на красный`);
        }
        assert.ok(distance(c.pos, env.player.pos) > 24, `${chapterId}: машина ${c.id} вплотную к игроку`);
      }
      for (let a = 0; a < live.length; a++) {
        for (let b = a + 1; b < live.length; b++) {
          const d = distance(live[a].pos, live[b].pos);
          assert.ok(d > 14, `${chapterId}: машины ${live[a].id} и ${live[b].id} столкнулись (${d.toFixed(1)})`);
        }
      }
    }
    for (const c of sim.cars) if (start.has(c.id) && distance(start.get(c.id)!, c.pos) > 200) moved++;
    assert.ok(moved >= 3, `${chapterId}: машины почти не ездят (${moved})`);
  }
});

test('пешеходы: только тротуары (за карманами остановок — тоже) и переходы; на переходе машины ждут', () => {
  for (const chapterId of ['ch3', 'ch9']) walkersOn(chapterId);
});

function walkersOn(chapterId: string) {
  const { graph, sim, signal, tick } = setup(chapterId, 3);
  const lane = [...graph.lanes.values()].find((l) => l.length > 300)!;
  // Игрок далеко за краем района — пешеходам ничего не мешает переходить.
  const env = envFor(graph, lane, 0, signal);
  env.player.pos = { x: -5000, y: -5000 };
  env.player.lane = undefined;
  sim.maintain(env, true);
  assert.ok(sim.walkers.length >= 6);
  let crossings = 0;
  let waitedForWalker = 0;
  let pocketWalks = 0;
  const seen = new Set<string>();
  for (let i = 0; i < 30 * 120; i++) {
    const dt = 1 / 30;
    tick(dt);
    sim.update(dt, env);
    if (i % 30 === 0) sim.maintain(env);
    for (const w of sim.walkers) {
      if (w.fading || w.gone) continue;
      if (w.crossing) {
        if (!seen.has(`${w.id}:${w.crossing}`)) {
          seen.add(`${w.id}:${w.crossing}`);
          crossings++;
        }
        continue;
      }
      if (w.path) continue; // поворот за угол
      // На тротуаре: на своём расстоянии от оси дороги.
      const a = graph.node(w.road.from);
      const b = graph.node(w.road.to);
      const axis = projectOnSegment(w.pos, a, b).point;
      const off = distance(axis, w.pos);
      const walk = roadHalfWidth(w.road) + SIDEWALK / 2;
      const side = { x: (w.pos.x - axis.x) / (off || 1), y: (w.pos.y - axis.y) / (off || 1) };
      const pocket = sim.pocketAt(w.road.id, axis, side);
      if (pocket && pocket.along < pocket.half + 20) {
        // У кармана остановки или парковки — тротуар за карманом, но не асфальт самого кармана.
        assert.ok(off > walk - 1.5 && off < walk + 28 + 1.5, `пешеход ${w.id} у кармана не на тротуаре (${off.toFixed(1)})`);
        if (pocket.along < pocket.half) assert.ok(off > walk + 28 - 1.5, `пешеход ${w.id} идёт по карману (${off.toFixed(1)})`);
        pocketWalks++;
      } else assert.ok(Math.abs(off - walk) < 1.5, `пешеход ${w.id} не на тротуаре (${off.toFixed(1)})`);
    }
    for (const c of sim.cars) {
      if (c.fading || c.speed > 1) continue;
      if (sim.walkers.some((w) => w.crossing && distance(w.pos, c.pos) < 90)) waitedForWalker++;
    }
    // Машины не проезжают сквозь пешехода на переходе.
    for (const w of sim.walkers) {
      if (!w.crossing) continue;
      for (const c of sim.cars) if (!c.fading) assert.ok(distance(c.pos, w.pos) > 12, `машина ${c.id} наехала на пешехода ${w.id}`);
    }
  }
  if (chapterId === 'ch3') {
    assert.ok(crossings >= 3, `переходов: ${crossings}`);
    assert.ok(waitedForWalker > 0, 'ни одна машина не пропустила пешехода');
  }
  // В Промзоне много стоянок: пешеходы обходят карманы по тротуару.
  if (chapterId === 'ch9') assert.ok(pocketWalks > 0, 'пешеходы не проходили мимо карманов');
}

test('в зоне сцены потока нет; машина прямо перед игроком исчезает, а не мешает', () => {
  const { graph, sim, signal, tick } = setup('ch1', 5);
  const lane = [...graph.lanes.values()].sort((a, b) => b.length - a.length)[0];
  const zone: Zone = { ...graph.pointOnLane(lane, lane.length / 2), r: 260 };
  const env = envFor(graph, lane, 10, signal, [zone]);
  env.player.pos = { x: -5000, y: -5000 };
  env.player.lane = undefined;
  sim.maintain(env, true);
  for (let i = 0; i < 30 * 30; i++) {
    tick(1 / 30);
    sim.update(1 / 30, env);
    if (i % 30 === 0) sim.maintain(env);
    for (const c of sim.cars) if (!c.fading && !c.gone) assert.ok(distance(c.pos, zone) > zone.r - 1, `машина ${c.id} в зоне сцены`);
  }

  // Игрок догоняет машину, которой нужно остановиться перед перекрёстком.
  const { graph: g2, sim: s2, tick: t2 } = setup('ch1', 9);
  const road = [...g2.lanes.values()].filter((l) => l.length > 300)[0];
  const red = () => 'red' as Light;
  const car = s2.spawnCar(road, road.length - 120, { kind: 'car' });
  let playerS = road.length - 260;
  const env2: TrafficEnv = { player: { pos: g2.pointOnLane(road, playerS), lane: road, s: playerS, speed: 150, heading: road.dir }, zones: [], signal: red, view: { x: 0, y: 0, w: 1, h: 1 } };
  for (let i = 0; i < 30 * 4 && !car.gone; i++) {
    playerS = Math.min(road.length - 20, playerS + 150 / 30);
    env2.player.s = playerS;
    env2.player.pos = g2.pointOnLane(road, playerS);
    t2(1 / 30);
    s2.update(1 / 30, env2);
    if (!car.fading) assert.ok(distance(car.pos, env2.player.pos) > 24);
  }
  assert.ok(car.fading || car.gone, 'машина осталась стоять перед игроком');
  assert.ok(s2.yielded >= 1);
});
