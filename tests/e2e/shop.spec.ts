/**
 * Магазин (этап 17): тема города покупается за монеты и сразу видна в меню и в городе.
 */
import { expect, test } from '@playwright/test';

type Any = any;
const SLOW = { timeout: 90_000 };

test('тема города: купить «Зимний город» — снег в меню и в городе; вернуть обычный', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 0, coins: 260, questions: {}, chapters: { ch1: { points: [], seen: ['prologue', 'intro', 'race'], stars: 0 } }, drive: { clean: 0, best: 0, total: 0, violations: 0, intro: 1 }, finale: { control: [], seen: [] } }));
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
    sessionStorage.setItem('seeded', '1');
  });
  const background = (scene: string) => page.evaluate((key) => (window as Any).__game.scene.getScene(key).cameras.main.backgroundColor.color as number, scene);
  await page.goto('/');
  await page.waitForFunction(() => (window as Any).__game?.scene.isActive('street'));
  const classic = await background('street');

  await page.getByRole('button', { name: 'Монеты: 260. Магазин' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Магазин');
  await expect(page.locator('[data-theme-id="classic"]')).toHaveClass(/is-selected/);
  // На «Ретро» не хватает монет.
  await page.locator('[data-theme-id="retro"]').tap();
  await expect(page.locator('#toast')).toContainText('Не хватает монет: нужно 400');
  await page.locator('[data-theme-id="winter"]').tap();
  await expect(page.locator('#toast')).toContainText('Тема «Зимний город»');
  await expect(page.locator('[data-theme-id="winter"]')).toHaveClass(/is-selected/);
  await expect(page.locator('.garage__coins')).toContainText('10');

  // Улица в меню — уже зимняя.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect.poll(() => background('street'), SLOW).toBe(0xe6eff6);

  // И город после перезапуска игры.
  await page.reload();
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await page.waitForFunction(() => (window as Any).__game?.scene.isActive('city'), undefined, SLOW);
  expect(await background('city')).toBe(0xe6eff6);

  // Обычный город — бесплатно, купленная тема остаётся.
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 10. Магазин' }).tap();
  await page.locator('[data-theme-id="classic"]').tap();
  await expect(page.locator('[data-theme-id="winter"] .garage__price')).toHaveText('куплено');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect.poll(() => background('street'), SLOW).toBe(classic);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.garage.theme).toBeUndefined();
  expect(saved.garage.owned).toContain('theme:winter');
});
