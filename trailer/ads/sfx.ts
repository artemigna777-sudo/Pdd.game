/**
 * Звуки поверх музыки для роликов-сценок (`engine7.ts`): синтез, без чужих записей.
 * tick — щелчок таймера, buzz — «неверно», ding — «верно», whoosh — склейка/вылет карточки,
 * pop — появление значка, boom — удар на главной цифре.
 */
import { writeFileSync } from 'node:fs';

export type Sfx = 'tick' | 'buzz' | 'ding' | 'whoosh' | 'pop' | 'boom';

const RATE = 48_000;

/** Детерминированный шум (одинаковый звук при каждой сборке). */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

function render(kind: Sfx): Float32Array {
  const dur = { tick: 0.06, buzz: 0.42, ding: 0.9, whoosh: 0.38, pop: 0.12, boom: 0.9 }[kind];
  const n = Math.round(dur * RATE);
  const out = new Float32Array(n);
  const rnd = noise(kind.length * 977);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const k = t / dur;
    let v = 0;
    switch (kind) {
      case 'tick':
        v = Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 90) * 0.7 + rnd() * Math.exp(-t * 300) * 0.3;
        break;
      case 'buzz': {
        // Два расстроенных «пилообразных» тона и мягкое начало — как гудок «неверно» в викторине.
        const saw = (f: number) => 2 * ((t * f) % 1) - 1;
        v = (saw(146) + saw(155)) * 0.3 * Math.min(1, t * 60) * (k < 0.8 ? 1 : (1 - k) / 0.2);
        break;
      }
      case 'ding':
        v = (Math.sin(2 * Math.PI * 1318.5 * t) * 0.5 + Math.sin(2 * Math.PI * 1975.5 * t) * 0.3 + Math.sin(2 * Math.PI * 2637 * t) * 0.12) * Math.exp(-t * 4.5) * Math.min(1, t * 400);
        break;
      case 'whoosh': {
        // Шум с «плывущим» фильтром: громче в середине.
        const cut = 0.02 + 0.25 * Math.sin(Math.PI * k);
        lp += cut * (rnd() - lp);
        v = lp * Math.sin(Math.PI * k) ** 1.5 * 2.2;
        break;
      }
      case 'pop':
        v = Math.sin(2 * Math.PI * (500 + 900 * Math.exp(-t * 40)) * t) * Math.exp(-t * 35) * 0.8;
        break;
      case 'boom':
        v = Math.sin(2 * Math.PI * (48 + 80 * Math.exp(-t * 12)) * t) * Math.exp(-t * 4) * 0.95 + rnd() * Math.exp(-t * 30) * 0.25;
        break;
    }
    out[i] = v;
  }
  return out;
}

/** Собрать дорожку звуков длиной `end` секунд и записать WAV (48 кГц, стерео, 16 бит). */
export function writeSfx(file: URL | string, cues: [number, Sfx][], end: number, gain = 0.55): void {
  const n = Math.round(end * RATE);
  const mix = new Float32Array(n);
  const cache = new Map<Sfx, Float32Array>();
  for (const [t, kind] of cues) {
    const s = cache.get(kind) ?? render(kind);
    cache.set(kind, s);
    const at = Math.round(t * RATE);
    for (let i = 0; i < s.length && at + i < n; i++) mix[at + i] += s[i] * gain;
  }
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, mix[i])) * 32767;
    buf.writeInt16LE(v | 0, 44 + i * 4);
    buf.writeInt16LE(v | 0, 46 + i * 4);
  }
  writeFileSync(file, buf);
}
