/**
 * Анонимная статистика для автора игры (GoatCounter, без cookies и без личных данных).
 *
 * Что уходит на счётчик: адрес экрана («/city/ch3» — «Глава 3») или событие («exam-pass»),
 * размер экрана, откуда пришли (только при первом открытии) и метка рекламы из ссылки (`?ref=tiktok`).
 * Не уходит: имя, ответы, прогресс, дата экзамена, содержимое дуэлей.
 *
 * Не считаем: если код сайта не задан (`STATS_SITE`), игрок выключил статистику в настройках,
 * это телефон автора с «не считать мои заходы», режим разработки и автотесты.
 * Без интернета хиты копятся в очереди (до 40) и уходят, когда сеть появится.
 */
import { STATS_SITE } from '../config.ts';
import { getSettings } from '../settings.ts';
import { load, save } from '../storage.ts';
import { adminState } from './admin.ts';

export interface Hit {
  /** Адрес экрана или имя события. */
  p: string;
  /** Название по-русски — так оно видно в статистике. */
  t: string;
  /** Событие, а не экран. */
  e?: boolean;
  /** Откуда пришли (только первый хит). */
  r?: string;
  /** Метка из ссылки, например `?ref=tiktok` (только первый хит). */
  q?: string;
}

const QUEUE = 'pdd-game:stats-queue';
const QUEUE_LIMIT = 40;
let first = true;

/** Режим разработки Vite. В автотестах на Node `import.meta.env` нет. */
const isDev = () => Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

/**
 * Код сайта счётчика. В режиме разработки автотесты подставляют свой (`pdd-game:stats-site-dev`),
 * пустая строка там — «счётчик не подключён».
 */
export function statsSite(): string {
  if (isDev()) {
    const dev = load<unknown>('pdd-game:stats-site-dev', null);
    if (typeof dev === 'string') return dev;
  }
  return STATS_SITE;
}

/**
 * Откуда пришли: метка из ссылки (`?ref=tiktok`, `utm_source`, `src`, `source`), иначе сайт, с которого
 * перешли. GoatCounter берёт метку только вместе с названием кампании, поэтому передаём её сами.
 */
export function sourceOf(search: string, referrer: string, origin: string): string {
  const query = new URLSearchParams(search);
  const tag = ['ref', 'utm_source', 'src', 'source'].map((k) => query.get(k)?.trim()).find(Boolean);
  if (tag) return tag.slice(0, 60);
  return referrer && !referrer.startsWith(origin) ? referrer : '';
}

/** Считать ли сейчас. */
export function statsActive(): boolean {
  if (!statsSite() || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (isDev() || navigator.webdriver) return false;
  if (!getSettings().stats) return false;
  const admin = adminState();
  return !(admin.unlocked && admin.selfIgnore);
}

/** Адрес счётчика для хита. */
export function countUrl(site: string, hit: Hit, screen: string, rnd: string): string {
  const q = new URLSearchParams({ p: hit.p, t: hit.t, s: screen, rnd });
  if (hit.e) q.set('e', 'true');
  if (hit.r) q.set('r', hit.r);
  if (hit.q) q.set('q', hit.q);
  return `https://${site}.goatcounter.com/count?${q}`;
}

function post(hit: Hit): void {
  const url = countUrl(statsSite(), hit, [window.screen.width, window.screen.height, window.devicePixelRatio || 1].join(','), Math.random().toString(36).slice(2, 8));
  try {
    if (navigator.sendBeacon?.(url)) return;
  } catch {
    // sendBeacon бывает запрещён — попробуем обычный запрос.
  }
  fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => enqueue(hit));
}

function enqueue(hit: Hit): void {
  save(QUEUE, [...load<Hit[]>(QUEUE, []), hit].slice(-QUEUE_LIMIT));
}

/** Отправить то, что накопилось без интернета. */
export function flushStats(): void {
  if (!statsActive() || !navigator.onLine) return;
  const queue = load<Hit[]>(QUEUE, []);
  if (!Array.isArray(queue) || !queue.length) return;
  save(QUEUE, []);
  queue.filter((h) => h && typeof h.p === 'string' && typeof h.t === 'string').forEach(post);
}

function send(hit: Hit): void {
  if (!statsActive()) return;
  // Откуда пришли — к первому открытому экрану, а не к событию: так это видно в источниках посещений.
  if (first && !hit.e) {
    first = false;
    const ref = sourceOf(location.search, document.referrer, location.origin);
    if (ref) hit.r = ref;
    if (location.search) hit.q = location.search;
  }
  if (!navigator.onLine) enqueue(hit);
  else post(hit);
}

/** Открыт экран игры. */
export function trackView(path: string, title: string): void {
  send({ p: path, t: title });
}

/** Событие: дошёл до финала главы, сдал экзамен и т. п. */
export function trackEvent(name: string, title: string): void {
  send({ p: name, t: title, e: true });
}

/** Один раз за день на телефоне (например, «открыл с главного экрана»). */
export function trackOncePerDay(name: string, title: string, now = Date.now()): void {
  const key = `pdd-game:stats-day:${name}`;
  const day = new Date(now).toDateString();
  if (load<string>(key, '') === day || !statsActive()) return;
  save(key, day);
  trackEvent(name, title);
}

/** Один раз за всё время на телефоне (например, «новый игрок»). */
export function trackOnce(name: string, title: string): void {
  const key = `pdd-game:stats-once:${name}`;
  if (load<boolean>(key, false) || !statsActive()) return;
  save(key, true);
  trackEvent(name, title);
}

/** Начать: отправить очередь и следить за появлением сети. */
export function startStats(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', flushStats);
  flushStats();
}
