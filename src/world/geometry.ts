/** Простая векторная геометрия в координатах мира (x вправо, y вниз). */

export interface Vec {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
/** z-компонента векторного произведения; при y вниз > 0 означает поворот направо. */
export const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
export const length = (a: Vec): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function normalize(a: Vec): Vec {
  const l = length(a) || 1;
  return { x: a.x / l, y: a.y / l };
}

/** Нормаль вправо от направления движения (при y вниз). */
export const rightNormal = (d: Vec): Vec => ({ x: -d.y, y: d.x });

/** Угол поворота спрайта, смотрящего «вверх» (на север), чтобы он смотрел по направлению d. */
export const headingAngle = (d: Vec): number => Math.atan2(d.x, -d.y);

/** Поворот точки (x, y) на угол a (как у Phaser: по часовой стрелке при y вниз). */
export function rotate(p: Vec, a: number): Vec {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function quadBezier(p0: Vec, c: Vec, p2: Vec, steps: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y });
  }
  return out;
}

export function cubicBezier(p0: Vec, c1: Vec, c2: Vec, p3: Vec, steps: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push({ x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y });
  }
  return out;
}

/** Точка пересечения прямых p + t·d и q + u·e (null, если параллельны). */
export function intersectLines(p: Vec, d: Vec, q: Vec, e: Vec): Vec | null {
  const den = cross(d, e);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(q, p), e) / den;
  return add(p, scale(d, t));
}

/** Ближайшая точка отрезка ab к точке p и параметр t ∈ [0, 1]. */
export function projectOnSegment(p: Vec, a: Vec, b: Vec): { point: Vec; t: number } {
  const ab = sub(b, a);
  const len2 = dot(ab, ab) || 1;
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2));
  return { point: add(a, scale(ab, t)), t };
}

/** Полилиния с накопленной длиной: позиция и направление по пройденному расстоянию. */
export class Polyline {
  readonly points: Vec[];
  readonly cum: number[];
  readonly length: number;

  constructor(points: Vec[]) {
    this.points = points.length ? points : [vec(0, 0)];
    this.cum = [0];
    for (let i = 1; i < this.points.length; i++) this.cum.push(this.cum[i - 1] + distance(this.points[i - 1], this.points[i]));
    this.length = this.cum[this.cum.length - 1];
  }

  private segment(s: number): number {
    let lo = 0;
    let hi = this.points.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= s) lo = mid;
      else hi = mid - 1;
    }
    return Math.max(0, lo);
  }

  pointAt(s: number): Vec {
    if (this.points.length === 1) return this.points[0];
    const clamped = Math.max(0, Math.min(this.length, s));
    const i = this.segment(clamped);
    const segLen = this.cum[i + 1] - this.cum[i] || 1;
    return lerp(this.points[i], this.points[i + 1], (clamped - this.cum[i]) / segLen);
  }

  directionAt(s: number): Vec {
    if (this.points.length === 1) return vec(0, -1);
    const i = this.segment(Math.max(0, Math.min(this.length, s)));
    return normalize(sub(this.points[i + 1], this.points[i]));
  }
}
