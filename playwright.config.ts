import { defineConfig } from '@playwright/test';

/**
 * Браузерные тесты: игра открывается как на телефоне (390×844, касания) и управляется
 * настоящими касаниями по экрану. Запуск: npm run test:e2e.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173/',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
  },
  webServer: {
    // Режим разработки: в нём игра доступна тестам через window.__game.
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
  },
});
