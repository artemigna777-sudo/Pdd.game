import './style.css';
import { startGame } from './game/game.ts';
import { setupPwa } from './pwa.ts';
import { App } from './ui/app.ts';

const game = startGame(document.getElementById('game')!);
new App(document.getElementById('ui')!, game).start();
setupPwa();

// Для автотестов в режиме разработки (в сборку не попадает).
if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = game;
