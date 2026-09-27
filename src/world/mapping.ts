/**
 * Где в игре встречается каждый вопрос (data/mapping.json): глава, точка на карте,
 * шаблон сцены и параметры сцены. Проверяется скриптом `npm run coverage`.
 */
import type { CityMap } from './map.ts';
import { testDistrict } from './maps/testDistrict.ts';
import type { SceneParams, TemplateId } from './templates.ts';

export interface Chapter {
  id: string;
  title: string;
  /** Карта района, на которой проходит глава. */
  map: string;
}

export interface Placement {
  /** id вопроса из data/questions.json. */
  id: string;
  chapter: string;
  /** id точки интереса на карте главы. */
  point: string;
  template: TemplateId;
  params: SceneParams;
  /** Размещено автоматически по теме (черновик до этапа 3); false — подобрано вручную. */
  auto: boolean;
}

export interface Mapping {
  chapters: Chapter[];
  questions: Placement[];
}

export const MAPS: Record<string, CityMap> = {
  [testDistrict.id]: testDistrict,
};

/** Очереди вопросов по точкам главы: сначала подобранные вручную, потом по порядку билетов. */
export function pointQueues(mapping: Mapping, chapterId: string): Map<string, Placement[]> {
  const queues = new Map<string, Placement[]>();
  for (const placement of mapping.questions) {
    if (placement.chapter !== chapterId) continue;
    const queue = queues.get(placement.point) ?? [];
    queue.push(placement);
    queues.set(placement.point, queue);
  }
  for (const queue of queues.values()) {
    queue.sort((a, b) => Number(a.auto) - Number(b.auto) || a.id.localeCompare(b.id));
  }
  return queues;
}
