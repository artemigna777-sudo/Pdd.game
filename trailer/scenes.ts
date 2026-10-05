/**
 * Сценарий трейлера: подписи и отрезки записей игры (`video/clips/*.mp4`).
 * `from` — с какой секунды записи начинается отрезок, `duration` — сколько он длится.
 * Тексты без прошедшего времени о самом игроке: к игроку обращаемся без привязки к полу.
 */

export interface Shot {
  file: string;
  from: number;
  duration: number;
  /** Начало на общей шкале трейлера (считается ниже). */
  start: number;
}

export interface Scene {
  title: string;
  sub: string;
  clips: Shot[];
  /** Сцена без телефона: знакомство с героями. */
  cast?: boolean;
  start: number;
  duration: number;
}

type Draft = Omit<Scene, 'clips' | 'start' | 'duration'> & { clips?: [string, number, number][]; duration?: number };

const DRAFT: Draft[] = [
  { title: 'Развози посылки по **Светофорску**', sub: '10 районов · поток машин и пешеходов', clips: [['drive', 0.4, 4.2]] },
  { title: 'Вопросы — **прямо на дороге**', sub: 'Все 800 вопросов экзаменационных билетов', clips: [['question', 2.7, 2.6], ['question', 7.4, 3.6]] },
  { title: 'Ошибка? Увидишь **последствия**', sub: 'и сразу разбор: почему правильно иначе', clips: [['wrong', 1.2, 3.4], ['wrong', 6.8, 1.8]] },
  { title: 'Нарушение? Встречай **лейтенанта Соколова**', sub: 'Город замечает красный, скорость и пешеходов', clips: [['sokolov', 0.8, 5.0]] },
  { title: 'Сюжет: от первого дня за рулём **до экзамена**', sub: 'Герои возвращаются из главы в главу', cast: true, duration: 4.2 },
  { title: 'Выбирай ответы **в диалогах**', sub: 'и бери поручения у героев', clips: [['story', 0.2, 1.6], ['story', 7.0, 3.0]] },
  { title: '**Мини-игры**', sub: 'Аптечка, гараж, инспектор, автошкола', clips: [['firstaid', 4.0, 2.6], ['firstaid', 8.6, 2.2]] },
  { title: 'Звёзды, опыт и **гонка с Артёмом**', sub: 'и бонус за езду без нарушений', clips: [['rewards', 6.6, 1.2], ['rewards', 10.4, 3.6]] },
  { title: 'Собирай **Знакодекс**', sub: '126 знаков из билетов и награды за группы', clips: [['signs', 1.4, 2.4], ['signs', 4.6, 2.6]] },
  { title: '**Дуэль** с другом по ссылке', sub: '10 вопросов на скорость: кто лучше знает правила?', clips: [['duel', 5.0, 2.4], ['duel-win', 0.6, 3.0]] },
  { title: 'Один день **лейтенанта Соколова**', sub: 'Лови нарушителей на посту ДПС', clips: [['patrol', 0.6, 1.4], ['patrol', 3.1, 4.8]] },
  { title: '**Смена курьера** на время', sub: '5 минут, заказ за заказом, серия — до ×5', clips: [['courier', 4.8, 2.8], ['courier', 9.9, 3.2]] },
  { title: 'Финал — **экзамен как в ГИБДД**', sub: '20 вопросов · 20 минут', clips: [['exam', 1.2, 4.0]] },
  { title: 'Видна **готовность к экзамену**', sub: 'и какие ошибки повторить сегодня', clips: [['progress', 0.3, 3.0]] },
];

const INTRO = 3.2;
const OUTRO = 5.2;

let t = INTRO;
export const SCENES: Scene[] = DRAFT.map((d) => {
  const start = t;
  const clips: Shot[] = [];
  for (const [file, from, duration] of d.clips ?? []) {
    clips.push({ file, from, duration, start: +t.toFixed(2) });
    t += duration;
  }
  if (d.duration) t += d.duration;
  return { ...d, clips, start: +start.toFixed(2), duration: +(t - start).toFixed(2) };
});

export const TIMELINE = { intro: INTRO, outro: +t.toFixed(2), total: +(t + OUTRO).toFixed(2) };

/** Время на общей шкале трейлера, когда в записи `file` идёт секунда `second` (если этот момент попал в трейлер). */
export function at(file: string, second: number): number | undefined {
  for (const s of SCENES) for (const c of s.clips) if (c.file === file && second >= c.from && second <= c.from + c.duration) return +(c.start + second - c.from).toFixed(3);
  return undefined;
}
