/**
 * Звуки города (этап 7): шум мотора, который меняется со скоростью машины, фон улицы и сирена
 * скорой в событии. Всё синтезируется кодом (Web Audio), без файлов. Громкость небольшая, звук
 * выключается вместе с остальными звуками в настройках, на паузе и в фоне.
 */
import { getSettings, onSettingsChange } from '../settings.ts';
import { context } from './feedback.ts';

/** Параметры мотора по скорости машины (пикселей в секунду). */
export function engineParams(speed: number): { freq: number; gain: number; cutoff: number } {
  const k = Math.max(0, Math.min(1, speed / 220));
  return { freq: 38 + 70 * k, gain: 0.018 + 0.03 * k, cutoff: 320 + 700 * k };
}

export class CityAudio {
  private master?: GainNode;
  private engine?: OscillatorNode;
  private engineGain?: GainNode;
  private filter?: BiquadFilterNode;
  private noise?: AudioBufferSourceNode;
  private siren?: { osc: OscillatorNode; gain: GainNode; timer: number };
  private running = false;
  private paused = false;
  private readonly unsubscribe: () => void;
  private readonly onVisibility = () => this.updateVolume();

  constructor() {
    this.unsubscribe = onSettingsChange(() => this.updateVolume());
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private get audible(): boolean {
    return this.running && !this.paused && getSettings().sound && !document.hidden;
  }

  /** Запустить звуки (если звук включён; контекст создаётся при первом касании). */
  start() {
    this.running = true;
    this.ensure();
    this.updateVolume();
  }

  private ensure() {
    if (this.master || !getSettings().sound) return;
    const c = context();
    if (!c) return;
    try {
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.master.connect(c.destination);

      // Мотор: низкая «пила» через фильтр.
      this.filter = c.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 320;
      this.engineGain = c.createGain();
      this.engineGain.gain.value = 0.018;
      this.engine = c.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 38;
      this.engine.connect(this.filter).connect(this.engineGain).connect(this.master);
      this.engine.start();

      // Фон улицы: «коричневый» шум, приглушённый фильтром.
      const seconds = 3;
      const buffer = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.2;
      }
      this.noise = c.createBufferSource();
      this.noise.buffer = buffer;
      this.noise.loop = true;
      const street = c.createBiquadFilter();
      street.type = 'lowpass';
      street.frequency.value = 480;
      const streetGain = c.createGain();
      streetGain.gain.value = 0.05;
      this.noise.connect(street).connect(streetGain).connect(this.master);
      this.noise.start();
    } catch {
      this.master = undefined;
    }
  }

  private updateVolume() {
    if (this.audible) this.ensure();
    const c = context();
    if (!c || !this.master) return;
    const now = c.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.audible ? 1 : 0, now, 0.15);
  }

  /** Скорость машины игрока — высота и громкость мотора. */
  setSpeed(speed: number) {
    const c = context();
    if (!c || !this.engine || !this.engineGain || !this.filter || !this.audible) return;
    const p = engineParams(speed);
    const now = c.currentTime;
    this.engine.frequency.setTargetAtTime(p.freq, now, 0.25);
    this.engineGain.gain.setTargetAtTime(p.gain, now, 0.25);
    this.filter.frequency.setTargetAtTime(p.cutoff, now, 0.25);
  }

  /** Сирена скорой: два тона по очереди; громкость — по расстоянию (0…1). */
  sirenOn(level = 1) {
    const c = context();
    if (!c || !this.master) return;
    if (!this.siren) {
      try {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        const gain = c.createGain();
        gain.gain.value = 0;
        osc.connect(gain).connect(this.master);
        osc.start();
        let high = false;
        const timer = window.setInterval(() => {
          high = !high;
          osc.frequency.setTargetAtTime(high ? 960 : 700, c.currentTime, 0.02);
        }, 420);
        osc.frequency.value = 700;
        this.siren = { osc, gain, timer };
      } catch {
        return;
      }
    }
    this.siren.gain.gain.setTargetAtTime(0.05 * Math.max(0, Math.min(1, level)), c.currentTime, 0.1);
  }

  sirenOff() {
    const s = this.siren;
    const c = context();
    if (!s || !c) return;
    this.siren = undefined;
    window.clearInterval(s.timer);
    s.gain.gain.setTargetAtTime(0, c.currentTime, 0.2);
    window.setTimeout(() => {
      try {
        s.osc.stop();
      } catch {
        // уже остановлен
      }
    }, 800);
  }

  /** Пауза (сюжетная сцена, мини-игра) — тише, продолжение — снова. */
  setPaused(paused: boolean) {
    this.paused = paused;
    this.updateVolume();
  }

  stop() {
    this.running = false;
    this.sirenOff();
    this.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const c = context();
    const nodes = [this.engine, this.noise];
    if (c && this.master) this.master.gain.setTargetAtTime(0, c.currentTime, 0.1);
    const master = this.master;
    this.master = undefined;
    window.setTimeout(() => {
      for (const n of nodes) {
        try {
          n?.stop();
        } catch {
          // уже остановлен
        }
      }
      master?.disconnect();
    }, 500);
  }
}
