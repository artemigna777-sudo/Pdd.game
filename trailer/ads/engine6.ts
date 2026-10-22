/**
 * Ролики-истории (34…) — по образцам cwex (до 2,4 тыс. лайков при 500–2 000 просмотров у соседних роликов).
 * Формат:
 *   1. Реальная история на светящихся человечках, подпись сверху (0–11,6 с): первая строка — цифра или
 *      цитата, которая цепляет с первого кадра; карточки-интерфейсы вместо лишних слов.
 *   2. Мост — оранжевая строка «как … из легенды» (11,6–12,4 с).
 *   3. Легенда на одной гравюре, подписи в рамке (12,4–25,9 с).
 *   4. «Как это устроено» — расчёт на чёрном, оранжевые акценты (25,9–30,9 с).
 *   5. Итог и пояснение мелким (30,9–33 с).
 *   6. Вывод нарастает по строкам, последняя оранжевая (33,5–39,1 с), «Решение в био» (39,1–42,4 с).
 * Склейки — по образцу «Никто» (`CW`), музыка — из него же (`music/<id>/obrazec.wav`, в репозиторий не кладём).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import type { Face } from './draw.ts';
import { C, CSS3, DLG, ETCH, H, PATTERNS, W, ctaBio, svgLines, type Key } from './engine3.ts';

/** Склейки образца «Никто» (46,5 с, из них 42,4 — до заставки TikTok). */
export const CW = {
  /** Кадры завязки; последний — мост. */
  hook: [0, 3.3, 6.6, 9.067, 11.567],
  bridge: [11.567, 12.4],
  story: [12.4, 16.0, 18.5, 19.6, 21.0, 23.4, 25.933],
  info: [25.933, 27.0, 27.5, 28.5, 29.0, 30.0, 30.867],
  outcome: [30.867, 31.5, 33.0],
  /** Строки вывода; ctaOut — когда вывод гаснет. */
  cta: [33.5, 34.0, 36.5, 37.5],
  ctaOut: [38.9, 39.133],
  bio: [39.133, 42.433],
  end: 42.433,
};
export type Timing6 = typeof CW;

export interface Shot6 {
  /** Сцена (ключ в `scenes`); нет — только карточка на тёмном фоне. */
  scene?: string;
  /** Камера: точка сцены в центре кадра и масштаб; `to` — куда доезжает к концу кадра (по умолчанию наезд ×1,04). */
  cam?: [number, number, number];
  to?: [number, number, number];
  /** Подпись сверху (HTML) и строка под ней мелким серым. */
  cap: string;
  sub?: string;
  /** Оранжевая подпись (мост к легенде). */
  accent?: boolean;
  /** Карточка-интерфейс поверх сцены (HTML на 1080×1920). */
  ui?: string;
  /** Выражения лиц человечков в этом кадре: id → лицо. */
  faces?: Record<string, Face>;
  /** 3D-кадр из Blender (`clips/<id>/<файл>`, см. blender/): видео на весь кадр под подписью вместо сцены. */
  video?: string;
}

export interface Video6 {
  id: string;
  title: string;
  scenes: Record<string, string>;
  /** Кадры завязки по моментам `CW.hook` (последний — мост). */
  shots: Shot6[];
  /** Анимации карточек и сцен завязки. */
  hookTweens?: (T: Timing6) => string;
  /** Гравюра и кадры легенды по моментам `CW.story`. */
  tableau: string;
  story: Key[];
  /** Расчёт на чёрном по моментам `CW.info`. */
  info: { html: string; tweens: (t: number[]) => string };
  outcome: { title: string; sub: string };
  cta: { lines: string[]; accent: number };
  bioGlyph?: string;
  extra?: (T: Timing6) => string;
}

const camAt = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 960 - fy * s, scale: s });

/** Завязка: каждый кадр — своя копия сцены (id лиц с префиксом кадра), подпись сверху, карточка. */
function hook(v: Video6, T: Timing6): { html: string; tweens: string } {
  const html: string[] = [];
  const tw: string[] = [];
  v.shots.forEach((s, i) => {
    const t0 = T.hook[i];
    const t1 = i + 1 < T.hook.length ? T.hook[i + 1] : T.bridge[1];
    let scene = '';
    if (s.scene) {
      const raw = v.scenes[s.scene];
      if (raw === undefined) throw new Error(`${v.id}: нет сцены ${s.scene}`);
      scene = raw.replace(/id="face/g, `id="s${i}face`).replace(/class="face/g, `class="s${i}face`).replace(/id="sc-/g, `id="s${i}-`);
      const [fx, fy, sc] = s.cam ?? [540, 1000, 1];
      const [tx, ty, ts] = s.to ?? [fx, fy, sc * 1.04];
      tw.push(`tl.set('#c${i}', ${JSON.stringify(camAt(fx, fy, sc))}, ${t0});`);
      tw.push(`tl.to('#c${i}', { ...${JSON.stringify(camAt(tx, ty, ts))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
      for (const [who, face] of Object.entries(s.faces ?? {})) tw.push(`tl.set('.s${i}face${who}', { opacity: 0 }, ${t0}); tl.set('#s${i}face${who}_${face}', { opacity: 1 }, ${t0});`);
    }
    if (s.video) html.push(`<video class="clip" id="v${i}" src="clips/${s.video}" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}" data-media-start="0" muted playsinline style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover"></video>`);
    html.push(`<div class="clip scene${s.video ? '' : ' dlg'}" id="h${i}" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}">
        ${s.video ? '' : '<div class="spot"></div>'}
        ${scene ? `<div class="cam" id="c${i}">${svgLines(DLG, scene, 6, 'style="filter: drop-shadow(0 0 3px rgba(255,255,255,0.75)) drop-shadow(0 0 12px rgba(255,255,255,0.25))"')}</div>` : ''}
        ${s.ui ?? ''}
        <div class="hcap${s.accent ? ' acc' : ''}">${s.cap}${s.sub ? `<div class="hsub">${s.sub}</div>` : ''}</div>
      </div>`);
  });
  return { html: html.join('\n      '), tweens: [...tw, v.hookTweens ? v.hookTweens(T) : ''].join('\n      ') };
}

/** Легенда на гравюре: камера по кадрам `story`, подписи в рамке (можно в две строки через <br>). */
function legend(v: Video6, T: Timing6): { html: string; tweens: string } {
  const tw: string[] = [];
  const keys = v.story.map((k, i) => ({ k, t0: T.story[i], t1: T.story[i + 1] }));
  for (const { k, t0, t1 } of keys) {
    tw.push(`tl.set('#tcam', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${t0});`);
    tw.push(`tl.to('#tcam', { ...${JSON.stringify(camAt(k.fx + (k.dx ?? 0), k.fy + (k.dy ?? 0), k.s * (k.ds ?? 1.06)))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
    if (k.on) tw.push(`tl.set('${k.on}', { opacity: 1 }, ${t0});`);
    if (k.off) tw.push(`tl.set('${k.off}', { opacity: 0 }, ${t0});`);
  }
  const labels: { text: string; t0: number; t1: number }[] = [];
  for (const { k, t0, t1 } of keys) {
    if (k.label === undefined && labels.length && labels[labels.length - 1].t1 === t0) labels[labels.length - 1].t1 = t1;
    else if (k.label) labels.push({ text: k.label, t0, t1 });
  }
  const labelHtml = labels
    .map((l, i) => `<div class="clip tlabel6" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tl${i}">${l.text}</span></div>`)
    .join('\n        ');
  labels.forEach((l, i) => tw.push(`tl.fromTo('#tl${i}', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18 }, ${l.t0});`));
  // Короткая вспышка на входе и на каждой склейке гравюры.
  for (const t of T.story.slice(0, -1)) tw.push(`tl.set('#flash', { opacity: 0.45 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.05).toFixed(3)});`);
  const t0 = T.story[0];
  const html = `<div class="clip scene etch" id="tableau" data-start="${t0}" data-duration="${(T.story[T.story.length - 1] - t0).toFixed(3)}">
        <div class="cam" id="tcam">${svgLines(ETCH, v.tableau, 3)}</div>
        <div class="etex"></div>
        ${labelHtml}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

const CSS6 = `
      .hcap { position: absolute; left: 60px; right: 60px; top: 250px; text-align: center; font-size: 52px; font-weight: 800; line-height: 1.22; color: #fff;
        text-shadow: 0 2px 14px rgba(0,0,0,0.95); }
      .hcap.acc { color: ${C.accent}; }
      .hsub { margin-top: 18px; font-size: 32px; font-weight: 600; color: #9a9ca3; letter-spacing: 1px; }
      .tlabel6 { position: absolute; left: 0; right: 0; top: 270px; text-align: center; }
      .tlabel6 span { display: inline-block; padding: 14px 26px 12px; background: #eceae4; color: #1d1c1a; border: 3px solid #2a2927; box-shadow: 0 0 0 5px rgba(236,234,228,0.9);
        font-size: 34px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; line-height: 1.25; max-width: 980px; }
      .card { position: absolute; background: #0d121c; border: 3px solid #2b3446; border-radius: 28px; color: #fff; overflow: hidden;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 30px 80px rgba(0,0,0,0.6); }
      .card .ch { display: flex; align-items: center; gap: 18px; padding: 26px 30px; border-bottom: 2px solid #232b3a; font-size: 32px; font-weight: 800; }
      .card .ch small { display: block; font-size: 22px; font-weight: 600; color: #8b93a3; margin-top: 4px; }
      .tag { margin-left: auto; padding: 6px 16px; border: 2px solid ${C.accent}; border-radius: 30px; color: ${C.accent}; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
      .row { display: flex; align-items: center; gap: 16px; margin: 14px 24px; padding: 18px 22px; border-radius: 18px; background: #151c29; font-size: 30px; font-weight: 700; }
      .row .x { margin-left: auto; color: ${C.accent}; font-weight: 800; }
      .row.hot { border: 3px solid ${C.accent}; }
      .outT { position: absolute; left: 60px; right: 60px; top: 820px; text-align: center; font-size: 54px; font-weight: 800; line-height: 1.2; color: #fff; }
      .outS { position: absolute; left: 60px; right: 60px; top: 1000px; text-align: center; font-size: 32px; font-weight: 600; line-height: 1.3; color: #9a9ca3; }`;

export function buildVideo6(v: Video6): string {
  const T = CW;
  const h = hook(v, T);
  const lg = legend(v, T);
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
      ${CSS6}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
      ${PATTERNS(C.ink)}
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.end}" data-volume="1"></audio>
      ${h.html}
      ${lg.html}
      <div class="clip scene info" id="info" data-start="${T.info[0]}" data-duration="${(T.info[T.info.length - 1] - T.info[0]).toFixed(3)}">
        ${v.info.html}
      </div>
      <div class="clip scene black" id="outcome" data-start="${T.outcome[0]}" data-duration="${(T.outcome[2] - T.outcome[0]).toFixed(3)}">
        <div class="outT" id="outT">${v.outcome.title}</div>
        <div class="outS" id="outS">${v.outcome.sub}</div>
      </div>
      <div class="clip scene black" id="gap" data-start="${T.outcome[2]}" data-duration="${(T.cta[0] - T.outcome[2]).toFixed(3)}"></div>
      ${cb.html}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${h.tweens}
      ${lg.tweens}
      ${v.info.tweens(T.info)}
      tl.fromTo('#outT', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 }, ${T.outcome[0]});
      tl.fromTo('#outS', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 }, ${T.outcome[1]});
      ${v.extra ? v.extra(T) : ''}
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

/** Собрать композицию в `out/<id>/`; музыка — `music/<id>/obrazec.wav` (если есть: без неё ролик немой). */
export function writeVideo6(v: Video6): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo6(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  const music = new URL(`./music/${v.id}/music.wav`, import.meta.url);
  if (existsSync(music)) copyFileSync(music, new URL('music.wav', dir));
  // 3D-кадры (собираются из рендеров Blender, в репозиторий не кладутся).
  const clips = new URL(`./clips/${v.id}/`, import.meta.url);
  if (existsSync(clips)) {
    mkdirSync(new URL('clips/', dir), { recursive: true });
    for (const f of readdirSync(clips)) copyFileSync(new URL(f, clips), new URL(`clips/${f}`, dir));
  }
  return dir.pathname;
}
