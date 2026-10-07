/**
 * Посредник статистики «Курьер ПДД» — Cloudflare Worker (kurier-pdd-stats.artemigna777.workers.dev).
 *
 * Зачем: API GoatCounter с ключом браузер из игры не пускает, а открытый счётчик виден всем.
 * Посредник хранит ключ GoatCounter у себя и отдаёт статистику только тому, кто знает ключ автора.
 * Ключ автора игра получает из пароля автора при входе (src/stats/author.ts, `authorKey`).
 *
 * Секреты в настройках Worker (Settings → Variables and Secrets, тип Secret):
 * - GC_TOKEN — ключ API GoatCounter с правом «Read statistics»;
 * - STATS_KEY — ключ автора (64 знака, Claude присылает его Артёму в чате).
 *
 * Код вставляется в Cloudflare целиком: Edit code → выделить всё → вставить → Deploy.
 */

const GOATCOUNTER = 'https://kurier-pdd.goatcounter.com';
/** Откуда можно спрашивать из браузера: игра на GitHub Pages и запуск на компьютере разработчика. */
const ORIGINS = ['https://artemigna777-sudo.github.io', 'http://localhost:5173', 'http://localhost:4173'];
/** Что можно спрашивать у GoatCounter: только чтение статистики. */
const ALLOWED = /^\/api\/v0\/stats\/(total|hits|toprefs|systems|locations|browsers|sizes|campaigns)$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return reply(405, { error: 'method' });

    const url = new URL(request.url);
    // Проверка, что посредник работает: открыть адрес в браузере.
    if (url.pathname === '/') {
      const ready = Boolean(env.GC_TOKEN && env.STATS_KEY);
      return new Response(ready ? 'Курьер ПДД: посредник статистики работает.' : 'Курьер ПДД: посредник запущен, но не заданы секреты GC_TOKEN и STATS_KEY.', {
        headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    if (!env.GC_TOKEN || !env.STATS_KEY) return reply(500, { error: 'setup' });
    if (!(await same(request.headers.get('Authorization') || '', `Bearer ${env.STATS_KEY}`))) return reply(401, { error: 'key' });
    if (!ALLOWED.test(url.pathname)) return reply(404, { error: 'path' });

    let res;
    try {
      res = await fetch(GOATCOUNTER + url.pathname + url.search, { headers: { Authorization: `Bearer ${env.GC_TOKEN}`, Accept: 'application/json' } });
    } catch {
      return reply(502, { error: 'gc-network' });
    }
    if (res.status === 401 || res.status === 403) return reply(502, { error: 'gc-token' });
    if (!res.ok) return reply(502, { error: 'gc-error', status: res.status });
    return new Response(await res.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  },
};

/** Сравнить строки за одинаковое время (по отпечаткам SHA-256), чтобы ключ нельзя было подобрать по задержке. */
async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x);
  const v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}
