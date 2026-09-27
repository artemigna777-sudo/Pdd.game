import { attemptsOfTicket, type TicketAttempt } from '../data/ticketHistory.ts';
import type { Question } from '../data/types.ts';
import { el } from './dom.ts';
import { dayLabel, durationLabel, mistakesText, plural, timeLabel, toneOf } from './format.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard } from './questionCard.ts';

function icon(name: keyof typeof ICONS, cls: string): HTMLElement {
  const span = el('span', { class: cls, 'aria-hidden': 'true' });
  span.innerHTML = ICONS[name];
  return span;
}

/** Вопросы билета по порядку номеров — в этом же порядке сохранены ответы попытки. */
export function ticketQuestions(all: readonly Question[], ticket: number): Question[] {
  return all.filter((q) => q.ticket === ticket).sort((a, b) => a.number - b.number);
}

/** Результат «18/20» с цветом: без ошибок, 1–2 ошибки, больше. */
export function scoreBadge(attempt: TicketAttempt, cls = 'score-badge'): HTMLElement {
  const total = attempt.answers.length;
  return el('span', { class: `${cls} tone-${toneOf(total - attempt.correct)}` }, `${attempt.correct}/${total}`);
}

/** Список всех попыток по дням, от новых к старым. */
export function historyView(
  attempts: readonly TicketAttempt[],
  totalTickets: number,
  onOpen: (attempt: TicketAttempt) => void,
  onEmpty: () => void,
): HTMLElement {
  if (attempts.length === 0) {
    return el(
      'div',
      { class: 'empty' },
      el('p', {}, 'Пока нет пройденных билетов. Результат появится здесь, когда вы ответите на все вопросы билета.'),
      el('button', { class: 'btn btn--primary', type: 'button', onclick: onEmpty }, 'К билетам'),
    );
  }

  const tickets = new Set(attempts.map((a) => a.ticket)).size;
  const now = Date.now();
  const days = new Map<string, TicketAttempt[]>();
  for (const attempt of [...attempts].sort((a, b) => b.at - a.at)) {
    const day = dayLabel(attempt.at, now);
    days.set(day, [...(days.get(day) ?? []), attempt]);
  }

  return el(
    'div',
    { class: 'history' },
    el(
      'p',
      { class: 'intro' },
      `Пройдено билетов: ${tickets} из ${totalTickets}. Всего ${attempts.length} ${plural(attempts.length, ['попытка', 'попытки', 'попыток'])}.`,
    ),
    ...[...days].map(([day, list]) =>
      el(
        'section',
        { class: 'history__day' },
        el('h2', { class: 'section-title' }, day),
        el(
          'ul',
          { class: 'attempts' },
          ...list.map((attempt) => {
            const mistakes = attempt.answers.length - attempt.correct;
            // Неразрывные пробелы внутри частей: строка переносится только между ними.
            const meta = [timeLabel(attempt.at), durationLabel(attempt.ms), mistakesText(mistakes)]
              .map((part) => part.replaceAll(' ', '\u00A0'))
              .join(' · ');
            return el(
              'li',
              {},
              el(
                'button',
                {
                  class: 'attempt-row',
                  type: 'button',
                  'aria-label': `Билет ${attempt.ticket}: ${attempt.correct} из ${attempt.answers.length}, ${meta}`,
                  onclick: () => onOpen(attempt),
                },
                scoreBadge(attempt),
                el(
                  'span',
                  { class: 'attempt-row__body' },
                  el('span', { class: 'attempt-row__title' }, `Билет ${attempt.ticket}`),
                  el('span', { class: 'attempt-row__meta' }, meta),
                ),
                icon('chevron', 'attempt-row__chev'),
              ),
            );
          }),
        ),
      ),
    ),
  );
}

/** Результат попытки и разбор: что выбрано в каждом вопросе и какой ответ правильный. */
export function attemptView(attempt: TicketAttempt, questions: readonly Question[], history: readonly TicketAttempt[]): HTMLElement {
  const total = attempt.answers.length;
  const rows = questions.map((question, i) => ({ question, chosen: attempt.answers[i] ?? -1 }));
  const wrong = rows.filter((r) => r.chosen !== r.question.correct).map((r) => r.question.number);

  const same = attemptsOfTicket(history, attempt.ticket);
  const index = same.findIndex((a) => a.at === attempt.at);
  const best = Math.max(...same.map((a) => a.correct));
  const note =
    same.length > 1
      ? `Попытка ${index + 1} из ${same.length} для этого билета. Лучший результат — ${best} из ${total}.`
      : 'Первая попытка этого билета.';

  const summary = el(
    'section',
    { class: 'result' },
    el('p', { class: `result__score tone-${toneOf(total - attempt.correct)}` }, String(attempt.correct), el('span', {}, ` из ${total}`)),
    el('p', { class: 'result__label' }, 'правильных ответов'),
    el('p', { class: 'result__meta' }, `${dayLabel(attempt.at)}, ${timeLabel(attempt.at)} · ${durationLabel(attempt.ms)}`),
    el(
      'p',
      { class: 'result__mistakes' },
      wrong.length === 0 ? 'Без ошибок!' : wrong.length === 1 ? `Ошибка в вопросе ${wrong[0]}` : `Ошибки в вопросах ${wrong.join(', ')}`,
    ),
    el('p', { class: 'result__note' }, note),
  );

  // Полоска из квадратиков — картина всего билета одним взглядом; подробности в списке ниже.
  const dots = el(
    'ol',
    { class: 'dots', 'aria-hidden': 'true' },
    ...rows.map((r) => el('li', { class: `dot ${r.chosen === r.question.correct ? 'is-ok' : 'is-bad'}` }, String(r.question.number))),
  );

  const answers = rows.map(({ question, chosen }) => {
    const ok = chosen === question.correct;
    const body = el('div', { class: 'answer__card' });
    const details = el(
      'details',
      { class: `answer ${ok ? 'is-ok' : 'is-bad'}`, open: !ok },
      el(
        'summary',
        { class: 'answer__head' },
        icon(ok ? 'check' : 'close', 'answer__mark'),
        el(
          'span',
          { class: 'answer__body' },
          el('span', { class: 'answer__title' }, `Вопрос ${question.number} — ${ok ? 'верно' : 'ошибка'}`),
          el('span', { class: 'answer__text' }, question.text),
        ),
        icon('chevron', 'answer__chev'),
      ),
      body,
    );
    // Карточку с картинкой собираем, только когда вопрос раскрыт: 20 картинок сразу ни к чему.
    const build = () => {
      if (details.open && !body.hasChildNodes()) body.append(renderQuestionCard(question, undefined, { chosen }));
    };
    details.addEventListener('toggle', build);
    build();
    return details;
  });

  return el(
    'div',
    { class: 'attempt' },
    summary,
    el(
      'section',
      { class: 'review', 'aria-label': 'Ваши ответы' },
      el('h2', { class: 'section-title' }, 'Ваши ответы'),
      dots,
      el('p', { class: 'review__hint' }, 'Нажмите на вопрос, чтобы посмотреть его целиком.'),
      el('div', { class: 'answers' }, ...answers),
    ),
  );
}
