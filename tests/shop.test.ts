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

test('модели, клаксоны и номер с ником: цены, покупка, выбор, сохранение', async () => {
  const { HORNS, MODELS, PLATE, buyOrSelectExtra, carLook, hornOf, plateText, setPlate } = await import('../src/progress/garage.ts');
  for (const m of MODELS.slice(1)) assert.ok(m.price >= 300 && m.price <= 500, m.id);
  assert.equal(MODELS.length, 6);
  for (const h of HORNS.slice(1)) assert.ok(h.price >= 80 && h.price <= 150, h.id);
  assert.equal(HORNS.length, 6);
  assert.equal(PLATE.price, 150);

  const data = emptyProgress();
  assert.deepEqual(carLook(data), { color: 0xffb703, sticker: 'none', model: 'sedan' });
  assert.equal(hornOf(data), 'beep');
  data.coins = 750;
  assert.equal(buyOrSelectExtra(data, 'model', 'electro'), 'bought');
  assert.equal(buyOrSelectExtra(data, 'model', 'sedan'), 'selected');
  assert.equal(buyOrSelectExtra(data, 'model', 'electro'), 'selected');
  assert.equal(data.coins, 250);
  assert.equal(buyOrSelectExtra(data, 'horn', 'duck'), 'bought');
  assert.equal(buyOrSelectExtra(data, 'horn', 'нет'), 'unknown');
  assert.equal(buyOrSelectExtra(data, 'model', 'pickup'), 'no-coins');

  assert.equal(plateText('  артём-1 !!  '), 'АРТЕМ-1');
  assert.equal(plateText('очень длинный ник'), 'ОЧЕНЬ ДЛ');
  assert.equal(plateText('???'), undefined);
  assert.equal(setPlate(data, '!!!'), 'invalid');
  assert.equal(setPlate(data, 'курьер'), 'bought');
  assert.equal(data.coins, 0);
  assert.equal(setPlate(data, 'стрела'), 'saved');
  assert.deepEqual(carLook(data), { color: 0xffb703, sticker: 'none', model: 'electro', plate: 'СТРЕЛА' });

  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(carLook(back), carLook(data));
  assert.equal(hornOf(back), 'duck');
  // Не купленное — не выбирается, даже если записано в сохранении.
  const forged = sanitizeProgress({ garage: { paint: 'yellow', sticker: 'none', owned: [], model: 'van', horn: 'tune', plate: 'ХАК' } });
  assert.deepEqual(carLook(forged), { color: 0xffb703, sticker: 'none', model: 'sedan' });
  assert.equal(hornOf(forged), 'beep');
});
