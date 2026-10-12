/**
 * Сюжет в прогрессе игрока (этап 17): решения, отношения, характер, концовки и «Вернуть решение».
 * Сама модель — `story/plot.ts`, развилки и концовки — `story/turbo.ts`.
 */
import { REWIND_PRICE, decide, emptyStory, lastBigDecision, plotContext, rewindDecision, unlockEnding, type Ending, type PlotContext, type PlotSource, type StoryState } from '../story/plot.ts';
import { ENDINGS, PLOT } from '../story/turbo.ts';
import { spendCoins, type ProgressData } from './progress.ts';

function storyOf(data: ProgressData): StoryState {
  data.story ??= emptyStory();
  return data.story;
}

/** Главы, где поручение выполнено. */
export function helpedChapters(data: ProgressData): string[] {
  return Object.entries(data.chapters)
    .filter(([, c]) => c.side?.done !== undefined)
    .map(([id]) => id);
}

/** Отношения, характер и решения игрока сейчас. */
export function storyContext(data: ProgressData, source: PlotSource = PLOT): PlotContext {
  return plotContext(data.story, helpedChapters(data), source);
}

/** Записать выбор в развилке. false — такой развилки нет. */
export function recordDecision(data: ProgressData, id: string, value: string, now: number, source: PlotSource = PLOT): boolean {
  return decide(storyOf(data), id, value, now, source);
}

/** Экзамен-босс сдан: открыть концовку по решениям и отношениям. */
export function finishStory(data: ProgressData, now: number, source: PlotSource = PLOT, endings: readonly Ending[] = ENDINGS): { ending: Ending; fresh: boolean } | undefined {
  if (!endings.length) return undefined;
  return unlockEnding(storyOf(data), storyContext(data, source), endings, now);
}

export type RewindOutcome =
  | { ok: false; reason: 'nothing' | 'same' | 'coins' }
  /** `ending` — если история уже пройдена: концовка по новому решению. */
  | { ok: true; ending?: { ending: Ending; fresh: boolean } };

/**
 * «Вернуть решение» за монеты: переиграть последнюю большую развилку. Если экзамен-босс уже
 * сдан, концовка пересчитывается сразу — так собирается галерея концовок.
 */
export function rewind(data: ProgressData, value: string, now: number, source: PlotSource = PLOT, endings: readonly Ending[] = ENDINGS): RewindOutcome {
  const last = lastBigDecision(data.story, source);
  if (!last) return { ok: false, reason: 'nothing' };
  if (last.value === value || !last.decision.options.some((o) => o.value === value)) return { ok: false, reason: 'same' };
  if (!spendCoins(data, REWIND_PRICE)) return { ok: false, reason: 'coins' };
  rewindDecision(storyOf(data), value, now, source);
  const ending = data.finale.exam !== undefined ? finishStory(data, now, source, endings) : undefined;
  return { ok: true, ...(ending ? { ending } : {}) };
}
