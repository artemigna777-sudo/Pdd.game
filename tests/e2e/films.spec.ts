/**
 * Этап 18: кат-сцены сюжета. В большой развилке главы 3 на весь экран идёт сцена по рисованным кадрам:
 * Турбин зовёт Артёма в «Турбо», реплики — субтитрами, выбор выезжает снизу, у каждого выбора своя сцена.
 * Кадры для просмотра: FILM_SHOTS=<папка> npx playwright test films.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface MappingData {
  chapters: { id: string; points: { id: string }[] }[];
}
const MAPPING: MappingData = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const SLOW = { timeout: 90_000 };
const SHOTS = process.env.FILM_SHOTS;

const passed = (id: string) => ({ points: MAPPING.chapters.find((c) => c.id === id)!.points.map((p) => p.id), seen: ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready'], stars: 3, delivered: 1, side: { step: 2, done: 1 } });

/** Глава 3, пройдено две трети точек: в городе сразу начинается сцена с развилкой. */
async function openFork(page: Page) {
  const ch3 = MAPPING.chapters.find((c) => c.id === 'ch3')!.points.map((p) => p.id);
  const data = {
    xp: 900,
    questions: {},
    chapters: {
      ch1: passed('ch1'),
      ch2: passed('ch2'),
      ch3: { points: ch3.slice(0, Math.ceil((ch3.length * 2) / 3)), seen: ['intro', 'race', 'beat1'], stars: 0, side: { step: 2, done: 1 } },
    },
    // У Артёма есть сердечко (глава 2) — открыты все три варианта.
    story: { choices: [{ id: 'ch1.card', value: 'keep', at: 1 }, { id: 'ch2.cover', value: 'cover', at: 2 }], endings: {}, rewinds: 0 },
    finale: { control: [], seen: [] },
  };
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pdd-game:progress', JSON.stringify(value));
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
      sessionStorage.setItem('seeded', '1');
    }
  }, data);
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 3: Светофоры и разметка' }).tap();
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toContainText('скорая', SLOW);
  // До разговора с Артёмом сцены нет: обычные реплики главы.
  await expect(dialog.locator('.cutscene__film')).toBeHidden();
  return dialog;
}

/** Идущие анимации сцены (без CSS-анимации появления окна). */
const running = (page: Page) => page.evaluate(() => document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && a.playState === 'running').length);
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

for (const [n, value, film, reply] of [
  [0, 'stay', 'ch3-stay', 'Команда… Да.'],
  [1, 'study', 'ch3-study', 'Вместе? Серьёзно?'],
  [2, 'free', 'ch3-free', 'Сам… Ну да.'],
] as const) {
  test(`глава 3: сцена «Турбин зовёт Артёма», выбор «${value}» — своя сцена`, async ({ page }) => {
    const dialog = await openFork(page);
    const screen = dialog.locator('.cutscene__film');
    const text = dialog.locator('.cutscene__text');
    while (!(await text.textContent())?.startsWith('Можно с тобой поговорить')) await dialog.getByRole('button', { name: 'Далее' }).tap();

    // На весь экран: внедорожник «Турбо», Турбин с ключами, Артём и печать «Правила — для медленных».
    await expect(screen).toBeVisible();
    await expect(dialog).toHaveClass(/cutscene--full/);
    await expect(screen).toHaveAttribute('data-film', 'ch3-offer');
    await expect(screen).toHaveAttribute('aria-label', /Турбин/);
    expect(await screen.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    // Кадры из public/scenes загрузились.
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('.cutscene__film img')].every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
    expect(await running(page)).toBeGreaterThan(0);
    if (n === 0 && SHOTS) {
      const t0 = Date.now();
      for (const t of [1.2, 4.2, 6.4, 8.6]) {
        await page.waitForTimeout(Math.max(0, t * 1000 - (Date.now() - t0)));
        await shot(page, `offer-${t}`);
      }
    }

    // Следующая реплика — та же сцена; вопрос — Артём между «Стрелой» и «Турбо».
    await dialog.getByRole('button', { name: 'Далее' }).tap();
    await expect(text).toContainText('Турбин зовёт меня старшим курьером');
    await expect(screen).toHaveAttribute('data-film', 'ch3-offer');
    await dialog.getByRole('button', { name: 'Далее' }).tap();
    await expect(screen).toHaveAttribute('data-film', 'ch3-choice');
    await page.waitForTimeout(900);
    if (n === 0) await shot(page, 'choice');

    await dialog.locator('.cutscene__choices button').nth(n).tap();
    await expect(text).toContainText(reply);
    await expect(screen).toHaveAttribute('data-film', film);
    await page.waitForTimeout(2600);
    await shot(page, film);

    // Сцена кончилась — окна нет, анимаций сцены тоже.
    while (await dialog.count()) {
      await dialog.locator('.btn--primary:visible').first().tap();
      await page.waitForTimeout(120);
    }
    await expect(page.locator('.cutscene__film')).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
    expect(saved.story.choices.at(-1)).toMatchObject({ id: 'ch3.artem', value });
  });
}

test('сцена на маленьком экране: на весь экран, выбор целиком виден; с «Уменьшить движение» сразу итоговый кадр', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const dialog = await openFork(page);
  const text = dialog.locator('.cutscene__text');
  while (!(await text.textContent())?.startsWith('Можно с тобой поговорить')) await dialog.getByRole('button', { name: 'Далее' }).tap();
  const screen = dialog.locator('.cutscene__film');
  await expect(screen).toHaveAttribute('data-film', 'ch3-offer');
  expect(await running(page)).toBe(0);
  await shot(page, 'small-offer');
  // Вопрос с тремя вариантами: сцена и кнопки целиком на экране.
  await dialog.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(screen).toHaveAttribute('data-film', 'ch3-choice');
  await shot(page, 'small-choice');
  // Сцена — на весь экран, субтитры и кнопки выбора — поверх неё, целиком на экране.
  expect(await screen.boundingBox()).toEqual({ x: 0, y: 0, width: 320, height: 568 });
  const card = (await dialog.locator('.cutscene__card').boundingBox())!;
  const last = (await dialog.locator('.cutscene__choices button').last().boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(last.y + last.height).toBeLessThanOrEqual(568);
  await context.close();
});

test('«Моя история» → «Сцены»: пройденную развилку можно пересмотреть со сделанным выбором', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    const story = { choices: [{ id: 'ch2.cover', value: 'truth', at: 1 }, { id: 'ch3.artem', value: 'free', at: 2 }], endings: {}, rewinds: 0 };
    localStorage.setItem('pdd-game:progress', JSON.stringify({ xp: 900, questions: {}, chapters: {}, story, finale: { control: [], seen: [] } }));
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, rules: false }));
    sessionStorage.setItem('seeded', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await page.getByRole('button', { name: /Моя история/ }).tap();
  const scene = page.locator('[data-scene="ch3.artem"]');
  await expect(scene).toContainText('Артёма зовут в «Турбо»');
  await expect(scene).toContainText('Артём ушёл в «Турбо»');
  await scene.getByRole('button', { name: 'Смотреть' }).tap();

  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  const screen = dialog.locator('.cutscene__film');
  await expect(screen).toHaveAttribute('data-film', 'ch3-offer');
  await dialog.getByRole('button', { name: 'Далее' }).tap();
  await dialog.getByRole('button', { name: 'Далее' }).tap();
  // Вопрос — без кнопок выбора: Артём помнит главу 2, дальше — сделанный выбор.
  await expect(dialog.locator('.cutscene__text')).toContainText('без вранья обошлось');
  await expect(screen).toHaveAttribute('data-film', 'ch3-choice');
  await expect(dialog.locator('.cutscene__choices')).toBeHidden();
  await dialog.getByRole('button', { name: 'Далее' }).tap();
  await expect(screen).toHaveAttribute('data-film', 'ch3-free');
  await dialog.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(dialog).toHaveCount(0);
  // Пересмотр ничего не меняет в сохранении.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
  expect(saved.story.choices.map((c: { id: string; value: string }) => `${c.id}=${c.value}`)).toEqual(['ch2.cover=truth', 'ch3.artem=free']);
});
