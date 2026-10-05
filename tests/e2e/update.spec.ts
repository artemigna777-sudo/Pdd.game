/**
 * Обновление игры: уведомление «Доступна новая версия» не пропадает из-за коротких уведомлений,
 * в настройках видна версия и есть проверка обновлений.
 */
import { expect, test } from '@playwright/test';

/** Модуль уведомлений на сервере разработки — открывается прямо в странице. */
const TOAST = '/src/ui/toast.ts';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true }));
    sessionStorage.setItem('seeded', '1');
  });
});

test('«Обновить» возвращается после короткого уведомления и убирается только своей кнопкой', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).waitFor();
  await page.evaluate(async (path) => {
    const { showToast } = await import(path);
    showToast('Доступна новая версия игры', { action: 'Обновить', persistent: true });
    showToast('Цель дня выполнена!');
  }, TOAST);
  const toast = page.locator('#toast');
  await expect(toast).toContainText('Цель дня выполнена!');
  // Короткое уведомление скрылось — «Обновить» снова на экране и само не пропадает.
  await expect(toast).toContainText('Доступна новая версия игры', { timeout: 6000 });
  await expect(toast).toHaveClass(/is-visible/);
  await page.waitForTimeout(4500);
  await expect(toast).toHaveClass(/is-visible/);
  // Короткое уведомление можно закрыть крестиком — «Обновить» вернётся сразу.
  await page.evaluate(async (path) => (await import(path)).showToast('Не хватает монет'), TOAST);
  await toast.getByRole('button', { name: 'Закрыть' }).tap();
  await expect(toast).toContainText('Доступна новая версия игры');
  // Крестик самого «Обновить» убирает его насовсем.
  await toast.getByRole('button', { name: 'Закрыть' }).tap();
  await expect(toast).not.toHaveClass(/is-visible/);
  await page.evaluate(async (path) => (await import(path)).showToast('Не хватает монет'), TOAST);
  await expect(toast).not.toHaveClass(/is-visible/, { timeout: 6000 });
});

test('в настройках видна версия игры и проверка обновлений', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const version = page.locator('.version');
  await expect(version).toContainText('Версия игры');
  await expect(version).toContainText(/Версия от \d+ \S+ \d{4}/);
  await version.getByRole('button', { name: 'Проверить обновления' }).tap();
  // В режиме разработки service worker не работает — честное сообщение вместо зависания.
  await expect(version.locator('[aria-live]')).toContainText('Проверить не получилось');
});
