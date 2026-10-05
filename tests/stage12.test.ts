/**
 * «Один день Соколова» (этап 12): нарушители в потоке, проверка нарушений модулем правил,
 * касания. Смена гоняется без графики на картах глав.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { distance } from '../src/world/geometry.ts';
import { MAPS, type Mapping } from '../src/world/mapping.ts';
import { PATROL_KINDS, PatrolDirector, SHIFT_SECONDS, patrolEnv, patrolPost, patrolSignals, type PatrolKind } from '../src/world/patrol.ts';
import { seeded } from '../src/world/random.ts';
import { RoadGraph } from '../src/world/roadGraph.ts';
import { RULE_QUESTIONS, questionsFor } from '../src/world/rules.ts';
import { TrafficSim } from '../src/world/traffic.ts';

const MAPPING: Mapping = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const IDS = new Set((JSON.parse(readFileSync('data/questions.json', 'utf8')) as { id: string }[]).map((q) => q.id));

/** Смена в районе главы: `catchAll` — инспектор ловит каждого нарушителя сразу. */
function shift(chapterId: string, seed: number, catchAll = false) {
  const chapter = MAPPING.chapters.find((c) => c.id === chapterId)!;
  const graph = new RoadGraph(MAPS[chapter.map]);
  const post = patrolPost(graph, chapter.points);
  const rnd = seeded(seed);
  const sim = new TrafficSim(graph, chapter.points, rnd, { rules: post.rules, cars: 22, walkers: 12 });
  let clock = 0;
  const signal = patrolSignals(graph, post.rules, () => clock);
  // Экран телефона при масштабе 0.85: примерно 460 × 1000 точек мира.
  const view = { x: post.view.x - 230, y: post.view.y - 500, w: 460, h: 1000 };
  const env = patrolEnv(view, signal);
  const director = new PatrolDirector(graph, post, sim, rnd);
  sim.maintain(env, true);
  const flagged: PatrolKind[] = [];
  const caught: PatrolKind[] = [];
  let missed = 0;
  let hits = 0;
  const dt = 1 / 30;
  for (let i = 0; i < SHIFT_SECONDS / dt; i++) {
    clock += dt;
    sim.update(dt, env);
    if (i % 15 === 0) sim.maintain(env);
    for (const e of director.update(dt, env)) {
      if (e.kind === 'violation') {
        flagged.push(e.suspect.violation!.kind as PatrolKind);
        assert.equal(e.suspect.violation!.kind, e.suspect.kind, `${chapterId}: назначено ${e.suspect.kind}, а нарушение ${e.suspect.violation!.kind}`);
        if (catchAll) {
          const r = director.tap(e.suspect.car.pos);
          assert.equal(r.kind, 'caught');
          caught.push(e.suspect.kind);
          director.release(e.suspect);
        }
      } else missed++;
    }
    // Нарушитель на красный не наезжает на пешеходов.
    for (const s of director.suspects) {
      if (s.kind !== 'red-light' || s.car.gone) continue;
      for (const w of sim.walkers) if (!w.gone && w.crossing && distance(w.pos, s.car.pos) < 14) hits++;
    }
  }
  return { flagged, caught, missed, hits, director, sim, post };
}

test('пост: регулируемый перекрёсток и зона «Остановка запрещена» рядом в каждом районе', () => {
  for (const chapter of MAPPING.chapters) {
    const graph = new RoadGraph(MAPS[chapter.map]);
    const post = patrolPost(graph, chapter.points);
    assert.ok(post.rules.signals.includes(post.node), chapter.id);
    assert.equal(post.zone.lane.from.id, post.node, `${chapter.id}: зона на выезде с перекрёстка`);
    assert.ok(post.zone.s1 - post.zone.s0 >= 100, `${chapter.id}: зона ${post.zone.s1 - post.zone.s0}`);
    assert.ok(distance(post.view, graph.node(post.node)) < 200);
  }
});

test('смена: за 3 минуты встречаются все три вида нарушений, каждое подтверждает модуль правил', () => {
  for (const chapterId of ['ch1', 'ch3', 'ch6', 'ch8', 'ch10']) {
    const { flagged, hits } = shift(chapterId, 11);
    for (const kind of PATROL_KINDS) assert.ok(flagged.includes(kind), `${chapterId}: нет нарушения «${kind}» (${flagged.join(', ')})`);
    assert.ok(flagged.length >= 9, `${chapterId}: нарушений за смену ${flagged.length}`);
    assert.equal(hits, 0, `${chapterId}: нарушитель наехал на пешехода`);
  }
});

test('касания: пойманный — «caught», добросовестный водитель — ошибка, пусто — ничего', () => {
  const { caught, flagged, director, sim } = shift('ch3', 5, true);
  assert.equal(caught.length, flagged.length);
  const innocent = sim.cars.find((c) => !c.gone && c.alpha > 0.5 && !director.suspects.some((s) => s.car === c));
  assert.ok(innocent);
  assert.equal(director.tap(innocent.pos).kind, 'innocent');
  assert.equal(director.tap({ x: -5000, y: -5000 }).kind, 'empty');
});

test('упущенный нарушитель считается, когда уезжает', () => {
  const { flagged, missed } = shift('ch6', 3);
  assert.ok(missed > 0 && missed <= flagged.length, `упущено ${missed} из ${flagged.length}`);
});

test('вопросы для каждого вида нарушения есть в базе', () => {
  for (const kind of PATROL_KINDS) {
    const ids = questionsFor({ kind, place: 'zone', road: 'city' });
    assert.ok(ids.length >= 3);
    for (const id of ids) assert.ok(IDS.has(id), id);
  }
  assert.ok(RULE_QUESTIONS.stopZone.every((id) => IDS.has(id)));
});

test('рекорд смены: очки, лучший результат, число смен, проверка сохранённых данных', async () => {
  const { emptyProgress, sanitizeProgress } = await import('../src/progress/progress.ts');
  const { patrolScore, recordPatrol } = await import('../src/progress/modes.ts');
  assert.equal(patrolScore({ caught: 3, missed: 2, wrong: 1, answers: 3, correct: 2 }), 300 + 100 - 50);
  assert.equal(patrolScore({ caught: 0, missed: 0, wrong: 4, answers: 0, correct: 0 }), 0);
  const data = emptyProgress();
  assert.deepEqual(recordPatrol(data, { caught: 2, missed: 0, wrong: 0, answers: 2, correct: 1 }), { score: 250, record: true, best: 250 });
  assert.deepEqual(recordPatrol(data, { caught: 1, missed: 3, wrong: 0, answers: 1, correct: 0 }), { score: 100, record: false, best: 250 });
  assert.deepEqual(data.modes?.patrol, { best: 250, shifts: 2 });
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(data))).modes?.patrol, { best: 250, shifts: 2 });
  assert.equal(sanitizeProgress({ modes: { patrol: { best: -1, shifts: 'x' } } }).modes?.patrol, undefined);
});
