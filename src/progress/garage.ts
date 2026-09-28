/**
 * Гараж: покраска и наклейки машины курьера за монеты. Только внешний вид — на вопросы,
 * ответы и награды не влияет.
 */
import { DEFAULT_PAINT, DEFAULT_STICKER, spendCoins, type ProgressData } from './progress.ts';

export interface Paint {
  id: string;
  name: string;
  color: number;
  price: number;
}

export type StickerId = 'none' | 'stripes' | 'flash' | 'star' | 'heart' | 'flames' | 'checker';

export interface Sticker {
  id: StickerId;
  name: string;
  price: number;
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

const item = (id: string) => PAINTS.find((p) => p.id === id) ?? STICKERS.find((s) => s.id === id);

/** Купить (если ещё нет и хватает монет) и выбрать покраску или наклейку. */
export function buyOrSelect(data: ProgressData, id: string): 'selected' | 'bought' | 'no-coins' | 'unknown' {
  const it = item(id);
  if (!it) return 'unknown';
  let result: 'selected' | 'bought' = 'selected';
  if (!data.garage.owned.includes(id)) {
    if (!spendCoins(data, it.price)) return 'no-coins';
    data.garage.owned.push(id);
    result = 'bought';
  }
  if (PAINTS.some((p) => p.id === id)) data.garage.paint = id;
  else data.garage.sticker = id;
  return result;
}
