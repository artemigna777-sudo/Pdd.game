/**
 * 25. «Знаки учить не буду — навигатор скажет» — улица со знаком «Уступи дорогу».
 * История-гравюра: «Титаник», 14 апреля 1912: за день — 6 предупреждений о льде, скорость 22 узла,
 * ночь без луны; айсберг заметили слишком поздно, удар — в 23:40.
 * Инфографика: в 4 из 10 вопросов билетов — дорожные знаки (320 из 800, данные игры).
 */
import { floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { fig, sea, sh, sky, wh } from '../etch.ts';
import { iceberg, lifeboat, starDots, steamer } from '../etch2.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'stand', f: 1, arms: ['phone', 'down'], hair: 'cap', face: 'cool' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'stand', f: -1, arms: ['point', 'down'], hair: 'curly', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  <path d="M-100,1380 H1200" stroke-width="5" stroke-dasharray="50 40"/>
  <path d="M570,1300 V880" stroke-width="7"/>
  <path d="M480,740 H660 L570,900 Z" fill="${C.night}" stroke-width="7"/><path d="M512,760 H628 L570,864 Z" stroke-width="3"/>
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const WL = 1330;
const ship = steamer(470, WL, 0.85);
const slips = [[160, 760, -12], [300, 640, 8], [440, 740, -6], [590, 630, 10], [720, 730, -10], [860, 650, 6]]
  .map(([x, y, a], i) => `<g transform="translate(${x} ${y}) rotate(${a})" class="slip" id="slip${i}">${wh('M-50,-34 h100 v68 h-100 Z', 'stroke-width="3"')}<text x="0" y="8" text-anchor="middle" font-size="26" font-weight="800" fill="${C.ink}" stroke="none">ЛЁД</text><path d="M-36,18 h72" stroke-width="2"/></g>`)
  .join('');
const waves = `<path d="M100,880 q20,-30 0,-60 M130,900 q36,-50 0,-100 M160,920 q52,-70 0,-140" stroke-width="4"/>`;
const lookout = `${sh('M770,1040 h54 l-6,40 h-42 Z', 'a0')}${fig({ x: 798, y: 1036, s: 0.28, f: 1, arm: [100, 0], arm2: [10, 10], dress: 'coat', pat: 'b0', hair: 'cap' })}`;
const bowWave = `<path d="M850,${WL - 4} q30,-30 70,-26 M860,${WL + 14} q40,-16 90,-6 M60,${WL + 6} q-60,-8 -140,0 M70,${WL + 24} q-80,-6 -170,4" stroke="${C.paper}" stroke-width="5"/>`;
const crash = `<g class="crash" opacity="0">${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
  .map((a) => {
    const c = Math.cos((a * Math.PI) / 180);
    const s = Math.sin((a * Math.PI) / 180);
    return `<path d="M${(880 + c * 40).toFixed(0)},${(1270 + s * 40).toFixed(0)} L${(880 + c * (a % 60 ? 90 : 130)).toFixed(0)},${(1270 + s * (a % 60 ? 90 : 130)).toFixed(0)}" stroke-width="6"/>`;
  })
  .join('')}</g>`;
const flares = [[260, 520], [640, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${C.paper}"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${x},${y} l${(Math.cos(i * 0.628) * 60).toFixed(0)},${(Math.sin(i * 0.628) * 60 + 20).toFixed(0)}" stroke="${C.paper}" stroke-width="4"/>`).join('')}<path d="M${x},${y + 10} V${WL - 40}" stroke="${C.paper}" stroke-width="2" stroke-dasharray="6 10"/>`).join('');

const tableau = `
  ${sky()}
  <rect x="-400" y="-400" width="1880" height="${WL + 400}" fill="url(#b0)" stroke="none"/>
  ${starDots(-300, -200, 1680, 1400, 130, 5)}
  <g class="st-b">${ship}${lookout}</g>
  <g class="st-a"><g transform="rotate(14 820 ${WL})">${ship}</g>${flares}</g>
  ${sea(WL)}
  <rect x="-400" y="${WL}" width="1880" height="1100" fill="url(#c0)" stroke="none" opacity="0.8"/>
  ${iceberg(1060, WL, 0.85)}
  <g class="st-b">${bowWave}</g>
  ${slips}${waves}
  ${crash}
  <g class="st-a">${lifeboat(250, 1420, 5)}${lifeboat(520, 1500, 4)}${lifeboat(130, 1560, 3)}</g>`;

// ─── Инфографика: 4 из 10 ─────────────────────────────────────────────────────

const xs = [190, 365, 540, 715, 890];
const card = (i: number, cls: string, color: string, sign: boolean) => {
  const x = xs[i % 5];
  const y = i < 5 ? 690 : 900;
  return `<g class="${cls}" id="${cls}${i}"><rect x="${x - 60}" y="${y - 78}" width="120" height="156" rx="12" fill="none" stroke="${color}" stroke-width="6"/>
    ${sign ? `<path d="M${x - 34},${y + 24} L${x},${y - 40} L${x + 34},${y + 24} Z" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>` : `<path d="M${x - 36},${y - 30} h72 M${x - 36},${y} h72 M${x - 36},${y + 30} h46" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`}</g>`;
};

const info = {
  html: `
    ${itext('i-h', 450, 40, 'БИЛЕТЫ ПДД')}
    ${isvg(`${Array.from({ length: 10 }, (_, i) => card(i, 'cw', '#fff', false)).join('')}${[0, 1, 2, 3].map((i) => `<rect class="cb" id="cb${i}" x="${xs[i] - 64}" y="${690 - 82}" width="128" height="164" fill="#000"/>${card(i, 'co', C.accent, true)}`).join('')}`)}
    ${itext('i-n', 1090, 140, '4 ИЗ 10', C.accent, 900)}
    ${itext('i-s', 1280, 46, 'ВОПРОСОВ — СО ЗНАКАМИ')}
    ${itext('i-y', 1370, 30, '320 ИЗ 800', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      ...Array.from({ length: 10 }, (_, i) => pop(`#cw${i}`, t[0] + 0.03 * i)),
      `tl.set('.co, .cb', { opacity: 0 }, 0);`,
      ...[0, 1, 2, 3].map((i) => `tl.set('#co${i}, #cb${i}', { opacity: 1 }, ${(t[1] + 0.05 * i).toFixed(3)});`),
      pop('#i-n', t[1], 0.22),
      show('#i-s', t[2]),
      show('#i-y', t[3]),
    ].join('\n      '),
};

export const v25: Video3 = {
  id: '25-titanik',
  title: 'Реклама: Титаник',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Знаки учить не буду»', cams: ['wide', 'a'], a: 'cool', b: 'neutral' },
    { text: '«Это почему?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Навигатор всё скажет»', cams: ['a', [366, 1004, 2.8]], a: 'smile' },
    { text: '«А на экзамене?»', cams: ['b', 'b'], b: 'think' },
    { text: '«Да кто на них смотрит»', cams: ['a', [570, 820, 2.4]], a: 'cool' },
    { text: '«На „Титанике“ тоже<br>не слушали предупреждений»', cams: ['b', 'ab'], b: 'calm' },
    { text: '«И что?»', cams: ['a', 'a'], a: 'doubt' },
    { text: '«Их было шесть.<br>За один день»', cams: ['b', 'wide'], a: 'shock', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: '«Титаник», 14 апреля 1912' },
    { fx: 520, fy: 720, s: 1.6, label: '6 предупреждений о льде' },
    { fx: 790, fy: 1240, s: 2.1, label: 'Скорость — 22 узла' },
    { fx: 420, fy: 560, s: 1.6, label: 'Ночь, тихо, луны нет', off: '.slip' },
    { fx: 900, fy: 1110, s: 1.8, label: 'Айсберг увидели поздно' },
    { fx: 880, fy: 1250, s: 2.3, label: 'В 23:40 — удар', on: '.crash' },
  ],
  after: [
    { fx: 540, fy: 1060, s: 1.02, off: '.crash' },
    { fx: 320, fy: 1420, s: 2.0 },
    { fx: 320, fy: 1120, s: 1.7 },
    { fx: 980, fy: 1180, s: 1.7, ds: 1.08 },
  ],
  extra: (T) =>
    Array.from({ length: 6 }, (_, i) => `tl.fromTo('#slip${i}', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15, ease: 'back.out(2)' }, ${(T.story[1] + 0.12 * i).toFixed(3)});`).join('\n      '),
  info,
  cta: { lines: ['Не плыви', 'мимо', 'знаков'], accent: 1 },
  bioGlyph: '<path d="M-36,30 L0,-34 L36,30 Z"/>',
};
