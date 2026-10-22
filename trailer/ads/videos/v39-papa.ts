/**
 * Ролик 39 «Папа водит 20 лет» — сценка с викториной для зрителя (`engine7.ts`, `kit7.ts`).
 * Сын проверяет отца двумя настоящими вопросами из билетов (B17-Q01, B40-Q19): у зрителя таймер 3-2-1,
 * отец оба раза ошибается. Инфографика: 95% водителей со стажем не пересдали бы теорию (Direct Line, 2025).
 * Развязка: сын даёт телефон с игрой, ночью отец «ещё одну главу». Музыка и склейки — ролика 34 (7 тыс.).
 */
import { K, SIT, blink, endCard, face, figure, gesture, look, pose, type Video7 } from '../engine7.ts';
import { QUIZ_CSS, Reel, SVG, fgHead, phoneClose, phoneItem, question, quiz } from '../kit7.ts';

// Склейки — по сильным долям трека ролика 34 (шаг 0,825 с).
const S = { hook: 0, dad: 3.3, son: 6.6, q1: 9.067, shock: 14.03, push: 16.0, q2: 18.5, sweat: 23.4, info: 25.933, ask: 30.867, phone: 33.0, night: 36.5, end: 39.133, total: 42.433 };

const D_X = 330;
const S_X = 1000;
const HIP = 1345;
const FLOOR = 1500;

// ─── Вещи ────────────────────────────────────────────────────────────────────

const keys = `<g id="D-keys" transform="rotate(0)" stroke-width="5">
  <circle cx="0" cy="-12" r="13"/><path d="M4,0 L10,38 M8,24 l9,-2 M9,32 l8,-2"/><path d="M-6,-2 L-26,26 M-20,18 l-8,-6"/>
  <rect x="-40" y="22" width="26" height="34" rx="8" fill="${K.head}"/></g>`;

const Q1 = question('B17-Q01');
const Q2 = question('B40-Q19');

// ─── Комната ─────────────────────────────────────────────────────────────────

const clock = (h: number, m: number, id: string, show: boolean) => {
  const a = (deg: number, len: number) => `<path d="M0,0 L${(Math.sin((deg * Math.PI) / 180) * len).toFixed(1)},${(-Math.cos((deg * Math.PI) / 180) * len).toFixed(1)}"/>`;
  return `<g id="${id}" opacity="${show ? 1 : 0}" stroke="#d9d6cf" stroke-linecap="round">${a((h % 12) * 30 + m / 2, 34)}${a(m * 6, 52)}</g>`;
};

const bg = `
  <rect x="-500" y="-300" width="2400" height="${FLOOR + 300}" fill="url(#wallWarm)"/>
  <rect x="-500" y="${FLOOR}" width="2400" height="900" fill="#0c0b0a"/>
  <g stroke="#3d3a37" stroke-width="4">${Array.from({ length: 12 }, (_, i) => `<path d="M${-500 + i * 200},${FLOOR + 10} L${-700 + i * 260},${FLOOR + 420}"/>`).join('')}</g>
  <g>
    <rect x="80" y="560" width="190" height="150" fill="#1a1c22" stroke="#4d4a45" stroke-width="10"/>
    <path d="M95,700 L150,620 L190,670 L215,640 L258,700 Z" fill="#3d4a5c"/><circle cx="225" cy="600" r="14" fill="#c9b48a"/>
  </g>
  <g transform="translate(1000 560)">
    <circle r="70" fill="#1d1c20" stroke="#cfcac0" stroke-width="8"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M0,-58 V-48" stroke="#cfcac0" stroke-width="5" transform="rotate(${i * 90})"/>`).join('')}
    <g stroke-width="7">${clock(19, 40, 'clkDay', true)}${clock(2, 47, 'clkNight', false)}</g>
    <circle r="6" fill="#cfcac0"/>
  </g>
  <g>
    <rect x="440" y="720" width="450" height="270" rx="12" fill="#0b0e14" stroke="#3a3d45" stroke-width="10"/>
    <path d="M470,750 L600,750" stroke="#1d2533" stroke-width="16"/>
    <rect x="410" y="1150" width="510" height="110" rx="8" fill="#211d1a" stroke="#3d3833" stroke-width="6"/>
    <path d="M665,990 V1150" stroke="#3a3d45" stroke-width="10"/>
  </g>
  <g transform="translate(1260 0)">
    <path d="M0,${FLOOR} V860" stroke="#6d665c" stroke-width="10"/><ellipse cx="0" cy="${FLOOR - 4}" rx="60" ry="12" fill="#6d665c"/>
    <path d="M-80,860 L-50,780 H50 L80,860 Z" fill="#e9d7b0" stroke="#bfa979" stroke-width="5"/>
  </g>
  <g transform="translate(-120 ${FLOOR})"><rect x="-50" y="-120" width="100" height="120" fill="#5a3b2e"/>
    ${[-60, -30, 0, 30, 60].map((a) => `<path d="M0,-120 Q${a},-260 ${a * 1.8},-330" stroke="#3c6b49" stroke-width="16" fill="none"/>`).join('')}</g>`;

/** Кресло: спинка за человечком, подушка под ним, подлокотник спереди. */
const armchair = (x: number, f: 1 | -1) => {
  const bx = f === 1 ? x - 118 : x + 48;
  const sx = f === 1 ? x - 80 : x - 120;
  return `<g stroke="${K.line}" stroke-width="6" stroke-linejoin="round">
    <rect x="${bx}" y="1040" width="70" height="400" rx="32" fill="#4b3832"/>
    <rect x="${sx}" y="1354" width="200" height="86" rx="20" fill="#5a4239"/>
    <path d="M${sx + 14},1440 V${FLOOR - 8} M${sx + 186},1440 V${FLOOR - 8}" stroke-width="8"/>
  </g>`;
};

const D = figure('D', { x: D_X, y: HIP, f: 1, pose: pose({ tor: -8, ua1: -40, fa1: -110, ua2: -20, fa2: -60 }), mustache: true, items1: keys + phoneItem('D-ph', false) });
const SON = figure('S', { x: S_X, y: HIP, f: -1, pose: pose({ tor: -4, ua1: -30, fa1: -118 }), hair: true, items1: phoneItem('S-ph', true) });

const fgScene = `
  ${armchair(D_X, 1)}${armchair(S_X, -1)}
  <g stroke="${K.line}" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M520,1392 H810" stroke-width="10"/><path d="M540,1406 H790" stroke="#8a8a88" stroke-width="5"/>
    <path d="M556,1406 V${FLOOR}"/><path d="M774,1406 V${FLOOR}"/>
    <path d="M-400,${FLOOR} H1800" stroke-width="5"/>
  </g>
  <g transform="translate(745 1392)"><path d="M-22,-48 H22 L18,0 H-18 Z" fill="#c9533f" stroke="${K.line}" stroke-width="5"/><path d="M22,-38 q18,4 0,22" stroke="${K.line}" stroke-width="5" fill="none"/></g>
  <rect x="585" y="1374" width="90" height="18" rx="8" fill="#22252b" stroke="${K.line}" stroke-width="4"/>
  ${D}${SON}`;

const glow = `<ellipse cx="1260" cy="900" rx="520" ry="560" fill="url(#lampGlow)"/><ellipse cx="665" cy="1150" rx="520" ry="380" fill="url(#lampGlow)" opacity="0.6"/>`;
const phoneLight = `<ellipse id="plight" cx="420" cy="1040" rx="240" ry="260" fill="url(#phoneGlow)"/>`;

// ─── Викторины, телефон, инфографика ────────────────────────────────────────

/** Мини-портрет папы для отметки «его» ответа: голова, очки, усы. */
const dadFace = `<circle cx="50" cy="50" r="44" fill="${K.head}"/><path d="M14,40 H86" stroke="#fff" stroke-width="5"/>
  <path d="M18,40 H46 Q44,58 32,58 Q20,58 18,40 Z M54,40 H82 Q80,58 68,58 Q56,58 54,40 Z" fill="#333" stroke="#fff" stroke-width="4"/>
  <path d="M28,72 Q39,62 50,68 Q61,62 72,72 Q61,70 50,75 Q39,70 28,72 Z" fill="#fff"/>`;

const HINT = 'Успей раньше папы — свой ответ пиши в комменты';
const quiz1 = quiz({ id: 'qa', q: Q1, n: 1, pick: 2, who: 'ПАПА', avatar: dadFace, t0: S.q1, count: 9.9, step: 0.7, reveal: 12.45, t1: S.shock, score: 'ПАПА 0 : 1 БИЛЕТ', hint: HINT });
const quiz2 = quiz({ id: 'qb', q: Q2, n: 2, pick: 1, who: 'ПАПА', avatar: dadFace, t0: S.q2, count: 19.1, step: 0.6, reveal: 21.05, t1: S.sweat, score: 'ПАПА 0 : 2 БИЛЕТ', hint: HINT });
const phone = phoneClose('pz', Q1, S.phone, S.night);

const person = (i: number) => {
  const x = 140 + (i % 5) * 200;
  const y = 760 + Math.floor(i / 5) * 150;
  return `<g id="p${i}" transform="translate(${x} ${y})" stroke-linecap="round">
    <circle cx="0" cy="-36" r="22" fill="${K.head}" stroke="${K.line}" stroke-width="6"/><path d="M0,-14 V30 M0,30 l-18,34 M0,30 l18,34 M0,0 l-22,22 M0,0 l22,22" stroke="${K.line}" stroke-width="7" fill="none"/>
    <g id="px${i}" opacity="0"><circle cx="34" cy="-44" r="20" fill="${i === 19 ? K.green : '#ff4a4a'}"/><text x="34" y="-35" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="26" fill="#fff">${i === 19 ? '✓' : '✕'}</text></g></g>`;
};
const info = `<div class="clip scene" id="info" data-start="${S.info}" data-duration="${(S.ask - S.info).toFixed(3)}" style="background:transparent">
  <div class="ihead" id="ih" style="top:470px">ВОДИТЕЛЕЙ СО СТАЖЕМ<br><span style="color:${K.accent}">ЗАСТАВИЛИ ПЕРЕСДАТЬ ТЕОРИЮ</span></div>
  <svg viewBox="0 0 1080 1920" width="1080" height="1920" class="layer">${Array.from({ length: 20 }, (_, i) => person(i)).join('')}</svg>
  <div class="ihead" id="ibig" style="top:1340px;font-size:120px;font-weight:900;letter-spacing:0;color:${K.accent};line-height:1">95%</div>
  <div class="ihead" id="ibig2" style="top:1480px;font-size:46px;font-weight:900">НЕ СДАЛИ</div>
  <div class="src" id="isrc">Direct Line, 2025: 2 000 водителей,<br>15 вопросов теории, Великобритания</div>
</div>`;

// ─── Подписи ─────────────────────────────────────────────────────────────────

const CAPS: [number, number, string][] = [
  [S.hook, S.dad, '«Пап, ты 20 лет за рулём. Теорию сдашь?»'],
  [S.dad, S.son, '«С закрытыми глазами»'],
  [S.son, S.q1, '«Тогда вопрос. Из настоящего билета»'],
  [S.shock, S.push, '«Обочина — часть дороги?!»'],
  [S.push, S.q2, '«Это вопрос с подвохом. Давай ещё»'],
  [S.sweat, S.info, '«Я двадцать лет так езжу!»'],
  [S.info, S.ask, '«Пап, ты не один такой»'],
  [S.ask, S.phone, '«…Ладно. А ты как готовился?»'],
  [S.phone, S.night, '«Играл. Там билеты — прямо на перекрёстках»'],
  [S.night, 37.8, '«Пап, третий час ночи…»'],
  [37.8, S.end, '«Ещё одну главу!»'],
];
const caps = CAPS.map(([a, b, t], i) => `<div class="clip cap7" id="cap${i}" data-start="${a}" data-duration="${(b - a).toFixed(3)}">${t}</div>`).join('\n      ');

// ─── Кадры ───────────────────────────────────────────────────────────────────

const r = new Reel();
r.start('D', pose({ tor: -8, ua1: -40, fa1: -110, ua2: -20, fa2: -60 }));
r.start('S', pose({ tor: -4, ua1: -30, fa1: -118 }));

// 0. Общий план: папа крутит ключи, сын с телефоном.
r.shot(S.hook, S.dad, 665, 950, 1.08, 1.04, 3);
r.add(face('D', 'smirk', 0), look('D', 1, 0, 0), face('S', 'smile', 0), look('S', 1, 0, 0));
r.add(`tl.to('#D-keys', { attr: { transform: 'rotate(45)' }, duration: 0.22, yoyo: true, repeat: 13, ease: 'sine.inOut' }, 0.1);`);
r.add(gesture('S', 2, -66, -20, 0.5, 2, 0.3));

// 1. Папа крупно: «С закрытыми глазами» — надевает очки.
r.shot(S.dad, S.son, 360, 1075, 1.75, 1.05);
r.pose('D', { tor: -12, ua1: -30, fa1: -72, hd: -4 }, S.dad);
r.add(face('D', 'smirk', S.dad), look('D', 1, 0, S.dad), face('D', 'grin', 4.2));
r.add(`tl.fromTo('#D-shades', { opacity: 0, attr: { transform: 'translate(0 -120)' } }, { opacity: 1, attr: { transform: 'translate(0 0)' }, duration: 0.3, ease: 'back.out(1.5)' }, 3.8);`);
r.sound(3.8, 'whoosh');
r.sound(4.12, 'pop');

// 2. Сын через плечо: «Тогда вопрос. Из настоящего билета».
r.shot(S.son, S.q1, 965, 1080, 1.75, 1.04);
r.fg('fgD', S.son, S.q1);
r.add(`tl.set('#D-keys', { opacity: 0 }, ${S.son});`);
r.pose('S', { tor: 2, ua1: -40, fa1: -124 }, S.son);
r.add(face('S', 'smirk', S.son), look('S', 1, 0, S.son));
r.pose('S', { ua1: -48, fa1: -120 }, S.son + 0.3, 0.3, 'back.out(1.6)');

// 3–4. Викторина 1.
r.dim(S.q1, S.shock);
r.add(...quiz1.tweens);
quiz1.sfx.forEach(([t, k]) => r.sound(t, k));

// 5. Папа крупно: шок, очки сползают.
r.shot(S.shock, S.push, 345, 1060, 2.0, 1.08, 6);
r.pose('D', { tor: -16, ua1: -28, fa1: -64, hd: 0 }, S.shock);
r.add(face('D', 'shock', S.shock), look('D', 0, 0, S.shock));
r.add(`tl.to('#D-shades', { attr: { transform: 'translate(0 22)' }, duration: 0.3, ease: 'power2.in' }, ${S.shock + 0.15});`);
r.sound(S.shock + 0.15, 'pop');

// 6. Папа поправляет очки: «Вопрос с подвохом. Давай ещё».
r.shot(S.push, S.q2, 370, 1080, 1.75, 1.04);
r.fg('fgS', S.push, S.q2);
r.pose('D', { tor: -6, ua1: -16, fa1: -150 }, S.push + 0.05, 0.2);
r.add(`tl.to('#D-shades', { attr: { transform: 'translate(0 0)' }, duration: 0.18 }, ${S.push + 0.25});`);
r.add(face('D', 'doubt', S.push), look('D', 1, 0, S.push));
r.pose('D', { ua1: -30, fa1: -70 }, S.push + 0.7, 0.3);
r.add(gesture('D', 1, -70, -24, S.push + 1.0, 2, 0.28));

// 7–8. Викторина 2.
r.dim(S.q2, S.sweat);
r.add(...quiz2.tweens);
quiz2.sfx.forEach(([t, k]) => r.sound(t, k));

// 9. Папа: «Я двадцать лет так езжу!» — очки слетают, капля пота.
r.shot(S.sweat, S.info, 345, 1065, 1.9, 1.05, 6);
r.pose('D', { tor: -4, ua1: -62, fa1: -96, ua2: -50, fa2: -100 }, S.sweat);
r.add(face('D', 'sad', S.sweat), look('D', 1, 0, S.sweat));
r.add(`tl.to('#D-shades', { opacity: 0, attr: { transform: 'translate(70 -200) rotate(30)' }, duration: 0.4, ease: 'power2.out' }, ${S.sweat + 0.2});`);
r.add(`tl.fromTo('#D-sweat', { opacity: 1, attr: { transform: 'translate(0 0)' } }, { attr: { transform: 'translate(0 40)' }, duration: 1.8, ease: 'power1.in', immediateRender: false }, ${S.sweat + 0.5});`);
r.add(gesture('D', 1, -96, -18, S.sweat + 0.4, 3, 0.25));
r.sound(S.sweat + 0.2, 'whoosh');

// 10. Инфографика: 19 из 20 не сдали.
r.dim(S.info, S.ask);
r.add(`tl.set('#D-sweat', { opacity: 0 }, ${S.ask});`);
r.add(`tl.fromTo('#ih', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${S.info + 0.15});`);
for (let i = 0; i < 20; i++) r.add(`tl.fromTo('#p${i}', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.15, ease: 'back.out(2)' }, ${(S.info + 0.35 + i * 0.03).toFixed(3)});`);
for (let i = 0; i < 20; i++) {
  const t = S.info + 1.25 + i * 0.075;
  r.add(`tl.fromTo('#px${i}', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.12, ease: 'back.out(2)' }, ${t.toFixed(3)});`);
  if (i < 19) r.add(`tl.to('#p${i}', { opacity: 0.45, duration: 0.2 }, ${(t + 0.05).toFixed(3)});`);
  r.sound(t, i < 19 ? 'tick' : 'ding');
}
r.add(`tl.fromTo('#ibig', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${(S.info + 2.95).toFixed(3)});`);
r.add(`tl.fromTo('#ibig2', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${(S.info + 3.15).toFixed(3)});`);
r.add(`tl.fromTo('#isrc', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${(S.info + 0.4).toFixed(3)});`);
r.sound(S.info, 'whoosh');
r.sound(S.info + 2.95, 'boom');

// 11. Общий: «Ладно. А ты как готовился?» — сын передаёт телефон.
r.shot(S.ask, S.phone, 665, 950, 1.12, 1.03, 3);
r.pose('D', { ...SIT, tor: -2 }, S.ask);
r.pose('S', { tor: -4, ua1: -30, fa1: -118 }, S.ask);
r.add(face('D', 'think', S.ask), look('D', 1, 0, S.ask), face('S', 'smile', S.ask), look('S', 1, 0, S.ask));
r.pose('S', { tor: 16, ua1: -80, fa1: -10 }, S.ask + 0.35, 0.35);
r.pose('D', { tor: 16, ua1: -78, fa1: -12 }, S.ask + 0.5, 0.35);
r.add(`tl.set('#S-ph', { opacity: 0 }, ${(S.ask + 0.95).toFixed(3)}); tl.set('#D-ph', { opacity: 1 }, ${(S.ask + 0.95).toFixed(3)});`);
r.sound(S.ask + 0.95, 'pop');
r.pose('D', { tor: -6, ua1: -32, fa1: -116 }, S.ask + 1.05, 0.4);
r.pose('S', { tor: -4, ua1: -28, fa1: -62 }, S.ask + 1.05, 0.4);
r.add(face('D', 'smile', S.ask + 1.2), look('D', 0.6, 0.6, S.ask + 1.3, 0.1));

// 12. Телефон крупно.
r.dim(S.phone, S.night);
r.add(...phone.tweens);
phone.sfx.forEach(([t, k]) => r.sound(t, k));

// 13. Ночь: папа с телефоном, сын засыпает.
r.shot(S.night, S.end, 665, 960, 1.12, 1.04, 3);
r.add(`tl.set('#night', { opacity: 1 }, ${S.night}); tl.set('#plight', { opacity: 1 }, ${S.night}); tl.set('#clkDay', { opacity: 0 }, ${S.night}); tl.set('#clkNight', { opacity: 1 }, ${S.night});`);
r.add(`tl.to('#plight', { opacity: 0.7, duration: 0.5, yoyo: true, repeat: 4, ease: 'sine.inOut' }, ${S.night + 0.1});`);
r.pose('D', { tor: -10, ua1: -24, fa1: -128, hd: 4 }, S.night);
r.pose('S', { ...SIT, tor: -10, hd: 14 }, S.night);
r.add(face('D', 'grin', S.night), look('D', 0.7, 0.5, S.night), face('S', 'tired', S.night), look('S', 1, 0.3, S.night));
r.add(face('D', 'grin', 37.8), look('D', 1, 0, 37.8));
r.pose('D', { hd: -6 }, 37.8, 0.2);
r.sound(S.night, 'whoosh');

// Моргания.
for (const t of [1.2, 5.4, 8.2, 17.4, 24.6, 32.2]) r.add(blink('D', t));
for (const t of [2.3, 7.4, 16.8, 31.6, 34.0]) r.add(blink('S', t));

const end = endCard(S.end, S.total, 'Курьер ПДД — ссылка в био');
r.sound(S.end, 'pop');

const html = `
      <div class="clip scene" id="world" data-start="0" data-duration="${S.end.toFixed(3)}" style="background:#141317">
        <div class="cam" id="cam">
          <div class="layer" id="bgL" style="filter:blur(3px)">${SVG(bg)}</div>
          ${SVG(fgScene)}
          ${SVG(glow, 'style="mix-blend-mode:screen"')}
          <div class="layer" id="night" style="width:2400px;height:2400px;left:-600px;top:-200px;background:rgba(4,8,24,0.78);opacity:0"></div>
          ${SVG(phoneLight, 'style="mix-blend-mode:screen;opacity:1" id="plightL"')}
        </div>
        ${fgHead('fgD', 'l')}${fgHead('fgS', 'r')}
      </div>
      ${quiz1.html}
      ${quiz2.html}
      ${info}
      ${phone.html}
      ${caps}
      <div id="redflash"></div>
      ${end.html}`;

export const v39: Video7 = {
  id: '39-papa',
  title: 'Реклама: папа водит 20 лет',
  css: QUIZ_CSS,
  html,
  tweens: [`tl.set('#plight', { opacity: 0 }, 0);`, ...r.tw, end.tweens].join('\n      '),
  end: S.total,
  sfx: r.sfx,
};
