/**
 * Таблица лидеров (общая — её видят все игроки) и готовность к экзамену для статистики автора.
 *
 * Игра отправляет посреднику на Cloudflare (stats-worker/worker.js, `PUT /player`) случайный номер
 * этой игры и:
 * - если игрок вступил в таблицу — имя, опыт и заработанные монеты;
 * - если анонимная статистика включена — готовность к экзамену в процентах. Её видит только автор на
 *   секретном экране статистики, и то лишь как число игроков в каждом десятке процентов.
 * Больше ничего. Таблицу игра берёт там же (`GET /board`). Без интернета или если посредник
 * недоступен — таблица не открывается, остальная игра работает как раньше.
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
  /** Своё место — если игрок в таблице. */
  me?: { place: number; value: number };
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

/** Ответ посредника на отправку: принято, имя не подходит, нет связи, другая ошибка. */
export type SendResult = 'ok' | 'name' | 'offline' | 'error';

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

/** Что отправить: в таблице — имя, опыт и монеты; готовность — только если статистика включена. */
export function playerUpdate(o: { id: string; board: boolean; name: string; xp: number; coins: number; ready?: number }): PlayerUpdate {
  const name = cleanBoardName(o.name);
  const upd: PlayerUpdate = { id: o.id, board: o.board && !!name };
  if (upd.board) Object.assign(upd, { name, xp: Math.max(0, Math.floor(o.xp)), coins: Math.max(0, Math.floor(o.coins)) });
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
    if (place && value !== undefined) out.me = { place, value };
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
    markSynced(upd, now);
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

// ─── Когда отправлять ────────────────────────────────────────────────────────────

const SYNC_KEY = 'pdd-game:board-sync';

interface SyncState {
  /** Когда последний раз отправлено. */
  at: number;
  /** У посредника есть что-то о нас (имя или готовность): если больше нечего слать — стереть. */
  kept: boolean;
  /** У посредника наше имя в таблице. */
  board: boolean;
}

function syncState(): SyncState {
  const raw = load<Partial<SyncState> | null>(SYNC_KEY, null);
  return { at: typeof raw?.at === 'number' ? raw.at : 0, kept: raw?.kept === true, board: raw?.board === true };
}

function markSynced(upd: PlayerUpdate, now: number): void {
  save(SYNC_KEY, { at: now, kept: upd.board || upd.ready !== undefined, board: upd.board });
}

/**
 * Отправить о себе, если пора: раз в `syncHours` или сразу (`force`). Если игрок не в таблице и
 * статистика выключена — ничего (а если у посредника что-то осталось — стереть). Игрок ушёл из таблицы,
 * а убрать имя не получилось (не было связи) — пробовать при каждом случае, не дожидаясь срока.
 * Готовность считается, только когда она нужна.
 */
export async function syncPlayer(o: { xp: number; coins: number; ready: () => Promise<number | undefined>; force?: boolean; now?: number }, base = boardBase()): Promise<SendResult | 'skipped'> {
  if (!base) return 'skipped';
  const now = o.now ?? Date.now();
  const state = syncState();
  const s = getSettings();
  const leaving = state.board && !s.board;
  if (!o.force && !leaving && now - state.at < BOARD.syncHours * 3_600_000) return 'skipped';
  const ready = await o.ready();
  const upd = playerUpdate({ id: playerId(), board: s.board, name: s.boardName, xp: o.xp, coins: o.coins, ready });
  if (!upd.board && upd.ready === undefined && !state.kept) return 'skipped';
  return sendPlayer(upd, base, now);
}
