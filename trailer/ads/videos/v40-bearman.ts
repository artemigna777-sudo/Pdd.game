/**
 * 40. «Пилот „Формулы-1“ завалил экзамен на права» — по формуле cwex (`engine6.ts`), как ролики 34 и 36:
 * реальная история → басня на гравюре → расчёт → итог → вывод. Новое — 3D-кадры из Blender (`blender/`):
 * болид летит на камеру, машина проезжает знак STOP, не остановившись.
 *
 * История (Formula1.com, 21.02.2025): Оливер Бирман в 17 лет в Великобритании сдавал на права, решив, что
 * сдаст и без уроков, и не сдал: не остановился на знаке STOP, только сбавил скорость. Сдал со второй попытки;
 * в 2025-м — новичок «Формулы-1» в команде Haas, ему 19. Басня — Эзоп, «Заяц и черепаха».
 * Расчёт: знак 2.5 «Движение без остановки запрещено» — 7 вопросов в билетах (data/signs.json); по ПДД
 * остановиться нужно перед стоп-линией, а если её нет — перед краем пересекаемой проезжей части.
 */
import { carSide, floorLine, person } from '../draw.ts';
import { C, DLG, itext, pop, show } from '../engine3.ts';
import type { Video6 } from '../engine6.ts';
import { cloud, ground, sh, sky, wh } from '../etch.ts';
import { etree } from '../etch2.ts';
import { text } from '../kit.ts';
import { ghostStop, houses, lampPost, layer, nightSky, particles, signboard, skyline, street, trackPerspective, treeBg, windowGrid, rng } from '../scenery6.ts';

const N = C.night;

// ─── Завязка: светящиеся человечки ────────────────────────────────────────────

/** Учебная табличка «L» (Великобритания). */
const lPlate = (x: number, y: number) => `<rect x="${x}" y="${y}" width="64" height="64" rx="6" fill="#fff" stroke="none"/>${text(x + 32, y + 52, 52, '#e2231a', 'L', 'font-weight="900"')}`;

const teen = person(DLG, { id: 'T', x: 260, floor: 1460, pose: 'stand', f: 1, arms: ['hip', 'hip'], hair: 'spiky', face: 'cool' });
const cocky = `
  ${floorLine(1460)}
  ${carSide(720, 1460, N)}
  ${lPlate(940, 1250)}
  ${teen.svg}`;

const examiner = person(DLG, { id: 'E', x: 820, floor: 1460, pose: 'stand', f: -1, arms: ['front', 'down'], hold: 'paper', glasses: true, face: 'angry' });
const pupil = person(DLG, { id: 'P', x: 300, floor: 1460, pose: 'stand', f: 1, arms: ['down', 'down'], hair: 'spiky', face: 'shock' });
const failed = `
  ${floorLine(1460)}
  ${pupil.svg}
  ${examiner.svg}
  <g id="sc-x"><circle cx="560" cy="980" r="92" fill="${N}" stroke="${C.accent}" stroke-width="10"/><path d="M522,942 l76,76 M598,942 l-76,76" stroke="${C.accent}" stroke-width="14"/></g>`;

/** Мост: заяц и черепаха светящимися линиями. */
const raceGlow = `
  ${floorLine(1460)}
  <path d="M220,1380 Q230,1330 300,1328 Q380,1326 400,1370 Q404,1400 370,1404 Q300,1410 240,1404 Q214,1398 220,1380 Z" fill="${N}"/>
  <path d="M380,1340 Q396,1300 430,1310 Q448,1322 440,1342 Q428,1356 398,1352" fill="${N}"/>
  <path d="M396,1312 Q384,1240 402,1232 Q412,1270 408,1310 M414,1312 Q420,1236 440,1236 Q436,1282 424,1314" />
  <path d="M380,1402 Q420,1420 460,1410 M240,1402 Q200,1420 160,1400" />
  <path d="M640,1450 Q650,1360 740,1356 Q830,1360 840,1450 Z" fill="${N}"/><path d="M670,1450 Q700,1390 740,1400 Q780,1390 810,1450 M700,1376 L740,1450 L780,1376" stroke-width="3"/>
  <path d="M836,1430 Q870,1410 890,1424 Q894,1446 868,1450 L838,1450" fill="${N}"/>
  <g id="sc-q">${text(540, 1150, 130, C.accent, '?')}</g>`;

// ─── Окружение кадров с человечками (тусклое, без свечения) ──────────────────

/** Учебная табличка «L» на вывеске автошколы (тусклая). */
const lSign = (x: number, y: number) => `<rect x="${x}" y="${y}" width="56" height="56" rx="6" fill="#b9bfcc" stroke="none" opacity="0.55"/>${text(x + 28, y + 46, 46, '#a32a24', 'L', 'font-weight="900" opacity="0.8"')}`;

/** Улица у автошколы: автошкола за героем, дома, фонарь, дерево, тротуар и дорога. */
const cockyBg = `
  ${nightSky(401, 380, 860)}
  ${skyline(-300, 1400, 980, 402, 160, 420)}
  ${houses(470, 1400, 1460, 403, 420, 560)}
  <rect x="40" y="880" width="440" height="580" fill="#0b111d"/><path d="M20,880 H500"/>
  ${windowGrid(40, 1000, 440, 340, rng(404), [84, 96], 0.5)}
  ${signboard(150, 900, 320, 70, 'АВТОШКОЛА', 36)}${lSign(80, 907)}
  <path d="M350,1460 V1350 H450 V1460"/>
  ${treeBg(1010, 1460, 0.9)}
  ${lampPost(540, 1460, 1)}
  ${street(1460)}
  <g opacity="0.75">${carSide(380, 1700, '#0b111d')}</g>`;

/** Экзаменационный центр: большое здание, флагшток, конусы площадки, тротуар и дорога. */
const examBg = `
  ${nightSky(411, 330, 800)}
  ${skyline(-300, 1400, 900, 412, 120, 300)}
  <rect x="40" y="800" width="1000" height="660" fill="#0b111d"/><path d="M20,800 H1060 M40,840 H1040"/>
  ${windowGrid(40, 880, 1000, 380, rng(413), [100, 110], 0.45)}
  ${signboard(250, 812, 580, 64, 'ЭКЗАМЕНАЦИОННЫЙ ЦЕНТР', 30)}
  <path d="M480,1460 V1330 H640 V1460 M560,1330 V1460"/>
  <path d="M-80,1460 V930"/><path d="M-80,936 h90 v54 h-90" fill="#3a1d1a" opacity="0.7"/>
  ${street(1460)}
  ${[180, 330, 480, 630, 780, 930].map((x) => `<path d="M${x - 22},1860 L${x},1800 L${x + 22},1860 Z" fill="#3b2418" stroke="#9a5a33" opacity="0.8"/>`).join('')}
  <g opacity="0.75">${carSide(820, 1740, '#0b111d')}</g>`;

/** Ночное поле для басни-моста: холмы, деревья, ограда с флажками, дорожка. */
const raceBg = `
  ${nightSky(421, 360, 1000)}
  <circle cx="860" cy="560" r="70" fill="#c9cfdb" stroke="none" opacity="0.18"/><circle cx="860" cy="560" r="44" fill="#d8dde8" stroke="none" opacity="0.25"/>
  <path d="M-200,1240 Q120,1080 420,1180 Q700,1270 960,1120 Q1140,1040 1300,1160 V1460 H-200 Z" fill="#0b111d"/>
  <path d="M-200,1320 Q200,1240 560,1300 Q900,1360 1300,1260 V1460 H-200 Z" fill="#0a0f1a"/>
  ${treeBg(60, 1300, 0.8)}${treeBg(990, 1270, 0.7)}${treeBg(520, 1290, 0.55)}
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${-60 + i * 110},1460 V1360"/>`).join('')}
  <path d="M-60,1372 Q-5,1400 50,1372 Q105,1400 160,1372 Q215,1400 270,1372 Q325,1400 380,1372 Q435,1400 490,1372 Q545,1400 600,1372 Q655,1400 710,1372 Q765,1400 820,1372 Q875,1400 930,1372 Q985,1400 1040,1372 Q1095,1400 1150,1372" stroke-width="2"/>
  ${Array.from({ length: 22 }, (_, i) => `<path d="M${-50 + i * 55},${1380 + (i % 2) * 4} l16,30 l16,-30" fill="${i % 3 === 0 ? '#6e3a24' : i % 3 === 1 ? '#2c3a56' : '#3b4252'}" stroke-width="1.5" opacity="0.8"/>`).join('')}
  ${street(1460)}`;

// ─── Подписи к 3D-кадру со знаком: спидометр ─────────────────────────────────

const hud = `<div class="card" id="hud" style="left:120px;top:1500px;width:840px;height:200px">
  <div style="position:absolute;left:40px;top:34px;font-size:26px;font-weight:800;letter-spacing:2px;color:#8b93a3">СКОРОСТЬ</div>
  <div style="position:absolute;left:40px;top:70px;font-size:84px;font-weight:900;color:#fff"><span id="spd">45</span><span style="font-size:36px;color:#8b93a3"> км/ч</span></div>
  <div style="position:absolute;right:40px;top:34px;text-align:right;font-size:26px;font-weight:800;letter-spacing:2px;color:#8b93a3">ОСТАНОВКА</div>
  <div id="stopNo" style="position:absolute;right:40px;top:84px;font-size:64px;font-weight:900;color:${C.accent};opacity:0">НЕТ</div>
  <div id="stopWait" style="position:absolute;right:40px;top:84px;font-size:64px;font-weight:900;color:#3a4252">…</div>
</div>`;

const hookTweens = (T: { hook: number[]; bridge: number[] }) => {
  const [, , t2, t3, t4] = T.hook;
  return [
    `tl.fromTo('#hud', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, ${(t2 + 0.1).toFixed(3)});`,
    `tl.fromTo('#spd', { innerText: 45 }, { innerText: 9, snap: { innerText: 1 }, duration: 1.9, ease: 'power2.out' }, ${(t2 + 0.1).toFixed(3)});`,
    `tl.set('#stopWait', { opacity: 0 }, ${(t2 + 2.05).toFixed(3)});`,
    pop('#stopNo', t2 + 2.05, 0.2),
    pop('#s3-x', t3 + 0.35, 0.22),
    pop('#s4-q', t4, 0.25),
  ].join('\n      ');
};

// ─── Басня на гравюре: «Заяц и черепаха» ──────────────────────────────────────

const I = C.ink;
const at = (x: number, y: number, s: number, body: string, cls = '', hidden = false) =>
  `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})" ${hidden ? 'opacity="0"' : ''}>${body}</g>`;

/** Заяц бежит (вправо): тело, голова, длинные уши, вытянутые лапы, хвост, линии скорости. */
const hareRun = `
  <path d="M-170,-30 H-110 M-190,-4 H-120 M-160,22 H-100" stroke-width="3"/>
  ${sh('M-70,0 Q-60,-52 0,-50 Q60,-48 82,-12 Q92,18 50,28 Q-20,36 -62,24 Q-82,14 -70,0 Z', 'a60', 'stroke-width="4"')}
  ${sh('M84,-62 Q66,-150 94,-158 Q108,-112 100,-62 Z', 'b30', 'stroke-width="3"')}${sh('M102,-64 Q108,-156 132,-154 Q126,-104 112,-58 Z', 'b30', 'stroke-width="3"')}
  ${sh('M58,-40 Q78,-78 116,-64 Q138,-52 128,-30 Q112,-14 80,-18 Z', 'a120', 'stroke-width="4"')}
  <circle cx="112" cy="-46" r="5" fill="${I}"/>
  <path d="M52,18 Q96,40 146,30 M30,24 Q70,52 120,50 M-50,20 Q-100,42 -150,24 M-30,26 Q-80,56 -128,50" stroke-width="7"/>
  ${wh('M-84,-14 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0', 'stroke-width="3"')}`;

/** Заяц спит, свернувшись: уши назад, глаз закрыт, «з-з-з». */
const hareSleep = `
  ${sh('M-74,12 Q-74,-50 0,-54 Q72,-52 78,0 Q74,26 0,28 Q-62,28 -74,12 Z', 'a60', 'stroke-width="4"')}
  ${sh('M68,-28 Q16,-74 -40,-62 Q16,-56 62,-20 Z', 'b30', 'stroke-width="3"')}
  ${sh('M50,-8 Q60,-40 98,-30 Q118,-18 108,4 Q88,18 60,12 Z', 'a120', 'stroke-width="4"')}
  <path d="M84,-16 q8,6 16,0" stroke-width="3"/>
  ${text(40, -110, 40, I, 'z', 'font-style="italic"')}${text(84, -150, 52, I, 'z', 'font-style="italic"')}${text(136, -196, 64, I, 'Z', 'font-style="italic"')}`;

/** Черепаха идёт (вправо): панцирь, голова, лапы. */
const tortoise = `
  ${sh('M-58,0 L-64,30 L-42,30 L-38,0 Z', 'a90', 'stroke-width="3"')}${sh('M34,0 L30,30 L52,30 L56,0 Z', 'a90', 'stroke-width="3"')}
  ${sh('M-84,2 Q-74,-84 0,-88 Q74,-84 84,2 Z', 'x45', 'stroke-width="5"')}
  <path d="M-84,2 H84" stroke-width="5"/>
  <path d="M-40,-62 L0,-40 L40,-62 M0,-40 V2 M-62,-24 L-30,-14 M62,-24 L30,-14" stroke-width="3"/>
  ${sh('M80,-12 Q110,-34 134,-18 Q142,2 114,6 L80,4 Z', 'a120', 'stroke-width="4"')}
  <circle cx="120" cy="-14" r="4.5" fill="${I}"/>
  <path d="M-84,-4 L-104,4" stroke-width="5"/>`;

/** Финиш: два столба и лента с надписью. */
const finish = `
  <path d="M860,1262 V1000 M1060,1262 V1000" stroke-width="10"/>
  ${wh('M856,1010 H1064 V1074 H856 Z', 'stroke-width="5"')}
  ${text(960, 1058, 40, I, 'ФИНИШ', 'font-weight="900" letter-spacing="4"')}`;

const tableau = `
  ${sky()}
  ${cloud(240, 560, 230)}${cloud(860, 640, 200)}
  ${sh('M-400,1180 L-60,1110 L300,1160 L640,1090 L980,1150 L1480,1100 V1220 H-400 Z', 'c30')}
  ${ground(1200)}
  ${sh('M-400,1236 Q300,1214 1480,1240 V1292 Q300,1278 -400,1300 Z', 'c0')}
  ${etree(680, 1236, 440, 4)}
  ${finish}
  <path d="M60,1262 V1040" stroke-width="8"/>${sh('M60,1044 L150,1070 L60,1096 Z', 'b30', 'stroke-width="4"')}
  ${at(430, 1226, 1.05, hareRun, 'hr')}
  ${at(610, 1250, 1.0, hareSleep, 'hs', true)}
  ${at(250, 1262, 0.85, tortoise, 'tw')}
  ${at(960, 1262, 0.85, tortoise, 'tf', true)}`;

// ─── Расчёт: знак 2.5 ─────────────────────────────────────────────────────────

const octagon = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="#d81e1e" stroke="#fff" stroke-width="10"/>${text(cx, cy + r * 0.2, r * 0.56, '#fff', 'STOP', 'font-weight="900"')}`;
};

const info = {
  html: `
    ${itext('i-h', 300, 40, 'ЗНАК 2.5 — «ДВИЖЕНИЕ<br>БЕЗ ОСТАНОВКИ ЗАПРЕЩЕНО»')}
    <svg id="i-sign" viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0;opacity:0">${octagon(540, 600, 130)}</svg>
    ${itext('i-1', 790, 52, 'ОСТАНОВКА — ОБЯЗАТЕЛЬНА', '#fff', 900)}
    ${itext('i-2', 870, 30, 'ПЕРЕД СТОП-ЛИНИЕЙ, ДАЖЕ ЕСЛИ ДОРОГА ПУСТАЯ', C.dim, 700)}
    ${itext('i-3', 990, 40, 'В БИЛЕТАХ ПДД С ЭТИМ ЗНАКОМ', '#fff', 800)}
    ${itext('i-big', 1060, 120, '7 ВОПРОСОВ', C.accent, 900)}
    ${itext('i-s', 1240, 34, 'СБАВИТЬ СКОРОСТЬ ≠ ОСТАНОВИТЬСЯ', C.dim, 800)}`,
  tweens: (t: number[]) =>
    [
      show('#i-h', t[0]),
      `tl.fromTo('#i-sign', { opacity: 0, scale: 0.6, transformOrigin: '50% 31%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${(t[0] + 0.25).toFixed(3)});`,
      pop('#i-1', t[1], 0.2),
      show('#i-2', t[2]),
      show('#i-3', t[3]),
      pop('#i-big', t[4], 0.22),
      show('#i-s', t[5]),
    ].join('\n      '),
};

// ─── Живые фоны чёрных экранов ────────────────────────────────────────────────

const T6 = { info: [25.933, 30.867], outcome: [30.867, 33.0], cta: [33.5, 39.133], bio: [39.133, 42.433] };
const pInfo = particles('pi', 36, 431, T6.info[0], T6.info[1]);
const pOut = particles('po', 30, 432, T6.outcome[0], T6.outcome[1]);
const pCta = particles('pc', 40, 433, T6.cta[0], T6.cta[1], [0, 300, 1080, 1500], '#ffb37a');
const pBio = particles('pb', 26, 434, T6.bio[0], T6.bio[1]);

/** Улица ночью снизу: город, дорога со стоп-линией. */
const cityRoad = (base: number, seed: number) => `
  ${skyline(-60, 1140, base, seed, 160, 420)}
  <rect x="0" y="${base}" width="1080" height="${1920 - base}" fill="#070b13" stroke="none"/>
  <path d="M0,${base} H1080"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${40 + i * 200},${base + 120} h110" stroke="#8a93a6" stroke-width="8" opacity="0.4"/>`).join('')}`;

/** Огни машин по ночной дороге (полоски, которые едут вправо). */
const streaks = (y: number) =>
  Array.from({ length: 5 }, (_, i) => `<path id="st${i}" d="M${-300 - i * 260},${y + (i % 2) * 70} h${140 + (i % 3) * 40}" stroke="${i % 2 ? '#e0453a' : '#ffd9a0'}" stroke-width="6" opacity="0.45"/>`).join('');

const backdrop = {
  info: `<div id="bdi" style="position:absolute;inset:0">${layer('bdi-s', `
    ${ghostStop(540, 1560, 360, 0.09)}
    ${cityRoad(1640, 435)}
    <path d="M120,1780 H960" stroke="#e8ecf2" stroke-width="16" opacity="0.35"/>
    ${pInfo.svg}`)}</div>`,
  outcome: `<div id="bdo" style="position:absolute;inset:0">${layer('bdo-s', `
    ${skyline(-60, 1140, 1300, 436, 110, 280)}
    ${trackPerspective(1300)}
    ${pOut.svg}`)}</div>`,
  cta: `<div id="bdc" style="position:absolute;inset:0">${layer('bdc-s', `
    ${nightSky(437, 120, 520)}
    ${cityRoad(1560, 438)}
    ${streaks(1640)}
    ${pCta.svg}`)}</div>`,
  bio: `<div id="bdb" style="position:absolute;inset:0;opacity:0.7">${layer('bdb-s', `
    ${nightSky(439, 120, 520)}
    ${cityRoad(1560, 438)}
    ${pBio.svg}`)}</div>`,
};

const backdropTweens = () =>
  [
    pInfo.tweens,
    pOut.tweens,
    pCta.tweens,
    pBio.tweens,
    `tl.fromTo('#bdi', { scale: 1, transformOrigin: '50% 80%' }, { scale: 1.06, duration: ${(T6.info[1] - T6.info[0]).toFixed(3)}, ease: 'none' }, ${T6.info[0]});`,
    `tl.fromTo('#bdo', { scale: 1, transformOrigin: '50% 68%' }, { scale: 1.08, duration: ${(T6.outcome[1] - T6.outcome[0]).toFixed(3)}, ease: 'none' }, ${T6.outcome[0]});`,
    `tl.fromTo('#bdc', { scale: 1.05, transformOrigin: '50% 80%' }, { scale: 1, duration: ${(T6.cta[1] - T6.cta[0]).toFixed(3)}, ease: 'none' }, ${T6.cta[0]});`,
    ...Array.from({ length: 5 }, (_, i) => `tl.fromTo('#st${i}', { x: 0 }, { x: ${1700 + i * 120}, duration: ${(T6.cta[1] - T6.cta[0]).toFixed(3)}, ease: 'none' }, ${T6.cta[0]});`),
  ].join('\n      ');

export const v40: Video6 = {
  id: '40-bearman',
  title: 'Реклама: пилот «Формулы-1» завалил экзамен',
  scenes: { cocky, failed, race: raceGlow },
  shots: [
    { video: 'f1.mp4', cap: 'Пилот «Формулы-1»<br>завалил экзамен на права', sub: 'Оливер Бирман · реальная история' },
    { scene: 'cocky', bg: cockyBg, cam: [560, 1260, 1.15], to: [540, 1250, 1.26], cap: 'В 17 лет решил:<br>«Уроки мне не нужны»', sub: 'Великобритания', faces: { T: 'cool' } },
    { video: 'stop.mp4', cap: 'И не остановился<br>на знаке STOP', sub: 'просто сбавил скорость', ui: hud },
    { scene: 'failed', bg: examBg, cam: [560, 1200, 1.15], to: [560, 1190, 1.24], cap: 'Экзамен не сдан', faces: { P: 'shock', E: 'angry' } },
    { scene: 'race', bg: raceBg, cam: [540, 1300, 1.05], to: [540, 1300, 1.1], cap: 'Как заяц в гонке<br>с черепахой', accent: true },
  ],
  hookTweens,
  tableau,
  story: [
    { fx: 560, fy: 1160, s: 0.95, ds: 1.04, label: 'Эзоп.<br>«Заяц и черепаха»' },
    { fx: 450, fy: 1180, s: 1.9, label: 'Заяц был быстрее всех' },
    { fx: 650, fy: 1180, s: 1.7, label: 'Решил: «Успею» —<br>и прилёг отдохнуть', on: '.hs', off: '.hr' },
    { fx: 270, fy: 1210, s: 2.0, label: 'А черепаха шла<br>шаг за шагом' },
    { fx: 950, fy: 1150, s: 1.6, ds: 1.04, label: 'И первой<br>пересекла финиш', on: '.tf', off: '.tw' },
    { fx: 560, fy: 1160, s: 0.92, ds: 1.06, label: 'Скорость<br>не заменяет подготовку' },
  ],
  info,
  outcome: { title: 'Со второй попытки<br>он сдал', sub: `а в 2025-м вышел на старт <span style="color:${C.accent}">«Формулы-1»</span>` },
  cta: { lines: ['Быстрый —', 'ещё не готовый.', 'Готовый —', 'знает правила.'], accent: 3 },
  backdrop,
  extra: backdropTweens,
  bioGlyph: `<polygon points="${Array.from({ length: 8 }, (_, i) => `${(38 * Math.cos(Math.PI / 8 + (i * Math.PI) / 4)).toFixed(1)},${(38 * Math.sin(Math.PI / 8 + (i * Math.PI) / 4)).toFixed(1)}`).join(' ')}" fill="${C.accent}" stroke="none"/>`,
};
