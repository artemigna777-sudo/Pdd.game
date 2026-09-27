/**
 * Экзамен как в ГИБДД (Административный регламент МВД, приказ от 20.02.2021 № 80):
 *  - 20 вопросов, 4 тематических блока по 5: вопросы 1–5, 6–10, 11–15, 16–20;
 *  - 20 минут;
 *  - без ошибок — сдал;
 *  - одна ошибка или две в разных блоках — по 5 дополнительных вопросов из блока каждой
 *    ошибки и по 5 минут на каждые 5 вопросов; в дополнительных вопросах ошибаться нельзя;
 *  - две ошибки в одном блоке, три ошибки, ошибка в дополнительных вопросах или конец
 *    времени — не сдал. Экзамен заканчивается сразу, как только результат ясен.
 *
 * Вопросы экзамена: на каждое место с 1 по 20 — вопрос с тем же номером из случайного билета,
 * поэтому тематические блоки такие же, как в билетах. Дополнительные вопросы — с тех же мест
 * блока из других билетов.
 */

export const EXAM_RULES = {
  questions: 20,
  blockSize: 5,
  minutes: 20,
  /** Дополнительных вопросов за каждую ошибку. */
  extraQuestions: 5,
  /** Дополнительных минут за каждые 5 дополнительных вопросов. */
  extraMinutes: 5,
} as const;

const MINUTE = 60_000;

export interface ExamSource {
  id: string;
  ticket: number;
  number: number;
}

export interface ExamItem {
  id: string;
  /** Тематический блок, с 0. */
  block: number;
  /** Дополнительный вопрос. */
  extra: boolean;
}

export type FailReason = 'block' | 'three' | 'extra' | 'time';

export interface ExamState {
  items: ExamItem[];
  /** Верность ответов по порядку вопросов. */
  results: boolean[];
  /** Выбранные варианты по порядку вопросов. */
  chosen: number[];
  startedAt: number;
  /** Когда кончается время (растёт с дополнительными вопросами). */
  deadline: number;
  /** Экзамен окончен. */
  outcome?: { passed: boolean; reason?: FailReason; at: number };
}

/** Тематический блок вопроса по его номеру в билете. */
export const blockOf = (number: number): number => Math.floor((number - 1) / EXAM_RULES.blockSize);

function byNumber(questions: readonly ExamSource[]): Map<number, ExamSource[]> {
  const map = new Map<number, ExamSource[]>();
  for (const q of questions) map.set(q.number, [...(map.get(q.number) ?? []), q]);
  return map;
}

const pick = <T>(items: readonly T[], rnd: () => number): T => items[Math.min(items.length - 1, Math.floor(rnd() * items.length))];

/** Начать экзамен: 20 вопросов, на каждое место — вопрос с тем же номером из случайного билета. */
export function startExam(questions: readonly ExamSource[], now: number, rnd: () => number = Math.random): ExamState {
  const pool = byNumber(questions);
  const items: ExamItem[] = [];
  for (let n = 1; n <= EXAM_RULES.questions; n++) {
    const candidates = pool.get(n);
    if (!candidates?.length) throw new Error(`Нет вопросов с номером ${n}`);
    items.push({ id: pick(candidates, rnd).id, block: blockOf(n), extra: false });
  }
  return { items, results: [], chosen: [], startedAt: now, deadline: now + EXAM_RULES.minutes * MINUTE };
}

/** Текущий вопрос (или undefined, если экзамен окончен). */
export const currentItem = (s: ExamState): ExamItem | undefined => (s.outcome ? undefined : s.items[s.results.length]);

/** Ошибки основной части по блокам. */
export function mainMistakes(s: ExamState): number[] {
  const byBlock = Array.from({ length: EXAM_RULES.questions / EXAM_RULES.blockSize }, () => 0);
  s.items.forEach((item, i) => {
    if (!item.extra && s.results[i] === false) byBlock[item.block]++;
  });
  return byBlock;
}

/** Время вышло — экзамен не сдан. Возвращает true, если экзамен закончился сейчас. */
export function checkTime(s: ExamState, now: number): boolean {
  if (s.outcome || now < s.deadline) return false;
  s.outcome = { passed: false, reason: 'time', at: s.deadline };
  return true;
}

/**
 * Ответ на текущий вопрос. Сразу решает, что дальше: следующий вопрос, дополнительные вопросы
 * или конец экзамена.
 */
export function answerExam(s: ExamState, chosen: number, correct: boolean, questions: readonly ExamSource[], now: number, rnd: () => number = Math.random): ExamState {
  if (checkTime(s, now) || s.outcome) return s;
  const item = s.items[s.results.length];
  if (!item) return s;
  s.results.push(correct);
  s.chosen.push(chosen);
  const finish = (passed: boolean, reason?: FailReason) => {
    s.outcome = { passed, reason, at: now };
    return s;
  };

  if (item.extra) {
    if (!correct) return finish(false, 'extra');
    return s.results.length === s.items.length ? finish(true) : s;
  }

  const mistakes = mainMistakes(s);
  if (mistakes.some((m) => m >= 2)) return finish(false, 'block');
  const total = mistakes.reduce((a, b) => a + b, 0);
  if (total >= 3) return finish(false, 'three');
  const mainAnswered = s.items.filter((it, i) => !it.extra && i < s.results.length).length;
  if (mainAnswered < EXAM_RULES.questions) return s;

  // Основная часть позади.
  if (total === 0) return finish(true);
  const used = new Set(s.items.map((it) => it.id));
  const pool = byNumber(questions);
  mistakes.forEach((m, block) => {
    if (!m) return;
    for (let k = 0; k < EXAM_RULES.extraQuestions; k++) {
      const number = block * EXAM_RULES.blockSize + 1 + (k % EXAM_RULES.blockSize);
      const candidates = (pool.get(number) ?? []).filter((q) => !used.has(q.id));
      if (!candidates.length) continue;
      const q = pick(candidates, rnd);
      used.add(q.id);
      s.items.push({ id: q.id, block, extra: true });
    }
    s.deadline += EXAM_RULES.extraMinutes * MINUTE * Math.ceil(EXAM_RULES.extraQuestions / EXAM_RULES.blockSize);
  });
  return s;
}

/** Сколько дополнительных вопросов добавлено. */
export const extraCount = (s: ExamState): number => s.items.filter((i) => i.extra).length;

export const FAIL_TEXT: Record<FailReason, string> = {
  block: 'Две ошибки в одном тематическом блоке.',
  three: 'Три ошибки в основных вопросах.',
  extra: 'Ошибка в дополнительных вопросах.',
  time: 'Время вышло.',
};

/** Оставшееся время как «мм:сс». */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
