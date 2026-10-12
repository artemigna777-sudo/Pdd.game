/**
 * Исправления по отзывам Артёма (12.10.2026): настройки в городе листаются на маленьком экране,
 * звук выключается прямо за рулём.
 */
import { expect, test } from '@playwright/test';

type Any = any;
const SLOW = { timeout: 90_000 };

test.use({ viewport: { width: 320, height: 568 } });

test('город: окно настроек листается, звук — первым и выключается сразу', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false }));
    localStorage.setItem(
      'pdd-game:progress',
      JSON.stringify({
        xp: 0,
        coins: 0,
        questions: {},
        chapters: { ch1: { points: [], seen: ['prologue', 'intro', 'race', 'beat1', 'beat2'], stars: 0, side: { step: 2, done: 1 } } },
        finale: { control: [], seen: [] },
        drive: { clean: 0, best: 0, total: 0, violations: 0, intro: 1 },
      }),
    );
    sessionStorage.setItem('seeded', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Глава 1/ }).tap();
  await page.waitForFunction(() => (window as Any).__game?.scene.isActive('city'), undefined, SLOW);

  await page.getByRole('button', { name: 'Настройки' }).tap();
  const pop = page.locator('.popover:not([hidden])');
  await expect(pop).toBeVisible();
  // Звук — первый переключатель, виден без прокрутки.
  const sound = pop.getByRole('button', { name: /^Звуки/ });
  await expect(sound).toBeInViewport();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.tap();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pdd-game:settings')))!).sound).toBe(false);

  // Окно не выходит за экран и листается жестом пальца.
  const box = (await pop.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  expect(await pop.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  // Жест пальцем в безголовом Chromium не прокручивает даже обычные экраны, поэтому проверяем, что окно
  // само прокручиваемое и браузер отдаёт ему вертикальный жест (над игрой жесты запрещены).
  expect(await pop.evaluate((el) => [getComputedStyle(el).overflowY, getComputedStyle(el).touchAction])).toEqual(['auto', 'pan-y']);
  await pop.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => pop.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  await expect(pop.getByRole('button', { name: 'Показать обучение' })).toBeInViewport();
});
