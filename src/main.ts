import './style.css';
import { startGame } from './game/game.ts';
import { setupPwa } from './pwa.ts';
import { App } from './ui/app.ts';

const game = startGame(document.getElementById('game')!);
new App(document.getElementById('ui')!, game).start();
setupPwa();
