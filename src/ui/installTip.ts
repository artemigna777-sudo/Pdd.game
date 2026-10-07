/**
 * Плашка в меню «Игру можно добавить на главный экран» и окно с инструкцией для этого телефона.
 * Плашка сама не пропадает: убрать её можно только крестиком, после этого в меню остаётся ссылка
 * на ту же инструкцию.
 */
import { INSTALL_BENEFIT, PROGRESS_NOTE, SAFARI_BENEFIT, canAddToHomeScreen, detectPlatform, inAppName, installGuide, type InstallPlatform } from '../install.ts';
import { installMode, isStandalone, justInstalled, promptInstall } from '../pwa.ts';
import { getSettings, updateSettings } from '../settings.ts';
import { showOverlay } from './cutscene.ts';
import { el } from './dom.ts';
import { showToast } from './toast.ts';

export function currentPlatform(): InstallPlatform {
  return detectPlatform({
    ua: navigator.userAgent,
    standalone: isStandalone(),
    touchMac: navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1,
  });
}

/** Подсказка про главный экран к месту: телефон, игра открыта не с главного экрана и ещё не установлена. */
export const installHelpUseful = () => canAddToHomeScreen(currentPlatform()) && !justInstalled();

/** Ссылка на игру для Safari или Chrome: без #…, но с меткой источника (?ref=tiktok), чтобы её учла статистика. */
const gameLink = () => location.origin + location.pathname + location.search;

/** Окно «На главный экран»: шаги для этого телефона. `answered` — сколько вопросов уже отвечено здесь. */
export function openInstallGuide(answered: number): void {
  const platform = currentPlatform();
  const guide = installGuide(platform, { canPrompt: installMode() === 'prompt', app: inAppName(navigator.userAgent), answered });
  const ios = platform === 'in-app-ios' || platform === 'ios-safari' || platform === 'ios-other';
  const ok = el('button', { class: 'btn btn--secondary', type: 'button', 'data-focus': !guide.prompt }, 'Понятно');
  const actions = el('div', { class: 'modal__actions' });

  if (guide.prompt) {
    const install = el('button', { class: 'btn btn--primary btn--lg', type: 'button', 'data-focus': true }, 'Установить');
    install.onclick = () => {
      close();
      void promptInstall();
    };
    actions.append(install);
  }
  let manual: HTMLInputElement | undefined;
  if (guide.copyLink) {
    manual = el('input', { class: 'field__input', type: 'text', readonly: true, value: gameLink(), hidden: true, 'aria-label': 'Ссылка на игру' });
    const copy = el('button', { class: 'btn btn--secondary', type: 'button' }, 'Скопировать ссылку');
    const field = manual;
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(gameLink());
        showToast(platform === 'in-app-android' ? 'Ссылка скопирована — вставь её в адресную строку Chrome.' : 'Ссылка скопирована — вставь её в адресную строку Safari.');
      } catch {
        field.hidden = false;
        field.select();
        showToast('Не получилось скопировать — выдели ссылку в поле и скопируй её.');
      }
    };
    actions.append(copy);
  }
  actions.append(ok);

  const root = el(
    'div',
    { class: 'cutscene cutscene--modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'На главный экран' },
    el(
      'div',
      { class: 'modal install-guide' },
      el('h2', { class: 'modal__title' }, '📲 На главный экран'),
      el('p', { class: 'install-guide__lead' }, guide.lead),
      el('ol', { class: 'install-guide__steps' }, ...guide.steps.map((s) => el('li', {}, s))),
      guide.copyLink ? el('p', { class: 'install-guide__hint' }, platform === 'ios-other' ? 'Или скопируй ссылку и вставь её в Safari.' : 'Нет такого пункта? Скопируй ссылку и вставь её в браузер.') : null,
      manual ?? null,
      el('p', { class: 'install-guide__benefit' }, ios ? `${INSTALL_BENEFIT} ${SAFARI_BENEFIT}` : INSTALL_BENEFIT),
      guide.progressNote ? el('p', { class: 'install-guide__note' }, PROGRESS_NOTE) : null,
      actions,
    ),
  );
  const close = showOverlay(root);
  ok.onclick = close;
}

/**
 * Плашка вверху меню. Касание — инструкция, крестик — убрать насовсем (`onClose`, чтобы меню
 * показало вместо неё ссылку). Возвращает `null`, если плашка не нужна.
 */
export function installTip(answered: () => number, onClose: () => void): HTMLElement | null {
  if (!getSettings().installTip || !installHelpUseful()) return null;
  const open = () => openInstallGuide(answered());
  const tip = el(
    'div',
    { class: 'install-tip', role: 'region', 'aria-label': 'Подсказка: главный экран' },
    el('button', { class: 'install-tip__text', type: 'button', onclick: open }, '📲 Игру можно добавить на главный экран'),
    el('button', { class: 'install-tip__action', type: 'button', onclick: open }, 'Как?'),
  );
  const closeButton = el('button', { class: 'install-tip__close', type: 'button', 'aria-label': 'Закрыть подсказку' }, '×');
  closeButton.onclick = () => {
    updateSettings({ installTip: false });
    tip.remove();
    onClose();
  };
  tip.append(closeButton);
  return tip;
}
