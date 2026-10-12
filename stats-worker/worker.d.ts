/** Типы для автотестов посредника (сам посредник — обычный JavaScript для Cloudflare). */
declare const worker: {
  fetch(
    request: Request,
    env: {
      GC_TOKEN?: string;
      STATS_KEY?: string;
      /** Хранилище Workers KV для итогов дуэлей. */
      DUELS?: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> };
    },
  ): Promise<Response>;
};
export default worker;
