/**
 * Вся история от начала до конца: 10 глав по очереди (доставка и награды в каждой) → финал →
 * три контрольных билета → экзамен-босс → концовка. Ответы на вопросы глав засеяны заранее
 * (их проверяют другие тесты), всё остальное — настоящими касаниями.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

test.setTimeout(20 * 60_000);

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const MAPPING: { chapters: { id: string; number: number; title: string; points: { id: string }[] }[] } = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
type Any = any;

async function readCutscene(page: Page) {
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  while (await dialog.count()) {
    await dialog.locator('.btn--primary').tap();
    await page.waitForTimeout(100);
  }
}

async function answerCard(page: Page) {
  const label = (await page.locator('.card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  await page.locator('.option').nth(CORRECT.get(qid(Number(ticket), Number(number)))!).tap();
}

test('вся история: 10 глав по очереди, финал, контрольные билеты, экзамен-босс, концовка', async ({ page }) => {
  const questions: Record<string, unknown> = {};
  for (const q of QUESTIONS) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  const chapters: Record<string, unknown> = {};
  for (const c of MAPPING.chapters) chapters[c.id] = { points: c.points.map((p) => p.id), seen: ['prologue', 'intro', 'beat1', 'beat2'], stars: 0 };
  await page.addInitScript(
    (value) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
      localStorage.setItem('pdd-game:progress', JSON.stringify(value));
      sessionStorage.setItem('seeded', '1');
    },
    { xp: 0, questions, chapters, finale: { control: [], seen: [] } },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();

  for (const chapter of MAPPING.chapters) {
    await expect(page.locator('.topbar__title')).toHaveText(chapter.title);
    // Все точки пройдены, всё верно — диспетчер отмечает место доставки, флажок на карте.
    await readCutscene(page);
    await expect(page.locator('.city-task')).toContainText('Вези посылку');
    await page.waitForFunction(() => !!(window as Any).__game.scene.getScene('city').goal);
    await page.evaluate(() => {
      const scene = (window as Any).__game.scene.getScene('city');
      scene.player.placeAt(scene.goal.lane, scene.goal.s);
      scene.startScene(scene.goal);
    });
    await readCutscene(page);
    await expect(page.locator('.modal__title')).toHaveText(`Глава ${chapter.number} пройдена!`);
    await expect(page.locator('.rewards__stars')).toHaveText('★★★');
    const next = MAPPING.chapters.find((c) => c.number === chapter.number + 1);
    await page.getByRole('button', { name: next ? `Глава ${next.number}` : 'К финалу' }).tap();
  }

  // Финал: вступление, затем открываются контрольные билеты.
  await expect(page.locator('.topbar__title')).toHaveText('Финал');
  // Вступление финала и сразу — сообщение, что контрольные билеты открыты.
  await readCutscene(page);
  await expect(page.locator('.check.is-done')).toHaveCount(2);
  for (let slot = 0; slot < 3; slot++) {
    await page.locator('.slots .btn').nth(slot).tap();
    for (let i = 1; i <= 20; i++) {
      await answerCard(page);
      await page.getByRole('button', { name: i === 20 ? 'Показать результат' : 'Дальше', exact: true }).tap();
    }
    await expect(page.locator('.banner')).toHaveText('Контрольный билет пройден без ошибок!');
    await page.getByRole('button', { name: 'К финалу' }).tap();
  }
  await expect(page.locator('.check.is-done')).toHaveCount(3);

  // Экзамен-босс.
  await page.getByRole('button', { name: 'Сдать экзамен в ГИБДД' }).tap();
  await readCutscene(page);
  await expect(page.locator('.topbar__title')).toHaveText('Экзамен в ГИБДД');
  for (let i = 1; i <= 20; i++) {
    await answerCard(page);
    await page.getByRole('button', { name: 'Ответить' }).tap();
  }
  await readCutscene(page);
  await expect(page.locator('.exam-result__verdict')).toHaveText('Экзамен сдан!');
  await page.getByRole('button', { name: 'К финалу' }).tap();
  await expect(page.locator('.exam-result__verdict')).toHaveText('Права получены!');
  await expect(page.locator('.exam-result')).toContainText('звёзд: 30 из 30');

  await page.reload();
  await expect(page.getByRole('button', { name: 'История пройдена ★' })).toBeVisible();
});
