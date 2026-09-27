import { EXPLANATIONS_SOURCE } from '../config.ts';
import { imageUrl } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import { el } from './dom.ts';

export interface AnswerResult {
  question: Question;
  chosen: number;
  isCorrect: boolean;
}

/**
 * Карточка вопроса: оригинальный текст, картинка билета и варианты ответа без изменений.
 * После выбора подсвечивает правильный и выбранный варианты и показывает пояснение (если есть)
 * с указанием источника.
 */
export function renderQuestionCard(question: Question, onAnswer: (result: AnswerResult) => void): HTMLElement {
  const src = imageUrl(question);
  const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const explanation = el('section', { class: 'explanation', 'aria-label': 'Пояснение', hidden: true });

  const buttons = question.options.map((text, index) =>
    el(
      'button',
      { class: 'option', type: 'button', onclick: () => choose(index) },
      el('span', { class: 'option__num', 'aria-hidden': 'true' }, String(index + 1)),
      el('span', { class: 'option__text' }, text),
    ),
  );

  const card = el(
    'article',
    { class: 'card', 'aria-label': `Билет ${question.ticket}, вопрос ${question.number}` },
    el(
      'div',
      { class: 'card__meta' },
      el('span', {}, `Билет ${question.ticket} · Вопрос ${question.number}`),
      el('span', { class: 'chip' }, question.topic),
    ),
    src
      ? el(
          'figure',
          { class: 'card__image' },
          el('img', { src, alt: 'Иллюстрация к вопросу из билета', width: 480, height: 180, decoding: 'async' }),
        )
      : null,
    el('h2', { class: 'card__text' }, question.text),
    el('ol', { class: 'options' }, ...buttons.map((b) => el('li', {}, b))),
    feedback,
    explanation,
  );

  let answered = false;
  function choose(index: number) {
    if (answered) return;
    answered = true;
    const isCorrect = index === question.correct;

    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === question.correct) button.classList.add('is-correct');
      else if (i === index) button.classList.add('is-wrong');
    });
    buttons[index].setAttribute('aria-pressed', 'true');

    feedback.className = `feedback ${isCorrect ? 'feedback--ok' : 'feedback--bad'}`;
    feedback.replaceChildren(el('strong', {}, isCorrect ? 'Верно!' : `Неверно. Правильный ответ — ${question.correct + 1}.`));

    if (question.explanation) {
      explanation.replaceChildren(
        el('h3', { class: 'explanation__title' }, 'Почему так'),
        el('p', { class: 'explanation__text' }, question.explanation),
        el(
          'p',
          { class: 'explanation__source' },
          'Пояснение: ',
          el('a', { href: EXPLANATIONS_SOURCE.url, target: '_blank', rel: 'noopener' }, EXPLANATIONS_SOURCE.name),
        ),
      );
      explanation.hidden = false;
    }

    // Результат может оказаться ниже края экрана — показываем его, не уводя вопрос дальше, чем нужно.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedback.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });

    onAnswer({ question, chosen: index, isCorrect });
  }

  return card;
}
