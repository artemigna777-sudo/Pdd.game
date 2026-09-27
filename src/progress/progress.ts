/**
 * Прогресс игрока: ответы на каждый вопрос, работа над ошибками, опыт и уровни, главы сюжета
 * и финал. Хранится в localStorage (`pdd-game:progress`), при недоступном хранилище — в памяти
 * до закрытия игры.
 *
 * Работа над ошибками — интервальное повторение: ошибка → повтор через 1 день → через 3 дня →
 * через 7 дней. Повтор засчитывается, только если вопрос отвечен верно в свой день или позже;
 * новая ошибка возвращает вопрос к повтору через 1 день. После трёх верных повторов вопрос
 * уходит из работы над ошибками. Дни календарные: ошибка вечером — повтор завтра с утра.
 */
import { load, save } from '../storage.ts';

export const REVIEW_DAYS = [1, 3, 7] as const;

/** Сколько опыта за что. */
export const XP = {
  /** Первый верный ответ на вопрос. */
  first: 10,
  /** Повтор ошибки в свой день. */
  review: 5,
  /** Верный ответ на уже знакомый вопрос. */
  repeat: 2,
  /** Серия точки пройдена в первый раз. */
  point: 5,
  /** Посылка главы доставлена. */
  delivery: 100,
  /** Каждая новая звезда главы. */
  star: 50,
  /** Контрольный билет без ошибок. */
  control: 100,
} as const;

export const LEVELS = [
  { title: 'Ученик', xp: 0 },
  { title: 'Новичок за рулём', xp: 200 },
  { title: 'Стажёр-курьер', xp: 600 },
  { title: 'Курьер', xp: 1200 },
  { title: 'Уверенный курьер', xp: 2200 },
  { title: 'Знаток улиц', xp: 3500 },
  { title: 'Опытный водитель', xp: 5000 },
  { title: 'Ас доставки', xp: 7000 },
  { title: 'Мастер дороги', xp: 9000 },
  { title: 'Легенда «Стрелы»', xp: 11500 },
] as const;

/** Доля верных ответов главы, с которой открывается следующая глава. */
export const PASS_SHARE = 0.8;
export const CONTROL_TICKETS = 3;

export interface QuestionState {
  /** Сколько раз отвечен. */
  n: number;
  /** Последний ответ верный. */
  ok: boolean;
  /** Хоть раз отвечен верно. */
  ever: boolean;
  /** Когда отвечен последний раз (мс). */
  at: number;
  /** Вопрос в работе над ошибками: ступень повтора (0 — через 1 день, 1 — через 3, 2 — через 7) и срок. */
  review?: { stage: number; due: number };
}

export interface ChapterState {
  /** Точки, серия которых пройдена хотя бы раз. */
  points: string[];
  /** Показанные сюжетные сцены главы. */
  seen: string[];
  /** Когда посылка доставлена — глава пройдена. */
  delivered?: number;
  /** Лучшее число звёзд. */
  stars: number;
}

export interface ControlSlot {
  ticket: number;
  passed: boolean;
}

export interface ProgressData {
  xp: number;
  questions: Record<string, QuestionState>;
  chapters: Record<string, ChapterState>;
  finale: { control: ControlSlot[]; seen: string[] };
}

export function emptyProgress(): ProgressData {
  return { xp: 0, questions: {}, chapters: {}, finale: { control: [], seen: [] } };
}

// ─── Проверка сохранённых данных ─────────────────────────────────────────────────

const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Оставляет из сохранённых данных только корректное: хранилище могли испортить. */
export function sanitizeProgress(raw: unknown): ProgressData {
  const data = emptyProgress();
  if (!isObj(raw)) return data;
  if (isInt(raw.xp)) data.xp = raw.xp;
  if (isObj(raw.questions)) {
    for (const [id, s] of Object.entries(raw.questions)) {
      if (!isObj(s) || !isInt(s.n, 1) || typeof s.ok !== 'boolean' || typeof s.ever !== 'boolean' || !isInt(s.at)) continue;
      const state: QuestionState = { n: s.n, ok: s.ok, ever: s.ever || s.ok, at: s.at };
      const r = s.review;
      if (isObj(r) && isInt(r.stage) && r.stage < REVIEW_DAYS.length && isInt(r.due)) state.review = { stage: r.stage, due: r.due };
      data.questions[id] = state;
    }
  }
  if (isObj(raw.chapters)) {
    for (const [id, c] of Object.entries(raw.chapters)) {
      if (!isObj(c)) continue;
      const state: ChapterState = { points: [...new Set(strings(c.points))], seen: [...new Set(strings(c.seen))], stars: isInt(c.stars) ? Math.min(3, c.stars) : 0 };
      if (isInt(c.delivered)) state.delivered = c.delivered;
      data.chapters[id] = state;
    }
  }
  if (isObj(raw.finale)) {
    const f = raw.finale;
    if (Array.isArray(f.control)) {
      data.finale.control = f.control
        .filter((s): s is ControlSlot => isObj(s) && isInt(s.ticket, 1) && typeof s.passed === 'boolean')
        .slice(0, CONTROL_TICKETS)
        .map(({ ticket, passed }) => ({ ticket, passed }));
    }
    data.finale.seen = [...new Set(strings(f.seen))];
  }
  return data;
}

// ─── Уровни ──────────────────────────────────────────────────────────────────────

export interface LevelInfo {
  /** Номер уровня, с 1. */
  number: number;
  title: string;
  /** Опыт, с которого начинается уровень. */
  from: number;
  /** Опыт следующего уровня (нет у последнего). */
  to?: number;
}

export function levelOf(xp: number): LevelInfo {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  return { number: i + 1, title: LEVELS[i].title, from: LEVELS[i].xp, to: LEVELS[i + 1]?.xp };
}

/** Прибавить опыт; вернуть новый уровень, если он сменился. */
function gain(data: ProgressData, xp: number): LevelInfo | undefined {
  const before = levelOf(data.xp).number;
  data.xp += xp;
  const after = levelOf(data.xp);
  return after.number > before ? after : undefined;
}

// ─── Ответы и работа над ошибками ───────────────────────────────────────────────

/** Начало календарного дня через `days` дней после `now` (по местному времени). */
export function dayStart(now: number, days = 0): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

export interface AnswerOutcome {
  xp: number;
  /** Что стало с вопросом в работе над ошибками: попал, повтор засчитан, закреплён, снова ошибка. */
  review?: 'added' | 'advanced' | 'cleared' | 'reset';
  levelUp?: LevelInfo;
}

export function recordAnswer(data: ProgressData, id: string, correct: boolean, now: number): AnswerOutcome {
  const prev = data.questions[id];
  const s: QuestionState = prev ? { ...prev } : { n: 0, ok: false, ever: false, at: now };
  const due = !!s.review && s.review.due <= now;
  let xp = 0;
  let review: AnswerOutcome['review'];
  if (correct) {
    xp = !s.ever ? XP.first : due ? XP.review : XP.repeat;
    if (s.review && due) {
      const stage = s.review.stage + 1;
      if (stage >= REVIEW_DAYS.length) {
        delete s.review;
        review = 'cleared';
      } else {
        s.review = { stage, due: dayStart(now, REVIEW_DAYS[stage]) };
        review = 'advanced';
      }
    }
  } else {
    review = s.review ? 'reset' : 'added';
    s.review = { stage: 0, due: dayStart(now, REVIEW_DAYS[0]) };
  }
  s.n++;
  s.ok = correct;
  s.ever ||= correct;
  s.at = now;
  data.questions[id] = s;
  return { xp, review, levelUp: xp ? gain(data, xp) : undefined };
}

/** Вопросы в работе над ошибками, от ближайшего срока. */
export function reviewQueue(data: ProgressData): string[] {
  return Object.entries(data.questions)
    .filter(([, s]) => s.review)
    .sort(([, a], [, b]) => a.review!.due - b.review!.due || a.at - b.at)
    .map(([id]) => id);
}

/** Вопросы, повтор которых уже пора пройти. */
export function dueReviews(data: ProgressData, now: number): string[] {
  return reviewQueue(data).filter((id) => data.questions[id].review!.due <= now);
}

/** Когда следующий повтор из тех, что ещё не наступили, и сколько вопросов в этот день. */
export function nextReview(data: ProgressData, now: number): { due: number; count: number } | undefined {
  const future = reviewQueue(data)
    .map((id) => data.questions[id].review!.due)
    .filter((due) => due > now);
  if (!future.length) return undefined;
  const due = future[0];
  return { due, count: future.filter((d) => d === due).length };
}

/** Сколько вопросов на каждой ступени повтора. */
export function reviewStages(data: ProgressData): number[] {
  const out = REVIEW_DAYS.map(() => 0);
  for (const s of Object.values(data.questions)) if (s.review) out[s.review.stage]++;
  return out;
}

/** Вопрос освоен: последний ответ верный и он не ждёт повтора. */
export const isMastered = (s: QuestionState | undefined): boolean => !!s && s.ok && !s.review;

// ─── Главы ───────────────────────────────────────────────────────────────────────

/** Что нужно знать о главе: её точки и вопросы каждой точки. */
export interface ChapterInfo {
  id: string;
  points: { id: string; questions: string[] }[];
}

export function chapterState(data: ProgressData, id: string): ChapterState {
  return (data.chapters[id] ??= { points: [], seen: [], stars: 0 });
}

export interface ChapterResult {
  questions: number;
  /** Сколько вопросов отвечено хотя бы раз. */
  answered: number;
  /** Сколько вопросов с верным последним ответом. */
  correct: number;
  /** Доля верных (от всех вопросов главы). */
  share: number;
  points: number;
  pointsDone: number;
  /** Точки с ошибкой в последнем ответе. */
  pointsWithMistakes: string[];
}

export function chapterResult(data: ProgressData, chapter: ChapterInfo): ChapterResult {
  const state = data.chapters[chapter.id];
  const visited = new Set(state?.points ?? []);
  let questions = 0;
  let answered = 0;
  let correct = 0;
  const pointsWithMistakes: string[] = [];
  for (const point of chapter.points) {
    let mistake = false;
    for (const id of point.questions) {
      const s = data.questions[id];
      questions++;
      if (s) answered++;
      if (s?.ok) correct++;
      else if (s) mistake = true;
    }
    if (mistake && visited.has(point.id)) pointsWithMistakes.push(point.id);
  }
  return {
    questions,
    answered,
    correct,
    share: questions ? correct / questions : 0,
    points: chapter.points.length,
    pointsDone: chapter.points.filter((p) => visited.has(p.id)).length,
    pointsWithMistakes,
  };
}

export const starsFor = (share: number): number => (share >= 1 ? 3 : share >= 0.9 ? 2 : share >= PASS_SHARE ? 1 : 0);

/** Посылку можно везти: все точки пройдены и верных ответов от 80%. */
export const canDeliver = (r: ChapterResult): boolean => r.pointsDone === r.points && r.share >= PASS_SHARE;

/** Доля в процентах для показа (вниз, чтобы 79,9% не выглядели как 80%). */
export const percent = (share: number): number => Math.floor(share * 100 + 1e-9);

/** Серия точки пройдена. Возвращает опыт (только за первое прохождение). */
export function markPoint(data: ProgressData, chapterId: string, pointId: string): AnswerOutcome {
  const state = chapterState(data, chapterId);
  if (state.points.includes(pointId)) return { xp: 0 };
  state.points.push(pointId);
  return { xp: XP.point, levelUp: gain(data, XP.point) };
}

export function markSeen(data: ProgressData, chapterId: string, scene: string): void {
  const state = chapterState(data, chapterId);
  if (!state.seen.includes(scene)) state.seen.push(scene);
}

export interface DeliveryOutcome {
  xp: number;
  stars: number;
  newStars: number;
  levelUp?: LevelInfo;
}

/** Посылка доставлена: глава пройдена, звёзды и опыт. */
export function deliver(data: ProgressData, chapter: ChapterInfo, now: number): DeliveryOutcome {
  const state = chapterState(data, chapter.id);
  const first = !state.delivered;
  state.delivered ??= now;
  const stars = Math.max(state.stars, starsFor(chapterResult(data, chapter).share));
  const newStars = stars - state.stars;
  state.stars = stars;
  const xp = (first ? XP.delivery : 0) + newStars * XP.star;
  return { xp, stars, newStars, levelUp: xp ? gain(data, xp) : undefined };
}

/** После доставки звёзды главы растут вместе с результатом (и никогда не убывают). */
export function refreshStars(data: ProgressData, chapter: ChapterInfo): DeliveryOutcome | undefined {
  const state = data.chapters[chapter.id];
  if (!state?.delivered) return undefined;
  const stars = starsFor(chapterResult(data, chapter).share);
  if (stars <= state.stars) return undefined;
  const newStars = stars - state.stars;
  state.stars = stars;
  const xp = newStars * XP.star;
  return { xp, stars, newStars, levelUp: gain(data, xp) };
}

/** Глава открыта: первая всегда, остальные — когда пройдена предыдущая. */
export function isUnlocked(data: ProgressData, order: readonly string[], id: string): boolean {
  const i = order.indexOf(id);
  return i === 0 || (i > 0 && !!data.chapters[order[i - 1]]?.delivered);
}

/** Текущая глава сюжета: первая непройденная (или последняя, если пройдены все). */
export function currentChapter(data: ProgressData, order: readonly string[]): string {
  return order.find((id) => !data.chapters[id]?.delivered) ?? order[order.length - 1];
}

// ─── Финал ───────────────────────────────────────────────────────────────────────

export interface FinaleStatus {
  /** Финал открыт: последняя глава пройдена. */
  open: boolean;
  total: number;
  /** Вопросы с верным последним ответом. */
  correct: number;
  /** Вопросы в работе над ошибками. */
  review: number;
  /** Можно проходить контрольные билеты: все вопросы отвечены верно и ошибки закреплены. */
  controlOpen: boolean;
  control: ControlSlot[];
  /** Всё выполнено — можно к экзамену. */
  ready: boolean;
}

function randomTicket(tickets: number, exclude: number[], rnd: () => number): number {
  const free = Array.from({ length: tickets }, (_, i) => i + 1).filter((t) => !exclude.includes(t));
  const pool = free.length ? free : Array.from({ length: tickets }, (_, i) => i + 1);
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

/** Выбрать контрольные билеты (один раз, когда финал открылся). */
export function ensureControl(data: ProgressData, tickets: number, rnd: () => number = Math.random): ControlSlot[] {
  const slots = data.finale.control;
  while (slots.length < CONTROL_TICKETS) slots.push({ ticket: randomTicket(tickets, slots.map((s) => s.ticket), rnd), passed: false });
  return slots;
}

export interface ControlOutcome {
  passed: boolean;
  /** Билет, который заменил непройденный. */
  replacement?: number;
  xp: number;
  levelUp?: LevelInfo;
}

/**
 * Контрольный билет пройден: без ошибок — отметка, с ошибками — вместо него другой билет
 * (ошибки уже попали в работу над ошибками вместе с ответами).
 */
export function recordControl(data: ProgressData, slot: number, mistakes: number, tickets: number, rnd: () => number = Math.random): ControlOutcome {
  const slots = data.finale.control;
  const s = slots[slot];
  if (!s || s.passed) return { passed: !!s?.passed, xp: 0 };
  if (mistakes === 0) {
    s.passed = true;
    return { passed: true, xp: XP.control, levelUp: gain(data, XP.control) };
  }
  s.ticket = randomTicket(tickets, [...slots.map((x) => x.ticket)], rnd);
  return { passed: false, replacement: s.ticket, xp: 0 };
}

export function finaleStatus(data: ProgressData, order: readonly string[], allIds: readonly string[]): FinaleStatus {
  const open = !!data.chapters[order[order.length - 1]]?.delivered;
  const correct = allIds.filter((id) => data.questions[id]?.ok).length;
  const review = reviewQueue(data).length;
  const controlOpen = open && correct === allIds.length && review === 0;
  const control = data.finale.control;
  return {
    open,
    total: allIds.length,
    correct,
    review,
    controlOpen,
    control,
    ready: controlOpen && control.length === CONTROL_TICKETS && control.every((s) => s.passed),
  };
}

// ─── Статистика по темам ─────────────────────────────────────────────────────────

export interface TopicStat {
  topic: string;
  total: number;
  answered: number;
  correct: number;
  /** Доля верных среди отвеченных. */
  share: number;
}

export function topicStats(data: ProgressData, questions: readonly { id: string; topic: string }[]): TopicStat[] {
  const byTopic = new Map<string, TopicStat>();
  for (const q of questions) {
    const t = byTopic.get(q.topic) ?? { topic: q.topic, total: 0, answered: 0, correct: 0, share: 0 };
    const s = data.questions[q.id];
    t.total++;
    if (s) t.answered++;
    if (s?.ok) t.correct++;
    byTopic.set(q.topic, t);
  }
  const out = [...byTopic.values()];
  for (const t of out) t.share = t.answered ? t.correct / t.answered : 0;
  return out;
}

/** Слабые темы: отвечено хотя бы 5 вопросов, верных меньше 80%; самые слабые первыми. */
export function weakTopics(stats: readonly TopicStat[], limit = 5): TopicStat[] {
  return stats
    .filter((t) => t.answered >= 5 && t.share < PASS_SHARE)
    .sort((a, b) => a.share - b.share || b.answered - a.answered)
    .slice(0, limit);
}

/**
 * Вопросы для тренировки темы: сначала с ошибкой в последнем ответе, потом ещё не отвеченные,
 * потом давно отвеченные.
 */
export function trainingSet(data: ProgressData, ids: readonly string[], count: number): string[] {
  const rank = (id: string) => {
    const s = data.questions[id];
    return !s ? 1 : !s.ok ? 0 : 2;
  };
  return [...ids]
    .sort((a, b) => rank(a) - rank(b) || (data.questions[a]?.at ?? 0) - (data.questions[b]?.at ?? 0))
    .slice(0, count);
}

// ─── Хранилище ───────────────────────────────────────────────────────────────────

const KEY = 'pdd-game:progress';

let current: ProgressData | undefined;
const listeners = new Set<() => void>();

/** Прогресс игрока (одна копия в памяти; если хранилище недоступно — живёт до закрытия игры). */
export function progress(): ProgressData {
  current ??= sanitizeProgress(load<unknown>(KEY, null));
  return current;
}

/** Сохранить прогресс после изменений. */
export function saveProgress(): void {
  save(KEY, progress());
  listeners.forEach((fn) => fn());
}

export function onProgressChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Для тестов: забыть копию в памяти. */
export function resetProgressCache(): void {
  current = undefined;
}
