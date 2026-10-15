/**
 * Таблица лидеров в игре (src/board/board.ts) вместе с настоящим кодом посредника (stats-worker/worker.js,
 * хранилище Durable Object — SQLite из Node): что игра отправляет о себе, когда, как уходит из таблицы;
 * заработанные монеты (src/progress/earned.ts).
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, test } from 'node:test';
import worker, { Players } from '../stats-worker/worker.js';

// В node нет localStorage — для настроек и времени отправки нужно хранилище в памяти.
const memory = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
};

const { BOARD, cleanBoardName, fetchBoard, newPlayerId, parseBoard, playerId, playerUpdate, syncPlayer } = await import('../src/board/board.ts');
const { getSettings, updateSettings } = await import('../src/settings.ts');
const { coinsEarned, ensureCoinsSpent, spentEstimate } = await import('../src/progress/earned.ts');
const { emptyProgress, sanitizeProgress, spendCoins } = await import('../src/progress/progress.ts');
const { buyOrSelect, buyOrSelectTheme } = await import('../src/progress/garage.ts');

const BASE = 'https://kurier-pdd-stats.artemigna777.workers.dev';
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 15, 12);
const realFetch = globalThis.fetch;
let sent: unknown[];
let db: DatabaseSync;

beforeEach(() => {
  memory.clear();
  updateSettings({ board: false, boardName: '', playerId: '' });
  sent = [];
  db = new DatabaseSync(':memory:');
  const sql = {
    exec(query: string, ...values: unknown[]) {
      const rows = db.prepare(query).all(...(values as never[]));
      return { toArray: () => rows };
    },
  };
  const object = new Players({ storage: { sql } });
  const PLAYERS = { idFromName: (n: string) => n, get: () => ({ fetch: (input: string, init?: RequestInit) => object.fetch(new Request(input, init)) }) };
  // Игра говорит с настоящим посредником.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    if (req.method === 'PUT') sent.push(JSON.parse(await req.clone().text()));
    return worker.fetch(new Request(req, { headers: { ...Object.fromEntries(req.headers), Origin: 'https://artemigna777-sudo.github.io' } }), { PLAYERS });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const sync = (o: { xp?: number; coins?: number; ready?: number; force?: boolean; now?: number } = {}) =>
  syncPlayer({ xp: o.xp ?? 0, coins: o.coins ?? 0, ready: async () => o.ready, force: o.force, now: o.now ?? NOW }, BASE);

test('что игра отправляет о себе: в таблице — имя, опыт и монеты; готовность — только со статистикой', () => {
  assert.match(newPlayerId(), /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(newPlayerId(), newPlayerId());
  const id = playerId();
  assert.equal(playerId(), id, 'номер создаётся один раз');
  assert.equal(getSettings().playerId, id);
  assert.deepEqual(playerUpdate({ id, board: true, name: ' Маша  ', xp: 12000.7, coins: 340, ready: 57.9 }), { id, board: true, name: 'Маша', xp: 12000, coins: 340, ready: 57 });
  assert.deepEqual(playerUpdate({ id, board: false, name: 'Маша', xp: 1, coins: 1 }), { id, board: false }, 'не в таблице и без статистики — ничего о себе');
  assert.deepEqual(playerUpdate({ id, board: true, name: '   ', xp: 1, coins: 1, ready: 120 }), { id, board: false, ready: 100 });
  assert.equal(cleanBoardName('Очень длинное имя игрока').length, BOARD.nameMax);
  assert.deepEqual(parseBoard({ by: 'xp', top: [{ name: 'Маша', value: 5 }, { name: '', value: 3 }, { name: 'Петя', value: -1 }, { name: 'Ты', value: 2, me: true }], total: 9, me: { place: 3, value: 2 } }), {
    by: 'xp',
    top: [{ name: 'Маша', value: 5 }, { name: 'Ты', value: 2, me: true }],
    total: 9,
    me: { place: 3, value: 2 },
  });
  assert.equal(parseBoard({ by: 'gold', top: [] }), undefined);
  assert.equal(parseBoard(null), undefined);
});

test('игрок попадает в таблицу, видит своё место и уходит из неё', async () => {
  // Не в таблице и без статистики — ничего не отправляется.
  assert.equal(await sync({ force: true }), 'skipped');
  assert.equal(sent.length, 0);

  updateSettings({ board: true, boardName: 'Маша' });
  assert.equal(await sync({ xp: 15_000, coins: 900, force: true }), 'ok');
  const board = await fetchBoard('xp', playerId(), BASE);
  assert.ok(typeof board === 'object');
  assert.deepEqual(board.top, [{ name: 'Маша', value: 15_000, me: true }]);
  assert.deepEqual(board.me, { place: 1, value: 15_000 });
  const coins = await fetchBoard('coins', playerId(), BASE);
  assert.ok(typeof coins === 'object' && coins.top[0].value === 900);

  // Раз в 6 часов — не чаще, если не просят сразу.
  assert.equal(await sync({ xp: 16_000, now: NOW + HOUR }), 'skipped');
  assert.equal(await sync({ xp: 16_000, now: NOW + BOARD.syncHours * HOUR }), 'ok');

  // Плохое имя посредник не принимает.
  updateSettings({ boardName: 'Сука' });
  assert.equal(await sync({ force: true }), 'name');

  // Ушёл из таблицы без связи — убрать имя пробуем при каждом случае, не дожидаясь 6 часов.
  updateSettings({ boardName: 'Маша' });
  assert.equal(await sync({ force: true, now: NOW + BOARD.syncHours * HOUR }), 'ok');
  updateSettings({ board: false });
  const online = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('нет связи');
  }) as typeof fetch;
  assert.equal(await sync({ force: true, now: NOW + BOARD.syncHours * HOUR + 1 }), 'offline');
  globalThis.fetch = online;
  assert.equal((await fetchBoard('xp', playerId(), BASE) as { total: number }).total, 1, 'пока имя ещё в таблице');

  // Связь появилась — имя, опыт и монеты стёрты у посредника.
  assert.equal(await sync({ now: NOW + BOARD.syncHours * HOUR + 2 }), 'ok', 'сразу, не дожидаясь срока — стереть то, что было');
  assert.deepEqual(sent.at(-1), { id: playerId(), board: false });
  const empty = await fetchBoard('xp', playerId(), BASE);
  assert.ok(typeof empty === 'object');
  assert.deepEqual([empty.top, empty.total, empty.me], [[], 0, undefined]);
  assert.equal(await sync({ force: true }), 'skipped', 'больше нечего отправлять');
  assert.equal(await sync({ now: NOW + 10 * BOARD.syncHours * HOUR }), 'skipped');
});

test('готовность для статистики автора уходит без имени; без посредника — ничего не ломается', async () => {
  assert.equal(await sync({ ready: 42, force: true }), 'ok');
  assert.deepEqual(sent.at(-1), { id: playerId(), board: false, ready: 42 });
  assert.equal(db.prepare('SELECT ready, name FROM players').all().length, 1);
  assert.equal(await syncPlayer({ xp: 1, coins: 1, ready: async () => 5, force: true }, undefined), 'skipped');
  globalThis.fetch = (async () => {
    throw new TypeError('нет связи');
  }) as typeof fetch;
  assert.equal(await sync({ ready: 50, force: true }), 'offline');
  assert.equal(await fetchBoard('xp', playerId(), BASE), 'offline');
});

test('заработанные монеты: покупки место в таблице не уменьшают, старые сохранения — по купленному', () => {
  const data = emptyProgress();
  data.coins = 1000;
  assert.equal(coinsEarned(data), 1000);
  assert.equal(buyOrSelect(data, 'red'), 'bought');
  assert.equal(buyOrSelectTheme(data, 'winter'), 'bought');
  assert.equal(data.coins, 1000 - 60 - 250);
  assert.equal(data.coinsSpent, 310);
  assert.equal(coinsEarned(data), 1000);
  assert.equal(spendCoins(data, 5000), false);
  assert.equal(data.coinsSpent, 310);

  // Сохранение до таблицы лидеров: потраченного нет — оценка по покупкам (покраска, тема, сюжет, «Вернуть решение»).
  const old = sanitizeProgress({ ...JSON.parse(JSON.stringify(data)), coinsSpent: undefined, garage: { ...data.garage, owned: [...data.garage.owned, 'tale:night', 'qtheme:gym', 'model:pickup'] } });
  old.story = { choices: [], endings: {}, rewinds: 1 };
  assert.equal(old.coinsSpent, undefined);
  const estimate = 60 + 250 + 600 + 350 + 400 + 200;
  assert.equal(spentEstimate(old), estimate);
  assert.equal(coinsEarned(old), old.coins + estimate);
  assert.equal(ensureCoinsSpent(old), true);
  assert.equal(old.coinsSpent, estimate);
  assert.equal(ensureCoinsSpent(old), false, 'оценка — один раз, дальше считается точно');
  assert.equal(sanitizeProgress(JSON.parse(JSON.stringify(old))).coinsSpent, estimate);
});
