import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Question } from '../src/data/types.ts';
import type { Situation } from '../src/situations/types.ts';
import { validateSituations } from '../src/situations/validate.ts';

const QUESTIONS: Question[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const IDS = new Set(QUESTIONS.map((q) => q.id));
const LIST: Situation[] = readdirSync('data/situations')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(`data/situations/${f}`, 'utf8')));

test('ситуации: данные без ошибок, у каждой — ссылка на правила', () => {
  assert.ok(LIST.length >= 73);
  assert.deepEqual(validateSituations(LIST, IDS), []);
});

test('ситуации: проверка ловит ошибки', () => {
  const good = LIST[0];
  const bad = (patch: Partial<Situation>) => validateSituations([{ ...good, ...patch }], IDS);
  assert.match(bad({ correct: 5 }).join(), /вне вариантов/);
  assert.match(bad({ rules: [] }).join(), /нет ссылки/);
  assert.match(bad({ rules: ['где-то в правилах'] }).join(), /непонятная ссылка/);
  assert.match(bad({ related: ['B99-Q99'] }).join(), /нет в базе/);
  assert.match(bad({ scene: { ...good.scene, items: ['ufo'] } }).join(), /незнакомый предмет/);
  assert.match(bad({ section: 8 }).join(), /не совпадает/);
  assert.match(validateSituations([good, good], IDS).join(), /повторяющийся id/);
});

test('ситуации: правильный ответ не всегда на одном месте', () => {
  const places = new Set(LIST.map((s) => s.correct));
  assert.ok(places.size >= 3, 'правильные ответы стоят на одном и том же месте');
});

test('ситуации: правильный ответ не угадать по длине', () => {
  // Если верный вариант почти всегда самый длинный (или самый короткий), игрок научится угадывать.
  const rank = (s: Situation) => [...s.options].sort((a, b) => a.length - b.length).indexOf(s.options[s.correct]);
  const longest = LIST.filter((s) => rank(s) === s.options.length - 1).length;
  const shortest = LIST.filter((s) => rank(s) === 0).length;
  assert.ok(longest / LIST.length < 0.45, `верный ответ самый длинный в ${longest} из ${LIST.length}`);
  assert.ok(shortest / LIST.length < 0.45, `верный ответ самый короткий в ${shortest} из ${LIST.length}`);
});

test('ситуации: все семь разделов запроса', () => {
  assert.deepEqual([...new Set(LIST.map((s) => s.section))].sort((a, b) => a - b), [7, 8, 9, 10, 11, 12, 13]);
});
