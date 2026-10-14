/**
 * 33. «Я сдам ПДД!» — по образцу фан-нарезки из фильма: семинар «кто делает, а кто ноет», герой выкрикивает
 * «Я сдам!», зал подхватывает; через месяц герой сам гоняет новичка («Эта боль спасёт тебе права!») и
 * довольно ухмыляется. Фильм не используем: всё нарисовано человечками, реплики свои.
 * Голоса — записи Артёма из Fish Audio в `music/v33/` (в репозиторий не кладём): гуру — guru1–3, герой — hero1–2.
 * Голоса новичка пока нет: его реплики идут субтитрами (`dur`); когда запись появится — `say: ['novice', от, до]`.
 */
import { person, type Arm, type Face, type Hair } from '../draw.ts';
import { C, DLG } from '../engine3.ts';
import { cut, type Line5, type Video5 } from '../engine5.ts';

const A = C.accent;
const txt = (x: number, y: number, size: number, body: string, fill: string = C.line, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Montserrat" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="none" ${extra}>${body}</text>`;
const glowA = 'style="filter: drop-shadow(0 0 10px rgba(255,122,46,0.8))"';

// ─── Сцена: гуру на сцене ─────────────────────────────────────────────────────

const tie = (x: number, floor: number) => {
  const n = floor - 290;
  return `<path d="M${x - 9},${n + 14} L${x + 9},${n + 14} L${x + 14},${n + 84} L${x},${n + 104} L${x - 14},${n + 84} Z" fill="${C.night}" stroke-width="5"/>`;
};
const stageBack = `
  <rect x="120" y="230" width="840" height="300" rx="12" stroke-width="6"/>
  ${txt(540, 360, 78, 'СДАЙ ТЕОРИЮ')}
  ${txt(540, 470, 78, 'С ПЕРВОГО РАЗА', A, glowA)}
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
  /** Листает билет. */
  read?: boolean;
}
const ROWS: { floor: number; seats: Seat[] }[] = [
  {
    floor: 1250,
    seats: [
      { x: -90, id: 'a1', hair: 'curly', face: 'neutral' },
      { x: 150, id: 'a2', hair: 'cap', face: 'sleepy', read: true },
      { x: 390, id: 'a3', hair: 'long', face: 'neutral' },
      { x: 630, id: 'a4', hair: 'bald', face: 'doubt', glasses: true },
      { x: 870, id: 'a5', hair: 'bun', face: 'tired', read: true },
      { x: 1110, id: 'a6', hair: 'none', face: 'think' },
    ],
  },
  {
    floor: 1500,
    seats: [
      { x: 30, id: 'b1', hair: 'ponytail', face: 'neutral', read: true },
      { x: 270, id: 'N1', hair: 'curly', face: 'sleepy', glasses: true, read: true },
      { x: 510, id: 'H', hair: 'spiky', face: 'neutral' },
      { x: 750, id: 'N2', hair: 'cap', face: 'neutral', beard: true },
      { x: 990, id: 'b5', hair: 'long', face: 'doubt' },
    ],
  },
  {
    floor: 1760,
    seats: [
      { x: 150, id: 'c1', hair: 'bald', face: 'neutral', beard: true },
      { x: 390, id: 'c2', hair: 'bun', face: 'think', read: true },
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
      const reads = s.read && !opts.cheer;
      const p = person(DLG, {
        id: `${prefix}${s.id}`,
        x: s.x,
        floor: isUp ? row.floor - (opts.cheer ? 120 : 140) : row.floor,
        pose: 'stand',
        arms: isUp ? ['cheer', 'cheer'] : reads ? ['front', 'down'] : ['down', 'down'],
        hold: reads ? 'paper' : undefined,
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

// ─── Сцена: через месяц — герой гоняет новичка ───────────────────────────────

const FLOOR = 1500;
/** Доска «Ошибки»: крестики (`x`) или галочки (`ok`). */
function board(kind: 'x' | 'ok'): string {
  let cells = '';
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = 130 + c * 100;
      const y = 650 + r * 82;
      cells += `<rect x="${x}" y="${y}" width="84" height="68" rx="6" stroke-width="3" opacity="0.7"/>`;
      cells +=
        kind === 'x'
          ? `<path d="M${x + 26},${y + 18} l32,32 M${x + 58},${y + 18} l-32,32" stroke="${A}" stroke-width="7" ${glowA}/>`
          : `<path d="M${x + 22},${y + 36} l14,14 l28,-30" stroke-width="7"/>`;
    }
  return `<rect x="100" y="540" width="440" height="380" rx="10" stroke-width="6"/>
    ${kind === 'x' ? txt(320, 616, 48, 'ОШИБКИ', A, glowA) : txt(320, 616, 48, 'ВЫУЧЕНО')}${cells}`;
}
/** Билет на полу (лежит, поэтому сплюснут). */
const sheet = (x: number, y: number, rot: number, bad = false) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(1 0.42)">
    <rect x="-46" y="-60" width="92" height="120" fill="${C.night}" stroke-width="5"/>
    <path d="M-30,-36 h60 M-30,-14 h60 M-30,8 h44" stroke-width="4"/>
    ${bad ? `<path d="M-22,22 l40,30 M18,22 l-40,30" stroke="${A}" stroke-width="7"/>` : ''}
  </g>`;
const room = (b: 'x' | 'ok') => `
  <path d="M-400,${FLOOR} H1480" stroke-width="6"/><path d="M-400,${FLOOR + 160} H1480" stroke-width="3" opacity="0.4"/>
  ${board(b)}
  <path d="M760,-200 V330" stroke-width="4"/><path d="M700,330 h120 l-20,46 h-80 z" fill="${C.night}" stroke-width="5"/>
  <path d="M640,400 L560,${FLOOR} M880,400 L980,${FLOOR}" stroke-width="3" opacity="0.3"/>
  ${sheet(150, FLOOR + 40, -14, true)}${sheet(500, FLOOR + 70, 9, true)}${sheet(700, FLOOR + 36, -6)}${sheet(320, FLOOR + 110, 4, true)}${sheet(880, FLOOR + 100, 12, true)}`;

/** Новичок (лет 15, чуть ниже ростом) лежит на полу среди билетов: голова слева. */
const NX = 660;
const lying = (id: string, face: Face) => {
  const p = person(DLG, { id, x: 0, floor: 0, pose: 'stand', arms: ['down', 'down'], hair: 'curly', face });
  return `<g transform="translate(${NX} ${FLOOR - 50}) rotate(-90) scale(0.88)">${p.svg}</g>`;
};
// Голова лежащего: (NX − 342·0,88, FLOOR − 50) ≈ (359, 1450).
const coach = (id: string, arms: [Arm, Arm], face: Face) =>
  person(DLG, { id, x: 840, floor: FLOOR, pose: 'stand', f: -1, arms, hair: 'spiky', face }).svg;
const gym = (id: string, b: 'x' | 'ok', arms: [Arm, Arm], face: Face, novice: Face) => `${room(b)}${lying(`L${id}`, novice)}${coach(`K${id}`, arms, face)}`;
/** Новичок встал с билетом в руке. */
const rise = () => {
  const n = person(DLG, { id: 'R', x: 400, floor: FLOOR, pose: 'stand', arms: ['front', 'down'], hold: 'paper', hair: 'curly', face: 'angry' });
  return `${room('ok')}<g transform="translate(400 ${FLOOR}) scale(0.88) translate(-400 -${FLOOR})">${n.svg}</g>${coach('K9', ['hip', 'hip'], 'grin')}`;
};
// Головы: тренер (838, 1158), лежащий (359, 1450), вставший новичок (402, 1199).

// ─── Монтаж по репликам ──────────────────────────────────────────────────────

const STAGE_WIDE: [number, number, number] = [540, 880, 1.0];
const GURU: [number, number, number] = [542, 1060, 2.2];
const HALL_WIDE: [number, number, number] = [540, 1230, 1.05];
const HERO: [number, number, number] = [512, 1200, 2.3];
const UP: [number, number, number] = [514, 1090, 1.8];
const COACH: [number, number, number] = [820, 1210, 2.2];
const NOVICE: [number, number, number] = [420, 1460, 2.2];
const GYM_WIDE: [number, number, number] = [560, 1200, 1.0];
const zoom = ([x, y, s]: [number, number, number], k: number): [number, number, number] => [x, y, s * k];

const seminar: Line5[] = [
  {
    say: ['guru1', 0.1, 3.05],
    gap: 0.3,
    room: true,
    shots: [
      { scene: 'stage', cam: STAGE_WIDE, to: zoom(STAGE_WIDE, 1.1), cap: 'Я не знаю, зачем вы вообще {сюда пришли}!', faces: { G1: 'shout' } },
      { at: 1.5, scene: 'stage', cam: GURU, to: zoom(GURU, 1.08) },
    ],
    fx: [{ synth: 'boom', vol: 0.55 }],
  },
  {
    say: ['guru1', 4.1, 7.63],
    room: true,
    shots: [
      { scene: 'hall', cam: HALL_WIDE, to: zoom(HALL_WIDE, 1.08), cap: 'Половина из вас уже {третий раз} заваливает теорию!' },
      { at: 1.8, scene: 'hall', cam: [700, 1010, 1.9], to: [740, 1010, 2.0] },
    ],
  },
  { say: ['guru1', 8.17, 9.59], gap: 0.2, room: true, shots: [{ scene: 'stage', cam: zoom(GURU, 1.1), cap: 'А знаете {почему}?', faces: { G1: 'angry' } }] },
  {
    say: ['guru1', 10.23, 12.44],
    gap: 0.2,
    room: true,
    shots: [{ scene: 'point', cam: [640, 1040, 1.6], to: [640, 1040, 1.8], cap: 'Потому что вы {читатели}!' }],
  },
  {
    say: ['guru1', 13.0, 18.22],
    gap: 0.2,
    room: true,
    shots: [
      { scene: 'hall', cam: [200, 1150, 1.7], to: [300, 1150, 1.8], cap: 'Листаете билеты, {как газету},' },
      { at: 2.15, scene: 'stage', cam: zoom(GURU, 1.15), to: zoom(GURU, 1.25), cap: 'и {ни-че-го} не делаете!', shake: true, faces: { G1: 'shout' } },
    ],
  },
  {
    say: ['guru2', 0, 4.2],
    gap: 0.4,
    room: true,
    shots: [
      { scene: 'stage', cam: zoom(STAGE_WIDE, 1.15), to: zoom(STAGE_WIDE, 1.25), cap: 'Этот мир делится на тех, кто {делает},', faces: { G1: 'angry' } },
      { at: 2.9, scene: 'hall', cam: [520, 1130, 1.4], to: [520, 1130, 1.5], cap: 'и тех, кто {ноет}!' },
    ],
  },
  {
    say: ['guru2', 5.15, 6.59],
    gap: 0.45,
    room: true,
    shots: [
      { scene: 'point', cam: [600, 1040, 2.0], to: [600, 1040, 2.2], cap: 'Ну а ты кто, {умник}?!' },
      { at: 1.0, scene: 'hall', cam: HERO, to: zoom(HERO, 1.12), faces: { H: 'shock', N1: 'doubt', N2: 'think' } },
    ],
  },
  {
    say: ['hero1', 0.1, 1.81],
    gap: 0.5,
    room: true,
    shots: [
      { scene: 'hall', cam: zoom(HERO, 1.12), to: zoom(HERO, 1.2), cap: 'Я…', faces: { H: 'doubt' } },
      { at: 1.0, scene: 'hall', cam: zoom(HERO, 1.2), to: zoom(HERO, 1.25), cap: 'Я… я {сдам}?' },
    ],
  },
  { say: ['guru2', 7.52, 8.2], gap: 0.3, room: true, shots: [{ scene: 'stage', cam: zoom(GURU, 1.2), cap: '{Сдам}?!', big: true, shake: true, faces: { G1: 'shout' } }] },
  {
    say: ['guru2', 8.79, 10.63],
    gap: 0.15,
    room: true,
    shots: [{ scene: 'stage', cam: GURU, to: zoom(GURU, 1.1), cap: 'Ты {спрашиваешь} или {говоришь}?!', faces: { G1: 'angry' } }],
  },
  { say: ['hero1', 3.32, 4.19], gap: 0.4, room: true, shots: [{ scene: 'hall', cam: HERO, to: zoom(HERO, 1.1), cap: 'Я {сдам}.', faces: { H: 'neutral', N1: 'neutral', N2: 'neutral' } }] },
  {
    say: ['guru3', 0.09, 2.58],
    gap: 0.3,
    room: true,
    shots: [{ scene: 'point', cam: [620, 1040, 1.8], to: [620, 1040, 2.0], cap: 'Скажи так, будто это {уже правда}!' }],
  },
  {
    say: ['hero1', 5.01, 6.77],
    gap: 0.3,
    room: true,
    shots: [{ scene: 'hallUp', cam: zoom(UP, 0.85), to: UP, cap: 'Я {сдам ПДД}!', flash: true, faces: { uH: 'angry', uN1: 'shock', uN2: 'shock' } }],
    fx: [{ synth: 'whoosh', dur: 0.5, vol: 0.4, at: -0.35 }],
  },
  {
    say: ['guru3', 2.95, 6.01],
    gap: 0.2,
    room: true,
    shots: [
      { scene: 'stage', cam: zoom(GURU, 1.25), to: zoom(GURU, 1.35), cap: '{Громче}!', big: true, shake: true, faces: { G1: 'shout' } },
      { at: 1.24, scene: 'stage', cam: zoom(GURU, 1.05), to: zoom(GURU, 1.12), cap: 'Я не {слышу}!', big: true, shake: true },
    ],
    fx: [{ synth: 'boom', vol: 0.5 }],
  },
  {
    say: ['hero1', 7.22, 9.6],
    gap: 0.2,
    room: true,
    shots: [{ scene: 'hallUp', cam: zoom(UP, 1.15), to: zoom(UP, 1.3), cap: 'Я {СДАМ ПДД}!', big: true, shake: true, flash: true, faces: { uH: 'shout' } }],
    fx: [{ synth: 'boom', vol: 0.8 }],
  },
  {
    // Зал подхватывает: та же запись хором.
    dur: 2.6,
    gap: 0.1,
    shots: [{ scene: 'cheer', cam: [540, 1080, 1.0], to: [540, 1080, 1.15], cap: '{Я СДАМ ПДД!}', big: true, shake: true, flash: true }],
    fx: [{ chorus: ['hero1', 7.22, 9.6] }, { synth: 'roar', dur: 3.4, vol: 0.5 }, { synth: 'boom', vol: 0.9 }],
  },
  {
    say: ['guru3', 6.98, 10.15],
    gap: 0.35,
    room: true,
    shots: [
      { scene: 'stage', cam: GURU, to: zoom(GURU, 1.06), cap: 'Вот!', faces: { G1: 'grin' } },
      { at: 0.95, scene: 'stage', cam: zoom(GURU, 1.06), to: zoom(GURU, 1.12), cap: 'Вот это {другое дело}!' },
    ],
  },
  {
    say: ['guru3', 10.5, 13.7],
    gap: 0.2,
    room: true,
    shots: [
      { scene: 'stage', cam: zoom(GURU, 1.15), to: zoom(GURU, 1.25), cap: 'А теперь {сдери с себя}', faces: { G1: 'shout' } },
      { at: 1.6, scene: 'cheer', cam: [540, 1100, 1.25], to: [540, 1100, 1.35], cap: 'эту {лень}!', big: true, shake: true },
    ],
    fx: [{ synth: 'roar', at: 1.6, dur: 2, vol: 0.35 }],
  },
];
const S1 = cut(seminar);

const month: Line5[] = [
  {
    dur: 1.5,
    gap: 0.5,
    shots: [{ scene: 'gym', cam: GYM_WIDE, to: zoom(GYM_WIDE, 1.06), cap: '{Через месяц}', big: true, flash: true }],
    fx: [{ synth: 'whoosh', dur: 0.6, vol: 0.6, at: -0.45 }, { synth: 'boom', vol: 0.8 }],
  },
  // Новичок: «Мне больно… Я опять завалил билет.» — пока без голоса.
  { dur: 2.6, gap: 0.1, shots: [{ scene: 'gym', cam: NOVICE, to: zoom(NOVICE, 1.08), cap: 'Мне больно… Я опять {завалил билет}.', faces: { Lg: 'sad' } }] },
  {
    say: ['hero2', 0.11, 3.83],
    gap: 0.3,
    shots: [
      { scene: 'gym', cam: COACH, to: zoom(COACH, 1.08), cap: '{Больно}?', faces: { Kg: 'smirk' } },
      { at: 0.94, scene: 'gym', cam: zoom(COACH, 1.08), to: zoom(COACH, 1.14), cap: '{Отлично}!', faces: { Kg: 'grin' } },
      { at: 1.98, scene: 'gym', cam: GYM_WIDE, to: zoom(GYM_WIDE, 1.1), cap: 'Эта боль {спасёт тебе права}!', faces: { Kg: 'shout' } },
    ],
  },
  {
    say: ['hero2', 4.35, 8.75],
    gap: 0.3,
    shots: [
      { scene: 'gymX', cam: [320, 730, 1.9], to: [320, 730, 2.05], cap: 'Каждая {ошибка} — это вопрос,' },
      { at: 1.73, scene: 'gymOk', cam: [320, 730, 2.05], to: [320, 730, 2.15], cap: 'который ты на экзамене', flash: true },
      { at: 3.0, scene: 'gymOk', cam: [600, 1100, 1.25], to: [640, 1100, 1.35], cap: '{уже не завалишь}!' },
    ],
    fx: [{ synth: 'whoosh', at: 1.4, dur: 0.4, vol: 0.4 }],
  },
  // Новичок: «Я больше не могу…» — пока без голоса.
  { dur: 1.6, gap: 0.35, shots: [{ scene: 'gym', cam: zoom(NOVICE, 1.15), to: zoom(NOVICE, 1.22), cap: 'Я больше {не могу}…', faces: { Lg: 'tired' } }] },
  {
    say: ['hero2', 9.04, 11.89],
    gap: 0.2,
    shots: [
      { scene: 'gym', cam: zoom(COACH, 1.1), to: zoom(COACH, 1.2), cap: '{Можешь}!', big: true, shake: true, faces: { Kg: 'shout' } },
      { at: 1.06, scene: 'rise', cam: [600, 1180, 1.3], to: [600, 1180, 1.4], cap: 'Ещё {билет}!', flash: true },
      { at: 2.16, scene: 'rise', cam: [600, 1180, 1.4], to: [600, 1180, 1.5], cap: '{Давай}!', big: true, shake: true },
    ],
    fx: [{ synth: 'boom', at: 2.16, vol: 0.7 }],
  },
  // Без слов: довольная ухмылка.
  { dur: 1.7, gap: 0.15, shots: [{ scene: 'rise', cam: [838, 1170, 3.0], to: [838, 1170, 3.3], cap: '', faces: { K9: 'smirk' } }] },
];
const S2 = cut(month, S1.end);
const END = S2.end;

export const v33: Video5 = {
  id: '33-sdam',
  title: 'Реклама: Я сдам ПДД',
  scenes: {
    stage: `${stageBack}${tie(540, 1350)}${G1.svg}`,
    point: `${stageBack}${tie(540, 1350)}${G2.svg}`,
    hall: hall(''),
    hallUp: hall('u', { standing: 'H' }),
    cheer: hall('x', { cheer: true }),
    gym: gym('g', 'x', ['hip', 'hip'], 'cool', 'sad'),
    gymX: gym('x', 'x', ['point', 'hip'], 'angry', 'tired'),
    gymOk: gym('o', 'ok', ['point', 'hip'], 'shout', 'doubt'),
    rise: rise(),
  },
  shots: [...S1.shots, ...S2.shots],
  end: END,
  cta: { lines: ['Хватит читать —', 'начни делать'], accent: 1 },
  T: { cta: [END, END + 0.5], ctaOut: [END + 1.8, END + 2.1], bio: [END + 2.1, END + 4.5], end: +(END + 4.5).toFixed(3) },
  voiceDir: 'v33',
  cues: [
    ...S1.cues,
    ...S2.cues,
    // Низкий фон семинара нарастает к крику зала; через месяц — пульс тренировки; удар на выводе.
    { at: 0, synth: 'drone', dur: S1.end, vol: 0.35 },
    { at: S1.end + 0.5, synth: 'pulse', dur: +(END - S1.end - 2.3).toFixed(2), vol: 0.35 },
    { at: END, synth: 'boom', vol: 0.9 },
    { at: END, synth: 'drone', dur: 4.5, vol: 0.25 },
  ],
};
