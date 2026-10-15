/**
 * Таблица лидеров в игре (src/board/board.ts) вместе с настоящим кодом посредника (stats-worker/worker.js,
 * хранилище Durable Object — SQLite из Node): что игра отправляет о себе и когда, ник от посредника и своё имя;
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

const { BOARD, boardName, cleanBoardName, fetchBoard, newPlayerId, parseBoard, playerId, playerUpdate, syncPlayer } = await import('../src/board/board.ts');
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
  updateSettings({ boardName: '', boardNick: '', playerId: '' });
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

test('что игра отправляет о себе: опыт, монеты и своё имя, если есть; готовность — только со статистикой', () => {
  assert.match(newPlayerId(), /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(newPlayerId(), newPlayerId());
  const id = playerId();
  assert.equal(playerId(), id, 'номер создаётся один раз');
  assert.equal(getSettings().playerId, id);
  assert.deepEqual(playerUpdate({ id, name: ' Маша  ', xp: 12000.7, coins: 340, ready: 57.9 }), { id, board: true, name: 'Маша', xp: 12000, coins: 340, ready: 57 });
  assert.deepEqual(playerUpdate({ id, name: '', xp: 1, coins: 1 }), { id, board: true, xp: 1, coins: 1 }, 'без своего имени — ник от посредника');
  assert.deepEqual(playerUpdate({ id, name: '   ', xp: 1, coins: 1, ready: 120 }), { id, board: true, xp: 1, coins: 1, ready: 100 });
  assert.equal(cleanBoardName('Очень длинное имя игрока').length, BOARD.nameMax);
  assert.deepEqual(parseBoard({ by: 'xp', top: [{ name: 'Маша', value: 5 }, { name: '', value: 3 }, { name: 'Петя', value: -1 }, { name: 'Ты', value: 2, me: true }], total: 9, me: { place: 3, value: 2, name: 'Ты' } }), {
    by: 'xp',
    top: [{ name: 'Маша', value: 5 }, { name: 'Ты', value: 2, me: true }],
    total: 9,
    me: { place: 3, value: 2, name: 'Ты' },
  });
  assert.equal(parseBoard({ by: 'gold', top: [] }), undefined);
  assert.equal(parseBoard(null), undefined);
});

test('все игроки сразу в таблице: случайный ник от посредника, своё имя по желанию', async () => {
  // Своё имя игрок не вводил — посредник выдаёт ник, игра его запоминает.
  assert.equal(boardName(), '');
  assert.equal(await sync({ xp: 15_000, coins: 900 }), 'ok');
  assert.deepEqual(sent.at(-1), { id: playerId(), board: true, xp: 15_000, coins: 900 });
  const nick = getSettings().boardNick;
  assert.match(nick, /^user_\d{4}$/);
  assert.equal(boardName(), nick);
  const board = await fetchBoard('xp', playerId(), BASE);
  assert.ok(typeof board === 'object');
  assert.deepEqual(board.top, [{ name: nick, value: 15_000, me: true }]);
  assert.deepEqual(board.me, { place: 1, value: 15_000, name: nick });
  const coins = await fetchBoard('coins', playerId(), BASE);
  assert.ok(typeof coins === 'object' && coins.top[0].value === 900);

  // Раз в 6 часов — не чаще, если не просят сразу.
  assert.equal(await sync({ xp: 16_000, now: NOW + HOUR }), 'skipped');
  assert.equal(await sync({ xp: 16_000, now: NOW + BOARD.syncHours * HOUR }), 'ok');

  // Своё имя. Плохое или чужой ник посредник не принимает.
  updateSettings({ boardName: 'Сука' });
  assert.equal(await sync({ force: true }), 'name');
  updateSettings({ boardName: 'user_1234' });
  assert.equal(await sync({ force: true }), 'name');
  updateSettings({ boardName: 'Маша' });
  assert.equal(await sync({ xp: 16_000, force: true }), 'ok');
  assert.equal(boardName(), 'Маша');
  assert.equal(getSettings().boardNick, nick, 'ник остаётся за игрой');
  const named = await fetchBoard('xp', playerId(), BASE);
  assert.ok(typeof named === 'object' && named.top[0].name === 'Маша' && named.me?.name === 'Маша');

  // Стёрла своё имя — снова тот же ник.
  updateSettings({ boardName: '' });
  assert.equal(await sync({ force: true, xp: 16_000 }), 'ok');
  const again = await fetchBoard('xp', playerId(), BASE);
  assert.ok(typeof again === 'object' && again.me?.name === nick);

  // Второй игрок получает другой ник.
  updateSettings({ playerId: '', boardNick: '' });
  assert.equal(await sync({ force: true, xp: 1 }), 'ok');
  assert.match(getSettings().boardNick, /^user_\d{4}$/);
  assert.notEqual(getSettings().boardNick, nick);
});

test('готовность для статистики автора уходит без имени; без посредника — ничего не ломается', async () => {
  assert.equal(await sync({ ready: 42, force: true }), 'ok');
  assert.deepEqual(sent.at(-1), { id: playerId(), board: true, xp: 0, coins: 0, ready: 42 });
  assert.equal(db.prepare('SELECT ready FROM players WHERE ready = 42').all().length, 1);
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
