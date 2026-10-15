/**
 * Оформления вопросов: каталог, покупка за монеты, выбор, праздники по датам и серия верных
 * ответов. Только внешний вид карточки вопроса — текст вопроса, картинка билета и варианты
 * ответа не меняются (правило 3), на правила, ответы и готовность к экзамену это не влияет.
 *
 * Как выбирается оформление на экране: если игрок выбрал своё — оно; иначе («Авто») в дни
 * праздника — праздничное (бесплатно, выключается в настройках), иначе — оформление темы
 * города, если она выбрана, иначе — обычная карточка.
 *
 * Праздничное оформление появляется в игре только в дни своего праздника (решение Артёма
 * 15.10.2026): до и после него его не видно, а купить его можно только в эти дни. Купленное
 * остаётся у игрока навсегда.
 */
import { spendCoins, type ProgressData } from './progress.ts';
import { shopPrice } from './storyProgress.ts';

export type QThemeGroup = 'new' | 'holiday' | 'city';

export interface QThemeInfo {
  id: string;
  name: string;
  icon: string;
  group: QThemeGroup;
  /** Цена в магазине; у оформлений тем города — 0: они идут вместе с темой. */
  price: number;
  /** Сколько верных ответов подряд в серии (0 — серии нет). */
  streak: number;
  /** Праздник: когда включается сам (подпись для магазина). */
  when?: string;
  /** Оформление темы города: какая тема его открывает. */
  city?: string;
}

/** Обычная карточка вопроса. */
export const QTHEME_CLASSIC = 'classic';
/** Монеты за полную серию верных ответов. */
export const QSTREAK_COINS = 5;

export const QTHEMES: QThemeInfo[] = [
  // Новые темы магазина: покупаются в любой день.
  { id: 'gym', name: 'GYM', icon: '🏋️', group: 'new', price: 350, streak: 5 },
  { id: 'cats', name: 'Котики', icon: '🐱', group: 'new', price: 300, streak: 5 },
  { id: 'football', name: 'Футбол', icon: '⚽', group: 'new', price: 300, streak: 5 },
  { id: 'cinema', name: 'Кино', icon: '🎬', group: 'new', price: 300, streak: 5 },
  { id: 'comic', name: 'Комикс', icon: '💥', group: 'new', price: 300, streak: 5 },
  { id: 'hacker', name: 'Хакер', icon: '💻', group: 'new', price: 350, streak: 5 },
  { id: 'graffiti', name: 'Граффити', icon: '🎨', group: 'new', price: 350, streak: 5 },
  { id: 'pirates', name: 'Пираты', icon: '🏴‍☠️', group: 'new', price: 350, streak: 5 },
  { id: 'dino', name: 'Динозавры', icon: '🦖', group: 'new', price: 300, streak: 5 },
  { id: 'gzhel', name: 'Гжель', icon: '🫖', group: 'new', price: 400, streak: 5 },
  { id: 'sakura', name: 'Сакура', icon: '🌸', group: 'new', price: 350, streak: 5 },
  { id: 'origami', name: 'Оригами', icon: '🕊️', group: 'new', price: 300, streak: 5 },
  { id: 'noir', name: 'Детектив', icon: '🔎', group: 'new', price: 400, streak: 5 },
  { id: 'ocean', name: 'Подводный мир', icon: '🐠', group: 'new', price: 300, streak: 5 },
  { id: 'poster', name: 'Плакат ГАИ', icon: '📯', group: 'new', price: 300, streak: 5 },
  // Праздники: в свои дни включаются сами, в магазине покупаются в любой день.
  { id: 'newyear', name: 'Новый год', icon: '🎄', group: 'holiday', price: 300, streak: 5, when: '20 декабря — 10 января' },
  { id: 'valentine', name: '14 февраля', icon: '💝', group: 'holiday', price: 300, streak: 5, when: '10 — 15 февраля' },
  { id: 'feb23', name: '23 февраля', icon: '⭐', group: 'holiday', price: 300, streak: 4, when: '20 — 24 февраля' },
  { id: 'mar8', name: '8 Марта', icon: '🌷', group: 'holiday', price: 300, streak: 5, when: '5 — 9 марта' },
  { id: 'maslenitsa', name: 'Масленица', icon: '🥞', group: 'holiday', price: 300, streak: 5, when: 'масленичная неделя' },
  { id: 'cosmos', name: 'День космонавтики', icon: '🚀', group: 'holiday', price: 300, streak: 5, when: '10 — 13 апреля' },
  { id: 'victory', name: '9 Мая', icon: '🎖️', group: 'holiday', price: 300, streak: 0, when: '6 — 10 мая' },
  { id: 'gibdd', name: 'День ГИБДД', icon: '🚦', group: 'holiday', price: 300, streak: 5, when: '1 — 4 июля' },
  { id: 'school', name: 'День знаний', icon: '📒', group: 'holiday', price: 300, streak: 5, when: '25 августа — 5 сентября' },
  { id: 'driver', name: 'День автомобилиста', icon: '🚗', group: 'holiday', price: 300, streak: 5, when: 'последнее воскресенье октября ± 3 дня' },
  { id: 'halloween', name: 'Хэллоуин', icon: '🎃', group: 'holiday', price: 300, streak: 5, when: '28 октября — 1 ноября' },
  // Оформления тем города: идут вместе с купленной темой.
  { id: 'winter', name: 'Зимний', icon: '❄️', group: 'city', price: 0, streak: 5, city: 'winter' },
  { id: 'autumn', name: 'Осенний', icon: '🍂', group: 'city', price: 0, streak: 5, city: 'autumn' },
  { id: 'toy', name: 'Игрушечный', icon: '🧸', group: 'city', price: 0, streak: 5, city: 'toy' },
  { id: 'neon', name: 'Ночной неон', icon: '🌃', group: 'city', price: 0, streak: 5, city: 'neon' },
  { id: 'pixel', name: 'Ретро-пиксели', icon: '👾', group: 'city', price: 0, streak: 5, city: 'retro' },
];

const byId = new Map(QTHEMES.map((t) => [t.id, t]));

export function qtheme(id: string): QThemeInfo | undefined {
  return byId.get(id);
}

// ─── Праздники ───────────────────────────────────────────────────────────────────

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const dayNumber = (d: Date) => Math.round(day(d.getFullYear(), d.getMonth() + 1, d.getDate()).getTime() / 86_400_000);

/** Православная Пасха (по григорианскому календарю, для 1900–2099). */
export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const dayOfMonth = ((d + e + 114) % 31) + 1;
  // Юлианская дата → григорианская: +13 дней в XX–XXI веках.
  return new Date(year, month - 1, dayOfMonth + 13);
}

/** Последнее воскресенье октября — День автомобилиста. */
export function driverDay(year: number): Date {
  const last = day(year, 10, 31);
  return day(year, 10, 31 - last.getDay());
}

/** Праздничные дни: [праздник, первый день, последний день] на год; порядок — приоритет. */
function holidayRanges(year: number): [string, Date, Date][] {
  const easter = orthodoxEaster(year);
  const shift = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const drv = driverDay(year);
  return [
    ['newyear', day(year - 1, 12, 20), day(year, 1, 10)],
    ['newyear', day(year, 12, 20), day(year + 1, 1, 10)],
    ['valentine', day(year, 2, 10), day(year, 2, 15)],
    ['feb23', day(year, 2, 20), day(year, 2, 24)],
    ['mar8', day(year, 3, 5), day(year, 3, 9)],
    ['cosmos', day(year, 4, 10), day(year, 4, 13)],
    ['victory', day(year, 5, 6), day(year, 5, 10)],
    ['gibdd', day(year, 7, 1), day(year, 7, 4)],
    ['school', day(year, 8, 25), day(year, 9, 5)],
    ['driver', shift(drv, -3), shift(drv, 3)],
    ['halloween', day(year, 10, 28), day(year, 11, 1)],
    // Масленичная неделя: с понедельника за 55 дней до Пасхи по Прощёное воскресенье.
    ['maslenitsa', shift(easter, -55), shift(easter, -49)],
  ];
}

function currentHoliday(date: Date): [string, Date, Date] | undefined {
  const n = dayNumber(date);
  return holidayRanges(date.getFullYear()).find(([, from, to]) => n >= dayNumber(from) && n <= dayNumber(to));
}

/** Какой праздник сегодня (по часам телефона); нет — `undefined`. */
export function holidayOn(date: Date): string | undefined {
  return currentHoliday(date)?.[0];
}

/** Последний день сегодняшнего праздника (до него праздничное оформление можно купить). */
export function holidayUntil(date: Date): Date | undefined {
  return currentHoliday(date)?.[2];
}

// ─── Покупка и выбор ─────────────────────────────────────────────────────────────

const ownedKey = (id: string) => `qtheme:${id}`;

/** Есть ли оформление у игрока: обычное — у всех, тема города — вместе с темой, остальные — купленные. */
export function ownsQTheme(data: ProgressData, id: string): boolean {
  if (id === QTHEME_CLASSIC) return true;
  const t = byId.get(id);
  if (!t) return false;
  return t.city ? data.garage.owned.includes(`theme:${t.city}`) : data.garage.owned.includes(ownedKey(id));
}

/**
 * Купить (если ещё нет и хватает монет) и выбрать оформление. `undefined` — «Авто»: праздник,
 * тема города или обычная карточка. Оформление темы города не продаётся отдельно — `locked`,
 * праздничное продаётся только в дни своего праздника — иначе `unavailable`.
 */
export function buyOrSelectQTheme(data: ProgressData, id: string | undefined, now = new Date()): 'selected' | 'bought' | 'no-coins' | 'locked' | 'unavailable' | 'unknown' {
  if (id === undefined) {
    delete data.garage.qtheme;
    return 'selected';
  }
  if (id !== QTHEME_CLASSIC && !byId.has(id)) return 'unknown';
  const t = byId.get(id);
  let result: 'selected' | 'bought' = 'selected';
  if (!ownsQTheme(data, id)) {
    if (t?.city) return 'locked';
    if (t?.group === 'holiday' && holidayOn(now) !== id) return 'unavailable';
    if (!spendCoins(data, shopPrice(data, t!.price))) return 'no-coins';
    data.garage.owned.push(ownedKey(id));
    result = 'bought';
  }
  data.garage.qtheme = id;
  return result;
}

/**
 * Что показать в магазине: новые темы и темы города — всегда; праздничное — только сегодняшнее
 * (в дни праздника) и уже купленные. `holidays: false` — как будто праздника сегодня нет.
 */
export function shopQThemes(data: ProgressData, now: Date, holidays = true): { holidayNow?: QThemeInfo; until?: Date; owned: QThemeInfo[]; fresh: QThemeInfo[]; city: QThemeInfo[] } {
  const today = holidays ? holidayOn(now) : undefined;
  const holidayNow = today ? byId.get(today) : undefined;
  return {
    ...(holidayNow ? { holidayNow, until: holidayUntil(now) } : {}),
    owned: QTHEMES.filter((t) => t.group === 'holiday' && t.id !== today && ownsQTheme(data, t.id)),
    fresh: QTHEMES.filter((t) => t.group === 'new'),
    city: QTHEMES.filter((t) => t.group === 'city'),
  };
}

/** Оформление темы города (если тема выбрана и у неё есть оформление вопросов). */
function cityQTheme(data: ProgressData): string | undefined {
  const city = data.garage.theme;
  return city ? QTHEMES.find((t) => t.city === city)?.id : undefined;
}

/** Какое оформление показывать сейчас. */
export function activeQTheme(data: ProgressData, opts: { holidays: boolean; now: Date }): string {
  const chosen = data.garage.qtheme;
  if (chosen && ownsQTheme(data, chosen)) return chosen;
  const holiday = opts.holidays ? holidayOn(opts.now) : undefined;
  return holiday ?? cityQTheme(data) ?? QTHEME_CLASSIC;
}

// ─── Серия верных ответов ────────────────────────────────────────────────────────

/**
 * Ответ на вопрос в оформлении с серией: верный — серия растёт, ошибка — с нуля. Полная серия
 * приносит монеты и начинается заново. Возвращает, что показать на карточке.
 */
export function bumpQStreak(data: ProgressData, themeId: string, correct: boolean): { n: number; max: number; coins: number } {
  const max = byId.get(themeId)?.streak ?? 0;
  if (!max) return { n: 0, max: 0, coins: 0 };
  if (!correct) {
    data.garage.qstreak = 0;
    return { n: 0, max, coins: 0 };
  }
  const n = Math.min((data.garage.qstreak ?? 0) + 1, max);
  if (n < max) {
    data.garage.qstreak = n;
    return { n, max, coins: 0 };
  }
  data.garage.qstreak = 0;
  data.coins += QSTREAK_COINS;
  return { n, max, coins: QSTREAK_COINS };
}

/** Сколько сейчас в серии (для карточки до ответа). */
export function qStreakNow(data: ProgressData, themeId: string): { n: number; max: number } {
  const max = byId.get(themeId)?.streak ?? 0;
  return { n: Math.min(data.garage.qstreak ?? 0, max), max };
}
