/**
 * Чтение статистики для экрана автора — из открытого счётчика посетителей GoatCounter:
 * `https://<код>.goatcounter.com/counter/<адрес>.json` отвечает `{"count": "1 234"}`.
 *
 * Почему не API с ключом: браузер не пустил его запросы из игры (проверено на телефоне Артёма
 * 07.10.2026). Открытый счётчик для того и сделан, чтобы сайты брали числа прямо в браузере,
 * без ключа. Нужна галочка «Allow adding visitor counts on your website» в настройках счётчика.
 * Числа счётчика открыты всем, кто знает адрес, — это только количество посетителей экранов.
 * Откуда пришли, телефоны и страны так не узнать: они на сайте счётчика.
 */

export interface DayCount {
  /** «2026-10-07». */
  day: string;
  count: number;
}
export interface Named {
  name: string;
  count: number;
}
export interface StatsReport {
  /** Посетители по дням, от старых к новым; последний — сегодня. */
  days: DayCount[];
  /** Посетителей сегодня, за 7 и за 30 дней. */
  today: number;
  week: number;
  month: number;
  /** Посетители за 30 дней по адресам экранов и событий. */
  counts: Record<string, number>;
  /** Сколько чисел не загрузилось (вместо них нули). */
  failed: number;
  /** Когда загружено. */
  at: number;
}

/** `disabled` — счётчик ответил ошибкой (скорее всего, не включена галочка), `network` — запрос не прошёл. */
export type StatsFailure = 'disabled' | 'network';
export class StatsError extends Error {
  constructor(
    readonly kind: StatsFailure,
    readonly status = 0,
  ) {
    super(kind);
  }
}

/** Дней на графике: каждый день — отдельный запрос к счётчику. */
export const CHART_DAYS = 14;
/** Сколько запросов к счётчику идут одновременно. */
const PARALLEL = 4;

/** Ответ счётчика → число. «1,234», «1 234» и 1234 — одно и то же. */
export function parseCount(json: unknown): number {
  const count = json && typeof json === 'object' ? (json as Record<string, unknown>).count : undefined;
  if (typeof count === 'number' && Number.isFinite(count)) return Math.max(0, Math.round(count));
  if (typeof count !== 'string') return 0;
  const digits = count.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** Адрес открытого счётчика: `TOTAL` — весь сайт, иначе адрес экрана («/city/ch1») или событие («exam-pass»). */
export function counterUrl(site: string, path: string, start: string, end: string): string {
  return `https://${site}.goatcounter.com/counter/${encodeURIComponent(path)}.json?${new URLSearchParams({ start, end })}`;
}

/** День `shift` дней назад от `now` (по календарю, без сдвигов на переходе времени). */
const daysAgo = (now: number, shift: number): number => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift).getTime();
};
/** «2026-10-07» по местному времени. */
export const isoDay = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Выполнить задачи не больше `n` одновременно, сохранив порядок результатов. */
async function pool<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return out;
}

/**
 * Загрузить отчёт: посетители сайта сегодня, за 7 и 30 дней, по дням и по `paths` за 30 дней.
 * Первый запрос (сегодня) решает, работает ли счётчик: его ошибка — ошибка всего отчёта.
 * Ошибка отдельного адреса — ноль (у адреса, где ещё никого не было, счётчик может ответить 404).
 *
 * Конец периода `end` счётчик понимает как начало этого дня (полночь по UTC): с `end` = сегодня
 * сегодняшние заходы не попадали, и в игре были нули, а на сайте счётчика — заходы (07.10.2026).
 * Поэтому конец периода — следующий день. Дни счётчик считает по UTC, игра — по часам телефона:
 * на графике по дням возможен сдвиг на несколько часов.
 */
export async function loadReport(site: string, paths: string[], now = Date.now(), fetcher: typeof fetch = fetch): Promise<StatsReport> {
  const today = isoDay(now);
  const tomorrow = isoDay(daysAgo(now, -1));
  const month = isoDay(daysAgo(now, 29));
  const week = isoDay(daysAgo(now, 6));
  /** Следующий день после «2026-10-07». */
  const nextDay = (day: string) => isoDay(new Date(`${day}T12:00:00`).getTime() + 86_400_000);
  let failed = 0;
  const get = async (path: string, start: string, end: string, strict = false): Promise<number> => {
    let res: Response;
    try {
      res = await fetcher(counterUrl(site, path, start, end), { credentials: 'omit' });
    } catch {
      if (strict) throw new StatsError('network');
      failed++;
      return 0;
    }
    if (!res.ok) {
      if (strict) throw new StatsError('disabled', res.status);
      if (res.status !== 404) failed++;
      return 0;
    }
    try {
      return parseCount(await res.json());
    } catch {
      if (strict) throw new StatsError('disabled', res.status);
      failed++;
      return 0;
    }
  };

  const todayCount = await get('TOTAL', today, tomorrow, true);
  const chartDays = Array.from({ length: CHART_DAYS - 1 }, (_, i) => isoDay(daysAgo(now, CHART_DAYS - 1 - i)));
  const tasks: (() => Promise<number>)[] = [
    () => get('TOTAL', week, tomorrow),
    () => get('TOTAL', month, tomorrow),
    ...chartDays.map((day) => () => get('TOTAL', day, nextDay(day))),
    ...paths.map((path) => () => get(path, month, tomorrow)),
  ];
  const [weekCount, monthCount, ...rest] = await pool(tasks, PARALLEL);
  const dayCounts = rest.slice(0, chartDays.length);
  const pathCounts = rest.slice(chartDays.length);
  return {
    days: [...chartDays.map((day, i) => ({ day, count: dayCounts[i] })), { day: today, count: todayCount }],
    today: todayCount,
    week: weekCount,
    month: monthCount,
    counts: Object.fromEntries(paths.map((p, i) => [p, pathCounts[i]])),
    failed,
    at: now,
  };
}
