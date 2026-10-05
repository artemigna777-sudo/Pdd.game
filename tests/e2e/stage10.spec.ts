/**
 * Этап 10 «Дуэль»: вызов другу по ссылке, ответ на тех же вопросах, итог у обоих игроков.
 * Два телефона — два отдельных браузерных контекста с разными хранилищами.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;

// E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
async function slow(page: Page) {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
}

test.beforeEach(async ({ page }) => slow(page));

function seed(page: Page) {
  return page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    sessionStorage.setItem('seeded', '1');
  });
}

/** Второй телефон: свой браузер со своим хранилищем. */
async function secondPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', baseURL: 'http://localhost:5173/' });
  const page = await context.newPage();
  await slow(page);
  await seed(page);
  return page;
}

/** Ответить на вопрос дуэли верно или неверно и нажать «Ответить». */
async function answer(page: Page, right: boolean) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
  const options = await page.locator('.option').count();
  await page.locator('.option').nth(right ? correct : (correct + 1) % options).tap();
  // Во время дуэли верен ли ответ не видно.
  await expect(page.locator('.option.is-correct, .option.is-wrong')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ответить' }).tap();
}

/** Пройти дуэль: первые `right` ответов верные. */
async function playDuel(page: Page, right: number) {
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.exam-status')).toHaveText(`Вопрос ${i + 1} из 10`);
    await answer(page, i < right);
  }
}

test('дуэль: вызов по ссылке, ответ друга на другом телефоне, итог у обоих', async ({ page, browser }) => {
  await seed(page);
  await page.goto('/');

  // Телефон 1: «Режимы» → «Дуэль», имя и 10 вопросов.
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await expect(page.locator('.duel')).toContainText('Дуэлей ещё не было.');
  const start = page.getByRole('button', { name: 'Новая дуэль' });
  await expect(start).toBeDisabled();
  await page.getByLabel('Твоё имя в дуэли').fill('Артём');
  await start.tap();
  await expect(page.locator('.topbar__title')).toHaveText('Дуэль');
  await playDuel(page, 7);

  await expect(page.locator('.result__score').first()).toHaveText('7 из 10');
  await expect(page.locator('.duel-share')).toContainText('Отправь вызов другу');
  await expect(page.locator('.qr svg')).toBeVisible();
  const challenge = await page.locator('.duel-link').inputValue();
  expect(challenge).toMatch(/#duel=[A-Za-z0-9_-]+$/);
  // Ответы идут в прогресс: 3 ошибки — в работу над ошибками.
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(Object.keys(progress.questions)).toHaveLength(10);
  expect(Object.values(progress.questions).filter((q) => (q as { review?: unknown }).review)).toHaveLength(3);
  await expect(page.locator('.answer.is-bad')).toHaveCount(3);

  // Телефон 2: открывает ссылку — вызов от Артёма.
  const friend = await secondPhone(browser);
  await friend.goto(challenge);
  await expect(friend.locator('.duel-invite')).toContainText('Тебя вызывают на дуэль!');
  await expect(friend.locator('.duel-invite__name')).toHaveText('Артём');
  await expect(friend.locator('.duel-invite .result__score')).toHaveText('7 из 10');
  // Адрес очищен: перезагрузка не откроет вызов снова.
  expect(new URL(friend.url()).hash).toBe('');
  await friend.getByLabel('Твоё имя в дуэли').fill('Маша');
  await friend.getByRole('button', { name: 'Принять вызов' }).tap();
  await expect(friend.locator('.topbar__title')).toHaveText('Дуэль с: Артём');
  await playDuel(friend, 10);

  await expect(friend.locator('.duel-result__verdict')).toHaveText('Победа! 🏆');
  await expect(friend.locator('.duel-side')).toHaveCount(2);
  await expect(friend.locator('.duel-side.is-winner')).toContainText('Маша');
  await expect(friend.locator('.duel-share')).toContainText('Отправь результат: Артём');
  await expect(friend.locator('.answer__them').first()).toContainText('Артём:');
  const reply = await friend.locator('.duel-link').inputValue();
  expect(reply).not.toBe(challenge);

  // «Назад» — история дуэлей.
  await friend.getByRole('button', { name: 'Назад' }).tap();
  await expect(friend.locator('.attempt-row')).toHaveCount(1);
  await expect(friend.locator('.attempt-row')).toContainText('Победа · Артём');

  // Тот же вызов ещё раз — уже итог, а не новая дуэль.
  await friend.goto(challenge);
  await expect(friend.locator('.duel-result__verdict')).toHaveText('Победа! 🏆');

  // Телефон 1: ответная ссылка — итог дуэли.
  await page.goto(reply);
  await expect(page.locator('.duel-result__verdict')).toHaveText('Поражение');
  await expect(page.locator('.duel-side.is-winner')).toContainText('Маша');
  await expect(page.locator('.duel-side').first()).toContainText('7 из 10');
  await expect(page.locator('.duel-share')).toHaveCount(0);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await expect(page.locator('.attempt-row')).toContainText('Поражение · Маша');
  await expect(page.locator('.duel')).toContainText('Побед: 0 · поражений: 1 · ничьих: 0');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Дуэль' })).toContainText('Побед: 0 · поражений: 1');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.screen--menu')).toBeVisible();

  // После перезагрузки история на месте, а дуэль сама не открывается.
  await page.reload();
  await expect(page.locator('.screen--menu')).toBeVisible();
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await expect(page.locator('.attempt-row')).toContainText('Поражение · Маша');
  await friend.context().close();
});

test('дуэль: испорченная ссылка не ломает игру; выход из дуэли — с подтверждением', async ({ page }) => {
  await seed(page);
  await page.goto('/#duel=abc');
  await expect(page.locator('#toast')).toContainText('Ссылка на дуэль повреждена');
  await expect(page.locator('.screen--menu')).toBeVisible();

  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await page.getByLabel('Твоё имя в дуэли').fill('Артём');
  await page.getByRole('button', { name: 'Новая дуэль' }).tap();
  await answer(page, true);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.modal')).toContainText('Выйти из дуэли?');
  await page.getByRole('button', { name: 'Продолжить дуэль' }).tap();
  await expect(page.locator('.exam-status')).toHaveText('Вопрос 2 из 10');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Выйти' }).tap();
  // Дуэль не засчитана, имя запомнилось.
  await expect(page.locator('.duel')).toContainText('Дуэлей ещё не было.');
  await expect(page.getByLabel('Твоё имя в дуэли')).toHaveValue('Артём');
  const progress = await page.evaluate(() => localStorage.getItem('pdd-game:progress'));
  expect(progress === null || Object.keys(JSON.parse(progress).questions).length === 0).toBe(true);
});
