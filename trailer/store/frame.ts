/**
 * Скриншоты для RuStore: кадр игры в рамке телефона или планшета и подпись сверху, 1440×2560 JPG.
 * Кадры снимает `trailer/store/shots.ts`.
 *
 *   npx tsx trailer/store/frame.ts <папка> [phone|tablet]
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const DIR = process.argv[2];
const DEVICE = (process.argv[3] ?? 'phone') as 'phone' | 'tablet';

/** Порядок в магазине: первые три видно сразу. Подпись — две строки, вторая жёлтая. */
const ITEMS: Record<'phone' | 'tablet', [string, string, string][]> = {
  phone: [
    ['question', 'Билеты ПДД —', 'прямо на перекрёстке'],
    ['story', 'Сюжет как в кино:', 'твой выбор меняет историю'],
    ['wrong', 'Ошибся? Увидишь', 'последствия и «почему»'],
    ['exam', 'Экзамен как в ГИБДД:', '20 вопросов, 20 минут'],
    ['situations', 'Ситуации на дороге', 'на время, как в жизни'],
    ['progress', 'Готовность к экзамену', 'в процентах'],
    ['neon', 'Темы города', 'и стильные карточки'],
    ['signs', 'Собери все знаки', 'в Знакодексе'],
    ['modes', 'Дуэли, пост ДПС', 'и смена курьера'],
    ['menu', 'Уровни, монеты', 'и 10 глав сюжета'],
  ],
  tablet: [
    ['question', 'Билеты ПДД —', 'прямо на перекрёстке'],
    ['story', 'Сюжет как в кино:', 'твой выбор меняет историю'],
    ['exam', 'Экзамен как в ГИБДД:', '20 вопросов, 20 минут'],
    ['situations', 'Ситуации на дороге', 'на время, как в жизни'],
    ['progress', 'Готовность к экзамену', 'в процентах'],
    ['signs', 'Собери все знаки', 'в Знакодексе'],
  ],
};

const font = (f: string) => readFileSync(new URL(`../video/fonts/${f}`, import.meta.url)).toString('base64');
const FONTS = `
@font-face{font-family:M;font-weight:100 900;src:url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:M;font-weight:100 900;src:url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}`;

// Экран устройства: телефон 1:2, планшет 5:8; высота рамки одинаковая.
const SCREEN = DEVICE === 'phone' ? { w: 932, h: 1864, radius: 64, bezel: 18 } : { w: 1150, h: 1840, radius: 46, bezel: 30 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 2560 } });
let n = 1;
for (const [name, top, accent] of ITEMS[DEVICE]) {
  const img = readFileSync(`${DIR}/raw/${DEVICE}/${name}.png`).toString('base64');
  await page.setContent(`<!doctype html><html><head><style>${FONTS}
  *{box-sizing:border-box}
  body{margin:0;width:1440px;height:2560px;overflow:hidden;font-family:M,sans-serif;
    background:radial-gradient(900px 900px at 50% 62%,rgba(255,183,3,.20),transparent 70%),linear-gradient(170deg,#26354f 0%,#161e2c 55%,#0f141d 100%)}
  .cap{position:absolute;left:80px;right:80px;top:150px;height:330px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;letter-spacing:-1.5px;line-height:1.08}
  .cap b{display:block;font-weight:800;font-size:96px;color:#fff;white-space:nowrap}
  .cap i{display:block;font-style:normal;font-weight:800;font-size:96px;color:#ffb703;white-space:nowrap}
  .dev{position:absolute;left:50%;top:${560 - SCREEN.bezel}px;transform:translateX(-50%);padding:${SCREEN.bezel}px;border-radius:${SCREEN.radius + SCREEN.bezel}px;
    background:#0a0d13;box-shadow:0 0 0 3px #2c3546,0 50px 120px rgba(0,0,0,.6)}
  .dev img{display:block;width:${SCREEN.w}px;height:${SCREEN.h}px;border-radius:${SCREEN.radius}px;object-fit:cover;object-position:top}
  </style></head><body>
  <div class="cap"><b>${top}</b><i>${accent}</i></div>
  <div class="dev"><img src="data:image/png;base64,${img}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  // Каждая строка подписи — в одну строку: длинные чуть мельче.
  await page.evaluate(() => {
    const cap = document.querySelector<HTMLElement>('.cap')!;
    let size = 96;
    while (size > 60 && [...cap.children].some((c) => (c as HTMLElement).scrollWidth > cap.clientWidth)) {
      size -= 2;
      for (const c of cap.children) (c as HTMLElement).style.fontSize = `${size}px`;
    }
  });
  await page.screenshot({ path: `${DIR}/kurier-pdd-${DEVICE === 'phone' ? '' : 'tablet-'}${String(n).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 92 });
  n++;
}
await browser.close();
