/**
 * Таблица лидеров и готовность игроков у посредника (stats-worker/players.js и Durable Object `Players`):
 * что принимается от игры, таблица по опыту и монетам, своё место, уход из таблицы, готовность по
 * десяткам процентов — только в отчёте для автора. Хранилище Durable Object заменено SQLite из Node.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, test } from 'node:test';
import { PLAYER, board, cleanName, cleanUpdate, nameAllowed, readyCounts, savePlayer, setup } from '../stats-worker/players.js';
import worker, { Players } from '../stats-worker/worker.js';

/** Хранилище как у Durable Object: `exec(запрос, ...значения).toArray()`. */
function sqlStorage() {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query: string, ...values: unknown[]) {
      const rows = db.prepare(query).all(...(values as never[]));
      return { toArray: () => rows };
    },
  };
}

const DAY = 86_400_000;
const id = (n: number) => `player-${String(n).padStart(12, '0')}`;

test('от игры принимается только своё: номер, имя без мата, опыт, монеты, готовность', () => {
  assert.deepEqual(cleanUpdate({ id: id(1), board: true, name: '  Маша \n Курьер ', xp: 12000, coins: 340, ready: 57 }), { id: id(1), board: true, name: 'Маша Курьер', xp: 12000, coins: 340, ready: 57 });
  // Не в таблице: имя, опыт и монеты не хранятся.
  assert.deepEqual(cleanUpdate({ id: id(1), board: false, name: 'Маша', xp: 5, coins: 5, ready: 40 }), { id: id(1), board: false, ready: 40 });
  assert.deepEqual(cleanUpdate({ id: id(1) }), { id: id(1), board: false });
  assert.deepEqual(cleanUpdate({ id: 'короткий', board: false }), { error: 'id' });
  assert.deepEqual(cleanUpdate(null), { error: 'bad' });
  assert.deepEqual(cleanUpdate({ id: id(1), board: true, xp: 1, coins: 1 }), { error: 'name' }, 'в таблице нужно имя');
  assert.deepEqual(cleanUpdate({ id: id(1), board: true, name: 'Маша', xp: -1, coins: 1 }), { error: 'bad' });
  assert.deepEqual(cleanUpdate({ id: id(1), board: true, name: 'Маша', xp: PLAYER.maxValue + 1, coins: 1 }), { error: 'bad' });
  assert.equal(cleanUpdate({ id: id(1), ready: 101 }).ready, undefined);
  assert.equal(cleanName('Очень-очень длинное имя игрока').length, PLAYER.nameMax);
  assert.equal(cleanName('А​ня'), 'А ня');
  for (const bad of ['Хуй', 'пиздец', 'ёбарь', 'Сука', 'бля123', 'xxFUCKxx', 'п и з д а']) assert.equal(nameAllowed(cleanName(bad)), false, bad);
  for (const ok of ['Маша', 'Хлебушек', 'Употребитель', 'Тимур', 'Сергей', 'Артём', 'Небесный', 'Mike']) assert.equal(nameAllowed(ok), true, ok);
  assert.deepEqual(cleanUpdate({ id: id(1), board: true, name: 'Пиздюк', xp: 1, coins: 1 }), { error: 'name' });
});

test('таблица лидеров: по опыту и по монетам, своё место, только те, кто захотел в таблицу', () => {
  const sql = sqlStorage();
  setup(sql);
  const now = Date.UTC(2026, 9, 15);
  for (let n = 1; n <= 25; n++) savePlayer(sql, cleanUpdate({ id: id(n), board: true, name: `Игрок ${n}`, xp: n * 1000, coins: 2600 - n * 100, ready: n * 4 }), now + n);
  savePlayer(sql, cleanUpdate({ id: id(99), board: false, ready: 100 }), now);

  const xp = board(sql, 'xp', id(3));
  assert.equal(xp.by, 'xp');
  assert.equal(xp.total, 25);
  assert.equal(xp.top.length, PLAYER.top);
  assert.deepEqual(xp.top[0], { name: 'Игрок 25', value: 25000 });
  assert.deepEqual(xp.me, { place: 23, value: 3000 });
  assert.ok(!xp.top.some((r: { me?: boolean }) => r.me), 'не в первых 20');
  assert.ok(!JSON.stringify(xp).includes('player-'), 'номера игр не отдаются');

  const coins = board(sql, 'coins', id(3));
  assert.deepEqual(coins.top[0], { name: 'Игрок 1', value: 2500 });
  assert.deepEqual(coins.top[2], { name: 'Игрок 3', value: 2300, me: true });
  assert.deepEqual(coins.me, { place: 3, value: 2300 });

  // Кто не в таблице, своего места не видит.
  assert.equal(board(sql, 'xp', id(99)).me, undefined);
  assert.equal(board(sql, 'xp', 'чужой').me, undefined);

  // Ушёл из таблицы — имя, опыт и монеты стёрты, готовность осталась.
  savePlayer(sql, cleanUpdate({ id: id(25), board: false, ready: 100 }), now + 100);
  assert.equal(board(sql, 'xp', id(25)).total, 24);
  assert.deepEqual(board(sql, 'xp', id(25)).top[0], { name: 'Игрок 24', value: 24000 });
  assert.deepEqual(sql.exec('SELECT name, xp, coins, ready FROM players WHERE id = ?', id(25)).toArray().map((r) => ({ ...r })), [{ name: null, xp: null, coins: null, ready: 100 }]);

  // Обновил опыт — место выросло; при равенстве выше тот, кто раньше.
  savePlayer(sql, cleanUpdate({ id: id(3), board: true, name: 'Игрок 3', xp: 24000, coins: 2300 }), now + 200);
  assert.deepEqual(board(sql, 'xp', id(3)).me, { place: 1, value: 24000 });
  assert.equal(board(sql, 'xp', id(3)).top[1].name, 'Игрок 3');
});

test('готовность игроков по десяткам процентов за 7 и 30 дней; кто не заходил год — удалён', () => {
  const sql = sqlStorage();
  setup(sql);
  const now = Date.UTC(2026, 9, 15);
  const put = (n: number, ready: number | undefined, at: number) => savePlayer(sql, cleanUpdate({ id: id(n), ...(ready === undefined ? {} : { ready }) }), at);
  put(1, 0, now);
  put(2, 9, now);
  put(3, 10, now);
  put(4, 55, now - 3 * DAY);
  put(5, 99, now - 10 * DAY);
  put(6, 100, now - 20 * DAY);
  put(7, 100, now - 40 * DAY);
  put(8, undefined, now);
  assert.deepEqual(readyCounts(sql, now), {
    d7: [2, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    d30: [2, 1, 0, 0, 0, 1, 0, 0, 0, 2],
  });
  // Игрок снова зашёл с новой готовностью — считается один раз, по новой.
  put(1, 35, now);
  assert.deepEqual(readyCounts(sql, now).d7, [1, 1, 0, 1, 0, 1, 0, 0, 0, 0]);
  put(9, 50, now + 366 * DAY);
  assert.equal(sql.exec('SELECT COUNT(*) AS n FROM players').toArray()[0].n, 1, 'кто не заходил год, удалён');
});

// ─── Посредник целиком: маршруты и Durable Object ────────────────────────────────

const GAME = 'https://artemigna777-sudo.github.io';
const KEY = 'a'.repeat(64);
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Привязка PLAYERS: один Durable Object на всех, как у Cloudflare. */
function playersBinding() {
  const object = new Players({ storage: { sql: sqlStorage() } });
  const names: string[] = [];
  return {
    names,
    binding: {
      idFromName: (name: string) => (names.push(name), name),
      get: () => ({ fetch: (input: string, init?: RequestInit) => object.fetch(new Request(input, init)) }),
    },
  };
}

const call = (env: object, path: string, init: { method?: string; body?: unknown; origin?: string; key?: string } = {}) =>
  worker.fetch(
    new Request(`https://kurier-pdd-stats.artemigna777.workers.dev${path}`, {
      method: init.method ?? 'GET',
      headers: { Origin: init.origin ?? GAME, ...(init.key ? { Authorization: `Bearer ${init.key}` } : {}) },
      ...(init.body === undefined ? {} : { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) }),
    }),
    env,
  );

test('посредник: игра присылает о себе и берёт таблицу лидеров — без ключа автора, только со страниц игры', async () => {
  const { binding, names } = playersBinding();
  const env = { PLAYERS: binding };
  const put = (body: unknown, origin?: string) => call(env, '/player', { method: 'PUT', body, origin });
  const first = await put({ id: id(1), board: true, name: 'Маша', xp: 15000, coins: 900, ready: 80 });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.equal((await put({ id: id(2), board: true, name: 'Петя', xp: 3000, coins: 1200 })).status, 200);
  assert.equal((await put({ id: id(3), board: false, ready: 20 })).status, 200);
  assert.deepEqual(names.every((n) => n === 'all'), true);

  const res = await call(env, `/board?by=xp&id=${id(2)}`);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), GAME, 'браузер игры пропустит ответ');
  const xp = await res.json();
  assert.deepEqual(xp, { by: 'xp', top: [{ name: 'Маша', value: 15000 }, { name: 'Петя', value: 3000, me: true }], total: 2, me: { place: 2, value: 3000 } });
  const coins = await (await call(env, '/board?by=coins')).json();
  assert.deepEqual(coins.top.map((r: { name: string }) => r.name), ['Петя', 'Маша']);
  assert.ok(JSON.stringify(coins).length < 2000, 'ответ маленький');

  assert.equal((await put({ id: id(4), board: true, name: 'Сука', xp: 1, coins: 1 })).status, 400);
  assert.deepEqual(await (await put({ id: id(4), board: true, name: 'Сука', xp: 1, coins: 1 })).json(), { error: 'name' });
  assert.equal((await put('не json')).status, 400);
  assert.equal((await put({ id: id(5), board: false, pad: 'x'.repeat(1100) })).status, 413);
  assert.equal((await put({ id: id(5) }, 'https://evil.example')).status, 403);
  assert.equal((await call(env, '/board?by=xp', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(env, '/player')).status, 405);
  assert.equal((await call({}, '/board?by=xp')).status, 503, 'без привязки PLAYERS — понятный отказ');
  const pre = await call(env, '/player', { method: 'OPTIONS' });
  assert.match(pre.headers.get('Access-Control-Allow-Methods') ?? '', /PUT/);
});

test('готовность игроков — только в отчёте для автора (с ключом), отчёт работает и без игроков', async () => {
  const { binding } = playersBinding();
  globalThis.fetch = (async (input: string) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/total')) return Response.json({ total: 3, stats: [] });
    if (path.endsWith('/hits')) return Response.json({ hits: [] });
    return Response.json({ stats: [] });
  }) as typeof fetch;
  const env = { GC_TOKEN: 'gc', STATS_KEY: KEY, PLAYERS: binding };
  for (const [n, ready] of [[1, 5], [2, 47], [3, 100]] as const) await call(env, '/player', { method: 'PUT', body: { id: id(n), ready } });
  const t = '2026-10-15T00:00:00Z';
  const period = `today=${t}&week=${t}&month=${t}&end=${t}`;
  const report = await (await call(env, `/api/report?${period}`, { key: KEY })).json();
  assert.deepEqual(report.ready, { d7: [1, 0, 0, 0, 1, 0, 0, 0, 0, 1], d30: [1, 0, 0, 0, 1, 0, 0, 0, 0, 1] });
  assert.equal((await call(env, `/api/report?${period}`)).status, 401, 'без ключа автора — отказ');
  assert.equal((await call(env, '/ready')).status, 401, 'отдельно готовность не отдаётся');
  const plain = await (await call({ GC_TOKEN: 'gc', STATS_KEY: KEY }, `/api/report?${period}`, { key: KEY })).json();
  assert.equal(plain.ready, undefined);
  assert.equal(plain.today, 3);
});
