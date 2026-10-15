/** Типы для автотестов посредника (сам посредник — обычный JavaScript для Cloudflare). */

/** Хранилище SQLite у Durable Object: `exec(запрос, ...значения).toArray()`. */
interface SqlStorage {
  exec(query: string, ...values: unknown[]): { toArray(): Record<string, unknown>[] };
}

/** Привязка Durable Object. */
interface DurableBinding {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
}

declare const worker: {
  fetch(
    request: Request,
    env: {
      GC_TOKEN?: string;
      STATS_KEY?: string;
      /** Хранилище Workers KV для итогов дуэлей. */
      DUELS?: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> };
      /** Комнаты дуэли в реальном времени (Durable Object LiveRoom). */
      LIVE?: DurableBinding;
      /** Игроки: таблица лидеров и готовность (Durable Object Players). */
      PLAYERS?: DurableBinding;
    },
  ): Promise<Response>;
};
export default worker;

/** Игроки — Durable Object с SQLite. */
export declare class Players {
  constructor(ctx: { storage: { sql: SqlStorage } });
  fetch(request: Request): Promise<Response>;
}
