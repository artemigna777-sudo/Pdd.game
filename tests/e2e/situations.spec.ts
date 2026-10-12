/**
 * Этап 15 «Ситуации на дороге»: ступени, заезд с таймером (верно, неверно, время вышло), пометка
 * «не из билетов», итог, открытие следующей ступени, похожие вопросы из билетов.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const SITUATIONS: { id: string; correct: number; options: string[]; related: string[]; penalty: number }[] = readdirSync('data/situations')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(`data/situations/${f}`, 'utf8')));
const SITUATIONS_FULL: { id: string; scene: { place: string; time: string } }[] = SITUATIONS as never;
const SHOTS = process.env.SHOTS;

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

function seed(page: Page) {
  return page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, rules: false }));
    localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 0, coins: 0, questions: {}, chapters: {}, finale: { control: [], seen: [] }, streak: { count: 0, best: 0 } }));
    sessionStorage.setItem('seeded', '1');
  });
}

const shot = (page: Page, name: string) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve());

/** Показать варианты, если они ещё не показались сами (время на чтение могло выйти). */
async function reveal(page: Page) {
  const card = page.locator('.sit-card');
  await card.getByRole('button', { name: /показать варианты/ }).tap({ timeout: 1000 }).catch(() => {});
  await expect(card.locator('.sit-options')).toBeVisible();
}

/** Какая ситуация сейчас на экране. */
async function current(page: Page) {
  const id = (await page.locator('.sit-card').getAttribute('aria-label'))!.replace('Ситуация ', '');
  return SITUATIONS.find((s) => s.id === id)!;
}

test('Ситуации: заезд «Спокойно», таймер, итог и следующая ступень', async ({ page }) => {
  await page.clock.install();
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  const modeCard = page.locator('.mode-card', { hasText: 'Ситуации на дороге' });
  await expect(modeCard).toContainText('Новый режим');
  await modeCard.tap();
  await expect(page.locator('.sit-hub')).toContainText('не из билетов');
  await expect(page.locator('.sit-hub__stats')).toHaveText(/Решено ситуаций: 0 из \d+/);
  // «Микс» и «Хардкор» закрыты.
  await expect(page.locator('[data-stage="mix"]')).toBeDisabled();
  await expect(page.locator('[data-stage="hard"]')).toContainText('Откроется после «Микса»');
  await shot(page, 'sit-hub');
  await page.locator('[data-stage="calm"]').tap();

  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.exam-status')).toHaveText(`Ситуация ${i + 1} из 10`);
    const card = page.locator('.sit-card');
    await expect(card.locator('.sit-badge')).toHaveText('не из билетов');
    await expect(card.locator('.sit-scene svg')).toBeVisible();
    const sit = await current(page);
    seen.push(sit.id);
    if (i === 0) {
      // Сначала время на чтение: вариантов ещё нет, таймер не идёт.
      await expect(card.locator('.sit-options')).toBeHidden();
      await shot(page, 'sit-reading');
      await card.getByRole('button', { name: /показать варианты/ }).tap();
      await expect(card.locator('.sit-options')).toBeVisible();
      await expect(card.locator('.sit-timer__secs')).toHaveText('10 с');
      await shot(page, 'sit-options');
    }
    if (i === 1) {
      // Не успел: время вышло — это ошибка.
      await reveal(page);
      await page.clock.runFor(11_000);
      await expect(card.locator('.feedback')).toContainText('Время вышло');
    } else {
      await reveal(page);
      const pick = i === 2 ? (sit.correct + 1) % sit.options.length : sit.correct;
      await card.locator(`.option[data-orig="${pick}"]`).tap();
      await expect(card.locator('.feedback')).toContainText(i === 2 ? 'Неверно' : 'Верно!');
      if (i === 2) await expect(card.locator('.sit-penalty')).toContainText(`+${sit.penalty} штрафн`);
    }
    await expect(card.locator('.sit-rules .chip').first()).toBeVisible();
    if (i === 2) await shot(page, 'sit-answered');
    await card.locator('.sit-next').tap();
  }
  expect(new Set(seen).size).toBe(10);

  // Итог: 8 из 10, штрафные баллы, открыт «Микс», монеты.
  await expect(page.locator('.result__score')).toHaveText('8 из 10');
  const points = [seen[1], seen[2]].reduce((sum, id) => sum + SITUATIONS.find((s) => s.id === id)!.penalty, 0);
  await expect(page.locator('.sit-points')).toHaveText(`${points} / 7`);
  await expect(page.locator('.sit-verdict')).toContainText(`Штрафные баллы: ${points}. ` + (points < 7 ? 'На экзамене в ГИБДД такой заезд был бы сдан.' : 'На экзамене в ГИБДД — «не сдал»'));
  await expect(page.locator('.sit-unlocked')).toContainText('Открыта ступень «Микс»');
  await expect(page.locator('.result__note').first()).toContainText('не успел ответить: 1');
  await expect(page.locator('.sit-review__item')).toHaveCount(10);
  // Статистика заезда: навыки и вывод.
  await expect(page.locator('.sit-result .skill-bar').first()).toBeVisible();
  await expect(page.locator('.sit-result .skill-verdict')).toBeVisible();
  // Ошибки раскрыты сразу, верные — по касанию.
  await expect(page.locator('.sit-review__item').nth(1).locator('.sit-review__body')).toBeVisible();
  await expect(page.locator('.sit-review__item').nth(0).locator('.sit-review__body')).toBeHidden();
  await shot(page, 'sit-result');
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('pdd-game:progress')))!);
  expect(saved.coins).toBe(8);
  expect(saved.modes.situations.open).toEqual(['calm', 'mix']);
  expect(Object.keys(saved.modes.situations.seen)).toHaveLength(10);
  // Ситуации не из билетов: прогресс вопросов билетов не тронут.
  expect(saved.questions).toEqual({});

  // Похожие вопросы из билетов — обычная тренировка с оригинальными карточками.
  const related = [seen[1], seen[2]].flatMap((id) => SITUATIONS.find((s) => s.id === id)!.related);
  const button = page.getByRole('button', { name: /Похожие вопросы из билетов/ });
  if (related.length) {
    await button.tap();
    await expect(page.locator('.topbar__title')).toHaveText('Похожие вопросы из билетов');
    await expect(page.locator('.card').first()).toHaveAttribute('aria-label', /Билет \d+, вопрос \d+/);
    await page.getByRole('button', { name: 'Назад' }).tap();
    await expect(page.locator('.sit-hub')).toBeVisible();
  } else {
    await expect(button).toHaveCount(0);
    await page.getByRole('button', { name: 'Выбрать сложность' }).tap();
  }

  // После перезапуска «Микс» открыт, решено 8.
  await page.reload();
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await expect(page.locator('.mode-card', { hasText: 'Ситуации на дороге' })).toContainText('Решено ситуаций: 8');
  await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
  await expect(page.locator('.sit-hub__stats')).toContainText('Решено ситуаций: 8');
  await expect(page.locator('[data-stage="mix"]')).toBeEnabled();
  // Дневник водителя помнит две ошибки и предлагает повторить именно их.
  await expect(page.locator('.sit-diary .skill-bar').first()).toBeVisible();
  await expect(page.locator('.sit-diary [data-stage="diary"]')).toHaveText('Повторить слабое (2)');
  await shot(page, 'sit-diary');
  await page.locator('.sit-diary [data-stage="diary"]').tap();
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.exam-status')).toHaveText(`Ситуация ${i + 1} из 2`);
    expect([seen[1], seen[2]]).toContain((await current(page)).id);
    await reveal(page);
    await page.locator(`.sit-card .option[data-orig="${(await current(page)).correct}"]`).tap();
    await page.locator('.sit-card .sit-next').tap();
  }
  await expect(page.locator('.result__score')).toHaveText('2 из 2');
  await page.getByRole('button', { name: 'Выбрать сложность' }).tap();
  await expect(page.locator('.sit-diary [data-stage="diary"]')).toBeDisabled();
  await page.locator('[data-stage="mix"]').tap();
  // В «Миксе» решённые ситуации — на 3 секунды.
  let fast = 0;
  for (let i = 0; i < 10; i++) {
    const card = page.locator('.sit-card');
    await expect(page.locator('.exam-status')).toHaveText(`Ситуация ${i + 1} из 10`);
    await reveal(page);
    const secs = await card.locator('.sit-timer__secs').textContent();
    if (secs === '3 с') fast++;
    const sit = await current(page);
    await card.locator(`.option[data-orig="${sit.correct}"]`).tap();
    await card.locator('.sit-next').tap();
  }
  expect(fast).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.result__score')).toHaveText('10 из 10');
});

test('Ситуации: выход из заезда спрашивает подтверждение', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
  await page.locator('[data-stage="calm"]').tap();
  await expect(page.locator('.sit-card')).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await expect(page.locator('.modal__title')).toHaveText('Прервать заезд?');
  await page.getByRole('button', { name: 'Продолжить' }).tap();
  await expect(page.locator('.sit-card')).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Выйти' }).tap();
  await expect(page.locator('.sit-hub')).toBeVisible();
});

const PROVOKE: { id: string; command: string; obey: boolean }[] = JSON.parse(readFileSync('data/situations/provoke/provocations.json', 'utf8'));

/** Подменить синтез речи: сказанное копится в window.__spoken. */
function fakeSpeech(page: Page) {
  return page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class Utterance {
      lang = '';
      voice = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: (u: Utterance) => spoken.push(u.text), cancel: () => {}, getVoices: () => [{ lang: 'ru-RU', name: 'Тест' }] },
      configurable: true,
    });
  });
}

test('Провокации инспектора: голос, «Выполняю» и «Нельзя», отдельная оценка', async ({ page }) => {
  await fakeSpeech(page);
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
  await expect(page.locator('[data-stage="provoke"]')).toContainText(`${PROVOKE.length} команд`);
  await page.locator('[data-stage="provoke"]').tap();
  for (let i = 0; i < 10; i++) {
    const card = page.locator('.sit-card');
    await expect(page.locator('.exam-status')).toHaveText(`Ситуация ${i + 1} из 10`);
    const id = (await card.getAttribute('aria-label'))!.replace('Ситуация ', '');
    const p = PROVOKE.find((x) => x.id === id)!;
    // Команду инспектор говорит вслух.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1))).toBe(p.command);
    await expect(card.locator('.sit-scene svg')).toBeVisible();
    await reveal(page);
    await expect(card.locator('.option')).toHaveText([/Выполняю/, /Нельзя/]);
    // Первую провокацию — неверно, остальные — верно.
    const right = p.obey ? 0 : 1;
    await card.locator(`.option[data-orig="${i === 0 ? 1 - right : right}"]`).tap();
    await expect(card.locator('.feedback')).toContainText(i === 0 ? 'Неверно' : 'Верно!');
    await card.locator('.sit-next').tap();
  }
  await expect(page.locator('.result__score')).toHaveText('9 из 10');
  await expect(page.locator('.sit-provoke-score')).toContainText('Провокаций распознано');
  // Оценка отдельно: «Микс» не открылся, решённых ситуаций — ноль.
  await page.getByRole('button', { name: 'Выбрать сложность' }).tap();
  await expect(page.locator('[data-stage="provoke"]')).toContainText('Последний раз: 9 из 10 · лучший: 9');
  await expect(page.locator('.sit-hub__stats')).toHaveText(/Решено ситуаций: 0 из/);
  await expect(page.locator('[data-stage="mix"]')).toBeDisabled();

  // «Голос инспектора» выключен — инспектор молчит.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('pdd-game:settings')!);
    localStorage.setItem('pdd-game:settings', JSON.stringify({ ...s, voice: false }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
  await page.locator('[data-stage="provoke"]').tap();
  await expect(page.locator('.sit-card')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBe(0);
});

test('настройки: выключатель «Голос инспектора»', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const voice = page.getByRole('button', { name: /^Голос инспектора/ });
  await expect(voice).toHaveAttribute('aria-pressed', 'true');
  await voice.tap();
  await expect(voice).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pdd-game:settings')))!).voice).toBe(false);
});

test('Темы и «Реальная жизнь»: заезд по теме, бесконечный заезд до трёх ошибок, рекорд', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Режимы' }).tap();
  await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
  await expect(page.locator('.sit-theme')).toHaveCount(4);
  // «Ночная езда»: только ночные сцены.
  await page.locator('[data-stage="night"]').tap();
  await expect(page.locator('.topbar__title')).toHaveText('Ситуации: Ночная езда');
  const night = SITUATIONS_FULL.filter((s) => s.scene.time === 'night').map((s) => s.id);
  await expect(page.locator('.exam-status')).toHaveText(`Ситуация 1 из ${Math.min(10, night.length)}`);
  expect(night).toContain((await current(page)).id);
  await page.getByRole('button', { name: 'Назад' }).tap();
  await page.getByRole('button', { name: 'Выйти' }).tap();

  // «Реальная жизнь»: 4 верных, потом 3 ошибки — конец, рекорд 4.
  await page.locator('[data-stage="life"]').tap();
  await expect(page.locator('.topbar__title')).toHaveText('Реальная жизнь');
  for (let i = 0; i < 7; i++) {
    await expect(page.locator('.exam-status')).toContainText(`Верных: ${Math.min(i, 4)}`);
    const sit = await current(page);
    expect(SITUATIONS_FULL.find((s) => s.id === sit.id)!.scene.place).toBe('city');
    await reveal(page);
    const pick = i < 4 ? sit.correct : (sit.correct + 1) % sit.options.length;
    await page.locator(`.sit-card .option[data-orig="${pick}"]`).tap();
    await page.locator('.sit-card .sit-next').tap();
  }
  await expect(page.locator('.result__score')).toHaveText('4 верных');
  await expect(page.locator('.sit-life')).toHaveText('🏆 Новый рекорд!');
  await page.getByRole('button', { name: 'Выбрать сложность' }).tap();
  await expect(page.locator('[data-stage="life"]')).toContainText('Рекорд: 4');
});
