/**
 * Магазин (этап 17): темы города за монеты, выбор, скидка дяди Гены, сохранение.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CITY_THEMES, buyOrSelect, buyOrSelectTheme } from '../src/progress/garage.ts';
import { emptyProgress, sanitizeProgress } from '../src/progress/progress.ts';
import { recordDecision } from '../src/progress/storyProgress.ts';

test('темы города: пять тем по 250–400 монет, покупка один раз, выбор и обычный город', () => {
  assert.deepEqual(
    CITY_THEMES.map((t) => t.id),
    ['winter', 'autumn', 'toy', 'neon', 'retro'],
  );
  for (const t of CITY_THEMES) assert.ok(t.price >= 250 && t.price <= 400, t.id);

  const data = emptyProgress();
  data.coins = 300;
  assert.equal(buyOrSelectTheme(data, 'neon'), 'no-coins');
  assert.equal(data.coins, 300);
  assert.equal(buyOrSelectTheme(data, 'нет-такой'), 'unknown');
  assert.equal(buyOrSelectTheme(data, 'winter'), 'bought');
  assert.equal(data.coins, 50);
  assert.equal(data.garage.theme, 'winter');
  // Обычный город — бесплатно; купленная тема выбирается снова без монет.
  assert.equal(buyOrSelectTheme(data, undefined), 'selected');
  assert.equal(data.garage.theme, undefined);
  assert.equal(buyOrSelectTheme(data, 'winter'), 'selected');
  assert.equal(data.coins, 50);

  // Сохранение: тема остаётся, только если куплена.
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.equal(back.garage.theme, 'winter');
  assert.equal(sanitizeProgress({ garage: { paint: 'yellow', sticker: 'none', owned: [], theme: 'neon' } }).garage.theme, undefined);
});

test('скидка дяди Гены: от 4 сердечек — на 20% дешевле и темы, и покраска', () => {
  const data = emptyProgress();
  recordDecision(data, 'ch4.gena', 'keep', 1);
  data.chapters.ch5 = { points: [], seen: [], stars: 0, side: { step: 2, done: 1 } };
  data.chapters.ch9 = { points: [], seen: [], stars: 0, side: { step: 2, done: 1 } };
  data.coins = 248;
  assert.equal(buyOrSelectTheme(data, 'retro'), 'no-coins');
  data.coins = 400;
  assert.equal(buyOrSelectTheme(data, 'retro'), 'bought');
  assert.equal(data.coins, 80);
  assert.equal(buyOrSelect(data, 'red'), 'bought');
  assert.equal(data.coins, 32);
});
