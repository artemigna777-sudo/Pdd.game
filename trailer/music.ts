/**
 * Музыка и звуки трейлера, синтезированные кодом (без чужих записей): бодрый бит 120 ударов в минуту,
 * бас, аккорды и мелодия; звуки игры к моментам на экране — верный ответ, ошибка, свисток Соколова,
 * награда. Пишет `trailer/video/music.wav` (его подхватывает композиция HyperFrames).
 *
 *   npx tsx trailer/music.ts
 */
import { writeFileSync } from 'node:fs';
import { CUT, SCENES, TIMELINE, at } from './scenes.ts';

const SR = 44_100;
/** Промо новых режимов: секунды записей, когда на экране касание, награда, поимка. */
const CUES = { duel: [1.85, 3.1, 4.35], duelWin: 0.8, signCard: 1.5, signReward: 5.4, patrolCatch: 4.4, patrolAnswer: 7.5, courierFlag: 5.2, courierAnswer: 10.6 };
const { intro, outro, total } = TIMELINE;
const N = Math.ceil(total * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

// Детерминированный шум: трейлер собирается всегда одинаково.
let seed = 12345;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

/** Добавить звук: `fn(t)` — отсчёт в момент t от начала звука. */
function add(t0: number, dur: number, fn: (t: number, k: number) => number, gain: number, pan = 0) {
  const i0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  const gl = gain * Math.min(1, 1 - pan);
  const gr = gain * Math.min(1, 1 + pan);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i < 0 || i >= N) continue;
    const v = fn(k / SR, k);
    L[i] += v * gl;
    R[i] += v * gr;
  }
}

const TAU = Math.PI * 2;
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));
const square = (ph: number) => (ph - Math.floor(ph) < 0.5 ? 1 : -1);
const sine = (ph: number) => Math.sin(TAU * ph);

/** Нота с фильтром низких частот (однополюсный) и огибающей. */
function synth(t0: number, dur: number, freqs: number[], opts: { gain: number; wave?: (ph: number) => number; cutoff?: number; decay?: number; attack?: number; pan?: number; detune?: number }) {
  const { wave = saw, cutoff = 2000, decay = 6, attack = 0.005, pan = 0, detune = 0 } = opts;
  let lp = 0;
  add(
    t0,
    dur,
    (t) => {
      let v = 0;
      for (const f of freqs) {
        v += wave(f * t);
        if (detune) v += wave(f * (1 + detune) * t) * 0.6;
      }
      v /= freqs.length * (detune ? 1.6 : 1);
      const a = 1 - Math.exp((-TAU * cutoff) / SR);
      lp += a * (v - lp);
      const env = Math.min(1, t / attack) * Math.exp(-t * decay) * Math.min(1, (dur - t) / 0.02);
      return lp * env;
    },
    opts.gain,
    pan,
  );
}

function kick(t0: number, gain = 0.9) {
  add(t0, 0.35, (t) => Math.sin(TAU * (48 * t + (80 * (1 - Math.exp(-t * 32))) / 32)) * Math.exp(-t * 9) + (t < 0.004 ? noise() * 0.4 : 0), gain);
}

function snare(t0: number, gain = 0.35) {
  add(t0, 0.25, (t) => noise() * Math.exp(-t * 20) * 0.75 + Math.sin(TAU * 190 * t) * Math.exp(-t * 28) * 0.45, gain);
}

function hat(t0: number, gain = 0.1, pan = 0.25) {
  let prev = 0;
  add(
    t0,
    0.06,
    (t) => {
      const n = noise();
      const v = n - prev;
      prev = n;
      return v * Math.exp(-t * 70);
    },
    gain,
    pan,
  );
}

/** Нарастающий шум перед «падением» бита. */
function riser(t0: number, dur: number, gain = 0.18) {
  let lp = 0;
  add(
    t0,
    dur,
    (t) => {
      const x = t / dur;
      const a = 1 - Math.exp((-TAU * (300 + 6000 * x * x)) / SR);
      lp += a * (noise() - lp);
      return lp * x * x;
    },
    gain,
  );
}

/** Короткий «вжух» на смене сцены. */
function whoosh(t0: number, gain = 0.12) {
  let lp = 0;
  add(
    t0 - 0.18,
    0.45,
    (t) => {
      const x = t / 0.45;
      const a = 1 - Math.exp((-TAU * (500 + 4000 * Math.sin(Math.PI * x))) / SR);
      lp += a * (noise() - lp);
      return lp * Math.sin(Math.PI * x);
    },
    gain,
  );
}

// ─── Гармония: C — G — Am — F, такт = 2 секунды, сетка от «падения» бита на конце заставки ───
const BEAT = 0.5;
const BAR = 4 * BEAT;
const note = (n: number) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [
  { root: 48, triad: [60, 64, 67] }, // C
  { root: 43, triad: [59, 62, 67] }, // G
  { root: 45, triad: [57, 60, 64] }, // Am
  { root: 41, triad: [57, 60, 65] }, // F
];
const MELODY = [
  [72, 76, 79, 76, 74, 72, 74, 76],
  [71, 74, 79, 74, 71, 74, 76, 74],
  [72, 76, 81, 79, 76, 72, 74, 76],
  [72, 77, 81, 77, 76, 74, 72, 71],
];

// Проигрыш со знакомством с героями — только в трейлере (в промо новых режимов его нет).
const cast = SCENES.find((s) => s.cast) ?? { start: Infinity, duration: 0 };
const castEnd = cast.start + cast.duration;
const end = total - 0.1;
const grooveEnd = outro + 2 * BAR;

// Заставка: аккорд набирает яркость, нарастающий шум, первый удар — на появлении телефона.
synth(0, intro, CHORDS[0].triad.map(note), { gain: 0.42, cutoff: 1100, decay: 0.1, attack: 1.0, detune: 0.004 });
riser(intro - 1.6, 1.6, 0.3);

for (let bar = 0; ; bar++) {
  const t = intro + bar * BAR;
  if (t >= end) break;
  const c = CHORDS[bar % 4];
  const inCast = t + BAR > cast.start - 0.05 && t < castEnd - 0.05;
  const finale = t >= grooveEnd;
  if (finale) {
    // Последний аккорд звенит до конца.
    kick(t);
    synth(t, end - t, [...CHORDS[0].triad, 72].map(note), { gain: 0.22, cutoff: 2400, decay: 0.7, detune: 0.004 });
    synth(t, end - t, [note(36)], { gain: 0.35, wave: saw, cutoff: 300, decay: 0.8 });
    break;
  }
  for (let b = 0; b < 4; b++) {
    const tb = t + b * BEAT;
    if (tb >= end) break;
    const casting = tb >= cast.start - 0.05 && tb < castEnd - 0.05;
    if (!casting) {
      kick(tb);
      if (b % 2 === 1) snare(tb);
    }
    hat(tb + BEAT / 2, casting ? 0.09 : 0.11);
    hat(tb, 0.05, -0.25);
    // Бас восьмыми, на слабую долю — октава выше.
    if (!casting) {
      synth(tb, BEAT / 2 - 0.02, [note(c.root)], { gain: 0.42, cutoff: 500, decay: 5 });
      synth(tb + BEAT / 2, BEAT / 2 - 0.02, [note(c.root + 12)], { gain: 0.3, cutoff: 600, decay: 6 });
    }
    // Аккорды — короткими ударами на слабую долю; в проигрыше — тянутся.
    if (!casting) synth(tb + BEAT / 2, 0.3, c.triad.map(note), { gain: 0.2, cutoff: 2600, decay: 9, detune: 0.005, pan: -0.15 });
  }
  if (inCast) synth(t, BAR, c.triad.map(note), { gain: 0.38, cutoff: 1600, decay: 0.35, attack: 0.08, detune: 0.004 });
  // Мелодия — после первой трети трейлера и в проигрыше.
  if (t >= SCENES[2].start - 0.05 || inCast) {
    MELODY[bar % 4].forEach((m, i) => synth(t + i * (BEAT / 2), BEAT / 2 - 0.03, [note(m + (inCast ? 0 : 12))], { gain: inCast ? 0.2 : 0.07, wave: square, cutoff: 3200, decay: 7, pan: 0.2 }));
  }
}
// Перед возвращением бита после героев — нарастание.
riser(castEnd - 1.2, 1.2, 0.14);

// ─── Звуки к происходящему на экране ───
const correct = (t: number | undefined) => {
  if (t === undefined) return;
  synth(t, 0.18, [note(76)], { gain: 0.28, wave: sine, cutoff: 6000, decay: 10 });
  synth(t + 0.11, 0.4, [note(83)], { gain: 0.28, wave: sine, cutoff: 6000, decay: 6 });
};
const wrong = (t: number | undefined) => {
  if (t === undefined) return;
  synth(t, 0.42, [note(43), note(44)], { gain: 0.3, wave: square, cutoff: 900, decay: 4 });
};
const whistle = (t: number | undefined) => {
  if (t === undefined) return;
  // Свисток: высокий тон с дребезгом.
  add(t, 0.75, (x) => Math.sin(TAU * (2900 * x + 6 * Math.sin(TAU * 32 * x))) * Math.min(1, x / 0.02) * Math.min(1, (0.75 - x) / 0.08) * (0.75 + 0.25 * Math.sin(TAU * 32 * x)), 0.17);
};
const fanfare = (t: number | undefined) => {
  if (t === undefined) return;
  [72, 76, 79, 84].forEach((m, i) => synth(t + i * 0.09, 0.6, [note(m)], { gain: 0.16, wave: (ph) => sine(ph) + 0.3 * sine(2 * ph), cutoff: 5000, decay: 4 }));
};
const tap = (t: number | undefined) => {
  if (t === undefined) return;
  add(t, 0.05, (x) => Math.sin(TAU * 1800 * x) * Math.exp(-x * 120), 0.2);
};

if (CUT === 'modes') {
  for (const s of CUES.duel) tap(at('duel', s));
  fanfare(at('duel-win', CUES.duelWin));
  tap(at('signs', CUES.signCard));
  fanfare(at('signs', CUES.signReward));
  whistle(at('patrol', CUES.patrolCatch));
  correct(at('patrol', CUES.patrolAnswer));
  tap(at('courier', CUES.courierFlag));
  correct(at('courier', CUES.courierAnswer));
} else {
  correct(at('question', 7.8));
  correct(at('firstaid', 8.8));
  wrong(at('wrong', 1.8));
  whistle(at('sokolov', 1.8));
  fanfare(at('rewards', 10.4));
  tap(at('story', 9.9));
}
for (const s of SCENES.slice(1)) whoosh(s.start);
whoosh(outro, 0.16);

// ─── Сведение: мягкое ограничение, нарастание в начале и затухание в конце ───
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.05) * Math.min(1, (total - t) / 1.4);
  L[i] = Math.tanh(L[i] * 0.6) * fade;
  R[i] = Math.tanh(R[i] * 0.6) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const k = 0.89 / peak;
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
const file = CUT === 'modes' ? 'modes.wav' : 'music.wav';
writeFileSync(new URL(`./video/${file}`, import.meta.url), pcm);
console.log(`trailer/video/${file}: ${total.toFixed(1)} с, пик ${peak.toFixed(2)} → 0.89`);
