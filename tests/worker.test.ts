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
  assert.match(await (await call('/', {}, { GC_TOKEN: 'x', STATS_KEY: `STATS_KEY — ${'a'.repeat(64)}` })).text(), /STATS_KEY задан неверно/);
});

test('секреты, вставленные с телефона с пробелами и переводом строки по краям, работают', async () => {
  const asked: (string | null)[] = [];
  globalThis.fetch = (async (_input: string, init?: RequestInit) => {
    asked.push(new Headers(init?.headers).get('Authorization'));
    return new Response('{}');
  }) as typeof fetch;
  const env = { GC_TOKEN: ' gc-secret\n', STATS_KEY: `  ${'A'.repeat(64)} \n` };
  assert.match(await (await call('/', {}, env)).text(), /работает/);
  assert.equal((await call('/api/v0/stats/total', { key: 'a'.repeat(64) }, env)).status, 200);
  assert.deepEqual(asked, ['Bearer gc-secret']);
  assert.equal((await call('/api/v0/stats/total', { key: 'a'.repeat(64) }, { GC_TOKEN: 'x', STATS_KEY: `STATS_KEY — ${'a'.repeat(64)}` })).status, 500, 'с лишними словами — ошибка настройки');
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

test('отчёт одним ответом: посредник сам спрашивает GoatCounter и отдаёт игре только числа', async () => {
  const asked: URL[] = [];
  const big = 'x'.repeat(2000);
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    asked.push(url);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer gc-secret');
    const page = url.pathname.replace('/api/v0/stats/', '');
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    if (page === 'total') {
      const start = url.searchParams.get('start');
      if (start === '2026-10-14T21:00:00Z') return json({ total: 4, stats: [{ day: '2026-10-15', daily: 4, hourly: Array(24).fill(0) }] });
      if (start === '2026-10-08T21:00:00Z') return json({ total: 11, stats: [] });
      return json({ total: 30, stats: [{ day: '2026-10-14', daily: 7, hourly: Array(24).fill(1) }, { day: '2026-10-15', daily: 3, hourly: Array(24).fill(0) }] });
    }
    // Настоящие ответы GoatCounter большие: по каждому адресу — дни и часы.
    if (page === 'hits') return json({ hits: [{ path: '/city/ch1', count: 6, stats: [{ day: '2026-10-15', hourly: Array(24).fill(0) }], title: big }, { path: 'exam-pass', event: true, count: 2 }, { path: '/city/ch1', count: 1 }], more: false });
    if (page === 'toprefs') return json({ stats: [{ name: 'tiktok', count: 5 }, { id: '', name: '', count: 2 }, { name: 'пусто', count: 0 }] });
    if (page === 'systems') return json({ stats: [{ id: 'iOS', count: 9 }] });
    return json({ stats: [{ name: 'Russia', count: 9 }] });
  }) as typeof fetch;
  const period = 'today=2026-10-14T21:00:00Z&week=2026-10-08T21:00:00Z&month=2026-09-15T21:00:00Z&end=2026-10-15T05:43:00Z';
  const res = await call(`/api/report?${period}`, { key: ENV.STATS_KEY });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), GAME);
  const text = await res.text();
  assert.ok(text.length < 1000, `ответ маленький: ${text.length} знаков`);
  assert.deepEqual(JSON.parse(text), {
    today: 4,
    week: 11,
    month: 30,
    days: [
      ['2026-10-14', 7],
      ['2026-10-15', 3],
    ],
    counts: { '/city/ch1': 7, 'exam-pass': 2 },
    refs: [
      ['tiktok', 5],
      ['', 2],
    ],
    systems: [['iOS', 9]],
    locations: [['Russia', 9]],
  });
  assert.deepEqual(
    asked.map((u) => `${u.pathname.replace('/api/v0/stats/', '')} ${u.searchParams.get('start')} ${u.searchParams.get('end')}`),
    [
      'total 2026-10-14T21:00:00Z 2026-10-15T05:43:00Z',
      'total 2026-10-08T21:00:00Z 2026-10-15T05:43:00Z',
      'total 2026-09-15T21:00:00Z 2026-10-15T05:43:00Z',
      'hits 2026-09-15T21:00:00Z 2026-10-15T05:43:00Z',
      'toprefs 2026-09-15T21:00:00Z 2026-10-15T05:43:00Z',
      'systems 2026-09-15T21:00:00Z 2026-10-15T05:43:00Z',
      'locations 2026-09-15T21:00:00Z 2026-10-15T05:43:00Z',
    ],
  );
  assert.ok(asked.every((u) => u.origin === 'https://kurier-pdd.goatcounter.com'));
  // Без ключа автора, с испорченным периодом — отказ; GoatCounter больше не спрашивается.
  asked.length = 0;
  assert.equal((await call(`/api/report?${period}`)).status, 401);
  assert.deepEqual(await (await call('/api/report?today=вчера&week=1&month=2&end=3', { key: ENV.STATS_KEY })).json(), { error: 'period' });
  assert.equal(asked.length, 0);
});

test('отчёт одним ответом: «слишком часто» — пауза и повтор; ошибки GoatCounter понятны игре', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 2) return new Response('{"error":"rate limited"}', { status: 429, headers: { 'X-Rate-Limit-Reset': '0' } });
    return new Response(JSON.stringify({ total: 1, stats: [], hits: [] }), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const period = 'today=2026-10-14T21:00:00Z&week=2026-10-08T21:00:00Z&month=2026-09-15T21:00:00Z&end=2026-10-15T05:43:00Z';
  const ok = await call(`/api/report?${period}`, { key: ENV.STATS_KEY });
  assert.equal(ok.status, 200);
  assert.equal(calls, 8, 'семь запросов и один повтор после 429');
  globalThis.fetch = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
  assert.deepEqual(await (await call(`/api/report?${period}`, { key: ENV.STATS_KEY })).json(), { error: 'gc-token' });
  globalThis.fetch = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
  assert.deepEqual(await (await call(`/api/report?${period}`, { key: ENV.STATS_KEY })).json(), { error: 'gc-error', status: 500 });
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  const down = await call(`/api/report?${period}`, { key: ENV.STATS_KEY });
  assert.equal(down.status, 502);
  assert.deepEqual(await down.json(), { error: 'gc-network' });
});

// ─── Итог дуэли (этап 14) ────────────────────────────────────────────────────────

/** Workers KV в памяти: значения и срок хранения. */
function fakeKv() {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    get: async (key: string) => store.get(key)?.value ?? null,
    put: async (key: string, value: string, opts?: { expirationTtl?: number }) => void store.set(key, { value, ttl: opts?.expirationTtl }),
  };
}

const duelCall = (path: string, env: object, init: { method?: string; body?: string } = {}) =>
  worker.fetch(
    new Request(`https://kurier-pdd-stats.artemigna777.workers.dev${path}`, {
      method: init.method ?? 'GET',
      headers: { Origin: GAME, 'Content-Type': 'application/json' },
      ...(init.body !== undefined ? { body: init.body } : {}),
    }),
    env,
  );

test('дуэль: друг оставляет итог, автор забирает его; хранится 30 дней и только имя, ответы и время', async () => {
  const DUELS = fakeKv();
  const env = { ...ENV, DUELS };
  assert.equal((await duelCall('/duel/abc123', env)).status, 404);
  const body = JSON.stringify({ name: '  Вася \n Пупкин  ', answers: '0120120120', ms: 95_000, extra: 'лишнее', q: [1, 2] });
  const put = await duelCall('/duel/abc123', env, { method: 'PUT', body });
  assert.equal(put.status, 201);
  assert.equal(put.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.deepEqual(await (await duelCall('/duel/abc123', env)).json(), { name: 'Вася Пупкин', answers: '0120120120', ms: 95_000 });
  assert.equal(DUELS.store.get('duel:abc123')!.ttl, 30 * 24 * 3600);
  // Второй ответ на тот же вызов не заменяет первый.
  assert.equal((await duelCall('/duel/abc123', env, { method: 'PUT', body: JSON.stringify({ name: 'Злоумышленник', answers: '0000000000', ms: 1 }) })).status, 409);
  assert.equal((await (await duelCall('/duel/abc123', env)).json()).name, 'Вася Пупкин');
  // Предварительный запрос браузера разрешает PUT с JSON.
  const pre = await duelCall('/duel/abc123', env, { method: 'OPTIONS' });
  assert.match(pre.headers.get('Access-Control-Allow-Methods') ?? '', /PUT/);
  assert.match(pre.headers.get('Access-Control-Allow-Headers') ?? '', /Content-Type/);
  // Итог дуэли не требует ключа автора и не открывает статистику.
  assert.equal((await duelCall('/api/v0/stats/total', env)).status, 401);
});

test('дуэль: испорченные данные, чужие адреса и посредник без хранилища', async () => {
  const env = { ...ENV, DUELS: fakeKv() };
  const bad = [
    '{',
    JSON.stringify({ name: '', answers: '0120120120', ms: 1 }),
    JSON.stringify({ name: 'Вася', answers: '012', ms: 1 }),
    JSON.stringify({ name: 'Вася', answers: '012012012a', ms: 1 }),
    JSON.stringify({ name: 'Вася', answers: '0120120120', ms: -5 }),
    JSON.stringify({ name: 'Вася', answers: '0120120120', ms: 99_999_999 }),
  ];
  for (const body of bad) assert.equal((await duelCall('/duel/abc123', env, { method: 'PUT', body })).status, 400, body);
  assert.equal((await duelCall('/duel/abc123', env, { method: 'PUT', body: 'x'.repeat(2000) })).status, 413);
  assert.equal((await duelCall('/duel/AB', env)).status, 401, 'неправильный номер дуэли — не адрес дуэли, а без ключа автора посредник ничего не отдаёт');
  assert.equal((await duelCall('/duel/abc123', env, { method: 'DELETE' })).status, 405);
  const noKv = await duelCall('/duel/abc123', ENV);
  assert.equal(noKv.status, 503);
  assert.deepEqual(await noKv.json(), { error: 'kv' });
});

test('загрузка посредника: номер хранилища дуэлей из списка wrangler и настройки с привязкой DUELS', async () => {
  // @ts-expect-error — обычный JS-модуль без типов.
  const { findKvId, deployConfig } = await import('../stats-worker/kv-config.mjs');
  const list = `[{"id":"aaa","title":"other"},{"id":"bbb","title":"kurier-pdd-stats-kurier-pdd-duels"}]`;
  assert.equal(findKvId(`Wrangler 4\n${list}\n`), 'bbb');
  assert.equal(findKvId('[{"id":"ccc","title":"kurier-pdd-duels"}]'), 'ccc');
  assert.equal(findKvId('[]'), undefined);
  assert.equal(findKvId('ошибка: нет доступа'), undefined);
  const { readFileSync } = await import('node:fs');
  const config = deployConfig(readFileSync('stats-worker/wrangler.jsonc', 'utf8'), 'ddd');
  assert.equal(config.name, 'kurier-pdd-stats');
  assert.equal(config.keep_vars, true, 'загрузка не стирает переменные, заданные в Cloudflare руками');
  assert.deepEqual(config.kv_namespaces, [{ binding: 'DUELS', id: 'ddd' }]);
  // Комнаты дуэли в реальном времени и игроки для таблицы лидеров — Durable Objects LiveRoom и Players;
  // старая миграция остаётся первой, без них загрузка тоже возможна.
  assert.deepEqual(config.durable_objects, {
    bindings: [
      { name: 'LIVE', class_name: 'LiveRoom' },
      { name: 'PLAYERS', class_name: 'Players' },
    ],
  });
  assert.deepEqual(config.migrations, [
    { tag: 'live-v1', new_sqlite_classes: ['LiveRoom'] },
    { tag: 'players-v1', new_sqlite_classes: ['Players'] },
  ]);
  const plain = deployConfig(readFileSync('stats-worker/wrangler.jsonc', 'utf8'), undefined, false);
  assert.equal(plain.durable_objects, undefined);
  assert.equal(plain.kv_namespaces, undefined);
});
