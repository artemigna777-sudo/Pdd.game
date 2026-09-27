import type { Mapping } from '../world/mapping.ts';
import type { Question } from './types.ts';

let cache: Promise<Question[]> | undefined;
let mappingCache: Promise<Mapping> | undefined;

/** Загружает базу вопросов (отдельный файл сборки, чтобы стартовый экран открывался быстрее). */
export function loadQuestions(): Promise<Question[]> {
  cache ??= import('../../data/questions.json').then((m) => m.default as Question[]);
  return cache;
}

/** Где в игре встречается каждый вопрос (data/mapping.json). */
export function loadMapping(): Promise<Mapping> {
  mappingCache ??= import('../../data/mapping.json').then((m) => m.default as unknown as Mapping);
  return mappingCache;
}

/** Адрес картинки билета с учётом базового пути сайта. */
export function imageUrl(question: Question): string | undefined {
  return question.image ? import.meta.env.BASE_URL + question.image : undefined;
}
