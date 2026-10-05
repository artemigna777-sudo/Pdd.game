/**
 * Этап 13 «Смена курьера»: флажок адреса, вопрос у двери (сначала повтор ошибки), очки и
 * множитель серии, штрафы временем за ошибку и нарушение, итог и таблица рекордов.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; ticket: number; number: number; correct: number; options: string[] }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DAY = 86_400_000;

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

/** «К адресу» — машина едет к флажку; дождаться вопроса у двери (если встала — ещё раз). */
async function deliver(page: Page) {
  await expect.poll(() => page.evaluate(() => !!(window as Any).__game.scene.getScene('city').debugGoal())).toBe(true);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'К адресу' }).tap();
    try {
      await expect(page.locator('.sheet')).toHaveClass(/is-open/, { timeout: 40_000 });
      return;
    } catch {
      // Машину задержал поток — проложить маршрут ещё раз.
    }
  }
  await expect(page.locator('.sheet')).toHaveClass(/is-open/);
}

/** Вопрос в карточке у двери. */
async function door(page: Page) {
  const label = (await page.locator('.sheet .card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!.map(Number);
  return QUESTIONS.find((x) => x.ticket === ticket && x.number === number)!;
}

test('смена курьера: доставки, множитель, штрафы временем, итог и рекорд', async ({ page }) => {
  test.setTimeout(300_000);
  // Ошибка позавчера: её повтор уже пора делать — он будет у первой двери.
  const review = QUESTIONS[123];
  const at = Date.now() - 2 * DAY;
  const progress = { xp: 0, coins: 0, questions: { [review.id]: { n: 1, ok: false, ever: false, at, review: { stage: 0, due: at + DAY } } }, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } };
  await page.addInitScript((p) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false, shiftScale: 0.4 }));
    localStorage.setItem('pdd-game:progress', JSON.stringify(p));
    sessionStorage.setItem('seeded', '1');
  }, progress);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Смена курьера' })).toContainText('Таблица рекордов пуста');
  await page.locator('.mode-card', { hasText: 'Смена курьера' }).tap();
  await expect(page.locator('.screen__body')).toContainText('Смен ещё не было');
  await page.locator('.district-btn').first().tap();
  await expect(page.locator('.cutscene')).toContainText('Марина');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  const begin = page.getByRole('button', { name: 'Начать смену' });
  if (await begin.isVisible().catch(() => false)) await begin.tap();

  // Первая дверь — повтор ошибки; верный ответ: +100 и множитель ×2.
  await deliver(page);
  await expect(page.locator('.sheet__title')).toHaveText('Заказ №1 — у двери');
  const q1 = await door(page);
  expect(q1.id).toBe(review.id);
  // Пока у двери вопрос, время смены стоит.
  const paused = await page.locator('.courier-timer').textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator('.courier-timer')).toHaveText(paused!);
  await page.locator('.sheet .option').nth(q1.correct).tap();
  await expect(page.locator('.courier-score')).toHaveText('🏆 100');
  await expect(page.locator('.courier-mult')).toHaveText('×2');
  await page.getByRole('button', { name: 'Следующий заказ' }).tap();

  // Нарушение по дороге — минус 10 секунд.
  const timeBefore = await page.locator('.courier-timer').textContent();
  await page.evaluate(() => (window as Any).__game.scene.getScene('city').startViolation({ kind: 'speeding', kmh: 95, limit: 60, road: 'city' }));
  await expect(page.locator('.xp-pops')).toContainText('Превышение скорости: −10 с');
  const toSec = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
  expect(toSec((await page.locator('.courier-timer').textContent())!)).toBeLessThanOrEqual(toSec(timeBefore!) - 9);

  // Вторая дверь — ошибка: множитель ×1 и минус 15 секунд.
  await deliver(page);
  await expect(page.locator('.sheet__title')).toHaveText('Заказ №2 — у двери');
  await expect(page.locator('.sheet')).toContainText('+200 очков (серия ×2)');
  const q2 = await door(page);
  await page.locator('.sheet .option').nth((q2.correct + 1) % q2.options.length).tap();
  await expect(page.locator('.courier-mult')).toHaveText('×1');
  await expect(page.locator('.xp-pops')).toContainText('−15 с');
  await page.getByRole('button', { name: /Следующий заказ|Итоги смены/ }).tap();

  // Конец смены: итог и первая строка таблицы рекордов.
  await expect(page.locator('.modal')).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.modal__title')).toHaveText('Рекорд смены! 🏆');
  await expect(page.locator('.patrol-result')).toContainText('Точность50% (1 из 2)');
  await page.getByRole('button', { name: 'Выйти' }).tap();
  await expect(page.locator('.records__row')).toHaveCount(1);
  await expect(page.locator('.records__row')).toContainText('100 очков');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.modes.courier[0]).toMatchObject({ score: 100, deliveries: 2, correct: 1, answers: 2, chapter: 'ch1' });
  // Повтор засчитан, ошибка второй двери — в работе над ошибками.
  expect(saved.questions[review.id].review.stage).toBe(1);
  expect(saved.questions[q2.id].review.stage).toBe(0);
});
