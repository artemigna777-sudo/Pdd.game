/**
 * Пояснения к ответам из открытого набора pdd_russia (data/raw/pdd_russia, см. SOURCE.md).
 *
 * Из набора берётся только текст пояснения. Вопрос, варианты и правильный ответ остаются из PDF.
 * Пояснение подключается, только если вопрос в наборе — тот же самый: тот же билет и номер,
 * то же число вариантов, тот же правильный ответ и практически тот же текст вопроса
 * (в наборе встречаются мелкие редакционные отличия: «ё/е», «2/двух», «км/ч / км/час»).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';

interface SourceQuestion {
  title: string;
  ticket_number: string;
  question: string;
  answers: { answer_text: string; is_correct: boolean }[];
  answer_tip: string;
}

export interface ExplanationMatch {
  explanation?: string;
  /** Почему пояснение не подключено. */
  problem?: string;
}

/** Минимальная доля общих слов в тексте вопроса, чтобы считать вопросы одинаковыми. */
const MIN_TEXT_SIMILARITY = 0.75;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Доля общих слов (коэффициент Дайса по мультимножествам слов). */
function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  const counts = new Map<string, number>();
  for (const w of wa) counts.set(w, (counts.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of wb) {
    const n = counts.get(w) ?? 0;
    if (n > 0) {
      common++;
      counts.set(w, n - 1);
    }
  }
  return (2 * common) / (wa.length + wb.length || 1);
}

/** Только оформление: пробелы и служебные пометки набора, текст пояснения не меняется. */
export function cleanTip(tip: string): string {
  return (
    tip
      .replace(/[   ]/g, ' ')
      .replace(/\s+/g, ' ')
      // Служебная пометка набора в конце: «(14.12.18 обновлены формулировки вопроса…)».
      .replace(/\s*\(\d{1,2}\.\d{1,2}\.\d{2,4}\s+обновл.*$/u, '')
      // «…на дороге.(Пункт 1.2 ПДД)» → «…на дороге. (Пункт 1.2 ПДД)».
      .replace(/([.!?;:»)])\(/g, '$1 (')
      .trim()
  );
}

export function loadExplanationSource(dir: string): Map<string, SourceQuestion> {
  const result = new Map<string, SourceQuestion>();
  if (!existsSync(dir)) return result;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const q of JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as SourceQuestion[]) {
      const ticket = Number(q.ticket_number.match(/\d+/)?.[0]);
      const number = Number(q.title.match(/\d+/)?.[0]);
      if (ticket && number) result.set(`${ticket}/${number}`, q);
    }
  }
  return result;
}

export function matchExplanation(question: Omit<Question, 'topic'>, source: Map<string, SourceQuestion>): ExplanationMatch {
  const q = source.get(`${question.ticket}/${question.number}`);
  if (!q) return { problem: 'нет в наборе' };
  if (q.answers.length !== question.options.length) {
    return { problem: `в наборе ${q.answers.length} вариантов, в PDF ${question.options.length}` };
  }
  const correct = q.answers.flatMap((a, i) => (a.is_correct ? [i + 1] : []));
  if (correct.length !== 1 || correct[0] !== question.correct + 1) {
    return { problem: `в наборе правильный ответ ${correct.join(', ') || 'не указан'}, в PDF ${question.correct + 1}` };
  }
  const sim = similarity(q.question, question.text);
  if (sim < MIN_TEXT_SIMILARITY) return { problem: `текст вопроса отличается (совпадение слов ${Math.round(sim * 100)}%)` };
  const explanation = cleanTip(q.answer_tip ?? '');
  if (!explanation) return { problem: 'в наборе нет пояснения' };
  return { explanation };
}
