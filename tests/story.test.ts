import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHARACTERS, FINALE_STORY, PROLOGUE, STORY, beatThresholds, fill, type Line } from '../src/story/story.ts';
import { CHAPTERS } from '../src/world/chapters.ts';

const allLines = (): Line[] => [
  ...PROLOGUE,
  ...Object.values(STORY).flatMap((c) => [...c.intro, ...c.beats.flat(), ...c.ready, ...c.low, ...c.finale]),
  ...FINALE_STORY.intro,
  ...FINALE_STORY.controls,
  ...FINALE_STORY.epilogue,
  ...FINALE_STORY.exam,
  ...FINALE_STORY.passed,
  ...FINALE_STORY.failed,
];

test('у каждой главы своя история: задание, место доставки, вступление, две сцены по ходу, финал', () => {
  assert.deepEqual(Object.keys(STORY), CHAPTERS.map((c) => c.id));
  const goals = new Set<string>();
  for (const [id, s] of Object.entries(STORY)) {
    assert.ok(s.task && s.goal, id);
    goals.add(s.goal);
    for (const part of [s.intro, s.beats[0], s.beats[1], s.ready, s.low, s.finale]) assert.ok(part.length > 0, id);
    // Сообщения о результате показывают долю верных ответов главы.
    assert.ok(s.ready.some((l) => l.text.includes('{percent}')), id);
    assert.ok(s.low.some((l) => l.text.includes('{percent}')), id);
  }
  assert.equal(goals.size, CHAPTERS.length, 'места доставки не повторяются');
});

test('персонажи возвращаются из главы в главу', () => {
  const chaptersOf = new Map<string, Set<string>>();
  for (const [id, s] of Object.entries(STORY)) {
    for (const l of [...s.intro, ...s.beats.flat(), ...s.ready, ...s.low, ...s.finale]) {
      chaptersOf.set(l.who, (chaptersOf.get(l.who) ?? new Set()).add(id));
    }
  }
  for (const who of Object.keys(CHARACTERS)) assert.ok((chaptersOf.get(who)?.size ?? 0) >= 2, `${who} появляется хотя бы в двух главах`);
  assert.equal(chaptersOf.get('victor')?.size, CHAPTERS.length, 'инструктор — в каждой главе');
  assert.equal(chaptersOf.get('marina')?.size, CHAPTERS.length, 'диспетчер — в каждой главе');
});

test('в репликах только известные персонажи и нет незаполненных подстановок, кроме {percent}', () => {
  for (const l of allLines()) {
    assert.ok(l.who === 'narrator' || l.who in CHARACTERS, l.who);
    assert.ok(l.text.trim().length > 0);
    for (const m of l.text.match(/\{\w+\}/g) ?? []) assert.equal(m, '{percent}', l.text);
  }
});

test('подстановка и пороги сюжетных сцен', () => {
  assert.equal(fill([{ who: 'marina', text: 'Верных — {percent}%, {x}' }], { percent: 84 })[0].text, 'Верных — 84%, {x}');
  assert.deepEqual(beatThresholds(26), [9, 17]);
  assert.deepEqual(beatThresholds(3), [1, 2]);
});
