/**
 * Этап 18: кат-сцены сюжета. Каждая сцена — разметка без скриптов и ссылок, её картинки лежат в
 * public/scenes и лёгкие, все шаги анимации находят свои элементы, а сюжет ссылается только на
 * существующие сцены.
 */
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { FILM_IDS, FILMS } from '../src/story/films.ts';
import { hasFilm, plotContext, plotLines, replayLines } from '../src/story/plot.ts';
import type { Line } from '../src/story/story.ts';
import { DECISIONS, ENDINGS, PLOT } from '../src/story/turbo.ts';

test('сцены: без скриптов и ссылок, картинки на месте и лёгкие, шаги находят элементы, не длиннее 10 секунд', () => {
  for (const id of FILM_IDS) {
    const f = FILMS[id];
    assert.doesNotMatch(f.html, /\sid=|href|<script|\son[a-z]+=/, `${id}: без id, ссылок и скриптов`);
    const open = (f.html.match(/<div[\s>]/g) ?? []).length;
    const close = (f.html.match(/<\/div>/g) ?? []).length;
    assert.equal(open, close, `${id}: теги закрыты`);
    assert.ok(f.title.length > 20, `${id}: описание для экранного диктора`);
    // Картинки — только свои, из public/scenes, и все заранее загружаются.
    const srcs = [...f.html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(srcs.length > 0, `${id}: есть кадры`);
    for (const src of srcs) {
      assert.match(src, /^\/scenes\/ch\d+\/[a-z0-9-]+\.webp$/, `${id}: ${src}`);
      const file = `public${src}`;
      assert.ok(existsSync(file), `${id}: нет файла ${file}`);
      assert.ok(statSync(file).size < 300_000, `${id}: ${file} тяжелее 300 КБ`);
      assert.ok(f.images.includes(src), `${id}: ${src} не загружается заранее`);
    }
    const classes = new Set([...f.html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    for (const s of f.steps) {
      assert.match(s.sel, /^\.[a-z0-9-]+$/, `${id}: шаг по классу`);
      assert.ok(classes.has(s.sel.slice(1)), `${id}: нет элемента ${s.sel}`);
      assert.ok(s.dur > 0 && s.at >= 0, `${id}: время шага ${s.sel}`);
      assert.ok(s.kf.length >= 2, `${id}: у шага ${s.sel} начало и конец`);
      if (s.times !== Infinity) assert.ok(s.at + s.dur * (s.times ?? 1) <= 10, `${id}: шаг ${s.sel} кончается за 10 с`);
    }
    for (const snd of f.sounds ?? []) assert.ok(snd.at >= 0 && snd.at <= 10, `${id}: звук ${snd.name}`);
  }
  // Кадры каждой главы вместе — около мегабайта: игра хранится на телефоне целиком.
  const all = new Set(FILM_IDS.flatMap((id) => FILMS[id].images));
  const byChapter = new Map<string, number>();
  for (const src of all) {
    const ch = src.split('/')[2];
    byChapter.set(ch, (byChapter.get(ch) ?? 0) + statSync(`public${src}`).size);
  }
  assert.deepEqual([...byChapter.keys()].sort(), ['ch3', 'ch6', 'ch9']);
  for (const [ch, size] of byChapter) assert.ok(size < 1_300_000, `кадры ${ch} весят ${Math.round(size / 1024)} КБ`);
});

test('большие развилки глав 6 и 9: сцена разговора, сцена выбора и своя сцена у каждого варианта', () => {
  for (const [id, talk, choice, replies] of [
    ['ch6.bakery', 'ch6-call', 'ch6-choice', [['save', 'ch6-save'], ['own', 'ch6-own'], ['sell', 'ch6-sell']]],
    ['ch9.video', 'ch9-video', 'ch9-choice', [['give', 'ch9-give'], ['talk', 'ch9-talk'], ['erase', 'ch9-erase']]],
  ] as const) {
    const d = DECISIONS.find((x) => x.id === id)!;
    assert.ok(d.big, id);
    assert.equal(d.lines[0].film, talk, id);
    // Вопрос перед выбором (все его варианты по условиям) — со сценой выбора.
    const last = d.lines.at(-1)!;
    const asks = d.lines.filter((l) => l.text.endsWith('?') && (l === last || (l.if && last.if)));
    assert.ok(asks.length >= 1, id);
    for (const l of asks) assert.equal(l.film, choice, `${id}: ${l.text}`);
    // У каждого варианта — своя сцена на первой реплике (у реплик по условию — на каждой из них).
    for (const [value, film] of replies) {
      const o = d.options.find((x) => x.value === value)!;
      const first = o.reply!.filter((l, i) => i === 0 || (l.if && o.reply![0].if));
      for (const l of first) assert.equal(l.film, film, `${id}=${value}: ${l.text}`);
    }
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
