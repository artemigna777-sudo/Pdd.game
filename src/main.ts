import './style.css';
import { startGame } from './game/game.ts';
import { setupPwa } from './pwa.ts';
import { applyLook, onSettingsChange } from './settings.ts';
import { App } from './ui/app.ts';

applyLook();
onSettingsChange(applyLook);
const game = startGame(document.getElementById('game')!);
new App(document.getElementById('ui')!, game).start();
setupPwa();

// Для автотестов в режиме разработки (в сборку не попадает).
if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = game;
