/** Типы для автотестов (сам модуль — обычный JavaScript для Cloudflare). */

interface SqlStorage {
  exec(query: string, ...values: unknown[]): { toArray(): Record<string, unknown>[] };
}

/** Что принято от игры. При ошибке есть только `error` (для простоты тестов поля не разделены). */
export interface PlayerUpdate {
  id: string;
  board: boolean;
  name?: string;
  xp?: number;
  coins?: number;
  ready?: number;
  error?: 'bad' | 'id' | 'name';
}

export interface BoardResult {
  by: 'xp' | 'coins';
  top: { name: string; value: number; me?: true }[];
  total: number;
  me?: { place: number; value: number; name: string };
}

export declare const PLAYER: { nameMax: number; top: number; maxValue: number; keepDays: number };
export declare function cleanName(raw: unknown): string;
export declare function nameAllowed(name: string): boolean;
export declare function cleanUpdate(raw: unknown): PlayerUpdate;
export declare function setup(sql: SqlStorage): void;
export declare function freeNick(sql: SqlStorage, rnd?: () => number): string;
export declare function savePlayer(sql: SqlStorage, upd: PlayerUpdate, now: number, rnd?: () => number): string;
export declare function board(sql: SqlStorage, by: string | null, id: string | null): BoardResult;
export declare function readyCounts(sql: SqlStorage, now: number): { d7: number[]; d30: number[] };
