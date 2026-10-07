import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EXAM_RULES, answerExam, answeredCount, blockOf, checkTime, clock, currentItem, extraCount, goToExam, mainMistakes, openItems, skipExam, startExam, type ExamState } from '../src/exam/exam.ts';
import { EXAM_HISTORY_LIMIT, allExams, answeredAt, findExam, recordExam, sanitizeExams, savedChoices, type ExamAttempt } from '../src/exam/examHistory.ts';

interface Q {
  id: string;
  ticket: number;
  number: number;
}
const QUESTIONS: Q[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
const T0 = 1_000_000;
const MIN = 60_000;

/** Детерминированный «случайный» генератор. */
function rng(seed = 1) {
  let a = seed;
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
}

/** Ответить на вопросы экзамена по списку верности (true — верно). */
function play(s: ExamState, marks: boolean[], at = T0 + MIN) {
  for (const ok of marks) answerExam(s, 0, ok, QUESTIONS, at, rng(7));
  return s;
}

test('экзамен: 20 вопросов с номерами 1–20 из билетов, 4 блока по 5, 20 минут', () => {
  const s = startExam(QUESTIONS, T0, rng(3));
  assert.equal(s.items.length, 20);
  s.items.forEach((item, i) => {
    assert.equal(byId.get(item.id)!.number, i + 1);
    assert.equal(item.block, Math.floor(i / 5));
    assert.equal(item.extra, false);
  });
  assert.ok(new Set(s.items.map((i) => byId.get(i.id)!.ticket)).size > 1, 'вопросы из разных билетов');
  assert.equal(s.deadline - s.startedAt, 20 * MIN);
  assert.deepEqual([1, 5, 6, 10, 11, 16, 20].map(blockOf), [0, 0, 1, 1, 2, 3, 3]);
});

test('без ошибок — сдал', () => {
  const s = play(startExam(QUESTIONS, T0, rng()), Array(20).fill(true));
  assert.deepEqual(s.outcome, { passed: true, reason: undefined, at: T0 + MIN });
  assert.equal(currentItem(s), undefined);
});

test('одна ошибка — 5 дополнительных вопросов из её блока и +5 минут; без ошибок в них — сдал', () => {
  const s = startExam(QUESTIONS, T0, rng());
  const marks = Array(20).fill(true);
  marks[7] = false; // вопрос 8 — блок 2
  play(s, marks);
  assert.equal(s.outcome === undefined, true, 'экзамен продолжается');
  assert.equal(extraCount(s), 5);
  const extra = s.items.slice(20);
  assert.deepEqual(
    extra.map((i) => byId.get(i.id)!.number),
    [6, 7, 8, 9, 10],
  );
  assert.ok(extra.every((i) => i.block === 1 && i.extra));
  assert.equal(new Set(s.items.map((i) => i.id)).size, 25, 'вопросы не повторяются');
  assert.equal(s.deadline - s.startedAt, 25 * MIN);
  play(s, Array(5).fill(true));
  assert.equal(s.outcome?.passed, true);
});

test('две ошибки в разных блоках — 10 дополнительных вопросов и +10 минут; ошибка в них — не сдал', () => {
  const s = startExam(QUESTIONS, T0, rng());
  const marks = Array(20).fill(true);
  marks[0] = false;
  marks[19] = false;
  play(s, marks);
  assert.deepEqual(mainMistakes(s), [1, 0, 0, 1]);
  assert.equal(extraCount(s), 10);
  assert.deepEqual(
    s.items.slice(20).map((i) => i.block),
    [0, 0, 0, 0, 0, 3, 3, 3, 3, 3],
  );
  assert.equal(s.deadline - s.startedAt, 30 * MIN);
  play(s, [true, true, false]);
  assert.deepEqual([s.outcome?.passed, s.outcome?.reason], [false, 'extra']);
  assert.equal(answeredCount(s), 23, 'экзамен закончился сразу');
});

test('две ошибки в одном блоке — не сдал сразу', () => {
  const s = startExam(QUESTIONS, T0, rng());
  play(s, [true, false, true, false]);
  assert.deepEqual([s.outcome?.passed, s.outcome?.reason], [false, 'block']);
  assert.equal(currentItem(s), undefined);
  assert.equal(extraCount(s), 0);
});

test('три ошибки в разных блоках — не сдал', () => {
  const s = startExam(QUESTIONS, T0, rng());
  const marks = Array(20).fill(true);
  marks[1] = false;
  marks[6] = false;
  marks[11] = false;
  play(s, marks);
  assert.deepEqual([s.outcome?.passed, s.outcome?.reason], [false, 'three']);
  assert.equal(answeredCount(s), 12);
});

test('время вышло — не сдал; ответы после срока не принимаются', () => {
  const s = startExam(QUESTIONS, T0, rng());
  play(s, Array(10).fill(true), T0 + 5 * MIN);
  assert.equal(checkTime(s, T0 + 19 * MIN), false);
  answerExam(s, 0, true, QUESTIONS, T0 + 20 * MIN + 1);
  assert.deepEqual([s.outcome?.passed, s.outcome?.reason], [false, 'time']);
  assert.equal(answeredCount(s), 10);
  // После ошибки время растёт вместе с дополнительными вопросами.
  const t = startExam(QUESTIONS, T0, rng());
  const marks = Array(20).fill(true);
  marks[3] = false;
  play(t, marks, T0 + 19 * MIN);
  assert.equal(checkTime(t, T0 + 21 * MIN), false);
  assert.equal(checkTime(t, T0 + 25 * MIN), true);
  assert.equal(t.outcome?.reason, 'time');
});

test('как в ГИБДД: вопрос можно пропустить и вернуться к нему, подтверждённый ответ не меняется', () => {
  const s = startExam(QUESTIONS, T0, rng());
  assert.equal(currentItem(s), s.items[0]);
  skipExam(s); // пропустить вопрос 1
  assert.equal(s.cursor, 1);
  answerExam(s, 0, true, QUESTIONS, T0 + MIN); // вопрос 2
  assert.equal(s.cursor, 2, 'после ответа — следующий вопрос без ответа');
  assert.equal(goToExam(s, 1), false, 'к отвеченному вопросу не вернуться');
  assert.equal(goToExam(s, 0), true, 'к пропущенному — можно');
  assert.equal(currentItem(s), s.items[0]);
  answerExam(s, 1, true, QUESTIONS, T0 + MIN); // вопрос 1
  assert.deepEqual([s.chosen[0], s.chosen[1]], [1, 0]);
  assert.equal(s.cursor, 2);
  // Пропустить три вопроса подряд: после последнего круг возвращается к пропущенным.
  for (let i = 2; i < 20; i++) {
    if (i === 5 || i === 9 || i === 14) skipExam(s);
    else answerExam(s, 0, true, QUESTIONS, T0 + MIN);
  }
  assert.deepEqual(openItems(s), [5, 9, 14]);
  assert.equal(s.cursor, 5, 'после последнего вопроса — первый пропущенный');
  assert.equal(s.outcome === undefined, true, 'экзамен не кончается, пока есть вопросы без ответа');
  skipExam(s);
  assert.equal(s.cursor, 9);
  play(s, [true, true, true]);
  assert.equal(s.outcome?.passed, true);
  assert.equal(answeredCount(s), 20);
});

test('пропуск: ошибки считаются по блокам при любом порядке; дополнительные — после всех основных', () => {
  const s = startExam(QUESTIONS, T0, rng());
  skipExam(s); // вопрос 1 — потом
  const marks = Array(19).fill(true);
  marks[5] = false; // вопрос 7 — блок 2
  play(s, marks);
  assert.equal(extraCount(s), 0, 'пока вопрос 1 без ответа, дополнительных нет');
  assert.equal(s.cursor, 0);
  answerExam(s, 0, true, QUESTIONS, T0 + MIN);
  assert.equal(extraCount(s), 5);
  assert.equal(s.cursor, 20, 'дальше — первый дополнительный');
  assert.deepEqual(openItems(s), [20, 21, 22, 23, 24]);
  assert.equal(goToExam(s, 0), false, 'основные позади');
  skipExam(s);
  assert.equal(s.cursor, 21, 'дополнительный тоже можно пропустить');
  play(s, [true, true, true, true]);
  assert.equal(s.cursor, 20);
  play(s, [true]);
  assert.equal(s.outcome?.passed, true);
  // Две ошибки в одном блоке — провал сразу, даже если до них были пропуски.
  const t = startExam(QUESTIONS, T0, rng());
  skipExam(t);
  skipExam(t);
  play(t, [false, false]); // вопросы 3 и 4 — блок 1
  assert.deepEqual([t.outcome?.passed, t.outcome?.reason], [false, 'block']);
});

test('история экзамена: пропущенные вопросы без ответа сохраняются как −1', () => {
  assert.deepEqual(savedChoices([1, undefined, 0, undefined, undefined]), [1, -1, 0]);
  const a = { at: 5, ms: 1, passed: false, reason: 'time', boss: false, items: ['B01-Q01', 'B01-Q02', 'B01-Q03'], extra: 0, chosen: [1, -1, 0] };
  assert.deepEqual(sanitizeExams([a, { ...a, at: 6, chosen: [1, -2] }]).map((x) => x.at), [5]);
  assert.deepEqual([0, 1, 2, 3].map((i) => answeredAt(a, i)), [true, false, true, false]);
});

test('часы экзамена', () => {
  assert.equal(clock(20 * MIN), '20:00');
  assert.equal(clock(61_000), '01:01');
  assert.equal(clock(500), '00:01');
  assert.equal(clock(-5), '00:00');
  assert.equal(EXAM_RULES.questions, 20);
});

test('история экзаменов: проверка данных, уникальное время, предел', () => {
  const good: ExamAttempt = { at: 5, ms: 100, passed: false, reason: 'block', boss: false, items: ['B01-Q01', 'B02-Q02'], extra: 0, chosen: [0, 1] };
  const clean = sanitizeExams([good, null, { ...good, at: 6, reason: 'другое' }, { ...good, at: 7, chosen: [0, 1, 2] }, { ...good, at: 8, items: [] }]);
  assert.deepEqual(clean, [good]);
  const a = recordExam({ ...good, at: 1000 });
  const b = recordExam({ ...good, at: 1000 });
  assert.deepEqual([a.at, b.at], [1000, 1001]);
  assert.equal(findExam(1001)?.reason, 'block');
  for (let i = 0; i < EXAM_HISTORY_LIMIT; i++) recordExam({ ...good, at: 5000 + i });
  assert.equal(allExams().length, EXAM_HISTORY_LIMIT);
  assert.equal(findExam(1000), undefined);
});
