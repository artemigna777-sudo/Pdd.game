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
  player: { position: { x: number; y: number } };
  cameras: { main: { zoom: number; worldView: { x: number; y: number } } };
}

async function openCity(page: Page, control: 'tap' | 'joystick') {
  await page.addInitScript((mode) => localStorage.setItem('pdd-game:settings', JSON.stringify({ control: mode })), control);
  await page.goto('/');
  await page.getByRole('button', { name: 'Поехать в город' }).tap();
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
  const [x0, y0] = await carPosition(page);
  const [sx, sy] = await screenOf(page, [x0 + 120, y0]);
  await page.touchscreen.tap(sx, sy);
  await expect.poll(async () => (await carPosition(page))[0], { timeout: 10_000 }).toBeGreaterThan(x0 + 100);
});

test('джойстик: машина едет, пока палец отведён, и останавливается после отпускания', async ({ page, context }) => {
  await openCity(page, 'joystick');
  const [x0] = await carPosition(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

  // Ведём палец вправо — машина едет на восток.
  await touch('touchStart', 195, 600);
  for (let i = 1; i <= 6; i++) await touch('touchMove', 195 + i * 8, 600);
  await expect.poll(async () => (await carPosition(page))[0], { timeout: 10_000 }).toBeGreaterThan(x0 + 60);
  await touch('touchEnd');

  // Отпустили — машина плавно останавливается.
  await page.waitForTimeout(2500);
  const stopped = await carPosition(page);
  await page.waitForTimeout(700);
  expect(await carPosition(page)).toEqual(stopped);
});

test('точка интереса: доехать касанием, ответить на вопрос и поехать дальше', async ({ page }) => {
  await openCity(page, 'tap');
  // Ближайшая точка — «Знаки» на той же улице.
  const marker = await page.evaluate(() => {
    const scene = (window as unknown as { __game: CityDebug }).__game.scene.getScene('city') as unknown as {
      pois: Array<{ point: { id: string }; marker: { x: number; y: number } }>;
    };
    const poi = scene.pois.find((p) => p.point.id === 'signs')!;
    return [poi.marker.x, poi.marker.y] as Vec;
  });
  const [sx, sy] = await screenOf(page, marker);
  await page.touchscreen.tap(sx, sy);

  const sheet = page.locator('.sheet.is-open');
  await expect(sheet).toBeVisible({ timeout: 20_000 });
  await expect(sheet.locator('.card__text')).toHaveText('Какие из указанных знаков запрещают движение водителям мопедов?');

  // Неправильный ответ: сначала последствие, потом пояснение и кнопка «едем дальше».
  await sheet.locator('.option').first().tap();
  const next = page.getByRole('button', { name: 'Понятно, едем дальше' });
  await expect(next).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.sheet .explanation')).toBeVisible();

  const [x0] = await carPosition(page);
  await next.tap();
  await expect(page.locator('.sheet.is-open')).toHaveCount(0);
  await expect.poll(async () => (await carPosition(page))[0], { timeout: 10_000 }).toBeGreaterThan(x0 + 40);
});
