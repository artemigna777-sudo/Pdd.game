/**
 * Дорожные знаки и светофоры — «таблички», которые всегда стоят лицом к игроку.
 * Форма и цвет — по группе знака (1 — предупреждающие, 2 — приоритета, 3 — запрещающие,
 * 4 — предписывающие, 5–7 — особых предписаний, информационные и сервиса, 8 — таблички).
 * Для частых знаков нарисованы узнаваемые пиктограммы; в карточке вопроса всегда
 * показывается оригинальная картинка билета.
 */
import * as Phaser from 'phaser';
import { PIXEL_RATIO } from '../display.ts';
import type { LightState } from '../../world/templates.ts';

const RED = 0xd62839;
const BLUE = 0x1f5fbf;
const GREEN = 0x1f8a43;
const YELLOW = 0xf4c20d;
const WHITE = 0xffffff;
const BLACK = 0x1b1b1b;
const S = 11; // половина размера знака

type G = Phaser.GameObjects.Graphics;

function triangle(g: G, up: boolean) {
  const h = S * 1.8;
  const pts = up
    ? [new Phaser.Math.Vector2(0, -h / 2), new Phaser.Math.Vector2(S, h / 2), new Phaser.Math.Vector2(-S, h / 2)]
    : [new Phaser.Math.Vector2(-S, -h / 2), new Phaser.Math.Vector2(S, -h / 2), new Phaser.Math.Vector2(0, h / 2)];
  g.fillStyle(RED).fillPoints(pts, true);
  const k = 0.62;
  g.fillStyle(WHITE).fillPoints(
    pts.map((p) => new Phaser.Math.Vector2(p.x * k, p.y * k + (up ? 1.5 : -1.5))),
    true,
  );
}

function circle(g: G, fill: number, ring?: number) {
  if (ring !== undefined) {
    g.fillStyle(ring).fillCircle(0, 0, S);
    g.fillStyle(fill).fillCircle(0, 0, S * 0.72);
  } else {
    g.fillStyle(WHITE).fillCircle(0, 0, S);
    g.fillStyle(fill).fillCircle(0, 0, S * 0.88);
  }
}

function square(g: G, fill: number, w = S * 2, h = S * 2) {
  g.fillStyle(WHITE).fillRoundedRect(-w / 2, -h / 2, w, h, 3);
  g.fillStyle(fill).fillRoundedRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 2);
}

function arrow(g: G, color: number, angle: number, len = 13) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tip = { x: s * len * 0.5, y: -c * len * 0.5 };
  const tail = { x: -s * len * 0.5, y: c * len * 0.5 };
  g.lineStyle(2.4, color).lineBetween(tail.x, tail.y, tip.x, tip.y);
  const back = 4.5;
  g.fillStyle(color).fillTriangle(
    tip.x + s * 1.5,
    tip.y - c * 1.5,
    tip.x - s * back + c * 3.5,
    tip.y + c * back + s * 3.5,
    tip.x - s * back - c * 3.5,
    tip.y + c * back - s * 3.5,
  );
}

function walker(g: G, color: number, x = 0, y = 0) {
  g.fillStyle(color).fillCircle(x, y - 5, 1.8);
  g.lineStyle(1.8, color).lineBetween(x, y - 3, x, y + 2).lineBetween(x, y + 2, x - 2.5, y + 6).lineBetween(x, y + 2, x + 2.5, y + 6);
  g.lineBetween(x - 3, y - 1, x + 3, y - 1);
}

function bicycle(g: G, color: number, x = 0, y = 0) {
  g.lineStyle(1.5, color).strokeCircle(x - 3.5, y + 2, 2.6).strokeCircle(x + 3.5, y + 2, 2.6);
  g.lineBetween(x - 3.5, y + 2, x, y - 2).lineBetween(x, y - 2, x + 3.5, y + 2);
}

function busGlyph(g: G, color: number, x = 0, y = 0) {
  g.fillStyle(color).fillRoundedRect(x - 6, y - 5, 12, 9, 2);
  g.fillStyle(0x000000, 0.3).fillRect(x - 5, y - 4, 10, 3);
  g.fillStyle(color).fillCircle(x - 3.5, y + 4.5, 1.5).fillCircle(x + 3.5, y + 4.5, 1.5);
}

function carGlyph(g: G, color: number, x: number, y: number) {
  g.fillStyle(color).fillRoundedRect(x - 3, y - 4, 6, 8, 1.5);
}

function drawFace(g: G, code: string, scene: Phaser.Scene, container: Phaser.GameObjects.Container, dy: number) {
  const text = (value: string, size: number, color: string, y = 0) => {
    const t = scene.add
      .text(0, dy + y, value, { fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color })
      .setOrigin(0.5)
      .setResolution(PIXEL_RATIO * 2);
    container.add(t);
  };
  const [group, sub = '', third = ''] = code.split('.');
  switch (group) {
    case '1':
      if (sub === '3') {
        // Андреевский крест
        g.lineStyle(7, RED).lineBetween(-S, -S * 0.7, S, S * 0.7).lineBetween(-S, S * 0.7, S, -S * 0.7);
        g.lineStyle(4, WHITE).lineBetween(-S + 1, -S * 0.7 + 1, S - 1, S * 0.7 - 1).lineBetween(-S + 1, S * 0.7 - 1, S - 1, -S * 0.7 + 1);
        break;
      }
      triangle(g, true);
      if (sub === '1') g.fillStyle(BLACK).fillRect(-5, 1, 10, 2).fillRect(-5, 5, 10, 2).fillRect(-4, -1, 1.5, 9).fillRect(2.5, -1, 1.5, 9);
      else if (sub === '2') g.fillStyle(BLACK).fillRoundedRect(-6, 0, 12, 6, 1.5).fillRect(-4, -3, 4, 3);
      else if (sub === '8') {
        g.fillStyle(RED).fillCircle(0, -1.5, 1.8);
        g.fillStyle(YELLOW).fillCircle(0, 2.5, 1.8);
        g.fillStyle(GREEN).fillCircle(0, 6.5, 1.8);
      } else if (sub === '22') walker(g, BLACK, 0, 3);
      else g.fillStyle(BLACK).fillRect(-1.2, -3, 2.4, 6.5).fillCircle(0, 6, 1.4);
      break;
    case '2':
      if (sub === '1' || sub === '2') {
        g.fillStyle(WHITE).fillPoints([new Phaser.Math.Vector2(0, -S - 2), new Phaser.Math.Vector2(S + 2, 0), new Phaser.Math.Vector2(0, S + 2), new Phaser.Math.Vector2(-S - 2, 0)], true);
        g.fillStyle(YELLOW).fillPoints([new Phaser.Math.Vector2(0, -S + 2), new Phaser.Math.Vector2(S - 2, 0), new Phaser.Math.Vector2(0, S - 2), new Phaser.Math.Vector2(-S + 2, 0)], true);
        if (sub === '2') g.lineStyle(1.5, BLACK).lineBetween(-7, 5, 5, -7).lineBetween(-5, 7, 7, -5);
      } else if (sub === '4') {
        triangle(g, false);
      } else if (sub === '5') {
        const pts = Array.from({ length: 8 }, (_, i) => {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          return new Phaser.Math.Vector2(Math.cos(a) * (S + 1), Math.sin(a) * (S + 1));
        });
        g.fillStyle(WHITE).fillPoints(pts, true);
        g.fillStyle(RED).fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x * 0.88, p.y * 0.88)), true);
        text('STOP', 6.5, '#ffffff');
      } else if (sub === '6') {
        circle(g, WHITE, RED);
        arrow(g, BLACK, 0, 11);
        g.fillStyle(RED).fillRect(3, -5, 2, 9);
      } else if (sub === '7') {
        square(g, BLUE);
        arrow(g, WHITE, 0, 12);
        g.fillStyle(RED).fillRect(-5, -5, 2, 9);
      } else {
        triangle(g, true);
        g.fillStyle(BLACK).fillRect(-1.5, -4, 3, 11).fillRect(-5, 0, 10, 2.5);
      }
      break;
    case '3':
      if (sub === '1') {
        circle(g, RED);
        g.fillStyle(WHITE).fillRect(-7, -2, 14, 4);
      } else if (sub === '27' || sub === '28') {
        circle(g, BLUE, RED);
        g.lineStyle(2.5, RED).lineBetween(-6, -6, 6, 6);
        if (sub === '27') g.lineBetween(-6, 6, 6, -6);
      } else {
        circle(g, WHITE, RED);
        if (sub === '20') {
          carGlyph(g, RED, -3.5, 0);
          carGlyph(g, BLACK, 3.5, 0);
        } else if (sub === '18' || sub === '19') {
          arrow(g, BLACK, third === '2' || sub === '19' ? -Math.PI / 2 : Math.PI / 2, 10);
          g.lineStyle(2, RED).lineBetween(-6, -6, 6, 6);
        } else if (sub === '24') text('40', 8, '#1b1b1b');
        else g.fillStyle(BLACK).fillRect(-5, -1, 10, 2);
      }
      break;
    case '4':
      circle(g, BLUE);
      if (sub === '1') {
        if (third === '2') arrow(g, WHITE, Math.PI / 2);
        else if (third === '3') arrow(g, WHITE, -Math.PI / 2);
        else arrow(g, WHITE, 0);
      } else if (sub === '3') {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          g.lineStyle(2, WHITE).beginPath().arc(0, 0, 5.5, a, a + 1.3).strokePath();
          g.fillStyle(WHITE).fillCircle(Math.cos(a + 1.4) * 5.5, Math.sin(a + 1.4) * 5.5, 1.8);
        }
      } else if (sub === '4') bicycle(g, WHITE);
      else if (sub === '5') {
        if (third === '4' || third === '6') {
          g.lineStyle(1.5, WHITE).lineBetween(0, -8, 0, 8);
          bicycle(g, WHITE, -4.5, 0);
          walker(g, WHITE, 4.5, 1);
        } else {
          walker(g, WHITE, 0, -1);
          bicycle(g, WHITE, 0, 5);
        }
      } else arrow(g, WHITE, 0);
      break;
    case '5':
      if (sub === '1' || sub === '2') {
        square(g, GREEN);
        g.lineStyle(2, WHITE).lineBetween(-6, 7, -2, -6).lineBetween(6, 7, 2, -6);
        g.lineStyle(1.5, WHITE).lineBetween(-7, -1, 7, -1);
        if (sub === '2') g.lineStyle(2, RED).lineBetween(-7, 7, 7, -7);
      } else if (sub === '14' || sub === '16') {
        square(g, BLUE);
        busGlyph(g, WHITE, 0, sub === '14' ? 3 : 0);
        if (sub === '14') arrow(g, WHITE, 0, 7);
      } else if (sub === '19') {
        square(g, BLUE);
        g.fillStyle(WHITE).fillTriangle(0, -8, 8, 7, -8, 7);
        walker(g, BLACK, 0, 2);
      } else if (sub === '21' || sub === '22') {
        square(g, BLUE, S * 2.6, S * 2);
        g.fillStyle(WHITE).fillRect(-11, -1, 7, 6).fillTriangle(-12, -1, -7.5, -6, -3, -1);
        walker(g, WHITE, 3, 0);
        walker(g, WHITE, 8, 1);
        if (sub === '22') g.lineStyle(2, RED).lineBetween(-12, 8, 12, -8);
      } else {
        square(g, BLUE);
        g.fillStyle(WHITE).fillRect(-1.5, -6, 3, 12);
      }
      break;
    case '6':
      square(g, BLUE);
      if (sub === '4') text('P', 13, '#ffffff');
      else g.fillStyle(WHITE).fillCircle(0, 0, 4);
      break;
    case '7':
      square(g, BLUE, S * 2, S * 2.4);
      g.fillStyle(WHITE).fillRect(-7, -9, 14, 12);
      g.fillStyle(BLACK).fillTriangle(0, -7, 4, 1, -4, 1);
      break;
    case '8': {
      g.fillStyle(BLACK).fillRect(-S - 1, -7, S * 2 + 2, 14);
      g.fillStyle(WHITE).fillRect(-S, -6, S * 2, 12);
      if (sub === '13') {
        g.lineStyle(3, BLACK).lineBetween(0, 5, 0, -5);
        g.lineStyle(1.2, BLACK).lineBetween(0, 0, 7, 0).lineBetween(0, 0, -7, 0);
      } else if (sub === '1') text('500 м', 6, '#1b1b1b');
      else g.fillStyle(BLACK).fillRect(-6, -1, 12, 2);
      break;
    }
    default:
      circle(g, WHITE, RED);
  }
}

/**
 * Знак на стойке. Основание стойки — в (0, 0), знак над ним. Код может быть составным:
 * "2.1+8.13" — знак с табличкой под ним.
 */
export function createSign(scene: Phaser.Scene, code: string): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const parts = code.split('+');
  const pole = scene.add.graphics();
  const height = 20 + parts.length * 26;
  pole.fillStyle(0x000000, 0.2).fillEllipse(3, 2, 8, 4);
  pole.fillStyle(0x9aa3ad).fillRect(-1.2, -height + 8, 2.4, height - 8);
  container.add(pole);
  parts.forEach((part, i) => {
    const g = scene.add.graphics();
    const cy = -height + 12 + i * 24;
    g.setPosition(0, cy);
    container.add(g);
    drawFace(g, part, scene, container, cy);
  });
  return container;
}

/** Светофор-табличка: красный, жёлтый, зелёный и, при необходимости, дополнительная секция-стрелка. */
export class TrafficLightView {
  readonly container: Phaser.GameObjects.Container;
  private readonly lamps: Phaser.GameObjects.Graphics;
  private state: LightState = 'green';
  private arrow?: 'left' | 'right';
  private blinkOn = true;
  private elapsed = 0;

  constructor(scene: Phaser.Scene, arrow?: 'left' | 'right') {
    this.arrow = arrow;
    this.container = scene.add.container(0, 0);
    const housing = scene.add.graphics();
    housing.fillStyle(0x000000, 0.2).fillEllipse(3, 2, 8, 4);
    housing.fillStyle(0x6b7280).fillRect(-1.2, -30, 2.4, 30);
    housing.fillStyle(0x1f2328).fillRoundedRect(-7, -64, 14, 36, 4);
    if (arrow) housing.fillStyle(0x1f2328).fillRoundedRect(arrow === 'right' ? 6 : -18, -40, 12, 12, 3);
    this.lamps = scene.add.graphics();
    this.container.add([housing, this.lamps]);
    this.draw();
  }

  setState(state: LightState) {
    this.state = state;
    this.elapsed = 0;
    this.blinkOn = true;
    this.draw();
  }

  update(dt: number) {
    if (!this.state.endsWith('blink')) return;
    this.elapsed += dt;
    if (this.elapsed > 0.45) {
      this.elapsed = 0;
      this.blinkOn = !this.blinkOn;
      this.draw();
    }
  }

  private draw() {
    const g = this.lamps.clear();
    const off = 0x3a3f46;
    const on = (c: string) => this.state === c || (this.state === `${c}-blink` && this.blinkOn) || (this.state === 'red-yellow' && (c === 'red' || c === 'yellow'));
    g.fillStyle(on('red') ? 0xff3b30 : off).fillCircle(0, -57, 4.2);
    g.fillStyle(on('yellow') ? 0xffcc00 : off).fillCircle(0, -46, 4.2);
    g.fillStyle(on('green') ? 0x34c759 : off).fillCircle(0, -35, 4.2);
    if (this.arrow) {
      const x = this.arrow === 'right' ? 12 : -12;
      g.fillStyle(0x34c759).fillCircle(x, -34, 4);
      g.fillStyle(0x1f2328).fillTriangle(x + (this.arrow === 'right' ? 3 : -3), -34, x - (this.arrow === 'right' ? 1 : -1), -37, x - (this.arrow === 'right' ? 1 : -1), -31);
    }
  }
}
