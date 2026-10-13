/**
 * Дуэль в реальном времени (этап 16): правила комнаты у посредника и подсчёт раундов в игре.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIVE, isSituationId, liveCode, liveLink, liveScore, liveVerdict, parseLiveCode, pickLiveItems, roundWinner } from '../src/duel/live.ts';
// @ts-expect-error — обычный JS-модуль посредника без типов.
import { RoomCore } from '../stats-worker/room.js';

type Out = [number | 'all', { t: string; [k: string]: unknown }][];

test('код комнаты и ссылка: 5 знаков без похожих букв, код находится в ссылке и в сообщении', () => {
  let i = 0;
  const code = liveCode(() => (i++ % 7) / 7);
  assert.match(code, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(parseLiveCode(code.toLowerCase()), code);
  assert.equal(parseLiveCode(`Го дуэль! ${liveLink('https://x.io/Pdd.game/#menu', code)} жду`), code);
  assert.equal(liveLink('https://x.io/Pdd.game/', 'ABCDE'), 'https://x.io/Pdd.game/#live=ABCDE');
  assert.equal(parseLiveCode('AB'), undefined);
  assert.equal(parseLiveCode('ABCD0'), undefined);
});

test('задания: вперемешку — ситуации и вопросы через одно, без провокаций; разные', () => {
  const sits = ['S07-01', 'S07-02', 'S07-03', 'S08-01', 'S08-02', 'P-01', 'P-02', 'S09-01'];
  const qs = Array.from({ length: 20 }, (_, k) => `B01-Q${String(k + 1).padStart(2, '0')}`);
  const mix = pickLiveItems('mix', sits, qs);
  assert.equal(mix.length, LIVE.rounds);
  assert.deepEqual(
    mix.map(isSituationId),
    [true, false, true, false, true, false, true],
  );
  assert.ok(!mix.some((x) => x.startsWith('P-')));
  assert.equal(new Set(mix).size, mix.length);
  assert.ok(pickLiveItems('situations', sits, qs).every(isSituationId));
  assert.ok(pickLiveItems('tickets', sits, qs).every((x) => x.startsWith('B')));
});

test('раунд: верно и быстрее; один верно — он; оба ошиблись — никто; почти одновременно — ничья', () => {
  assert.equal(roundWinner([{ choice: 1, ms: 3000 }, { choice: 1, ms: 2000 }], 1), 1);
  assert.equal(roundWinner([{ choice: 1, ms: 3000 }, { choice: 0, ms: 1000 }], 1), 0);
  assert.equal(roundWinner([{ choice: null, ms: 12000 }, { choice: 1, ms: 9000 }], 1), 1);
  assert.equal(roundWinner([{ choice: 0, ms: 3000 }, { choice: 2, ms: 2000 }], 1), 'none');
  assert.equal(roundWinner([{ choice: 1, ms: 3000 }, { choice: 1, ms: 3050 }], 1), 'draw');
  const score = liveScore([0, 1, 0, 'draw', 'none', 0, 1]);
  assert.deepEqual(score, [3, 2]);
  assert.equal(liveVerdict(score, 0), 'win');
  assert.equal(liveVerdict(score, 1), 'loss');
  assert.equal(liveVerdict([2, 2], 1), 'draw');
});

test('комната посредника: двое, задания от создателя, раунды, ответы, конец', () => {
  const room = new RoomCore();
  const a = room.join();
  const b = room.join();
  assert.deepEqual([a, b], [0, 1]);
  assert.equal(room.join(), undefined, 'третьего не пускает');

  let out: Out = room.message(0, { t: 'hello', name: '  Маша  ' });
  assert.deepEqual(out, [
    [0, { t: 'joined', seat: 0, names: ['Маша', ''] }],
    [1, { t: 'joined', seat: 1, names: ['Маша', ''] }],
  ]);
  // Задания раньше, чем соперник представился, — нельзя.
  assert.deepEqual(room.message(0, { t: 'setup', items: ['S07-01'] }), [[0, { t: 'error', e: 'alone' }]]);
  room.message(1, { t: 'hello', name: 'Артём' });
  assert.deepEqual(room.message(1, { t: 'setup', items: ['S07-01'] }), [[1, { t: 'error', e: 'setup' }]], 'задания даёт только создатель');
  assert.deepEqual(room.message(0, { t: 'setup', items: ['S07-01', 'S07-01'] }), [[0, { t: 'error', e: 'items' }]]);
  assert.deepEqual(room.message(0, { t: 'setup', items: ['<script>'] }), [[0, { t: 'error', e: 'items' }]]);

  out = room.message(0, { t: 'setup', items: ['S07-01', 'B01-Q01'] });
  assert.deepEqual(out, [
    ['all', { t: 'start', items: ['S07-01', 'B01-Q01'], names: ['Маша', 'Артём'] }],
    ['all', { t: 'round', i: 0 }],
  ]);
  // Ответ: сопернику — «уже ответил», когда ответили оба — открыть ответы.
  assert.deepEqual(room.message(1, { t: 'answer', i: 0, choice: 2, ms: 1500 }), [[0, { t: 'answered', i: 0 }]]);
  assert.deepEqual(room.message(1, { t: 'answer', i: 0, choice: 1, ms: 1000 }), [[1, { t: 'error', e: 'answer' }]], 'второй ответ не принимается');
  assert.deepEqual(room.message(0, { t: 'answer', i: 0, choice: 7.5, ms: 1 }), [[0, { t: 'error', e: 'answer' }]]);
  out = room.message(0, { t: 'answer', i: 0, choice: null, ms: 12000 });
  assert.deepEqual(out[1], ['all', { t: 'reveal', i: 0, answers: [{ choice: null, ms: 12000 }, { choice: 2, ms: 1500 }] }]);
  // Следующий раунд — когда оба готовы.
  assert.deepEqual(room.message(0, { t: 'next', i: 0 }), []);
  assert.deepEqual(room.message(1, { t: 'next', i: 0 }), [['all', { t: 'round', i: 1 }]]);
  room.message(0, { t: 'answer', i: 1, choice: 0, ms: 900 });
  room.message(1, { t: 'answer', i: 1, choice: 0, ms: 800 });
  room.message(0, { t: 'next', i: 1 });
  assert.deepEqual(room.message(1, { t: 'next', i: 1 }), [['all', { t: 'end' }]]);
  assert.equal(room.join(), undefined, 'после конца в комнату не войти');
});

test('комната: ушёл до начала — место свободно; ушёл посреди дуэли — сопернику «вышел»', () => {
  const room = new RoomCore();
  room.join();
  room.message(0, { t: 'hello', name: 'Маша' });
  assert.deepEqual(room.leave(0), []);
  assert.equal(room.join(), 0, 'место создателя снова свободно');
  room.message(0, { t: 'hello', name: 'Оля' });
  room.join();
  room.message(1, { t: 'hello', name: 'Артём' });
  room.message(0, { t: 'setup', items: ['B01-Q01'] });
  assert.deepEqual(room.leave(1), [[0, { t: 'left', seat: 1 }]]);
  assert.equal(room.join(), undefined);
  assert.deepEqual(room.message(0, { t: 'what' }), [[0, { t: 'error', e: 'bad' }]]);
  assert.deepEqual(room.message(0, null), [[0, { t: 'error', e: 'bad' }]]);
});

test('посредник: комната дуэли только для страниц игры и по WebSocket', async () => {
  const { default: worker } = await import('../stats-worker/worker.js');
  const req = (headers: Record<string, string>) => new Request('https://w.dev/live/ABCDE', { headers });
  assert.equal((await worker.fetch(req({ Origin: 'https://evil.example', Upgrade: 'websocket' }), {})).status, 403);
  assert.equal((await worker.fetch(req({ Origin: 'https://artemigna777-sudo.github.io' }), {})).status, 426);
  assert.equal((await worker.fetch(req({ Origin: 'https://artemigna777-sudo.github.io', Upgrade: 'websocket' }), {})).status, 503);
  let routed = '';
  const env = { LIVE: { idFromName: (n: string) => `id:${n}`, get: (id: unknown) => ({ fetch: async () => ((routed = String(id)), new Response('ok')) }) } };
  await worker.fetch(req({ Origin: 'https://artemigna777-sudo.github.io', Upgrade: 'websocket' }), env);
  assert.equal(routed, 'id:ABCDE');
});
