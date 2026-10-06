/**
 * 1. «Кривая забывания» — мел на доске. Всю ночь зубрил — к утру половина вылетела.
 * История: Герман Эббингауз, 1885 — без повторов память тает, повторы с паузами её держат.
 */
import { ICON, chair, clockFace, desk, floorLine, person, windowFrame } from '../draw.ts';
import { T, type Video } from '../engine.ts';
import { THEMES } from '../themes.ts';

const th = THEMES.chalk;
const h = th.hist;
const A = person(th, { id: 'A', x: 170, floor: 1210, pose: 'sit', f: 1, arms: ['table', 'lap'], hair: 'spiky', table: 1050, face: 'tired' });
const B = person(th, { id: 'B', x: 910, floor: 1210, pose: 'sit', f: -1, arms: ['table', 'lap'], hair: 'ponytail', table: 1050, hold: 'phone', face: 'neutral' });

const scene = `
  ${floorLine(1210)}
  ${windowFrame(430, 560, 220, 260)}
  ${clockFace(760, 650, 46, 8, 0, th.fill)}
  ${chair(170, 1210, 1)}${chair(910, 1210, -1)}
  ${desk(250, 470, 1050, 1210)}${desk(610, 830, 1050, 1210)}
  <path d="M300,1050 h110 M306,1036 h98 M300,1022 h108" stroke-width="4"/>
  <path d="M420,1040 q10,-18 24,-6 q10,-14 20,0 q-4,12 -20,10 q-10,8 -24,-4 z" stroke-width="3"/>
  ${A.svg}${B.svg}`;

// Кривая забывания: без повторов и с повторами через 1, 3 и 7 дней.
const X0 = 210;
const Y0 = 1330;
const SX = 54;
const SY = 600;
const pt = (d: number, r: number) => `${(X0 + d * SX).toFixed(1)},${(Y0 - r * SY).toFixed(1)}`;
const decay = (from: number, to: number, tau: number) => {
  const out: string[] = [];
  for (let d = from; d <= to + 1e-6; d += 0.1) out.push(pt(d, Math.exp(-(d - from) / tau)));
  return out;
};
const lost = `M${decay(0, 12, 1.1).join(' L')}`;
const kept = (() => {
  // Как в игре: повтор через день, потом через 3 дня, потом через 7 (дни 1, 4 и 11).
  const parts = [
    [0, 1, 1.1],
    [1, 4, 6],
    [4, 11, 14],
    [11, 12, 40],
  ] as const;
  return parts.map(([a, b, tau], i) => `${i ? 'L' : 'M'}${decay(a, b, tau).join(' L')}`).join(' ');
})();
const ticks = [0, 1, 4, 11]
  .map((d) => `<path d="M${X0 + d * SX},${Y0} v14"/><text x="${X0 + d * SX}" y="${Y0 + 54}" text-anchor="middle" font-size="30" font-weight="700" fill="${th.ink}" stroke="none">${d}</text>`)
  .join('');
const marks = [1, 4, 11]
  .map((d, i) => `<g id="rep${i}" opacity="0"><circle cx="${X0 + d * SX}" cy="${Y0 - SY}" r="14" fill="${th.accent}" stroke="none"/><text x="${X0 + d * SX}" y="${Y0 - SY - 30}" text-anchor="middle" font-size="26" font-weight="800" fill="${th.accent}" stroke="none">повтор</text></g>`)
  .join('');

const demoSvg = `
  <path d="M${X0},${Y0 - SY - 90} V${Y0} H${X0 + 12 * SX + 40}"/>
  ${ticks}
  <text x="${X0 + 12 * SX + 40}" y="${Y0 + 54}" text-anchor="end" font-size="30" font-weight="700" fill="${th.ink}" stroke="none">дни</text>
  <text id="ctitle" x="${X0 + 20}" y="${Y0 - SY - 100}" font-size="34" font-weight="800" fill="${th.ink}" stroke="none">сколько помнишь</text>
  <path id="lost" d="${lost}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-width="7" opacity="0.75"/>
  <text id="lostTxt" x="${X0 + 12 * SX}" y="${Y0 - 40}" text-anchor="end" font-size="30" font-weight="700" fill="${th.ink}" stroke="none" opacity="0">без повторов</text>
  <path id="kept" d="${kept}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke="${th.accent}" stroke-width="8"/>
  ${marks}
  <text id="keptTxt" x="${X0 + 12 * SX}" y="${Y0 - SY - 60}" text-anchor="end" font-size="32" font-weight="800" fill="${th.accent}" stroke="none" opacity="0">с повторами</text>`;

const [t0, t1, t2, t3] = T.demo;
const cam = (fx: number, fy: number, s: number) => JSON.stringify({ x: 540 - fx * s, y: 960 - fy * s, scale: s });
const demoTweens = [
  `tl.set('#dcam', ${cam(540, 1050, 1)}, ${t0});`,
  `tl.to('#dcam', { ...${cam(540, 1050, 1.04)}, duration: ${(t2 - t0).toFixed(3)}, ease: 'none' }, ${t0});`,
  `tl.to('#lost', { attr: { 'stroke-dashoffset': 0 }, duration: 0.7, ease: 'power1.in' }, ${t0 + 0.05});`,
  `tl.to('#lostTxt', { opacity: 1, duration: 0.2 }, ${t0 + 0.7});`,
  `tl.to('#kept', { attr: { 'stroke-dashoffset': 0 }, duration: ${(t2 - t1 - 0.2).toFixed(3)}, ease: 'none' }, ${t1});`,
  ...[1, 4, 11].map((d, i) => `tl.fromTo('#rep${i}', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.15, ease: 'back.out(2)' }, ${(t1 + (t2 - t1 - 0.2) * (d / 12)).toFixed(3)});`),
  `tl.to('#keptTxt', { opacity: 1, duration: 0.2 }, ${(t2 - 0.25).toFixed(3)});`,
  `tl.set('#dcam', ${cam(690, 1000, 1.55)}, ${t2});`,
  `tl.set('#ctitle', { opacity: 0 }, ${t2});`,
  `tl.to('#dcam', { ...${cam(690, 1000, 1.65)}, duration: ${(t3 - t2).toFixed(3)}, ease: 'none' }, ${t2});`,
].join('\n      ');

// ─── История: Германия, 1885 ───────────────────────────────────────────────────

const houses = `
  <path d="M0,1500 H1080"/>
  <path d="M60,1500 V980 L200,840 L340,980 V1500 Z" fill="${h.fill}"/><path d="M110,1060 h60 v80 h-60 z M230,1060 h60 v80 h-60 z M110,1220 h60 v80 h-60 z M230,1220 h60 v80 h-60 z M170,1500 v-140 h60 v140"/>
  <path d="M340,1500 V900 L500,740 L660,900 V1500 Z" fill="${h.fill}"/><path d="M400,980 h70 v90 h-70 z M530,980 h70 v90 h-70 z M400,1150 h70 v90 h-70 z M530,1150 h70 v90 h-70 z M460,840 a40,40 0 1 1 80,0 a40,40 0 1 1 -80,0"/>
  <path d="M660,1500 V1020 L800,880 L940,1020 V1500 Z" fill="${h.fill}"/><path d="M710,1100 h60 v80 h-60 z M830,1100 h60 v80 h-60 z M770,1500 v-150 h60 v150"/>
  <path d="M990,1500 V1120 M970,1120 h40 l-6,-40 h-28 z"/>
  <path d="M0,1560 H1080 M0,1620 H1080" stroke-width="2" opacity="0.6"/>`;
const SYL = ['ДАК', 'ЖОФ', 'ВУН', 'РИЗ', 'ТЭП', 'ГОМ'];
const cards = (fade: boolean) =>
  SYL.map((s, i) => {
    const x = 420 + (i % 3) * 170;
    const y = 1020 + Math.floor(i / 3) * 120;
    const gone = fade && i % 3 !== 1;
    return `<g opacity="${gone ? 0.25 : 1}"><rect x="${x}" y="${y}" width="140" height="90" rx="8" fill="${h.fill}" ${gone ? 'stroke-dasharray="10 10"' : ''}/><text x="${x + 70}" y="${y + 60}" text-anchor="middle" font-size="40" font-weight="800" fill="${h.ink}" stroke="none">${s}</text></g>`;
  }).join('');
const scholar = person(h, { id: 'H', x: 200, floor: 1440, pose: 'sit', f: 1, arms: ['table', 'chin'], beard: true, glasses: true, table: 1260, face: 'think' }).svg.replace(/id="faceH_/g, 'data-f="');
const study = `<g transform="translate(540 1150) scale(1.05) translate(-590 -1230)">
  <path d="M-400,1440 H1500"/>
  ${chair(200, 1440, 1)}
  <path d="M300,1260 H1040 M330,1260 V1440 M1010,1260 V1440"/>
  <path d="M370,1260 v-90 M350,1170 h40 M370,1170 q-14,-30 0,-56 q14,26 0,56" stroke-width="4"/>
  ${scholar}
  <g transform="translate(-10 0)">${cards(false)}</g></g>`;
const forgot = `
  ${cards(true)}
  <g transform="translate(540 760)"><circle r="120" fill="${h.fill}"/><path d="M0,0 V-80 M0,0 L60,30" stroke-width="7"/><text y="170" text-anchor="middle" font-size="48" font-weight="800" fill="${h.ink}" stroke="none">через 24 часа</text></g>`;
const sketchCurve = `
  <path d="M160,700 V1400 H940"/>
  <path d="M160,720 C260,1150 420,1300 940,1360" stroke-width="5" stroke-dasharray="14 12"/>
  <path d="M160,720 C200,860 240,900 290,930 L290,740 C350,860 420,900 470,920 L470,750 C560,830 680,860 940,860" stroke-width="7"/>
  <text x="940" y="820" text-anchor="end" font-size="38" font-weight="800" fill="${h.ink}" stroke="none">с повторами</text>
  <text x="940" y="1440" text-anchor="end" font-size="34" font-weight="700" fill="${h.ink}" stroke="none">без повторов</text>`;
const calendar = `
  <g transform="translate(540 1050)">
    <rect x="-380" y="-300" width="760" height="620" rx="20" fill="${h.fill}"/>
    <path d="M-380,-180 H380 M-200,-340 v80 M200,-340 v80"/>
    ${Array.from({ length: 21 }, (_, i) => {
      const x = -315 + (i % 7) * 105;
      const y = -100 + Math.floor(i / 7) * 120;
      const n = i + 1;
      // Ошибка 1-го числа, повторы через 1, 3 и 7 дней: 2-го, 5-го и 12-го.
      const hit = [2, 5, 12].includes(n);
      const miss = n === 1;
      return `<text x="${x}" y="${y + 14}" text-anchor="middle" font-size="40" font-weight="${hit ? 800 : 500}" fill="${h.ink}" stroke="none">${n}</text>${hit ? `<circle cx="${x}" cy="${y}" r="40" stroke-width="5"/>` : ''}${miss ? `<path d="M${x - 30},${y - 30} L${x + 30},${y + 30} M${x + 30},${y - 30} L${x - 30},${y + 30}" stroke-width="4"/>` : ''}`;
    }).join('')}
  </g>`;

export const v01: Video = {
  id: '01-zabyvanie',
  title: 'Реклама: кривая забывания',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  lines: [
    { shot: 'wide', text: '«Я всю ночь зубрил билеты»', a: 'tired', b: 'neutral' },
    { shot: 'b', text: '«И сколько помнишь?»', b: 'doubt' },
    { shot: 'a', text: '«Вчера — всё.<br>Сегодня — половину»', a: 'sad' },
    { shot: 'b', text: '«Через неделю — почти ничего»', b: 'cool' },
    { shot: 'a', text: '«Чего?! А ты как сдала?»', a: 'shock' },
    { shot: 'wide', text: '«Повторяла: через день,<br>через три и через семь»', a: 'think', b: 'calm' },
    { shot: 'b', text: '«Игра сама напоминает,<br>когда пора»', b: 'happy' },
  ],
  demo: { svg: demoSvg, tweens: demoTweens },
  history: [
    { label: 'Германия, 1885', art: houses },
    { label: 'Герман Эббингауз<br>заучивал бессмысленные слоги', art: study },
    { label: 'Герман Эббингауз<br>заучивал бессмысленные слоги', art: study, origin: '60% 62%' },
    { label: 'Через сутки<br>помнил меньше половины', art: forgot },
    { label: 'А повторы с паузами<br>удерживали память', art: sketchCurve },
    { label: 'Сегодня это —<br>интервальные повторы', art: calendar },
  ],
  table: {
    left: 'ЗУБРЁЖКА',
    right: 'ПОВТОРЫ',
    leftIcon: ICON.moon,
    rightIcon: ICON.calendar,
    rows: [
      ['всё за один раз', 'через 1, 3 и 7 дней'],
      ['забыл к утру', 'помнишь неделями'],
      ['на экзамене — пусто', 'на экзамене — легко'],
    ],
  },
  cta: ['Хватит', 'зубрить за ночь', 'начни повторять'],
  bioGlyph: ICON.calendar,
};
