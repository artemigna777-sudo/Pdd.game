/**
 * «Режимы» (этапы 10–13): дуэль, Знакодекс, один день Соколова и смена курьера.
 */
import type { ChapterData } from '../world/mapping.ts';
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

/** Выбор района: открытые главы (этапы 12–13). */
export function districtPicker(chapters: readonly ChapterData[], pick: (id: string) => void): HTMLElement {
  return el(
    'div',
    { class: 'districts' },
    ...chapters.map((c) =>
      el(
        'button',
        { class: 'district-btn', type: 'button', onclick: () => pick(c.id) },
        el('span', { class: 'district-btn__num' }, String(c.number)),
        el('span', { class: 'district-btn__body' }, el('span', { class: 'district-btn__title' }, c.district), el('span', { class: 'district-btn__meta' }, `Глава ${c.number}: ${c.title}`)),
      ),
    ),
  );
}
