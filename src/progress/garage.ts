/**
 * Гараж и магазин: покраска, наклейки и темы города за монеты. Только внешний вид — на вопросы,
 * ответы, правила и готовность к экзамену не влияет.
 */
import { DEFAULT_PAINT, DEFAULT_STICKER, spendCoins, type ProgressData } from './progress.ts';
import { shopPrice } from './storyProgress.ts';

export interface Paint {
  id: string;
  name: string;
  color: number;
  price: number;
}

export type StickerId = 'none' | 'stripes' | 'flash' | 'star' | 'heart' | 'flames' | 'checker' | 'triangle' | 'diamond' | 'ring' | 'arrow';

export interface Sticker {
  id: StickerId;
  name: string;
  price: number;
  /** Не продаётся: открывается за собранную группу знаков в Знакодексе (этап 11). */
  signGroup?: string;
}

export const PAINTS: Paint[] = [
  { id: DEFAULT_PAINT, name: 'Жёлтая «Стрела»', color: 0xffb703, price: 0 },
  { id: 'red', name: 'Красная', color: 0xe63946, price: 60 },
  { id: 'blue', name: 'Синяя', color: 0x3a86ff, price: 60 },
  { id: 'green', name: 'Изумрудная', color: 0x2a9d8f, price: 80 },
  { id: 'orange', name: 'Оранжевая', color: 0xf77f00, price: 80 },
  { id: 'purple', name: 'Фиолетовая', color: 0x8338ec, price: 120 },
  { id: 'white', name: 'Белая', color: 0xf1f3f5, price: 150 },
  { id: 'black', name: 'Чёрная', color: 0x2b2d42, price: 150 },
];

export const STICKERS: Sticker[] = [
  { id: DEFAULT_STICKER as StickerId, name: 'Без наклейки', price: 0 },
  { id: 'stripes', name: 'Гоночные полосы', price: 100 },
  { id: 'heart', name: 'Сердце', price: 100 },
  { id: 'flash', name: 'Молния', price: 120 },
  { id: 'star', name: 'Звезда', price: 120 },
  { id: 'flames', name: 'Пламя', price: 200 },
  { id: 'checker', name: 'Шашечки', price: 200 },
  { id: 'triangle', name: 'Треугольник', price: 0, signGroup: 'warning' },
  { id: 'diamond', name: 'Главная дорога', price: 0, signGroup: 'priority' },
  { id: 'ring', name: 'Красный круг', price: 0, signGroup: 'prohibitory' },
  { id: 'arrow', name: 'Синяя стрелка', price: 0, signGroup: 'mandatory' },
];

export interface CarLook {
  color: number;
  sticker: StickerId;
}

/** Как сейчас выглядит машина игрока. */
export function carLook(data: ProgressData): CarLook {
  const paint = PAINTS.find((p) => p.id === data.garage.paint) ?? PAINTS[0];
  const sticker = STICKERS.find((s) => s.id === data.garage.sticker) ?? STICKERS[0];
  return { color: paint.color, sticker: sticker.id };
}

/** Тема города (этап 17): меняет вид всего города и улицы в меню. Палитры — `game/city/themes.ts`. */
export interface CityThemeInfo {
  id: string;
  name: string;
  icon: string;
  price: number;
  about: string;
  /** Цвета для картинки в магазине: газон, асфальт, разметка, крыша. */
  preview: [string, string, string, string];
}

export const CITY_THEMES: CityThemeInfo[] = [
  { id: 'winter', name: 'Зимний город', icon: '❄️', price: 250, about: 'Снег на газонах и крышах, снежинки в воздухе.', preview: ['#e6eff6', '#575e6c', '#eef0f2', '#d9e3ee'] },
  { id: 'autumn', name: 'Осенний', icon: '🍂', price: 250, about: 'Жёлтые деревья и листопад.', preview: ['#a58a3d', '#40454e', '#eef0f2', '#e8a33a'] },
  { id: 'toy', name: 'Игрушечный', icon: '🧸', price: 300, about: 'Город как из конструктора: пастельные цвета.', preview: ['#8fe08f', '#7d84b2', '#fffbe6', '#ff8fab'] },
  { id: 'neon', name: 'Ночной неон', icon: '🌃', price: 350, about: 'Тёмный город, светящаяся разметка и неоновые крыши.', preview: ['#150d2b', '#0e0b1d', '#00f0ff', '#ff2bd6'] },
  { id: 'retro', name: 'Ретро-пиксели', icon: '👾', price: 400, about: 'Город как в старой приставке: крупные пиксели и яркие цвета.', preview: ['#00a800', '#545454', '#fcfcfc', '#f83800'] },
];

/** Купить (если ещё нет и хватает монет) и выбрать тему города; `undefined` — обычный город. */
export function buyOrSelectTheme(data: ProgressData, id: string | undefined): 'selected' | 'bought' | 'no-coins' | 'unknown' {
  if (id === undefined) {
    delete data.garage.theme;
    return 'selected';
  }
  const theme = CITY_THEMES.find((t) => t.id === id);
  if (!theme) return 'unknown';
  let result: 'selected' | 'bought' = 'selected';
  const key = `theme:${id}`;
  if (!data.garage.owned.includes(key)) {
    if (!spendCoins(data, shopPrice(data, theme.price))) return 'no-coins';
    data.garage.owned.push(key);
    result = 'bought';
  }
  data.garage.theme = id;
  return result;
}

const item = (id: string) => PAINTS.find((p) => p.id === id) ?? STICKERS.find((s) => s.id === id);

/** Купить (если ещё нет и хватает монет) и выбрать покраску или наклейку. */
export function buyOrSelect(data: ProgressData, id: string): 'selected' | 'bought' | 'no-coins' | 'locked' | 'unknown' {
  const it = item(id);
  if (!it) return 'unknown';
  let result: 'selected' | 'bought' = 'selected';
  if (!data.garage.owned.includes(id)) {
    if ('signGroup' in it && it.signGroup) return 'locked';
    // С дядей Геной от 4 сердечек — скидка (этап 17).
    if (!spendCoins(data, shopPrice(data, it.price))) return 'no-coins';
    data.garage.owned.push(id);
    result = 'bought';
  }
  if (PAINTS.some((p) => p.id === id)) data.garage.paint = id;
  else data.garage.sticker = id;
  return result;
}
