/**
 * Иконки приложения (PWA, главный экран, вкладка браузера).
 *
 *   npm run icons
 *
 * Рисунок задан кодом ниже: вид сверху на дорогу и жёлтую машину курьера в правой полосе.
 * Машина держится в центральной «безопасной зоне», чтобы маскируемая иконка Android
 * не обрезала её ни в круге, ни в скруглённом квадрате.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'icons');

const art = `
  <rect width="512" height="512" fill="#3f8a4a"/>
  <circle cx="54" cy="70" r="34" fill="#2f6f3a"/>
  <circle cx="60" cy="420" r="40" fill="#2f6f3a"/>
  <circle cx="462" cy="250" r="30" fill="#2f6f3a"/>
  <rect x="104" width="12" height="512" fill="#c9ced6"/>
  <rect x="396" width="12" height="512" fill="#c9ced6"/>
  <rect x="116" width="280" height="512" fill="#3b4049"/>
  <g fill="#f4f4f4">
    <rect x="250" y="-20" width="12" height="70" rx="3"/>
    <rect x="250" y="110" width="12" height="70" rx="3"/>
    <rect x="250" y="240" width="12" height="70" rx="3"/>
    <rect x="250" y="370" width="12" height="70" rx="3"/>
    <rect x="250" y="500" width="12" height="70" rx="3"/>
  </g>
  <g transform="translate(326 270)">
    <rect x="-62" y="-104" width="124" height="208" rx="34" fill="#1f2530" opacity="0.35" transform="translate(6 8)"/>
    <rect x="-62" y="-108" width="124" height="216" rx="34" fill="#ffb703"/>
    <rect x="-48" y="-70" width="96" height="34" rx="10" fill="#1d3557"/>
    <rect x="-46" y="-30" width="92" height="84" rx="14" fill="#ffd166"/>
    <rect x="-26" y="-14" width="52" height="46" rx="6" fill="#c77d3a"/>
    <rect x="-26" y="5" width="52" height="6" fill="#9c5c26"/>
    <rect x="-44" y="60" width="88" height="26" rx="9" fill="#1d3557"/>
    <rect x="-52" y="-106" width="26" height="12" rx="6" fill="#fff3b0"/>
    <rect x="26" y="-106" width="26" height="12" rx="6" fill="#fff3b0"/>
    <rect x="-52" y="96" width="22" height="9" rx="4" fill="#e63946"/>
    <rect x="30" y="96" width="22" height="9" rx="4" fill="#e63946"/>
  </g>`;

/** Квадрат во весь размер: для маскируемой иконки Android и iOS (они скругляют сами). */
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${art}</svg>`;

/** Скруглённый квадрат: для обычной иконки и вкладки браузера. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><clipPath id="c"><rect width="512" height="512" rx="112"/></clipPath></defs>
  <g clip-path="url(#c)">${art}</g>
</svg>`;

async function png(svg: string, size: number, file: string) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  console.log(`public/icons/${file}`);
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'icon.svg'), rounded);
console.log('public/icons/icon.svg');
await png(rounded, 192, 'icon-192.png');
await png(rounded, 512, 'icon-512.png');
await png(fullBleed, 512, 'maskable-512.png');
await png(fullBleed, 180, 'apple-touch-icon.png');
