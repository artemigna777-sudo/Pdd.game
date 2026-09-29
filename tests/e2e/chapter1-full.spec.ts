/**
 * Полное прохождение главы 1 через интерфейс: пролог, все точки и все 81 вопрос (каждый
 * четвёртый ответ — намеренная ошибка), сообщение «нужно от 80%», повторный заезд на красные
 * точки, поездка касанием к флажку доставки, финал, награды и перезагрузка.
 *
 * Идёт несколько минут, поэтому в CI не запускается:  E2E_FULL=1 npx playwright test chapter1-full
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.E2E_FULL, 'долгий тест: E2E_FULL=1');
test.setTimeout(30 * 60_000);

const CORRECT = new Map((JSON.parse(readFileSync('data/questions.json', 'utf8')) as { id: string; correct: number }[]).map((q) => [q.id, q.correct]));
const MAPPING = JSON.parse(readFileSync('data/mapping.json', 'utf8')) as { chapters: { points: { id: string }[] }[] };
const POINTS = MAPPING.chapters[0].points.map((p) => p.id);

type Any = any;
const city = (page: Page, fn: (scene: Any, arg: Any) => unknown, arg?: unknown) =>
  page.evaluate(([f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene('city'), a), [fn.toString(), arg] as const);

async function readCutscenes(page: Page): Promise<number> {
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  let lines = 0;
  while (await dialog.count()) {
    // «Далее» или первый вариант ответа, если реплика с выбором (вызов Артёма, поручение).
    await dialog.locator('.btn--primary:visible').first().tap();
    lines++;
    await page.waitForTimeout(120);
  }
  return lines;
}

/** Координаты места касания в мини-игре (или null). */
function interiorTarget(page: Page): Promise<[number, number] | null> {
  return page.evaluate(() => {
    const g = (window as Any).__game;
    if (!g.scene.isActive('interior')) return null;
    const s = g.scene.getScene('interior');
    if (!s.target) return null;
    const cam = s.cameras.main;
    const k = cam.zoom / Math.min(window.devicePixelRatio || 1, 2);
    return [(s.target.x - cam.worldView.x) * k, (s.target.y - cam.worldView.y) * k] as [number, number];
  });
}

let answered = 0;
async function playPoint(page: Page, id: string, wrongEvery: number) {
  await city(page, (scene, pid) => {
    const poi = scene.pois.find((p: Any) => p.point.id === pid);
    scene.player.placeAt(poi.lane, poi.s);
    scene.startScene(poi);
  }, id);
  for (;;) {
    await expect
      .poll(async () => {
        const target = await interiorTarget(page);
        if (target) await page.touchscreen.tap(target[0], target[1]);
        return page.locator('.sheet.is-open .option').count();
      }, { timeout: 90_000 })
      .toBeGreaterThan(0);
    const qid = (await city(page, (scene) => scene.active.placement.id)) as string;
    const options = await page.locator('.sheet.is-open .option').count();
    answered++;
    const right = CORRECT.get(qid)!;
    await page.locator('.sheet.is-open .option').nth(wrongEvery && answered % wrongEvery === 0 ? (right + 1) % options : right).tap();
    const next = page.locator('.sheet__foot:not([hidden]) .btn');
    await expect(next).toBeVisible({ timeout: 90_000 });
    const label = await next.textContent();
    await next.tap();
    if (label !== 'Следующий вопрос') break;
  }
  await page.waitForTimeout(700);
  await readCutscenes(page);
}

test('глава 1 целиком: от пролога до доставки и наград', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Пропустить' }).tap(); // обучение
  await page.getByRole('button', { name: 'Начать историю' }).tap();
  expect(await readCutscenes(page)).toBeGreaterThan(8); // пролог и вступление
  await page.waitForFunction(() => (window as Any).__game?.scene.isActive('city') && (window as Any).__game.scene.getScene('city').pois?.length > 0);

  // Первый проход: каждый четвёртый ответ — ошибка, верных меньше 80%.
  for (const id of POINTS) await playPoint(page, id, 4);
  expect(answered).toBe(81);
  await expect(page.locator('.city-task')).toContainText('Точки 26/26 · верных 75%');
  const red = (await city(page, (scene) => scene.pois.filter((p: Any) => scene.poiState(p) === 'mistakes').map((p: Any) => p.point.id))) as string[];
  expect(red.length).toBeGreaterThan(0);

  // Второй проход: только красные точки и только вопросы с ошибкой.
  const before = answered;
  for (const id of red) await playPoint(page, id, 0);
  expect(answered - before).toBe(20);
  await expect(page.locator('.city-task')).toContainText('Вези посылку: Пекарня «Калач»');

  // Касание флажка на карте района — машина едет туда сама, мимо пройденных точек.
  await page.getByRole('button', { name: 'Карта района' }).tap();
  await page.waitForTimeout(1200);
  const [gx, gy] = (await city(page, (scene) => {
    const cam = scene.cameras.main;
    const k = cam.zoom / Math.min(window.devicePixelRatio || 1, 2);
    return [(scene.goal.marker.x - cam.worldView.x) * k, (scene.goal.marker.y - cam.worldView.y) * k];
  })) as [number, number];
  await page.touchscreen.tap(gx, gy);
  await expect(page.locator('.cutscene')).toContainText('колокольчик', { timeout: 240_000 });
  await readCutscenes(page);
  await expect(page.locator('.modal__title')).toHaveText('Глава 1 пройдена!');
  await expect(page.locator('.rewards__stars')).toHaveText('★★★');
  await page.getByRole('button', { name: 'Остаться в районе' }).tap();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Глава 2: Знаки на каждом углу' })).toBeVisible();
  await expect(page.locator('.menu__stats')).toHaveText('Пройдено вопросов: 81 из 800');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.chapters.ch1.stars).toBe(3);
  expect(Object.values(saved.questions as Record<string, { review?: unknown }>).filter((q) => q.review).length).toBe(20);
});
