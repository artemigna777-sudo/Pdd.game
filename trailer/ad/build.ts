/**
 * Рекламный ролик для TikTok «Не можешь сдать теорию?»: вертикальный, 28,5 с. Сделан по образцу ролика,
 * который прислал Артём: тот же монтаж в те же доли секунды и та же музыка, но свой сюжет.
 *
 *   1. Диалог двух человечков (светящиеся линии на чёрном): друг дважды завалил теорию, а другой сдал, просто играя.
 *   2. «Демо»: телефон, 800 вопросов, машинка курьера проезжает билеты — все с галочкой.
 *   3. История в стиле старой гравюры: первый лётный тренажёр Эдвина Линка (США, 1929) — пилоты учились
 *      летать, не отрываясь от земли. «Сегодня так учат ПДД» — гравюра оживает в настоящую игру.
 *   4. Сравнение «Зубрёжка / Игра», «Хватит зубрить — начни играть», «Ссылка в био».
 *
 * Вся графика нарисована кодом, кадры игры — настоящая запись (`trailer/video/clips/drive.mp4`).
 * Музыка берётся из присланного ролика и в репозиторий не кладётся (см. README).
 *
 *   npx tsx trailer/ad/build.ts
 *   cd trailer/ad/video && npx hyperframes@0.8.119 render . --fps 30 --crf 21 --video-frame-format png -o ../kurier-pdd-ad.mp4
 */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./video/', import.meta.url);
const font = (file: string) => readFileSync(new URL(`../video/fonts/${file}`, import.meta.url)).toString('base64');
const appIcon = readFileSync(new URL('../../public/icons/icon-192.png', import.meta.url)).toString('base64');

const W = 1080;
const H = 1920;

/** Монтаж — в те же моменты, что и у ролика-образца (под ту же музыку). */
const T = {
  shots: [0, 1.533, 3.033, 4.567, 6.1, 7.633, 9.133, 10.667],
  demo: [10.667, 11.467, 13.7, 14.5],
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

// ─── Диалог ────────────────────────────────────────────────────────────────────

type Shot = 'wide' | 'a' | 'b';
const LINES: { shot: Shot; text: string; a?: string; b?: string }[] = [
  { shot: 'wide', text: '«Знаешь, что я сдал сегодня?»', a: 'happy', b: 'neutral' },
  { shot: 'a', text: '«Зачёт по физре?»', a: 'grin' },
  { shot: 'b', text: '«Теорию в ГИБДД.<br>Ту, что ты завалил дважды»', b: 'cool' },
  { shot: 'a', text: '«Чего?! Ты ботан, что ли?»', a: 'shock' },
  { shot: 'b', text: '«Нет. Я просто играл»', b: 'calm' },
  { shot: 'wide', text: '«И это помогает сдать?»', a: 'doubt', b: 'relaxed' },
  { shot: 'b', text: '«Лучше, чем зубрёжка.<br>И прямо с телефона»', b: 'happy' },
];

/** Куда смотрит камера: точка мира в центре кадра и масштаб. */
const CAMERA: Record<Shot, { fx: number; fy: number; s: number }> = {
  wide: { fx: 540, fy: 1060, s: 1 },
  a: { fx: 262, fy: 1035, s: 2.2 },
  b: { fx: 905, fy: 1012, s: 2.2 },
};
const camAt = (c: { fx: number; fy: number; s: number }, k = 1) => ({ x: 540 - c.fx * c.s * k, y: 1060 - c.fy * c.s * k, scale: c.s * k });

const eye = (x: number, y: number, r = 10, px = 0, py = 0, pupil = 0.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="none"/><circle cx="${x + px}" cy="${y + py}" r="${r * pupil}" fill="#000" stroke="none"/>`;

/** Лица: центр головы в (0, 0), радиус головы 52. */
const FACES: Record<string, string> = {
  happy: `<path d="M-26,-6 q9,-12 18,0 M8,-6 q9,-12 18,0"/><path d="M-15,14 q15,14 30,0"/>`,
  neutral: `${eye(-17, -6, 10, -4, 0)}${eye(17, -6, 10, -4, 0)}<path d="M-9,20 h16"/>`,
  grin: `${eye(-15, -8, 10, 4, -2)}${eye(17, -8, 10, 4, -2)}<path d="M-17,12 q17,24 34,0 z" fill="#fff"/>`,
  shock: `${eye(-18, -9, 13, 0, 0, 0.36)}${eye(18, -9, 13, 0, 0, 0.36)}<circle cx="0" cy="24" r="7"/><path d="M-30,-31 l18,-7 M12,-38 l18,7"/>`,
  doubt: `${eye(-17, -5, 10, 4, 0)}${eye(17, -5, 10, 4, 0)}<path d="M-28,-24 l20,-4 M8,-30 l20,6"/><path d="M-11,22 l22,-6"/>`,
  cool: `<path d="M-36,-16 h30 q0,20 -15,20 q-15,0 -15,-20 z M6,-16 h30 q0,20 -15,20 q-15,0 -15,-20 z" fill="#111" stroke-width="3.5"/><path d="M-6,-14 h12" stroke-width="3.5"/><path d="M-7,22 q13,5 22,-7"/>`,
  calm: `${eye(-17, -4, 10, -2, 2)}${eye(17, -4, 10, -2, 2)}<path d="M-29,-8 h24 M5,-8 h24" stroke-width="5"/><path d="M-9,19 q10,6 19,-2"/>`,
  relaxed: `${eye(-17, -5, 10, -4, 3)}${eye(17, -5, 10, -4, 3)}<path d="M-10,19 q10,7 20,0"/>`,
};

function face(who: 'A' | 'B', cx: number, cy: number): string {
  return Object.entries(FACES)
    .map(([k, d]) => `<g id="face${who}_${k}" class="face${who}" transform="translate(${cx} ${cy})" stroke-width="4" opacity="0">${d}</g>`)
    .join('');
}

/** Телефон: синий экран; у второго героя на экране — машинка курьера. */
function phone(x: number, y: number, rot: number, car: boolean): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-17" y="-31" width="34" height="62" rx="7" fill="#4a6cf7" stroke-width="4"/>
    ${car ? `<path d="M0,-24 v48" stroke="#9fb2ff" stroke-width="2" stroke-dasharray="5 5"/><rect x="-6" y="-2" width="12" height="18" rx="3" fill="#ffb703" stroke="none"/>` : ''}
  </g>`;
}

const dialogueSvg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="lines">
  <g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <line x1="-600" y1="1210" x2="1700" y2="1210"/>
    <!-- Первый герой: в кресле-мешке, с телефоном -->
    <path d="M118,1208 C92,1150 104,1078 172,1058 C240,1038 304,1068 322,1120 C336,1160 333,1196 318,1208 Z" fill="#000"/>
    <path d="M236,1116 L332,1076 L396,1205"/>
    <path d="M230,1124 L318,1096 L360,1206"/>
    <path d="M236,1116 L252,1012"/>
    <path d="M248,1036 L210,1086 L226,1112"/>
    <path d="M250,1032 L300,1074 L322,996"/>
    ${phone(326, 968, 12, false)}
    <circle cx="256" cy="960" r="52" fill="#000"/>
    ${face('A', 256, 960)}
    <!-- Стол: кружка и стопка билетов, которые больше не нужны -->
    <path d="M560,1046 H846"/>
    <path d="M584,1046 V1208 M822,1046 V1208"/>
    <path d="M640,1046 V1006 H672 V1046 M672,1016 q18,0 18,13 q0,13 -18,13"/>
    <path d="M712,1046 h84 M716,1038 h76 M712,1030 h82"/>
    <!-- Стул -->
    <path d="M872,1100 H992 M986,1100 L996,952 M884,1100 V1208 M980,1100 V1208"/>
    <!-- Второй герой: на стуле, с телефоном -->
    <path d="M930,1094 L850,1098 L850,1205 L824,1205"/>
    <path d="M940,1092 L866,1088 L872,1205 L850,1205"/>
    <path d="M930,1094 L939,957"/>
    <path d="M937,986 L888,1040 L850,1012"/>
    ${phone(830, 990, -14, true)}
    <circle cx="941" cy="905" r="52" fill="#000"/>
    ${face('B', 941, 905)}
  </g>
</svg>`;

const dialogueCaptions = LINES.map(
  (l, i) => `<div class="clip dcap" data-start="${T.shots[i]}" data-duration="${(T.shots[i + 1] - T.shots[i]).toFixed(3)}">${l.text}</div>`,
).join('\n      ');

function dialogueTweens(): string {
  const out: string[] = [];
  LINES.forEach((l, i) => {
    const t = T.shots[i];
    const d = T.shots[i + 1] - t;
    const from = camAt(CAMERA[l.shot]);
    const to = camAt(CAMERA[l.shot], 1.035);
    out.push(`tl.set('#cam', ${JSON.stringify(from)}, ${t});`);
    out.push(`tl.to('#cam', { ...${JSON.stringify(to)}, duration: ${d.toFixed(3)}, ease: 'none' }, ${t});`);
    // Лица: в общем плане видны оба, на крупном — тот, кто в кадре (у второго — то же лицо, что было).
    for (const who of ['a', 'b'] as const) {
      const k = l[who];
      if (!k) continue;
      const W2 = who.toUpperCase();
      out.push(`tl.set('.face${W2}', { opacity: 0 }, ${t}); tl.set('#face${W2}_${k}', { opacity: 1 }, ${t});`);
    }
  });
  return out.join('\n      ');
}

// ─── «Демо»: телефон, 800 вопросов ─────────────────────────────────────────────

const LAV = '#8f98ff';
/** Значки на экране: знаки, светофор, машина — то, что встречается в билетах. */
const ICONS: string[] = [
  `<path d="M0,-34 L36,28 H-36 Z"/><path d="M0,-12 V8"/><circle cx="0" cy="18" r="2.5" fill="${LAV}"/>`,
  `<circle r="34"/><path d="M-24,24 L24,-24"/>`,
  `<rect x="-17" y="-38" width="34" height="76" rx="10"/><circle cy="-21" r="8"/><circle r="8"/><circle cy="21" r="8"/>`,
  `<rect x="-32" y="-32" width="64" height="64" rx="10"/><path d="M0,20 V-18 M-13,-5 L0,-18 L13,-5"/>`,
  `<rect x="-32" y="-32" width="64" height="64" rx="10"/><path d="M-20,22 L-6,-22 M-4,22 L10,-22 M12,22 L24,-14"/>`,
  `<rect x="-20" y="-34" width="40" height="68" rx="12"/><path d="M-14,-14 h28 M-14,16 h28"/>`,
  `<path d="M-14,-34 h28 l20,20 v28 l-20,20 h-28 l-20,-20 v-28 z"/>`,
  `<circle r="34"/><path d="M-18,0 H16 M4,-12 L16,0 L4,12"/>`,
  `<path d="M0,-38 L38,0 L0,38 L-38,0 Z"/><path d="M0,-20 L20,0 L0,20 L-20,0 Z"/>`,
  `<circle r="34"/><circle r="9"/><path d="M-9,0 H-34 M9,0 H34 M0,9 V34"/>`,
  `<circle r="34"/><path d="M-11,-10 q0,-14 11,-14 q12,0 12,12 q0,9 -11,13 v8"/><circle cx="1" cy="20" r="2.5" fill="${LAV}"/>`,
  `<circle r="34"/><text y="11" text-anchor="middle" font-size="30" font-weight="800" fill="${LAV}" stroke="none">60</text>`,
];
const COLS = [405, 540, 675];
const ROWS = [790, 930, 1070, 1210];
const CELLS = ROWS.flatMap((y, r) => (r % 2 ? [...COLS].reverse() : COLS).map((x) => ({ x, y })));

const demoSvg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="lines">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="290" y="540" width="500" height="960" rx="64" fill="#03050b" stroke="#fff" stroke-width="7"/>
    <rect x="495" y="566" width="90" height="16" rx="8" stroke="#fff" stroke-width="4"/>
    <rect x="330" y="616" width="420" height="64" rx="32" stroke="${LAV}" stroke-width="4"/>
    <circle cx="370" cy="646" r="12" stroke="${LAV}" stroke-width="4"/><path d="M379,655 l10,10" stroke="${LAV}" stroke-width="4"/>
    <text x="402" y="657" font-size="28" font-weight="600" fill="${LAV}">800 вопросов ПДД</text>
    ${CELLS.map(
      (c, i) => `<g transform="translate(${c.x} ${c.y})">
      <g id="ic${i}" stroke="${LAV}" stroke-width="5">${ICONS[i]}</g>
      <g id="ok${i}" opacity="0" stroke="#fff" stroke-width="7"><path d="M-22,0 L-6,16 L24,-18"/></g>
    </g>`,
    ).join('')}
    <rect x="345" y="1330" width="390" height="16" rx="8" stroke="${LAV}" stroke-width="3"/>
    <rect id="bar" x="345" y="1330" width="390" height="16" rx="8" fill="#fff" stroke="none" transform-origin="345 1338" style="transform: scaleX(0)"/>
    ${[0, ...CELLS.map((_, i) => i + 1)]
      .map((k) => `<text id="cnt${k}" class="cnt" x="540" y="1405" text-anchor="middle" font-size="30" font-weight="700" fill="#fff" stroke="none" opacity="${k ? 0 : 1}">${Math.round((k / CELLS.length) * 800)} / 800</text>`)
      .join('')}
    <g id="target" opacity="0" transform="translate(${CELLS.at(-1)!.x} ${CELLS.at(-1)!.y})">
      <circle r="46" fill="rgba(255,122,26,0.35)" stroke="#ff7a1a" stroke-width="4"/>
      <path d="M-58,-34 V-58 H-34 M34,-58 H58 V-34 M58,34 V58 H34 M-34,58 H-58 V34" stroke="#fff" stroke-width="5"/>
    </g>
    <g id="dcar"><rect x="-15" y="-24" width="30" height="48" rx="9" fill="#ffb703" stroke="#fff" stroke-width="3"/><path d="M-9,-10 h18 M-9,12 h18" stroke="#1b2430" stroke-width="3"/></g>
  </g>
</svg>`;

function demoTweens(): string {
  const [t0, t1, t2, t3] = T.demo;
  const out: string[] = [];
  const cam = (fx: number, fy: number, s: number) => ({ x: 540 - fx * s, y: 960 - fy * s, scale: s });
  out.push(`tl.set('#dcam', ${JSON.stringify(cam(540, 1020, 1))}, ${t0});`);
  out.push(`tl.to('#dcam', { ...${JSON.stringify(cam(540, 1020, 1.04))}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0});`);
  out.push(`tl.set('#dcam', ${JSON.stringify(cam(540, 1000, 1.28))}, ${t1});`);
  out.push(`tl.to('#dcam', { ...${JSON.stringify(cam(540, 1000, 1.34))}, duration: ${(t2 - t1).toFixed(3)}, ease: 'none' }, ${t1});`);
  const last = CELLS.at(-1)!;
  out.push(`tl.set('#dcam', ${JSON.stringify(cam(last.x, last.y, 2.6))}, ${t2});`);
  out.push(`tl.to('#dcam', { ...${JSON.stringify(cam(last.x, last.y, 2.75))}, duration: ${(t3 - t2).toFixed(3)}, ease: 'none' }, ${t2});`);
  // Машинка змейкой проезжает значки, каждый становится галочкой.
  const start = t1 + 0.12;
  const step = (t2 - 0.12 - start) / CELLS.length;
  out.push(`tl.set('#dcar', { x: ${CELLS[0].x - 70}, y: ${CELLS[0].y}, rotation: 90, opacity: 1 }, ${t0});`);
  CELLS.forEach((c, i) => {
    const t = start + i * step;
    const prev = CELLS[i - 1];
    const rot = !prev ? 90 : prev.y !== c.y ? 180 : c.x > prev.x ? 90 : -90;
    out.push(`tl.set('#dcar', { rotation: ${rot} }, ${t.toFixed(3)});`);
    out.push(`tl.to('#dcar', { x: ${c.x}, y: ${c.y}, duration: ${(step * 0.9).toFixed(3)}, ease: 'none' }, ${t.toFixed(3)});`);
    const done = t + step * 0.9;
    out.push(`tl.to('#ic${i}', { opacity: 0, duration: 0.08 }, ${done.toFixed(3)});`);
    out.push(`tl.fromTo('#ok${i}', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(2.5)' }, ${done.toFixed(3)});`);
    out.push(`tl.set('.cnt', { opacity: 0 }, ${done.toFixed(3)}); tl.set('#cnt${i + 1}', { opacity: 1 }, ${done.toFixed(3)});`);
    out.push(`tl.to('#bar', { scaleX: ${((i + 1) / CELLS.length).toFixed(3)}, duration: 0.12 }, ${done.toFixed(3)});`);
  });
  out.push(`tl.to('#dcar', { opacity: 0, duration: 0.1 }, ${(t2 - 0.12).toFixed(3)});`);
  out.push(`tl.fromTo('#target', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, ${t2});`);
  return out.join('\n      ');
}

// ─── История: гравюры ──────────────────────────────────────────────────────────

const INK = '#1a1714';
const PAPER = '#d4cec1';

/** Узоры штриховки, бумага и виньетка — общие для всех гравюр. */
const defsSvg = `<svg width="0" height="0" style="position:absolute">
  <defs>
    ${[
      ['hL', 9, 1.3, 35],
      ['hM', 6, 1.6, 35],
      ['hD', 4, 1.9, 35],
      ['hR', 6, 1.5, -40],
      ['hS', 9, 1.1, 90],
      ['hS2', 6, 1.3, 90],
      ['hV', 6, 1.5, 0],
      ['hG', 7, 1.4, 80],
    ]
      .map(([id, gap, w, rot]) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${rot})"><rect width="${gap}" height="${gap}" fill="${PAPER}"/><rect width="${w}" height="${gap}" fill="${INK}"/></pattern>`)
      .join('\n    ')}
    <pattern id="hX" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)"><rect width="6" height="6" fill="${PAPER}"/><rect width="1.8" height="6" fill="${INK}"/><rect width="6" height="1.8" fill="${INK}"/></pattern>
  </defs>
</svg>`;

const ink = `fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
/** Зерно бумаги и виньетка — поверх гравюры (зерно — картинка `grain.png`). */
const paperOverlay = `<div class="grain"></div><div class="vignette"></div>`;
const engraving = (body: string) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/><g ${ink}>${body}</g></svg>${paperOverlay}`;

/** Облако: дуги-«барашки», снизу штриховка. */
function cloud(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-150,30 C-170,-10 -120,-40 -90,-25 C-80,-70 -10,-80 10,-40 C30,-90 110,-70 105,-20 C150,-30 175,20 140,35 Z" fill="${PAPER}"/>
    <path d="M-140,26 C-60,40 60,42 136,30 C110,14 -100,12 -140,26 Z" fill="url(#hL)" stroke="none"/>
  </g>`;
}

/** Биплан (нос вправо), ~580 × 230. */
function biplane(gear = true): string {
  return `<g>
    <path d="M-40,40 L190,40 Q205,47 190,54 L-40,54 Q-52,47 -40,40 Z" fill="url(#hM)"/>
    <path d="M-270,-30 L-120,-22 L180,-34 Q240,-36 250,-8 Q252,20 230,28 L-120,22 L-270,-8 Z" fill="${PAPER}"/>
    <path d="M-266,-12 L-120,6 L232,8 Q250,6 251,0 Q252,20 230,28 L-120,22 L-270,-8 Z" fill="url(#hD)"/>
    <path d="M-255,-28 L-300,-112 L-245,-114 L-200,-26 Z" fill="url(#hL)"/>
    <path d="M-306,-14 L-196,-16 Q-190,-7 -196,0 L-306,-2 Z" fill="url(#hM)"/>
    <path d="M18,-34 q22,-16 46,0" stroke-width="3"/>
    <circle cx="40" cy="-50" r="17" fill="${PAPER}"/><path d="M23,-52 q17,-22 34,0 z" fill="url(#hD)"/><circle cx="34" cy="-56" r="5" fill="${PAPER}"/><circle cx="47" cy="-56" r="5" fill="${PAPER}"/>
    <path d="M60,-104 L70,-34 M118,-104 L116,-34" stroke-width="3"/>
    <path d="M-20,-104 L-10,40 M160,-104 L170,40" stroke-width="5"/>
    <path d="M-20,-104 L170,40 M160,-104 L-10,40" stroke-width="1.6"/>
    <path d="M-62,-122 L212,-122 Q230,-113 212,-104 L-62,-104 Q-76,-113 -62,-122 Z" fill="${PAPER}"/>
    <path d="M-60,-110 L212,-110 Q224,-108 212,-104 L-62,-104 Z" fill="url(#hD)" stroke="none"/>
    <path d="M230,-34 Q262,-34 266,-4 Q262,26 230,28 Z" fill="url(#hX)"/>
    <ellipse cx="272" cy="-3" rx="7" ry="12" fill="${INK}"/>
    <path d="M272,-3 L262,-98 Q272,-104 281,-96 Z M272,-3 L282,92 Q272,98 263,90 Z" fill="url(#hD)"/>
    ${gear ? `<path d="M120,26 L140,96 M192,26 L140,96 M-250,-6 L-266,28"/><circle cx="140" cy="104" r="30" fill="url(#hM)"/><circle cx="140" cy="104" r="7" fill="${PAPER}"/>` : ''}
  </g>`;
}

/** Мехи-гармошка тренажёра. */
function bellows(x: number, top: number, bottom: number, w = 54): string {
  const n = 5;
  const h = (bottom - top) / n;
  let left = '';
  let right = '';
  let folds = '';
  for (let i = 0; i <= n; i++) {
    const y = top + i * h;
    const inset = i % 2 ? 9 : 0;
    left += `${i ? 'L' : 'M'}${x - w / 2 + inset},${y} `;
    right = `L${x + w / 2 - inset},${y} ` + right;
    folds += `M${x - w / 2 + inset},${y} H${x + w / 2 - inset} `;
  }
  return `<path d="${left}${right}Z" fill="url(#hL)"/><path d="${folds}" stroke-width="2"/>`;
}

/** Тренажёр Линка: короткий фюзеляж на шарнире над мехами и подставкой (нос вправо). */
function trainer(): string {
  return `<g>
    <path d="M-300,262 L300,262 L272,222 L-272,222 Z" fill="url(#hM)"/>
    <path d="M-286,262 v18 M286,262 v18 M-200,262 v12 M200,262 v12"/>
    <rect x="-24" y="70" width="48" height="152" fill="url(#hD)"/>
    ${bellows(-190, 120, 222)}${bellows(-80, 120, 222)}${bellows(80, 120, 222)}${bellows(190, 120, 222)}
    <path d="M-230,120 H230" stroke-width="5"/>
    <circle cx="0" cy="66" r="20" fill="${PAPER}"/><circle cx="0" cy="66" r="7" fill="${INK}"/>
    <path d="M-268,-6 C-200,-44 190,-50 258,-22 C292,-8 292,26 258,36 C150,60 -150,56 -268,30 Z" fill="${PAPER}"/>
    <path d="M-268,12 C-150,28 160,30 284,8 C290,24 278,32 258,36 C150,60 -150,56 -268,30 Z" fill="url(#hD)"/>
    <path d="M-258,-4 L-302,-128 L-232,-128 L-182,-22 Z" fill="url(#hL)"/>
    <path d="M-318,6 L-196,4 Q-188,13 -196,22 L-318,22 Z" fill="url(#hM)"/>
    <path d="M-60,30 L150,30 L170,60 L-50,60 Z" fill="url(#hM)"/>
    <path d="M20,-40 q36,-26 76,-6" stroke-width="3"/>
    <circle cx="62" cy="-66" r="24" fill="${PAPER}"/><path d="M38,-68 q24,-32 48,0 z" fill="url(#hD)"/><circle cx="54" cy="-74" r="7" fill="${PAPER}"/><circle cx="72" cy="-74" r="7" fill="${PAPER}"/>
    <path d="M86,-40 L112,-80 L120,-40" fill="${PAPER}" stroke-width="3"/>
  </g>`;
}

/** Комната: стена в вертикальную штриховку, окно, пол из досок. */
function room(horizon: number, window: boolean): string {
  let boards = '';
  for (let x = -600; x <= 1700; x += 110) boards += `M540,${horizon - 300} L${x},${H} `;
  return `<rect x="0" y="0" width="${W}" height="${horizon}" fill="url(#hV)" stroke="none"/>
    ${window ? `<rect x="650" y="300" width="300" height="430" fill="${PAPER}"/><path d="M800,300 V730 M650,515 H950" stroke-width="6"/><path d="M650,730 L560,${horizon} M950,730 L1080,${horizon - 60}" stroke-width="1.5" opacity="0.5"/>` : ''}
    <rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#hL)" stroke="none"/>
    <path d="M0,${horizon} H${W}" stroke-width="5"/>
    <path d="${boards}" stroke-width="1.6" clip-path="url(#floorClip${horizon})"/>
    <clipPath id="floorClip${horizon}"><rect x="0" y="${horizon}" width="${W}" height="${H - horizon}"/></clipPath>`;
}

/** 1. Аэродром: ангар, биплан, ветроуказатель. */
const airfield = engraving(`
  <rect x="0" y="0" width="${W}" height="1160" fill="url(#hS)" stroke="none"/>
  <rect x="0" y="0" width="${W}" height="420" fill="url(#hS2)" stroke="none"/>
  ${cloud(270, 420, 1.3)}${cloud(820, 610, 1.0)}${cloud(560, 250, 0.8)}
  <path d="M0,1150 C120,1110 200,1135 300,1112 C420,1090 520,1130 640,1108 C760,1090 880,1126 1080,1104 L1080,1170 L0,1170 Z" fill="url(#hD)"/>
  <path d="M60,1170 L60,960 Q330,740 600,960 L600,1170 Z" fill="url(#hL)"/>
  <path d="M120,1170 V935 M200,1170 V880 M290,1170 V858 M380,1170 V858 M470,1170 V880 M550,1170 V930" stroke-width="2"/>
  <path d="M190,1170 L190,1010 H470 L470,1170 Z" fill="url(#hX)"/>
  <path d="M600,1150 C620,1090 660,1080 680,1112 C700,1070 750,1072 760,1110 C780,1084 820,1092 820,1150 Z M0,1150 C0,1110 30,1090 50,1120 C60,1100 70,1100 70,1150 Z" fill="url(#hX)"/>
  <rect x="0" y="1170" width="${W}" height="${H - 1170}" fill="url(#hG)" stroke="none"/>
  <rect x="0" y="1560" width="${W}" height="${H - 1560}" fill="url(#hM)" stroke="none"/>
  <path d="M0,1170 H${W}"/>
  <path d="M640,1196 H1080 M640,1214 H1080 ${Array.from({ length: 12 }, (_, i) => `M${650 + i * 38},1186 V1226`).join(' ')}" stroke-width="2.5"/>
  <path d="${Array.from({ length: 26 }, (_, i) => { const x = 20 + i * 41; const y = 1640 + ((i * 53) % 220); return `M${x},${y} l-8,-26 M${x},${y} l3,-30 M${x},${y} l12,-24`; }).join(' ')}" stroke-width="2.5"/>
  <path d="M960,1180 V880 M960,890 L1050,905 L1046,945 L960,935 Z" fill="${PAPER}"/><path d="M990,895 v44 M1020,900 v42" stroke-width="2"/>
  <g transform="translate(560 1370) scale(1.35)">${biplane()}</g>`);

/** 2. Тренажёр Линка в комнате. */
const trainerRoom = (zoom: boolean) =>
  engraving(`
  ${room(1180, true)}
  <g transform="translate(540 ${zoom ? 1000 : 1060}) scale(${zoom ? 1.75 : 1.45})">${trainer()}</g>`);

/** 3. Стол инструктора: карта с неровным курсом и «краб»-самописец, на заднем плане — тренажёр в крене. */
const instructor = engraving(`
  ${room(980, false)}
  <g transform="translate(560 720) rotate(-15) scale(1.05)">${trainer()}</g>
  <path d="M0,1230 L${W},1170 L${W},${H} L0,${H} Z" fill="url(#hR)"/>
  <path d="M0,1230 L${W},1170" stroke-width="7"/>
  <path d="M150,1290 L900,1248 L965,1720 L110,1780 Z" fill="${PAPER}"/>
  <path d="M290,1282 L250,1772 M450,1273 L430,1763 M610,1264 L610,1752 M770,1255 L790,1741 M135,1450 L925,1408 M122,1620 L948,1582" stroke-width="1.4"/>
  <path d="M170,1380 C260,1340 300,1420 380,1390 C440,1370 470,1300 560,1320 M700,1700 C760,1640 850,1660 930,1600" stroke-width="2.5"/>
  <path d="M220,1700 C300,1640 260,1560 360,1540 C450,1520 420,1620 520,1600 C600,1585 560,1480 650,1470 C720,1462 700,1540 760,1520" stroke-width="4" stroke-dasharray="3 12"/>
  <g transform="translate(790 1505) rotate(-8)">
    <rect x="-46" y="-30" width="92" height="60" rx="8" fill="url(#hM)"/>
    <circle cx="-34" cy="38" r="12" fill="${PAPER}"/><circle cx="34" cy="38" r="12" fill="${PAPER}"/><circle cx="0" cy="-40" r="12" fill="${PAPER}"/>
    <path d="M-30,10 L-56,-6" stroke-width="5"/>
  </g>`);

/** 4. Биплан в небе над полями. */
const flight = engraving(`
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hS)" stroke="none"/>
  <rect x="0" y="0" width="${W}" height="380" fill="url(#hS2)" stroke="none"/>
  ${cloud(200, 380, 1.1)}${cloud(860, 300, 0.9)}${cloud(780, 1240, 1.4)}
  <path d="M0,1500 L1080,1440 L1080,1920 L0,1920 Z" fill="url(#hG)"/>
  <path d="M0,1500 L1080,1440 M0,1640 L1080,1560 M360,1480 L250,1920 M720,1460 L760,1920" stroke-width="3"/>
  <path d="M0,1640 L360,1610 L300,1920 L0,1920 Z" fill="url(#hM)"/>
  <path d="M720,1580 L1080,1560 L1080,1920 L760,1920 Z" fill="url(#hR)"/>
  <g transform="translate(540 860) rotate(-11) scale(1.45)">${biplane(false)}</g>`);

const HISTORY = [
  { label: 'Бингемтон, США, 1929', art: airfield },
  { label: 'Пилотов учили летать,<br>не отрываясь от земли', art: trainerRoom(false) },
  { label: 'Пилотов учили летать,<br>не отрываясь от земли', art: trainerRoom(true) },
  { label: 'Ошибались —<br>и ничего не разбивали', art: instructor },
  { label: 'И взлетали уже готовыми', art: flight },
];

function historyHtml(): string {
  const shots = HISTORY.map((h, i) => {
    const t = T.history[i];
    const d = T.history[i + 1] - t;
    return `<div class="clip hshot" id="h${i}" data-start="${t}" data-duration="${d.toFixed(3)}">
          <div class="hart" id="hart${i}">${h.art}</div>
          <div class="hlabel">${h.label}</div>
        </div>`;
  }).join('\n        ');
  // 6. «Сегодня так учат ПДД»: город из игры гравюрой, внутри телефона — настоящая игра.
  const t = T.history[5];
  return `${shots}
        <div class="clip hshot" id="h5" data-start="${t}" data-duration="${(T.history[6] - t).toFixed(3)}">
          <div class="hart" id="hart5">
            <img class="city-old" src="city.png" alt="" />
            <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><rect width="${W}" height="${H}" fill="url(#hL)" style="mix-blend-mode:multiply" opacity="0.45"/></svg>${paperOverlay}
          </div>
          <div id="nowPhone"><video class="clip" id="nowVideo" src="drive.mp4" data-start="${t}" data-duration="${(T.history[6] - t).toFixed(3)}" data-media-start="0.6" muted playsinline></video></div>
          <svg class="lines" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><rect id="nowFrame" x="300" y="430" width="480" height="1040" rx="58" fill="none" stroke="#fff" stroke-width="8" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
          <div class="hlabel">Сегодня так учат ПДД</div>
        </div>`;
}

function historyTweens(): string {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const t = T.history[i];
    const d = T.history[i + 1] - t;
    out.push(`tl.fromTo('#hart${i}', { scale: 1 }, { scale: 1.07, duration: ${d.toFixed(3)}, ease: 'none' }, ${t});`);
    // Вспышка на склейке — как в образце.
    if (i) out.push(`tl.set('#flash', { opacity: 0.55 }, ${t}); tl.set('#flash', { opacity: 0 }, ${(t + 0.034).toFixed(3)});`);
  }
  const t = T.history[5];
  out.push(`tl.to('#nowFrame', { attr: { 'stroke-dashoffset': 0 }, duration: 0.55, ease: 'power2.inOut' }, ${(t + 0.1).toFixed(3)});`);
  out.push(`tl.fromTo('#nowPhone', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${(t + 0.5).toFixed(3)});`);
  return out.join('\n      ');
}

// ─── Сравнение, призыв, «Ссылка в био» ────────────────────────────────────────

const BOOK = `<path d="M-30,-18 Q-15,-26 0,-18 Q15,-26 30,-18 V22 Q15,14 0,22 Q-15,14 -30,22 Z M0,-18 V22"/>`;
const PAD = `<path d="M-26,-12 H26 Q36,-12 36,2 L38,16 Q38,26 28,24 L16,12 H-16 L-28,24 Q-38,26 -38,16 L-36,2 Q-36,-12 -26,-12 Z"/><path d="M-22,-2 h12 M-16,-8 v12" /><circle cx="17" cy="-4" r="2.5" fill="#fff"/><circle cx="24" cy="2" r="2.5" fill="#fff"/>`;
const ROWS_TXT: [string, string][] = [
  ['усыпляет', 'затягивает'],
  ['читаешь билеты', 'проезжаешь билеты'],
  ['боишься экзамена', 'экзамен боится тебя'],
];

const tableHtml = `<div class="clip" id="table" data-start="${T.table}" data-duration="${(T.tableEnd - T.table).toFixed(3)}">
          <svg class="lines" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
            <g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
              <path id="tv" d="M540,750 V1150" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
              <path id="th" d="M190,900 H890" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
              <g id="ticonL" transform="translate(370 795) scale(1.15)" opacity="0">${BOOK}</g>
              <g id="ticonR" transform="translate(710 795) scale(1.15)" opacity="0">${PAD}</g>
              <rect id="tpick" x="552" y="734" width="316" height="400" rx="20" stroke="#ff7a1a" stroke-width="5" opacity="0"/>
            </g>
          </svg>
          <div class="tlabel" id="tlabL" style="left:210px">ЗУБРЁЖКА</div>
          <div class="tlabel" id="tlabR" style="left:550px">ИГРА</div>
          ${ROWS_TXT.map(
            ([l, r], i) => `<div class="trow" id="trowL${i}" style="left:210px;top:${930 + i * 62}px">${l}</div>
          <div class="trow" id="trowR${i}" style="left:550px;top:${930 + i * 62}px">${r}</div>`,
          ).join('\n          ')}
        </div>`;

function tableTweens(): string {
  const t = T.table;
  const out = [
    `tl.to('#tv', { attr: { 'stroke-dashoffset': 0 }, duration: 0.3, ease: 'power2.out' }, ${t});`,
    `tl.to('#th', { attr: { 'stroke-dashoffset': 0 }, duration: 0.35, ease: 'power2.out' }, ${t + 0.05});`,
    `tl.to(['#ticonL', '#ticonR', '#tlabL', '#tlabR'], { opacity: 1, duration: 0.25 }, ${t + 0.15});`,
  ];
  T.rows.forEach((r, i) => out.push(`tl.fromTo(['#trowL${i}', '#trowR${i}'], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, ${r});`));
  out.push(`tl.fromTo('#tpick', { opacity: 0, scale: 1.08, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15 }, ${T.pick});`);
  return out.join('\n      ');
}

const ctaHtml = `<div class="clip cta" id="cta" data-start="${T.stop}" data-duration="${(T.bio - T.stop).toFixed(3)}">
          <div id="cta1">Хватит</div>
          <div id="cta2">зубрить</div>
          <div id="cta3" class="orange">начни играть</div>
        </div>
        <div class="clip" id="bio" data-start="${T.bio}" data-duration="${(T.end - T.bio).toFixed(3)}">
          <div id="bioIcon">
            <svg viewBox="0 0 200 200" width="200" height="200"><path d="M10,52 V10 H52 M148,10 H190 V52 M190,148 V190 H148 M52,190 H10 V148" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>
            <img src="data:image/png;base64,${appIcon}" alt="" />
          </div>
          <div id="bioText">Ссылка в био</div>
        </div>`;

function ctaTweens(): string {
  return [
    `tl.set('#cta2', { opacity: 0 }, ${T.stop}); tl.set('#cta3', { opacity: 0 }, ${T.stop});`,
    `tl.fromTo('#cta1', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' }, ${T.stop});`,
    `tl.fromTo('#cta2', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' }, ${T.stop2});`,
    `tl.fromTo('#cta3', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(2)' }, ${T.play});`,
    `tl.fromTo('#bioIcon', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.8)' }, ${T.bio});`,
    `tl.fromTo('#bioText', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }, ${T.bio + 0.1});`,
    `tl.to('#bioIcon', { scale: 1.06, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 2 }, ${T.bio + 0.5});`,
  ].join('\n      ');
}

// ─── Страница ──────────────────────────────────────────────────────────────────

const html = `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Курьер ПДД — реклама для TikTok</title>
    <script src="gsap.min.js"></script>
    <style>
      @font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'Montserrat'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; }
      .scene { position: absolute; inset: 0; overflow: hidden; }
      .lines { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.85)) drop-shadow(0 0 14px rgba(140, 170, 255, 0.45)); }
      .spot { position: absolute; inset: 0; background: radial-gradient(42% 30% at 82% 44%, rgba(46, 86, 210, 0.55), rgba(20, 40, 120, 0.18) 55%, rgba(0, 0, 0, 0) 80%); }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
      .dcap { position: absolute; left: 70px; right: 70px; top: 430px; text-align: center; font-size: 42px; font-weight: 700; line-height: 1.3; letter-spacing: -0.3px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8); }
      .demo-spot { position: absolute; inset: 0; background: radial-gradient(50% 36% at 50% 50%, rgba(46, 86, 210, 0.45), rgba(0, 0, 0, 0) 75%); }
      .hshot { position: absolute; inset: 0; overflow: hidden; background: ${PAPER}; }
      .hart { position: absolute; inset: 0; transform-origin: 50% 45%; }
      .grain { position: absolute; inset: 0; background: url(grain.png); opacity: 0.85; }
      .vignette { position: absolute; inset: 0; background: radial-gradient(75% 60% at 50% 45%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.5) 100%); }
      .city-old { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.7) brightness(1.08) sepia(0.35); }
      #nowPhone { position: absolute; left: 304px; top: 434px; width: 472px; height: 1032px; border-radius: 54px; overflow: hidden; background: #000; }
      #nowPhone video { width: 100%; height: 100%; object-fit: cover; }
      .hlabel { position: absolute; left: 50%; top: 300px; transform: translateX(-50%); max-width: 860px; padding: 16px 26px; background: rgba(24, 22, 20, 0.88);
        border: 2px solid rgba(240, 236, 228, 0.8); color: #f2efe8; font-size: 27px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; text-align: center; line-height: 1.4; white-space: nowrap; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
      .tlabel { position: absolute; top: 846px; width: 320px; text-align: center; font-size: 34px; font-weight: 800; letter-spacing: 3px; opacity: 0; }
      .trow { position: absolute; width: 320px; text-align: center; font-size: 25px; font-weight: 600; color: rgba(255, 255, 255, 0.88); opacity: 0; }
      .cta { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; font-size: 76px; font-weight: 800; line-height: 1.12; letter-spacing: -1px; }
      .orange { color: #ff7a1a; }
      #bio { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }
      #bioIcon { position: relative; width: 200px; height: 200px; }
      #bioIcon svg { position: absolute; inset: 0; filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.7)); }
      #bioIcon img { position: absolute; left: 38px; top: 38px; width: 124px; height: 124px; border-radius: 28px; }
      #bioText { margin-top: 34px; font-size: 44px; font-weight: 500; }
    </style>
  </head>
  <body>
    ${defsSvg}
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.end}" data-volume="1"></audio>

      <div class="clip scene" id="dialogue" data-start="0" data-duration="${T.shots[7]}">
        <div class="spot"></div>
        <div class="cam" id="cam">${dialogueSvg}</div>
        ${dialogueCaptions}
      </div>

      <div class="clip scene" id="demo" data-start="${T.demo[0]}" data-duration="${(T.demo[3] - T.demo[0]).toFixed(3)}">
        <div class="demo-spot"></div>
        <div class="cam" id="dcam">${demoSvg}</div>
      </div>

      <div class="clip scene" id="history" data-start="${T.history[0]}" data-duration="${(T.history[6] - T.history[0]).toFixed(3)}">
        ${historyHtml()}
      </div>

      ${tableHtml}
      ${ctaHtml}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.set('.faceA', { opacity: 0 }, 0); tl.set('.faceB', { opacity: 0 }, 0);
      ${dialogueTweens()}
      ${demoTweens()}
      ${historyTweens()}
      ${tableTweens()}
      ${ctaTweens()}
      tl.set({}, {}, ${T.end});
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

writeFileSync(new URL('index.html', dir), html);
console.log(`trailer/ad/video/index.html: ${T.end} с`);
