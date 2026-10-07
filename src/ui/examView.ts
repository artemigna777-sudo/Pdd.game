/**
 * Экраны экзамена: правила, история попыток, результат с разбором.
 */
import type { Question } from '../data/types.ts';
import { EXAM_RULES, FAIL_TEXT } from '../exam/exam.ts';
import { answeredAt, type ExamAttempt } from '../exam/examHistory.ts';
import { el } from './dom.ts';
import { dayLabel, durationLabel, plural, timeLabel } from './format.ts';
import { answerDetails } from './ticketHistoryView.ts';

/** Правила экзамена одним блоком. */
export function examRulesView(): HTMLElement {
  const r = EXAM_RULES;
  return el(
    'section',
    { class: 'panel exam-rules' },
    el('h2', { class: 'panel__title' }, `${r.questions} вопросов · ${r.minutes} минут`),
    el('p', { class: 'panel__note' }, 'Как в ГИБДД: вопросы из официальных билетов, 4 блока по 5 вопросов (1–5, 6–10, 11–15, 16–20).'),
    el(
      'ul',
      { class: 'rules' },
      el('li', { class: 'rules__ok' }, 'Без ошибок — экзамен сдан.'),
      el(
        'li',
        { class: 'rules__warn' },
        `Одна ошибка или две в разных блоках — по ${r.extraQuestions} дополнительных вопросов из блока каждой ошибки и по ${r.extraMinutes} минут. В дополнительных вопросах ошибаться нельзя.`,
      ),
      el('li', { class: 'rules__bad' }, 'Две ошибки в одном блоке, три ошибки или конец времени — не сдан.'),
    ),
    el('p', { class: 'panel__note' }, 'Как в ГИБДД: вопрос можно пропустить и вернуться к нему позже — по номерам вверху, но подтверждённый ответ изменить нельзя. Во время экзамена не видно, верен ли ответ. Разбор ошибок — после экзамена.'),
  );
}

const resultText = (a: ExamAttempt) => (a.passed ? 'Сдан' : 'Не сдан');
const mistakes = (a: ExamAttempt, byId: Map<string, Question>) => a.chosen.filter((c, i) => answeredAt(a, i) && c !== byId.get(a.items[i])?.correct).length;

/** Список прошлых экзаменов. */
export function examHistoryView(attempts: readonly ExamAttempt[], byId: Map<string, Question>, onOpen: (a: ExamAttempt) => void): HTMLElement {
  if (!attempts.length) return el('p', { class: 'panel__note' }, 'Экзаменов ещё не было.');
  const passed = attempts.filter((a) => a.passed).length;
  const rows = [...attempts]
    .reverse()
    .slice(0, 30)
    .map((a) => {
      const m = mistakes(a, byId);
      return el(
        'button',
        { class: 'attempt-row', type: 'button', onclick: () => onOpen(a) },
        el('span', { class: `score-badge ${a.passed ? 'tone-ok' : 'tone-bad'}` }, a.passed ? '✓' : '✕'),
        el(
          'span',
          { class: 'attempt-row__body' },
          el('span', { class: 'attempt-row__title' }, `${resultText(a)}${a.boss ? ' · экзамен-босс' : ''}`),
          el(
            'span',
            { class: 'attempt-row__meta' },
            [
              `${dayLabel(a.at)}, ${timeLabel(a.at)}`,
              m ? `${m} ${plural(m, ['ошибка', 'ошибки', 'ошибок'])}` : 'без ошибок',
              a.reason ? FAIL_TEXT[a.reason].replace(/\.$/, '').toLowerCase() : '',
            ]
              .filter(Boolean)
              .join(' · '),
          ),
        ),
      );
    });
  return el(
    'div',
    {},
    el('p', { class: 'panel__note' }, `Экзаменов: ${attempts.length}, сдано: ${passed}.`),
    el('div', { class: 'attempts' }, ...rows),
  );
}

/** Результат экзамена и разбор всех ответов. */
export function examResultView(a: ExamAttempt, byId: Map<string, Question>): HTMLElement {
  const main = a.items.length - a.extra;
  const places = a.items.map((_, i) => i);
  const right = (i: number) => answeredAt(a, i) && a.chosen[i] === byId.get(a.items[i])?.correct;
  const answeredMain = places.filter((i) => i < main && answeredAt(a, i)).length;
  const rightMain = places.filter((i) => i < main && right(i)).length;
  const answeredExtra = places.filter((i) => i >= main && answeredAt(a, i)).length;
  const rightExtra = places.filter((i) => i >= main && right(i)).length;
  const left = a.items.length - answeredMain - answeredExtra;
  // Пропущенные вопросы, на которые так и не ответили (до последнего отвеченного).
  const skipped = places.filter((i) => i < main && i < a.chosen.length && !answeredAt(a, i)).map((i) => i + 1);

  const lines = [
    `Основные вопросы: верно ${rightMain} из ${answeredMain}${answeredMain < main ? ` (отвечено ${answeredMain} из ${main})` : ''}.`,
    a.extra ? `Дополнительные: верно ${rightExtra} из ${answeredExtra}${answeredExtra < a.extra ? ` (отвечено ${answeredExtra} из ${a.extra})` : ''}.` : '',
    skipped.length ? `Пропущены и остались без ответа: ${skipped.length === 1 ? 'вопрос' : 'вопросы'} ${skipped.join(', ')}.` : '',
    `Время: ${durationLabel(a.ms)}.`,
    left && !a.passed && a.reason !== 'time' ? `Экзамен закончился досрочно: результат уже был ясен.` : '',
  ].filter(Boolean);

  const answers = places
    .filter((i) => answeredAt(a, i))
    .map((i) => answerDetails(byId.get(a.items[i])!, a.chosen[i], i < main ? `Вопрос ${i + 1}` : `Дополнительный ${i - main + 1}`));

  return el(
    'div',
    { class: 'attempt' },
    el(
      'section',
      { class: `result exam-result ${a.passed ? 'is-passed' : 'is-failed'}` },
      el('p', { class: 'exam-result__verdict' }, a.passed ? 'Экзамен сдан!' : 'Экзамен не сдан'),
      a.reason ? el('p', { class: 'result__label' }, FAIL_TEXT[a.reason]) : null,
      el('p', { class: 'result__meta' }, `${dayLabel(a.at)}, ${timeLabel(a.at)}`),
      ...lines.map((t) => el('p', { class: 'result__note' }, t)),
    ),
    el(
      'section',
      { class: 'review', 'aria-label': 'Ваши ответы' },
      el('h2', { class: 'section-title' }, 'Ваши ответы'),
      el('p', { class: 'review__hint' }, 'Ошибки раскрыты. Нажмите на вопрос, чтобы посмотреть его целиком.'),
      el('div', { class: 'answers' }, ...answers),
    ),
  );
}
