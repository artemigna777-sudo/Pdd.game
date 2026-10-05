/**
 * Рекорды режимов: «Один день Соколова» (этап 12) и смена курьера (этап 13). Хранятся в прогрессе,
 * поэтому попадают и в резервную копию.
 */
import { COURIER_TOP, type CourierRecord, type ProgressData } from './progress.ts';

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
