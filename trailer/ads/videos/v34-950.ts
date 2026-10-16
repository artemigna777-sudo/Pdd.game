/**
 * 34. «Она завалила теорию 949 раз» — по формуле cwex (`engine6.ts`): реальная история → легенда на гравюре →
 * расчёт → итог → вывод.
 *
 * История: Ча Са Сун (Южная Корея) с 13 апреля 2005 года сдавала теорию каждый будний день три года подряд,
 * потом реже; сдала на 950-й раз — ровно проходные 60 баллов из 100 (ноябрь 2009). Hyundai подарила ей
 * машину и сняла в рекламе (2010). Легенда: Роберт Брюс и паук (В. Скотт, «Рассказы дедушки», 1827–1828):
 * проиграв шесть битв, король смотрел, как паук шесть раз срывается, а на седьмой цепляет нить; в 1314 году —
 * Бэннокберн. Расчёт: пересдача теории в России — не раньше чем через 7 дней, 949 × 7 = 6 643 дня > 18 лет.
 * Источники — README.
 */
import { chair, desk, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { cloud, fig, rock, sea, sh, sky } from '../etch.ts';
import { sword } from '../etch2.ts';
import { text } from '../kit.ts';

// ─── Завязка: светящиеся человечки ────────────────────────────────────────────

const lady = person(DLG, { id: 'L', x: 300, floor: 1400, pose: 'sit', seat: 110, f: 1, arms: ['table', 'table'], table: 1250, hair: 'scarf', face: 'sad' });
const walker = person(DLG, { id: 'W', x: 380, floor: 1650, pose: 'stand', f: 1, arms: ['front', 'down'], hold: 'paper', hair: 'scarf', face: 'tired' });

/** Паук (светящийся — белое тело). */
const spiderGlow = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="4">
  <path d="M-8,-4 L-30,-24 L-42,-6 M-9,2 L-36,-4 L-46,14 M-8,8 L-30,20 L-36,40 M8,-4 L30,-24 L42,-6 M9,2 L36,-4 L46,14 M8,8 L30,20 L36,40"/>
  <ellipse cx="0" cy="6" rx="12" ry="16" fill="${C.line}"/><circle cx="0" cy="-14" r="8" fill="${C.line}"/></g>`;

const exam = `
  ${floorLine(1400)}
  ${chair(300, 1400, 1, 110)}
  ${desk(420, 880, 1250, 1400)}
  <path d="M650,1250 V1172 M596,1250 H704"/>
  <rect x="490" y="950" width="320" height="222" rx="16" fill="${C.night}"/>
  <g id="sc-fail"><path d="M618,990 l64,64 M682,990 l-64,64" stroke="${C.accent}" stroke-width="12"/>${text(650, 1130, 34, '#fff', 'НЕ СДАНО', 'letter-spacing="2"')}</g>
  <g id="sc-pass" opacity="0"><path d="M610,1024 l28,28 l58,-62" stroke="${C.accent}" stroke-width="12"/>${text(650, 1130, 34, C.accent, 'СДАНО', 'letter-spacing="2"')}</g>
  ${lady.svg}
  <defs><linearGradient id="thrfade" gradientUnits="userSpaceOnUse" x1="0" y1="690" x2="0" y2="820"><stop offset="0" stop-color="${C.line}" stop-opacity="0"/><stop offset="1" stop-color="${C.line}"/></linearGradient></defs>
  <g id="sc-spider" opacity="0"><g id="sc-spd"><path d="M470,600 V858" stroke="url(#thrfade)" stroke-width="2.5"/>${spiderGlow(470, 880, 1.1)}</g></g>`;

const walk = `
  ${floorLine(1650)}
  <rect x="690" y="1310" width="190" height="340" fill="${C.night}"/><circle cx="850" cy="1490" r="7" fill="${C.line}"/>
  <rect x="620" y="1196" width="330" height="76" rx="8" fill="${C.night}"/>${text(785, 1248, 36, '#fff', 'ЭКЗАМЕН', 'letter-spacing="3"')}
  <path d="M600,1650 V1170 H980 V1650"/>
  ${walker.svg}`;

// ─── Карточки завязки ──────────────────────────────────────────────────────────

const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ'];
const calendar = `<div class="card" style="left:150px;top:470px;width:780px;height:420px">
  <div class="ch">Экзамен по теории<span class="tag"><span id="y0">2005</span><span id="y1" style="display:none">2006</span><span id="y2" style="display:none">2007</span></span></div>
  <svg viewBox="0 0 780 420" width="780" height="420" style="position:absolute;left:0;top:0">
    ${days.map((d, i) => `<text x="${71 + i * 132 + 55}" y="140" text-anchor="middle" font-size="24" font-weight="800" fill="#8b93a3">${d}</text>`).join('')}
    ${Array.from({ length: 15 }, (_, k) => {
      const x = 71 + (k % 5) * 132 + 55;
      const y = 160 + Math.floor(k / 5) * 80;
      return `<rect x="${x - 55}" y="${y}" width="110" height="66" rx="12" fill="#151c29"/><path id="cx${k}" d="M${x - 16},${y + 17} l32,32 M${x + 16},${y + 17} l-32,32" stroke="${C.accent}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0"/>`;
    }).join('')}
  </svg>
</div>`;

/** Строки списка одной высоты: шаг ROW, в карточку входят ровно 7. */
const ROW = 88;
const ROWCSS = 'box-sizing:border-box;height:74px;margin:0 24px 14px;padding:0 22px';
const attempts = [...Array.from({ length: 9 }, (_, i) => i + 1), 0, ...Array.from({ length: 9 }, (_, i) => 941 + i)];
const list = `<div class="card" style="left:130px;top:470px;width:820px;height:740px">
  <div class="ch">Теория · результаты<span class="tag">949 ✕</span></div>
  <div style="position:absolute;left:0;right:0;top:110px;bottom:0;overflow:hidden">
    <div id="lst" style="padding-top:14px">${attempts
      .map((n) =>
        n === 0
          ? `<div class="row" style="${ROWCSS};justify-content:center;color:#8b93a3">· · ·</div>`
          : `<div class="row${n === 949 ? ' hot' : ''}" style="${ROWCSS}">Попытка ${n}<span class="x">не сдано</span></div>`,
      )
      .join('')}</div>
  </div>
</div>`;

const score = `<div class="card" style="left:130px;top:520px;width:820px;height:600px">
  <div class="ch">Попытка 950<span class="tag">ТЕОРИЯ</span></div>
  <div style="position:absolute;left:0;right:0;top:150px;text-align:center;font-size:150px;font-weight:900;line-height:1">
    ${[0, 12, 24, 36, 48, 60].map((n, i) => `<span id="sc${i}" style="position:absolute;left:0;right:0;opacity:${i ? 0 : 1}">${n}</span>`).join('')}
  </div>
  <div style="position:absolute;left:0;right:0;top:320px;text-align:center;font-size:30px;font-weight:700;color:#8b93a3">баллов из 100</div>
  <div style="position:absolute;left:60px;right:60px;top:410px;height:34px;border-radius:17px;background:#1b2332;overflow:hidden"><div id="bar" style="width:0;height:100%;background:#fff;border-radius:17px"></div></div>
  <div style="position:absolute;left:${60 + 0.6 * 700 - 3}px;top:392px;width:6px;height:70px;background:${C.accent}"></div>
  <div style="position:absolute;left:${60 + 0.6 * 700 - 150}px;width:300px;top:470px;text-align:center;font-size:24px;font-weight:800;color:${C.accent};letter-spacing:1px">ПРОХОДНОЙ · 60</div>
  <div id="pass" style="position:absolute;left:0;right:0;top:520px;text-align:center;font-size:44px;font-weight:900;color:${C.accent};letter-spacing:4px;opacity:0">СДАНО</div>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [, t1, t2, t3, t4] = T.hook;
  const tw: string[] = [];
  // Календарь: крестики по будним дням, годы сменяются.
  for (let k = 0; k < 15; k++) tw.push(`tl.fromTo('#cx${k}', { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.12, ease: 'back.out(2)' }, ${(t1 + 0.25 + k * 0.1).toFixed(3)});`);
  tw.push(`tl.set('#y0', { display: 'none' }, ${(t1 + 1.6).toFixed(3)}); tl.set('#y1', { display: 'inline' }, ${(t1 + 1.6).toFixed(3)});`);
  tw.push(`tl.set('#y1', { display: 'none' }, ${(t1 + 2.4).toFixed(3)}); tl.set('#y2', { display: 'inline' }, ${(t1 + 2.4).toFixed(3)});`);
  // Список попыток прокручивается до 949-й.
  tw.push(`tl.fromTo('#lst', { y: 0 }, { y: ${-(attempts.length - 7) * ROW}, duration: 1.7, ease: 'power2.inOut' }, ${(t2 + 0.3).toFixed(3)});`);
  // Баллы растут до 60 — ровно до проходного.
  for (let i = 1; i < 6; i++) tw.push(`tl.set('#sc${i - 1}', { opacity: 0 }, ${(t3 + 0.2 + i * 0.14).toFixed(3)}); tl.set('#sc${i}', { opacity: 1 }, ${(t3 + 0.2 + i * 0.14).toFixed(3)});`);
  tw.push(`tl.fromTo('#bar', { width: '0%' }, { width: '60%', duration: 0.7, ease: 'power1.out' }, ${(t3 + 0.25).toFixed(3)});`);
  tw.push(`tl.fromTo('#pass', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, ${(t3 + 1.2).toFixed(3)});`);
  // Мост: на экране «сдано», сверху спускается паук.
  tw.push(`tl.set('#s4-spider', { opacity: 1 }, ${t4}); tl.fromTo('#s4-spd', { y: -420 }, { y: 0, duration: 0.45, ease: 'power2.out' }, ${t4});`);
  return tw.join('\n      ');
};

// ─── Легенда: Роберт Брюс и паук, пещера на гравюре ────────────────────────────

const I = C.ink;
/** Паук на гравюре (чёрное тело). */
const spiderInk = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="3.5">
  <path d="M-8,-4 L-30,-24 L-42,-6 M-9,2 L-36,-4 L-46,14 M-8,8 L-30,20 L-36,40 M8,-4 L30,-24 L42,-6 M9,2 L36,-4 L46,14 M8,8 L30,20 L36,40"/>
  <ellipse cx="0" cy="6" rx="12" ry="16" fill="${I}"/><circle cx="0" cy="-14" r="8" fill="${I}"/></g>`;

type Pt = [number, number];
/** Свод входа в пещеру: кривые Безье против часовой стрелки — дыра в скале. */
const arch: [Pt, Pt, Pt, Pt][] = [
  [[830, 1330], [880, 1180], [915, 960], [890, 800]],
  [[890, 800], [860, 600], [760, 470], [600, 450]],
  [[600, 450], [430, 430], [300, 520], [240, 700]],
  [[240, 700], [190, 860], [190, 1100], [230, 1330]],
];
const bez = ([a, b, c, d]: [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]) as Pt;
};
const cave = `M-400,-400 H1480 V2400 H-400 Z M230,1330 L830,1330 ${arch.map(([, b, c, d]) => `C${b} ${c} ${d}`).join(' ')} Z`;
/** Пол пещеры: от входа к зрителю. */
const floor = `M230,1330 L830,1330 L1500,2400 L-420,2400 Z`;

/** Паутина в правом верхнем углу входа: центр, нити к краю свода (чуть за край — их закроет скала), кольца. */
const WC: Pt = [745, 660];
const anchors: Pt[] = [
  bez(arch[1], 0.95), bez(arch[1], 0.75), bez(arch[1], 0.55), bez(arch[1], 0.35), bez(arch[1], 0.15), bez(arch[0], 0.85), bez(arch[0], 0.6),
].map(([x, y]) => [WC[0] + (x - WC[0]) * 1.06, WC[1] + (y - WC[1]) * 1.06]);
const ringPts = (k: number) => anchors.map(([x, y]) => [WC[0] + (x - WC[0]) * k, WC[1] + (y - WC[1]) * k] as [number, number]);
const fullWeb = `<g class="w2" opacity="0" stroke-width="2.2">
  ${anchors.map(([x, y]) => `<path d="M${WC[0]},${WC[1]} L${x},${y}"/>`).join('')}
  ${[0.22, 0.4, 0.58, 0.76, 0.93].map((k) => `<path d="M${ringPts(k).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')}"/>`).join('')}
  ${spiderInk(WC[0], WC[1], 1.1)}
</g>`;
const partWeb = `<g class="w1" stroke-width="2.2"><path d="M${WC[0]},${WC[1]} L${anchors[2][0]},${anchors[2][1]} M${WC[0]},${WC[1]} L${anchors[4][0]},${anchors[4][1]}"/></g>`;

/** Паук на нити: сидит под сводом (sp1) и срывается (sp2, анимация #spd). */
const hanging = `<g class="sp1">
  <path d="M700,300 V590" stroke-width="2.2"/>${spiderInk(700, 612, 1.1)}
</g>
<g class="sp2" opacity="0"><g id="spd"><path d="M735,-200 V560" stroke-width="2.2"/>${spiderInk(735, 582, 1.1)}</g></g>`;

/** Шесть зарубок на правой стене — по одной на каждую попытку паука. */
const tally = `<g stroke-width="7">${Array.from({ length: 6 }, (_, i) =>
  i < 5 ? `<path id="tm${i}" d="M${950 + i * 26},${930} V${1030}" opacity="0"/>` : `<path id="tm5" d="M940,1010 L1080,950" opacity="0"/>`,
).join('')}</g>`;

/** Каменный уступ, на котором сидит король. */
const ledge = sh('M150,1612 Q156,1590 196,1592 L372,1598 Q404,1600 406,1628 L410,1722 L144,1734 Z', 'b120', 'stroke-width="4"');
const kingSit = `<g class="k1">
  ${fig({ x: 300, y: 1596, s: 1.3, f: 1, lean: 18, nod: 30, leg: [88, 92], leg2: [82, 86], arm: [35, 115], arm2: [25, 60], dress: 'armor', pat: 'a60', sleeve: 'a30', legs: 'a120', hair: 'crown', beard: true, face: 'sad' })}
  <g transform="translate(590 1560) rotate(160)">${sword(290)}</g>
</g>`;
const kingStand = `<g class="k2" opacity="0">
  ${fig({ x: 520, y: 1480, s: 1.3, f: 1, lean: -4, nod: -8, arm: [24, 30], arm2: [160, 10], leg: [12, 0], leg2: [-14, 0], dress: 'armor', pat: 'a60', sleeve: 'a30', legs: 'a120', hair: 'crown', beard: true, face: 'calm', hand2: sword(280) })}
</g>`;

const tableau = `
  ${sky()}
  ${cloud(420, 640, 260)}
  ${cloud(720, 820, 180)}
  ${sh('M150,1160 L300,1090 L420,1130 L560,1060 L700,1120 L940,1070 L940,1180 L150,1180 Z', 'c30')}
  ${sea(1150, 100, 1000)}
  ${partWeb}
  ${fullWeb}
  ${hanging}
  ${rock('cave', cave, [-400, -400, 1880, 2800], 175, 23, 0.55)}
  ${sh(floor, 'c0', 'stroke-width="5"')}
  <path d="M470,1330 L380,1560 M600,1330 L700,1600 M380,1860 L300,2100 M760,1880 L900,2150 M140,1420 L60,1520" stroke-width="2.5"/>
  ${sh('M840,1830 L880,1790 L950,1785 L985,1815 L975,1850 L860,1856 Z', 'b30', 'stroke-width="4"')}
  ${sh('M640,2010 L668,1982 L730,1980 L752,2008 L740,2030 L650,2034 Z', 'b150', 'stroke-width="4"')}
  ${tally}
  ${ledge}
  ${kingSit}
  ${kingStand}`;

// ─── Расчёт: а если бы в России ───────────────────────────────────────────────

const steps = ['1 200', '2 600', '4 100', '5 500', '6 643'];
const info = {
  html: `
    ${itext('i-h', 330, 40, 'А ЕСЛИ БЫ ОНА СДАВАЛА<br>В РОССИИ?')}
    <div class="card" id="i-rule" style="left:130px;top:500px;width:820px;height:150px;opacity:0">
      <div style="position:absolute;left:36px;top:40px;width:70px;height:70px;border:5px solid ${C.accent};border-radius:50%"></div>
      <div style="position:absolute;left:70px;top:56px;width:5px;height:24px;background:${C.accent}"></div><div style="position:absolute;left:70px;top:76px;width:22px;height:5px;background:${C.accent}"></div>
      <div style="position:absolute;left:140px;right:30px;top:30px;font-size:31px;font-weight:700;line-height:1.3">Пересдача теории — не раньше<br>чем через <span style="color:${C.accent}">7 дней</span></div>
    </div>
    ${itext('i-n', 720, 130, '949', '#fff', 900)}
    ${itext('i-nl', 870, 34, 'ПРОВАЛОВ', C.dim, 800)}
    ${itext('i-x', 930, 64, '× 7 ДНЕЙ', '#fff', 900)}
    <div id="i-d" style="position:absolute;left:40px;right:40px;top:1030px;text-align:center;font-size:64px;font-weight:900;opacity:0">= ${steps
      .map((s, i) => `<span id="d${i}" style="display:none">${s}</span>`)
      .join('')} ДНЯ</div>
    ${isvg(`<g id="i-bar" opacity="0"><path d="M150,1200 H930" stroke="#2b3446" stroke-width="16" stroke-linecap="round"/>
      <path id="i-fill" d="M150,1200 H930" stroke="${C.accent}" stroke-width="16" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <text x="150" y="1258" font-size="30" font-weight="800" fill="#8b93a3">2005</text><text x="930" y="1258" text-anchor="end" font-size="30" font-weight="800" fill="#8b93a3">2023</text></g>`)}
    ${itext('i-big', 1290, 110, 'БОЛЬШЕ 18 ЛЕТ', C.accent, 900)}
    ${itext('i-s', 1420, 30, 'ТОЛЬКО НА ОЖИДАНИЕ ПЕРЕСДАЧ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('#i-rule', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t[0] + 0.25).toFixed(3)});`,
      pop('#i-n', t[1], 0.2),
      show('#i-nl', t[1] + 0.1),
      pop('#i-x', t[2], 0.2),
      show('#i-d', t[3]),
      `tl.set('#d0', { display: 'inline' }, ${t[3]});`,
      ...steps.slice(1).map((_, i) => `tl.set('#d${i}', { display: 'none' }, ${(t[3] + 0.08 * (i + 1)).toFixed(3)}); tl.set('#d${i + 1}', { display: 'inline' }, ${(t[3] + 0.08 * (i + 1)).toFixed(3)});`),
      show('#i-bar', t[4], 0.15),
      `tl.to('#i-fill', { attr: { 'stroke-dashoffset': 0 }, duration: 0.85, ease: 'power1.inOut' }, ${t[4]});`,
      pop('#i-big', t[5], 0.22),
      show('#i-s', t[5] + 0.25),
    ].join('\n      '),
};

export const v34: Video6 = {
  id: '34-950',
  title: 'Реклама: 950 попыток',
  scenes: { exam, walk },
  shots: [
    { scene: 'exam', cam: [545, 1180, 1.25], to: [525, 1180, 1.36], cap: 'Она завалила теорию<br>949 раз', sub: 'Южная Корея · реальная история', faces: { L: 'sad' } },
    { scene: 'walk', cam: [600, 1260, 1.0], to: [600, 1260, 1.04], cap: 'Сдавала каждый будний день.<br>Три года подряд', ui: calendar, faces: { W: 'tired' } },
    { cap: 'И каждый раз — «не сдано»', ui: list },
    { cap: 'На 950-й — ровно 60 баллов.<br>Проходной — 60', ui: score },
    { scene: 'exam', cam: [520, 1040, 1.6], to: [505, 1040, 1.7], cap: 'Упрямая — как паук<br>из шотландской легенды', accent: true, faces: { L: 'happy' } },
  ],
  hookTweens: (T) => `${hookTweens(T)}
      tl.set('#s4-fail', { opacity: 0 }, ${T.hook[4]}); tl.set('#s4-pass', { opacity: 1 }, ${T.hook[4]});`,
  tableau,
  story: [
    { fx: 540, fy: 1060, s: 1.0, ds: 1.05, label: 'Шотландия, 1306.<br>Король проиграл шесть битв' },
    { fx: 330, fy: 1530, s: 1.55, ds: 1.04, label: 'И прятался в пещере' },
    { fx: 740, fy: 760, s: 1.8, label: 'Паук бросал нить —<br>и срывался', on: '.sp2', off: '.sp1' },
    { fx: 820, fy: 820, s: 1.55, ds: 1.03, label: 'Шесть раз подряд' },
    { fx: 770, fy: 660, s: 2.2, label: 'На седьмой —<br>зацепился', on: '.w2', off: '.sp2, .w1' },
    { fx: 540, fy: 1200, s: 1.12, ds: 1.05, label: 'Король встал —<br>и через 8 лет победил', on: '.k2', off: '.k1' },
  ],
  extra: (T) => {
    const [, , t3, t4] = T.story;
    const drops = [t3 + 0.1, t4 + 0.1, t4 + 0.75];
    return [
      ...drops.map((t, i) => `tl.fromTo('#spd', { y: 0 }, { y: 430, duration: 0.32, ease: 'power2.in' }, ${t.toFixed(3)}); tl.to('#spd', { y: 0, duration: ${i === 0 ? 0.55 : 0.3}, ease: 'power1.out' }, ${(t + 0.36).toFixed(3)});`),
      ...Array.from({ length: 6 }, (_, i) => `tl.set('#tm${i}', { opacity: 1 }, ${(t4 + 0.15 + i * 0.2).toFixed(3)});`),
    ].join('\n      ');
  },
  info,
  outcome: { title: 'А Hyundai подарила ей<br>новую машину', sub: `и сняла в рекламе · <span style="color:${C.accent}">2010</span>` },
  cta: { lines: ['Упорство —', '950 попыток.', 'С системой —', 'одна.'], accent: 3 },
  bioGlyph: '<path d="M0,-40 V40 M-40,0 H40 M-28,-28 L28,28 M28,-28 L-28,28"/><path d="M0,-24 L17,-17 L24,0 L17,17 L0,24 L-17,17 L-24,0 L-17,-17 Z"/>',
};
