/**
 * Запись экрана страницы через DevTools (screencast): кадры JPEG с отметками времени,
 * потом ffmpeg собирает из них ровное видео 30 кадров в секунду.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CDPSession, Page } from '@playwright/test';

export interface Frame {
  data: Buffer;
  t: number;
}

export class Screencast {
  private cdp?: CDPSession;
  readonly frames: Frame[] = [];
  private started = 0;
  private ended = 0;
  /** Номера кадров, перед которыми была пауза записи (склейка). */
  private readonly cuts = new Set<number>();
  private pausedAt = 0;

  constructor(private page: Page) {}

  async start(): Promise<void> {
    const vp = this.page.viewportSize()!;
    const cdp = await this.page.context().newCDPSession(this.page);
    this.cdp = cdp;
    cdp.on('Page.screencastFrame', (e: { data: string; metadata: { timestamp?: number }; sessionId: number }) => {
      this.frames.push({ data: Buffer.from(e.data, 'base64'), t: e.metadata.timestamp ?? Date.now() / 1000 });
      void cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
    });
    this.started = Date.now() / 1000;
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: vp.width * 2, maxHeight: vp.height * 2, everyNthFrame: 1 });
  }

  /**
   * Пауза записи: то, что происходит до resume() (ожидание нарушителя, дорога до двери), в ролик
   * не попадёт — будет склейка.
   */
  async pause(): Promise<void> {
    await this.cdp?.send('Page.stopScreencast');
    this.pausedAt = Date.now() / 1000;
  }

  async resume(): Promise<void> {
    this.cuts.add(this.frames.length);
    const vp = this.page.viewportSize()!;
    await this.cdp?.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: vp.width * 2, maxHeight: vp.height * 2, everyNthFrame: 1 });
    this.started += Date.now() / 1000 - this.pausedAt;
  }

  /** Остановить запись; вернуть длительность в секундах. */
  async stop(): Promise<number> {
    this.ended = Date.now() / 1000;
    await this.cdp?.send('Page.stopScreencast');
    await this.cdp?.detach();
    return this.ended - this.started;
  }

  /** Собрать MP4 (H.264, 30 кадров в секунду) из кадров записи. */
  save(file: string, ffmpeg: string, tmp: string): { frames: number; seconds: number } {
    const frames = this.frames;
    if (!frames.length) throw new Error(`нет кадров для ${file}`);
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const lines: string[] = [];
    frames.forEach((f, i) => {
      const name = `f${String(i).padStart(5, '0')}.jpg`;
      writeFileSync(join(tmp, name), f.data);
      // Экран не меняется — кадров нет: последний кадр держится до конца записи. Перед склейкой —
      // один кадр.
      const next = this.cuts.has(i + 1) ? f.t + 1 / 30 : (frames[i + 1]?.t ?? Math.max(this.ended, f.t + 0.1));
      lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    lines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`);
    writeFileSync(join(tmp, 'list.txt'), lines.join('\n'));
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', file]);
    rmSync(tmp, { recursive: true, force: true });
    let seconds = 0;
    frames.forEach((f, i) => (seconds += this.cuts.has(i + 1) ? 1 / 30 : (frames[i + 1]?.t ?? Math.max(this.ended, f.t + 0.1)) - f.t));
    return { frames: frames.length, seconds };
  }
}
