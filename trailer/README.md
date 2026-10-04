# Трейлер «Курьер ПДД»

Вертикальный ролик 1080×1920, около минуты: заставка, настоящие кадры игры в телефоне с подписями,
знакомство с героями и финальная карточка со ссылкой на игру. Готовый файл — `kurier-pdd-trailer.mp4`.

Ролик собирается в [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP → MP4) на своём
компьютере, без облака и без платных кредитов. Музыка и звуки синтезированы кодом, шрифт — Montserrat
(лицензия SIL OFL, `video/fonts/OFL.txt`).

## Как пересобрать

Нужны Node.js 22, ffmpeg и ffprobe в `PATH`.

1. Запустить игру: `npx vite --port 5173 --strictPort`.
2. Записать кадры игры: `npx tsx trailer/record.ts` — 11 записей в `trailer/video/clips/`
   (можно одну: `npx tsx trailer/record.ts sokolov`). Прогресс игрока для записи — `trailer/seed.ts`,
   он получен обычными функциями игры.
3. Музыка: `npx tsx trailer/music.ts` → `trailer/video/music.wav`.
4. Композиция: `npx tsx trailer/build.ts` → `trailer/video/index.html`. Подписи и отрезки записей — в
   `trailer/scenes.ts`, портреты героев и машина берутся прямо из кода игры.
5. Рендер:
   ```
   cd trailer/video
   npx hyperframes@0.8.119 browser ensure
   npx hyperframes@0.8.119 render . --fps 30 --crf 21 --video-frame-format png -o ../kurier-pdd-trailer.mp4
   ```

Проверить отдельные кадры без рендера: `npx hyperframes@0.8.119 snapshot . --at 4.5,24,58`.
