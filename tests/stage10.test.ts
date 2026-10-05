import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { makeBackup, parseBackup } from '../src/backup.ts';
import type { Question } from '../src/data/types.ts';
import {
  DUEL,
  cleanName,
  decodeDuel,
  duelFromHash,
  duelLink,
  duelScore,
  duelTime,
  duelWinner,
  encodeDuel,
  hashHasDuel,
  newDuelId,
  pickDuelQuestions,
  questionId,
  questionIndex,
  resolveDuel,
  type DuelPayload,
} from '../src/duel/duel.ts';
import { allDuels, duelStats, findDuel, resetDuelCache, sanitizeDuels, saveAnswerToMine, saveChallenge, saveReply } from '../src/duel/duelHistory.ts';

const QUESTIONS: Question[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const IDS = QUESTIONS.map((q) => q.id);

/** Генератор случайных чисел с зерном — чтобы тесты были повторяемыми. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

/** Дуэль на первых 10 вопросах билета: `right` верных ответов у автора. */
function challenge(right = 7, ms = 95_000, name = 'Артём'): DuelPayload {
  const q = IDS.slice(40, 40 + DUEL.questions);
  const answers = q.map((id, i) => {
    const qq = BY_ID.get(id)!;
    return i < right ? qq.correct : (qq.correct + 1) % qq.options.length;
  });
  return { id: 'abc12345', at: 1_790_000_000_000, q, from: { name, answers, ms } };
}

test('номер вопроса в ссылке: все 800 вопросов туда и обратно', () => {
  assert.equal(questionIndex('B01-Q01'), 0);
  assert.equal(questionIndex('B40-Q20'), 799);
  for (const id of IDS) assert.equal(questionId(questionIndex(id)), id);
  assert.throws(() => questionIndex('X'), /Неизвестный вопрос/);
});

test('ссылка: вызов и ответ шифруются и разбираются без потерь, ссылка короткая', () => {
  const p = challenge();
  const back = decodeDuel(encodeDuel(p));
  assert.deepEqual(back, p);

  const reply: DuelPayload = { ...p, to: { name: 'Маша Иванова', answers: p.from.answers.map(() => 0), ms: 61_234 } };
  assert.deepEqual(decodeDuel(encodeDuel(reply)), reply);

  const link = duelLink('https://artemigna777-sudo.github.io/Pdd.game/#старое', reply);
  assert.match(link, /^https:\/\/artemigna777-sudo\.github\.io\/Pdd\.game\/#duel=[A-Za-z0-9_-]+$/);
  // Ссылка помещается в QR-код и в сообщение мессенджера.
  assert.ok(link.length < 400, `длина ссылки ${link.length}`);
  assert.deepEqual(duelFromHash(new URL(link).hash), reply);
  assert.equal(hashHasDuel('#duel=xyz'), true);
  assert.equal(hashHasDuel('#other'), false);
});

test('ссылка: испорченная или чужая не открывается', () => {
  const good = encodeDuel(challenge());
  const wire = (patch: Record<string, unknown>) => {
    const w = JSON.parse(Buffer.from(good, 'base64url').toString('utf8'));
    return Buffer.from(JSON.stringify({ ...w, ...patch }), 'utf8').toString('base64url');
  };
  for (const bad of [
    '',
    'не-base64!',
    good.slice(0, 20),
    Buffer.from('просто текст').toString('base64url'),
    Buffer.from('[1,2,3]').toString('base64url'),
    wire({ v: 2 }),
    wire({ i: 'ID С ПРОБЕЛАМИ' }),
    wire({ t: -5 }),
    wire({ q: [1, 2, 3] }),
    wire({ q: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9] }),
    wire({ f: ['', '0000000000', 1000] }),
    wire({ f: ['Артём', '000', 1000] }),
    wire({ f: ['Артём', '000000000x', 1000] }),
    wire({ f: ['Артём', '0000000000', -1] }),
    wire({ f: ['Артём', '0000000000', DUEL.maxMs + 1] }),
    wire({ r: ['Маша'] }),
  ]) {
    assert.equal(decodeDuel(bad), undefined, `открылась испорченная ссылка ${bad.slice(0, 30)}`);
  }
  assert.equal(duelFromHash('#duel=' + good + '&x'), undefined);

  // Вопроса нет в базе или вариант ответа не существует — дуэль не открывается.
  const p = challenge();
  assert.ok(resolveDuel(p, BY_ID));
  assert.equal(resolveDuel({ ...p, q: [...p.q.slice(0, 9), 'B99-Q01'] }, BY_ID), undefined);
  const twoOptions = QUESTIONS.find((q) => q.options.length === 2)!;
  const q = [twoOptions.id, ...p.q.slice(1)];
  assert.equal(resolveDuel({ ...p, q, from: { ...p.from, answers: [3, ...p.from.answers.slice(1)] } }, BY_ID), undefined);
});

test('имя: без переносов и лишних пробелов, не длиннее 20 символов', () => {
  assert.equal(cleanName('  Маша \n Иванова  '), 'Маша Иванова');
  assert.equal(cleanName('А'.repeat(30)), 'А'.repeat(DUEL.nameMax));
  assert.equal(cleanName('😀'.repeat(25)), '😀'.repeat(DUEL.nameMax));
  assert.equal(cleanName('\t\n'), '');
  // Имя из ссылки тоже чистится.
  const p = challenge(7, 1000, 'Очень-очень длинное имя игрока');
  assert.equal(decodeDuel(encodeDuel(p))!.from.name, 'Очень-очень длинное');
});

test('вопросы дуэли: 10 разных из базы; идентификатор дуэли', () => {
  const rnd = seeded(7);
  for (let i = 0; i < 50; i++) {
    const q = pickDuelQuestions(IDS, rnd);
    assert.equal(q.length, DUEL.questions);
    assert.equal(new Set(q).size, q.length);
    assert.ok(q.every((id) => BY_ID.has(id)));
  }
  assert.equal(pickDuelQuestions(['a', 'b'], rnd).length, 2);
  assert.match(newDuelId(seeded(3)), /^[0-9a-z]{8}$/);
  assert.notEqual(newDuelId(seeded(3)), newDuelId(seeded(4)));
});

test('победитель: больше верных, при равенстве — быстрее, разница меньше секунды — ничья', () => {
  const qs = challenge().q.map((id) => BY_ID.get(id)!);
  const a = challenge(8, 120_000).from;
  const b = challenge(7, 30_000).from;
  assert.equal(duelScore(a, qs), 8);
  assert.equal(duelWinner(a, b, qs), 'a');
  assert.equal(duelWinner(b, a, qs), 'b');
  const fast = challenge(7, 60_000).from;
  const slow = challenge(7, 61_000).from;
  assert.equal(duelWinner(fast, slow, qs), 'a');
  assert.equal(duelWinner(fast, { ...slow, ms: 60_999 }, qs), 'draw');
  assert.equal(duelTime(133_400), '2:13');
  assert.equal(duelTime(3_725_000), '1 ч 2 мин');
});

test('история: вызов, ответ на чужой вызов, ответ на мой вызов, счёт', () => {
  resetDuelCache();
  const p = challenge(6, 100_000);
  saveChallenge(p, 1);
  assert.equal(findDuel(p.id, 'from')?.them, undefined);

  // Друг ответил: его ссылка несёт оба результата.
  const reply = { ...p, to: challenge(9, 80_000, 'Маша').from };
  const mine = saveAnswerToMine(reply, 2);
  assert.deepEqual(mine.me, p.from);
  assert.deepEqual(mine.them, reply.to);

  // Мой ответ на чужой вызов.
  const other = { ...challenge(5, 50_000, 'Семён'), id: 'zzz99999' };
  saveReply({ ...other, to: challenge(5, 49_500, 'Я').from }, 3); // полсекунды разницы — ничья
  const r = findDuel('zzz99999', 'to')!;
  assert.equal(r.me.name, 'Я');
  assert.equal(r.them?.name, 'Семён');

  // Ещё один мой вызов без ответа.
  saveChallenge({ ...challenge(), id: 'wait0001' }, 4);
  assert.equal(allDuels().length, 3);
  assert.deepEqual(duelStats(allDuels(), BY_ID), { wins: 0, losses: 1, draws: 1, waiting: 1 });

  // Ответная ссылка на вызов, которого нет на этом телефоне (другое хранилище), — тоже моя дуэль.
  const lost = { ...challenge(10, 1000, 'Я с другого телефона'), id: 'lost0001', to: challenge(1, 1000, 'Друг').from };
  assert.equal(saveAnswerToMine(lost, 5).me.name, 'Я с другого телефона');
  assert.equal(duelStats(allDuels(), BY_ID).wins, 1);
  resetDuelCache();
});

test('история: проверка сохранённых данных и резервная копия', () => {
  const p = challenge();
  const good = { id: p.id, at: 1, updated: 2, role: 'from', q: p.q, me: p.from };
  const clean = sanitizeDuels([
    good,
    { ...good }, // дубль
    { ...good, id: 'other001', role: 'to', them: { name: 'Маша', answers: p.from.answers, ms: 5 } },
    { ...good, id: 'bad', role: 'from' },
    { ...good, id: 'bad00001', role: 'x' },
    { ...good, id: 'bad00002', q: p.q.slice(1) },
    { ...good, id: 'bad00003', me: { name: '', answers: p.from.answers, ms: 1 } },
    { ...good, id: 'bad00004', them: { name: 'Маша', answers: [1], ms: 1 } },
    null,
    'строка',
  ]);
  assert.deepEqual(
    clean.map((d) => d.id),
    [p.id, 'other001'],
  );
  assert.deepEqual(sanitizeDuels('не массив'), []);
  assert.equal(sanitizeDuels(Array.from({ length: 150 }, (_, i) => ({ ...good, id: `id${String(i).padStart(6, '0')}`, updated: i }))).length, 100);

  // Дуэли попадают в резервную копию и проверяются при восстановлении.
  const store = new Map<string, unknown>([['pdd-game:duels', [good, { id: 'испорчено' }]]]);
  const backup = makeBackup((k) => store.get(k) ?? null, 1);
  assert.equal((backup.data['pdd-game:duels'] as unknown[]).length, 1);
  assert.equal((parseBackup(JSON.stringify(backup)).data['pdd-game:duels'] as unknown[]).length, 1);
});
