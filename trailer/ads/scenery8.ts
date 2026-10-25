/**
 * Рисовка роликов-страшилок (`engine8.ts`): плоские векторные формы без контуров, ночная палитра, тёплый
 * и холодный свет пятнами, туман полосами — как в образцах. Всё на 1080×1920; элементы, которые двигаются,
 * получают id (анимации — в сценарии ролика).
 */
import { P } from './engine8.ts';

export const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Общие градиенты и фильтры (одинаковые во всех кадрах, поэтому повтор id безвреден). */
export const DEFS = `<defs>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e1b"/><stop offset="0.6" stop-color="#141b33"/><stop offset="1" stop-color="#1f2947"/></linearGradient>
  <linearGradient id="gSkyLow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f1d"/><stop offset="1" stop-color="#2a3558"/></linearGradient>
  <linearGradient id="gRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2036"/><stop offset="1" stop-color="#2b3250"/></linearGradient>
  <linearGradient id="gBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe9b0" stop-opacity="0.42"/><stop offset="0.7" stop-color="#ffe2a0" stop-opacity="0.08"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></linearGradient>
  <linearGradient id="gFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6a96" stop-opacity="0"/><stop offset="0.5" stop-color="#5a6a96" stop-opacity="0.38"/><stop offset="1" stop-color="#5a6a96" stop-opacity="0"/></linearGradient>
  <radialGradient id="gGlowY"><stop offset="0" stop-color="#ffd25a" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffb52e" stop-opacity="0.35"/><stop offset="1" stop-color="#ffb52e" stop-opacity="0"/></radialGradient>
  <radialGradient id="gGlowR"><stop offset="0" stop-color="#ff5a4a" stop-opacity="0.9"/><stop offset="0.4" stop-color="#ff3a2a" stop-opacity="0.3"/><stop offset="1" stop-color="#ff3a2a" stop-opacity="0"/></radialGradient>
  <radialGradient id="gGlowW"><stop offset="0" stop-color="#fff8e6" stop-opacity="1"/><stop offset="0.3" stop-color="#ffefc4" stop-opacity="0.45"/><stop offset="1" stop-color="#ffefc4" stop-opacity="0"/></radialGradient>
  <radialGradient id="gGlowC"><stop offset="0" stop-color="#7fe0ff" stop-opacity="0.75"/><stop offset="0.4" stop-color="#3fb6ff" stop-opacity="0.22"/><stop offset="1" stop-color="#3fb6ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="gLamp"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ffb04a" stop-opacity="0.16"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient>
  <radialGradient id="gMoon"><stop offset="0" stop-color="#e9ecf7" stop-opacity="0.35"/><stop offset="1" stop-color="#e9ecf7" stop-opacity="0"/></radialGradient>
  <radialGradient id="gShade"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  <filter id="fBlur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="fBlur20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
</defs>`;

export const svg = (body: string, extra = '') =>
  `<svg viewBox="0 0 1080 1920" width="1080" height="1920" overflow="visible" ${extra}>${DEFS}${body}</svg>`;

export const glow = (x: number, y: number, r: number, g = 'gGlowY', extra = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" ${extra}/>`;

/** Ночное небо: градиент, звёзды, луна. */
export function sky(o: { moon?: [number, number]; h?: number; seed?: number; low?: boolean } = {}): string {
  const r = rng(o.seed ?? 7);
  const h = o.h ?? 1920;
  const stars = Array.from({ length: 70 }, () => {
    const x = r() * 1080;
    const y = r() * h * 0.6;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r() * 1.8 + 0.6).toFixed(1)}" fill="#cfd6ef" opacity="${(r() * 0.5 + 0.2).toFixed(2)}"/>`;
  }).join('');
  const m = o.moon
    ? `${glow(o.moon[0], o.moon[1], 220, 'gMoon')}<circle cx="${o.moon[0]}" cy="${o.moon[1]}" r="46" fill="#e8ebf5"/><circle cx="${o.moon[0] + 20}" cy="${o.moon[1] - 12}" r="44" fill="${o.low ? '#121933' : '#0f1428'}"/>`
    : '';
  return `<rect width="1080" height="${h}" fill="url(#${o.low ? 'gSkyLow' : 'gSky'})"/>${stars}${m}`;
}

/** Ель-силуэт: ярусы треугольников. */
export function pine(x: number, base: number, h: number, color: string, w = 0.42): string {
  const tiers = 4;
  let d = '';
  for (let k = 0; k < tiers; k++) {
    const top = base - h + (h * k) / tiers * 0.78;
    const bot = top + h * 0.42;
    const half = h * w * (0.45 + (k / tiers) * 0.55);
    d += `M${x.toFixed(1)} ${top.toFixed(1)} L${(x + half).toFixed(1)} ${bot.toFixed(1)} L${(x - half).toFixed(1)} ${bot.toFixed(1)} Z `;
  }
  return `<path d="${d}" fill="${color}"/><rect x="${x - h * 0.025}" y="${base - h * 0.06}" width="${h * 0.05}" height="${h * 0.08}" fill="${color}"/>`;
}

/** Ряд елей по горизонту. */
export function pines(base: number, h: number, color: string, seed: number, x0 = -60, x1 = 1140, gap = 0.55, ground = true): string {
  const r = rng(seed);
  let out = '';
  for (let x = x0; x < x1; x += h * gap * (0.6 + r() * 0.6)) {
    const hh = h * (0.7 + r() * 0.5);
    out += pine(x, base + r() * h * 0.12, hh, color);
  }
  return `${ground ? `<rect x="-100" y="${base}" width="1280" height="${1920 - base + 200}" fill="${color}"/>` : ''}${out}`;
}

/** Лес в три плана с туманом между ними (горизонт `y`). */
export function forest(y: number, seed = 3, tone = 0): string {
  const c = tone ? ['#1d2848', '#151d36', '#0d1326'] : ['#202a4a', '#161e38', '#0c1124'];
  return `${pines(y - 40, 190, c[0], seed)}
    <rect x="-50" y="${y - 160}" width="1180" height="260" fill="url(#gFog)"/>
    ${pines(y, 300, c[1], seed + 11, -80, 1160, 0.62)}
    <rect x="-50" y="${y - 90}" width="1180" height="200" fill="url(#gFog)" opacity="0.7"/>`;
}

/** Дорога «от водителя»: точка схода (540, y). Возвращает асфальт, края, прерывистую разметку и свет фар. */
export function roadPOV(y: number, o: { beams?: boolean; wide?: number; dashOffset?: number; id?: string } = {}): string {
  const w = o.wide ?? 1;
  const L = 540 - 760 * w;
  const R = 540 + 760 * w;
  const dashes = Array.from({ length: 9 }, (_, k) => {
    const a = Math.pow((k + (o.dashOffset ?? 0)) / 9, 2.2);
    const b = Math.pow((k + 0.5 + (o.dashOffset ?? 0)) / 9, 2.2);
    const ya = y + (1920 - y) * a;
    const yb = y + (1920 - y) * b;
    const wa = 3 + 22 * a;
    const wb = 3 + 22 * b;
    return `<path d="M${540 - wa / 2} ${ya} L${540 + wa / 2} ${ya} L${540 + wb / 2} ${yb} L${540 - wb / 2} ${yb} Z" fill="#c9cbd2" opacity="0.75"/>`;
  }).join('');
  const beam = o.beams
    ? `<path d="M${540 - 520} 1920 L${540 - 40} ${y + 30} L${540 + 60} ${y + 30} L${540 + 620} 1920 Z" fill="url(#gBeam)"/>`
    : '';
  return `<g ${o.id ? `id="${o.id}"` : ''}><path d="M${L} 1920 L536 ${y} L544 ${y} L${R} 1920 Z" fill="url(#gRoad)"/>
    <path d="M${L + 60} 1920 L537 ${y} L538 ${y} L${L + 90} 1920 Z" fill="#8d93a6" opacity="0.5"/>
    <path d="M${R - 60} 1920 L543 ${y} L542 ${y} L${R - 90} 1920 Z" fill="#8d93a6" opacity="0.5"/>
    <g class="dash">${dashes}</g>${beam}</g>`;
}

/** Салон «от водителя»: стойки, зеркало, торпедо, верх руля, телефон-навигатор на держателе. */
export function cockpit(o: { phone?: string; wheel?: boolean; glow?: string; hands?: boolean } = {}): string {
  const ph = o.phone ?? '';
  return `<path d="M0 0 L1080 0 L1080 150 Q540 110 0 150 Z" fill="#06080f"/>
    <path d="M0 150 Q80 140 170 140 L-40 1250 L0 1250 Z" fill="#070a13"/>
    <path d="M1080 150 Q1000 140 910 140 L1120 1250 L1080 1250 Z" fill="#070a13"/>
    <rect x="440" y="150" width="200" height="62" rx="20" fill="#0b0e18"/><rect x="452" y="160" width="176" height="42" rx="14" fill="#1b2340"/>
    <rect x="535" y="110" width="10" height="44" fill="#0b0e18"/>
    <path d="M-20 1270 Q540 1170 1100 1270 L1100 1920 L-20 1920 Z" fill="#0a0d17"/>
    <path d="M-20 1270 Q540 1170 1100 1270" stroke="#1d2440" stroke-width="6" fill="none"/>
    ${o.glow ? `<rect x="150" y="1300" width="230" height="60" rx="12" fill="#0d1a2a"/><text x="265" y="1342" font-family="Montserrat" font-weight="800" font-size="34" fill="${o.glow}" text-anchor="middle">03:03</text>` : ''}
    ${o.wheel !== false ? `<path d="M210 1920 Q230 1430 540 1410 Q850 1430 870 1920" stroke="#05070d" stroke-width="64" fill="none"/>
      <path d="M260 1920 Q290 1470 540 1458 Q790 1470 820 1920" stroke="#11152a" stroke-width="10" fill="none" opacity="0.6"/>` : ''}
    ${o.hands ? `<ellipse cx="265" cy="1520" rx="62" ry="78" fill="${P.skin2}" transform="rotate(-25 265 1520)"/><path d="M200 1560 Q170 1700 130 1920 L250 1920 Q260 1700 300 1580 Z" fill="${P.hood2}"/>
      <ellipse cx="815" cy="1520" rx="62" ry="78" fill="${P.skin2}" transform="rotate(25 815 1520)"/><path d="M880 1560 Q910 1700 950 1920 L830 1920 Q820 1700 780 1580 Z" fill="${P.hood2}"/>` : ''}
    ${ph}`;
}

/** Герой: голова и плечи. `x, y` — центр головы, `s` — масштаб, `face` — выражение. */
export type Face8 = 'calm' | 'worry' | 'scared' | 'shock' | 'focus' | 'side';
export function hero(x: number, y: number, s: number, face: Face8 = 'calm', o: { id?: string; light?: string } = {}): string {
  const eyes: Record<Face8, string> = {
    calm: `<ellipse cx="-38" cy="8" rx="10" ry="12" fill="#14161f"/><ellipse cx="38" cy="8" rx="10" ry="12" fill="#14161f"/>
      <path d="M-58 -26 Q-38 -34 -18 -26" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M18 -26 Q38 -34 58 -26" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M-14 62 Q0 68 14 62" stroke="#8a4e44" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    focus: `<ellipse cx="-38" cy="10" rx="10" ry="9" fill="#14161f"/><ellipse cx="38" cy="10" rx="10" ry="9" fill="#14161f"/>
      <path d="M-60 -18 L-18 -10" stroke="#14161f" stroke-width="8" stroke-linecap="round"/><path d="M18 -10 L60 -18" stroke="#14161f" stroke-width="8" stroke-linecap="round"/>
      <path d="M-16 64 L16 64" stroke="#8a4e44" stroke-width="6" stroke-linecap="round"/>`,
    worry: `<ellipse cx="-38" cy="8" rx="12" ry="14" fill="#14161f"/><ellipse cx="38" cy="8" rx="12" ry="14" fill="#14161f"/><circle cx="-34" cy="3" r="3.5" fill="#fff"/><circle cx="42" cy="3" r="3.5" fill="#fff"/>
      <path d="M-60 -22 Q-40 -34 -18 -38" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M18 -38 Q40 -34 60 -22" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M-14 66 Q0 58 14 66" stroke="#8a4e44" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    scared: `<circle cx="-38" cy="8" r="22" fill="#fff"/><circle cx="38" cy="8" r="22" fill="#fff"/><circle cx="-38" cy="10" r="9" fill="#14161f"/><circle cx="38" cy="10" r="9" fill="#14161f"/>
      <path d="M-62 -30 Q-40 -46 -16 -42" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M16 -42 Q40 -46 62 -30" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="70" rx="13" ry="16" fill="#5a2a2a"/>`,
    shock: `<circle cx="-38" cy="6" r="26" fill="#fff"/><circle cx="38" cy="6" r="26" fill="#fff"/><circle cx="-38" cy="8" r="6" fill="#14161f"/><circle cx="38" cy="8" r="6" fill="#14161f"/>
      <path d="M-64 -38 Q-40 -54 -16 -48" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M16 -48 Q40 -54 64 -38" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="74" rx="17" ry="22" fill="#4a2222"/>`,
    side: `<ellipse cx="30" cy="8" rx="10" ry="12" fill="#14161f"/><ellipse cx="78" cy="8" rx="8" ry="11" fill="#14161f"/>
      <path d="M10 -26 Q30 -34 50 -26" stroke="#14161f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M22 62 Q34 66 46 62" stroke="#8a4e44" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  };
  const light = o.light ? `<ellipse cx="90" cy="30" rx="90" ry="140" fill="${o.light}" opacity="0.22" filter="url(#fBlur20)"/>` : '';
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-250 420 Q-240 200 -110 160 L110 160 Q240 200 250 420 L250 700 L-250 700 Z" fill="${P.hood}"/>
    <path d="M-150 175 Q0 260 150 175 Q120 120 0 118 Q-120 120 -150 175 Z" fill="${P.hood2}"/>
    <path d="M-30 210 L-36 330 M30 210 L36 330" stroke="#c9ccd6" stroke-width="7" stroke-linecap="round"/>
    <rect x="-42" y="95" width="84" height="80" fill="${P.skin2}"/>
    <ellipse cx="-118" cy="10" rx="24" ry="34" fill="${P.skin2}"/><ellipse cx="118" cy="10" rx="24" ry="34" fill="${P.skin2}"/>
    <ellipse cx="0" cy="0" rx="120" ry="135" fill="${P.skin}"/>
    <path d="M-124 -10 Q-136 -128 -40 -150 Q50 -170 110 -120 Q140 -90 126 -12 Q118 -70 70 -84 Q40 -60 -20 -78 Q-80 -92 -100 -40 Q-112 -30 -124 -10 Z" fill="${P.hair}"/>
    <path d="M-90 -88 Q-60 -40 -20 -78" fill="${P.hair}"/>
    ${eyes[face]}
    <ellipse cx="-74" cy="44" rx="18" ry="10" fill="#e9a99a" opacity="0.5"/><ellipse cx="74" cy="44" rx="18" ry="10" fill="#e9a99a" opacity="0.5"/>
    ${light}
  </g></g>`;
}

/** Телефон с экраном (HTML внутри foreignObject не используем — экран рисуется SVG). */
export function phone(x: number, y: number, w: number, screen: string, o: { id?: string; rot?: number } = {}): string {
  const h = w * 2.05;
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) rotate(${o.rot ?? 0})">
    ${glow(0, 0, w * 1.4, 'gGlowC', 'opacity="0.55"')}
    <rect x="${-w / 2 - 14}" y="${-h / 2 - 14}" width="${w + 28}" height="${h + 28}" rx="${w * 0.14}" fill="#05070c"/>
    <svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 400 820" overflow="hidden"><rect width="400" height="820" rx="40" fill="#0b1324"/>${screen}</svg>
    <rect x="${-w * 0.12}" y="${-h / 2 - 2}" width="${w * 0.24}" height="16" rx="8" fill="#05070c"/>
  </g></g>`;
}

/** Экран навигатора: карта с кварталами, маршрут (`path` в координатах 400×820), подпись сверху. */
export function navScreen(o: { route: string; routeId?: string; top: string; topColor?: string; blank?: boolean; extra?: string }): string {
  const r = rng(5);
  let blocks = '';
  for (let k = 0; k < 26; k++) {
    const x = (k % 5) * 86 - 20 + r() * 20;
    const y = Math.floor(k / 5) * 140 + 120 + r() * 20;
    if (o.blank && y < 520) continue;
    blocks += `<rect x="${x}" y="${y}" width="${56 + r() * 20}" height="${96 + r() * 20}" rx="10" fill="#16223d"/>`;
  }
  const blank = o.blank
    ? `<rect x="0" y="100" width="400" height="430" fill="#0a0f1c"/><g opacity="0.55">${Array.from({ length: 14 }, (_, k) => `<path d="M${(k * 61) % 380 + 10} ${140 + ((k * 97) % 360)} l14 26 h-28 z" fill="#14253a"/>`).join('')}</g>
       <text x="200" y="320" font-family="Montserrat" font-weight="900" font-size="120" fill="#1e2b48" text-anchor="middle">?</text>`
    : '';
  return `<rect width="400" height="820" fill="#0d1628"/>${blocks}${blank}
    <path d="${o.route}" ${o.routeId ? `id="${o.routeId}"` : ''} stroke="${P.cyan}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="200" cy="700" r="20" fill="#fff"/><path d="M200 680 L214 712 L200 704 L186 712 Z" fill="${P.cyan}"/>
    <rect x="16" y="22" width="368" height="84" rx="18" fill="#142542"/>
    <text x="200" y="76" font-family="Montserrat" font-weight="800" font-size="30" fill="${o.topColor ?? '#e9eef9'}" text-anchor="middle">${o.top}</text>
    ${o.extra ?? ''}`;
}

/** Старая табличка на двух столбах (как дорожный указатель, но не из ПДД). */
export function oldSign(x: number, y: number, s: number, lines: string[], o: { id?: string; extra?: string } = {}): string {
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-150" y="0" width="22" height="520" fill="#1b2034"/><rect x="128" y="0" width="22" height="520" fill="#1b2034"/>
    <rect x="-230" y="-40" width="460" height="230" rx="10" fill="#d8d3c2"/>
    <rect x="-218" y="-28" width="436" height="206" rx="6" fill="none" stroke="#2a2d38" stroke-width="6"/>
    ${lines.map((l, i) => `<text x="0" y="${50 + i * 62}" font-family="Montserrat" font-weight="900" font-size="46" fill="#22252f" text-anchor="middle">${l}</text>`).join('')}
    <path d="M-230 120 Q-180 130 -150 190 L-230 190 Z" fill="#7a4a2a" opacity="0.55"/><path d="M180 -40 Q200 10 230 0 L230 -40 Z" fill="#7a4a2a" opacity="0.5"/>
    <circle cx="-160" cy="60" r="6" fill="#5a3a24" opacity="0.6"/><circle cx="170" cy="140" r="9" fill="#5a3a24" opacity="0.5"/>
    ${o.extra ?? ''}
  </g></g>`;
}

/** Светофор, подвешенный над дорогой: `lit` — какая секция горит (id `<id>-y` у жёлтой — для мигания). */
export function trafficLight(x: number, y: number, s: number, id: string, lit: 'y' | 'none' = 'y'): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-700 -300 Q0 -230 700 -300" stroke="#0b0e1a" stroke-width="8" fill="none"/>
    <rect x="-4" y="-262" width="8" height="70" fill="#0b0e1a"/>
    <rect x="-70" y="-200" width="140" height="380" rx="22" fill="#141827"/>
    <circle cx="0" cy="-120" r="44" fill="#2a1414"/><circle cx="0" cy="-10" r="44" fill="#2a2412"/><circle cx="0" cy="100" r="44" fill="#122a1a"/>
    <path d="M-60 -170 Q0 -190 60 -170" stroke="#0c0f1b" stroke-width="16" fill="none"/>
    ${lit === 'y' ? `<g id="${id}-y">${glow(0, -10, 260, 'gGlowY')}<circle cx="0" cy="-10" r="44" fill="#ffd04a"/><circle cx="-12" cy="-22" r="14" fill="#fff2c2" opacity="0.8"/></g>` : ''}
  </g>`;
}

/** Знак «Стоп» (2.5) на столбе. */
export function stopSign(x: number, y: number, r: number, o: { id?: string; glow?: boolean; post?: number } = {}): string {
  const pts = Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 8) * (2 * k + 1);
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  const pts2 = Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 8) * (2 * k + 1);
    return `${(Math.cos(a) * r * 0.9).toFixed(1)},${(Math.sin(a) * r * 0.9).toFixed(1)}`;
  }).join(' ');
  return `<g transform="translate(${x} ${y})"><rect x="${-r * 0.07}" y="0" width="${r * 0.14}" height="${o.post ?? r * 4}" fill="#1a1f30"/>
    <g ${o.id ? `id="${o.id}"` : ''}>
    ${o.glow ? glow(0, 0, r * 2.6, 'gGlowR') : ''}
    <polygon points="${pts}" fill="#f4f1ea"/><polygon points="${pts2}" fill="#d92b2b"/>
    <text x="0" y="${r * 0.2}" font-family="Montserrat" font-weight="900" font-size="${r * 0.52}" fill="#fff" text-anchor="middle">STOP</text></g></g>`;
}

/** Машина сверху (нос вверх): `body`, `glass`; `lights` — фары. */
export function carTop(x: number, y: number, rot: number, body: string, o: { id?: string; lights?: boolean; tail?: boolean; s?: number; ghost?: boolean } = {}): string {
  const s = o.s ?? 1;
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    ${o.lights ? `<path d="M-50 -110 L-170 -560 L170 -560 L50 -110 Z" fill="url(#gBeam)" transform="rotate(180 0 -110) scale(1 -1) translate(0 220)"/>` : ''}
    <rect x="-62" y="-120" width="124" height="240" rx="34" fill="#05070d" opacity="0.4" transform="translate(8 10)"/>
    <rect x="-62" y="-120" width="124" height="240" rx="34" fill="${body}"/>
    <path d="M-48 -62 Q0 -84 48 -62 L42 -22 L-42 -22 Z" fill="${o.ghost ? '#0a0c14' : '#1b2440'}"/>
    <path d="M-44 50 L44 50 L48 82 Q0 96 -48 82 Z" fill="${o.ghost ? '#0a0c14' : '#1b2440'}"/>
    <rect x="-44" y="-18" width="88" height="66" rx="10" fill="${body}" opacity="0.85"/>
    ${o.lights ? `<rect x="-52" y="-122" width="28" height="12" rx="5" fill="#fff6d8"/><rect x="24" y="-122" width="28" height="12" rx="5" fill="#fff6d8"/>` : `<rect x="-52" y="-120" width="28" height="10" rx="5" fill="#2a2f40"/><rect x="24" y="-120" width="28" height="10" rx="5" fill="#2a2f40"/>`}
    ${o.tail ? `${glow(-38, 120, 70, 'gGlowR')}${glow(38, 120, 70, 'gGlowR')}<rect x="-54" y="112" width="30" height="10" rx="4" fill="#ff5a4a"/><rect x="24" y="112" width="30" height="10" rx="4" fill="#ff5a4a"/>` : ''}
  </g></g>`;
}

/** Перекрёсток сверху: две дороги по 300, без знаков. */
export function crossTop(cx: number, cy: number, o: { zebra?: boolean } = {}): string {
  const dash = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#b9bccb" stroke-width="8" stroke-dasharray="40 40" opacity="0.6"/>`;
  return `<rect width="1080" height="1920" fill="#101628"/>
    <rect x="${cx - 150}" y="-100" width="300" height="2120" fill="#232a44"/><rect x="-100" y="${cy - 150}" width="1280" height="300" fill="#232a44"/>
    ${dash(cx, -100, cx, cy - 170)}${dash(cx, cy + 170, cx, 2020)}${dash(-100, cy, cx - 170, cy)}${dash(cx + 170, cy, 1180, cy)}
    <rect x="${cx - 150}" y="${cy - 150}" width="300" height="300" fill="#262e4a"/>
    ${o.zebra ? Array.from({ length: 6 }, (_, k) => `<rect x="${cx - 140 + k * 50}" y="${cy + 170}" width="30" height="110" fill="#c9ccd8" opacity="0.8"/>`).join('') : ''}`;
}

/** Ели сверху (кроны кругами), чтобы перекрёсток был в лесу. */
export function treesTop(seed: number, avoid: (x: number, y: number) => boolean, n = 70): string {
  const r = rng(seed);
  let out = '';
  for (let k = 0; k < n * 3 && out.length < n * 260; k++) {
    const x = r() * 1180 - 50;
    const y = r() * 2020 - 50;
    if (avoid(x, y)) continue;
    const rr = 40 + r() * 50;
    out += `<circle cx="${x + 10}" cy="${y + 14}" r="${rr}" fill="#070a14" opacity="0.6"/><circle cx="${x}" cy="${y}" r="${rr}" fill="${r() > 0.5 ? '#16203a' : '#1a2644'}"/><circle cx="${x - rr * 0.25}" cy="${y - rr * 0.25}" r="${rr * 0.55}" fill="#22305a" opacity="0.6"/>`;
  }
  return out;
}

/** Лесовоз сбоку (едет вправо): кабина, прицеп с брёвнами. */
export function logTruck(x: number, y: number, s: number, id: string): string {
  const logs = Array.from({ length: 9 }, (_, k) => {
    const col = k % 3;
    const row = Math.floor(k / 3);
    const lx = -680 + row * 0 + col * 0;
    return `<rect x="${lx}" y="${-250 + row * 62 + (col % 2) * 4}" width="560" height="58" rx="29" fill="${['#6b4a30', '#5a3d27', '#7a5638'][col]}"/><circle cx="${lx + 532}" cy="${-221 + row * 62}" r="26" fill="#c79a66"/><circle cx="${lx + 532}" cy="${-221 + row * 62}" r="12" fill="#a87a4a"/>`;
  }).join('');
  return `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">
    ${logs}
    <rect x="-700" y="-70" width="640" height="40" fill="#10131f"/>
    <rect x="-680" y="-280" width="16" height="230" fill="#141826"/><rect x="-140" y="-280" width="16" height="230" fill="#141826"/>
    <path d="M-40 -60 L-40 -330 Q-40 -360 -10 -360 L150 -360 Q200 -360 220 -300 L260 -170 L260 -60 Z" fill="#2c3a5e"/>
    <path d="M0 -330 L140 -330 Q170 -330 182 -296 L210 -200 L0 -200 Z" fill="#8fb4d8" opacity="0.35"/>
    <rect x="250" y="-150" width="30" height="40" rx="6" fill="#fff6d8"/>${glow(300, -130, 220, 'gGlowW')}
    <circle cx="-600" cy="-30" r="54" fill="#07090f"/><circle cx="-480" cy="-30" r="54" fill="#07090f"/><circle cx="-180" cy="-30" r="54" fill="#07090f"/><circle cx="160" cy="-30" r="54" fill="#07090f"/>
    <circle cx="-600" cy="-30" r="20" fill="#2a2f40"/><circle cx="-480" cy="-30" r="20" fill="#2a2f40"/><circle cx="-180" cy="-30" r="20" fill="#2a2f40"/><circle cx="160" cy="-30" r="20" fill="#2a2f40"/>
  </g></g>`;
}

/** Спидометр: дуга и стрелка (id стрелки — для анимации). */
export function speedo(x: number, y: number, r: number, id: string, val: number): string {
  const ang = (v: number) => -220 + (v / 140) * 260;
  const ticks = Array.from({ length: 15 }, (_, k) => {
    const a = (ang(k * 10) * Math.PI) / 180;
    return `<path d="M${Math.cos(a) * r * 0.82} ${Math.sin(a) * r * 0.82} L${Math.cos(a) * r * 0.95} ${Math.sin(a) * r * 0.95}" stroke="#cfd6ef" stroke-width="${k % 2 ? 4 : 8}"/>`;
  }).join('');
  const nums = [0, 20, 40, 60, 80, 100, 120, 140]
    .map((v) => {
      const a = (ang(v) * Math.PI) / 180;
      return `<text x="${Math.cos(a) * r * 0.66}" y="${Math.sin(a) * r * 0.66 + 12}" font-family="Montserrat" font-weight="800" font-size="${r * 0.13}" fill="#9fb0d8" text-anchor="middle">${v}</text>`;
    })
    .join('');
  return `<g transform="translate(${x} ${y})">${glow(0, 0, r * 1.5, 'gGlowC', 'opacity="0.4"')}<circle r="${r}" fill="#0a1020"/><circle r="${r}" fill="none" stroke="#2a3a66" stroke-width="10"/>${ticks}${nums}
    <g id="${id}"><g transform="rotate(${ang(val) + 90})"><path d="M-8 0 L0 ${-r * 0.86} L8 0 Z" fill="#ff5a3a"/></g><circle r="${r * 0.1}" fill="#1c2540"/></g></g>`;
}

/** Бледный человек без тени (силуэт со слабым свечением). */
export function ghostPerson(x: number, y: number, s: number, o: { id?: string; face?: boolean } = {}): string {
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-150" rx="90" ry="200" fill="#b9c8ef" opacity="0.08"/>
    <path d="M-40 -150 Q-48 -60 -34 0 L-12 0 L-6 -120 L6 -120 L12 0 L34 0 Q48 -60 40 -150 Q0 -175 -40 -150 Z" fill="#c9d3ec"/>
    <path d="M-46 -150 Q-50 -250 0 -262 Q50 -250 46 -150 Z" fill="#aab6d6"/>
    <circle cx="0" cy="-292" r="34" fill="#dfe5f5"/>
    ${o.face ? '<ellipse cx="-11" cy="-292" rx="5" ry="7" fill="#1a1f30"/><ellipse cx="11" cy="-292" rx="5" ry="7" fill="#1a1f30"/>' : ''}
  </g></g>`;
}

/** Бумажный листок с текстом от руки (строки появляются по очереди — id `<id>-l<n>`). */
export function noteSheet(x: number, y: number, w: number, h: number, lines: { text: string; color?: string; size?: number }[], o: { id?: string; rot?: number; head?: string } = {}): string {
  const id = o.id ?? 'nt';
  return `<g id="${id}"><g transform="translate(${x} ${y}) rotate(${o.rot ?? -2})">
    <rect x="${-w / 2 + 14}" y="${-h / 2 + 22}" width="${w}" height="${h}" fill="#000" opacity="0.4" filter="url(#fBlur6)"/>
    <path d="M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} L${w / 2} ${h / 2 - 30} L${w / 2 - 40} ${h / 2} L${-w / 2} ${h / 2} Z" fill="${P.paper}"/>
    <path d="M${w / 2} ${h / 2 - 30} L${w / 2 - 40} ${h / 2} L${w / 2 - 34} ${h / 2 - 36} Z" fill="${P.paper2}"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#b89a5a" opacity="0.12"/>
    <circle cx="${w * 0.3}" cy="${-h * 0.32}" r="${w * 0.1}" fill="#a07a3a" opacity="0.13"/><circle cx="${-w * 0.28}" cy="${h * 0.3}" r="${w * 0.07}" fill="#a07a3a" opacity="0.1"/>
    ${Array.from({ length: Math.floor(h / 64) }, (_, k) => `<path d="M${-w / 2 + 30} ${-h / 2 + 90 + k * 64} L${w / 2 - 30} ${-h / 2 + 90 + k * 64}" stroke="#9fb3d1" stroke-width="2" opacity="0.5"/>`).join('')}
    ${o.head ? `<text x="${w / 2 - 40}" y="${-h / 2 + 60}" font-family="Caveat" font-weight="700" font-size="40" fill="#6a5a4a" text-anchor="end">${o.head}</text>` : ''}
    ${lines
      .map(
        (l, i) =>
          `<text id="${id}-l${i}" x="${-w / 2 + 40}" y="${-h / 2 + 140 + i * 64}" font-family="Caveat" font-weight="700" font-size="${l.size ?? 56}" fill="${l.color ?? P.pen}">${l.text}</text>`,
      )
      .join('')}
  </g></g>`;
}

/** Мост «от водителя»: перила сходятся к точке схода, внизу река. */
export function bridgePOV(y: number, o: { lampsId?: string } = {}): string {
  const posts = Array.from({ length: 12 }, (_, k) => {
    const a = Math.pow(k / 12, 2);
    const yy = y + (1920 - y) * a;
    const dx = 30 + 820 * a;
    const hh = 10 + 300 * a;
    return `<rect x="${540 - dx - 6 * a - 2}" y="${yy - hh}" width="${4 + 18 * a}" height="${hh}" fill="#0b0f1d"/><rect x="${540 + dx - 2}" y="${yy - hh}" width="${4 + 18 * a}" height="${hh}" fill="#0b0f1d"/>`;
  }).join('');
  return `<path d="M-300 1920 L530 ${y} L550 ${y} L1380 1920 Z" fill="url(#gRoad)"/>
    <path d="M-300 ${1920 - 300} L530 ${y - 10} M1380 ${1920 - 300} L550 ${y - 10}" stroke="#0b0f1d" stroke-width="14"/>
    <path d="M-300 ${1920 - 300 + 40} L530 ${y - 6} M1380 ${1920 - 300 + 40} L550 ${y - 6}" stroke="#0b0f1d" stroke-width="8"/>
    ${posts}`;
}

/** Фура сзади (на дороге «от водителя»). */
export function truckRear(x: number, y: number, s: number, o: { id?: string; empty?: boolean } = {}): string {
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-200" y="-420" width="400" height="430" rx="8" fill="#3a4466"/>
    <rect x="-186" y="-406" width="186" height="400" fill="#323b5a"/><rect x="0" y="-406" width="186" height="400" fill="#2e3756"/>
    <rect x="-8" y="-406" width="16" height="400" fill="#1d2440"/>
    <rect x="-20" y="-260" width="10" height="90" rx="4" fill="#141a30"/><rect x="10" y="-260" width="10" height="90" rx="4" fill="#141a30"/>
    <rect x="-200" y="10" width="400" height="34" fill="#141826"/>
    <rect x="-150" y="44" width="300" height="30" fill="#0b0e18"/>
    ${glow(-170, 26, 120, 'gGlowR')}${glow(170, 26, 120, 'gGlowR')}
    <rect x="-196" y="16" width="52" height="22" rx="4" fill="#ff5a4a"/><rect x="144" y="16" width="52" height="22" rx="4" fill="#ff5a4a"/>
    <rect x="-60" y="18" width="120" height="30" rx="4" fill="#d8d3c2"/><text x="0" y="42" font-family="Montserrat" font-weight="900" font-size="22" fill="#22252f" text-anchor="middle">${o.empty ? '0 0 0' : 'А 666'}</text>
  </g></g>`;
}

/** Объявление «Пропал» (для деревьев и бардачка). */
export function missing(x: number, y: number, s: number, rot: number, name: string, date: string, o: { id?: string; face?: string } = {}): string {
  return `<g ${o.id ? `id="${o.id}"` : ''}><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <rect x="-150" y="-200" width="300" height="400" fill="#e6e1d2"/>
    <rect x="-150" y="-200" width="300" height="400" fill="#b29a6a" opacity="0.15"/>
    <text x="0" y="-140" font-family="Montserrat" font-weight="900" font-size="54" fill="#c22a2a" text-anchor="middle">ПРОПАЛ</text>
    <rect x="-90" y="-112" width="180" height="170" fill="#9aa3b8"/>
    ${o.face ?? `<circle cx="0" cy="-40" r="46" fill="#6f7891"/><path d="M-80 58 Q-70 0 0 2 Q70 0 80 58 Z" fill="#6f7891"/>`}
    <text x="0" y="104" font-family="Montserrat" font-weight="800" font-size="30" fill="#2a2d38" text-anchor="middle">${name}</text>
    <text x="0" y="146" font-family="Montserrat" font-weight="700" font-size="24" fill="#5a5d68" text-anchor="middle">${date}</text>
    <rect x="-40" y="-214" width="80" height="30" fill="rgba(230,214,170,0.8)" transform="rotate(-6)"/>
  </g></g>`;
}
