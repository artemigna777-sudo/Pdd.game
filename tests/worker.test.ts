/**
 * Посредник статистики (stats-worker/worker.js): без ключа автора — отказ, с ключом — чтение статистики
 * GoatCounter с ключом GoatCounter, CORS только для игры, ошибки GoatCounter понятны игре.
 * Сам GoatCounter подменён.
 */
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker from '../stats-worker/worker.js';

const ENV = { GC_TOKEN: 'gc-secret', STATS_KEY: 'a'.repeat(64) };
const GAME = 'https://artemigna777-sudo.github.io';
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const call = (path: string, init: { method?: string; key?: string; origin?: string } = {}, env: { GC_TOKEN?: string; STATS_KEY?: string } = ENV) =>
  worker.fetch(
    new Request(`https://kurier-pdd-stats.artemigna777.workers.dev${path}`, {
      method: init.method ?? 'GET',
      headers: { Origin: init.origin ?? GAME, ...(init.key ? { Authorization: `Bearer ${init.key}` } : {}) },
    }),
    env,
  );

test('браузер игры может спрашивать: предварительный запрос и CORS только для игры', async () => {
  const pre = await call('/api/v0/stats/total', { method: 'OPTIONS' });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.match(pre.headers.get('Access-Control-Allow-Headers') ?? '', /Authorization/);
  const other = await call('/api/v0/stats/total', { method: 'OPTIONS', origin: 'https://evil.example' });
  assert.equal(other.headers.get('Access-Control-Allow-Origin'), GAME, 'чужому сайту браузер ответ не отдаст');
});

test('адрес посредника в браузере: работает ли и заданы ли секреты', async () => {
  assert.match(await (await call('/')).text(), /работает/);
  assert.match(await (await call('/', {}, {})).text(), /не заданы секреты/);
});

test('без ключа автора или с чужим — отказ, GoatCounter не спрашивается', async () => {
  let asked = 0;
  globalThis.fetch = (async () => {
    asked++;
    return new Response('{}');
  }) as typeof fetch;
  assert.equal((await call('/api/v0/stats/total')).status, 401);
  assert.deepEqual(await (await call('/api/v0/stats/total', { key: 'b'.repeat(64) })).json(), { error: 'key' });
  assert.equal((await call('/api/v0/stats/total', { key: ENV.STATS_KEY }, { GC_TOKEN: 'x' })).status, 500, 'без STATS_KEY — ошибка настройки');
  assert.equal(asked, 0);
});

test('с ключом автора: только чтение статистики, ключ GoatCounter остаётся у посредника', async () => {
  const asked: { url: string; auth: string | null }[] = [];
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    asked.push({ url: input, auth: new Headers(init?.headers).get('Authorization') });
    return new Response(JSON.stringify({ total: 7 }), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const ok = await call('/api/v0/stats/total?start=2026-10-07T00:00:00Z&end=2026-10-08T00:00:00Z', { key: ENV.STATS_KEY });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { total: 7 });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.deepEqual(asked, [{ url: 'https://kurier-pdd.goatcounter.com/api/v0/stats/total?start=2026-10-07T00:00:00Z&end=2026-10-08T00:00:00Z', auth: 'Bearer gc-secret' }]);
  assert.equal((await call('/api/v0/sites', { key: ENV.STATS_KEY })).status, 404, 'настройки и сайты GoatCounter — нельзя');
  assert.equal((await call('/api/v0/stats/total', { method: 'POST', key: ENV.STATS_KEY })).status, 405);
});

test('ошибки GoatCounter: неверный ключ GoatCounter, сбой, нет связи', async () => {
  globalThis.fetch = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
  assert.deepEqual(await (await call('/api/v0/stats/hits', { key: ENV.STATS_KEY })).json(), { error: 'gc-token' });
  globalThis.fetch = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
  assert.deepEqual(await (await call('/api/v0/stats/hits', { key: ENV.STATS_KEY })).json(), { error: 'gc-error', status: 500 });
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  const down = await call('/api/v0/stats/hits', { key: ENV.STATS_KEY });
  assert.equal(down.status, 502);
  assert.deepEqual(await down.json(), { error: 'gc-network' });
});
