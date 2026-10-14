/**
 * Этап 18: анимированные сцены сюжета. Каждая сцена — лёгкий SVG без id и ссылок, все шаги
 * анимации находят свои элементы, а сюжет ссылается только на существующие сцены.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FILM_IDS, FILMS } from '../src/story/films.ts';
import { hasFilm, plotContext, plotLines, replayLines } from '../src/story/plot.ts';
import type { Line } from '../src/story/story.ts';
import { DECISIONS, ENDINGS, PLOT } from '../src/story/turbo.ts';

test('сцены: SVG без id, ссылок и скриптов, лёгкие; шаги находят элементы; не длиннее 10 секунд', () => {
  for (const id of FILM_IDS) {
    const f = FILMS[id];
    assert.match(f.svg, /^<svg viewBox="0 0 360 200"[^>]*>.*<\/svg>$/s, id);
    assert.doesNotMatch(f.svg, /\sid=|href|<script|url\(/, `${id}: без id, ссылок и скриптов`);
    const open = (f.svg.match(/<(svg|g)[\s>]/g) ?? []).length;
    const close = (f.svg.match(/<\/(svg|g)>/g) ?? []).length;
    assert.equal(open, close, `${id}: теги закрыты`);
    assert.ok(f.svg.length < 40_000, `${id}: сцена лёгкая (${f.svg.length} символов)`);
    assert.ok(f.title.length > 10, `${id}: описание для экранного диктора`);
    const classes = new Set([...f.svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    for (const s of f.steps) {
      assert.match(s.sel, /^\.[a-z0-9-]+$/, `${id}: шаг по классу`);
      assert.ok(classes.has(s.sel.slice(1)), `${id}: нет элемента ${s.sel}`);
      assert.ok(s.dur > 0 && s.at >= 0, `${id}: время шага ${s.sel}`);
      assert.ok(s.kf.length >= 2, `${id}: у шага ${s.sel} начало и конец`);
      if (s.times !== Infinity) assert.ok(s.at + s.dur * (s.times ?? 1) <= 10, `${id}: шаг ${s.sel} кончается за 10 с`);
    }
    for (const snd of f.sounds ?? []) assert.ok(snd.at >= 0 && snd.at <= 10, `${id}: звук ${snd.name}`);
  }
});

test('большая развилка главы 3: сцена разговора, сцена выбора и своя сцена у каждого варианта', () => {
  const d = DECISIONS.find((x) => x.id === 'ch3.artem')!;
  assert.equal(d.lines[0].film, 'ch3-offer');
  // Вопрос Артёма зависит от главы 2 — сцена выбора есть у каждого варианта вопроса.
  const asks = d.lines.filter((l) => l.if && l.text.includes('?') && !l.text.startsWith('Можно'));
  assert.equal(asks.length, 4);
  for (const l of asks) assert.equal(l.film, 'ch3-choice', l.text);
  assert.deepEqual(
    d.options.map((o) => [o.value, o.reply?.[0].film]),
    [
      ['stay', 'ch3-stay'],
      ['study', 'ch3-study'],
      ['free', 'ch3-free'],
    ],
  );
});

test('сюжет ссылается только на существующие сцены', () => {
  const films = (lines: readonly Line[]): string[] => lines.flatMap((l) => [...(l.film ? [l.film] : []), ...(l.choices ?? []).flatMap((c) => films(c.reply ?? []))]);
  const used = films(plotLines(PLOT, ENDINGS));
  assert.ok(used.length >= 6);
  for (const f of used) assert.ok((FILM_IDS as string[]).includes(f), `нет сцены ${f}`);
  // Каждая сцена где-то используется.
  for (const id of FILM_IDS) assert.ok(used.includes(id), `сцена ${id} нигде не показывается`);
});

test('пересмотр развилки: реплики без кнопок и ответ на сделанный выбор', () => {
  const d = DECISIONS.find((x) => x.id === 'ch3.artem')!;
  assert.ok(hasFilm(d));
  assert.ok(!hasFilm(DECISIONS.find((x) => x.id === 'ch1.card')!));
  const ctx = plotContext({ choices: [{ id: 'ch2.cover', value: 'cover', at: 1 }, { id: 'ch3.artem', value: 'study', at: 2 }], endings: {}, rewinds: 0 }, [], PLOT);
  const lines = replayLines(d, 'study', ctx);
  assert.equal(lines[0].film, 'ch3-offer');
  assert.ok(lines.every((l) => !l.choices && !l.if));
  assert.ok(lines.some((l) => l.text === 'Я не знаю, что делать. Что посоветуешь?' && l.film === 'ch3-choice'));
  assert.equal(lines.filter((l) => l.film === 'ch3-choice').length, 1);
  assert.equal(lines.at(-1)?.text, 'Беру обоих учеников. Бесплатно.');
});
