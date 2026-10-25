/**
 * Ролик 42 «Правила ночной дороги. Часть 1» — страшилка-«правила» по образцам «Оракул» и «Подъезд».
 * Голос — Fish Audio, голос «Инциденты 2.0» из библиотеки (озвучил Артём, склейка — music/42-noch-doroga/vo.wav).
 * Пять правил — настоящие пункты ПДД (6.2 и 13.11, знак 2.5, 19.2, 14.2, 11.4), см. README.
 */
import { readFileSync } from 'node:fs';
import { P, makeSubs, ruleNote, type Shot8, type Video8, type Word } from '../engine8.ts';
import {
  bridgePOV, carTop, cockpit, crossTop, forest, ghostPerson, glow, hero, logTruck, missing, navScreen, noteSheet, oldSign,
  phone, pine, pines, rng, roadPOV, sky, speedo, stopSign, svg, trafficLight, treesTop, truckRear,
} from '../scenery8.ts';

const words: Word[] = JSON.parse(readFileSync(new URL('./v42-words.json', import.meta.url), 'utf8'));
const T = (i: number) => words[i][1];
const END = 155.5;

/* ---------- Мелкие детали только этого ролика ---------- */

/** Наш хэтчбек сзади: белый, старый, с «У» нет — права уже есть. */
const carRear = (x: number, y: number, s: number, o: { brake?: string; id?: string } = {}) => `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="150" rx="250" ry="30" fill="#000" opacity="0.5"/>
  <path d="M-230 120 L-230 -20 Q-220 -70 -170 -80 L-130 -200 Q-120 -230 -80 -232 L80 -232 Q120 -230 130 -200 L170 -80 Q220 -70 230 -20 L230 120 Z" fill="#c9ccd6"/>
  <path d="M-115 -195 L115 -195 L150 -90 L-150 -90 Z" fill="#141a2e"/><path d="M-60 -185 L-20 -185 L-80 -100 L-120 -100 Z" fill="#2c3656" opacity="0.6"/>
  <rect x="-230" y="40" width="460" height="80" fill="#a9adba"/>
  <rect x="-70" y="54" width="140" height="44" rx="6" fill="#e8e6dd"/><text x="0" y="86" font-family="Montserrat" font-weight="800" font-size="26" fill="#22252f" text-anchor="middle">В 018 ЕА</text>
  <g ${o.brake ? `id="${o.brake}"` : ''}>${glow(-185, -20, 120, 'gGlowR')}${glow(185, -20, 120, 'gGlowR')}</g>
  <rect x="-222" y="-50" width="70" height="56" rx="10" fill="#d93a3a"/><rect x="152" y="-50" width="70" height="56" rx="10" fill="#d93a3a"/>
  <rect x="-210" y="120" width="90" height="40" rx="8" fill="#0b0d14"/><rect x="120" y="120" width="90" height="40" rx="8" fill="#0b0d14"/>
</g></g>`;

/** Вид на героя через лобовое стекло: рамка кузова, капот, отсветы. */
const windshield = (inner: string, o: { glare?: boolean } = {}) => `
  <rect width="1080" height="1920" fill="#0b0f1c"/>
  <rect x="120" y="360" width="840" height="900" fill="#10162a"/>
  <rect x="300" y="420" width="480" height="420" rx="40" fill="#1b2340"/>
  ${inner}
  <path d="M0 0 L1080 0 L1080 1920 L0 1920 Z M140 380 Q540 300 940 380 L1010 1180 Q540 1120 70 1180 Z" fill="#1d2747" fill-rule="evenodd"/>
  <path d="M70 1180 Q540 1120 1010 1180 L1080 1250 L1080 1920 L0 1920 L0 1250 Z" fill="#c9ccd6"/>
  <path d="M0 1250 L70 1180 Q540 1120 1010 1180 L1080 1250 Q540 1200 0 1250 Z" fill="#e3e5ec"/>
  <path d="M80 1300 Q540 1260 1000 1300 L1080 1920 L0 1920 Z" fill="#a9adba" opacity="0.6"/>
  <path d="M420 1200 L470 1180 L520 1260 Z" fill="#fff" opacity="0.15"/>
  ${o.glare !== false ? '<path d="M200 380 L330 370 L150 1170 L60 1180 Z" fill="#fff" opacity="0.05"/><path d="M700 330 L760 335 L540 1140 L500 1140 Z" fill="#fff" opacity="0.04"/>' : ''}`;

/** Руль снизу кадра у героя (через стекло) и руки на нём. */
const wheelHands = `<path d="M330 1180 Q340 1000 540 990 Q740 1000 750 1180" stroke="#06080f" stroke-width="40" fill="none"/>
  <ellipse cx="380" cy="1060" rx="42" ry="54" fill="${P.skin2}"/><ellipse cx="700" cy="1060" rx="42" ry="54" fill="${P.skin2}"/>`;

/** Подписанные карточки выбора внизу (как в образце). */
const choiceCard = (letter: string, color: string, title: string, sub: string, y: number, id: string) => `<div id="${id}" style="position:absolute;left:70px;right:70px;top:${y}px;height:190px;border-radius:30px;border:4px solid ${color};background:rgba(10,13,24,0.88);display:flex;align-items:center;gap:30px;padding:0 34px;box-shadow:0 0 40px ${color}55">
  <div style="width:112px;height:112px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:66px;color:#10131f;flex:none">${letter}</div>
  <div><div style="font-weight:900;font-size:44px;line-height:1.05;color:${color};text-transform:uppercase">${title}</div><div style="font-weight:700;font-size:28px;color:#c9cfdf;margin-top:8px">${sub}</div></div></div>`;

/** Мигание «как сердце»: двойной удар каждые ~1,1 с. */
const heartbeat = (sel: string, t0: number, t1: number) => {
  let s = '';
  for (let t = t0; t < t1 - 0.2; t += 1.1) {
    s += `tl.fromTo('${sel}', { opacity: 0.08, scale: 0.92, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1.08, duration: 0.09 }, ${t.toFixed(2)});
      tl.to('${sel}', { opacity: 0.35, scale: 0.98, duration: 0.14 }, ${(t + 0.1).toFixed(2)});
      tl.to('${sel}', { opacity: 1, scale: 1.05, duration: 0.08 }, ${(t + 0.26).toFixed(2)});
      tl.to('${sel}', { opacity: 0.05, scale: 0.92, duration: 0.5 }, ${(t + 0.36).toFixed(2)});`;
  }
  return s;
};

/** Дорога в лесу «от водителя» с фарами (общий фон многих кадров). */
const forestRoad = (o: { y?: number; beams?: boolean; moon?: boolean; seed?: number; extra?: string } = {}) => {
  const y = o.y ?? 900;
  return `${sky({ moon: o.moon ? [820, 300] : undefined, seed: o.seed ?? 4 })}${forest(y, o.seed ?? 3)}${roadPOV(y, { beams: o.beams ?? true })}
    ${pines(y + 60, 520, '#0a0f1e', (o.seed ?? 3) + 40, -200, 200, 0.5, false)}${pines(y + 60, 520, '#0a0f1e', (o.seed ?? 3) + 41, 900, 1300, 0.5, false)}
    <rect x="-200" y="${y + 160}" width="1500" height="1000" fill="#0a0f1e" opacity="0" />${o.extra ?? ''}`;
};

/** Ель для плана сбоку с объявлениями. */
const trunk = (x: number, w: number) => `<rect x="${x - w / 2}" y="0" width="${w}" height="1920" fill="#2a2333"/><rect x="${x - w / 2}" y="0" width="${w * 0.3}" height="1920" fill="#3a3045" opacity="0.6"/>`;

/* ---------- Кадры ---------- */

const shots: Shot8[] = [];
const add = (t0: number, t1: number, art: string, rest: Partial<Shot8> = {}) => shots.push({ t0, t1, art: svg(art), ...rest });

// 0. Ночь, наша машина уходит в лес.
add(0, T(2), `${forestRoad({ moon: true })}${carRear(540, 1240, 0.9, { id: 'car0' })}`, {
  cam: { s: [1.12, 1.0], oy: 1100 },
  tweens: (t0) => `tl.fromTo('#car0', { y: 0 }, { y: -4, duration: 0.2, repeat: 9, yoyo: true }, ${t0});`,
});
// 1. Часы 03:03 на панели.
add(T(2), T(7), `<rect width="1080" height="1920" fill="#06080f"/>
  <path d="M-50 1500 Q540 1300 1130 1500 L1130 1920 L-50 1920 Z" fill="#0a0d17"/>
  <rect x="190" y="620" width="700" height="330" rx="40" fill="#0b1626"/><rect x="190" y="620" width="700" height="330" rx="40" fill="none" stroke="#1d2b47" stroke-width="8"/>
  ${glow(540, 785, 420, 'gGlowC', 'opacity="0.55"')}
  <text x="540" y="850" font-family="Montserrat" font-weight="800" font-size="210" fill="#8ff0ff" text-anchor="middle" letter-spacing="10">03:03</text>
  ${speedo(300, 1320, 190, 'sp1', 60)}${speedo(780, 1320, 150, 'sp1b', 30)}`, { cam: { s: [1.0, 1.12], oy: 780 } });
// 2. Герой за рулём, права — три дня.
add(T(7), T(14), `${windshield(`${hero(540, 680, 1.05, 'calm', { light: P.cyan })}${wheelHands}`)}
  <g id="lic"><g transform="translate(760 560) rotate(8)">
    <rect x="-230" y="-150" width="460" height="300" rx="24" fill="#f3e6ef"/><rect x="-230" y="-150" width="460" height="64" rx="24" fill="#d65c8c"/><rect x="-230" y="-110" width="460" height="24" fill="#d65c8c"/>
    <text x="0" y="-104" font-family="Montserrat" font-weight="900" font-size="26" fill="#fff" text-anchor="middle">ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ</text>
    <rect x="-200" y="-60" width="130" height="170" rx="10" fill="#9aa3b8"/><circle cx="-135" cy="-10" r="40" fill="${P.skin}"/><path d="M-175 -30 Q-170 -70 -135 -70 Q-100 -70 -95 -30 Q-120 -50 -175 -30 Z" fill="${P.hair}"/><path d="M-195 110 Q-190 40 -135 40 Q-80 40 -75 110 Z" fill="${P.hood}"/>
    <text x="-40" y="-20" font-family="Montserrat" font-weight="800" font-size="24" fill="#3a3f55">4a. 20.10.2026</text>
    <text x="-40" y="20" font-family="Montserrat" font-weight="800" font-size="24" fill="#3a3f55">9. B</text>
    <rect x="-40" y="50" width="220" height="60" rx="30" fill="${P.red}"/><text x="70" y="91" font-family="Montserrat" font-weight="900" font-size="30" fill="#fff" text-anchor="middle">3 ДНЯ</text>
  </g></g>`, {
  cam: { s: [1.0, 1.06], oy: 700 },
  tweens: (t0) => `tl.fromTo('#lic', { opacity: 0, y: 120, rotation: 10, transformOrigin: '760px 560px' }, { opacity: 1, y: 0, rotation: 0, duration: 0.3, ease: 'back.out(1.6)' }, ${T(10)});`,
});
// 3. Навигатор сам перестраивает маршрут.
const routeCity = 'M200 700 L200 560 L286 560 L286 380 L114 380 L114 200';
const routeForest = 'M200 700 L200 540 Q200 470 260 430 Q340 380 300 300 Q260 220 330 140';
add(T(14), T(20), `${forestRoad({ y: 760 })}${cockpit({ hands: true, phone: `${phone(760, 1030, 300, `<g id="nav1">${navScreen({ route: routeCity, top: 'Ведите по маршруту' })}</g><g id="nav2">${navScreen({ route: routeForest, top: 'Маршрут перестроен', topColor: P.yellow, routeId: 'r2' })}</g>`, { rot: 4 })}` })}`, {
  cam: { s: [1.0, 1.08], ox: 760, oy: 1030 },
  tweens: (t0) => `tl.set('#nav2', { opacity: 0 }, ${t0}); tl.set('#nav2', { opacity: 1 }, ${T(15)}); tl.set('#nav1', { opacity: 0 }, ${T(15)});
    tl.fromTo('#r2', { strokeDasharray: 900, strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power1.inOut' }, ${T(16)});`,
});
// 4. Карта: дороги нет.
add(T(20), T(28), `<rect width="1080" height="1920" fill="#05070d"/>${phone(540, 860, 520, navScreen({ route: 'M200 700 L200 560 Q200 520 210 480 Q230 420 200 360 Q170 300 220 240 Q260 180 230 120', routeId: 'r3', top: 'Дорога не найдена', topColor: P.red, blank: true }))}`, {
  cam: { s: [1.0, 1.1], oy: 760 },
  tweens: (t0) => `tl.fromTo('#r3', { strokeDasharray: '30 22', strokeDashoffset: 0 }, { strokeDashoffset: -260, duration: ${(T(28) - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
});
// 5. Фары выхватывают табличку у обочины.
add(T(28), T(36), `${forestRoad({ y: 880 })}<g id="sg5">${oldSign(800, 960, 0.42, ['ЗДЕСЬ', 'СДАЮТ', 'ЭКЗАМЕН'])}</g>`, {
  cam: { s: [1.0, 1.04], oy: 900 },
  tweens: (t0) => `tl.fromTo('#sg5', { scale: 0.6, x: 120, y: -60, transformOrigin: '800px 960px' }, { scale: 1.9, x: 0, y: 0, duration: ${(T(36) - t0).toFixed(2)}, ease: 'power2.in' }, ${t0});`,
});
// 6. Табличка крупно: «НАВСЕГДА».
add(T(36), T(40), `${sky({ seed: 9 })}${pines(1200, 700, '#121a33', 21)}${glow(540, 820, 700, 'gGlowW', 'opacity="0.35"')}
  ${oldSign(540, 640, 1.55, ['ЗДЕСЬ', 'СДАЮТ', 'ЭКЗАМЕН'], { extra: `<g id="nav6"><text x="0" y="310" font-family="Caveat" font-weight="700" font-size="120" fill="#c41e1e" text-anchor="middle" transform="rotate(-6)">навсегда</text><path d="M-170 330 Q0 300 170 320" stroke="#c41e1e" stroke-width="8" fill="none" transform="rotate(-6)"/></g>` })}`, {
  cam: { s: [1.0, 1.12], oy: 820 },
  tweens: (t0) => `tl.set('#nav6', { opacity: 0 }, ${t0}); tl.fromTo('#nav6', { opacity: 0, scale: 1.6, transformOrigin: '0px 300px' }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power3.in' }, ${T(39)});`,
});
// 7. Бардачок открывается: внутри листок.
add(T(40), T(45), `<rect width="1080" height="1920" fill="#080b14"/>
  <path d="M-50 600 Q540 520 1130 600 L1130 1920 L-50 1920 Z" fill="#121729"/>
  <rect x="180" y="800" width="720" height="420" rx="30" fill="#05070d"/>
  ${glow(540, 860, 360, 'gLamp')}<rect x="500" y="812" width="80" height="16" rx="8" fill="#ffe2a0"/>
  <g transform="translate(540 1040) rotate(-6)"><rect x="-230" y="-120" width="460" height="260" fill="${P.paper}"/><rect x="-230" y="-120" width="460" height="260" fill="#a88a4a" opacity="0.25"/>
    ${Array.from({ length: 5 }, (_, k) => `<path d="M-190 ${-70 + k * 46} Q-60 ${-80 + k * 46} 60 ${-66 + k * 46} T190 ${-72 + k * 46}" stroke="${P.pen}" stroke-width="5" fill="none" opacity="0.7"/>`).join('')}</g>
  <g id="lid7"><rect x="180" y="1220" width="720" height="420" rx="30" fill="#1b2238"/><rect x="480" y="1250" width="120" height="30" rx="15" fill="#2e3756"/></g>
  <g id="hand7"><ellipse cx="900" cy="1500" rx="80" ry="100" fill="${P.skin2}" transform="rotate(-30 900 1500)"/><path d="M930 1560 L1180 1920 L1000 1920 L860 1600 Z" fill="${P.hood2}"/></g>`, {
  cam: { s: [1.0, 1.08], oy: 1000 },
  tweens: (t0) => `tl.fromTo('#lid7', { y: -420, scaleY: 1 }, { y: 0, duration: 0.45, ease: 'bounce.out' }, ${t0 + 0.05});
    tl.fromTo('#hand7', { x: 200, y: 200 }, { x: -220, y: -300, duration: ${(T(45) - t0 - 0.4).toFixed(2)}, ease: 'power1.inOut' }, ${t0 + 0.4});`,
});
// 8. Почерк инструктора.
add(T(45), T(47), `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 760, 700, 'gLamp')}${noteSheet(540, 820, 820, 900, [{ text: 'Тому, кто нашёл этот лист.' }, { text: 'Проверь, кто сидит' }, { text: 'справа. Не сворачивай.' }, { text: 'Не спорь с дорогой.' }], { id: 'n8', head: 'май 2006' })}`, {
  cam: { s: [1.18, 1.3], oy: 640 },
});
// 9. «Пропал» на дереве в свете фар.
add(T(47), T(55), `<rect width="1080" height="1920" fill="#070a13"/>${glow(540, 820, 760, 'gGlowW', 'opacity="0.4"')}${trunk(540, 420)}
  ${missing(540, 820, 1.65, -3, 'ИНСТРУКТОР', 'ночной урок · 19.05.2006', { face: `<circle cx="0" cy="-48" r="44" fill="#d9bca8"/><path d="M-44 -60 Q-40 -100 0 -100 Q40 -100 44 -60 Q20 -78 -44 -60 Z" fill="#5a5f70"/><path d="M-26 -58 L-8 -58 M8 -58 L26 -58" stroke="#2a2d38" stroke-width="5"/><path d="M-80 58 Q-70 0 0 2 Q70 0 80 58 Z" fill="#4a5470"/>` })}
  ${pine(80, 1920, 900, '#05070e')}${pine(1010, 1920, 1000, '#05070e')}`, { cam: { s: [1.0, 1.1], x: [0, 0], y: [40, -30], oy: 800 } });
// 10. Записка проявляется.
const note10 = noteSheet(540, 820, 900, 1000, [{ text: 'Если читаешь это —' }, { text: 'ты уже на экзамене.' }, { text: 'Здесь принимает' }, { text: 'сама дорога.' }, { text: 'Ошибёшься —', color: '#b8231f' }, { text: 'останешься на ней.', color: '#b8231f' }], { id: 'n10', head: '2006', rot: 1.5 });
add(T(55), T(67), `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 760, 760, 'gLamp')}${note10}`, {
  cam: { s: [1.0, 1.12], oy: 700 },
  tweens: (t0) => {
    const at = [55, 58, 62, 64, 66, 67];
    return at.map((w, k) => `tl.fromTo('#n10-l${k}', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 }, ${T(w).toFixed(2)});`).join('\n') + `tl.set('#n10-l0', { opacity: 0 }, ${t0});`;
  },
});
// 11. Герой крупно: страх.
add(T(67), T(70), `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(760, 1000, 600, 'gGlowC', 'opacity="0.5"')}${hero(540, 820, 2.3, 'scared', { light: P.cyan })}`, {
  cam: { s: [1.0, 1.1], oy: 800 },
});

// --- Правило 1 ---
const crossLight = `${sky({ seed: 12 })}${forest(1080, 13)}
  <path d="M-200 1920 L520 1080 L560 1080 L1280 1920 Z" fill="url(#gRoad)"/><path d="M-300 1300 L1380 1300 L1380 1200 L-300 1200 Z" fill="#1d2440" opacity="0.9"/>
  ${trafficLight(540, 620, 1.25, 'tl1')}`;
add(T(70), T(77), crossLight, { cam: { s: [1.0, 1.08], oy: 600 }, tweens: (t0, t1) => heartbeat('#tl1-y', t0 + 0.3, t1) });
add(T(77), T(80), `<rect width="1080" height="1920" fill="#06080f"/>${trafficLight(540, 940, 3.2, 'tl2')}`, { cam: { s: [1.0, 1.1], oy: 900 }, tweens: (t0, t1) => heartbeat('#tl2-y', t0, t1) });
const crossAvoid = (x: number, y: number) => (x > 330 && x < 750) || (y > 650 && y < 1070);
const crossScene = (cars: string, extra = '') => `${crossTop(540, 860)}${treesTop(31, crossAvoid, 60)}${cars}${extra}
  <g transform="translate(540 860) scale(0.42)">${glow(0, 0, 260, 'gGlowY', 'class="cy"')}<circle r="30" fill="#ffd04a" class="cy"/></g>`;
add(T(80), T(89), crossScene(carTop(615, 1420, 0, '#c9ccd6', { id: 'hc14', lights: true }), `<g id="arr14" opacity="0"><path d="M1060 760 L820 760 L820 700 L700 860 L820 1020 L820 960 L1060 960 Z" fill="${P.cyan}" opacity="0.85"/></g>`), {
  cam: { s: [1.0, 1.06], oy: 1000 },
  tweens: (t0, t1, id) => `tl.fromTo('#hc14', { y: 260 }, { y: 0, duration: ${(T(85) - t0).toFixed(2)}, ease: 'power1.out' }, ${t0});
    tl.fromTo('#arr14', { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.3 }, ${T(85)});${heartbeat(`${id} .cy`, t0, t1)}`,
});
add(T(89), T(95), `${windshield(`<rect x="120" y="360" width="840" height="900" fill="#0a0e1a"/>${hero(540, 680, 1.05, 'side')}${wheelHands}`)}
`, { cam: { s: [1.0, 1.08], ox: 760, oy: 700 } });
add(T(95), T(97), `${forestRoad({ y: 860 })}${carRear(540, 1200, 1.15, { brake: 'br16' })}`, {
  cam: { s: [1.05, 1.0], oy: 1200 },
  tweens: (t0) => `tl.fromTo('#br16', { opacity: 0 }, { opacity: 1, duration: 0.08 }, ${(t0 + 0.12).toFixed(2)});`,
});
add(T(97), T(104), crossScene(`${carTop(615, 1180, 0, '#c9ccd6', { lights: true, tail: true })}${carTop(1300, 790, -90, '#1a1d2a', { id: 'gc17', ghost: true })}`), {
  cam: { s: [1.08, 1.0], oy: 900 },
  tweens: (t0, t1, id) => `tl.fromTo('#gc17', { x: 0 }, { x: -1700, duration: ${(T(104) - t0 - 0.2).toFixed(2)}, ease: 'power1.inOut' }, ${t0 + 0.2});${heartbeat(`${id} .cy`, t0, t1)}`,
});
// 18. Пустое место водителя в чужой машине.
add(T(104), T(108), `<rect width="1080" height="1920" fill="#05070d"/>
  <rect x="0" y="420" width="1080" height="900" fill="#1a1d2a"/>
  <path d="M120 520 L900 520 Q980 520 1000 600 L1040 1200 L80 1200 Z" fill="#090b12"/>
  <path d="M120 520 L900 520 Q980 520 1000 600 L1040 1200 L80 1200 Z" fill="none" stroke="#2a2f40" stroke-width="16"/>
  <path d="M260 1200 L300 700 Q320 640 380 640 L520 640 Q560 640 560 700 L560 1200 Z" fill="#141826"/>
  <g id="wh18" transform="translate(700 980)"><circle r="170" fill="none" stroke="#1d2233" stroke-width="30"/><path d="M-170 0 L170 0 M0 0 L0 170" stroke="#1d2233" stroke-width="22"/><circle r="40" fill="#1d2233"/></g>
  <path d="M140 540 L520 540 L330 1180 L120 1180 Z" fill="#9fb3d8" opacity="0.05"/>`, {
  cam: { s: [1.0, 1.08], oy: 900 },
  tweens: (t0) => `tl.fromTo('#wh18', { rotation: -25, svgOrigin: '700 980' }, { rotation: 35, duration: ${(T(108) - t0).toFixed(2)}, ease: 'sine.inOut' }, ${t0});`,
});

// --- Правило 2 ---
add(T(108), T(112), `${forestRoad({ y: 900, seed: 6 })}${stopSign(820, 760, 110, { id: 'st19', glow: true, post: 360 })}`, {
  cam: { s: [1.0, 1.06], ox: 820, oy: 800 },
  tweens: (t0) => `tl.fromTo('#st19', { opacity: 0.4 }, { opacity: 1, duration: 0.15, repeat: 3, yoyo: true }, ${t0 + 0.3});`,
});
add(T(112), T(117), `${sky({ seed: 15 })}${forest(1300, 17)}${stopSign(540, 820, 300, { id: 'st20', glow: true, post: 1200 })}`, {
  cam: { s: [1.0, 1.18], oy: 820, ease: 'power1.in' },
});
add(T(117), T(119), `<rect width="1080" height="1920" fill="#06080f"/>${speedo(540, 860, 330, 'sp21', 40)}`, {
  cam: { s: [1.0, 1.06], oy: 860 },
  tweens: (t0) => `tl.fromTo('#sp21', { rotation: 0, svgOrigin: '0 0' }, { rotation: -74.3, duration: ${(T(118) + 0.4 - t0).toFixed(2)}, ease: 'power2.out' }, ${t0});`,
});
add(T(119), T(121), `${crossTop(540, 700)}${treesTop(41, (x, y) => (x > 330 && x < 750) || (y > 490 && y < 910), 60)}
  <rect x="${540}" y="${860}" width="150" height="16" fill="#e8e8ee"/><text x="615" y="910" font-family="Montserrat" font-weight="900" font-size="40" fill="#e8e8ee" text-anchor="middle" opacity="0.7">STOP</text>
  ${carTop(615, 1010, 0, '#c9ccd6', { lights: true, tail: true })}<g transform="translate(760 880) scale(0.55)">${stopSign(0, 0, 90, { glow: true, post: 0 })}</g>`, {
  cam: { s: [1.1, 1.05], oy: 900 },
});
// 23. Лесовоз проносится перед капотом.
add(T(121), T(130), `${sky({ seed: 18 })}${forest(980, 19)}<path d="M-100 1060 L1180 1060 L1180 1300 L-100 1300 Z" fill="#232a44"/><path d="M-100 1180 L1180 1180" stroke="#b9bccb" stroke-width="8" stroke-dasharray="50 50" opacity="0.5"/>
  <path d="M-200 1920 L460 1300 L620 1300 L1280 1920 Z" fill="url(#gRoad)"/>
  ${logTruck(-900, 1260, 1.1, 'lt23')}
  <g id="dust23" opacity="0">${Array.from({ length: 10 }, (_, k) => `<ellipse cx="${100 + k * 100}" cy="${1200 - (k % 3) * 30}" rx="140" ry="60" fill="#8b97bd" opacity="0.18"/>`).join('')}</g>
  ${cockpit({ wheel: true, hands: true })}`, {
  cam: { s: [1.0, 1.04], oy: 1100 },
  tweens: (t0) => `tl.fromTo('#lt23', { x: 0 }, { x: 3000, duration: 1.0, ease: 'none' }, ${T(123) - 0.35});
    tl.fromTo('#dust23', { opacity: 0, x: -200 }, { opacity: 1, x: 200, duration: 1.6 }, ${T(123) + 0.3});
    tl.to('#dust23', { opacity: 0, duration: 1.5 }, ${T(123) + 1.9});`,
});
// 24. Знак в зеркале медленно поворачивается следом.
add(T(130), T(136), `<rect width="1080" height="1920" fill="#06080f"/>
  <rect x="80" y="620" width="920" height="420" rx="70" fill="#0b0e18"/>
  <svg x="110" y="650" width="860" height="360" viewBox="0 0 860 360"><rect width="860" height="360" fill="#121a33"/>${pines(300, 220, '#0c1226', 51, -40, 900)}<path d="M0 360 L380 220 L480 220 L860 360 Z" fill="#1a2036"/>
    <g transform="translate(430 160)"><rect x="-8" y="0" width="16" height="200" fill="#1a1f30"/><g id="st24">${glow(0, 0, 200, 'gGlowR')}${stopSign(0, 0, 80, { post: 0 }).replace(/<rect[^>]*\/>/, '')}</g></g></svg>
  <rect x="80" y="620" width="920" height="420" rx="70" fill="none" stroke="#1d2338" stroke-width="30"/>
  <rect x="520" y="300" width="40" height="330" fill="#0b0e18"/>`, {
  cam: { s: [1.0, 1.1], oy: 830 },
  tweens: (t0) => `tl.fromTo('#st24', { scaleX: 0.08, svgOrigin: '0 0' }, { scaleX: 1, duration: ${(T(136) - T(131)).toFixed(2)}, ease: 'power1.inOut' }, ${T(131)});`,
});

// --- Правило 3 ---
add(T(136), T(141), `${forestRoad({ y: 860, seed: 22 })}<g id="on25">${glow(500, 860, 90, 'gGlowW')}${glow(580, 860, 90, 'gGlowW')}<circle cx="500" cy="860" r="12" fill="#fff"/><circle cx="580" cy="860" r="12" fill="#fff"/></g>`, {
  cam: { s: [1.0, 1.05], oy: 860 },
  tweens: (t0) => `tl.fromTo('#on25', { scale: 0.4, transformOrigin: '540px 860px' }, { scale: 1.6, duration: ${(T(141) - t0).toFixed(2)}, ease: 'power1.in' }, ${t0});`,
});
const beamIcon = (x: number, y: number, s: number, hi: boolean, id: string) => `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">${glow(0, 0, 160, hi ? 'gGlowC' : 'gGlowW', 'opacity="0.6"')}
  <path d="M-30 -60 Q-90 -60 -90 0 Q-90 60 -30 60 Z" fill="${hi ? '#3f9cff' : '#4ee28a'}"/>
  ${[-40, -15, 10, 35].map((dy) => `<path d="M-10 ${hi ? dy : dy - 6} L70 ${hi ? dy : dy + 22}" stroke="${hi ? '#3f9cff' : '#4ee28a'}" stroke-width="12" stroke-linecap="round"/>`).join('')}</g></g>`;
add(T(141), T(145), `<rect width="1080" height="1920" fill="#06080f"/><rect x="140" y="620" width="800" height="440" rx="50" fill="#0a1020"/>
  ${beamIcon(540, 840, 2.2, true, 'bi26a')}${beamIcon(540, 840, 2.2, false, 'bi26b')}`, {
  cam: { s: [1.0, 1.08], oy: 840 },
  tweens: (t0) => `tl.set('#bi26b', { opacity: 0 }, ${t0}); tl.set('#bi26b', { opacity: 1 }, ${T(143)}); tl.set('#bi26a', { opacity: 0 }, ${T(143)});`,
});
add(T(145), T(149), `${forestRoad({ y: 860, seed: 23 })}${glow(520, 860, 120, 'gGlowW')}${glow(560, 860, 120, 'gGlowW')}
  <path d="M260 1260 L820 1260" stroke="${P.yellow}" stroke-width="10" stroke-dasharray="30 20"/>
  <g id="m27"><rect x="350" y="1100" width="380" height="130" rx="65" fill="rgba(10,13,24,0.9)" stroke="${P.yellow}" stroke-width="6"/><text x="540" y="1188" font-family="Montserrat" font-weight="900" font-size="72" fill="${P.yellow}" text-anchor="middle">150 м</text></g>`, {
  cam: { s: [1.0, 1.05], oy: 1000 },
  tweens: (t0) => `tl.fromTo('#m27', { opacity: 0, scale: 0.6, transformOrigin: '540px 1165px' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${T(147)});`,
});
const posters = (() => {
  const r = rng(77);
  const names = ['К. 2009', 'М. 2013', 'Д. 2016', 'А. 2019', 'С. 2021', 'Е. 2024', 'И. 2011', 'Н. 2018'];
  return names.map((n, k) => missing(150 + (k % 4) * 260 + r() * 30, 520 + Math.floor(k / 4) * 560 + r() * 60, 0.62, r() * 14 - 7, 'ВОДИТЕЛЬ', n)).join('');
})();
add(T(149), T(158), `<rect width="1080" height="1920" fill="#070a13"/>${glow(540, 900, 900, 'gGlowW', 'opacity="0.25"')}${trunk(160, 220)}${trunk(420, 180)}${trunk(680, 240)}${trunk(940, 200)}${posters}`, {
  cam: { s: [1.08, 1.08], x: [120, -120], oy: 900 },
});
add(T(158), T(161), `${forestRoad({ y: 860, seed: 24 })}<g id="gl29">${glow(500, 880, 700, 'gGlowW')}${glow(580, 880, 700, 'gGlowW')}<rect width="1080" height="1920" fill="#fffaf0" opacity="0.6"/></g>`, {
  tweens: (t0) => `tl.fromTo('#gl29', { opacity: 0.2 }, { opacity: 1, duration: 0.25 }, ${t0});`,
});
add(T(161), T(163), `${forestRoad({ y: 860, seed: 24, beams: false })}<path d="M20 1920 L470 1180 L610 1180 L1060 1920 Z" fill="url(#gBeam)"/>${glow(520, 860, 160, 'gGlowW')}${glow(560, 860, 160, 'gGlowW')}${cockpit({ hands: true })}
  ${beamIcon(860, 1340, 0.6, false, 'bi30')}`, { cam: { s: [1.0, 1.04], oy: 1200 } });
// 31. Встречная проносится мимо: окно к окну.
const sideCar = (id: string, inner: string) => `<g id="${id}"><path d="M120 620 L900 620 Q980 620 1000 700 L1030 1060 L90 1060 Z" fill="#0b1022"/>${inner}
  <path d="M-80 640 Q-80 560 0 560 L1080 560 Q1160 560 1160 640 L1160 1320 L-80 1320 Z M120 620 L900 620 Q980 620 1000 700 L1030 1060 L90 1060 Z" fill="#2c3554" fill-rule="evenodd"/>
  <path d="M120 620 L900 620 Q980 620 1000 700 L1030 1060 L90 1060 Z" fill="none" stroke="#1c2440" stroke-width="18"/>
  <rect x="-80" y="1180" width="1240" height="20" fill="#232b47"/><rect x="-80" y="1320" width="1240" height="700" fill="#05070d"/><path d="M160 640 L520 640 L320 1040 L130 1040 Z" fill="#c7d6ff" opacity="0.06"/></g>`;
add(T(163), T(169), `<rect width="1080" height="1920" fill="#05070d"/>${glow(540, 900, 900, 'gGlowW', 'opacity="0.18"')}
  ${sideCar('sc31', `${hero(560, 850, 0.95, 'calm', { light: '#9fe3ff' })}<rect x="90" y="620" width="940" height="440" fill="#1a3a66" opacity="0.25"/>`)}`, {
  cam: { s: [1.0, 1.04], oy: 900 },
  tweens: (t0) => `tl.fromTo('#sc31', { x: 1300 }, { x: 0, duration: 0.7, ease: 'power3.out' }, ${t0});`,
});
add(T(169), T(175), `<rect width="1080" height="1920" fill="#06080f"/>
  <svg x="0" y="0" width="540" height="1920" viewBox="0 0 540 1920"><rect width="540" height="1920" fill="#0b0f1c"/>${hero(300, 860, 1.6, 'shock', { light: P.cyan })}</svg>
  <svg x="540" y="0" width="540" height="1920" viewBox="540 0 540 1920"><rect x="540" width="540" height="1920" fill="#0d1a33"/><g opacity="0.92">${hero(780, 860, 1.6, 'calm', { light: '#a8e8ff' })}</g><rect x="540" width="540" height="1920" fill="#3a6fbf" opacity="0.22"/></svg>
  <rect x="534" y="0" width="12" height="1920" fill="#000"/>`, {
  cam: { s: [1.0, 1.08], oy: 860 },
});

// --- Правило 4 ---
const lanesTop = (cars: string, extra = '') => `<rect width="1080" height="1920" fill="#101628"/>${treesTop(61, (x) => x > 180 && x < 900, 50)}
  <rect x="240" y="-50" width="600" height="2020" fill="#232a44"/><path d="M540 -50 L540 1970" stroke="#b9bccb" stroke-width="8" stroke-dasharray="50 50" opacity="0.6"/>
  ${Array.from({ length: 11 }, (_, k) => `<rect x="${250 + k * 54}" y="640" width="34" height="170" fill="#d4d7e2" opacity="0.85"/>`).join('')}
  <g transform="translate(200 560)"><rect x="-6" y="0" width="12" height="140" fill="#1a1f30"/><rect x="-46" y="-80" width="92" height="92" fill="#2f6fd6"/><path d="M-36 2 L0 -70 L36 2 Z" fill="#fff"/><path d="M-6 -50 L-14 -6 M2 -50 L14 -6" stroke="#1a1f30" stroke-width="6"/></g>
  ${cars}${extra}`;
add(T(175), T(183), lanesTop(`${carTop(400, 960, 0, '#7a3a3a', { tail: true })}${carTop(680, 1500, 0, '#c9ccd6', { id: 'hc33', lights: true })}`), {
  cam: { s: [1.0, 1.05], oy: 1000 },
  tweens: (t0) => `tl.fromTo('#hc33', { y: 300 }, { y: 0, duration: ${(T(183) - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
});
add(T(183), T(188), lanesTop(`${carTop(400, 960, 0, '#7a3a3a', { tail: true })}${carTop(680, 990, 0, '#c9ccd6', { id: 'hc34', lights: true, tail: true })}`, `<g id="x34" opacity="0"><path d="M680 870 Q700 700 680 520" stroke="${P.red}" stroke-width="14" stroke-dasharray="26 18" fill="none"/><path d="M600 620 L760 780 M760 620 L600 780" stroke="${P.red}" stroke-width="24" stroke-linecap="round"/></g>`), {
  cam: { s: [1.06, 1.1], oy: 900 },
  tweens: (t0) => `tl.fromTo('#hc34', { y: 380 }, { y: 0, duration: ${(T(184) - t0).toFixed(2)}, ease: 'power2.out' }, ${t0});tl.fromTo('#x34', { opacity: 0, scale: 1.3, transformOrigin: '680px 700px' }, { opacity: 1, scale: 1, duration: 0.2 }, ${T(187)});`,
});
add(T(188), T(194), `${sky({ seed: 30 })}${forest(980, 31)}<path d="M-200 1920 L500 980 L580 980 L1280 1920 Z" fill="url(#gRoad)"/>
  ${Array.from({ length: 7 }, (_, k) => `<path d="M${330 + k * 70} 1300 L${360 + k * 70} 1300 L${380 + k * 76} 1400 L${346 + k * 76} 1400 Z" fill="#d4d7e2" opacity="0.7"/>`).join('')}
  <rect x="-100" y="1000" width="1280" height="420" fill="url(#gFog)" opacity="1.4"/>
  <g id="q35" opacity="0">${ghostPerson(420, 1290, 0.75)}${ghostPerson(650, 1300, 0.7)}</g>
  <rect x="-100" y="1130" width="1280" height="300" fill="url(#gFog)"/>`, {
  cam: { s: [1.0, 1.1], oy: 1250 },
  tweens: (t0) => `tl.fromTo('#q35', { opacity: 0 }, { opacity: 0.35, duration: 1.2 }, ${t0 + 0.6});`,
});
// 36. Пустой автобус у перехода.
add(T(194), T(203), `${sky({ seed: 33 })}${pines(1000, 260, '#121a33', 34)}<rect x="-100" y="1240" width="1280" height="700" fill="#1f2640"/>
  <g transform="translate(900 640)"><rect x="-8" y="0" width="16" height="620" fill="#141826"/><path d="M0 0 Q0 -30 -60 -30 L-120 -30" stroke="#141826" stroke-width="14" fill="none"/><rect x="-160" y="-38" width="80" height="22" rx="8" fill="#ffd98a"/>${glow(-120, 0, 420, 'gLamp')}</g>
  <g id="bus36"><rect x="-260" y="760" width="1000" height="450" rx="40" fill="#3a6a5a"/><rect x="-260" y="1080" width="1000" height="60" fill="#2c5246"/>
    ${Array.from({ length: 5 }, (_, k) => `<rect x="${-220 + k * 170}" y="800" width="140" height="190" rx="14" fill="#ffe6a8"/><rect x="${-220 + k * 170}" y="930" width="140" height="18" fill="#cdb478"/>`).join('')}
    <rect x="640" y="800" width="80" height="330" rx="8" fill="#ffe6a8"/><circle cx="-120" cy="1210" r="64" fill="#07090f"/><circle cx="560" cy="1210" r="64" fill="#07090f"/>
    ${glow(200, 900, 700, 'gLamp', 'opacity="0.5"')}</g>`, {
  cam: { s: [1.0, 1.06], x: [60, -40], oy: 950 },
});
// 37. Люди без теней на «зебре».
const zebra = Array.from({ length: 8 }, (_, k) => `<rect x="${60 + k * 125}" y="1180" width="80" height="260" fill="#d4d7e2" opacity="0.75"/>`).join('');
add(T(203), T(208), `${sky({ seed: 35 })}${pines(980, 240, '#121a33', 36)}<rect x="-100" y="1120" width="1280" height="900" fill="#1f2640"/>${zebra}
  <g transform="translate(160 560)"><rect x="-8" y="0" width="16" height="660" fill="#141826"/><rect x="-10" y="-30" width="110" height="24" rx="8" fill="#ffd98a"/>${glow(40, 0, 520, 'gLamp')}</g>
  <path d="M160 1220 L520 1500 L540 1480 L176 1214 Z" fill="#05070d" opacity="0.6"/>
  <g id="pp37">${ghostPerson(380, 1330, 1.0)}${ghostPerson(600, 1300, 0.95)}${ghostPerson(820, 1340, 1.05)}</g>`, {
  cam: { s: [1.0, 1.05], oy: 1250 },
  tweens: (t0) => `tl.fromTo('#pp37', { x: -180 }, { x: 120, duration: ${(T(208) - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
});
add(T(208), T(212), `<rect width="1080" height="1920" fill="#1f2640"/>${Array.from({ length: 4 }, (_, k) => `<rect x="${-60 + k * 320}" y="700" width="200" height="1300" fill="#d4d7e2" opacity="0.75"/>`).join('')}
  <path d="M-200 900 L1300 1500 L1300 1600 L-200 1000 Z" fill="#05070d" opacity="0.55"/>
  ${glow(800, 300, 900, 'gLamp')}
  <g transform="translate(540 1500) scale(2.6)"><path d="M-40 -150 Q-48 -60 -34 0 L-12 0 L-6 -120 L6 -120 L12 0 L34 0 Q48 -60 40 -150 Z" fill="#c9d3ec"/><path d="M-46 -150 Q-50 -250 0 -262 Q50 -250 46 -150 Z" fill="#aab6d6"/></g>
  <text x="900" y="1700" font-family="Caveat" font-weight="700" font-size="70" fill="${P.red}" text-anchor="end" opacity="0">тени нет</text>`, {
  cam: { s: [1.0, 1.08], oy: 1300 },
});

// --- Правило 5 ---
add(T(212), T(219), `${sky({ moon: [260, 420], seed: 40 })}${pines(1000, 200, '#141c36', 41)}<rect x="-100" y="1000" width="1280" height="1000" fill="#080b16"/>
  ${Array.from({ length: 12 }, (_, k) => `<path d="M${-50 + k * 110} ${1180 + (k % 3) * 120} l80 0" stroke="#3a4a7a" stroke-width="4" opacity="0.5"/>`).join('')}
  <rect x="-100" y="880" width="1280" height="40" fill="#141a2c"/><rect x="-100" y="860" width="1280" height="12" fill="#1d2440"/>
  ${Array.from({ length: 6 }, (_, k) => `<path d="M${k * 220 - 40} 920 L${k * 220 - 40} 1320 L${k * 220 + 40} 1320 L${k * 220 + 40} 920 Z" fill="#10152a"/><path d="M${k * 220 - 70} 920 Q${k * 220 + 40} 820 ${k * 220 + 150} 920" stroke="#141a2c" stroke-width="16" fill="none"/>`).join('')}
  <rect x="-100" y="800" width="1280" height="200" fill="url(#gFog)" opacity="1.2"/>
  <g id="cr39">${carTop(0, 0, 90, '#c9ccd6', { s: 0.32, lights: true })}</g>`, {
  cam: { s: [1.0, 1.06], oy: 900 },
  tweens: (t0) => `tl.fromTo('#cr39', { x: -80, y: 856 }, { x: 600, y: 856, duration: ${(T(219) - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
});
add(T(219), T(224), `<rect width="1080" height="1920" fill="#070a13"/>${glow(540, 900, 800, 'gGlowW', 'opacity="0.18"')}
  <rect x="-100" y="760" width="1280" height="40" fill="#2a3150"/><rect x="-100" y="1100" width="1280" height="30" fill="#2a3150"/>
  ${Array.from({ length: 9 }, (_, k) => `<rect x="${k * 130}" y="790" width="22" height="320" fill="#2a3150"/>`).join('')}
  <path d="M380 760 Q450 860 420 1110 M440 760 Q520 900 470 1110" stroke="#0d1020" stroke-width="22" fill="none"/>
  <path d="M640 800 l40 20 l-30 30 l50 10" stroke="#8a93ad" stroke-width="5" fill="none" opacity="0.7"/>
  ${[260, 780].map((x) => `<g transform="translate(${x} 900)"><circle r="70" fill="none" stroke="#2f4a2f" stroke-width="26"/>${Array.from({ length: 8 }, (_, k) => `<circle cx="${Math.cos(k * 0.8) * 70}" cy="${Math.sin(k * 0.8) * 70}" r="16" fill="${['#b03030', '#e8e1d0', '#c94060'][k % 3]}"/>`).join('')}<path d="M-20 70 L-40 160 M20 70 L40 160" stroke="#1d1d30" stroke-width="8"/></g>`).join('')}`, {
  cam: { s: [1.08, 1.0], x: [-60, 60], oy: 900 },
});
const bridgeTruck = (sp: number) => `${sky({ seed: 44 })}<rect x="-100" y="980" width="1280" height="940" fill="#070a14"/>${bridgePOV(880)}
  <rect x="-100" y="760" width="1280" height="260" fill="url(#gFog)"/>${truckRear(540, 1060, 0.85, { id: 'tr', empty: false })}
  <path d="M60 1920 L470 1120 L610 1120 L1020 1920 Z" fill="url(#gBeam)"/>${cockpit({ hands: true, phone: speedo(870, 1350, 110, `sp${sp}`, 20) })}`;
add(T(224), T(229), bridgeTruck(41), {
  cam: { s: [1.0, 1.05], oy: 1100 },
  tweens: (t0) => `tl.fromTo('${'#s' + (shots.length)} #tr', { y: 0 }, { y: -6, duration: 0.5, repeat: 7, yoyo: true, ease: 'sine.inOut' }, ${t0});`,
});
// 42. Внизу в чёрной воде горят фары.
add(T(229), T(237), `<rect width="1080" height="1920" fill="#03050b"/>
  <rect x="-100" y="0" width="1280" height="300" fill="#0b0f1c"/>${Array.from({ length: 9 }, (_, k) => `<rect x="${k * 135}" y="0" width="24" height="300" fill="#141a2c"/>`).join('')}<rect x="-100" y="280" width="1280" height="34" fill="#1a2036"/>
  ${[[300, 760, 1], [700, 980, 0.8], [420, 1300, 0.65], [820, 1520, 0.5], [180, 1680, 0.45]].map(([x, y, s], k) => `<g class="uw" id="uw${k}" transform="translate(${x} ${y}) scale(${s})">${glow(-60, 0, 220, 'gGlowW', 'opacity="0.55"')}${glow(60, 0, 220, 'gGlowW', 'opacity="0.55"')}<ellipse cx="-60" cy="0" rx="24" ry="14" fill="#fff6dc" opacity="0.8"/><ellipse cx="60" cy="0" rx="24" ry="14" fill="#fff6dc" opacity="0.8"/></g>`).join('')}
  ${Array.from({ length: 14 }, (_, k) => `<path d="M${(k * 173) % 1080 - 60} ${420 + k * 105} q60 -12 120 0 t120 0" stroke="#3a4f80" stroke-width="4" fill="none" opacity="0.4"/>`).join('')}`, {
  cam: { s: [1.0, 1.1], oy: 1000 },
  tweens: (t0, t1) => [0, 1, 2, 3, 4].map((k) => `tl.fromTo('#uw${k}', { opacity: 0.3 }, { opacity: 1, duration: ${0.6 + k * 0.17}, repeat: ${Math.floor((t1 - t0) / (0.6 + k * 0.17)) - 1}, yoyo: true, ease: 'sine.inOut' }, ${t0});`).join('\n'),
});
add(T(237), T(242), bridgeTruck(43), { cam: { s: [1.06, 1.0], oy: 1300 } });

// --- Развязка ---
const note44 = (darkId: string) => noteSheet(540, 860, 900, 1000, [{ text: 'Если читаешь это —' }, { text: 'ты уже на экзамене.' }, { text: 'Здесь принимает' }, { text: 'сама дорога.' }, { text: 'Ошибёшься —', color: '#b8231f' }, { text: 'останешься на ней.', color: '#b8231f' }], { id: darkId, head: '2006', rot: 1.5 });
add(T(242), T(248), `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 760, 760, 'gLamp')}${note44('n44')}
  <rect id="dk44" x="80" y="340" width="920" height="1040" fill="#2a1a0c" opacity="0" style="mix-blend-mode:multiply"/>`, {
  cam: { s: [1.0, 1.06], oy: 860 },
  tweens: (t0) => `tl.fromTo('#dk44', { opacity: 0 }, { opacity: 0.75, duration: ${(T(248) - T(246)).toFixed(2)}, ease: 'power1.in' }, ${T(246)});`,
});
add(T(248), T(257), `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 760, 760, 'gLamp', 'opacity="0.6"')}
  ${noteSheet(540, 860, 900, 1000, [{ text: '' }, { text: '' }, { text: '' }, { text: '23.10.2026', color: '#b8231f', size: 92 }, { text: '' }, { text: '' }], { id: 'n45', rot: -1.5 })}
  <rect x="90" y="360" width="900" height="1000" fill="#2a1a0c" opacity="0.55" style="mix-blend-mode:multiply"/>
  <ellipse id="c45" cx="430" cy="790" rx="250" ry="90" fill="none" stroke="#c22a2a" stroke-width="9" transform="rotate(-6 430 790)"/>
  <text id="hw45" x="140" y="1000" font-family="Caveat" font-weight="700" font-size="60" fill="#2b4fae">почерк — твой</text>`, {
  cam: { s: [1.0, 1.1], oy: 820 },
  tweens: (t0) => `tl.fromTo('#n45-l3', { opacity: 0 }, { opacity: 1, duration: 0.6 }, ${T(251)});
    tl.fromTo('#c45', { strokeDasharray: 1200, strokeDashoffset: 1200 }, { strokeDashoffset: 0, duration: 0.6 }, ${T(252) + 0.1});
    tl.fromTo('#hw45', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, ${T(255)});`,
});
add(T(257), T(262), `<rect width="1080" height="1920" fill="#0d0f17"/>
  ${noteSheet(540, 860, 900, 1000, [{ text: '' }, { text: 'Последнее правило', color: '#2b4fae', size: 74 }, { text: '' }, { text: 'ты найдёшь сам.', color: '#2b4fae', size: 74 }], { id: 'n46', rot: 1 })}
  <rect x="90" y="360" width="900" height="1000" fill="#2a1a0c" opacity="0.55" style="mix-blend-mode:multiply"/>`, {
  cam: { s: [1.05, 1.18], oy: 820, ease: 'power1.in' },
  tweens: (t0) => `tl.fromTo('#n46-l1', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${t0});tl.fromTo('#n46-l3', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(259)});`,
});
const forkRoutes = `<path id="ra" d="M200 700 L200 520 Q200 440 110 380 Q40 330 60 200" stroke="${P.yellow}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path id="rb" d="M200 700 L200 520 Q200 440 290 380 Q360 330 340 200" stroke="${P.cyan}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="190" r="34" fill="${P.yellow}"/><text x="60" y="204" font-family="Montserrat" font-weight="900" font-size="40" fill="#10131f" text-anchor="middle">А</text>
  <circle cx="340" cy="190" r="34" fill="${P.cyan}"/><text x="340" y="204" font-family="Montserrat" font-weight="900" font-size="40" fill="#10131f" text-anchor="middle">Б</text>`;
add(T(262), T(268), `<rect width="1080" height="1920" fill="#05070d"/>${phone(540, 880, 520, navScreen({ route: 'M200 700 L200 520', top: 'Выберите маршрут', topColor: P.yellow, blank: true, extra: forkRoutes }), { id: 'ph47' })}`, {
  cam: { s: [1.0, 1.08], oy: 820 },
  tweens: (t0) => `tl.fromTo('#ph47', { opacity: 0, scale: 0.9, svgOrigin: '540 880' }, { opacity: 1, scale: 1, duration: 0.35 }, ${t0});
    tl.fromTo('#ra', { strokeDasharray: 600, strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 0.8 }, ${T(266)});
    tl.fromTo('#rb', { strokeDasharray: 600, strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 0.8 }, ${T(266) + 0.15});`,
});
add(T(268), T(278), `${sky({ seed: 50, moon: [200, 360] })}${forest(1000, 51, 1)}<path d="M-100 1920 L500 1000 L560 1000 L1180 1920 Z" fill="#1b2034"/>
  ${Array.from({ length: 10 }, (_, k) => `<path d="M${490 - k * 40} ${1010 + k * 90} l${10 + k * 6} 30" stroke="#0b0e18" stroke-width="${3 + k}" />`).join('')}
  ${trafficLight(530, 860, 0.5, 'tl48')}
  <g transform="translate(540 1500)"><circle r="110" fill="${P.yellow}"/><text y="40" font-family="Montserrat" font-weight="900" font-size="120" fill="#10131f" text-anchor="middle">А</text></g>`, {
  cam: { s: [1.0, 1.12], oy: 900 },
  tweens: (t0, t1) => heartbeat('#tl48-y', t0 + 0.3, t1),
});
add(T(278), T(286), `${sky({ seed: 52 })}${forest(1100, 53)}<rect x="-100" y="1240" width="1280" height="700" fill="#1b2034"/>
  <g transform="translate(560 1240) scale(1.25)"><path d="M-300 -60 L-300 -520 Q-300 -560 -260 -560 L120 -560 Q200 -560 230 -480 L300 -260 L300 -60 Z" fill="#3a4466"/>
    <path d="M-250 -510 L100 -510 Q160 -510 180 -460 L240 -300 L-250 -300 Z" fill="#0b1022"/>
    <path d="M-120 -300 L-120 -390 Q-120 -420 -90 -420 L40 -420 L60 -300 Z" fill="#141a30"/>
    <path d="M-30 -430 L-30 -340" stroke="#1d2440" stroke-width="24"/>${glow(120, -380, 140, 'gGlowC', 'opacity="0.5"')}
    <circle cx="-200" cy="-60" r="80" fill="#07090f"/><circle cx="180" cy="-60" r="80" fill="#07090f"/><rect x="290" y="-220" width="30" height="60" fill="#fff6d8"/>${glow(320, -190, 260, 'gGlowW')}</g>
  <g transform="translate(540 1600)"><circle r="96" fill="${P.cyan}"/><text y="36" font-family="Montserrat" font-weight="900" font-size="110" fill="#10131f" text-anchor="middle">Б</text></g>`, {
  cam: { s: [1.0, 1.08], ox: 520, oy: 900 },
});
// 50. Выбор.
add(T(286), T(302), `${sky({ seed: 60 })}${forest(1250, 61)}<rect width="1080" height="1920" fill="#05070d" opacity="0.55"/>`, { cam: { s: [1.0, 1.06] } });
// 51. Игра вместо страшилки.
add(T(302), END, `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(540, 860, 760, 'gGlowY', 'opacity="0.4"')}
  <g id="nt51">${noteSheet(250, 1300, 420, 470, [{ text: 'Если читаешь', size: 44 }, { text: 'это — ты уже', size: 44 }, { text: 'на экзамене.', size: 44 }], { id: 'n51', rot: -12 })}</g>
  ${phone(560, 920, 430, `<rect width="400" height="820" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text>`, { id: 'ph51' })}`, {
  cam: { s: [1.0, 1.05], oy: 860 },
  tweens: (t0) => `tl.fromTo('#ph51', { opacity: 0, y: 160, svgOrigin: '560 920' }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, ${T(305)});
    tl.fromTo('#nt51', { x: 0, y: 0, rotation: 0 }, { x: -900, y: 500, rotation: -40, svgOrigin: '250 1300', duration: 0.7, ease: 'power2.in' }, ${T(310)});`,
});

/* ---------- Наложения: правила на скотче, выбор, «ссылка в био» ---------- */
const rule = (n: number, text: string, a: number, b: number) => ({
  t0: T(a),
  t1: T(b),
  html: `<div id="rn${n}">${ruleNote(n, text)}</div>`,
  tweens: (t0: number) => `tl.fromTo('#rn${n}', { opacity: 0, scale: 1.25, rotation: -6, transformOrigin: '400px 300px' }, { opacity: 1, scale: 1, rotation: 0, duration: 0.25, ease: 'power3.in' }, ${t0});`,
});
const overlays = [
  rule(1, 'Жёлтый мигает — нерегулируемый.<br>Нет знаков — уступи тому, кто справа', 70, 108),
  rule(2, 'Знак «Стоп» — остановись полностью', 108, 136),
  rule(3, 'Встречные фары — дальний на ближний за 150 м', 136, 175),
  rule(4, 'Встала машина перед переходом — остановись и ты', 175, 212),
  rule(5, 'На мосту не обгоняй', 212, 242),
  {
    t0: T(286),
    t1: T(302),
    html: `<div style="position:absolute;left:0;right:0;top:300px;text-align:center;font-weight:900;font-size:62px;color:#fff;letter-spacing:1px">ЧТО ВЫБЕРЕШЬ?</div>
      ${choiceCard('А', P.yellow, 'Старая трасса', 'там мигает тот самый жёлтый', 430, 'ca')}
      ${choiceCard('Б', P.cyan, 'Ехать за фурой', 'у фуры нет водителя', 660, 'cb')}
      <div id="p2" style="position:absolute;left:0;right:0;top:900px;text-align:center;font-weight:800;font-size:32px;color:#c9cfdf;letter-spacing:2px">ЧАСТЬ 2 — ПО ТВОЕМУ ВЫБОРУ</div>`,
    tweens: (t0: number) => `tl.fromTo('#ca', { opacity: 0, x: -120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${t0 + 0.1});
      tl.fromTo('#cb', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.35, ease: 'back.out(1.6)' }, ${t0 + 0.4});
      tl.fromTo('#ca', { scale: 1 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1 }, ${T(292)});
      tl.fromTo('#cb', { scale: 1 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1 }, ${T(294)});
      tl.fromTo('#p2', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${T(297)});`,
  },
  {
    t0: T(313),
    t1: END,
    html: `<div id="bio" style="position:absolute;left:150px;right:150px;top:240px;height:120px;border-radius:60px;background:${P.yellow};display:flex;align-items:center;justify-content:center;gap:18px;font-weight:900;font-size:50px;color:#10131f;box-shadow:0 0 50px ${P.yellow}88">ССЫЛКА В БИО <span style="font-size:56px">↗</span></div>`,
    tweens: (t0: number) => `tl.fromTo('#bio', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0});
      tl.to('#bio', { scale: 1.06, duration: 0.4, yoyo: true, repeat: 5, ease: 'sine.inOut' }, ${t0 + 0.4});`,
  },
];

/* ---------- Субтитры ---------- */
const Y = P.yellow;
const R = P.red;
const C = P.cyan;
const color: Record<number, string> = {
  6: C, 8: Y, 13: Y, 14: C, 19: Y, 27: C, 31: Y, 38: R, 39: R, 44: Y, 46: Y, 48: R, 61: R, 65: Y, 67: R, 71: R, 72: Y, 76: R, 79: Y, 85: C, 88: C,
  92: R, 96: C, 103: Y, 107: R, 109: R, 111: R, 116: R, 117: R, 118: R, 124: Y, 133: R, 137: R, 140: Y, 144: C, 147: Y, 148: Y, 157: R,
  160: Y, 174: R, 177: R, 183: C, 187: R, 193: R, 198: Y, 211: R, 213: R, 215: C, 217: R, 218: R, 223: R, 228: Y, 232: C, 236: Y, 241: C,
  247: R, 252: R, 256: R, 261: R, 268: Y, 277: Y, 278: C, 281: C, 285: R, 290: Y, 292: Y, 294: C, 301: Y, 302: Y, 304: C, 307: Y, 310: R, 315: Y,
};
const fix4 = 'Правило|номер|4.|Если|перед|переходом|остановилась|машина —|остановись|и|ты.|Не|объезжай.|Ты|не|знаешь,|кого|она|пропускает.|У|перехода|стоит|пустой|автобус.|Он|встаёт|за|ним.|По|«зебре»|медленно|идут|люди.|У|них|нет|теней.'.split('|');
const text: Record<number, string> = { 66: 'Ошибёшься —', 234: 'чьи-то', 260: 'найдёшь', 277: 'жёлтый.' };
fix4.forEach((t, k) => (text[175 + k] = t));

export const v42: Video8 = {
  id: '42-noch-doroga',
  title: 'Правила ночной дороги. Часть 1',
  end: END,
  shots,
  subs: makeSubs(words, { text, color, hide: [[235, 235]] }),
  overlays,
  clock: [
    [0, '23 ОКТ · 03:03'], [T(40), '23 ОКТ · 03:04'], [T(70), '23 ОКТ · 03:05'], [T(108), '23 ОКТ · 03:06'], [T(136), '23 ОКТ · 03:07'],
    [T(175), '23 ОКТ · 03:08'], [T(212), '23 ОКТ · 03:09'], [T(242), '23 ОКТ · 03:10'], [T(262), '23 ОКТ · 03:11'], [T(286), '23 ОКТ · 03:12'],
  ],
  shakes: [[T(39), 18, 0.4], [T(95) + 0.1, 10, 0.3], [T(123) - 0.3, 30, 1.1], [T(158), 14, 0.5], [T(163), 12, 0.4], [T(170), 10, 0.3]],
  flashes: [[T(39), 0.5, 0.35, '#ff3030'], [T(123) - 0.1, 0.7, 0.5], [T(158), 0.9, 0.9], [T(251), 0.35, 0.4, '#ff3030']],
  plainFrom: T(313),
};
