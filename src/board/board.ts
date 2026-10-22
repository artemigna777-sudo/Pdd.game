/**
 * Таблица лидеров (общая — её видят все игроки) и готовность к экзамену для статистики автора.
 *
 * В таблице все игроки сразу: игра отправляет посреднику на Cloudflare (stats-worker/worker.js,
 * `PUT /player`) случайный номер этой игры, опыт, заработанные монеты и своё имя, если игрок его ввёл.
 * Без своего имени в таблице ник вроде «user_4821»: его выдаёт посредник при первом заходе — случайный
 * и ни у кого не повторяется. Если анонимная статистика
 * включена — ещё готовность к экзамену в процентах: её видит только автор на секретном экране
 * статистики, и то лишь как число игроков в каждом десятке процентов. Больше ничего. Таблицу игра берёт там же (`GET /board`). Без интернета или если посредник
 * недоступен — таблица не открывается, остальная игра работает как раньше.
 *
 * На чужое имя можно пожаловаться (`POST /report`): после нескольких жалоб посредник скрывает его, и игра
 * этого игрока узнаёт об этом при следующей отправке (`reset`). Игрок может убрать себя из таблицы
 * (`DELETE /player`): запись удаляется у посредника, и игра больше ничего не отправляет, пока он не вернётся.
 */
import { STATS_PROXY } from '../config.ts';
import { getSettings, updateSettings } from '../settings.ts';
import { load, save } from '../storage.ts';

export const BOARD = {
  /** Самое длинное имя в таблице (как у посредника). */
  nameMax: 16,
  /** Как часто сообщать посреднику опыт, монеты и готовность, часов. */
  syncHours: 6,
  /** Сколько ждать посредника: дольше — «нет связи». */
  timeoutMs: 12_000,
} as const;

export type BoardBy = 'xp' | 'coins';

export interface BoardRow {
  name: string;
  value: number;
  /** Это сам игрок. */
  me?: boolean;
}

export interface BoardResult {
  by: BoardBy;
  /** Первые 20. */
  top: BoardRow[];
  /** Сколько всего игроков в таблице. */
  total: number;
  /** Своё место и имя в таблице (своё или ник) — если игрок в таблице. */
  me?: { place: number; value: number; name?: string };
}

/** Что игра присылает о себе. */
export interface PlayerUpdate {
  id: string;
  board: boolean;
  name?: string;
  xp?: number;
  coins?: number;
  ready?: number;
}

/** Ответ посредника на отправку: принято, имя не подходит, имя скрыто по жалобам, нет связи, другая ошибка. */
export type SendResult = 'ok' | 'name' | 'reset' | 'offline' | 'error';

/**
 * Адрес посредника. В разработке и автотестах — нет (ничего не отправляется), если тест не задал
 * свой адрес через `window.__boardBase`.
 */
export function boardBase(): string | undefined {
  const own = (globalThis as { __boardBase?: unknown }).__boardBase;
  if (typeof own === 'string') return own;
  // В автотестах на Node `import.meta.env` нет.
  return (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD ? STATS_PROXY : undefined;
}

/** Имя для таблицы: без управляющих знаков и лишних пробелов, не длиннее 16 знаков (как у посредника). */
export function cleanBoardName(raw: string): string {
  return [...raw.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, ' ').replace(/\s+/g, ' ').trim()]
    .slice(0, BOARD.nameMax)
    .join('')
    .trim();
}

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Новый случайный номер игры: 22 знака, ни с чем не связан. */
export function newPlayerId(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(22))): string {
  return [...bytes].map((b) => ID_CHARS[b % 64]).join('');
}

/** Номер этой игры (создаётся один раз и хранится в настройках, переезжает с резервной копией). */
export function playerId(): string {
  const saved = getSettings().playerId;
  if (/^[A-Za-z0-9_-]{16,40}$/.test(saved)) return saved;
  const id = newPlayerId();
  updateSettings({ playerId: id });
  return id;
}

/** Имя игрока в таблице: своё, если введено, иначе ник от посредника; пусто — посредник ещё не ответил. */
export function boardName(): string {
  const s = getSettings();
  return cleanBoardName(s.boardName) || cleanBoardName(s.boardNick);
}

/** Что отправить: опыт, монеты и своё имя (если есть); готовность — только если статистика включена. */
export function playerUpdate(o: { id: string; name: string; xp: number; coins: number; ready?: number }): PlayerUpdate {
  const name = cleanBoardName(o.name);
  const upd: PlayerUpdate = { id: o.id, board: true, ...(name ? { name } : {}), xp: Math.max(0, Math.floor(o.xp)), coins: Math.max(0, Math.floor(o.coins)) };
  if (o.ready !== undefined && Number.isFinite(o.ready)) upd.ready = Math.min(100, Math.max(0, Math.floor(o.ready)));
  return upd;
}

/** Ответ посредника → таблица, или undefined, если что-то не так. */
export function parseBoard(raw: unknown): BoardResult | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { by?: unknown; top?: unknown; total?: unknown; me?: unknown };
  if ((r.by !== 'xp' && r.by !== 'coins') || !Array.isArray(r.top)) return undefined;
  const count = (v: unknown): number | undefined => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : undefined);
  const top: BoardRow[] = [];
  for (const row of r.top.slice(0, 50)) {
    if (typeof row !== 'object' || row === null) continue;
    const { name, value, me } = row as { name?: unknown; value?: unknown; me?: unknown };
    const v = count(value);
    const n = typeof name === 'string' ? cleanBoardName(name) : '';
    if (!n || v === undefined) continue;
    top.push({ name: n, value: v, ...(me === true ? { me: true } : {}) });
  }
  const out: BoardResult = { by: r.by, top, total: count(r.total) ?? top.length };
  if (typeof r.me === 'object' && r.me !== null) {
    const place = count((r.me as { place?: unknown }).place);
    const value = count((r.me as { value?: unknown }).value);
    const name = (r.me as { name?: unknown }).name;
    const n = typeof name === 'string' ? cleanBoardName(name) : '';
    if (place && value !== undefined) out.me = { place, value, ...(n ? { name: n } : {}) };
  }
  return out;
}

async function call(url: string, init: RequestInit = {}): Promise<Response | undefined> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), BOARD.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: abort.signal, cache: 'no-store' });
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Отправить посреднику, что игра знает о себе. */
export async function sendPlayer(upd: PlayerUpdate, base = boardBase(), now = Date.now()): Promise<SendResult> {
  if (!base) return 'offline';
  const res = await call(`${base}/player`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upd) });
  if (!res) return 'offline';
  if (res.ok) {
    markSynced(now);
    // Без своего имени посредник отвечает ником, который он выдал этой игре, — запомнить его.
    let body: { name?: unknown; reset?: unknown } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      body = {};
    }
    const nick = typeof body.name === 'string' ? cleanBoardName(body.name) : '';
    // Своё имя скрыто по жалобам игроков — забыть его, в таблице теперь ник.
    if (body.reset === true) {
      updateSettings({ boardName: '', ...(nick ? { boardNick: nick } : {}) });
      save(RESET_KEY, true);
      return 'reset';
    }
    if (!upd.name && nick && nick !== getSettings().boardNick) updateSettings({ boardNick: nick });
    return 'ok';
  }
  if (res.status === 400) {
    try {
      if (((await res.json()) as { error?: unknown }).error === 'name') return 'name';
    } catch {
      // Не JSON — просто ошибка.
    }
  }
  return 'error';
}

/** Таблица лидеров по опыту или монетам и своё место. */
export async function fetchBoard(by: BoardBy, id: string, base = boardBase()): Promise<BoardResult | 'offline' | 'error'> {
  if (!base) return 'offline';
  const res = await call(`${base}/board?${new URLSearchParams({ by, id })}`);
  if (!res) return 'offline';
  if (!res.ok) return 'error';
  try {
    return parseBoard(await res.json()) ?? 'error';
  } catch {
    return 'error';
  }
}

/** Пожаловаться на чужое имя в таблице: 'ok' — жалоба принята, 'hidden' — после неё имя скрыто. */
export async function reportName(name: string, base = boardBase()): Promise<'ok' | 'hidden' | 'offline' | 'error'> {
  if (!base) return 'offline';
  const res = await call(`${base}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: playerId(), name: cleanBoardName(name) }) });
  if (!res) return 'offline';
  if (!res.ok) return 'error';
  try {
    return ((await res.json()) as { hidden?: unknown }).hidden === true ? 'hidden' : 'ok';
  } catch {
    return 'ok';
  }
}

/** Убрать себя из таблицы: посредник удаляет запись, игра больше ничего не отправляет. */
export async function removeMe(base = boardBase()): Promise<'ok' | 'offline' | 'error'> {
  if (!base) return 'offline';
  const res = await call(`${base}/player?${new URLSearchParams({ id: playerId() })}`, { method: 'DELETE' });
  if (!res) return 'offline';
  if (!res.ok) return 'error';
  updateSettings({ boardHidden: true, boardName: '', boardNick: '' });
  return 'ok';
}

/** Вернуться в таблицу: снова отправлять о себе (сразу — при следующей отправке). */
export function showMeAgain(): void {
  updateSettings({ boardHidden: false });
  markSynced(0);
}

const RESET_KEY = 'pdd-game:board-reset';

/** Своё имя скрыли по жалобам: показать это один раз. */
export function takeNameReset(): boolean {
  const was = load<boolean>(RESET_KEY, false) === true;
  if (was) save(RESET_KEY, false);
  return was;
}

/** Ники по умолчанию на жалобы не отмечаются: их выдаёт посредник. */
export const isDefaultNick = (name: string) => /^user[\s_-]*\d+$/i.test(name);

// ─── Когда отправлять ────────────────────────────────────────────────────────────

const SYNC_KEY = 'pdd-game:board-sync';

/** Когда последний раз отправлено. */
function syncedAt(): number {
  const raw = load<{ at?: unknown } | null>(SYNC_KEY, null);
  return typeof raw?.at === 'number' ? raw.at : 0;
}

function markSynced(now: number): void {
  save(SYNC_KEY, { at: now });
}

/**
 * Отправить о себе, если пора: раз в `syncHours` или сразу (`force`) — при открытии таблицы и смене
 * имени. Готовность считается, только когда она нужна.
 */
export async function syncPlayer(o: { xp: number; coins: number; ready: () => Promise<number | undefined>; force?: boolean; now?: number }, base = boardBase()): Promise<SendResult | 'skipped'> {
  if (!base || getSettings().boardHidden) return 'skipped';
  const now = o.now ?? Date.now();
  if (!o.force && now - syncedAt() < BOARD.syncHours * 3_600_000) return 'skipped';
  const ready = await o.ready();
  return sendPlayer(playerUpdate({ id: playerId(), name: getSettings().boardName, xp: o.xp, coins: o.coins, ready }), base, now);
}
