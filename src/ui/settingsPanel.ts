import { getSettings, updateSettings, type ControlMode } from '../settings.ts';
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
  return el('section', { class: 'settings' }, el('h2', { class: 'settings__title' }, 'Управление машиной'), el('div', { class: 'choices' }, ...buttons));
}

export function controlHint(mode: ControlMode): string {
  return mode === 'tap'
    ? 'Коснитесь дороги — машина поедет туда. Жёлтые круги с «?» — вопросы.'
    : 'Ведите пальцем в нужную сторону — машина поедет. Жёлтые круги с «?» — вопросы.';
}
