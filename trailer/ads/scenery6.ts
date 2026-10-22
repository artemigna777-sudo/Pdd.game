/**
 * Окружение для роликов по формуле cwex (`engine6.ts`): улица, дома с окнами, фонари, дорога и тротуар,
 * ночной город и «живые» фоны для чёрных экранов. Всё тусклее героев и без сильного свечения: фон
 * заполняет кадр, но человечки и текст читаются первыми.
 *
 * Рисунки — тело SVG в координатах 1080×1920. Сцены завязки кладутся в `Shot6.bg` (рисуются пером `BG`,
 * под героями), фоны чёрных экранов — в `Video6.backdrop`.
 */
import type { Pen } from './draw.ts';
import { C } from './engine3.ts';
import { text } from './kit.ts';

/** Перо фона: серо-синие линии, чуть светлее ночи заливки — без свечения. */
export const BG: Pen = { ink: '#4a5770', fill: '#0b111d', accent: C.accent, dark: true };
const F = BG.fill;
const WARM = '#d9a35c';
const COOL = '#7d9cd6';

/** Детерминированный «случайный» генератор: одинаковый кадр при каждой сборке. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Окна фасада: сетка, часть горит тёплым или холодным светом, остальные — только рамка. */
export function windowGrid(x: number, y: number, w: number, h: number, r: () => number, cell = [70, 86], lit = 0.4): string {
  const cols = Math.max(1, Math.floor((w - 24) / cell[0]));
  const rows = Math.max(1, Math.floor((h - 30) / cell[1]));
  const ox = x + (w - cols * cell[0]) / 2;
  const out: string[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const wx = ox + i * cell[0] + 14;
      const wy = y + 26 + j * cell[1];
      const ww = cell[0] - 28;
      const wh = cell[1] - 36;
      if (r() < lit) out.push(`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="${ww}" height="${wh}" fill="${r() < 0.75 ? WARM : COOL}" stroke="none" opacity="${(0.32 + r() * 0.22).toFixed(2)}"/>`);
      else out.push(`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="${ww}" height="${wh}" stroke-width="2" opacity="0.7"/>`);
    }
  return out.join('');
}

/** Ряд домов от x0 до x1 на уровне floor: разная высота, плоские и двускатные крыши, трубы, окна. */
export function houses(x0: number, x1: number, floor: number, seed: number, hMin = 380, hMax = 640, lit = 0.4): string {
  const r = rng(seed);
  const out: string[] = [];
  let x = x0;
  while (x < x1) {
    const w = 190 + r() * 150;
    const h = hMin + r() * (hMax - hMin);
    const top = floor - h;
    if (r() < 0.45) {
      const peak = top - 70 - r() * 50;
      out.push(`<path d="M${x},${floor} V${top} L${x + w / 2},${peak} L${x + w},${top} V${floor} Z" fill="${F}"/>`);
      if (r() < 0.6) out.push(`<path d="M${x + w * 0.72},${top - 12} V${top - 70} h26 V${top - 30}" fill="${F}"/>`);
    } else {
      out.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${F}"/><path d="M${x - 8},${top} H${x + w + 8}"/>`);
      if (r() < 0.4) out.push(`<path d="M${x + w * 0.3},${top} V${top - 60} M${x + w * 0.3 - 16},${top - 44} h32" stroke-width="2"/>`);
    }
    out.push(windowGrid(x, top, w, h - 110, r, [70, 86], lit));
    // Дверь внизу.
    out.push(`<path d="M${x + w / 2 - 30},${floor} V${floor - 90} H${x + w / 2 + 30} V${floor}"/>`);
    x += w + 10 + r() * 30;
  }
  return out.join('\n');
}

/** Дальний город — тонкие силуэты высоток с редкими огнями (ещё тусклее домов). */
export function skyline(x0: number, x1: number, base: number, seed: number, hMin = 300, hMax = 760): string {
  const r = rng(seed);
  const out: string[] = [];
  let x = x0;
  while (x < x1) {
    const w = 90 + r() * 120;
    const h = hMin + r() * (hMax - hMin);
    out.push(`<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#080d17" stroke-width="2" opacity="0.9"/>`);
    for (let k = 0; k < h / 34; k++)
      if (r() < 0.35) out.push(`<rect x="${(x + 10 + r() * (w - 30)).toFixed(0)}" y="${(base - h + 16 + k * 34).toFixed(0)}" width="12" height="9" fill="${r() < 0.7 ? WARM : COOL}" stroke="none" opacity="0.38"/>`);
    if (r() < 0.25) out.push(`<circle cx="${(x + w / 2).toFixed(0)}" cy="${(base - h - 18).toFixed(0)}" r="5" fill="#e0453a" stroke="none" opacity="0.6"/><path d="M${(x + w / 2).toFixed(0)},${(base - h).toFixed(0)} v-14" stroke-width="2"/>`);
    x += w + 6 + r() * 26;
  }
  return out.join('\n');
}

/** Фонарь с мягким кругом света (без фильтров свечения). */
export const lampPost = (x: number, floor: number, f: 1 | -1 = 1) =>
  `<circle cx="${x + 62 * f}" cy="${floor - 440}" r="120" fill="#ffb25a" stroke="none" opacity="0.07"/>
   <circle cx="${x + 62 * f}" cy="${floor - 440}" r="52" fill="#ffb25a" stroke="none" opacity="0.1"/>
   <path d="M${x + 62 * f},${floor - 430} L${x + 150 * f},${floor} H${x - 26 * f} Z" fill="#ffb25a" stroke="none" opacity="0.035"/>
   <path d="M${x},${floor} V${floor - 470} Q${x},${floor - 500} ${x + 34 * f},${floor - 500} H${x + 80 * f}"/>
   <path d="M${x + 44 * f},${floor - 452} h${36 * f} l${-6 * f},16 h${-24 * f} z" fill="#e2a55a" stroke-width="2" opacity="0.8"/>`;

/** Дерево фона. */
export const treeBg = (x: number, floor: number, s = 1) =>
  `<path d="M${x},${floor} V${floor - 150 * s}"/><path d="M${x - 80 * s},${floor - 170 * s} C${x - 120 * s},${floor - 250 * s} ${x - 50 * s},${floor - 330 * s} ${x},${floor - 316 * s} C${x + 60 * s},${floor - 340 * s} ${x + 118 * s},${floor - 266 * s} ${x + 84 * s},${floor - 180 * s} C${x + 66 * s},${floor - 136 * s} ${x - 56 * s},${floor - 130 * s} ${x - 80 * s},${floor - 170 * s} Z" fill="${F}"/>`;

/** Тротуар (плитка), бордюр, дорога с разметкой и дальний газон под линией пола героев. */
export function street(floor: number, x0 = -600, x1 = 1700): string {
  const out: string[] = [];
  const curb = floor + 64;
  const mid = curb + 190;
  const far = curb + 400;
  out.push(`<rect x="${x0}" y="${floor}" width="${x1 - x0}" height="${curb - floor}" fill="#0d1420" stroke="none"/>`);
  for (let x = x0; x < x1; x += 120) out.push(`<path d="M${x},${floor + 6} L${x - 18},${curb}" stroke-width="2" opacity="0.6"/>`);
  out.push(`<path d="M${x0},${curb} H${x1} M${x0},${curb + 14} H${x1}"/>`);
  out.push(`<rect x="${x0}" y="${curb + 14}" width="${x1 - x0}" height="${far - curb - 14}" fill="#070b13" stroke="none"/>`);
  for (let x = x0; x < x1; x += 200) out.push(`<path d="M${x},${mid} h110" stroke="#8a93a6" stroke-width="7" opacity="0.55"/>`);
  out.push(`<path d="M${x0},${far} H${x1}"/>`);
  // Отражения фонарей и окон на мокрой дороге.
  for (let x = x0 + 80; x < x1; x += 260) out.push(`<path d="M${x},${curb + 40} v120" stroke="#d9a35c" stroke-width="10" opacity="0.08"/>`);
  for (let x = x0 + 40; x < x1; x += 70) out.push(`<path d="M${x},${far + 26} l8,-22 l8,22" stroke-width="2" opacity="0.6"/>`);
  return out.join('\n');
}

/** Небо: звёзды и луна (тусклые). */
export function nightSky(seed: number, y0 = 300, y1 = 900, x0 = -200, x1 = 1280): string {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < 46; i++) out.push(`<circle cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(1.5 + r() * 2.2).toFixed(1)}" fill="#b9c4dc" stroke="none" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`);
  return out.join('');
}

/** Вывеска на фасаде: тёмная плашка с подсвеченными буквами. */
export const signboard = (x: number, y: number, w: number, h: number, label: string, size = 40, color = '#c3cad8') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0e1625"/>${text(x + w / 2, y + h / 2 + size * 0.36, size, color, label, 'letter-spacing="3" opacity="0.85"')}`;

// ─── Живые фоны для чёрных экранов (HTML) ────────────────────────────────────

/** Частицы: мелкие точки, медленно плывут вверх и мерцают. Возвращает разметку и анимацию. */
export function particles(id: string, n: number, seed: number, t0: number, t1: number, area = [0, 0, 1080, 1920], color = '#c9d3ea'): { svg: string; tweens: string } {
  const r = rng(seed);
  const svg: string[] = [];
  const tw: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * area[2];
    const y = area[1] + r() * area[3];
    svg.push(`<circle id="${id}${i}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.6 + r() * 3).toFixed(1)}" fill="${color}" stroke="none" opacity="0"/>`);
    const o = 0.15 + r() * 0.35;
    tw.push(`tl.fromTo('#${id}${i}', { opacity: 0, y: 0 }, { opacity: ${o.toFixed(2)}, y: ${(-40 - r() * 90).toFixed(0)}, duration: ${(t1 - t0).toFixed(3)}, ease: 'none' }, ${t0.toFixed(3)});`);
  }
  return { svg: svg.join(''), tweens: tw.join('\n      ') };
}

/** Полноэкранный SVG-слой фона (под текстом). */
export const layer = (id: string, body: string, extra = '') =>
  `<svg id="${id}" viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;left:0;top:0" ${extra}><g fill="none" stroke="${BG.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

/** Ночная трасса в перспективе: края, поребрики, пунктир, уходящие к горизонту. */
export function trackPerspective(horizon: number, bottom = 1920): string {
  const cx = 540;
  const out: string[] = [];
  out.push(`<path d="M${cx - 60},${horizon} L-420,${bottom} H1500 L${cx + 60},${horizon} Z" fill="#070b13" stroke="none"/>`);
  out.push(`<path d="M${cx - 60},${horizon} L-420,${bottom} M${cx + 60},${horizon} L1500,${bottom}"/>`);
  // Поребрики: красно-белые полосы вдоль краёв, сужаются к горизонту.
  for (let i = 0; i < 14; i++) {
    const a = i / 14;
    const b = (i + 1) / 14;
    const y0 = horizon + (bottom - horizon) * a * a;
    const y1 = horizon + (bottom - horizon) * b * b;
    const xl0 = cx - 60 - (cx + 360) * a * a;
    const xl1 = cx - 60 - (cx + 360) * b * b;
    const col = i % 2 ? '#c8463a' : '#c9ced8';
    out.push(`<path d="M${xl0.toFixed(0)},${y0.toFixed(0)} L${xl1.toFixed(0)},${y1.toFixed(0)}" stroke="${col}" stroke-width="${(4 + 26 * b).toFixed(0)}" opacity="0.32"/>`);
    out.push(`<path d="M${(1080 - xl0).toFixed(0)},${y0.toFixed(0)} L${(1080 - xl1).toFixed(0)},${y1.toFixed(0)}" stroke="${col}" stroke-width="${(4 + 26 * b).toFixed(0)}" opacity="0.32"/>`);
    if (i % 2 === 0) out.push(`<path d="M${cx},${y0.toFixed(0)} L${cx},${y1.toFixed(0)}" stroke="#9aa3b5" stroke-width="${(3 + 14 * b).toFixed(0)}" opacity="0.35"/>`);
  }
  return out.join('\n');
}

/** Крупный полупрозрачный восьмиугольник STOP (контур и надпись) — фон расчёта. */
export function ghostStop(cx: number, cy: number, r: number, opacity = 0.1): string {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const inner = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(cx + r * 0.9 * Math.cos(a)).toFixed(1)},${(cy + r * 0.9 * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<g opacity="${opacity}"><polygon points="${pts}" fill="#d81e1e" stroke="none"/><polygon points="${inner}" stroke="#fff" stroke-width="10"/>${text(cx, cy + r * 0.2, r * 0.56, '#fff', 'STOP', 'font-weight="900"')}</g>`;
}
