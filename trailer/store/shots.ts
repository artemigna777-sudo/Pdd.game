/**
 * Кадры игры для страницы в RuStore: телефон (390×780, плотность 3) и планшет (800×1280, плотность 2).
 * Игра должна быть запущена (`npx vite --port 5173`). Кадры — в `<папка>/raw/{phone,tablet}/*.png`,
 * подписи и рамки добавляет `trailer/store/frame.ts`.
 *
 *   npx tsx trailer/store/shots.ts <папка> [phone|tablet] [кадр …]
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { trailerProgress, type SeedOptions } from '../seed.ts';
import type { ProgressData } from '../../src/progress/progress.ts';

const OUT = process.argv[2];
const DEVICE = (process.argv[3] ?? 'phone') as 'phone' | 'tablet';
const ONLY = process.argv.slice(4);
const BASE = process.env.STORE_URL ?? 'http://localhost:5173/';
const QUESTIONS: { id: string; correct: number }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const MAPPING: { chapters: { id: string; points: { id: string }[] }[] } = JSON.parse(readFileSync('data/mapping.json', 'utf8'));
type Any = any;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const city = <T>(page: Page, fn: (scene: Any, arg: Any) => T, arg?: unknown): Promise<T> =>
  page.evaluate(([f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene('city'), a), [fn.toString(), arg] as const);

async function openChapter(page: Page, n: number) {
  await page.getByRole('button', { name: new RegExp(`^Глава ${n}`) }).first().tap();
  await page.waitForFunction(() => {
    const g = (window as Any).__game;
    return g?.scene.isActive('city') && (g.scene.getScene('city').pois?.length ?? 0) > 0;
  });
}
async function answer(page: Page, right: boolean) {
  const label = (await page.locator('.sheet.is-open .card').getAttribute('aria-label'))!;
  const [, t, n] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const c = CORRECT.get(`B${t.padStart(2, '0')}-Q${n.padStart(2, '0')}`)!;
  const options = page.locator('.sheet.is-open .option');
  await options.nth(right ? c : (c + 1) % (await options.count())).tap();
}
/** Подъехать к ближайшей непройденной точке шаблона: машина за `back` px, дальше едет сама. */
function approachPoi(page: Page, template: string | string[], back: number, skip = 0) {
  return city(page, (s, [ts, b, k]) => {
    const stops = [...s.pois, ...(s.stops ?? [])];
    const clear = (p: Any) => !stops.some((q: Any) => q !== p && q.lane === p.lane && q.s < p.s + 1 && q.s > p.s - b - 40);
    const open = ([] as string[]).concat(ts).flatMap((t) => s.pois.filter((p: Any) => p.point.template === t && p.s > b && s.poiState(p) !== 'done'));
    const list = open.some(clear) ? open.filter(clear) : open;
    const poi = list[k] ?? list[0];
    if (!poi) throw new Error('нет точки: ' + JSON.stringify(s.pois.map((p: Any) => [p.point.template, Math.round(p.s), s.poiState(p)])));
    poi.queue.length = 1;
    s.player.placeAt(poi.lane, poi.s - b);
    s.destination = { lane: poi.lane, s: poi.s };
    s.driveTo(s.destination);
  }, [template, back, skip]);
}

const passed = (id: string) => ({ points: MAPPING.chapters.find((c) => c.id === id)!.points.map((p) => p.id), seen: ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready'], stars: 3, delivered: 1, side: { step: 2, done: 1 } });

interface Shot {
  seed?: SeedOptions;
  /** Своё сохранение вместо прогресса из `seed`. */
  raw?: () => unknown;
  prepare?(data: ProgressData): void;
  run(page: Page): Promise<void>;
}

/** Глава 3 на две трети: сюжетные сцены середины главы уже показаны, поручение выполнено. */
const MID: Pick<Shot, 'seed' | 'prepare'> = {
  seed: { points: 20, seen: ['intro', 'race', 'race:bet', 'beat1'] },
  prepare(data) {
    data.chapters.ch3.side = { step: 2, done: 1 };
  },
};

const SHOTS: Record<string, Shot> = {
  question: {
    ...MID,
    async run(page) {
      await openChapter(page, 3);
      await wait(1200);
      await approachPoi(page, 'signalized', 260);
      await page.locator('.sheet.is-open .option').first().waitFor({ timeout: 90_000 });
      await wait(2600);
    },
  },
  wrong: {
    ...MID,
    async run(page) {
      await openChapter(page, 3);
      await wait(1200);
      await approachPoi(page, ['uncontrolled-priority', 'uncontrolled-equal', 'signalized'], 200, 1);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(800);
      await answer(page, false);
      await page.locator('.sheet__foot:not([hidden]) .btn').waitFor({ timeout: 30_000 });
      await wait(1200);
      await page.evaluate(() => {
        const body = document.querySelector('.sheet.is-open .sheet__body')!;
        const fb = body.querySelector('.feedback') as HTMLElement | null;
        if (!fb) return;
        // Отметка «Неверно» сразу под заголовком карточки, ниже — «Почему так».
        body.scrollTop += fb.getBoundingClientRect().top - body.getBoundingClientRect().top - 70;
      });
      await wait(600);
    },
  },
  story: {
    raw: () => {
      const ch3 = MAPPING.chapters.find((c) => c.id === 'ch3')!.points.map((p) => p.id);
      return {
        xp: 900,
        questions: {},
        chapters: { ch1: passed('ch1'), ch2: passed('ch2'), ch3: { points: ch3.slice(0, Math.ceil((ch3.length * 2) / 3)), seen: ['intro', 'race', 'beat1'], stars: 0, side: { step: 2, done: 1 } } },
        story: { choices: [{ id: 'ch1.card', value: 'keep', at: 1 }, { id: 'ch2.cover', value: 'cover', at: 2 }], endings: {}, rewinds: 0 },
        finale: { control: [], seen: [] },
      };
    },
    async run(page) {
      await page.getByRole('button', { name: /^Глава 3/ }).first().tap();
      const dialog = page.locator('.cutscene:not(.cutscene--modal)');
      await dialog.waitFor({ timeout: 60_000 });
      const screen = dialog.locator('.cutscene__film');
      for (let i = 0; i < 40; i++) {
        if ((await screen.getAttribute('data-film').catch(() => null)) === 'ch3-choice') break;
        await dialog.getByRole('button', { name: 'Далее' }).tap();
        await wait(250);
      }
      await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.cutscene__film img')].every((i) => i.complete && i.naturalWidth > 0));
      await wait(2600);
    },
  },
  exam: {
    async run(page) {
      await page.getByRole('button', { name: /Экзамен/ }).first().tap();
      await page.getByRole('button', { name: 'Начать экзамен' }).tap();
      // Вопрос с картинкой: пропускаем вопросы без неё.
      for (let i = 0; i < 6; i++) {
        await page.locator('.option').first().waitFor();
        await wait(400);
        if (await page.locator('.card img').count()) break;
        await page.getByRole('button', { name: 'Пропустить вопрос' }).tap();
      }
      await wait(800);
      await page.locator('.option').nth(1).tap();
      await wait(600);
    },
  },
  situations: {
    async run(page) {
      await page.getByRole('button', { name: /Режимы/ }).first().tap();
      await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
      await page.locator('[data-stage="calm"]').tap();
      const card = page.locator('.sit-card');
      await card.locator('.sit-scene svg').waitFor();
      await card.getByRole('button', { name: /показать варианты/ }).tap({ timeout: 4000 }).catch(() => {});
      await card.locator('.sit-options').waitFor();
      await wait(2200);
    },
  },
  neon: {
    seed: MID.seed,
    prepare(data) {
      MID.prepare!(data);
      data.garage.owned.push('theme:neon');
      data.garage.theme = 'neon';
    },
    async run(page) {
      await openChapter(page, 3);
      await wait(1200);
      await approachPoi(page, 'signalized', 260, 1);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(2600);
    },
  },
  progress: {
    seed: { current: 'ch9', points: 4 },
    async run(page) {
      await page.getByRole('button', { name: 'Прогресс', exact: true }).tap();
      await wait(1500);
    },
  },
  signs: {
    seed: { current: 'ch9', points: 4 },
    async run(page) {
      await page.getByRole('button', { name: /Режимы/ }).first().tap();
      await page.locator('.mode-card', { hasText: 'Знакодекс' }).tap();
      await page.locator('.signs-head').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.sign-tile img')].slice(0, 30).every((i) => i.complete));
      await wait(1200);
    },
  },
  modes: {
    async run(page) {
      await page.getByRole('button', { name: /Режимы/ }).first().tap();
      await wait(1500);
    },
  },
  menu: {
    async run() {
      await wait(1800);
    },
  },
};

const VIEW = DEVICE === 'tablet' ? { width: 800, height: 1280, scale: 2 } : { width: 390, height: 780, scale: 3 };
mkdirSync(`${OUT}/raw/${DEVICE}`, { recursive: true });
const browser = await chromium.launch();
for (const [name, shot] of Object.entries(SHOTS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.scale, hasTouch: true, isMobile: true, locale: 'ru-RU' });
  const page = await ctx.newPage();
  let progress: unknown;
  if (shot.raw) progress = shot.raw();
  else {
    const p = trailerProgress(shot.seed);
    shot.prepare?.(p);
    progress = p;
  }
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript(([p]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, sound: false, vibration: false, installTip: false, stats: false, holidays: false, rules: false }));
    localStorage.setItem('pdd-game:progress', JSON.stringify(p));
    sessionStorage.setItem('seeded', '1');
  }, [progress] as const);
  await page.goto(BASE);
  await page.locator('.menu').first().waitFor();
  await page.addStyleTag({ content: '.toast,#sign-chip,.install-tip{display:none!important}' });
  try {
    await shot.run(page).catch(async (e) => { await page.screenshot({ path: `${OUT}/raw/${DEVICE}/${name}-fail.png` }); throw e; });
    await page.screenshot({ path: `${OUT}/raw/${DEVICE}/${name}.png` });
    console.log('ok', DEVICE, name);
  } catch (e) {
    console.log('FAIL', DEVICE, name, String(e).slice(0, 400));
  }
  await ctx.close();
}
await browser.close();
