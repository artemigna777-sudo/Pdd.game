/**
 * 41. «Он сел на Луну, когда топлива оставалось меньше чем на минуту» — по формуле cwex (`engine6.ts`), как
 * ролики 34 и 40: реальная история → сказка на гравюре → расчёт → итог → вывод. Вся завязка и итог — 3D из
 * Blender (`blender/moon.py`, `plane.py`, `lltv.py`, `boot.py`): посадка, взлёт, авария тренажёра, след.
 *
 * История (Википедия, «Neil Armstrong»): на 16-летие (1946) — свидетельство ученика-пилота, в августе — первый
 * самостоятельный полёт, «всё это — раньше, чем водительские права». 6 мая 1968 года тренажёр лунной посадки
 * потерял управление; Армстронг катапультировался, по позднейшему разбору на полсекунды позже — и парашют
 * не успел бы раскрыться. Продолжил тренироваться. При посадке «Аполлона-11» (1969) — тревоги 1202 и 1201
 * бортового компьютера, ручное управление, при касании топлива оставалось на 45–50 секунд работы двигателя.
 * Сказка — английская, «Три поросёнка». Расчёт: пересдача теории не раньше чем через 7 дней; ошибиться можно
 * 1–2 раза (в разных блоках), и за каждую ошибку — 5 дополнительных вопросов (регламент МВД, приказ № 80).
 */
import { floorLine } from '../draw.ts';
import { C, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { cloud, ground, sh, sky, wh } from '../etch.ts';
import { etree } from '../etch2.ts';
import { layer, nightSky, particles, rng, treeBg } from '../scenery6.ts';

const N = C.night;

// ─── Табло поверх 3D: топливо и тревога; права пилота и водителя ─────────────

const hud = `<div class="card" id="hud" style="left:120px;top:1490px;width:840px;height:210px">
  <div style="position:absolute;left:40px;top:34px;font-size:26px;font-weight:800;letter-spacing:2px;color:#8b93a3">ТОПЛИВА ОСТАЛОСЬ</div>
  <div style="position:absolute;left:40px;top:72px;font-size:84px;font-weight:900;color:#fff"><span id="fuel">0:90</span><span style="font-size:34px;color:#8b93a3"> с</span></div>
  <div style="position:absolute;right:40px;top:34px;text-align:right;font-size:26px;font-weight:800;letter-spacing:2px;color:#8b93a3">КОМПЬЮТЕР</div>
  <div id="alarm" style="position:absolute;right:40px;top:84px;padding:6px 18px;border:4px solid ${C.accent};border-radius:14px;font-size:52px;font-weight:900;color:${C.accent}">1202</div>
</div>`;

const licenses = `<div class="card" id="lic" style="left:150px;top:1450px;width:780px;height:250px">
  <div class="row" style="margin-top:26px">Права пилота<span class="x" style="color:#fff">есть ✓</span></div>
  <div class="row hot">Водительские права<span class="x">нет ✕</span></div>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [t0, t1] = T.hook;
  const tw = [
    `tl.fromTo('#hud', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t0 + 0.1).toFixed(3)});`,
    // Секунды топлива бегут вниз до 45 — столько оставалось при касании.
    ...Array.from({ length: 46 }, (_, i) => `tl.set('#fuel', { innerText: '${Math.floor((90 - i) / 60)}:${String((90 - i) % 60).padStart(2, '0')}' }, ${(t0 + 0.15 + i * 0.062).toFixed(3)});`),
    ...Array.from({ length: 7 }, (_, i) => `tl.set('#alarm', { opacity: ${i % 2 ? 1 : 0.15} }, ${(t0 + 0.2 + i * 0.25).toFixed(3)});`),
    `tl.set('#alarm', { opacity: 1 }, ${(t0 + 2.0).toFixed(3)});`,
    `tl.fromTo('#lic', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t1 + 0.4).toFixed(3)});`,
  ];
  return tw.join('\n      ');
};

// ─── Мост: светящиеся домики из соломы, веток и кирпича ──────────────────────

const glowHouse = (x: number, floor: number, kind: 'straw' | 'sticks' | 'bricks') => {
  const w = 220;
  const h = 170;
  const walls = `<path d="M${x - w / 2},${floor} V${floor - h} H${x + w / 2} V${floor}" fill="${N}"/>`;
  const roof = `<path d="M${x - w / 2 - 24},${floor - h} L${x},${floor - h - 120} L${x + w / 2 + 24},${floor - h} Z" fill="${N}"/>`;
  let tex = '';
  if (kind === 'straw') tex = Array.from({ length: 9 }, (_, i) => `M${x - 90 + i * 22},${floor - 10} q6,-70 0,-150`).join(' ');
  if (kind === 'sticks') tex = Array.from({ length: 7 }, (_, i) => `M${x - 90 + i * 30},${floor} V${floor - h}`).join(' ') + ` M${x - w / 2},${floor - 60} H${x + w / 2} M${x - w / 2},${floor - 120} H${x + w / 2}`;
  if (kind === 'bricks')
    tex = Array.from({ length: 5 }, (_, j) => `M${x - w / 2},${floor - 34 * (j + 1)} H${x + w / 2} ` + Array.from({ length: 4 }, (_, i) => `M${x - w / 2 + 55 * i + (j % 2) * 27},${floor - 34 * (j + 1)} v34`).join(' ')).join(' ');
  return `${walls}${roof}<path d="${tex}" stroke-width="3"/><path d="M${x - 24},${floor} V${floor - 70} H${x + 24} V${floor}" fill="${N}"/>`;
};

const bridge = `
  ${floorLine(1460)}
  ${glowHouse(220, 1460, 'straw')}
  ${glowHouse(540, 1460, 'sticks')}
  <g id="sc-brick">${glowHouse(860, 1460, 'bricks')}<rect x="830" y="1340" width="60" height="44" fill="${C.accent}" stroke-width="3"/></g>`;

const bridgeBg = `
  ${nightSky(441, 360, 1100)}
  <circle cx="880" cy="620" r="60" fill="#c9cfdb" stroke="none" opacity="0.16"/>
  <path d="M-200,1300 Q160,1180 520,1250 Q860,1320 1300,1210 V1460 H-200 Z" fill="#0b111d"/>
  ${treeBg(60, 1330, 0.7)}${treeBg(1030, 1300, 0.65)}
  <path d="M-200,1460 H1300" />
  ${Array.from({ length: 30 }, (_, i) => `<path d="M${-60 + i * 40},${1500 + (i % 3) * 60} l6,-16 l6,16" stroke-width="2" opacity="0.6"/>`).join('')}`;

// ─── Сказка на гравюре: «Три поросёнка» ───────────────────────────────────────

const I = C.ink;
const at = (x: number, y: number, s: number, body: string, cls = '', hidden = false, flip = false) =>
  `<g class="${cls}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" ${hidden ? 'opacity="0"' : ''}>${body}</g>`;

/** Поросёнок (мордой вправо): тело, голова, пятачок, ухо, ножки, хвостик-завиток. */
const pig = (pat = 'a60') => `
  <path d="M-46,-6 V30 M-24,0 V32 M22,0 V32 M44,-6 V30" stroke-width="7"/>
  ${sh('M-70,-40 Q-70,-92 -6,-94 Q58,-94 66,-50 Q70,-8 30,4 Q-30,10 -58,-8 Q-72,-20 -70,-40 Z', pat, 'stroke-width="4"')}
  ${sh('M38,-78 Q64,-112 98,-92 Q118,-74 106,-48 Q92,-28 62,-36 Q38,-46 38,-78 Z', 'a120', 'stroke-width="4"')}
  ${wh('M100,-74 Q122,-76 124,-60 Q124,-46 104,-46 Z', 'stroke-width="3"')}
  <circle cx="113" cy="-64" r="3" fill="${I}"/><circle cx="113" cy="-54" r="3" fill="${I}"/>
  ${wh('M54,-90 L48,-122 L74,-100 Z', 'stroke-width="3"')}
  <circle cx="84" cy="-74" r="4.5" fill="${I}"/>
  <path d="M-70,-50 q-22,-6 -18,-22 q4,-12 14,-4 q6,8 -6,12" stroke-width="3"/>`;

/** Поросёнок с кирпичом в руках-копытцах (стоит на задних ногах). */
const pigWork = `
  <path d="M-16,0 V-40 M16,0 V-40" stroke-width="8"/>
  ${sh('M-40,-40 Q-46,-120 0,-124 Q46,-120 40,-40 Q30,-26 0,-26 Q-30,-26 -40,-40 Z', 'a60', 'stroke-width="4"')}
  ${sh('M-34,-150 Q-36,-196 0,-198 Q36,-196 34,-150 Q28,-118 0,-118 Q-28,-118 -34,-150 Z', 'a120', 'stroke-width="4"')}
  ${wh('M-14,-150 Q-16,-130 0,-130 Q16,-130 14,-150 Q0,-158 -14,-150 Z', 'stroke-width="3"')}
  <circle cx="-5" cy="-142" r="2.5" fill="${I}"/><circle cx="5" cy="-142" r="2.5" fill="${I}"/>
  <circle cx="-13" cy="-168" r="4" fill="${I}"/><circle cx="13" cy="-168" r="4" fill="${I}"/>
  ${wh('M-30,-184 L-36,-216 L-14,-194 Z', 'stroke-width="3"')}${wh('M30,-184 L36,-216 L14,-194 Z', 'stroke-width="3"')}
  ${sh('M-30,-96 H30 V-66 H-30 Z', 'b0', 'stroke-width="4"')}
  <path d="M-38,-96 L-28,-84 M38,-96 L28,-84" stroke-width="7"/>`;

/** Волк (мордой влево): дует — щёки надуты, из пасти — линии ветра. */
const wolf = `
  <path d="M-80,-4 L-92,60 M-40,0 L-44,60 M70,-6 L64,60 M110,-12 L118,60" stroke-width="9"/>
  ${sh('M-110,-40 Q-104,-110 -10,-112 Q100,-114 130,-60 Q140,-10 100,0 Q0,12 -90,0 Q-118,-10 -110,-40 Z', 'b30', 'stroke-width="4"')}
  ${sh('M130,-56 Q190,-40 230,-20 Q260,10 220,24 Q180,26 150,4 Z', 'b120', 'stroke-width="4"')}
  ${sh('M-96,-70 Q-150,-110 -190,-96 Q-226,-82 -232,-58 Q-206,-38 -160,-36 Q-120,-34 -100,-44 Z', 'b30', 'stroke-width="4"')}
  ${wh('M-112,-96 L-104,-140 L-84,-102 Z', 'stroke-width="3"')}${wh('M-136,-100 L-140,-144 L-112,-106 Z', 'stroke-width="3"')}
  <circle cx="-150" cy="-80" r="5" fill="${I}"/>
  ${wh('M-170,-58 a22,18 0 1 0 1,0 Z', 'stroke-width="3"')}
  <path d="M-238,-62 Q-300,-80 -360,-60 M-236,-50 Q-310,-46 -390,-30 M-236,-40 Q-300,-12 -350,10" stroke-width="5"/>`;

/** Домик из соломы (стоит / разлетелся). */
const strawHouse = (x: number, floor: number) => `
  ${sh(`M${x - 110},${floor} V${floor - 150} H${x + 110} V${floor} Z`, 'c90', 'stroke-width="4"')}
  <path d="${Array.from({ length: 12 }, (_, i) => `M${x - 100 + i * 18},${floor - 4} q5,-70 -2,-142`).join(' ')}" stroke-width="2.5"/>
  ${sh(`M${x - 140},${floor - 150} L${x},${floor - 270} L${x + 140},${floor - 150} Z`, 'b60', 'stroke-width="4"')}
  ${wh(`M${x - 22},${floor} V${floor - 70} H${x + 22} V${floor} Z`, 'stroke-width="3"')}`;
const stickHouse = (x: number, floor: number) => `
  ${wh(`M${x - 110},${floor} V${floor - 150} H${x + 110} V${floor} Z`, 'stroke-width="4"')}
  <path d="${Array.from({ length: 10 }, (_, i) => `M${x - 100 + i * 22},${floor} V${floor - 150}`).join(' ')} M${x - 112},${floor - 50} H${x + 112} M${x - 112},${floor - 110} H${x + 112}" stroke-width="5"/>
  ${sh(`M${x - 140},${floor - 150} L${x},${floor - 260} L${x + 140},${floor - 150} Z`, 'a30', 'stroke-width="4"')}
  <path d="M${x - 130},${floor - 154} L${x},${floor - 256} L${x + 130},${floor - 154}" stroke-width="6"/>
  ${wh(`M${x - 22},${floor} V${floor - 70} H${x + 22} V${floor} Z`, 'stroke-width="3"')}`;
const brickHouse = (x: number, floor: number) => {
  let d = '';
  for (let j = 0; j < 6; j++) {
    d += `M${x - 120},${floor - 30 * (j + 1)} H${x + 120} `;
    for (let i = (j % 2) * 30; i < 240; i += 60) d += `M${x - 120 + i},${floor - 30 * j} v-30 `;
  }
  return `${sh(`M${x - 120},${floor} V${floor - 180} H${x + 120} V${floor} Z`, 'c0', 'stroke-width="5"')}<path d="${d}" stroke-width="2.5"/>
  ${sh(`M${x + 50},${floor - 250} V${floor - 300} H${x + 90} V${floor - 210} Z`, 'b0', 'stroke-width="4"')}
  ${sh(`M${x - 150},${floor - 180} L${x},${floor - 300} L${x + 150},${floor - 180} Z`, 'x45', 'stroke-width="5"')}
  ${wh(`M${x - 26},${floor} V${floor - 84} H${x + 26} V${floor} Z`, 'stroke-width="4"')}
  ${wh(`M${x + 40},${floor - 150} H${x + 96} V${floor - 104} H${x + 40} Z`, 'stroke-width="4"')}<path d="M${x + 68},${floor - 150} V${floor - 104} M${x + 40},${floor - 127} H${x + 96}" stroke-width="2.5"/>`;
};
/** Разлетевшиеся солома и ветки. */
const debris = (x: number, floor: number, seed: number, sticks: boolean) => {
  const r = rng(seed);
  return `<path d="${Array.from({ length: 26 }, () => {
    const px = x - 260 - r() * 260;
    const py = floor - 40 - r() * 300;
    const a = r() * Math.PI;
    const l = sticks ? 40 + r() * 40 : 20 + r() * 30;
    return `M${px.toFixed(0)},${py.toFixed(0)} l${(Math.cos(a) * l).toFixed(0)},${(Math.sin(a) * l).toFixed(0)}`;
  }).join(' ')}" stroke-width="${sticks ? 6 : 3}"/>`;
};

const FL = 1262;
const tableau = `
  ${sky()}
  ${cloud(220, 560, 240)}${cloud(820, 640, 200)}
  ${sh('M-400,1180 L-60,1120 L300,1160 L640,1100 L980,1150 L1480,1110 V1220 H-400 Z', 'c30')}
  ${ground(1200)}
  ${etree(-60, FL, 420, 3)}${etree(1120, FL, 380, 5)}
  <g class="h12">${strawHouse(170, FL)}${stickHouse(470, FL)}</g>
  <g class="gone" opacity="0">${debris(170, FL, 31, false)}${debris(470, FL, 32, true)}
    <path d="M60,${FL} h220 M360,${FL} h220" stroke-width="5"/></g>
  ${brickHouse(840, FL)}
  ${at(150, FL + 30, 0.8, pig('a60'), 'p1')}${at(430, FL + 34, 0.8, pig('b60'), 'p2', false, true)}
  ${at(1010, FL + 10, 0.85, pigWork, 'p3')}
  <g class="run" opacity="0">${at(960, FL + 34, 0.7, pig('a60'))}${at(1050, FL + 30, 0.7, pig('b60'))}</g>
  ${at(730, FL + 6, 0.9, wolf, 'wf', true)}
  <g class="safe" opacity="0">
    <circle cx="868" cy="${FL - 132}" r="11" fill="${I}"/><circle cx="890" cy="${FL - 120}" r="9" fill="${I}"/>
    ${at(1000, FL - 40, 0.55, wolf, '', false, true)}
  </g>`;

// ─── Расчёт: цена одной ошибки ────────────────────────────────────────────────

const info = {
  html: `
    ${itext('i-h', 300, 44, 'ЦЕНА ОДНОЙ ОШИБКИ')}
    <div class="card" id="i-a" style="left:130px;top:430px;width:820px;height:230px;opacity:0">
      <div class="ch">На тренировке</div>
      <div style="position:absolute;left:40px;top:120px;font-size:84px;font-weight:900;line-height:1">0</div>
      <div style="position:absolute;left:150px;top:140px;font-size:34px;font-weight:700;color:#8b93a3">последствий —<br>ошибся, понял, повторил</div>
    </div>
    <div class="card" id="i-b" style="left:130px;top:700px;width:820px;height:230px;opacity:0;border-color:${C.accent}">
      <div class="ch">На экзамене в ГИБДД</div>
      <div style="position:absolute;left:40px;top:122px;font-size:30px;font-weight:700;color:#8b93a3">пересдача —<br>не раньше чем через</div>
      <div id="i-7" style="position:absolute;right:40px;top:116px;font-size:80px;font-weight:900;color:${C.accent};line-height:1;opacity:0">7 ДНЕЙ</div>
    </div>
    ${itext('i-c', 1010, 40, 'НА ТЕОРИИ МОЖНО ОШИБИТЬСЯ', '#fff', 800)}
    ${itext('i-big', 1080, 120, 'МАКСИМУМ 2', C.accent, 900)}
    ${itext('i-s', 1240, 32, 'ИЗ 20 — И ЗА КАЖДУЮ +5 ВОПРОСОВ БЕЗ ПРАВА<br>НА ОШИБКУ', C.dim, 800)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('#i-a', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t[0] + 0.3).toFixed(3)});`,
      `tl.fromTo('#i-b', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, ${t[1].toFixed(3)});`,
      pop('#i-7', t[2], 0.22),
      show('#i-c', t[3]),
      pop('#i-big', t[4], 0.22),
      show('#i-s', t[5]),
    ].join('\n      '),
};

// ─── Живые фоны: лунный горизонт, Земля, звёзды, частицы ─────────────────────

const T6 = { info: [25.933, 30.867], cta: [33.5, 39.133], bio: [39.133, 42.433] };
const pInfo = particles('pi', 34, 451, T6.info[0], T6.info[1]);
const pCta = particles('pc', 40, 452, T6.cta[0], T6.cta[1], [0, 200, 1080, 1500], '#ffd9a8');
const pBio = particles('pb', 24, 453, T6.bio[0], T6.bio[1]);

/** Лунный горизонт снизу: пологие валы кратеров, сама Земля — над ним. */
const lunar = (base: number, seed: number, earth: [number, number, number]) => {
  const r = rng(seed);
  let d = `M-40,${base}`;
  for (let x = -40; x <= 1120; x += 60) d += ` Q${x + 30},${(base - 30 - r() * 50).toFixed(0)} ${x + 60},${(base - r() * 30).toFixed(0)}`;
  const craters = Array.from({ length: 9 }, () => {
    const cx = r() * 1080;
    const cy = base + 80 + r() * (1880 - base - 80);
    const w = 60 + r() * 140;
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${w.toFixed(0)}" ry="${(w * 0.22).toFixed(0)}" stroke-width="2.5" opacity="0.7"/>`;
  }).join('');
  const [ex, ey, er] = earth;
  return `
    <circle cx="${ex}" cy="${ey}" r="${er + 10}" fill="#3a6fd6" stroke="none" opacity="0.12"/>
    <circle cx="${ex}" cy="${ey}" r="${er}" fill="#14306e" stroke="#6f93d8" stroke-width="3" opacity="0.75"/>
    <path d="M${ex - er * 0.5},${ey - er * 0.3} q${er * 0.3},${-er * 0.3} ${er * 0.6},${-er * 0.1} q${er * 0.2},${er * 0.3} ${-er * 0.1},${er * 0.5} Z M${ex + er * 0.1},${ey + er * 0.2} q${er * 0.4},${-er * 0.1} ${er * 0.5},${er * 0.3} q${-er * 0.2},${er * 0.3} ${-er * 0.5},${er * 0.1} Z" fill="#3b6b3a" stroke="none" opacity="0.6"/>
    <path d="${d} V1960 H-40 Z" fill="#0d121c" stroke="#5a6782" stroke-width="3"/>
    ${craters}`;
};

const backdrop = {
  info: `<div id="bdi" style="position:absolute;inset:0">${layer('bdi-s', `${nightSky(454, 120, 1500)}${lunar(1500, 455, [880, 1380, 60])}${pInfo.svg}`)}</div>`,
  cta: `<div id="bdc" style="position:absolute;inset:0">${layer('bdc-s', `${nightSky(456, 100, 1400)}${lunar(1450, 457, [780, 1250, 110])}${pCta.svg}`)}</div>`,
  bio: `<div id="bdb" style="position:absolute;inset:0;opacity:0.7">${layer('bdb-s', `${nightSky(458, 100, 1400)}${lunar(1450, 457, [780, 1250, 110])}${pBio.svg}`)}</div>`,
};

const backdropTweens = () =>
  [
    pInfo.tweens,
    pCta.tweens,
    pBio.tweens,
    `tl.fromTo('#bdi', { scale: 1, transformOrigin: '50% 85%' }, { scale: 1.06, duration: ${(T6.info[1] - T6.info[0]).toFixed(3)}, ease: 'none' }, ${T6.info[0]});`,
    // Земля медленно поднимается над лунным горизонтом.
    `tl.fromTo('#bdc', { y: 40 }, { y: 0, duration: ${(T6.cta[1] - T6.cta[0]).toFixed(3)}, ease: 'none' }, ${T6.cta[0]});`,
  ].join('\n      ');

export const v41: Video6 = {
  id: '41-armstrong',
  title: 'Реклама: Армстронг сел на Луну',
  scenes: { bridge },
  shots: [
    { video: 'moon.mp4', cap: 'Сел на Луну с топливом<br>меньше чем на минуту', sub: 'Нил Армстронг · 1969 · реальная история', ui: hud },
    { video: 'plane.mp4', cap: 'В 16 лет он уже летал сам.<br>А водить машину — ещё нет', sub: 'США · 1946', ui: licenses },
    { video: 'crash.mp4', cap: 'В 1968-м тренажёр разбился.<br>Он катапультировался', sub: 'ещё полсекунды — и парашют бы не раскрылся' },
    { video: 'hover.mp4', cap: 'И продолжил тренироваться<br>на таком же' },
    { scene: 'bridge', bg: bridgeBg, cam: [540, 1320, 1.05], to: [580, 1310, 1.13], cap: 'Как третий поросёнок<br>из сказки', accent: true },
  ],
  hookTweens: (T) => `${hookTweens(T)}
      tl.fromTo('#s4-brick', { opacity: 0.35 }, { opacity: 1, duration: 0.4 }, ${T.hook[4]});`,
  tableau,
  story: [
    { fx: 540, fy: 1060, s: 0.95, ds: 1.04, label: 'Английская сказка.<br>«Три поросёнка»' },
    { fx: 320, fy: 1130, s: 1.6, label: 'Двое построили домики<br>за день — и гулять' },
    { fx: 880, fy: 1100, s: 1.6, label: 'Третий таскал кирпичи.<br>Долго и скучно' },
    { fx: 480, fy: 1110, s: 1.35, ds: 1.03, label: 'Пришёл волк', on: '.wf' },
    { fx: 560, fy: 1110, s: 1.15, ds: 1.06, label: 'Солома и ветки —<br>разлетелись', on: '.gone, .run', off: '.h12, .p1, .p2, .p3' },
    { fx: 760, fy: 1080, s: 1.15, ds: 1.05, label: 'Устоял только тот,<br>кто готовился заранее', on: '.safe', off: '.wf, .run' },
  ],
  info,
  outcome: { title: 'Компьютер сбоил —<br>он посадил модуль вручную', sub: `руки помнили <span style="color:${C.accent}">тренировки</span>`, video: 'boot.mp4' },
  cta: { lines: ['Он ошибался.', 'Но не на Луне.', 'Ошибайся —', 'на тренировке.'], accent: 3 },
  backdrop,
  extra: backdropTweens,
  bioGlyph: '<path d="M14,-38 A40,40 0 1 0 14,38 A30,34 0 1 1 14,-38 Z" fill="currentColor"/>',
};
