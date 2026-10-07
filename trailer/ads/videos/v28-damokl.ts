/**
 * 28. «Через час экзамен. Мне плохо» — стулья в коридоре перед экзаменом.
 * История-гравюра: Дамоклов меч (по Цицерону) — Дамокл завидовал царю; царь посадил его на трон,
 * а над троном повесил меч на конском волосе.
 * Инфографика: на экзамене 20 вопросов за 20 минут — минута на вопрос.
 */
import { ICON, chair, floorLine, person } from '../draw.ts';
import { C, DLG, isvg, itext, pop, show, type Video3 } from '../engine3.ts';
import { column, fig, sh, sky, wh, type FigOpts } from '../etch.ts';
import { feast, sword } from '../etch2.ts';
import { at } from '../kit.ts';

const A = person(DLG, { id: 'A', x: 330, floor: 1300, pose: 'sit', seat: 110, f: 1, arms: ['lap', 'down'], hair: 'ponytail', face: 'sad' });
const B = person(DLG, { id: 'B', x: 760, floor: 1300, pose: 'sit', seat: 110, f: -1, arms: ['lap', 'down'], hair: 'curly', face: 'neutral' });

const scene = `
  ${floorLine(1300)}
  ${chair(330, 1300, 1, 110)}${chair(760, 1300, -1, 110)}
  <rect x="440" y="640" width="210" height="300" fill="${C.night}"/><circle cx="625" cy="800" r="7" fill="${C.line}"/>
  <rect x="410" y="560" width="270" height="56" fill="${C.night}" stroke-width="4"/>
  <text x="545" y="600" text-anchor="middle" font-size="30" font-weight="800" fill="${C.line}" stroke="none" letter-spacing="2">ЭКЗАМЕН</text>
  ${at(ICON.clock, 900, 700, 1.1)}
  ${A.svg}${B.svg}`;

// ─── Гравюра ──────────────────────────────────────────────────────────────────

const FL = 1500;
const TX = 460;
const throne = `
  ${sh(`M${TX - 100},${FL} V${FL - 640} Q${TX - 70},${FL - 700} ${TX - 40},${FL - 640} V${FL - 230} Z`, 'b90')}
  <circle cx="${TX - 70}" cy="${FL - 690}" r="18" fill="${C.paper}"/>
  ${sh(`M${TX - 110},${FL - 250} H${TX + 120} V${FL - 210} H${TX - 110} Z`, 'a0')}
  ${sh(`M${TX - 70},${FL - 380} H${TX + 110} V${FL - 350} H${TX - 70} Z`, 'a0')}<path d="M${TX + 100},${FL - 350} V${FL - 250}" stroke-width="12"/>
  <path d="M${TX + 100},${FL - 210} V${FL} M${TX - 90},${FL - 210} V${FL}" stroke-width="16"/>
  ${sh(`M${TX + 50},${FL - 110} H${TX + 230} V${FL} H${TX + 50} Z`, 'a90')}`;

const seated = (o: Partial<FigOpts>) => fig({ x: TX - 10, y: FL - 250, s: 1, f: 1, leg: [84, 86], leg2: [78, 80], dress: 'robe', ...o } as FigOpts);
const goblet = `${wh('M-14,-50 h28 q0,26 -14,30 q-14,-4 -14,-30 Z')}<path d="M0,-20 V0 M-10,2 h20" stroke-width="4"/>`;
const king = (o: Partial<FigOpts>) => fig({ x: 0, y: 0, hair: 'crown', beard: true, dress: 'robe', pat: 'a30', sleeve: 'c60', ...o } as FigOpts);

const before = `<g class="before">
  ${seated({ hair: 'crown', beard: true, pat: 'a30', sleeve: 'c60', arm: [80, 40], arm2: [60, 30], hand: goblet })}
  ${fig({ x: 760, y: FL - 206, f: -1, dress: 'tunic', pat: 'a120', legs: 'c90', hair: 'short', arm: [120, 30], arm2: [40, 60], nod: -10, face: 'calm' })}
</g>`;
const swap = `<g class="swap" opacity="0">
  ${seated({ hair: 'short', pat: 'a120', sleeve: 'c90', dress: 'tunic', legs: 'c90', arm: [80, 40], arm2: [60, 30], hand: goblet, nod: -18, face: 'shout' })}
  ${king({ x: 180, y: FL - 206, f: 1, arm: [160, 10], arm2: [20, 10], nod: -8 })}
</g>`;
const empty = `<g class="st-a"><g transform="translate(${TX + 170} ${FL - 14}) rotate(100)">${goblet}</g><path d="M${TX + 120},${FL - 4} q40,-6 80,4" stroke-width="3"/>${king({ x: 180, y: FL - 206, f: 1, arm: [100, 10], arm2: [20, 10], face: 'calm' })}</g>`;

const hang = `
  <path d="M${TX + 10},330 V470" stroke-width="1.6"/>
  <g transform="translate(${TX + 10} 470) rotate(180)">${sword(300)}</g>`;

const tableau = `
  ${sky()}
  <rect x="-400" y="-400" width="1880" height="740" fill="url(#b0)" stroke="none"/><path d="M-400,340 H1480" stroke-width="6"/>
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${-100 + i * 180},340 v-60" stroke-width="5"/>`).join('')}
  <rect x="-400" y="${FL}" width="1880" height="600" fill="${C.paper}" stroke="none"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${-400 + i * 160},${FL} L${-700 + i * 220},2400" stroke-width="2.5"/>`).join('')}
  <path d="M-400,${FL} H1480 M-400,${FL + 90} H1480 M-400,${FL + 220} H1480" stroke-width="3"/>
  ${column(90, 380, FL, 80)}${column(990, 380, FL, 80)}
  ${sh('M200,420 h680 v40 Q540,520 200,460 Z', 'b120')}
  ${throne}
  ${feast(760, 1060, 1360, FL)}
  ${before}${swap}${empty}
  ${hang}`;

// ─── Инфографика: 20 вопросов, 20 минут ───────────────────────────────────────

const clock = `<g transform="translate(540 1110)"><g id="ck"><circle r="110" fill="none" stroke="${C.accent}" stroke-width="10"/><path d="M0,0 V-76 M0,0 L54,30" stroke="${C.accent}" stroke-width="10" stroke-linecap="round"/></g></g>`;
const info = {
  html: `
    ${itext('i-h', 430, 40, 'ЭКЗАМЕН В ГИБДД')}
    ${itext('i-n', 520, 110, '20 ВОПРОСОВ', C.accent, 900)}
    ${itext('i-m', 680, 110, '20 МИНУТ', C.accent, 900)}
    ${isvg(clock)}
    ${itext('i-s', 1270, 52, 'МИНУТА НА ВОПРОС')}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      pop('#i-n', t[0] + 0.12, 0.22),
      pop('#i-m', t[1], 0.22),
      pop('#ck', t[1] + 0.1, 0.25),
      `tl.to('#ck path', { rotation: 360, svgOrigin: '0 0', duration: 2, ease: 'none' }, ${(t[1] + 0.1).toFixed(3)});`,
      show('#i-s', t[2]),
    ].join('\n      '),
};

export const v28: Video3 = {
  id: '28-damokl',
  title: 'Реклама: Дамоклов меч',
  format: 'short',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1060, s: 1.05 },
  lines: [
    { text: '«Через час экзамен.<br>Мне плохо»', cams: ['wide', 'a'], a: 'sad', b: 'neutral' },
    { text: '«Ты пробные решала?»', cams: ['b', 'ab'], b: 'doubt' },
    { text: '«Ни разу…»', cams: ['a', [545, 600, 2.2]], a: 'tired' },
  ],
  tableau,
  story: [
    { fx: 540, fy: 1000, s: 1.0, label: 'Дамоклов меч' },
    { fx: 560, fy: 1240, s: 1.6, label: 'Дамокл завидовал царю' },
    { fx: 420, fy: 1230, s: 1.6, label: 'Царь посадил его на трон', on: '.swap', off: '.before' },
    { fx: TX + 10, fy: 720, s: 1.8, dy: -60, label: 'Над ним — меч на волоске' },
  ],
  after: [{ fx: 520, fy: 1080, s: 1.15, ds: 1.08, off: '.swap' }],
  info,
  cta: { lines: ['Пробный экзамен', 'снимает меч'], accent: 1 },
  bioGlyph: '<path d="M0,-40 V24 M-16,24 H16 M0,24 V40 M-8,-40 L0,-48 L8,-40"/>',
};
