/**
 * Статистика для автора игры: секретный вход (7 касаний по «Версия игры»), ключ, отчёт из счётчика
 * (ответы сервера GoatCounter подменены), «Забыть ключ»; без счётчика — инструкция.
 */
import { expect, test, type Page } from '@playwright/test';

function seed(page: Page, site?: string) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    if (value) localStorage.setItem('pdd-game:stats-site-dev', JSON.stringify(value));
    sessionStorage.setItem('seeded', '1');
  }, site);
}

async function openSettings(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).first().tap();
  await expect(page.locator('.topbar__title')).toHaveText('Настройки');
}

async function secretTaps(page: Page) {
  const heading = page.getByRole('heading', { name: 'Версия игры' });
  await heading.scrollIntoViewIfNeeded();
  for (let i = 0; i < 7; i++) await heading.tap();
}

const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('секретный вход: 7 касаний — статистика по ключу из счётчика', async ({ page }) => {
  await seed(page, 'test-site');
  const auth: string[] = [];
  await page.route('https://test-site.goatcounter.com/api/v0/**', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Accept' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    auth.push((await route.request().headerValue('authorization')) ?? '');
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/stats/total')
      ? url.searchParams.get('start') === url.searchParams.get('end')
        ? { total: 4, stats: [] }
        : { total: url.searchParams.get('start')! > iso(new Date(Date.now() - 10 * 86_400_000)) ? 9 : 27, stats: [{ day: iso(today), daily: 4 }] }
      : url.pathname.endsWith('/stats/hits')
        ? { hits: [{ path: '/', title: 'Меню', count: 20 }, { path: '/city/ch1', title: 'Город: глава 1', count: 12 }, { path: '/city/ch2', title: 'Город: глава 2', count: 5 }, { path: 'exam-pass', title: 'Тренировочный экзамен сдан', event: true, count: 3 }] }
        : url.pathname.endsWith('/stats/toprefs')
          ? { stats: [{ name: 'tiktok', count: 8 }] }
          : url.pathname.endsWith('/stats/systems')
            ? { stats: [{ name: 'Android', count: 15 }, { name: 'iOS', count: 6 }] }
            : { stats: [{ name: 'Россия', count: 21 }] };
    await route.fulfill({ json: body, headers: cors });
  });

  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Анонимная статистика' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Статистика игры' })).toHaveCount(0);

  // Шесть касаний — ничего, седьмое — экран статистики.
  await secretTaps(page);
  await expect(page.locator('.topbar__title')).toHaveText('Статистика игры');
  await expect(page.locator('.stats')).toContainText('Счётчик подключён');
  await expect(page.getByRole('link', { name: 'Открыть полную статистику ↗' })).toHaveAttribute('href', 'https://test-site.goatcounter.com');
  await expect(page.getByRole('button', { name: 'Не считать мои заходы' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('Ключ API GoatCounter').fill('gc-key-123abc');
  await page.getByRole('button', { name: 'Сохранить ключ' }).tap();
  await expect(page.locator('.stat-tile')).toHaveCount(3);
  await expect(page.locator('.stat-tile').nth(0)).toContainText('4');
  await expect(page.locator('.stat-tile').nth(1)).toContainText('9');
  await expect(page.locator('.stat-tile').nth(2)).toContainText('27');
  await expect(page.locator('.day-chart__col')).toHaveCount(30);
  await expect(page.locator('.stats')).toContainText('Глава 1. Первый день');
  await expect(page.locator('.stats')).toContainText('Тренировочный экзамен сдан');
  await expect(page.locator('.stats')).toContainText('tiktok');
  await expect(page.locator('.stats')).toContainText('Android');
  expect(auth.length).toBe(6);
  expect(auth.every((a) => a === 'Bearer gc-key-123abc')).toBe(true);

  // Касание столбика — число за день.
  await page.locator('.day-chart__col').last().tap();
  await expect(page.locator('.day-chart__caption')).toHaveText('Сегодня: 4 посетителя');

  // После входа в настройках есть кнопка «Статистика игры»; ключ можно забыть.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Настройки');
  await page.getByRole('button', { name: 'Статистика игры' }).tap();
  await page.getByRole('button', { name: 'Забыть ключ' }).tap();
  await expect(page.getByLabel('Ключ API GoatCounter')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:admin')!))).toMatchObject({ unlocked: true, token: '' });
});

test('без счётчика: секретный экран объясняет, как подключить; переключателя статистики нет', async ({ page }) => {
  await seed(page);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Анонимная статистика' })).toHaveCount(0);
  await secretTaps(page);
  await expect(page.locator('.stats')).toContainText('Счётчик ещё не подключён');
  await expect(page.locator('.stats-steps li')).toHaveCount(3);
});
