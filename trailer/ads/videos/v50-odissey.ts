/**
 * 50. «За рулём спокойно пишу сообщения» — у машины.
 * История-гравюра: Одиссей и сирены (Гомер, «Одиссея», XII) — сирены пели так, что моряки разбивались о скалы;
 * Одиссей залепил команде уши воском, а себя велел привязать к мачте и не развязывать, что бы он ни просил.
 * Инфографика: 1 500 ₽ — штраф за разговор по телефону за рулём без «свободных рук» (КоАП РФ, ст. 12.36.1; ПДД п. 2.7).
 */
import { carSide, floorLine, person, streetLamp } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { note } from '../etch2.ts';
import { birds, cloud, fig, front, rock, sea, ship, sky } from '../etch.ts';

const A = person(DLG, { id: 'A', x: 190, floor: 1300, pose: 'stand', f: 1, arms: ['phone', 'down'], hold: 'phone', hair: 'long', face: 'cool' });
const B = person(DLG, { id: 'B', x: 900, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'curly', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${streetLamp(1010, 1300, C.accent)}
  ${carSide(550, 1300, DLG.fill, false)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const SHIP = { x: 660, y: 1500, k: 1.8 };
const mastX = SHIP.x - 20 * SHIP.k;
const deck = SHIP.y - 40 * SHIP.k;

const odysseus = fig({
  x: mastX + 6, y: deck - 150, s: 0.72, f: -1, dress: 'tunic', pat: 'a120', sleeve: 'c60', hair: 'short', beard: true,
  arm: [20, -10], arm2: [16, -6], nod: -18, face: 'shout',
});
const ropes = [0, 46, 92, 130].map((dy) => `<path d="M${mastX - 40},${deck - 260 + dy} q40,14 80,0" stroke-width="5"/>`).join('');

const crew = (x: number, k: 1 | -1) =>
  fig({ x, y: deck - 140, s: 0.62, f: k, dress: 'tunic', pat: 'a30', hair: 'curly', arm: [178, 150], arm2: [170, 160], face: 'closed', nod: 10 });
const oars = [470, 560, 760, 850].map((x) => `<path d="M${x},${deck + 10} L${x - 70},${SHIP.y + 110}" stroke-width="7"/>`).join('');

const siren = (x: number, y: number, a: number) =>
  front({ x, y, s: 0.62, arms: [a, 20], legs: [4, 0], dress: 'robe', pat: 'a60', hair: 'long', face: 'shout' });
const notes = [[300, 980, 1.2], [380, 900, 1.0], [470, 960, 1.3], [520, 860, 0.9], [610, 940, 1.1]]
  .map(([x, y, k], i) => `<g class="nt" id="nt${i}">${note(x, y, k)}</g>`)
  .join('');

const tableau = `
  ${sky()}
  ${cloud(860, 380, 300)}${cloud(300, 300, 240)}
  <path d="${birds([[700, 560], [750, 600], [660, 620]])}" stroke-width="3"/>
  ${sea(1450)}
  ${rock('rk', 'M-120,1520 L-90,1220 L20,1110 L150,1130 L280,1240 L360,1420 L400,1520 Z', [-130, 1090, 560, 450], 80, 23)}
  ${siren(80, 1110, 150)}${siren(230, 1180, 130)}
  ${notes}
  ${oars}
  ${ship(SHIP.x, SHIP.y, SHIP.k)}
  <g id="ody">${odysseus}${ropes}</g>
  ${crew(500, 1)}${crew(820, -1)}`;

// ─── Инфографика: штраф ───────────────────────────────────────────────────────

const phone = `<g id="ph"><rect x="430" y="520" width="220" height="380" rx="36" fill="none" stroke="#fff" stroke-width="12"/>
  <path d="M500,560 h80" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <path d="M420,500 L660,920" stroke="${C.accent}" stroke-width="16" stroke-linecap="round"/></g>`;

const info = {
  html: `
    ${itext('i-h', 400, 40, 'ТЕЛЕФОН В РУКЕ ЗА РУЛЁМ')}
    ${isvg(phone)}
    ${itext('i-n', 1000, 170, '1 500 ₽', C.accent, 900)}
    ${itext('i-s', 1240, 44, 'ШТРАФ. А ЗА ДВЕ СЕКУНДЫ<br>НА 60 КМ/Ч МАШИНА<br>ПРОЕЗЖАЕТ 33 МЕТРА')}
    ${itext('i-y', 1500, 28, 'КОАП РФ, СТ. 12.36.1 · ПДД, П. 2.7', C.dim, 700)}`,
  tweens: (t: number[]) =>
    [show('#i-h', t[0]), pop('#ph', t[0] + 0.1), pop('#i-n', t[1], 0.22), show('#i-s', t[2]), show('#i-y', t[3])].join('\n      '),
};

export const v50: Video3 = {
  id: '50-odissey',
  title: 'Реклама: Одиссей и сирены',
  format: 'long',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1090, s: 1.0 },
  lines: [
    { text: '«За рулём спокойно<br>пишу сообщения»', cams: ['wide', 'a'], a: 'cool', b: 'neutral' },
    { text: '«Это же запрещено»', cams: ['b', 'ab'], b: 'shock' },
    { text: '«Я быстро, одним глазом»', cams: ['a', 'a'], a: 'grin' },
    { text: '«За две секунды машина<br>проезжает 33 метра»', cams: ['b', [540, 1180, 2.2]], b: 'think' },
    { text: '«Не могу я без телефона»', cams: ['a', 'wide'], a: 'sad' },
    { text: '«Тогда привяжи себя к мачте»', cams: ['ab', 'b'], b: 'smirk' },
    { text: '«В смысле?»', cams: ['a', [560, 1140, 2.4]], a: 'doubt' },
    { text: '«Одиссей так и сделал»', cams: ['wide', 'b'], a: 'doubt', b: 'cool' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1150, s: 1.0, label: 'Одиссей и сирены' },
    { fx: 220, fy: 1080, s: 2.0, dy: -20, label: 'Сирены пели так, что моряки<br>разбивались о скалы' },
    { fx: 520, fy: 1220, s: 2.2, label: 'Команде Одиссей<br>залепил уши воском' },
    { fx: mastX, fy: deck - 220, s: 2.3, label: 'А себя велел<br>привязать к мачте' },
    { fx: mastX, fy: deck - 240, s: 2.6, dx: 20, label: 'Он просил развязать —<br>его не слушали' },
    { fx: 560, fy: 1180, s: 1.15, label: 'Корабль прошёл мимо скал' },
  ],
  after: [
    { fx: 540, fy: 1150, s: 1.0 },
    { fx: mastX, fy: deck - 220, s: 2.2 },
    { fx: 180, fy: 1160, s: 1.9 },
    { fx: 600, fy: 1250, s: 1.3, ds: 1.08 },
  ],
  extra: (T) =>
    [
      ...Array.from({ length: 5 }, (_, i) => `tl.to('#nt${i}', { y: '-=${40 + i * 12}', rotation: ${i % 2 ? 12 : -12}, transformOrigin: '50% 50%', duration: ${(T.story[6] - T.story[0]).toFixed(3)}, ease: 'sine.inOut' }, ${T.story[0]});`),
      `tl.to('#ody', { rotation: 3, transformOrigin: '${mastX}px ${deck}px', duration: 0.12, repeat: 7, yoyo: true, ease: 'sine.inOut' }, ${T.story[4]});`,
    ].join('\n      '),
  info,
  cta: { lines: ['Телефон —', 'в сторону.', 'Глаза — на дорогу'], accent: 2 },
  bioGlyph: '<rect x="-24" y="-40" width="48" height="80" rx="8" fill="none"/><path d="M-40,-44 L40,44"/>',
};
