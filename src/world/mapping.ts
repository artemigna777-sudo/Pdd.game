/**
 * Где в игре встречается каждый вопрос (data/mapping.json): глава, точка на карте её района,
 * шаблон сцены или мини-игры и параметры. Создаётся `npm run mapping`, проверяется
 * `npm run coverage`.
 */
import type { CityMap, MapPoint } from './map.ts';
import { DISTRICTS } from './maps/districts.ts';
import type { SceneParams, TemplateId } from './templates.ts';

/** Разобранная вручную сцена вопроса (data/scenes.json). */
export interface SceneEntry {
  template: TemplateId;
  params: SceneParams;
}

export interface ChapterData {
  id: string;
  number: number;
  title: string;
  /** Название района. */
  district: string;
  /** Карта района (src/world/maps/districts.ts). */
  map: string;
  topics: string[];
  /** Точки интереса на карте района. */
  points: MapPoint[];
}

export interface Placement {
  /** id вопроса из data/questions.json. */
  id: string;
  chapter: string;
  /** id точки интереса в главе. */
  point: string;
  /** Номер вопроса в серии точки, с 1. */
  step: number;
  template: TemplateId;
  params: SceneParams;
}

export interface Mapping {
  chapters: ChapterData[];
  questions: Placement[];
}

export const MAPS: Record<string, CityMap> = Object.fromEntries(DISTRICTS.map((m) => [m.id, m]));

/** Серии вопросов по точкам главы — в том порядке, в котором их задают. */
export function pointQueues(mapping: Mapping, chapterId: string): Map<string, Placement[]> {
  const queues = new Map<string, Placement[]>();
  for (const placement of mapping.questions) {
    if (placement.chapter !== chapterId) continue;
    queues.set(placement.point, [...(queues.get(placement.point) ?? []), placement]);
  }
  for (const queue of queues.values()) queue.sort((a, b) => a.step - b.step);
  return queues;
}

/** Точки главы по порядку и вопросы каждой точки (для подсчёта прогресса главы). */
export function chapterInfo(mapping: Mapping, chapterId: string): { id: string; points: { id: string; questions: string[] }[] } {
  const chapter = mapping.chapters.find((c) => c.id === chapterId);
  const queues = pointQueues(mapping, chapterId);
  return { id: chapterId, points: (chapter?.points ?? []).map((p) => ({ id: p.id, questions: (queues.get(p.id) ?? []).map((q) => q.id) })) };
}
