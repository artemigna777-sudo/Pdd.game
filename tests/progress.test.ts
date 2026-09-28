import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONTROL_TICKETS,
  LEVELS,
  XP,
  canDeliver,
  chapterResult,
  currentChapter,
  dayStart,
  deliver,
  dueReviews,
  emptyProgress,
  ensureControl,
  finaleStatus,
  isUnlocked,
  levelOf,
  markPoint,
  nextReview,
  percent,
  recordAnswer,
  recordControl,
  recordExamPass,
  refreshStars,
  reviewQueue,
  reviewStages,
  sanitizeProgress,
  starsFor,
  topicStats,
  trainingSet,
  weakTopics,
  type ChapterInfo,
} from '../src/progress/progress.ts';

/** Вечер 27 сентября 2026 года по местному времени. */
const EVENING = new Date(2026, 8, 27, 21, 30).getTime();
const day = (n: number, hour = 10) => new Date(2026, 8, 27 + n, hour).getTime();

test('ошибка → повтор через 1 день, 3 дня, 7 дней, потом вопрос уходит из работы над ошибками', () => {
  const data = emptyProgress();
  const first = recordAnswer(data, 'Q', false, EVENING);
  assert.deepEqual([first.xp, first.review, first.coins], [0, 'added', 0]);
  // Повтор — с начала следующего дня, а не через 24 часа.
  assert.equal(data.questions.Q.review!.due, dayStart(EVENING, 1));
  assert.deepEqual(dueReviews(data, day(0, 23)), []);
  assert.deepEqual(dueReviews(data, day(1, 7)), ['Q']);

  // Верный ответ раньше срока повтор не засчитывает.
  assert.equal(recordAnswer(data, 'Q', true, day(0, 22)).review, undefined);
  assert.equal(data.questions.Q.review!.stage, 0);

  // Через день — ступень 2 (через 3 дня), потом ступень 3 (через 7 дней), потом всё.
  assert.equal(recordAnswer(data, 'Q', true, day(1)).review, 'advanced');
  assert.deepEqual(data.questions.Q.review, { stage: 1, due: dayStart(day(1), 3) });
  assert.equal(recordAnswer(data, 'Q', true, day(4)).review, 'advanced');
  assert.deepEqual(data.questions.Q.review, { stage: 2, due: dayStart(day(4), 7) });
  assert.deepEqual(dueReviews(data, day(10)), []);
  const last = recordAnswer(data, 'Q', true, day(11));
  assert.equal(last.review, 'cleared');
  assert.equal(last.xp, XP.review);
  assert.equal(data.questions.Q.review, undefined);
  assert.deepEqual(reviewQueue(data), []);
});

test('новая ошибка возвращает вопрос к повтору через 1 день', () => {
  const data = emptyProgress();
  recordAnswer(data, 'Q', false, day(0));
  recordAnswer(data, 'Q', true, day(1));
  assert.equal(recordAnswer(data, 'Q', false, day(2)).review, 'reset');
  assert.deepEqual(data.questions.Q.review, { stage: 0, due: dayStart(day(2), 1) });
  assert.deepEqual(reviewStages(data), [1, 0, 0]);
  assert.deepEqual(nextReview(data, day(2)), { due: dayStart(day(2), 1), count: 1 });
});

test('опыт: первый верный ответ, повтор, знакомый вопрос; уровни', () => {
  const data = emptyProgress();
  assert.equal(recordAnswer(data, 'A', true, day(0)).xp, XP.first);
  assert.equal(recordAnswer(data, 'A', true, day(0)).xp, XP.repeat);
  assert.equal(recordAnswer(data, 'B', false, day(0)).xp, 0);
  assert.equal(recordAnswer(data, 'B', true, day(1)).xp, XP.first);
  assert.equal(data.xp, XP.first * 2 + XP.repeat);

  assert.deepEqual(levelOf(0), { number: 1, title: LEVELS[0].title, from: 0, to: LEVELS[1].xp });
  assert.equal(levelOf(LEVELS[1].xp).number, 2);
  assert.equal(levelOf(LEVELS[1].xp - 1).number, 1);
  assert.equal(levelOf(1e9).to, undefined);

  const d2 = emptyProgress();
  d2.xp = LEVELS[1].xp - 5;
  assert.equal(recordAnswer(d2, 'A', true, day(0)).levelUp?.number, 2);
});

const chapter: ChapterInfo = {
  id: 'ch1',
  points: [
    { id: 'p1', questions: ['A', 'B', 'C', 'D', 'E'] },
    { id: 'p2', questions: ['F', 'G', 'H', 'I', 'J'] },
  ],
};

test('глава: точки, доля верных, доставка, звёзды и открытие следующей', () => {
  const data = emptyProgress();
  const order = ['ch1', 'ch2', 'ch3'];
  assert.equal(isUnlocked(data, order, 'ch1'), true);
  assert.equal(isUnlocked(data, order, 'ch2'), false);
  assert.equal(currentChapter(data, order), 'ch1');

  for (const id of ['A', 'B', 'C', 'D', 'E']) recordAnswer(data, id, id !== 'A', day(0));
  assert.equal(markPoint(data, 'ch1', 'p1', day(0)).xp, XP.point);
  assert.equal(markPoint(data, 'ch1', 'p1', day(0)).xp, 0);
  let r = chapterResult(data, chapter);
  assert.equal(r.pointsDone, 1);
  assert.deepEqual(r.pointsWithMistakes, ['p1']);
  assert.equal(canDeliver(r), false);

  // 7 верных из 10 — мало, 8 из 10 — можно везти посылку.
  for (const id of ['F', 'G', 'H', 'I', 'J']) recordAnswer(data, id, id !== 'F' && id !== 'G', day(0));
  markPoint(data, 'ch1', 'p2', day(0));
  r = chapterResult(data, chapter);
  assert.equal(r.correct, 7);
  assert.equal(canDeliver(r), false);
  recordAnswer(data, 'F', true, day(0));
  r = chapterResult(data, chapter);
  assert.equal(percent(r.share), 80);
  assert.equal(canDeliver(r), true);

  const xpBefore = data.xp;
  const out = deliver(data, chapter, day(0));
  assert.deepEqual([out.stars, out.newStars, out.xp], [1, 1, XP.delivery + XP.star]);
  assert.equal(data.xp, xpBefore + out.xp);
  assert.equal(isUnlocked(data, order, 'ch2'), true);
  assert.equal(isUnlocked(data, order, 'ch3'), false);
  assert.equal(currentChapter(data, order), 'ch2');

  // Исправил ошибки — звёзды выросли; новая ошибка звёзды не отнимает.
  recordAnswer(data, 'A', true, day(1));
  recordAnswer(data, 'G', true, day(1));
  assert.equal(refreshStars(data, chapter)?.newStars, 2);
  recordAnswer(data, 'B', false, day(1));
  assert.equal(refreshStars(data, chapter), undefined);
  assert.equal(data.chapters.ch1.stars, 3);
  // Повторная доставка опыта за доставку не даёт.
  assert.equal(deliver(data, chapter, day(2)).xp, 0);
});

test('звёзды: от 80% — одна, от 90% — две, 100% — три', () => {
  assert.deepEqual([0.79, 0.8, 0.89, 0.9, 0.99, 1].map(starsFor), [0, 1, 1, 2, 2, 3]);
  assert.equal(percent(0.7999), 79);
  assert.equal(percent(0.8), 80);
});

test('финал: все вопросы верно, ошибки закреплены, контрольные билеты без ошибок', () => {
  const data = emptyProgress();
  const order = ['ch1'];
  const ids = ['A', 'B', 'C'];
  assert.equal(finaleStatus(data, order, ids).open, false);
  data.chapters.ch1 = { points: [], seen: [], stars: 1, delivered: day(0) };
  recordAnswer(data, 'A', true, day(0));
  recordAnswer(data, 'B', true, day(0));
  recordAnswer(data, 'C', false, day(0));
  let st = finaleStatus(data, order, ids);
  assert.deepEqual([st.open, st.correct, st.review, st.controlOpen, st.ready], [true, 2, 1, false, false]);

  // Верный ответ сразу не закрывает ошибку: нужны повторы через 1, 3 и 7 дней.
  recordAnswer(data, 'C', true, day(0, 23));
  st = finaleStatus(data, order, ids);
  assert.deepEqual([st.correct, st.review, st.controlOpen], [3, 1, false]);
  recordAnswer(data, 'C', true, day(1));
  recordAnswer(data, 'C', true, day(4));
  recordAnswer(data, 'C', true, day(11));
  st = finaleStatus(data, order, ids);
  assert.deepEqual([st.review, st.controlOpen, st.ready], [0, true, false]);

  // Контрольные билеты: три разных; ошибка — другой билет вместо этого.
  const seq = [0.0, 0.5, 0.99, 0.25];
  let i = 0;
  const rnd = () => seq[i++ % seq.length];
  const slots = ensureControl(data, 40, rnd);
  assert.equal(slots.length, CONTROL_TICKETS);
  assert.equal(new Set(slots.map((s) => s.ticket)).size, CONTROL_TICKETS);
  const failed = slots[1].ticket;
  const fail = recordControl(data, 1, 2, 40, rnd);
  assert.equal(fail.passed, false);
  assert.notEqual(fail.replacement, failed);
  assert.equal(new Set(data.finale.control.map((s) => s.ticket)).size, CONTROL_TICKETS);
  for (const slot of [0, 1, 2]) assert.equal(recordControl(data, slot, 0, 40, rnd).xp, XP.control);
  assert.equal(finaleStatus(data, order, ids).ready, true);

  // Новая ошибка снова закрывает путь к экзамену до повторов.
  recordAnswer(data, 'A', false, day(12));
  assert.equal(finaleStatus(data, order, ids).ready, false);
});

test('темы: доля верных, слабые темы, вопросы для тренировки', () => {
  const data = emptyProgress();
  const qs = [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, topic: 'Знаки' })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, topic: 'Разметка' })),
  ];
  qs.forEach((q, i) => recordAnswer(data, q.id, q.topic === 'Знаки' ? i < 5 : i % 2 === 0, day(0) + i));
  const stats = topicStats(data, qs);
  assert.deepEqual(
    stats.map((t) => [t.topic, t.answered, t.correct]),
    [
      ['Знаки', 6, 5],
      ['Разметка', 6, 3],
    ],
  );
  assert.deepEqual(
    weakTopics(stats).map((t) => t.topic),
    ['Разметка'],
  );
  assert.deepEqual(trainingSet(data, ['s0', 's5', 'x1', 's1'], 3), ['s5', 'x1', 's0']);
});

test('из сохранённых данных остаётся только корректное', () => {
  const clean = sanitizeProgress({
    xp: 120,
    questions: {
      A: { n: 2, ok: true, ever: true, at: 5 },
      B: { n: 1, ok: false, ever: false, at: 6, review: { stage: 0, due: 100 } },
      C: { n: 0, ok: true, ever: true, at: 1 },
      D: 'мусор',
      E: { n: 1, ok: false, ever: false, at: 1, review: { stage: 7, due: 1 } },
    },
    chapters: { ch1: { points: ['p1', 'p1', 3], seen: ['intro'], stars: 9, delivered: 10 }, ch2: null },
    finale: { control: [{ ticket: 3, passed: true }, { ticket: 0, passed: false }], seen: ['intro'] },
  });
  assert.equal(clean.xp, 120);
  assert.deepEqual(Object.keys(clean.questions), ['A', 'B', 'E']);
  assert.equal(clean.questions.E.review, undefined);
  assert.deepEqual(clean.chapters.ch1, { points: ['p1'], seen: ['intro'], stars: 3, delivered: 10 });
  assert.equal(clean.chapters.ch2, undefined);
  assert.deepEqual(clean.finale.control, [{ ticket: 3, passed: true }]);
  assert.deepEqual(sanitizeProgress('мусор'), emptyProgress());
});

test('экзамен: тренировка даёт опыт каждый раз, экзамен-босс — один раз и завершает историю', () => {
  const data = emptyProgress();
  assert.equal(recordExamPass(data, false, day(0)).xp, XP.exam);
  assert.equal(recordExamPass(data, false, day(1)).xp, XP.exam);
  assert.equal(data.finale.exam, undefined);
  assert.equal(recordExamPass(data, true, day(2)).xp, XP.boss);
  assert.equal(data.finale.exam, day(2));
  assert.equal(recordExamPass(data, true, day(3)).xp, 0);
  assert.equal(data.xp, XP.exam * 2 + XP.boss);
  assert.equal(sanitizeProgress(JSON.parse(JSON.stringify(data))).finale.exam, day(2));
  assert.equal(sanitizeProgress({ finale: { exam: 'вчера' } }).finale.exam, undefined);
});
