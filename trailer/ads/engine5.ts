/**
 * Ролики «как кино» (33…): по образцу фан-нарезок из фильмов — быстрые кадры, субтитры с выделенным
 * словом, тряска камеры на криках, вспышки на склейках. Сам фильм не используем: все сцены нарисованы
 * светящимися человечками на тёмном фоне. Голоса — свои записи (`music/<id>/`, в репозиторий не кладём):
 * монтаж строится по репликам (`cut`), звук сводится ffmpeg в одну дорожку. Без записей — немой ролик.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
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
  /** Звук: голоса из `music/<voiceDir>/<файл>.mp3` и синтезированные удары, хор, фон. */
  voiceDir?: string;
  cues?: Cue5[];
}

/** Звук на дорожке. */
export interface Cue5 {
  at: number;
  /** Голос: файл (без .mp3) и отрезок [от, до], с. */
  src?: [string, number, number];
  /** Синтезированный звук: удар, свист склейки, гул зала, пульс, низкий фон. */
  synth?: 'boom' | 'whoosh' | 'roar' | 'pulse' | 'drone';
  dur?: number;
  vol?: number;
  /** Высота голоса (хор из одной записи). */
  pitch?: number;
  /** Эхо зала. */
  room?: boolean;
}

/** Реплика: голос — отрезок записи; без голоса — `dur` секунд (только субтитр). */
export interface Line5 {
  say?: [string, number, number];
  dur?: number;
  /** Пауза перед репликой, с. */
  gap?: number;
  room?: boolean;
  /** Кадры; `at` — сдвиг от начала реплики, с. */
  shots: (Omit<Shot5, 't'> & { at?: number })[];
  /** Звуки поверх; `at` — сдвиг от начала реплики. `chorus` — хор зала из записи `say`. */
  fx?: (Omit<Cue5, 'at'> & { at?: number; chorus?: [string, number, number] })[];
}

/** Хор: одна запись с разной высотой, задержкой и громкостью — как будто кричит весь зал. */
const CHORUS: [number, number, number][] = [
  [1, 0, 0.55],
  [0.84, 0.05, 0.5],
  [0.92, 0.09, 0.45],
  [1.1, 0.03, 0.45],
  [1.22, 0.12, 0.4],
  [1.38, 0.07, 0.35],
  [0.76, 0.15, 0.4],
];

/** Монтаж по репликам: время кадров и звуков считается по длине записей. */
export function cut(lines: Line5[], start = 0): { shots: Shot5[]; cues: Cue5[]; end: number } {
  const shots: Shot5[] = [];
  const cues: Cue5[] = [];
  let t = start;
  for (const l of lines) {
    t += l.gap ?? 0.25;
    const t0 = +t.toFixed(3);
    for (const { at, ...s } of l.shots) shots.push({ ...s, t: +(t0 + (at ?? 0)).toFixed(3) });
    if (l.say) cues.push({ at: t0, src: l.say, room: l.room });
    for (const { at, chorus, ...f } of l.fx ?? []) {
      const ft = +(t0 + (at ?? 0)).toFixed(3);
      if (chorus) for (const [pitch, d, vol] of CHORUS) cues.push({ at: +(ft + d).toFixed(3), src: chorus, pitch, vol: vol * (f.vol ?? 1), room: true });
      else cues.push({ ...f, at: ft });
    }
    t = t0 + (l.say ? l.say[2] - l.say[1] : (l.dur ?? 1));
  }
  return { shots, cues, end: +t.toFixed(3) };
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
      ${v.cues ? `<audio id="music" src="sound.wav" data-start="0" data-duration="${v.T.end}" data-volume="1"></audio>` : ''}
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

const SR = 48000;
/** Синтезированные звуки (ffmpeg lavfi). */
function synth(kind: NonNullable<Cue5['synth']>, d: number): string {
  switch (kind) {
    case 'boom':
      return `aevalsrc=exprs='0.9*sin(2*PI*(42*t+7*(1-exp(-9*t))))*exp(-3.2*t)':s=${SR}:d=${d}`;
    case 'whoosh':
      return `anoisesrc=d=${d}:c=pink:a=0.7:r=${SR},bandpass=f=1400:width_type=q:w=0.7,afade=t=in:d=${(d * 0.6).toFixed(2)}:curve=exp,afade=t=out:st=${(d * 0.6).toFixed(2)}:d=${(d * 0.4).toFixed(2)}`;
    case 'roar':
      return `anoisesrc=d=${d}:c=pink:a=0.6:r=${SR},highpass=f=180,lowpass=f=1300,volume='0.65+0.35*sin(2*PI*3.1*t)*sin(2*PI*1.3*t)':eval=frame,afade=t=in:d=0.25,afade=t=out:st=${Math.max(0, d - 1).toFixed(2)}:d=1`;
    case 'pulse':
      return `aevalsrc=exprs='0.85*sin(2*PI*(46*mod(t\\,0.8)+4*(1-exp(-25*mod(t\\,0.8)))))*exp(-8*mod(t\\,0.8))':s=${SR}:d=${d}`;
    case 'drone':
      return `aevalsrc=exprs='(0.22*sin(2*PI*55*t)+0.16*sin(2*PI*82.41*t)+0.1*sin(2*PI*110.3*t)+0.05*sin(2*PI*164.8*t))*(0.8+0.2*sin(2*PI*0.3*t))':s=${SR}:d=${d},lowpass=f=700,volume='0.35+0.65*t/${d}':eval=frame,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, d - 0.5).toFixed(2)}:d=0.5`;
  }
}

/** Свести звук в `sound.wav`: голоса с эхом зала и хором, удары, фон; громкость как у роликов в соцсетях. */
function mixSound(v: Video5, out: URL): boolean {
  const dir = new URL(`./music/${v.voiceDir ?? v.id}/`, import.meta.url);
  const cues = v.cues ?? [];
  const missing = [...new Set(cues.filter((c) => c.src && !existsSync(new URL(`${c.src[0]}.mp3`, dir))).map((c) => c.src![0]))];
  if (missing.length) {
    console.warn(`Нет записей голоса (${missing.join(', ')}) в ${dir.pathname} — ролик без звука.`);
    return false;
  }
  const args: string[] = ['-v', 'error', '-y'];
  const chains: string[] = [];
  cues.forEach((c, i) => {
    let len: number;
    if (c.src) {
      const [file, from, to] = c.src;
      len = to - from;
      args.push('-ss', String(from), '-t', len.toFixed(3), '-i', new URL(`${file}.mp3`, dir).pathname);
    } else {
      len = c.dur ?? 1.6;
      args.push('-f', 'lavfi', '-i', synth(c.synth!, len));
    }
    const f = [`aformat=sample_rates=${SR}:channel_layouts=stereo`];
    if (c.pitch && c.pitch !== 1) f.push(`rubberband=pitch=${c.pitch}`);
    if (c.src) f.push('afade=t=in:d=0.01', `afade=t=out:st=${Math.max(0, len - 0.04).toFixed(3)}:d=0.04`);
    if (c.room) f.push('aecho=0.85:0.6:45|95:0.2|0.12');
    f.push(`volume=${c.vol ?? 1}`, `adelay=${Math.round(c.at * 1000)}:all=1`);
    chains.push(`[${i}:a]${f.join(',')}[a${i}]`);
  });
  const mix = `${cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:dropout_transition=0,apad=whole_dur=${v.T.end},atrim=0:${v.T.end},alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=${SR}[out]`;
  args.push('-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-ac', '2', new URL('sound.wav', out).pathname);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  return true;
}

/** Собрать композицию в `out/<id>/`; со звуком, если есть записи голосов. */
export function writeVideo5(v: Video5): string {
  const dir = new URL(`./out/${v.id}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  const sound = v.cues?.length ? mixSound(v, dir) : false;
  writeFileSync(new URL('index.html', dir), buildVideo5(sound ? v : { ...v, cues: undefined }));
  copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
  for (const f of readdirSync(new URL('./assets/', import.meta.url))) copyFileSync(new URL(`./assets/${f}`, import.meta.url), new URL(f, dir));
  return dir.pathname;
}
