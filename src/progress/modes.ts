/**
 * Рекорды режимов: «Один день Соколова» (этап 12) и смена курьера (этап 13). Хранятся в прогрессе,
 * поэтому попадают и в резервную копию.
 */
import { COURIER_TOP, dueReviews, type CourierRecord, type ProgressData } from './progress.ts';

/** Итог смены на посту ДПС. */
export interface PatrolResult {
  /** Пойманы нарушители. */
  caught: number;
  /** Нарушили и уехали непойманными. */
  missed: number;
  /** Остановлены добросовестные водители. */
  wrong: number;
  /** Ответы на вопросы пойманным нарушителям. */
  answers: number;
  correct: number;
}

/** Очки смены: пойманный нарушитель — 100, верный ответ — 50, ошибочная остановка — минус 50. */
export const PATROL_POINTS = { caught: 100, correct: 50, wrong: -50 } as const;

export function patrolScore(r: PatrolResult): number {
  return Math.max(0, r.caught * PATROL_POINTS.caught + r.correct * PATROL_POINTS.correct + r.wrong * PATROL_POINTS.wrong);
}

/** Записать смену; true — новый рекорд. */
export function recordPatrol(data: ProgressData, r: PatrolResult): { score: number; record: boolean; best: number } {
  const score = patrolScore(r);
  data.modes ??= {};
  const prev = data.modes.patrol ?? { best: 0, shifts: 0 };
  const record = score > prev.best;
  data.modes.patrol = { best: Math.max(prev.best, score), shifts: prev.shifts + 1 };
  return { score, record, best: data.modes.patrol.best };
}

/** Записать смену курьера в таблицу рекордов; место в таблице (1…) или undefined, если не попала. */
export function recordCourier(data: ProgressData, r: CourierRecord): number | undefined {
  data.modes ??= {};
  const list = [...(data.modes.courier ?? []), r].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, COURIER_TOP);
  data.modes.courier = list;
  const i = list.indexOf(r);
  return i >= 0 ? i + 1 : undefined;
}

// ─── Смена курьера (этап 13) ─────────────────────────────────────────────────────

/** Смена: 5 минут; очки за верный ответ — 100 × множитель серии (до ×5). */
export const COURIER = {
  seconds: 300,
  points: 100,
  maxMultiplier: 5,
  /** Ошибка: минус время (с). */
  wrongPenalty: 15,
  /** Нарушение правил: минус время (с). */
  violationPenalty: 10,
} as const;

/**
 * Вопрос для доставки: сначала повторы ошибок, срок которых наступил, потом вопросы, где
 * последний ответ был неверным, потом новые (сначала из тем района), потом любые.
 */
export function courierQuestion(data: ProgressData, ids: readonly string[], local: ReadonlySet<string>, now: number, recent: readonly string[], rnd: () => number = Math.random): string {
  const fresh = (list: readonly string[]) => list.filter((id) => !recent.includes(id));
  const pick = (list: readonly string[]) => list[Math.floor(rnd() * list.length)];
  const due = fresh(dueReviews(data, now));
  if (due.length) return due[0];
  const weak = fresh(ids.filter((id) => data.questions[id] && !data.questions[id].ok));
  if (weak.length) return pick(weak);
  const unseen = fresh(ids.filter((id) => !data.questions[id]));
  const near = unseen.filter((id) => local.has(id));
  if (near.length) return pick(near);
  if (unseen.length) return pick(unseen);
  return pick(fresh(ids).length ? fresh(ids) : ids);
}

/** Очки за ответ и новый множитель. */
export function courierAnswer(multiplier: number, correct: boolean): { points: number; multiplier: number } {
  if (!correct) return { points: 0, multiplier: 1 };
  return { points: COURIER.points * multiplier, multiplier: Math.min(COURIER.maxMultiplier, multiplier + 1) };
}
