/**
 * «Дорожные легенды» №1 «Попутчица» — одиночная страшилка на 50 секунд с поворотом в конце и правилом как моралью
 * (п. 2.1.2 ПДД: водитель и пассажиры обязаны быть пристёгнуты). Сценарий — `v46-script.json`, время предложений —
 * `v46-timing.json` (`align44.py --id 46-legenda-1 --script … --timing … --main озвучка.mp3`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { P, makeSubs, type Shot8, type Video8 } from '../engine8.ts';
import { carRear, forestRoad } from './v42-noch-doroga.ts';
import { driver, est, rule, toWords } from './v44-noch-doroga-3.ts';
import { glow, hero, svg } from '../scenery8.ts';

const script = JSON.parse(readFileSync(new URL('./v46-script.json', import.meta.url), 'utf8')) as { main: string[] };
const timingUrl = new URL('./v46-timing.json', import.meta.url);
const timing = existsSync(timingUrl) ? (JSON.parse(readFileSync(timingUrl, 'utf8')) as { off: number; main: [number, number][] }) : null;
const OFF = timing?.off ?? 0.4;
const mainT: [number, number][] = timing ? timing.main.map(([a, b]) => [a + OFF, b + OFF]) : est(script.main, OFF);
const S = (i: number) => mainT[i - 1][0];
const END = mainT[mainT.length - 1][1] + 2.2;

const shots: Shot8[] = [];
const add = (t0: number, t1: number, art: string, rest: Partial<Shot8> = {}) => shots.push({ t0, t1, art: svg(art), ...rest });
const dark = '<rect width="1080" height="1920" fill="#06080f"/>';
const fogBand = (y0: number, a = 0.6) => `<rect x="-300" y="${y0}" width="1700" height="340" fill="url(#gFog)" opacity="${a}"/>`;

/** Девушка в белом платье: стоит, рука поднята (`wave`) или опущена. */
const girl = (x: number, y: number, s: number, o: { id?: string; wave?: boolean } = {}) => `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
  ${glow(0, -200, 420, 'gGlowW', 'opacity="0.35"')}
  <path d="M-70 -330 Q-120 -150 -130 0 L130 0 Q120 -150 70 -330 Z" fill="#eef0f8"/><path d="M-70 -330 Q0 -300 70 -330 L60 -380 L-60 -380 Z" fill="#dfe3f1"/>
  <path d="${o.wave ? 'M70 -350 Q150 -420 170 -520' : 'M70 -350 Q110 -250 100 -170'}" stroke="#e9d5c8" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-70 -350 Q-110 -250 -100 -170" stroke="#e9d5c8" stroke-width="22" fill="none" stroke-linecap="round"/>
  <rect x="-18" y="-400" width="36" height="44" fill="#e9d5c8"/><ellipse cx="0" cy="-450" rx="54" ry="62" fill="#efd9cc"/>
  <path d="M-60 -470 Q-70 -540 0 -548 Q70 -540 60 -470 Q50 -420 66 -300 L40 -300 Q30 -430 0 -440 Q-30 -430 -40 -300 L-66 -300 Q-50 -420 -60 -470 Z" fill="#0d0f18"/>
  <ellipse cx="-20" cy="-450" rx="6" ry="8" fill="#14161f"/><ellipse cx="20" cy="-450" rx="6" ry="8" fill="#14161f"/>
  <ellipse cx="0" cy="8" rx="130" ry="18" fill="#000" opacity="0.5"/></g></g>`;

/** Салонное зеркало: внутри — заднее сиденье, девушка (`girlOn`), ремень висит рядом (`buckled` — застёгнут). */
const mirrorView = (x: number, y: number, w: number, o: { girlOn?: boolean; buckled?: boolean; id?: string; belt?: boolean } = {}) => {
  const h = w * 0.5;
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y})">
    <rect x="${-w / 2 - 22}" y="${-h / 2 - 22}" width="${w + 44}" height="${h + 44}" rx="${h * 0.22}" fill="#0b0e18"/>
    <svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 800 400" overflow="hidden"><rect width="800" height="400" fill="#0d1428"/>
      <rect x="120" y="120" width="560" height="320" rx="40" fill="#1a2138"/><rect x="150" y="60" width="500" height="120" rx="30" fill="#141a2e"/>
      ${o.belt === false ? '' : o.buckled ? '<path d="M590 70 L330 330" stroke="#2c3652" stroke-width="30"/><rect x="316" y="320" width="44" height="34" rx="6" fill="#8ff0ff"/>' : '<path d="M610 70 Q660 200 640 380" stroke="#2c3652" stroke-width="30" fill="none"/><rect x="624" y="368" width="44" height="34" rx="6" fill="#4a5578"/>'}
      ${o.girlOn ? `<g><path d="M260 420 Q250 250 330 200 L470 200 Q550 250 540 420 Z" fill="#eef0f8"/><ellipse cx="400" cy="150" rx="58" ry="68" fill="#efd9cc"/><path d="M340 130 Q340 70 400 66 Q460 70 460 130 Q452 200 470 280 L440 280 Q440 170 400 160 Q360 170 360 280 L330 280 Q348 200 340 130 Z" fill="#0d0f18"/><ellipse cx="380" cy="152" rx="6" ry="9" fill="#14161f"/><ellipse cx="420" cy="152" rx="6" ry="9" fill="#14161f"/></g>` : ''}
    </svg></g></g>`;
};

/** Заиндевевшее стекло: белые иглы по краям. */
const frost = (id: string) => `<g id="${id}" opacity="0">${Array.from({ length: 26 }, (_, k) => {
  const x = (k * 83) % 1080;
  const y = k % 2 ? 380 : 1260;
  return `<path d="M${x} ${y} L${x + 30 - (k % 3) * 30} ${y + (k % 2 ? 120 : -120)} M${x} ${y} L${x + 60} ${y + (k % 2 ? 60 : -60)}" stroke="#dff3ff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
}).join('')}<rect x="120" y="360" width="840" height="900" fill="#cfe9ff" opacity="0.12"/></g>`;

// 1. Зацепка: такси на ночной трассе.
add(S(1), S(2), `${forestRoad({ y: 880, beams: true, moon: true, seed: 3 })}${carRear(540, 1640, 1.05, { id: 'taxi1' })}
  <g transform="translate(540 1380)"><rect x="-70" y="-44" width="140" height="56" rx="12" fill="#ffc23d"/><text x="0" y="-4" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="34" fill="#10131f">ТАКСИ</text></g>${fogBand(760, 0.45)}`, {
  cam: { s: [1.12, 1.0], oy: 1200 },
});
// 2. Девушка в белом платье голосует, таксист останавливается.
add(S(2), S(3), `${forestRoad({ y: 880, beams: true, seed: 5 })}<path d="M20 1920 L470 960 L610 960 L1060 1920 Z" fill="url(#gBeam)"/>
  <g id="gl2">${girl(800, 1160, 0.8, { id: 'g2', wave: true })}</g>${carRear(380, 1700, 1.0)}`, {
  cam: { s: [1.0, 1.1], oy: 1200 },
  tweens: (t0) => `tl.fromTo('#g2', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, ${t0 + 1.2});`,
});
// 3. Садится сзади, называет адрес.
add(S(3), S(4), `${driver('calm')}${mirrorView(540, 380, 560, { girlOn: true, belt: false, id: 'mr3' })}`, {
  cam: { s: [1.0, 1.08], oy: 700 },
  tweens: (t0) => `tl.fromTo('#mr3', { opacity: 0 }, { opacity: 1, duration: 0.8 }, ${t0 + 1.0});`,
});
// 4. Зеркало: ремень лежит рядом, не пристёгнут.
add(S(4), S(5), `${dark}${mirrorView(540, 900, 940, { girlOn: true, id: 'mr4' })}
  <ellipse id="ring4" cx="715" cy="1080" rx="120" ry="150" fill="none" stroke="${P.yellow}" stroke-width="10"/>`, {
  cam: { s: [1.0, 1.12], oy: 900 },
  tweens: (t0) => `tl.fromTo('#ring4', { opacity: 0, scale: 1.8, svgOrigin: '715 1080' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, ${t0 + 3.0});`,
});
// 5. «Пристегнитесь» — «Мне уже незачем».
add(S(5), S(6), `${driver('worry')}${mirrorView(540, 380, 560, { girlOn: true, id: 'mr5' })}`, {
  cam: { s: [1.0, 1.1], oy: 700 },
  tweens: (t0, t1) => `tl.fromTo('#mr5', { y: 0 }, { y: -10, duration: ${(t1 - t0).toFixed(2)}, ease: 'sine.inOut' }, ${t0});`,
});
// 6. Смех гаснет, холод — иней на стекле.
add(S(6), S(7), `${driver('scared')}${frost('fr6')}`, {
  cam: { s: [1.0, 1.1], oy: 700 },
  tweens: (t0, t1) => `tl.fromTo('#fr6', { opacity: 0 }, { opacity: 1, duration: ${(t1 - t0 - 0.4).toFixed(2)}, ease: 'power1.in' }, ${t0});`,
});
// 7. Лесная, три: венок и табличка.
add(S(7), S(8), `${forestRoad({ y: 880, beams: true, seed: 8 })}
  <g transform="translate(760 1380)"><rect x="-8" y="-200" width="16" height="360" fill="#3a2a24"/><rect x="-210" y="-300" width="420" height="190" rx="10" fill="#8a5a3a"/><rect x="-198" y="-288" width="396" height="166" rx="6" fill="none" stroke="#3a2a24" stroke-width="6"/>
    <text x="0" y="-220" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="48" fill="#2a1c16">2009</text><text x="0" y="-160" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="30" fill="#2a1c16">НЕ БЫЛА</text><text x="0" y="-124" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="30" fill="#2a1c16">ПРИСТЁГНУТА</text></g>
  <g transform="translate(330 1480)"><circle r="120" fill="none" stroke="#2f4a2f" stroke-width="34"/>${Array.from({ length: 10 }, (_, k) => `<circle cx="${Math.cos(k * 0.63) * 120}" cy="${Math.sin(k * 0.63) * 120}" r="20" fill="${['#b03030', '#e8e1d0', '#c94060'][k % 3]}"/>`).join('')}</g>${fogBand(780, 0.5)}`, {
  cam: { s: [1.0, 1.1], oy: 1200 },
});
// 8. Сиденье пустое, ремень застёгнут.
add(S(8), S(9), `${dark}${mirrorView(540, 900, 940, { girlOn: false, buckled: true, id: 'mr8' })}${glow(540, 1050, 360, 'gGlowC', 'opacity="0.0"')}`, {
  cam: { s: [1.0, 1.14], oy: 900 },
  tweens: (t0) => `tl.fromTo('#mr8', { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${t0 + 0.4});`,
});
// 9. Правило: п. 2.1.2.
add(S(9), S(10), `${dark}${glow(540, 860, 760, 'gGlowC', 'opacity="0.3"')}
  <g id="bk9"><path d="M300 520 L780 1180" stroke="#2c3652" stroke-width="80" stroke-linecap="round"/><rect x="640" y="1040" width="180" height="140" rx="22" fill="#8ff0ff"/><rect x="690" y="1070" width="80" height="80" rx="12" fill="#06080f"/></g>
  <text x="540" y="1420" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="150" fill="#ffc23d">2.1.2</text>`, {
  cam: { s: [1.0, 1.1], oy: 900 },
  tweens: (t0) => `tl.fromTo('#bk9', { x: -300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, ${t0});`,
});
// 10–11. Игра.
add(S(10), END, `<rect width="1080" height="1920" fill="#0b0f1c"/>${glow(540, 920, 760, 'gGlowY', 'opacity="0.4"')}
  <g id="ph10"><rect x="332" y="440" width="436" height="900" rx="64" fill="#05070c"/><svg x="346" y="454" width="408" height="872" viewBox="0 0 400 820"><rect width="400" height="820" rx="40" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text></svg></g>`, {
  cam: { s: [1.0, 1.05], oy: 900 },
  tweens: (t0) => `tl.fromTo('#ph10', { opacity: 0, y: 160 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, ${t0 + 0.4});`,
});

const overlays = [
  rule(1, 'Пристёгнуты должны быть все — даже на заднем сиденье', S(9), S(10)),
  {
    t0: S(11),
    t1: END,
    html: `<div id="bio" style="position:absolute;left:150px;right:150px;top:240px;height:120px;border-radius:60px;background:${P.yellow};display:flex;align-items:center;justify-content:center;gap:18px;font-weight:900;font-size:50px;color:#10131f;box-shadow:0 0 50px ${P.yellow}88">ССЫЛКА В БИО <span style="font-size:56px">↗</span></div>`,
    tweens: (t0: number) => `tl.fromTo('#bio', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0});tl.to('#bio', { scale: 1.06, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' }, ${t0 + 0.4});`,
  },
];
const mw = toWords(script.main, mainT);

export const v46: Video8 = {
  id: '46-legenda-1',
  title: 'Дорожные легенды №1 — Попутчица',
  tag: 'ЛЕГЕНДА №1',
  end: END,
  shots,
  subs: makeSubs(mw.words, { color: mw.color }),
  overlays,
  clock: [[0, '02 ОКТ · 03:17'], [S(7), '02 ОКТ · 04:02']],
  shakes: [[S(6) + 1.2, 12, 0.5], [S(8) + 1.0, 16, 0.5]],
  flashes: [[S(8) + 1.0, 0.5, 0.5, '#8ff0ff'], [S(4) + 3.0, 0.3, 0.3, '#ffc23d']],
  plainFrom: S(11),
};
