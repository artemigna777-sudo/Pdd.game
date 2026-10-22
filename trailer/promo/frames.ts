/**
 * Покадровая запись игры: время страницы остановлено (часы Playwright), каждый кадр — ровно 1/30 с
 * игрового времени, потом снимок экрана. Так запись плавная при любом разрешении, даже когда
 * браузер без видеокарты рисует город медленнее реального времени.
 *
 * CSS-анимации и Web Animations идут по своим часам — их тоже ставим на паузу и двигаем вручную.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

export const FPS = 30;
const DT = 1000 / FPS;

/** Сдвинуть все анимации страницы на `dt` мс; новые — с начала. */
const stepAnimations = (dt: number) => {
  const w = window as unknown as { __va?: WeakSet<Animation> };
  const seen = (w.__va ??= new WeakSet());
  for (const a of document.getAnimations()) {
    if (!seen.has(a)) {
      seen.add(a);
      a.pause();
      a.currentTime = 0;
    } else {
      a.currentTime = Number(a.currentTime ?? 0) + dt;
    }
  }
};

export class FrameRecorder {
  readonly frames: Buffer[] = [];

  constructor(private readonly page: Page) {}

  /** Один кадр игрового времени. */
  private async tick(capture: boolean): Promise<void> {
    await this.page.clock.runFor(DT);
    await this.page.evaluate(stepAnimations, DT);
    if (capture) this.frames.push(await this.page.screenshot({ type: 'jpeg', quality: 93 }));
  }

  /** Записать `ms` миллисекунд. */
  async record(ms: number, each?: () => Promise<void>): Promise<void> {
    // Для пробы: PROMO_MAX_MS=500 — короткие записи.
    ms = Math.min(ms, Number(process.env.PROMO_MAX_MS ?? Infinity));
    for (let i = 0; i < Math.round(ms / DT); i++) {
      if (each) await each();
      await this.tick(true);
    }
  }

  /** Прокрутить время без записи. */
  async skip(ms: number, each?: () => Promise<void>): Promise<void> {
    for (let i = 0; i < Math.round(ms / DT); i++) {
      if (each) await each();
      await this.tick(false);
    }
  }

  /** Двигать время (с записью или без), пока условие не выполнится. */
  async until(cond: () => Promise<boolean>, opts: { capture?: boolean; max?: number } = {}): Promise<void> {
    const max = opts.max ?? 60_000;
    for (let t = 0; t < max; t += DT) {
      if (await cond()) return;
      await this.tick(opts.capture ?? false);
    }
    throw new Error('условие не выполнилось');
  }

  /** Собрать MP4 из кадров. */
  save(file: string, tmp: string): number {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    this.frames.forEach((f, i) => writeFileSync(join(tmp, `f${String(i).padStart(5, '0')}.jpg`), f));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', file]);
    rmSync(tmp, { recursive: true, force: true });
    return this.frames.length / FPS;
  }
}
