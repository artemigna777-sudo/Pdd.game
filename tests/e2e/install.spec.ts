/**
 * Плашка «Игру можно добавить на главный экран»: видна в меню на телефоне, сама не пропадает,
 * касание — инструкция для этого телефона, крестик — убрать насовсем (остаётся ссылка в меню).
 * Телефон подменяется описанием браузера (user agent).
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const TIKTOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_41.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/ru Region/RU';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36';
const QUESTIONS: { id: string }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));

async function phone(browser: Browser, o: { ua?: string; standalone?: boolean; answered?: number; clipboard?: boolean } = {}): Promise<Page> {
  const context = await browser.newContext({ userAgent: o.ua, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', baseURL: 'http://localhost:5173/' });
  if (o.clipboard) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  const at = Date.now() - 86_400_000;
  const progress = o.answered
    ? { xp: 0, coins: 0, questions: Object.fromEntries(QUESTIONS.slice(0, o.answered).map((q) => [q.id, { n: 1, ok: true, ever: true, at }])), chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } }
    : undefined;
  await page.addInitScript(
    ({ standalone, progress }) => {
      if (standalone) Object.defineProperty(navigator, 'standalone', { value: true });
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true }));
      if (progress) localStorage.setItem('pdd-game:progress', JSON.stringify(progress));
      sessionStorage.setItem('seeded', '1');
    },
    { standalone: Boolean(o.standalone), progress },
  );
  return page;
}

const tip = (page: Page) => page.getByRole('region', { name: 'Подсказка: главный экран' });
const guide = (page: Page) => page.getByRole('dialog', { name: 'На главный экран' });

test('iPhone: плашка в меню, инструкция для Safari, убирается только крестиком', async ({ browser }) => {
  const page = await phone(browser, { ua: IOS });
  await page.goto('/');
  await expect(tip(page)).toContainText('Игру можно добавить на главный экран');
  // Сама не пропадает.
  await page.waitForTimeout(5000);
  await expect(tip(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '📲 Как добавить на главный экран' })).toBeHidden();

  // «Как?» — инструкция для Safari; «Понятно» закрывает окно, плашка остаётся.
  await tip(page).getByRole('button', { name: 'Как?' }).tap();
  await expect(guide(page)).toContainText('Три касания в Safari');
  await expect(guide(page)).toContainText('«На экран „Домой“»');
  await expect(guide(page)).toContainText('Safari не сотрёт прогресс');
  await expect(guide(page).getByRole('button', { name: 'Скопировать ссылку' })).toHaveCount(0);
  await expect(guide(page)).not.toContainText('Резервная копия', { timeout: 100 });
  await guide(page).getByRole('button', { name: 'Понятно' }).tap();
  await expect(guide(page)).toHaveCount(0);
  await expect(tip(page)).toBeVisible();
  // Касание самого текста — тоже инструкция.
  await tip(page).getByRole('button', { name: /Игру можно добавить/ }).tap();
  await expect(guide(page)).toBeVisible();
  await guide(page).getByRole('button', { name: 'Понятно' }).tap();

  // Плашка — только в меню: на других экранах её нет, в меню она возвращается.
  await page.getByRole('button', { name: 'Билеты', exact: true }).tap();
  await expect(tip(page)).toHaveCount(0);
  await page.goBack();
  await expect(tip(page)).toBeVisible();

  // Крестик — насовсем: вместо плашки ссылка в меню, и после перезапуска плашки нет.
  await tip(page).getByRole('button', { name: 'Закрыть подсказку' }).tap();
  await expect(tip(page)).toHaveCount(0);
  const link = page.getByRole('button', { name: '📲 Как добавить на главный экран' });
  await expect(link).toBeVisible();
  await page.reload();
  await expect(link).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  await link.tap();
  await expect(guide(page)).toContainText('Три касания в Safari');
  await page.context().close();
});

test('ссылка из TikTok: сначала открыть в Safari, скопировать ссылку с меткой, предупреждение про прогресс', async ({ browser }) => {
  const page = await phone(browser, { ua: TIKTOK, answered: 5, clipboard: true });
  await page.goto('/?ref=tiktok');
  await tip(page).getByRole('button', { name: 'Как?' }).tap();
  await expect(guide(page)).toContainText('Ссылка открылась внутри TikTok. Сначала открой игру в Safari');
  await expect(guide(page)).toContainText('«Открыть в браузере»');
  await expect(guide(page)).toContainText('«Резервная копия»');
  await guide(page).getByRole('button', { name: 'Скопировать ссылку' }).tap();
  await expect(page.locator('#toast')).toContainText('вставь её в адресную строку Safari');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:5173/?ref=tiktok');
  await page.context().close();
});

test('Android: кнопка «Установить» в инструкции; после установки плашка уходит', async ({ browser }) => {
  const page = await phone(browser, { ua: ANDROID });
  await page.goto('/');
  await expect(tip(page)).toBeVisible();
  // Chrome готов установить игру: своё событие с окном установки.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    e.prompt = async () => void ((window as unknown as { prompted: boolean }).prompted = true);
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await tip(page).getByRole('button', { name: 'Как?' }).tap();
  await expect(guide(page)).toContainText('Нажми «Установить»');
  await guide(page).getByRole('button', { name: 'Установить' }).tap();
  await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(tip(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '📲 Как добавить на главный экран' })).toBeHidden();
  await page.context().close();
});

test('с главного экрана и на компьютере плашки нет', async ({ browser }) => {
  const installed = await phone(browser, { ua: IOS, standalone: true });
  await installed.goto('/');
  await installed.getByRole('button', { name: 'Настройки' }).waitFor();
  await expect(tip(installed)).toHaveCount(0);
  await expect(installed.getByRole('button', { name: '📲 Как добавить на главный экран' })).toBeHidden();
  await installed.context().close();

  const desktop = await phone(browser);
  await desktop.goto('/');
  await desktop.getByRole('button', { name: 'Настройки' }).waitFor();
  await expect(tip(desktop)).toHaveCount(0);
  await desktop.context().close();
});
