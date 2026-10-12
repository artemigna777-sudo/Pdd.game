import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProgress, sanitizeProgress } from '../src/progress/progress.ts';
import { finishStory, recordDecision, rewind, storyContext } from '../src/progress/storyProgress.ts';
import {
  BOND_START,
  REWIND_PRICE,
  characterTitle,
  check,
  emptyStory,
  endingFor,
  lastBigDecision,
  plotContext,
  plotLines,
  sanitizeStory,
  sceneLines,
  validatePlot,
  type Decision,
  type Ending,
  type PlotSource,
} from '../src/story/plot.ts';
import { RIVALS, SIDE_QUESTS } from '../src/story/extras.ts';
import { FINALE_STORY, PROLOGUE, STORY, type Line } from '../src/story/story.ts';
import { DECISIONS, ENDINGS, PLOT } from '../src/story/turbo.ts';
import { CHAPTERS } from '../src/world/chapters.ts';

// Небольшой сюжет для проверки модели: две развилки, одна из них большая, и три концовки.
const D: Decision[] = [
  {
    id: 'ch1.flyer',
    chapter: 'ch1',
    scene: 'beat1',
    title: 'Листовка «Турбо»',
    lines: [{ who: 'artem', text: 'Смотри, листовка.' }, { who: 'artem', text: 'Что с ней делать?' }],
    options: [
      { value: 'marina', label: 'Показать Марине', summary: 'показать Марине', effect: { bonds: { marina: 2 }, traits: { honest: 2 } } },
      { value: 'keep', label: 'Оставить', summary: 'оставить', effect: { bonds: { artem: 1 } } },
      { value: 'secret', label: 'Тайный вариант', summary: 'тайно', when: { bond: 'artem', min: 3 } },
    ],
  },
  {
    id: 'ch3.artem',
    chapter: 'ch3',
    scene: 'beat2',
    big: true,
    title: 'Артём и «Турбо»',
    when: { decided: 'ch1.flyer' },
    lines: [{ who: 'artem', text: 'Мне предлагают перейти в «Турбо».' }],
    options: [
      { value: 'talk', label: 'Отговорить', summary: 'отговорить', effect: { bonds: { artem: 9 }, traits: { kind: 3 } } },
      { value: 'free', label: 'Твой выбор', summary: 'не вмешиваться', effect: { bonds: { artem: -9 } } },
    ],
  },
];
const SRC: PlotSource = { decisions: D, givers: { ch2: 'gena' } };
const E: Ending[] = [
  { id: 'artem', title: 'Вместе', icon: '🤝', hint: 'Не отпускай Артёма', when: { all: [{ decided: 'ch3.artem', is: 'talk' }, { bond: 'artem', min: 4 }] }, lines: [{ who: 'artem', text: 'Сдали!' }] },
  { id: 'turbo', title: 'Ушёл', icon: '🏎', hint: 'Отпусти Артёма', when: { decided: 'ch3.artem', is: 'free' }, lines: [{ who: 'artem', text: 'Пока!' }] },
  { id: 'best', title: 'Лучшая служба', icon: '🏆', hint: '', lines: [{ who: 'marina', text: 'Ура!' }] },
];

test('сюжет в сохранении: испорченное отбрасывается, повтор развилки — последний выбор', () => {
  assert.equal(sanitizeStory(null), undefined);
  assert.equal(sanitizeStory([1, 2]), undefined);
  const s = sanitizeStory({
    choices: [{ id: 'a', value: 'x', at: 1 }, { id: 'b', value: 2, at: 1 }, 'мусор', { id: 'a', value: 'y', at: 3 }, { id: 'c', value: 'z', at: -1 }],
    endings: { best: 5, bad: 'вчера' },
    rewinds: 2,
  });
  assert.deepEqual(s, { choices: [{ id: 'a', value: 'y', at: 3 }], endings: { best: 5 }, rewinds: 2 });
  // Сюжет сохраняется вместе с прогрессом, а старое сохранение без сюжета загружается как раньше.
  const data = emptyProgress();
  recordDecision(data, 'ch1.flyer', 'keep', 10, SRC);
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back.story, data.story);
  assert.equal(sanitizeProgress({ xp: 5 }).story, undefined);
});

test('отношения и характер считаются из решений и поручений, сердечек от 0 до 5', () => {
  const story = emptyStory();
  let ctx = plotContext(story, [], SRC);
  assert.deepEqual(ctx.bonds, BOND_START);
  assert.equal(characterTitle(ctx.traits), 'Новичок за рулём');

  assert.equal(recordDecision(emptyProgress(), 'нет.такой', 'x', 1, SRC), false);
  const data = emptyProgress();
  assert.ok(recordDecision(data, 'ch1.flyer', 'marina', 1, SRC));
  assert.equal(recordDecision(data, 'ch1.flyer', 'нет-варианта', 1, SRC), false);
  ctx = storyContext(data, SRC);
  assert.equal(ctx.bonds.marina, 3);
  assert.equal(ctx.traits.honest, 2);
  assert.equal(characterTitle(ctx.traits), 'Принципиальный водитель');

  // Перевыбор той же развилки заменяет прежний выбор, а не складывается с ним.
  recordDecision(data, 'ch1.flyer', 'keep', 2, SRC);
  ctx = storyContext(data, SRC);
  assert.equal(ctx.bonds.marina, 1);
  assert.equal(ctx.bonds.artem, 1);
  assert.equal(data.story?.choices.length, 1);

  // Сердечки не выходят за 0–5.
  recordDecision(data, 'ch3.artem', 'talk', 3, SRC);
  assert.equal(storyContext(data, SRC).bonds.artem, 5);
  recordDecision(data, 'ch3.artem', 'free', 4, SRC);
  assert.equal(storyContext(data, SRC).bonds.artem, 0);

  // Выполненное поручение — сердечко тому, кто просил.
  data.chapters.ch2 = { points: [], seen: [], stars: 0, side: { step: 2, done: 5 } };
  data.chapters.ch4 = { points: [], seen: [], stars: 0, side: { step: 1 } };
  ctx = storyContext(data, SRC);
  assert.deepEqual(ctx.helped, ['ch2']);
  assert.equal(ctx.bonds.gena, 1);

  // Решение, которого больше нет в данных, не ломает подсчёт.
  data.story?.choices.push({ id: 'ch9.старое', value: 'x', at: 9 });
  assert.equal(storyContext(data, SRC).decisions['ch9.старое'], undefined);

  assert.equal(characterTitle({ careful: 3, kind: 3, honest: 1 }), 'Уравновешенный водитель');
  assert.equal(characterTitle({ careful: 4, kind: 3, honest: 1 }), 'Осторожный водитель');
});

test('условия: решения, сердечки, черты, поручения, и/или/не', () => {
  const ctx = plotContext({ choices: [{ id: 'ch1.flyer', value: 'marina', at: 1 }], endings: {}, rewinds: 0 }, ['ch2'], SRC);
  const yes = [
    { decided: 'ch1.flyer' },
    { decided: 'ch1.flyer', is: 'marina' },
    { decided: 'ch1.flyer', is: ['keep', 'marina'] },
    { bond: 'marina', min: 3 },
    { bond: 'artem', max: 0 },
    { bondsAll: 0 },
    { trait: 'honest', min: 2 },
    { traitsAll: 0 },
    { helped: 'ch2' },
    { all: [{ helped: 'ch2' }, { decided: 'ch1.flyer' }] },
    { any: [{ helped: 'ch5' }, { decided: 'ch1.flyer' }] },
    { not: { decided: 'ch3.artem' } },
  ] as const;
  for (const c of yes) assert.ok(check(c, ctx), JSON.stringify(c));
  const no = [{ decided: 'ch3.artem' }, { decided: 'ch1.flyer', is: 'keep' }, { bond: 'marina', min: 4 }, { bondsAll: 1 }, { trait: 'kind', min: 1 }, { traitsAll: 1 }, { helped: 'ch5' }, { all: [{ helped: 'ch2' }, { helped: 'ch5' }] }, { any: [] }] as const;
  for (const c of no) assert.ok(!check(c, ctx), JSON.stringify(c));
  assert.ok(check(undefined, ctx));
});

test('сцена с развилкой: реплики по условиям, кнопки, вариант по отношениям, решённое не повторяется', () => {
  const base = [
    { who: 'victor', text: 'Всегда.' },
    { who: 'victor', text: 'Только если листовку показали Марине.', if: { decided: 'ch1.flyer', is: 'marina' } },
  ] as const;
  const data = emptyProgress();
  let lines = sceneLines('ch1', 'beat1', base, storyContext(data, SRC), SRC);
  assert.deepEqual(
    lines.map((l) => l.text),
    ['Всегда.', 'Смотри, листовка.', 'Что с ней делать?'],
  );
  const ask = lines.at(-1);
  assert.equal(ask?.decision, 'ch1.flyer');
  // Тайный вариант — только при трёх сердечках у Артёма.
  assert.deepEqual(ask?.choices?.map((c) => c.value), ['marina', 'keep']);
  // В другой сцене и главе этой развилки нет.
  assert.equal(sceneLines('ch1', 'beat2', [], storyContext(data, SRC), SRC).length, 0);
  // Большая развилка главы 3 — только после решения в главе 1.
  assert.equal(sceneLines('ch3', 'beat2', [], storyContext(data, SRC), SRC).length, 0);

  recordDecision(data, 'ch1.flyer', 'marina', 1, SRC);
  lines = sceneLines('ch1', 'beat1', base, storyContext(data, SRC), SRC);
  assert.deepEqual(
    lines.map((l) => l.text),
    ['Всегда.', 'Только если листовку показали Марине.'],
  );
  assert.equal(sceneLines('ch3', 'beat2', [], storyContext(data, SRC), SRC).at(-1)?.decision, 'ch3.artem');
});

test('концовки: первая подходящая, иначе по умолчанию; галерея помнит открытые', () => {
  const data = emptyProgress();
  assert.equal(endingFor(storyContext(data, SRC), E).id, 'best');
  recordDecision(data, 'ch1.flyer', 'keep', 1, SRC);
  recordDecision(data, 'ch3.artem', 'free', 2, SRC);
  assert.equal(finishStory(data, 100, SRC, E)?.ending.id, 'turbo');
  assert.deepEqual(finishStory(data, 200, SRC, E), { ending: E[1], fresh: false });
  assert.deepEqual(data.story?.endings, { turbo: 100 });
  // Пока концовок в данных нет — открывать нечего.
  assert.equal(finishStory(emptyProgress(), 1, SRC, []), undefined);
});

test('«Вернуть решение»: последняя большая развилка, за монеты, после финала — новая концовка', () => {
  const data = emptyProgress();
  assert.deepEqual(rewind(data, 'talk', 1, SRC, E), { ok: false, reason: 'nothing' });
  recordDecision(data, 'ch1.flyer', 'keep', 1, SRC);
  // Маленькие развилки не возвращаются.
  assert.equal(lastBigDecision(data.story, SRC), undefined);
  recordDecision(data, 'ch3.artem', 'free', 2, SRC);
  assert.equal(lastBigDecision(data.story, SRC)?.value, 'free');

  assert.deepEqual(rewind(data, 'free', 3, SRC, E), { ok: false, reason: 'same' });
  assert.deepEqual(rewind(data, 'нет-такого', 3, SRC, E), { ok: false, reason: 'same' });
  data.coins = REWIND_PRICE - 1;
  assert.deepEqual(rewind(data, 'talk', 3, SRC, E), { ok: false, reason: 'coins' });
  assert.equal(data.coins, REWIND_PRICE - 1);

  // До конца истории концовка не открывается — только меняется решение.
  data.coins = REWIND_PRICE + 50;
  assert.deepEqual(rewind(data, 'talk', 4, SRC, E), { ok: true });
  assert.equal(data.coins, 50);
  assert.equal(storyContext(data, SRC).decisions['ch3.artem'], 'talk');
  assert.equal(data.story?.rewinds, 1);

  // После экзамена-босса — сразу новая концовка в галерею.
  finishStory(data, 10, SRC, E);
  data.finale.exam = 10;
  assert.deepEqual(data.story?.endings, { artem: 10 });
  data.coins = REWIND_PRICE;
  const r = rewind(data, 'free', 20, SRC, E);
  assert.ok(r.ok && r.ending?.ending.id === 'turbo' && r.ending.fresh);
  assert.deepEqual(data.story?.endings, { artem: 10, turbo: 20 });
});

test('проверка данных сюжета находит ошибки, а настоящий сюжет — без ошибок', () => {
  const chapters = CHAPTERS.map((c) => c.id);
  assert.deepEqual(validatePlot(SRC, E, chapters), []);
  const bad: Decision[] = [
    { ...D[0], id: 'ch2.flyer' },
    { ...D[0], id: 'ch2.flyer', chapter: 'ch2', options: [{ value: 'a', label: 'a', summary: 'a', when: { decided: 'нет' } }] },
  ];
  const errors = validatePlot({ decisions: bad, givers: {} }, [{ ...E[0], when: { decided: 'ch3.artem', is: 'zzz' } }, { ...E[2], when: { helped: 'ch99' } }], chapters);
  for (const part of ['id должен начинаться', 'повторяется', 'меньше двух', 'у всех вариантов есть условия', 'нет развилки нет', 'нет развилки ch3.artem', 'без условия', 'нет главы ch99']) {
    assert.ok(errors.some((e) => e.includes(part)), `${part}: ${errors.join('; ')}`);
  }
  assert.deepEqual(validatePlot(PLOT, ENDINGS, chapters), []);
  assert.equal(PLOT.decisions, DECISIONS);
});

// ─── Настоящий сюжет «Турбо-Доставка» ────────────────────────────────────────────

const storyLines = (): Line[] => [
  ...PROLOGUE,
  ...Object.values(STORY).flatMap((c) => [...c.intro, ...c.beats.flat(), ...c.ready, ...c.low, ...c.finale]),
  ...Object.values(FINALE_STORY).flat(),
  ...Object.values(RIVALS).flatMap((r) => r.challenge),
  ...Object.values(SIDE_QUESTS).flatMap((q) => [...q.offer, ...q.stops.flatMap((st) => st.lines)]),
];

test('«Турбо-Доставка»: в каждой главе 1–2 развилки, большие — в главах 3, 6 и 9, реплики ссылаются на настоящие развилки', () => {
  const chapters = CHAPTERS.map((c) => c.id);
  assert.deepEqual(validatePlot(PLOT, ENDINGS, chapters, storyLines()), []);
  const ready = new Set(DECISIONS.map((d) => d.chapter));
  for (const ch of ready) {
    const count = DECISIONS.filter((d) => d.chapter === ch).length;
    assert.ok(count >= 1 && count <= 2, `${ch}: ${count} развилок`);
  }
  for (const d of DECISIONS) assert.equal(!!d.big, ['ch3', 'ch6', 'ch9'].includes(d.chapter) && DECISIONS.find((x) => x.chapter === d.chapter && x.big) === d, d.id);
  for (const ch of ['ch3', 'ch6', 'ch9']) if (ready.has(ch)) assert.ok(DECISIONS.some((d) => d.chapter === ch && d.big), `${ch}: большая развилка`);
  // Развилки идут по главам по порядку.
  const order = DECISIONS.map((d) => chapters.indexOf(d.chapter));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // Герои вспоминают решения в следующих главах: на каждую развилку есть хотя бы одна реплика с условием о ней.
  const remembered = new Set<string>();
  const walk = (c: unknown): void => {
    if (!c || typeof c !== 'object') return;
    const o = c as Record<string, unknown>;
    if (typeof o.decided === 'string') remembered.add(o.decided);
    for (const v of Object.values(o)) if (Array.isArray(v)) v.forEach(walk);
    if (o.not) walk(o.not);
  };
  for (const l of [...storyLines(), ...plotLines(PLOT, ENDINGS)]) walk(l.if);
  for (const d of DECISIONS) for (const o of d.options) walk(o.when);
  for (const d of DECISIONS) walk(d.when);
  for (const e of ENDINGS) walk(e.when);
  for (const d of DECISIONS) assert.ok(remembered.has(d.id), `${d.id}: о решении никто не вспоминает`);
});

const GENDERED = /(?<![а-яё])ты(\s+[а-яё]+){0,2}\s+[а-яё]{2,}(л|ла)(?![а-яё])/iu;

test('реплики сюжета: без обращения к игроку в мужском или женском роде, кнопки короткие', () => {
  const all = [...storyLines(), ...plotLines(PLOT, ENDINGS)];
  const labels = DECISIONS.flatMap((d) => d.options.map((o) => o.label));
  for (const text of [...all.map((l) => l.text), ...labels]) {
    // «ты сделал», «ты бы сказала» — прошедшее время о самом игроке зависит от пола.
    assert.doesNotMatch(text, GENDERED, text);
  }
  assert.match('Ты бы что сказал?', GENDERED);
  assert.match('ты тогда помогла', GENDERED);
  for (const label of labels) assert.ok(label.length <= 40, `кнопка длинновата: ${label}`);
});
