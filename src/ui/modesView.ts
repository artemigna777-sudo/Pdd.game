/**
 * «Режимы» (этапы 10–13): дуэль, Знакодекс, один день Соколова и смена курьера.
 */
import { el } from './dom.ts';

export interface ModeCard {
  icon: string;
  title: string;
  text: string;
  /** Строка статуса: счёт, коллекция, рекорд. */
  status?: string;
  open: () => void;
}

export function modesView(cards: readonly ModeCard[]): HTMLElement {
  return el(
    'div',
    { class: 'modes' },
    ...cards.map((c) =>
      el(
        'button',
        { class: 'mode-card', type: 'button', onclick: c.open },
        el('span', { class: 'mode-card__icon', 'aria-hidden': 'true' }, c.icon),
        el(
          'span',
          { class: 'mode-card__body' },
          el('span', { class: 'mode-card__title' }, c.title),
          el('span', { class: 'mode-card__text' }, c.text),
          c.status ? el('span', { class: 'mode-card__status' }, c.status) : null,
        ),
      ),
    ),
  );
}
