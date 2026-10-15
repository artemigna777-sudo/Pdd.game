import { answerFeedback, vibrateError } from '../audio/feedback.ts';
import { EXPLANATIONS_SOURCE } from '../config.ts';
import { imageUrl } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import { el } from './dom.ts';
import { partnerBlock } from './partnerVideo.ts';
import { answerThemed, currentQTheme, dressCard, revealThemed } from './qthemes/index.ts';

export interface AnswerResult {
  question: Question;
  chosen: number;
  isCorrect: boolean;
}

/**
 * Карточка вопроса: оригинальный текст, картинка билета и варианты ответа без изменений.
 * После выбора подсвечивает правильный и выбранный варианты и показывает пояснение (если есть)
 * с указанием источника.
 *
 * С `review` карточка сразу показывает уже данный ответ — для разбора пройденного билета.
 */
/**
 * Оригинальный вопрос билета: номер, тема, картинка, текст и варианты. Если выбрано оформление
 * вопросов (магазин, праздник, тема города) — карточка в нём; `streak` — показать серию.
 */
function cardShell(question: Question, onOption: (index: number) => void, extra: Node[] = [], streak = false) {
  const src = imageUrl(question);
  const buttons = question.options.map((text, index) =>
    el(
      'button',
      { class: 'option', type: 'button', onclick: () => onOption(index) },
      el('span', { class: 'option__num', 'aria-hidden': 'true' }, String(index + 1)),
      el('span', { class: 'option__text' }, text),
    ),
  );
  const card = el(
    'article',
    { class: 'card', 'aria-label': `Билет ${question.ticket}, вопрос ${question.number}`, 'data-ticket': question.ticket, 'data-number': question.number },
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
    ...extra,
  );
  const theme = dressCard(card, currentQTheme(), { streak });
  return { card, buttons, theme };
}

/**
 * Карточка вопроса на экзамене: верный ли ответ, не показывается. Касание варианта выбирает
 * его (выбор можно поменять), ответ принимает кнопка экрана.
 */
export function renderExamCard(question: Question, onSelect: (index: number) => void): HTMLElement {
  const { card, buttons } = cardShell(question, (index) => {
    buttons.forEach((b, i) => {
      b.classList.toggle('is-selected', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
    onSelect(index);
  });
  return card;
}

export function renderQuestionCard(
  question: Question,
  onAnswer?: (result: AnswerResult) => void,
  review?: { chosen: number },
): HTMLElement {
  const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const explanation = el('section', { class: 'explanation', 'aria-label': 'Пояснение', hidden: true });
  const { card, buttons, theme } = cardShell(question, (index) => choose(index), [feedback, explanation], !review);

  let answered = false;
  function choose(index: number) {
    if (answered) return;
    reveal(index);
    const ok = index === question.correct;
    // В оформлении — его звук, серия и эффекты; вибрация при ошибке — как обычно.
    if (theme) {
      answerThemed(card, theme, ok, buttons[index]);
      if (!ok) vibrateError();
    } else answerFeedback(ok);

    // Результат может оказаться ниже края экрана — показываем его, не уводя вопрос дальше, чем нужно.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedback.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });

    onAnswer?.({ question, chosen: index, isCorrect: index === question.correct });
  }

  function reveal(index: number) {
    answered = true;
    const isCorrect = index === question.correct;

    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === question.correct) button.classList.add('is-correct');
      else if (i === index) button.classList.add('is-wrong');
    });
    buttons[index]?.setAttribute('aria-pressed', 'true');

    const verdict = review
      ? isCorrect
        ? `Ваш ответ — ${index + 1}, верно.`
        : `Ваш ответ — ${index + 1}. Правильный — ${question.correct + 1}.`
      : isCorrect
        ? 'Верно!'
        : `Неверно. Правильный ответ — ${question.correct + 1}.`;
    feedback.className = `feedback ${isCorrect ? 'feedback--ok' : 'feedback--bad'}`;
    feedback.replaceChildren(el('strong', {}, verdict));
    if (theme) revealThemed(card, theme, isCorrect);

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
    // Ошибка в билете с видеоразбором партнёра — кнопка «Смотреть разбор» под пояснением.
    const video = isCorrect ? undefined : partnerBlock(question);
    if (video) {
      explanation.append(video);
      explanation.hidden = false;
    }
  }

  if (review) reveal(review.chosen);
  return card;
}
