/**
 * Этап 8: «Чистая езда» — счётчик, нарушения в главе, бонус к опыту и звезда при доставке.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CLEAN_XP,
  XP,
  addCleanDistance,
  chapterStars,
  deliver,
  distanceLabel,
  emptyProgress,
  recordAnswer,
  recordViolation,
  refreshStars,
  sanitizeProgress,
  type ChapterInfo,
  type ProgressData,
} from '../src/progress/progress.ts';

/** Глава из 10 вопросов в 5 точках. */
const chapter: ChapterInfo = { id: 'ch1', points: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, questions: [`q${2 * i}`, `q${2 * i + 1}`] })) };

/** Все точки пройдены, верных — `correct` из 10. */
function played(correct: number): ProgressData {
  const data = emptyProgress();
  data.chapters.ch1 = { points: chapter.points.map((p) => p.id), seen: [], stars: 0 };
  for (let i = 0; i < 10; i++) recordAnswer(data, `q${i}`, i < correct, 1_000_000);
  return data;
}

test('чистая езда: счётчик растёт, нарушение сбрасывает его, лучший результат запоминается', () => {
  const data = emptyProgress();
  addCleanDistance(data, 'ch1', 900);
  addCleanDistance(data, 'ch1', 100);
  assert.deepEqual(data.drive, { clean: 1000, best: 1000, total: 1000, violations: 0 });
  recordViolation(data, 'ch1');
  addCleanDistance(data, 'ch2', 300);
  assert.deepEqual(data.drive, { clean: 300, best: 1000, total: 1300, violations: 1 });
  assert.deepEqual(data.chapters.ch1.drive, { violations: 1, distance: 1000 });
  assert.deepEqual(data.chapters.ch2.drive, { violations: 0, distance: 300 });
  addCleanDistance(data, 'ch1', Number.NaN);
  addCleanDistance(data, 'ch1', -5);
  assert.equal(data.drive!.total, 1300, 'мусор не считается');
  // 180 px/s — 60 км/ч, поэтому 10 800 px — ровно километр.
  assert.equal(distanceLabel(10_800), '1 км');
  assert.equal(distanceLabel(14_400), '1,3 км');
  assert.equal(distanceLabel(2000), '180 м');
});

test('доставка без нарушений: +1 звезда (не больше трёх) и +100 опыта', () => {
  const data = played(8); // 80% — одна звезда за ответы
  addCleanDistance(data, 'ch1', 5000);
  const xp = data.xp;
  const out = deliver(data, chapter, 2_000_000);
  assert.deepEqual(out.clean, { violations: 0, xp: CLEAN_XP[0], star: true });
  assert.equal(out.stars, 2);
  assert.equal(data.chapters.ch1.stars, 2);
  assert.equal(data.xp - xp, XP.delivery + 2 * XP.star + CLEAN_XP[0]);
  // Исправили ошибки главы: звёзд больше, но не больше трёх.
  recordAnswer(data, 'q8', true, 3_000_000);
  assert.equal(refreshStars(data, chapter)?.stars, 3);
  recordAnswer(data, 'q9', true, 3_000_000);
  assert.equal(refreshStars(data, chapter), undefined);
  assert.equal(chapterStars(data.chapters.ch1, 1), 3);
  // Повторная доставка бонуса не даёт.
  assert.equal(deliver(data, chapter, 4_000_000).clean, undefined);
});

test('доставка с нарушениями: 1 — +50 опыта, 2 — +25, 3 и больше — без бонуса; звезды за езду нет', () => {
  for (const [violations, xp] of [
    [1, 50],
    [2, 25],
    [3, 0],
  ] as const) {
    const data = played(9);
    addCleanDistance(data, 'ch1', 5000);
    for (let i = 0; i < violations; i++) recordViolation(data, 'ch1');
    const out = deliver(data, chapter, 2_000_000);
    assert.deepEqual(out.clean, { violations, xp, star: false });
    assert.equal(out.stars, 2, 'только звёзды за ответы');
  }
  // В районе не ездили по новым правилам (глава пройдена до этапа 8) — бонуса нет.
  const old = played(10);
  const out = deliver(old, chapter, 2_000_000);
  assert.equal(out.clean, undefined);
  assert.equal(out.stars, 3);
});

test('чистая езда сохраняется, испорченные записи отбрасываются', () => {
  const data = played(10);
  addCleanDistance(data, 'ch1', 4000);
  recordViolation(data, 'ch1');
  addCleanDistance(data, 'ch1', 250);
  data.drive!.intro = 123;
  deliver(data, chapter, 2_000_000);
  const restored = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(restored.drive, data.drive);
  assert.deepEqual(restored.chapters.ch1.drive, data.chapters.ch1.drive);
  const broken = sanitizeProgress({ drive: { clean: -1, best: 'a' }, chapters: { ch1: { points: [], seen: [], stars: 0, drive: { violations: 1.5, distance: 3 } } } });
  assert.equal(broken.drive, undefined);
  assert.equal(broken.chapters.ch1.drive, undefined);
});
