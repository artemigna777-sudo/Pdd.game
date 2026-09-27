import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Относительные пути: сборка работает и на https://<user>.github.io/<repo>/, и локально.
  base: './',
  build: {
    target: 'es2020',
    // Phaser сам по себе ~1.2 МБ, это ожидаемо.
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Иконки и так попадают в кэш по globPatterns ниже.
      includeManifestIcons: false,
      manifest: {
        id: './',
        name: 'Курьер ПДД — игра для подготовки к экзамену',
        short_name: 'Курьер ПДД',
        description: 'Игра для подготовки к теории на права: все экзаменационные билеты ПДД категорий A, B, M.',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1b2430',
        theme_color: '#1b2430',
        categories: ['education', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Всё, включая картинки билетов (~9 МБ), кладём в кэш сразу: игра должна работать без интернета.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
