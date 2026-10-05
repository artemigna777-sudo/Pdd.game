/**
 * Этап 12 «Один день Соколова»: смена на посту ДПС — поймать нарушителя касанием, ответить на
 * вопрос по правилу, ошибочная остановка, итог смены и рекорд.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { ticket: number; number: number; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

/** Где на экране нарушитель (или добросовестная машина) — по модели смены. */
async function target(page: Page, which: 'violator' | 'innocent', kind?: string): Promise<{ x: number; y: number }> {
  let found: { x: number; y: number } | undefined;
  await expect
    .poll(
      async () => {
        found = await page.evaluate(([w, k]) => (window as Any).__game.scene.getScene('patrol').debugTargets(k)[w], [which, kind] as const);
        return !!found;
      },
      { timeout: 90_000, intervals: [300] },
    )
    .toBe(true);
  return found!;
}

test('пост ДПС: поймать нарушителя, вопрос по правилу, ошибочная остановка, итог и рекорд', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    // Смена короче обычной: 40% от трёх минут.
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, shiftScale: 0.4 }));
    sessionStorage.setItem('seeded', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Один день Соколова' })).toContainText('3 минуты на посту');
  await page.locator('.mode-card', { hasText: 'Один день Соколова' }).tap();
  await expect(page.locator('.mode-intro')).toContainText('Остановка запрещена');
  await page.locator('.district-btn').first().tap();

  // Перед первой сменой — Соколов объясняет правила.
  await expect(page.locator('.cutscene')).toContainText('Лейтенант Соколов');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  const begin = page.getByRole('button', { name: 'Заступить на смену' });
  if (await begin.isVisible().catch(() => false)) await begin.tap();
  await expect(page.locator('.patrol-timer')).not.toHaveText('1:12', { timeout: 10_000 });

  // Нарушитель встал под знаком «Остановка запрещена» — поймать.
  const v = await target(page, 'violator', 'no-stopping');
  await page.touchscreen.tap(v.x, v.y);
  await expect(page.locator('.sheet')).toHaveClass(/is-open/);
  await expect(page.locator('.sheet__title')).toHaveText('Поймал! Остановка запрещена');
  await expect(page.locator('.sheet')).toContainText('Лейтенант Соколов');
  await expect(page.locator('.patrol-stat').first()).toContainText('1');
  // Пока идёт вопрос, время смены стоит.
  const paused = await page.locator('.patrol-timer').textContent();
  await page.waitForTimeout(1500);
  await expect(page.locator('.patrol-timer')).toHaveText(paused!);
  const label = (await page.locator('.sheet .card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!.map(Number);
  const q = QUESTIONS.find((x) => x.ticket === ticket && x.number === number)!;
  await page.locator('.sheet .option').nth(q.correct).tap();
  await page.getByRole('button', { name: 'На пост' }).tap();
  await expect(page.locator('.sheet')).not.toHaveClass(/is-open/);

  // Честный водитель — ошибка.
  const ok = await target(page, 'innocent');
  await page.touchscreen.tap(ok.x, ok.y);
  await expect(page.locator('.patrol-stat').nth(2)).toContainText('1');
  await expect(page.locator('.xp-pops')).toContainText('ничего не нарушил');

  // Конец смены: итог и рекорд.
  await expect(page.locator('.modal')).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.modal__title')).toHaveText('Новый рекорд смены! 🏆');
  await expect(page.locator('.patrol-result')).toContainText('Верных ответов1 из 1');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(progress.modes.patrol.shifts).toBe(1);
  expect(progress.modes.patrol.best).toBeGreaterThanOrEqual(100);
  expect(Object.keys(progress.questions)).toHaveLength(1);
  await page.getByRole('button', { name: 'Выйти' }).tap();
  await expect(page.locator('.mode-record')).toContainText(`Рекорд: ${progress.modes.patrol.best} очков · смен: 1`);
});
