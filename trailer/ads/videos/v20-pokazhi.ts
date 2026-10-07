/**
 * 20. «Опять не заметил знак» — домашняя видеокассета, платформа электрички.
 * История: Япония — машинисты показывают на сигнал и называют его вслух; в опыте 1994 года ошибок стало на 85% меньше.
 */
import { floorLine, person } from '../draw.ts';
import { bulletTrain, platform, trafficLight } from '../draw2.ts';
import type { Video } from '../engine.ts';
import { still, text } from '../kit.ts';
import { THEMES2 } from '../themes2.ts';

const th = THEMES2.vhs;
const h = th.hist;
const A = person(th, { id: 'A', x: 300, floor: 1300, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'curly', face: 'sad' });
const B = person(th, { id: 'B', x: 790, floor: 1300, pose: 'stand', f: -1, arms: ['point', 'down'], hair: 'bun', face: 'neutral' });

const scene = `
  ${platform(1300, th.fill, th.accent)}
  ${floorLine(1300)}
  ${A.svg}${B.svg}`;

// ─── История: Япония ───────────────────────────────────────────────────────────

const japan = `
  <path d="M40,1480 H1040"/>
  <path d="M120,1180 L420,820 Q460,790 500,800 Q540,780 580,800 Q620,790 660,820 L960,1180" />
  <path d="M420,820 l40,60 l40,-40 l40,50 l40,-40 l40,50 l40,-80" stroke-width="4"/>
  ${bulletTrain(560, 1440, h.fill)}`;

const driver = `
  <path d="M40,1500 H1040"/>
  ${still(h, { x: 300, floor: 1500, pose: 'stand', f: 1, arms: ['point', 'down'], hair: 'cap', face: 'calm' })}
  ${trafficLight(820, 1500, 820, h.fill, 'green', h.ink)}
  <path d="M380,980 H660 V1100 H460 L420,1140 L430,1100 H380 Z" fill="${h.fill}"/>${text(520, 1060, 40, h.ink, 'Зелёный!')}`;

/** Рука с вытянутым указательным пальцем (смотрит вправо). */
const pointing = (fill: string) => `
  <rect x="-330" y="-90" width="150" height="190" rx="14" fill="${fill}"/>
  <rect x="-190" y="-110" width="230" height="220" rx="70" fill="${fill}"/>
  <rect x="-10" y="-110" width="300" height="64" rx="32" fill="${fill}"/>
  <path d="M-150,-46 h150 M-150,6 h170 M-150,56 h150" stroke-width="5"/>
  <path d="M-120,-110 q40,-50 110,-20" stroke-width="6"/>`;
const hand = `
  <g transform="translate(470 1220)">${pointing(h.fill)}</g>
  ${trafficLight(950, 1600, 980, h.fill, 'green', h.ink)}`;

const call = `
  <circle cx="420" cy="1100" r="140" fill="${h.fill}"/>
  <path d="M470,1160 q30,-20 60,0" stroke-width="6"/>
  <path d="M600,1040 q50,60 0,120 M660,1000 q90,100 0,200 M720,960 q130,140 0,280" stroke-width="7"/>
  ${text(540, 1400, 60, h.ink, '«Сигнал зелёный!»')}`;

const bars = `
  <path d="M160,1440 H920"/>
  <rect x="230" y="${1440 - 238 * 2.4}" width="220" height="${238 * 2.4}" fill="${h.fill}"/>
  <rect x="630" y="${1440 - 38 * 2.4}" width="220" height="${38 * 2.4}" fill="${h.ink}"/>
  ${text(340, 1440 - 238 * 2.4 - 30, 60, h.ink, '2,38')}${text(740, 1440 - 38 * 2.4 - 30, 60, h.ink, '0,38')}
  ${text(340, 1510, 34, h.ink, 'как обычно')}${text(740, 1510, 34, h.ink, 'показал и назвал')}
  ${text(540, 760, 36, h.ink, 'ошибок на 100 действий')}`;

const minus = `${text(540, 1200, 260, h.ink, '−85%')}${text(540, 1340, 64, h.ink, 'ошибок')}`;

const signs = `
  <path d="M40,1480 H1040"/>
  <path d="M220,1480 V1160"/><path d="M150,1160 L220,1040 L290,1160 Z" fill="${h.fill}"/>
  <path d="M540,1480 V1160"/><circle cx="540" cy="1090" r="70" fill="${h.fill}"/><path d="M490,1090 h100" stroke-width="16"/>
  <path d="M860,1480 V1160"/><path d="M860,1020 L930,1090 L860,1160 L790,1090 Z" fill="${h.fill}"/>
  <g transform="translate(420 860) scale(0.55)" stroke-width="9">${pointing(h.fill)}</g>`;

export const v20: Video = {
  id: '20-pokazhi',
  title: 'Реклама: покажи и назови',
  theme: th,
  scene,
  heads: { A: A.head, B: B.head },
  wide: { fx: 545, fy: 1110, s: 1.25 },
  lines: [
    { shot: 'wide', text: '«Опять не заметил знак<br>на картинке билета»', a: 'sad', b: 'neutral' },
    { shot: 'b', text: '«А ты называй его вслух»', b: 'calm' },
    { shot: 'a', text: '«Вслух? Странно»', a: 'doubt' },
    { shot: 'b', text: '«Машинисты в Японии<br>так и делают»', b: 'cool' },
    { shot: 'a', text: '«Разговаривают со знаками?!»', a: 'shock' },
    { shot: 'b', text: '«Показывают пальцем<br>и называют. Каждый»', b: 'smile' },
    { shot: 'wide', text: '«Ладно: «Уступи дорогу»!»', a: 'grin', b: 'happy' },
  ],
  story: [
    { label: 'Япония, железная дорога', shots: [{ art: japan }] },
    { label: 'Машинист показывает на сигнал<br>и называет его вслух', shots: [{ art: driver }] },
    { label: 'Это «сиса канко» —<br>«показать и назвать»', shots: [{ art: hand }, { art: call }] },
    { label: 'В опыте 1994 года ошибок<br>стало на 85% меньше', shots: [{ art: bars }, { art: minus }] },
    { label: 'Замечай каждый знак', shots: [{ art: signs }] },
  ],
  table: {
    left: 'СМОТРЕТЬ',
    right: 'ЗАМЕЧАТЬ',
    leftIcon: '<path d="M-40,0 Q0,-34 40,0 Q0,34 -40,0 Z"/><circle r="12"/>',
    rightIcon: '<path d="M-36,10 V-6 Q-36,-14 -26,-14 H24 Q32,-14 32,-6 Q32,2 24,2 H0 V18 Q0,30 -12,30 H-26 Q-36,30 -36,20 Z"/>',
    rows: [
      ['картинка мелькнула', 'каждый знак назван'],
      ['пропустил знак', 'увидел знак'],
      ['ответ наугад', 'ответ по знаку'],
    ],
  },
  cta: ['Замечай', 'каждый знак', 'ещё до экзамена'],
  bioGlyph: '<path d="M-36,10 V-6 Q-36,-14 -26,-14 H24 Q32,-14 32,-6 Q32,2 24,2 H0 V18 Q0,30 -12,30 H-26 Q-36,30 -36,20 Z"/>',
};
