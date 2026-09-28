/**
 * История билетов: пройденный билет сохраняется, его результат виден в списке билетов и в истории,
 * а в разборе видно, что выбрано в каждом вопросе. История переживает перезагрузку игры.
 */
import { expect, test, type Page } from '@playwright/test';

const title = (page: Page) => page.locator('.topbar__title');

// Обучение при первом запуске здесь не нужно.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true })));
});

/** Проходит билет, выбирая в каждом вопросе первый вариант. */
async function passTicketWithFirstOptions(page: Page, ticket: number) {
  await page.getByRole('button', { name: new RegExp(`^Билет ${ticket}(,|$)`) }).tap();
  await expect(title(page)).toHaveText(`Билет ${ticket}`);
  for (let i = 1; i <= 20; i++) {
    await expect(page.locator('.card__meta')).toContainText(`Вопрос ${i}`);
    await page.locator('.option').first().tap();
    await page.getByRole('button', { name: i === 20 ? 'Показать результат' : 'Дальше', exact: true }).tap();
  }
}

test('пройденный билет попадает в историю с разбором ответов', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Билеты' }).tap();

  await page.getByRole('button', { name: 'История попыток' }).tap();
  await expect(page.getByText('Пока нет пройденных билетов')).toBeVisible();
  await page.getByRole('button', { name: 'К билетам' }).tap();
  await expect(title(page)).toHaveText('Билеты');

  // Ответ «1» на все вопросы билета 1 даёт 5 правильных из 20 (по таблице ответов).
  await passTicketWithFirstOptions(page, 1);
  await expect(page.locator('.result__score')).toHaveText('5 из 20');
  await expect(page.locator('.result__note')).toHaveText('Первая попытка этого билета.');
  await expect(page.locator('.dot')).toHaveCount(20);
  await expect(page.locator('.dot.is-bad')).toHaveCount(15);
  await expect(page.locator('.answer.is-ok')).toHaveCount(5);
  // Ошибки раскрыты сразу: видно, что выбрано и какой ответ правильный.
  await expect(page.locator('.answer.is-bad[open] .card')).toHaveCount(15);
  await expect(page.locator('.answer.is-ok .card')).toHaveCount(0);
  await expect(page.locator('.answer.is-bad .feedback').first()).toContainText('Ваш ответ — 1. Правильный —');

  // Верный вопрос раскрывается касанием.
  await page.locator('.answer.is-ok summary').first().tap();
  await expect(page.locator('.answer.is-ok .feedback').first()).toHaveText('Ваш ответ — 1, верно.');

  // «Назад» из браузера не начинает билет заново, а «Вперёд» возвращает к результату.
  await page.goBack();
  await expect(title(page)).toHaveText('Билеты');
  await page.goForward();
  await expect(page.locator('.result__score')).toHaveText('5 из 20');

  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.getByRole('button', { name: 'Билет 1, последний результат 5 из 20' })).toContainText('5/20');

  // После перезагрузки история на месте.
  await page.reload();
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await expect(page.getByRole('button', { name: 'Билет 1, последний результат 5 из 20' })).toBeVisible();
  await page.getByRole('button', { name: 'История попыток' }).tap();
  await expect(page.locator('.intro')).toHaveText('Пройдено билетов: 1 из 40. Всего 1 попытка.');
  await expect(page.locator('.section-title').first()).toHaveText('Сегодня');
  await page.locator('.attempt-row', { hasText: 'Билет 1' }).tap();
  await expect(title(page)).toHaveText('Билет 1');
  await expect(page.locator('.result__score')).toHaveText('5 из 20');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(title(page)).toHaveText('История попыток');
});

test('из разбора можно пройти билет заново, и новая попытка идёт второй', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await passTicketWithFirstOptions(page, 2);
  const first = await page.locator('.result__score').textContent();

  await page.getByRole('button', { name: 'Пройти ещё раз' }).tap();
  await expect(title(page)).toHaveText('Билет 2');
  await expect(page.locator('.card__meta')).toContainText('Вопрос 1');
  // «Назад» из билета ведёт к списку билетов, а не обратно к разбору.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(title(page)).toHaveText('Билеты');

  await passTicketWithFirstOptions(page, 2);
  await expect(page.locator('.result__score')).toHaveText(first!);
  await expect(page.locator('.result__note')).toContainText('Попытка 2 из 2 для этого билета.');

  // Из истории — тоже заново, и «Назад» из билета снова ведёт к списку билетов.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'История попыток' }).tap();
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await page.locator('.attempt-row').last().tap();
  await expect(page.locator('.result__note')).toContainText('Попытка 1 из 2');
  await page.getByRole('button', { name: 'Пройти ещё раз' }).tap();
  await expect(page.locator('.card__meta')).toContainText('Вопрос 1');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(title(page)).toHaveText('Билеты');
});
