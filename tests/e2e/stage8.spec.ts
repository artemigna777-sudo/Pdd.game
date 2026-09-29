/**
 * Этап 8 — правила за рулём: педали и спидометр, нарушения (красный, пешеход, скорость,
 * встречная, остановка), лейтенант Соколов и вопрос из базы про это правило, подсказки
 * новичку, «Чистая езда» и её бонус при доставке посылки главы.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { RULE_QUESTIONS } from '../../src/world/rules.ts';

const QUESTIONS: { id: string; correct: number; ticket: number; number: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const MAPPING: { questions: { id: string; chapter: string }[]; chapters: { id: string; points: { id: string }[] }[] } = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
const qid = (ticket: number, number: number) => `B${String(ticket).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`;
type Any = any;
const SLOW = { timeout: 90_000 };

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_SLOW) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_SLOW) });
});

/** Глава 1 уже начата: сюжетные сцены и рассказ Соколова о правилах показаны. */
function progressCh1(extra: Record<string, unknown> = {}) {
  return {
    xp: 0,
    coins: 0,
    questions: {},
    chapters: { ch1: { points: [], seen: ['prologue', 'intro', 'race', 'beat1', 'beat2'], stars: 0, side: { step: 2, done: 1 } } },
    finale: { control: [], seen: [] },
    drive: { clean: 0, best: 0, total: 0, violations: 0, intro: 1 },
    ...extra,
  };
}

function seed(page: Page, progress: unknown, settings: Record<string, unknown> = {}) {
  return page.addInitScript(
    ([p, s]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, ...s }));
      localStorage.setItem('pdd-game:progress', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    },
    [progress, settings] as const,
  );
}

const readProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdd-game:progress')!));

/** Выполнить функцию со сценой города. */
const city = <T>(page: Page, fn: (scene: Any, arg: Any) => T, arg?: unknown): Promise<T> =>
  page.evaluate(([f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene('city'), a), [fn.toString(), arg] as const);

async function openChapter1(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Глава 1/ }).tap();
  await page.waitForFunction(() => {
    const game = (window as Any).__game;
    return game?.scene.isActive('city') && (game.scene.getScene('city').pois?.length ?? 0) > 0;
  }, undefined, SLOW);
  await expect(page.locator('.cutscene')).toHaveCount(0);
}

/** Нажать или отпустить педаль (как палец: pointerdown … pointerup). */
const pedal = (page: Page, kind: 'brake' | 'gas', on: boolean) => page.locator(`.pedal--${kind}`).dispatchEvent(on ? 'pointerdown' : 'pointerup', { pointerId: 7, isPrimary: true });

const speed = (page: Page) => city(page, (s) => s.player.speed as number);
const violation = (page: Page) => city(page, (s) => (s.violationKind as string | undefined) ?? null);

/** id вопроса на открытой карточке. */
async function cardQuestion(page: Page): Promise<string> {
  const label = (await page.locator('.sheet.is-open .card').getAttribute('aria-label'))!;
  const [, ticket, number] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  return qid(Number(ticket), Number(number));
}

async function answer(page: Page, right: boolean): Promise<string> {
  const id = await cardQuestion(page);
  const options = page.locator('.sheet.is-open .option');
  const correct = CORRECT.get(id)!;
  await options.nth(right ? correct : (correct + 1) % (await options.count())).tap();
  return id;
}

/** Подъезд к светофору: полоса без точек интереса, машина за 300 px до конца, красный только что загорелся. */
async function approachRed(page: Page): Promise<string> {
  const lane = await city(page, (s) => {
    const l = [...s.graph.lanes.values()].find((x: Any) => s.rules.signals.includes(x.to.id) && x.length > 330 && !s.pois.some((p: Any) => p.lane === x));
    return l.id as string;
  });
  // Красный на этой полосе горит 8 секунд: ждём его начала.
  await page.waitForFunction(
    (id) => {
      const sig = (window as Any).__game.scene.getScene('city').signalByLane.get(id);
      return sig.state.get(id) === 'red' && sig.t % 8 < 1.5;
    },
    lane,
    SLOW,
  );
  await city(
    page,
    (s, id) => {
      const l = s.graph.lane(id);
      s.player.placeAt(l, l.length - 300);
      const out = s.graph.exits(l).sort((a: Any, b: Any) => b.dir.x * l.dir.x + b.dir.y * l.dir.y - (a.dir.x * l.dir.x + a.dir.y * l.dir.y))[0];
      s.destination = { lane: out, s: 60 };
      s.driveTo(s.destination);
    },
    lane,
  );
  return lane;
}

test('красный: тормоз перед стоп-линией — без нарушения; проезд на красный — лейтенант Соколов и вопрос о светофоре', async ({ page }) => {
  await seed(page, progressCh1());
  await openChapter1(page);
  // Педали и спидометр с ограничением и счётчиком «Чистая езда».
  await expect(page.locator('.pedal--brake')).toBeVisible();
  await expect(page.locator('.pedal--gas')).toBeVisible();
  await expect(page.locator('.speedo__limit')).toHaveText('60');
  await expect(page.locator('.speedo__clean')).toHaveText('🛡 0 м');

  // Новичку — подсказка заранее; тормоз — машина стоит перед стоп-линией.
  const lane = await approachRed(page);
  await expect(page.locator('.rule-hint')).toContainText('красный', SLOW);
  await pedal(page, 'brake', true);
  await expect.poll(() => speed(page), SLOW).toBe(0);
  const stoppedAt = await city(page, (s, id) => ({ s: s.player.lanePosition().s as number, line: s.graph.lane(id).length - 26 }), lane);
  expect(stoppedAt.s + 20).toBeLessThan(stoppedAt.line);
  await expect(page.locator('.rule-hint')).toBeHidden();
  // Зелёный — отпустили тормоз, поехали. Нарушения нет, чистая езда копится.
  await page.waitForFunction((id) => (window as Any).__game.scene.getScene('city').signalByLane.get(id).state.get(id) === 'green', lane, SLOW);
  await pedal(page, 'brake', false);
  await expect.poll(() => city(page, (s) => s.player.lanePosition()?.lane.id ?? 'turn'), SLOW).not.toBe(lane);
  expect(await violation(page)).toBeNull();
  await expect(page.locator('.speedo__clean')).not.toHaveText('🛡 0 м', SLOW);

  // Снова красный — теперь не тормозим: свисток, машина встаёт, вопрос из базы про светофор.
  await approachRed(page);
  await expect.poll(() => violation(page), SLOW).toBe('red-light');
  await expect(page.locator('.sheet.is-open')).toBeVisible(SLOW);
  await expect(page.locator('.sheet__title')).toHaveText('Нарушение: Проезд на красный');
  await expect(page.locator('.violation-intro')).toContainText('Лейтенант Соколов');
  await expect(page.locator('.violation-intro')).toContainText('стоп-линию');
  await expect(page.locator('.pedal--brake')).toBeHidden();
  const id = await answer(page, false);
  expect(RULE_QUESTIONS.redLight).toContain(id);
  await expect(page.getByRole('button', { name: 'Поехали' })).toBeVisible();
  const saved = await readProgress(page);
  expect(saved.questions[id].review).toBeTruthy();
  expect(saved.drive.violations).toBe(1);
  expect(saved.drive.clean).toBe(0);
  expect(saved.drive.best).toBeGreaterThan(0);
  expect(saved.chapters.ch1.drive.violations).toBe(1);
  await expect(page.locator('.speedo__clean')).toHaveText('🛡 0 м');

  // Поговорили — едем дальше.
  await page.getByRole('button', { name: 'Поехали' }).tap();
  await expect(page.locator('.sheet.is-open')).toHaveCount(0);
  expect(await violation(page)).toBeNull();
  await expect.poll(() => speed(page), SLOW).toBeGreaterThan(0);
  await expect(page.locator('.pedal--brake')).toBeVisible();
});

test('газ: быстрее разрешённого на 20 км/ч — превышение и вопрос о скорости; верный ответ — предупреждение', async ({ page }) => {
  await seed(page, progressCh1());
  await openChapter1(page);
  // Длинная городская улица без светофора, перехода и точек впереди; машина уже едет 72 км/ч.
  await city(page, (s) => {
    const busy = new Set([...s.rules.crossings.map((c: Any) => c.road), ...s.rules.noStop.map((z: Any) => z.road)]);
    const l = [...s.graph.lanes.values()].find(
      (x: Any) => x.length > 330 && !busy.has(x.road.id) && !s.rules.signals.includes(x.to.id) && !s.pois.some((p: Any) => p.lane === x) && (x.road.kind ?? 'city') === 'city',
    );
    s.player.placeAt(l, 30);
    s.destination = { lane: l, s: l.length - 10 };
    s.driveTo(s.destination);
    s.player.speed = 180;
  });
  await pedal(page, 'gas', true);
  await expect(page.locator('.rule-hint')).toContainText('отпустите «Газ»', SLOW);
  await expect.poll(() => violation(page), SLOW).toBe('speeding');
  await expect(page.locator('.sheet__title')).toHaveText('Нарушение: Превышение скорости', SLOW);
  await expect(page.locator('.violation-intro')).toContainText('можно 60');
  const id = await answer(page, true);
  expect(RULE_QUESTIONS.speedCity).toContain(id);
  await expect(page.locator('#toast')).toContainText('предупреждение');
  await page.getByRole('button', { name: 'Поехали' }).tap();
  // Педали отпущены, пока открыта карточка: газ не залипает.
  expect(await city(page, (s) => s.player.gas)).toBe(false);
});

test('пешеход на переходе: новичок останавливается и пропускает; опытный проезжает — нарушение', async ({ page }) => {
  await seed(page, progressCh1());
  await openChapter1(page);
  const setUp = (back: number, speed0: number) =>
    city(
      page,
      (s, [b, v]) => {
        const x = s.rules.crossings.find((c: Any) => !c.poi);
        const l = s.graph.laneFor(x.road, x.toward);
        const zs = s.graph.laneDistanceAt(l, x.at);
        s.player.placeAt(l, Math.max(10, zs - b));
        s.destination = { lane: l, s: Math.min(l.length - 10, zs + 90) };
        s.driveTo(s.destination);
        s.player.speed = v;
        s.traffic.crossNow(x.key);
        return x.key as string;
      },
      [back, speed0],
    );
  // Новичок: подсказка, тормоз, ждём, пока пешеход перейдёт.
  const key = await setUp(260, 120);
  await expect(page.locator('.rule-hint')).toContainText('Пешеход на переходе', SLOW);
  await pedal(page, 'brake', true);
  await expect.poll(() => speed(page), SLOW).toBe(0);
  await expect.poll(() => city(page, (s, k) => s.traffic.walkersOn(k).length, key), SLOW).toBe(0);
  await pedal(page, 'brake', false);
  await expect.poll(() => city(page, (s) => s.player.remaining()), SLOW).toBeLessThan(1);
  expect(await violation(page)).toBeNull();

  // Опытный: подсказок нет — и нарушение, если не пропустить.
  await page.getByRole('button', { name: 'Настройки' }).tap();
  await page.getByRole('button', { name: 'Опытный' }).tap();
  await page.getByRole('button', { name: 'Настройки' }).tap();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('pdd-game:settings')))!).difficulty).toBe('expert');
  await setUp(110, 150);
  await expect.poll(() => violation(page), SLOW).toBe('pedestrian');
  await expect(page.locator('.rule-hint')).toBeHidden();
  await expect(page.locator('.sheet__title')).toHaveText('Нарушение: Не пропущен пешеход', SLOW);
  expect(RULE_QUESTIONS.pedestrianCrossing).toContain(await cardQuestion(page));
});

test('остановка в зоне «Остановка запрещена»: подсказка, через 5 секунд — нарушение; второй раз на том же месте — нет', async ({ page }) => {
  await seed(page, progressCh1());
  await openChapter1(page);
  // Коснулись дороги посреди зоны — машина едет туда и встаёт.
  await city(page, (s) => {
    const z = s.rules.noStop[0];
    const l = s.graph.laneFor(z.road, z.toward);
    s.player.placeAt(l, 20);
    s.destination = { lane: l, s: l.length * (z.from + z.to) / 2 };
    s.driveTo(s.destination);
  });
  await expect(page.locator('.rule-hint')).toContainText('Здесь стоять нельзя (знак «Остановка запрещена»)', SLOW);
  await expect.poll(() => violation(page), SLOW).toBe('no-stopping');
  await expect(page.locator('.sheet__title')).toHaveText('Нарушение: Остановка запрещена', SLOW);
  await expect(page.locator('.violation-intro')).toContainText('в зоне знака «Остановка запрещена»');
  expect(RULE_QUESTIONS.stopZone).toContain(await answer(page, true));
  await page.getByRole('button', { name: 'Поехали' }).tap();
  // Машина стоит на том же месте — второго нарушения нет, пока не отъедет.
  await page.waitForTimeout(7000);
  expect(await violation(page)).toBeNull();
  await expect(page.locator('.sheet.is-open')).toHaveCount(0);
});

test('джойстик: разворот через сплошную — новичка сначала предупреждают, потом выезд на встречную', async ({ page, context }) => {
  await seed(page, progressCh1(), { control: 'joystick' });
  await openChapter1(page);
  const heading = await city(page, (s) => {
    const road = s.graph.map.roads.find((r: Any) => r.id === s.rules.solid[0]);
    const l = s.graph.laneFor(road.id, road.to);
    s.player.placeAt(l, l.length / 2);
    return [l.dir.x, l.dir.y] as [number, number];
  });
  const cdp = await context.newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const pullBack = async () => {
    await touch('touchStart', 195, 500);
    for (let i = 1; i <= 6; i++) await touch('touchMove', 195 - heading[0] * i * 9, 500 - heading[1] * i * 9);
    await page.waitForTimeout(400);
  };
  const turning = () => city(page, (s) => !!s.player.current().part.turn?.onRoad);

  await pullBack();
  await expect(page.locator('.rule-hint')).toContainText('Сплошная линия', SLOW);
  expect(await turning()).toBe(false);
  await touch('touchEnd');
  await page.waitForTimeout(300);
  // Ещё раз — разворот, и это выезд на встречную.
  await pullBack();
  await touch('touchEnd');
  await expect.poll(() => violation(page), SLOW).toBe('oncoming');
  await expect(page.locator('.sheet__title')).toHaveText('Нарушение: Выезд на встречную', SLOW);
  expect(RULE_QUESTIONS.oncoming).toContain(await cardQuestion(page));
});

test('«Чистая езда»: глава без нарушений — при доставке +1 звезда и +100 опыта', async ({ page }) => {
  // Все точки главы пройдены, верных 85% — одна звезда за ответы; в районе ездили без нарушений.
  const ids = MAPPING.questions.filter((q) => q.chapter === 'ch1').map((q) => q.id);
  const questions: Record<string, unknown> = {};
  ids.forEach((id, i) => (questions[id] = { n: 1, ok: i < Math.ceil(ids.length * 0.85), ever: true, at: 1 }));
  const points = MAPPING.chapters[0].points.map((p) => p.id);
  await seed(
    page,
    progressCh1({
      questions,
      chapters: { ch1: { points, seen: ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready', 'low'], stars: 0, side: { step: 2, done: 1 }, drive: { violations: 0, distance: 9000 } } },
    }),
  );
  await openChapter1(page);
  await expect(page.locator('.city-task')).toContainText('Вези посылку', SLOW);
  // В задании главы — счётчик и обещанный бонус.
  await page.locator('.city-task').tap();
  await expect(page.locator('.modal')).toContainText('Чистая езда');
  await expect(page.locator('.modal')).toContainText('Без нарушений до доставки — +1 ★ и +100 опыта.');
  await page.getByRole('button', { name: 'Понятно' }).tap();

  await city(page, (s) => {
    s.player.placeAt(s.goal.lane, s.goal.s);
    s.startScene(s.goal);
  });
  const dialog = page.locator('.cutscene:not(.cutscene--modal)');
  await expect(dialog).toBeVisible(SLOW);
  while (await dialog.count()) {
    await dialog.locator('.btn--primary:visible').first().tap();
    await page.waitForTimeout(120);
  }
  const modal = page.locator('.modal');
  await expect(modal.locator('.modal__title')).toHaveText('Глава 1 пройдена!');
  await expect(modal.locator('.rewards__stars')).toHaveText('★★☆');
  await expect(modal.locator('.rewards__clean')).toHaveText('🛡 Чистая езда: без нарушений — +1 ★ и +100 опыта');
  const saved = await readProgress(page);
  expect(saved.chapters.ch1.stars).toBe(2);
  expect(saved.chapters.ch1.drive.star).toBe(true);
});
