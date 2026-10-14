/**
 * 33. «Я сдам ПДД!» — по образцу фан-нарезки из фильма (семинар «кто делает, а кто нет», флэшбек «эта боль
 * спасает тебе жизнь», довольная улыбка в конце). Фильм не используем: всё нарисовано человечками, реплики свои.
 * Без голоса — субтитры; звук ставится в TikTok.
 */
import { person, type Face, type Hair } from '../draw.ts';
import { C, DLG } from '../engine3.ts';
import type { Video5 } from '../engine5.ts';

const A = C.accent;
const txt = (x: number, y: number, size: number, body: string, fill: string = C.line, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Montserrat" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="none" ${extra}>${body}</text>`;

// ─── Сцена: гуру на сцене ─────────────────────────────────────────────────────

const tie = (x: number, floor: number) => {
  const n = floor - 290;
  return `<path d="M${x - 9},${n + 14} L${x + 9},${n + 14} L${x + 14},${n + 84} L${x},${n + 104} L${x - 14},${n + 84} Z" fill="${C.night}" stroke-width="5"/>`;
};
const stageBack = `
  <rect x="120" y="230" width="840" height="300" rx="12" stroke-width="6"/>
  ${txt(540, 360, 78, 'СДАЙ ТЕОРИЮ')}
  ${txt(540, 470, 78, 'С ПЕРВОГО РАЗА', A, 'style="filter: drop-shadow(0 0 10px rgba(255,122,46,0.8))"')}
  <path d="M120,560 H960" stroke-width="3" opacity="0.5"/>
  <path d="M60,-200 L400,1350 M1020,-200 L680,1350" stroke-width="3" opacity="0.35"/>
  <path d="M-300,1350 H1380" stroke-width="6"/><path d="M-300,1400 H1380" stroke-width="3" opacity="0.5"/>`;
const G1 = person(DLG, { id: 'G1', x: 540, floor: 1350, pose: 'stand', arms: ['wave', 'hip'], hair: 'none', face: 'shout' });
const G2 = person(DLG, { id: 'G2', x: 540, floor: 1350, pose: 'stand', arms: ['point', 'hip'], hair: 'none', face: 'angry' });

// ─── Сцена: зал ───────────────────────────────────────────────────────────────

interface Seat {
  x: number;
  id: string;
  hair: Hair;
  face: Face;
  glasses?: boolean;
  beard?: boolean;
}
const ROWS: { floor: number; seats: Seat[] }[] = [
  {
    floor: 1250,
    seats: [
      { x: -90, id: 'a1', hair: 'curly', face: 'neutral' },
      { x: 150, id: 'a2', hair: 'cap', face: 'think' },
      { x: 390, id: 'a3', hair: 'long', face: 'neutral' },
      { x: 630, id: 'a4', hair: 'bald', face: 'doubt', glasses: true },
      { x: 870, id: 'a5', hair: 'bun', face: 'neutral' },
      { x: 1110, id: 'a6', hair: 'none', face: 'think' },
    ],
  },
  {
    floor: 1500,
    seats: [
      { x: 30, id: 'b1', hair: 'ponytail', face: 'neutral' },
      { x: 270, id: 'N1', hair: 'curly', face: 'neutral', glasses: true },
      { x: 510, id: 'H', hair: 'spiky', face: 'neutral' },
      { x: 750, id: 'N2', hair: 'cap', face: 'neutral', beard: true },
      { x: 990, id: 'b5', hair: 'long', face: 'doubt' },
    ],
  },
  {
    floor: 1760,
    seats: [
      { x: 150, id: 'c1', hair: 'bald', face: 'neutral', beard: true },
      { x: 390, id: 'c2', hair: 'bun', face: 'think' },
      { x: 630, id: 'c3', hair: 'none', face: 'neutral' },
      { x: 870, id: 'c4', hair: 'curly', face: 'doubt' },
    ],
  },
];
/** Спинки кресел закрывают ряд ниже плеч. */
const chairs = (floor: number) => `<rect x="-400" y="${floor - 190}" width="1880" height="700" fill="${C.night}" stroke="none"/><path d="M-400,${floor - 190} H1480" stroke-width="5"/>`;

/** Зал: `standing` — кто встал (id), `cheer` — весь зал встал с поднятыми руками. */
function hall(prefix: string, opts: { standing?: string; cheer?: boolean } = {}): string {
  let svg = '';
  for (const row of ROWS) {
    let up = '';
    for (const s of row.seats) {
      const isUp = opts.cheer || s.id === opts.standing;
      const p = person(DLG, {
        id: `${prefix}${s.id}`,
        x: s.x,
        floor: isUp ? row.floor - (opts.cheer ? 120 : 140) : row.floor,
        pose: 'stand',
        arms: isUp ? ['cheer', 'cheer'] : ['down', 'down'],
        hair: s.hair,
        glasses: s.glasses,
        beard: s.beard,
        face: opts.cheer ? (s.id === 'H' ? 'shout' : 'grin') : s.face,
      });
      // Кто встал, рисуется поверх спинок своего ряда, но под следующим рядом.
      if (isUp && !opts.cheer) up += p.svg;
      else svg += p.svg;
    }
    svg += chairs(opts.cheer ? row.floor - 120 : row.floor) + up;
  }
  return svg;
}

// ─── Сцена: месяц назад ───────────────────────────────────────────────────────

const lying = person(DLG, { id: 'L', x: 0, floor: 0, pose: 'stand', arms: ['down', 'down'], hair: 'spiky', face: 'sad' });
const mentor = person(DLG, { id: 'M', x: 780, floor: 1400, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', mustache: true, face: 'calm' });
const failSheet = `<g transform="translate(420 1262) rotate(-8)">
    <rect x="-90" y="-62" width="180" height="124" rx="8" fill="${C.night}" stroke-width="5"/>
    ${txt(0, -14, 30, 'ЭКЗАМЕН')}
    ${txt(0, 34, 34, 'НЕ СДАН', A)}
  </g>`;
const floorScene = `
  <path d="M-400,1400 H1480" stroke-width="6"/>
  <rect x="120" y="420" width="320" height="380" stroke-width="5"/><path d="M280,420 V800 M120,610 H440" stroke-width="4"/>
  <g transform="translate(560 1342) rotate(-90)">${lying.svg}</g>
  ${failSheet}
  ${mentor.svg}`;

// ─── Сцена: через месяц ───────────────────────────────────────────────────────

const winner = person(DLG, { id: 'W', x: 500, floor: 1500, pose: 'stand', arms: ['front', 'hip'], hair: 'spiky', face: 'cool' });
const winScene = `
  <path d="M-400,1500 H1480" stroke-width="6"/>
  <rect x="700" y="760" width="300" height="740" stroke-width="6"/><circle cx="730" cy="1150" r="8" fill="${C.line}"/>
  <rect x="690" y="640" width="320" height="90" rx="8" stroke-width="5"/>${txt(850, 702, 46, 'ЭКЗАМЕН')}
  ${winner.svg}
  <g transform="translate(640 1262) rotate(6)">
    <rect x="-80" y="-60" width="160" height="120" rx="8" fill="${C.night}" stroke-width="5"/>
    ${txt(0, -8, 34, 'СДАН', A, 'style="filter: drop-shadow(0 0 10px rgba(255,122,46,0.8))"')}
    <path d="M-30,24 l18,18 l42,-40" stroke="${A}" stroke-width="8"/>
  </g>`;

// Головы для камеры: гуру (542, 1008), H в зале (512, 1158), H стоя (514, 1018), лежащий (218, 1340), наставник (778, 1058), W (502, 1158).

export const v33: Video5 = {
  id: '33-sdam',
  title: 'Реклама: Я сдам ПДД',
  scenes: {
    stage: `${stageBack}${tie(540, 1350)}${G1.svg}`,
    point: `${stageBack}${tie(540, 1350)}${G2.svg}`,
    hall: hall(''),
    hallUp: hall('u', { standing: 'H' }),
    cheer: hall('x', { cheer: true }),
    past: floorScene,
    win: winScene,
  },
  shots: [
    { t: 0, scene: 'stage', cam: [542, 1060, 2.3], to: [542, 1060, 2.5], cap: 'Почему одни сдают теорию {с первого раза},', faces: { G1: 'shout' } },
    { t: 2.0, scene: 'stage', cam: [540, 980, 1.25], to: [540, 960, 1.35], cap: 'а другие — {с третьего}?' },
    { t: 3.6, scene: 'stage', cam: [540, 860, 1.0], to: [540, 860, 1.06], cap: 'Потому что одни {делают},', faces: { G1: 'angry' } },
    { t: 5.1, scene: 'hall', cam: [520, 1260, 1.35], to: [520, 1250, 1.45], cap: 'а другие только {читают}!' },
    { t: 6.8, scene: 'point', cam: [620, 1040, 1.8], to: [620, 1040, 1.95], cap: 'А ты {кто}?' },
    { t: 8.0, scene: 'hall', cam: [512, 1200, 2.3], to: [512, 1200, 2.5], faces: { H: 'shock', N1: 'doubt', N2: 'think' } },
    { t: 8.9, scene: 'hall', cam: [512, 1210, 2.0], to: [512, 1210, 2.15], cap: 'Я… я {сдам}.', faces: { H: 'doubt' } },
    { t: 10.3, scene: 'stage', cam: [542, 1060, 2.1], to: [542, 1060, 2.3], cap: '{Не слышу}!', big: true, shake: true, faces: { G1: 'shout' } },
    { t: 11.5, scene: 'hallUp', cam: [514, 1090, 1.8], to: [514, 1080, 1.95], cap: 'Я {сдам ПДД}!', big: true, shake: true, flash: true, faces: { uH: 'shout', uN1: 'shock', uN2: 'shock' } },
    { t: 13.2, scene: 'cheer', cam: [520, 1080, 1.4], to: [520, 1070, 1.5], cap: '{Я сдам ПДД!}', big: true, shake: true, flash: true },
    { t: 14.7, scene: 'stage', cam: [542, 1060, 2.2], to: [542, 1060, 2.35], cap: 'Вот это {другое дело}.', faces: { G1: 'grin' } },
    { t: 16.0, scene: 'past', cam: [520, 1180, 1.0], to: [520, 1180, 1.05], cap: '{Месяц назад}…', flash: true },
    { t: 17.5, scene: 'past', cam: [260, 1320, 2.2], to: [260, 1320, 2.35], cap: 'Мне {больно}…', faces: { L: 'sad' } },
    { t: 18.9, scene: 'past', cam: [760, 1110, 2.1], to: [760, 1110, 2.25], cap: 'Эта ошибка {спасёт тебе права}.', faces: { M: 'calm' } },
    { t: 20.9, scene: 'past', cam: [500, 1230, 1.3], to: [500, 1230, 1.38], cap: 'Разбери её — и {не повторишь}.', faces: { M: 'smile', L: 'doubt' } },
    { t: 22.7, scene: 'win', cam: [640, 1120, 1.35], to: [600, 1150, 1.55], cap: 'Через месяц — {сдал с первого раза}.', flash: true },
  ],
  end: 24.9,
  cta: { lines: ['Хватит читать —', 'начни делать'], accent: 1 },
  T: { cta: [24.9, 25.4], ctaOut: [26.6, 26.9], bio: [26.9, 29.3], end: 29.3 },
};
