/**
 * Ролики по картинкам — по самому свежему образцу автора («Обломов», 12.10.2026).
 * Формат: короткий диалог светящихся человечков на чёрном (4 реплики) → вспышка белого → история на
 * картинках-гравюрах (их рисует Gemini по заданию; камера медленно наезжает, у кадров короткие подписи в
 * рамке) → вывод из двух строк, вторая оранжевая → «Решение в био». 20 секунд: склейки — по образцу, в такт
 * его музыки (`PLAN`).
 *
 * Пока картинок нет, вместо них — серые заглушки с номером: так видно монтаж и подписи.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { CSS3, PATTERNS, C, H, W, ctaBio, dialogue, type Line3 } from './engine3.ts';

/** Склейки образца «Обломов» (с): реплики, вспышка, кадры истории, вывод, «Решение в био». */
export const PLAN = {
  lines: [0, 2.2, 4.3, 6.433, 8.533],
  sub: [1.1, 3.25, 5.367, 7.5],
  white: [8.233, 8.533],
  story: [8.533, 9.967, 10.667, 11.367, 12.067, 12.767, 14.2, 15.6],
  cta: [15.6, 16.3],
  ctaOut: [17.4, 17.7],
  bio: [17.7, 20.067],
  end: 20.067,
};

/** Кадр истории: какая картинка, куда смотрит камера (центр и масштаб в координатах 1080×1920), подпись. */
export interface Shot {
  img: number;
  fx: number;
  fy: number;
  s: number;
  /** Куда камера доезжает к концу кадра (по умолчанию — лёгкий наезд ×1,06). */
  dx?: number;
  dy?: number;
  ds?: number;
  /** Подпись в рамке; нет — остаётся прежняя; пустая строка — без подписи. */
  label?: string;
}

export interface Video4 {
  id: string;
  title: string;
  scene: string;
  heads: { A: { x: number; y: number }; B: { x: number; y: number } };
  wide?: { fx: number; fy: number; s: number };
  ab?: { fx: number; fy: number; s: number };
  closeScale?: number;
  lines: Line3[];
  /** Картинки истории по порядку: что на них (для заглушек), файл — `trailer/ads/pics/<id>/<n>.png`. */
  pics: string[];
  shots: Shot[];
  cta: { lines: string[]; accent: number };
  bioGlyph?: string;
  /** Музыка (wav) — из образца, в репозиторий не кладём. */
  music: string;
}

const camAt = (fx: number, fy: number, s: number, cy = 960) => ({ x: 540 - fx * s, y: cy - fy * s, scale: s });

const placeholder = (n: number, what: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#cfcbc2"/><path d="M0,0 L${W},${H} M${W},0 L0,${H}" stroke="#b3aea4" stroke-width="6"/>
  <text x="540" y="900" font-family="sans-serif" font-size="150" font-weight="700" text-anchor="middle" fill="#6d685f">${n}</text>
  <text x="540" y="1010" font-family="sans-serif" font-size="46" text-anchor="middle" fill="#6d685f">${what}</text></svg>`;

function story(v: Video4, T: typeof PLAN, files: string[]): { html: string; tweens: string } {
  const tw: string[] = [];
  const keys = v.shots.map((k, i) => ({ k, t0: T.story[i], t1: T.story[i + 1] }));
  for (const { k, t0, t1 } of keys) {
    tw.push(`tl.set('.gimg', { opacity: 0 }, ${t0}); tl.set('#g${k.img}', { opacity: 1 }, ${t0});`);
    tw.push(`tl.set('#scam', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${t0});`);
    tw.push(`tl.to('#scam', { ...${JSON.stringify(camAt(k.fx + (k.dx ?? 0), k.fy + (k.dy ?? 0), k.s * (k.ds ?? 1.06)))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
  }
  const labels: { text: string; t0: number; t1: number }[] = [];
  for (const { k, t0, t1 } of keys) {
    if (k.label === undefined && labels.length && labels[labels.length - 1].t1 === t0) labels[labels.length - 1].t1 = t1;
    else if (k.label) labels.push({ text: k.label, t0, t1 });
  }
  const labelHtml = labels
    .map((l, i) => `<div class="clip tlabel3" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tl${i}" ${l.text.length > 26 ? 'style="font-size:32px;letter-spacing:3px"' : ''}>${l.text}</span></div>`)
    .join('\n        ');
  labels.forEach((l, i) => tw.push(`tl.fromTo('#tl${i}', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18 }, ${l.t0});`));
  tw.push(`tl.fromTo('#white', { opacity: 0 }, { opacity: 1, duration: ${(T.white[1] - T.white[0]).toFixed(3)}, ease: 'power1.in' }, ${T.white[0]});`);
  tw.push(`tl.to('#white', { opacity: 0, duration: 0.35, ease: 'power1.out' }, ${T.white[1]});`);
  for (const t of T.story.slice(1, -1)) tw.push(`tl.set('#flash', { opacity: 0.25 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.034).toFixed(3)});`);
  const t0 = T.story[0];
  const imgs = files.map((f, i) => `<img class="gimg" id="g${i + 1}" src="${f}" alt="" />`).join('\n          ');
  const html = `<div class="clip scene etch" id="story" data-start="${t0}" data-duration="${(T.story[T.story.length - 1] - t0).toFixed(3)}">
        <div class="cam" id="scam">
          ${imgs}
        </div>
        <div class="etex"></div>
        ${labelHtml}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

export function buildVideo4(v: Video4, files: string[]): string {
  const T = PLAN;
  const d = dialogue(v, T);
  const st = story(v, T, files);
  const cb = ctaBio(v, T);
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>
      ${CSS3}
      .gimg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; opacity: 0; filter: grayscale(1) contrast(1.05); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
      ${PATTERNS(C.ink)}
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.end}" data-volume="1"></audio>
      ${d.html}
      ${st.html}
      ${cb.html}
      <div id="white"></div>
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${d.tweens}
      ${st.tweens}
      ${cb.tweens}
      tl.set({}, {}, ${T.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

/** Собрать композицию в `out/<id>/`: картинки (или заглушки), музыка, шрифты и зерно. */
export function writeVideo4(v: Video4): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  const files = v.pics.map((what, i) => {
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const src = new URL(`./pics/${v.id}/${i + 1}.${ext}`, import.meta.url);
      if (existsSync(src)) {
        copyFileSync(src, new URL(`g${i + 1}.${ext}`, dir));
        return `g${i + 1}.${ext}`;
      }
    }
    writeFileSync(new URL(`g${i + 1}.svg`, dir), placeholder(i + 1, what));
    return `g${i + 1}.svg`;
  });
  writeFileSync(new URL('index.html', dir), buildVideo4(v, files));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  const music = new URL(`./music/${v.music}`, import.meta.url);
  if (existsSync(music)) copyFileSync(music, new URL('music.wav', dir));
  return dir.pathname;
}
