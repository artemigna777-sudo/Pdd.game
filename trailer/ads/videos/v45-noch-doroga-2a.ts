/**
 * Ролик 45 «Правила ночной дороги. Часть 2» — вариант А «Старая трасса» (выбор зрителей YouTube).
 * Тот же приём, что у ролика 44: сценарий — `v45-script.json`, время предложений — `v45-timing.json`
 * (делает `align44.py --id 45-noch-doroga-2a --script … --timing …`), без него — оценка по длине текста.
 * Правила 6–10 — ПДД РФ: п. 19.4, 10.1, 15.3, 7.2 (знак аварийной остановки), 8.11.
 */
import { existsSync, readFileSync } from 'node:fs';
import { P, makeSubs, type Shot8, type Video8 } from '../engine8.ts';
import { carRear, choiceCard, forestRoad } from './v42-noch-doroga.ts';
import { driver, est, rule, shadow, toWords } from './v44-noch-doroga-3.ts';
import { ghostPerson, glow, noteSheet, speedo, svg } from '../scenery8.ts';

const script = JSON.parse(readFileSync(new URL('./v45-script.json', import.meta.url), 'utf8')) as { recap: string[]; main: string[] };
const timingUrl = new URL('./v45-timing.json', import.meta.url);
const timing = existsSync(timingUrl) ? (JSON.parse(readFileSync(timingUrl, 'utf8')) as { off: number; recap: [number, number][]; main: [number, number][] }) : null;
const recapT = timing?.recap ?? est(script.recap, 0.2);
const OFF = timing?.off ?? recapT[recapT.length - 1][1] + 0.8;
const mainT: [number, number][] = timing ? timing.main.map(([a, b]) => [a + OFF, b + OFF]) : est(script.main, OFF);
const S = (i: number) => mainT[i - 1][0];
const END = mainT[mainT.length - 1][1] + 2.2;

const shots: Shot8[] = [];
const add = (t0: number, t1: number, art: string, rest: Partial<Shot8> = {}) => shots.push({ t0, t1, art: svg(art), ...rest });
const dark = '<rect width="1080" height="1920" fill="#06080f"/>';
/** Густой туман: молочные полосы поверх сцены; `x` дрейфует. */
const fog = (id: string, y0 = 560, a = 0.8) => `<g id="${id}">${[0, 1, 2].map((k) => `<rect x="-300" y="${y0 + k * 240}" width="1700" height="340" fill="url(#gFog)" opacity="${a - k * 0.12}"/><rect x="-300" y="${y0 + k * 240 + 40}" width="1700" height="260" fill="#9fb0d8" opacity="${(a - k * 0.12) * 0.2}"/>`).join('')}</g>`;
const drift = (id: string, t0: number, t1: number) => `tl.fromTo('#${id}', { x: -150 }, { x: 150, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0.toFixed(2)});`;
const fogRoad = (o: { seed?: number } = {}) => `${forestRoad({ y: 880, beams: true, seed: o.seed ?? 3 })}`;
/** Переезд «от водителя»: рельсы поперёк дороги, знак-крест, светофор с двумя красными, шлагбаум поднят. */
const crossing = (blinkId: string) => `<g>
  <path d="M-200 1130 L1280 1130 M-200 1190 L1280 1190" stroke="#3b4565" stroke-width="12"/>${Array.from({ length: 14 }, (_, k) => `<rect x="${-120 + k * 110}" y="1118" width="28" height="86" fill="#1a1f33"/>`).join('')}
  <g transform="translate(220 700)"><rect x="-8" y="0" width="16" height="430" fill="#10152a"/><rect x="-110" y="-30" width="220" height="90" rx="14" fill="#10152a"/>
    <g id="${blinkId}a"><circle cx="-50" cy="15" r="30" fill="#ff3b30"/>${glow(-50, 15, 120, 'gGlowR')}</g><g id="${blinkId}b"><circle cx="50" cy="15" r="30" fill="#ff3b30"/>${glow(50, 15, 120, 'gGlowR')}</g></g>
  <g transform="translate(220 700) rotate(-70 0 330)"><rect x="0" y="320" width="500" height="22" fill="#e8e8ee"/>${Array.from({ length: 6 }, (_, k) => `<rect x="${k * 84 + 10}" y="320" width="42" height="22" fill="#d92b2b"/>`).join('')}</g>
  </g>`;
const flicker = (a: string, b: string, t0: number, t1: number) => {
  let s = '';
  let on = true;
  for (let t = t0; t < t1 - 0.2; t += 0.45) { s += `tl.set('#${a}', { opacity: ${on ? 1 : 0.1} }, ${t.toFixed(2)});tl.set('#${b}', { opacity: ${on ? 0.1 : 1} }, ${t.toFixed(2)});`; on = !on; }
  return s;
};
const triangle = (x: number, y: number, s: number, id: string) => `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">${glow(0, 40, 260, 'gGlowR', 'opacity="0.8"')}
  <polygon points="0,-130 120,80 -120,80" fill="#f4f1ea"/><polygon points="0,-96 82,56 -82,56" fill="#d92b2b"/><polygon points="0,-60 52,34 -52,34" fill="#f4f1ea"/><rect x="-6" y="-34" width="12" height="42" fill="#10131f"/><circle cx="0" cy="22" r="7" fill="#10131f"/></g></g>`;
const hazard = (x: number, y: number, s: number, id: string) => `<g id="${id}">${glow(x - 190 * s, y - 20 * s, 150 * s, 'gGlowY')}${glow(x + 190 * s, y - 20 * s, 150 * s, 'gGlowY')}</g>`;
const blinkTween = (id: string, t0: number, t1: number) => `tl.fromTo('#${id}', { opacity: 1 }, { opacity: 0.08, duration: 0.3, repeat: ${Math.max(1, Math.floor((t1 - t0) / 0.6))}, yoyo: true, ease: 'steps(1)' }, ${t0.toFixed(2)});`;

// ===== «Ранее» =====
add(0, recapT[1][0] - 0.1, driver('worry'), { cam: { s: [1.0, 1.1], oy: 700 } });
add(recapT[1][0] - 0.1, recapT[2][0] - 0.1, `<rect width="1080" height="1920" fill="#0b0f1c"/>${[['Мигающий жёлтый', -3], ['Знак «Стоп»', 2], ['Дальний свет за 150 м', -2], ['Машина у перехода', 3], ['На мосту не обгоняй', -2]].map(([t, r], k) => `<g transform="translate(540 ${360 + k * 190}) rotate(${r})"><rect x="-400" y="-70" width="800" height="140" rx="6" fill="${P.paper}"/><text x="-370" y="-18" font-family="Montserrat" font-weight="900" font-size="28" fill="#3a3f55">ПРАВИЛО <tspan fill="#d42f2f">№${k + 1}</tspan></text><text x="-370" y="30" font-family="Montserrat" font-weight="900" font-size="42" fill="#1a1d2c">${t}</text></g>`).join('')}`, { cam: { s: [1.0, 1.06], oy: 800 } });
add(recapT[2][0] - 0.1, OFF, `${fogRoad({ seed: 4 })}${carRear(540, 1640, 1.0)}${fog('frc', 700, 0.7)}`, { cam: { s: [1.0, 1.1], oy: 1100 } });

// ===== Основная часть =====
// 1. Туман.
add(S(1), S(2), `${fogRoad()}${carRear(540, 1640, 1.05, { id: 'car1' })}${fog('f1', 620, 0.85)}`, {
  cam: { s: [1.05, 1.0], oy: 1200 },
  tweens: (t0, t1) => drift('f1', t0, t1),
});
// 2. Правило 6: дальний свет слепит в тумане.
add(S(2), S(3), `${dark}<rect width="1080" height="1920" fill="#c9d3ee" opacity="0.18"/>${fog('f2', 500, 1)}<rect id="gl2" width="1080" height="1920" fill="#f4f6ff" opacity="0.0"/>
  <g id="lo2"><path d="M60 1920 L460 900 L620 900 L1020 1920 Z" fill="url(#gBeam)"/></g>${glow(540, 900, 520, 'gGlowW', 'opacity="0.5"')}`, {
  cam: { s: [1.0, 1.08], oy: 900 },
  tweens: (t0, t1) => `tl.fromTo('#gl2', { opacity: 0.0 }, { opacity: 0.85, duration: 1.2 }, ${t0 + 0.3});tl.to('#gl2', { opacity: 0.0, duration: 0.8 }, ${(t0 + 3.8).toFixed(2)});${drift('f2', t0, t1)}`,
});
// 3. Герой переключает свет.
add(S(3), S(4), driver('focus'), { cam: { s: [1.0, 1.1], oy: 700 } });
// 4. Правило 7: спидометр.
add(S(4), S(5), `${dark}${speedo(540, 900, 380, 'sp4', 100)}<text x="540" y="1080" font-family="Montserrat" font-weight="900" font-size="110" fill="#8ff0ff" text-anchor="middle">100</text>`, {
  cam: { s: [1.0, 1.08], oy: 900 },
  tweens: (t0) => `tl.fromTo('#sp4', { rotation: 28, svgOrigin: '0 0' }, { rotation: 0, duration: 1.2, ease: 'power2.out' }, ${t0 + 1.6});`,
});
// 5. Из тумана два красных огня.
add(S(5), S(6), `${fogRoad({ seed: 6 })}<g id="rl5">${glow(480, 900, 140, 'gGlowR')}${glow(600, 900, 140, 'gGlowR')}<circle cx="480" cy="900" r="16" fill="#ff3b30"/><circle cx="600" cy="900" r="16" fill="#ff3b30"/></g>${fog('f5', 700, 0.8)}`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0, t1) => `tl.fromTo('#rl5', { scale: 0.4, svgOrigin: '540 900' }, { scale: 1.6, duration: ${(t1 - t0).toFixed(2)}, ease: 'power1.in' }, ${t0});${blinkTween('rl5', t0 + 0.6, t1)}`,
});
// 6. Шлагбаум поднят, огни мигают.
add(S(6), S(7), `${dark}${glow(540, 700, 900, 'gGlowR', 'opacity="0.18"')}${crossing('c6')}`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0, t1) => flicker('c6a', 'c6b', t0, t1),
});
// 7. Правило 8: стой.
add(S(7), S(8), `${fogRoad({ seed: 7 })}${crossing('c7')}${carRear(540, 1700, 1.0, { id: 'car7' })}${fog('f7', 800, 0.5)}`, {
  cam: { s: [1.0, 1.06], oy: 1200 },
  tweens: (t0, t1) => flicker('c7a', 'c7b', t0, t1),
});
// 8. Поезд без огней, в окнах — учебные таблички «У».
const wagon = (x: number) => `<g transform="translate(${x} 0)"><rect x="0" y="800" width="620" height="300" rx="18" fill="#1b2438"/>${[0, 1, 2].map((k) => `<rect x="${40 + k * 180}" y="840" width="140" height="130" rx="10" fill="#0a0e1c"/><polygon points="${110 + k * 180},855 ${86 + k * 180},900 ${134 + k * 180},900" fill="#ffc23d"/><text x="${110 + k * 180}" y="893" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="22" fill="#10131f">У</text>`).join('')}<rect x="0" y="1040" width="620" height="20" fill="#0a0e18"/></g>`;
add(S(8), S(9), `${dark}${fogRoad({ seed: 8 })}${crossing('c8')}${fog('f8', 760, 0.6)}<g id="tr8">${[0, 1, 2, 3, 4].map((k) => wagon(-3000 + k * 640)).join('')}</g>`, {
  cam: { s: [1.0, 1.04], oy: 900 },
  tweens: (t0, t1) => flicker('c8a', 'c8b', t0, t1) + `tl.fromTo('#tr8', { x: 0 }, { x: 4400, duration: ${((t1 - t0) * 0.8).toFixed(2)}, ease: 'none' }, ${(t0 + 1.4).toFixed(2)});`,
});
// 9. Мотор глохнет, аварийка.
add(S(9), S(10), `${fogRoad({ seed: 9 })}${carRear(540, 1640, 1.05)}${hazard(540, 1640, 1.05, 'hz9')}${fog('f9', 780, 0.55)}`, {
  cam: { s: [1.0, 1.08], oy: 1250 },
  tweens: (t0, t1) => blinkTween('hz9', t0 + 1.8, t1),
});
// 10. Правило 9: знак аварийной остановки, 30 м.
add(S(10), S(11), `${fogRoad({ seed: 10 })}${triangle(700, 1300, 1.2, 'tri10')}${carRear(540, 1760, 0.8)}${hazard(540, 1760, 0.8, 'hz10')}
  <g id="m10"><rect x="170" y="940" width="330" height="120" rx="60" fill="rgba(10,13,24,0.88)" stroke="${P.yellow}" stroke-width="6"/><text x="335" y="1020" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="64" fill="${P.yellow}">30 м</text></g>${fog('f10', 850, 0.5)}`, {
  cam: { s: [1.0, 1.06], oy: 1300 },
  tweens: (t0, t1) => `tl.fromTo('#tri10', { scale: 0.2, svgOrigin: '700 1380' }, { scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, ${t0 + 3.6});${blinkTween('hz10', t0, t1)}tl.fromTo('#m10', { opacity: 0, scale: 0.6, svgOrigin: '335 1000' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0 + 5.4});`,
});
// 11. Тень стоит за машиной.
add(S(11), S(12), `${fogRoad({ seed: 11 })}${ghostPerson(540, 1020, 1.1, { face: true, id: 'gp11' })}${carRear(540, 1740, 0.95)}${hazard(540, 1740, 0.95, 'hz11')}${fog('f11', 900, 0.65)}`, {
  cam: { s: [1.0, 1.12], oy: 1100 },
  tweens: (t0, t1) => `tl.fromTo('#gp11', { opacity: 0 }, { opacity: 0.85, duration: 1.4 }, ${t0 + 2.4});${blinkTween('hz11', t0, t1)}`,
});
// 12. Мотор завёлся, тень сигналит, хочется развернуться.
add(S(12), S(13), `${fogRoad({ seed: 12 })}${crossing('c12')}${carRear(540, 1700, 1.0, { id: 'car12' })}${fog('f12', 800, 0.5)}
  <g id="ut12"><path d="M640 1500 Q900 1300 700 1180 Q560 1120 520 1260" stroke="#f4f1ea" stroke-width="16" fill="none" stroke-dasharray="26 18" stroke-linecap="round"/><polygon points="500,1230 560,1300 470,1300" fill="#f4f1ea"/></g>`, {
  cam: { s: [1.0, 1.06], oy: 1200 },
  tweens: (t0, t1) => flicker('c12a', 'c12b', t0, t1),
});
// 13. Правило 10: разворот на переезде запрещён.
add(S(13), S(14), `${fogRoad({ seed: 13 })}${crossing('c13')}${fog('f13', 800, 0.5)}
  <g id="x13"><circle cx="540" cy="1380" r="150" fill="rgba(10,13,24,0.8)" stroke="#d92b2b" stroke-width="22"/><path d="M440 1480 L640 1280" stroke="#d92b2b" stroke-width="22"/><path d="M470 1350 Q540 1260 610 1350" stroke="#f4f1ea" stroke-width="20" fill="none"/><polygon points="595,1330 640,1370 585,1385" fill="#f4f1ea"/></g>`, {
  cam: { s: [1.0, 1.06], oy: 1200 },
  tweens: (t0, t1) => flicker('c13a', 'c13b', t0, t1) + `tl.fromTo('#x13', { opacity: 0, scale: 0.5, svgOrigin: '540 1380' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, ${t0 + 3.2});`,
});
// 14. Разбитый и ржавый хэтчбек на обочине.
add(S(14), S(15), `${fogRoad({ seed: 14 })}<g transform="translate(250 0)">${carRear(540, 1500, 0.9)}</g>
  <path d="M300 1330 L360 1260 L420 1330 L470 1280" stroke="#0b0e18" stroke-width="6" fill="none"/><rect x="330" y="1360" width="90" height="26" fill="#8a4a2a" opacity="0.7"/><rect x="560" y="1370" width="120" height="30" fill="#8a4a2a" opacity="0.6"/>${fog('f14', 780, 0.6)}`, {
  cam: { s: [1.0, 1.12], oy: 1300 },
});
// 15. Листок на капоте: «Ты сдал половину».
add(S(15), S(16), `<rect width="1080" height="1920" fill="#0b0d16"/>${glow(540, 780, 800, 'gLamp', 'opacity="0.7"')}${noteSheet(540, 860, 880, 960, [{ text: '' }, { text: 'Ты сдал', size: 110, color: '#b8231f' }, { text: 'половину.', size: 110, color: '#b8231f' }], { id: 'n15', rot: -2, head: '2006' })}`, {
  cam: { s: [1.05, 1.2], oy: 860, ease: 'power1.in' },
});
// 16. Выбор А/Б.
add(S(16), S(17), `${fogRoad({ seed: 16 })}<rect width="1080" height="1920" fill="#05070d" opacity="0.65"/>${fog('f16', 760, 0.4)}`, { cam: { s: [1.0, 1.06] } });
// 17–18. Игра.
add(S(17), END, `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(540, 920, 760, 'gGlowY', 'opacity="0.4"')}
  <g id="ph17"><rect x="332" y="440" width="436" height="900" rx="64" fill="#05070c"/><svg x="346" y="454" width="408" height="872" viewBox="0 0 400 820"><rect width="400" height="820" rx="40" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text></svg></g>`, {
  cam: { s: [1.0, 1.05], oy: 900 },
  tweens: (t0) => `tl.fromTo('#ph17', { opacity: 0, y: 160 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, ${t0 + 0.4});`,
});

const overlays = [
  rule(6, 'В тумане — ближний свет или противотуманные фары', S(2), S(3)),
  rule(7, 'Скорость — чтобы видеть дорогу и успеть остановиться', S(4), S(5)),
  rule(8, 'Горит запрещающий сигнал — стой, даже если шлагбаум поднят', S(7), S(8)),
  rule(9, 'Остановился на дороге — аварийка и знак: вне города 30 м', S(10), S(11)),
  rule(10, 'Разворот на переезде, мосту и в тумане — запрещён', S(13), S(14)),
  {
    t0: S(16),
    t1: S(17),
    html: `<div style="position:absolute;left:0;right:0;top:300px;text-align:center;font-weight:900;font-size:62px;color:#fff;letter-spacing:1px">ЧТО ВЫБЕРЕШЬ?</div>
      ${choiceCard('А', P.yellow, 'Сесть в старую машину', 'свою, разбитую', 430, 'ca')}
      ${choiceCard('Б', P.cyan, 'Идти пешком к огням', 'через туман', 660, 'cb')}
      <div id="p3" style="position:absolute;left:0;right:0;top:900px;text-align:center;font-weight:800;font-size:32px;color:#c9cfdf;letter-spacing:2px">ЧАСТЬ 3 — ПО ТВОЕМУ ВЫБОРУ</div>`,
    tweens: (t0: number) => `tl.fromTo('#ca', { opacity: 0, x: -120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${t0 + 2.2});tl.fromTo('#cb', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${t0 + 4.2});tl.fromTo('#p3', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${t0 + 6.4});`,
  },
  {
    t0: S(18),
    t1: END,
    html: `<div id="bio" style="position:absolute;left:150px;right:150px;top:240px;height:120px;border-radius:60px;background:${P.yellow};display:flex;align-items:center;justify-content:center;gap:18px;font-weight:900;font-size:50px;color:#10131f;box-shadow:0 0 50px ${P.yellow}88">ССЫЛКА В БИО <span style="font-size:56px">↗</span></div>`,
    tweens: (t0: number) => `tl.fromTo('#bio', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0});tl.to('#bio', { scale: 1.06, duration: 0.4, yoyo: true, repeat: 4, ease: 'sine.inOut' }, ${t0 + 0.4});`,
  },
];
const rw = toWords(script.recap, recapT);
const mw = toWords(script.main, mainT);
const clk = (m: number) => `23 ОКТ · 03:${String(m).padStart(2, '0')}`;

export const v45: Video8 = {
  id: '45-noch-doroga-2a',
  title: 'Правила ночной дороги. Часть 2 (вариант А)',
  part: 2,
  end: END,
  shots,
  subs: [...makeSubs(rw.words, { color: rw.color }), ...makeSubs(mw.words, { color: mw.color })],
  overlays,
  clock: [[0, clk(12)], [OFF, clk(13)], [S(3), clk(14)], [S(5), clk(15)], [S(8), clk(16)], [S(10), clk(17)], [S(12), clk(18)], [S(14), clk(19)], [S(16), clk(20)]],
  shakes: [[S(8) + 1.4, 22, 0.8], [S(11) + 2.4, 14, 0.5], [S(15), 14, 0.5]],
  flashes: [[S(8) + 1.4, 0.5, 0.5], [S(11) + 2.4, 0.4, 0.5, '#ff3030'], [S(15), 0.4, 0.5, '#ff3030']],
  plainFrom: S(18),
};
