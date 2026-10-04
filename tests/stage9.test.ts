/**
 * Этап 9 «Мой экзамен»: повторы сжимаются под дату экзамена, план на день — цель дня,
 * прогноз «успеваешь или нет», итог настоящего экзамена.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planSummary, unfixableReviews } from '../src/progress/examPlan.ts';
import { readiness } from '../src/progress/readiness.ts';
import {
  COINS,
  PLAN,
  clearExamDate,
  currentStreak,
  dayStart,
  dueReviews,
  emptyProgress,
  ensureDaily,
  freshPerDay,
  planActive,
  planDay,
  planDaysLeft,
  recordAnswer,
  recordExamResult,
  recordPlanExam,
  reviewInterval,
  sanitizeProgress,
  setExamDate,
  type ProgressData,
} from '../src/progress/progress.ts';

const day = (n: number, hour = 10) => new Date(2026, 9, 4 + n, hour).getTime();
const TOTAL = 800;
/** Номер дня (от day(0)), на который назначен повтор вопроса. */
const dueDay = (data: ProgressData, id: string) => Math.round((data.questions[id].review!.due - dayStart(day(0))) / 86_400_000);

/** Пройти вопрос через все повторы, отвечая верно в день срока; вернуть дни повторов. */
function repeatDays(data: ProgressData, id: string, from: number): number[] {
  recordAnswer(data, id, false, day(from));
  const out: number[] = [];
  while (data.questions[id].review) {
    const d = dueDay(data, id);
    out.push(d);
    recordAnswer(data, id, true, day(d));
  }
  return out;
}

test('без даты экзамена повторы — через 1, 3 и 7 дней', () => {
  const data = emptyProgress();
  assert.deepEqual(repeatDays(data, 'Q', 0), [1, 4, 11]);
  assert.equal(planActive(data, day(0)), false);
  assert.equal(reviewInterval(data, 2, day(0)), 7);
});

test('с датой экзамена три повтора сжимаются и успевают до экзамена', () => {
  // Экзамен через 10 дней: повторы на 1-й, 3-й и 9-й день, последний — накануне экзамена.
  const data = emptyProgress();
  setExamDate(data, day(10), TOTAL, day(0));
  assert.deepEqual(repeatDays(data, 'Q', 0), [1, 3, 9]);

  // Чем ближе экзамен, тем плотнее; последний повтор всегда не позже дня перед экзаменом.
  for (const left of [4, 5, 6, 7, 8, 11, 12, 20]) {
    const d = emptyProgress();
    setExamDate(d, day(left), TOTAL, day(0));
    const got = repeatDays(d, 'Q', 0);
    assert.equal(got.length, 3, `экзамен через ${left}: три повтора`);
    assert.ok(got.at(-1)! <= left - 1, `экзамен через ${left}: ${got}`);
    assert.ok(got.every((x, i) => x > (got[i - 1] ?? 0)), `экзамен через ${left}: повторы в разные дни (${got})`);
  }
  // Если времени хватает и без сжатия — обычные 1, 3, 7.
  const far = emptyProgress();
  setExamDate(far, day(30), TOTAL, day(0));
  assert.deepEqual(repeatDays(far, 'Q', 0), [1, 4, 11]);

  // Экзамен завтра: повтор всё равно не раньше чем через день (в день экзамена).
  const close = emptyProgress();
  setExamDate(close, day(1), TOTAL, day(0));
  recordAnswer(close, 'Q', false, day(0));
  assert.equal(dueDay(close, 'Q'), 1);
});

test('после даты экзамена повторы снова обычные; убрать дату — тоже', () => {
  const data = emptyProgress();
  setExamDate(data, day(5), TOTAL, day(0));
  assert.equal(reviewInterval(data, 2, day(0)), 4, 'последний повтор — накануне экзамена');
  assert.equal(reviewInterval(data, 2, day(6)), 7, 'дата прошла');
  clearExamDate(data, day(0));
  assert.equal(data.plan, undefined);
  assert.equal(reviewInterval(data, 2, day(0)), 7);
});

test('норма новых вопросов: поровну до последних дней, последние дни — без новых', () => {
  assert.equal(freshPerDay(800, 20), Math.ceil(800 / (20 - PLAN.reserve)));
  assert.equal(freshPerDay(800, PLAN.reserve), 800, 'в последние дни — всё, что осталось');
  assert.equal(freshPerDay(0, 10), 0);
  assert.equal(freshPerDay(10, 0), 0);

  const data = emptyProgress();
  setExamDate(data, day(20), TOTAL, day(0));
  const today = planDay(data, day(0))!;
  assert.deepEqual([today.fresh.target, today.reviews.target, today.exams.target], [Math.ceil(800 / 17), 0, 0]);
  // Норма задаётся в начале дня и до конца дня не меняется.
  for (let i = 0; i < 10; i++) recordAnswer(data, `N${i}`, true, day(0));
  assert.equal(planDay(data, day(0))!.fresh.target, Math.ceil(800 / 17));
  assert.equal(planDay(data, day(0))!.fresh.done, 10);
  // Знакомый вопрос — не новый.
  recordAnswer(data, 'N0', true, day(0));
  assert.equal(planDay(data, day(0))!.fresh.done, 10);
  // На следующий день норма пересчитана по оставшимся.
  assert.equal(planDay(data, day(1))!.fresh.target, Math.ceil(790 / 16));

  // Пробные экзамены: за неделю — по одному, в последние дни — по два, в день экзамена — нет.
  const exams = (n: number) => planDay(data, day(n))!.exams.target;
  assert.deepEqual([exams(12), exams(13), exams(16), exams(17), exams(19), exams(20)], [0, 1, 1, 2, 2, 0]);
  assert.equal(planDay(data, day(17))!.fresh.target, freshPerDay(790, 3), 'вопросы остались — их нужно пройти сейчас');
  assert.equal(planDay(data, day(20))!.fresh.target, 0, 'в день экзамена новых нет');
  assert.equal(planDay(data, day(21)), undefined, 'дата прошла');
});

test('план на день — цель дня: монеты и серия, когда выполнены все задачи', () => {
  const data = emptyProgress();
  // Ошибки вчера; экзамен через 5 дней — сегодня новые, повторы и пробный экзамен.
  recordAnswer(data, 'A', false, day(-1));
  recordAnswer(data, 'B', false, day(-1));
  setExamDate(data, day(5), 10, day(0));
  const daily = ensureDaily(data, day(0));
  const plan = planDay(data, day(0))!;
  assert.equal(daily.kind, 'plan');
  assert.deepEqual([plan.fresh.target, plan.reviews.target, plan.exams.target], [freshPerDay(8, 5), 2, 1]);
  assert.equal(daily.target, 3);

  for (let i = 0; i < plan.fresh.target; i++) recordAnswer(data, `N${i}`, true, day(0));
  assert.equal(data.daily!.count, 1);
  recordAnswer(data, 'A', true, day(0));
  recordAnswer(data, 'B', false, day(0)); // ошибка на повторе тоже считается повтором
  assert.equal(data.daily!.count, 2);
  assert.equal(data.daily!.done, false);
  const out = recordPlanExam(data, day(0));
  assert.equal(out.goal?.done, true);
  assert.equal(out.coins, COINS.goal);
  assert.equal(currentStreak(data, day(0)), 1);
  // Сверх плана — без второй награды.
  assert.equal(recordPlanExam(data, day(0)).goal, undefined);
});

test('указать дату посреди дня: невыполненная цель дня заменяется планом; выполненная — остаётся', () => {
  const data = emptyProgress();
  assert.equal(ensureDaily(data, day(0)).kind, 'points');
  setExamDate(data, day(10), TOTAL, day(0, 15));
  assert.equal(data.daily!.kind, 'plan');
  assert.equal(data.plan!.date, dayStart(day(10)));
  clearExamDate(data, day(0, 16));
  assert.equal(data.daily!.kind, 'points');

  const done = emptyProgress();
  ensureDaily(done, day(0));
  done.daily!.done = true;
  setExamDate(done, day(10), TOTAL, day(0));
  assert.equal(done.daily!.kind, 'points');
  // Без задач на день (всё пройдено, повторов нет) цель дня обычная.
  const empty = emptyProgress();
  for (let i = 0; i < 3; i++) recordAnswer(empty, `Q${i}`, true, day(-1));
  setExamDate(empty, day(20), 3, day(0));
  assert.equal(ensureDaily(empty, day(0)).kind, 'points');
});

test('прогноз: успеваешь, плотно, не успеть; советы по порядку', () => {
  const none = emptyProgress();
  assert.equal(planSummary(none, day(0)).state, 'none');

  const ok = emptyProgress();
  setExamDate(ok, day(30), TOTAL, day(0));
  const s = planSummary(ok, day(0));
  assert.deepEqual([s.state, s.daysLeft, s.pace, s.perDay, s.advice.length], ['active', 30, 'ok', Math.ceil(800 / 27), 0]);
  assert.equal(s.freshUntil, dayStart(day(26)));
  assert.equal(s.examsFrom, dayStart(day(23)));

  const tight = emptyProgress();
  setExamDate(tight, day(12), TOTAL, day(0));
  const t = planSummary(tight, day(0));
  assert.deepEqual([t.pace, t.perDay], ['tight', 89]);
  assert.deepEqual(t.advice, ['fresh', 'exams']);

  const late = emptyProgress();
  recordAnswer(late, 'A', false, day(-1));
  setExamDate(late, day(5), TOTAL, day(0));
  const l = planSummary(late, day(0));
  assert.equal(l.pace, 'late');
  assert.deepEqual(l.advice, ['reviews', 'fresh', 'exams']);

  // Новые вопросы пройдены, но повторов много: в среднем 60 ответов в день — «плотно».
  const busy = emptyProgress();
  for (let i = 0; i < 200; i++) recordAnswer(busy, `Q${i}`, false, day(-1));
  setExamDate(busy, day(10), 200, day(0));
  const b = planSummary(busy, day(0));
  assert.deepEqual([b.unseen, b.perDay, b.load, b.unfixable, b.pace, b.advice], [0, 0, 60, 0, 'tight', ['reviews', 'exams']]);

  // Все вопросы встречались, но ошибкам не хватит трёх повторов — «плотно».
  const fix = emptyProgress();
  for (let i = 0; i < 5; i++) recordAnswer(fix, `Q${i}`, true, day(-3));
  setExamDate(fix, day(2), 5, day(0));
  recordAnswer(fix, 'Q0', false, day(0));
  assert.equal(unfixableReviews(fix, day(0)), 1);
  const f = planSummary(fix, day(0));
  assert.deepEqual([f.unseen, f.pace, f.advice], [0, 'tight', ['unfixable', 'exams']]);
});

test('день экзамена и итог: спросить после даты, сохранить с готовностью', () => {
  const data = emptyProgress();
  setExamDate(data, day(3), TOTAL, day(0));
  assert.equal(planSummary(data, day(3)).state, 'today');
  assert.equal(planDaysLeft(data, day(3, 23)), 0);
  assert.equal(planSummary(data, day(4)).state, 'ask');
  assert.equal(planActive(data, day(4)), false);
  recordExamResult(data, true, 87.4, day(4));
  const s = planSummary(data, day(4));
  assert.equal(s.state, 'done');
  assert.deepEqual(s.result, { passed: true, readiness: 87, at: day(4) });
  // Итог можно отметить и в день экзамена — тогда план закончен.
  const today = emptyProgress();
  setExamDate(today, day(0), TOTAL, day(0));
  recordExamResult(today, false, 150, day(0, 18));
  assert.equal(today.plan!.result!.readiness, 100);
  assert.equal(planActive(today, day(0, 19)), false);
  assert.equal(planDay(today, day(0, 19)), undefined);
  // Новая дата (пересдача) начинает новый план без итога.
  setExamDate(today, day(10), TOTAL, day(1));
  assert.equal(planSummary(today, day(1)).state, 'active');
});

test('сохранённый план проверяется при загрузке', () => {
  const data = emptyProgress();
  recordAnswer(data, 'A', false, day(-1));
  setExamDate(data, day(10), TOTAL, day(0));
  recordAnswer(data, 'A', true, day(0));
  assert.equal(sanitizeProgress(JSON.parse(JSON.stringify(data))).daily!.kind, 'plan');
  recordExamResult(data, true, 90, day(11));
  const clean = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(clean.plan, data.plan);

  const broken = (plan: unknown) => sanitizeProgress({ ...JSON.parse(JSON.stringify(data)), plan }).plan;
  assert.equal(broken('завтра'), undefined);
  assert.equal(broken({ date: 'x', total: 800 }), undefined);
  assert.equal(broken({ date: day(10), total: 0 }), undefined);
  assert.deepEqual(broken({ date: day(10), total: 800, today: { day: 1, fresh: { target: 1 } }, result: { passed: 'да', readiness: 50, at: 1 } }), { date: day(10), total: 800 });
  assert.equal(broken({ date: day(10), total: 800, result: { passed: true, readiness: 101, at: 1 } })!.result, undefined);
});

test('повторы в плане: срок по сжатой схеме, цель «повторить» засчитывается в свой день', () => {
  const data = emptyProgress();
  setExamDate(data, day(6), TOTAL, day(0));
  recordAnswer(data, 'A', false, day(0));
  assert.deepEqual(dueReviews(data, day(1)), ['A']);
  assert.equal(planDay(data, day(1))!.reviews.target, 1);
  recordAnswer(data, 'A', true, day(1));
  assert.equal(planDay(data, day(1))!.reviews.done, 1);
  // Экзамен через 5 дней, остаётся 4 дня до него на 2 повтора: 3 + 7 сжимаются до 1 и 2.
  assert.equal(dueDay(data, 'A'), 2);
});

test('готовность: с датой экзамена первый совет — план на день', () => {
  const data = emptyProgress();
  const questions = [{ id: 'A', number: 1 }];
  assert.notEqual(readiness(data, questions, [], day(0)).tips[0].action, 'plan');
  setExamDate(data, day(21), 1, day(0));
  const tip = readiness(data, questions, [], day(0)).tips[0];
  assert.deepEqual(tip, { text: 'До экзамена в ГИБДД 21 день: выполняй план на день.', action: 'plan' });
  assert.match(readiness(data, questions, [], day(18)).tips[0].text, /3 дня:/);
  assert.match(readiness(data, questions, [], day(21)).tips[0].text, /сегодня/);
  assert.notEqual(readiness(data, questions, [], day(22)).tips[0].action, 'plan');
});
