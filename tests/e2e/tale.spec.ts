/**
 * Дополнительный сюжет «Ночной рейс» (этап 17): покупка, сцена с выбором, испытание
 * (ситуации и повторы из билетов), выход и продолжение, последний шаг и концовка.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; ticket: number; number: number; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const SITUATIONS: { id: string; correct: number }[] = [...JSON.parse(readFileSync('data/situations/s07-09.json', 'utf8')), ...JSON.parse(readFileSync('data/situations/s10-13.json', 'utf8'))];
const CORRECT = new Map(QUESTIONS.map((q) => [`Билет ${q.ticket}, вопрос ${q.number}`, q.correct]));
const SIT = new Map(SITUATIONS.map((s) => [s.id, s.correct]));
const SLOW = { timeout: 60_000 };

function seed(page: Page, data: unknown) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:progress', JSON.stringify(value));
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true }));
    sessionStorage.setItem('seeded', '1');
  }, data);
}
const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));

/** Ответить на все задания испытания верно, пока не начнётся следующая сцена или концовка. */
async function passTrial(page: Page): Promise<number> {
  let n = 0;
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  for (;;) {
    const card = page.locator('.quiz .card');
    await expect(card.or(dialog).first()).toBeVisible(SLOW);
    if (await dialog.count()) return n;
    const label = (await card.getAttribute('aria-label'))!;
    if (label.startsWith('Ситуация')) {
      const ready = page.locator('.sit-ready');
      if (await ready.isVisible()) await ready.tap();
      await page.locator(`.sit-options .option[data-orig="${SIT.get(label.replace('Ситуация ', ''))}"]`).tap();
      await page.locator('.sit-next').tap();
    } else {
      const key = label.match(/Билет \d+, вопрос \d+/)![0];
      await page.locator('.quiz .option').nth(CORRECT.get(key)!).tap();
      await page.locator('.quiz .btn--primary', { hasText: 'Дальше' }).tap();
    }
    n++;
  }
}

test('«Ночной рейс»: покупка, выбор, испытание, выход и продолжение с того же шага', async ({ page }) => {
  await seed(page, { xp: 0, coins: 700, questions: { 'B05-Q10': { n: 1, ok: false, ever: false, at: 1, review: { stage: 0, due: 1 }, miss: 1 } }, chapters: {}, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 700. Магазин' }).tap();
  const card = page.locator('[data-tale="night"]');
  await card.getByRole('button', { name: 'Купить · 🪙 600' }).tap();
  await page.getByRole('button', { name: 'Купить за 🪙 600' }).tap();
  await expect(page.locator('#toast')).toContainText('«Ночной рейс» — твой');
  await card.getByRole('button', { name: 'Играть' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('🌙 Ночной рейс');

  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('урчит фура Семёна', SLOW);
  await page.getByRole('button', { name: 'Пропустить', exact: true }).tap();
  await dialog.getByRole('button', { name: 'Поспите час — я подожду' }).tap();
  while (await dialog.count()) {
    await dialog.locator('.btn--primary:visible').first().tap();
    await page.waitForTimeout(100);
  }
  // Испытание шага 1: 3 ситуации ночью и 2 вопроса — первым из билетов идёт свой повтор ошибки.
  await expect(page.locator('.exam-status')).toContainText('Шаг 1 из 6');
  const done = await passTrial(page);
  expect(done).toBe(5);
  await expect(dialog).toContainText('Город позади');

  let saved = await readProgress(page);
  expect(saved.tales.night).toMatchObject({ step: 1, right: 5, total: 5, runs: 0 });
  expect(saved.tales.night.choices.map((c: { id: string; value: string }) => `${c.id}=${c.value}`)).toEqual(['night.rest=nap']);
  expect(saved.questions['B05-Q10'].ok).toBe(true);
  expect(saved.modes.situations.seen).toBeTruthy();

  // Игру закрыли посреди сцены — сюжет продолжается с шага 2.
  await page.goto('/');
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await page.getByRole('button', { name: /Моя история/ }).tap();
  await page.locator('[data-tale="night"]').getByRole('button', { name: 'Продолжить' }).tap();
  await expect(dialog).toContainText('Город позади', SLOW);
  saved = await readProgress(page);
  expect(saved.tales.night.step).toBe(1);
});

test('«Ночной рейс»: последний шаг — концовка «Ночные ангелы», опыт и сводка', async ({ page }) => {
  await seed(page, {
    xp: 0,
    coins: 0,
    garage: { paint: 'yellow', sticker: 'none', owned: ['tale:night'] },
    questions: {},
    chapters: {},
    tales: { night: { step: 5, choices: [{ id: 'night.hitch', value: 'stop', at: 1 }, { id: 'night.crash', value: 'help', at: 2 }], right: 25, total: 29, endings: {}, runs: 0 } },
    finale: { control: [], seen: [] },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await page.getByRole('button', { name: /Моя история/ }).tap();
  await page.locator('[data-tale="night"]').getByRole('button', { name: 'Продолжить' }).tap();
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('огни посёлка Северный', SLOW);
  while (await dialog.count()) {
    await dialog.locator('.btn--primary:visible').first().tap();
    await page.waitForTimeout(100);
  }
  expect(await passTrial(page)).toBe(6);
  await expect(dialog).toContainText('Дальнобойщик и штурман спасли водителя');
  await page.getByRole('button', { name: 'Пропустить', exact: true }).tap();
  await expect(page.locator('#toast')).toContainText('Открыта концовка «Ночные ангелы»');
  await expect(page.locator('.tale-summary')).toContainText('Верных ответов: 31 из 35');
  await expect(page.locator('[data-ending="angel"]')).toHaveClass(/is-open/);
  await expect(page.locator('.section-title', { hasText: 'Концовки' })).toHaveText('Концовки · 1 из 4');
  const saved = await readProgress(page);
  expect(saved.xp).toBeGreaterThanOrEqual(100);
  expect(saved.tales.night).toMatchObject({ step: 6, runs: 1 });

  // Пройти заново: с первого шага, концовка остаётся в галерее.
  await page.getByRole('button', { name: 'Пройти заново' }).tap();
  await expect(dialog).toContainText('урчит фура Семёна', SLOW);
  expect((await readProgress(page)).tales.night).toMatchObject({ step: 0, right: 0, total: 0, endings: { angel: expect.any(Number) } });
});

test('«Дело о перевёрнутом знаке»: в магазине рядом с «Ночным рейсом», первый шаг — выбор и городские ситуации', async ({ page }) => {
  await seed(page, { xp: 0, coins: 800, questions: {}, chapters: {}, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 800. Магазин' }).tap();
  await expect(page.locator('[data-tale="night"]')).toBeVisible();
  const card = page.locator('[data-tale="sign"]');
  await expect(card).toContainText('Три развязки');
  await card.getByRole('button', { name: 'Купить · 🪙 750' }).tap();
  await page.getByRole('button', { name: 'Купить за 🪙 750' }).tap();
  await card.getByRole('button', { name: 'Играть' }).tap();
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('Звонок с незнакомого номера', SLOW);
  await page.getByRole('button', { name: 'Пропустить', exact: true }).tap();
  await dialog.getByRole('button', { name: 'Сфотографировать знак и перекрёсток' }).tap();
  while (await dialog.count()) {
    await dialog.locator('.btn--primary:visible').first().tap();
    await page.waitForTimeout(100);
  }
  await expect(page.locator('.quiz .sit-card')).toBeVisible();
  const id = (await page.locator('.quiz .sit-card').getAttribute('aria-label'))!.replace('Ситуация ', '');
  expect(['priority']).toContain(JSON.parse(readFileSync('data/situations/s07-09.json', 'utf8')).concat(JSON.parse(readFileSync('data/situations/s10-13.json', 'utf8'))).find((s: { id: string }) => s.id === id).skill);
  expect((await readProgress(page)).tales.sign.choices[0]).toMatchObject({ id: 'sign.first', value: 'photo' });
});

test('«Моя история»: три дополнительных сюжета с ценами; «Последний шанс Артёма» начинается с признания', async ({ page }) => {
  await seed(page, { xp: 0, coins: 950, questions: {}, chapters: {}, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await page.getByRole('button', { name: /Моя история/ }).tap();
  await expect(page.locator('.tale-card')).toHaveCount(3);
  await expect(page.locator('.tale-card .btn')).toHaveText(['Купить · 🪙 600', 'Купить · 🪙 750', 'Купить · 🪙 900']);
  await page.locator('[data-tale="artem"] .btn').tap();
  await page.getByRole('button', { name: 'Купить за 🪙 900' }).tap();
  await page.locator('[data-tale="artem"]').getByRole('button', { name: 'Играть' }).tap();
  await expect(page.locator('.cutscene')).toContainText('Не сдан', SLOW);
  expect((await readProgress(page)).coins).toBe(50);
});
