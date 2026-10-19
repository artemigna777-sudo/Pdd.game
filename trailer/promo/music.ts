/**
 * Музыка ролика RuStore, синтезированная кодом (без чужих записей): 120 ударов в минуту, C — G — Am — F.
 * Начало — тихий пульс и удары на тексте, на логотипе — «падение» бита, сюжет — кинематографичные
 * аккорды, перед готовностью — нарастание, в финале — припев и последний аккорд.
 * Пишет `trailer/promo/video/music.wav`.
 *
 *   npx tsx trailer/promo/music.ts
 */
import { writeFileSync } from 'node:fs';
import { BEAT, CUES, T } from './timeline.ts';

const SR = 48_000;
const N = Math.ceil(T.total * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
/** Посыл на реверберацию (моно). */
const SEND = new Float32Array(N);
/** Насколько приглушать аккорды под бочкой (0…1). */
const DUCK = new Float32Array(N);

let seed = 20261019;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x3fffffff - 1;
};
const TAU = Math.PI * 2;
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));
const sine = (ph: number) => Math.sin(TAU * ph);
const tri = (ph: number) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));
const note = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Добавить звук: `fn(t)` — отсчёт в момент t от начала. `duck` — приглушать под бочкой. */
function add(t0: number, dur: number, fn: (t: number) => number, gain: number, opts: { pan?: number; send?: number; duck?: boolean } = {}) {
  const { pan = 0, send = 0, duck = false } = opts;
  const i0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  const gl = gain * Math.min(1, 1 - pan);
  const gr = gain * Math.min(1, 1 + pan);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i < 0 || i >= N) continue;
    let v = fn(k / SR);
    if (duck) v *= 1 - 0.65 * DUCK[i];
    L[i] += v * gl;
    R[i] += v * gr;
    if (send) SEND[i] += v * gain * send;
  }
}

interface Voice { gain: number; wave?: (ph: number) => number; cutoff?: number; decay?: number; attack?: number; release?: number; pan?: number; detune?: number; voices?: number; send?: number; duck?: boolean }
/** Нота (аккорд) с фильтром и огибающей; `voices` — расстроенные копии (суперпила). */
function synth(t0: number, dur: number, freqs: number[], o: Voice) {
  const { wave = saw, cutoff = 2000, decay = 6, attack = 0.005, release = 0.03, pan = 0, detune = 0, voices = 1, send = 0, duck = false } = o;
  let lp1 = 0;
  let lp2 = 0;
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  const phase = freqs.flatMap(() => Array.from({ length: voices }, () => (noise() + 1) / 2));
  add(
    t0,
    dur,
    (t) => {
      let v = 0;
      freqs.forEach((f, j) => {
        for (let k = 0; k < voices; k++) {
          const d = voices > 1 ? (k / (voices - 1) - 0.5) * 2 * detune : 0;
          v += wave(f * (1 + d) * t + phase[j * voices + k]);
        }
      });
      v /= freqs.length * Math.sqrt(voices);
      lp1 += a * (v - lp1);
      lp2 += a * (lp1 - lp2);
      const env = Math.min(1, t / attack) * Math.exp(-t * decay) * Math.min(1, (dur - t) / release);
      return lp2 * env;
    },
    o.gain,
    { pan, send, duck },
  );
}

function kick(t0: number, gain = 0.95) {
  add(t0, 0.4, (t) => Math.sin(TAU * (45 * t + (95 * (1 - Math.exp(-t * 30))) / 30)) * Math.exp(-t * 7.5) + (t < 0.003 ? noise() * 0.5 : 0), gain);
  // Аккорды и пэд «приседают» под бочкой.
  const i0 = Math.round(t0 * SR);
  for (let k = 0; k < SR * 0.3; k++) if (i0 + k < N) DUCK[i0 + k] = Math.max(DUCK[i0 + k], Math.exp(-k / (SR * 0.09)));
}
function clap(t0: number, gain = 0.32) {
  for (const d of [0, 0.011, 0.022]) add(t0 + d, 0.22, (t) => noise() * Math.exp(-t * (d ? 60 : 18)), gain * (d ? 0.6 : 1), { send: 0.35 });
}
function hat(t0: number, gain = 0.07, pan = 0.25, open = false) {
  let prev = 0;
  add(t0, open ? 0.25 : 0.06, (t) => {
    const n = noise();
    const v = n - prev;
    prev = n;
    return v * Math.exp(-t * (open ? 14 : 70));
  }, gain, { pan });
}
function tom(t0: number, f: number, gain = 0.5) {
  add(t0, 0.45, (t) => Math.sin(TAU * f * t * (1 + 0.6 * Math.exp(-t * 18))) * Math.exp(-t * 7), gain, { send: 0.3 });
}
/** Удар: низкий «бум» с шумом и хвостом. */
function impact(t0: number, gain = 0.8) {
  add(t0, 2.2, (t) => Math.sin(TAU * (30 * t + (70 * (1 - Math.exp(-t * 6))) / 6)) * Math.exp(-t * 2.2), gain, { send: 0.5 });
  let lp = 0;
  add(t0, 1.2, (t) => {
    lp += 0.25 * (noise() - lp);
    return lp * Math.exp(-t * 4);
  }, gain * 0.7, { send: 0.8 });
}
/** Нарастающий шум с поднимающимся тоном. */
function riser(t0: number, dur: number, gain = 0.2) {
  let lp = 0;
  add(t0, dur, (t) => {
    const x = t / dur;
    const a = 1 - Math.exp((-TAU * (300 + 7000 * x * x)) / SR);
    lp += a * (noise() - lp);
    return lp * x * x + 0.25 * x * x * Math.sin(TAU * (200 * t + 600 * t * x));
  }, gain, { send: 0.4 });
}
/** «Вжух» на смене сцены. */
function whoosh(t0: number, gain = 0.16) {
  let lp = 0;
  add(t0 - 0.25, 0.55, (t) => {
    const x = t / 0.55;
    const a = 1 - Math.exp((-TAU * (400 + 5000 * Math.sin(Math.PI * x))) / SR);
    lp += a * (noise() - lp);
    return lp * Math.sin(Math.PI * x) ** 2;
  }, gain, { send: 0.3 });
}
/** Тиканье часов экзамена. */
function tick(t0: number, gain = 0.18) {
  add(t0, 0.04, (t) => Math.sin(TAU * 2400 * t) * Math.exp(-t * 160), gain, { pan: 0.3 });
}

const BAR = 4 * BEAT;
const CHORDS = [
  { root: 48, triad: [60, 64, 67] }, // C
  { root: 43, triad: [59, 62, 67] }, // G
  { root: 45, triad: [57, 60, 64] }, // Am
  { root: 41, triad: [57, 60, 65] }, // F
];
const ARP = [0, 1, 2, 1, 2, 3, 2, 1];
const MELODY = [
  [76, 79, 84, 79, 76, 79, 81, 79],
  [74, 79, 83, 79, 74, 76, 79, 76],
  [76, 81, 84, 81, 79, 76, 79, 81],
  [77, 81, 84, 81, 79, 77, 76, 74],
];

// ─── Начало: тёмный пульс, удары на тексте ───
synth(0, T.logo, [note(45), note(52)], { gain: 0.3, cutoff: 500, decay: 0.05, attack: 0.4, voices: 3, detune: 0.006, send: 0.3 });
for (let b = 0; b < 8; b++) {
  hat(b * BEAT + BEAT / 2, 0.05);
  if (b < 6) add(b * BEAT, 0.12, (t) => Math.sin(TAU * 55 * t) * Math.exp(-t * 20), 0.5);
}
impact(0, 0.55);
impact(CUES.count, 0.35);
whoosh(CUES.strike, 0.22);
add(CUES.strike, 0.18, (t) => saw(80 * t * (1 - t * 2)) * Math.exp(-t * 14), 0.25);
impact(CUES.slam, 0.95);
kick(CUES.slam, 1);
riser(CUES.slam + 0.15, T.logo - CUES.slam - 0.15, 0.32);

// ─── Бит: логотип → вопросы → (сюжет — по-другому) → режимы → экзамен ───
function groove(from: number, to: number, opts: { melody?: boolean; ticks?: boolean } = {}) {
  for (let t = from; t < to - 0.01; t += BAR) {
    const bar = Math.round((t - T.logo) / BAR);
    const c = CHORDS[((bar % 4) + 4) % 4];
    for (let b = 0; b < 4; b++) {
      const tb = t + b * BEAT;
      kick(tb);
      if (b % 2 === 1) clap(tb);
      hat(tb + BEAT / 2, 0.09, 0.3, b === 3);
      hat(tb + BEAT / 4, 0.035, -0.3);
      hat(tb + (3 * BEAT) / 4, 0.035, -0.3);
      if (opts.ticks) tick(tb);
      // Бас: восьмые с октавой.
      synth(tb, BEAT / 2 - 0.02, [note(c.root - 12)], { gain: 0.5, wave: (p) => saw(p) * 0.5 + sine(p), cutoff: 380, decay: 4 });
      synth(tb + BEAT / 2, BEAT / 2 - 0.02, [note(c.root)], { gain: 0.32, cutoff: 520, decay: 6 });
    }
    // Аккорды — тянущаяся суперпила с «приседанием» под бочкой.
    synth(t, BAR, c.triad.map(note), { gain: 0.24, cutoff: 3200, decay: 0.2, attack: 0.01, voices: 5, detune: 0.012, send: 0.25, duck: true });
    // Арпеджио шестнадцатыми.
    for (let i = 0; i < 16; i++) {
      const n = [...c.triad, c.triad[0] + 12][ARP[i % 8]] + 12;
      synth(t + i * (BEAT / 4), BEAT / 4, [note(n)], { gain: 0.07, wave: tri, cutoff: 5000, decay: 14, pan: i % 2 ? 0.35 : -0.35, send: 0.3 });
    }
    if (opts.melody) MELODY[((bar % 4) + 4) % 4].forEach((m, i) => synth(t + i * (BEAT / 2), BEAT / 2 - 0.02, [note(m)], { gain: 0.12, wave: (p) => saw(p) * 0.4 + tri(p), cutoff: 4200, decay: 3, send: 0.45, pan: 0.1 }));
  }
}
groove(T.logo, T.story, { melody: true });

// ─── Сюжет: кино — тянущиеся аккорды, удар на каждой смене кадра, нарастание барабанов ───
for (let t = T.story; t < T.modes - 0.01; t += BAR) {
  const c = CHORDS[Math.round((t - T.story) / BAR) % 4 === 1 ? 3 : Math.round((t - T.story) / BAR) % 4];
  synth(t, BAR + 0.3, [...c.triad, c.triad[0] + 12].map(note), { gain: 0.3, cutoff: 1800, decay: 0.15, attack: 0.25, release: 0.3, voices: 5, detune: 0.01, send: 0.7 });
  synth(t, BAR, [note(c.root - 12)], { gain: 0.38, wave: sine, cutoff: 300, decay: 0.3, attack: 0.05 });
}
for (const t of CUES.story) impact(t, 0.5);
for (const t of CUES.story.slice(0, 4)) kick(t, 0.8);
// Тихий пульс и барабаны перед возвратом бита.
for (let i = 0; i < 8; i++) tom(T.modes - 2 + i * (BEAT / 2), 90 + i * 12, 0.25 + i * 0.05);
riser(T.modes - 2, 2, 0.24);

groove(T.modes, T.exam, { melody: true });
for (const t of CUES.modes.slice(1)) whoosh(t, 0.2);
groove(T.exam, T.ready, { ticks: true });

// ─── Готовность: нарастание к 100% ───
for (let t = T.ready; t < CUES.full - 0.01; t += BEAT / (t > T.ready + 1.5 ? 4 : 2)) {
  const x = (t - T.ready) / (CUES.full - T.ready);
  clap(t, 0.12 + 0.25 * x);
}
synth(T.ready, CUES.full - T.ready, [note(55), note(59), note(62)], { gain: 0.26, cutoff: 1400, decay: -0.5, attack: 0.5, voices: 5, detune: 0.01, send: 0.5 });
riser(T.ready, CUES.full - T.ready, 0.3);
impact(CUES.full, 0.9);
kick(CUES.full, 1);
[84, 88, 91, 96].forEach((m, i) => synth(CUES.full + i * 0.07, 1.2, [note(m)], { gain: 0.13, wave: sine, cutoff: 8000, decay: 2.5, send: 0.6, pan: (i - 1.5) * 0.3 }));
// После 100% — две бочки до финала.
for (const t of [T.end - 2 * BEAT, T.end - BEAT]) kick(t, 0.8);

// ─── Финал: припев и последний аккорд ───
groove(T.end, T.end + 3 * BAR, { melody: true });
const last = T.end + 3 * BAR;
kick(last);
impact(last, 0.6);
synth(last, T.total - last, [...CHORDS[0].triad, 72, 76].map(note), { gain: 0.32, cutoff: 2600, decay: 0.45, voices: 5, detune: 0.01, send: 0.8, release: 1 });
synth(last, T.total - last, [note(36)], { gain: 0.4, wave: sine, cutoff: 300, decay: 0.5, release: 1 });

// ─── Звуки к кадрам ───
synth(CUES.right, 0.16, [note(79)], { gain: 0.3, wave: sine, cutoff: 8000, decay: 10, send: 0.3 });
synth(CUES.right + 0.1, 0.5, [note(86)], { gain: 0.3, wave: sine, cutoff: 8000, decay: 5, send: 0.4 });
synth(CUES.wrong, 0.45, [note(41), note(42)], { gain: 0.32, wave: (p) => (p % 1 < 0.5 ? 1 : -1), cutoff: 900, decay: 4 });
for (const t of [T.question, T.wrong, T.story, T.modes, T.exam, T.ready, T.end]) whoosh(t, 0.18);

// ─── Реверберация: несколько гребенчатых фильтров и два всепропускающих ───
function reverb(input: Float32Array): [Float32Array, Float32Array] {
  const outL = new Float32Array(N);
  const outR = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round((d * SR) / 44_100));
  for (const [ci, d] of combs.entries()) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    const out = ci % 2 ? outR : outL;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3;
      buf[idx] = input[i] + lp * 0.8;
      idx = (idx + 1) % d;
      out[i] += y / 3;
    }
  }
  for (const out of [outL, outR]) {
    for (const d of [Math.round((556 * SR) / 44_100), Math.round((441 * SR) / 44_100)]) {
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[idx];
        const y = -out[i] + b;
        buf[idx] = out[i] + b * 0.5;
        idx = (idx + 1) % d;
        out[i] = y;
      }
    }
  }
  return [outL, outR];
}
const [rl, rr] = reverb(SEND);

// ─── Сведение: мягкое ограничение, затухание в конце ───
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.02) * Math.min(1, (T.total - t) / 1.6);
  L[i] = Math.tanh((L[i] + rl[i] * 0.5) * 0.75) * fade;
  R[i] = Math.tanh((R[i] + rr[i] * 0.5) * 0.75) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const k = 0.9 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4);
}
writeFileSync(new URL('./video/music.wav', import.meta.url), pcm);
console.log(`trailer/promo/video/music.wav: ${T.total} с, пик ${peak.toFixed(2)} → 0.9`);
