import { load, save } from './storage.ts';
import type { Difficulty } from './world/rules.ts';

export type ControlMode = 'tap' | 'joystick';

export interface Settings {
  /** Управление машиной: касание точки на дороге или виртуальный джойстик. */
  control: ControlMode;
  /** Звуки игры. */
  sound: boolean;
  /** Вибрация при ошибке. */
  vibration: boolean;
  /** Голос инспектора в «Провокациях инспектора» (синтез речи телефона). */
  voice: boolean;
  /** Обучение при первом запуске уже показано. */
  tutorial: boolean;
  /** Тема: как в телефоне, светлая или тёмная. */
  theme: Theme;
  /** Крупный шрифт вопросов и текстов. */
  bigText: boolean;
  /** Случайные события в пути: скорая, мяч на дороге, смена погоды. */
  events: boolean;
  /** Правила за рулём: новичку — подсказки перед нарушением, опытному — без них. */
  difficulty: Difficulty;
  /**
   * Город замечает нарушения игрока (этап 8). В настройках его нет: выключают только
   * автотесты прежних этапов, где машина ездит по району сама.
   */
  rules: boolean;
  /** Имя игрока в дуэлях (этап 10). */
  name: string;
  /** Анонимная статистика для автора игры: какие экраны открывают и докуда доходят. */
  stats: boolean;
  /** Плашка в меню «Игру можно добавить на главный экран» (убирается только крестиком). */
  installTip: boolean;
  /** Праздничные оформления вопросов включаются сами в дни праздника (`progress/qthemes.ts`). */
  holidays: boolean;
  /** Своё имя в таблице лидеров (`board/board.ts`); пустое — ник от посредника (`boardNick`). */
  boardName: string;
  /** Ник в таблице лидеров вроде «user_4821»: его выдаёт посредник, случайный и ни у кого не повторяется. */
  boardNick: string;
  /** Случайный номер этой игры у посредника (ни с чем не связан), создаётся при первой отправке. */
  playerId: string;
  /** Игрок убрал себя из таблицы лидеров: посреднику ничего не отправляется, пока не вернётся. */
  boardHidden: boolean;
  /**
   * Длительность смен в режимах (этапы 12–13), доля от обычной. В настройках её нет: смены
   * укорачивают только автотесты.
   */
  shiftScale?: number;
}

export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'pdd-game:settings';
const DEFAULTS: Settings = { control: 'tap', sound: true, vibration: true, voice: true, tutorial: false, theme: 'auto', bigText: false, events: true, difficulty: 'novice', rules: true, name: '', stats: true, installTip: true, holidays: true, boardName: '', boardNick: '', playerId: '', boardHidden: false };

let current: Settings = { ...DEFAULTS, ...load<Partial<Settings>>(KEY, {}) };
if (current.difficulty !== 'novice' && current.difficulty !== 'expert') current.difficulty = DEFAULTS.difficulty;
if (typeof current.name !== 'string') current.name = '';
if (typeof current.stats !== 'boolean') current.stats = DEFAULTS.stats;
if (typeof current.installTip !== 'boolean') current.installTip = DEFAULTS.installTip;
if (typeof current.voice !== 'boolean') current.voice = DEFAULTS.voice;
if (typeof current.holidays !== 'boolean') current.holidays = DEFAULTS.holidays;
if (typeof current.boardName !== 'string') current.boardName = '';
if (typeof current.boardNick !== 'string') current.boardNick = '';
if (typeof current.playerId !== 'string') current.playerId = '';
if (typeof current.boardHidden !== 'boolean') current.boardHidden = false;
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
