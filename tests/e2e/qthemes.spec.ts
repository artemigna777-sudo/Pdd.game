/**
 * Оформления вопросов: покупка в магазине, карточка в оформлении (текст вопроса и варианты —
 * оригинальные), серия верных ответов и монеты за полную серию, кнопка «Дальше» оформления,
 * экзамен без подсказок, праздник по дате, «Обычное».
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

type Any = any;
const QUESTIONS: { id: string; ticket: number; number: number; correct: number; text: string; options: string[] }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const q = (ticket: number, number: number) => QUESTIONS.find((x) => x.ticket === ticket && x.number === number)!;

function seed(page: Page, garage: Record<string, unknown> = {}, coins = 1000, settings: Record<string, unknown> = {}) {
  return page.addInitScript(
    ([g, c, s]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 0, coins: c, questions: {}, chapters: {}, garage: { paint: 'yellow', sticker: 'none', owned: ['yellow', 'none'], ...g }, finale: { control: [], seen: [] } }));
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false, ...s }));
      sessionStorage.setItem('seeded', '1');
    },
    [garage, coins, settings] as const,
  );
}

const coins = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!).coins as number);

async function openTicket(page: Page, n: number) {
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: new RegExp(`^Билет ${n}(,|$)`) }).tap();
}

async function answer(page: Page, ticket: number, number: number, right: boolean) {
  const x = q(ticket, number);
  await expect(page.locator('.card__meta')).toContainText(`Вопрос ${number}`);
  await page.locator('.option').nth(right ? x.correct : (x.correct + 1) % x.options.length).tap();
}

test('GYM: купить в магазине — вопрос в оформлении, серия, «Следующий подход», ошибка, экзамен без подсказок', async ({ page }) => {
  await seed(page, {}, 1000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 1000. Магазин' }).tap();
  await expect(page.locator('[data-design="auto"]')).toHaveClass(/is-selected/);
  // Первое касание — цена, второе — покупка.
  await page.locator('[data-design="gym"]').tap();
  await expect(page.locator('#toast')).toContainText('Коснись ещё раз, чтобы купить оформление «GYM» за 350');
  expect(await coins(page)).toBe(1000);
  await page.locator('[data-design="gym"]').tap();
  await expect(page.locator('#toast')).toContainText('Оформление «GYM» — уже в вопросах');
  await expect(page.locator('[data-design="gym"]')).toHaveClass(/is-selected/);
  expect(await coins(page)).toBe(650);
  // Оформление темы города отдельно не продаётся.
  await page.locator('[data-design="winter"]').tap();
  await expect(page.locator('#toast')).toContainText('идёт вместе с темой города «Зимний город»');

  await page.getByRole('button', { name: 'Назад' }).tap();
  await openTicket(page, 1);
  const card = page.locator('article.card');
  await expect(card).toHaveAttribute('data-qt', 'gym');
  // Текст вопроса и варианты — как в билете.
  const q1 = q(1, 1);
  await expect(card.locator('.card__text')).toHaveText(q1.text);
  await expect(card.locator('.option__text')).toHaveText(q1.options);
  await expect(card.locator('.qstreak')).toContainText('0/5');

  await answer(page, 1, 1, true);
  await expect(card.locator('.qstreak')).toContainText('Штанга 40 кг 1/5');
  await expect(card.locator('.feedback')).toContainText('Верно!');
  await expect(card.locator('.qflavor')).toHaveText('Есть повтор!');
  await expect(card.locator('.option.is-correct .qmark')).toHaveText('✓');
  const next = page.locator('.bottombar .btn').last();
  await expect(next).toHaveText('Следующий подход');
  await expect(next).toHaveClass(/qnext/);
  await next.tap();

  await answer(page, 1, 2, false);
  await expect(page.locator('article.card .qstreak')).toContainText('0/5');
  await expect(page.locator('article.card .feedback')).toContainText(`Неверно. Правильный ответ — ${q(1, 2).correct + 1}.`);
  await expect(page.locator('article.card .qflavor')).toHaveText('Ещё подход! Разбор ниже.');
  await expect(page.locator('article.card .option.is-wrong .qmark')).toHaveText('✕');
  await expect(page.locator('article.card .qstamp')).toHaveText('ОТКАЗ!');

  // Экзамен: оформление видно, но серии нет, а выбор ответа ничего не подсказывает.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: /^Экзамен/ }).tap();
  await page.getByRole('button', { name: 'Начать экзамен' }).tap();
  const exam = page.locator('article.card');
  await expect(exam).toHaveAttribute('data-qt', 'gym');
  await expect(exam.locator('.qstreak')).toHaveCount(0);
  await exam.locator('.option').first().tap();
  await expect(exam.locator('.option').first()).toHaveClass(/is-selected/);
  await expect(exam.locator('.is-correct, .is-wrong, .qmark, .qflavor, .qstamp')).toHaveCount(0);
});

test('полная серия — +5 монет; «Обычное» — карточка как раньше; без анимации — без частиц', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, { owned: ['yellow', 'none', 'qtheme:newyear'], qtheme: 'newyear', qstreak: 4 }, 100);
  await page.goto('/');
  await openTicket(page, 3);
  await expect(page.locator('article.card .qstreak')).toContainText('4/5');
  await answer(page, 3, 1, true);
  await expect(page.locator('#toast')).toContainText('Серия 5 из 5! +5 монет');
  await expect(page.locator('article.card .qstreak')).toContainText('Гирлянда горит! 5/5');
  // Монеты: 5 за серию и 2 за первый верный ответ.
  await expect.poll(() => coins(page)).toBe(107);
  await expect(page.locator('article.card .qpt')).toHaveCount(0);
  await page.locator('.bottombar .btn').last().tap();
  await expect(page.locator('article.card .qstreak')).toContainText('0/5');

  // «Обычное» в магазине — без оформления и без серии.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: /Магазин$/ }).tap();
  await page.locator('[data-design="classic"]').tap();
  await expect(page.locator('[data-design="classic"]')).toHaveClass(/is-selected/);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await openTicket(page, 3);
  await expect(page.locator('article.card')).not.toHaveClass(/qcard/);
  await expect(page.locator('article.card .qstreak')).toHaveCount(0);
  await answer(page, 3, 1, true);
  await expect(page.locator('.bottombar .btn').last()).toHaveText('Дальше');
});

test('праздник по дате: 31 декабря — Новый год сам; выключатель в настройках — обычная карточка', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-12-31T12:00:00'));
  await page.addInitScript(() => ((window as Any).__holidays = true));
  await seed(page);
  await page.goto('/');
  await openTicket(page, 1);
  await expect(page.locator('article.card')).toHaveAttribute('data-qt', 'newyear');

  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const toggle = page.getByRole('button', { name: /Праздничные оформления/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await openTicket(page, 1);
  await expect(page.locator('article.card')).not.toHaveClass(/qcard/);
});
