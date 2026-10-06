/**
 * Движок рекламных роликов для TikTok. Все ролики — один монтаж под одну музыку (как у образца, который
 * прислал Артём): диалог из 7 реплик, «демо», 6 кадров истории, сравнение, призыв, «Ссылка в био».
 * Ролик описывается объектом `Video`, движок собирает из него композицию HyperFrames.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bracketIcon, type Face, type Pen } from './draw.ts';

export const W = 1080;
export const H = 1920;

/** Моменты склеек — те же, что у образца, поэтому монтаж ложится на ту же музыку. */
export const T = {
  shots: [0, 1.533, 3.033, 4.567, 6.1, 7.633, 9.133, 10.667],
  demo: [10.667, 11.467, 13.7, 14.5] as const,
  history: [14.5, 15.25, 16.03, 16.8, 17.55, 18.32, 19.8],
  table: 19.8,
  rows: [20.75, 21.25, 21.5],
  pick: 22.25,
  tableEnd: 22.75,
  stop: 23.0,
  stop2: 23.75,
  play: 25.25,
  bio: 26.0,
  end: 28.5,
};

export interface Look extends Pen {
  /** Фон сцен (CSS). */
  bg: string;
  stroke: number;
  /** CSS-фильтр для линий (свечение, тень «вырезанной бумаги»). */
  lineFilter?: string;
  /** Слой поверх кадра: зерно, мел, растр (CSS background). */
  overlay?: string;
  overlayBlend?: string;
  /** Пятно света в диалоге (CSS background). */
  spot?: string;
  font: string;
}

export interface Theme extends Look {
  cap: 'plain' | 'box' | 'tag' | 'type';
  capSize?: number;
  /** Кадры истории — в своём стиле (как гравюры у образца). */
  hist: Look & { labelBg: string; labelInk: string; labelBorder: string; labelFont: string };
}

export interface Line {
  shot: 'wide' | 'a' | 'b';
  text: string;
  a?: Face;
  b?: Face;
}

export interface Video {
  id: string;
  title: string;
  theme: Theme;
  /** Мир диалога (SVG без обёртки), головы героев — для камеры. */
  scene: string;
  heads: { A: { x: number; y: number }; B: { x: number; y: number } };
  wide?: { fx: number; fy: number; s: number };
  closeScale?: number;
  lines: Line[];
  demo: { svg: string; tweens: string };
  history: { label: string; art: string; origin?: string }[];
  table: { left: string; right: string; leftIcon: string; rightIcon: string; rows: [string, string][] };
  cta: [string, string, string];
  bioGlyph: string;
}

const font = (file: string) => readFileSync(new URL(`../video/fonts/${file}`, import.meta.url)).toString('base64');
const FONTS = `@font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`;

const lines = (look: Look, body: string, extra = '') =>
  `<svg class="ln" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${extra}><g fill="none" stroke="${look.ink}" stroke-width="${look.stroke}" stroke-linecap="round" stroke-linejoin="round" color="${look.ink}">${body}</g></svg>`;

const camFor = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 1060 - fy * s, scale: s });

function dialogue(v: Video): { html: string; tweens: string } {
  const close = v.closeScale ?? 2.2;
  const wide = v.wide ?? { fx: 540, fy: 1060, s: 1 };
  const cams = {
    wide: wide,
    a: { fx: v.heads.A.x, fy: v.heads.A.y + 95, s: close },
    b: { fx: v.heads.B.x, fy: v.heads.B.y + 95, s: close },
  };
  const caps = v.lines
    .map((l, i) => `<div class="clip dcap" data-start="${T.shots[i]}" data-duration="${(T.shots[i + 1] - T.shots[i]).toFixed(3)}"><span>${l.text}</span></div>`)
    .join('\n        ');
  const tw: string[] = [];
  v.lines.forEach((l, i) => {
    const t = T.shots[i];
    const d = T.shots[i + 1] - t;
    const c = cams[l.shot];
    tw.push(`tl.set('#cam', ${JSON.stringify(camFor(c.fx, c.fy, c.s))}, ${t});`);
    tw.push(`tl.to('#cam', { ...${JSON.stringify(camFor(c.fx, c.fy, c.s * 1.035))}, duration: ${d.toFixed(3)}, ease: 'none' }, ${t});`);
    for (const who of ['A', 'B'] as const) {
      const k = who === 'A' ? l.a : l.b;
      if (k) tw.push(`tl.set('.face${who}', { opacity: 0 }, ${t}); tl.set('#face${who}_${k}', { opacity: 1 }, ${t});`);
    }
  });
  const html = `<div class="clip scene" id="dialogue" data-start="0" data-duration="${T.shots[7]}">
        ${v.theme.spot ? `<div class="spot"></div>` : ''}
        <div class="cam" id="cam">${lines(v.theme, v.scene)}</div>
        <div class="tex"></div>
        ${caps}
      </div>`;
  return { html, tweens: tw.join('\n      ') };
}

function demo(v: Video): string {
  return `<div class="clip scene" id="demo" data-start="${T.demo[0]}" data-duration="${(T.demo[3] - T.demo[0]).toFixed(3)}">
        ${v.theme.spot ? `<div class="spot"></div>` : ''}
        <div class="cam" id="dcam">${lines(v.theme, v.demo.svg)}</div>
        <div class="tex"></div>
      </div>`;
}

function history(v: Video): { html: string; tweens: string } {
  const h = v.theme.hist;
  const shots = v.history
    .map((s, i) => {
      const t = T.history[i];
      const d = T.history[i + 1] - t;
      return `<div class="clip hshot" data-start="${t}" data-duration="${d.toFixed(3)}">
          <div class="hart" id="hart${i}" style="transform-origin:${s.origin ?? '50% 50%'}">${lines(h, s.art, 'class="ln hln"')}</div>
          <div class="htex"></div>
          <div class="hlabel">${s.label}</div>
        </div>`;
    })
    .join('\n        ');
  const tw: string[] = [];
  v.history.forEach((_, i) => {
    const t = T.history[i];
    const d = T.history[i + 1] - t;
    tw.push(`tl.fromTo('#hart${i}', { scale: 1 }, { scale: 1.07, duration: ${d.toFixed(3)}, ease: 'none' }, ${t});`);
    if (i) tw.push(`tl.set('#flash', { opacity: 0.5 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.034).toFixed(3)});`);
  });
  return {
    html: `<div class="clip scene" id="history" data-start="${T.history[0]}" data-duration="${(T.history[6] - T.history[0]).toFixed(3)}">
        ${shots}
      </div>`,
    tweens: tw.join('\n      '),
  };
}

function tableHtml(v: Video): { html: string; tweens: string } {
  const th = v.theme;
  const t = T.table;
  const html = `<div class="clip scene" id="table" data-start="${t}" data-duration="${(T.tableEnd - t).toFixed(3)}">
        <svg class="ln" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g fill="none" stroke="${th.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
          <path id="tv" d="M540,740 V1170" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
          <path id="th" d="M70,900 H1010" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
          <g id="ticonL" transform="translate(300 795) scale(1.1)" opacity="0">${v.table.leftIcon}</g>
          <g id="ticonR" transform="translate(780 795) scale(1.1)" opacity="0">${v.table.rightIcon}</g>
          <rect id="tpick" x="556" y="730" width="448" height="430" rx="20" stroke="${th.accent}" stroke-width="5" opacity="0"/>
        </g></svg>
        <div class="tlabel" id="tlabL" style="left:80px">${v.table.left}</div>
        <div class="tlabel" id="tlabR" style="left:560px">${v.table.right}</div>
        ${v.table.rows
          .map(([l, r], i) => `<div class="trow" id="trowL${i}" style="left:80px;top:${930 + i * 76}px">${l}</div><div class="trow" id="trowR${i}" style="left:560px;top:${930 + i * 76}px">${r}</div>`)
          .join('\n        ')}
        <div class="tex"></div>
      </div>`;
  const tw = [
    `tl.to('#tv', { attr: { 'stroke-dashoffset': 0 }, duration: 0.3, ease: 'power2.out' }, ${t});`,
    `tl.to('#th', { attr: { 'stroke-dashoffset': 0 }, duration: 0.35, ease: 'power2.out' }, ${t + 0.05});`,
    `tl.to(['#ticonL', '#ticonR', '#tlabL', '#tlabR'], { opacity: 1, duration: 0.25 }, ${t + 0.15});`,
    ...T.rows.map((r, i) => `tl.fromTo(['#trowL${i}', '#trowR${i}'], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, ${r});`),
    `tl.fromTo('#tpick', { opacity: 0, scale: 1.08, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15 }, ${T.pick});`,
  ];
  return { html, tweens: tw.join('\n      ') };
}

function ctaHtml(v: Video): { html: string; tweens: string } {
  const [w1, w2, w3] = v.cta;
  const html = `<div class="clip scene" id="cta" data-start="${T.stop}" data-duration="${(T.bio - T.stop).toFixed(3)}">
        <div class="ctaBox"><div id="cta1">${w1}</div><div id="cta2">${w2}</div><div id="cta3" class="acc">${w3}</div></div>
        <div class="tex"></div>
      </div>
      <div class="clip scene" id="bio" data-start="${T.bio}" data-duration="${(T.end - T.bio).toFixed(3)}">
        <div class="bioBox"><div id="bioIcon">${bracketIcon(v.bioGlyph, v.theme.ink, v.theme.accent)}</div><div id="bioText">Ссылка в био</div></div>
        <div class="tex"></div>
      </div>`;
  const tw = [
    `tl.set(['#cta2', '#cta3'], { opacity: 0 }, ${T.stop});`,
    `tl.fromTo('#cta1', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' }, ${T.stop});`,
    `tl.fromTo('#cta2', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' }, ${T.stop2});`,
    `tl.fromTo('#cta3', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(2)' }, ${T.play});`,
    `tl.fromTo('#bioIcon', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.8)' }, ${T.bio});`,
    `tl.fromTo('#bioText', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }, ${T.bio + 0.1});`,
    `tl.to('#bioIcon', { scale: 1.06, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 2 }, ${T.bio + 0.5});`,
  ];
  return { html, tweens: tw.join('\n      ') };
}

function capCss(th: Theme): string {
  const size = th.capSize ?? 42;
  const base = `.dcap { position: absolute; left: 60px; right: 60px; top: 410px; text-align: center; font-family: ${th.font}; font-size: ${size}px; line-height: 1.3; }`;
  switch (th.cap) {
    case 'box':
      return `${base} .dcap span { display: inline-block; padding: 16px 26px; background: #fff; color: #111; border: 5px solid #111; font-weight: 800; transform: rotate(-1.2deg); box-shadow: 6px 6px 0 #111; }`;
    case 'tag':
      return `${base} .dcap span { display: inline-block; padding: 10px 22px; background: ${th.ink}; color: ${th.fill}; font-weight: 700; }`;
    case 'type':
      return `${base} .dcap span { display: inline-block; padding: 12px 22px; background: rgba(255,255,255,0.75); color: ${th.ink}; font-weight: 700; letter-spacing: -0.5px; }`;
    default:
      return `${base} .dcap span { color: ${th.ink}; font-weight: 700; letter-spacing: -0.3px; ${th.dark ? 'text-shadow: 0 2px 10px rgba(0,0,0,0.8);' : ''} }`;
  }
}

export function buildVideo(v: Video): string {
  const th = v.theme;
  const h = th.hist;
  const d = dialogue(v);
  const hi = history(v);
  const ta = tableHtml(v);
  const ct = ctaHtml(v);
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
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; color: ${th.ink}; font-family: ${th.font}; }
      .scene { position: absolute; inset: 0; overflow: hidden; background: ${th.bg}; }
      .spot { position: absolute; inset: 0; background: ${th.spot ?? 'none'}; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .ln { position: absolute; left: 0; top: 0; ${th.lineFilter ? `filter: ${th.lineFilter};` : ''} }
      .tex { position: absolute; inset: 0; pointer-events: none; ${th.overlay ? `background: ${th.overlay}; ${th.overlayBlend ? `mix-blend-mode: ${th.overlayBlend};` : ''}` : 'display: none;'} }
      ${capCss(th)}
      .hshot { position: absolute; inset: 0; overflow: hidden; background: ${h.bg}; }
      .hart { position: absolute; inset: 0; }
      .hart .ln { ${h.lineFilter ? `filter: ${h.lineFilter};` : 'filter: none;'} }
      .htex { position: absolute; inset: 0; pointer-events: none; ${h.overlay ? `background: ${h.overlay}; ${h.overlayBlend ? `mix-blend-mode: ${h.overlayBlend};` : ''}` : 'display: none;'} }
      .hlabel { position: absolute; left: 50%; top: 300px; transform: translateX(-50%); max-width: 900px; padding: 16px 26px; background: ${h.labelBg};
        border: 2px solid ${h.labelBorder}; color: ${h.labelInk}; font-family: ${h.labelFont}; font-size: 28px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; text-align: center; line-height: 1.4; white-space: nowrap; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
      .tlabel { position: absolute; top: 846px; width: 440px; text-align: center; font-size: 33px; font-weight: 800; letter-spacing: 2px; opacity: 0; color: ${th.ink}; }
      .trow { position: absolute; width: 440px; text-align: center; font-size: 31px; white-space: nowrap; font-weight: 600; color: ${th.ink}; opacity: 0; }
      .ctaBox, .bioBox { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; text-align: center; }
      .ctaBox { font-size: 74px; font-weight: 800; line-height: 1.12; letter-spacing: -1px; color: ${th.ink}; padding-left: 60px; padding-right: 60px; }
      .acc { color: ${th.accent}; }
      #bioIcon { width: 200px; height: 200px; }
      #bioText { margin-top: 34px; font-size: 44px; font-weight: 600; color: ${th.ink}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.end}" data-volume="1"></audio>
      ${d.html}
      ${demo(v)}
      ${hi.html}
      ${ta.html}
      ${ct.html}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${d.tweens}
      ${v.demo.tweens}
      ${hi.tweens}
      ${ta.tweens}
      ${ct.tweens}
      tl.set({}, {}, ${T.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

/** Записать композицию ролика и всё, что ей нужно, в `trailer/ads/out/<id>/`. */
export function writeVideo(v: Video): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of ['grain-dark.png', 'grain-light.png', 'chalk.png']) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  copyFileSync(new URL('../ad/video/music.wav', import.meta.url), new URL('music.wav', dir));
  return dir.pathname;
}
