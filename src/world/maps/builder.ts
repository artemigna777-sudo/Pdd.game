import type { CityMap, MapNode, MapRoad } from '../map.ts';

/** Буквы столбцов сетки: A0, B0, … — узлы, AB0 — дорога. */
const COLS = 'ABCDEFGH';

export interface GridSpec {
  cols: number;
  rows: number;
  /** Расстояние между соседними перекрёстками. */
  spacing: number;
  x0?: number;
  y0?: number;
  /** Узлы-кольца, например ["C1"]. */
  rings?: string[];
  /** Дороги, которых нет (для разнообразия кварталов), например ["B1C1"]. */
  skip?: string[];
}

export const nodeId = (col: number, row: number) => `${COLS[col]}${row}`;

/** Сетка кварталов: узлы в строках и столбцах, дороги между соседями. */
export function grid(spec: GridSpec): { nodes: MapNode[]; roads: MapRoad[] } {
  const { cols, rows, spacing, x0 = 0, y0 = 0 } = spec;
  const rings = new Set(spec.rings ?? []);
  const skip = new Set(spec.skip ?? []);
  const nodes: MapNode[] = [];
  const roads: MapRoad[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = nodeId(c, r);
      nodes.push({ id, x: x0 + c * spacing, y: y0 + r * spacing, ...(rings.has(id) ? { kind: 'roundabout' as const } : {}) });
      if (c > 0) {
        const road = { id: `${nodeId(c - 1, r)}${id}`, from: nodeId(c - 1, r), to: id };
        if (!skip.has(road.id)) roads.push(road);
      }
      if (r > 0) {
        const road = { id: `${nodeId(c, r - 1)}${id}`, from: nodeId(c, r - 1), to: id };
        if (!skip.has(road.id)) roads.push(road);
      }
    }
  }
  return { nodes, roads };
}

/** Карта района: рамка — по крайним узлам с запасом для домов и полей. */
export function district(map: Omit<CityMap, 'bounds'> & { margin?: number }): CityMap {
  const margin = map.margin ?? 320;
  const xs = map.nodes.map((n) => n.x);
  const ys = map.nodes.map((n) => n.y);
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  const { margin: _margin, ...rest } = map;
  return {
    ...rest,
    bounds: { x, y, width: Math.max(...xs) + margin - x, height: Math.max(...ys) + margin - y },
  };
}
