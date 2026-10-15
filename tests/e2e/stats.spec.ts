/**
 * Статистика для автора игры: секретный вход (7 касаний по «Версия игры») и пароль автора,
 * отчёт из открытого счётчика GoatCounter (его ответы подменены), ошибка счётчика с подсказкой;
 * без счётчика — инструкция. Пароль — тестовый: отпечаток подменён в режиме разработки.
 */
import { pbkdf2Sync } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'test-pass-123';
const SALT = '00112233445566778899aabbccddeeff';
const VERIFIER = { salt: SALT, iterations: 1000, hash: pbkdf2Sync('testpass123', Buffer.from(SALT, 'hex'), 1000, 32, 'sha256').toString('hex') };

/** Чистый телефон: код счётчика, адрес посредника (пусто — без посредника) и тестовый отпечаток пароля. */
function seed(page: Page, site?: string, proxy?: string) {
  return page.addInitScript(
    ([value, proxyUrl, verifier]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
      localStorage.setItem('pdd-game:stats-site-dev', JSON.stringify(value ?? ''));
      localStorage.setItem('pdd-game:stats-proxy-dev', JSON.stringify(proxyUrl ?? ''));
      localStorage.setItem('pdd-game:author-dev', JSON.stringify(verifier));
      sessionStorage.setItem('seeded', '1');
    },
    [site, proxy, VERIFIER] as const,
  );
}

const PROXY = 'https://proxy.test';

/**
 * Посредник (Cloudflare Worker), как настоящий: CORS для заголовка с ключом, отчёт одним запросом и API
 * GoatCounter. `state.fail` — ответить ошибкой, `state.old` — посредник старой версии (без отчёта),
 * `state.silent` — не отвечать (связь обрывается).
 */
async function mockProxy(page: Page, state: { fail?: number; old?: boolean; silent?: boolean; auths: string[] }) {
  await page.route(`${PROXY}/**`, async (route) => {
    const req = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    state.auths.push((await req.headerValue('authorization')) ?? '');
    if (state.silent) return;
    if (state.fail) return route.fulfill({ status: state.fail, json: { error: 'key' }, headers: cors });
    const path = new URL(req.url()).pathname;
    if (path === '/api/report') {
      if (state.old) return route.fulfill({ status: 404, json: { error: 'path' }, headers: cors });
      return route.fulfill({
        json: { today: 21, week: 21, month: 21, days: [], counts: { '/city/ch1': 15, 'chapter-done/ch1': 6, 'exam-pass': 4 }, refs: [['tiktok', 12]], systems: [['iOS', 18]], locations: [['Russia', 20]], ready: { d7: [3, 1, 0, 0, 2, 0, 0, 0, 0, 1], d30: [5, 2, 1, 0, 2, 0, 0, 0, 3, 4] } },
        headers: cors,
      });
    }
    const kind = path.replace('/api/v0/stats/', '');
    const body =
      kind === 'total'
        ? { total: 21, stats: [] }
        : kind === 'hits'
          ? { hits: [{ path: '/city/ch1', count: 15 }, { path: 'chapter-done/ch1', count: 6 }, { path: 'exam-pass', count: 4 }] }
          : kind === 'toprefs'
            ? { stats: [{ name: 'tiktok', count: 12 }] }
            : kind === 'systems'
              ? { stats: [{ name: 'iOS', count: 18 }] }
              : { stats: [{ name: 'Russia', count: 20 }] };
    return route.fulfill({ json: body, headers: cors });
  });
}

/** Окно «Вход для автора»: ввести пароль и войти. */
async function login(page: Page, password = PASSWORD) {
  const dialog = page.getByRole('dialog', { name: 'Вход для автора' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Пароль автора').fill(password);
  await dialog.getByRole('button', { name: 'Войти' }).tap();
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

test('секретный вход: 7 касаний и пароль автора — статистика из открытого счётчика, без ключа', async ({ page }) => {
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

  // Седьмое касание — пароль автора. Неверный пароль экран не открывает.
  await secretTaps(page);
  await login(page, 'не-тот-пароль');
  await expect(page.getByRole('dialog', { name: 'Вход для автора' })).toContainText('Неверный пароль.');
  await expect(page.locator('.topbar__title')).toHaveText('Настройки');
  await expect(page.locator('.stat-tile')).toHaveCount(0);
  // Регистр и дефисы не важны.
  await login(page, 'TEST PASS 123');
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
  const admin = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:admin')!));
  expect(admin).toEqual({ unlocked: true, selfIgnore: true, verified: VERIFIER.hash.slice(0, 16), key: expect.stringMatching(/^[0-9a-f]{64}$/) });

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
  await login(page);
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
  await login(page);
  await expect(page.locator('.stats')).toContainText('Счётчик ещё не подключён');
  await expect(page.locator('.stats-steps li')).toHaveCount(3);
  await expect(page.locator('.stats-steps')).toContainText('Allow adding visitor counts on your website');
});

test('только для автора: вход без пароля из прошлой версии не действует, после 5 ошибок — минута ожидания', async ({ page }) => {
  await seed(page, 'test-site');
  // Вход из прошлой версии игры: 7 касаний, без пароля.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('admin-seeded')) localStorage.setItem('pdd-game:admin', JSON.stringify({ unlocked: true, selfIgnore: true }));
    sessionStorage.setItem('admin-seeded', '1');
  });
  const state = { requests: [] as { method: string; auth: string | null; url: URL }[] };
  await mockCounter(page, state);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Статистика игры' })).toHaveCount(0);

  await secretTaps(page);
  const dialog = page.getByRole('dialog', { name: 'Вход для автора' });
  for (let i = 1; i <= 4; i++) {
    await login(page, `ошибка-${i}`);
    await expect(dialog).toContainText('Неверный пароль.');
  }
  await login(page, 'ошибка-5');
  await expect(dialog).toContainText('Слишком много попыток');
  // Даже верный пароль — только через минуту.
  await login(page);
  await expect(dialog).toContainText('Слишком много попыток');
  await dialog.getByRole('button', { name: 'Отмена' }).tap();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.topbar__title')).toHaveText('Настройки');
  expect(state.requests.length).toBe(0);

  // Через минуту верный пароль открывает статистику и запоминается: дальше — без пароля.
  await page.evaluate(() => localStorage.setItem('pdd-game:author-lock', JSON.stringify({ fails: 0, until: 0 })));
  await secretTaps(page);
  await login(page);
  await expect(page.locator('.topbar__title')).toHaveText('Статистика игры');
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).first().tap();
  await page.getByRole('button', { name: 'Статистика игры' }).tap();
  await expect(page.locator('.stat-tile')).toHaveCount(3);
});

test('через посредника: ключ автора из пароля, источники, телефоны и страны; посредник не принял ключ — открытый счётчик', async ({ page }) => {
  await seed(page, 'test-site', PROXY);
  const counter = { requests: [] as { method: string; auth: string | null; url: URL }[] };
  await mockCounter(page, counter);
  const proxy = { fail: 0, old: false, auths: [] as string[] };
  await mockProxy(page, proxy);
  await openSettings(page);
  await secretTaps(page);
  await login(page);

  await expect(page.locator('.stat-tile').nth(0)).toContainText('21');
  await expect(page.locator('.stats')).toContainText('прошли: 6');
  await expect(page.locator('.stats')).toContainText('tiktok');
  await expect(page.locator('.stats')).toContainText('iOS');
  await expect(page.locator('.stats')).toContainText('Russia');
  // Готовность игроков по десяткам процентов — только здесь, у автора.
  const ready = page.locator('.stats-ready');
  await expect(ready.locator('.bar-list__row')).toHaveCount(10);
  await expect(ready.locator('.bar-list__row').first()).toContainText('0–10%');
  await expect(ready.locator('.bar-list__row').first()).toContainText('5');
  await expect(ready.locator('.bar-list__row').last()).toContainText('90–100%');
  await expect(ready).toContainText('Игроков: 17, из них готовы на 90–100%: 4.');
  await ready.getByRole('button', { name: '7 дней' }).tap();
  await expect(ready).toContainText('Игроков: 7, из них готовы на 90–100%: 1.');
  await expect(page.getByRole('link', { name: 'Открыть на сайте ↗' })).toHaveCount(0);
  const key = (await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:admin')!))).key as string;
  expect(key).toMatch(/^[0-9a-f]{64}$/);
  expect(proxy.auths).toHaveLength(1);
  expect(proxy.auths.every((a) => a === `Bearer ${key}`)).toBe(true);
  expect(counter.requests).toHaveLength(0);

  // Посредник старой версии: те же числа семью запросами.
  proxy.old = true;
  await page.getByRole('button', { name: 'Обновить' }).tap();
  await expect(page.locator('.stats')).toContainText('Russia');
  expect(proxy.auths).toHaveLength(1 + 8);
  expect(counter.requests).toHaveLength(0);

  proxy.fail = 401;
  await page.getByRole('button', { name: 'Обновить' }).tap();
  await expect(page.locator('.banner--bad')).toContainText('Посредник не принял ключ автора');
  await expect(page.locator('.stat-tile').nth(0)).toContainText('4');
  await expect(page.getByRole('link', { name: 'Открыть на сайте ↗' })).toBeVisible();
});

test('вход до посредника: без ключа автора — открытый счётчик и «Ввести пароль»', async ({ page }) => {
  await seed(page, 'test-site', PROXY);
  await page.addInitScript((verified) => {
    if (!sessionStorage.getItem('admin-seeded')) localStorage.setItem('pdd-game:admin', JSON.stringify({ unlocked: true, verified, selfIgnore: true }));
    sessionStorage.setItem('admin-seeded', '1');
  }, VERIFIER.hash.slice(0, 16));
  await mockCounter(page, { requests: [] });
  const proxy = { auths: [] as string[] };
  await mockProxy(page, proxy);
  await openSettings(page);
  await page.getByRole('button', { name: 'Статистика игры' }).tap();
  await expect(page.locator('.stats')).toContainText('Введи пароль ещё раз');
  await expect(page.locator('.stat-tile').nth(0)).toContainText('4');
  expect(proxy.auths).toHaveLength(0);
  await page.getByRole('button', { name: 'Ввести пароль' }).tap();
  await login(page);
  await expect(page.locator('.stat-tile').nth(0)).toContainText('21');
  await expect(page.locator('.stats')).not.toContainText('Введи пароль ещё раз');
});

test('связь с посредником и счётчиком обрывается — не висим на «Загружаю»: через 15 и 12 секунд понятная причина', async ({ page }) => {
  await page.clock.install();
  await seed(page, 'test-site', PROXY);
  await page.addInitScript((verified) => {
    if (!sessionStorage.getItem('admin-seeded')) localStorage.setItem('pdd-game:admin', JSON.stringify({ unlocked: true, verified, key: 'd'.repeat(64), selfIgnore: true }));
    sessionStorage.setItem('admin-seeded', '1');
  }, VERIFIER.hash.slice(0, 16));
  const counter = { requests: [] as { method: string; auth: string | null; url: URL }[] };
  // Ни посредник, ни счётчик не отвечают — как при обрыве связи у оператора.
  await page.route('https://test-site.goatcounter.com/**', async (route) => {
    counter.requests.push({ method: route.request().method(), auth: null, url: new URL(route.request().url()) });
  });
  const proxy = { silent: true, auths: [] as string[] };
  await mockProxy(page, proxy);
  await openSettings(page);
  await page.getByRole('button', { name: 'Статистика игры' }).tap();
  await expect(page.locator('.loading')).toHaveText('Загружаю статистику…');
  await expect.poll(() => proxy.auths.length).toBe(1);

  await page.clock.fastForward(15_500);
  await expect(page.locator('.loading')).toHaveText('Посредник не ответил. Пробую открытый счётчик…');
  await expect.poll(() => counter.requests.length).toBe(1);
  await page.clock.fastForward(12_500);
  await expect(page.locator('.banner--bad').first()).toContainText('Посредник не ответил за 15 секунд');
  await expect(page.locator('.banner--bad').first()).toContainText('Wi-Fi вместо мобильного');
  await expect(page.locator('.stats')).toContainText('Счётчик GoatCounter не ответил');
  await expect(page.getByRole('button', { name: 'Попробовать ещё раз' })).toBeVisible();
  expect(counter.requests).toHaveLength(1);
});
