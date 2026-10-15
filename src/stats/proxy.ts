/**
 * Статистика через посредника (stats-worker/worker.js, Cloudflare Worker): API GoatCounter с ключом,
 * который хранится у посредника, а не в игре. Посредник отвечает только на ключ автора — его игра
 * считает из пароля при входе (src/stats/author.ts). В отличие от открытого счётчика здесь есть
 * откуда пришли, телефоны и страны, а сами числа никто, кроме автора, не увидит.
 *
 * Отчёт берётся одним запросом (`/api/report`): посредник сам спрашивает GoatCounter и отдаёт несколько
 * килобайт чисел. У российских операторов связь с зарубежными сервисами обрывается после первых
 * килобайт, и экран висел на «Загружаю статистику…» (15.10.2026). Каждый запрос ждёт не дольше
 * `PROXY_TIMEOUT_MS` — потом экран говорит, что связь не проходит.
 */
import { CHART_DAYS, FetchTimeout, fetchWithin, isoDay, type DayCount, type Named, type ReadyCounts, type StatsReport } from './goatcounter.ts';

/**
 * `key` — посредник не принял ключ автора, `setup` — у посредника не заданы секреты,
 * `gc-token` — GoatCounter не принял свой ключ, `server` — другая ошибка, `network` — нет связи,
 * `timeout` — посредник не ответил вовремя (связь до него не проходит).
 */
export type ProxyFailure = 'key' | 'setup' | 'gc-token' | 'server' | 'network' | 'timeout';
export class ProxyError extends Error {
  constructor(
    readonly kind: ProxyFailure,
    readonly status = 0,
  ) {
    super(kind);
  }
}

/** Сколько ждать ответа посредника. */
export const PROXY_TIMEOUT_MS = 15_000;

/** Запрос к посреднику, который ждёт не дольше `ms`: не дождался — `ProxyError('timeout')`, не прошёл — `'network'`. */
async function timedFetch(fetcher: typeof fetch, url: string, init: RequestInit, ms: number): Promise<Response> {
  try {
    return await fetchWithin(fetcher, url, init, ms);
  } catch (e) {
    throw new ProxyError(e instanceof FetchTimeout ? 'timeout' : 'network');
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

/** Пары [название, число] из отчёта посредника → строки списка. */
const pairs = (v: unknown): Named[] =>
  list(v)
    .filter((x): x is unknown[] => Array.isArray(x))
    .map((x) => ({ name: str(x[0]), count: num(x[1]) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

/** Готовность игроков из отчёта: по 10 чисел за 7 и 30 дней — или undefined, если игроков у посредника нет. */
export function parseReady(v: unknown): ReadyCounts | undefined {
  const o = obj(v);
  const ten = (x: unknown) => (Array.isArray(x) && x.length === 10 ? x.map((n) => Math.max(0, Math.floor(num(n)))) : undefined);
  const d7 = ten(o.d7);
  const d30 = ten(o.d30);
  return d7 && d30 ? { d7, d30 } : undefined;
}

/** Отчёт посредника (`/api/report`) — те же числа, что дают семь запросов к API GoatCounter, и готовность игроков. */
export function parseReport(json: unknown): { today: number; week: number; month: number; days: DayCount[]; counts: Record<string, number>; refs: Named[]; systems: Named[]; locations: Named[]; ready?: ReadyCounts } {
  const o = obj(json);
  const counts: Record<string, number> = {};
  for (const [path, n] of Object.entries(obj(o.counts))) if (path) counts[path] = num(n);
  const days = list(o.days)
    .filter((x): x is unknown[] => Array.isArray(x))
    .map((x) => ({ day: str(x[0]).slice(0, 10), count: num(x[1]) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));
  const ready = parseReady(o.ready);
  return { today: num(o.today), week: num(o.week), month: num(o.month), days, counts, refs: pairs(o.refs), systems: pairs(o.systems), locations: pairs(o.locations), ...(ready ? { ready } : {}) };
}

/**
 * Загрузить отчёт за 30 дней через посредника. Периоды — от полуночи по часам телефона до сейчас,
 * поэтому «сегодня» совпадает с днём игрока. Сначала — одним запросом; посредник старой версии его
 * не знает (404), тогда — по очереди, как раньше: у API GoatCounter есть ограничение частоты.
 */
export async function loadProxyReport(proxy: string, key: string, now = Date.now(), fetcher: typeof fetch = fetch, timeoutMs = PROXY_TIMEOUT_MS): Promise<StatsReport> {
  const get = async (path: string, params: Record<string, string>): Promise<unknown> => {
    const res = await timedFetch(fetcher, `${proxy}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${key}` }, credentials: 'omit' }, timeoutMs);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    if (res.ok && body !== undefined) return body;
    const code = str(obj(body).error);
    throw new ProxyError(res.status === 401 ? 'key' : code === 'setup' ? 'setup' : code === 'gc-token' ? 'gc-token' : 'server', res.status);
  };
  const end = apiTime(now);
  const since = (shift: number) => ({ start: apiTime(midnight(now, shift)), end });

  let r: ReturnType<typeof parseReport>;
  try {
    r = parseReport(await get('/api/report', { today: since(0).start, week: since(6).start, month: since(29).start, end }));
  } catch (e) {
    if (!(e instanceof ProxyError && e.status === 404)) throw e;
    const stats = (page: string, params: Record<string, string>) => get(`/api/v0/stats/${page}`, params);
    const today = parseTotal(await stats('total', since(0)));
    const week = parseTotal(await stats('total', since(6)));
    const month = parseTotal(await stats('total', since(29)));
    r = {
      today: today.total,
      week: week.total,
      month: month.total,
      days: month.days,
      counts: parseHits(await stats('hits', { ...since(29), limit: '100' })),
      refs: parseNamed(await stats('toprefs', { ...since(29), limit: '10' })),
      systems: parseNamed(await stats('systems', { ...since(29), limit: '10' })),
      locations: parseNamed(await stats('locations', { ...since(29), limit: '10' })),
    };
  }

  // По дням GoatCounter считает по своим суткам; сегодняшний столбик — как плитка «Сегодня».
  const byDay = new Map(r.days.map((d) => [d.day, d.count]));
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = isoDay(midnight(now, CHART_DAYS - 1 - i));
    return { day, count: i === CHART_DAYS - 1 ? r.today : (byDay.get(day) ?? 0) };
  });
  return { days, today: r.today, week: r.week, month: r.month, counts: r.counts, refs: r.refs, systems: r.systems, locations: r.locations, ...(r.ready ? { ready: r.ready } : {}), failed: 0, at: now, source: 'proxy' };
}
