/**
 * Ролики-сценки (38…) — по образцам «Лифт», «Кровать», «Библиотека» (человечки двигаются, ролики залетели).
 * Формат:
 *   1. Двое в тёмной комнате, реплики в кавычках сверху. Кадры: общий, крупно, «через плечо» (передний
 *      человечек размыт), лёгкий наезд камеры, фон размыт как у настоящей камеры.
 *   2. На 13-й секунде — инфографика поверх затемнённой сцены: заголовок, оранжевая строка, полоски, источник
 *      мелким внизу.
 *   3. Деталь сверху (руки, бумаги), вторая инфографика, приложение крупно в руке.
 *   4. Развязка: герои что-то передают друг другу, деталь сверху.
 *   5. Карточка «<приложение> — в био» на чёрном (34,6 с — на смену музыки).
 * Склейки — по образцу «Библиотека» (`CW7`), музыка — из него же (`music/<id>/music.wav`, в репозиторий не кладём).
 *
 * Человечки на «скелете»: каждый сустав — группа `rotate(угол)` с началом в суставе, позы — твины атрибута
 * transform (так GSAP одинаково считает любой кадр при перемотке). Угол 0 — конечность вниз, минус — вперёд.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FONTS, H, W } from './engine3.ts';

/** Склейки образца «Библиотека» (44 с, из них 34,6 — сценка, дальше карточка и заставка TikTok). */
export const CW7 = {
  cuts: [0, 3.267, 4.867, 7.567, 9.733, 13.0, 16.767, 17.833, 18.933, 21.1, 23.8, 25.4, 26.5, 30.267, 31.367, 32.433, 34.6],
  end: 39.6,
};

export const K = {
  bg: '#121317',
  line: '#f2f2f0',
  head: '#0b0b0d',
  accent: '#ff7a2e',
  green: '#3ecf6e',
  dim: '#8c8f97',
};

/** Размеры человечка (в единицах сцены). */
export const R = 64;
export const TOR = 230;
export const UA = 118;
export const FA = 112;
export const TH = 135;
export const SH = 150;

export interface Pose {
  tor: number;
  hd: number;
  ua1: number;
  fa1: number;
  ua2: number;
  fa2: number;
  th1: number;
  sh1: number;
  th2: number;
  sh2: number;
}
/** Сидит за столом, руки на столе. */
export const SIT: Pose = { tor: -3, hd: 0, ua1: -28, fa1: -62, ua2: -22, fa2: -66, th1: -90, sh1: 90, th2: -86, sh2: 86 };
export const pose = (p: Partial<Pose>): Pose => ({ ...SIT, ...p });

export type Face7 = 'neutral' | 'smile' | 'grin' | 'tired' | 'shock' | 'doubt' | 'smirk' | 'sad' | 'think';

const MOUTHS: Record<string, string> = {
  flat: `<path d="M-13,30 H13"/>`,
  smile: `<path d="M-17,25 Q0,40 17,25"/>`,
  grin: `<path d="M-20,23 Q0,48 20,23 Z" fill="${K.line}"/>`,
  o: `<ellipse cx="0" cy="31" rx="8" ry="10"/>`,
  frown: `<path d="M-15,36 Q0,24 15,36"/>`,
  smirk: `<path d="M-15,31 Q3,36 17,23"/>`,
  wavy: `<path d="M-16,31 q5,-6 10,0 t10,0 t10,0"/>`,
};
/** Лицо: рот, брови (подъём, наклон: плюс — хмурится), веки, размер глаз. */
const FACES: Record<Face7, { m: string; by: number; ba: number; lid?: boolean; es?: number }> = {
  neutral: { m: 'flat', by: 0, ba: 0 },
  smile: { m: 'smile', by: -2, ba: -4 },
  grin: { m: 'grin', by: -6, ba: -6 },
  tired: { m: 'flat', by: 4, ba: -10, lid: true },
  shock: { m: 'o', by: -12, ba: -8, es: 1.18 },
  doubt: { m: 'wavy', by: -4, ba: 14 },
  smirk: { m: 'smirk', by: 0, ba: 10 },
  sad: { m: 'frown', by: 2, ba: -16 },
  think: { m: 'flat', by: -4, ba: 8 },
};

const ln = (x1: number, y1: number, x2: number, y2: number, extra = '') => `<path d="M${x1},${y1} L${x2},${y2}" ${extra}/>`;

/** Голова и лицо (центр головы — 0,0). */
function headSvg(id: string, o: { glasses?: boolean; hair?: boolean }): string {
  const eye = (x: number) => `<circle cx="${x}" cy="0" r="17" fill="${K.line}" stroke="none"/>`;
  const lid = (x: number) => `<path d="M${x - 19},-20 H${x + 19} V-1 H${x - 19} Z" fill="${K.head}" stroke="none"/><path d="M${x - 17},-1 H${x + 17}" stroke-width="4"/>`;
  return `<circle r="${R}" fill="${K.head}" stroke-width="7"/>
    ${o.hair ? `<g stroke-width="6">${ln(-18, -R + 2, -26, -R - 22)}${ln(0, -R, 2, -R - 26)}${ln(18, -R + 2, 30, -R - 18)}</g>` : ''}
    <g id="${id}-ey" transform="translate(0 -6) scale(1 1)">
      ${eye(-23)}${eye(23)}
      <g id="${id}-pp" transform="translate(0 0)" fill="${K.head}" stroke="none"><circle cx="-23" cy="1" r="7.5"/><circle cx="23" cy="1" r="7.5"/></g>
      <g id="${id}-lid" opacity="0">${lid(-23)}${lid(23)}</g>
    </g>
    ${o.glasses ? `<g stroke-width="4.5"><circle cx="-23" cy="-6" r="25"/><circle cx="23" cy="-6" r="25"/>${ln(-3, -8, 3, -8)}${ln(-48, -10, -60, -16)}${ln(48, -10, 60, -16)}</g>` : ''}
    <g stroke-width="6"><g id="${id}-b1" transform="translate(-23 -40) rotate(0)">${ln(-14, 0, 14, 0)}</g><g id="${id}-b2" transform="translate(23 -40) rotate(0)">${ln(-14, 0, 14, 0)}</g></g>
    <g stroke-width="6" fill="none">${Object.entries(MOUTHS)
      .map(([k, d]) => `<g id="${id}-m-${k}" opacity="${k === 'flat' ? 1 : 0}">${d}</g>`)
      .join('')}</g>`;
}

/** Рука: плечо → локоть → кисть; `items` — вещи в кисти (держатся прямо, сколько ни крути руку). */
const arm = (id: string, n: 1 | 2, a: number, b: number, tor: number, items = '', back = false) => `
  <g id="${id}-ua${n}" transform="rotate(${a})" ${back ? `stroke="#b9b9b6"` : ''}>
    ${ln(0, 0, 0, UA)}
    <g transform="translate(0 ${UA})"><g id="${id}-fa${n}" transform="rotate(${b})">
      ${ln(0, 0, 0, FA)}<circle cx="0" cy="${FA}" r="9" fill="${back ? '#b9b9b6' : K.line}" stroke="none"/>
      <g id="${id}-it${n}" transform="translate(0 ${FA}) rotate(${-(tor + a + b)})">${items}</g>
    </g></g>
  </g>`;
const leg = (id: string, n: 1 | 2, a: number, b: number, back = false) => `
  <g id="${id}-th${n}" transform="rotate(${a})" ${back ? `stroke="#b9b9b6"` : ''}>
    ${ln(0, 0, 0, TH)}
    <g transform="translate(0 ${TH})"><g id="${id}-sh${n}" transform="rotate(${b})">${ln(0, 0, 0, SH)}${ln(0, SH, 34, SH)}</g></g>
  </g>`;

export interface FigOpts {
  x: number;
  y: number;
  /** 1 — смотрит вправо, −1 — влево. */
  f: 1 | -1;
  pose: Pose;
  glasses?: boolean;
  hair?: boolean;
  /** Вещи в передней и задней руке (варианты прячутся прозрачностью). */
  items1?: string;
  items2?: string;
}

/** Человечек: бёдра в (x, y), туловище вверх, голова анфас, тело в профиль (как у образцов). */
export function figure(id: string, o: FigOpts): string {
  const p = o.pose;
  return `<g id="${id}" transform="translate(${o.x} ${o.y}) scale(${o.f} 1)" stroke="${K.line}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${leg(id, 2, p.th2, p.sh2, true)}
    <g id="${id}-tor" transform="rotate(${p.tor})">
      <g transform="translate(0 ${-TOR})">${arm(id, 2, p.ua2, p.fa2, p.tor, o.items2, true)}</g>
      ${ln(0, 0, 0, -TOR)}
      <g transform="translate(0 ${-TOR})">
        ${arm(id, 1, p.ua1, p.fa1, p.tor, o.items1)}
        <g id="${id}-hd" transform="rotate(${p.hd})"><g transform="translate(0 ${-R - 12})">${headSvg(id, o)}</g></g>
      </g>
    </g>
    ${leg(id, 1, p.th1, p.sh1)}
  </g>`;
}

/** Твины позы: d = 0 — сразу (на склейке). */
export function toPose(id: string, p: Partial<Pose>, from: Pose, t: number, d = 0, ease = 'power2.inOut'): { tw: string; pose: Pose } {
  const q = { ...from, ...p };
  const out: string[] = [];
  const put = (sel: string, tr: string) =>
    out.push(d === 0 ? `tl.set('${sel}', { attr: { transform: '${tr}' } }, ${t.toFixed(3)});` : `tl.to('${sel}', { attr: { transform: '${tr}' }, duration: ${d}, ease: '${ease}' }, ${t.toFixed(3)});`);
  for (const k of Object.keys(p) as (keyof Pose)[]) put(`#${id}-${k}`, `rotate(${q[k]})`);
  if ('tor' in p || 'ua1' in p || 'fa1' in p) put(`#${id}-it1`, `translate(0 ${FA}) rotate(${-(q.tor + q.ua1 + q.fa1)})`);
  if ('tor' in p || 'ua2' in p || 'fa2' in p) put(`#${id}-it2`, `translate(0 ${FA}) rotate(${-(q.tor + q.ua2 + q.fa2)})`);
  return { tw: out.join('\n      '), pose: q };
}

/** Выражение лица — сразу. */
export function face(id: string, f: Face7, t: number): string {
  const s = FACES[f];
  const out = Object.keys(MOUTHS).map((k) => `tl.set('#${id}-m-${k}', { opacity: ${k === s.m ? 1 : 0} }, ${t.toFixed(3)});`);
  out.push(`tl.set('#${id}-b1', { attr: { transform: 'translate(-23 ${-40 + s.by}) rotate(${s.ba})' } }, ${t.toFixed(3)});`);
  out.push(`tl.set('#${id}-b2', { attr: { transform: 'translate(23 ${-40 + s.by}) rotate(${-s.ba})' } }, ${t.toFixed(3)});`);
  out.push(`tl.set('#${id}-lid', { opacity: ${s.lid ? 1 : 0} }, ${t.toFixed(3)});`);
  const es = s.es ?? 1;
  out.push(`tl.set('#${id}-ey', { attr: { transform: 'translate(0 -6) scale(${es} ${es})' } }, ${t.toFixed(3)});`);
  return out.join('\n      ');
}

/** Куда смотрят зрачки (−1…1). */
export const look = (id: string, dx: number, dy: number, t: number, d = 0) =>
  d === 0
    ? `tl.set('#${id}-pp', { attr: { transform: 'translate(${dx * 6} ${dy * 6})' } }, ${t.toFixed(3)});`
    : `tl.to('#${id}-pp', { attr: { transform: 'translate(${dx * 6} ${dy * 6})' }, duration: ${d} }, ${t.toFixed(3)});`;

/** Моргнуть (глаза в обычном размере). */
export const blink = (id: string, t: number, es = 1) =>
  `tl.to('#${id}-ey', { attr: { transform: 'translate(0 -6) scale(${es} 0.08)' }, duration: 0.06 }, ${t.toFixed(3)}); tl.to('#${id}-ey', { attr: { transform: 'translate(0 -6) scale(${es} ${es})' }, duration: 0.08 }, ${(t + 0.09).toFixed(3)});`;

/** Жест при разговоре: предплечье покачивается `n` раз. */
export const gesture = (id: string, n: 1 | 2, from: number, amp: number, t: number, times = 2, per = 0.32) =>
  `tl.to('#${id}-fa${n}', { attr: { transform: 'rotate(${from + amp})' }, duration: ${per}, ease: 'sine.inOut', yoyo: true, repeat: ${times * 2 - 1} }, ${t.toFixed(3)});`;

/** Камера: точка сцены в центре кадра и масштаб, наезд до `to` к концу кадра. */
export const camAt = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 960 - fy * s, scale: s });

/** Иконка игры (`public/icons/icon.svg`) с уникальным id клипа. */
export const appIcon = (size: number) =>
  readFileSync(new URL('../../public/icons/icon.svg', import.meta.url), 'utf8')
    .replace('<svg ', `<svg width="${size}" height="${size}" `)
    .replace(/id="c"/, 'id="appclip"')
    .replace(/url\(#c\)/, 'url(#appclip)');

export const CSS7 = `
      ${FONTS}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .layer { position: absolute; left: 0; top: 0; }
      .cap7 { position: absolute; left: 70px; right: 70px; top: 236px; text-align: center; font-size: 50px; line-height: 1.24; font-weight: 700; color: #fff;
        text-shadow: 0 2px 16px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6); }
      .ihead { position: absolute; left: 60px; right: 60px; text-align: center; font-size: 38px; font-weight: 800; letter-spacing: 2px; line-height: 1.3; }
      .src { position: absolute; left: 60px; right: 60px; bottom: 120px; text-align: center; font-size: 20px; font-weight: 600; letter-spacing: 1.5px; line-height: 1.5; color: #6d7079; text-transform: uppercase; }
      .bar { position: absolute; left: 110px; height: 66px; border-radius: 14px; }
      .bar b { position: absolute; right: 22px; top: 12px; font-size: 36px; font-weight: 800; color: #111; }
      .blab { position: absolute; left: 112px; font-size: 26px; font-weight: 700; letter-spacing: 1.5px; color: #c8cad0; }
      .fg { position: absolute; filter: blur(22px); }
      #end { background: #000; }
      .endBox { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 240px; }
      #endText { margin-top: 40px; font-size: 52px; font-weight: 400; color: #fff; letter-spacing: 0.5px; }`;

/** Карточка в конце: иконка игры в уголках, «… — в био». */
export function endCard(t0: number, t1: number, text: string): { html: string; tweens: string } {
  const c = (sx: number, sy: number) => `<path d="M${sx * 100},${sy * 60} V${sy * 100} H${sx * 60}" />`;
  const html = `<div class="clip scene" id="end" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}">
        <div class="endBox"><div id="endIcon" style="position:relative;width:220px;height:220px">
          <svg viewBox="-110 -110 220 220" width="220" height="220" style="position:absolute;left:0;top:0"><g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="square">${c(-1, -1)}${c(1, -1)}${c(-1, 1)}${c(1, 1)}</g></svg>
          <div style="position:absolute;left:46px;top:46px;width:128px;height:128px">${appIcon(128)}</div>
        </div><div id="endText">${text}</div></div>
      </div>`;
  const tweens = [
    `tl.fromTo('#endIcon', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, ${t0});`,
    `tl.fromTo('#endText', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${(t0 + 0.1).toFixed(3)});`,
    `tl.to('#endIcon', { scale: 1.05, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 5 }, ${(t0 + 0.45).toFixed(3)});`,
  ];
  return { html, tweens: tweens.join('\n      ') };
}

export interface Video7 {
  id: string;
  title: string;
  /** Слои и клипы ролика (HTML внутри #root) и их анимация. */
  html: string;
  tweens: string;
}

export function buildVideo7(v: Video7): string {
  return `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${v.title}</title>
    <script src="gsap.min.js"></script>
    <style>
      ${CSS7}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${CW7.end}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${CW7.end}" data-volume="1"></audio>
      ${v.html}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${v.tweens}
      tl.set({}, {}, ${CW7.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

/** Собрать композицию в `out/<id>/`; музыка — `music/<id>/music.wav` (без неё ролик немой). */
export function writeVideo7(v: Video7): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), buildVideo7(v));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  const music = new URL(`./music/${v.id}/music.wav`, import.meta.url);
  if (existsSync(music)) copyFileSync(music, new URL('music.wav', dir));
  return dir.pathname;
}
