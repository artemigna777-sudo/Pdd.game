/**
 * Общие части роликов-сценок (`engine7.ts`): слой SVG сцены, «передний» размытый человечек, кисти-перчатки,
 * экран игры в телефоне, викторина с таймером и раскладка кадров (камера, затемнение, позы).
 */
import { readFileSync } from 'node:fs';
import { K, camAt, toPose, type Pose } from './engine7.ts';
import type { Sfx } from './sfx.ts';

export const defs7 = `<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16171c"/><stop offset="1" stop-color="#101114"/></linearGradient>
  <linearGradient id="wallWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1a1f"/><stop offset="1" stop-color="#131215"/></linearGradient>
  <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffcf87" stop-opacity="0.34"/><stop offset="0.5" stop-color="#ffb35c" stop-opacity="0.12"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
  <radialGradient id="winGlow"><stop offset="0" stop-color="#5c7bb5" stop-opacity="0.16"/><stop offset="1" stop-color="#5c7bb5" stop-opacity="0"/></radialGradient>
  <radialGradient id="phoneGlow"><stop offset="0" stop-color="#8fd3ff" stop-opacity="0.55"/><stop offset="0.45" stop-color="#5aa8ff" stop-opacity="0.18"/><stop offset="1" stop-color="#5aa8ff" stop-opacity="0"/></radialGradient>
</defs>`;

export const SVG = (body: string, extra = '') =>
  `<svg viewBox="0 0 1080 1920" width="1080" height="1920" overflow="visible" class="layer" ${extra}>${defs7}${body}</svg>`;

/** Передний размытый человечек («через плечо»): голова и плечо у края кадра. */
export const fgHead = (id: string, side: 'l' | 'r') => {
  const x = side === 'l' ? -330 : 610;
  return `<div class="fg" id="${id}" style="left:${x}px;top:1180px;width:800px;height:1000px;opacity:0">
    <svg viewBox="0 0 800 1000" width="800" height="1000"><circle cx="400" cy="330" r="260" fill="#26272c" stroke="#3a3b41" stroke-width="14"/>
    <path d="M40,1000 Q80,640 400,610 Q720,640 760,1000 Z" fill="#202126"/></svg></div>`;
};

/** Кисть-перчатка (вид сверху): ладонь, пальцы, рука уходит за кадр под углом `rot`. */
export const mitten = (x: number, y: number, rot: number, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="#111" stroke-width="6" stroke-linejoin="round">
  <path d="M-30,40 L-38,700 H38 L30,40" fill="${K.line}"/>
  ${[-42, -16, 10, 36].map((fx, i) => `<rect x="${fx - 12}" y="${-70 + Math.abs(i - 1.5) * 10}" width="26" height="70" rx="13" fill="${K.line}"/>`).join('')}
  <ellipse cx="0" cy="10" rx="56" ry="52" fill="${K.line}"/>
  <rect x="44" y="-6" width="24" height="56" rx="12" transform="rotate(-35 56 22)" fill="${K.line}"/>
</g>`;

/** Телефон в руке человечка экраном к себе (вариант прячется прозрачностью). */
export const phoneItem = (id: string, show: boolean) => `<g id="${id}" opacity="${show ? 1 : 0}">
  <rect x="-25" y="-92" width="50" height="96" rx="10" fill="${K.head}" stroke="${K.line}" stroke-width="5"/>
  <rect x="-17" y="-82" width="34" height="76" rx="5" fill="#2a3b52" stroke="none"/>
</g>`;

// ─── Вопросы из базы ─────────────────────────────────────────────────────────

export interface Q {
  id: string;
  ticket: number;
  number: number;
  text: string;
  options: string[];
  correct: number;
}
const BASE = JSON.parse(readFileSync(new URL('../../data/questions.json', import.meta.url), 'utf8')) as Q[];
/** Вопрос из `data/questions.json` без изменений (правило 1). */
export const question = (id: string): Q => {
  const q = BASE.find((x) => x.id === id);
  if (!q) throw new Error(`нет вопроса ${id}`);
  return q;
};

// ─── Экран игры в телефоне ───────────────────────────────────────────────────

const map = (car: string) => `<svg viewBox="0 0 540 560" width="540" height="560" style="display:block">
  <rect width="540" height="560" fill="#3f8a4a"/>
  ${[[30, 30], [330, 30], [30, 340], [330, 340]].map(([x, y]) => `<rect x="${x}" y="${y}" width="180" height="190" rx="14" fill="#5c9a5f"/><rect x="${x + 30}" y="${y + 30}" width="120" height="120" rx="8" fill="#c9b79a"/>`).join('')}
  <rect x="0" y="240" width="540" height="80" fill="#3b4049"/><rect x="230" y="0" width="80" height="560" fill="#3b4049"/>
  <g fill="#f4f4f4">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 80 + 10}" y="277" width="40" height="6" rx="3"/>`).join('')}${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="267" y="${i * 80 + 10}" width="6" height="40" rx="3"/>`).join('')}</g>
  <g id="${car}-poi" transform="translate(270 280)"><circle r="34" fill="#ffd166" stroke="#1d3557" stroke-width="6"/><text y="13" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="38" fill="#1d3557">?</text></g>
  <g id="${car}" transform="translate(290 520)"><rect x="-22" y="-40" width="44" height="80" rx="14" fill="#ffb703" stroke="#7a5200" stroke-width="3"/><rect x="-16" y="-24" width="32" height="14" rx="4" fill="#1d3557"/><rect x="-17" y="6" width="34" height="22" rx="5" fill="#ffd166"/></g>
</svg>`;

const card = (id: string, q: Q, chapter: string) => `<div id="${id}" style="position:absolute;left:0;right:0;bottom:0;height:600px;background:#151b26;border-radius:34px 34px 0 0;padding:30px 28px;border-top:3px solid #2b3446">
  <div style="font-size:21px;font-weight:700;color:#8b93a3;letter-spacing:1px">БИЛЕТ ${q.ticket} · ВОПРОС ${q.number} · ${chapter}</div>
  <div style="margin-top:14px;font-size:29px;font-weight:700;line-height:1.28">${q.text}</div>
  ${q.options.map((o, i) => `<div id="${id}-o${i}" style="margin-top:${i ? 14 : 26}px;padding:20px 22px;border-radius:16px;background:#1f2735;border:3px solid #2e3a4f;font-size:26px;font-weight:700">${i + 1}. ${o}</div>`).join('')}
  <div id="${id}-ok" style="position:absolute;left:28px;right:28px;top:-86px;padding:16px 0;border-radius:18px;background:${K.green};color:#06240f;text-align:center;font-size:30px;font-weight:900;opacity:0">Верно! +10 опыта</div>
</div>`;

/** Экран игры: карта главы, машина у перекрёстка, вопрос из билета снизу. */
export const gameScreen = (id: string, q: Q) => `<div style="position:absolute;inset:0;background:#0f141d;overflow:hidden;font-family:Montserrat;color:#fff">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:56px 26px 18px;font-size:21px;font-weight:700;color:#aeb6c4">
    <span>Глава 1 · Учебный городок</span><span style="padding:5px 12px;border:2px solid ${K.accent};border-radius:20px;color:${K.accent}">Повторы: 3</span></div>
  ${map(`${id}-car`)}
  ${card(`${id}-q`, q, 'НА ПЕРЕКРЁСТКЕ')}
</div>`;

/** Телефон крупно в руке (кадр [t0, t1]): машина едет к «?», выезжает вопрос, верный ответ зелёный. */
export function phoneClose(id: string, q: Q, t0: number, t1: number): { html: string; tweens: string[]; sfx: [number, Sfx][] } {
  const html = `<div class="clip scene" id="${id}" data-start="${t0}" data-duration="${(t1 - t0).toFixed(3)}">
  <div id="${id}-ph" style="position:absolute;left:250px;top:560px;width:580px;height:1180px;border:9px solid ${K.line};border-radius:74px;background:#000;padding:14px;box-shadow:0 0 120px rgba(90,140,255,0.18)">
    <div style="position:relative;width:100%;height:100%;border-radius:58px;overflow:hidden">${gameScreen(`${id}s`, q)}</div>
    <div style="position:absolute;left:50%;top:22px;width:130px;height:30px;margin-left:-65px;border-radius:15px;background:#000"></div>
  </div>
  <svg viewBox="0 0 1080 1920" width="1080" height="1920" class="layer" style="pointer-events:none">
    <g fill="${K.head}" stroke="${K.line}" stroke-width="8" stroke-linejoin="round">
      ${[0, 1, 2, 3].map((i) => `<rect x="196" y="${1300 + i * 92}" width="96" height="70" rx="35"/>`).join('')}
      <path d="M820,1560 Q860,1520 900,1560 L960,1700 Q990,1800 1000,1960 H700 Q760,1760 820,1560 Z"/>
      <rect x="770" y="1470" width="70" height="130" rx="35" transform="rotate(28 805 1535)"/>
    </g>
  </svg>
</div>`;
  const s = `${id}s`;
  const tReveal = t1 - 1.05;
  const tweens = [
    `tl.set('#${s}-q', { y: 640 }, 0);`,
    `tl.fromTo('#${id}-ph', { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }, ${t0.toFixed(3)});`,
    `tl.fromTo('#${s}-car', { attr: { transform: 'translate(290 520)' } }, { attr: { transform: 'translate(290 336)' }, duration: 0.9, ease: 'power1.inOut' }, ${(t0 + 0.2).toFixed(3)});`,
    `tl.to('#${s}-car-poi', { attr: { transform: 'translate(270 280) scale(1.25)' }, duration: 0.22, yoyo: true, repeat: 3 }, ${(t0 + 0.2).toFixed(3)});`,
    `tl.fromTo('#${s}-q', { y: 640 }, { y: 0, duration: 0.4, ease: 'power3.out' }, ${(t0 + 1.15).toFixed(3)});`,
    `tl.set('#${s}-q-o${q.correct}', { background: '${K.green}', borderColor: '${K.green}', color: '#06240f' }, ${tReveal.toFixed(3)});`,
    `tl.fromTo('#${s}-q-ok', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, ${(tReveal + 0.1).toFixed(3)});`,
  ];
  return { html, tweens, sfx: [[t0, 'whoosh'], [t0 + 1.15, 'pop'], [tReveal, 'ding']] };
}

// ─── Викторина для зрителя: вопрос, таймер 3-2-1, ответ ─────────────────────

export interface QuizOpts {
  id: string;
  q: Q;
  /** Номер вопроса в ролике. */
  n: number;
  /** Что выбрал герой (индекс варианта), его подпись и мини-портрет (SVG 0…100). */
  pick: number;
  who: string;
  avatar: string;
  /** Появление, начало отсчёта (3 щелчка через `step`), ответ, конец показа. */
  t0: number;
  count: number;
  step: number;
  reveal: number;
  t1: number;
  /** Счёт после ответа (HTML) и подсказка под карточкой. */
  score: string;
  hint: string;
}

export const QUIZ_CSS = `
      .quiz { position: absolute; left: 50px; right: 50px; top: 300px; padding: 40px 38px 34px; border-radius: 34px; background: rgba(14,17,24,0.94); border: 3px solid #2c3446;
        box-shadow: 0 30px 90px rgba(0,0,0,0.6); color: #fff; }
      .quiz .qh { display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 800; letter-spacing: 1.5px; color: #8b93a3; }
      .quiz .qh b { color: ${K.accent}; }
      .quiz .qt { margin-top: 22px; font-size: 44px; font-weight: 800; line-height: 1.22; }
      .quiz .qo { position: relative; margin-top: 18px; padding: 24px 26px; border-radius: 20px; background: #1d2433; border: 3px solid #2f3a50; font-size: 34px; font-weight: 700; line-height: 1.2; }
      .quiz .qo .mk { position: absolute; right: 18px; top: 50%; margin-top: -30px; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-size: 36px; font-weight: 900; opacity: 0; }
      .quiz .who { position: absolute; right: 90px; top: 50%; margin-top: -32px; display: flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border-radius: 40px; background: #fff; color: #111;
        font-size: 22px; font-weight: 900; letter-spacing: 1px; opacity: 0; }
      .quiz .ring { margin-left: auto; position: relative; width: 92px; height: 92px; }
      .quiz .ring span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 46px; font-weight: 900; color: #fff; opacity: 0; }
      .qhint { position: absolute; left: 60px; right: 60px; text-align: center; font-size: 32px; font-weight: 700; color: #c9ccd4; }
      .score { position: absolute; left: 50%; top: 200px; transform: translateX(-50%); padding: 14px 30px; border-radius: 40px; background: #fff; color: #111; font-size: 34px; font-weight: 900;
        letter-spacing: 1px; white-space: nowrap; opacity: 0; }
      #redflash { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(70% 60% at 50% 50%, rgba(255,40,40,0) 40%, rgba(255,40,40,0.55) 100%); }`;

export function quiz(o: QuizOpts): { html: string; tweens: string[]; sfx: [number, Sfx][] } {
  const id = o.id;
  const C = 2 * Math.PI * 38;
  const html = `<div class="clip scene" id="${id}" data-start="${o.t0}" data-duration="${(o.t1 - o.t0).toFixed(3)}" style="background:transparent">
  <div class="score" id="${id}-score">${o.score}</div>
  <div class="quiz" id="${id}-card">
    <div class="qh">ВОПРОС <b>${o.n}</b> · БИЛЕТ ${o.q.ticket}
      <div class="ring"><svg viewBox="0 0 92 92" width="92" height="92"><circle cx="46" cy="46" r="38" fill="none" stroke="#2c3446" stroke-width="8"/>
        <circle id="${id}-arc" cx="46" cy="46" r="38" fill="none" stroke="${K.accent}" stroke-width="8" stroke-linecap="round" transform="rotate(-90 46 46)" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg>
        ${[3, 2, 1].map((d) => `<span id="${id}-d${d}">${d}</span>`).join('')}<span id="${id}-dq" style="opacity:1">?</span></div>
    </div>
    <div class="qt">${o.q.text}</div>
    ${o.q.options
      .map(
        (op, i) => `<div class="qo" id="${id}-o${i}">${i + 1}. ${op}
      <div class="mk" id="${id}-m${i}" style="background:${i === o.q.correct ? K.green : '#ff4a4a'};color:#fff">${i === o.q.correct ? '✓' : '✕'}</div>
      ${i === o.pick ? `<div class="who" id="${id}-who"><svg viewBox="0 0 100 100" width="52" height="52">${o.avatar}</svg>${o.who}</div>` : ''}</div>`,
      )
      .join('')}
  </div>
  <div class="qhint" id="${id}-hint" style="top:1640px">${o.hint}</div>
</div>`;
  const T = (t: number) => t.toFixed(3);
  const tw = [
    `tl.fromTo('#${id}-card', { y: 120, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, ${T(o.t0)});`,
    ...o.q.options.map((_, i) => `tl.fromTo('#${id}-o${i}', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' }, ${T(o.t0 + 0.35 + i * 0.12)});`),
    `tl.fromTo('#${id}-hint', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${T(o.t0 + 0.6)});`,
    `tl.set('#${id}-dq', { opacity: 0 }, ${T(o.count)});`,
    `tl.to('#${id}-arc', { attr: { 'stroke-dashoffset': ${C.toFixed(1)} }, duration: ${(o.step * 3).toFixed(3)}, ease: 'none' }, ${T(o.count)});`,
    ...[3, 2, 1].map((d, i) => `tl.fromTo('#${id}-d${d}', { opacity: 1, scale: 1.5 }, { scale: 1, duration: 0.2, ease: 'power2.out' }, ${T(o.count + i * o.step)}); tl.set('#${id}-d${d}', { opacity: 0 }, ${T(o.count + (i + 1) * o.step)});`),
    // Ответ героя: красный, тряска, красная рамка; потом верный — зелёный.
    `tl.fromTo('#${id}-who', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'back.out(2)' }, ${T(o.reveal - 0.35)});`,
    `tl.set('#${id}-o${o.pick}', { background: '#5a1d22', borderColor: '#ff4a4a' }, ${T(o.reveal)});`,
    `tl.fromTo('#${id}-m${o.pick}', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'back.out(2)' }, ${T(o.reveal)});`,
    `tl.to('#${id}-card', { x: 14, duration: 0.04, yoyo: true, repeat: 7, ease: 'none' }, ${T(o.reveal)}); tl.set('#${id}-card', { x: 0 }, ${T(o.reveal + 0.33)});`,
    `tl.fromTo('#redflash', { opacity: 0.9 }, { opacity: 0, duration: 0.5, immediateRender: false }, ${T(o.reveal)});`,
    `tl.set('#${id}-o${o.q.correct}', { background: '#145a2c', borderColor: '${K.green}' }, ${T(o.reveal + 0.45)});`,
    `tl.fromTo('#${id}-m${o.q.correct}', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, ${T(o.reveal + 0.45)});`,
    `tl.fromTo('#${id}-score', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, ${T(o.reveal + 0.95)});`,
  ];
  const sfx: [number, Sfx][] = [[o.t0, 'whoosh'], ...[0, 1, 2].map((i): [number, Sfx] => [o.count + i * o.step, 'tick']), [o.reveal - 0.35, 'pop'], [o.reveal, 'buzz'], [o.reveal + 0.45, 'ding'], [o.reveal + 0.95, 'pop']];
  return { html, tweens: tw, sfx };
}

// ─── Раскладка кадров ────────────────────────────────────────────────────────

/** Кадры, позы и звуки ролика: всё складывается в один список твинов и один список звуков. */
export class Reel {
  readonly tw: string[] = [];
  readonly sfx: [number, Sfx][] = [];
  private poses = new Map<string, Pose>();

  add(...s: string[]): void {
    this.tw.push(...s);
  }

  /** Кадр: камера (центр, масштаб), наезд к концу кадра, размытие фона. */
  shot(t0: number, t1: number, fx: number, fy: number, s: number, push = 1.04, blur = 5): void {
    this.add(`tl.set('#cam', ${JSON.stringify(camAt(fx, fy, s))}, ${t0.toFixed(3)});`);
    this.add(`tl.to('#cam', { ...${JSON.stringify(camAt(fx, fy, s * push))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0.toFixed(3)});`);
    this.add(`tl.set('#bgL', { filter: 'blur(${blur}px)' }, ${t0.toFixed(3)});`);
  }

  /** Передний размытый человечек виден в [t0, t1). */
  fg(id: string, t0: number, t1: number): void {
    this.add(`tl.set('#${id}', { opacity: 1 }, ${t0.toFixed(3)}); tl.set('#${id}', { opacity: 0 }, ${t1.toFixed(3)});`);
  }

  /** Сцена темнеет и размывается под инфографику или викторину. */
  dim(t0: number, t1: number): void {
    this.add(`tl.to('#world', { filter: 'blur(14px) brightness(0.32)', duration: 0.3 }, ${t0.toFixed(3)}); tl.set('#world', { filter: 'blur(0px) brightness(1)' }, ${t1.toFixed(3)});`);
  }

  /** Начальная поза человечка (как в `figure`). */
  start(id: string, p: Pose): void {
    this.poses.set(id, p);
  }

  /** Поза человечка: сразу (d = 0) или плавно. */
  pose(id: string, p: Partial<Pose>, t: number, d = 0, ease?: string): void {
    const r = toPose(id, p, this.poses.get(id) as Pose, t, d, ease);
    this.poses.set(id, r.pose);
    this.add(r.tw);
  }

  sound(t: number, kind: Sfx): void {
    this.sfx.push([t, kind]);
  }
}
