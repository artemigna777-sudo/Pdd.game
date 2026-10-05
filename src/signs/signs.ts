/**
 * Знакодекс (этап 11): альбом дорожных знаков из билетов. Знак открывается, когда верно отвечен
 * вопрос, в котором он есть. Собранная группа — монеты, а четыре главные группы ещё и открывают
 * наклейку на машину.
 *
 * Сами знаки (названия, картинки, описания) — в data/signs.json, его собирает `npm run signs`
 * из открытого набора pdd_russia.
 */
import type { ProgressData } from '../progress/progress.ts';

export interface SignEntry {
  /** Номер по ПДД: «2.4». */
  number: string;
  title: string;
  /** Группа (SIGN_GROUPS). */
  group: string;
  /** Путь к картинке от корня сайта: «signs/2.4.svg». Нет — в наборе нет картинки. */
  image?: string;
  /** Описание из набора (без штрафов). */
  text?: string;
  /** Вопросы, в которых встречается знак. */
  questions: string[];
  /** Варианты знака из билетов, если в наборе у них одна запись (1.4.1 и 1.4.3 → 1.4). */
  variants?: string[];
}

export interface SignsData {
  source: { name: string; url: string; commit: string };
  signs: SignEntry[];
  /** Знаки из билетов, которых нет в наборе. */
  missing: { number: string; questions: string[]; reason: string }[];
}

export interface SignGroup {
  id: string;
  /** Название группы в наборе pdd_russia. */
  title: string;
  /** Монеты за собранную группу. */
  coins: number;
  /** Наклейка на машину за собранную группу. */
  sticker?: string;
}

export const SIGN_GROUPS: readonly SignGroup[] = [
  { id: 'warning', title: 'Предупреждающие знаки', coins: 100, sticker: 'triangle' },
  { id: 'priority', title: 'Знаки приоритета', coins: 50, sticker: 'diamond' },
  { id: 'prohibitory', title: 'Запрещающие знаки', coins: 100, sticker: 'ring' },
  { id: 'mandatory', title: 'Предписывающие знаки', coins: 60, sticker: 'arrow' },
  { id: 'special', title: 'Знаки особых предписаний', coins: 100 },
  { id: 'info', title: 'Информационные знаки', coins: 60 },
  { id: 'service', title: 'Знаки сервиса', coins: 30 },
  { id: 'plates', title: 'Знаки дополнительной информации (таблички)', coins: 80 },
];

export type Rarity = 'rare' | 'uncommon' | 'common';

/** Редкость: из одного вопроса — редкий, из 2–3 — необычный, из 4 и больше — обычный. */
export function rarityOf(sign: SignEntry): Rarity {
  const n = sign.questions.length;
  return n <= 1 ? 'rare' : n <= 3 ? 'uncommon' : 'common';
}

export const RARITY_LABEL: Record<Rarity, string> = { rare: 'Редкий', uncommon: 'Необычный', common: 'Обычный' };

/** Знак открыт: хотя бы на один его вопрос когда-нибудь ответили верно. */
export function isOpen(data: ProgressData, sign: SignEntry): boolean {
  return sign.questions.some((id) => data.questions[id]?.ever);
}

/** Номера открытых знаков. */
export function openSigns(data: ProgressData, signs: readonly SignEntry[]): Set<string> {
  return new Set(signs.filter((s) => isOpen(data, s)).map((s) => s.number));
}

export interface GroupState {
  group: SignGroup;
  signs: SignEntry[];
  open: number;
  /** Все знаки группы открыты. */
  complete: boolean;
  /** Награда за группу получена. */
  claimed: boolean;
}

export function groupStates(data: ProgressData, signs: readonly SignEntry[]): GroupState[] {
  const open = openSigns(data, signs);
  const claimed = new Set(data.signs?.claimed ?? []);
  return SIGN_GROUPS.map((group) => {
    const list = signs.filter((s) => s.group === group.id);
    const n = list.filter((s) => open.has(s.number)).length;
    return { group, signs: list, open: n, complete: list.length > 0 && n === list.length, claimed: claimed.has(group.id) };
  }).filter((g) => g.signs.length > 0);
}

/**
 * Забрать награду за собранную группу: монеты и наклейку (она сразу появляется в гараже).
 * Возвращает награду или undefined, если группа не собрана или награда уже получена.
 */
export function claimGroup(data: ProgressData, signs: readonly SignEntry[], groupId: string): { coins: number; sticker?: string } | undefined {
  const state = groupStates(data, signs).find((g) => g.group.id === groupId);
  if (!state || !state.complete || state.claimed) return undefined;
  data.signs = { claimed: [...(data.signs?.claimed ?? []), groupId] };
  data.coins += state.group.coins;
  const sticker = state.group.sticker;
  if (sticker && !data.garage.owned.includes(sticker)) data.garage.owned.push(sticker);
  return { coins: state.group.coins, ...(sticker ? { sticker } : {}) };
}

/** Наклейка, которую открывает группа знаков (для гаража). */
export function groupOfSticker(sticker: string): SignGroup | undefined {
  return SIGN_GROUPS.find((g) => g.sticker === sticker);
}
