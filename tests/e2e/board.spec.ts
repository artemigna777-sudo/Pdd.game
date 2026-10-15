/**
 * Таблица лидеров: общая для всех игроков, кнопка 🏆 в меню. Посредник подменён, но его правила и SQL —
 * настоящие (stats-worker/players.js) с хранилищем SQLite из Node: имя без мата, место, уход из таблицы.
 */
import { DatabaseSync } from 'node:sqlite';
import { expect, test, type Page } from '@playwright/test';
import { board, cleanUpdate, savePlayer, setup } from '../../stats-worker/players.js';

const PROXY = 'https://board-proxy.test';

/** Посредник с таблицей игроков в памяти; `offline` — нет связи. */
async function fakeProxy(page: Page) {
  const db = new DatabaseSync(':memory:');
  const sql = {
    exec(query: string, ...values: unknown[]) {
      const rows = db.prepare(query).all(...(values as never[]));
      return { toArray: () => rows };
    },
  };
  setup(sql);
  const now = Date.now();
  for (let n = 1; n <= 25; n++) savePlayer(sql, cleanUpdate({ id: `other-player-${String(n).padStart(6, '0')}`, board: true, name: `Игрок ${n}`, xp: n * 1000, coins: 2600 - n * 100 }), now - n);
  const state = { offline: false, puts: [] as Record<string, unknown>[] };
  await page.addInitScript((base) => ((window as unknown as { __boardBase: string }).__boardBase = base), PROXY);
  await page.route(`${PROXY}/**`, async (route) => {
    const req = route.request();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (state.offline) return route.abort('internetdisconnected');
    const url = new URL(req.url());
    if (url.pathname === '/player') {
      const raw = JSON.parse(req.postData() ?? 'null');
      state.puts.push(raw);
      const upd = cleanUpdate(raw);
      if (upd.error) return route.fulfill({ status: 400, headers, json: { error: upd.error } });
      savePlayer(sql, upd, Date.now());
      return route.fulfill({ headers, json: { ok: true } });
    }
    return route.fulfill({ headers, json: board(sql, url.searchParams.get('by'), url.searchParams.get('id')) });
  });
  return state;
}

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false, installTip: false, name: 'Маша' }));
    // 14 800 опыта — уже после 10-го уровня; 500 монет заработано, ничего не потрачено.
    localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 14_800, coins: 500, coinsSpent: 0 }));
    sessionStorage.setItem('seeded', '1');
  });
}

test('таблица лидеров: вступить с именем, своё место по опыту и монетам, уйти из таблицы; без связи — понятно', async ({ page }) => {
  const proxy = await fakeProxy(page);
  await seed(page);
  await page.goto('/');
  // Опыт после 10-го уровня копится дальше.
  await expect(page.locator('.menu__level')).toContainText('Уровень 11');
  await page.getByRole('button', { name: 'Таблица лидеров' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Таблица лидеров');

  // Таблицу видят все, даже кто в неё не вступил; о себе игра ничего не отправила.
  const rows = page.locator('.board__row');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('🥇');
  await expect(rows.first()).toContainText('Игрок 25');
  await expect(rows.first()).toContainText('25 000');
  await expect(page.locator('.board__total')).toHaveText('В таблице 25 игроков');
  expect(proxy.puts).toHaveLength(0);

  // Имя по умолчанию — из дуэли. Плохое имя посредник не принимает.
  const join = page.locator('.board__join');
  await expect(join.getByLabel('Имя в таблице')).toHaveValue('Маша');
  await join.getByLabel('Имя в таблице').fill('Сука');
  await join.getByRole('button', { name: 'Попасть в таблицу' }).tap();
  await expect(page.locator('#toast')).toContainText('Такое имя нельзя показать в таблице');
  await expect(join).toBeVisible();

  await join.getByLabel('Имя в таблице').fill('  Маша   Курьер ');
  await join.getByRole('button', { name: 'Попасть в таблицу' }).tap();
  await expect(page.locator('#toast')).toContainText('Ты в таблице лидеров!');
  await expect(page.locator('.board__mine')).toContainText('Ты в таблице как «Маша Курьер»');
  await expect(page.locator('.board__mine')).toContainText('12-е место из 26 · 14 800 опыта');
  const mine = page.locator('.board__row.is-me');
  await expect(mine).toContainText('12');
  await expect(mine).toContainText('Маша Курьер — ты');
  await expect(mine).toContainText('ур. 11');
  const put = proxy.puts.at(-1)!;
  expect(put).toMatchObject({ board: true, name: 'Маша Курьер', xp: 14_800, coins: 500 });
  expect(put.ready, 'готовность в тестах не уходит: статистика выключена').toBeUndefined();
  expect(String(put.id)).toMatch(/^[A-Za-z0-9_-]{22}$/);

  // По монетам: 21-е место — ниже двадцатки, своя строка отдельно.
  await page.getByRole('button', { name: '🪙 Монеты' }).tap();
  await expect(page.locator('.board__note')).toContainText('покупки в магазине место не уменьшают');
  await expect(page.locator('.board__mine')).toContainText('21-е место из 26 · 500 монет');
  await expect(page.locator('.board__gap')).toHaveCount(1);
  await expect(page.locator('.board__row.is-me')).toContainText('21');

  // После перезапуска игрок по-прежнему в таблице, номер тот же.
  await page.reload();
  await page.getByRole('button', { name: 'Таблица лидеров' }).tap();
  await expect(page.locator('.board__mine')).toContainText('Ты в таблице как «Маша Курьер»');
  expect(proxy.puts.at(-1)!.id).toBe(put.id);

  // Сменить имя.
  await page.getByRole('button', { name: 'Сменить имя' }).tap();
  await page.getByLabel('Новое имя в таблице').fill('Маша');
  await page.getByRole('button', { name: 'Сохранить имя' }).tap();
  await expect(page.locator('#toast')).toContainText('Имя в таблице изменено.');
  await expect(page.locator('.board__row.is-me')).toContainText('Маша — ты');

  // Убрать себя: имя, опыт и монеты стираются у посредника.
  await page.getByRole('button', { name: 'Убрать меня' }).tap();
  await expect(page.locator('#toast')).toContainText('Тебя больше нет в таблице лидеров.');
  await expect(page.locator('.board__join')).toBeVisible();
  await expect(page.locator('.board__total')).toHaveText('В таблице 25 игроков');
  expect(proxy.puts.at(-1)).toEqual({ id: put.id, board: false });

  // Нет связи — понятное сообщение и «Попробовать ещё раз».
  proxy.offline = true;
  await page.getByRole('button', { name: '⭐ Опыт' }).tap();
  await expect(page.locator('.board__list')).toContainText('Нет связи с таблицей лидеров');
  proxy.offline = false;
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).tap();
  await expect(rows).toHaveCount(20);
});
