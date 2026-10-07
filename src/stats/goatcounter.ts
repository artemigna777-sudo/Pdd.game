/**
 * Чтение статистики из GoatCounter для экрана автора (API v0, ключ с правом «Read statistics»).
 * Разбор ответов — отдельными функциями: их проверяют автотесты.
 */

export interface DayCount {
  /** «2026-10-07». */
  day: string;
  count: number;
}
export interface PageCount {
  path: string;
  title: string;
  event: boolean;
  count: number;
}
export interface Named {
  name: string;
  count: number;
}
export interface StatsReport {
  /** Посетители по дням за 30 дней, от старых к новым. */
  days: DayCount[];
  /** Посетителей сегодня, за 7 и 30 дней. */
  today: number;
  week: number;
  month: number;
  /** Экраны и события за 30 дней. */
  pages: PageCount[];
  /** Откуда пришли, телефоны, страны — за 30 дней. */
  refs: Named[];
  systems: Named[];
  locations: Named[];
  /** Когда загружено. */
  at: number;
}

export type StatsFailure = 'token' | 'network' | 'server';
export class StatsError extends Error {
  constructor(
    readonly kind: StatsFailure,
    readonly status = 0,
  ) {
    super(kind);
  }
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** «/api/v0/stats/total»: всего за период и по дням. */
export function parseTotal(json: unknown): { total: number; days: DayCount[] } {
  const o = obj(json);
  const days = list(o.stats)
    .map((d) => ({ day: str(obj(d).day).slice(0, 10), count: num(obj(d).daily) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));
  return { total: num(o.total), days };
}

/** «/api/v0/stats/hits»: экраны и события. */
export function parseHits(json: unknown): PageCount[] {
  return list(obj(json).hits)
    .map((h) => ({ path: str(obj(h).path), title: str(obj(h).title), event: obj(h).event === true, count: num(obj(h).count) }))
    .filter((h) => h.path)
    .sort((a, b) => b.count - a.count);
}

/** «/api/v0/stats/toprefs», «…/systems», «…/locations»: названия и числа. */
export function parseNamed(json: unknown): Named[] {
  return list(obj(json).stats)
    .map((s) => ({ name: str(obj(s).name) || str(obj(s).id), count: num(obj(s).count) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
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

/** Загрузить отчёт за 30 дней. Запросы по очереди: у API есть ограничение частоты. */
export async function loadReport(site: string, token: string, now = Date.now(), fetcher: typeof fetch = fetch): Promise<StatsReport> {
  // Ключи GoatCounter — латиница и цифры; другой символ браузер в заголовок не пропустит.
  if (!/^[\x21-\x7e]+$/.test(token)) throw new StatsError('token');
  const end = isoDay(now);
  const month = isoDay(daysAgo(now, 29));
  const week = isoDay(daysAgo(now, 6));
  const get = async (path: string, params: Record<string, string>) => {
    let res: Response;
    try {
      res = await fetcher(`https://${site}.goatcounter.com/api/v0/${path}?${new URLSearchParams(params)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        credentials: 'omit',
      });
    } catch {
      throw new StatsError('network');
    }
    if (res.status === 401 || res.status === 403) throw new StatsError('token', res.status);
    if (!res.ok) throw new StatsError('server', res.status);
    try {
      return (await res.json()) as unknown;
    } catch {
      throw new StatsError('server', res.status);
    }
  };
  const range = { start: month, end };
  const total = parseTotal(await get('stats/total', range));
  const last7 = parseTotal(await get('stats/total', { start: week, end }));
  const pages = parseHits(await get('stats/hits', { ...range, limit: '100' }));
  const refs = parseNamed(await get('stats/toprefs', { ...range, limit: '10' }));
  const systems = parseNamed(await get('stats/systems', { ...range, limit: '10' }));
  const locations = parseNamed(await get('stats/locations', { ...range, limit: '10' }));
  // Дни без посетителей в ответе могут отсутствовать — заполняем нулями.
  const byDay = new Map(total.days.map((d) => [d.day, d.count]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = isoDay(daysAgo(now, 29 - i));
    return { day, count: byDay.get(day) ?? 0 };
  });
  return { days, today: days[days.length - 1].count, week: last7.total, month: total.total, pages, refs, systems, locations, at: now };
}
