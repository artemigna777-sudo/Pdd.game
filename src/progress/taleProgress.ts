/**
 * Дополнительные сюжеты в прогрессе игрока (этап 17): покупка и прохождение.
 */
import { TALES } from '../story/taleData.ts';
import { emptyTale, type Tale, type TaleState } from '../story/tales.ts';
import { spendCoins, type ProgressData } from './progress.ts';
import { shopPrice } from './storyProgress.ts';

export const taleById = (id: string): Tale | undefined => TALES.find((t) => t.id === id);

export const ownsTale = (data: ProgressData, id: string): boolean => data.garage.owned.includes(`tale:${id}`);

/** Прохождение сюжета (создаётся при первом обращении). */
export function taleStateOf(data: ProgressData, id: string): TaleState {
  data.tales ??= {};
  return (data.tales[id] ??= emptyTale());
}

/** Купить дополнительный сюжет (со скидкой дяди Гены). */
export function buyTale(data: ProgressData, id: string): 'bought' | 'owned' | 'no-coins' | 'unknown' {
  const tale = taleById(id);
  if (!tale) return 'unknown';
  if (ownsTale(data, id)) return 'owned';
  if (!spendCoins(data, shopPrice(data, tale.price))) return 'no-coins';
  data.garage.owned.push(`tale:${id}`);
  return 'bought';
}

/** Опыт за первое прохождение дополнительного сюжета. */
export const TALE_XP = 100;
