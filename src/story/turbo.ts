/**
 * Линия «Турбо-Доставка» (этап 17): развилки глав и концовки истории.
 *
 * В Светофорске появляется конкурент «Стрелы» — «Турбо-Доставка» («привезём за 15 минут
 * любой ценой»). Быстро или безопасно — решает игрок: на чьей он стороне и кому помочь.
 * Модель развилок, отношений и концовок — `plot.ts`.
 */
import { SIDE_QUESTS } from './extras.ts';
import type { Decision, Ending, PlotSource } from './plot.ts';
import type { CharacterId } from './story.ts';

/** Развилки глав по порядку. */
export const DECISIONS: Decision[] = [];

/** Концовки: первая подходящая по порядку, последняя — по умолчанию. */
export const ENDINGS: Ending[] = [];

/** Кто давал поручение в главе: за выполненное поручение — сердечко. */
const GIVERS: Record<string, CharacterId> = Object.fromEntries(Object.entries(SIDE_QUESTS).map(([ch, q]) => [ch, q.giver]));

export const PLOT: PlotSource = { decisions: DECISIONS, givers: GIVERS };
