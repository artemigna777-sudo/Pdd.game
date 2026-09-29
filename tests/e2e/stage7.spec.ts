/**
 * Этап 7 — живой город: поток машин и пешеходов, гонка с Артёмом, поручения с выбором в диалоге,
 * события в пути с вопросом по теме, звуки мотора и улицы.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const MAPPING: { questions: { id: string; chapter: string; point: string }[]; chapters: { id: string; points: { id: string; template: string }[] }[] } = JSON.parse(
  readFileSync('data/mapping.json', 'utf8'),
);
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
type Any = any;
const SLOW = { timeout: 90_000 };

// Пулы вопросов событий (src/world/events.ts).
const EVENT_POOLS: Record<string, string[]> = {
  ambulance: ['B12-Q14', 'B36-Q06', 'B22-Q06', 'B38-Q06', 'B06-Q15', 'B33-Q06', 'B11-Q06', 'B03-Q06'],
  ball: ['B01-Q20', 'B35-Q20', 'B11-Q20', 'B39-Q20', 'B20-Q19', 'B25-Q19', 'B31-Q20', 'B33-Q20'],
  rain: ['B22-Q20', 'B31-Q19', 'B29-Q19', 'B13-Q19', 'B36-Q19', 'B17-Q20'],
};

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

function seed(page: Page, progress: unknown, settings: Record<string, unknown> = { events: false }) {
  return page.addInitScript(
    ([p, s]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, ...s }));
      localStorage.setItem('pdd-game:progress', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    },
    [progress, settings] as const,
  );
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));
const city = (page: Page) => page.evaluate(() => !!(window as Any).__game?.scene.getScene('city')?.traffic);

async function waitCity(page: Page) {
  await page.waitForFunction(() => {
    const game = (window as Any).__game;
    return game?.scene.isActive('city') && (game.scene.getScene('city').pois?.length ?? 0) > 0;
  }, undefined, SLOW);
}

/** Пролистать сцену до конца (на выборе — первый вариант). */
async function readCutscene(page: Page) {
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toBeVisible(SLOW);
  while (await dialog.count()) {
    await dialog.locator('.btn--primary').first().tap();
    await page.waitForTimeout(120);
  }
}

async function answerCard(page: Page, right: boolean) {
  const label = (await page.locator('.sheet .card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const id = qid(Number(ticket), Number(number));
  const correct = CORRECT.get(id)!;
  const n = await page.locator('.sheet .option').count();
  await page.locator('.sheet .option').nth(right ? correct : (correct + 1) % n).tap();
  return id;
}

const chapterSeen = (extra: Record<string, unknown> = {}) => ({ points: [], seen: ['prologue', 'intro', 'race', 'beat1', 'beat2'], stars: 0, side: { step: 2, done: 1 }, ...extra });

/** Поставить машину на прямой участок подальше от точек и поехать по нему. */
async function driveStraight(page: Page) {
  await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    const lanes = [...s.graph.lanes.values()].filter((l: Any) => l.length > 300);
    const score = (l: Any) => Math.min(...s.pois.map((p: Any) => Math.hypot(p.anchor.x - (l.start.x + l.end.x) / 2, p.anchor.y - (l.start.y + l.end.y) / 2)));
    const lane = lanes.sort((a: Any, b: Any) => score(b) - score(a))[0];
    s.player.placeAt(lane, 80);
    s.player.setPath([s.graph.lanePart(lane, 80, lane.length - 20)]);
  });
}

test('живой город: по улицам ездят машины и ходят пешеходы, игроку они не мешают', async ({ page }) => {
  await seed(page, { xp: 0, questions: {}, chapters: { ch1: { delivered: 1, stars: 3, points: [], seen: ['intro'] }, ch2: { delivered: 1, stars: 3, points: [], seen: ['intro'] }, ch3: chapterSeen() }, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: /^Глава 3/ }).tap();
  await waitCity(page);
  expect(await city(page)).toBe(true);
  const info = await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    return { cars: s.traffic.cars.length, walkers: s.traffic.walkers.length, target: s.traffic.carTarget };
  });
  expect(info.cars).toBeGreaterThanOrEqual(8);
  expect(info.walkers).toBeGreaterThanOrEqual(6);

  // Поехать через район: машины рядом с игроком не оказываются вплотную.
  await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    const pos = s.player.position;
    const far = [...s.graph.lanes.values()].filter((l: Any) => l.length > 300).sort((a: Any, b: Any) => Math.hypot(b.start.x - pos.x, b.start.y - pos.y) - Math.hypot(a.start.x - pos.x, a.start.y - pos.y))[2];
    s.destination = { lane: far, s: far.length / 2 };
    s.driveTo(s.destination);
    (window as Any).samples = [];
  });
  const start = await page.evaluate(() => (window as Any).__game.scene.getScene('city').traffic.cars.map((c: Any) => ({ id: c.id, x: c.pos.x, y: c.pos.y })));
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    const near = await page.evaluate(() => {
      const s = (window as Any).__game.scene.getScene('city');
      const p = s.player.position;
      return Math.min(999, ...s.traffic.cars.filter((c: Any) => !c.fading && !c.gone).map((c: Any) => Math.hypot(c.pos.x - p.x, c.pos.y - p.y)));
    });
    expect(near).toBeGreaterThan(24);
  }
  const moved = await page.evaluate((before: Any[]) => {
    const s = (window as Any).__game.scene.getScene('city');
    return s.traffic.cars.filter((c: Any) => {
      const b = before.find((x) => x.id === c.id);
      return b && Math.hypot(b.x - c.pos.x, b.y - c.pos.y) > 60;
    }).length;
  }, start);
  expect(moved).toBeGreaterThan(0);
  // Пешеходы нарисованы (хотя бы кто-то в кадре или рядом).
  const walkersNear = await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    const p = s.player.position;
    return s.traffic.walkers.filter((w: Any) => Math.hypot(w.pos.x - p.x, w.pos.y - p.y) < 700).length;
  });
  expect(walkersNear).toBeGreaterThan(0);
});

test('гонка с Артёмом: вызов с выбором, мопед на карте, итог в наградах главы', async ({ page }) => {
  // Все точки главы 1, кроме одной, пройдены; время в районе уже большое — Артём вот-вот доставит.
  const ROAD_POINT = MAPPING.chapters[0].points.find((p) => p.template === 'street')!.id;
  const questions: Record<string, unknown> = {};
  for (const q of MAPPING.questions) if (q.chapter === 'ch1' && q.point !== ROAD_POINT) questions[q.id] = { n: 1, ok: true, ever: true, at: 1 };
  const points = MAPPING.chapters[0].points.map((p) => p.id).filter((p) => p !== ROAD_POINT);
  // Время Артёма в главе 1 (src/story/extras.ts): 22 с на вопрос и 15 с на точку.
  const artem = MAPPING.questions.filter((q) => q.chapter === 'ch1').length * 22 + MAPPING.chapters[0].points.length * 15;
  await seed(page, {
    xp: 700,
    coins: 0,
    questions,
    chapters: { ch1: { points, seen: ['prologue', 'intro', 'beat1', 'beat2'], stars: 0, side: { step: 2, done: 1 }, race: { time: artem - 3, answers: 40, correct: 34 } } },
    finale: { control: [], seen: [] },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  const dialog = page.locator('.cutscene');
  await expect(dialog).toContainText('Знакомься: Артём', SLOW);
  await page.getByRole('button', { name: 'Далее' }).tap();
  await expect(page.getByRole('button', { name: 'Спорим!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Я за точность' })).toBeVisible();
  await page.getByRole('button', { name: 'Спорим!' }).tap();
  await expect(dialog).toContainText('Мой мопед — фиолетовый');
  await page.getByRole('button', { name: 'Поехали' }).tap();
  await waitCity(page);
  expect((await readProgress(page)).chapters.ch1.seen).toEqual(expect.arrayContaining(['race', 'race:bet']));

  // Время идёт — Артём доставил свою посылку раньше.
  await expect(page.locator('#toast')).toContainText('Артём уже доставил', SLOW);
  await expect(page.locator('.city-task')).toContainText('🛵 доставил');

  // Последняя точка — и доставка.
  await page.evaluate((id) => {
    const s = (window as Any).__game.scene.getScene('city');
    const poi = s.pois.find((p: Any) => p.point.id === id);
    s.player.placeAt(poi.lane, Math.max(0, poi.s - 60));
    s.destination = { lane: poi.lane, s: poi.s };
    s.driveTo(s.destination);
  }, ROAD_POINT);
  for (;;) {
    await expect(page.locator('.sheet.is-open .card')).toBeVisible(SLOW);
    await answerCard(page, true);
    const next = page.locator('.sheet__foot:not([hidden]) .btn');
    await expect(next).toBeVisible(SLOW);
    const label = (await next.textContent()) ?? '';
    await next.tap();
    if (label !== 'Следующий вопрос') break;
  }
  await readCutscene(page);
  await page.waitForFunction(() => !!(window as Any).__game.scene.getScene('city').goal, undefined, SLOW);
  await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    s.player.placeAt(s.goal.lane, s.goal.s);
    s.startScene(s.goal);
  });
  await readCutscene(page);
  const race = page.locator('.modal .race');
  await expect(race).toContainText('Гонка с Артёмом');
  // Точность: 34 из 40 до этого плюс все верные ответы последней точки — против 70% у Артёма; быстрее — Артём.
  const last = MAPPING.questions.filter((q) => q.chapter === 'ch1' && q.point === ROAD_POINT).length;
  await expect(race.locator('tr').nth(1)).toContainText(`${Math.round(((34 + last) / (40 + last)) * 100)}%`);
  await expect(race.locator('tr').nth(2)).toContainText('70%');
  // Точнее — игрок (ячейка выделена); быстрее — Артём или почти поровну: монеты только за точность.
  await expect(race.locator('tr').nth(1).locator('td.is-win')).toHaveCount(1);
  await expect(race).not.toContainText('И быстрее, и точнее');
  await expect(race).toContainText('+15 монет за гонку');
  const saved = await readProgress(page);
  expect(saved.chapters.ch1.race.settled).toBeGreaterThan(0);
  // 50 за доставку, 15 за точность, 2 за первые верные ответы последней точки.
  expect(saved.coins).toBeGreaterThanOrEqual(65);
});

test('поручение: отказаться, взять позже из задания, забрать и отвезти — награда', async ({ page }) => {
  await seed(page, { xp: 0, coins: 0, questions: {}, chapters: { ch1: { points: ['c1'], seen: ['prologue', 'intro', 'race', 'beat1'], stars: 0 } }, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  const dialog = page.locator('.cutscene');
  await expect(dialog).toContainText('Напекла пирожков', SLOW);
  // «Пропустить» доходит до выбора, но выбор пропустить нельзя.
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await expect(page.getByRole('button', { name: 'Помогу!' })).toBeVisible();
  await page.getByRole('button', { name: 'Не сейчас' }).tap();
  await expect(dialog).toContainText('Взять задание можно позже');
  await page.getByRole('button', { name: 'Поехали' }).tap();
  await waitCity(page);
  expect(await page.evaluate(() => !!(window as Any).__game.scene.getScene('city').side)).toBe(false);
  expect((await readProgress(page)).chapters.ch1.side).toBeUndefined();

  // Задание главы → взять поручение.
  await page.locator('.city-task').tap();
  await page.getByRole('button', { name: 'Поручение: «Пирожки для автошколы»' }).tap();
  await expect(dialog).toContainText('Напекла пирожков');
  await page.getByRole('button', { name: 'Пропустить' }).tap();
  await page.getByRole('button', { name: 'Помогу!' }).tap();
  await expect(dialog).toContainText('оранжевая отметка: «Лоток Галины Ивановны»');
  await page.getByRole('button', { name: 'Поехали' }).tap();
  await expect.poll(() => page.evaluate(() => (window as Any).__game.scene.getScene('city').side?.point.title)).toBe('Лоток Галины Ивановны');

  // Касание отметки — машина едет к ней; доехали — забрали пирожки.
  await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    s.player.placeAt(s.side.lane, Math.max(0, s.side.s - 50));
    s.destination = { lane: s.side.lane, s: s.side.s };
    s.driveTo(s.destination);
  });
  await expect(dialog).toContainText('Тёплый пакет с пирожками', SLOW);
  await readCutscene(page);
  await expect.poll(() => page.evaluate(() => (window as Any).__game.scene.getScene('city').side?.point.title)).toBe('Автошкола: учительская');
  expect((await readProgress(page)).chapters.ch1.side.step).toBe(1);

  await page.evaluate(() => {
    const s = (window as Any).__game.scene.getScene('city');
    s.player.placeAt(s.side.lane, s.side.s);
    s.startScene(s.side);
  });
  await expect(dialog).toContainText('Вот это доставка', SLOW);
  while (!((await dialog.textContent()) ?? '').includes('выполнено')) await page.getByRole('button', { name: 'Далее' }).tap();
  await expect(dialog).toContainText('выполнено: +30 монет и +40 опыта');
  await page.getByRole('button', { name: 'Поехали' }).tap();
  const saved = await readProgress(page);
  expect(saved.coins).toBe(30);
  expect(saved.xp).toBe(40);
  expect(saved.chapters.ch1.side.done).toBeGreaterThan(0);
  expect(await page.evaluate(() => !!(window as Any).__game.scene.getScene('city').side)).toBe(false);

  // После перезапуска поручение не предлагается снова, в задании — «выполнено».
  await page.reload();
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await page.waitForTimeout(600);
  await expect(page.locator('.cutscene')).toHaveCount(0);
  await page.locator('.city-task').tap();
  await expect(page.locator('.modal')).toContainText('Поручение «Пирожки для автошколы» выполнено.');
});

test('события в пути: скорая, мяч, дождь — вопрос из базы по теме; вопрос можно пропустить', async ({ page }) => {
  await seed(page, { xp: 0, coins: 0, questions: {}, chapters: { ch1: chapterSeen() }, finale: { control: [], seen: [] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  const titles: Record<string, string> = { ambulance: 'Сзади — скорая', ball: 'Мяч на дороге', rain: 'Пошёл дождь' };
  for (const kind of ['ambulance', 'ball', 'rain']) {
    await driveStraight(page);
    await page.waitForTimeout(300);
    await page.evaluate((k) => void (window as Any).__game.scene.getScene('city').triggerEvent(k), kind);
    await expect(page.locator('.sheet.is-open')).toBeVisible(SLOW);
    await expect(page.locator('.sheet__title')).toHaveText(titles[kind]);
    await expect(page.locator('.event-intro')).toBeVisible();
    // Машина стоит, пока не ответили.
    expect(await page.evaluate(() => (window as Any).__game.scene.getScene('city').player.speed)).toBeLessThan(1);
    if (kind === 'ball') {
      // Вопрос события можно пропустить: ответ не записывается.
      const before = Object.keys((await readProgress(page)).questions).length;
      await page.getByRole('button', { name: 'Пропустить вопрос' }).tap();
      await expect(page.locator('.sheet.is-open')).toHaveCount(0);
      expect(Object.keys((await readProgress(page)).questions).length).toBe(before);
    } else {
      const id = await answerCard(page, true);
      expect(EVENT_POOLS[kind]).toContain(id);
      await page.getByRole('button', { name: 'Поехали' }).tap();
      await expect(page.locator('.sheet.is-open')).toHaveCount(0);
      expect((await readProgress(page)).questions[id].ok).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => (window as Any).__game.scene.getScene('city').eventKind ?? 'none')).toBe('none');
  }
  // Дождь идёт по всему району ещё какое-то время.
  expect(await page.evaluate(() => (window as Any).__game.scene.getScene('city').atmosphere.baseWeather)).toBe('rain');
});

test('события случаются сами, пока машина едет; их можно выключить в настройках', async ({ page }) => {
  await seed(page, { xp: 0, coins: 0, questions: {}, chapters: { ch1: chapterSeen() }, finale: { control: [], seen: [] } }, { events: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await page.evaluate(() => {
    (window as Any).__game.scene.getScene('city').nextEventAt = 0.5;
  });
  await driveStraight(page);
  await expect(page.locator('.sheet.is-open .event-intro')).toBeVisible(SLOW);
  await page.getByRole('button', { name: 'Пропустить вопрос' }).tap();

  // Выключить события в настройках города.
  await page.getByRole('button', { name: 'Настройки' }).tap();
  const toggle = page.getByRole('button', { name: /События в пути/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as Any).__game.scene.getScene('city').eventsEnabled)).toBe(false);
  await page.evaluate(() => {
    (window as Any).__game.scene.getScene('city').nextEventAt = 0.5;
  });
  await page.getByRole('button', { name: 'Настройки' }).tap();
  await driveStraight(page);
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as Any).__game.scene.getScene('city').eventKind ?? 'none')).toBe('none');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pdd-game:settings')))!).events).toBe(false);
});

test('звуки города: мотор и улица, когда звук включён; без звука — тишина', async ({ page }) => {
  await page.addInitScript(() => {
    const Orig = window.AudioContext;
    (window as Any).osc = [];
    (window as Any).noise = 0;
    window.AudioContext = class extends Orig {
      createOscillator() {
        const o = super.createOscillator();
        (window as Any).osc.push(o);
        return o;
      }
      createBufferSource() {
        (window as Any).noise++;
        return super.createBufferSource();
      }
    } as typeof AudioContext;
  });
  await seed(page, { xp: 0, coins: 0, questions: {}, chapters: { ch1: chapterSeen() }, finale: { control: [], seen: [] } }, { events: false, sound: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await expect.poll(() => page.evaluate(() => (window as Any).osc.filter((o: OscillatorNode) => o.type === 'sawtooth').length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as Any).noise)).toBeGreaterThan(0);
  // Скорая — сирена.
  await driveStraight(page);
  await page.evaluate(() => void (window as Any).__game.scene.getScene('city').triggerEvent('ambulance'));
  await expect.poll(() => page.evaluate(() => (window as Any).osc.filter((o: OscillatorNode) => o.type === 'triangle').length)).toBeGreaterThan(0);

  // Звук выключен — город молчит.
  await page.evaluate(() => {
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, sound: false }));
  });
  await page.reload();
  await page.evaluate(() => {
    (window as Any).osc = [];
    (window as Any).noise = 0;
  });
  await page.getByRole('button', { name: 'Глава 1: Первый день' }).tap();
  await waitCity(page);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as Any).osc.filter((o: OscillatorNode) => o.type === 'sawtooth').length)).toBe(0);
  expect(await page.evaluate(() => (window as Any).noise)).toBe(0);
});
