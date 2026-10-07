/** Типы для автотестов посредника (сам посредник — обычный JavaScript для Cloudflare). */
declare const worker: {
  fetch(request: Request, env: { GC_TOKEN?: string; STATS_KEY?: string }): Promise<Response>;
};
export default worker;
