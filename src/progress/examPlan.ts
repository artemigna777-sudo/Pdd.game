/**
 * «Мой экзамен» (этап 9): сводка плана к дате экзамена в ГИБДД и прогноз — успевает ли игрок
 * пройти все вопросы и закрепить ошибки, а если нет, что делать в первую очередь.
 * Сам план (нормы на день, сжатые повторы) — в `progress.ts`, тексты — в `ui/planView.ts`.
 */
import { PLAN, REVIEW_DAYS, dayStart, dueReviews, freshPerDay, planDaysLeft, reviewQueue, unseenCount, type ExamPlan, type ProgressData } from './progress.ts';

/**
 * none — даты нет; active — экзамен впереди; today — экзамен сегодня; ask — дата прошла,
 * а итог не указан; done — итог указан.
 */
export type PlanState = 'none' | 'active' | 'today' | 'ask' | 'done';

/** ok — успевает; tight — плотно, но можно; late — всё пройти не успеть. */
export type Pace = 'ok' | 'tight' | 'late';

/**
 * Что делать в первую очередь: повторы на сегодня; ошибки, которым не хватит трёх повторов;
 * новые вопросы без пропусков; пробный экзамен каждый день; перенести экзамен.
 */
export type Advice = 'reviews' | 'unfixable' | 'fresh' | 'exams' | 'move';

export interface PlanSummary {
  state: PlanState;
  /** Начало дня экзамена. */
  date?: number;
  daysLeft?: number;
  /** Вопросы, которые ещё не встречались, и норма новых в день. */
  unseen: number;
  perDay: number;
  /** Сколько в среднем ответов в день до экзамена: новые вопросы и все оставшиеся повторы ошибок. */
  load: number;
  /** До какого дня идут новые вопросы (по норме); дальше — повторы и пробные экзамены. */
  freshUntil?: number;
  /** С какого дня пробный экзамен каждый день. */
  examsFrom?: number;
  /** Ошибки, которые ещё нужно закрепить; сколько из них пора повторить сегодня. */
  reviews: number;
  dueToday: number;
  /** Ошибки, которые не успеют пройти все три повтора до экзамена, даже если повторять в срок. */
  unfixable: number;
  /** Новые вопросы остались, а до экзамена — только дни повторов. */
  squeezed: boolean;
  pace?: Pace;
  /** Не больше трёх советов, самый важный — первым (только если не всё гладко). */
  advice: Advice[];
  result?: ExamPlan['result'];
}

const DAY_MS = 86_400_000;

/**
 * Сколько ошибок не успеют пройти все три повтора до дня экзамена: повтор не раньше своего
 * срока, следующий — не раньше чем через день.
 */
export function unfixableReviews(data: ProgressData, now: number): number {
  if (!data.plan) return 0;
  const lastDay = data.plan.date - DAY_MS;
  let count = 0;
  for (const id of reviewQueue(data)) {
    const r = data.questions[id].review!;
    const first = Math.max(dayStart(now), dayStart(r.due));
    if (first + (REVIEW_DAYS.length - r.stage - 1) * DAY_MS > lastDay) count++;
  }
  return count;
}

/** Сводка плана и прогноз. */
export function planSummary(data: ProgressData, now: number): PlanSummary {
  const plan = data.plan;
  const common = { unseen: unseenCount(data), reviews: reviewQueue(data).length, dueToday: dueReviews(data, now).length, perDay: 0, load: 0, unfixable: 0, squeezed: false, advice: [] };
  if (!plan) return { state: 'none', ...common };
  const left = planDaysLeft(data, now)!;
  const base = { ...common, date: plan.date, daysLeft: left, result: plan.result };
  if (plan.result) return { ...base, state: 'done' };
  if (left < 0) return { ...base, state: 'ask' };
  const unfixable = unfixableReviews(data, now);
  if (left === 0) return { ...base, state: 'today', unfixable };

  const { unseen, dueToday } = common;
  const perDay = freshPerDay(unseen, left);
  const repeats = reviewQueue(data).reduce((sum, id) => sum + REVIEW_DAYS.length - data.questions[id].review!.stage, 0);
  const load = Math.ceil((unseen + repeats) / left);
  const freshDays = Math.min(Math.max(1, left - PLAN.reserve), perDay ? Math.ceil(unseen / perDay) : 0);
  const freshUntil = unseen ? dayStart(now) + (freshDays - 1) * DAY_MS : undefined;
  const examsFrom = Math.max(dayStart(now), plan.date - PLAN.examsFrom * DAY_MS);
  const squeezed = unseen > 0 && left <= PLAN.reserve;
  const pace: Pace = perDay > PLAN.max || load > PLAN.max ? 'late' : perDay > PLAN.comfortable || load > PLAN.comfortable || squeezed || unfixable > 0 ? 'tight' : 'ok';
  const advice: Advice[] = [];
  if (pace !== 'ok') {
    if (dueToday) advice.push('reviews');
    if (unfixable) advice.push('unfixable');
    if (unseen) advice.push('fresh');
    advice.push('exams');
    if (pace === 'late') advice.push('move');
  }
  return { ...base, state: 'active', perDay, load, freshUntil, examsFrom, unfixable, squeezed, pace, advice: advice.slice(0, 3) };
}
