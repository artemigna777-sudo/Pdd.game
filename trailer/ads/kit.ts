/**
 * Мелочи для сценариев роликов: камера «демо», появление, прорисовка линий, подписи.
 */
import { person, type Pen, type PersonOpts } from './draw.ts';

/** Камера «демо»: точка (fx, fy) мира — в центре кадра, масштаб s. */
export const cam = (fx: number, fy: number, s: number) => JSON.stringify({ x: 540 - fx * s, y: 960 - fy * s, scale: s });
/** Кадр камеры: встать в точку и медленно наезжать до конца отрезка. */
export const shot = (sel: string, t: number, d: number, fx: number, fy: number, s: number, push = 1.04) =>
  `tl.set('${sel}', ${cam(fx, fy, s)}, ${t.toFixed(3)}); tl.to('${sel}', { ...${cam(fx, fy, s * push)}, duration: ${d.toFixed(3)}, ease: 'none' }, ${t.toFixed(3)});`;
/** Атрибуты линии, которая прорисовывается от начала до конца. */
export const DASH = 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"';
export const draw = (sel: string, t: number, d = 0.4, ease = 'power1.inOut') =>
  `tl.to('${sel}', { attr: { 'stroke-dashoffset': 0 }, duration: ${d.toFixed(3)}, ease: '${ease}' }, ${t.toFixed(3)});`;
export const pop = (sel: string, t: number, d = 0.15, from = 0.4) =>
  `tl.fromTo('${sel}', { opacity: 0, scale: ${from}, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: ${d.toFixed(3)}, ease: 'back.out(2)' }, ${t.toFixed(3)});`;
export const fadeIn = (sel: string, t: number, d = 0.2) => `tl.fromTo('${sel}', { opacity: 0 }, { opacity: 1, duration: ${d.toFixed(3)} }, ${t.toFixed(3)});`;
export const fadeOut = (sel: string, t: number, d = 0.2) => `tl.to('${sel}', { opacity: 0, duration: ${d.toFixed(3)} }, ${t.toFixed(3)});`;
export const set = (sel: string, props: Record<string, unknown>, t: number) => `tl.set('${sel}', ${JSON.stringify(props)}, ${t.toFixed(3)});`;
export const to = (sel: string, props: Record<string, unknown>, t: number, d: number, ease = 'power1.inOut') =>
  `tl.to('${sel}', { ...${JSON.stringify(props)}, duration: ${d.toFixed(3)}, ease: '${ease}' }, ${t.toFixed(3)});`;

/** Текст в рисунке (без обводки). */
export const text = (x: number, y: number, size: number, fill: string, body: string, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${fill}" stroke="none" ${extra}>${body}</text>`;

/** Человечек для кадров истории: без id лиц (один рисунок может быть в двух кадрах). */
export const still = (p: Pen, o: Omit<PersonOpts, 'id'>) => person(p, { ...o, id: 'S' }).svg.replace(/id="faceS_/g, 'data-f="').replace(/class="faceS"/g, '');

/** Значок из ICON в точке (x, y) и масштабе s. */
export const at = (glyph: string, x: number, y: number, s = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" ${extra}>${glyph}</g>`;
/** Рисунок в точке (x, y) и масштабе s, внутри — группа с id, которую можно анимировать отдельно. */
export const place = (id: string, x: number, y: number, s: number, inner: string, extra = '') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><g id="${id}" ${extra}>${inner}</g></g>`;
