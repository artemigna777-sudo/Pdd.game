import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BACKUP_APP, backupFileName, makeBackup, parseBackup, restoreBackup } from '../src/backup.ts';
import { PAINTS, STICKERS, buyOrSelect, carLook } from '../src/progress/garage.ts';
import { COINS, XP, currentStreak, dayStart, emptyProgress, ensureDaily, markPoint, recordAnswer, sanitizeProgress } from '../src/progress/progress.ts';
import { readiness } from '../src/progress/readiness.ts';

const day = (n: number, hour = 10) => new Date(2026, 8, 28 + n, hour).getTime();
const QUESTIONS: { id: string; number: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));

test('монеты: за верный ответ, больше — за первый верный', () => {
  const data = emptyProgress();
  assert.equal(recordAnswer(data, 'A', true, day(0)).coins, COINS.first);
  assert.equal(recordAnswer(data, 'A', true, day(0)).coins, COINS.answer);
  assert.equal(recordAnswer(data, 'B', false, day(0)).coins, 0);
  assert.equal(data.coins, COINS.first + COINS.answer);
});

test('цель дня: повторы, если они есть; иначе точки; выполнена — монеты и серия', () => {
  const data = emptyProgress();
  // Нет повторов — цель «3 точки».
  assert.deepEqual([ensureDaily(data, day(0)).kind, data.daily!.target], ['points', 3]);
  markPoint(data, 'ch1', 'p1', day(0));
  markPoint(data, 'ch1', 'p2', day(0));
  const coins = data.coins;
  const out = markPoint(data, 'ch1', 'p3', day(0));
  assert.equal(out.goal?.done, true);
  assert.equal(data.coins, coins + COINS.goal);
  assert.equal(currentStreak(data, day(0)), 1);

  // Ошибки вчера — сегодня цель «повторить».
  for (const id of ['Q1', 'Q2', 'Q3']) recordAnswer(data, id, false, day(0, 20));
  assert.deepEqual([ensureDaily(data, day(1)).kind, data.daily!.target], ['review', 3]);
  recordAnswer(data, 'Q1', true, day(1));
  recordAnswer(data, 'Q2', false, day(1)); // ошибка на повторе тоже считается повтором
  assert.equal(recordAnswer(data, 'Q3', true, day(1)).goal?.done, true);
  assert.equal(currentStreak(data, day(1)), 2);

  // Пропущенный день обрывает серию; лучшая серия запоминается.
  assert.equal(currentStreak(data, day(3)), 0);
  ensureDaily(data, day(3));
  data.daily!.count = data.daily!.target - 1;
  data.daily!.kind = 'correct';
  recordAnswer(data, 'Z', true, day(3));
  assert.deepEqual([data.streak.count, data.streak.best], [1, 2]);
});

test('гараж: покупка за монеты, выбор, нехватка монет', () => {
  const data = emptyProgress();
  assert.equal(carLook(data).color, PAINTS[0].color);
  assert.equal(buyOrSelect(data, 'red'), 'no-coins');
  data.coins = 100;
  assert.equal(buyOrSelect(data, 'red'), 'bought');
  assert.equal(data.coins, 40);
  assert.equal(buyOrSelect(data, 'yellow'), 'selected');
  assert.equal(buyOrSelect(data, 'red'), 'selected');
  assert.equal(data.coins, 40, 'купленное второй раз не оплачивается');
  data.coins = 500;
  assert.equal(buyOrSelect(data, 'flames'), 'bought');
  assert.deepEqual(carLook(data), { color: PAINTS.find((p) => p.id === 'red')!.color, sticker: 'flames' });
  assert.equal(buyOrSelect(data, 'нет-такого'), 'unknown');
  assert.equal(STICKERS[0].price, 0);
  // Сохранённые данные: выбранное должно быть куплено.
  const clean = sanitizeProgress({ ...data, garage: { paint: 'black', sticker: 'flames', owned: ['flames'] } });
  assert.deepEqual([clean.garage.paint, clean.garage.sticker], ['yellow', 'flames']);
});

test('готовность к экзамену: освоенные вопросы, слабый блок, экзамены', () => {
  const data = emptyProgress();
  const empty = readiness(data, QUESTIONS, [], day(0));
  assert.equal(empty.percent, 0);
  assert.equal(empty.tips[0].action, 'story');
  for (const q of QUESTIONS) data.questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  assert.equal(readiness(data, QUESTIONS, [], day(0)).percent, 80);
  const five = Array.from({ length: 5 }, () => ({ passed: true }));
  assert.equal(readiness(data, QUESTIONS, five, day(0)).percent, 100);
  // Ошибки в блоке вопросов 11–15 делают его самым слабым.
  for (const q of QUESTIONS.filter((x) => x.number >= 11 && x.number <= 15).slice(0, 100)) data.questions[q.id] = { n: 2, ok: false, ever: true, at: 1, review: { stage: 0, due: day(0) } };
  const r = readiness(data, QUESTIONS, five, day(0));
  assert.equal(r.weakest, 2);
  assert.ok(r.percent < 90);
  assert.equal(r.tips[0].action, 'review');
  assert.ok(r.tips.some((t) => t.action === 'block' && t.block === 2));
});

test('резервная копия: сохранение, проверка, восстановление', () => {
  const store = new Map<string, unknown>([
    ['pdd-game:progress', { xp: 50, coins: 7, questions: { A: { n: 1, ok: true, ever: true, at: 1 } } }],
    ['pdd-game:settings', { control: 'joystick' }],
  ]);
  const backup = makeBackup((k) => store.get(k) ?? null, day(0));
  assert.equal(backup.app, BACKUP_APP);
  assert.equal((backup.data['pdd-game:progress'] as { coins: number }).coins, 7);
  assert.equal('pdd-game:exam-history' in backup.data, false);

  const parsed = parseBackup(JSON.stringify(backup));
  const target = new Map<string, unknown>([['pdd-game:exam-history', [1, 2]]]);
  assert.equal(restoreBackup(parsed, (k, v) => target.set(k, v)), true);
  assert.equal((target.get('pdd-game:progress') as { xp: number }).xp, 50);
  assert.equal(target.get('pdd-game:exam-history'), null, 'чего нет в копии — очищается');

  assert.throws(() => parseBackup('не json'), /не файл резервной копии/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'другое', data: {} })), /не файл резервной копии/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 99 })), /более новой версией/);
  assert.equal(backupFileName(day(0)), 'kurier-pdd-2026-09-28.json');
  assert.equal(dayStart(day(0)) <= day(0), true);
  assert.ok(XP.first > 0);
});
