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
}

const KEY = 'pdd-game:settings';
const DEFAULTS: Settings = { control: 'tap', sound: true, vibration: true, tutorial: false };

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
