/**
 * Звуки и вибрация. Звуки синтезируются кодом (Web Audio) — файлов нет, игра остаётся лёгкой
 * и работает без сети. Всё выключается в настройках.
 *
 * На iPhone браузер разрешает звук только после касания экрана, поэтому звук «разблокируется»
 * первым касанием. Вибрации на iPhone в браузере нет; вместо неё используется системный
 * отклик переключателя (iOS 18 и новее), на Android — обычная вибрация.
 */
import { getSettings } from '../settings.ts';

export type SoundName = 'correct' | 'wrong' | 'reward' | 'pass' | 'fail' | 'tick' | 'start';

type Wave = OscillatorType;
interface Note {
  /** Частота, Гц. */
  f: number;
  /** Начало, с. */
  t: number;
  /** Длительность, с. */
  d: number;
  wave?: Wave;
  gain?: number;
  /** Частота в конце ноты (скольжение). */
  to?: number;
}

const SOUNDS: Record<SoundName, Note[]> = {
  correct: [
    { f: 880, t: 0, d: 0.09 },
    { f: 1320, t: 0.08, d: 0.14 },
  ],
  wrong: [
    { f: 220, t: 0, d: 0.16, wave: 'triangle', gain: 0.16, to: 170 },
    { f: 175, t: 0.15, d: 0.22, wave: 'triangle', gain: 0.16, to: 130 },
  ],
  reward: [
    { f: 523, t: 0, d: 0.12, wave: 'triangle' },
    { f: 659, t: 0.1, d: 0.12, wave: 'triangle' },
    { f: 784, t: 0.2, d: 0.12, wave: 'triangle' },
    { f: 1047, t: 0.3, d: 0.3, wave: 'triangle' },
  ],
  pass: [
    { f: 523, t: 0, d: 0.14, wave: 'triangle' },
    { f: 659, t: 0.13, d: 0.14, wave: 'triangle' },
    { f: 784, t: 0.26, d: 0.14, wave: 'triangle' },
    { f: 1047, t: 0.39, d: 0.5, wave: 'triangle' },
    { f: 784, t: 0.39, d: 0.5, wave: 'sine', gain: 0.06 },
    { f: 659, t: 0.39, d: 0.5, wave: 'sine', gain: 0.06 },
  ],
  fail: [
    { f: 392, t: 0, d: 0.2, wave: 'triangle' },
    { f: 330, t: 0.2, d: 0.2, wave: 'triangle' },
    { f: 262, t: 0.4, d: 0.45, wave: 'triangle', to: 220 },
  ],
  tick: [{ f: 1200, t: 0, d: 0.03, gain: 0.05 }],
  start: [
    { f: 660, t: 0, d: 0.1 },
    { f: 660, t: 0.18, d: 0.1 },
    { f: 990, t: 0.36, d: 0.2 },
  ],
};

let ctx: AudioContext | undefined;

/** Общий аудиоконтекст игры (создаётся при первом звуке). */
export function context(): AudioContext | undefined {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return undefined;
  }
}

/** Сыграть звук (если звуки включены). */
export function playSound(name: SoundName): void {
  if (!getSettings().sound) return;
  const c = context();
  if (!c) return;
  try {
    const now = c.currentTime + 0.01;
    for (const n of SOUNDS[name]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = n.wave ?? 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      if (n.to) osc.frequency.linearRampToValueAtTime(n.to, now + n.t + n.d);
      const peak = n.gain ?? 0.12;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain).connect(c.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  } catch {
    // Звук — украшение: если браузер его не дал, игра продолжается молча.
  }
}

/** Отклик на ошибку: вибрация (Android) или системный отклик переключателя (iPhone). */
export function vibrateError(): void {
  if (!getSettings().vibration) return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([90, 60, 90]);
      return;
    }
    // iOS 18+: касание переключателя <input switch> даёт лёгкий тактильный отклик.
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.append(input);
    document.head.append(label);
    label.click();
    label.remove();
  } catch {
    // Нет вибрации — ничего страшного.
  }
}

/** Ответ на вопрос: звук и, при ошибке, вибрация. */
export function answerFeedback(correct: boolean): void {
  playSound(correct ? 'correct' : 'wrong');
  if (!correct) vibrateError();
}

/** Разблокировать звук первым касанием (браузеры на телефонах требуют жеста пользователя). */
export function unlockAudioOnFirstTouch(): void {
  const unlock = () => {
    if (!getSettings().sound) return;
    const c = context();
    if (c && c.state === 'running') {
      for (const type of ['pointerdown', 'touchend', 'click'] as const) window.removeEventListener(type, unlock, true);
    }
  };
  for (const type of ['pointerdown', 'touchend', 'click'] as const) window.addEventListener(type, unlock, true);
}
