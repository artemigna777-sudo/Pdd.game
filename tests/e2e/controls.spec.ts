/**
 * Управление машиной настоящими касаниями по экрану: касание дороги и джойстик.
 * Проверяет и то, что интерфейс поверх игры не перехватывает касания.
 */
import { expect, test, type Page } from '@playwright/test';

type Vec = [number, number];

interface CityDebug {
  scene: { isActive(key: string): boolean; getScene(key: string): CitySceneDebug };
}
interface CitySceneDebug {
  pois?: unknown[];
  player: { position: { x: number; y: number }; speed: number };
  cameras: { main: { zoom: number; worldView: { x: number; y: number } } };
}

async function openCity(page: Page, control: 'tap' | 'joystick', chapter = 1) {
  // E2E_SLOW=6 — замедлить процессор браузера, как на сервере CI без видеокарты.
  if (process.env.E2E_SLOW) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
  }
  await page.addInitScript((mode) => localStorage.setItem('pdd-game:settings', JSON.stringify({ control: mode })), control);
  await page.goto('/');
  await page.getByRole('button', { name: 'Поехать в город' }).tap();
  await page.locator('.chapter-card').nth(chapter - 1).tap();
  await page.waitForFunction(() => {
    const game = (window as unknown as { __game?: CityDebug }).__game;
    return game?.scene.isActive('city') && (game.scene.getScene('city').pois?.length ?? 0) > 0;
  });
  await page.waitForTimeout(800);
}

function carPosition(page: Page): Promise<Vec> {
  return page.evaluate(() => {
    const p = (window as unknown as { __game: CityDebug }).__game.scene.getScene('city').player.position;
    return [p.x, p.y] as Vec;
  });
}

/** Куда смотрит машина (единичный вектор). */
function carHeading(page: Page): Promise<Vec> {
  return page.evaluate(() => {
    const a = (window as unknown as { __game: { scene: { getScene(k: string): { player: { angle: number } } } } }).__game.scene.getScene('city').player.angle;
    return [Math.sin(a), -Math.cos(a)] as Vec;
  });
}

const moved = async (page: Page, from: Vec) => {
  const [x, y] = await carPosition(page);
  return Math.hypot(x - from[0], y - from[1]);
};

function carSpeed(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __game: CityDebug }).__game.scene.getScene('city').player.speed);
}

/**
 * На сервере CI браузер рисует без видеокарты и заметно медленнее телефона, поэтому тесты
 * ждут нужного состояния, а не фиксированное время.
 */
const SLOW = { timeout: 90_000 };

/** Экранная точка (CSS-пиксели) для точки мира. */
function screenOf(page: Page, world: Vec): Promise<Vec> {
  return page.evaluate(([wx, wy]) => {
    const cam = (window as unknown as { __game: CityDebug }).__game.scene.getScene('city').cameras.main;
    const k = cam.zoom / Math.min(window.devicePixelRatio || 1, 2);
    return [(wx - cam.worldView.x) * k, (wy - cam.worldView.y) * k] as Vec;
  }, world);
}

test('касание в городе попадает в игру, а не в слой интерфейса', async ({ page }) => {
  await openCity(page, 'tap');
  const tag = await page.evaluate(() => document.elementFromPoint(195, 500)?.tagName);
  expect(tag).toBe('CANVAS');
});

test('касание дороги: машина едет к точке касания', async ({ page }) => {
  await openCity(page, 'tap');
  const start = await carPosition(page);
  const [hx, hy] = await carHeading(page);
  const [sx, sy] = await screenOf(page, [start[0] + hx * 120, start[1] + hy * 120]);
  await page.touchscreen.tap(sx, sy);
  await expect.poll(() => moved(page, start), SLOW).toBeGreaterThan(100);
});

test('джойстик: машина едет, пока палец отведён, и останавливается после отпускания', async ({ page, context }) => {
  await openCity(page, 'joystick');
  const start = await carPosition(page);
  const [hx, hy] = await carHeading(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

  // Ведём палец по ходу машины — она едет вперёд.
  await touch('touchStart', 195, 600);
  for (let i = 1; i <= 6; i++) await touch('touchMove', 195 + hx * i * 8, 600 + hy * i * 8);
  await expect.poll(() => moved(page, start), SLOW).toBeGreaterThan(40);
  await touch('touchEnd');
  const release = await carPosition(page);

  // Отпустили — машина плавно останавливается (в пределах тормозного пути) и больше не едет,
  // даже если впереди точка интереса.
  await expect.poll(() => carSpeed(page), SLOW).toBe(0);
  const [xs, ys] = await carPosition(page);
  expect(await moved(page, release)).toBeLessThan(70);
  await page.waitForTimeout(1000);
  const [x1, y1] = await carPosition(page);
  expect(Math.hypot(x1 - xs, y1 - ys)).toBeLessThan(0.5);
});

interface PoiDebug {
  point: { id: string; template: string };
  marker: { x: number; y: number };
  queue: unknown[];
}

/** Координаты места касания в мини-игре (или null, если мини-игра касания не ждёт). */
function interiorTarget(page: Page): Promise<Vec | null> {
  return page.evaluate(() => {
    const game = (window as unknown as { __game: CityDebug & { scene: { getScene(key: string): unknown } } }).__game;
    if (!game.scene.isActive('interior')) return null;
    const s = game.scene.getScene("interior") as { target?: { x: number; y: number }; cameras: CitySceneDebug["cameras"] };
    if (!s.target) return null;
    const cam = s.cameras.main;
    const k = cam.zoom / Math.min(window.devicePixelRatio || 1, 2);
    return [(s.target.x - cam.worldView.x) * k, (s.target.y - cam.worldView.y) * k] as Vec;
  });
}

/** Ответить на все вопросы серии точки (первым вариантом) и нажать «дальше» после каждого. */
async function answerSeries(page: Page): Promise<number> {
  let answered = 0;
  for (;;) {
    const sheet = page.locator('.sheet.is-open');
    // Мини-игра сначала просит коснуться места в сцене.
    await expect
      .poll(async () => {
        const target = await interiorTarget(page);
        if (target) await page.touchscreen.tap(target[0], target[1]);
        return sheet.locator('.option').count();
      }, SLOW)
      .toBeGreaterThan(0);
    await sheet.locator('.option').first().tap();
    answered++;
    const next = page.locator('.sheet__foot:not([hidden]) .btn');
    await expect(next).toBeVisible(SLOW);
    const label = (await next.textContent()) ?? '';
    await next.tap();
    if (label !== 'Следующий вопрос') return answered;
  }
}

test('точка интереса: доехать касанием, ответить на серию вопросов и поехать дальше', async ({ page }) => {
  await openCity(page, 'tap');
  // Ближайшая к машине точка на дорогах района.
  const marker = await page.evaluate(() => {
    const scene = (window as unknown as { __game: CityDebug }).__game.scene.getScene('city') as unknown as CitySceneDebug & { pois: PoiDebug[] };
    const p = scene.player.position;
    const poi = [...scene.pois].sort((a, b) => Math.hypot(a.marker.x - p.x, a.marker.y - p.y) - Math.hypot(b.marker.x - p.x, b.marker.y - p.y))[0];
    return [poi.marker.x, poi.marker.y] as Vec;
  });
  const [sx, sy] = await screenOf(page, marker);
  await page.touchscreen.tap(sx, sy);

  // Машина остановилась у первой точки на пути: сцена ожила, выехала карточка с вопросом.
  await expect
    .poll(async () => (await page.locator('.sheet.is-open').count()) + (await interiorTarget(page) ? 1 : 0), SLOW)
    .toBeGreaterThan(0);
  const answered = await answerSeries(page);
  expect(answered).toBeGreaterThan(0);
  await expect(page.locator('.sheet.is-open')).toHaveCount(0);
  await expect.poll(() => carSpeed(page), SLOW).toBeGreaterThan(0);
});

for (const [chapter, template] of [
  [1, 'classroom'],
  [7, 'inspector'],
  [9, 'garage'],
  [6, 'first-aid'],
] as const) {
  test(`мини-игра «${template}»: касание в сцене, вся серия вопросов, возврат в город`, async ({ page }) => {
    await openCity(page, 'tap', chapter);
    const total = await page.evaluate((t) => {
      const scene = (window as unknown as { __game: CityDebug }).__game.scene.getScene('city') as unknown as {
        pois: Array<PoiDebug & { lane: unknown; s: number }>;
        player: { placeAt(lane: unknown, s: number): void };
        startScene(poi: unknown): void;
      };
      const poi = scene.pois.find((p) => p.point.template === t)!;
      scene.player.placeAt(poi.lane, poi.s);
      scene.startScene(poi);
      return poi.queue.length;
    }, template);
    expect(await answerSeries(page)).toBe(total);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __game: CityDebug }).__game.scene.isActive('interior')), SLOW).toBe(false);
  });
}
