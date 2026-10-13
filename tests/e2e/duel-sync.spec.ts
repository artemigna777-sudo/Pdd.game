/**
 * Этап 14: итог дуэли приходит к автору вызова сам — через посредника на Cloudflare, без ссылки-ответа.
 * Два телефона — два браузерных контекста. Посредник подменён: настоящий код stats-worker/worker.js не
 * запускается в браузере, поэтому здесь его хранилище — общий для обоих телефонов Map.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
const PROXY = 'https://duel-proxy.test';

/** Посредник итогов дуэлей: PUT сохраняет один раз, GET отдаёт. */
async function fakeProxy(context: BrowserContext, store: Map<string, string>, log: string[]) {
  await context.addInitScript((base) => ((window as unknown as { __duelSync: string }).__duelSync = base), PROXY);
  await context.route(`${PROXY}/duel/*`, async (route) => {
    const req = route.request();
    const id = new URL(req.url()).pathname.split('/').pop()!;
    log.push(`${req.method()} ${id}`);
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.method() === 'PUT') {
      if (store.has(id)) return route.fulfill({ status: 409, headers, json: { error: 'exists' } });
      store.set(id, req.postData()!);
      return route.fulfill({ status: 201, headers, json: { ok: true } });
    }
    const saved = store.get(id);
    return saved ? route.fulfill({ status: 200, headers, contentType: 'application/json', body: saved }) : route.fulfill({ status: 404, headers, json: { error: 'none' } });
  });
}

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    sessionStorage.setItem('seeded', '1');
  });
}

async function playDuel(page: Page, right: number) {
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.exam-status')).toHaveText(`Вопрос ${i + 1} из 10`);
    const [, ticket, number] = (await page.locator('.card').getAttribute('aria-label'))!.match(/Билет (\d+), вопрос (\d+)/)!;
    const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
    const options = await page.locator('.option').count();
    await page.locator('.option').nth(i < right ? correct : (correct + 1) % options).tap();
    await page.getByRole('button', { name: 'Ответить' }).tap();
  }
}

test('итог дуэли приходит к автору сам, без ссылки-ответа', async ({ page, browser }) => {
  const store = new Map<string, string>();
  const log: string[] = [];
  await fakeProxy(page.context(), store, log);
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await expect(page.locator('.duel-sync-note')).toContainText('итог придёт к тебе сам');
  await page.getByLabel('Твоё имя в дуэли').fill('Артём');
  await page.getByRole('button', { name: 'Новая дуэль' }).tap();
  await playDuel(page, 6);
  const challenge = await page.locator('.duel-link').inputValue();
  const id = /"i":"([0-9a-z]+)"/.exec(Buffer.from(challenge.split('#duel=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())![1];
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.attempt-row')).toContainText('Вызов ждёт ответа');
  expect(log).toContain(`GET ${id}`);

  // Друг отвечает на своём телефоне — итог уходит посреднику.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', baseURL: 'http://localhost:5173/' });
  await fakeProxy(ctx, store, log);
  const friend = await ctx.newPage();
  await seed(friend);
  await friend.goto(challenge);
  await friend.getByLabel('Твоё имя в дуэли').fill('Маша');
  await friend.getByRole('button', { name: 'Принять вызов' }).tap();
  await playDuel(friend, 9);
  await expect(friend.locator('.duel-result__verdict')).toHaveText('Победа! 🏆');
  await expect.poll(() => store.has(id)).toBe(true);
  const saved = JSON.parse(store.get(id)!);
  expect(saved).toEqual({ name: 'Маша', answers: expect.stringMatching(/^\d{10}$/), ms: expect.any(Number) });
  expect(Object.keys(saved).sort()).toEqual(['answers', 'ms', 'name']);

  // Автор открывает «Режимы» — итог уже у него, без ссылки-ответа.
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Дуэль' })).toContainText('поражений: 1');
  await expect(page.locator('#toast')).toContainText('Пришёл ответ на дуэль: Маша');
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await expect(page.locator('.attempt-row')).toContainText('Поражение · Маша');
  await page.locator('.attempt-row').tap();
  await expect(page.locator('.duel-result__verdict')).toHaveText('Поражение');
  // Больше не спрашивает: итог уже есть.
  const asked = log.filter((l) => l === `GET ${id}`).length;
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.attempt-row')).toBeVisible();
  await page.waitForTimeout(300);
  expect(log.filter((l) => l === `GET ${id}`).length).toBe(asked);
  await ctx.close();
});

test('посредник недоступен — дуэль работает по-старому', async ({ page }) => {
  await page.context().addInitScript(() => ((window as unknown as { __duelSync: string }).__duelSync = 'https://duel-proxy.test'));
  await page.context().route('https://duel-proxy.test/**', (route) => route.abort());
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await page.getByLabel('Твоё имя в дуэли').fill('Артём');
  await page.getByRole('button', { name: 'Новая дуэль' }).tap();
  await playDuel(page, 5);
  await expect(page.locator('.duel-link')).toHaveValue(/#duel=/);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.attempt-row')).toContainText('Вызов ждёт ответа');
});
