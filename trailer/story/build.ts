/**
 * Собирает ролик-историю в композицию HyperFrames: out/index.html + gsap + текстура + музыка.
 * Запуск: npx tsx trailer/story/build.ts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bracketIcon } from '../ads/draw.ts';
import { DEFS, H, W } from './art.ts';
import { CUTS, END, END_CARD, SHOTS, type Shot } from './shots.ts';

const font = (file: string) => readFileSync(new URL(`../video/fonts/${file}`, import.meta.url)).toString('base64');
const FONTS = `@font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`;

if (CUTS.length !== SHOTS.length) throw new Error(`Склеек ${CUTS.length}, а кадров ${SHOTS.length}`);

const camAt = (fx: number, fy: number, s: number) => ({ x: +(540 - fx * s).toFixed(1), y: +(960 - fy * s).toFixed(1), scale: s });

function shotHtml(s: Shot, i: number, t0: number, t1: number) {
  const gr = s.grade ?? {};
  const layers = [
    gr.tint ? `<div class="grade" style="background:${gr.tint};opacity:${gr.tintOp ?? 0.2};mix-blend-mode:multiply"></div>` : '',
    gr.lift ? `<div class="grade" style="background:${gr.lift};opacity:${gr.liftOp ?? 0.1};mix-blend-mode:screen"></div>` : '',
    `<div class="grade" style="background:radial-gradient(75% 55% at 50% 48%, rgba(0,0,0,0) 50%, rgba(20,12,8,${gr.vignette ?? 0.45}) 100%)"></div>`,
  ].join('');
  return `<div class="clip shot s${i}" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}" style="background:${s.bg}">
        <div class="cam" id="cam${i}"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" overflow="visible"><g filter="url(#wob)">${s.svg}</g></svg></div>
        ${layers}
      </div>`;
}

export function build(): string {
  const times = [...CUTS, END_CARD];
  const html: string[] = [];
  const tw: string[] = [];
  SHOTS.forEach((s, i) => {
    const t0 = times[i];
    const t1 = times[i + 1];
    html.push(shotHtml(s, i, t0, t1));
    const c = s.cam;
    tw.push(`tl.set('#cam${i}', ${JSON.stringify(camAt(c.fx, c.fy, c.s0))}, ${t0});`);
    tw.push(`tl.to('#cam${i}', { ...${JSON.stringify(camAt(c.fx + (c.dx ?? 0), c.fy + (c.dy ?? 0), c.s1))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
    if (s.anim) tw.push(s.anim(t0, t1));
  });
  const icon = bracketIcon('<rect x="-46" y="-46" width="92" height="92" rx="20" fill="#1c1c1e" stroke="#1c1c1e"/>', '#f4f4f2', '#f4f4f2');
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Третья попытка</title>
    <script src="gsap.min.js"></script>
    <style>
      ${FONTS}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; font-family: 'Montserrat', sans-serif; }
      .shot { position: absolute; inset: 0; overflow: hidden; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .grade { position: absolute; inset: 0; pointer-events: none; }
      #grain { position: absolute; inset: 0; pointer-events: none; background: url(grain-light.png); opacity: 0.55; mix-blend-mode: multiply; }
      #burst { position: absolute; inset: 0; background: #fffbea; opacity: 0; pointer-events: none; }
      #endCard { position: absolute; inset: 0; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 240px; }
      #bioIcon { width: 200px; height: 200px; }
      #bioText { margin-top: 34px; font-size: 50px; font-weight: 400; color: #fff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${END}" data-width="${W}" data-height="${H}">
      ${DEFS}
      <audio id="music" src="music.wav" data-start="0" data-duration="${END}" data-volume="1"></audio>
      ${html.join('\n      ')}
      <div class="clip" id="endCard" data-start="${END_CARD}" data-duration="${(END - END_CARD).toFixed(3)}">
        <div id="bioIcon">${icon}</div><div id="bioText">Решение в био</div>
      </div>
      <div id="grain"></div>
      <div id="burst"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tw.join('\n      ')}
      tl.fromTo('#bioIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' }, ${END_CARD});
      tl.fromTo('#bioText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, ${(END_CARD + 0.12).toFixed(3)});
      tl.to('#bioIcon', { scale: 1.05, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 3 }, ${(END_CARD + 0.5).toFixed(3)});
      tl.to('#grain', { opacity: 0, duration: 0.01 }, ${END_CARD});
      tl.set({}, {}, ${END});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

const dir = new URL('./out/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('index.html', dir), build());
copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
copyFileSync(new URL('../ads/assets/grain-light.png', import.meta.url), new URL('grain-light.png', dir));
const music = new URL('./music/story.wav', import.meta.url);
if (existsSync(music)) copyFileSync(music, new URL('music.wav', dir));
else console.warn('Нет music/story.wav — ролик соберётся без музыки (см. README).');
console.log(`${dir.pathname}index.html — ${SHOTS.length} кадров, ${END} с`);
