/**
 * Ролики-страшилки «правила» (42…) — по образцам «Оракул» и «Подъезд» (плоская векторная рисовка, ночь,
 * голос рассказчика, субтитры по словам с цветными ключевыми словами, сверху «● 23 ОКТ · 03:0X» и «ЧАСТЬ 1»,
 * правила — бумажкой на скотче, в конце выбор «А / Б» и «часть 2 по твоему выбору»).
 *
 * Голос — один файл `music/<id>/vo.wav` (склеенная озвучка Fish Audio), музыка — `music/<id>/music.wav`
 * (музыка образца без голоса, отделена demucs); в репозиторий не кладём. Время слов — `videos/v<id>-words.json`
 * (faster-whisper по склеенной озвучке): кадры и субтитры привязаны к словам, а не к секундам.
 *
 * Кадр — SVG 1080×1920 внутри «камеры» (наезд/сдвиг на всю длину кадра) и своих анимаций.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FONTS, H, W } from './engine3.ts';

export type Word = [text: string, t0: number, t1: number, part: number];

export interface Shot8 {
  t0: number;
  t1: number;
  /** Содержимое кадра: SVG (или любой HTML) на 1080×1920. */
  art: string;
  /** Камера: масштаб и сдвиг в начале и в конце кадра (по умолчанию лёгкий наезд 1 → 1.05). */
  cam?: { s?: [number, number]; x?: [number, number]; y?: [number, number]; ox?: number; oy?: number; ease?: string };
  /** Свои анимации кадра (`tl.…`); `id` — селектор кадра, чтобы не задеть другие кадры. */
  tweens?: (t0: number, t1: number, id: string) => string;
}

export interface Overlay8 {
  t0: number;
  t1: number;
  html: string;
  tweens?: (t0: number, t1: number, id: string) => string;
}

export interface Video8 {
  id: string;
  title: string;
  end: number;
  shots: Shot8[];
  subs: { t0: number; t1: number; words: { text: string; t: number; color?: string }[] }[];
  /** Поверх кадров и под субтитрами: правила на скотче, карточки выбора… */
  overlays: Overlay8[];
  /** Шапка: время на часах «23 ОКТ · 03:0X» по моментам. */
  clock: [number, string][];
  /** Тряска кадра [момент, сила, длительность] и вспышки [момент, яркость, длительность]. */
  shakes?: [number, number, number][];
  flashes?: [number, number, number, string?][];
  /** Шапку и субтитры прячем с этого момента (финальная карточка). */
  plainFrom?: number;
  /** Номер части в шапке (по умолчанию 1). */
  part?: number;
}

export const P = {
  night: '#0f1424',
  night2: '#151c31',
  navy: '#1c2540',
  navy2: '#26304f',
  slate: '#323d60',
  fog: '#4a5a86',
  ink: '#090c16',
  paper: '#eee2c2',
  paper2: '#d9c99f',
  pen: '#2a2f4a',
  red: '#ff4a4a',
  yellow: '#ffc23d',
  amber: '#f5a623',
  cyan: '#59d2ff',
  skin: '#f1d3c0',
  skin2: '#dcb39c',
  hair: '#171a26',
  hood: '#7d8394',
  hood2: '#5e6475',
  white: '#f4f1ea',
};

const ffont = (path: string) => readFileSync(new URL(path, import.meta.url)).toString('base64');
const CAVEAT = `@font-face { font-family: 'Caveat'; font-weight: 400 700; src: url(data:font/woff2;base64,${ffont('../../src/ui/qthemes/fonts/caveat-cyrillic-12c256.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'Caveat'; font-weight: 400 700; src: url(data:font/woff2;base64,${ffont('../../src/ui/qthemes/fonts/caveat-latin-14ecf1.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+2000-206F; }`;

const CSS8 = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${P.night}; font-family: 'Montserrat', sans-serif; }
      .scene { position: absolute; inset: 0; overflow: hidden; background: ${P.night}; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
      .cam > svg { position: absolute; left: 0; top: 0; }
      #shk { position: absolute; inset: 0; }
      #tex { position: absolute; inset: 0; pointer-events: none; background: url(grain-dark.png); opacity: 0.55; mix-blend-mode: overlay; }
      #vig { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%); }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
      .hud { position: absolute; left: 0; right: 0; top: 70px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .clk { position: relative; height: 48px; width: 360px; white-space: nowrap; border-radius: 30px; background: rgba(8,10,18,0.78);
        color: #f4f1ea; font-weight: 800; font-size: 26px; letter-spacing: 2px; display: flex; align-items: center; justify-content: center; }
      .clk i { position: absolute; left: 22px; top: 17px; width: 14px; height: 14px; border-radius: 50%; background: ${P.red}; box-shadow: 0 0 12px ${P.red}; }
      .clk span { position: absolute; left: 44px; right: 14px; text-align: center; white-space: nowrap; }
      .part { padding: 5px 16px; border-radius: 8px; background: ${P.red}; color: #fff; font-weight: 900; font-size: 20px; letter-spacing: 3px; }
      .sub { position: absolute; left: 50px; right: 50px; top: 1290px; text-align: center; font-weight: 900; font-size: 74px; line-height: 1.08;
        text-transform: uppercase; color: #fff; letter-spacing: 0.5px; }
      .sub b { display: inline-block; font-weight: 900; margin: 0 9px; paint-order: stroke fill; -webkit-text-stroke: 12px rgba(5,6,12,0.92);
        text-shadow: 0 6px 22px rgba(0,0,0,0.85); }
      .note { position: absolute; background: ${P.paper}; color: #1a1d2c; box-shadow: 0 16px 40px rgba(0,0,0,0.55); }
      .tape { position: absolute; width: 150px; height: 46px; background: rgba(230,214,170,0.72); box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      .hand { font-family: 'Caveat', cursive; font-weight: 600; }`;

/** Субтитры из слов озвучки: куски по 1–3 слова (до знака препинания), слова появляются по одному. */
export function makeSubs(
  words: Word[],
  opt: { text?: Record<number, string>; color?: Record<number, string>; breakAfter?: number[]; hide?: [number, number][] } = {},
): Video8['subs'] {
  const out: Video8['subs'] = [];
  let cur: { text: string; t: number; color?: string }[] = [];
  let chars = 0;
  const hidden = (i: number) => (opt.hide ?? []).some(([a, b]) => i >= a && i <= b);
  const flush = (tEnd: number) => {
    if (cur.length) out.push({ t0: cur[0].t, t1: tEnd, words: cur });
    cur = [];
    chars = 0;
  };
  words.forEach(([raw, t0, t1], i) => {
    if (hidden(i)) return;
    const text = opt.text?.[i] ?? raw;
    if (cur.length && (cur.length >= 3 || chars + text.length > 17)) flush(t0);
    cur.push({ text, t: t0, color: opt.color?.[i] });
    chars += text.length + 1;
    const next = words[i + 1];
    if (/[.,!?—:]$/.test(text) || opt.breakAfter?.includes(i) || !next || hidden(i + 1)) {
      flush(next && next[1] - t1 < 0.7 ? next[1] : t1 + 0.35);
    }
  });
  // Кусок держится до следующего, если пауза короткая.
  for (let i = 0; i < out.length - 1; i++) if (out[i + 1].t0 - out[i].t1 < 0.25) out[i].t1 = out[i + 1].t0;
  return out;
}

/** Бумажка с правилом на скотче (как в образце «Оракул»). */
export function ruleNote(n: number, text: string): string {
  return `<div class="note" style="left:56px;top:220px;width:700px;padding:26px 34px 28px;transform:rotate(-2deg)">
    <div class="tape" style="left:-30px;top:-14px;transform:rotate(-32deg)"></div>
    <div class="tape" style="right:-34px;top:-12px;transform:rotate(28deg)"></div>
    <div style="font-weight:900;font-size:26px;letter-spacing:3px;color:#3a3f55">ПРАВИЛО <span style="color:#d42f2f">№${n}</span></div>
    <div style="font-weight:900;font-size:36px;line-height:1.16;margin-top:8px;text-transform:uppercase">${text}</div>
  </div>`;
}

export function buildVideo8(v: Video8): string {
  const shots = v.shots
    .map((s, i) => {
      const id = `#s${i}`;
      return `<div class="clip scene" id="s${i}" data-start="${s.t0.toFixed(3)}" data-duration="${(s.t1 - s.t0).toFixed(3)}"><div class="cam" id="c${i}">${s.art}</div></div>`;
    })
    .join('\n');
  const camTweens = v.shots
    .map((s, i) => {
      const c = s.cam ?? {};
      const sc = c.s ?? [1, 1.05];
      const x = c.x ?? [0, 0];
      const y = c.y ?? [0, 0];
      const o = `${c.ox ?? 540}px ${c.oy ?? 900}px`;
      return `tl.fromTo('#c${i}', { scale: ${sc[0]}, x: ${x[0]}, y: ${y[0]}, transformOrigin: '${o}' }, { scale: ${sc[1]}, x: ${x[1]}, y: ${y[1]}, duration: ${(s.t1 - s.t0).toFixed(3)}, ease: '${c.ease ?? 'none'}' }, ${s.t0.toFixed(3)});
      ${s.tweens ? s.tweens(s.t0, s.t1, `#s${i}`) : ''}`;
    })
    .join('\n');
  const overlays = v.overlays
    .map((o, i) => `<div class="clip" id="o${i}" style="position:absolute;inset:0" data-start="${o.t0.toFixed(3)}" data-duration="${(o.t1 - o.t0).toFixed(3)}">${o.html}</div>`)
    .join('\n');
  const overlayTweens = v.overlays.map((o, i) => (o.tweens ? o.tweens(o.t0, o.t1, `#o${i}`) : '')).join('\n');
  const plain = v.plainFrom ?? v.end;
  const clock = v.clock
    .map(([t, label], i) => {
      const t1 = Math.min(v.clock[i + 1]?.[0] ?? plain, plain);
      return `<span class="clip" data-start="${t.toFixed(3)}" data-duration="${(t1 - t).toFixed(3)}">${label}</span>`;
    })
    .join('');
  const subs = v.subs
    .filter((s) => s.t0 < plain)
    .map(
      (s, i) =>
        `<div class="clip sub" data-start="${s.t0.toFixed(3)}" data-duration="${(Math.min(s.t1, plain) - s.t0).toFixed(3)}">${s.words
          .map((w, j) => `<b id="w${i}_${j}" style="opacity:0.3${w.color ? `;color:${w.color}` : ''}">${w.text}</b>`)
          .join('')}</div>`,
    )
    .join('\n');
  const subTweens = v.subs
    .filter((s) => s.t0 < plain)
    .map((s, i) =>
      s.words
        .map((w, j) => `tl.fromTo('#w${i}_${j}', { opacity: 0.3 }, { opacity: 1, duration: 0.1, ease: 'power1.out' }, ${w.t.toFixed(3)});`)
        .join('\n'),
    )
    .join('\n');
  const shakes = (v.shakes ?? [])
    .map(([t, a, d]) => {
      const n = Math.max(4, Math.round(d / 0.05));
      return `tl.to('#shk', { keyframes: [${Array.from({ length: n }, (_, k) => {
        const f = 1 - k / n;
        return `{ x: ${((k % 2 ? -1 : 1) * a * f).toFixed(1)}, y: ${(((k * 7) % 3) - 1) * a * 0.6 * f}, duration: ${(d / (n + 1)).toFixed(3)} }`;
      }).join(', ')}, { x: 0, y: 0, duration: ${(d / (n + 1)).toFixed(3)} }] }, ${t.toFixed(3)});`;
    })
    .join('\n');
  const flashes = (v.flashes ?? [])
    .map(([t, a, d, c]) => `tl.set('#flash', { opacity: ${a}, background: '${c ?? '#fff'}' }, ${t.toFixed(3)}); tl.to('#flash', { opacity: 0, duration: ${d}, ease: 'power2.out' }, ${(t + 0.01).toFixed(3)});`)
    .join('\n');
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>
      ${FONTS}
      ${CAVEAT}
      ${CSS8}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${v.end}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${v.end}" data-volume="1"></audio>
      <audio id="vo" src="vo.wav" data-start="0" data-duration="${v.end}" data-volume="1"></audio>
      <div id="shk">
${shots}
      </div>
      <div id="tex"></div>
      <div id="vig"></div>
${overlays}
      <div class="clip hud" data-start="0" data-duration="${plain}"><div class="clk"><i id="rec"></i>${clock}</div><div class="part">ЧАСТЬ ${v.part ?? 1}</div></div>
${subs}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${camTweens}
      ${overlayTweens}
      ${subTweens}
      ${shakes}
      ${flashes}
      tl.fromTo('#rec', { opacity: 1 }, { opacity: 0.15, duration: 0.5, repeat: ${Math.floor(plain / 0.5) - 1}, yoyo: true, ease: 'steps(1)' }, 0);
      tl.set({}, {}, ${v.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

export function writeVideo8(v: Video8): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo8(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  copyFileSync(new URL('./assets/grain-dark.png', import.meta.url), new URL('grain-dark.png', dir));
  copyFileSync(new URL('../../public/icons/icon-512.png', import.meta.url), new URL('icon.png', dir));
  for (const f of ['music.wav', 'vo.wav']) {
    const src = new URL(`./music/${v.id}/${f}`, import.meta.url);
    if (existsSync(src)) copyFileSync(src, new URL(f, dir));
  }
  return dir.pathname;
}
