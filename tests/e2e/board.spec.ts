/**
 * Таблица лидеров: общая для всех игроков, кнопка 🏆 в меню. Посредник подменён, но его правила и SQL —
 * настоящие (stats-worker/players.js) с хранилищем SQLite из Node: случайный ник, своё имя без мата, место.
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
      return route.fulfill({ headers, json: { ok: true, name: savePlayer(sql, upd, Date.now()) } });
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

test('таблица лидеров: все сразу под случайным ником, своё имя по желанию, место по опыту и монетам; без связи — понятно', async ({ page }) => {
  const proxy = await fakeProxy(page);
  await seed(page);
  await page.goto('/');
  // Опыт после 10-го уровня копится дальше.
  await expect(page.locator('.menu__level')).toContainText('Уровень 11');
  // Игра сама сообщает о себе вскоре после запуска — игрок в таблице, даже если её не открывал.
  await expect.poll(() => proxy.puts.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const first = proxy.puts[0];
  expect(first).toEqual({ id: first.id, board: true, xp: 14_800, coins: 500 });
  expect(String(first.id)).toMatch(/^[A-Za-z0-9_-]{22}$/);

  await page.getByRole('button', { name: 'Таблица лидеров' }).tap();
  await expect(page.locator('.topbar__title')).toHaveText('Таблица лидеров');
  const rows = page.locator('.board__row');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('🥇');
  await expect(rows.first()).toContainText('Игрок 25');
  await expect(rows.first()).toContainText('25 000');
  await expect(page.locator('.board__total')).toHaveText('В таблице 26 игроков');

  // Ник выдал посредник: случайный, свой у каждого.
  const mineCard = page.locator('.board__mine');
  await expect(mineCard).toContainText(/Ты в таблице как «user_\d{4}»/);
  const nick = (await mineCard.locator('strong').textContent())!.match(/user_\d{4}/)![0];
  await expect(mineCard).toContainText('12-е место из 26 · 14 800 опыта');
  await expect(mineCard).toContainText('Этот ник выдан случайно');
  const mine = page.locator('.board__row.is-me');
  await expect(mine).toContainText('12');
  await expect(mine).toContainText(`${nick} — ты`);
  await expect(mine).toContainText('ур. 11');
  expect(proxy.puts.at(-1)!.ready, 'готовность в тестах не уходит: статистика выключена').toBeUndefined();

  // Своё имя: по умолчанию — из дуэли. Плохое имя и чужой ник посредник не принимает.
  await page.getByRole('button', { name: 'Сменить имя' }).tap();
  const input = page.getByLabel('Имя в таблице');
  await expect(input).toHaveValue('Маша');
  for (const bad of ['Сука', 'user_1234']) {
    await input.fill(bad);
    await page.getByRole('button', { name: 'Сохранить имя' }).tap();
    await expect(page.locator('#toast')).toContainText('Такое имя нельзя показать в таблице');
  }
  await input.fill('  Маша   Курьер ');
  await page.getByRole('button', { name: 'Сохранить имя' }).tap();
  await expect(page.locator('#toast')).toContainText('Имя в таблице изменено.');
  await expect(mineCard).toContainText('Ты в таблице как «Маша Курьер»');
  await expect(mineCard).not.toContainText('Этот ник выдан случайно');
  await expect(page.locator('.board__row.is-me')).toContainText('Маша Курьер — ты');
  expect(proxy.puts.at(-1)).toMatchObject({ id: first.id, board: true, name: 'Маша Курьер' });

  // По монетам: 21-е место — ниже двадцатки, своя строка отдельно.
  await page.getByRole('button', { name: '🪙 Монеты' }).tap();
  await expect(page.locator('.board__note')).toContainText('покупки в магазине место не уменьшают');
  await expect(mineCard).toContainText('21-е место из 26 · 500 монет');
  await expect(page.locator('.board__gap')).toHaveCount(1);
  await expect(page.locator('.board__row.is-me')).toContainText('21');

  // После перезапуска — то же имя и тот же номер игры.
  await page.reload();
  await page.getByRole('button', { name: 'Таблица лидеров' }).tap();
  await expect(mineCard).toContainText('Ты в таблице как «Маша Курьер»');
  expect(proxy.puts.at(-1)!.id).toBe(first.id);

  // Без связи имя не меняется, таблица говорит, что связи нет.
  proxy.offline = true;
  await page.getByRole('button', { name: 'Сменить имя' }).tap();
  await input.fill('Маша');
  await page.getByRole('button', { name: 'Сохранить имя' }).tap();
  await expect(page.locator('#toast')).toContainText('Нет связи с таблицей лидеров');
  await page.getByRole('button', { name: 'Отмена' }).tap();
  await expect(page.locator('.board__list')).toContainText('Нет связи с таблицей лидеров');
  await expect(mineCard).toContainText('Ты в таблице как «Маша Курьер»');
  proxy.offline = false;
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).tap();
  await expect(rows).toHaveCount(20);
});
