/**
 * Заработанные монеты — для таблицы лидеров по монетам: покупки в магазине место в таблице не уменьшают.
 * Заработано = монеты сейчас + потрачено. Потраченное игра считает с обновления, где появилась таблица
 * (`ProgressData.coinsSpent`), а для сохранений до него оценивает по купленному: по обычным ценам,
 * без скидки дяди Гены.
 */
import { CITY_THEMES, HORNS, MODELS, PAINTS, PLATE, STICKERS } from './garage.ts';
import type { ProgressData } from './progress.ts';
import { QTHEMES } from './qthemes.ts';
import { TALES } from '../story/taleData.ts';
import { REWIND_PRICE } from '../story/plot.ts';

/** Сколько монет, судя по покупкам, потрачено в магазине (для старых сохранений). */
export function spentEstimate(data: ProgressData): number {
  const price = (key: string): number => {
    const [kind, id] = key.includes(':') ? (key.split(':', 2) as [string, string]) : ['', key];
    const list: readonly { id: string; price: number }[] | undefined =
      kind === '' ? [...PAINTS, ...STICKERS] : kind === 'theme' ? CITY_THEMES : kind === 'model' ? MODELS : kind === 'horn' ? HORNS : kind === 'qtheme' ? QTHEMES : kind === 'tale' ? TALES : undefined;
    if (key === 'plate') return PLATE.price;
    return list?.find((it) => it.id === id)?.price ?? 0;
  };
  const shop = [...new Set(data.garage.owned)].reduce((sum, key) => sum + price(key), 0);
  return shop + (data.story?.rewinds ?? 0) * REWIND_PRICE;
}

/** Если потраченное ещё не считается (сохранение до таблицы лидеров) — начать с оценки по покупкам. */
export function ensureCoinsSpent(data: ProgressData): boolean {
  if (data.coinsSpent !== undefined) return false;
  data.coinsSpent = spentEstimate(data);
  return true;
}

/** Сколько монет заработано за всё время. */
export function coinsEarned(data: ProgressData): number {
  return data.coins + (data.coinsSpent ?? spentEstimate(data));
}
