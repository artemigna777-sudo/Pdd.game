/**
 * Дополнительные сюжеты из магазина (этап 17): короткие истории на 30–40 минут со своими
 * выборами и концовками. Каждый шаг — сюжетная сцена, потом испытание: ситуации этапа 15
 * («не из билетов») и повторы своих ошибок из билетов в оригинальной карточке (правило 3).
 * Основная точка встречи вопросов не меняется: здесь вопросы базы — только повторы, как в тренировках.
 */
import type { Situation } from '../situations/types.ts';
import { THEMES, type ThemeId } from '../situations/run.ts';
import { check, emptyStory, plotContext, type Decision, type Ending, type PlotContext } from './plot.ts';
import type { CharacterId, Line } from './story.ts';

export interface TaleTrial {
  /** Сколько ситуаций и вопросов из билетов. */
  situations: number;
  questions: number;
  /** Ситуации — из этих тем (`THEMES` этапа 15). */
  themes: ThemeId[];
  /** Если своих ошибок не хватает — вопросы из этих тем билетов. */
  topics: string[];
}

export interface TaleStep {
  title: string;
  /** Сцена перед испытанием. */
  lines: Line[];
  /** Развилка в конце сцены (id из `Tale.decisions`). */
  decision?: string;
  trial?: TaleTrial;
}

export interface Tale {
  id: string;
  title: string;
  icon: string;
  price: number;
  hero: CharacterId;
  about: string;
  /** Примерно минут на прохождение. */
  minutes: number;
  steps: TaleStep[];
  decisions: Decision[];
  /** Первая подходящая по порядку, последняя — по умолчанию. */
  endings: Ending[];
}

/** Прохождение сюжета игроком. */
export interface TaleState {
  /** Какой шаг впереди (= steps.length — сюжет пройден, ждёт концовки или уже с ней). */
  step: number;
  choices: { id: string; value: string; at: number }[];
  right: number;
  total: number;
  /** Открытые концовки: id → когда. */
  endings: Record<string, number>;
  /** Сколько раз пройден до конца. */
  runs: number;
}

export const emptyTale = (): TaleState => ({ step: 0, choices: [], right: 0, total: 0, endings: {}, runs: 0 });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

export function sanitizeTales(raw: unknown): Record<string, TaleState> | undefined {
  if (!isObj(raw)) return undefined;
  const out: Record<string, TaleState> = {};
  for (const [id, t] of Object.entries(raw)) {
    if (!isObj(t) || !isInt(t.step) || !isInt(t.right) || !isInt(t.total) || t.right > t.total || !isInt(t.runs)) continue;
    const state: TaleState = { step: t.step, choices: [], right: t.right, total: t.total, endings: {}, runs: t.runs };
    if (Array.isArray(t.choices)) for (const c of t.choices) if (isObj(c) && typeof c.id === 'string' && typeof c.value === 'string' && isInt(c.at)) state.choices.push({ id: c.id, value: c.value, at: c.at });
    if (isObj(t.endings)) for (const [e, at] of Object.entries(t.endings)) if (isInt(at)) state.endings[e] = at;
    out[id] = state;
  }
  return out;
}

/** Доля верных ответов прохождения (0, если ответов ещё нет). */
export const taleScore = (s: TaleState): number => (s.total ? s.right / s.total : 0);

/** Решения и точность прохождения — для реплик с условиями и концовки. */
export function taleContext(s: TaleState, tale: Tale): PlotContext {
  const story = emptyStory();
  story.choices = s.choices;
  return { ...plotContext(story, [], { decisions: tale.decisions, givers: {} }), score: taleScore(s) };
}

/** Записать выбор в развилке рассказа (повторный выбор заменяет прежний). */
export function taleDecide(s: TaleState, tale: Tale, id: string, value: string, now: number): boolean {
  const d = tale.decisions.find((x) => x.id === id);
  if (!d?.options.some((o) => o.value === value)) return false;
  s.choices = s.choices.filter((c) => c.id !== id);
  s.choices.push({ id, value, at: now });
  return true;
}

/** Начать сюжет сначала: шаги, выборы и счёт обнуляются, открытые концовки остаются. */
export function restartTale(s: TaleState): void {
  s.step = 0;
  s.choices = [];
  s.right = 0;
  s.total = 0;
}

/** Сюжет пройден: концовка по выборам и точности. */
export function finishTale(s: TaleState, tale: Tale, now: number): { ending: Ending; fresh: boolean; score: number } {
  const ctx = taleContext(s, tale);
  const ending = tale.endings.find((e) => check(e.when, ctx)) ?? tale.endings[tale.endings.length - 1];
  const fresh = s.endings[ending.id] === undefined;
  if (fresh) s.endings[ending.id] = now;
  s.step = tale.steps.length;
  s.runs++;
  return { ending, fresh, score: taleScore(s) };
}

// ─── Испытание шага ──────────────────────────────────────────────────────────

export type TrialItem = { kind: 'situation'; id: string } | { kind: 'question'; id: string };

/** Что игрок знает о вопросах базы (кусочек прогресса). */
export interface QuestionMemory {
  /** Последний ответ верный; есть ли вопрос в работе над ошибками; сколько раз ошибался. */
  [id: string]: { ok: boolean; review?: unknown; miss?: number };
}

function shuffle<T>(list: T[], rnd: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Испытание: ситуации из тем шага (сначала те, что ещё не встречались в этом прохождении), и
 * повторы своих ошибок — сначала из работы над ошибками, потом с неверным последним ответом,
 * потом с ошибками раньше; если своих ошибок мало — вопросы тем билетов шага.
 */
export function pickTrial(
  trial: TaleTrial,
  situations: readonly Situation[],
  questions: readonly { id: string; topic: string }[],
  memory: QuestionMemory,
  used: ReadonlySet<string>,
  rnd: () => number = Math.random,
): TrialItem[] {
  const matchers = THEMES.filter((t) => trial.themes.includes(t.id)).map((t) => t.match);
  const pool = situations.filter((x) => matchers.some((m) => m(x)));
  const sits = [...shuffle(pool.filter((x) => !used.has(x.id)), rnd), ...shuffle(pool.filter((x) => used.has(x.id)), rnd)].slice(0, trial.situations);
  const fresh = (ids: string[]) => ids.filter((id) => !used.has(id));
  const all = questions.map((q) => q.id);
  const review = fresh(all.filter((id) => memory[id]?.review));
  const wrong = fresh(all.filter((id) => memory[id] && !memory[id].ok && !memory[id].review));
  const missed = fresh(all.filter((id) => (memory[id]?.miss ?? 0) > 0 && memory[id].ok && !memory[id].review));
  const topical = fresh(questions.filter((q) => trial.topics.includes(q.topic)).map((q) => q.id));
  const qs: string[] = [];
  for (const id of [...shuffle(review, rnd), ...shuffle(wrong, rnd), ...shuffle(missed, rnd), ...shuffle(topical, rnd)]) if (qs.length < trial.questions && !qs.includes(id)) qs.push(id);
  const items: TrialItem[] = [...sits.map((x) => ({ kind: 'situation' as const, id: x.id })), ...qs.map((id) => ({ kind: 'question' as const, id }))];
  // Вопросы из билетов — вперемешку с ситуациями, но не в самом начале.
  return items.length > 2 ? [items[0], ...shuffle(items.slice(1), rnd)] : items;
}
