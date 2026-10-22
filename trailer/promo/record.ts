/**
 * Записи игры для ролика RuStore: покадрово (`frames.ts`), в пикселях экрана 2× — телефон 780×1688,
 * фон 1080×1920 и 1920×1080. Игра должна быть запущена (`npx vite --port 5173`).
 *
 *   npx tsx trailer/promo/record.ts            — все записи в trailer/promo/video/clips/
 *   npx tsx trailer/promo/record.ts film exam  — только эти
 */
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { FrameRecorder } from './frames.ts';
import { trailerProgress, type SeedOptions } from '../seed.ts';
import { encodeDuel, type DuelPayload } from '../../src/duel/duel.ts';
import { recordAnswer, type ProgressData } from '../../src/progress/progress.ts';

const BASE = process.env.TRAILER_URL ?? 'http://localhost:5173/';
const OUT = new URL('./video/clips/', import.meta.url).pathname;
const SCALE = 2;
type Any = any;

const QUESTIONS: { id: string; correct: number; image?: string; options: string[] }[] = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url), 'utf8'));
const CORRECT = new Map(QUESTIONS.map((q) => [q.id, q.correct]));
const SITUATIONS: { id: string; correct: number }[] = readdirSync(new URL('../../data/situations/', import.meta.url))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(new URL(`../../data/situations/${f}`, import.meta.url), 'utf8')));
const MAPPING: { chapters: { id: string; points: { id: string }[] }[] } = JSON.parse(readFileSync(new URL('../../data/mapping.json', import.meta.url), 'utf8'));
const SIGNS: { group: string; questions: string[] }[] = JSON.parse(readFileSync(new URL('../../data/signs.json', import.meta.url), 'utf8')).signs;

const city = <T>(page: Page, fn: (scene: Any, arg: Any) => T, arg?: unknown): Promise<T> =>
  page.evaluate(([f, a]) => new Function('scene', 'arg', `return (${f})(scene, arg)`)((window as Any).__game.scene.getScene('city'), a), [fn.toString(), arg] as const);
const visible = (page: Page, sel: string) => () => page.locator(sel).first().isVisible();
const cityReady = (page: Page) => () =>
  page.evaluate(() => {
    const g = (window as Any).__game;
    return !!g?.scene.isActive('city') && (g.scene.getScene('city').pois?.length ?? 0) > 0;
  });

/** id вопроса в карточке. */
async function cardId(page: Page, scope: string): Promise<string> {
  const label = (await page.locator(`${scope} .card`).first().getAttribute('aria-label'))!;
  const [, t, n] = label.match(/Билет (\d+), вопрос (\d+)/)!;
  return `B${t.padStart(2, '0')}-Q${n.padStart(2, '0')}`;
}
async function answer(page: Page, scope: string, right: boolean) {
  const c = CORRECT.get(await cardId(page, scope))!;
  const options = page.locator(`${scope} .option`);
  await options.nth(right ? c : (c + 1) % (await options.count())).tap();
}

/** Подъехать к непройденной точке шаблона: машина за `back` px, дальше едет сама. */
function approachPoi(page: Page, templates: string[], back: number, skip = 0) {
  return city(page, (s, [ts, b, k]) => {
    const stops = [...s.pois, ...(s.stops ?? [])];
    const clear = (p: Any) => !stops.some((q: Any) => q !== p && q.lane === p.lane && q.s < p.s + 1 && q.s > p.s - b - 40);
    const open = ts.flatMap((t: string) => s.pois.filter((p: Any) => p.point.template === t && p.s > b && s.poiState(p) !== 'done'));
    const list = open.some(clear) ? open.filter(clear) : open;
    const poi = list[k] ?? list[0];
    poi.queue.length = 1;
    s.player.placeAt(poi.lane, poi.s - b);
    s.destination = { lane: poi.lane, s: poi.s };
    s.driveTo(s.destination);
  }, [templates, back, skip]);
}

/** Доехал — новая далёкая цель: машина всё время в пути. `zoom` — камера ближе, отметки точек скрыты. */
function cruiser(page: Page, seed: number, zoom = 0) {
  let n = seed;
  let frame = 0;
  return async () => {
    if (frame++ % 6) return;
    await city(
      page,
      (s, [k, z]) => {
        // Камера ближе и без отметок точек: после обновления сцены, до отрисовки — каждый кадр.
        if (z && !s.__beauty) {
          s.__beauty = true;
          s.events.on('postupdate', () => {
            s.cameras.main.setZoom(z);
            for (const p of s.pois) p.marker.setVisible(false);
          });
        }
        if (!s.player.arrived && s.destination) return;
        const p = s.player.position;
        const lanes = [...s.graph.lanes.values()].filter((l: Any) => l.length > 260);
        const far = lanes
          .map((l: Any) => ({ l, d: Math.hypot((l.start.x + l.end.x) / 2 - p.x, (l.start.y + l.end.y) / 2 - p.y) }))
          .filter((x: Any) => x.d > 700 && x.d < 1600)
          .sort((a: Any, b: Any) => a.d - b.d);
        const pick = far[(k * 7) % Math.max(1, far.length)] ?? { l: lanes[k % lanes.length] };
        s.destination = { lane: pick.l, s: pick.l.length * 0.6 };
        s.driveTo(s.destination);
      },
      [n++, zoom],
    );
  };
}

const passed = (id: string) => ({ points: MAPPING.chapters.find((c) => c.id === id)!.points.map((p) => p.id), seen: ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready'], stars: 3, delivered: 1, side: { step: 2, done: 1 } });

/** Пройденная глава без флажка доставки: все точки пройдены, машина их проезжает. */
async function openPassed(page: Page, rec: FrameRecorder, index: number) {
  await page.getByRole('button', { name: 'Главы', exact: true }).tap();
  await rec.until(visible(page, '.chapter-card'));
  await page.locator('.chapter-card').nth(index).tap();
  await rec.until(cityReady(page));
}
async function openChapter(page: Page, rec: FrameRecorder, n: number) {
  await page.getByRole('button', { name: new RegExp(`^Глава ${n}`) }).first().tap();
  await rec.until(cityReady(page));
}
/** Плавно прокрутить экран за `ms` (с записью). */
async function scroll(page: Page, rec: FrameRecorder, sel: string, by: number, ms: number) {
  const n = Math.round(ms / (1000 / 30));
  let k = 0;
  await rec.record(ms, async () => {
    k++;
    const e = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, t)) / 2;
    await page.evaluate(([s, d]) => document.querySelector(s)?.scrollBy({ top: d }), [sel, by * (e(k / n) - e((k - 1) / n))] as const);
  });
}

const NO_UI = '#ui { display: none !important; }';
const MID: SeedOptions = { points: 20, seen: ['intro', 'race', 'race:bet', 'beat1'] };
const midPrepare = (data: ProgressData) => {
  data.chapters.ch3.side = { step: 2, done: 1 };
};
const PRIORITY = [...new Set(SIGNS.filter((x) => x.group === 'priority').flatMap((x) => x.questions))];

interface Clip {
  viewport?: { width: number; height: number };
  seed?: SeedOptions;
  raw?: () => unknown;
  prepare?(data: ProgressData): void;
  settings?: Record<string, unknown>;
  storage?: () => Record<string, unknown>;
  run(page: Page, rec: FrameRecorder): Promise<void>;
}

const DUEL: DuelPayload = (() => {
  const q = QUESTIONS.filter((x) => x.image && x.options.length >= 3).slice(40, 50).map((x) => x.id);
  const right = (n: number) => q.map((id, i) => (i < n ? CORRECT.get(id)! : (CORRECT.get(id)! + 1) % 3));
  return { id: 'promo002', at: Date.now() - 3_600_000, q, from: { name: 'Саша', answers: right(9), ms: 102_000 }, to: { name: 'Артём', answers: right(7), ms: 125_000 } };
})();

const CLIPS: Record<string, Clip> = {
  /** Город сверху без интерфейса — фон ролика. */
  'city-tall': {
    viewport: { width: 540, height: 960 },
    seed: { current: 'ch4', points: 0, seen: [], race: false },
    settings: { rules: false },
    async run(page, rec) {
      await openPassed(page, rec, 1);
      await page.addStyleTag({ content: NO_UI });
      const go = cruiser(page, 2, 2.7);
      await rec.skip(1500, go);
      await rec.record(18_000, go);
    },
  },

  /** То же горизонтально — фоновое видео страницы приложения. */
  'city-wide': {
    viewport: { width: 960, height: 540 },
    seed: { current: 'ch4', points: 0, seen: [], race: false },
    settings: { rules: false },
    async run(page, rec) {
      await openPassed(page, rec, 2);
      await page.addStyleTag({ content: NO_UI });
      const go = cruiser(page, 5, 2.6);
      await rec.skip(1500, go);
      await rec.record(32_000, go);
    },
  },

  /** Меню: машина курьера едет по улице. */
  menu: {
    async run(_page, rec) {
      await rec.skip(600);
      await rec.record(4000);
    },
  },

  /** Вопрос на регулируемом перекрёстке: подъезд, карточка, верный ответ, проезд. */
  question: {
    seed: MID,
    prepare: midPrepare,
    async run(page, rec) {
      await openChapter(page, rec, 3);
      await rec.skip(800);
      await approachPoi(page, ['signalized'], 300);
      await rec.until(visible(page, '.sheet.is-open .option'), { capture: true });
      await rec.record(2600);
      await answer(page, '.sheet.is-open', true);
      await rec.until(visible(page, '.sheet__foot:not([hidden]) .btn'), { capture: true });
      await rec.record(1400);
      await page.locator('.sheet__foot:not([hidden]) .btn').tap();
      await rec.record(3500);
    },
  },

  /** Ошибка: последствие на дороге, потом «Неверно» и «Почему так». */
  wrong: {
    seed: MID,
    prepare: midPrepare,
    async run(page, rec) {
      await openChapter(page, rec, 3);
      await rec.skip(800);
      await approachPoi(page, ['uncontrolled-priority', 'uncontrolled-equal', 'signalized'], 120, 1);
      await rec.until(visible(page, '.sheet.is-open .option'));
      await rec.record(1500);
      await answer(page, '.sheet.is-open', false);
      await rec.until(visible(page, '.sheet__foot:not([hidden]) .btn'), { capture: true });
      await rec.record(900);
      const by = await page.evaluate(() => {
        const body = document.querySelector('.sheet.is-open .sheet__body')!;
        const fb = body.querySelector('.feedback')!;
        return fb.getBoundingClientRect().top - body.getBoundingClientRect().top - 70;
      });
      await scroll(page, rec, '.sheet.is-open .sheet__body', by, 900);
      await rec.record(2600);
    },
  },

  /** Кат-сцена главы 3: Турбин зовёт Артёма, выбор «Давай вместе учить билеты» и своя сцена. */
  film: {
    settings: { rules: false },
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
    async run(page, rec) {
      await page.getByRole('button', { name: /^Глава 3/ }).first().tap();
      const dialog = page.locator('.cutscene:not(.cutscene--modal)');
      await rec.until(() => dialog.isVisible());
      const text = dialog.locator('.cutscene__text');
      for (let i = 0; i < 30 && !(await text.textContent())?.startsWith('Можно с тобой поговорить'); i++) {
        await dialog.locator('.btn--primary:visible').first().tap();
        await rec.skip(100);
      }
      await rec.skip(100);
      await rec.until(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('.cutscene__film img')].every((i) => i.complete && i.naturalWidth > 0)));
      const screen = dialog.locator('.cutscene__film');
      for (let i = 0; i < 12; i++) {
        await rec.record(2600);
        if ((await screen.getAttribute('data-film')) === 'ch3-choice') break;
        await dialog.locator('.btn--primary:visible').first().tap();
      }
      await rec.record(2400);
      await dialog.locator('.cutscene__choices button').nth(1).tap();
      await rec.record(3200);
      await dialog.locator('.btn--primary:visible').first().tap().catch(() => {});
      await rec.record(3000);
    },
  },

  /** Ситуации на дороге: сцена, таймер, верный ответ с пунктом ПДД. */
  situations: {
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await rec.until(visible(page, '.mode-card'));
      await page.locator('.mode-card', { hasText: 'Ситуации на дороге' }).tap();
      await rec.until(visible(page, '[data-stage="calm"]'));
      await page.locator('[data-stage="calm"]').tap();
      const card = page.locator('.sit-card');
      await rec.until(() => card.locator('.sit-scene svg').isVisible());
      await rec.record(1800);
      await card.getByRole('button', { name: /показать варианты/ }).tap({ timeout: 1500 }).catch(() => {});
      await rec.until(() => card.locator('.sit-options').isVisible(), { capture: true });
      await rec.record(2400);
      const id = (await card.getAttribute('aria-label'))!.replace('Ситуация ', '');
      await card.locator(`.option[data-orig="${SITUATIONS.find((x) => x.id === id)!.correct}"]`).tap();
      await rec.record(2800);
    },
  },

  /** Экзамен: таймер, номера вопросов, вопрос с картинкой. */
  exam: {
    async run(page, rec) {
      await page.getByRole('button', { name: /Экзамен/ }).first().tap();
      await rec.until(visible(page, 'button:has-text("Начать экзамен")'));
      await page.getByRole('button', { name: 'Начать экзамен' }).tap();
      await rec.until(visible(page, '.option'));
      for (let i = 0; i < 8 && !(await page.locator('.card img').count()); i++) {
        await page.getByRole('button', { name: 'Пропустить вопрос' }).tap();
        await rec.skip(300);
      }
      await rec.record(1800);
      await answer(page, '', true);
      await rec.record(700);
      await page.getByRole('button', { name: 'Ответить' }).tap();
      await rec.record(1500);
      await answer(page, '', true);
      await rec.record(600);
    },
  },

  /** Готовность к экзамену. */
  progress: {
    seed: { current: 'ch9', points: 4 },
    async run(page, rec) {
      await page.getByRole('button', { name: 'Прогресс', exact: true }).tap();
      await rec.until(visible(page, '.screen__body'));
      await rec.record(2600);
      await scroll(page, rec, '.screen__body', 380, 1200);
      await rec.record(800);
    },
  },

  /** Знакодекс: альбом и награда за собранную группу. */
  signs: {
    prepare(data) {
      for (const id of PRIORITY) recordAnswer(data, id, true, Date.now() - 3 * 86_400_000);
    },
    async run(page, rec) {
      await page.getByRole('button', { name: 'Режимы' }).tap();
      await rec.until(visible(page, '.mode-card'));
      await page.locator('.mode-card', { hasText: 'Знакодекс' }).tap();
      await rec.until(visible(page, '.signs-grid'));
      await rec.until(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('.sign-tile img')].slice(0, 40).every((i) => i.complete)));
      await rec.record(1500);
      const top = await page.evaluate(() => {
        const body = document.querySelector('.screen__body')!;
        const g = [...document.querySelectorAll('.signs-group')].find((x) => x.textContent?.includes('Знаки приоритета'))!;
        return g.getBoundingClientRect().top - body.getBoundingClientRect().top - 20;
      });
      await scroll(page, rec, '.screen__body', top, 1300);
      await rec.record(500);
      await page.locator('.signs-group', { hasText: 'Знаки приоритета' }).getByRole('button', { name: /Забрать награду/ }).tap();
      await rec.record(2400);
    },
  },

  /** Победа в дуэли с другом. */
  duel: {
    settings: { name: 'Саша' },
    storage: () => ({ 'pdd-game:duels': [{ id: DUEL.id, at: DUEL.at, updated: DUEL.at, role: 'from', q: DUEL.q, me: DUEL.from }] }),
    async run(page, rec) {
      await page.goto(`${BASE}#duel=${encodeDuel(DUEL)}`);
      await rec.until(visible(page, '.duel-result'));
      await rec.record(2600);
      await scroll(page, rec, '.screen__body', 420, 1200);
      await rec.record(600);
    },
  },
};

for (const [theme, chapter] of [['neon', 2], ['winter', 0], ['retro', 1]] as const) {
  CLIPS[`theme-${theme}`] = {
    seed: { current: 'ch4', points: 0, seen: [], race: false },
    settings: { rules: false },
    prepare(data) {
      data.garage.owned.push(`theme:${theme}`);
      data.garage.theme = theme;
    },
    async run(page, rec) {
      await openPassed(page, rec, chapter);
      const go = cruiser(page, chapter + 3);
      await rec.skip(1200, go);
      await rec.record(4500, go);
    },
  };
}

async function record(name: string, clip: Clip) {
  const vp = clip.viewport ?? { width: 390, height: 844 };
  // Настоящий масштаб экрана 2×: скриншоты сразу в пикселях экрана.
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${SCALE}`, `--window-size=${vp.width},${vp.height}`] });
  const context = await browser.newContext({ viewport: null, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage();
  const progress = clip.raw ? clip.raw() : trailerProgress(clip.seed);
  if (!clip.raw) clip.prepare?.(progress as ProgressData);
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript(
    ([p, s, extra]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('pdd-game:settings', JSON.stringify({ tutorial: true, events: false, sound: false, vibration: false, installTip: false, stats: false, holidays: false, ...s }));
      localStorage.setItem('pdd-game:progress', JSON.stringify(p));
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, JSON.stringify(v));
      sessionStorage.setItem('seeded', '1');
    },
    [progress, clip.settings ?? {}, clip.storage?.() ?? {}] as const,
  );
  await page.clock.install();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  const rec = new FrameRecorder(page);
  await rec.until(visible(page, '.menu'));
  await page.addStyleTag({ content: '.toast, #sign-chip, .install-tip, .city-hint { display: none !important; }' });
  try {
    await clip.run(page, rec);
  } catch (e) {
    await page.screenshot({ path: `${OUT}${name}-fail.png` });
    throw e;
  }
  const seconds = rec.save(`${OUT}${name}.mp4`, `${OUT}.frames-${name}`);
  console.log(`${name}: ${seconds.toFixed(1)} с${errors.length ? `, ошибки: ${errors.join('; ')}` : ''}`);
  await browser.close();
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const [name, clip] of Object.entries(CLIPS)) {
  if (only.length && !only.includes(name)) continue;
  // Не получилось — пишем остальные, потом переснимаем эту.
  await record(name, clip).catch((e) => console.log(`${name}: ОШИБКА ${String(e).split('\n')[0]}`));
}
