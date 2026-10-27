/**
 * Ролик 44 «Правила ночной дороги. Часть 3» (вариант А «Заглянуть в кузов»).
 * Сценарий — `v44-script.json` (предложения с пометками *…*), озвучка — ElevenLabs. Время предложений берётся из
 * `v44-timing.json` (его делает `scripts/align44.py` по озвучке); без файла время оценивается по длине текста,
 * поэтому картинку можно собрать и проверить ещё до озвучки. Правила 11–14 — ПДД РФ 12.8, 12.7, 2.1.1, 1.3.
 */
import { existsSync, readFileSync } from 'node:fs';
import { P, makeSubs, ruleNote, type Shot8, type Video8, type Word } from '../engine8.ts';
import { carRear, forestRoad, windshield, wheelHands } from './v42-noch-doroga.ts';
import { glow, hero, noteSheet, sky, forest, svg } from '../scenery8.ts';

const script = JSON.parse(readFileSync(new URL('./v44-script.json', import.meta.url), 'utf8')) as { recap: string[]; main: string[] };
const timingUrl = new URL('./v44-timing.json', import.meta.url);
const timing = existsSync(timingUrl) ? (JSON.parse(readFileSync(timingUrl, 'utf8')) as { off: number; recap: [number, number][]; main: [number, number][] }) : null;

/* ---------- Время предложений ---------- */
const est = (t: string[], t0: number): [number, number][] => {
  let t_ = t0;
  return t.map((s) => {
    const d = s.replace(/\*/g, '').length * 0.068 + 0.5;
    const r: [number, number] = [t_, t_ + d - 0.3];
    t_ += d + 0.45;
    return r;
  });
};
const recapT = timing?.recap ?? est(script.recap, 0.2);
const OFF = timing?.off ?? recapT[recapT.length - 1][1] + 0.8;
const mainT: [number, number][] = timing ? timing.main.map(([a, b]) => [a + OFF, b + OFF]) : est(script.main, OFF);
/** Начало и конец главного предложения i (нумерация с 1, как в сценарии). */
const S = (i: number) => mainT[i - 1][0];
const E = (i: number) => mainT[i - 1][1];
const END = mainT[mainT.length - 1][1] + 2.2;

/** Слова предложений с временем (пропорционально длине слов) и цветом из пометок: *красный*, ^жёлтый^, ~голубой~. */
const toWords = (sent: string[], tt: [number, number][]): { words: Word[]; color: Record<number, string> } => {
  const words: Word[] = [];
  const color: Record<number, string> = {};
  sent.forEach((s, i) => {
    const toks = s.split(/\s+/);
    const total = toks.reduce((a, t) => a + t.replace(/[*^~]/g, '').length + 1, 0);
    let acc = 0;
    const [a, b] = tt[i];
    toks.forEach((tok) => {
      const clean = tok.replace(/[*^~]/g, '');
      const t0 = a + ((b - a) * acc) / total;
      acc += clean.length + 1;
      const t1 = a + ((b - a) * acc) / total;
      const c = tok.includes('*') ? P.red : tok.includes('^') ? P.yellow : tok.includes('~') ? P.cyan : undefined;
      if (c) color[words.length] = c;
      words.push([clean, t0, t1, 0]);
    });
  });
  return { words, color };
};

/* ---------- Рисовка части 3 ---------- */
const shots: Shot8[] = [];
const add = (t0: number, t1: number, art: string, rest: Partial<Shot8> = {}) => shots.push({ t0, t1, art: svg(art), ...rest });
const dark = '<rect width="1080" height="1920" fill="#06080f"/>';

const driver = (face: 'calm' | 'worry' | 'scared' | 'shock' | 'focus' | 'side') =>
  windshield(`${hero(540, 680, 1.05, face, { light: P.cyan })}${wheelHands}`);

/** Фура сзади с распахнутыми дверями: внутри тёмный кузов с рядами огней приборов. */
const truckOpen = (x: number, y: number, s: number, id = 'to', lit = true) => `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">
  ${glow(0, -80, 620, lit ? 'gGlowC' : 'gLamp', 'opacity="0.35"')}
  <rect x="-300" y="-520" width="600" height="600" rx="16" fill="#1e293b"/><rect x="-270" y="-490" width="540" height="540" fill="#04060c"/>
  ${[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => `<rect x="${-220 + c * 160}" y="${-440 + r * 130}" width="110" height="60" rx="14" fill="#0f1526"/><rect x="${-196 + c * 160}" y="${-428 + r * 130}" width="62" height="18" rx="6" fill="${lit ? '#35c4ef' : '#27304a'}" opacity="${lit ? 0.7 : 1}"/>`)).join('')}
  <polygon points="-300,-520 -440,-470 -440,60 -300,80" fill="#243148"/><polygon points="300,-520 440,-470 440,60 300,80" fill="#202c42"/>
  <rect x="-300" y="80" width="600" height="40" fill="#0b0e18"/><circle cx="-200" cy="150" r="60" fill="#07090f"/><circle cx="200" cy="150" r="60" fill="#07090f"/>
  </g></g>`;

/** Ряды учебных машин спереди: фары выключены, на лобовом — табличка с годом, на крыше «У». */
const learnerFront = (x: number, y: number, s: number, year: string, glowOn: boolean, id = '') => `<g ${id ? `id="${id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-110" y="-70" width="220" height="130" rx="30" fill="#334155"/><rect x="-86" y="-96" width="172" height="62" rx="18" fill="#1b2440"/>
  <rect x="-40" y="-84" width="80" height="26" rx="6" fill="#e8dcb8"/><text x="0" y="-64" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="20" fill="#2a2d38">${year}</text>
  <polygon points="0,-150 -30,-100 30,-100" fill="#ffc23d" stroke="#d92b2b" stroke-width="4"/><text x="0" y="-108" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="26" fill="#10131f">У</text>
  <rect x="-92" y="30" width="34" height="16" rx="6" fill="${glowOn ? '#fff3c4' : '#161c30'}"/><rect x="58" y="30" width="34" height="16" rx="6" fill="${glowOn ? '#fff3c4' : '#161c30'}"/>
  </g></g>`;

/** Герой со спины (в полный рост): капюшон, плечи, ноги — шаги анимируются по id `<id>-l`, `<id>-r`. */
const walker = (x: number, y: number, s: number, id: string) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="610" rx="150" ry="26" fill="#000" opacity="0.5"/>
  <g id="${id}-l"><rect x="-70" y="330" width="52" height="270" rx="22" fill="#1d2338"/><rect x="-78" y="580" width="66" height="30" rx="12" fill="#0b0e18"/></g>
  <g id="${id}-r"><rect x="18" y="330" width="52" height="270" rx="22" fill="#232a44"/><rect x="10" y="580" width="66" height="30" rx="12" fill="#0b0e18"/></g>
  <path d="M-120 330 Q-130 120 -60 60 L60 60 Q130 120 120 330 Z" fill="${P.hood}"/><path d="M-110 120 Q0 190 110 120 Q70 40 0 36 Q-70 40 -110 120 Z" fill="${P.hood2}"/>
  <path d="M-120 140 Q-150 260 -138 340" stroke="${P.hood2}" stroke-width="40" fill="none" stroke-linecap="round"/><path d="M120 140 Q150 260 138 340" stroke="${P.hood2}" stroke-width="40" fill="none" stroke-linecap="round"/>
  <circle cx="0" cy="-10" r="82" fill="${P.hair}"/><path d="M-60 40 Q0 70 60 40 L60 70 Q0 100 -60 70 Z" fill="${P.hood2}"/>
  </g>`;

/** Тень инструктора: силуэт по плечи с белыми глазами. */
const shadow = (x: number, y: number, s: number, id: string) => `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">
  ${glow(0, 0, 360, 'gGlowC', 'opacity="0.18"')}
  <path d="M-170 400 Q-190 150 -70 110 L70 110 Q190 150 170 400 Z" fill="#05070e"/><ellipse cx="0" cy="0" rx="96" ry="116" fill="#05070e"/>
  <path d="M-96 -40 Q-90 -130 0 -140 Q90 -130 96 -40 Q60 -80 0 -78 Q-60 -80 -96 -40 Z" fill="#05070e"/>
  <g class="eyes"><ellipse cx="-34" cy="-6" rx="13" ry="9" fill="#f4f1ea"/><ellipse cx="34" cy="-6" rx="13" ry="9" fill="#f4f1ea"/>${glow(-34, -6, 50, 'gGlowW')}${glow(34, -6, 50, 'gGlowW')}</g>
  </g></g>`;

const rule = (n: number, text: string, a: number, b: number) => ({
  t0: a, t1: b,
  html: `<div id="rn${n}">${ruleNote(n, text)}</div>`,
  tweens: (t0: number) => `tl.fromTo('#rn${n}', { opacity: 0, scale: 1.25, rotation: -6, transformOrigin: '400px 300px' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power3.in' }, ${t0});`,
});

// ===== «Ранее» (озвучено отдельным файлом) =====
add(0, recapT[1][0] - 0.1, driver('worry'), { cam: { s: [1.0, 1.1], oy: 700 } });
add(recapT[1][0] - 0.1, recapT[2][0] - 0.1, `<rect width="1080" height="1920" fill="#0b0f1c"/>${[['Мигающий жёлтый', -3], ['Знак «Стоп»', 2], ['Дальний свет за 150 м', -2], ['Машина у перехода', 3], ['На мосту не обгоняй', -2]].map(([t, r], k) => `<g transform="translate(540 ${360 + k * 190}) rotate(${r})"><rect x="-400" y="-70" width="800" height="140" rx="6" fill="${P.paper}"/><text x="-370" y="-18" font-family="Montserrat" font-weight="900" font-size="28" fill="#3a3f55">ПРАВИЛО <tspan fill="#d42f2f">№${k + 1}</tspan></text><text x="-370" y="30" font-family="Montserrat" font-weight="900" font-size="42" fill="#1a1d2c">${t}</text></g>`).join('')}`, { cam: { s: [1.0, 1.06], oy: 800 } });
add(recapT[2][0] - 0.1, OFF, `${dark}${truckOpen(540, 900, 1.2, 'tor')}${carRear(540, 1640, 1.0)}`, { cam: { s: [1.0, 1.1], oy: 900 } });

// ===== Основная часть =====
// 1. Мотор молчит, фура с открытыми дверями.
add(S(1), S(2), `${sky({ seed: 5 })}${forest(760, 6)}<rect x="-100" y="760" width="1280" height="1200" fill="#0a0f1e"/>
  ${[[100, 300, 150], [980, 420, 160], [90, 1300, 150], [990, 1450, 170]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0f1830"/>`).join('')}
  ${truckOpen(540, 1020, 1.25, 'to1')}${carRear(540, 1680, 1.0, { id: 'car1' })}`, {
  cam: { s: [1.0, 1.1], oy: 1000 },
  tweens: (t0, t1) => `tl.fromTo('#to1', { opacity: 0.7 }, { opacity: 1, duration: 0.6, repeat: ${Math.max(1, Math.floor((t1 - t0) / 1.2))}, yoyo: true, ease: 'sine.inOut' }, ${t0});`,
});
// 2. Правило 11: ручник.
add(S(2), S(3), `<rect width="1080" height="1920" fill="#080b14"/><path d="M-50 900 Q540 800 1130 900 L1130 1920 L-50 1920 Z" fill="#11172b"/>
  <rect x="300" y="1100" width="480" height="820" rx="40" fill="#0b0f1d"/>${glow(540, 1250, 420, 'gGlowC', 'opacity="0.25"')}
  <g id="hb2"><g transform="translate(700 1500)"><rect x="-18" y="-330" width="36" height="340" rx="14" fill="#20283f"/><rect x="-30" y="-370" width="60" height="70" rx="22" fill="#141a2e"/></g></g>
  <g transform="translate(400 1450)"><rect x="-22" y="-300" width="44" height="300" rx="16" fill="#1a2138"/><circle cx="0" cy="-330" r="44" fill="#1f2842"/><text x="0" y="-316" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="40" fill="#8ff0ff">P</text></g>
  <g id="hand2"><ellipse cx="700" cy="1170" rx="70" ry="92" fill="${P.skin2}"/><path d="M640 1250 Q600 1500 540 1920 L760 1920 Q760 1500 740 1260 Z" fill="${P.hood2}"/></g>`, {
  cam: { s: [1.0, 1.1], oy: 1300 },
  tweens: (t0) => `tl.fromTo('#hb2', { rotation: 38, svgOrigin: '700 1500' }, { rotation: 0, duration: 0.9, ease: 'power2.out' }, ${t0 + 3.2});tl.fromTo('#hand2', { y: 380 }, { y: 0, duration: 0.9, ease: 'power2.out' }, ${t0 + 3.2});`,
});
// 3. Герой: тишина, шёпот двигателей.
add(S(3), S(4), driver('scared'), { cam: { s: [1.0, 1.1], oy: 700 } });
// 4–5. Зеркало: пустой велосипед.
const mirror = `<rect width="1080" height="1920" fill="#06080f"/><rect x="60" y="560" width="960" height="520" rx="90" fill="#0b0e18"/>
  <svg x="95" y="595" width="890" height="450" viewBox="0 0 890 450"><rect width="890" height="450" fill="#101a35"/><circle cx="700" cy="90" r="40" fill="#e8ebf5" opacity="0.8"/>
    <path d="M0 450 L0 260 Q440 210 890 260 L890 450 Z" fill="#0a0f1e"/><path d="M300 450 L400 250 L500 250 L600 450 Z" fill="#1b2034"/>
    <g id="bike"><g transform="translate(0 330)" opacity="0.8"><circle cx="40" cy="0" r="50" fill="none" stroke="#aeb9d6" stroke-width="7"/><circle cx="190" cy="0" r="50" fill="none" stroke="#aeb9d6" stroke-width="7"/>
      <path d="M40 0 L110 -80 L190 0 M110 -80 L150 -80 M80 -90 L120 -90 M110 -80 L130 0" stroke="#aeb9d6" stroke-width="7" fill="none" stroke-linecap="round"/></g></g></svg>
  <rect x="60" y="560" width="960" height="520" rx="90" fill="none" stroke="#1d2338" stroke-width="30"/><rect x="520" y="300" width="40" height="270" fill="#0b0e18"/>`;
add(S(4), S(5), mirror.replace(/<g id="bike">/, '<g id="bike" opacity="0">'), { cam: { s: [1.0, 1.08], oy: 820 } });
add(S(5), S(6), mirror, {
  cam: { s: [1.0, 1.08], oy: 820 },
  tweens: (t0, t1) => `tl.fromTo('#bike', { x: -300 }, { x: 1100, duration: ${((t1 - t0) * 0.75).toFixed(2)}, ease: 'none' }, ${t0 + 0.6});`,
});
// 6. Идёт к кузову.
add(S(6), S(7), `${sky({ seed: 8 })}${forest(900, 9)}<rect x="-100" y="900" width="1280" height="1100" fill="#0a0f1e"/>
  ${Array.from({ length: 22 }, (_, k) => `<circle cx="${(k * 197) % 1080}" cy="${1000 + ((k * 331) % 900)}" r="${2 + (k % 3)}" fill="#cfe3ff" opacity="0.5"/>`).join('')}
  ${truckOpen(540, 1000, 0.85, 'to6')}<g id="w6">${walker(540, 1180, 0.8, 'w6')}</g>`, {
  cam: { s: [1.0, 1.12], oy: 1000 },
  tweens: (t0, t1) => `tl.fromTo('#w6', { y: 140, scale: 1.15, svgOrigin: '540 1500' }, { y: -40, scale: 0.8, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});
    tl.fromTo('#w6-l', { y: -12 }, { y: 12, duration: 0.45, repeat: ${Math.floor((t1 - t0) / 0.45)}, yoyo: true, ease: 'sine.inOut' }, ${t0});tl.fromTo('#w6-r', { y: 12 }, { y: -12, duration: 0.45, repeat: ${Math.floor((t1 - t0) / 0.45)}, yoyo: true, ease: 'sine.inOut' }, ${t0});`,
});
// 7. Ряды учебных машин, год на каждой, приборы горят.
const rows = Array.from({ length: 12 }, (_, k) => learnerFront(260 + (k % 3) * 280, 560 + Math.floor(k / 3) * 290, 0.95, String(2006 + k * 2), true)).join('');
add(S(7), S(8), `${dark}${glow(540, 900, 900, 'gGlowC', 'opacity="0.22"')}<rect x="130" y="380" width="820" height="1240" rx="16" fill="#04060c"/>${rows}`, {
  cam: { s: [1.0, 1.1], oy: 950 },
});
// 8. Старая машина с красной полосой, тень за рулём.
add(S(8), S(9), `${dark}${glow(540, 900, 800, 'gGlowC', 'opacity="0.2"')}
  <g transform="translate(540 980)"><rect x="-300" y="-260" width="600" height="480" rx="60" fill="#3a4466"/><rect x="-300" y="-30" width="600" height="46" fill="#c02a2a"/>
  <rect x="-250" y="-240" width="500" height="200" rx="34" fill="#0a0e1c"/><rect x="-96" y="-310" width="192" height="40" rx="8" fill="#ffc23d"/><text x="0" y="-278" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="34" fill="#10131f">У</text>
  <rect x="-80" y="130" width="160" height="56" rx="8" fill="#e8dcb8"/><text x="0" y="170" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="38" fill="#2a2d38">2006</text>
  <circle cx="-210" cy="120" r="30" fill="#141a2e"/><circle cx="210" cy="120" r="30" fill="#141a2e"/></g>
  ${shadow(540, 840, 0.55, 'sh8')}`, {
  cam: { s: [1.0, 1.14], oy: 900 },
  tweens: (t0) => `tl.fromTo('#sh8', { opacity: 0 }, { opacity: 1, duration: 1.2 }, ${t0 + 2.2});`,
});
// 9. Тень говорит: «Ты сдал половину…».
add(S(9), S(10), `${dark}${glow(540, 800, 900, 'gGlowC', 'opacity="0.2"')}${shadow(540, 800, 1.5, 'sh9')}`, {
  cam: { s: [1.0, 1.16], oy: 800, ease: 'power1.in' },
  tweens: (t0, t1) => `tl.fromTo('#sh9', { x: -60 }, { x: 0, duration: 0.8, ease: 'power2.out' }, ${t0});tl.fromTo('#sh9 .eyes', { opacity: 1 }, { opacity: 0.2, duration: 0.12, repeat: 3, yoyo: true }, ${t0 + 2.2});`,
});
// 10. Таймер 20:00.
add(S(10), S(11), `${dark}<rect x="140" y="560" width="800" height="360" rx="40" fill="#0b1626"/><rect x="140" y="560" width="800" height="360" rx="40" fill="none" stroke="#1d2b47" stroke-width="8"/>${glow(540, 740, 500, 'gGlowC', 'opacity="0.5"')}
  <text x="540" y="830" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="210" fill="#8ff0ff" letter-spacing="8">20:00</text>
  <text x="540" y="1010" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="56" fill="#9fb0d8">20 ВОПРОСОВ</text>
  <rect x="140" y="1080" width="800" height="26" rx="13" fill="#141c30"/><rect id="bar10" x="140" y="1080" width="800" height="26" rx="13" fill="#35c4ef"/>`, {
  cam: { s: [1.0, 1.1], oy: 800 },
  tweens: (t0, t1) => `tl.fromTo('#bar10', { scaleX: 1, svgOrigin: '140 1093' }, { scaleX: 0.96, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
});
// 11. Правило 13: права.
add(S(11), S(12), `<rect width="1080" height="1920" fill="#080b14"/><path d="M-50 700 Q540 600 1130 700 L1130 1920 L-50 1920 Z" fill="#11172b"/>
  <rect x="150" y="760" width="780" height="620" rx="36" fill="#04060c"/>${glow(540, 860, 520, 'gLamp', 'opacity="0.9"')}
  <g transform="translate(300 1030) rotate(-8)"><rect x="-150" y="-95" width="300" height="190" rx="14" fill="#e8dcb8"/><text x="0" y="-50" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#3a3f55">СТС</text></g>
  <g transform="translate(780 1040) rotate(6)"><rect x="-130" y="-90" width="260" height="180" rx="14" fill="#cfe0f0"/><text x="0" y="-45" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#3a3f55">ПОЛИС</text></g>
  <g id="lic11" transform="translate(540 1070) rotate(-3)"><rect x="-210" y="-135" width="420" height="270" rx="22" fill="#f3e6ef"/><rect x="-210" y="-135" width="420" height="58" rx="22" fill="#d65c8c"/>
    <text x="0" y="-96" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="24" fill="#fff">ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ</text>
    <rect x="-180" y="-50" width="120" height="150" rx="10" fill="#9aa3b8"/><circle cx="-120" cy="0" r="38" fill="${P.skin}"/><path d="M-158 -16 Q-152 -52 -120 -52 Q-88 -52 -82 -16 Q-108 -34 -158 -16 Z" fill="${P.hair}"/><path d="M-178 100 Q-172 36 -120 36 Q-68 36 -62 100 Z" fill="${P.hood}"/>
    <text x="0" y="-10" font-family="Montserrat" font-weight="800" font-size="26" fill="#3a3f55">9. B</text></g>
  <g id="lid11"><rect x="150" y="1380" width="780" height="520" rx="30" fill="#1b2238"/></g>`, {
  cam: { s: [1.0, 1.1], oy: 1000 },
  tweens: (t0) => `tl.fromTo('#lid11', { y: 0 }, { y: 520, duration: 0.7, ease: 'power3.in' }, ${t0 + 0.4});tl.fromTo('#lic11', { y: 80, scale: 0.85, svgOrigin: '540 1070' }, { y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, ${t0 + 3.0});`,
});
// 12. Гаснут стоп-сигналы в кузове.
const dots = Array.from({ length: 12 }, (_, k) => {
  const x = 270 + (k % 3) * 270;
  const y = 600 + Math.floor(k / 3) * 270;
  return `<g id="sl${k}">${glow(x - 70, y + 20, 90, 'gGlowR')}${glow(x + 70, y + 20, 90, 'gGlowR')}</g>` + learnerFront(x, y, 0.9, String(2006 + k * 2), false);
}).join('');
add(S(12), S(13), `${dark}<rect x="130" y="360" width="820" height="1240" rx="16" fill="#04060c"/>${dots}`, {
  cam: { s: [1.0, 1.1], oy: 950 },
  tweens: (t0, t1) => Array.from({ length: 12 }, (_, k) => `tl.set('#sl${k}', { opacity: 0 }, ${(t0 + 2.0 + ((t1 - t0 - 2.4) * k) / 12).toFixed(2)});`).join(''),
});
// 13. Таймер 00:00, вопрос тени.
add(S(13), S(14), `${dark}${glow(540, 820, 900, 'gGlowR', 'opacity="0.25"')}
  <text x="540" y="760" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="230" fill="#ff5a4a" letter-spacing="8">00:00</text>
  ${shadow(540, 1180, 0.8, 'sh13')}
  <text x="540" y="1650" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="150" fill="#f4f1ea" id="q13">?</text>`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0) => `tl.fromTo('#q13', { opacity: 0, scale: 0.4, svgOrigin: '540 1600' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, ${t0 + 2.8});`,
});
// 14. Правило 14: главное правило.
add(S(14), S(15), `<rect width="1080" height="1920" fill="#0d0f17"/>${glow(540, 780, 800, 'gLamp', 'opacity="0.7"')}
  ${noteSheet(540, 860, 880, 960, [{ text: 'Знай и соблюдай' , size: 74 }, { text: 'Правила.', size: 74, color: '#b8231f' }, { text: '' }, { text: 'п. 1.3', size: 90, color: '#2b4fae' }], { id: 'n14', rot: -1.5, head: '2006' })}`, {
  cam: { s: [1.0, 1.14], oy: 820 },
  tweens: (t0) => `tl.fromTo('#n14-l0', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${t0 + 0.8});tl.fromTo('#n14-l1', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${t0 + 2.0});tl.fromTo('#n14-l3', { opacity: 0 }, { opacity: 1, duration: 0.6 }, ${t0 + 4.2});`,
});
// 15. Тень растворяется, кузов наполняется светом.
add(S(15), S(16), `${dark}${glow(540, 900, 1100, 'gGlowW', 'opacity="0.95"')}${shadow(540, 900, 1.0, 'sh15')}<rect id="fl15" width="1080" height="1920" fill="#fff6dc" opacity="0"/>`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0, t1) => `tl.fromTo('#sh15', { opacity: 1 }, { opacity: 0, duration: 2.2, ease: 'power1.in' }, ${t0 + 1.0});tl.fromTo('#fl15', { opacity: 0 }, { opacity: 0.85, duration: ${(t1 - t0 - 1.8).toFixed(2)}, ease: 'power1.in' }, ${t0 + 1.8});`,
});
// 16. Утро у ГИБДД.
add(S(16), S(17), `<rect width="1080" height="1920" fill="#f1c88a"/><rect width="1080" height="900" fill="url(#gSkyLow)" opacity="0.0"/>
  ${windshield(`<rect x="120" y="360" width="840" height="900" fill="#f3c98f"/><rect x="120" y="360" width="840" height="420" fill="#ffe3b0" opacity="0.8"/>
    <rect x="200" y="560" width="680" height="300" fill="#7a86a8"/><rect x="200" y="540" width="680" height="40" fill="#4a5578"/><text x="540" y="730" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="130" fill="#e9eef9">ГИБДД</text>
    ${hero(540, 700, 1.05, 'calm', { light: '#ffcf8a' })}${wheelHands}`)}`, {
  cam: { s: [1.0, 1.08], oy: 700 },
});
// 17. Игра в телефоне.
add(S(17), END, `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(540, 920, 760, 'gGlowY', 'opacity="0.4"')}
  <g id="ph17"><rect x="332" y="440" width="436" height="900" rx="64" fill="#05070c"/><svg x="346" y="454" width="408" height="872" viewBox="0 0 400 820"><rect width="400" height="820" rx="40" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text></svg></g>`, {
  cam: { s: [1.0, 1.05], oy: 900 },
  tweens: (t0) => `tl.fromTo('#ph17', { opacity: 0, y: 160 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, ${t0 + 2.5});`,
});

/* ---------- Наложения, субтитры, часы ---------- */
const overlays = [
  rule(11, 'Вышел из машины — заглуши, затяни ручник, включи передачу', S(2), S(3)),
  rule(12, 'Перед тем как открыть дверь — убедись, что это безопасно', S(4), S(6)),
  rule(13, 'С собой — права, документы на машину и полис', S(11), S(12)),
  rule(14, 'Знай и соблюдай Правила — это главное', S(14), S(16)),
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

export const v44: Video8 = {
  id: '44-noch-doroga-3',
  title: 'Правила ночной дороги. Часть 3',
  part: 3,
  end: END,
  shots,
  subs: [...makeSubs(rw.words, { color: rw.color }), ...makeSubs(mw.words, { color: mw.color })],
  overlays,
  clock: [
    [0, clk(22)], [OFF, clk(23)], [S(3), clk(24)], [S(6), clk(25)], [S(9), clk(26)], [S(11), clk(27)], [S(14), clk(28)], [S(16), '24 ОКТ · 08:00'],
  ],
  shakes: [[S(2) + 3.4, 12, 0.4], [S(9), 14, 0.5], [S(13) + 2.8, 16, 0.5]],
  flashes: [[S(12) + 2.0, 0.3, 0.4, '#ff3030'], [S(15) + 2.5, 0.7, 0.8], [S(16), 0.6, 0.6]],
  plainFrom: S(18),
};
