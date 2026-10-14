/**
 * Этап 16: дуэль в реальном времени. Два телефона — два браузерных контекста. Посредник на Cloudflare
 * подменён: WebSocket обоих телефонов попадает в общий для теста `RoomCore` — те же правила комнаты,
 * что и у настоящего посредника (stats-worker/room.js).
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type Page, type WebSocketRoute } from '@playwright/test';
// @ts-expect-error — обычный JS-модуль посредника без типов.
import { RoomCore } from '../../stats-worker/room.js';

const BASE = 'wss://live.test';
const read = (f: string): { id: string; correct: number }[] => JSON.parse(readFileSync(f, 'utf8'));
const CORRECT = new Map([...read('data/questions.json'), ...read('data/situations/s07-09.json'), ...read('data/situations/s10-13.json')].map((x) => [x.id, x.correct]));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;

type Out = [number | 'all', object][];
interface Room {
  core: { join(): number | undefined; message(seat: number, msg: unknown): Out; leave(seat: number): Out };
  sockets: (WebSocketRoute | undefined)[];
}

/** Комнаты посредника, общие для всех телефонов теста. */
function fakeRooms() {
  const rooms = new Map<string, Room>();
  const deliver = (room: Room, out: Out) => {
    for (const [to, msg] of out) for (const [seat, ws] of room.sockets.entries()) if (ws && (to === 'all' || to === seat)) ws.send(JSON.stringify(msg));
  };
  const connect = async (page: Page) => {
    await page.addInitScript((base) => ((window as unknown as { __liveBase: string }).__liveBase = base), BASE);
    await page.routeWebSocket(`${BASE}/live/*`, (ws) => {
      const code = ws.url().split('/').pop()!;
      if (!rooms.has(code)) rooms.set(code, { core: new RoomCore(), sockets: [] });
      const room = rooms.get(code)!;
      const seat = room.core.join();
      if (seat === undefined) {
        ws.send(JSON.stringify({ t: 'full' }));
        void ws.close();
        return;
      }
      room.sockets[seat] = ws;
      ws.onMessage((m) => deliver(room, room.core.message(seat, JSON.parse(String(m)))));
      ws.onClose(() => {
        room.sockets[seat] = undefined;
        deliver(room, room.core.leave(seat));
      });
    });
  };
  return { rooms, connect };
}

async function phone(browser: Browser, name: string | undefined, connect: (p: Page) => Promise<void>): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript((n) => {
    // Тест отвечает за обоих по очереди: пока на медленном сервере отвечает один телефон, у второго не должно
    // кончиться время раунда (12 и 20 с). В игре раунды обычной длины — это только режим разработки.
    (window as unknown as { __liveSlow: number }).__liveSlow = 10;
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false, ...(n ? { name: n } : {}) }));
    sessionStorage.setItem('seeded', '1');
  }, name);
  await connect(page);
  return page;
}

/** Ответить в раунде i: верно или нет; затем «Дальше». */
async function answerRound(page: Page, i: number, right: boolean) {
  await expect(page.locator('.exam-status')).toHaveText(`Раунд ${i + 1} из 7`);
  const card = page.locator('.card');
  await expect(card).toBeVisible({ timeout: 10_000 });
  const label = (await card.getAttribute('aria-label'))!;
  const sit = /^Ситуация (S\d\d-\d\d)$/.exec(label)?.[1];
  if (sit) {
    // «Показать варианты» могут открыться и сами, пока тест тянется к кнопке.
    await page.locator('.sit-ready:visible').tap({ timeout: 1500 }).catch(() => undefined);
    await expect(page.locator('.sit-card .sit-options')).not.toHaveClass(/is-hidden/);
    const correct = CORRECT.get(sit)!;
    const count = await page.locator('.sit-card .option').count();
    await page.locator(`.sit-card .option[data-orig="${right ? correct : (correct + 1) % count}"]`).tap();
  } else {
    const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
    const correct = CORRECT.get(qid(Number(ticket), Number(number)))!;
    const count = await page.locator('.option').count();
    await page.locator('.option').nth(right ? correct : (correct + 1) % count).tap();
  }
  await page.getByRole('button', { name: /^(Дальше|Итоги дуэли|Итоги заезда)$/ }).tap();
  return !!sit;
}

test('живая дуэль: комната по коду, 7 раундов вдвоём, итог у обоих', async ({ browser }) => {
  const { connect } = fakeRooms();
  const host = await phone(browser, 'Маша', connect);
  const guest = await phone(browser, undefined, connect);

  // Создатель: «Режимы» → «Дуэль» → «Создать комнату».
  await host.goto('/');
  await host.getByRole('button', { name: 'Режимы' }).tap();
  await host.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await expect(host.getByRole('heading', { name: '⚡ Дуэль в реальном времени' })).toBeVisible();
  await host.getByRole('button', { name: 'Создать комнату' }).tap();
  const code = (await host.locator('.live-code').textContent())!;
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  await expect(host.locator('.live-peer')).toHaveText('⏳ Ждём соперника…');
  await expect(host.getByRole('button', { name: 'Начать дуэль' })).toBeDisabled();
  await expect(host.getByRole('img', { name: 'QR-код комнаты' })).toBeVisible();

  // Друг открывает ссылку с кодом комнаты, вводит имя.
  await guest.goto(`/#live=${code}`);
  await guest.getByRole('textbox', { name: 'Твоё имя' }).fill('Артём');
  await guest.getByRole('button', { name: 'В комнату' }).tap();
  await expect(host.locator('.live-peer')).toHaveText('✅ Артём в комнате!');
  await expect(guest.locator('.live-lobby')).toContainText('Маша выбирает задания');

  // Вперемешку: ситуации и вопросы билетов через одно.
  await host.getByRole('button', { name: 'Начать дуэль' }).tap();
  const kinds: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    // Создатель отвечает первым; в раунде 2 ошибается, а друг отвечает верно.
    kinds.push(await answerRound(host, i, i !== 1));
    await answerRound(guest, i, i === 1 || i === 3);
  }
  expect(kinds).toEqual([true, false, true, false, true, false, true]);

  await expect(host.locator('.live-verdict')).toHaveText('Победа! 🏆');
  await expect(host.locator('.live-final')).toHaveText('Маша 6 : 1 Артём');
  await expect(host.locator('.live-rounds li')).toHaveCount(7);
  await expect(guest.locator('.live-verdict')).toHaveText('Поражение');
  await expect(guest.locator('.live-final')).toHaveText('Артём 1 : 6 Маша');
  await expect(host.locator('.topbar__score')).toHaveText('6 : 1');

  const saved = async (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  const h = await saved(host);
  expect(h.modes.live).toEqual({ wins: 1, losses: 0, draws: 0 });
  expect(h.coins).toBeGreaterThanOrEqual(10);
  // Ответы на вопросы билетов — в прогресс: 3 вопроса, один с ошибкой.
  expect(Object.keys(h.questions)).toHaveLength(3);
  expect((await saved(guest)).modes.live).toEqual({ wins: 0, losses: 1, draws: 0 });

  // «К дуэлям» — обратно на экран дуэлей со счётом живых дуэлей.
  await host.getByRole('button', { name: 'К дуэлям' }).tap();
  await expect(host.locator('.live-hub')).toContainText('Побед: 1 · поражений: 0 · ничьих: 0');
});

test('живая дуэль: третьего не пускают, ушедший соперник заканчивает дуэль', async ({ browser }) => {
  const { connect } = fakeRooms();
  const host = await phone(browser, 'Маша', connect);
  const guest = await phone(browser, 'Артём', connect);
  const third = await phone(browser, 'Оля', connect);

  await host.goto('/');
  await host.getByRole('button', { name: 'Режимы' }).tap();
  await host.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await host.getByRole('button', { name: 'Создать комнату' }).tap();
  const code = (await host.locator('.live-code').textContent())!;

  // Вход по коду на экране дуэлей (код можно вставить и строчными).
  await guest.goto('/');
  await guest.getByRole('button', { name: 'Режимы' }).tap();
  await guest.locator('.mode-card', { hasText: 'Дуэль' }).tap();
  await guest.getByRole('textbox', { name: 'Код комнаты' }).fill('abc');
  await guest.getByRole('button', { name: 'Войти' }).tap();
  await expect(guest.locator('.toast__text')).toContainText('Код комнаты — 5 букв и цифр');
  await guest.getByRole('textbox', { name: 'Код комнаты' }).fill(code.toLowerCase());
  await guest.getByRole('button', { name: 'Войти' }).tap();
  await expect(host.locator('.live-peer')).toHaveText('✅ Артём в комнате!');

  await third.goto(`/#live=${code}`);
  await expect(third.locator('.live-note')).toHaveText('В этой комнате уже двое. Попроси у друга новый код.');

  // Билеты; после первого раунда друг выходит.
  await host.getByRole('button', { name: 'Билеты' }).tap();
  await host.getByRole('button', { name: 'Начать дуэль' }).tap();
  expect(await answerRound(host, 0, true)).toBe(false);
  await answerRound(guest, 0, true);
  await expect(host.locator('.exam-status')).toHaveText('Раунд 2 из 7');
  // Друг выходит «Назад» — с подтверждением.
  await guest.getByRole('button', { name: 'Назад' }).tap();
  await guest.getByRole('button', { name: 'Выйти' }).tap();
  await expect(guest.locator('.live-hub')).toBeVisible();
  await expect(host.locator('.live-note')).toHaveText('Соперник вышел из дуэли. Итог не засчитан.');
  const h = await host.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress') ?? '{}'));
  expect(h.modes?.live).toBeUndefined();
});
