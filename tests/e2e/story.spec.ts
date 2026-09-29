/**
 * Сюжет и прогресс (этап 4): пролог и вступление главы, прогресс переживает перезагрузку,
 * конец главы 1 (флажок доставки, финал, награды, открытие главы 2), разбор ошибок и финал
 * с контрольными билетами.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface QuestionData {
  id: string;
  ticket: number;
  number: number;
  correct: number;
}
interface PlacementData {
  id: string;
  chapter: string;
  point: string;
  template: string;
}
interface MappingData {
  chapters: { id: string; points: { id: string; template: string }[] }[];
  questions: PlacementData[];
}

const QUESTIONS: QuestionData[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const MAPPING: MappingData = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const MINIGAMES = ['classroom', 'garage', 'inspector', 'first-aid'];
const SLOW = { timeout: 90_000 };

// E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;

/** Первая дорожная точка главы 1 (не мини-игра). */
const ROAD_POINT = MAPPING.chapters[0].points.find((p) => !MINIGAMES.includes(p.template))!.id;
const pointQuestions = (point: string) => MAPPING.questions.filter((q) => q.chapter === 'ch1' && q.point === point).map((q) => q.id);

function seed(page: Page, data: unknown) {
  return page.addInitScript((value) => {
    // Только при первой загрузке: после перезагрузки игра должна читать то, что сохранила сама.
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pdd-game:progress', JSON.stringify(value));
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
      sessionStorage.setItem('seeded', '1');
    }
  }, data);
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress') ?? 'null'));

async function waitCity(page: Page) {
  await page.waitForFunction(() => {
    const game = (window as unknown as { __game?: { scene: { isActive(k: string): boolean; getScene(k: string): { pois?: unknown[] } } } }).__game;
    return game?.scene.isActive('city') && (game.scene.getScene('city').pois?.length ?? 0) > 0;
  });
}

/** Начать серию точки главы (машина сразу у точки). */
function startPoint(page: Page, id: string) {
  return page.evaluate((pointId) => {
    const scene = (window as unknown as { __game: { scene: { getScene(k: string): any } } }).__game.scene.getScene('city');
    const poi = scene.pois.find((p: { point: { id: string } }) => p.point.id === pointId);
    scene.player.placeAt(poi.lane, poi.s);
    scene.startScene(poi);
  }, id);
}

/** Ответить на серию точки верно; вернуть число вопросов. */
async function answerSeriesCorrectly(page: Page): Promise<number> {
  let answered = 0;
  for (;;) {
    await expect(page.locator('.sheet.is-open .option').first()).toBeVisible(SLOW);
    const id = await page.evaluate(() => (window as unknown as { __game: { scene: { getScene(k: string): any } } }).__game.scene.getScene('city').active.placement.id as string);
    await page.locator('.sheet.is-open .option').nth(CORRECT.get(id)!).tap();
    answered++;
    const next = page.locator('.sheet__foot:not([hidden]) .btn');
    await expect(next).toBeVisible(SLOW);
    const label = (await next.textContent()) ?? '';
    await next.tap();
    if (label !== 'Следующий вопрос') return answered;
  }
}

/** Листать сюжетную сцену до конца кнопкой «Далее» (последняя кнопка называется по-разному). */
async function readCutscene(page: Page) {
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toBeVisible(SLOW);
  while (await dialog.count()) {
    await dialog.locator('.btn--primary').tap();
    await page.waitForTimeout(150);
  }
}

/** Ответить на вопрос карточки на экране билета или тренировки. */
async function answerCard(page: Page, right: boolean) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
  await page.locator('.option').nth(right ? correct : (correct + 1) % (await page.locator('.option').count())).tap();
}

test('глава 1: обучение, пролог, вступление, точка — и всё это сохраняется после перезагрузки', async ({ page }) => {
  await page.goto('/');
  // Первый запуск — короткое обучение.
  const tutorial = page.locator('.tutorial');
  await expect(tutorial.locator('.tutorial__title')).toHaveText('Курьер ПДД');
  await page.getByRole('button', { name: 'Далее' }).tap();
  await expect(tutorial.locator('.tutorial__title')).toHaveText('Езди по городу');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(tutorial).toHaveCount(0);
  await expect(page.locator('.level__title')).toHaveText('Уровень 1 · Ученик');
  await page.getByRole('button', { name: 'Начать историю' }).tap();

  // Пролог, затем вступление главы.
  const dialog = page.locator('.cutscene');
  await expect(dialog).toContainText('Светофорск');
  await expect(dialog.locator('.cutscene__count')).toHaveText('1/7');
  await page.getByRole('button', { name: 'Далее' }).tap();
  await expect(dialog.locator('.cutscene__name')).toHaveText('Марина');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(dialog).toContainText('Мешок муки');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  // Артём вызывает на гонку: выбор пропустить нельзя.
  await expect(dialog.locator('.cutscene__name')).toHaveText('Марина');
  await expect(dialog).toContainText('Знакомься: Артём');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(dialog).toContainText('Спорим, доставлю раньше');
  await expect(page.getByRole('button', { name: 'Пропустить' })).toBeHidden();
  await page.getByRole('button', { name: 'Я за точность' }).tap();
  await expect(dialog.locator('.cutscene__name')).toHaveText('Виктор Петрович');
  await page.getByRole('button', { name: 'Далее' }).tap();
  await page.getByRole('button', { name: 'Поехали' }).tap();
  // Правила за рулём (этап 8): лейтенант Соколов, педали и бонус за чистую езду — один раз.
  await expect(dialog.locator('.cutscene__name')).toHaveText('Лейтенант Соколов');
  await expect(dialog).toContainText('как вы ездите');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(dialog).toHaveCount(0);
  await waitCity(page);
  await expect(page.locator('.city-task')).toContainText('Отвезти мешок муки в пекарню «Калач»');
  await expect(page.locator('.city-task')).toContainText('Точки 0/26');

  await startPoint(page, ROAD_POINT);
  const answered = await answerSeriesCorrectly(page);
  expect(answered).toBe(pointQuestions(ROAD_POINT).length);
  await expect(page.locator('.city-task')).toContainText('Точки 1/26');

  // Закрыли игру и открыли снова: прогресс на месте, обучение и вступление не повторяются.
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.locator('.tutorial')).toHaveCount(0);
  const story = page.getByRole('button', { name: 'Глава 1: Первый день' });
  await expect(story).toBeVisible();
  await expect(page.locator('.menu__stats')).toHaveText(`Пройдено вопросов: ${answered} из 800`);
  const xp = (await readProgress(page)).xp;
  expect(xp).toBe(answered * 10 + 5);
  await expect(page.locator('.level__xp')).toHaveText(`${xp} / 200 опыта`);
  await story.tap();
  await waitCity(page);
  await page.waitForTimeout(800);
  await expect(page.locator('.cutscene')).toHaveCount(0);
  await expect(page.locator('.city-task')).toContainText('Точки 1/26');
  const state = await page.evaluate((id) => {
    const scene = (window as unknown as { __game: { scene: { getScene(k: string): any } } }).__game.scene.getScene('city');
    return scene.poiState(scene.pois.find((p: { point: { id: string } }) => p.point.id === id));
  }, ROAD_POINT);
  expect(state).toBe('done');

  // Глава 2 закрыта, пока не пройдена первая.
  await page.getByRole('button', { name: 'В меню' }).tap();
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await expect(page.locator('.chapter-card').nth(1)).toHaveClass(/is-locked/);
  await expect(page.locator('.chapter-card').nth(0)).toContainText('В пути: точки 1 из 26');
});

test('конец главы 1: флажок доставки, финал, награды и открытие главы 2', async ({ page }) => {
  // Пройдены все точки главы, кроме одной, все ответы верные.
  const questions: Record<string, unknown> = {};
  for (const q of MAPPING.questions) if (q.chapter === 'ch1' && q.point !== ROAD_POINT) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  const points = MAPPING.chapters[0].points.map((p) => p.id).filter((p) => p !== ROAD_POINT);
  await seed(page, { xp: 700, questions, chapters: { ch1: { points, seen: ['prologue', 'intro', 'race', 'beat1', 'beat2'], stars: 0, side: { step: 2, done: 1 } } }, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await expect(page.locator('.city-task')).toContainText('Точки 25/26');

  await startPoint(page, ROAD_POINT);
  await answerSeriesCorrectly(page);
  // Все точки пройдены, верных 100% — диспетчер отмечает место доставки флажком.
  await expect(page.locator('.cutscene')).toContainText('вези муку');
  await readCutscene(page);
  await expect(page.locator('.city-task')).toContainText('Вези посылку: Пекарня «Калач»');

  // Игру закрыли, не доехав: после перезапуска флажок снова на карте.
  await page.reload();
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await expect(page.locator('.city-task')).toContainText('Вези посылку: Пекарня «Калач»');
  await expect(page.locator('#toast')).toContainText('Флажок доставки на карте');
  expect(await page.evaluate(() => !!(window as unknown as { __game: { scene: { getScene(k: string): any } } }).__game.scene.getScene('city').goal)).toBe(true);

  // Доехали до флажка — финал главы и награды.
  await page.evaluate(() => {
    const scene = (window as unknown as { __game: { scene: { getScene(k: string): any } } }).__game.scene.getScene('city');
    scene.player.placeAt(scene.goal.lane, scene.goal.s);
    scene.startScene(scene.goal);
  });
  await expect(page.locator('.cutscene')).toContainText('колокольчик');
  await readCutscene(page);
  const modal = page.locator('.modal');
  await expect(modal.locator('.modal__title')).toHaveText('Глава 1 пройдена!');
  await expect(modal.locator('.rewards__stars')).toHaveText('★★★');
  await expect(modal).toContainText('Открыта глава 2: «Знаки на каждом углу»');
  await page.getByRole('button', { name: 'Глава 2' }).tap();

  // Сразу — вступление главы 2 в её районе.
  await expect(page.locator('.cutscene')).toContainText('Ромашка');
  await expect(page.locator('.topbar__title')).toHaveText('Знаки на каждом углу');

  const saved = await readProgress(page);
  expect(saved.chapters.ch1.delivered).toBeGreaterThan(0);
  expect(saved.chapters.ch1.stars).toBe(3);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Глава 2: Знаки на каждом углу' })).toBeVisible();
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await expect(page.locator('.chapter-card').nth(0)).toContainText('★★★ · пройдена · 100%');
  await expect(page.locator('.chapter-card').nth(1)).not.toHaveClass(/is-locked/);
  await expect(page.locator('.chapter-card').nth(2)).toHaveClass(/is-locked/);
});

test('разбор ошибок: повтор в свой день засчитывается, следующий — через 3 дня', async ({ page }) => {
  const yesterday = Date.now() - 86_400_000;
  await seed(page, {
    xp: 0,
    questions: { 'B01-Q01': { n: 1, ok: false, ever: false, at: yesterday, review: { stage: 0, due: yesterday } } },
    chapters: {},
    finale: { control: [], seen: [] },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Разбор ошибок, пора повторить: 1' }).tap();
  await expect(page.locator('.big-number')).toContainText('1');
  await page.getByRole('button', { name: 'Повторить сейчас (1)' }).tap();
  await answerCard(page, true);
  await expect(page.locator('.quiz__note')).toHaveText('Повтор засчитан. Следующий — через 3 дня.');
  await page.getByRole('button', { name: 'Показать результат' }).tap();
  await expect(page.locator('.result__score')).toHaveText('1 из 1');
  await expect(page.locator('.result__note')).toHaveText('На сегодня повторы закончены.');
  const saved = await readProgress(page);
  expect(saved.questions['B01-Q01'].review.stage).toBe(1);

  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.getByText('Сегодня повторять нечего')).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.getByRole('button', { name: 'Разбор ошибок', exact: true })).toBeVisible();
});

test('финал: контрольные билеты открываются после всех вопросов; ошибка — другой билет и снова повторы', async ({ page }) => {
  const questions: Record<string, unknown> = {};
  for (const q of QUESTIONS) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  const chapters: Record<string, unknown> = {};
  for (let i = 1; i <= 10; i++) chapters[`ch${i}`] = { points: [], seen: ['intro'], stars: 3, delivered: 1 };
  await seed(page, { xp: 9000, questions, chapters, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Финал: к экзамену' }).tap();

  // Вступление финала, затем — контрольные билеты открыты.
  await expect(page.locator('.cutscene')).toContainText('двадцать вопросов');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.locator('.cutscene')).toContainText('контрольные билеты');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.locator('.check.is-done')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Экзамен — после всех пунктов' })).toBeDisabled();

  // Первый контрольный билет — без ошибок.
  const slot = page.locator('.slots .btn').first();
  const ticket = Number((await slot.textContent())!.match(/\d+/)![0]);
  await slot.tap();
  await expect(page.locator('.topbar__title')).toHaveText(`Контрольный билет ${ticket}`);
  for (let i = 1; i <= 20; i++) {
    await answerCard(page, true);
    await page.getByRole('button', { name: i === 20 ? 'Показать результат' : 'Дальше', exact: true }).tap();
  }
  await expect(page.locator('.banner')).toHaveText('Контрольный билет пройден без ошибок!');
  await page.getByRole('button', { name: 'К финалу' }).tap();
  await expect(page.locator('.slots .btn').first()).toHaveText(`Билет ${ticket} ✓`);

  // Второй — с одной ошибкой: вместо него другой билет, ошибка уходит на повтор.
  const second = page.locator('.slots .btn').nth(1);
  const secondTicket = Number((await second.textContent())!.match(/\d+/)![0]);
  await second.tap();
  for (let i = 1; i <= 20; i++) {
    await answerCard(page, i !== 5);
    await page.getByRole('button', { name: i === 20 ? 'Показать результат' : 'Дальше', exact: true }).tap();
  }
  await expect(page.locator('.banner')).toContainText('Контрольный билет не засчитан');
  await page.getByRole('button', { name: 'К финалу' }).tap();
  await expect(page.locator('.check.is-done')).toHaveCount(0);
  const replaced = Number((await page.locator('.slots .btn').nth(1).textContent())!.match(/\d+/)![0]);
  expect(replaced).not.toBe(secondTicket);
  expect(replaced).not.toBe(ticket);
  // Пока ошибка не закреплена повторами, контрольные билеты закрыты.
  await expect(page.locator('.slots .btn').nth(1)).toBeDisabled();
});
