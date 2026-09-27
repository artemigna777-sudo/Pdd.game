/**
 * Сюжетные сцены поверх игры: реплики персонажей по одной, с аватаркой и именем.
 * «Далее» — следующая реплика, «Пропустить» — сразу к концу. Закрывается при смене экрана.
 */
import { CHARACTERS, type Line } from '../story/story.ts';
import { el } from './dom.ts';

let current: HTMLElement | undefined;

/**
 * Закрыть открытую сцену или окно при уходе с экрана. Промис сцены при этом не выполняется:
 * то, что ждало конца сцены, относится к закрытому экрану и продолжаться не должно.
 */
export function closeOverlay(): void {
  current?.remove();
  current = undefined;
}

function mount(root: HTMLElement) {
  closeOverlay();
  current = root;
  document.body.append(root);
  root.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
}

function unmount(root: HTMLElement) {
  if (current === root) current = undefined;
  root.remove();
}

/** Показать реплики по одной. Промис выполняется, когда сцена закончилась или пропущена. */
export function playCutscene(lines: readonly Line[], opts: { last?: string } = {}): Promise<void> {
  if (!lines.length) return Promise.resolve();
  return new Promise((resolve) => {
    let index = 0;
    const avatar = el('span', { class: 'avatar', 'aria-hidden': 'true' });
    const name = el('span', { class: 'cutscene__name' });
    const role = el('span', { class: 'cutscene__role' });
    const who = el('div', { class: 'cutscene__who' }, avatar, el('span', { class: 'cutscene__names' }, name, role));
    const count = el('span', { class: 'cutscene__count' });
    const textEl = el('p', { class: 'cutscene__text', 'aria-live': 'polite' });
    const next = el('button', { class: 'btn btn--primary', type: 'button', 'data-focus': true });
    const skip = el('button', { class: 'btn btn--quiet', type: 'button' }, 'Пропустить');
    const card = el('div', { class: 'cutscene__card' }, el('div', { class: 'cutscene__head' }, who, count), textEl, el('div', { class: 'cutscene__actions' }, skip, next));
    const root = el('div', { class: 'cutscene', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Сюжет' }, card);

    const finish = () => {
      unmount(root);
      resolve();
    };
    const show = () => {
      const line = lines[index];
      const narrator = line.who === 'narrator';
      const c = narrator ? undefined : CHARACTERS[line.who as keyof typeof CHARACTERS];
      who.hidden = narrator;
      if (c) {
        avatar.textContent = c.initials;
        avatar.style.background = c.color;
        name.textContent = c.name;
        role.textContent = c.role;
      }
      textEl.classList.toggle('is-narrator', narrator);
      textEl.textContent = line.text;
      count.textContent = lines.length > 1 ? `${index + 1}/${lines.length}` : '';
      const last = index === lines.length - 1;
      next.textContent = last ? (opts.last ?? 'Поехали') : 'Далее';
      skip.hidden = last;
      card.classList.remove('is-in');
      void card.offsetWidth;
      card.classList.add('is-in');
    };
    next.addEventListener('click', () => {
      if (index < lines.length - 1) {
        index++;
        show();
      } else finish();
    });
    skip.addEventListener('click', finish);
    // Касание текста — тоже «Далее»: читать и листать одним пальцем.
    textEl.addEventListener('click', () => next.click());
    show();
    mount(root);
  });
}

export interface ModalAction {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

/** Окно поверх игры (награды главы и т. п.). Промис выполняется после нажатия любой кнопки. */
export function showModal(title: string, body: HTMLElement, actions: ModalAction[]): Promise<void> {
  return new Promise((resolve) => {
    const root = el('div', { class: 'cutscene cutscene--modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const buttons = actions.map((a, i) =>
      el(
        'button',
        {
          class: `btn ${a.primary ? 'btn--primary btn--lg' : 'btn--secondary'}`,
          type: 'button',
          'data-focus': i === 0,
          onclick: () => {
            unmount(root);
            resolve();
            a.onClick?.();
          },
        },
        a.label,
      ),
    );
    root.append(el('div', { class: 'modal' }, el('h2', { class: 'modal__title' }, title), body, el('div', { class: 'modal__actions' }, ...buttons)));
    mount(root);
  });
}
