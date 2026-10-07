/**
 * Окно «Вход для автора»: пароль к секретному экрану статистики. Верный пароль запоминается
 * на этом телефоне, после пяти неверных подряд вход закрывается на минуту.
 */
import { updateAdmin } from '../stats/admin.ts';
import { authorKey, lockedFor, passwordMatches, recordAttempt } from '../stats/author.ts';
import { showOverlay } from './cutscene.ts';
import { el } from './dom.ts';

const waitText = (ms: number) => `Слишком много попыток. Попробуй через ${Math.ceil(ms / 1000)} с.`;

/** Спросить пароль автора; `onSuccess` — после верного пароля. */
export function askAuthorPassword(onSuccess: () => void): void {
  const input = el('input', {
    class: 'field__input',
    type: 'password',
    autocomplete: 'current-password',
    autocapitalize: 'off',
    spellcheck: 'false',
    'aria-label': 'Пароль автора',
    'data-focus': true,
  });
  const error = el('p', { class: 'field__error', role: 'alert' });
  const submit = el('button', { class: 'btn btn--primary btn--lg', type: 'submit' }, 'Войти');
  const cancel = el('button', { class: 'btn btn--secondary', type: 'button' }, 'Отмена');
  const form = el(
    'form',
    { class: 'author-login', novalidate: true },
    el('p', { class: 'rewards__line' }, 'Статистика игры — только для автора. Введи пароль: на этом телефоне он запомнится.'),
    input,
    error,
    el('div', { class: 'modal__actions' }, submit, cancel),
  );
  const root = el('div', { class: 'cutscene cutscene--modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Вход для автора' }, el('div', { class: 'modal' }, el('h2', { class: 'modal__title' }, 'Вход для автора'), form));
  const close = showOverlay(root);
  cancel.onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const wait = lockedFor();
    if (wait) {
      error.textContent = waitText(wait);
      return;
    }
    submit.disabled = true;
    error.textContent = 'Проверяю…';
    const ok = await passwordMatches(input.value);
    recordAttempt(ok);
    submit.disabled = false;
    if (ok) {
      // Ключ для посредника статистики — из того же пароля.
      updateAdmin({ unlocked: true, key: await authorKey(input.value) });
      close();
      onSuccess();
      return;
    }
    const after = lockedFor();
    error.textContent = after ? waitText(after) : 'Неверный пароль.';
    input.select();
  };
}
