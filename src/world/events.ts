/**
 * Случайные события в пути (этап 7): сзади скорая с сиреной, на дорогу выкатился мяч, сменилась
 * погода. После события машина останавливается, и игра задаёт вопрос из базы по теме события —
 * в оригинальной карточке (правило 3). Вопросы для каждого события отобраны вручную по тексту
 * билетов; размещение вопросов в data/mapping.json от событий не меняется.
 */

export type EventKind = 'ambulance' | 'ball' | 'rain' | 'fog' | 'snow';

export interface RoadEvent {
  kind: EventKind;
  /** Заголовок карточки. */
  title: string;
  /** Что случилось — строка над вопросом. */
  intro: string;
  /** Вопросы из data/questions.json по теме события. */
  questions: string[];
}

export const EVENTS: Record<EventKind, RoadEvent> = {
  ambulance: {
    kind: 'ambulance',
    title: 'Сзади — скорая',
    intro: 'Скорая помощь с синими маячками и сиреной обогнала по встречной. Вопрос по теме:',
    // Тема «Специальные сигналы».
    questions: ['B12-Q14', 'B36-Q06', 'B22-Q06', 'B38-Q06', 'B06-Q15', 'B33-Q06', 'B11-Q06', 'B03-Q06'],
  },
  ball: {
    kind: 'ball',
    title: 'Мяч на дороге',
    intro: 'На дорогу выкатился мяч — пришлось резко тормозить. Вопрос о реакции и торможении:',
    questions: ['B01-Q20', 'B35-Q20', 'B11-Q20', 'B39-Q20', 'B20-Q19', 'B25-Q19', 'B31-Q20', 'B33-Q20'],
  },
  rain: {
    kind: 'rain',
    title: 'Пошёл дождь',
    intro: 'Начался дождь, дорога стала мокрой. Вопрос по теме:',
    questions: ['B22-Q20', 'B31-Q19', 'B29-Q19', 'B13-Q19', 'B36-Q19', 'B17-Q20'],
  },
  fog: {
    kind: 'fog',
    title: 'Туман',
    intro: 'Опустился густой туман. Вопрос по теме:',
    questions: ['B05-Q20', 'B10-Q17', 'B13-Q17', 'B20-Q17', 'B35-Q01', 'B14-Q01'],
  },
  snow: {
    kind: 'snow',
    title: 'Снегопад',
    intro: 'Пошёл снег, дорога стала скользкой. Вопрос по теме:',
    questions: ['B38-Q19', 'B07-Q19', 'B34-Q02', 'B39-Q17', 'B13-Q19', 'B36-Q19'],
  },
};

export const EVENT_KINDS = Object.keys(EVENTS) as EventKind[];

/** Сколько секунд езды до первого события и между событиями. */
export const EVENT_DELAY = { first: [45, 75], next: [80, 130] } as const;

/** Какое событие случится: не то же, что в прошлый раз; погода — реже. */
export function nextEventKind(last: EventKind | undefined, rnd: () => number): EventKind {
  const weights: Record<EventKind, number> = { ambulance: 3, ball: 3, rain: 2, fog: 1, snow: 1 };
  const pool = EVENT_KINDS.filter((k) => k !== last);
  let roll = rnd() * pool.reduce((sum, k) => sum + weights[k], 0);
  for (const k of pool) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return pool[pool.length - 1];
}

/**
 * Вопрос для события: сначала те, где последний ответ — ошибка, потом ещё не встречавшиеся,
 * потом остальные. Внутри группы — случайный, но не только что заданный.
 */
export function pickEventQuestion(
  kind: EventKind,
  state: (id: string) => { ok: boolean } | undefined,
  rnd: () => number,
  recent: readonly string[] = [],
): string {
  const ids = EVENTS[kind].questions;
  const fresh = ids.filter((id) => !recent.includes(id));
  const pool = fresh.length ? fresh : ids;
  const wrong = pool.filter((id) => state(id)?.ok === false);
  const unseen = pool.filter((id) => !state(id));
  const group = wrong.length ? wrong : unseen.length ? unseen : pool;
  return group[Math.floor(rnd() * group.length)];
}
