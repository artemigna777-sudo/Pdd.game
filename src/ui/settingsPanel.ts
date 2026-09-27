import { playSound, vibrateError } from '../audio/feedback.ts';
import { getSettings, updateSettings, type ControlMode } from '../settings.ts';
import { playTutorial } from './cutscene.ts';
import { el } from './dom.ts';

const OPTIONS: Array<{ mode: ControlMode; title: string; hint: string }> = [
  { mode: 'tap', title: 'Касание дороги', hint: 'Коснитесь места на дороге — машина сама проложит маршрут и поедет туда.' },
  { mode: 'joystick', title: 'Джойстик', hint: 'Прижмите палец к экрану и ведите в нужную сторону: машина едет по дороге и поворачивает на перекрёстках.' },
];

/** Выбор управления машиной. */
export function settingsPanel(): HTMLElement {
  const buttons = OPTIONS.map((o) =>
    el(
      'button',
      { class: 'choice', type: 'button', 'aria-pressed': String(getSettings().control === o.mode), onclick: () => select(o.mode) },
      el('span', { class: 'choice__title' }, o.title),
      el('span', { class: 'choice__hint' }, o.hint),
    ),
  );
  function select(mode: ControlMode) {
    updateSettings({ control: mode });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(OPTIONS[i].mode === mode)));
  }
  const toggle = (key: 'sound' | 'vibration', title: string, hint: string) => {
    const button = el(
      'button',
      { class: 'choice choice--toggle', type: 'button', 'aria-pressed': String(getSettings()[key]), onclick: () => flip() },
      el('span', { class: 'choice__title' }, title, el('span', { class: 'switch', 'aria-hidden': 'true' })),
      el('span', { class: 'choice__hint' }, hint),
    );
    const flip = () => {
      const on = !getSettings()[key];
      updateSettings({ [key]: on });
      button.setAttribute('aria-pressed', String(on));
      if (on && key === 'sound') playSound('correct');
      if (on && key === 'vibration') vibrateError();
    };
    return button;
  };
  const tutorial = el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void playTutorial() }, 'Показать обучение');
  return el(
    'section',
    { class: 'settings' },
    el('h2', { class: 'settings__title' }, 'Управление машиной'),
    el('div', { class: 'choices' }, ...buttons),
    el('h2', { class: 'settings__title settings__title--next' }, 'Звук и вибрация'),
    el(
      'div',
      { class: 'choices' },
      toggle('sound', 'Звуки', 'Сигналы верного и неверного ответа, награды, экзамен. На iPhone звука не будет, если включён беззвучный режим.'),
      toggle('vibration', 'Вибрация при ошибке', 'На Android — вибрация, на iPhone (iOS 18 и новее) — лёгкий отклик.'),
    ),
    el('h2', { class: 'settings__title settings__title--next' }, 'Обучение'),
    tutorial,
  );
}

export function controlHint(mode: ControlMode): string {
  return mode === 'tap'
    ? 'Коснитесь дороги — машина поедет туда. Жёлтые круги с «?» — вопросы.'
    : 'Ведите пальцем в нужную сторону — машина поедет. Жёлтые круги с «?» — вопросы.';
}
