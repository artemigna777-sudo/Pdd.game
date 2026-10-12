/**
 * Заезд режима «Ситуации на дороге» (этап 15): 10 ситуаций с таймером и три ступени сложности.
 *
 *   «Спокойно» — простые ситуации, 10 секунд на ответ;
 *   «Микс»     — все ситуации: новые на 10 секунд, уже решённые верно — на 3 секунды;
 *   «Хардкор»  — только уже решённые ситуации, 3 секунды на каждую.
 *
 * Ступени открываются по очереди: «Микс» — после «Спокойно» с 7 верными из 10, «Хардкор» — после
 * «Микса» с 8 верными и когда верно решено хотя бы 10 разных ситуаций. Время на ответ идёт, когда
 * вопрос прочитан (см. readMs) и показаны варианты; не успел — считается ошибкой.
 *
 * Ситуации не из билетов, поэтому в прогресс вопросов, готовность и работу над ошибками билетов
 * не попадают. Их итоги хранятся отдельно — `progress.modes.situations`.
 */
import { PENALTY_FAIL, SKILLS, type Situation, type Skill } from './types.ts';

/**
 * Ступени сложности, «Провокации инспектора» и «Повторить слабое» из «Дневника водителя» — два
 * последних заезда отдельные: ступени не открывают.
 */
export type StageId = 'calm' | 'mix' | 'hard' | 'provoke' | 'diary' | ThemeId | 'life';

/** Ступени, которые открываются по очереди. */
export type ProgressStage = 'calm' | 'mix' | 'hard';

/** Подрежимы по темам: заезд только из подходящих ситуаций, 10 секунд на ответ. */
export type ThemeId = 'night' | 'rain' | 'highway' | 'yard';

export const THEMES: readonly { id: ThemeId; title: string; icon: string; match: (x: Situation) => boolean }[] = [
  { id: 'night', title: 'Ночная езда', icon: '🌙', match: (x) => x.scene.time === 'night' },
  { id: 'rain', title: 'Дождь и снег', icon: '🌧', match: (x) => x.scene.weather !== undefined },
  { id: 'highway', title: 'Трасса', icon: '🛣', match: (x) => x.scene.place === 'highway' || x.scene.place === 'country' },
  {
    id: 'yard',
    title: 'Дворы и парковки',
    icon: '🏘',
    match: (x) => x.scene.place === 'yard' || ['yard-exit', 'yard-left', 'yard-exit-right-car', 'gas-station-exit', 'reverse-parking', 'sign:5.21'].some((i) => x.scene.items.includes(i)),
  },
];

export const isTheme = (stage: StageId): stage is ThemeId => THEMES.some((t) => t.id === stage);

/**
 * «Реальная жизнь»: бесконечный заезд по городским ситуациям без инспектора. Новая ситуация —
 * 10 секунд, уже решённая — 5. Три ошибки — заезд окончен; счёт — верные ответы.
 */
export const LIFE = { lives: 3, fast: 5, recent: 8 } as const;

export const lifeMatch = (x: Situation) => x.scene.place === 'city' && x.skill !== 'inspector' && !x.scene.items.includes('inspector-in-car');

/** Следующая ситуация «Реальной жизни»: случайная, но не из последних показанных. */
export function pickLife(pool: readonly Situation[], recent: readonly string[], rnd: () => number = Math.random): Situation {
  const city = pool.filter(lifeMatch);
  const fresh = city.filter((x) => !recent.slice(-LIFE.recent).includes(x.id));
  const from = fresh.length ? fresh : city;
  return from[Math.floor(rnd() * from.length)];
}

export interface StageInfo {
  id: StageId;
  title: string;
  /** Подпись на кнопке ступени. */
  note: string;
}

export const STAGES: readonly StageInfo[] = [
  { id: 'calm', title: 'Спокойно', note: 'простые ситуации, 10 секунд на ответ' },
  { id: 'mix', title: 'Микс', note: 'все ситуации; уже решённые — на 3 секунды' },
  { id: 'hard', title: 'Хардкор', note: 'только решённые ситуации, 3 секунды' },
];

export const SITUATIONS = {
  /** Ситуаций в заезде. */
  perRun: 10,
  /** Секунд на ответ: новая ситуация и уже решённая. */
  slow: 10,
  fast: 3,
  /** Открыть «Микс»: столько верных в «Спокойно». */
  mixUnlock: 7,
  /** Открыть «Хардкор»: столько верных в «Миксе» и столько разных решённых ситуаций. */
  hardUnlock: 8,
  hardKnown: 10,
  /** Монет за верный ответ. */
  coin: 1,
  /** Сколько последних заездов хранить. */
  keepRuns: 30,
} as const;

/** Что игрок знает о ситуации. */
export interface SituationSeen {
  /** Сколько раз отвечал. */
  n: number;
  /** Сколько раз верно и неверно (не успел — тоже неверно). */
  right: number;
  wrong: number;
  /** Последний ответ верный. */
  ok: boolean;
  at: number;
}

export interface SituationAnswer {
  id: string;
  /** Выбранный вариант (индекс в исходном порядке) или null — время вышло. */
  choice: number | null;
  correct: boolean;
  /** Сколько думал, мс (с момента, когда показаны варианты). */
  ms: number;
  /** Сколько было секунд на ответ. */
  limit: number;
  /** Штрафные баллы за ответ (0 — верно). */
  penalty: number;
}

export interface SituationRun {
  at: number;
  stage: StageId;
  answers: SituationAnswer[];
}

export interface SituationsState {
  seen: Record<string, SituationSeen>;
  /** Открытые ступени. */
  open: ProgressStage[];
  /** Последние заезды, новые в конце. */
  runs: SituationRun[];
  /** «Реальная жизнь»: лучший счёт и число заездов. */
  life?: { best: number; runs: number };
}

export function emptySituations(): SituationsState {
  return { seen: {}, open: ['calm'], runs: [] };
}

/** Решена ли ситуация верно хотя бы раз. */
export const isKnown = (s: SituationsState, id: string) => (s.seen[id]?.right ?? 0) > 0;

/** Сколько разных ситуаций (без провокаций) решено верно. */
export const solvedCount = (s: SituationsState) => Object.keys(s.seen).filter((id) => id.startsWith('S') && isKnown(s, id)).length;

/** Провокации инспектора: последний заезд и лучший результат (верных из заезда). */
export function provokeStats(s: SituationsState): { runs: number; best?: number; last?: { right: number; total: number } } {
  const runs = s.runs.filter((r) => r.stage === 'provoke');
  const right = (r: SituationRun) => r.answers.filter((a) => a.correct).length;
  const last = runs.at(-1);
  return { runs: runs.length, best: runs.length ? Math.max(...runs.map(right)) : undefined, last: last && { right: right(last), total: last.answers.length } };
}

/** Секунд на ответ в этой ступени. */
export function limitFor(s: SituationsState, stage: StageId, id: string): number {
  if (stage === 'hard') return SITUATIONS.fast;
  if (stage === 'life') return isKnown(s, id) ? LIFE.fast : SITUATIONS.slow;
  if (stage === 'mix' && isKnown(s, id)) return SITUATIONS.fast;
  return SITUATIONS.slow;
}

/**
 * Сколько времени дать прочитать вопрос до вариантов: по длине текста, от 1,5 до 5 секунд;
 * уже знакомую ситуацию узнают быстрее — 1 секунда.
 */
export function readMs(situation: Situation, known: boolean): number {
  if (known) return 1000;
  return Math.round(Math.min(5000, Math.max(1500, situation.text.length * 40)));
}

const shuffle = <T>(list: T[], rnd: () => number): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Ситуации для заезда. `pool` — из каких выбирать (все или подрежим). Сначала ещё не встречавшиеся
 * и те, где последний ответ неверный, потом давно не встречавшиеся.
 */
export function pickRun(s: SituationsState, pool: readonly Situation[], stage: StageId, rnd: () => number = Math.random): Situation[] {
  const n = SITUATIONS.perRun;
  const fresh = (list: readonly Situation[]) => shuffle(list.filter((x) => !s.seen[x.id] || !s.seen[x.id].ok), rnd);
  const stale = (list: readonly Situation[]) => [...list].filter((x) => s.seen[x.id]?.ok).sort((a, b) => s.seen[a.id].at - s.seen[b.id].at);
  const take = (first: Situation[], ...rest: Situation[][]) => {
    const out: Situation[] = [];
    for (const x of [first, ...rest].flat()) if (out.length < n && !out.includes(x)) out.push(x);
    return out;
  };
  if (stage === 'provoke') return take(fresh(pool), stale(pool));
  const theme = THEMES.find((t) => t.id === stage);
  if (theme) {
    const own = pool.filter(theme.match);
    return shuffle(take(fresh(own), stale(own)), rnd);
  }
  if (stage === 'diary') return shuffle(diaryPool(s, pool).slice(0, n), rnd);
  if (stage === 'calm') {
    const easy = pool.filter((x) => x.level === 1);
    return take(fresh(easy), stale(easy), fresh(pool), stale(pool));
  }
  if (stage === 'hard') {
    const known = pool.filter((x) => isKnown(s, x.id));
    // Дольше всех не встречавшиеся и те, где ошибался, — первыми.
    const order = [...known].sort((a, b) => Number(s.seen[a.id].ok) - Number(s.seen[b.id].ok) || s.seen[a.id].at - s.seen[b.id].at);
    return shuffle(take(order, stale(pool)), rnd);
  }
  // «Микс»: половина — новые и с ошибками (на 10 секунд), половина — решённые (на 3), вперемешку.
  const half = Math.ceil(n / 2);
  const slow = fresh(pool).slice(0, half);
  const fast = stale(pool).slice(0, n - slow.length);
  const mixed = shuffle(take(slow, fast, fresh(pool), stale(pool)), rnd);
  return mixed;
}

// ─── Статистика и «Дневник водителя» ─────────────────────────────────────────────

/**
 * Что повторить: ситуации, где последний ответ неверный, потом — где ошибок больше, чем верных
 * ответов; среди них — с большим числом ошибок первыми.
 */
export function diaryPool(s: SituationsState, pool: readonly Situation[]): Situation[] {
  const weak = (x: Situation) => {
    const v = s.seen[x.id];
    return !!v && (!v.ok || v.wrong > v.right);
  };
  return pool.filter(weak).sort((a, b) => Number(s.seen[a.id].ok) - Number(s.seen[b.id].ok) || s.seen[b.id].wrong - s.seen[a.id].wrong || s.seen[a.id].at - s.seen[b.id].at);
}

export interface SkillStat {
  skill: Skill;
  right: number;
  total: number;
  /** Среднее время ответа, мс (только для заезда). */
  ms?: number;
}

/** Навыки заезда: сколько верных из скольких и среднее время ответа. */
export function runSkills(run: SituationRun, byId: ReadonlyMap<string, Situation>): SkillStat[] {
  const map = new Map<Skill, { right: number; total: number; ms: number }>();
  for (const a of run.answers) {
    const skill = byId.get(a.id)?.skill;
    if (!skill) continue;
    const v = map.get(skill) ?? { right: 0, total: 0, ms: 0 };
    v.total++;
    if (a.correct) v.right++;
    v.ms += a.ms;
    map.set(skill, v);
  }
  return [...map].map(([skill, v]) => ({ skill, right: v.right, total: v.total, ms: Math.round(v.ms / v.total) })).sort(bySkillOrder);
}

/** Навыки за всё время (все ответы на ситуации, без провокаций — у них свой счёт). */
export function diarySkills(s: SituationsState, pool: readonly Situation[]): SkillStat[] {
  const map = new Map<Skill, { right: number; total: number }>();
  for (const x of pool) {
    const v = s.seen[x.id];
    if (!v) continue;
    const m = map.get(x.skill) ?? { right: 0, total: 0 };
    m.right += v.right;
    m.total += v.n;
    map.set(x.skill, m);
  }
  return [...map].map(([skill, v]) => ({ skill, ...v })).sort(bySkillOrder);
}

const ORDER = Object.keys(SKILLS) as Skill[];
const bySkillOrder = (a: SkillStat, b: SkillStat) => ORDER.indexOf(a.skill) - ORDER.indexOf(b.skill);

/** Самый слабый навык: меньшая доля верных (не меньше двух ответов, хотя бы одна ошибка). */
export function weakestSkill(stats: readonly SkillStat[]): SkillStat | undefined {
  return [...stats].filter((x) => x.total >= 2 && x.right < x.total).sort((a, b) => a.right / a.total - b.right / b.total || b.total - a.total)[0];
}

/** Варианты в случайном порядке: индексы исходного массива options. */
export function optionOrder(situation: Situation, rnd: () => number = Math.random): number[] {
  return shuffle(
    situation.options.map((_, i) => i),
    rnd,
  );
}

/** Записать ответ на ситуацию. */
export function recordSituation(s: SituationsState, id: string, correct: boolean, now: number): void {
  const prev = s.seen[id] ?? { n: 0, right: 0, wrong: 0, ok: false, at: now };
  s.seen[id] = { n: prev.n + 1, right: prev.right + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1), ok: correct, at: now };
}

export interface RunOutcome {
  correct: number;
  total: number;
  /** Штрафные баллы заезда и «сдал бы» ли практический экзамен (меньше 7 баллов). */
  points: number;
  passed: boolean;
  /** Ступень, открытая этим заездом. */
  unlocked?: ProgressStage;
  /** «Реальная жизнь»: новый рекорд. */
  record?: boolean;
  coins: number;
}

/** Записать заезд целиком: ответы уже записаны по ходу (recordSituation), здесь — итог и ступени. */
export function finishRun(s: SituationsState, run: SituationRun): RunOutcome {
  s.runs = [...s.runs, run].slice(-SITUATIONS.keepRuns);
  const correct = run.answers.filter((a) => a.correct).length;
  const known = solvedCount(s);
  let unlocked: ProgressStage | undefined;
  if (run.stage === 'calm' && correct >= SITUATIONS.mixUnlock && !s.open.includes('mix')) unlocked = 'mix';
  if (run.stage === 'mix' && correct >= SITUATIONS.hardUnlock && known >= SITUATIONS.hardKnown && !s.open.includes('hard')) unlocked = 'hard';
  if (unlocked) s.open = [...s.open, unlocked];
  let record: boolean | undefined;
  if (run.stage === 'life') {
    const prev = s.life ?? { best: 0, runs: 0 };
    record = correct > prev.best;
    s.life = { best: Math.max(prev.best, correct), runs: prev.runs + 1 };
  }
  const points = runPoints(run);
  return { correct, total: run.answers.length, points, passed: points < PENALTY_FAIL, unlocked, record, coins: correct * SITUATIONS.coin };
}

/** Штрафные баллы заезда. */
export function runPoints(run: SituationRun): number {
  return run.answers.reduce((sum, a) => sum + a.penalty, 0);
}

/** Почему ступень закрыта — подсказка на кнопке. */
export function lockReason(s: SituationsState, stage: StageId): string | undefined {
  if (stage !== 'mix' && stage !== 'hard') return undefined;
  if (s.open.includes(stage)) return undefined;
  if (stage === 'mix') return `Откроется после «Спокойно» с ${SITUATIONS.mixUnlock} верными из ${SITUATIONS.perRun}`;
  const known = solvedCount(s);
  return `Откроется после «Микса» с ${SITUATIONS.hardUnlock} верными из ${SITUATIONS.perRun}` + (known < SITUATIONS.hardKnown ? ` и когда решено ${SITUATIONS.hardKnown} ситуаций (сейчас ${known})` : '');
}

// ─── Проверка сохранённых данных ─────────────────────────────────────────────────

const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const STAGE_IDS: StageId[] = ['calm', 'mix', 'hard', 'provoke', 'diary', 'night', 'rain', 'highway', 'yard', 'life'];
const PROGRESS: ProgressStage[] = ['calm', 'mix', 'hard'];

export function sanitizeSituations(raw: unknown): SituationsState | undefined {
  if (!isObj(raw)) return undefined;
  const s = emptySituations();
  if (isObj(raw.seen)) {
    for (const [id, v] of Object.entries(raw.seen)) {
      if (!/^(S\d{2}-\d{2}|P-\d{2})$/.test(id) || !isObj(v) || !isInt(v.n, 1) || !isInt(v.right) || !isInt(v.wrong) || v.right + v.wrong !== v.n || typeof v.ok !== 'boolean' || !isInt(v.at)) continue;
      s.seen[id] = { n: v.n, right: v.right, wrong: v.wrong, ok: v.ok, at: v.at };
    }
  }
  if (Array.isArray(raw.open)) s.open = PROGRESS.filter((id) => id === 'calm' || (raw.open as unknown[]).includes(id));
  if (isObj(raw.life) && isInt(raw.life.best) && isInt(raw.life.runs)) s.life = { best: raw.life.best, runs: raw.life.runs };
  if (Array.isArray(raw.runs)) {
    s.runs = raw.runs
      .filter((r): r is SituationRun => isObj(r) && isInt(r.at) && STAGE_IDS.includes(r.stage as StageId) && Array.isArray(r.answers))
      .map((r) => ({
        at: r.at,
        stage: r.stage,
        answers: (r.answers as unknown[])
          .filter((a): a is SituationAnswer => isObj(a) && typeof a.id === 'string' && (a.choice === null || isInt(a.choice)) && typeof a.correct === 'boolean' && isInt(a.ms) && isInt(a.limit, 1))
          .map((a) => ({ id: a.id, choice: a.choice, correct: a.correct, ms: a.ms, limit: a.limit, penalty: a.correct ? 0 : isInt(a.penalty) ? Math.min(a.penalty, PENALTY_FAIL) : 0 })),
      }))
      .slice(-SITUATIONS.keepRuns);
  }
  return s;
}
