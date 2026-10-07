import { registerSW } from 'virtual:pwa-register';
import { showToast } from './ui/toast.ts';
import { trackEvent } from './stats/track.ts';

/** Событие Chrome/Android «можно установить приложение» (нет в стандартных типах DOM). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export type InstallMode = 'prompt' | 'ios-hint' | 'none';

/** Игра открыта с главного экрана (как приложение), а не в браузере. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Как предложить установку: системным окном (Android/Chrome), подсказкой (iOS) или никак (уже установлено). */
export function installMode(): InstallMode {
  if (isStandalone()) return 'none';
  if (installEvent) return 'prompt';
  if (isIos()) return 'ios-hint';
  return 'none';
}

export function onInstallModeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<void> {
  if (!installEvent) return;
  const event = installEvent;
  installEvent = null;
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === 'accepted') trackEvent('install', 'Установили игру на телефон');
  notify();
}

export function setupPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    notify();
    showToast('Игра установлена на главный экран');
  });

  if (!('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    onNeedRefresh() {
      updateReady = true;
      showToast('Доступна новая версия игры', { action: 'Обновить', onAction: () => applyUpdate(), persistent: true });
    },
    onOfflineReady() {
      showToast('Готово: игра работает без интернета');
    },
    onRegisteredSW(_url, r) {
      if (!r) return;
      registration = r;
      // Игра с главного экрана живёт днями без перезагрузки: браузер сам новую версию не ищет.
      // Поэтому проверяем, когда игру снова открыли, и раз в полчаса.
      window.setInterval(() => void quietCheck(), CHECK_EVERY);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void quietCheck();
      });
    },
  });
}

/** Когда собрана эта версия игры (подставляет Vite при сборке). */
export const BUILD_TIME: string = __BUILD_TIME__;

const CHECK_EVERY = 30 * 60_000;
let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let updateReady = false;
let lastCheck = 0;

/** Новая версия скачана и ждёт перезапуска. */
export const isUpdateReady = () => updateReady;

/** Перезапустить игру с новой версией. */
export function applyUpdate(): void {
  if (!updateSW) return window.location.reload();
  // Новая версия взяла управление — перезагрузить страницу (и подстраховка, если сигнал не придёт).
  const reload = () => window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  window.setTimeout(reload, 4000);
  void updateSW(true);
}

async function quietCheck() {
  if (!registration || !navigator.onLine || Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    // Нет сети или сервер недоступен — проверим в следующий раз.
  }
}

export type UpdateCheck = 'ready' | 'downloading' | 'latest' | 'offline' | 'unavailable';

/** Проверить обновление по кнопке в настройках. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (updateReady) return 'ready';
  if (!registration) return 'unavailable';
  if (!navigator.onLine) return 'offline';
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    return 'offline';
  }
  if (updateReady || registration.waiting) return 'ready';
  return registration.installing ? 'downloading' : 'latest';
}
