/**
 * Дуэль из мессенджера: ссылка открывается в браузере, а сохранение игрока — в игре на главном
 * экране (на iPhone у них разные хранилища). В браузере игра подсказывает скопировать вызов, а в
 * игре на главном экране его можно вставить — и дуэль пойдёт в своё сохранение.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
const DUEL_MODULE = '/src/duel/duel.ts';

/** Сохранение с `answered` верными ответами (своё, давнее). */
function save(answered: number) {
  const at = Date.now() - 86_400_000;
  const questions = Object.fromEntries(QUESTIONS.slice(0, answered).map((q) => [q.id, { n: 1, ok: true, ever: true, at }]));
  return { xp: answered * 10, coins: 0, questions, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } };
}

/** Телефон: браузер из мессенджера или игра с главного экрана (`standalone`). */
async function phone(browser: Browser, o: { standalone: boolean; answered: number; clipboard: boolean }): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', baseURL: 'http://localhost:5173/' });
  if (o.clipboard) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  if (process.env.E2E_SLOW) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
  await page.addInitScript(
    ({ standalone, progress }) => {
      if (standalone) {
        // Игра открыта с главного экрана.
        const original = window.matchMedia.bind(window);
        window.matchMedia = (q: string) => (q.includes('display-mode: standalone') ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList) : original(q));
      }
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
      if (progress) localStorage.setItem('pdd-game:progress', JSON.stringify(progress));
      sessionStorage.setItem('seeded', '1');
    },
    { standalone: o.standalone, progress: o.answered ? save(o.answered) : undefined },
  );
  return page;
}

/** Вызов от «Симена»: 9 из 10 за 0:42 — ссылка и сообщение, как в мессенджере. */
async function challengeLink(page: Page): Promise<{ hash: string; message: string }> {
  await page.goto('/');
  const ids = QUESTIONS.map((q) => q.id);
  const link: string = await page.evaluate(
    async ({ path, ids, correct }) => {
      const m = await import(path);
      const q: string[] = m.pickDuelQuestions(ids);
      const answers = q.map((id, i) => (i === 3 ? (correct[id] + 1) % 2 : correct[id]));
      return m.duelLink(location.href, { id: m.newDuelId(), at: Date.now(), q, from: { name: 'Симен авторуль', answers, ms: 42_000 } });
    },
    { path: DUEL_MODULE, ids, correct: Object.fromEntries(CORRECT) },
  );
  const hash = new URL(link).hash;
  return { hash, message: `Вызов на дуэль по билетам ПДД: 9 из 10 за 0:42. Сможешь лучше? ${link}` };
}

async function playDuel(page: Page) {
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.exam-status')).toHaveText(`Вопрос ${i + 1} из 10`);
    const label = (await page.locator('.card').getAttribute('aria-label'))!;
    const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
    await page.locator('.option').nth(CORRECT.get(qid(Number(ticket), Number(number)))!).tap();
    await page.getByRole('button', { name: 'Ответить' }).tap();
  }
}

test('вызов из мессенджера: в браузере — «Скопировать вызов», в игре с главного экрана — «Вставить вызов от друга»', async ({ browser }) => {
  test.setTimeout(180_000);
  // Браузер мессенджера: своё пустое сохранение.
  const web = await phone(browser, { standalone: false, answered: 0, clipboard: true });
  const { hash, message } = await challengeLink(web);
  await web.goto(`/${hash}`);
  await expect(web.locator('.duel-invite__name')).toHaveText('Симен авторуль');
  const notice = web.locator('.duel-elsewhere');
  await expect(notice).toContainText('Играешь с главного экрана?');
  await expect(notice).toContainText('«Режимы» → «Дуэль» → «Вставить вызов от друга»');
  await notice.getByRole('button', { name: 'Скопировать вызов' }).tap();
  await expect(web.locator('#toast')).toContainText('Скопировано');
  expect(await web.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:5173/${hash}`);

  // Игра на главном экране: своё сохранение (381 вопрос), вызов вставляется из буфера.
  const home = await phone(browser, { standalone: true, answered: 381, clipboard: true });
  await home.goto('/');
  await home.evaluate((text) => navigator.clipboard.writeText(text), message);
  await home.getByRole('button', { name: 'Режимы' }).tap();
  await home.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await home.getByRole('button', { name: /Вставить вызов от друга/ }).tap();
  await expect(home.locator('.duel-invite__name')).toHaveText('Симен авторуль');
  // Это своё сохранение — подсказки нет.
  await expect(home.locator('.duel-elsewhere')).toHaveCount(0);
  await home.locator('.field__input').fill('Артём');
  await home.getByRole('button', { name: 'Принять вызов' }).tap();
  await playDuel(home);
  await expect(home.locator('.duel-result__verdict')).toContainText('Победа');
  // Дуэль и ответы — в сохранении игры на главном экране.
  const saved = await home.evaluate(() => ({ progress: JSON.parse(localStorage.getItem('pdd-game:progress')!), duels: JSON.parse(localStorage.getItem('pdd-game:duels') ?? '[]') }));
  expect(Object.keys(saved.progress.questions).length).toBeGreaterThan(381);
  expect(saved.duels).toHaveLength(1);
  await home.context().close();
  await web.context().close();
});

test('вставить вызов вручную, если буфер недоступен; давний игрок в браузере подсказку не видит', async ({ browser }) => {
  // Игра на главном экране без доступа к буферу: появляется поле для ссылки.
  const home = await phone(browser, { standalone: true, answered: 5, clipboard: false });
  const { hash, message } = await challengeLink(home);
  await home.getByRole('button', { name: 'Режимы' }).tap();
  await home.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await home.getByRole('button', { name: /Вставить вызов от друга/ }).tap();
  const field = home.getByLabel('Ссылка на дуэль');
  await expect(field).toBeVisible();
  await field.fill(message);
  await expect(home.locator('.duel-invite__name')).toHaveText('Симен авторуль');
  await expect(home.locator('.duel-elsewhere')).toHaveCount(0);
  await home.context().close();

  // В браузере, где уже много ответов, играют давно — подсказки нет.
  const web = await phone(browser, { standalone: false, answered: 50, clipboard: false });
  await web.goto(`/${hash}`);
  await expect(web.locator('.duel-invite__name')).toHaveText('Симен авторуль');
  await expect(web.locator('.duel-elsewhere')).toHaveCount(0);
  await web.context().close();
});
