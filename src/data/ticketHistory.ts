import { load, save } from '../storage.ts';

/** Билет, пройденный до конца: что выбрал игрок и сколько правильных. */
export interface TicketAttempt {
  /** Номер билета. */
  ticket: number;
  /** Когда билет закончен (мс с 1970 года). Заодно идентификатор попытки. */
  at: number;
  /** Сколько длилось прохождение, мс. */
  ms: number;
  /** Выбранный вариант (индекс в options, с нуля) для каждого вопроса билета по порядку номеров. */
  answers: number[];
  /** Сколько ответов правильные. */
  correct: number;
}

const KEY = 'pdd-game:ticket-history';
/** Хранится не больше стольких попыток (около 60 КБ), самые старые удаляются. */
export const HISTORY_LIMIT = 500;

const isInt = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min;

/** Оставляет из сохранённых данных только корректные попытки: хранилище могли испортить или очистить частично. */
export function sanitizeAttempts(raw: unknown): TicketAttempt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is TicketAttempt =>
        typeof a === 'object' &&
        a !== null &&
        isInt(a.ticket, 1) &&
        isInt(a.at, 0) &&
        isInt(a.ms, 0) &&
        Array.isArray(a.answers) &&
        a.answers.length > 0 &&
        a.answers.every((x: unknown) => isInt(x, 0)) &&
        isInt(a.correct, 0) &&
        a.correct <= a.answers.length,
    )
    .map(({ ticket, at, ms, answers, correct }) => ({ ticket, at, ms, answers: [...answers], correct }))
    .sort((a, b) => a.at - b.at);
}

/** Сводка по попыткам: сколько разных билетов пройдено и последняя попытка каждого билета. */
export function summarize(attempts: readonly TicketAttempt[]): { tickets: number; last: Map<number, TicketAttempt> } {
  const last = new Map<number, TicketAttempt>();
  for (const a of attempts) {
    const prev = last.get(a.ticket);
    if (!prev || a.at >= prev.at) last.set(a.ticket, a);
  }
  return { tickets: last.size, last };
}

/** Попытки одного билета, от первой к последней. */
export function attemptsOfTicket(attempts: readonly TicketAttempt[], ticket: number): TicketAttempt[] {
  return attempts.filter((a) => a.ticket === ticket).sort((a, b) => a.at - b.at);
}

// В памяти хранится полная копия: если localStorage недоступен (приватный режим),
// история всё равно работает до закрытия игры.
let attempts: TicketAttempt[] = sanitizeAttempts(load<unknown>(KEY, []));

/** Все попытки, от старых к новым. */
export function allAttempts(): readonly TicketAttempt[] {
  return attempts;
}

export function findAttempt(at: number): TicketAttempt | undefined {
  return attempts.find((a) => a.at === at);
}

/** Сохраняет пройденный билет и возвращает сохранённую попытку. */
export function recordAttempt(attempt: TicketAttempt): TicketAttempt {
  let at = attempt.at;
  while (findAttempt(at)) at++;
  const saved = { ...attempt, at, answers: [...attempt.answers] };
  attempts = [...attempts, saved].slice(-HISTORY_LIMIT);
  save(KEY, attempts);
  return saved;
}
