/**
 * Этап 6: готовность, серия и цель дня в меню; гараж за монеты; резервная копия в файл
 * и восстановление из файла; тёмная тема и крупный шрифт; картинка результата.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
type Any = any;

// E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

/** Засеять хранилище один раз за сессию вкладки (после перезагрузки — то, что сохранила игра). */
function seed(page: Page, progress?: unknown, settings: unknown = { tutorial: true, rules: false }) {
  return page.addInitScript(
    ([p, s]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('pdd-game:settings', JSON.stringify(s));
      if (p) localStorage.setItem('pdd-game:progress', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    },
    [progress, settings] as const,
  );
}

/** Без системного меню «Поделиться» — файл скачивается. */
function noShare(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));

async function answerCard(page: Page, right: boolean) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
  const options = await page.locator('.option').count();
  await page.locator('.option').nth(right ? correct : (correct + 1) % options).tap();
}

test('меню: готовность, серия, цель дня и монеты; повтор выполняет цель дня и продлевает серию', async ({ page }) => {
  const yesterday = Date.now() - 86_400_000;
  await seed(page, {
    xp: 0,
    coins: 7,
    questions: { 'B01-Q01': { n: 1, ok: false, ever: false, at: yesterday, review: { stage: 0, due: yesterday } } },
    chapters: {},
    finale: { control: [], seen: [] },
    streak: { count: 2, best: 5 },
  });
  // Серия: вчера цель выполнена (начало вчерашнего дня по часам телефона).
  await page.addInitScript(() => {
    if (sessionStorage.getItem('streak')) return;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    const p = JSON.parse(localStorage.getItem('pdd-game:progress')!);
    p.streak.last = d.getTime();
    localStorage.setItem('pdd-game:progress', JSON.stringify(p));
    sessionStorage.setItem('streak', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Готовность к экзамену: \d+%$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Серия: 2 дня' })).toBeVisible();
  // Есть ошибка, которую пора повторить, — цель дня: повторить её.
  const goal = page.getByRole('button', { name: 'Цель дня. Повторить ошибки: 0 из 1' });
  await expect(goal).toContainText('0/1');
  await expect(page.getByRole('button', { name: 'Монеты: 7. Гараж' })).toBeVisible();

  // Готовность ведёт на экран прогресса с советами.
  await page.getByRole('button', { name: /^Готовность к экзамену/ }).tap();
  await expect(page.locator('.readiness')).toBeVisible();
  await expect(page.locator('.readiness .tip').first()).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).tap();

  await page.getByRole('button', { name: 'Разбор ошибок, пора повторить: 1' }).tap();
  await page.getByRole('button', { name: 'Повторить сейчас (1)' }).tap();
  await answerCard(page, true);
  await expect(page.locator('#toast')).toContainText('Цель дня выполнена!');
  await page.getByRole('button', { name: 'Показать результат' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Назад' }).tap();

  await expect(page.getByRole('button', { name: 'Серия: 3 дня' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Цель дня\. .*выполнена$/ })).toHaveClass(/is-done/);
  // +2 за первый верный ответ на этот вопрос, +20 за цель дня.
  await expect(page.getByRole('button', { name: 'Монеты: 29. Гараж' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Серия: 3 дня' })).toBeVisible();
  const saved = await readProgress(page);
  expect(saved.streak).toMatchObject({ count: 3, best: 5 });
});

test('без повторов цель дня — пройти 3 точки; монеты за верные ответы', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Цель дня. Пройти точки в городе: 0 из 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Серия: 0 дней' })).toBeVisible();
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: 'Билет 1', exact: true }).tap();
  await answerCard(page, true);
  await page.getByRole('button', { name: 'Дальше', exact: true }).tap();
  await answerCard(page, false);
  const saved = await readProgress(page);
  // +2 за первый верный ответ на вопрос, за ошибку — ничего.
  expect(saved.coins).toBe(2);
});

test('гараж: покраска и наклейка за монеты, выбор сохраняется и виден в меню', async ({ page }) => {
  await seed(page, { xp: 0, coins: 170, questions: {}, chapters: {}, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Монеты: 170. Гараж' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Гараж');
  await expect(page.getByRole('button', { name: /^Жёлтая/ })).toHaveAttribute('aria-pressed', 'true');

  // Не хватает монет — ничего не покупается.
  await page.getByRole('button', { name: /^Пламя/ }).tap();
  await expect(page.locator('#toast')).toContainText('Не хватает монет');
  await expect(page.locator('.garage__coins')).toContainText('170');

  await page.getByRole('button', { name: /^Красная/ }).tap();
  await expect(page.getByRole('button', { name: /^Красная/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.garage__coins')).toContainText('110');
  await page.getByRole('button', { name: /^Гоночные полосы/ }).tap();
  await expect(page.locator('.garage__coins')).toContainText('10');
  // Купленное выбирается снова бесплатно.
  await page.getByRole('button', { name: /^Жёлтая/ }).tap();
  await page.getByRole('button', { name: /^Красная/ }).tap();
  await expect(page.getByRole('button', { name: /^Красная/ })).toContainText('выбрано');
  await expect(page.locator('.garage__coins')).toContainText('10');

  await page.reload();
  await page.getByRole('button', { name: 'Монеты: 10. Гараж' }).tap();
  await expect(page.getByRole('button', { name: /^Красная/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Гоночные полосы/ })).toHaveAttribute('aria-pressed', 'true');
  const saved = await readProgress(page);
  expect(saved.garage).toEqual({ paint: 'red', sticker: 'stripes', owned: expect.arrayContaining(['red', 'stripes']) });
  expect(saved.coins).toBe(10);

  // Машина в меню (сцена улицы) перекрашена.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.waitForFunction(() => {
    const scene = (window as Any).__game.scene.getScene('street');
    return scene?.player?.texture?.key?.includes('street-player:');
  });
  const key = await page.evaluate(() => (window as Any).__game.scene.getScene('street').player.texture.key as string);
  expect(key).toContain(':stripes');
});

test('резервная копия: сохранить в файл и восстановить на «другом телефоне»', async ({ page, browser }) => {
  const questions: Record<string, unknown> = {};
  for (const q of QUESTIONS.slice(0, 40)) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  await seed(page, { xp: 1234, coins: 99, questions, chapters: {}, finale: { control: [], seen: [] } }, { tutorial: true, theme: 'dark', rules: false });
  await noShare(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить прогресс в файл' }).tap();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kurier-pdd-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  expect(backup.app).toBe('kurier-pdd');
  expect(backup.data['pdd-game:progress'].xp).toBe(1234);

  // Другой телефон: чистый браузер.
  const other = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await seed(other, { xp: 5, coins: 1, questions: {}, chapters: {}, finale: { control: [], seen: [] } });
  await other.goto('/');
  await other.getByRole('button', { name: 'Настройки' }).tap();

  // Не тот файл — понятное сообщение, прогресс не тронут.
  await other.locator('.backup input[type=file]').setInputFiles({ name: 'photo.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') });
  await expect(other.locator('.backup')).toContainText('Это не файл резервной копии игры.');
  await other.locator('.backup input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('не json') });
  await expect(other.locator('.backup')).toContainText('Это не файл резервной копии игры.');

  // Настоящий файл — сначала предупреждение, «Отмена» ничего не меняет.
  await other.locator('.backup input[type=file]').setInputFiles(path);
  await expect(other.locator('.modal__title')).toHaveText('Восстановить прогресс?');
  await expect(other.locator('.modal')).toContainText('отвечено вопросов — 40 из 800');
  await other.getByRole('button', { name: 'Отмена' }).tap();
  expect((await readProgress(other)).xp).toBe(5);

  await other.locator('.backup input[type=file]').setInputFiles(path);
  await other.getByRole('button', { name: 'Восстановить', exact: true }).tap();
  await other.waitForLoadState('load');
  await expect(other.getByRole('button', { name: 'Монеты: 99. Гараж' })).toBeVisible();
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  const restored = await readProgress(other);
  expect(restored.xp).toBe(1234);
  expect(Object.keys(restored.questions)).toHaveLength(40);
  await other.close();
});

test('тёмная тема и крупный шрифт: переключаются и сохраняются', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'auto');
  await expect(html).toHaveAttribute('data-text', 'normal');
  await page.getByRole('button', { name: 'Настройки' }).tap();
  await page.getByRole('button', { name: 'Тёмная' }).tap();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Тёмная' })).toHaveAttribute('aria-pressed', 'true');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.screen--page')!).backgroundColor);
  expect(bg).toBe('rgb(18, 24, 32)');
  await page.getByRole('button', { name: /Крупный шрифт/ }).tap();
  await expect(html).toHaveAttribute('data-text', 'big');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-text', 'big');
  // Крупный шрифт в карточке вопроса.
  await page.goto('/');
  await page.getByRole('button', { name: 'Билеты' }).tap();
  await page.getByRole('button', { name: 'Билет 1', exact: true }).tap();
  const size = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.option__text')!).fontSize));
  expect(size).toBeGreaterThanOrEqual(20);
});

test('картинка результата: системное меню «Поделиться» получает PNG', async ({ page }) => {
  await seed(page, { xp: 2400, coins: 0, questions: {}, chapters: {}, finale: { control: [], seen: [] } });
  await page.addInitScript(() => {
    (window as Any).shared = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { files: File[] }) => {
        (window as Any).shared.push(data.files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Прогресс' }).tap();
  await page.getByRole('button', { name: 'Поделиться' }).tap();
  await page.waitForFunction(() => (window as Any).shared.length === 1);
  const [file] = await page.evaluate(() => (window as Any).shared[0]);
  expect(file.type).toBe('image/png');
  expect(file.name).toMatch(/\.png$/);
  expect(file.size).toBeGreaterThan(10_000);
});
