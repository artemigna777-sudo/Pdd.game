/**
 * Движок третьей серии роликов (21–30) — по двум новым образцам Артёма.
 * Формат: короткий диалог человечков на тёмном фоне → история на ОДНОЙ гравюре: камера переходит от детали
 * к детали, у каждой своя подпись → инфографика на чёрном с оранжевыми цифрами → снова гравюра, но «после» →
 * призыв из двух-трёх строк → «Решение в био». Склейки — в такт музыке образцов (`LONG` и `SHORT`).
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { bracketIcon, type Face, type Pen } from './draw.ts';

export const W = 1080;
export const H = 1920;

/** Длинный формат — по образцу «экранное время» (31,8 с). */
export const LONG = {
  lines: [0, 1.967, 3.933, 5.9, 7.833, 9.8, 11.767, 13.733, 15.667],
  sub: [0.967, 2.967, 4.9, 6.867, 8.833, 10.8, 12.767, 14.7],
  white: [15.4, 15.667],
  story: [15.667, 16.667, 17.633, 18.633, 19.6, 20.6, 21.567],
  info: [21.567, 22.033, 22.533, 23.033, 23.533],
  after: [23.533, 24.467, 25.467, 26.467, 27.433],
  cta: [27.433, 27.933, 28.433],
  ctaOut: [29.0, 29.367],
  bio: [29.367, 31.767],
  end: 31.767,
  music: 'long.wav',
};
/** Короткий формат — по образцу «крысолов» (19,4 с). */
export const SHORT = {
  lines: [0, 1.8, 3.9, 6.033],
  sub: [0.733, 2.867, 4.967],
  white: [5.733, 6.033],
  story: [6.033, 7.1, 8.167, 9.233, 10.3],
  info: [10.3, 11.367, 12.433, 13.467],
  after: [13.467, 14.533],
  cta: [14.533, 15.6],
  ctaOut: [16.75, 17.067],
  bio: [17.067, 19.433],
  end: 19.433,
  music: 'short.wav',
};
export type Timing = typeof LONG;

/** Цвета серии: как у образцов — белые линии на почти чёрном, гравюра на бумаге, оранжевый акцент. */
export const C = {
  night: '#05070c',
  line: '#f4f4f2',
  paper: '#e3dfd6',
  ink: '#1e1d1b',
  accent: '#ff7a2e',
  dim: '#8c8c8c',
};
export const DLG: Pen = { ink: C.line, fill: C.night, accent: C.accent, dark: true };
export const ETCH: Pen = { ink: C.ink, fill: C.paper, accent: C.accent, dark: false };

export type Cam = 'wide' | 'a' | 'b' | 'ab' | [number, number, number];
export interface Line3 {
  text: string;
  cams: [Cam] | [Cam, Cam];
  a?: Face;
  b?: Face;
}
/** Кадр гравюры: центр, масштаб, подпись (нет подписи — остаётся прежняя), лёгкий наезд/сдвиг. */
export interface Key {
  fx: number;
  fy: number;
  s: number;
  label?: string;
  dx?: number;
  dy?: number;
  ds?: number;
  /** Что показать / скрыть в начале кадра (CSS-селекторы). */
  on?: string;
  off?: string;
}
export interface Video3 {
  id: string;
  title: string;
  format: 'long' | 'short';
  scene: string;
  heads: { A: { x: number; y: number }; B: { x: number; y: number } };
  wide?: { fx: number; fy: number; s: number };
  ab?: { fx: number; fy: number; s: number };
  closeScale?: number;
  lines: Line3[];
  /** Гравюра: элементы с классом `st-b` видны «до», с классом `st-a` — «после». */
  tableau: string;
  story: Key[];
  after: Key[];
  /** Инфографика: HTML (на 1080×1920) и анимация по моментам `t` (начало и шаги). */
  info: { html: string; tweens: (t: number[]) => string };
  cta: { lines: string[]; accent: number };
  bioGlyph?: string;
  /** Свои анимации гравюры (перья падают, пламя дрожит…). */
  extra?: (T: Timing) => string;
}

const font = (file: string) => readFileSync(new URL(`../video/fonts/${file}`, import.meta.url)).toString('base64');
const FONTS = `@font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`;

/** Штриховки гравюры (один раз на весь документ, в видимом SVG нулевого размера).
 *  a<угол> — обычная, b<угол> — густая, c<угол> — редкая; углы 0, 30, 60, 90, 120, 150. */
const ANGLES = [0, 30, 60, 90, 120, 150];
const hatch = (id: string, step: number, w: number, ink: string, angle: number, extra = '') =>
  `<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><path d="M-1,${step / 2} H${step + 1}" stroke="${ink}" stroke-width="${w}" ${extra}/></pattern>`;
const PATTERNS = (ink: string) => `<svg width="0" height="0" style="position:absolute"><defs>
  ${ANGLES.map((a) => hatch(`a${a}`, 8, 1.5, ink, a) + hatch(`b${a}`, 5, 1.6, ink, a) + hatch(`c${a}`, 12, 1.3, ink, a)).join('\n  ')}
  ${hatch('sky', 11, 1.1, ink, 0, 'stroke-opacity="0.55"')}
  <pattern id="x45" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,3 H6 M3,0 V6" stroke="${ink}" stroke-width="1.6"/></pattern>
  <pattern id="x0" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,4 H8 M4,0 V8" stroke="${ink}" stroke-width="1.4"/></pattern>
  <pattern id="hw" width="28" height="12" patternUnits="userSpaceOnUse"><path d="M0,6 q7,-5 14,0 t14,0" fill="none" stroke="${ink}" stroke-width="1.4"/></pattern>
  <pattern id="hd" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${ink}"/><circle cx="6" cy="6" r="1.1" fill="${ink}"/></pattern>
</defs></svg>`;

const svgLines = (p: Pen, body: string, stroke: number, extra = '') =>
  `<svg class="ln" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" overflow="visible" ${extra}><g fill="none" stroke="${p.ink}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" color="${p.ink}">${body}</g></svg>`;

const camAt = (fx: number, fy: number, s: number, cy = 960) => ({ x: 540 - fx * s, y: cy - fy * s, scale: s });

function dialogue(v: Video3, T: Timing): { html: string; tweens: string } {
  const close = v.closeScale ?? 2.2;
  const wide = v.wide ?? { fx: 540, fy: 1060, s: 1 };
  const ab = v.ab ?? { fx: 540, fy: 1060, s: 1.45 };
  const spec = (c: Cam) => {
    if (Array.isArray(c)) return { fx: c[0], fy: c[1], s: c[2] };
    if (c === 'wide') return wide;
    if (c === 'ab') return ab;
    const hd = c === 'a' ? v.heads.A : v.heads.B;
    return { fx: hd.x, fy: hd.y + 95, s: close };
  };
  const n = v.lines.length;
  const caps = v.lines
    .map((l, i) => `<div class="clip dcap" data-start="${T.lines[i]}" data-duration="${(T.lines[i + 1] - T.lines[i]).toFixed(3)}"><span>${l.text}</span></div>`)
    .join('\n        ');
  const tw: string[] = [];
  v.lines.forEach((l, i) => {
    const t0 = T.lines[i];
    const t2 = T.lines[i + 1];
    const cuts = l.cams.length > 1 ? [t0, T.sub[i], t2] : [t0, t2];
    l.cams.forEach((c, k) => {
      const s = spec(c);
      const a = cuts[k];
      const d = cuts[k + 1] - a;
      tw.push(`tl.set('#cam', ${JSON.stringify(camAt(s.fx, s.fy, s.s, 1060))}, ${a});`);
      tw.push(`tl.to('#cam', { ...${JSON.stringify(camAt(s.fx, s.fy, s.s * 1.04, 1060))}, duration: ${d.toFixed(3)}, ease: 'none' }, ${a});`);
    });
    for (const who of ['A', 'B'] as const) {
      const k = who === 'A' ? l.a : l.b;
      if (k) tw.push(`tl.set('.face${who}', { opacity: 0 }, ${t0}); tl.set('#face${who}_${k}', { opacity: 1 }, ${t0});`);
    }
  });
  const html = `<div class="clip scene dlg" id="dialogue" data-start="0" data-duration="${T.lines[n]}">
        <div class="spot"></div>
        <div class="cam" id="cam">${svgLines(DLG, v.scene, 6, 'style="filter: drop-shadow(0 0 3px rgba(255,255,255,0.75)) drop-shadow(0 0 12px rgba(255,255,255,0.25))"')}</div>
        ${caps}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

/** Гравюра: история (до) и последствия (после); между ними поверх идёт инфографика. */
function tableau(v: Video3, T: Timing): { html: string; tweens: string } {
  const tw: string[] = [];
  const keys = [...v.story.map((k, i) => ({ k, t0: T.story[i], t1: T.story[i + 1] })), ...v.after.map((k, i) => ({ k, t0: T.after[i], t1: T.after[i + 1] }))];
  for (const { k, t0, t1 } of keys) {
    tw.push(`tl.set('#tcam', ${JSON.stringify(camAt(k.fx, k.fy, k.s))}, ${t0});`);
    tw.push(`tl.to('#tcam', { ...${JSON.stringify(camAt(k.fx + (k.dx ?? 0), k.fy + (k.dy ?? 0), k.s * (k.ds ?? 1.06)))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
    if (k.on) tw.push(`tl.set('${k.on}', { opacity: 1 }, ${t0});`);
    if (k.off) tw.push(`tl.set('${k.off}', { opacity: 0 }, ${t0});`);
  }
  // Подписи: кадр без подписи продолжает предыдущую, пустая строка — без подписи.
  const labels: { text: string; t0: number; t1: number }[] = [];
  for (const { k, t0, t1 } of keys) {
    if (k.label === undefined && labels.length && labels[labels.length - 1].t1 === t0) labels[labels.length - 1].t1 = t1;
    else if (k.label) labels.push({ text: k.label, t0, t1 });
  }
  const labelHtml = labels
    .map((l, i) => `<div class="clip tlabel3" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tl${i}" ${l.text.length > 26 ? 'style="font-size:32px;letter-spacing:3px"' : ''}>${l.text}</span></div>`)
    .join('\n        ');
  labels.forEach((l, i) => tw.push(`tl.fromTo('#tl${i}', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18 }, ${l.t0});`));
  tw.push(`tl.set('.st-a', { opacity: 0 }, 0); tl.set('.st-b', { opacity: 1 }, 0);`);
  tw.push(`tl.set('.st-a', { opacity: 1 }, ${T.after[0]}); tl.set('.st-b', { opacity: 0 }, ${T.after[0]});`);
  // Вход из белого, как у образцов.
  tw.push(`tl.fromTo('#white', { opacity: 0 }, { opacity: 1, duration: ${(T.white[1] - T.white[0]).toFixed(3)}, ease: 'power1.in' }, ${T.white[0]});`);
  tw.push(`tl.to('#white', { opacity: 0, duration: 0.35, ease: 'power1.out' }, ${T.white[1]});`);
  for (const t of [...T.story.slice(1, -1), ...T.after.slice(0, -1)]) tw.push(`tl.set('#flash', { opacity: 0.35 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.034).toFixed(3)});`);
  const t0 = T.story[0];
  const html = `<div class="clip scene etch" id="tableau" data-start="${t0}" data-duration="${(T.after[T.after.length - 1] - t0).toFixed(3)}">
        <div class="cam" id="tcam">${svgLines(ETCH, v.tableau, 3)}</div>
        <div class="etex"></div>
        ${labelHtml}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

function ctaBio(v: Video3, T: Timing): { html: string; tweens: string } {
  const html = `<div class="clip scene black" id="cta" data-start="${T.cta[0]}" data-duration="${(T.bio[0] - T.cta[0]).toFixed(3)}">
        <div class="ctaBox" id="ctaBox">${v.cta.lines.map((l, i) => `<div id="cta${i}" ${i === v.cta.accent ? 'class="acc"' : ''}>${l}</div>`).join('')}</div>
      </div>
      <div class="clip scene black" id="bio" data-start="${T.bio[0]}" data-duration="${(T.bio[1] - T.bio[0]).toFixed(3)}">
        <div class="bioBox"><div id="bioIcon">${bioIcon(v.bioGlyph)}</div><div id="bioText">Решение в био</div></div>
      </div>`;
  const tw = v.cta.lines.map((_, i) => {
    const t = T.cta[Math.min(i, T.cta.length - 1)] + (i >= T.cta.length ? 0.4 : 0);
    return `tl.fromTo('#cta${i}', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, ${t.toFixed(3)});`;
  });
  tw.push(`tl.to('#ctaBox', { opacity: 0, duration: ${(T.ctaOut[1] - T.ctaOut[0]).toFixed(3)} }, ${T.ctaOut[0]});`);
  tw.push(`tl.fromTo('#bioIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${T.bio[0]});`);
  tw.push(`tl.fromTo('#bioText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${(T.bio[0] + 0.1).toFixed(3)});`);
  tw.push(`tl.to('#bioIcon', { scale: 1.05, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 3 }, ${(T.bio[0] + 0.45).toFixed(3)});`);
  return { html, tweens: tw.join('\n      ') };
}

const bioIcon = (glyph?: string) =>
  bracketIcon(`<rect x="-46" y="-46" width="92" height="92" rx="20" fill="#1c1c1e" stroke="#1c1c1e"/>${glyph ? `<g stroke="#4a4a4e" stroke-width="5">${glyph}</g>` : ''}`, C.line, C.line);

export function buildVideo3(v: Video3): string {
  const T = v.format === 'long' ? LONG : SHORT;
  const d = dialogue(v, T);
  const tb = tableau(v, T);
  const cb = ctaBio(v, T);
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>
      ${FONTS}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; font-family: 'Montserrat', sans-serif; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .dlg { background: ${C.night}; }
      .spot { position: absolute; inset: 0; background: radial-gradient(55% 34% at 50% 52%, rgba(40,60,100,0.32), rgba(0,0,0,0) 80%); }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .ln { position: absolute; left: 0; top: 0; }
      .dcap { position: absolute; left: 50px; right: 50px; top: 500px; text-align: center; font-size: 48px; line-height: 1.3; font-weight: 700; color: ${C.line}; text-shadow: 0 2px 12px rgba(0,0,0,0.9); }
      .dcap span { display: inline-block; padding: 4px 12px; border-radius: 30px; background: rgba(5,7,12,0.9); box-shadow: 0 0 26px 24px rgba(5,7,12,0.9); }
      .etch { background: ${C.paper}; }
      .etex { position: absolute; inset: 0; pointer-events: none; background: url(grain-dark.png), radial-gradient(80% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(40,32,20,0.42) 100%); mix-blend-mode: multiply; }
      .tlabel3 { position: absolute; left: 0; right: 0; top: 270px; text-align: center; }
      .tlabel3 span { display: inline-block; padding: 14px 26px 12px; background: #eceae4; color: #1d1c1a; border: 3px solid #2a2927; box-shadow: 0 0 0 5px rgba(236,234,228,0.9);
        font-size: 38px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; line-height: 1.2; max-width: 1040px; white-space: nowrap; }
      .black { background: #000; }
      .info { position: absolute; inset: 0; background: #000; color: #fff; }
      .ctaBox { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 60px 240px; text-align: center;
        font-size: 82px; font-weight: 800; line-height: 1.12; letter-spacing: -1px; color: #fff; }
      .acc { color: ${C.accent}; }
      .bioBox { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 240px; }
      #bioIcon { width: 200px; height: 200px; }
      #bioText { margin-top: 34px; font-size: 50px; font-weight: 400; color: #fff; }
      #white { position: absolute; inset: 0; background: #f2efe8; opacity: 0; pointer-events: none; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
      ${PATTERNS(C.ink)}
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.end}" data-volume="1"></audio>
      ${d.html}
      ${tb.html}
      <div class="clip scene info" id="info" data-start="${T.info[0]}" data-duration="${(T.info[T.info.length - 1] - T.info[0]).toFixed(3)}">
        ${v.info.html}
      </div>
      ${cb.html}
      <div id="white"></div>
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${d.tweens}
      ${tb.tweens}
      ${v.info.tweens(T.info)}
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

export function writeVideo3(v: Video3): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo3(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  copyFileSync(new URL(`./music/${v.format === 'long' ? LONG.music : SHORT.music}`, import.meta.url), new URL('music.wav', dir));
  return dir.pathname;
}

// ─── Инфографика: общие детали ────────────────────────────────────────────────

/** Человечек-значок (центр головы в x, y; рост ~ 120·s). */
export const icon = (x: number, y: number, s = 1, color = '#fff') =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle r="16"/><path d="M0,16 V64 M0,64 L-18,104 M0,64 L18,104 M-24,34 L0,28 L24,34"/></g>`;

/** HTML-текст инфографики по центру. */
export const itext = (id: string, top: number, size: number, body: string, color = '#fff', weight = 800, extra = '') =>
  `<div id="${id}" style="position:absolute;left:40px;right:40px;top:${top}px;text-align:center;font-size:${size}px;font-weight:${weight};color:${color};letter-spacing:${size < 40 ? 2 : 0}px;line-height:1.15;opacity:0;${extra}">${body}</div>`;
export const isvg = (body: string) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;left:0;top:0">${body}</svg>`;
export const show = (sel: string, t: number, d = 0.25) => `tl.fromTo('${sel}', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: ${d}, ease: 'power2.out' }, ${t.toFixed(3)});`;
export const pop = (sel: string, t: number, d = 0.18) =>
  `tl.fromTo('${sel}', { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: ${d}, ease: 'back.out(2)' }, ${t.toFixed(3)});`;
export const hide = (sel: string, t: number, d = 0.2) => `tl.to('${sel}', { opacity: 0, duration: ${d} }, ${t.toFixed(3)});`;
