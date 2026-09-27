import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HISTORY_LIMIT,
  allAttempts,
  attemptsOfTicket,
  findAttempt,
  recordAttempt,
  sanitizeAttempts,
  summarize,
  type TicketAttempt,
} from '../src/data/ticketHistory.ts';
import { dayLabel, durationLabel, mistakesText, plural, toneOf } from '../src/ui/format.ts';

const attempt = (ticket: number, at: number, correct = 18): TicketAttempt => ({
  ticket,
  at,
  ms: 300_000,
  answers: Array.from({ length: 20 }, () => 0),
  correct,
});

test('из сохранённых данных остаются только корректные попытки, по времени', () => {
  const good = [attempt(3, 200), attempt(1, 100)];
  const raw = [
    ...good,
    null,
    'мусор',
    { ...attempt(2, 1), ticket: 0 },
    { ...attempt(2, 2), answers: [] },
    { ...attempt(2, 3), answers: [0, -1] },
    { ...attempt(2, 4), correct: 21 },
    { ...attempt(2, 5), ms: 1.5 },
    { ...attempt(2, 6), extra: 'лишнее поле' },
  ];
  const clean = sanitizeAttempts(raw);
  assert.deepEqual(
    clean.map((a) => a.at),
    [6, 100, 200],
  );
  assert.equal('extra' in clean[0], false);
  assert.deepEqual(sanitizeAttempts({ not: 'array' }), []);
  assert.deepEqual(sanitizeAttempts(undefined), []);
});

test('сводка: число пройденных билетов и последняя попытка каждого', () => {
  const list = [attempt(1, 100, 15), attempt(2, 150, 20), attempt(1, 300, 19), attempt(1, 200, 12)];
  const { tickets, last } = summarize(list);
  assert.equal(tickets, 2);
  assert.equal(last.get(1)?.correct, 19);
  assert.equal(last.get(2)?.correct, 20);
  assert.deepEqual(
    attemptsOfTicket(list, 1).map((a) => a.at),
    [100, 200, 300],
  );
});

test('попытки записываются с уникальным временем и не больше предела', () => {
  // В node localStorage нет: история живёт в памяти, как в приватном режиме браузера.
  const first = recordAttempt(attempt(5, 1000));
  const second = recordAttempt(attempt(5, 1000));
  assert.equal(first.at, 1000);
  assert.equal(second.at, 1001);
  assert.equal(findAttempt(1001)?.ticket, 5);
  for (let i = 0; i < HISTORY_LIMIT; i++) recordAttempt(attempt(1, 2000 + i));
  assert.equal(allAttempts().length, HISTORY_LIMIT);
  assert.equal(findAttempt(1000), undefined, 'самая старая попытка удалена');
});

test('подписи: склонение, ошибки, оценка, длительность, день', () => {
  assert.deepEqual(
    [1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => plural(n, ['попытка', 'попытки', 'попыток'])),
    ['попытка', 'попытки', 'попыток', 'попыток', 'попыток', 'попытка', 'попытки', 'попыток', 'попыток'],
  );
  assert.equal(mistakesText(0), 'без ошибок');
  assert.equal(mistakesText(1), '1 ошибка');
  assert.equal(mistakesText(3), '3 ошибки');
  assert.equal(mistakesText(5), '5 ошибок');
  assert.deepEqual([0, 1, 2, 3, 20].map(toneOf), ['ok', 'warn', 'warn', 'bad', 'bad']);
  assert.equal(durationLabel(20_000), 'меньше минуты');
  assert.equal(durationLabel(6 * 60_000 + 10_000), '6 мин');
  assert.equal(durationLabel(65 * 60_000), '1 ч 5 мин');
  assert.equal(durationLabel(120 * 60_000), '2 ч');

  const now = new Date(2026, 8, 27, 10, 0).getTime();
  assert.equal(dayLabel(new Date(2026, 8, 27, 0, 5).getTime(), now), 'Сегодня');
  assert.equal(dayLabel(new Date(2026, 8, 26, 23, 55).getTime(), now), 'Вчера');
  assert.equal(dayLabel(new Date(2026, 8, 25, 12, 0).getTime(), now), '25 сентября');
  assert.match(dayLabel(new Date(2025, 11, 31, 12, 0).getTime(), now), /^31 декабря 2025/);
});
