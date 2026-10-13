/**
 * 31. «Опять билеты читаешь?» — по свежему образцу автора («Обломов»): 20 секунд, 4 реплики, история на
 * картинках-гравюрах от Gemini, вывод из двух строк.
 * История: анекдот из древнегреческого сборника «Филогелос» (IV–V век): учёный чуть не утонул и поклялся
 * не входить в воду, пока не научится плавать. Его цитирует Гегель в «Энциклопедии философских наук» (§ 10).
 * Вывод: «Плавать учатся — в воде» — билеты учат, решая их, а не читая ответы.
 */
import { desk, floorLine, lamp, person } from '../draw.ts';
import { C, DLG } from '../engine3.ts';
import type { Video4 } from '../engine4.ts';

const A = person(DLG, { id: 'A', x: 300, floor: 1300, pose: 'sit', seat: 112, f: 1, arms: ['table', 'table'], table: 1160, hair: 'spiky', face: 'tired' });
const B = person(DLG, { id: 'B', x: 830, floor: 1300, pose: 'stand', f: -1, arms: ['hip', 'down'], hair: 'cap', face: 'doubt' });

/** Стопка распечатанных билетов на столе. */
const stack = (x: number, top: number, n: number) =>
  Array.from({ length: n }, (_, i) => `<path d="M${x - 70 + (i % 3) * 3},${top - i * 13} h140" stroke-width="4"/>`).join('') +
  `<path d="M${x - 72},${top + 6} V${top - n * 13} M${x + 72},${top + 6} V${top - n * 13}" stroke-width="4"/>` +
  `<rect x="${x - 58}" y="${top - n * 13 - 52}" width="116" height="40" rx="4" fill="${C.night}" stroke-width="3"/>` +
  `<text x="${x}" y="${top - n * 13 - 24}" font-family="Montserrat" font-weight="800" font-size="22" letter-spacing="2" text-anchor="middle" fill="${C.line}" stroke="none">БИЛЕТЫ</text>`;

const scene = `
  ${floorLine(1300)}
  ${desk(400, 660, 1160, 1300)}
  ${stack(560, 1150, 16)}
  ${lamp(450, 1160)}
  ${A.svg}${B.svg}`;

export const v31: Video4 = {
  id: '31-plavanie',
  title: 'Реклама: грек и плавание',
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 560, fy: 1110, s: 1.45 },
  lines: [
    { text: '«Опять билеты читаешь?»', cams: ['wide'], a: 'tired', b: 'doubt' },
    { text: '«Сначала прочитаю<br>все 800»', cams: [[420, 1050, 1.9], [560, 1000, 2.4]], a: 'calm' },
    { text: '«Как тот грек<br>с плаванием?»', cams: [[860, 1060, 2.0], 'wide'], b: 'smile' },
    { text: '«…Какой ещё грек?»', cams: [[420, 1050, 1.9], 'wide'], a: 'doubt', b: 'smile' },
  ],
  pics: ['грек тонет', 'клятва на берегу', 'много лет спустя', 'следы в море'],
  shots: [
    { img: 1, fx: 540, fy: 960, s: 1, ds: 1.08, label: 'Один грек чуть не утонул' },
    { img: 2, fx: 540, fy: 960, s: 1, label: 'И поклялся не лезть в воду' },
    { img: 2, fx: 540, fy: 760, s: 1.45 },
    { img: 3, fx: 540, fy: 960, s: 1, label: 'Пока не научится плавать' },
    { img: 3, fx: 470, fy: 1250, s: 1.5 },
    { img: 3, fx: 540, fy: 960, s: 1.12, dy: -260, label: 'Годами читал о плавании' },
    { img: 4, fx: 540, fy: 960, s: 1, ds: 1.1, label: '' },
  ],
  cta: { lines: ['Плавать учатся —', 'в воде'], accent: 1 },
  music: 'plan.wav',
};
