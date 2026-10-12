/**
 * Дополнительные сюжеты (этап 17): данные, испытания, выборы и концовки.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { emptyProgress, sanitizeProgress } from '../src/progress/progress.ts';
import { buyTale, ownsTale, taleStateOf } from '../src/progress/taleProgress.ts';
import { THEMES } from '../src/situations/run.ts';
import type { Situation } from '../src/situations/types.ts';
import { plotLines, validatePlot } from '../src/story/plot.ts';
import { TALES } from '../src/story/taleData.ts';
import { emptyTale, finishTale, pickTrial, restartTale, sanitizeTales, taleContext, taleDecide } from '../src/story/tales.ts';

const SITUATIONS: Situation[] = [...JSON.parse(readFileSync('data/situations/s07-09.json', 'utf8')), ...JSON.parse(readFileSync('data/situations/s10-13.json', 'utf8'))];
const QUESTIONS: { id: string; topic: string }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const TOPICS = new Set(QUESTIONS.map((q) => q.topic));
const GENDERED = /(?<![а-яё])ты(\s+[а-яё]+){0,2}\s+[а-яё]{2,}(л|ла)(?![а-яё])/iu;

test('данные сюжетов: развилки и концовки без ошибок, 600–900 монет, 30–40 минут, темы и испытания существуют', () => {
  for (const tale of TALES) {
    const lines = tale.steps.flatMap((s) => s.lines);
    assert.deepEqual(validatePlot({ decisions: tale.decisions, givers: {} }, tale.endings, [tale.id], lines), [], tale.id);
    assert.ok(tale.price >= 600 && tale.price <= 900, tale.id);
    assert.ok(tale.minutes >= 30 && tale.minutes <= 40, tale.id);
    assert.ok(tale.endings.length >= 3, tale.id);
    for (const d of tale.decisions) assert.ok(tale.steps.some((s) => s.decision === d.id), `${d.id}: развилка есть в шагах`);
    let items = 0;
    for (const s of tale.steps) {
      if (s.decision) assert.ok(tale.decisions.some((d) => d.id === s.decision), s.decision);
      if (!s.trial) continue;
      for (const t of s.trial.topics) assert.ok(TOPICS.has(t), `${tale.id}: нет темы ${t}`);
      const pool = SITUATIONS.filter((x) => THEMES.filter((th) => s.trial!.themes.includes(th.id)).some((th) => th.match(x)));
      assert.ok(pool.length >= s.trial.situations, `${tale.id}/${s.title}: ситуаций в темах ${pool.length}`);
      items += s.trial.situations + s.trial.questions;
    }
    // 30–40 минут: около минуты на задание вместе с разбором, плюс сцены.
    assert.ok(items >= 25 && items <= 45, `${tale.id}: заданий ${items}`);
    for (const l of [...lines, ...plotLines({ decisions: tale.decisions, givers: {} }, tale.endings)]) assert.doesNotMatch(l.text, GENDERED, l.text);
  }
});

test('испытание: ситуации из тем шага без повторов, сначала свои ошибки из билетов, потом вопросы темы', () => {
  const trial = { situations: 4, questions: 3, themes: ['night' as const], topics: ['Световые приборы и звуковые сигналы'] };
  const memory = {
    'B01-Q01': { ok: true, review: { stage: 0, due: 1 }, miss: 1 },
    'B02-Q02': { ok: false, miss: 2 },
    'B03-Q03': { ok: true, miss: 1 },
  };
  let i = 0;
  const rnd = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
  const items = pickTrial(trial, SITUATIONS, QUESTIONS, memory, new Set(), rnd);
  assert.equal(items.length, 7);
  const qs = items.filter((x) => x.kind === 'question').map((x) => x.id);
  assert.deepEqual(new Set(qs), new Set(['B01-Q01', 'B02-Q02', 'B03-Q03']));
  for (const it of items.filter((x) => x.kind === 'situation')) assert.equal(SITUATIONS.find((s) => s.id === it.id)?.scene.time, 'night');
  assert.equal(items[0].kind, 'situation');
  // Уже встреченные в прохождении — в последнюю очередь; своих ошибок нет — вопросы темы.
  const used = new Set(items.map((x) => x.id));
  const again = pickTrial(trial, SITUATIONS, QUESTIONS, {}, used, rnd);
  for (const it of again.filter((x) => x.kind === 'question')) assert.equal(QUESTIONS.find((q) => q.id === it.id)?.topic, 'Световые приборы и звуковые сигналы');
  assert.ok(again.filter((x) => x.kind === 'situation').some((x) => !used.has(x.id)));
});

test('«Ночной рейс»: покупка, выборы, четыре концовки и прохождение заново', () => {
  const data = emptyProgress();
  data.coins = 599;
  assert.equal(buyTale(data, 'night'), 'no-coins');
  data.coins = 600;
  assert.equal(buyTale(data, 'night'), 'bought');
  assert.equal(buyTale(data, 'night'), 'owned');
  assert.ok(ownsTale(data, 'night'));
  assert.equal(data.coins, 0);

  const tale = TALES.find((t) => t.id === 'night')!;
  const play = (picks: Record<string, string>, right: number, total: number) => {
    const s = emptyTale();
    for (const [id, v] of Object.entries(picks)) assert.ok(taleDecide(s, tale, id, v, 1), id);
    s.right = right;
    s.total = total;
    return finishTale(s, tale, 5).ending.id;
  };
  assert.equal(play({ 'night.crash': 'help', 'night.hitch': 'stop' }, 26, 34), 'angel');
  assert.equal(play({ 'night.crash': 'help', 'night.hitch': 'stop' }, 10, 34), 'long');
  assert.equal(play({ 'night.rest': 'go', 'night.sleep': 'coffee' }, 34, 34), 'sleepy');
  assert.equal(play({ 'night.rest': 'nap', 'night.sleep': 'stop' }, 30, 34), 'dawn');
  assert.equal(taleDecide(emptyTale(), tale, 'night.rest', 'нет', 1), false);

  // Реплики с условиями: Семён помнит, выспался ли.
  const s = taleStateOf(data, 'night');
  taleDecide(s, tale, 'night.rest', 'nap', 1);
  assert.equal(taleContext(s, tale).decisions['night.rest'], 'nap');
  const first = finishTale(s, tale, 10);
  assert.ok(first.fresh);
  assert.equal(s.runs, 1);
  restartTale(s);
  assert.deepEqual({ step: s.step, choices: s.choices, right: s.right, total: s.total }, { step: 0, choices: [], right: 0, total: 0 });
  assert.equal(Object.keys(s.endings).length, 1);

  // Сохранение.
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back.tales, data.tales);
  assert.deepEqual(sanitizeTales({ night: { step: 1, right: 5, total: 3, runs: 0 } }), {});
});
