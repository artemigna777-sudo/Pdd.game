/**
 * Иконки и заставка Android-приложения (android/, Capacitor) из иконки игры public/icons/maskable-512.png.
 * Запуск: npx tsx scripts/android-res.ts — после `npx cap add android` или смены иконки.
 */
import { readdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/icons/maskable-512.png';
const RES = 'android/app/src/main/res';
const BG = '#1b2430';
const DPI = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const;

for (const [name, k] of Object.entries(DPI)) {
  const dir = `${RES}/mipmap-${name}`;
  const legacy = Math.round(48 * k);
  await sharp(SRC).resize(legacy, legacy).png().toFile(`${dir}/ic_launcher.png`);
  const circle = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`);
  await sharp(SRC).resize(legacy, legacy).composite([{ input: circle, blend: 'dest-in' }]).png().toFile(`${dir}/ic_launcher_round.png`);
  // Слой адаптивной иконки: 108 dp, рисунок на всю площадь (маска телефона обрежет края).
  const fg = Math.round(108 * k);
  await sharp(SRC).resize(fg, fg).png().toFile(`${dir}/ic_launcher_foreground.png`);
}

// Заставка: тёмный фон игры, иконка по центру со скруглёнными углами.
const icon = await sharp(SRC)
  .resize(360, 360)
  .composite([{ input: Buffer.from('<svg width="360" height="360"><rect width="360" height="360" rx="80"/></svg>'), blend: 'dest-in' }])
  .png()
  .toBuffer();
for (const d of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
  const file = `${RES}/${d}/splash.png`;
  try {
    const { width, height } = await sharp(file).metadata();
    const w = width!;
    const h = height!;
    const s = Math.round(Math.min(w, h) * 0.32);
    await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
      .composite([{ input: await sharp(icon).resize(s, s).toBuffer(), gravity: 'center' }])
      .png()
      .toFile(file + '.tmp.png');
    await sharp(file + '.tmp.png').toFile(file);
  } catch {
    // в этой папке нет заставки
  }
}
console.log('Android: иконки и заставка готовы');
