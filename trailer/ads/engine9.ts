/**
 * Ролики серии 3 (тот же монтаж и та же музыка, `LONG`), но в плоской детальной цветной рисовке
 * по образцу Артёма 03.11.2026: комната ночью, человечки в шапках, наклейки-записки, красные штампы,
 * подписи снизу крупными буквами с подсветкой слов «как караоке».
 * Порядок: диалог → вспышка → история на одной картине (камера от детали к детали, подпись-записка) →
 * инфографика → та же картина «после» → призыв → «Решение в био».
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { Face } from './draw.ts';
import { CSS3, H, LONG, W, ctaBio, type Cam, type Key, type Timing } from './engine3.ts';
import { FL } from './flat.ts';

export interface Line9 {
  /** Текст реплики; *слово* — подсветить цветом. */
  text: string;
  cams: [Cam] | [Cam, Cam];
  a?: Face;
  b?: Face;
}
export interface Video9 {
  id: string;
  title: string;
  scene: string;
  heads: { A: { x: number; y: number }; B: { x: number; y: number } };
  wide?: { fx: number; fy: number; s: number };
  ab?: { fx: number; fy: number; s: number };
  closeScale?: number;
  /** Записка в углу во время диалога: заголовок и строка мельче. */
  note: [string, string];
  lines: Line9[];
  tableau: string;
  story: Key[];
  after: Key[];
  /** Красные штампы поверх картины: текст и момент (номер кадра истории). */
  stamps?: { text: string; at: number; top?: number }[];
  info: { html: string; tweens: (t: number[]) => string };
  cta: { lines: string[]; accent: number };
  bioGlyph?: string;
  extra?: (T: Timing) => string;
}

const qfont = (file: string) => readFileSync(new URL(`../../src/ui/qthemes/fonts/${file}`, import.meta.url)).toString('base64');
const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const FONTS9 = `@font-face { font-family: 'Oswald'; font-weight: 200 700; src: url(data:font/woff2;base64,${qfont('oswald-cyrillic-db2216.woff2')}) format('woff2'); unicode-range: ${CYR}; }
      @font-face { font-family: 'Oswald'; font-weight: 200 700; src: url(data:font/woff2;base64,${qfont('oswald-latin-ed56cb.woff2')}) format('woff2'); unicode-range: U+0000-00FF, U+2000-206F, U+20AC, U+2212; }
      @font-face { font-family: 'Caveat'; font-weight: 400 700; src: url(data:font/woff2;base64,${qfont('caveat-cyrillic-12c256.woff2')}) format('woff2'); unicode-range: ${CYR}; }
      @font-face { font-family: 'Caveat'; font-weight: 400 700; src: url(data:font/woff2;base64,${qfont('caveat-latin-14ecf1.woff2')}) format('woff2'); unicode-range: U+0000-00FF, U+2000-206F; }`;

const camAt = (fx: number, fy: number, s: number, cy = 960) => ({ x: 540 - fx * s, y: cy - fy * s, scale: s });
const svgFill = (body: string) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" overflow="visible" style="position:absolute;left:0;top:0">${body}</svg>`;

/** Слова реплики: подсвеченные — `*…*`. */
function words(text: string) {
  const out: { w: string; acc: boolean }[] = [];
  for (const part of text.split(/(\*[^*]+\*)/)) {
    if (!part) continue;
    const acc = part.startsWith('*');
    for (const w of part.replace(/\*/g, '').split(/\s+/).filter(Boolean)) {
      if (/^[?!.,:;…»]+$/.test(w) && out.length) out[out.length - 1].w += w;
      else out.push({ w, acc });
    }
  }
  return out;
}

function dialogue(v: Video9, T: Timing) {
  const close = v.closeScale ?? 2.0;
  const wide = v.wide ?? { fx: 540, fy: 960, s: 1 };
  const ab = v.ab ?? { fx: 540, fy: 820, s: 1.4 };
  const spec = (c: Cam) => {
    if (Array.isArray(c)) return { fx: c[0], fy: c[1], s: c[2] };
    if (c === 'wide') return wide;
    if (c === 'ab') return ab;
    const hd = c === 'a' ? v.heads.A : v.heads.B;
    return { fx: hd.x, fy: hd.y + 120, s: close };
  };
  const n = v.lines.length;
  const tw: string[] = [];
  const caps = v.lines
    .map((l, i) => {
      const ws = words(l.text);
      const t0 = T.lines[i];
      const dur = T.lines[i + 1] - t0;
      ws.forEach((_, k) => tw.push(`tl.set('#w${i}_${k}', { color: '${ws[k].acc ? FL.orange : '#ffffff'}' }, ${(t0 + 0.05 + (dur * 0.62 * k) / Math.max(1, ws.length - 1)).toFixed(3)});`));
      return `<div class="clip cap9" data-start="${t0}" data-duration="${dur.toFixed(3)}">${ws.map((w, k) => `<span id="w${i}_${k}" class="w">${w.w}</span>`).join(' ')}</div>`;
    })
    .join('\n        ');
  v.lines.forEach((l, i) => {
    const t0 = T.lines[i];
    const t2 = T.lines[i + 1];
    const cuts = l.cams.length > 1 ? [t0, T.sub[i], t2] : [t0, t2];
    l.cams.forEach((c, k) => {
      const s = spec(c);
      const a = cuts[k];
      const d = cuts[k + 1] - a;
      tw.push(`tl.set('#cam', ${JSON.stringify(camAt(s.fx, s.fy, s.s, 760))}, ${a});`);
      tw.push(`tl.to('#cam', { ...${JSON.stringify(camAt(s.fx, s.fy, s.s * 1.05, 760))}, duration: ${d.toFixed(3)}, ease: 'none' }, ${a});`);
    });
    for (const who of ['A', 'B'] as const) {
      const k = who === 'A' ? l.a : l.b;
      if (k) tw.push(`tl.set('.face${who}', { opacity: 0 }, ${t0}); tl.set('#face${who}_${k}', { opacity: 1 }, ${t0});`);
    }
  });
  tw.push(`tl.fromTo('#note', { opacity: 0, rotation: -14, scale: 0.7 }, { opacity: 1, rotation: -4, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.15);`);
  const html = `<div class="clip scene" id="dialogue" data-start="0" data-duration="${T.lines[n]}" style="background:${FL.night}">
        <div class="cam" id="cam">${svgFill(v.scene)}</div>
        <div class="bottom9"></div>
        <div class="note9" id="note"><b>${v.note[0]}</b><i>${v.note[1]}</i></div>
        ${caps}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

function tableau(v: Video9, T: Timing) {
  const tw: string[] = [];
  const keys = [...v.story.map((k, i) => ({ k, t0: T.story[i], t1: T.story[i + 1] })), ...v.after.map((k, i) => ({ k, t0: T.after[i], t1: T.after[i + 1] }))];
  for (const { k, t0, t1 } of keys) {
    tw.push(`tl.set('#tcam', ${JSON.stringify(camAt(k.fx, k.fy, k.s, 860))}, ${t0});`);
    tw.push(`tl.to('#tcam', { ...${JSON.stringify(camAt(k.fx + (k.dx ?? 0), k.fy + (k.dy ?? 0), k.s * (k.ds ?? 1.06), 860))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
    if (k.on) tw.push(`tl.set('${k.on}', { opacity: 1 }, ${t0});`);
    if (k.off) tw.push(`tl.set('${k.off}', { opacity: 0 }, ${t0});`);
  }
  const labels: { text: string; t0: number; t1: number }[] = [];
  for (const { k, t0, t1 } of keys) {
    if (k.label === undefined && labels.length && labels[labels.length - 1].t1 === t0) labels[labels.length - 1].t1 = t1;
    else if (k.label) labels.push({ text: k.label, t0, t1 });
  }
  const labelHtml = labels
    .map((l, i) => `<div class="clip tag9" data-start="${l.t0}" data-duration="${(l.t1 - l.t0).toFixed(3)}"><span id="tg${i}" style="transform:rotate(${i % 2 ? 2 : -2}deg)">${l.text}</span></div>`)
    .join('\n        ');
  labels.forEach((l, i) => tw.push(`tl.fromTo('#tg${i}', { opacity: 0, y: -16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(2)' }, ${l.t0});`));
  const stamps = (v.stamps ?? [])
    .map((s, i) => {
      const t = T.story[s.at];
      tw.push(`tl.fromTo('#st${i}', { opacity: 0, scale: 2.2, rotation: -16 }, { opacity: 1, scale: 1, rotation: -7, duration: 0.16, ease: 'power3.in' }, ${t + 0.12});`);
      tw.push(`tl.fromTo('#tcamWrap', { x: -10 }, { x: 0, duration: 0.25, ease: 'elastic.out(1,0.3)' }, ${(t + 0.28).toFixed(3)});`);
      return `<div class="clip stamp9" data-start="${t}" data-duration="${(T.story[s.at + 1] - t).toFixed(3)}" style="top:${s.top ?? 1180}px"><span id="st${i}">${s.text}</span></div>`;
    })
    .join('\n        ');
  tw.push(`tl.set('.st-a', { opacity: 0 }, 0); tl.set('.st-b', { opacity: 1 }, 0);`);
  tw.push(`tl.set('.st-a', { opacity: 1 }, ${T.after[0]}); tl.set('.st-b', { opacity: 0 }, ${T.after[0]});`);
  tw.push(`tl.fromTo('#white', { opacity: 0 }, { opacity: 1, duration: ${(T.white[1] - T.white[0]).toFixed(3)}, ease: 'power1.in' }, ${T.white[0]});`);
  tw.push(`tl.to('#white', { opacity: 0, duration: 0.35, ease: 'power1.out' }, ${T.white[1]});`);
  for (const t of [...T.story.slice(1, -1), ...T.after.slice(0, -1)]) tw.push(`tl.set('#flash', { opacity: 0.3 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.034).toFixed(3)});`);
  const t0 = T.story[0];
  const html = `<div class="clip scene" id="tableau" data-start="${t0}" data-duration="${(T.after[T.after.length - 1] - t0).toFixed(3)}" style="background:${FL.night}">
        <div class="cam" id="tcamWrap"><div class="cam" id="tcam">${svgFill(v.tableau)}</div></div>
        <div class="vign9"></div>
        ${labelHtml}
        ${stamps}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

const CSS9 = `
      ${FONTS9}
      .cap9 { position: absolute; left: 50px; right: 50px; top: 1430px; text-align: center; font-family: 'Oswald'; font-weight: 700; font-size: 80px; line-height: 1.12;
        text-transform: uppercase; letter-spacing: 0.5px; }
      .cap9 .w { color: #6f7788; display: inline-block; }
      .cap9 .w.on { color: #fff; }
      .cap9 .w.on.acc { color: ${FL.orange}; }
      .bottom9 { position: absolute; left: 0; right: 0; top: 1240px; bottom: 0; background: linear-gradient(rgba(18,24,41,0), ${FL.night} 22%); }
      .note9 { position: absolute; left: 56px; top: 150px; padding: 14px 26px 16px; background: #f1e9cf; color: #2a2420; box-shadow: 0 8px 18px rgba(0,0,0,0.45);
        transform: rotate(-4deg); display: flex; flex-direction: column; align-items: flex-start; }
      .note9 b { font-family: 'Caveat'; font-weight: 700; font-size: 62px; line-height: 1; }
      .note9 i { font-family: 'Oswald'; font-style: normal; font-size: 22px; letter-spacing: 3px; color: #6b6157; margin-top: 4px; text-transform: uppercase; }
      .note9::before { content: ''; position: absolute; left: 50%; top: -14px; width: 90px; height: 28px; margin-left: -45px; background: rgba(255,255,255,0.45); transform: rotate(3deg); }
      .vign9 { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(90% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(5,8,16,0.55) 100%); }
      .tag9 { position: absolute; left: 0; right: 0; top: 230px; text-align: center; }
      .tag9 span { display: inline-block; padding: 16px 30px 14px; background: #f1e9cf; color: #2a2420; font-family: 'Oswald'; font-weight: 700; font-size: 44px; letter-spacing: 1px;
        text-transform: uppercase; line-height: 1.15; max-width: 960px; box-shadow: 0 10px 22px rgba(0,0,0,0.45); }
      .stamp9 { position: absolute; left: 0; right: 0; text-align: center; }
      .stamp9 span { display: inline-block; padding: 12px 30px 10px; border: 7px solid #e8473d; color: #e8473d; background: rgba(255,240,235,0.9); font-family: 'Oswald'; font-weight: 700;
        font-size: 66px; letter-spacing: 2px; text-transform: uppercase; transform: rotate(-7deg); box-shadow: 0 0 0 4px rgba(255,240,235,0.9); }
      .info { background: ${FL.night} !important; }
      .info div { font-family: 'Oswald' !important; text-transform: uppercase; }
      .twk0 { animation: none; }`;

export function buildVideo9(v: Video9): string {
  const T = LONG;
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
      ${CSS3}
      ${CSS9}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
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

export function writeVideo9(v: Video9): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo9(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  copyFileSync(new URL(`./music/${LONG.music}`, import.meta.url), new URL('music.wav', dir));
  return dir.pathname;
}
