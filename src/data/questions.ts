import type { Question } from './types.ts';

let cache: Promise<Question[]> | undefined;

/** Загружает базу вопросов (отдельный файл сборки, чтобы стартовый экран открывался быстрее). */
export function loadQuestions(): Promise<Question[]> {
  cache ??= import('../../data/questions.json').then((m) => m.default as Question[]);
  return cache;
}

/** Адрес картинки билета с учётом базового пути сайта. */
export function imageUrl(question: Question): string | undefined {
  return question.image ? import.meta.env.BASE_URL + question.image : undefined;
}
