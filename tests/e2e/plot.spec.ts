/**
 * Сюжет как в RPG (этап 17): развилка в городе, выбор по отношениям, выбор сохраняется,
 * а пройденная развилка не повторяется.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface MappingData {
  chapters: { id: string; points: { id: string }[] }[];
}
const MAPPING: MappingData = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const SLOW = { timeout: 90_000 };

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

function seed(page: Page, data: unknown) {
  return page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pdd-game:progress', JSON.stringify(value));
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
      sessionStorage.setItem('seeded', '1');
    }
  }, data);
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress') ?? 'null'));

const passed = (id: string) => ({ points: MAPPING.chapters.find((c) => c.id === id)!.points.map((p) => p.id), seen: ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready'], stars: 3, delivered: 1, side: { step: 2, done: 1 } });

test('большая развилка главы 3: «Пропустить» доходит до выбора, вариант по отношениям, выбор сохраняется', async ({ page }) => {
  const ch3 = MAPPING.chapters.find((c) => c.id === 'ch3')!.points.map((p) => p.id);
  await seed(page, {
    xp: 900,
    questions: {},
    chapters: {
      ch1: passed('ch1'),
      ch2: passed('ch2'),
      // Пройдено две трети точек: пора второй сюжетной сцене главы.
      ch3: { points: ch3.slice(0, Math.ceil((ch3.length * 2) / 3)), seen: ['intro', 'race', 'beat1'], stars: 0, side: { step: 2, done: 1 } },
    },
    // В главе 2 Артёма прикрыли — у него есть сердечко, и открыт вариант «учить билеты вместе».
    story: { choices: [{ id: 'ch1.card', value: 'keep', at: 1 }, { id: 'ch2.cover', value: 'cover', at: 2 }], endings: {}, rewinds: 0 },
    finale: { control: [], seen: [] },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 3: Светофоры и разметка' }).tap();

  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('скорая', SLOW);
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  // Решение пропустить нельзя: сцена остановилась на вопросе Артёма — он помнит главу 2.
  await expect(dialog.locator('.cutscene__text')).toHaveText('Я не знаю, что делать. Что посоветуешь?');
  await expect(dialog.locator('.cutscene__name')).toHaveText('Артём');
  const choices = dialog.locator('.cutscene__choices button');
  await expect(choices).toHaveText(['Не уходи: «Стрела» — твоя команда', 'Давай вместе учить билеты', 'Решай сам: это твоя жизнь']);
  await expect(page.getByRole('button', { name: 'Пропустить' })).toBeHidden();

  await choices.nth(1).tap();
  await expect(dialog.locator('.cutscene__text')).toContainText('Вместе? Серьёзно?');
  while (await dialog.count()) {
    await dialog.locator('.btn--primary:visible').first().tap();
    await page.waitForTimeout(120);
  }

  const saved = await readProgress(page);
  expect(saved.story.choices.map((c: { id: string; value: string }) => `${c.id}=${c.value}`)).toEqual(['ch1.card=keep', 'ch2.cover=cover', 'ch3.artem=study']);
  expect(saved.chapters.ch3.seen).toContain('beat2');

  // После перезапуска развилка не повторяется.
  await page.reload();
  await page.getByRole('button', { name: 'Глава 3: Светофоры и разметка' }).tap();
  await page.waitForFunction(() => (window as unknown as { __game?: { scene: { isActive(k: string): boolean } } }).__game?.scene.isActive('city'), undefined, SLOW);
  await page.waitForTimeout(1500);
  await expect(dialog).toHaveCount(0);
});

test('«Моя история»: характер, команда, решения, «Вернуть решение» открывает новую концовку, скидка дяди Гены', async ({ page }) => {
  const choices = [
    ['ch2.kids', 'sokolov'],
    ['ch3.artem', 'stay'],
    ['ch4.gena', 'keep'],
    ['ch6.bakery', 'save'],
    ['ch7.witness', 'tell'],
    ['ch9.video', 'erase'],
  ].map(([id, value], i) => ({ id, value, at: i + 1 }));
  await seed(page, {
    xp: 20000,
    coins: 260,
    questions: {},
    // Поручения дяди Гены выполнены (главы 5 и 9): вместе с «Гайкой» — 4 сердечка.
    chapters: { ch5: { points: [], seen: [], stars: 0, side: { step: 2, done: 1 } }, ch9: { points: [], seen: [], stars: 0, side: { step: 2, done: 1 } } },
    story: { choices, endings: { best: 1_700_000_000_000 }, rewinds: 0 },
    finale: { control: [], seen: [], exam: 1_700_000_000_000 },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await page.getByRole('button', { name: /Моя история/ }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Моя история');

  await expect(page.locator('.story__title')).toHaveText('Отзывчивый водитель');
  await expect(page.locator('[data-hero="gena"] .hearts')).toHaveAttribute('aria-label', '4 из 5 сердечек');
  await expect(page.locator('[data-hero="gena"] .team__perk')).toHaveClass(/is-on/);
  await expect(page.locator('[data-hero="sokolov"] .hearts')).toHaveAttribute('aria-label', '1 из 5 сердечек');
  await expect(page.locator('.story__decisions li')).toHaveCount(6);
  await expect(page.locator('.story__decisions li.is-big')).toHaveCount(3);

  // Галерея: одна концовка открыта, секретная скрыта.
  await expect(page.locator('.section-title', { hasText: 'Галерея концовок' })).toHaveText('Галерея концовок · 1 из 6');
  await expect(page.locator('[data-ending="secret"] b')).toHaveText('???');
  await expect(page.locator('[data-ending="best"]')).toHaveClass(/is-open/);

  // Вернуть решение главы 9: отдать запись Соколову — у него 4 сердечка, и открывается «Школа безопасности».
  await expect(page.locator('.story__rewind')).toContainText('Запись видеорегистратора');
  await page.getByRole('button', { name: 'Отдать запись Соколову · 🪙 200' }).tap();
  await expect(page.locator('.modal__title')).toHaveText('Вернуть решение?');
  await page.getByRole('button', { name: 'Вернуть за 🪙 200' }).tap();
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('Экзамен сдан');
  await page.getByRole('button', { name: 'Пропустить', exact: true }).tap();
  await expect(page.locator('#toast')).toContainText('Открыта концовка «Школа безопасности»');
  await expect(page.locator('.section-title', { hasText: 'Галерея концовок' })).toHaveText('Галерея концовок · 2 из 6');
  await expect(page.locator('[data-hero="sokolov"] .hearts')).toHaveAttribute('aria-label', '4 из 5 сердечек');

  const saved = await readProgress(page);
  expect(saved.coins).toBe(60);
  expect(saved.story.rewinds).toBe(1);
  expect(Object.keys(saved.story.endings).sort()).toEqual(['best', 'school']);

  // Посмотреть открытую концовку ещё раз.
  await page.locator('[data-ending="school"] .ending__play').tap();
  await expect(dialog).toContainText('Экзамен сдан');
  await page.getByRole('button', { name: 'Пропустить', exact: true }).tap();
  await expect(dialog).toHaveCount(0);

  // Монет на второй раз не хватает.
  await page.getByRole('button', { name: /Стереть запись/ }).tap();
  await page.getByRole('button', { name: 'Вернуть за 🪙 200' }).tap();
  await expect(page.locator('#toast')).toContainText('Не хватает монет');

  // Скидка дяди Гены в гараже: красная покраска за 48 вместо 60.
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 60. Гараж' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Гараж');
  await expect(page.locator('.garage__discount')).toContainText('−20%');
  await expect(page.locator('.garage__item', { hasText: 'Красная' }).locator('.garage__price')).toHaveText('🪙 48');
  await page.locator('.garage__item', { hasText: 'Красная' }).tap();
  expect((await readProgress(page)).coins).toBe(12);
});
