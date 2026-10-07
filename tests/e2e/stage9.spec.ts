/**
 * Этап 9 «Мой экзамен»: дата экзамена в ГИБДД, план на сегодня как цель дня, обратный отсчёт
 * в меню, сжатые повторы, повторение пройденного, пробный экзамен по плану, итог экзамена.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
const DAY = 86_400_000;

// E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

/** Начало сегодняшнего дня (у теста и у браузера один часовой пояс) плюс `n` дней. */
const dayStart = (n = 0) => new Date(new Date().setHours(0, 0, 0, 0) + n * DAY + 3 * 3_600_000).setHours(0, 0, 0, 0);
/** Кнопка дня в календаре «Мой экзамен»: «18 октября 2026, суббота». */
const dayButton = (page: Page, ts: number) =>
  page.getByRole('button', { name: new RegExp(`^${new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} ${new Date(ts).getFullYear()},`) });
/** Выбрать день в календаре: перелистнуть месяцы и нажать на день. */
async function pickDate(page: Page, ts: number) {
  for (let i = 0; i < 13 && !(await dayButton(page, ts).count()); i++) await page.getByRole('button', { name: 'Следующий месяц' }).tap();
  await dayButton(page, ts).tap();
}

/** Прогресс: первые `answered` вопросов базы отвечены верно, `mistakes` — ошибки, которые пора повторить. */
function progressWith(answered: number, mistakes: string[] = [], plan?: unknown, ago = 2) {
  const at = Date.now() - ago * DAY;
  const questions: Record<string, unknown> = {};
  for (const q of QUESTIONS.slice(0, answered)) questions[q.id] = { n: 1, ok: true, ever: true, at };
  for (const id of mistakes) questions[id] = { n: 1, ok: false, ever: false, at, review: { stage: 0, due: at + DAY } };
  return { xp: 0, coins: 0, questions, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 }, ...(plan ? { plan } : {}) };
}

function seed(page: Page, progress: unknown) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    localStorage.setItem('pdd-game:progress', JSON.stringify(value));
    sessionStorage.setItem('seeded', '1');
  }, progress);
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));

/** Ответить на вопрос в карточке: верно или неверно. `exam` — карточка экзамена с кнопкой «Ответить». */
async function answerCard(page: Page, right: boolean, exam = false) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
  const options = await page.locator('.option').count();
  await page.locator('.option').nth(right ? correct : (correct + 1) % options).tap();
  if (exam) await page.getByRole('button', { name: 'Ответить' }).tap();
}

test('дата экзамена: план на сегодня — цель дня, обратный отсчёт в меню, всё сохраняется', async ({ page }) => {
  // Не встречались 2 последних вопроса базы, экзамен через 10 дней: оба — сегодня.
  await seed(page, progressWith(798));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Экзамен', exact: true })).not.toContainText('📅');
  await page.getByRole('button', { name: 'Экзамен', exact: true }).tap();
  await page.locator('.plan-link').tap();
  await expect(page.locator('.plan')).toContainText('Когда твой экзамен в ГИБДД?');

  // Календарь свой, а не системный. Прошедшую дату выбрать нельзя.
  const submit = page.getByRole('button', { name: 'Составить план' });
  await expect(submit).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Предыдущий месяц' })).toBeDisabled();
  await expect(dayButton(page, dayStart())).toBeEnabled();
  if (new Date(dayStart(-1)).getMonth() === new Date(dayStart()).getMonth()) await expect(dayButton(page, dayStart(-1))).toBeDisabled();
  await pickDate(page, dayStart(10));
  await expect(page.locator('.plan-date__chosen')).toContainText('через 10 дней');
  await submit.tap();

  await expect(page.locator('.plan-head .big-number')).toContainText('10');
  await expect(page.locator('.plan-task')).toHaveCount(1);
  await expect(page.locator('.plan-task')).toContainText('Новые вопросы');
  await expect(page.locator('.plan-task')).toContainText('0 из 2');
  await expect(page.locator('.plan-forecast')).toContainText('Успеваешь');
  await expect(page.locator('.plan')).toContainText('План на сегодня — это цель дня');

  // Новые вопросы: серия из двух ещё не встречавшихся вопросов, после неё цель дня выполнена.
  await page.locator('.plan-task').tap();
  await expect(page.locator('.topbar__title')).toHaveText('Новые вопросы');
  const first = (await page.locator('.card').getAttribute('aria-label'))!;
  expect(first).toContain('Билет 40');
  await answerCard(page, true);
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();
  await answerCard(page, false); // и ошибка в новом вопросе — тоже пройденный новый вопрос
  await expect(page.locator('#toast')).toContainText('Цель дня выполнена!');
  await page.getByRole('button', { name: 'Показать результат' }).tap();
  await expect(page.locator('.result')).toContainText('План на сегодня: 2 из 2 ✅.');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.plan-today .panel__title')).toHaveText('Сегодня по плану — всё ✅');
  await expect(page.locator('.plan-task')).toHaveClass(/is-done/);

  // В меню — сколько осталось до экзамена, а цель дня — план к экзамену.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  const exam = page.getByRole('button', { name: 'Экзамен. Экзамен в ГИБДД: через 10 дн.' });
  await expect(exam).toContainText('📅 через 10 дн.');
  const goal = page.getByRole('button', { name: 'Цель дня. План к экзамену на сегодня: 1 из 1, выполнена' });
  await expect(goal).toHaveClass(/is-done/);

  await page.reload();
  await expect(exam).toBeVisible();
  const saved = await readProgress(page);
  expect(saved.plan).toMatchObject({ date: dayStart(10), total: 800, today: { fresh: { target: 2, done: 2 } } });
  // Цель дня ведёт в план.
  await goal.tap();
  await expect(page.locator('.topbar__title')).toHaveText('Мой экзамен');
  await expect(page.locator('.plan-head')).toContainText('до экзамена в ГИБДД');
});

test('изменить дату: свой календарь, «Сохранить дату» и «Отмена»', async ({ page }) => {
  await seed(page, progressWith(400, [], { date: dayStart(30), total: 800, from: dayStart(-1) }));
  await page.goto('/');
  await page.getByRole('button', { name: /^Экзамен\. / }).tap();
  await page.locator('.plan-link').tap();
  await expect(page.locator('.plan-head .big-number')).toContainText('30');

  // «Отмена» закрывает календарь, дата прежняя.
  await page.getByRole('button', { name: 'Изменить дату' }).tap();
  const save = page.getByRole('button', { name: 'Сохранить дату' });
  await expect(save).toBeDisabled(); // выбрана нынешняя дата — сохранять нечего
  await expect(page.locator('.plan-date__chosen')).toContainText('Сейчас:');
  await expect(dayButton(page, dayStart(30))).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Отмена' }).tap();
  await expect(page.locator('.cal')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Изменить дату' })).toBeVisible();

  // Новая дата сохраняется одним нажатием на кнопку под календарём.
  await page.getByRole('button', { name: 'Изменить дату' }).tap();
  await pickDate(page, dayStart(45));
  await expect(page.locator('.plan-date__chosen')).toContainText('Выбрано:');
  await save.tap();
  await expect(page.locator('#toast')).toContainText('План к экзамену');
  await expect(page.locator('.plan-head .big-number')).toContainText('45');
  expect((await readProgress(page)).plan.date).toBe(dayStart(45));
});

test('повторы под дату: в разборе ошибок промежутки короче; повтор из плана засчитывается', async ({ page }) => {
  // Ошибка вчера, экзамен через 6 дней: после повтора следующий — уже завтра, а не через 3 дня.
  await seed(page, progressWith(800, ['B05-Q05'], { date: dayStart(6), total: 800 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Разбор ошибок, пора повторить: 1' }).tap();
  await expect(page.locator('.intro').first()).toContainText('промежутки короче, чтобы все повторы успели');
  await page.getByRole('button', { name: 'Назад' }).tap();

  await page.getByRole('button', { name: /^Цель дня\. План к экзамену/ }).tap();
  await expect(page.locator('.plan-task')).toHaveCount(2);
  await expect(page.locator('.plan-task').nth(0)).toContainText('Повторы ошибок');
  await expect(page.locator('.plan-task').nth(1)).toContainText('Пробный экзамен');
  await page.locator('.plan-task').nth(0).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Повтор ошибок');
  await answerCard(page, true);
  await expect(page.locator('.quiz__note')).toHaveText('Повтор засчитан. Следующий — завтра.');
  await page.getByRole('button', { name: 'Показать результат' }).tap();
  await expect(page.locator('.result')).toContainText('План на сегодня: 1 из 1 ✅.');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.plan-task').nth(0)).toHaveClass(/is-done/);
  await expect(page.locator('.plan-task').nth(1)).not.toHaveClass(/is-done/);
});

test('пробный экзамен по плану засчитывается в план на день', async ({ page }) => {
  // Все вопросы пройдены, повторов нет, экзамен через 5 дней — сегодня только пробный экзамен.
  await seed(page, progressWith(800, [], { date: dayStart(5), total: 800 }));
  await page.goto('/');
  await page.getByRole('button', { name: /^Цель дня\. План к экзамену на сегодня: 0 из 1/ }).tap();
  await expect(page.locator('.plan-task')).toHaveCount(1);
  await page.locator('.plan-task').tap();
  await expect(page.locator('.exam-status')).toHaveText('Вопрос 1 из 20 · блок 1');
  for (let i = 0; i < 20; i++) await answerCard(page, true, true);
  await expect(page.locator('.exam-result__verdict')).toHaveText('Экзамен сдан!');
  await expect(page.locator('#toast')).toContainText('Цель дня выполнена!');
  // «Назад» с результата — снова в плане.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Мой экзамен');
  await expect(page.locator('.plan-task')).toHaveClass(/is-done/);
  await expect(page.locator('.plan-task')).toContainText('1 из 1');
});

test('после даты экзамена: спросить итог, сохранить с готовностью; убрать дату', async ({ page }) => {
  await seed(page, progressWith(400, [], { date: dayStart(-2), total: 800 }));
  await page.goto('/');
  const exam = page.getByRole('button', { name: 'Экзамен. Экзамен в ГИБДД: как прошёл?' });
  await expect(exam).toContainText('📅 как прошёл?');
  const ready = Number((await page.getByRole('button', { name: /^Готовность к экзамену/ }).textContent())!.match(/(\d+)%/)![1]);
  await exam.tap();
  await expect(page.locator('.plan-link')).toContainText('Как прошёл экзамен');
  await page.locator('.plan-link').tap();
  await expect(page.locator('.plan')).toContainText(`сейчас она ${ready}%`);
  await page.getByRole('button', { name: 'Сдан ✓' }).tap();
  await expect(page.locator('.plan-result')).toContainText('сдан! 🎉');
  await expect(page.locator('.plan .big-number')).toContainText(`${ready}%`);
  await expect(page.getByRole('button', { name: 'Поделиться' })).toBeVisible();

  // После перезагрузки игра открывается с меню: итог виден под «Экзаменом» и в плане.
  await page.reload();
  const passed = page.getByRole('button', { name: 'Экзамен. Экзамен в ГИБДД: сдан ✓' });
  await expect(passed).toContainText('📅 сдан ✓');
  expect((await readProgress(page)).plan.result).toMatchObject({ passed: true, readiness: ready });
  await passed.tap();
  await expect(page.locator('.plan-link')).toContainText(`сдан, готовность в тот день — ${ready}%`);
  await page.locator('.plan-link').tap();
  await expect(page.locator('.plan-result')).toContainText('сдан! 🎉');

  // Убрать дату — с подтверждением; повторы снова обычные, в меню отсчёта нет.
  await page.getByRole('button', { name: 'Убрать дату' }).tap();
  await expect(page.locator('.modal')).toContainText('повторы ошибок снова пойдут через 1, 3 и 7 дней');
  await page.locator('.modal').getByRole('button', { name: 'Убрать дату' }).tap();
  await expect(page.locator('.plan')).toContainText('Когда твой экзамен в ГИБДД?');
  expect((await readProgress(page)).plan).toBeUndefined();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.plan-link')).toContainText('Когда твой экзамен в ГИБДД?');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.getByRole('button', { name: 'Экзамен', exact: true })).not.toContainText('📅');
});

test('закрепление: повторение пройденного начинает с вопросов, где были ошибки', async ({ page }) => {
  // Все вопросы выучены месяц назад, в двух были ошибки; экзамен через 20 дней — закрепление.
  const progress = progressWith(800, [], { date: dayStart(20), total: 800, from: dayStart(-40) }, 30) as { questions: Record<string, { miss?: number; at: number }> };
  progress.questions['B07-Q03'].miss = 2;
  progress.questions['B21-Q15'].miss = 1;
  progress.questions['B21-Q15'].at -= DAY; // встречался ещё раньше
  await seed(page, progress);
  await page.goto('/');
  await page.getByRole('button', { name: /^Цель дня\. План к экзамену/ }).tap();
  const refresh = page.locator('.plan-task', { hasText: 'Повторение пройденного' });
  await expect(refresh).toContainText('0 из 40');
  await expect(page.locator('.plan-forecast')).toContainText('Все вопросы пройдены заранее');
  await expect(page.locator('.plan-how')).toContainText('Сейчас пора освежить: 800 вопросов.');

  await refresh.tap();
  await expect(page.locator('.topbar__title')).toHaveText('Повторение пройденного');
  await expect(page.locator('.card')).toHaveAttribute('aria-label', 'Билет 21, вопрос 15');
  await answerCard(page, true);
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();
  await expect(page.locator('.card')).toHaveAttribute('aria-label', 'Билет 7, вопрос 3');
  await answerCard(page, false); // ошибка на повторении уходит в работу над ошибками
  await expect(page.locator('.quiz__note')).toHaveText('Вопрос попал в работу над ошибками: повтор завтра.');
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(refresh).toContainText('2 из 40');
  const saved = await readProgress(page);
  expect(saved.questions['B07-Q03']).toMatchObject({ miss: 3, review: { stage: 0 } });
});

