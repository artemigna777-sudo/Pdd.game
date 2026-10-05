/**
 * Смена курьера (этап 13): какой вопрос у двери, очки и множитель, таблица рекордов.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COURIER, courierAnswer, courierQuestion, recordCourier } from '../src/progress/modes.ts';
import { COURIER_TOP, emptyProgress, recordAnswer, sanitizeProgress } from '../src/progress/progress.ts';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 5, 12).getTime();
const IDS = ['A', 'B', 'C', 'D', 'E', 'F'];

test('вопрос у двери: сначала повтор ошибки, потом ошибки, потом новые из района, потом любые', () => {
  const data = emptyProgress();
  recordAnswer(data, 'A', false, NOW - 2 * DAY); // повтор уже наступил
  recordAnswer(data, 'B', false, NOW); // ошибка сегодня: повтор завтра
  recordAnswer(data, 'C', true, NOW);
  const local = new Set(['E']);
  const rnd = () => 0;
  assert.equal(courierQuestion(data, IDS, local, NOW, [], rnd), 'A');
  assert.equal(courierQuestion(data, IDS, local, NOW, ['A'], rnd), 'B');
  assert.equal(courierQuestion(data, IDS, local, NOW, ['A', 'B'], rnd), 'E');
  assert.equal(courierQuestion(data, IDS, local, NOW, ['A', 'B', 'E'], rnd), 'D');
  // Всё уже было — любой, кроме недавних.
  assert.equal(courierQuestion(data, IDS, local, NOW, ['A', 'B', 'D', 'E', 'F'], rnd), 'C');
  assert.ok(IDS.includes(courierQuestion(data, IDS, local, NOW, IDS)));
});

test('очки: 100 × множитель, серия растит его до ×5, ошибка сбрасывает', () => {
  let m = 1;
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = courierAnswer(m, true);
    points.push(r.points);
    m = r.multiplier;
  }
  assert.deepEqual(points, [100, 200, 300, 400, 500, 500]);
  assert.equal(m, COURIER.maxMultiplier);
  assert.deepEqual(courierAnswer(m, false), { points: 0, multiplier: 1 });
});

test('таблица рекордов: по убыванию очков, не больше 10 строк, проверка сохранённых данных', () => {
  const data = emptyProgress();
  const rec = (score: number, at: number) => ({ score, deliveries: 3, correct: 2, answers: 3, chapter: 'ch1', at });
  assert.equal(recordCourier(data, rec(300, 1)), 1);
  assert.equal(recordCourier(data, rec(500, 2)), 1);
  assert.equal(recordCourier(data, rec(400, 3)), 2);
  for (let i = 0; i < 12; i++) recordCourier(data, rec(1000 + i, 10 + i));
  assert.equal(data.modes!.courier!.length, COURIER_TOP);
  assert.equal(recordCourier(data, rec(50, 99)), undefined);
  assert.deepEqual(
    data.modes!.courier!.map((r) => r.score),
    [...data.modes!.courier!.map((r) => r.score)].sort((a, b) => b - a),
  );
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back.modes?.courier, data.modes?.courier);
  const bad = sanitizeProgress({ modes: { courier: [rec(10, 1), { score: 'x' }, { ...rec(5, 2), correct: 9 }] } });
  assert.deepEqual(bad.modes?.courier?.map((r) => r.score), [10]);
});
