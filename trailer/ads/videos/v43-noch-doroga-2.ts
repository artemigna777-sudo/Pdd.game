/**
 * Ролик 43 «Правила ночной дороги. Часть 2» (вариант Б «Фура без водителя») — по сценарию Gemini
 * (`GEMINI-42.md`), перерисованному в стиле части 1. Озвучка — ElevenLabs («Sergey», голос рассказчика), время слов —
 * faster-whisper (`v43-words.json`). Правила 6–10 — пункты ПДД РФ 9.10, 11.2, разметка 1.1, 11.1, 12.4 (см. README).
 */
import { readFileSync } from 'node:fs';
import { P, makeSubs, ruleNote, type Shot8, type Video8, type Word } from '../engine8.ts';
import { bridgePOV, carTop, ghostPerson, hero, glow, logTruck, noteSheet, pines, roadPOV, sky, speedo, svg, forest, truckRear } from '../scenery8.ts';
import { carRear, forestRoad, heartbeat, choiceCard, windshield, wheelHands } from './v42-noch-doroga.ts';

const words: Word[] = JSON.parse(readFileSync(new URL('./v43-words.json', import.meta.url), 'utf8'));
/** Сдвиг: первые 7,2 с — «Ранее» (повтор части 1), озвучка начинается после них. */
const OFF = 7.2;
const T = (i: number) => words[i][1] + OFF;
const END = 198.7;
/** Центр правой (lx) и левой (lxL) полосы на глубине y: фура и хэтчбек едут в одной полосе. */
const lx = (y: number) => 540 + (380 * (y - 880)) / 1040;
const lxL = (y: number) => 540 - (380 * (y - 880)) / 1040;

const shots: Shot8[] = [];
const add = (t0: number, t1: number, art: string, rest: Partial<Shot8> = {}) => shots.push({ t0, t1, art: svg(art), ...rest });
let roadN = 0;
const road = (y = 900, o: { seed?: number; moon?: boolean } = {}) => forestRoad({ y, beams: true, moon: o.moon, seed: o.seed, extra: roadsideExtras(y, `fog${roadN++}`) });
/** Красные стоп-огни фуры, мигают азбукой Морзе. */
const morse = (id: string, t0: number, t1: number) => {
  const pat = [0.2, 0.2, 0.2, 0.5, 0.2, 0.5, 0.5, 0.2, 0.2];
  let t = t0 + 0.2;
  let out = '';
  let k = 0;
  while (t < t1 - 0.3) {
    const d = pat[k++ % pat.length];
    out += `tl.set('${id}', { opacity: 1 }, ${t.toFixed(2)}); tl.set('${id}', { opacity: 0.08 }, ${(t + d).toFixed(2)});`;
    t += d + 0.25;
  }
  return out;
};
const brakeLights = (x: number, y: number, s: number, id: string) =>
  `<g id="${id}" opacity="0.08" transform="translate(${x} ${y}) scale(${s})">${glow(-170, 26, 190, 'gGlowR')}${glow(170, 26, 190, 'gGlowR')}</g>`;
const amberBlink = (x: number, y: number, s: number, id: string) =>
  `<g id="${id}" transform="translate(${x} ${y}) scale(${s})">${glow(0, 0, 130, 'gGlowY')}<rect x="-26" y="-12" width="52" height="24" rx="5" fill="#ffc23d"/></g>`;
const blink = (id: string, t0: number, t1: number) => `tl.fromTo('${id}', { opacity: 1 }, { opacity: 0.08, duration: 0.28, repeat: ${Math.max(1, Math.floor((t1 - t0) / 0.56))}, yoyo: true, ease: 'steps(1)' }, ${t0.toFixed(2)});`;

/** Герой за рулём, вид через лобовое стекло; `face` — выражение, `lean` — наклон головы (высунулся). */
const driver = (face: 'calm' | 'worry' | 'scared' | 'shock' | 'focus' | 'side', o: { id?: string; lean?: number } = {}) =>
  `${windshield(`<g ${o.id ? `id="${o.id}"` : ''}>${hero(540 - (o.lean ?? 0), 680, 1.05, face, { light: P.cyan })}</g>${wheelHands}`)}`;
/** Столбики-отражатели вдоль дороги и дрейфующий туман — чтобы дорога не была пустой. */
const roadsideExtras = (y0: number, id: string) => {
  const posts = Array.from({ length: 9 }, (_, k) => {
    const t = Math.pow((k + 0.5) / 9, 2.2);
    const yy = y0 + (1920 - y0) * t;
    const dx = 760 * t * 1.08 + 8;
    const h = 8 + 120 * t;
    return `<rect x="${540 - dx - 5 * t}" y="${yy - h}" width="${3 + 11 * t}" height="${h}" fill="#10162a"/><rect x="${540 - dx - 5 * t}" y="${yy - h}" width="${3 + 11 * t}" height="${Math.max(2, h * 0.22)}" fill="#ffd25a"/>` +
      `<rect x="${540 + dx}" y="${yy - h}" width="${3 + 11 * t}" height="${h}" fill="#10162a"/><rect x="${540 + dx}" y="${yy - h}" width="${3 + 11 * t}" height="${Math.max(2, h * 0.22)}" fill="#ff5a4a"/>`;
  }).join('');
  return `${posts}<g id="${id}"><rect x="-300" y="${y0 + 80}" width="1700" height="240" fill="url(#gFog)" opacity="0.55"/></g>`;
};
const fogDrift = (id: string, t0: number, t1: number) => `tl.fromTo('#${id}', { x: -160 }, { x: 160, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0.toFixed(2)});`;
// «Ранее»: короткий пересказ части 1 (озвучки нет, только субтитры и музыка).
add(0, 2.6, driver('calm'), { cam: { s: [1.0, 1.1], oy: 700 } });
add(2.6, 5.0, `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 760, 760, 'gLamp')}${noteSheet(540, 800, 860, 940, [{ text: 'Если читаешь это —' }, { text: 'ты уже на экзамене.' }, { text: 'Ошибёшься —', color: '#b8231f' }, { text: 'останешься на ней.', color: '#b8231f' }], { id: 'nr', head: '2006', rot: -2 })}`, { cam: { s: [1.0, 1.1], oy: 760 } });
const strip = (y: number, rot: number, n: number, t: string) => `<g transform="translate(540 ${y}) rotate(${rot})"><rect x="-400" y="-70" width="800" height="140" rx="6" fill="${P.paper}"/><rect x="-440" y="-84" width="120" height="40" fill="rgba(230,214,170,0.75)" transform="rotate(-20 -380 -60)"/><text x="-370" y="-18" font-family="Montserrat" font-weight="900" font-size="28" fill="#3a3f55">ПРАВИЛО <tspan fill="#d42f2f">№${n}</tspan></text><text x="-370" y="30" font-family="Montserrat" font-weight="900" font-size="42" fill="#1a1d2c">${t}</text></g>`;
add(5.0, OFF, `<rect width="1080" height="1920" fill="#0b0f1c"/>${[['Мигающий жёлтый', -3], ['Знак «Стоп»', 2], ['Дальний свет за 150 м', -2], ['Машина у перехода', 3], ['На мосту не обгоняй', -2]].map(([t, r], k) => strip(360 + k * 190, r as number, k + 1, t as string)).join('')}`, { cam: { s: [1.0, 1.06], oy: 800 } });
// 0. Он едет за фурой.
add(OFF, T(14), `${road(880, { moon: true })}${truckRear(lx(1010), 1010, 0.62, { id: 'tr0' })}${brakeLights(lx(1010), 1010, 0.62, 'bl0')}${carRear(lx(1560), 1560, 0.95, { id: 'car0' })}`, {
  cam: { s: [1.08, 1.0], oy: 1300 },
  tweens: (t0) => `tl.fromTo('#tr0', { y: 0 }, { y: -5, duration: 0.8, repeat: 9, yoyo: true, ease: 'sine.inOut' }, ${t0});`,
});
// 1. Спидометр: ровно 70.
add(T(14), T(18), `<rect width="1080" height="1920" fill="#06080f"/>${speedo(540, 900, 380, 'sp1', 70)}
  <text x="540" y="1340" font-family="Montserrat" font-weight="900" font-size="120" fill="#8ff0ff" text-anchor="middle">70</text>`, {
  cam: { s: [1.0, 1.08], oy: 900 },
  tweens: (t0) => `tl.fromTo('#sp1', { rotation: -40, svgOrigin: '0 0' }, { rotation: 0, duration: 0.5, ease: 'power2.out' }, ${t0});`,
});
// 2. Кабина: водителя нет.
add(T(18), T(29), `<rect width="1080" height="1920" fill="#070a13"/>${glow(540, 800, 700, 'gGlowW', 'opacity="0.18"')}
  <rect x="150" y="380" width="780" height="900" rx="40" fill="#10162a"/><rect x="190" y="420" width="700" height="820" rx="24" fill="#05070d"/>
  <path d="M360 1240 L380 760 Q390 700 450 700 L630 700 Q690 700 700 760 L720 1240 Z" fill="#1a2036"/>
  <g id="wh2"><circle cx="540" cy="980" r="200" fill="none" stroke="#161b2e" stroke-width="34"/><path d="M340 980 L740 980 M540 980 L540 1180" stroke="#161b2e" stroke-width="26"/><circle cx="540" cy="980" r="44" fill="#161b2e"/></g>`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0, t1) => `tl.fromTo('#wh2', { rotation: -20, svgOrigin: '540 980' }, { rotation: 30, duration: ${(t1 - t0).toFixed(2)}, ease: 'sine.inOut' }, ${t0});`,
});
// 3. Стоп-сигналы мигают точками и тире.
add(T(29), T(43), `${road(840, { seed: 7 })}${truckRear(lx(1280), 1280, 1.3, { id: 'tr3' })}${brakeLights(lx(1280), 1280, 1.3, 'bl3')}`, {
  cam: { s: [1.0, 1.06], oy: 1250 },
  tweens: (t0, t1) => morse('#bl3', t0, t1),
});
// 4. Записка шевелится на сиденье.
const note4 = noteSheet(540, 840, 880, 960, [{ text: 'Дистанция —' }, { text: 'держи такую, чтобы' }, { text: 'успеть остановиться.', color: '#b8231f' }], { id: 'n4', head: '2006', rot: -3 });
add(T(43), T(60), `<rect width="1080" height="1920" fill="#0b0d16"/><path d="M-50 1500 Q540 1380 1130 1500 L1130 1920 L-50 1920 Z" fill="#141a30"/>${glow(540, 800, 800, 'gLamp')}${note4}`, {
  cam: { s: [1.0, 1.12], oy: 800 },
  tweens: (t0) => `tl.fromTo('#n4', { y: 0 }, { y: -18, duration: 0.8, repeat: 8, yoyo: true, ease: 'sine.inOut' }, ${t0});
    ${[0, 1, 2].map((k) => `tl.fromTo('#n4-l${k}', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${(T(55) + k * 1.2).toFixed(2)});`).join('')}`,
});
// 5. Правило: дистанция.
add(T(60), T(73), `${road(880, { seed: 11 })}${truckRear(lx(1060), 1060, 0.75, { id: 'tr5' })}${carRear(lx(1640), 1640, 1.0)}
  <g id="gap5"><path d="M780 1160 L780 1500 M740 1160 L820 1160 M740 1500 L820 1500" stroke="${P.cyan}" stroke-width="10" fill="none" stroke-linecap="round"/></g>`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0) => `tl.fromTo('#gap5', { opacity: 0, scale: 0.7, svgOrigin: '780 1330' }, { opacity: 1, scale: 1, duration: 0.4 }, ${T(65)});`,
});
// 6. Прицеп бьёт по тормозам, визг.
add(T(73), T(84), `${road(860, { seed: 12 })}<g id="tr6">${truckRear(lx(1010), 1010, 0.7)}${brakeLights(lx(1010), 1010, 0.7, 'bl6')}</g>${carRear(lx(1600), 1600, 1.0, { id: 'car6' })}`, {
  cam: { s: [1.0, 1.1], oy: 1300 },
  tweens: () => `tl.set('#bl6', { opacity: 1 }, ${T(75)});
    tl.fromTo('#tr6', { scale: 0.85, svgOrigin: '${lx(1010)} 1010' }, { scale: 1.55, duration: 0.7, ease: 'power3.in' }, ${(T(83) - 0.2).toFixed(2)});`,
});
// 6б. Герой: педаль в пол.
add(T(84), T(91), driver('scared'), { cam: { s: [1.0, 1.1], oy: 700 } });
// 6в. Хэтчбек замирает в полуметре от бампера.
add(T(91), T(96), `${road(860, { seed: 12 })}${truckRear(lx(1010), 1010, 1.55)}${brakeLights(lx(1010), 1010, 1.55, 'bl6c')}${carRear(lx(1590), 1590, 1.0, { id: 'car6c' })}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0) => `tl.set('#bl6c', { opacity: 1 }, ${t0});tl.fromTo('#car6c', { y: 40 }, { y: -10, duration: 0.45, ease: 'power4.out' }, ${t0});`,
});
// 7. Фура набирает ход. Парень решает обойти.
add(T(96), T(100), `${road(880, { seed: 13 })}${truckRear(lx(1030), 1030, 0.72)}${carRear(lx(1560), 1560, 1.0)}`, { cam: { s: [1.0, 1.06], oy: 1300 } });
add(T(100), T(107), driver('focus'), { cam: { s: [1.0, 1.08], oy: 700 } });
add(T(107), T(114), `${road(880, { seed: 13 })}${truckRear(lx(1030), 1030, 0.72, { id: 'tr7' })}${amberBlink(lx(1030) - 122, 1048, 0.72, 'bk7')}${carRear(lx(1560), 1560, 1.0, { id: 'car7' })}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0, t1) => `tl.fromTo('#car7', { x: 0 }, { x: -300, duration: 1.2, ease: 'power2.inOut' }, ${t0});${blink('#bk7', T(111), t1)}`,
});
// 8. Новая строчка в записке.
add(T(114), T(122), `<rect width="1080" height="1920" fill="#0b0d16"/>${glow(540, 800, 800, 'gLamp')}${noteSheet(540, 840, 880, 960, [{ text: 'Впереди сигнал налево —' }, { text: 'не обгоняй.', color: '#b8231f' }], { id: 'n8', head: '2006', rot: 2 })}`, {
  cam: { s: [1.0, 1.1], oy: 820 },
  tweens: () => `tl.fromTo('#n8-l0', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(116)});tl.fromTo('#n8-l1', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(122)});`,
});
// 9. Сбросил газ, вернулся в ряд.
add(T(122), T(132), `${road(880, { seed: 14 })}${truckRear(lx(1030), 1030, 0.72)}${amberBlink(lx(1030) - 122, 1048, 0.72, 'bk9')}${carRear(lxL(1560), 1560, 1.0)}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0, t1) => blink('#bk9', t0, t1),
});
add(T(132), T(138), driver('worry'), { cam: { s: [1.0, 1.08], oy: 700 } });
add(T(138), T(142), `${road(880, { seed: 14 })}${truckRear(lx(1030), 1030, 0.72)}${carRear(lx(1560), 1560, 1.0, { id: 'car9' })}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0) => `tl.fromTo('#car9', { x: -300 }, { x: 0, duration: 1.0, ease: 'power2.out' }, ${t0});`,
});
// 10. Бетонная опора слева.
add(T(142), T(154), `${road(880, { seed: 15 })}${carRear(lx(1560), 1560, 1.0, { id: 'car10' })}
  <g id="pil10"><rect x="-80" y="500" width="150" height="1500" fill="#252d47"/><rect x="-80" y="500" width="40" height="1500" fill="#333c5a"/></g>`, {
  cam: { s: [1.0, 1.05], oy: 1300 },
  tweens: () => `tl.fromTo('#pil10', { x: 0, scaleX: 0.3, svgOrigin: '0 900' }, { x: 380, scaleX: 3.2, duration: 1.1, ease: 'power2.in' }, ${T(145)});
    tl.fromTo('#car10', { x: 0 }, { x: 70, duration: 0.5, ease: 'power3.out' }, ${T(145) + 0.4});`,
});
// 11. Белая сплошная.
const solidRoad = (extra = '') => `${sky({ seed: 21 })}${forest(880, 22)}
  <path d="M-300 1920 L530 880 L550 880 L1380 1920 Z" fill="url(#gRoad)"/>
  <path d="M528 880 L552 880 L600 1920 L480 1920 Z" fill="#e8e8ee"/>
  <path d="M-100 1920 L520 880 L530 880 L420 1920 Z" fill="#8d93a6" opacity="0.4"/>${extra}`;
add(T(154), T(176), solidRoad(`<g id="lbl11"><rect x="300" y="1280" width="480" height="140" rx="70" fill="rgba(10,13,24,0.88)" stroke="#e8e8ee" stroke-width="6"/><text x="540" y="1370" font-family="Montserrat" font-weight="900" font-size="72" fill="#fff" text-anchor="middle">1.1</text></g>`), {
  cam: { s: [1.0, 1.12], oy: 1100 },
  tweens: () => `tl.fromTo('#lbl11', { opacity: 0, scale: 0.6, svgOrigin: '540 1350' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${T(159)});`,
});
// 12. По встречной проносятся силуэты без фар.
add(T(176), T(194), `<rect width="1080" height="1920" fill="#101628"/><rect x="240" y="-50" width="600" height="2020" fill="#232a44"/>
  <rect x="528" y="-50" width="24" height="2020" fill="#e8e8ee"/>
  ${carTop(690, 1500, 0, '#c9ccd6', { lights: true })}
  <g id="g12a">${carTop(390, -200, 180, '#12151f', { ghost: true })}</g><g id="g12b">${carTop(420, -900, 180, '#12151f', { ghost: true })}</g><g id="g12c">${carTop(380, -1500, 180, '#12151f', { ghost: true })}</g>`, {
  cam: { s: [1.0, 1.05], oy: 900 },
  tweens: (t0, t1) => `tl.to('#g12a', { y: 2300, duration: 1.2, ease: 'none' }, ${T(182)});tl.to('#g12b', { y: 2900, duration: 1.4, ease: 'none' }, ${T(182) + 0.3});tl.to('#g12c', { y: 3500, duration: 1.5, ease: 'none' }, ${T(182) + 0.9});`,
});
// 13. Сплошная сменилась прерывистой, правый поворотник.
add(T(194), T(206), `${road(880, { seed: 25 })}${truckRear(lx(1030), 1030, 0.72)}${amberBlink(lx(1030) + 122, 1048, 0.72, 'bk13')}${carRear(lx(1560), 1560, 1.0)}`, {
  cam: { s: [1.0, 1.08], oy: 1300 },
  tweens: (t0, t1) => blink('#bk13', T(197), t1),
});
// 14. Бумага темнеет: «чужой сигнал».
add(T(206), T(231), `<rect width="1080" height="1920" fill="#0b0d16"/>${glow(540, 800, 800, 'gLamp', 'opacity="0.6"')}${noteSheet(540, 840, 880, 960, [{ text: 'Чужой сигнал —' }, { text: 'не разрешение.' }, { text: 'Убедись сам.', color: '#b8231f' }], { id: 'n14', rot: -2 })}
  <rect id="dk14" x="100" y="360" width="880" height="960" fill="#2a1a0c" opacity="0" style="mix-blend-mode:multiply"/>`, {
  cam: { s: [1.0, 1.12], oy: 820 },
  tweens: () => `tl.fromTo('#dk14', { opacity: 0 }, { opacity: 0.6, duration: 1.4 }, ${T(206) + 1});${[0, 1, 2].map((k) => `tl.fromTo('#n14-l${k}', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${T(214 + k * 3).toFixed(2)});`).join('')}`,
});
// 15. Высунулся — лесовоз навстречу.
add(T(231), T(238), driver('side', { lean: 150 }), { cam: { s: [1.0, 1.12], x: [0, 70], oy: 700 } });
add(T(238), T(258), `${sky({ seed: 31 })}${forest(980, 32)}<rect x="-100" y="1060" width="1280" height="860" fill="#1b2034"/><path d="M-100 1180 L1180 1180" stroke="#e8e8ee" stroke-width="8" stroke-dasharray="50 50" opacity="0.5"/>
  ${logTruck(1800, 1260, 1.1, 'lt15')}${carRear(lx(1650), 1650, 1.0, { id: 'car15' })}`, {
  cam: { s: [1.0, 1.04], oy: 1200 },
  tweens: () => `tl.fromTo('#car15', { x: -140 }, { x: 0, duration: 0.4, ease: 'power3.out' }, ${T(238)});
    tl.fromTo('#lt15', { x: 0 }, { x: -3300, duration: 0.9, ease: 'none' }, ${T(248) - 0.2});`,
});
// 16. Мост, тягач встаёт.
add(T(258), T(276), `${sky({ seed: 44 })}<rect x="-100" y="980" width="1280" height="940" fill="#070a14"/>${bridgePOV(880)}
  <rect x="-100" y="760" width="1280" height="260" fill="url(#gFog)"/><g id="tr16">${truckRear(lx(1060), 1060, 0.85)}${brakeLights(lx(1060), 1060, 0.85, 'bl16')}</g>${carRear(lx(1700), 1700, 1.0)}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: () => `tl.fromTo('#tr16', { scale: 0.7, svgOrigin: '540 1060' }, { scale: 1.0, duration: ${(T(270) - T(264)).toFixed(2)}, ease: 'power3.out' }, ${T(264)});tl.fromTo('#bl16', { opacity: 0.08 }, { opacity: 1, duration: 0.15 }, ${T(270)});`,
});
// 17. Записка про остановку.
add(T(276), T(298), `<rect width="1080" height="1920" fill="#0b0d16"/>${glow(540, 800, 800, 'gLamp')}${noteSheet(540, 840, 880, 960, [{ text: 'На мосту не стой.' }, { text: 'Остановка запрещена.', color: '#b8231f' }], { id: 'n17', rot: 1.5 })}`, {
  cam: { s: [1.0, 1.12], oy: 800 },
  tweens: () => `tl.fromTo('#n17-l0', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(278)});tl.fromTo('#n17-l1', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(284)});`,
});
// 18. Объезжает и съезжает с моста.
add(T(298), T(319), `${sky({ seed: 46 })}<rect x="-100" y="980" width="1280" height="940" fill="#070a14"/>${bridgePOV(880)}
  <g id="tr18">${truckRear(lx(1060) - 90, 1060, 0.85)}${brakeLights(lx(1060) - 90, 1060, 0.85, 'bl18')}</g>${carRear(lx(1700), 1700, 1.0, { id: 'car18' })}`, {
  cam: { s: [1.0, 1.1], oy: 1300 },
  tweens: () => `tl.set('#bl18', { opacity: 1 }, ${T(298)});tl.to('#car18', { x: 230, y: -430, scale: 0.55, duration: ${(T(316) - T(305)).toFixed(2)}, ease: 'power1.inOut', svgOrigin: '540 1700' }, ${T(305)});`,
});
// 19. Стоянка в лесу, фура глушит мотор.
add(T(319), T(333), `<rect width="1080" height="1920" fill="#06080f"/>${glow(540, 800, 900, 'gLamp', 'opacity="0.2"')}
  ${[[120, 300, 140], [960, 480, 160], [100, 1300, 150], [980, 1500, 170], [200, 1750, 120]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0f1830"/>`).join('')}
  <g id="tr19">${truckRear(540, 1000, 1.25)}<g id="hl19">${glow(-170, 26, 180, 'gGlowR')}</g></g>`, {
  cam: { s: [1.0, 1.1], oy: 1000 },
  tweens: () => `tl.fromTo('#tr19', { y: -120, scale: 0.6, svgOrigin: '540 1000' }, { y: 0, scale: 1, duration: ${(T(330) - T(319)).toFixed(2)}, ease: 'power2.out' }, ${T(319)});`,
});
// 20. Двери кузова распахиваются: десятки машин с буквой «У».
const learner = (x: number, y: number, k: number) => `<g transform="translate(${x} ${y})"><rect x="-70" y="-34" width="140" height="80" rx="16" fill="${['#475569', '#334155', '#556075'][k % 3]}"/><rect x="-52" y="-62" width="104" height="42" rx="12" fill="#64748b"/><polygon points="0,-104 -26,-62 26,-62" fill="#ffc23d" stroke="#d92b2b" stroke-width="4"/><text x="0" y="-68" text-anchor="middle" fill="#10131f" font-weight="900" font-size="26" font-family="Montserrat">У</text></g>`;
add(T(333), T(354), `<rect width="1080" height="1920" fill="#06080f"/>${glow(540, 800, 900, 'gGlowC', 'opacity="0.18"')}
  <rect x="150" y="360" width="780" height="1140" rx="16" fill="#05070d"/>
  <g id="in20">${Array.from({ length: 12 }, (_, k) => learner(250 + (k % 3) * 290, 560 + Math.floor(k / 3) * 250, k)).join('')}</g>
  <g id="dl20"><rect x="150" y="360" width="390" height="1140" fill="#1e2a40"/><rect x="150" y="360" width="390" height="1140" fill="none" stroke="#0b0f1d" stroke-width="10"/></g>
  <g id="dr20"><rect x="540" y="360" width="390" height="1140" fill="#1b263a"/><rect x="540" y="360" width="390" height="1140" fill="none" stroke="#0b0f1d" stroke-width="10"/></g>`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: () => `tl.fromTo('#dl20', { scaleX: 1, svgOrigin: '150 900' }, { scaleX: 0.08, duration: 1.4, ease: 'power2.inOut' }, ${T(334)});tl.fromTo('#dr20', { scaleX: 1, svgOrigin: '930 900' }, { scaleX: 0.08, duration: 1.4, ease: 'power2.inOut' }, ${T(334)});
    tl.fromTo('#in20', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0 }, ${T(338)});`,
});
// 21. «Ты сдал половину».
add(T(354), T(361), `<rect width="1080" height="1920" fill="#0b0d16"/>${glow(540, 800, 800, 'gLamp', 'opacity="0.6"')}${noteSheet(540, 840, 880, 960, [{ text: '' }, { text: 'Ты сдал' , size: 100, color: '#b8231f' }, { text: 'половину.', size: 100, color: '#b8231f' }], { id: 'n21', rot: -2 })}`, {
  cam: { s: [1.05, 1.2], oy: 840, ease: 'power1.in' },
  tweens: () => `tl.fromTo('#n21-l1', { opacity: 0, scale: 1.4, svgOrigin: '300 900' }, { opacity: 1, scale: 1, duration: 0.3 }, ${T(358)});tl.fromTo('#n21-l2', { opacity: 0, scale: 1.4, svgOrigin: '300 960' }, { opacity: 1, scale: 1, duration: 0.3 }, ${T(359) + 0.2});`,
});
// 22. Выбор.
add(T(361), T(382), `${sky({ seed: 60 })}${forest(1250, 61)}<rect width="1080" height="1920" fill="#05070d" opacity="0.6"/>`, { cam: { s: [1.0, 1.06] } });
// 23. Игра вместо страшилки (как в части 1).
add(T(382), END, `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(540, 920, 760, 'gGlowY', 'opacity="0.4"')}
  <g id="ph23"><rect x="332" y="440" width="436" height="900" rx="64" fill="#05070c"/><svg x="346" y="454" width="408" height="872" viewBox="0 0 400 820"><rect width="400" height="820" rx="40" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text></svg></g>`, {
  cam: { s: [1.0, 1.05], oy: 900 },
  tweens: () => `tl.fromTo('#ph23', { opacity: 0, y: 160 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, ${T(388)});`,
});

/* ---------- Наложения ---------- */
const rule = (n: number, text: string, a: number, b: number) => ({
  t0: T(a),
  t1: T(b),
  html: `<div id="rn${n}">${ruleNote(n, text)}</div>`,
  tweens: (t0: number) => `tl.fromTo('#rn${n}', { opacity: 0, scale: 1.25, rotation: -6, transformOrigin: '400px 300px' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.in' }, ${t0});`,
});
const overlays = [
  rule(6, 'Держи дистанцию — чтобы успеть остановиться', 60, 96),
  rule(7, 'Впереди сигнал налево — не обгоняй', 119, 142),
  rule(8, 'Сплошная 1.1 — не пересекать', 154, 206),
  rule(9, 'Чужой сигнал — не разрешение: убедись сам', 211, 231),
  rule(10, 'На мосту не останавливайся', 281, 319),
  {
    t0: T(361),
    t1: T(394),
    html: `<div style="position:absolute;left:0;right:0;top:300px;text-align:center;font-weight:900;font-size:62px;color:#fff;letter-spacing:1px">ЧТО ВЫБЕРЕШЬ?</div>
      ${choiceCard('А', P.yellow, 'Заглянуть в кузов', 'выйти и посмотреть внутрь', 430, 'ca')}
      ${choiceCard('Б', P.cyan, 'Уехать, не оглядываясь', 'вдавить газ', 660, 'cb')}
      <div id="p2" style="position:absolute;left:0;right:0;top:900px;text-align:center;font-weight:800;font-size:32px;color:#c9cfdf;letter-spacing:2px">ЧАСТЬ 3 — ПО ТВОЕМУ ВЫБОРУ</div>`,
    tweens: (t0: number) => `tl.fromTo('#ca', { opacity: 0, x: -120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${T(364)});
      tl.fromTo('#cb', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${T(371)});
      tl.fromTo('#p2', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${T(379)});
      tl.fromTo('#ca', { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 }, ${T(366)});
      tl.fromTo('#cb', { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 }, ${T(373)});`,
  },
  {
    t0: T(394),
    t1: END,
    html: `<div id="bio" style="position:absolute;left:150px;right:150px;top:240px;height:120px;border-radius:60px;background:${P.yellow};display:flex;align-items:center;justify-content:center;gap:18px;font-weight:900;font-size:50px;color:#10131f;box-shadow:0 0 50px ${P.yellow}88">ССЫЛКА В БИО <span style="font-size:56px">↗</span></div>`,
    tweens: (t0: number) => `tl.fromTo('#bio', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0});
      tl.to('#bio', { scale: 1.06, duration: 0.4, yoyo: true, repeat: 4, ease: 'sine.inOut' }, ${t0 + 0.4});`,
  },
];

/* ---------- Субтитры ---------- */
const Y = P.yellow;
const R = P.red;
const C = P.cyan;
const color: Record<number, string> = {
  4: Y, 28: R, 49: Y, 54: Y, 72: R, 84: R, 113: Y, 123: R, 147: R, 157: R, 167: R, 183: R, 190: Y, 249: R, 251: R, 257: R, 260: C,
  271: Y, 290: R, 303: R, 337: R, 351: Y, 359: R, 360: R, 365: Y, 372: C, 396: Y,
};
const text: Record<number, string> = {
  6: 'хэтчбек', 89: 'хэтчбек', 9: 'В 018 ЕА', 31: 'стоп-', 32: 'сигналы', 61: '9.10 ПДД.', 84: 'Визг', 120: '11.2.', 160: '1.1.', 163: '2 ПДД.',
  212: '11.1.', 243: 'из', 262: 'чёрную', 282: '12.4.', 307: 'замерший', 392: '«Курьер',
};
const cap = (t0: number, t1: number, ws: string[], colors: Record<number, string> = {}) => ({
  t0, t1, words: ws.map((text, i) => ({ text, t: t0 + ((t1 - t0 - 0.2) * i) / ws.length, color: colors[i] })),
});
const recapSubs = [
  cap(0.1, 2.5, ['РАНЕЕ:', 'ему', '18,', 'права', '—', '3', 'дня'], { 0: P.yellow, 2: P.cyan }),
  cap(2.7, 4.9, ['Записка:', 'ошибёшься', '—', 'останешься', 'на', 'дороге'], { 1: P.red, 3: P.red }),
  cap(5.1, OFF - 0.1, ['5', 'правил.', 'Ты', 'выбрал', 'ехать', 'за', 'фурой'], { 1: P.yellow, 6: P.cyan }),
];
export const v43: Video8 = {
  id: '43-noch-doroga-2',
  title: 'Правила ночной дороги. Часть 2',
  part: 2,
  end: END,
  shots,
  subs: [...recapSubs, ...makeSubs(words.map(([w, a, b, n]) => [w, a + OFF, b + OFF, n] as Word), { text, color, hide: [[121, 121], [161, 161], [213, 213], [283, 283]] })],
  overlays,
  clock: [
    [0, '23 ОКТ · 03:12'], [OFF, '23 ОКТ · 03:13'], [T(43), '23 ОКТ · 03:14'], [T(73), '23 ОКТ · 03:15'], [T(114), '23 ОКТ · 03:16'], [T(154), '23 ОКТ · 03:17'],
    [T(206), '23 ОКТ · 03:18'], [T(258), '23 ОКТ · 03:19'], [T(302), '23 ОКТ · 03:20'], [T(333), '23 ОКТ · 03:21'], [T(361), '23 ОКТ · 03:22'],
  ],
  shakes: [[T(83), 22, 0.7], [T(145), 16, 0.5], [T(248), 26, 0.8], [T(270), 14, 0.4], [T(334), 10, 0.5], [T(358), 14, 0.5]],
  flashes: [[T(83), 0.6, 0.5, '#ff3030'], [T(248), 0.6, 0.5], [T(358), 0.4, 0.5, '#ff3030']],
  plainFrom: T(394),
};
