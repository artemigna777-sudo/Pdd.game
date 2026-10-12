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

test('модель машины, клаксон (сначала послушать) и номер с ником', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 0, coins: 700, questions: {}, chapters: {}, finale: { control: [], seen: [] } }));
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true }));
    sessionStorage.setItem('seeded', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 700. Магазин' }).tap();
  await page.locator('[data-model="pickup"]').tap();
  await expect(page.locator('[data-model="pickup"]')).toHaveClass(/is-selected/);
  await expect(page.locator('.garage__coins')).toContainText('300');

  // Клаксон: первое касание — послушать, второе — купить.
  await page.locator('[data-horn="duck"]').tap();
  await expect(page.locator('#toast')).toContainText('Коснись ещё раз, чтобы купить клаксон «Утка» за 100');
  await expect(page.locator('.garage__coins')).toContainText('300');
  await page.locator('[data-horn="duck"]').tap();
  await expect(page.locator('[data-horn="duck"]')).toHaveClass(/is-selected/);
  await expect(page.locator('.garage__coins')).toContainText('200');

  // Номер с ником: неверный ник не принимается, верный — покупка, потом смена бесплатно.
  await page.locator('.plate-input').fill('!!!');
  await page.getByRole('button', { name: /Купить номер/ }).tap();
  await expect(page.locator('#toast')).toContainText('Напиши ник');
  await page.locator('.plate-input').fill('курьер-7');
  await page.getByRole('button', { name: /Купить номер/ }).tap();
  await expect(page.locator('.plate-preview')).toHaveText('КУРЬЕР-7');
  await expect(page.locator('.garage__coins')).toContainText('50');
  await page.locator('.plate-input').fill('Стрела');
  await page.getByRole('button', { name: 'Сохранить номер' }).tap();
  await expect(page.locator('.plate-preview')).toHaveText('СТРЕЛА');
  await expect(page.locator('.garage__coins')).toContainText('50');

  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.garage).toMatchObject({ model: 'pickup', horn: 'duck', plate: 'СТРЕЛА' });
  // Номер — под машиной в меню.
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as Any).__game?.scene.getScene('street')?.plate?.text)).toBe('СТРЕЛА');
});
