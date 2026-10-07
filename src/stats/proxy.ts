/**
 * Статистика через посредника (stats-worker/worker.js, Cloudflare Worker): API GoatCounter с ключом,
 * который хранится у посредника, а не в игре. Посредник отвечает только на ключ автора — его игра
 * считает из пароля при входе (src/stats/author.ts). В отличие от открытого счётчика здесь есть
 * откуда пришли, телефоны и страны, а сами числа никто, кроме автора, не увидит.
 */
import { CHART_DAYS, isoDay, type DayCount, type Named, type StatsReport } from './goatcounter.ts';

/**
 * `key` — посредник не принял ключ автора, `setup` — у посредника не заданы секреты,
 * `gc-token` — GoatCounter не принял свой ключ, `server` — другая ошибка, `network` — нет связи.
 */
export type ProxyFailure = 'key' | 'setup' | 'gc-token' | 'server' | 'network';
export class ProxyError extends Error {
  constructor(readonly kind: ProxyFailure) {
    super(kind);
  }
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** «stats/total»: всего за период и по дням. */
export function parseTotal(json: unknown): { total: number; days: DayCount[] } {
  const o = obj(json);
  const days = list(o.stats)
    .map((d) => ({ day: str(obj(d).day).slice(0, 10), count: num(obj(d).daily) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));
  return { total: num(o.total), days };
}

/** «stats/hits»: посетители по адресам экранов и событий. */
export function parseHits(json: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const h of list(obj(json).hits)) {
    const path = str(obj(h).path);
    if (path) counts[path] = (counts[path] ?? 0) + num(obj(h).count);
  }
  return counts;
}

/** «stats/toprefs», «…/systems», «…/locations»: названия и числа. */
export function parseNamed(json: unknown): Named[] {
  return list(obj(json).stats)
    .map((s) => ({ name: str(obj(s).name) || str(obj(s).id), count: num(obj(s).count) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Полночь дня `shift` дней назад по часам телефона. */
const midnight = (now: number, shift: number): number => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift).getTime();
};
/** Время для API GoatCounter: RFC 3339 в UTC, без долей секунды. */
export const apiTime = (ts: number): string => new Date(ts).toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Загрузить отчёт за 30 дней через посредника. Периоды — от полуночи по часам телефона до сейчас,
 * поэтому «сегодня» совпадает с днём игрока. Запросы по очереди: у API GoatCounter есть ограничение частоты.
 */
export async function loadProxyReport(proxy: string, key: string, now = Date.now(), fetcher: typeof fetch = fetch): Promise<StatsReport> {
  const get = async (path: string, params: Record<string, string>): Promise<unknown> => {
    let res: Response;
    try {
      res = await fetcher(`${proxy}/api/v0/stats/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${key}` }, credentials: 'omit' });
    } catch {
      throw new ProxyError('network');
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    if (res.ok && body !== undefined) return body;
    const code = str(obj(body).error);
    throw new ProxyError(res.status === 401 ? 'key' : code === 'setup' ? 'setup' : code === 'gc-token' ? 'gc-token' : 'server');
  };
  const end = apiTime(now);
  const since = (shift: number) => ({ start: apiTime(midnight(now, shift)), end });

  const today = parseTotal(await get('total', since(0)));
  const week = parseTotal(await get('total', since(6)));
  const month = parseTotal(await get('total', since(29)));
  const counts = parseHits(await get('hits', { ...since(29), limit: '100' }));
  const refs = parseNamed(await get('toprefs', { ...since(29), limit: '10' }));
  const systems = parseNamed(await get('systems', { ...since(29), limit: '10' }));
  const locations = parseNamed(await get('locations', { ...since(29), limit: '10' }));

  // По дням GoatCounter считает по своим суткам; сегодняшний столбик — как плитка «Сегодня».
  const byDay = new Map(month.days.map((d) => [d.day, d.count]));
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = isoDay(midnight(now, CHART_DAYS - 1 - i));
    return { day, count: i === CHART_DAYS - 1 ? today.total : (byDay.get(day) ?? 0) };
  });
  return { days, today: today.total, week: week.total, month: month.total, counts, refs, systems, locations, failed: 0, at: now, source: 'proxy' };
}
