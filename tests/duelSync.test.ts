/**
 * Итог дуэли через посредника (этап 14): ответ друга уходит посреднику, у автора вызова он сам
 * записывается в историю. Посредник — настоящий код stats-worker/worker.js с хранилищем в памяти.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import worker from '../stats-worker/worker.js';
import { allDuels, findDuel, resetDuelCache, saveChallenge } from '../src/duel/duelHistory.ts';
import { DUEL_SYNC_DAYS, parseDuelReply, sendDuelReply, syncDuels, waitingDuels } from '../src/duel/sync.ts';
import type { DuelPayload } from '../src/duel/duel.ts';

const BASE = 'https://kurier-pdd-stats.artemigna777.workers.dev';
const NOW = new Date(2026, 9, 12, 12).getTime();
const Q = Array.from({ length: 10 }, (_, i) => `B01-Q${String(i + 1).padStart(2, '0')}`);
const realFetch = globalThis.fetch;
let store: Map<string, string>;
let calls: string[];

beforeEach(() => {
  resetDuelCache();
  store = new Map();
  calls = [];
  const DUELS = { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v) };
  // Игра говорит с настоящим посредником, у которого хранилище в памяти.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(`${req.method} ${new URL(req.url).pathname}`);
    return worker.fetch(new Request(req, { headers: { ...Object.fromEntries(req.headers), Origin: 'https://artemigna777-sudo.github.io' } }), { GC_TOKEN: 'x', STATS_KEY: 'a'.repeat(64), DUELS });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const challenge = (id: string, at = NOW): DuelPayload => ({ id, at, q: Q, from: { name: 'Артём', answers: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0], ms: 90_000 } });

test('ответ друга уходит посреднику, а у автора вызова итог появляется сам', async () => {
  saveChallenge(challenge('abc123'), NOW);
  assert.deepEqual(await syncDuels(NOW, BASE), [], 'пока друг не ответил, итога нет');
  assert.equal(findDuel('abc123', 'from')!.them, undefined);

  // Друг ответил на другом телефоне.
  const friend = { name: 'Вася', answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ms: 75_000 };
  assert.equal(await sendDuelReply('abc123', friend, BASE), true);
  assert.equal(await sendDuelReply('abc123', friend, BASE), true, 'повторная отправка — не ошибка');
  assert.deepEqual(JSON.parse(store.get('duel:abc123')!), { name: 'Вася', answers: '1111111111', ms: 75_000 });

  const updated = await syncDuels(NOW + 60_000, BASE);
  assert.equal(updated.length, 1);
  assert.deepEqual(findDuel('abc123', 'from')!.them, friend);
  // Больше не спрашивает: итог уже есть.
  calls = [];
  assert.deepEqual(await syncDuels(NOW + 120_000, BASE), []);
  assert.deepEqual(calls, []);
});

test('спрашиваются только свои вызовы без ответа за последние 30 дней; без посредника — ничего', async () => {
  saveChallenge(challenge('old111', NOW - (DUEL_SYNC_DAYS + 1) * 86_400_000), NOW);
  saveChallenge(challenge('new222'), NOW);
  assert.deepEqual(waitingDuels(allDuels(), NOW).map((r) => r.id), ['new222']);
  await syncDuels(NOW, BASE);
  assert.deepEqual(calls, ['GET /duel/new222']);
  calls = [];
  assert.deepEqual(await syncDuels(NOW, undefined), []);
  assert.equal(await sendDuelReply('new222', challenge('x').from, undefined), false);
  assert.deepEqual(calls, [], 'в разработке и тестах без адреса посредника ничего не отправляется');
});

test('испорченный ответ посредника не ломает историю', () => {
  assert.equal(parseDuelReply({ name: 'Вася', answers: '123', ms: 1 }, 10), undefined);
  assert.equal(parseDuelReply({ name: '', answers: '1111111111', ms: 1 }, 10), undefined);
  assert.equal(parseDuelReply({ name: 'Вася', answers: '1111111111', ms: -1 }, 10), undefined);
  assert.equal(parseDuelReply(null, 10), undefined);
  assert.deepEqual(parseDuelReply({ name: ' Вася ', answers: '0123012301', ms: 5 }, 10), { name: 'Вася', answers: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1], ms: 5 });
});
