/**
 * Звуки оформлений вопросов: синтез кодом, как и остальные звуки игры (`audio/feedback.ts`),
 * без файлов. Выключаются общим выключателем звука.
 */
import { context } from '../../audio/feedback.ts';
import { getSettings } from '../../settings.ts';
import type { SfxStep } from './looks.ts';

function tone(f: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.12): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(at: number, dur: number, freq: number, q = 1, vol = 0.2, type: BiquadFilterType = 'bandpass'): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime + at;
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource();
  s.buffer = b;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t);
}

function sweep(f0: number, f1: number, at: number, dur: number, type: OscillatorType = 'sawtooth'): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function meow(at: number): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  o.type = 'sawtooth';
  f.type = 'lowpass';
  f.frequency.value = 1800;
  o.frequency.setValueAtTime(520, t);
  o.frequency.linearRampToValueAtTime(860, t + 0.18);
  o.frequency.linearRampToValueAtTime(480, t + 0.55);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.65);
}

/** Нарастающий шум: трибуны, свист бумажного самолётика. */
function swell(dur: number, freq: number, vol: number): void {
  const a = context();
  if (!a) return;
  const t = a.currentTime;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = b;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq * 0.6, t);
  f.frequency.linearRampToValueAtTime(freq * 1.4, t + dur);
  f.Q.value = 0.7;
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

const num = (v: string | number | undefined, d = 0): number => (typeof v === 'number' ? v : d);

/** Именованные звуки: `[имя, начало?, …]`. */
const NAMED: Record<string, (s: SfxStep) => void> = {
  sweep: (s) => sweep(num(s[1]), num(s[2]), num(s[3]), num(s[4]), (s[5] as OscillatorType) || 'sawtooth'),
  whistle: () => {
    tone(2400, 0, 0.5, 'sine', 0.1);
    for (let i = 0; i < 8; i++) tone(2400 + (i % 2) * 180, i * 0.05, 0.06, 'sine', 0.06);
  },
  scribble: (s) => {
    for (let i = 0; i < 5; i++) noise(num(s[2]) + i * (num(s[1]) / 5), num(s[1]) / 6, 3000 + Math.random() * 2000, 2, 0.08);
  },
  thud: (s) => {
    tone(90, num(s[1]), 0.25, 'sine', 0.4);
    noise(num(s[1]), 0.12, 300, 0.7, 0.25, 'lowpass');
  },
  crunch: () => {
    for (let i = 0; i < 6; i++) noise(i * 0.03, 0.05, 2500 + i * 300, 1, 0.12);
  },
  rustle: (s) => noise(0, num(s[1]), 4000, 0.6, 0.12),
  zap: () => {
    sweep(1800, 80, 0, 0.25, 'square');
    noise(0, 0.15, 1200, 1, 0.15);
  },
  clank: (s) => {
    const at = num(s[1]);
    tone(1250, at, 0.3, 'triangle', 0.1);
    tone(1870, at, 0.25, 'triangle', 0.07);
    tone(2950, at, 0.18, 'sine', 0.05);
    noise(at, 0.06, 5000, 1, 0.15, 'highpass');
  },
  meow: (s) => meow(num(s[1])),
  purr: (s) => {
    for (let i = 0; i < 14; i++) noise(num(s[1]) + i * 0.045, 0.035, 160, 0.8, 0.25, 'lowpass');
  },
  hiss: (s) => noise(num(s[1]), 0.45, 5000, 0.5, 0.14, 'highpass'),
  cheer: () => swell(0.9, 1100, 0.22),
  clap: (s) => noise(num(s[1]), 0.06, 1800, 0.6, 0.35),
  keys: (s) => {
    for (let i = 0; i < 6; i++) noise(num(s[1]) + i * 0.07 + Math.random() * 0.02, 0.02, 3500, 2, 0.15);
  },
  ding: (s) => tone(2400, num(s[1]), 0.8, 'sine', 0.1),
  splash: (s) => noise(num(s[1]), 0.6, 900, 0.5, 0.25, 'lowpass'),
  roar: (s) => {
    sweep(260, 110, num(s[1]), 0.55, 'sawtooth');
    noise(num(s[1]), 0.4, 400, 0.7, 0.12, 'lowpass');
  },
  spray: (s) => noise(num(s[1]), num(s[2], 0.45), 7000, 0.4, 0.12, 'highpass'),
  rattle: (s) => {
    for (let i = 0; i < 4; i++) tone(1800 + i * 90, num(s[1]) + i * 0.06, 0.04, 'square', 0.03);
  },
  bubbles: (s) => {
    for (let i = 0; i < 3; i++) sweep(300 + i * 80, 900 + i * 150, num(s[1]) + i * 0.12, 0.09, 'sine');
  },
  crumple: () => {
    for (let i = 0; i < 9; i++) noise(i * 0.035 + Math.random() * 0.02, 0.03, 2000 + Math.random() * 3000, 1, 0.12);
  },
  whoosh: () => swell(0.6, 1400, 0.12),
  crack: (s) => noise(num(s[1]), 0.08, 4500, 1.5, 0.25),
  buzz: (s) => tone(110, num(s[1]), 0.45, 'square', 0.06),
  punch: () => {
    noise(0, 0.14, 300, 0.7, 0.4, 'lowpass');
    sweep(300, 60, 0, 0.2, 'sine');
  },
  jingle: (s) => [1568, 2093, 1760, 2349].forEach((f, i) => tone(f, num(s[1]) + i * 0.06, 0.18, 'triangle', 0.06)),
};

/** Сыграть звук оформления (если звуки включены). */
export function playThemeSfx(steps: readonly SfxStep[] | undefined): void {
  if (!steps || !getSettings().sound) return;
  try {
    for (const s of steps) {
      if (typeof s[0] === 'string') NAMED[s[0]]?.(s);
      else tone(num(s[0]), num(s[1]), num(s[2]), (s[3] as OscillatorType) || 'sine', num(s[4], 0.12));
    }
  } catch {
    // Звук — украшение: если браузер его не дал, игра продолжается молча.
  }
}
