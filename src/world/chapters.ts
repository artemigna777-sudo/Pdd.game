/**
 * Главы: каждая — свой район города и свои темы билетов. Вопросы распределены по темам
 * примерно поровну (около 80 на главу). Сюжет глав — этап 4.
 */
import type { Question } from '../data/types.ts';

export interface ChapterSpec {
  id: string;
  number: number;
  title: string;
  /** Карта района (src/world/maps/districts.ts). */
  map: string;
  /** Темы билетов главы — для экрана выбора главы. */
  topics: string[];
}

export const CHAPTERS: ChapterSpec[] = [
  { id: 'ch1', number: 1, title: 'Первый день', map: 'school-town', topics: ['Общие положения', 'Общие обязанности водителей', 'Указатели поворота и аварийная сигнализация', 'Учебная езда'] },
  { id: 'ch2', number: 2, title: 'Знаки на каждом углу', map: 'quiet-quarter', topics: ['Дорожные знаки', 'Жилые зоны', 'Пешеходные переходы и остановки', 'Велосипедисты и мопеды', 'Приоритет маршрутных ТС'] },
  { id: 'ch3', number: 3, title: 'Светофоры и разметка', map: 'old-center', topics: ['Сигналы светофора и регулировщика', 'Дорожная разметка', 'Специальные сигналы'] },
  { id: 'ch4', number: 4, title: 'Манёвры', map: 'avenue', topics: ['Начало движения и маневрирование'] },
  { id: 'ch5', number: 5, title: 'Знаки и полосы', map: 'new-town', topics: ['Дорожные знаки', 'Расположение на проезжей части'] },
  { id: 'ch6', number: 6, title: 'Перекрёстки', map: 'cathedral-square', topics: ['Проезд перекрёстков', 'Первая помощь'] },
  { id: 'ch7', number: 7, title: 'Кто кому уступает', map: 'market-quarter', topics: ['Проезд перекрёстков', 'Ответственность водителя', 'Перевозка людей и грузов'] },
  { id: 'ch8', number: 8, title: 'За городом', map: 'suburbs', topics: ['Обгон, опережение, встречный разъезд', 'Скорость движения', 'Автомагистрали', 'Железнодорожные переезды'] },
  { id: 'ch9', number: 9, title: 'Стоянка и техосмотр', map: 'industrial-zone', topics: ['Остановка и стоянка', 'Неисправности и допуск ТС', 'Буксировка'] },
  { id: 'ch10', number: 10, title: 'Ночь и непогода', map: 'night-city', topics: ['Безопасность и техника управления', 'Световые приборы и звуковые сигналы'] },
];

/**
 * Вопросы, которые уходят из главы своей темы туда, где на карте есть нужное место:
 * переезды — только за городом (глава 8), автомагистраль — в главах 8 и 10.
 */
export const CHAPTER_MOVES: Record<string, string> = {
  'B02-Q09': 'ch8', // разворот перед переездом
  'B13-Q06': 'ch8', // светофор на переезде
  'B26-Q06': 'ch8', // красный мигающий на переезде
  'B02-Q15': 'ch10', // выезд мотоцикла на автомагистраль
  'B31-Q16': 'ch10', // учебная езда на автомагистрали
};

/** Глава вопроса: по теме (темы дорожных знаков и перекрёстков делятся по номеру билета). */
export function chapterOf(q: Question): string {
  const moved = CHAPTER_MOVES[q.id];
  if (moved) return moved;
  if (q.topic === 'Дорожные знаки') return q.ticket <= 20 ? 'ch2' : 'ch5';
  if (q.topic === 'Проезд перекрёстков') return q.ticket <= 20 ? 'ch6' : 'ch7';
  const chapter = CHAPTERS.find((c) => c.topics.includes(q.topic));
  if (!chapter) throw new Error(`${q.id}: у темы «${q.topic}» нет главы`);
  return chapter.id;
}
