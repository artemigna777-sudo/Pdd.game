/**
 * Кадр города для гравюры в рекламном ролике: район главы 3 без интерфейса, 1080×1920.
 * Нужна запущенная игра: `npx vite --port 5173 --strictPort`.
 *
 *   npx tsx trailer/ad/shot.ts
 */
import { chromium } from '@playwright/test';
import { trailerProgress } from '../seed.ts';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: 'ru-RU' });
const page = await context.newPage();
await page.addInitScript('window.__name = (f) => f;');
await page.addInitScript((p) => {
  localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, sound: false, vibration: false }));
  localStorage.setItem('pdd-game:progress', JSON.stringify(p));
}, trailerProgress());
await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: /^Глава 3/ }).first().tap();
await page.waitForFunction(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).__game;
  return g?.scene.isActive('city') && (g.scene.getScene('city').pois?.length ?? 0) > 0;
});
// Машина проезжает немного по району, поток машин успевает появиться.
await page.waitForTimeout(2500);
await page.addStyleTag({ content: '#ui { display: none !important; }' });
await page.waitForTimeout(400);
await page.screenshot({ path: new URL('./video/city.png', import.meta.url).pathname });
await browser.close();
console.log('trailer/ad/video/city.png');
