/**
 * Экзамен (этап 5): тренировка из меню по правилам ГИБДД — дополнительные вопросы, провал,
 * конец времени, выход; экзамен-босс в финале сюжета; выключатели звука и вибрации.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;

// E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

function seed(page: Page, progress?: unknown) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    if (value) localStorage.setItem('pdd-game:progress', JSON.stringify(value));
    sessionStorage.setItem('seeded', '1');
  }, progress);
}

/** Выбрать вариант в карточке экзамена (верный или неверный) и нажать «Ответить». */
async function answer(page: Page, right: boolean) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
  const options = await page.locator('.option').count();
  await page.locator('.option').nth(right ? correct : (correct + 1) % options).tap();
  // На экзамене не видно, верен ли ответ: вариант только выбран.
  await expect(page.locator('.option.is-correct, .option.is-wrong')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ответить' }).tap();
}

async function openExam(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Экзамен', exact: true }).tap();
  await expect(page.locator('.exam-rules')).toContainText('20 вопросов · 20 минут');
  await page.getByRole('button', { name: 'Начать экзамен' }).tap();
  await expect(page.locator('.exam-status')).toHaveText('Вопрос 1 из 20 · блок 1');
  // Таймер идёт по настоящим часам; на медленном сервере вопросы могут загружаться дольше.
  await expect(page.locator('.exam-timer')).toHaveText(/^(20:00|19:[0-5]\d)$/);
}

/** Сколько секунд осталось по таймеру экзамена. */
async function timeLeft(page: Page): Promise<number> {
  const [m, s] = (await page.locator('.exam-timer').textContent())!.split(':').map(Number);
  return m * 60 + s;
}

test('одна ошибка — 5 дополнительных вопросов из её блока и +5 минут; без ошибок в них — экзамен сдан', async ({ page }) => {
  await seed(page);
  await openExam(page);
  for (let i = 1; i <= 19; i++) await answer(page, i !== 8);
  const before = await timeLeft(page);
  await answer(page, true);
  const modal = page.locator('.modal');
  await expect(modal.locator('.modal__title')).toHaveText('Дополнительные вопросы');
  await expect(modal).toContainText('Время увеличено на 5 минут');
  await page.getByRole('button', { name: 'Продолжить' }).tap();
  await expect(page.locator('.exam-status')).toHaveText('Дополнительный вопрос 1 из 5 · блок 2 · без ошибок');
  // Время выросло на 5 минут — за вычетом нескольких секунд на последний ответ (таймер идёт по настоящим часам).
  expect((await timeLeft(page)) - before).toBeGreaterThanOrEqual(5 * 60 - 30);
  for (let i = 1; i <= 5; i++) await answer(page, true);

  await expect(page.locator('.exam-result__verdict')).toHaveText('Экзамен сдан!');
  await expect(page.locator('.exam-result')).toContainText('Основные вопросы: верно 19 из 20.');
  await expect(page.locator('.exam-result')).toContainText('Дополнительные: верно 5 из 5.');
  await expect(page.locator('.answer')).toHaveCount(25);
  await expect(page.locator('.answer.is-bad[open]')).toHaveCount(1);
  await expect(page.locator('.answer.is-bad .answer__title')).toHaveText('Вопрос 8 — ошибка');

  // Ошибка ушла в работу над ошибками, экзамен — в историю, и всё это переживает перезагрузку.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await expect(page.locator('.attempt-row')).toContainText('Сдан');
  await page.reload();
  await page.getByRole('button', { name: 'Экзамен', exact: true }).tap();
  await expect(page.locator('.attempt-row')).toContainText('1 ошибка');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(Object.values(saved.questions as Record<string, { review?: unknown }>).filter((q) => q.review)).toHaveLength(1);
});

test('две ошибки в одном блоке — экзамен не сдан сразу', async ({ page }) => {
  await seed(page);
  await openExam(page);
  await answer(page, true);
  await answer(page, false);
  await answer(page, true);
  await answer(page, false);
  await expect(page.locator('.exam-result__verdict')).toHaveText('Экзамен не сдан');
  await expect(page.locator('.exam-result')).toContainText('Две ошибки в одном тематическом блоке.');
  await expect(page.locator('.exam-result')).toContainText('Экзамен закончился досрочно');
  await expect(page.locator('.answer')).toHaveCount(4);
  await page.getByRole('button', { name: 'Сдать ещё раз' }).tap();
  await expect(page.locator('.exam-status')).toHaveText('Вопрос 1 из 20 · блок 1');
});

test('время вышло — экзамен не сдан', async ({ page }) => {
  await seed(page);
  await page.clock.install();
  await openExam(page);
  await answer(page, true);
  await page.clock.fastForward('19:00');
  await expect(page.locator('.exam-timer')).toHaveClass(/is-low/);
  await page.clock.fastForward('01:05');
  await expect(page.locator('.exam-result__verdict')).toHaveText('Экзамен не сдан');
  await expect(page.locator('.exam-result')).toContainText('Время вышло.');
  await expect(page.locator('.answer')).toHaveCount(1);
});

test('выход из экзамена — с подтверждением, экзамен не засчитывается', async ({ page }) => {
  await seed(page);
  await openExam(page);
  await answer(page, true);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.modal__title')).toHaveText('Выйти из экзамена?');
  await page.getByRole('button', { name: 'Продолжить экзамен' }).tap();
  await expect(page.locator('.exam-status')).toHaveText('Вопрос 2 из 20 · блок 1');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Выйти' }).tap();
  await expect(page.getByText('Экзаменов ещё не было.')).toBeVisible();
});

test('экзамен-босс в финале: сдан — концовка, права получены, история пройдена', async ({ page }) => {
  const questions: Record<string, unknown> = {};
  for (const q of QUESTIONS) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  const chapters: Record<string, unknown> = {};
  for (let i = 1; i <= 10; i++) chapters[`ch${i}`] = { points: [], seen: ['intro'], stars: 3, delivered: 1 };
  const control = [3, 7, 9].map((ticket) => ({ ticket, passed: true }));
  await seed(page, { xp: 11000, questions, chapters, finale: { control, seen: ['intro', 'controls'] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Финал: к экзамену' }).tap();
  await expect(page.locator('.check.is-done')).toHaveCount(3);
  await page.getByRole('button', { name: 'Сдать экзамен в ГИБДД' }).tap();
  // Эпилог со всеми персонажами, затем — перед экзаменом.
  await expect(page.locator('.cutscene')).toContainText('В диспетчерской «Стрелы» собрались все');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.locator('.cutscene')).toContainText('Здание ГИБДД Светофорска');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Экзамен в ГИБДД');
  for (let i = 1; i <= 20; i++) await answer(page, true);

  await expect(page.locator('.cutscene')).toContainText('Экзамен сдан');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.locator('.banner')).toContainText('История пройдена!');
  await page.getByRole('button', { name: 'К финалу' }).tap();
  await expect(page.locator('.exam-result__verdict')).toHaveText('Права получены!');
  await page.reload();
  await expect(page.getByRole('button', { name: 'История пройдена ★' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.finale.exam).toBeGreaterThan(0);
  // +2 за каждый верный ответ на знакомый вопрос и +500 за экзамен-босса.
  expect(saved.xp).toBe(11000 + 20 * 2 + 500);
});

test('звук и вибрация: выключатели сохраняются; вибрация при ошибке — но не на экзамене', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    (window as unknown as { vibrations: unknown[] }).vibrations = [];
    // writable: Phaser при запуске переприсваивает navigator.vibrate.
    Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: (p: unknown) => (window as unknown as { vibrations: unknown[] }).vibrations.push(p) });
  });
  const vibrations = () => page.evaluate(() => (window as unknown as { vibrations: unknown[] }).vibrations.length);
  await page.goto('/');

  // Ошибка в билете — вибрация.
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: 'Билет 1', exact: true }).tap();
  const correct = CORRECT.get('B01-Q01')!;
  await page.locator('.option').nth((correct + 1) % (await page.locator('.option').count())).tap();
  expect(await vibrations()).toBe(1);

  // На экзамене ошибку ничто не выдаёт.
  await page.goto('/');
  await page.getByRole('button', { name: 'Экзамен', exact: true }).tap();
  await page.getByRole('button', { name: 'Начать экзамен' }).tap();
  await answer(page, false);
  expect(await vibrations()).toBe(0);

  // Выключили вибрацию — ошибка в билете больше не вибрирует; настройка переживает перезагрузку.
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const vibration = page.getByRole('button', { name: /Вибрация при ошибке/ });
  await expect(vibration).toHaveAttribute('aria-pressed', 'true');
  await vibration.tap();
  await expect(vibration).toHaveAttribute('aria-pressed', 'false');
  const sound = page.getByRole('button', { name: /Звуки/ });
  await sound.tap();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).tap();
  await expect(page.getByRole('button', { name: /Вибрация при ошибке/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: /Звуки/ })).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/');
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: 'Билет 1', exact: true }).tap();
  await page.locator('.option').nth((correct + 1) % (await page.locator('.option').count())).tap();
  expect(await vibrations()).toBe(0);
});
