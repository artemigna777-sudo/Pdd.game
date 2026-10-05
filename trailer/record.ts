/**
 * Запись настоящих кадров игры для трейлера: телефонный экран 390×844, каждый эпизод — отдельный
 * ролик в `trailer/video/clips/*.mp4`. Игра должна быть запущена (`npx vite --port 5173`), ffmpeg — в PATH.
 *
 *   npx tsx trailer/record.ts            — все эпизоды
 *   npx tsx trailer/record.ts drive exam — только эти
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from '@playwright/test';
import { Screencast } from './screencast.ts';
import { trailerProgress, type SeedOptions } from './seed.ts';
import { encodeDuel, type DuelPayload } from '../src/duel/duel.ts';
import { recordAnswer, type ProgressData } from '../src/progress/progress.ts';

const BASE = process.env.TRAILER_URL ?? 'http://localhost:5173/';
const OUT = new URL('./video/clips/', import.meta.url).pathname;
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const QUESTIONS: { id: string; correct: number; image?: string; options: string[] }[] = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const READY = ['intro', 'race', 'race:bet', 'beat1', 'beat2', 'ready'];

type Any = any;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Выполнить функцию со сценой города. */
const city = <T>(page: Page, fn: (scene: Any, arg: Any) => T, arg?: unknown): Promise<T> =>
  page.evaluate(([f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene('city'), a), [fn.toString(), arg] as const);

async function openChapter(page: Page, n: number, waitCity = true) {
  await page.getByRole('button', { name: new RegExp(`^Глава ${n}`) }).first().tap();
  if (!waitCity) return;
  await page.waitForFunction(() => {
    const g = (window as Any).__game;
    return g?.scene.isActive('city') && (g.scene.getScene('city').pois?.length ?? 0) > 0;
  });
}

/** id вопроса на открытой карточке. */
async function cardQuestion(page: Page): Promise<string> {
  const label = (await page.locator('.sheet.is-open .card').getAttribute('aria-label'))!;
  const [, t, n] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  return `B${t.padStart(2, '0')}-Q${n.padStart(2, '0')}`;
}

async function answer(page: Page, right: boolean) {
  const id = await cardQuestion(page);
  const options = page.locator('.sheet.is-open .option');
  const c = CORRECT.get(id)!;
  await options.nth(right ? c : (c + 1) % (await options.count())).tap();
}

/** Подъехать к точке издалека: машина за `back` px до точки, дальше едет сама. */
function approachPoi(page: Page, template: string, back: number, skip = 0): Promise<string> {
  return city(
    page,
    (s, [t, b, k]) => {
      const done = new Set(s.visited ?? []);
      const stops = [...s.pois, ...(s.stops ?? [])];
      // Точка, перед которой на этой улице нет других точек: машина доедет именно до неё.
      const clear = (p: Any) => !stops.some((q: Any) => q !== p && q.lane === p.lane && q.s < p.s + 1 && q.s > p.s - b - 40);
      const list = s.pois.filter((p: Any) => p.point.template === t && p.s > b && clear(p) && !done.has(p.point.id) && s.poiState(p) !== 'done');
      const poi = list[k] ?? list[0];
      poi.queue.length = 1;
      s.player.placeAt(poi.lane, poi.s - b);
      s.destination = { lane: poi.lane, s: poi.s };
      s.driveTo(s.destination);
      return poi.point.id as string;
    },
    [template, back, skip],
  );
}

interface Clip {
  seed?: SeedOptions;
  settings?: Record<string, unknown>;
  /** Поправить прогресс перед записью (обычными функциями игры). */
  prepare?(data: ProgressData): void;
  /** Другие данные в хранилище (например, история дуэлей). */
  storage?: () => Record<string, unknown>;
  /** Спрятать в кадре лишнее (например, сообщение о новом знаке поверх итога дуэли). */
  css?: string;
  run(page: Page, rec: Screencast): Promise<void>;
}

/** Выполнить функцию с любой сценой Phaser. */
const sceneCall = <T>(page: Page, key: string, fn: (scene: Any, arg: Any) => T, arg?: unknown): Promise<T> =>
  page.evaluate(([k, f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene(k), a), [key, fn.toString(), arg] as const);

/** Вопрос в открытой карточке (в карточке экзамена или внизу экрана). */
async function answerCard(page: Page, scope: string, right: boolean) {
  const label = (await page.locator(`${scope} .card`).first().getAttribute('aria-label'))!;
  const [, t, n] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  const c = CORRECT.get(`B${t.padStart(2, '0')}-Q${n.padStart(2, '0')}`)!;
  const options = page.locator(`${scope} .option`);
  await options.nth(right ? c : (c + 1) % (await options.count())).tap();
}

const CLIPS: Record<string, Clip> = {
  /** Главное меню: машина курьера, уровень, готовность, цель дня и серия. */
  menu: {
    async run(_page, rec) {
      await wait(1200);
      await rec.start();
      await wait(4000);
    },
  },

  /** Езда по району: поток машин и пешеходов, спидометр, педали. */
  drive: {
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1500);
      await city(page, (s) => {
        const signals = new Set(s.rules.signals);
        const ruled = new Set([...s.rules.crossings.map((c: Any) => c.road), ...s.rules.noStop.map((z: Any) => z.road), ...s.rules.solid]);
        const stops = new Set([...s.pois, ...(s.stops ?? [])].map((p: Any) => p.lane.id));
        const ok = (l: Any) => !stops.has(l.id) && !ruled.has(l.road.id);
        // Самый длинный путь до трёх улиц без точек, светофоров и переходов.
        let best: Any[] = [];
        let bestLen = 0;
        const start = [...s.graph.lanes.values()].filter((l: Any) => ok(l) && l.length > 300 && !signals.has(l.to.id));
        for (const l0 of start) {
          const walk = (path: Any[], len: number) => {
            if (len > bestLen) {
              best = path;
              bestLen = len;
            }
            if (path.length === 3) return;
            const last = path[path.length - 1];
            if (signals.has(last.to.id)) return;
            for (const nx of s.graph.exits(last)) if (ok(nx) && nx.road.id !== last.road.id && !path.includes(nx)) walk([...path, nx], len + nx.length);
          };
          walk([l0], l0.length);
        }
        const first = best[0];
        const last = best[best.length - 1];
        s.player.placeAt(first, 30);
        s.destination = { lane: last, s: last.length * 0.7 };
      });
      await wait(1800);
      await rec.start();
      await wait(600);
      await city(page, (s) => s.driveTo(s.destination));
      await wait(6500);
    },
  },

  /** Вопрос на регулируемом перекрёстке: подъезд, сцена оживает, карточка, верный ответ, проезд. */
  question: {
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1200);
      await rec.start();
      await approachPoi(page, 'signalized', 260, 1);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(2600);
      await answer(page, true);
      const go = page.locator('.sheet__foot:not([hidden]) .btn');
      await go.waitFor();
      await wait(1800);
      await go.tap();
      await wait(3500);
    },
  },

  /** Ошибка: последствие в сцене, потом пояснение и правильный ответ. */
  wrong: {
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1200);
      await approachPoi(page, 'uncontrolled-priority', 120);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(800);
      await rec.start();
      await wait(1600);
      await answer(page, false);
      await page.locator('.sheet__foot:not([hidden]) .btn').waitFor({ timeout: 30_000 });
      await wait(1500);
      // Прокрутить к пояснению «Почему так».
      await page.evaluate(() => document.querySelector('.sheet.is-open .sheet__body')?.scrollBy({ top: 600, behavior: 'smooth' }));
      await wait(2600);
    },
  },

  /** Проезд на красный: свисток, лейтенант Соколов и вопрос о светофоре. */
  sokolov: {
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1200);
      const lane = await city(page, (s) => {
        const l = [...s.graph.lanes.values()].find((x: Any) => s.rules.signals.includes(x.to.id) && x.length > 330 && !s.pois.some((p: Any) => p.lane === x));
        return l.id as string;
      });
      await page.waitForFunction(
        (id) => {
          const sig = (window as Any).__game.scene.getScene('city').signalByLane.get(id);
          return sig.state.get(id) === 'red' && sig.t % 8 < 0.6;
        },
        lane,
        { timeout: 60_000 },
      );
      await city(
        page,
        (s, id) => {
          const l = s.graph.lane(id);
          s.player.placeAt(l, l.length - 300);
          const out = s.graph.exits(l).sort((a: Any, b: Any) => b.dir.x * l.dir.x + b.dir.y * l.dir.y - (a.dir.x * l.dir.x + a.dir.y * l.dir.y))[0];
          s.destination = { lane: out, s: 80 };
          s.driveTo(s.destination);
        },
        lane,
      );
      await rec.start();
      await page.locator('.sheet.is-open .violation-intro').waitFor({ timeout: 30_000 });
      await wait(3800);
    },
  },

  /** Сюжет посреди главы: сцена с героями и поручение с выбором ответа. */
  story: {
    seed: { points: 9 },
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1200);
      // Пройти ещё одну точку — это треть главы, начинается сюжетная сцена.
      await approachPoi(page, 'street', 60);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await answer(page, true);
      const go = page.locator('.sheet__foot:not([hidden]) .btn');
      await go.waitFor();
      await go.tap();
      const dialog = page.locator('.cutscene');
      await dialog.waitFor({ timeout: 30_000 });
      await wait(300);
      await rec.start();
      for (let i = 0; i < 14; i++) {
        await wait(1900);
        const help = page.getByRole('button', { name: 'Помогу!' });
        if (await help.isVisible()) {
          await wait(600);
          await help.tap();
          await wait(2400);
          break;
        }
        if (!(await dialog.count())) break;
        await dialog.locator('.btn--primary').first().tap();
      }
    },
  },

  /** Мини-игра «Аптечка»: место ДТП, касание, вопрос по первой помощи. */
  firstaid: {
    seed: { current: 'ch6', points: 4 },
    async run(page, rec) {
      await openChapter(page, 6);
      await wait(1200);
      await rec.start();
      await city(page, (s) => {
        const poi = s.pois.find((p: Any) => p.point.template === 'first-aid' && p.queue.length > 1);
        s.player.placeAt(poi.lane, poi.s - 200);
        s.destination = { lane: poi.lane, s: poi.s };
        s.driveTo(s.destination);
      });
      // Коснуться отмеченного места в мини-игре.
      for (let i = 0; i < 60; i++) {
        const target = await page.evaluate(() => {
          const g = (window as Any).__game;
          if (!g.scene.isActive('interior')) return null;
          const s = g.scene.getScene('interior');
          if (!s.target) return null;
          const cam = s.cameras.main;
          const k = cam.zoom / Math.min(window.devicePixelRatio || 1, 2);
          return [(s.target.x - cam.worldView.x) * k, (s.target.y - cam.worldView.y) * k];
        });
        if (target) {
          await wait(1400);
          await page.touchscreen.tap(target[0], target[1]);
          break;
        }
        await wait(200);
      }
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(2200);
      await answer(page, true);
      await wait(2000);
    },
  },

  /** Экзамен как в ГИБДД: 20 вопросов, 20 минут. */
  exam: {
    async run(page, rec) {
      await wait(800);
      await page.getByRole('button', { name: /Экзамен/ }).first().tap();
      await page.getByRole('button', { name: 'Начать экзамен' }).waitFor();
      await rec.start();
      await wait(1500);
      await page.getByRole('button', { name: 'Начать экзамен' }).tap();
      for (let i = 0; i < 2; i++) {
        await page.locator('.option').first().waitFor();
        await wait(1600);
        const label = (await page.locator('.card').getAttribute('aria-label'))!;
        const [, t, n] = label.match(/Билет (\d+), вопрос (\d+)/)!;
        await page.locator('.option').nth(CORRECT.get(`B${t.padStart(2, '0')}-Q${n.padStart(2, '0')}`)!).tap();
        await wait(600);
        await page.getByRole('button', { name: 'Ответить' }).tap();
      }
      await wait(1500);
    },
  },

  /** Доставка посылки: финал главы, звёзды, гонка с Артёмом, «Чистая езда». */
  rewards: {
    seed: { points: 99, seen: READY },
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1500);
      await city(page, (s) => {
        s.player.placeAt(s.goal.lane, Math.max(0, s.goal.s - 150));
        s.destination = { lane: s.goal.lane, s: s.goal.s };
        s.driveTo(s.destination);
      });
      await rec.start();
      const dialog = page.locator('.cutscene:not(.cutscene--modal)');
      await dialog.waitFor({ timeout: 30_000 });
      while (await dialog.count()) {
        await wait(1300);
        if (await dialog.count()) await dialog.locator('.btn--primary').first().tap().catch(() => {});
      }
      await page.locator('.modal').waitFor();
      await wait(2200);
      await page.evaluate(() => document.querySelector('.modal')?.scrollBy({ top: 400, behavior: 'smooth' }));
      await wait(2200);
    },
  },

  /** Прогресс: готовность к экзамену, темы, «Чистая езда» (игрок уже прошёл восемь глав). */
  progress: {
    seed: { current: 'ch9', points: 4 },
    async run(page, rec) {
      await wait(800);
      await page.getByRole('button', { name: 'Прогресс', exact: true }).tap();
      await wait(800);
      await rec.start();
      await wait(3800);
      await page.evaluate(() => document.querySelector('.screen__body')?.scrollBy({ top: 520, behavior: 'smooth' }));
      await wait(1600);
    },
  },

  /** Карта района: все точки главы. */
  map: {
    async run(page, rec) {
      await openChapter(page, 3);
      await wait(1500);
      await rec.start();
      await wait(500);
      await page.locator('.topbar').getByRole('button', { name: /Карта/ }).tap();
      await wait(3200);
    },
  },

  // ─── Новые режимы (этапы 10–13): промо-ролик ───

  /** Меню → «Режимы»: четыре карточки. */
  modes: {
    async run(page, rec) {
      await wait(1000);
      await rec.start();
      await wait(900);
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await wait(2600);
    },
  },

  /** Дуэль: три вопроса на скорость, потом итог с QR-кодом для друга. */
  duel: {
    settings: { name: 'Саша' },
    css: '#sign-chip { display: none !important; }',
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await page.locator('.mode-card', { hasText: 'Дуэль' }).tap();
      await page.getByRole('button', { name: 'Новая дуэль' }).waitFor();
      await wait(600);
      await rec.start();
      await wait(900);
      await page.getByRole('button', { name: 'Новая дуэль' }).tap();
      for (let i = 0; i < 10; i++) {
        await page.locator('.quiz .card').waitFor();
        if (i === 3) await rec.pause();
        // Вопросы, которые не попадут в ролик, — в обычном темпе: время дуэли правдоподобное.
        await wait(i < 3 ? 900 : 5200);
        await answerCard(page, '.quiz', i !== 6);
        await wait(i < 3 ? 350 : 300);
        await page.getByRole('button', { name: /^Ответить/ }).tap();
      }
      await page.locator('.duel-share').waitFor();
      await wait(300);
      await rec.resume();
      await wait(1600);
      await page.evaluate(() => document.querySelector('.screen__body')?.scrollBy({ top: 330, behavior: 'smooth' }));
      await wait(2200);
    },
  },

  /** Друг ответил: ссылка с итогом — победа и кто как ответил. */
  'duel-win': {
    settings: { name: 'Саша' },
    storage: () => ({ 'pdd-game:duels': [{ id: DUEL.id, at: DUEL.at, updated: DUEL.at, role: 'from', q: DUEL.q, me: DUEL.from }] }),
    async run(page, rec) {
      await wait(800);
      await rec.start();
      await wait(400);
      await page.goto(`${BASE}#duel=${encodeDuel(DUEL)}`);
      await page.locator('.duel-result').waitFor();
      await wait(2600);
      await page.evaluate(() => document.querySelector('.screen__body')?.scrollBy({ top: 420, behavior: 'smooth' }));
      await wait(1800);
    },
  },

  /** Знакодекс: альбом, карточка знака, награда за собранную группу. */
  signs: {
    prepare(data) {
      // Знаки приоритета собраны: награда ждёт.
      for (const id of PRIORITY_QUESTIONS) recordAnswer(data, id, true, Date.now() - 3 * 86_400_000);
    },
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await page.locator('.mode-card', { hasText: 'Знакодекс' }).tap();
      await page.locator('.signs-grid').first().waitFor();
      await wait(900);
      await rec.start();
      await wait(1500);
      await page.locator('.signs-group').first().locator('.sign-tile:not(.is-locked)').first().tap();
      await wait(2300);
      await page.locator('.modal').getByRole('button', { name: 'Закрыть' }).tap();
      await page.locator('.signs-group', { hasText: 'Знаки приоритета' }).scrollIntoViewIfNeeded();
      await page.evaluate(() => document.querySelector('.screen__body')?.scrollBy({ top: -40 }));
      await wait(1300);
      await page.locator('.signs-group', { hasText: 'Знаки приоритета' }).getByRole('button', { name: /Забрать награду/ }).tap();
      await wait(2200);
    },
  },

  /** Пост ДПС: перекрёсток, радар, нарушитель пойман, вопрос по правилу. */
  patrol: {
    prepare(data) {
      data.modes = { patrol: { best: 650, shifts: 3 } };
    },
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await page.locator('.mode-card', { hasText: 'Соколова' }).tap();
      await page.locator('.district-btn').nth(2).tap();
      await page.waitForFunction(() => (window as Any).__game?.scene.isActive('patrol'));
      await wait(2500);
      await rec.start();
      await wait(3000);
      await rec.pause();
      let target: { x: number; y: number } | undefined;
      for (let i = 0; i < 240 && !target; i++) {
        target = await sceneCall(page, 'patrol', (s) => s.debugTargets('no-stopping').violator);
        if (!target) await wait(250);
      }
      await wait(1500);
      target = await sceneCall(page, 'patrol', (s) => s.debugTargets('no-stopping').violator);
      await rec.resume();
      await wait(1300);
      await page.touchscreen.tap(target!.x, target!.y);
      await page.locator('.sheet.is-open .option').first().waitFor();
      await wait(2600);
      await answerCard(page, '.sheet.is-open', true);
      await wait(1700);
      await page.getByRole('button', { name: 'На пост' }).tap();
      await wait(1500);
    },
  },

  /** Смена курьера: стрелка к флажку, карта, адрес, вопрос у двери, очки и серия. */
  courier: {
    prepare(data) {
      data.modes = { courier: [{ score: 2400, deliveries: 9, correct: 8, answers: 9, chapter: 'ch2', at: Date.now() - 86_400_000 }] };
    },
    settings: { rules: false },
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await page.locator('.mode-card', { hasText: 'Смена курьера' }).tap();
      await page.locator('.district-btn').nth(1).tap();
      await page.waitForFunction(() => !!(window as Any).__game?.scene.getScene('city').debugGoal?.());
      await wait(1200);
      await rec.start();
      await wait(1600);
      await page.getByRole('button', { name: 'Карта района' }).tap();
      await wait(1700);
      await page.getByRole('button', { name: 'К адресу' }).tap();
      await wait(2800);
      await rec.pause();
      for (let i = 0; i < 4 && !(await page.locator('.sheet.is-open').count()); i++) {
        await page.getByRole('button', { name: 'К адресу' }).tap().catch(() => {});
        await page.locator('.sheet.is-open .option').first().waitFor({ timeout: 40_000 }).catch(() => {});
      }
      await rec.resume();
      await wait(2200);
      await answerCard(page, '.sheet.is-open', true);
      await wait(2400);
    },
  },
};

/** Дуэль для записи: вызов Саши и ответ Артёма на 10 вопросов с картинками. */
const DUEL: DuelPayload = (() => {
  const q = QUESTIONS.filter((x) => x.image && x.options.length >= 3).slice(40, 50).map((x) => x.id);
  const right = (n: number) => q.map((id, i) => (i < n ? CORRECT.get(id)! : (CORRECT.get(id)! + 1) % 3));
  return { id: 'promo001', at: Date.now() - 3_600_000, q, from: { name: 'Саша', answers: right(9), ms: 102_000 }, to: { name: 'Артём', answers: right(7), ms: 125_000 } };
})();

/** Вопросы со знаками приоритета (2.x) — из разметки сцен. */
const PRIORITY_QUESTIONS: string[] = (() => {
  const signs: { group: string; questions: string[] }[] = JSON.parse(readFileSync(new URL('../data/signs.json', import.meta.url), 'utf8')).signs;
  return [...new Set(signs.filter((x) => x.group === 'priority').flatMap((x) => x.questions))];
})();

async function record(browser: Browser, name: string, clip: Clip) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true, locale: 'ru-RU' });
  const page = await context.newPage();
  const progress = trailerProgress(clip.seed);
  clip.prepare?.(progress);
  const storage = clip.storage?.() ?? {};
  // tsx (esbuild) оборачивает вложенные функции в __name(): в странице её нет.
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript(
    ([p, s, extra]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, sound: false, vibration: false, ...s }));
      localStorage.setItem('pdd-game:progress', JSON.stringify(p));
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, JSON.stringify(v));
      sessionStorage.setItem('seeded', '1');
    },
    [progress, clip.settings ?? {}, storage] as const,
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.locator('.menu').first().waitFor();
  if (clip.css) await page.addStyleTag({ content: clip.css });
  const rec = new Screencast(page);
  await clip.run(page, rec);
  const seconds = await rec.stop();
  const info = rec.save(`${OUT}${name}.mp4`, FFMPEG, `${OUT}.frames-${name}`);
  console.log(`${name}: ${seconds.toFixed(1)} с, ${info.frames} кадров (${(info.frames / seconds).toFixed(0)} в секунду)${errors.length ? `, ошибки: ${errors.join('; ')}` : ''}`);
  await context.close();
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const browser = await chromium.launch();
try {
  for (const [name, clip] of Object.entries(CLIPS)) {
    if (only.length && !only.includes(name)) continue;
    await record(browser, name, clip);
  }
} finally {
  await browser.close();
}
