/**
 * «Готовность к экзамену»: оценка по статистике игрока, от 0 до 100%.
 *  - 60% — освоенные вопросы базы (последний ответ верный и нет повтора);
 *  - 20% — самый слабый блок экзамена (вопросы 1–5, 6–10, 11–15, 16–20): на экзамене две
 *    ошибки в одном блоке — провал, поэтому считается именно слабейший;
 *  - 20% — последние 5 экзаменов: сколько из них сдано.
 * 100% — все вопросы освоены и последние 5 экзаменов сданы.
 */
import { EXAM_RULES, blockOf } from '../exam/exam.ts';
import { dueReviews, isMastered, planActive, planDaysLeft, reviewQueue, type ProgressData } from './progress.ts';

export interface Readiness {
  percent: number;
  mastered: number;
  total: number;
  /** Доля освоенных вопросов в каждом блоке. */
  blocks: number[];
  weakest: number;
  /** Сдано из последних экзаменов и сколько их было (не больше 5). */
  exams: { passed: number; count: number };
  /** Что сделать, чтобы готовность выросла (самое важное — первым). */
  tips: Tip[];
}

export interface Tip {
  text: string;
  action?: 'review' | 'block' | 'exam' | 'story' | 'plan';
  block?: number;
}

export const blockLabel = (block: number): string => `вопросы ${block * EXAM_RULES.blockSize + 1}–${(block + 1) * EXAM_RULES.blockSize}`;

export function readiness(data: ProgressData, questions: readonly { id: string; number: number }[], exams: readonly { passed: boolean }[], now: number): Readiness {
  const total = questions.length;
  const mastered = questions.filter((q) => isMastered(data.questions[q.id])).length;
  const blockCount = EXAM_RULES.questions / EXAM_RULES.blockSize;
  const blocks = Array.from({ length: blockCount }, (_, b) => {
    const qs = questions.filter((q) => blockOf(q.number) === b);
    return qs.length ? qs.filter((q) => isMastered(data.questions[q.id])).length / qs.length : 0;
  });
  const weakest = blocks.indexOf(Math.min(...blocks));
  const recent = exams.slice(-5);
  const passed = recent.filter((e) => e.passed).length;
  const score = 0.6 * (total ? mastered / total : 0) + 0.2 * blocks[weakest] + 0.2 * (passed / 5);
  const percent = Math.min(100, Math.floor(score * 100 + 1e-9));

  const tips: Tip[] = [];
  // С датой экзамена главное — план на день («Мой экзамен», этап 9).
  if (planActive(data, now)) {
    const left = planDaysLeft(data, now)!;
    const word = left % 10 === 1 && left % 100 !== 11 ? 'день' : [2, 3, 4].includes(left % 10) && ![12, 13, 14].includes(left % 100) ? 'дня' : 'дней';
    tips.push({ text: left === 0 ? 'Экзамен в ГИБДД сегодня — удачи! Загляни в план на сегодня.' : `До экзамена в ГИБДД ${left} ${word}: выполняй план на день.`, action: 'plan' });
  }
  const due = dueReviews(data, now).length;
  if (due) tips.push({ text: `Повторить ошибки на сегодня: ${due}.`, action: 'review' });
  const answered = questions.filter((q) => data.questions[q.id]).length;
  if (answered < total) tips.push({ text: `Встретилось ${answered} из ${total} вопросов — продолжай историю.`, action: 'story' });
  if (blocks[weakest] < 1 && answered > 0) tips.push({ text: `Слабее всего блок «${blockLabel(weakest)}»: освоено ${Math.floor(blocks[weakest] * 100)}%.`, action: 'block', block: weakest });
  if (passed < 5) tips.push({ text: recent.length ? `Из последних ${recent.length} экзаменов сдано ${passed}. Для 100% нужно 5 сданных подряд.` : 'Сдай тренировочный экзамен — он тоже входит в готовность.', action: 'exam' });
  const waiting = reviewQueue(data).length - due;
  if (!due && waiting > 0) tips.push({ text: `Ещё ${waiting} ошибок ждут повтора в свой день.` });
  return { percent, mastered, total, blocks, weakest, exams: { passed, count: recent.length }, tips: tips.slice(0, 3) };
}
