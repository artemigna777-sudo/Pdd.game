import JavaScriptObfuscator from 'javascript-obfuscator';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Чанки, которые не запутываем: библиотеки (чужой открытый код, запутывание только замедлит игру) и данные
 * (вопросы, знаки, ситуации — они и так открытые, а файлы большие). */
const PLAIN = /^(vendor|questions|mapping|signs|scenes|s\d|situations)/;

/** Запутывание кода игры в сборке: чтобы его было трудно скопировать и развивать как свой. Только при
 * `vite build` (`NO_OBFUSCATE=1` — без него, для поиска ошибок); в режиме разработки и в браузерных тестах код
 * обычный. Настройки — без «перемешивания» логики и мёртвого кода, чтобы игра не стала медленнее на недорогих телефонах. */
function obfuscate(): Plugin {
  return {
    name: 'kurier-obfuscate',
    apply: (_, env) => env.command === 'build' && process.env.NO_OBFUSCATE !== '1',
    enforce: 'post',
    // В generateBundle, а не в renderChunk: к этому моменту в коде уже настоящие имена файлов для import()
    // (иначе запутанные строки-заглушки Vite не заменяются и подгрузка частей игры ломается).
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || PLAIN.test(chunk.name)) continue;
        chunk.code = JavaScriptObfuscator.obfuscate(chunk.code, {
          target: 'browser',
          compact: true,
          identifierNamesGenerator: 'mangled',
          renameGlobals: false,
          stringArray: true,
          stringArrayThreshold: 0.75,
          stringArrayEncoding: ['base64'],
          stringArrayRotate: true,
          stringArrayShuffle: true,
          splitStrings: false,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          selfDefending: false,
          debugProtection: false,
          sourceMap: false,
        }).getObfuscatedCode();
      }
    },
  };
}

export default defineConfig({
  // Относительные пути: сборка работает и на https://<user>.github.io/<repo>/, и локально.
  base: './',
  // Версия игры в настройках — время сборки.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  build: {
    target: 'es2020',
    // Phaser сам по себе ~1.2 МБ, это ожидаемо.
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Библиотеки отдельно — их не запутываем (см. obfuscate).
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
  },
  plugins: [
    obfuscate(),
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
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Страницы билетов для поисковиков (scripts/seo.ts) — обычные страницы сайта, не игра.
        navigateFallbackDenylist: [/\/bilety\//, /\/sitemap\.xml$/],
      },
    }),
  ],
});
