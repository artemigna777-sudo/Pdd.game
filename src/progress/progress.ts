/**
 * Прогресс игрока: ответы на каждый вопрос, работа над ошибками, опыт и уровни, главы сюжета
 * и финал. Хранится в localStorage (`pdd-game:progress`), при недоступном хранилище — в памяти
 * до закрытия игры.
 *
 * Работа над ошибками — интервальное повторение: ошибка → повтор через 1 день → через 3 дня →
 * через 7 дней. Повтор засчитывается, только если вопрос отвечен верно в свой день или позже;
 * новая ошибка возвращает вопрос к повтору через 1 день. После трёх верных повторов вопрос
 * уходит из работы над ошибками. Дни календарные: ошибка вечером — повтор завтра с утра.
 *
 * «Мой экзамен» (этап 9): если указана дата экзамена в ГИБДД, промежутки между повторами
 * сжимаются, чтобы все три повтора успели до экзамена, а цель дня становится планом на день:
 * новые вопросы, повторы ошибок и пробные экзамены.
 */
import { load, save } from '../storage.ts';
import { KMH_PER_PX } from '../world/rules.ts';

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
  /** Тренировочный экзамен сдан. */
  exam: 30,
  /** Экзамен-босс в финале сюжета сдан. */
  boss: 500,
} as const;

/**
 * «Чистая езда» (этап 8): бонус при доставке посылки главы. Без нарушений в главе — +1 звезда
 * (но не больше трёх) и +100 опыта; одно нарушение — +50 опыта, два — +25, больше — ничего.
 */
export const CLEAN_XP = [100, 50, 25] as const;
/** Метров в пикселе карты (по спидометру машины игрока). */
export const METERS_PER_PX = KMH_PER_PX / 3.6;

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

/** Сколько монет за что (монеты тратятся только на внешний вид машины). */
export const COINS = {
  /** Верный ответ. */
  answer: 1,
  /** Первый верный ответ на вопрос. */
  first: 2,
  /** Цель дня выполнена. */
  goal: 20,
  /** Посылка главы доставлена (в первый раз). */
  delivery: 50,
  /** Контрольный билет без ошибок. */
  control: 30,
  /** Тренировочный экзамен сдан. */
  exam: 10,
  /** Экзамен-босс сдан. */
  boss: 200,
} as const;

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
  /**
   * Сколько раз отвечен неверно (считается с этапа 9; вопрос, который уже был в работе над
   * ошибками, — хотя бы 1). По нему «Повторение пройденного» начинает с вопросов, где были ошибки.
   */
  miss?: number;
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
  /** Гонка с Артёмом: секунд в районе, ответов в точках главы и верных из них; когда подведён итог. */
  race?: { time: number; answers: number; correct: number; settled?: number; /** Доля точек главы, пройденных до начала гонки. */ from?: number };
  /** Побочное задание: сколько остановок пройдено (0 — задание взято); когда выполнено. */
  side?: { step: number; done?: number };
  /** Езда по правилам в районе главы: нарушений, проехано (px); звезда за чистую езду получена. */
  drive?: { violations: number; distance: number; star?: boolean };
}

/** Езда по правилам за всю игру (px). */
export interface DriveState {
  /** Проехано с последнего нарушения — счётчик «Чистая езда». */
  clean: number;
  /** Лучший результат счётчика. */
  best: number;
  total: number;
  violations: number;
  /** Когда лейтенант Соколов рассказал о правилах за рулём. */
  intro?: number;
}

export interface ControlSlot {
  ticket: number;
  passed: boolean;
}

/** Цель дня: повторить ошибки, пройти точки в городе, ответить верно на вопросы или план к экзамену. */
export type GoalKind = 'review' | 'points' | 'correct' | 'plan';

export interface DailyState {
  /** Начало дня (мс), к которому относится цель. */
  day: number;
  kind: GoalKind;
  target: number;
  count: number;
  done: boolean;
}

/** Задача плана на день: сколько нужно и сколько сделано. */
export interface PlanTask {
  target: number;
  done: number;
}

/** План на день к экзамену: нормы задаются в начале дня, счётчики растут за день. */
export interface PlanDay {
  day: number;
  /** Новые вопросы (ни разу не встречавшиеся). */
  fresh: PlanTask;
  /** Повторы ошибок, срок которых наступил. */
  reviews: PlanTask;
  /** Повторение пройденного: выученные вопросы, которые давно не встречались (на закреплении). */
  refresh: PlanTask;
  /** Пробные экзамены. */
  exams: PlanTask;
}

/** «Мой экзамен» (этап 9): дата экзамена в ГИБДД и план к ней. */
export interface ExamPlan {
  /** Начало дня экзамена (мс, местное время). */
  date: number;
  /** Сколько вопросов в базе: от этого считается норма новых вопросов в день. */
  total: number;
  /** День, когда указана дата: от длины всего срока зависит, сколько дней уйдёт на закрепление. */
  from?: number;
  today?: PlanDay;
  /** Как прошёл настоящий экзамен и какой была готовность в тот день. */
  result?: { passed: boolean; readiness: number; at: number };
}

export interface GarageState {
  paint: string;
  sticker: string;
  /** Купленные покраски и наклейки. */
  owned: string[];
}

export interface ProgressData {
  xp: number;
  coins: number;
  daily?: DailyState;
  /** Серия дней подряд с выполненной целью дня. */
  streak: { count: number; best: number; /** Начало последнего дня, когда цель выполнена. */ last?: number };
  garage: GarageState;
  drive?: DriveState;
  questions: Record<string, QuestionState>;
  chapters: Record<string, ChapterState>;
  plan?: ExamPlan;
  /** Знакодекс (этап 11): группы знаков, за которые награда уже получена. */
  signs?: { claimed: string[] };
  finale: {
    control: ControlSlot[];
    seen: string[];
    /** Когда сдан экзамен-босс — сюжет пройден. */
    exam?: number;
  };
}

export function emptyProgress(): ProgressData {
  return {
    xp: 0,
    coins: 0,
    streak: { count: 0, best: 0 },
    garage: { paint: DEFAULT_PAINT, sticker: DEFAULT_STICKER, owned: [DEFAULT_PAINT, DEFAULT_STICKER] },
    questions: {},
    chapters: {},
    finale: { control: [], seen: [] },
  };
}

export const DEFAULT_PAINT = 'yellow';
export const DEFAULT_STICKER = 'none';
const GOAL_KINDS: GoalKind[] = ['review', 'points', 'correct', 'plan'];

// ─── Проверка сохранённых данных ─────────────────────────────────────────────────

const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Оставляет из сохранённых данных только корректное: хранилище могли испортить. */
export function sanitizeProgress(raw: unknown): ProgressData {
  const data = emptyProgress();
  if (!isObj(raw)) return data;
  if (isInt(raw.xp)) data.xp = raw.xp;
  if (isInt(raw.coins)) data.coins = raw.coins;
  const d = raw.daily;
  if (isObj(d) && isInt(d.day) && GOAL_KINDS.includes(d.kind as GoalKind) && isInt(d.target, 1) && isInt(d.count) && typeof d.done === 'boolean') {
    data.daily = { day: d.day, kind: d.kind as GoalKind, target: d.target, count: d.count, done: d.done };
  }
  if (isObj(raw.streak) && isInt(raw.streak.count) && isInt(raw.streak.best)) {
    data.streak = { count: raw.streak.count, best: Math.max(raw.streak.best, raw.streak.count), ...(isInt(raw.streak.last) ? { last: raw.streak.last } : {}) };
  }
  if (isObj(raw.garage)) {
    const owned = [...new Set([DEFAULT_PAINT, DEFAULT_STICKER, ...strings(raw.garage.owned)])];
    const pick = (v: unknown, fallback: string) => (typeof v === 'string' && owned.includes(v) ? v : fallback);
    data.garage = { paint: pick(raw.garage.paint, DEFAULT_PAINT), sticker: pick(raw.garage.sticker, DEFAULT_STICKER), owned };
  }
  const dr = raw.drive;
  if (isObj(dr) && isNum(dr.clean) && isNum(dr.best) && isNum(dr.total) && isInt(dr.violations)) {
    data.drive = { clean: dr.clean, best: Math.max(dr.best, dr.clean), total: Math.max(dr.total, dr.clean), violations: dr.violations, ...(isInt(dr.intro) ? { intro: dr.intro } : {}) };
  }
  if (isObj(raw.questions)) {
    for (const [id, s] of Object.entries(raw.questions)) {
      if (!isObj(s) || !isInt(s.n, 1) || typeof s.ok !== 'boolean' || typeof s.ever !== 'boolean' || !isInt(s.at)) continue;
      const state: QuestionState = { n: s.n, ok: s.ok, ever: s.ever || s.ok, at: s.at };
      const r = s.review;
      if (isObj(r) && isInt(r.stage) && r.stage < REVIEW_DAYS.length && isInt(r.due)) state.review = { stage: r.stage, due: r.due };
      const miss = isInt(s.miss, 1) ? s.miss : state.review ? 1 : 0;
      if (miss) state.miss = miss;
      data.questions[id] = state;
    }
  }
  if (isObj(raw.chapters)) {
    for (const [id, c] of Object.entries(raw.chapters)) {
      if (!isObj(c)) continue;
      const state: ChapterState = { points: [...new Set(strings(c.points))], seen: [...new Set(strings(c.seen))], stars: isInt(c.stars) ? Math.min(3, c.stars) : 0 };
      if (isInt(c.delivered)) state.delivered = c.delivered;
      const r = c.race;
      if (isObj(r) && isInt(r.time) && isInt(r.answers) && isInt(r.correct) && r.correct <= r.answers) {
        state.race = { time: r.time, answers: r.answers, correct: r.correct, ...(isInt(r.settled) ? { settled: r.settled } : {}) };
        if (typeof r.from === 'number' && r.from > 0 && r.from < 1) state.race.from = r.from;
      }
      const side = c.side;
      if (isObj(side) && isInt(side.step) && side.step <= 2) state.side = { step: side.step, ...(isInt(side.done) ? { done: side.done } : {}) };
      const drive = c.drive;
      if (isObj(drive) && isInt(drive.violations) && isNum(drive.distance)) state.drive = { violations: drive.violations, distance: drive.distance, ...(drive.star === true ? { star: true } : {}) };
      data.chapters[id] = state;
    }
  }
  if (isObj(raw.signs)) data.signs = { claimed: [...new Set(strings(raw.signs.claimed))] };
  const plan = raw.plan;
  if (isObj(plan) && isInt(plan.date) && isInt(plan.total, 1)) {
    data.plan = { date: plan.date, total: plan.total };
    if (isInt(plan.from) && plan.from <= plan.date) data.plan.from = plan.from;
    const task = (v: unknown): PlanTask | undefined => (isObj(v) && isInt(v.target) && isInt(v.done) ? { target: v.target, done: v.done } : undefined);
    const t = plan.today;
    if (isObj(t) && isInt(t.day)) {
      const fresh = task(t.fresh);
      const reviews = task(t.reviews);
      const refresh = task(t.refresh) ?? { target: 0, done: 0 };
      const exams = task(t.exams);
      if (fresh && reviews && exams) data.plan.today = { day: t.day, fresh, reviews, refresh, exams };
    }
    const r = plan.result;
    if (isObj(r) && typeof r.passed === 'boolean' && isInt(r.readiness) && r.readiness <= 100 && isInt(r.at)) data.plan.result = { passed: r.passed, readiness: r.readiness, at: r.at };
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
    if (isInt(f.exam)) data.finale.exam = f.exam;
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
export function gain(data: ProgressData, xp: number): LevelInfo | undefined {
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
  /** Сколько монет получено. */
  coins?: number;
  /** Цель дня только что выполнена. */
  goal?: DailyState;
  /** Что стало с вопросом в работе над ошибками: попал, повтор засчитан, закреплён, снова ошибка. */
  review?: 'added' | 'advanced' | 'cleared' | 'reset';
  levelUp?: LevelInfo;
}

export function recordAnswer(data: ProgressData, id: string, correct: boolean, now: number): AnswerOutcome {
  const prev = data.questions[id];
  const s: QuestionState = prev ? { ...prev } : { n: 0, ok: false, ever: false, at: now };
  const due = !!s.review && s.review.due <= now;
  const daily = ensureDaily(data, now);
  const plan = planDay(data, now);
  if (plan && !prev) plan.fresh.done++;
  if (plan && due) plan.reviews.done++;
  if (plan && prev && isStale(prev, now)) plan.refresh.done++;
  const missed = s.miss ?? (s.review ? 1 : 0);
  if (!correct) s.miss = missed + 1;
  else if (missed) s.miss = missed;
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
        s.review = { stage, due: dayStart(now, reviewInterval(data, stage, now)) };
        review = 'advanced';
      }
    }
  } else {
    review = s.review ? 'reset' : 'added';
    s.review = { stage: 0, due: dayStart(now, reviewInterval(data, 0, now)) };
  }
  s.n++;
  s.ok = correct;
  s.ever ||= correct;
  s.at = now;
  data.questions[id] = s;
  const coins = correct ? (xp === XP.first ? COINS.first : COINS.answer) : 0;
  data.coins += coins;
  if ((daily.kind === 'review' && due) || (daily.kind === 'correct' && correct)) daily.count++;
  if (daily.kind === 'plan') daily.count = planDone(plan);
  const goal = checkGoal(data, now);
  return { xp, coins: coins + (goal ? COINS.goal : 0), goal, review, levelUp: xp ? gain(data, xp) : undefined };
}

// ─── Мой экзамен: дата экзамена и план к ней ────────────────────────────────────

/**
 * Нормы плана к экзамену. План готовит заранее: сначала учёба (все новые вопросы, не меньше
 * minPace в день), потом закрепление — новых вопросов нет, каждый день повторение пройденного,
 * повторы ошибок и пробные экзамены.
 */
export const PLAN = {
  /** Не меньше стольких новых вопросов в день: база проходится заранее, а не к самому экзамену. */
  minPace: 20,
  /** Закрепление — последняя четверть срока до экзамена, но не меньше 3 и не больше 30 дней. */
  buffer: { share: 0.25, min: 3, max: 30 },
  /** Вопрос пора освежить, если последний ответ на него был больше стольких дней назад. */
  stale: 7,
  /** Повторение пройденного в день: не меньше и не больше (если столько есть). */
  refresh: { min: 10, max: 40 },
  /** За сколько дней до экзамена — пробный экзамен каждый день (раньше, на закреплении, — через день). */
  examsFrom: 7,
  /** Последние дни перед экзаменом — по два пробных экзамена в день. */
  last: 3,
  /** Сколько ответов в день (новые вопросы и повторы) ещё «успеваешь»; больше — «плотно». */
  comfortable: 50,
  /** Больше этого в день — «не успеть». */
  max: 100,
} as const;

const DAY_MS = 86_400_000;

/** Сколько дней до экзамена (0 — сегодня, меньше нуля — дата прошла); нет даты — undefined. */
export function planDaysLeft(data: ProgressData, now: number): number | undefined {
  if (!data.plan) return undefined;
  return Math.round((data.plan.date - dayStart(now)) / DAY_MS);
}

/** План действует: дата экзамена указана, ещё не прошла, итога нет. */
export function planActive(data: ProgressData, now: number): boolean {
  const left = planDaysLeft(data, now);
  return left !== undefined && left >= 0 && !data.plan!.result;
}

/**
 * Через сколько дней повтор ступени `stage`. Обычно 1, 3 и 7 дней. С датой экзамена промежутки
 * сжимаются, если иначе оставшиеся повторы не успевают до экзамена: последний — не позже
 * дня перед экзаменом. Повторов всё равно три, просто чаще.
 */
export function reviewInterval(data: ProgressData, stage: number, now: number): number {
  const normal = REVIEW_DAYS[stage];
  if (!planActive(data, now)) return normal;
  const room = planDaysLeft(data, now)! - 1;
  const rest = REVIEW_DAYS.slice(stage).reduce((a, b) => a + b, 0);
  if (rest <= room) return normal;
  return Math.max(1, Math.floor((normal * Math.max(room, 0)) / rest));
}

/** Сколько вопросов ещё ни разу не встречались. */
export function unseenCount(data: ProgressData): number {
  return Math.max(0, (data.plan?.total ?? 0) - Object.keys(data.questions).length);
}

/** Сколько дней перед экзаменом уходит на закрепление: четверть всего срока плана, от 3 до 30. */
export function bufferDays(plan: ExamPlan, now: number): number {
  const span = Math.round((plan.date - (plan.from ?? dayStart(now))) / DAY_MS);
  return Math.min(PLAN.buffer.max, Math.max(PLAN.buffer.min, Math.round(span * PLAN.buffer.share)));
}

/** Первый день закрепления: к нему все новые вопросы должны быть пройдены. */
export const readyBy = (plan: ExamPlan, now: number): number => dayStart(plan.date, -bufferDays(plan, now));

/**
 * Сколько дней осталось на новые вопросы: до начала закрепления. Если срок учёбы уже прошёл,
 * а новые вопросы остались, — на все дни, кроме последних трёх (там только повторение и экзамены).
 */
export function learnDaysLeft(data: ProgressData, now: number): number {
  const toReady = Math.round((readyBy(data.plan!, now) - dayStart(now)) / DAY_MS);
  return toReady > 0 ? toReady : Math.max(1, planDaysLeft(data, now)! - PLAN.last);
}

/** Норма новых вопросов в день: все оставшиеся — до начала закрепления, но не меньше PLAN.minPace. */
export function freshPerDay(unseen: number, learnDays: number): number {
  if (unseen <= 0) return 0;
  return Math.min(unseen, Math.max(PLAN.minPace, Math.ceil(unseen / Math.max(1, learnDays))));
}

/** Выученный вопрос давно не встречался (последний ответ верный и старше PLAN.stale дней): его пора освежить. */
export const isStale = (s: QuestionState, now: number): boolean => !s.review && s.at < dayStart(now, -PLAN.stale);

/** Норма повторения пройденного в день: все давно не встречавшиеся — до экзамена, от 10 до 40 в день. */
export function refreshPerDay(stale: number, daysLeft: number): number {
  if (stale <= 0) return 0;
  return Math.min(stale, Math.min(PLAN.refresh.max, Math.max(PLAN.refresh.min, Math.ceil(stale / Math.max(1, daysLeft)))));
}

/** План на сегодня (нормы задаются при первом действии дня); без действующего плана — undefined. */
export function planDay(data: ProgressData, now: number): PlanDay | undefined {
  if (!planActive(data, now)) return undefined;
  const plan = data.plan!;
  const day = dayStart(now);
  if (plan.today?.day === day) return plan.today;
  const left = planDaysLeft(data, now)!;
  const unseen = unseenCount(data);
  // Закрепление: все вопросы пройдены или срок учёбы вышел.
  const consolidating = unseen === 0 || day >= readyBy(plan, now);
  const stale = unseen === 0 ? Object.values(data.questions).filter((s) => isStale(s, now)).length : 0;
  const exams = left === 0 ? 0 : left <= PLAN.last ? 2 : left <= PLAN.examsFrom ? 1 : consolidating && left % 2 === 0 ? 1 : 0;
  plan.today = {
    day,
    fresh: { target: left > 0 ? freshPerDay(unseen, learnDaysLeft(data, now)) : 0, done: 0 },
    reviews: { target: dueReviews(data, now).length, done: 0 },
    refresh: { target: left > 0 ? refreshPerDay(stale, left) : 0, done: 0 },
    exams: { target: exams, done: 0 },
  };
  return plan.today;
}

/** Задачи плана на день, у которых есть норма. */
export const planTasks = (day: PlanDay): PlanTask[] => [day.fresh, day.reviews, day.refresh, day.exams].filter((t) => t.target > 0);

/** Сколько задач плана на день выполнено. */
function planDone(day: PlanDay | undefined): number {
  return day ? planTasks(day).filter((t) => t.done >= t.target).length : 0;
}

/** Указать дату экзамена (начало дня). План на сегодня и цель дня пересчитываются. */
export function setExamDate(data: ProgressData, date: number, total: number, now: number): void {
  data.plan = { date: dayStart(date), total, from: dayStart(now) };
  if (data.daily?.day === dayStart(now) && !data.daily.done) delete data.daily;
  ensureDaily(data, now);
}

/** Убрать дату экзамена: повторы снова через 1, 3 и 7 дней, цель дня — обычная. */
export function clearExamDate(data: ProgressData, now: number): void {
  delete data.plan;
  if (data.daily?.kind === 'plan' && !data.daily.done) delete data.daily;
  ensureDaily(data, now);
}

/** Как прошёл настоящий экзамен в ГИБДД; `readiness` — готовность в игре в этот день. */
export function recordExamResult(data: ProgressData, passed: boolean, readiness: number, now: number): void {
  if (!data.plan) return;
  data.plan.result = { passed, readiness: Math.max(0, Math.min(100, Math.round(readiness))), at: now };
  if (data.daily?.kind === 'plan' && !data.daily.done) delete data.daily;
}

/** Пробный экзамен сдан или не сдан — он засчитывается в план на день. */
export function recordPlanExam(data: ProgressData, now: number): AnswerOutcome {
  const daily = ensureDaily(data, now);
  const plan = planDay(data, now);
  if (!plan) return { xp: 0 };
  plan.exams.done++;
  if (daily.kind === 'plan') daily.count = planDone(plan);
  const goal = checkGoal(data, now);
  return { xp: 0, coins: goal ? COINS.goal : 0, goal };
}

// ─── Цель дня и серия ────────────────────────────────────────────────────────────

/**
 * Цель на сегодня (выбирается при первом действии дня и дальше не меняется): с датой экзамена —
 * план на день; иначе есть повторы — повторить до 10 ошибок; нет — пройти 3 точки в городе;
 * история пройдена — 20 верных ответов.
 */
export function ensureDaily(data: ProgressData, now: number): DailyState {
  const day = dayStart(now);
  if (data.daily?.day === day) return data.daily;
  // С датой экзамена цель дня — план на день (если на сегодня в нём есть задачи).
  const plan = planDay(data, now);
  if (plan && planTasks(plan).length) {
    data.daily = { day, kind: 'plan', target: planTasks(plan).length, count: planDone(plan), done: false };
    return data.daily;
  }
  const due = dueReviews(data, now).length;
  const goal: Pick<DailyState, 'kind' | 'target'> = due > 0 ? { kind: 'review', target: Math.min(due, 10) } : !data.finale.exam ? { kind: 'points', target: 3 } : { kind: 'correct', target: 20 };
  data.daily = { day, ...goal, count: 0, done: false };
  return data.daily;
}

/** Цель выполнена только что: монеты и серия дней. */
function checkGoal(data: ProgressData, now: number): DailyState | undefined {
  const d = data.daily;
  if (!d || d.done || d.count < d.target) return undefined;
  d.done = true;
  data.coins += COINS.goal;
  const today = dayStart(now);
  const s = data.streak;
  if (s.last !== today) {
    s.count = s.last === dayStart(now, -1) ? s.count + 1 : 1;
    s.last = today;
    s.best = Math.max(s.best, s.count);
  }
  return d;
}

/** Серия дней на сегодня: если вчера цель не выполнена, серия прервалась. */
export function currentStreak(data: ProgressData, now: number): number {
  const last = data.streak.last;
  return last !== undefined && last >= dayStart(now, -1) ? data.streak.count : 0;
}

/** Монеты: потратить, если хватает. */
export function spendCoins(data: ProgressData, price: number): boolean {
  if (data.coins < price) return false;
  data.coins -= price;
  return true;
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
export function markPoint(data: ProgressData, chapterId: string, pointId: string, now = Date.now()): AnswerOutcome {
  const state = chapterState(data, chapterId);
  const daily = ensureDaily(data, now);
  if (daily.kind === 'points') daily.count++;
  const goal = checkGoal(data, now);
  const coins = goal ? COINS.goal : 0;
  if (state.points.includes(pointId)) return { xp: 0, coins, goal };
  state.points.push(pointId);
  return { xp: XP.point, coins, goal, levelUp: gain(data, XP.point) };
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
  /** «Чистая езда» при доставке: нарушений в главе, опыт и звезда за аккуратную езду. */
  clean?: { violations: number; xp: number; star: boolean };
}

/** Звёзды главы: за верные ответы и ещё одна за чистую езду (не больше трёх). */
export function chapterStars(state: ChapterState | undefined, share: number): number {
  const base = starsFor(share);
  return Math.min(3, base + (base && state?.drive?.star ? 1 : 0));
}

/**
 * Посылка доставлена: глава пройдена, звёзды и опыт. При первой доставке — бонус «Чистая езда»,
 * если в районе главы ездили по правилам (город их замечает с этапа 8).
 */
export function deliver(data: ProgressData, chapter: ChapterInfo, now: number): DeliveryOutcome {
  const state = chapterState(data, chapter.id);
  const first = !state.delivered;
  state.delivered ??= now;
  let clean: DeliveryOutcome['clean'];
  if (first && state.drive) {
    const violations = state.drive.violations;
    const star = violations === 0;
    if (star) state.drive.star = true;
    clean = { violations, xp: CLEAN_XP[violations] ?? 0, star };
  }
  const stars = Math.max(state.stars, chapterStars(state, chapterResult(data, chapter).share));
  const newStars = stars - state.stars;
  state.stars = stars;
  const xp = (first ? XP.delivery : 0) + newStars * XP.star + (clean?.xp ?? 0);
  if (first) data.coins += COINS.delivery;
  return { xp, stars, newStars, levelUp: xp ? gain(data, xp) : undefined, ...(clean ? { clean } : {}) };
}

/** После доставки звёзды главы растут вместе с результатом (и никогда не убывают). */
export function refreshStars(data: ProgressData, chapter: ChapterInfo): DeliveryOutcome | undefined {
  const state = data.chapters[chapter.id];
  if (!state?.delivered) return undefined;
  const stars = chapterStars(state, chapterResult(data, chapter).share);
  if (stars <= state.stars) return undefined;
  const newStars = stars - state.stars;
  state.stars = stars;
  const xp = newStars * XP.star;
  return { xp, stars, newStars, levelUp: gain(data, xp) };
}

// ─── Чистая езда ─────────────────────────────────────────────────────────────────

export function driveState(data: ProgressData): DriveState {
  return (data.drive ??= { clean: 0, best: 0, total: 0, violations: 0 });
}

/** Проехано без нарушений (px) в районе главы. */
export function addCleanDistance(data: ProgressData, chapterId: string, px: number): void {
  if (!(px > 0)) return;
  const d = driveState(data);
  d.clean += px;
  d.total += px;
  d.best = Math.max(d.best, d.clean);
  const c = chapterState(data, chapterId);
  c.drive ??= { violations: 0, distance: 0 };
  c.drive.distance += px;
}

/** Нарушение: счётчик «Чистая езда» — с нуля, в главе нарушением больше. */
export function recordViolation(data: ProgressData, chapterId: string): void {
  const d = driveState(data);
  d.clean = 0;
  d.violations++;
  const c = chapterState(data, chapterId);
  c.drive ??= { violations: 0, distance: 0 };
  c.drive.violations++;
}

/** Расстояние для показа: «350 м», «1,2 км». */
export function distanceLabel(px: number): string {
  const m = px * METERS_PER_PX;
  if (m < 1000) return `${Math.floor(m / 10) * 10} м`;
  return `${(Math.floor(m / 100) / 10).toLocaleString('ru-RU')} км`;
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
    data.coins += COINS.control;
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

/** Экзамен сдан: опыт (за босса — один раз, сюжет пройден). */
export function recordExamPass(data: ProgressData, boss: boolean, now: number): AnswerOutcome {
  if (boss) {
    if (data.finale.exam) return { xp: 0 };
    data.finale.exam = now;
    data.coins += COINS.boss;
    return { xp: XP.boss, coins: COINS.boss, levelUp: gain(data, XP.boss) };
  }
  data.coins += COINS.exam;
  return { xp: XP.exam, coins: COINS.exam, levelUp: gain(data, XP.exam) };
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
