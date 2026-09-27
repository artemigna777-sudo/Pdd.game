/**
 * Мини-игры: отдельная сцена поверх города. Когда машина останавливается у здания мини-игры,
 * сцена открывает «комнату» (кабинет автошколы, пост ДПС, автосервис, место ДТП) и задаёт
 * вопросы серии один за другим, не закрываясь. После последнего вопроса — снова город.
 *
 * Координаты в CSS-пикселях, комната построена вокруг (0, 0) шириной около 380.
 */
import * as Phaser from 'phaser';
import { PIXEL_RATIO } from '../display.ts';
import type { SceneScript } from '../city/sceneScripts.ts';
import type { Placement } from '../../world/mapping.ts';
import type { TemplateId } from '../../world/templates.ts';
import { buildRoom, createMinigame, type Room } from './minigames.ts';

export type MinigameKind = Extract<TemplateId, 'classroom' | 'inspector' | 'garage' | 'first-aid'>;

export interface MinigameContext {
  placement: Placement;
  /** Номер вопроса в серии, с 0. */
  index: number;
  total: number;
}

const ROOM_WIDTH = 380;

export class InteriorScene extends Phaser.Scene {
  kind?: MinigameKind;
  room?: Room;
  /** Предметы текущего вопроса (облачка, отметки) — очищаются перед следующим. */
  layer!: Phaser.GameObjects.Container;
  /** Результаты вопросов текущей серии. */
  results: boolean[] = [];
  /** Где ждёт касания мини-игра (для автотестов). */
  target?: { x: number; y: number };
  private onReady?: (scene: InteriorScene) => void;

  constructor() {
    super('interior');
  }

  init(data: { onReady?: (scene: InteriorScene) => void }) {
    this.onReady = data.onReady;
    this.kind = undefined;
    this.room = undefined;
    this.results = [];
    this.target = undefined;
  }

  create() {
    this.layer = this.add.container(0, 0).setDepth(20);
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fit, this));
    this.onReady?.(this);
  }

  /** На узком экране комната уменьшается, чтобы поместиться по ширине. */
  private fit() {
    const cam = this.cameras.main;
    const cssWidth = this.scale.width / PIXEL_RATIO;
    cam.setZoom(PIXEL_RATIO * Math.min(1, cssWidth / ROOM_WIDTH));
  }

  /** Открыть комнату мини-игры (если уже открыта та же — ничего не делать). */
  async open(kind: MinigameKind): Promise<void> {
    if (this.kind === kind && this.room) return;
    this.room?.container.destroy();
    this.layer.removeAll(true);
    this.kind = kind;
    this.results = [];
    this.room = buildRoom(this, kind);
    const cam = this.cameras.main;
    cam.setBackgroundColor(this.room.background);
    cam.centerOn(0, this.room.center);
    cam.fadeIn(350, 0, 0, 0);
    await this.wait(350);
  }

  async close(): Promise<void> {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    await this.wait(300);
    this.kind = undefined;
    this.scene.stop();
  }

  /** Сдвинуть камеру так, чтобы главное в комнате было видно над карточкой вопроса. */
  focus(visible: number) {
    if (!this.room) return;
    const cam = this.cameras.main;
    const viewH = cam.height / cam.zoom;
    cam.pan(0, this.room.focus + (0.5 - visible / 2) * viewH, 500, 'Sine.easeInOut', true);
  }

  /** Вернуть камеру к комнате целиком (перед следующим вопросом серии). */
  overview() {
    if (!this.room) return;
    this.cameras.main.pan(0, this.room.center, 400, 'Sine.easeInOut', true);
  }

  script(ctx: MinigameContext): SceneScript {
    this.layer.removeAll(true);
    return createMinigame(this, ctx);
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /** Облачко с репликой; хвостик вниз к говорящему в (x, y). */
  bubble(text: string, x: number, y: number, tone: 'info' | 'good' | 'bad' = 'info', width = 230): Phaser.GameObjects.Container {
    const colors = { info: 0xffffff, good: 0xe2f5e8, bad: 0xfde6e9 };
    const ink = { info: '#1b2430', good: '#145c2d', bad: '#8e1a28' };
    const label = this.add
      .text(0, 0, text, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: ink[tone], align: 'center', wordWrap: { width: width - 24 } })
      .setOrigin(0.5, 1)
      .setResolution(PIXEL_RATIO * 2);
    const w = Math.max(80, label.width + 24);
    const h = label.height + 16;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18).fillRoundedRect(-w / 2 + 3, -h - 8 + 3, w, h, 12);
    g.fillStyle(colors[tone]).fillRoundedRect(-w / 2, -h - 8, w, h, 12);
    g.fillTriangle(-8, -9, 8, -9, 0, 0);
    label.setPosition(0, -16);
    const c = this.add.container(x, y, [g, label]).setScale(0.3);
    this.layer.add(c);
    this.tweens.add({ targets: c, scale: 1, duration: 240, ease: 'Back.easeOut' });
    return c;
  }

  /** Крупная надпись-результат. */
  stamp(text: string, x: number, y: number, tone: 'good' | 'bad') {
    const t = this.add
      .text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: tone === 'good' ? '#1f8a43' : '#c62839', padding: { x: 12, y: 6 } })
      .setOrigin(0.5)
      .setResolution(PIXEL_RATIO * 2)
      .setScale(0.3);
    this.layer.add(t);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /**
   * Место, которого нужно коснуться: пульсирующее кольцо и подпись. Промис выполняется
   * после касания. Область касания — не меньше 64 пикселей.
   */
  tapTarget(x: number, y: number, label: string, radius = 32): Promise<void> {
    const ring = this.add.graphics();
    ring.lineStyle(4, 0xffb703).strokeCircle(0, 0, radius);
    ring.fillStyle(0xffb703, 0.18).fillCircle(0, 0, radius);
    const text = this.add
      .text(0, radius + 8, label, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#1b2430', backgroundColor: '#ffb703', padding: { x: 8, y: 4 } })
      .setOrigin(0.5, 0)
      .setResolution(PIXEL_RATIO * 2);
    const c = this.add.container(x, y, [ring, text]);
    this.layer.add(c);
    const pulse = this.tweens.add({ targets: ring, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const zone = this.add.zone(x, y, Math.max(64, radius * 2 + 8), Math.max(64, radius * 2 + 8)).setInteractive({ useHandCursor: true });
    this.layer.add(zone);
    this.target = { x, y };
    return new Promise((resolve) => {
      zone.once(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.target = undefined;
        pulse.stop();
        zone.destroy();
        this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration: 200, onComplete: () => c.destroy() });
        resolve();
      });
    });
  }
}
