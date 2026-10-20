/**
 * 37. «Он сдал теорию — и уехал в больницу» — по формуле cwex (`engine6.ts`), как ролики 34 и 36:
 * реальная история про экзамен → сказка на гравюре → расчёт → итог → вывод.
 *
 * История (РИА «Новости», Life, Anti-Malware, июль 2026): житель Чувашии нашёл в Telegram «помощника» на экзамене,
 * купил микронаушник, сначала сдал теорию с подсказками; инспектору поведение показалось подозрительным, а наушник
 * провалился глубоко в ушной канал — его извлекали в больнице. Уголовное дело за незаконный оборот спецсредств
 * для негласного получения информации, штраф 50 000 ₽.
 * Сказка — «О рыбаке и рыбке» А. С. Пушкина: старуха хотела всё больше и осталась у разбитого корыта.
 * Расчёт: с 12 мая 2026 года (постановление Правительства № 508) экзамен, остановленный или аннулированный за
 * использование средств связи, можно пересдать не раньше чем через 12 месяцев; обычная пересдача — через 7 дней.
 * Источники — README.
 */
import { chair, desk, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { cloud, fig, ground, sea, sh, sky, wh } from '../etch.ts';
import { cottage } from '../etch2.ts';
import { text } from '../kit.ts';

const N = C.night;
const A = C.accent;

// ─── Завязка: светящиеся человечки ────────────────────────────────────────────

/** Кандидат за компьютером: на экране «СДАНО», в ухе — оранжевая точка. */
const student = person(DLG, { id: 'S', x: 300, floor: 1400, pose: 'sit', seat: 110, f: 1, arms: ['table', 'table'], table: 1250, hair: 'spiky', face: 'smirk' });
const exam = `
  ${floorLine(1400)}
  ${chair(300, 1400, 1, 110)}
  ${desk(420, 880, 1250, 1400)}
  <path d="M650,1250 V1172 M596,1250 H704"/>
  <rect x="490" y="950" width="320" height="222" rx="16" fill="${N}"/>
  <path d="M610,1030 l26,26 l52,-52" stroke="${A}" stroke-width="12" fill="none"/>${text(650, 1130, 34, '#fff', 'СДАНО', 'letter-spacing="2"')}
  ${student.svg}
  <circle id="sc-ear" cx="${student.head.x - 30}" cy="${student.head.y + 6}" r="9" fill="${A}" stroke="none"/>`;

/** Инспектор подходит и показывает на кандидата. */
const cand = person(DLG, { id: 'C', x: 300, floor: 1400, pose: 'sit', seat: 110, f: 1, arms: ['table', 'table'], table: 1250, hair: 'spiky', face: 'shock' });
const insp = person(DLG, { id: 'I', x: 820, floor: 1400, pose: 'stand', f: -1, arms: ['point', 'hip'], hair: 'cap', face: 'angry' });
const caught = `
  ${floorLine(1400)}
  ${chair(300, 1400, 1, 110)}
  ${desk(420, 700, 1250, 1400)}
  ${cand.svg}
  ${insp.svg}
  <g id="sc-q">${text(560, 900, 120, A, '!')}</g>`;

/** Мост: разбитое корыто (светящийся контур). */
const trough = `
  ${floorLine(1460)}
  <path d="M260,1300 H820 L760,1440 H320 Z" fill="${N}"/>
  <path d="M250,1300 H830" stroke-width="10"/>
  <path d="M520,1300 L548,1350 L512,1385 L556,1440" stroke="${A}" stroke-width="8" fill="none"/>
  <path d="M300,1330 Q290,1380 320,1440 M780,1330 Q790,1380 760,1440" stroke-width="5"/>`;

// ─── Карточки завязки ──────────────────────────────────────────────────────────

const bubble = (id: string, x: number, y: number, w: number, lines: string[], mine = false) =>
  `<g id="${id}" opacity="0"><rect x="${x}" y="${y}" width="${w}" height="${30 + lines.length * 44}" rx="22" fill="${mine ? A : '#1d2533'}"/>
    ${lines.map((l, i) => `<text x="${x + 26}" y="${y + 50 + i * 44}" font-size="31" font-weight="700" fill="${mine ? N : '#e8ecf3'}">${l}</text>`).join('')}</g>`;
const chat = `<div class="card" style="left:120px;top:500px;width:840px;height:520px">
  <div class="ch">Telegram<span class="tag">помощь на экзамене</span></div>
  <svg viewBox="0 0 840 520" width="840" height="520" style="position:absolute;left:0;top:0">
    ${bubble('m1', 36, 120, 620, ['Сдадим теорию ГИБДД за вас.', 'Микронаушник + подсказчик'])}
    ${bubble('m2', 36, 260, 520, ['Ответы — в реальном времени'])}
    ${bubble('m3', 520, 380, 284, ['Беру'], true)}
  </svg>
</div>`;

/** Ухо в разрезе: наушник уходит по каналу вглубь. */
const ear = `<div class="card" style="left:120px;top:500px;width:840px;height:620px">
  <div class="ch">Ушной канал<span class="tag">в разрезе</span></div>
  <svg viewBox="0 0 840 620" width="840" height="620" style="position:absolute;left:0;top:0">
    <path d="M200,150 Q60,170 70,340 Q80,500 210,540 Q270,556 290,500 Q300,460 250,440 Q190,420 200,360" fill="none" stroke="#e8ecf3" stroke-width="10" stroke-linecap="round"/>
    <path d="M230,330 Q380,300 520,330 Q640,356 720,330" fill="none" stroke="#e8ecf3" stroke-width="6"/>
    <path d="M230,390 Q380,410 520,392 Q640,376 720,396" fill="none" stroke="#e8ecf3" stroke-width="6"/>
    <path d="M720,322 V404" stroke="#8b93a3" stroke-width="6" stroke-dasharray="10 8"/>
    <text x="720" y="296" text-anchor="middle" font-size="26" font-weight="700" fill="#8b93a3">перепонка</text>
    <rect id="bud" x="214" y="342" width="44" height="36" rx="16" fill="${A}"/>
    <text x="520" y="500" text-anchor="middle" font-size="30" font-weight="800" fill="#e8ecf3">вынуть сам не смог</text>
  </svg>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [t0, t1, t2, t3] = T.hook;
  return [
    // Точка в ухе мигает.
    `tl.fromTo('#s0-ear', { opacity: 0.2 }, { opacity: 1, duration: 0.35, repeat: 7, yoyo: true, ease: 'sine.inOut' }, ${(t0 + 0.4).toFixed(3)});`,
    `tl.fromTo('#m1', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2 }, ${(t1 + 0.25).toFixed(3)});`,
    `tl.fromTo('#m2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2 }, ${(t1 + 0.9).toFixed(3)});`,
    `tl.fromTo('#m3', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2 }, ${(t1 + 1.8).toFixed(3)});`,
    pop('#s2-q', t2 + 0.15, 0.2),
    `tl.fromTo('#bud', { x: 0 }, { x: 410, duration: 1.4, ease: 'power2.in' }, ${(t3 + 0.3).toFixed(3)});`,
  ].join('\n      ');
};

// ─── Сказка на гравюре: «О рыбаке и рыбке» ────────────────────────────────────

const I = C.ink;
/** Корыто с трещиной. */
const tub = (x: number, y: number) => `
  ${sh(`M${x - 120},${y - 70} H${x + 120} L${x + 96},${y} H${x - 96} Z`, 'a60', 'stroke-width="4"')}
  <path d="M${x - 130},${y - 70} H${x + 130}" stroke-width="7"/>
  <path d="M${x - 6},${y - 70} L${x + 12},${y - 44} L${x - 10},${y - 24} L${x + 8},${y}" stroke-width="5"/>
  ${wh(`M${x + 120},${y + 6} L${x + 170},${y - 4} L${x + 160},${y + 12} Z`, 'stroke-width="3"')}`;

/** Золотая рыбка с короной. */
const fish = (x: number, y: number) => `
  ${sh(`M${x - 80},${y} Q${x - 30},${y - 50} ${x + 40},${y - 20} L${x + 90},${y - 50} L${x + 80},${y} L${x + 90},${y + 50} L${x + 40},${y + 20} Q${x - 30},${y + 50} ${x - 80},${y} Z`, 'b30', 'stroke-width="4"')}
  <circle cx="${x - 50}" cy="${y - 6}" r="7" fill="${I}"/>
  <path d="M${x - 10},${y - 30} Q${x + 4},${y} ${x - 10},${y + 30}" stroke-width="2.5"/>
  ${wh(`M${x - 64},${y - 34} l6,-30 l12,18 l10,-24 l10,24 l12,-18 l6,30 Z`, 'stroke-width="3"')}`;

const tableau = `
  ${sky()}
  ${cloud(260, 560, 220)}${cloud(880, 680, 200)}
  ${ground(1200, -400, 700)}
  ${sea(1200, 700, 1480)}
  ${cottage(40, 1300, 280)}
  ${fig({ x: 230, y: 1316, s: 0.9, f: 1, dress: 'dress', pat: 'a30', sleeve: 'a60', hair: 'kerchief', face: 'sad', nod: 14, leg: [4, 0], leg2: [-6, 0], arm: [36, 20], arm2: [14, 10] })}
  ${tub(400, 1470)}
  ${fig({ x: 600, y: 1316, s: 0.9, f: 1, dress: 'tunic', pat: 'a120', sleeve: 'c60', legs: 'b90', hair: 'long', beard: true, face: 'calm', leg: [10, 0], leg2: [-8, 0], arm: [92, 18], arm2: [70, 30] })}
  <path d="M700,1170 Q790,1230 860,1350" stroke-width="2.5" stroke-dasharray="6 6"/>
  <g id="gf">${fish(960, 1380)}</g>`;

// ─── Расчёт: что стоила подсказка ─────────────────────────────────────────────

const rows = [
  ['50 000 ₽', 'штраф по решению суда'],
  ['ДЕЛО', 'уголовное — за спецсредство'],
  ['0', 'результат экзамена'],
];
const info = {
  html: `
    ${itext('i-h', 330, 40, 'СКОЛЬКО СТОИЛА<br>ПОДСКАЗКА')}
    ${rows
      .map(
        ([a, b], i) => `<div id="r${i}" style="position:absolute;left:130px;right:130px;top:${500 + i * 150}px;height:120px;border-radius:24px;background:#141b27;opacity:0">
      <div style="position:absolute;left:34px;top:24px;font-size:56px;font-weight:900;color:${A}">${a}</div>
      <div style="position:absolute;left:34px;top:84px;font-size:26px;font-weight:700;color:#c9d1de">${b}</div></div>`,
      )
      .join('')}
    ${itext('i-x', 1000, 40, 'А С 12 МАЯ 2026 ПОЙМАННЫМ —', '#fff', 800)}
    ${itext('i-n', 1080, 64, 'ПЕРЕСДАЧА ТОЛЬКО', '#fff', 900)}
    ${itext('i-big', 1180, 150, 'ЧЕРЕЗ ГОД', A, 900)}
    ${itext('i-s', 1370, 32, 'ОБЫЧНО — ЧЕРЕЗ 7 ДНЕЙ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...rows.map((_, i) => `tl.fromTo('#r${i}', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.22, ease: 'power3.out' }, ${(t[1] + i * 0.35).toFixed(3)});`),
      show('#i-x', t[3]),
      show('#i-n', t[4]),
      pop('#i-big', t[5], 0.22),
      show('#i-s', t[5] + 0.3),
    ].join('\n      '),
};

export const v37: Video6 = {
  id: '37-naushnik',
  title: 'Реклама: наушник на экзамене',
  scenes: { exam, caught, trough },
  shots: [
    { scene: 'exam', cam: [545, 1180, 1.25], to: [525, 1180, 1.36], cap: 'Он сдал теорию —<br>и уехал в больницу', sub: 'Чувашия, 2026 · реальная история', faces: { S: 'smirk' } },
    { cap: 'Нашёл «помощника»<br>в Telegram', ui: chat },
    { scene: 'caught', cam: [560, 1200, 1.15], to: [560, 1180, 1.25], cap: 'Инспектор:<br>«Сдайте устройство»', faces: { C: 'shock', I: 'angry' } },
    { cap: 'А микронаушник<br>провалился глубоко в ухо', ui: ear },
    { scene: 'trough', cam: [540, 1380, 1.0], to: [540, 1380, 1.06], cap: 'Как старуха<br>у разбитого корыта', accent: true },
  ],
  hookTweens,
  tableau,
  story: [
    { fx: 560, fy: 1250, s: 0.95, ds: 1.04, label: 'Пушкин. «Сказка<br>о рыбаке и рыбке»' },
    { fx: 950, fy: 1380, s: 1.9, label: 'Золотая рыбка<br>давала всё — даром' },
    { fx: 250, fy: 1250, s: 1.7, label: 'Старуха хотела<br>больше и больше' },
    { fx: 980, fy: 1260, s: 1.5, label: 'Пока рыбка<br>не уплыла' },
    { fx: 400, fy: 1440, s: 1.9, ds: 1.04, label: 'И осталась старуха<br>у разбитого корыта' },
    { fx: 560, fy: 1250, s: 0.92, ds: 1.06, label: 'Лёгкий путь привёл<br>обратно к началу' },
  ],
  // Рыбка уходит в море — дальше на гравюре её нет.
  extra: (T) => `tl.to('#gf', { x: 180, y: 90, opacity: 0, duration: 0.8, ease: 'power2.in' }, ${(T.story[3] + 0.45).toFixed(3)});`,
  info,
  outcome: { title: 'Вместо прав —<br>судимость', sub: `и штраф <span style="color:${A}">50 000 ₽</span> · суд в Чувашии, 2026` },
  cta: { lines: ['Подсказка в ухе —', 'судимость.', 'Знания в голове —', 'права.'], accent: 3 },
  bioGlyph: `<rect x="-40" y="-40" width="80" height="80" rx="6"/><path d="M-40,0 H40 M0,-40 V40"/><rect x="0" y="0" width="40" height="40" fill="${A}" stroke="none"/>`,
};
