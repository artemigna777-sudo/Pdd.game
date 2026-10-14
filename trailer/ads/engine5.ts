/**
 * Ролики «как кино» (33…): по образцу фан-нарезок из фильмов — быстрые кадры, субтитры с выделенным
 * словом, тряска камеры на криках, вспышки на склейках. Сам фильм не используем: все сцены нарисованы
 * светящимися человечками на тёмном фоне. Голоса нет — звук ставится в TikTok.
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import type { Face } from './draw.ts';
import { C, CSS3, DLG, H, PATTERNS, W, ctaBio, svgLines } from './engine3.ts';

export interface Shot5 {
  /** Начало кадра, с. */
  t: number;
  /** Сцена (ключ в `scenes`). */
  scene: string;
  /** Камера: точка рисунка в центре экрана и масштаб; `to` — куда доезжает к концу кадра (по умолчанию наезд ×1,05). */
  cam: [number, number, number];
  to?: [number, number, number];
  /** Субтитр: `{слово}` выделяется цветом; '' — без субтитра; не задан — продолжается прошлый. */
  cap?: string;
  big?: boolean;
  /** Лица человечков в этом кадре: id → выражение. */
  faces?: Record<string, Face>;
  shake?: boolean;
  flash?: boolean;
}

export interface Video5 {
  id: string;
  title: string;
  scenes: Record<string, string>;
  shots: Shot5[];
  /** Конец нарезки — начало вывода. */
  end: number;
  cta: { lines: string[]; accent: number };
  T: { cta: number[]; ctaOut: number[]; bio: number[]; end: number };
  bioGlyph?: string;
}

const camAt = ([fx, fy, s]: [number, number, number]) => ({ x: 540 - fx * s, y: 960 - fy * s, scale: s });
const glow = 'style="filter: drop-shadow(0 0 3px rgba(255,255,255,0.75)) drop-shadow(0 0 12px rgba(255,255,255,0.25))"';
const hl = (s: string) => s.replace(/\{([^}]+)\}/g, '<b class="hl">$1</b>');

export function buildVideo5(v: Video5): string {
  const ends = [...v.shots.slice(1).map((s) => s.t), v.end];
  const tw: string[] = [];
  const names = Object.keys(v.scenes);
  tw.push(`tl.set('.sc5', { opacity: 0 }, 0);`);
  v.shots.forEach((s, i) => {
    const t1 = ends[i];
    const to = s.to ?? [s.cam[0], s.cam[1], s.cam[2] * 1.05];
    tw.push(`tl.set('.sc5', { opacity: 0 }, ${s.t}); tl.set('#sc_${s.scene}', { opacity: 1 }, ${s.t});`);
    tw.push(`tl.set('#cam_${s.scene}', ${JSON.stringify(camAt(s.cam))}, ${s.t});`);
    tw.push(`tl.to('#cam_${s.scene}', { ...${JSON.stringify(camAt(to))}, duration: ${(t1 - s.t).toFixed(3)}, ease: 'power1.out' }, ${s.t});`);
    for (const [id, f] of Object.entries(s.faces ?? {})) tw.push(`tl.set('.face${id}', { opacity: 0 }, ${s.t}); tl.set('#face${id}_${f}', { opacity: 1 }, ${s.t});`);
    if (s.shake) {
      tw.push(`tl.fromTo('#shake', { x: -12, y: 7 }, { x: 12, y: -7, duration: 0.05, repeat: 9, yoyo: true, ease: 'none' }, ${s.t});`);
      tw.push(`tl.set('#shake', { x: 0, y: 0 }, ${(s.t + 0.5).toFixed(3)});`);
    }
    if (s.flash) tw.push(`tl.set('#flash', { opacity: 0.85 }, ${s.t}); tl.to('#flash', { opacity: 0, duration: 0.28, ease: 'power1.out' }, ${s.t});`);
  });
  // Субтитры: кадр без `cap` продолжает прошлый.
  const caps: { text: string; big: boolean; t0: number; t1: number }[] = [];
  v.shots.forEach((s, i) => {
    if (s.cap === undefined && caps.length && caps[caps.length - 1].t1 === s.t) caps[caps.length - 1].t1 = ends[i];
    else if (s.cap) caps.push({ text: s.cap, big: !!s.big, t0: s.t, t1: ends[i] });
  });
  const capHtml = caps
    .map((c, i) => `<div class="clip cap5${c.big ? ' big' : ''}" data-start="${c.t0}" data-duration="${(c.t1 - c.t0).toFixed(3)}"><span id="c5_${i}">${hl(c.text)}</span></div>`)
    .join('\n      ');
  caps.forEach((c, i) => tw.push(`tl.fromTo('#c5_${i}', { opacity: 0, scale: ${c.big ? 1.25 : 0.92} }, { opacity: 1, scale: 1, duration: 0.14, ease: 'power2.out' }, ${c.t0});`));
  const scenes = names
    .map((n) => `<div class="sc5" id="sc_${n}"><div class="cam" id="cam_${n}">${svgLines(DLG, v.scenes[n], 6, glow)}</div></div>`)
    .join('\n          ');
  const cb = ctaBio(v, { cta: v.T.cta, ctaOut: v.T.ctaOut, bio: v.T.bio } as Parameters<typeof ctaBio>[1]);
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>
      ${CSS3}
      .sc5 { position: absolute; inset: 0; opacity: 0; }
      #shake { position: absolute; inset: 0; }
      .vign { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(70% 55% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%); }
      .cap5 { position: absolute; left: 50px; right: 50px; top: 1290px; text-align: center; }
      .cap5 span { display: inline-block; font-size: 58px; font-weight: 900; line-height: 1.15; letter-spacing: 1px; text-transform: uppercase; color: #fff;
        text-shadow: 0 0 4px #000, 0 0 14px #000, 0 4px 0 #000; }
      .cap5.big { top: 1250px; }
      .cap5.big span { font-size: 108px; letter-spacing: -1px; }
      .hl { color: ${C.accent}; font-weight: 900; text-shadow: 0 0 4px #000, 0 0 18px rgba(255,122,46,0.55), 0 4px 0 #000; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${v.T.end}" data-width="${W}" data-height="${H}">
      ${PATTERNS(C.ink)}
      <div class="clip scene dlg" id="film" data-start="0" data-duration="${v.end}">
        <div class="spot"></div>
        <div id="shake">
          ${scenes}
        </div>
        <div class="vign"></div>
      </div>
      ${capHtml}
      ${cb.html}
      <div id="white"></div>
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tw.join('\n      ')}
      ${cb.tweens}
      tl.set({}, {}, ${v.T.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

/** Собрать композицию в `out/<id>/` (без музыки: звук ставится в TikTok). */
export function writeVideo5(v: Video5): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo5(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  return dir.pathname;
}
