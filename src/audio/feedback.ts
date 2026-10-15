/**
 * Звуки и вибрация. Звуки синтезируются кодом (Web Audio) — файлов нет, игра остаётся лёгкой
 * и работает без сети. Всё выключается в настройках.
 *
 * На iPhone браузер разрешает звук только после касания экрана, поэтому звук «разблокируется»
 * первым касанием. Вибрации на iPhone в браузере нет; вместо неё используется системный
 * отклик переключателя (iOS 18 и новее), на Android — обычная вибрация.
 */
import { getSettings } from '../settings.ts';

export type SoundName = 'correct' | 'wrong' | 'reward' | 'pass' | 'fail' | 'tick' | 'start' | 'rev' | 'stamp' | 'away' | 'coins' | 'zip' | 'ring' | 'siren' | 'thunder' | 'erase';

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
  // Анимированные сцены сюжета (этап 18): мотор, печать, уезжающий мопед, звон монет.
  rev: [
    { f: 70, t: 0, d: 0.55, wave: 'sawtooth', gain: 0.07, to: 160 },
    { f: 160, t: 0.5, d: 0.7, wave: 'sawtooth', gain: 0.06, to: 85 },
  ],
  stamp: [
    { f: 140, t: 0, d: 0.22, wave: 'triangle', gain: 0.3, to: 50 },
    { f: 70, t: 0, d: 0.3, gain: 0.25, to: 38 },
  ],
  away: [{ f: 210, t: 0, d: 2.2, wave: 'sawtooth', gain: 0.05, to: 70 }],
  coins: [
    { f: 1568, t: 0, d: 0.12, gain: 0.06 },
    { f: 2093, t: 0.08, d: 0.2, gain: 0.06 },
  ],
  // Кат-сцены глав 6 и 9: мопед проносится мимо, звонок телефона, мигалка, гром, стирание записи.
  zip: [{ f: 330, t: 0, d: 0.55, wave: 'sawtooth', gain: 0.05, to: 120 }],
  ring: [0, 0.12, 0.24, 0.6, 0.72, 0.84].map((t, i) => ({ f: i % 2 ? 1180 : 950, t, d: 0.1, wave: 'square' as const, gain: 0.035 })),
  siren: [0, 0.35, 0.7, 1.05].map((t, i) => ({ f: i % 2 ? 960 : 720, t, d: 0.33, wave: 'triangle' as const, gain: 0.06 })),
  thunder: [
    { f: 62, t: 0, d: 1.3, wave: 'triangle', gain: 0.28, to: 34 },
    { f: 90, t: 0.05, d: 0.5, wave: 'sawtooth', gain: 0.04, to: 40 },
  ],
  erase: [880, 740, 620, 520, 430].map((f, i) => ({ f, t: i * 0.14, d: 0.12, wave: 'square' as const, gain: 0.04 })),
};

/** Клаксоны из магазина (этап 17) — тоже синтез, без файлов. */
export const HORN_SOUNDS: Record<string, Note[]> = {
  beep: [
    { f: 415, t: 0, d: 0.16, wave: 'square', gain: 0.07 },
    { f: 523, t: 0, d: 0.16, wave: 'square', gain: 0.05 },
    { f: 415, t: 0.22, d: 0.22, wave: 'square', gain: 0.07 },
    { f: 523, t: 0.22, d: 0.22, wave: 'square', gain: 0.05 },
  ],
  truck: [
    { f: 155, t: 0, d: 0.75, wave: 'sawtooth', gain: 0.09 },
    { f: 196, t: 0, d: 0.75, wave: 'sawtooth', gain: 0.06 },
  ],
  bell: [
    { f: 2093, t: 0, d: 0.3, gain: 0.07 },
    { f: 2637, t: 0, d: 0.3, gain: 0.04 },
    { f: 2093, t: 0.16, d: 0.4, gain: 0.07 },
    { f: 2637, t: 0.16, d: 0.4, gain: 0.04 },
  ],
  duck: [
    { f: 620, t: 0, d: 0.16, wave: 'sawtooth', gain: 0.06, to: 380 },
    { f: 620, t: 0.22, d: 0.18, wave: 'sawtooth', gain: 0.06, to: 360 },
  ],
  chip: [
    { f: 523, t: 0, d: 0.07, wave: 'square', gain: 0.06 },
    { f: 659, t: 0.07, d: 0.07, wave: 'square', gain: 0.06 },
    { f: 784, t: 0.14, d: 0.07, wave: 'square', gain: 0.06 },
    { f: 1047, t: 0.21, d: 0.16, wave: 'square', gain: 0.06 },
  ],
  tune: [
    { f: 392, t: 0, d: 0.11, wave: 'triangle', gain: 0.12 },
    { f: 392, t: 0.13, d: 0.11, wave: 'triangle', gain: 0.12 },
    { f: 523, t: 0.26, d: 0.11, wave: 'triangle', gain: 0.12 },
    { f: 659, t: 0.39, d: 0.11, wave: 'triangle', gain: 0.12 },
    { f: 784, t: 0.52, d: 0.3, wave: 'triangle', gain: 0.12 },
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
  playNotes(SOUNDS[name]);
}

/** Посигналить клаксоном машины (если звуки включены). */
export function playHorn(id: string): void {
  playNotes(HORN_SOUNDS[id] ?? HORN_SOUNDS.beep);
}

function playNotes(notes: readonly Note[]): void {
  if (!getSettings().sound) return;
  const c = context();
  if (!c) return;
  try {
    const now = c.currentTime + 0.01;
    for (const n of notes) {
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
