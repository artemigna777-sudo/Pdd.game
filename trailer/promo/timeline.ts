/**
 * Ролик для страницы в RuStore: 46 секунд, 120 ударов в минуту — смена сцен на сильную долю (такт — 2 с).
 * Отсюда берут время и композиция (`build.ts`), и музыка (`music.ts`).
 */

export const BPM = 120;
export const BEAT = 60 / BPM;

/** Начало сцен, секунды. */
export const T = {
  hook: 0,
  logo: 4,
  question: 8,
  wrong: 12,
  story: 16,
  modes: 24,
  exam: 30,
  ready: 34,
  end: 38,
  total: 46,
};

/** Моменты внутри сцен, на которые попадают звуки. */
export const CUES = {
  /** «800» досчитало. */
  count: 0.95,
  /** «Зубрить?» зачёркнуто. */
  strike: 1.75,
  /** «ПРОЕХАТЬ» — удар. */
  slam: 3.0,
  /** Верный ответ в вопросе на перекрёстке. */
  right: T.question + 3.0,
  /** Неверный ответ. */
  wrong: T.wrong + 1.3,
  /** Смена кадров сюжета. */
  story: [T.story, T.story + 1.5, T.story + 3, T.story + 4.5, T.story + 6],
  /** Карточки режимов. */
  modes: [T.modes, T.modes + 1.5, T.modes + 3, T.modes + 4.5],
  /** Готовность дошла до 100%. */
  full: T.ready + 2.8,
};
