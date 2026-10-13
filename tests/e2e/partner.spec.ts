/**
 * Видеоразборы партнёра: после неверного ответа в билетах 1–3 под пояснением — «Смотреть разбор»,
 * видео в окне поверх игры сразу на нужном вопросе, закрыл — и вопрос на месте. Ссылки подменены,
 * видеохостинг в тесте не нужен.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; ticket: number; number: number; correct: number; options: string[] }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const q = (ticket: number, number: number) => QUESTIONS.find((x) => x.ticket === ticket && x.number === number)!;
const starts = ['0:15', ...Array.from({ length: 19 }, (_, i) => `${i + 1}:00`)];

async function open(page: Page, partner: boolean) {
  await page.addInitScript(
    ([on, s]) => {
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true }));
      if (on)
        (window as unknown as { __partner: unknown }).__partner = {
          author: 'Пётр',
          role: 'автоинструктор',
          course: { title: 'Учимся понимать ПДД через разбор билетов', url: 'https://school.test/course' },
          tickets: { 1: { url: 'https://www.youtube.com/watch?v=abcDEF12345', starts: s }, 2: { url: 'https://www.youtube.com/watch?v=ghiJKL67890', starts: s } },
        };
    },
    [partner, starts] as const,
  );
  await page.route('https://www.youtube.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<p>видео</p>' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Билеты' }).tap();
}

async function answer(page: Page, ticket: number, number: number, right: boolean) {
  const x = q(ticket, number);
  await expect(page.locator('.card__meta')).toContainText(`Вопрос ${number}`);
  await page.locator('.option').nth(right ? x.correct : (x.correct + 1) % x.options.length).tap();
}

test('ошибка в билете 1 — видеоразбор в окне на нужном вопросе; верный ответ и билет без видео — без кнопки', async ({ page }) => {
  await open(page, true);
  await page.getByRole('button', { name: /^Билет 1(,|$)/ }).tap();

  // Верный ответ — без видео.
  await answer(page, 1, 1, true);
  await expect(page.locator('.explanation')).toBeVisible();
  await expect(page.locator('.partner-video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();

  // Ошибка — кнопка под пояснением, с номером вопроса и тайм-кодом.
  await answer(page, 1, 2, false);
  const block = page.locator('.explanation .partner-video');
  await expect(block).toContainText('Автоинструктор Пётр разбирает билет 1 на видео — вопрос 2 начинается с 1:00.');
  await block.getByRole('button', { name: '▶ Смотреть разбор' }).tap();

  const modal = page.getByRole('dialog', { name: 'Разбор: билет 1, вопрос 2' });
  await expect(modal.locator('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/abcDEF12345?start=60&rel=0&playsinline=1');
  await expect(modal.getByRole('link', { name: 'Открыть видео отдельно' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcDEF12345&t=60s');
  await expect(modal.getByRole('link', { name: 'О курсе' })).toHaveAttribute('href', 'https://school.test/course?utm_source=kurier-pdd&utm_medium=game');
  await modal.getByRole('button', { name: 'Вернуться к вопросу' }).tap();
  // Окно закрыто, видео остановлено, вопрос на месте — можно идти дальше.
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('.card__meta')).toContainText('Вопрос 2');
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();
  await expect(page.locator('.card__meta')).toContainText('Вопрос 3');

  // Билет 4 — видео у Петра нет.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: /^Билет 4(,|$)/ }).tap();
  await answer(page, 4, 1, false);
  await expect(page.locator('.explanation')).toBeVisible();
  await expect(page.locator('.partner-video')).toHaveCount(0);
});

test('без ссылок от партнёра кнопки нет ни у одного вопроса', async ({ page }) => {
  await open(page, false);
  await page.getByRole('button', { name: /^Билет 1(,|$)/ }).tap();
  await answer(page, 1, 1, false);
  await expect(page.locator('.explanation')).toBeVisible();
  await expect(page.locator('.partner-video')).toHaveCount(0);
});
