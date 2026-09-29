import { load, save } from './storage.ts';

export type ControlMode = 'tap' | 'joystick';

export interface Settings {
  /** Управление машиной: касание точки на дороге или виртуальный джойстик. */
  control: ControlMode;
  /** Звуки игры. */
  sound: boolean;
  /** Вибрация при ошибке. */
  vibration: boolean;
  /** Обучение при первом запуске уже показано. */
  tutorial: boolean;
  /** Тема: как в телефоне, светлая или тёмная. */
  theme: Theme;
  /** Крупный шрифт вопросов и текстов. */
  bigText: boolean;
  /** Случайные события в пути: скорая, мяч на дороге, смена погоды. */
  events: boolean;
}

export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'pdd-game:settings';
const DEFAULTS: Settings = { control: 'tap', sound: true, vibration: true, tutorial: false, theme: 'auto', bigText: false, events: true };

let current: Settings = { ...DEFAULTS, ...load<Partial<Settings>>(KEY, {}) };
const listeners = new Set<(s: Settings) => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  save(KEY, current);
  listeners.forEach((fn) => fn(current));
}

export function onSettingsChange(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Тема и размер шрифта — атрибутами на <html> (их читают стили). */
export function applyLook(s: Settings = current): void {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.text = s.bigText ? 'big' : 'normal';
}
