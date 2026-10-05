/**
 * Этап 11 «Знакодекс»: альбом знаков, закрытый знак и «Найти», сообщение о новом знаке,
 * награда за собранную группу и наклейка в гараже.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; ticket: number; number: number; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const SIGNS: { number: string; title: string; group: string; questions: string[] }[] = JSON.parse(readFileSync('data/signs.json', 'utf8')).signs;

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

function seed(page: Page, progress: unknown) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    localStorage.setItem('pdd-game:progress', JSON.stringify(value));
    sessionStorage.setItem('seeded', '1');
  }, progress);
}

/** Ответить верно на вопрос в карточке. */
async function answerRight(page: Page) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!.map(Number);
  const q = QUESTIONS.find((x) => x.ticket === ticket && x.number === number)!;
  await page.locator('.option').nth(q.correct).tap();
}

test('Знакодекс: последний знак группы — «Найти», новый знак, награда и наклейка', async ({ page }) => {
  // Все знаки приоритета, кроме одного, открыты вопросами, где этого знака нет.
  const priority = SIGNS.filter((s) => s.group === 'priority');
  const last = priority.find((x) => priority.every((s) => s === x || s.questions.some((id) => !x.questions.includes(id))))!;
  const at = Date.now() - 86_400_000;
  const questions: Record<string, unknown> = {};
  for (const s of priority) if (s !== last) questions[s.questions.find((id) => !last.questions.includes(id))!] = { n: 1, ok: true, ever: true, at };
  const open = SIGNS.filter((s) => s.questions.some((id) => id in questions)).length;
  await seed(page, { xp: 0, coins: 0, questions, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } });
  await page.goto('/');

  await page.getByRole('button', { name: 'Режимы' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Знакодекс' })).toContainText(`Собрано: ${open} из ${SIGNS.length}`);
  await page.locator('.mode-card', { hasText: 'Знакодекс' }).tap();
  await expect(page.locator('.signs-head .big-number')).toContainText(`${open} из ${SIGNS.length}`);
  const group = page.locator('.signs-group', { hasText: 'Знаки приоритета' });
  await expect(group.locator('.signs-group__count')).toHaveText(`${priority.length - 1} / ${priority.length}`);
  await expect(group).toContainText('За всю группу: 🪙 50 и наклейка «Главная дорога»');

  // Закрытый знак: название скрыто, «Найти» — тренировка его вопросов.
  const locked = group.locator('.sign-tile.is-locked');
  await expect(locked).toHaveCount(1);
  await locked.tap();
  await expect(page.locator('.modal__title')).toHaveText('Закрытый знак');
  await expect(page.locator('.modal')).not.toContainText(last.title);
  await page.getByRole('button', { name: 'Найти' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText(`Знак ${last.number}`);
  await answerRight(page);

  // Сообщение: группа собрана (знак — последний в группе).
  await expect(page.locator('#sign-chip')).toHaveClass(/is-visible/);
  await expect(page.locator('#sign-chip')).toContainText('Группа знаков собрана: «Знаки приоритета»');

  // Назад в альбом: знак открыт, награду можно забрать один раз.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(group.locator('.sign-tile.is-locked')).toHaveCount(0);
  await expect(group.locator('.signs-group__count')).toHaveText(`${priority.length} / ${priority.length}`);
  await group.getByRole('button', { name: /Забрать награду/ }).tap();
  await expect(group).toContainText('Награда получена: 🪙 50 и наклейка «Главная дорога» ✓');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(progress.signs.claimed).toEqual(['priority']);
  expect(progress.garage.owned).toContain('diamond');

  // Открытый знак: название, описание и источник.
  await group.locator('.sign-tile', { hasText: last.number }).tap();
  await expect(page.locator('.modal__title')).toHaveText(last.title);
  await expect(page.locator('.sign-card__source')).toContainText('pdd_russia');
  await page.locator('.modal').getByRole('button', { name: 'Закрыть' }).tap();

  // Наклейка — в гараже, её можно выбрать.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.locator('.status__pill').last().tap();
  const sticker = page.locator('.garage__item', { hasText: 'Главная дорога' });
  await expect(sticker).toContainText('есть');
  await sticker.tap();
  await expect(sticker).toContainText('выбрано');
  // Наклейки других групп пока закрыты.
  const ring = page.locator('.garage__item', { hasText: 'Красный круг' });
  await expect(ring).toContainText('🔒 Знакодекс');
  await ring.tap();
  await expect(page.locator('#toast')).toContainText('собери все знаки группы «Запрещающие знаки»');
});

test('Знакодекс: новый знак отмечается и после ответа в билете', async ({ page }) => {
  await seed(page, { xp: 0, coins: 0, questions: {}, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } });
  await page.goto('/');
  // Билет 1, вопрос 1 — без знака, вопрос 2 — со знаком 1.11.2.
  const sign = SIGNS.find((s) => s.questions.includes('B01-Q02'))!;
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: /^Билет 1(,|$)/ }).tap();
  await answerRight(page);
  await page.waitForTimeout(500);
  await expect(page.locator('#sign-chip')).not.toHaveClass(/is-visible/);
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();
  await answerRight(page);
  await expect(page.locator('#sign-chip')).toContainText(`Новый знак в Знакодексе: ${sign.number}`);
});
