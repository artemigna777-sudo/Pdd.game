/**
 * Итог дуэли без ссылки-ответа (этап 14): друг, ответив на вызов, оставляет свой результат у
 * посредника на Cloudflare (stats-worker/worker.js, `PUT /duel/<номер>`), а игра автора вызова забирает
 * его, когда открывают «Режимы» или «Дуэль». Посредник хранит только имя, ответы и время, 30 дней.
 *
 * Без интернета или если посредник недоступен всё работает по-старому — ссылкой-ответом.
 */
import { STATS_PROXY } from '../config.ts';
import { DUEL, cleanName, type DuelSide } from './duel.ts';
import { allDuels, saveAnswerToMine, type DuelRecord } from './duelHistory.ts';

/** Сколько посредник хранит итог: старше — не спрашивать. */
export const DUEL_SYNC_DAYS = 30;
/** Сколько своих вызовов без ответа проверять за раз. */
const CHECK_LIMIT = 10;
const TIMEOUT_MS = 8000;

/**
 * Адрес посредника. В разработке и автотестах — нет (ничего не отправляется), если тест не задал
 * свой адрес через `window.__duelSync`.
 */
export function duelSyncBase(): string | undefined {
  const own = (globalThis as { __duelSync?: unknown }).__duelSync;
  if (typeof own === 'string') return own;
  // В автотестах на Node `import.meta.env` нет.
  return (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD ? STATS_PROXY : undefined;
}

async function call(url: string, init: RequestInit = {}): Promise<Response | undefined> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: abort.signal, cache: 'no-store' });
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Отправить свой ответ на чужой вызов; true — посредник его сохранил (или он уже был там). */
export async function sendDuelReply(id: string, side: DuelSide, base = duelSyncBase()): Promise<boolean> {
  if (!base) return false;
  const body = JSON.stringify({ name: cleanName(side.name) || 'Игрок', answers: side.answers.join(''), ms: Math.round(side.ms) });
  const res = await call(`${base}/duel/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  return !!res && (res.status === 201 || res.status === 409);
}

/** Ответ посредника → результат соперника, или undefined, если что-то не так. */
export function parseDuelReply(raw: unknown, count: number): DuelSide | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { name?: unknown; answers?: unknown; ms?: unknown };
  const name = typeof r.name === 'string' ? cleanName(r.name) : '';
  if (!name || typeof r.answers !== 'string' || !new RegExp(`^\\d{${count}}$`).test(r.answers)) return undefined;
  if (!Number.isInteger(r.ms) || (r.ms as number) < 0 || (r.ms as number) > DUEL.maxMs) return undefined;
  return { name, answers: [...r.answers].map(Number), ms: r.ms as number };
}

/** Свои вызовы, ответ на которые ещё может лежать у посредника: без ответа и не старше 30 дней. */
export function waitingDuels(records: readonly DuelRecord[], now: number): DuelRecord[] {
  return records
    .filter((r) => r.role === 'from' && !r.them && now - r.at < DUEL_SYNC_DAYS * 86_400_000)
    .sort((a, b) => b.at - a.at)
    .slice(0, CHECK_LIMIT);
}

/** Забрать пришедшие ответы на свои вызовы и записать их в историю; вернуть обновлённые дуэли. */
export async function syncDuels(now = Date.now(), base = duelSyncBase()): Promise<DuelRecord[]> {
  if (!base) return [];
  const updated: DuelRecord[] = [];
  for (const r of waitingDuels(allDuels(), now)) {
    const res = await call(`${base}/duel/${r.id}`);
    // Посредник недоступен или без хранилища — дальше не спрашивать.
    if (!res || res.status >= 500) break;
    if (res.status !== 200) continue;
    let to: DuelSide | undefined;
    try {
      to = parseDuelReply(await res.json(), r.q.length);
    } catch {
      to = undefined;
    }
    if (to) updated.push(saveAnswerToMine({ id: r.id, at: r.at, q: r.q, from: r.me, to }, Date.now()));
  }
  return updated;
}
