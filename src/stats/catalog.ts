/**
 * Что спрашивать у открытого счётчика для экрана статистики: адреса экранов и имена событий,
 * которые отправляет игра (`trackView` в `src/ui/app.ts`, `trackEvent` по всей игре).
 * Автотест сверяет список событий с вызовами `trackEvent` в коде.
 */

/** Экраны игры (без глав в городе — они в «Сюжете»). */
export const SCREENS: readonly (readonly [path: string, title: string])[] = [
  ['/', 'Меню'],
  ['/chapters', 'Главы'],
  ['/tickets', 'Билеты'],
  ['/exam', 'Экзамен'],
  ['/review', 'Разбор ошибок'],
  ['/progress', 'Прогресс'],
  ['/plan', 'Мой экзамен'],
  ['/modes', 'Режимы'],
  ['/duel', 'Дуэль'],
  ['/duel-invite', 'Дуэль: вызов по ссылке'],
  ['/signs', 'Знакодекс'],
  ['/patrol', 'Пост ДПС'],
  ['/courier', 'Смена курьера'],
  ['/garage', 'Гараж'],
  ['/settings', 'Настройки'],
];

/** События (кроме «глава пройдена» — она в «Сюжете»). */
export const EVENTS: readonly (readonly [name: string, title: string])[] = [
  ['new-player', 'Новый игрок'],
  ['home-screen', 'Открыли игру с главного экрана'],
  ['install', 'Установили игру на телефон'],
  ['exam-pass', 'Тренировочный экзамен сдан'],
  ['exam-fail', 'Тренировочный экзамен не сдан'],
  ['boss-pass', 'Экзамен-босс сдан'],
  ['boss-fail', 'Экзамен-босс не сдан'],
  ['duel-challenge', 'Дуэль: отправили вызов'],
  ['duel-reply', 'Дуэль: отправили ответ'],
  ['plan-date', 'Указали дату экзамена'],
  ['real-exam-pass', 'Сдали экзамен в ГИБДД'],
  ['real-exam-fail', 'Не сдали экзамен в ГИБДД'],
];

/** Глава в городе и событие «глава пройдена». */
export const chapterPath = (id: string) => `/city/${id}`;
export const chapterDone = (id: string) => `chapter-done/${id}`;
export const FINALE = '/finale';

/** Все адреса и события, которые спрашиваем у счётчика. */
export function trackedPaths(chapterIds: string[]): string[] {
  return [...chapterIds.flatMap((id) => [chapterPath(id), chapterDone(id)]), FINALE, ...SCREENS.map(([p]) => p), ...EVENTS.map(([e]) => e)];
}
