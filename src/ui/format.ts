/** Форма слова для числа: plural(2, ['ошибка', 'ошибки', 'ошибок']) → 'ошибки'. */
export function plural(n: number, [one, few, many]: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const mistakesText = (n: number): string => (n === 0 ? 'без ошибок' : `${n} ${plural(n, ['ошибка', 'ошибки', 'ошибок'])}`);

/** Оценка результата билета: без ошибок, 1–2 ошибки, 3 и больше. */
export type Tone = 'ok' | 'warn' | 'bad';
export const toneOf = (mistakes: number): Tone => (mistakes === 0 ? 'ok' : mistakes <= 2 ? 'warn' : 'bad');

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** «Сегодня», «Вчера», «25 сентября» или «25 сентября 2025 г.» для прошлых лет. */
export function dayLabel(ts: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
}

/** «14:05». */
export const timeLabel = (ts: number): string => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** Длительность прохождения: «меньше минуты», «6 мин», «1 ч 5 мин». */
export function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'меньше минуты';
  if (minutes < 60) return `${minutes} мин`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} ч ${rest} мин` : `${minutes / 60} ч`;
}
