import { el } from './dom.ts';

interface ToastOptions {
  action?: string;
  onAction?: () => void;
  /** Не скрывать автоматически (например, «доступна новая версия»). */
  persistent?: boolean;
}

let hideTimer: number | undefined;
/**
 * Постоянное уведомление («доступна новая версия»). Короткие уведомления его не затирают:
 * когда короткое скроется, постоянное вернётся. Убирают его только кнопки самого уведомления.
 */
let sticky: { message: string; options: ToastOptions } | undefined;

/** Короткое уведомление внизу экрана. */
export function showToast(message: string, options: ToastOptions = {}): void {
  const root = document.getElementById('toast');
  if (!root) return;
  window.clearTimeout(hideTimer);
  if (options.persistent) sticky = { message, options };
  const own = options.persistent;

  const hide = () => {
    if (own) sticky = undefined;
    root.classList.remove('is-visible');
    // Короткое уведомление скрылось — вернуть постоянное, если оно было.
    if (!own && sticky) showToast(sticky.message, sticky.options);
  };
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
  if (!own) hideTimer = window.setTimeout(hide, 4000);
}
