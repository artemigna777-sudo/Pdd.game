/**
 * Статистика для автора игры: секретный вход (7 касаний по «Версия игры»), отчёт из открытого
 * счётчика GoatCounter (его ответы подменены), ошибка счётчика с подсказкой; без счётчика — инструкция.
 */
import { expect, test, type Page } from '@playwright/test';

function seed(page: Page, site?: string) {
  return page.addInitScript((value) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    localStorage.setItem('pdd-game:stats-site-dev', JSON.stringify(value ?? ''));
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

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const TODAY = daysAgo(0);
/** Посетители сайта по дням: за 7 дней — 9, за 30 — 1 027. */
const TOTAL_BY_DAY: Record<string, number> = { [daysAgo(0)]: 4, [daysAgo(1)]: 5, [daysAgo(20)]: 1018 };

/**
 * Открытый счётчик GoatCounter, как настоящий: простой GET, ответ с CORS; «end» — полночь начала этого
 * дня, заходы в сам день «end» не входят. Все заходы на экраны — сегодня. `state.fail` — ответить ошибкой.
 */
async function mockCounter(page: Page, state: { fail?: number; requests: { method: string; auth: string | null; url: URL }[] }) {
  await page.route('https://test-site.goatcounter.com/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    state.requests.push({ method: req.method(), auth: await req.headerValue('authorization'), url });
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (state.fail) return route.fulfill({ status: state.fail, json: { error: 'visitor counter disabled' }, headers: cors });
    const path = decodeURIComponent(url.pathname.replace(/^\/counter\//, '').replace(/\.json$/, ''));
    const start = url.searchParams.get('start') ?? '';
    const end = url.searchParams.get('end') ?? '9999';
    const inRange = (day: string) => day >= start && day < end;
    if (path === 'TOTAL') {
      const total = Object.entries(TOTAL_BY_DAY).reduce((sum, [day, n]) => sum + (inRange(day) ? n : 0), 0);
      return route.fulfill({ json: { count: total.toLocaleString('en-US') }, headers: cors });
    }
    const counts: Record<string, string> = { '/': '20', '/city/ch1': '12', 'chapter-done/ch1': '7', '/city/ch2': '5', 'exam-pass': '3', '/exam': '9' };
    const count = counts[path];
    if (count === undefined) return route.fulfill({ status: 404, json: { error: 'no such path' }, headers: cors });
    return route.fulfill({ json: { count: inRange(TODAY) ? count : '0' }, headers: cors });
  });
}

test('секретный вход: 7 касаний — статистика из открытого счётчика, без ключа', async ({ page }) => {
  await seed(page, 'test-site');
  // Ключ API из прошлой версии больше не нужен и стирается.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('admin-seeded')) localStorage.setItem('pdd-game:admin', JSON.stringify({ unlocked: false, token: 'old-key', selfIgnore: true }));
    sessionStorage.setItem('admin-seeded', '1');
  });
  const state = { requests: [] as { method: string; auth: string | null; url: URL }[] };
  await mockCounter(page, state);

  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Анонимная статистика' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Статистика игры' })).toHaveCount(0);

  // Шесть касаний — ничего, седьмое — экран статистики.
  await secretTaps(page);
  await expect(page.locator('.topbar__title')).toHaveText('Статистика игры');
  await expect(page.locator('.stats')).toContainText('Счётчик подключён');
  await expect(page.getByRole('link', { name: 'Открыть полную статистику ↗' })).toHaveAttribute('href', 'https://test-site.goatcounter.com');
  await expect(page.getByRole('button', { name: 'Не считать мои заходы' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Ключ API GoatCounter')).toHaveCount(0);

  await expect(page.locator('.stat-tile')).toHaveCount(3);
  await expect(page.locator('.stat-tile').nth(0)).toContainText('4');
  await expect(page.locator('.stat-tile').nth(1)).toContainText('9');
  await expect(page.locator('.stat-tile').nth(2)).toContainText('1 027');
  await expect(page.locator('.day-chart__col')).toHaveCount(14);
  await expect(page.locator('.stats')).toContainText('Глава 1. Первый день');
  await expect(page.locator('.stats')).toContainText('прошли: 7');
  await expect(page.locator('.stats')).toContainText('Тренировочный экзамен сдан');
  await expect(page.getByRole('link', { name: 'Открыть на сайте ↗' })).toHaveAttribute('href', 'https://test-site.goatcounter.com');
  await expect(page.locator('.stats')).not.toContainText('Не загрузилось');
  // Как у настоящего сайта со счётчиком: простые GET без ключа, без предварительных запросов браузера.
  expect(state.requests.every((r) => r.method === 'GET' && r.auth === null && r.url.pathname.startsWith('/counter/'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:admin')!))).toEqual({ unlocked: true, selfIgnore: true });

  // Касание столбика — число за день.
  await page.locator('.day-chart__col').last().tap();
  await expect(page.locator('.day-chart__caption')).toHaveText('Сегодня: 4 посетителя');

  // После входа в настройках есть кнопка «Статистика игры»; отчёт не загружается заново без «Обновить».
  const before = state.requests.length;
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Настройки');
  await page.getByRole('button', { name: 'Статистика игры' }).tap();
  await expect(page.locator('.stat-tile')).toHaveCount(3);
  expect(state.requests.length).toBe(before);
  await page.getByRole('button', { name: 'Обновить' }).tap();
  await expect(page.locator('.stat-tile')).toHaveCount(3);
  await expect.poll(() => state.requests.length).toBeGreaterThan(before);
});

test('счётчик не отдаёт числа: подсказка про галочку в настройках и «Попробовать ещё раз»', async ({ page }) => {
  await seed(page, 'test-site');
  const state = { fail: 403, requests: [] as { method: string; auth: string | null; url: URL }[] };
  await mockCounter(page, state);
  await openSettings(page);
  await secretTaps(page);
  await expect(page.locator('.banner--bad')).toContainText('Allow adding visitor counts on your website');
  await expect(page.getByRole('link', { name: 'Открыть сайт счётчика ↗' })).toHaveAttribute('href', 'https://test-site.goatcounter.com');
  state.fail = 0;
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).tap();
  await expect(page.locator('.stat-tile').nth(0)).toContainText('4');
});

test('без счётчика: секретный экран объясняет, как подключить; переключателя статистики нет', async ({ page }) => {
  await seed(page);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Анонимная статистика' })).toHaveCount(0);
  await secretTaps(page);
  await expect(page.locator('.stats')).toContainText('Счётчик ещё не подключён');
  await expect(page.locator('.stats-steps li')).toHaveCount(3);
  await expect(page.locator('.stats-steps')).toContainText('Allow adding visitor counts on your website');
});
