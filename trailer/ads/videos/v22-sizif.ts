/**
 * 22. «Опять не сдал теорию и учу с нуля» — стол с горой учебников.
 * История-гравюра: миф о Сизифе — вечно катит камень в гору, а камень скатывается вниз.
 * Инфографика: пересдача теории — не раньше чем через 7 дней.
 */
import { books, chair, desk, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { cloud, fig, ground, rock, sh, sky } from '../etch.ts';
import { bolt, boulder, temple } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['chin', 'table'], table: 1170, hair: 'curly', face: 'sad' });
const B = person(DLG, { id: 'B', x: 850, floor: 1300, pose: 'stand', f: -1, arms: ['down', 'hip'], hair: 'long', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  <rect x="470" y="660" width="190" height="170" fill="${C.night}"/><path d="M470,700 H660 M470,740 H660 M470,780 H660 M517,700 V830 M565,700 V830 M612,700 V830" stroke-width="3"/>
  <path d="M478,708 l30,26 M508,708 l-30,26 M525,708 l30,26 M555,708 l-30,26 M573,708 l30,26 M603,708 l-30,26" stroke-width="3"/>
  ${chair(330, 1300, 1, 110)}
  ${desk(440, 720, 1170, 1300)}
  ${books(620, 1170, 7)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const TH = Math.atan2(490, 780);
const deg = (TH * 180) / Math.PI;
const P = (t: number): [number, number] => [260 + 780 * t, 1760 - 490 * t];
const n: [number, number] = [-Math.sin(TH), -Math.cos(TH)];

/** Сизиф толкает камень (на склоне в точке t). */
const pair = (id: string, t: number, cls: string, hidden = true) => {
  const [x, y] = P(t);
  return `<g class="${cls}" ${hidden ? 'opacity="0"' : ''}><g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-deg).toFixed(2)})">
    ${boulder(id, 175, -140, 140, 9)}
    ${fig({ x: -60, y: -182, lean: 50, nod: -10, arm: [80, 20], arm2: [70, 30], leg: [40, 50], leg2: [-30, 0], dress: 'none', beard: true, hair: 'short', face: 'sad' })}
  </g></g>`;
};

const rollFrom = ((t: number) => [P(t)[0] + 140 * n[0], P(t)[1] + 140 * n[1]])(0.75);
const rollTo = ((t: number) => [P(t)[0] + 140 * n[0], P(t)[1] + 140 * n[1]])(0.2);
const dist = Math.hypot(rollTo[0] - rollFrom[0], rollTo[1] - rollFrom[1]);

const rolling = `<g class="s3" opacity="0">
  ${fig({ x: 930, y: 1132, arm: [165, 10], arm2: [150, 20], nod: -24, dress: 'none', beard: true, hair: 'short', face: 'shout' })}
  <g transform="translate(${rollFrom[0].toFixed(1)} ${rollFrom[1].toFixed(1)})"><g id="roll">${boulder('b3', 0, 0, 140, 9)}</g></g>
  <path d="M${(rollFrom[0] + 120).toFixed(0)},${(rollFrom[1] - 150).toFixed(0)} l80,-50 M${(rollFrom[0] + 160).toFixed(0)},${(rollFrom[1] - 90).toFixed(0)} l90,-56 M${(rollFrom[0] + 150).toFixed(0)},${(rollFrom[1] - 20).toFixed(0)} l70,-44" stroke-width="5"/>
</g>`;

const bottom = `<g class="s4" opacity="0">
  ${boulder('b4', 130, 1620, 140, 9)}
  ${fig({ x: 690, y: 1290, f: -1, lean: 8, nod: 26, arm: [-8, 10], arm2: [12, 10], leg: [22, 0], leg2: [-18, 14], dress: 'none', beard: true, hair: 'short', face: 'closed' })}
</g>`;

const groove = `<path d="M${P(0.04)[0]},${P(0.04)[1] - 8} L${P(0.95)[0]},${P(0.95)[1] - 8} M${P(0.04)[0]},${P(0.04)[1] - 20} L${P(0.95)[0]},${P(0.95)[1] - 20}" stroke-width="3" stroke-dasharray="18 10"/>`;

const tableau = `
  ${sky()}
  ${sh('M-400,1400 L-120,1150 L60,1290 L260,1080 L470,1260 L620,1140 L760,1300 L900,1200 L1100,1300 L1500,1160 L1500,1800 L-400,1800 Z', 'c30')}
  ${ground(1760)}
  ${rock('mtn', 'M260,1762 L1040,1270 L1500,1270 L1500,2400 L260,2400 Z', [250, 1250, 1270, 1180], 115, 31)}
  ${cloud(990, 920, 220)}
  ${bolt(420, 700, 1.15)}
  ${cloud(300, 650, 470)}
  ${temple(300, 590, 300)}
  ${pair('b1', 0.35, 's1', false)}
  ${pair('b2', 0.8, 's2')}
  ${rolling}
  ${bottom}
  <g class="st-a">${groove}${pair('b5', 0.06, 'again', false)}</g>`;

// ─── Инфографика: 7 дней ──────────────────────────────────────────────────────

const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const cell = (i: number, fill: string, cls: string) =>
  `<g class="${cls}" id="${cls}${i}"><rect x="${540 + (i - 3) * 132 - 55}" y="690" width="110" height="110" rx="14" fill="${fill}" stroke="${fill === 'none' ? '#fff' : C.accent}" stroke-width="6"/>
   <text x="${540 + (i - 3) * 132}" y="758" text-anchor="middle" font-size="30" font-weight="800" fill="${fill === 'none' ? '#fff' : '#000'}" letter-spacing="1">${days[i]}</text></g>`;

const info = {
  html: `
    ${itext('i-h', 470, 40, 'НЕ СДАЛ ТЕОРИЮ?')}
    ${isvg(`${days.map((_, i) => cell(i, 'none', 'dw')).join('')}${days.map((_, i) => cell(i, C.accent, 'do')).join('')}`)}
    ${itext('i-n', 880, 150, '7 ДНЕЙ', C.accent, 900)}
    ${itext('i-s', 1090, 46, 'ЖДАТЬ ПЕРЕСДАЧУ —<br>МИНИМУМ')}
    ${itext('i-y', 1260, 30, 'А ПОСЛЕ 3-Й НЕУДАЧИ — ДОЛЬШЕ', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...days.map((_, i) => pop(`#dw${i}`, t[0] + 0.04 * i)),
      `tl.set('.do', { opacity: 0 }, 0);`,
      ...days.map((_, i) => `tl.set('#do${i}', { opacity: 1 }, ${(t[1] + 0.05 * i).toFixed(3)});`),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v22: Video3 = {
  id: '22-sizif',
  title: 'Реклама: Сизиф',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Опять не сдал теорию»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Это какой раз?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Второй. Снова учу с нуля»', cams: ['a', [640, 1080, 2.6]], a: 'tired' },
    { text: '«А что учил в прошлый раз?»', cams: ['b', 'b'], b: 'think' },
    { text: '«Всё. И всё забыл»', cams: ['a', [565, 760, 2.4]], a: 'sad' },
    { text: '«Ты как Сизиф»', cams: ['b', 'ab'], b: 'calm' },
    { text: '«Кто?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Тот, что вечно<br>катил камень в гору»', cams: ['b', 'wide'], a: 'shock', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Миф о Сизифе' },
    { fx: 320, fy: 620, s: 1.9, label: 'Боги наказали его' },
    { fx: 540, fy: 1450, s: 1.9, dx: 20, label: 'Катить камень в гору' },
    { fx: 840, fy: 1250, s: 1.9, label: 'У самой вершины…', on: '.s2', off: '.s1' },
    { fx: 660, fy: 1320, s: 1.25, ds: 1.02, label: 'Камень скатывался вниз', on: '.s3', off: '.s2' },
    { fx: 400, fy: 1500, s: 1.5, label: 'И всё сначала. Вечно', on: '.s4', off: '.s3' },
  ],
  after: [
    { fx: 560, fy: 1080, s: 1.02, off: '.s4' },
    { fx: 400, fy: 1560, s: 1.9 },
    { fx: 980, fy: 1240, s: 1.8 },
    { fx: 320, fy: 660, s: 1.5, ds: 1.08 },
  ],
  extra: (T) =>
    `tl.fromTo('#roll', { x: 0, y: 0, rotation: 0 }, { x: ${(rollTo[0] - rollFrom[0]).toFixed(1)}, y: ${(rollTo[1] - rollFrom[1]).toFixed(1)}, rotation: ${(-(dist / 140) * (180 / Math.PI)).toFixed(1)}, transformOrigin: '50% 50%', duration: ${(T.story[5] - T.story[4] - 0.1).toFixed(3)}, ease: 'power1.in' }, ${T.story[4]});`,
  info,
  cta: { lines: ['Хватит', 'катить', 'камень'], accent: 1 },
  bioGlyph: '<circle cx="-4" cy="10" r="26"/><path d="M-40,40 L40,-30 M24,-34 L40,-30 L36,-14"/>',
};
