/**
 * 36. «Он сдавал теорию 139 раз» — по формуле cwex (`engine6.ts`), как ролик 34 (лучший результат — 2,8 тыс.):
 * реальная история провала на теории → притча на гравюре → расчёт → итог → вывод.
 *
 * История (Radio Kraków, Bezprawnik, TVN, март 2026): кандидат из Тарнува (Польша) сдал теоретический экзамен на
 * категорию B с 139-й попытки, пытался девять лет — с 2017 года. По словам директора MORD в Тарнуве, он учился по
 * демо-версии тестов, где есть не все вопросы экзамена. Впереди — практический экзамен.
 * Притча — «Слепые и слон» (индийская; в пересказе Дж. Сакса: хобот — змея, ухо — веер, нога — дерево,
 * хвост — верёвка). Расчёт: в билетах ГИБДД 800 вопросов, на экзамене 20; выучил 600 (75%) — шанс, что все 20
 * окажутся знакомыми, 0,75^20 ≈ 0,3%. Источники — README.
 */
import { chair, desk, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { fig, ground, sh, sky, cloud } from '../etch.ts';
import { etree } from '../etch2.ts';
import { text } from '../kit.ts';

const N = C.night;

// ─── Завязка: светящиеся человечки ────────────────────────────────────────────

const student = person(DLG, { id: 'S', x: 300, floor: 1400, pose: 'sit', seat: 110, f: 1, arms: ['table', 'table'], table: 1250, hair: 'spiky', face: 'tired' });
const exam = `
  ${floorLine(1400)}
  ${chair(300, 1400, 1, 110)}
  ${desk(420, 880, 1250, 1400)}
  <path d="M650,1250 V1172 M596,1250 H704"/>
  <rect x="490" y="950" width="320" height="222" rx="16" fill="${N}"/>
  <path d="M618,990 l64,64 M682,990 l-64,64" stroke="${C.accent}" stroke-width="12"/>${text(650, 1130, 34, '#fff', 'НЕ СДАНО', 'letter-spacing="2"')}
  ${student.svg}`;

/** Дома за ноутбуком: на экране — «ДЕМО». */
const learner = person(DLG, { id: 'H', x: 330, floor: 1450, pose: 'sit', seat: 110, f: 1, arms: ['table', 'chin'], table: 1290, hair: 'spiky', face: 'think' });
const home = `
  ${floorLine(1450)}
  ${chair(330, 1450, 1, 110)}
  ${desk(440, 900, 1290, 1450)}
  <path d="M560,1290 L600,1120 H830 L800,1290 Z" fill="${N}"/><path d="M540,1290 H820" stroke-width="8"/>
  <rect x="640" y="1150" width="130" height="44" rx="8" fill="${C.accent}" stroke="${C.accent}"/>${text(705, 1183, 28, N, 'ДЕМО', 'letter-spacing="2"')}
  <path d="M630,1220 h120 M624,1250 h90" stroke-width="4"/>
  ${learner.svg}`;

/** Слон (светящийся контур) и вопрос над ним. */
const elephantGlow = `
  ${floorLine(1520)}
  <path d="M400,1340 V1520 M470,1360 V1520 M640,1360 V1520 M710,1340 V1520" stroke-width="40" stroke-linecap="butt"/>
  <path d="M400,1340 V1520 M470,1360 V1520 M640,1360 V1520 M710,1340 V1520" stroke="${N}" stroke-width="28" stroke-linecap="butt"/>
  <ellipse cx="560" cy="1260" rx="230" ry="140" fill="${N}"/>
  <path d="M330,1220 Q300,1290 312,1350"/>
  <circle cx="780" cy="1180" r="100" fill="${N}"/>
  <ellipse cx="750" cy="1200" rx="62" ry="88" fill="${N}"/>
  <path d="M860,1200 Q890,1300 860,1390 Q850,1430 884,1436" stroke-width="22"/><path d="M860,1200 Q890,1300 860,1390 Q850,1430 884,1436" stroke="${N}" stroke-width="10"/>
  <path d="M832,1240 Q860,1272 900,1262" stroke-width="7"/><circle cx="818" cy="1150" r="7" fill="${C.line}"/>
  <g id="sc-q">${text(560, 980, 150, C.accent, '?')}</g>`;

// ─── Карточки завязки ──────────────────────────────────────────────────────────

const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const calendar = `<div class="card" style="left:120px;top:500px;width:840px;height:440px">
  <div class="ch">Теория · Тарнув<span class="tag">139 попыток</span></div>
  <svg viewBox="0 0 840 440" width="840" height="440" style="position:absolute;left:0;top:0">
    ${years
      .map((y, k) => {
        const x = 40 + (k % 5) * 156;
        const top = 130 + Math.floor(k / 5) * 140;
        const last = y === 2026;
        return `<rect x="${x}" y="${top}" width="136" height="118" rx="14" fill="#151c29"/>
          <text x="${x + 68}" y="${top + 42}" text-anchor="middle" font-size="26" font-weight="800" fill="#8b93a3">${y}</text>
          ${last ? `<text id="yq" x="${x + 68}" y="${top + 98}" text-anchor="middle" font-size="44" font-weight="900" fill="#fff" opacity="0">?</text>` : `<path id="yx${k}" d="M${x + 50},${top + 62} l36,36 M${x + 86},${top + 62} l-36,36" stroke="${C.accent}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0"/>`}`;
      })
      .join('')}
  </svg>
</div>`;

/** База вопросов: в демо — только часть клеток. */
const COLS = 10;
const ROWS = 8;
const inDemo = (i: number) => (i * 37) % 100 < 27;
const bank = `<div class="card" style="left:120px;top:500px;width:840px;height:640px">
  <div class="ch">Вопросы экзамена<span class="tag">ДЕМО</span></div>
  <svg viewBox="0 0 840 640" width="840" height="640" style="position:absolute;left:0;top:0">
    ${Array.from({ length: COLS * ROWS }, (_, i) => {
      const x = 46 + (i % COLS) * 76;
      const y = 124 + Math.floor(i / COLS) * 58;
      return inDemo(i)
        ? `<rect class="qd" x="${x}" y="${y}" width="62" height="44" rx="8" fill="#fff" opacity="0"/>`
        : `<rect class="qn" x="${x}" y="${y}" width="62" height="44" rx="8" fill="none" stroke="${C.accent}" stroke-width="3" opacity="0"/>`;
    }).join('')}
    <rect x="46" y="600" width="26" height="20" rx="4" fill="#fff"/><text x="84" y="617" font-size="24" font-weight="700" fill="#c9d1de">есть в демо</text>
    <rect x="320" y="600" width="26" height="20" rx="4" fill="none" stroke="${C.accent}" stroke-width="3"/><text x="358" y="617" font-size="24" font-weight="700" fill="#c9d1de">нет в демо — а на экзамене есть</text>
  </svg>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [, t1, , t3, t4] = T.hook;
  const tw: string[] = [];
  // Годы: крестики по одному, в 2026-м — знак вопроса.
  years.slice(0, -1).forEach((_, k) => tw.push(`tl.fromTo('#yx${k}', { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(2)' }, ${(t1 + 0.3 + k * 0.22).toFixed(3)});`));
  tw.push(`tl.fromTo('#yq', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${(t1 + 0.3 + 9 * 0.22).toFixed(3)});`);
  // База: сначала вопросы демо, потом — сколько их нет.
  tw.push(`tl.fromTo('.qd', { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.03 }, ${(t3 + 0.15).toFixed(3)});`);
  tw.push(`tl.fromTo('.qn', { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.012 }, ${(t3 + 1.0).toFixed(3)});`);
  // Мост: вопрос над слоном.
  tw.push(`tl.fromTo('#s4-q', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${t4});`);
  return tw.join('\n      ');
};

// ─── Притча на гравюре: слепые и слон ─────────────────────────────────────────

const I = C.ink;
/** Слон гравюрой (смотрит вправо). */
const elephant = `
  ${sh('M372,1240 H442 V1488 H372 Z', 'b90', 'stroke-width="4"')}${sh('M640,1240 H710 V1488 H640 Z', 'b90', 'stroke-width="4"')}
  ${sh('M300,1110 Q296,1060 330,1040 Q420,980 560,982 Q700,984 790,1040 Q840,1080 836,1150 Q830,1230 760,1270 Q650,1318 540,1318 Q400,1316 330,1250 Q300,1200 300,1110 Z', 'a60', 'stroke-width="5"')}
  <path d="M360,1180 Q420,1230 520,1240 M620,1050 Q700,1080 760,1140" stroke-width="2.5"/>
  ${sh('M470,1250 H540 V1488 H470 Z', 'a90', 'stroke-width="4"')}${sh('M730,1240 H800 V1488 H730 Z', 'a90', 'stroke-width="4"')}
  <path d="M302,1100 Q268,1170 282,1260" stroke-width="8"/>${sh('M270,1250 Q282,1300 296,1250 Z', 'b0')}
  ${sh('M800,1040 Q850,960 930,980 Q990,1000 996,1080 Q1000,1140 966,1170 L950,1180 Q960,1260 952,1340 Q946,1420 990,1440 Q1010,1450 1004,1470 Q960,1480 932,1440 Q906,1400 912,1330 Q918,1240 896,1190 Q850,1180 820,1140 Z', 'a120', 'stroke-width="5"')}
  ${sh('M836,1010 Q760,1000 740,1080 Q726,1160 770,1210 Q820,1250 860,1190 Q880,1130 870,1070 Q860,1020 836,1010 Z', 'c30', 'stroke-width="5"')}
  <path d="M930,1176 Q980,1210 1030,1196 Q994,1186 962,1162" fill="${C.paper}" stroke-width="4"/>
  <circle cx="944" cy="1052" r="7" fill="${I}"/>`;

/** Слепые: закрытые глаза, руки на части слона. */
const men = `
  ${fig({ x: 160, y: 1316, s: 0.85, f: 1, dress: 'robe', pat: 'a30', sleeve: 'a60', hair: 'turban', beard: true, face: 'closed', leg: [6, 0], leg2: [-8, 0], arm: [100, 12], arm2: [40, 30] })}
  ${fig({ x: 360, y: 1316, s: 0.85, f: 1, dress: 'tunic', pat: 'a120', sleeve: 'c60', legs: 'b90', hair: 'short', face: 'closed', leg: [8, 0], leg2: [-6, 0], arm: [62, 22], arm2: [70, 30] })}
  ${fig({ x: 720, y: 1316, s: 0.85, f: 1, dress: 'robe', pat: 'c120', sleeve: 'a30', hair: 'bald', beard: true, face: 'closed', leg: [4, 0], leg2: [-8, 0], arm: [168, 4], arm2: [30, 30] })}
  ${fig({ x: 1080, y: 1316, s: 0.85, f: -1, dress: 'tunic', pat: 'a60', sleeve: 'b30', legs: 'b90', hair: 'kerchief', face: 'closed', leg: [6, 0], leg2: [-8, 0], arm: [92, 8], arm2: [60, 30] })}`;

const tableau = `
  ${sky()}
  ${cloud(240, 560, 230)}${cloud(860, 700, 180)}
  ${sh('M-400,1200 L-100,1120 L260,1170 L620,1100 L960,1160 L1480,1110 V1220 H-400 Z', 'c30')}
  ${ground(1200)}
  ${etree(-60, 1210, 420, 2)}${etree(1180, 1210, 380, 6)}
  ${elephant}
  ${men}`;

// ─── Расчёт: а если выучить не всё ────────────────────────────────────────────

const chances = ['75%', '56%', '24%', '6%'];
const info = {
  html: `
    ${itext('i-h', 330, 40, 'А ЕСЛИ ВЫУЧИТЬ<br>НЕ ВСЁ?')}
    <div class="card" id="i-rule" style="left:130px;top:500px;width:820px;height:150px;opacity:0">
      <div style="position:absolute;left:36px;top:34px;width:80px;height:80px;border:5px solid ${C.accent};border-radius:14px;box-sizing:border-box;color:${C.accent};font-size:44px;font-weight:900;display:flex;align-items:center;justify-content:center">?</div>
      <div style="position:absolute;left:150px;right:30px;top:30px;font-size:31px;font-weight:700;line-height:1.3">В билетах — <span style="color:${C.accent}">800</span> вопросов,<br>на экзамене — 20 случайных</div>
    </div>
    ${itext('i-n', 720, 120, '600 ИЗ 800', '#fff', 900)}
    ${itext('i-nl', 870, 34, 'ВЫУЧЕНО — 75%', C.dim, 800)}
    ${itext('i-x', 940, 44, 'ШАНС, ЧТО ВОПРОСЫ ЗНАКОМЫЕ:', '#fff', 800)}
    <div id="i-d" style="position:absolute;left:40px;right:40px;top:1020px;text-align:center;font-size:52px;font-weight:900;opacity:0">${chances
      .map((s, i) => `<span id="d${i}" style="opacity:0">${i ? ' → ' : ''}${s}</span>`)
      .join('')}</div>
    ${isvg(`<g id="i-bar" opacity="0"><path d="M150,1180 H930" stroke="#2b3446" stroke-width="16" stroke-linecap="round"/>
      <path id="i-fill" d="M150,1180 H930" stroke="${C.accent}" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>
      <text x="150" y="1240" font-size="28" font-weight="800" fill="#8b93a3">1 вопрос</text><text x="930" y="1240" text-anchor="end" font-size="28" font-weight="800" fill="#8b93a3">20 вопросов</text></g>`)}
    ${itext('i-big', 1280, 130, '0,3%', C.accent, 900)}
    ${itext('i-s', 1440, 30, 'ЧТО ВСЕ 20 — ИЗ ВЫУЧЕННЫХ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('#i-rule', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t[0] + 0.25).toFixed(3)});`,
      pop('#i-n', t[1], 0.2),
      show('#i-nl', t[1] + 0.1),
      show('#i-x', t[2]),
      `tl.set('#i-d', { opacity: 1 }, ${t[3]});`,
      ...chances.map((_, i) => `tl.fromTo('#d${i}', { opacity: 0 }, { opacity: 1, duration: 0.1 }, ${(t[3] + 0.11 * i).toFixed(3)});`),
      show('#i-bar', t[4], 0.15),
      `tl.to('#i-fill', { attr: { 'stroke-dashoffset': 0.985 }, duration: 0.85, ease: 'power2.in' }, ${t[4]});`,
      pop('#i-big', t[5], 0.22),
      show('#i-s', t[5] + 0.25),
    ].join('\n      '),
};

export const v36: Video6 = {
  id: '36-139',
  title: 'Реклама: 139 попыток',
  scenes: { exam, home, elephant: elephantGlow },
  shots: [
    { scene: 'exam', cam: [545, 1180, 1.25], to: [525, 1180, 1.36], cap: 'Он сдавал теорию<br>139 раз', sub: 'Польша · реальная история', faces: { S: 'tired' } },
    { cap: 'Девять лет подряд.<br>С 2017 года', ui: calendar },
    { scene: 'home', cam: [600, 1240, 1.2], to: [620, 1220, 1.32], cap: 'Учил по демо-версии тестов', faces: { H: 'think' } },
    { cap: 'А в демо — не все вопросы,<br>которые бывают на экзамене', ui: bank },
    { scene: 'elephant', cam: [620, 1220, 1.0], to: [620, 1220, 1.06], cap: 'Как слепые из притчи<br>про слона', accent: true },
  ],
  hookTweens,
  tableau,
  story: [
    { fx: 600, fy: 1180, s: 0.95, ds: 1.04, label: 'Индия. Притча<br>о слепых и слоне' },
    { fx: 960, fy: 1250, s: 1.75, label: 'Один нащупал хобот:<br>«Слон — это змея»' },
    { fx: 790, fy: 1120, s: 1.8, label: 'Другой — ухо: «веер»' },
    { fx: 440, fy: 1330, s: 1.8, label: 'Третий — ногу: «дерево»' },
    { fx: 240, fy: 1220, s: 1.8, ds: 1.04, label: 'Четвёртый — хвост:<br>«Это верёвка!»' },
    { fx: 600, fy: 1180, s: 0.92, ds: 1.06, label: 'Каждый знал часть.<br>Слона не знал никто' },
  ],
  info,
  outcome: { title: 'С 139-й попытки<br>он сдал теорию', sub: `март 2026 · впереди — <span style="color:${C.accent}">вождение</span>` },
  cta: { lines: ['Учил часть —', '139 попыток.', 'Выучи все 800 —', 'хватит одной.'], accent: 3 },
  bioGlyph: `<rect x="-40" y="-40" width="80" height="80" rx="6"/><path d="M-40,0 H40 M0,-40 V40"/><rect x="0" y="0" width="40" height="40" fill="${C.accent}" stroke="none"/>`,
};
