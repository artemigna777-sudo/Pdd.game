/**
 * «Мой экзамен» (этап 9): сводка плана к дате экзамена в ГИБДД и прогноз — успевает ли игрок
 * пройти все вопросы заранее и закрепить ошибки, а если нет, что делать в первую очередь.
 * Сам план (нормы на день, сжатые повторы) — в `progress.ts`, тексты — в `ui/planView.ts`.
 */
import {
  PLAN,
  REVIEW_DAYS,
  dayStart,
  dueReviews,
  freshPerDay,
  isStale,
  learnDaysLeft,
  planDaysLeft,
  readyBy,
  refreshPerDay,
  reviewQueue,
  unseenCount,
  type ExamPlan,
  type ProgressData,
} from './progress.ts';

/**
 * none — даты нет; active — экзамен впереди; today — экзамен сегодня; ask — дата прошла,
 * а итог не указан; done — итог указан.
 */
export type PlanState = 'none' | 'active' | 'today' | 'ask' | 'done';

/** ok — успевает; tight — плотно, но можно; late — всё пройти не успеть. */
export type Pace = 'ok' | 'tight' | 'late';

/**
 * learn — учёба: идут новые вопросы; consolidate — закрепление: новые пройдены, каждый день
 * повторение пройденного и экзамен через день; final — последняя неделя: экзамен каждый день.
 */
export type Phase = 'learn' | 'consolidate' | 'final';

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
  phase?: Phase;
  /** Вопросы, которые ещё не встречались, и норма новых в день. */
  unseen: number;
  perDay: number;
  /** Сколько в среднем ответов в день до экзамена: новые вопросы и все оставшиеся повторы ошибок. */
  load: number;
  /** Первый день закрепления по плану: к нему все новые вопросы должны быть пройдены. */
  readyBy?: number;
  /** Последний день новых вопросов при норме perDay; и за сколько дней до экзамена это. */
  freshUntil?: number;
  early?: number;
  /** Выученные вопросы, которые давно не встречались, и норма повторения пройденного в день. */
  stale: number;
  refreshPerDay: number;
  /** С какого дня пробный экзамен каждый день. */
  examsFrom?: number;
  /** Ошибки, которые ещё нужно закрепить; сколько из них пора повторить сегодня. */
  reviews: number;
  dueToday: number;
  /** Ошибки, которые не успеют пройти все три повтора до экзамена, даже если повторять в срок. */
  unfixable: number;
  /** Новые вопросы остались, а срок учёбы уже вышел: закрепление начнётся позже плана. */
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

/**
 * Порядок «Повторения пройденного» среди давно не встречавшихся вопросов: сначала те, где были
 * ошибки, потом из тем, где ошибок больше, потом те, что не встречались дольше всех.
 */
export function refreshOrder(data: ProgressData, questions: readonly { id: string; topic: string }[], now: number): string[] {
  const seen = new Map<string, number>();
  const missed = new Map<string, number>();
  for (const q of questions) {
    const s = data.questions[q.id];
    if (!s) continue;
    seen.set(q.topic, (seen.get(q.topic) ?? 0) + 1);
    if (s.miss) missed.set(q.topic, (missed.get(q.topic) ?? 0) + 1);
  }
  const weakness = (topic: string) => (missed.get(topic) ?? 0) / (seen.get(topic) ?? 1);
  const state = (id: string) => data.questions[id]!;
  return questions
    .filter((q) => data.questions[q.id] && isStale(state(q.id), now))
    .sort((a, b) => Number(!state(a.id).miss) - Number(!state(b.id).miss) || weakness(b.topic) - weakness(a.topic) || state(a.id).at - state(b.id).at)
    .map((q) => q.id);
}

/** Сводка плана и прогноз. */
export function planSummary(data: ProgressData, now: number): PlanSummary {
  const plan = data.plan;
  const unseen = unseenCount(data);
  const stale = unseen ? 0 : Object.values(data.questions).filter((s) => isStale(s, now)).length;
  const common = { unseen, stale, refreshPerDay: 0, reviews: reviewQueue(data).length, dueToday: dueReviews(data, now).length, perDay: 0, load: 0, unfixable: 0, squeezed: false, advice: [] };
  if (!plan) return { state: 'none', ...common };
  const left = planDaysLeft(data, now)!;
  const base = { ...common, date: plan.date, daysLeft: left, result: plan.result };
  if (plan.result) return { ...base, state: 'done' };
  if (left < 0) return { ...base, state: 'ask' };
  const unfixable = unfixableReviews(data, now);
  if (left === 0) return { ...base, state: 'today', unfixable };

  const { dueToday } = common;
  const today = dayStart(now);
  const learnDays = learnDaysLeft(data, now);
  const perDay = freshPerDay(unseen, learnDays);
  const repeats = reviewQueue(data).reduce((sum, id) => sum + REVIEW_DAYS.length - data.questions[id].review!.stage, 0);
  const load = Math.ceil((unseen + repeats) / left);
  const freshUntil = unseen ? dayStart(now, Math.min(learnDays, Math.ceil(unseen / perDay)) - 1) : undefined;
  const early = freshUntil === undefined ? undefined : Math.round((plan.date - freshUntil) / DAY_MS);
  const ready = readyBy(plan, now);
  const examsFrom = Math.max(today, dayStart(plan.date, -PLAN.examsFrom));
  const squeezed = unseen > 0 && today >= ready;
  const phase: Phase = unseen ? 'learn' : left <= PLAN.examsFrom ? 'final' : 'consolidate';
  const pace: Pace = perDay > PLAN.max || load > PLAN.max ? 'late' : perDay > PLAN.comfortable || load > PLAN.comfortable || squeezed || unfixable > 0 ? 'tight' : 'ok';
  const advice: Advice[] = [];
  if (pace !== 'ok') {
    if (dueToday) advice.push('reviews');
    if (unfixable) advice.push('unfixable');
    if (unseen) advice.push('fresh');
    advice.push('exams');
    if (pace === 'late') advice.push('move');
  }
  return {
    ...base,
    state: 'active',
    phase,
    perDay,
    load,
    readyBy: ready,
    freshUntil,
    early,
    refreshPerDay: refreshPerDay(stale, left),
    examsFrom,
    unfixable,
    squeezed,
    pace,
    advice: advice.slice(0, 3),
  };
}
