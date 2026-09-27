import { registerSW } from 'virtual:pwa-register';
import { showToast } from './ui/toast.ts';

/** Событие Chrome/Android «можно установить приложение» (нет в стандартных типах DOM). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export type InstallMode = 'prompt' | 'ios-hint' | 'none';

const isStandalone = () =>
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
  await event.userChoice;
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
  const updateSW = registerSW({
    onNeedRefresh() {
      showToast('Доступна новая версия игры', { action: 'Обновить', onAction: () => updateSW(true), persistent: true });
    },
    onOfflineReady() {
      showToast('Готово: игра работает без интернета');
    },
  });
}
