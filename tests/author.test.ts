/**
 * Пароль автора для секретного экрана статистики: отпечаток PBKDF2, сравнение без регистра и дефисов,
 * блокировка после пяти неверных попыток, вход запоминается только для нынешнего отпечатка.
 * Настоящего пароля здесь нет: тесты считают отпечаток своего, тестового.
 */
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';
import { adminState, updateAdmin } from '../src/stats/admin.ts';
import { AUTHOR, KEY_SALT, LOCK_MS, MAX_ATTEMPTS, authorKey, lockedFor, normalizePassword, passwordHash, passwordMatches, recordAttempt, verifierId, type Verifier } from '../src/stats/author.ts';

// В node нет localStorage — для блокировки и входа нужно хранилище в памяти.
const memory = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
};

const SALT = '00112233445566778899aabbccddeeff';
const TEST: Verifier = { salt: SALT, iterations: 1000, hash: pbkdf2Sync('ab12cd34ef56', Buffer.from(SALT, 'hex'), 1000, 32, 'sha256').toString('hex') };

test('отпечаток автора: соль, 150 000 повторов, 32 байта; самого пароля в коде нет', () => {
  assert.match(AUTHOR.salt, /^[0-9a-f]{32}$/);
  assert.match(AUTHOR.hash, /^[0-9a-f]{64}$/);
  assert.equal(AUTHOR.iterations, 150_000);
  assert.equal(verifierId(AUTHOR), AUTHOR.hash.slice(0, 16));
});

test('отпечаток считается как PBKDF2-SHA-256, пароль сравнивается без регистра, пробелов и дефисов', async () => {
  assert.equal(await passwordHash('ab12cd34ef56', SALT, 1000), TEST.hash);
  assert.equal(normalizePassword(' AB12-cd34 EF56 '), 'ab12cd34ef56');
  assert.equal(await passwordMatches('ab12-cd34-ef56', TEST), true);
  assert.equal(await passwordMatches('AB12 CD34 EF56', TEST), true);
  assert.equal(await passwordMatches('ab12-cd34-ef57', TEST), false);
  assert.equal(await passwordMatches('', TEST), false);
  assert.equal(await passwordMatches('ab12-cd34-ef56', AUTHOR), false, 'тестовый пароль к настоящему отпечатку не подходит');
});

test('ключ автора для посредника: PBKDF2 со своей солью, не совпадает с отпечатком пароля', async () => {
  const key = await authorKey('AB12-cd34-ef56', TEST);
  assert.equal(key, pbkdf2Sync('ab12cd34ef56', Buffer.from(KEY_SALT, 'hex'), TEST.iterations, 32, 'sha256').toString('hex'));
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.notEqual(key, TEST.hash);
  assert.notEqual(KEY_SALT, AUTHOR.salt);
});

test('пять неверных попыток подряд — минута без входа; верная сбрасывает счётчик', () => {
  memory.clear();
  const now = 1_000_000;
  for (let i = 1; i < MAX_ATTEMPTS; i++) recordAttempt(false, now);
  assert.equal(lockedFor(now), 0, 'четыре ошибки — ещё можно');
  recordAttempt(true, now);
  for (let i = 1; i < MAX_ATTEMPTS; i++) recordAttempt(false, now);
  assert.equal(lockedFor(now), 0, 'после верного пароля счёт начинается заново');
  recordAttempt(false, now);
  assert.equal(lockedFor(now), LOCK_MS);
  assert.equal(lockedFor(now + LOCK_MS), 0);
});

test('вход и ключ автора запоминаются только для нынешнего отпечатка пароля; старый вход без пароля не действует', () => {
  memory.clear();
  assert.equal(adminState().unlocked, false);
  // Вход из прошлой версии игры: без пароля.
  memory.set('pdd-game:admin', JSON.stringify({ unlocked: true, selfIgnore: false }));
  assert.deepEqual(adminState(), { unlocked: false, key: '', selfIgnore: false });
  updateAdmin({ unlocked: true, key: 'd'.repeat(64) });
  assert.deepEqual(adminState(), { unlocked: true, key: 'd'.repeat(64), selfIgnore: false });
  assert.equal(JSON.parse(memory.get('pdd-game:admin')!).verified, verifierId(AUTHOR));
  updateAdmin({ selfIgnore: true });
  assert.equal(adminState().key, 'd'.repeat(64), 'ключ автора не теряется при других изменениях');
  // Пароль сменили — запомненный вход больше не действует.
  memory.set('pdd-game:admin', JSON.stringify({ unlocked: true, verified: 'другой-отпечаток', key: 'd'.repeat(64), selfIgnore: true }));
  assert.deepEqual(adminState(), { unlocked: false, key: '', selfIgnore: true }, 'без входа нет и ключа');
});
