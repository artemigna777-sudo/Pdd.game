import * as Phaser from 'phaser';
import { PIXEL_RATIO } from './display.ts';
import { CityScene } from './city/CityScene.ts';
import { InteriorScene } from './interior/InteriorScene.ts';
import { StreetScene } from './StreetScene.ts';

/**
 * Запускает Phaser на весь экран. Холст рисуется в физических пикселях (чётко на
 * любых экранах), а сцены работают в CSS-пикселях: камера увеличена на PIXEL_RATIO.
 */
export function startGame(parent: HTMLElement): Phaser.Game {
  const size = () => ({ width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight });
  const { width, height } = size();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1b2430',
    banner: false,
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'low-power' },
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(width * PIXEL_RATIO),
      height: Math.round(height * PIXEL_RATIO),
      zoom: 1 / PIXEL_RATIO,
    },
    scene: [StreetScene, CityScene, InteriorScene],
  });

  new ResizeObserver(() => {
    const next = size();
    game.scale.resize(Math.round(next.width * PIXEL_RATIO), Math.round(next.height * PIXEL_RATIO));
    game.scale.setZoom(1 / PIXEL_RATIO);
  }).observe(parent);

  return game;
}

/** Останавливает отрисовку, пока сцену закрывает интерфейс (экономит батарею). */
export function setGameActive(game: Phaser.Game, active: boolean): void {
  if (active && !game.loop.running) game.loop.wake();
  else if (!active && game.loop.running) game.loop.sleep();
}
