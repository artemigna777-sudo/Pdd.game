/**
 * Живой город (этап 7): гонка с Артёмом и побочные задания — их учёт в прогрессе главы.
 *
 * Гонка: пока глава не пройдена, считается время в районе (город открыт и не на паузе) и ответы
 * в точках главы. Артём проезжает район за своё время (по числу вопросов и точек главы) со своей
 * точностью. Итог подводится один раз — при доставке посылки главы.
 */
import { SIDE_REWARD, rivalSeconds, type Rival } from '../story/extras.ts';
import { chapterState, gain, type ChapterInfo, type LevelInfo, type ProgressData } from './progress.ts';

/** Монеты за победу в гонке: отдельно за скорость и за точность. */
export const RACE_COINS = { faster: 15, accurate: 15 } as const;

/** Меньше ответов — итог гонки не подводится (например, глава пройдена до этапа 7). */
const MIN_ANSWERS = 5;

export type Winner = 'you' | 'artem' | 'tie';

export interface RaceSide {
  /** Секунд в районе. */
  time: number;
  /** Доля верных ответов, %. */
  accuracy: number;
}

export interface RaceResult {
  you: RaceSide;
  artem: RaceSide;
  faster: Winner;
  accurate: Winner;
  coins: number;
}

const questionsOf = (chapter: ChapterInfo) => chapter.points.reduce((sum, p) => sum + p.questions.length, 0);

/** Гонка идёт: глава не пройдена. */
export function raceActive(data: ProgressData, chapterId: string): boolean {
  return !data.chapters[chapterId]?.delivered;
}

/** Время в районе (секунды). */
export function raceTick(data: ProgressData, chapterId: string, seconds: number): void {
  if (!raceActive(data, chapterId)) return;
  const state = chapterState(data, chapterId);
  state.race ??= { time: 0, answers: 0, correct: 0 };
  state.race.time += seconds;
}

/** Ответ в точке главы. */
export function raceAnswer(data: ProgressData, chapterId: string, correct: boolean): void {
  if (!raceActive(data, chapterId)) return;
  const state = chapterState(data, chapterId);
  state.race ??= { time: 0, answers: 0, correct: 0 };
  state.race.answers++;
  if (correct) state.race.correct++;
}

/** Сколько проехал Артём: доля от 0 до 1 (1 — посылка Артёма доставлена). */
export function rivalProgress(data: ProgressData, chapter: ChapterInfo, rival: Rival): number {
  const time = data.chapters[chapter.id]?.race?.time ?? 0;
  return Math.min(1, time / rivalSeconds(rival, questionsOf(chapter), chapter.points.length));
}

const winner = (you: number, artem: number, lessIsBetter: boolean, eps: number): Winner =>
  Math.abs(you - artem) <= eps ? 'tie' : (lessIsBetter ? you < artem : you > artem) ? 'you' : 'artem';

/** Итог гонки (без изменения прогресса). undefined — данных мало. */
export function raceResult(data: ProgressData, chapter: ChapterInfo, rival: Rival): RaceResult | undefined {
  const race = data.chapters[chapter.id]?.race;
  if (!race || race.answers < MIN_ANSWERS) return undefined;
  const you = { time: race.time, accuracy: Math.round((race.correct / race.answers) * 100) };
  const artem = { time: rivalSeconds(rival, questionsOf(chapter), chapter.points.length), accuracy: rival.accuracy };
  const faster = winner(you.time, artem.time, true, 30);
  const accurate = winner(you.accuracy, artem.accuracy, false, 0);
  const coins = (faster === 'you' ? RACE_COINS.faster : 0) + (accurate === 'you' ? RACE_COINS.accurate : 0);
  return { you, artem, faster, accurate, coins };
}

/** Подвести итог гонки при доставке: монеты начисляются один раз. */
export function settleRace(data: ProgressData, chapter: ChapterInfo, rival: Rival, now: number): RaceResult | undefined {
  const result = raceResult(data, chapter, rival);
  const race = data.chapters[chapter.id]?.race;
  if (!result || !race || race.settled) return result && { ...result, coins: 0 };
  race.settled = now;
  data.coins += result.coins;
  return result;
}

// ─── Побочные задания ────────────────────────────────────────────────────────────

export type SideStatus = 'none' | 'taken' | 'done';

export function sideStatus(data: ProgressData, chapterId: string): SideStatus {
  const side = data.chapters[chapterId]?.side;
  return !side ? 'none' : side.done ? 'done' : 'taken';
}

/** Следующая остановка задания (0 — забрать, 1 — отвезти). */
export function sideStep(data: ProgressData, chapterId: string): number {
  return data.chapters[chapterId]?.side?.step ?? 0;
}

export function acceptSide(data: ProgressData, chapterId: string): void {
  const state = chapterState(data, chapterId);
  state.side ??= { step: 0 };
}

export interface SideOutcome {
  done: boolean;
  coins: number;
  xp: number;
  levelUp?: LevelInfo;
}

/** Машина у отметки задания: следующая остановка или задание выполнено (награда один раз). */
export function advanceSide(data: ProgressData, chapterId: string, now: number): SideOutcome {
  const state = chapterState(data, chapterId);
  const side = (state.side ??= { step: 0 });
  if (side.done) return { done: true, coins: 0, xp: 0 };
  side.step = Math.min(2, side.step + 1);
  if (side.step < 2) return { done: false, coins: 0, xp: 0 };
  side.done = now;
  data.coins += SIDE_REWARD.coins;
  return { done: true, coins: SIDE_REWARD.coins, xp: SIDE_REWARD.xp, levelUp: gain(data, SIDE_REWARD.xp) };
}
