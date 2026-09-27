import { load, save } from '../storage.ts';
import type { FailReason } from './exam.ts';

/** Законченный экзамен: вопросы, ответы и результат. */
export interface ExamAttempt {
  /** Когда закончен (мс). Заодно идентификатор. */
  at: number;
  ms: number;
  passed: boolean;
  reason?: FailReason;
  /** Экзамен-босс в финале сюжета (иначе — тренировка). */
  boss: boolean;
  /** id вопросов по порядку; дополнительные — после основных. */
  items: string[];
  /** Сколько из них дополнительных (последние). */
  extra: number;
  /** Выбранные варианты по порядку (отвеченных вопросов может быть меньше, чем вопросов). */
  chosen: number[];
}

const KEY = 'pdd-game:exam-history';
export const EXAM_HISTORY_LIMIT = 200;
const REASONS: FailReason[] = ['block', 'three', 'extra', 'time'];
const isInt = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min;

export function sanitizeExams(raw: unknown): ExamAttempt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is ExamAttempt =>
        typeof a === 'object' &&
        a !== null &&
        isInt(a.at, 0) &&
        isInt(a.ms, 0) &&
        typeof a.passed === 'boolean' &&
        (a.reason === undefined || REASONS.includes(a.reason)) &&
        typeof a.boss === 'boolean' &&
        Array.isArray(a.items) &&
        a.items.length > 0 &&
        a.items.every((x: unknown) => typeof x === 'string') &&
        isInt(a.extra, 0) &&
        a.extra <= a.items.length &&
        Array.isArray(a.chosen) &&
        a.chosen.length <= a.items.length &&
        a.chosen.every((x: unknown) => isInt(x, 0)),
    )
    .map(({ at, ms, passed, reason, boss, items, extra, chosen }) => ({ at, ms, passed, ...(reason ? { reason } : {}), boss, items: [...items], extra, chosen: [...chosen] }))
    .sort((a, b) => a.at - b.at);
}

let memory: ExamAttempt[] | undefined;
const all = () => (memory ??= sanitizeExams(load<unknown>(KEY, [])));

export function allExams(): ExamAttempt[] {
  return [...all()];
}

export function findExam(at: number): ExamAttempt | undefined {
  return all().find((a) => a.at === at);
}

export function recordExam(attempt: ExamAttempt): ExamAttempt {
  const list = [...all()];
  // Два экзамена в одну миллисекунду не бывают, но идентификатор должен быть уникальным.
  while (list.some((a) => a.at === attempt.at)) attempt = { ...attempt, at: attempt.at + 1 };
  list.push(attempt);
  memory = list.slice(-EXAM_HISTORY_LIMIT);
  save(KEY, memory);
  return attempt;
}

/** Для тестов: забыть копию в памяти. */
export function resetExamCache(): void {
  memory = undefined;
}
