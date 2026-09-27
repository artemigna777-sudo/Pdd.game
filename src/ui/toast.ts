import { el } from './dom.ts';

interface ToastOptions {
  action?: string;
  onAction?: () => void;
  /** Не скрывать автоматически (например, «доступна новая версия»). */
  persistent?: boolean;
}

let hideTimer: number | undefined;

/** Короткое уведомление внизу экрана. */
export function showToast(message: string, options: ToastOptions = {}): void {
  const root = document.getElementById('toast');
  if (!root) return;
  window.clearTimeout(hideTimer);

  const hide = () => root.classList.remove('is-visible');
  root.replaceChildren(el('span', { class: 'toast__text' }, message));
  if (options.action) {
    const onclick = () => {
      hide();
      options.onAction?.();
    };
    root.append(el('button', { class: 'toast__action', type: 'button', onclick }, options.action));
  }
  root.append(el('button', { class: 'toast__close', type: 'button', 'aria-label': 'Закрыть', onclick: hide }, '×'));
  root.classList.add('is-visible');
  if (!options.persistent) hideTimer = window.setTimeout(hide, 4000);
}
