/**
 * Статичная часть района: земля, дороги, разметка, дома и деревья.
 *
 * Карта рисуется векторно и разбита на куски 512×512. Каждый кусок «запекается» в текстуру
 * в разрешении экрана, когда оказывается рядом с камерой: на кадр выводится несколько
 * картинок вместо тысяч фигур, и недорогие телефоны не тормозят. Далёкие куски
 * выгружаются из памяти. Для обзора всего района — одна уменьшенная картинка.
 *
 * Слои внутри куска идут строго снизу вверх: земля → тротуары → асфальт → разметка → дома.
 */
import * as Phaser from 'phaser';
import { PIXEL_RATIO } from '../display.ts';
import type { CityMap, MapPoint, MapRoad } from '../../world/map.ts';
import { DEAD_END_RADIUS, LANE_WIDTH, MEDIAN_WIDTH, RING_INNER, RING_OUTER, RoadGraph, laneOffset, roadHalfWidth } from '../../world/roadGraph.ts';
import { COLORS, ROOF_COLORS, drawBuilding, drawTree, seeded } from './art.ts';

const CHUNK = 512;
/** Запас вокруг видимой области, в котором куски готовятся заранее. */
const BAKE_MARGIN = 160;
/** Куски дальше этого запаса выгружаются. */
const EVICT_MARGIN = 640;
const OVERVIEW_SCALE = 0.4;
export const SIDEWALK = 12;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Painter = (g: Phaser.GameObjects.Graphics) => void;

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Один слой карты, разбитый на куски. Графика не выводится сама — только через запекание. */
class ChunkLayer {
  readonly chunks: Array<{ g: Phaser.GameObjects.Graphics; rect: Rect }> = [];

  constructor(scene: Phaser.Scene, bounds: Rect) {
    for (let y = bounds.y; y < bounds.y + bounds.h; y += CHUNK) {
      for (let x = bounds.x; x < bounds.x + bounds.w; x += CHUNK) {
        this.chunks.push({ g: scene.make.graphics({}, false), rect: { x, y, w: CHUNK, h: CHUNK } });
      }
    }
  }

  /** Нарисовать фигуру во всех кусках, которые задевает её рамка. */
  draw(box: Rect, paint: Painter) {
    for (const c of this.chunks) if (overlaps(box, c.rect)) paint(c.g);
  }
}

interface Baked {
  rect: Rect;
  rt?: Phaser.GameObjects.RenderTexture;
}

export class MapRenderer {
  private readonly base: ChunkLayer;
  private readonly walks: ChunkLayer;
  private readonly ground: ChunkLayer;
  private readonly marks: ChunkLayer;
  private readonly decor: ChunkLayer;
  private readonly map: CityMap;
  private readonly graph: RoadGraph;
  private readonly scene: Phaser.Scene;
  private readonly baked: Baked[];
  private overviewRt?: Phaser.GameObjects.RenderTexture;
  /** Прямоугольники дорог с тротуарами — сюда не ставим дома и деревья. */
  private readonly occupied: Rect[] = [];

  constructor(
    scene: Phaser.Scene,
    graph: RoadGraph,
    private readonly points: MapPoint[],
  ) {
    this.scene = scene;
    this.graph = graph;
    this.map = graph.map;
    const b = this.map.bounds;
    const bounds = { x: b.x, y: b.y, w: b.width, h: b.height };
    this.base = new ChunkLayer(scene, bounds);
    this.walks = new ChunkLayer(scene, bounds);
    this.ground = new ChunkLayer(scene, bounds);
    this.marks = new ChunkLayer(scene, bounds);
    this.decor = new ChunkLayer(scene, bounds);
    this.baked = this.base.chunks.map((c) => ({ rect: c.rect }));

    this.drawGround(bounds);
    this.drawRailway(bounds);
    for (const road of this.map.roads) this.drawRoad(road);
    for (const node of this.map.nodes) this.drawNode(node.id);
    for (const road of this.map.roads) this.drawMarkings(road);
    this.drawPointFeatures(scene);
    this.drawBlocks(bounds);
  }

  private get layers(): ChunkLayer[] {
    return [this.base, this.walks, this.ground, this.marks, this.decor];
  }

  /**
   * Подготовить куски вокруг видимой области и выгрузить далёкие. В обзоре показывается
   * одна уменьшенная картинка района. За кадр запекается не больше двух кусков.
   */
  update(view: Rect, overview: boolean) {
    if (overview) {
      this.showOverview(true);
      return;
    }
    this.showOverview(false);
    const near = { x: view.x - BAKE_MARGIN, y: view.y - BAKE_MARGIN, w: view.w + BAKE_MARGIN * 2, h: view.h + BAKE_MARGIN * 2 };
    const keep = { x: view.x - EVICT_MARGIN, y: view.y - EVICT_MARGIN, w: view.w + EVICT_MARGIN * 2, h: view.h + EVICT_MARGIN * 2 };
    let budget = 2;
    // Сначала куски, которые видны прямо сейчас.
    const order = [...this.baked.keys()].sort((a, b) => Number(overlaps(view, this.baked[b].rect)) - Number(overlaps(view, this.baked[a].rect)));
    for (const i of order) {
      const chunk = this.baked[i];
      if (overlaps(near, chunk.rect)) {
        if (!chunk.rt && (budget-- > 0 || overlaps(view, chunk.rect))) chunk.rt = this.bake(i);
        chunk.rt?.setVisible(true);
      } else if (chunk.rt) {
        chunk.rt.setVisible(false);
        if (!overlaps(keep, chunk.rect)) {
          chunk.rt.destroy();
          chunk.rt = undefined;
        }
      }
    }
  }

  /** Отрисовать все слои куска в текстуру в разрешении экрана. */
  private bake(index: number): Phaser.GameObjects.RenderTexture {
    const { rect } = this.baked[index];
    const res = PIXEL_RATIO;
    const rt = this.scene.add.renderTexture(rect.x, rect.y, rect.w * res, rect.h * res).setOrigin(0).setScale(1 / res).setDepth(0);
    for (const layer of this.layers) {
      const g = layer.chunks[index].g;
      g.setScale(res);
      rt.draw(g, -rect.x * res, -rect.y * res);
      g.setScale(1);
    }
    return rt;
  }

  private showOverview(on: boolean) {
    if (on && !this.overviewRt) {
      const b = this.map.bounds;
      const k = OVERVIEW_SCALE;
      const rt = this.scene.add.renderTexture(b.x, b.y, Math.ceil(b.width * k), Math.ceil(b.height * k)).setOrigin(0).setScale(1 / k).setDepth(0);
      for (const layer of this.layers) {
        for (const c of layer.chunks) {
          c.g.setScale(k);
          rt.draw(c.g, -b.x * k, -b.y * k);
          c.g.setScale(1);
        }
      }
      this.overviewRt = rt;
    }
    this.overviewRt?.setVisible(on);
    if (on) for (const chunk of this.baked) chunk.rt?.setVisible(false);
  }

  private roadRect(road: MapRoad, extra: number): Rect {
    const a = this.graph.node(road.from);
    const b = this.graph.node(road.to);
    const hw = roadHalfWidth(road) + extra;
    return {
      x: Math.min(a.x, b.x) - hw,
      y: Math.min(a.y, b.y) - hw,
      w: Math.abs(a.x - b.x) + hw * 2,
      h: Math.abs(a.y - b.y) + hw * 2,
    };
  }

  private drawGround(bounds: Rect) {
    const countryY = this.map.countrysideY ?? Infinity;
    for (const c of this.base.chunks) c.g.fillStyle(COLORS.grass).fillRect(c.rect.x, c.rect.y, c.rect.w, c.rect.h);
    if (countryY < bounds.y + bounds.h) {
      // Поля полосами.
      const rnd = seeded(7);
      for (let y = countryY; y < bounds.y + bounds.h; y += 90) {
        let x = bounds.x;
        while (x < bounds.x + bounds.w) {
          const w = 160 + rnd() * 260;
          const color = rnd() < 0.5 ? COLORS.field : COLORS.fieldDark;
          const rect = { x, y, w, h: 90 };
          this.base.draw(rect, (g) => g.fillStyle(color).fillRect(x, y, w, 88));
          x += w;
        }
      }
    }
  }

  private drawRailway(bounds: Rect) {
    const y = this.map.railwayY;
    if (y === undefined) return;
    const bed = { x: bounds.x, y: y - 22, w: bounds.w, h: 44 };
    this.occupied.push(bed);
    this.base.draw(bed, (g) => {
      g.fillStyle(0x9b958c).fillRect(bed.x, bed.y, bed.w, bed.h);
      g.fillStyle(COLORS.sleeper);
      for (let x = bounds.x; x < bounds.x + bounds.w; x += 14) g.fillRect(x, y - 16, 6, 32);
    });
    this.railsOverlay(bounds.x, bounds.w);
  }

  /** Мост автомагистрали над железной дорогой: ограждения по краям. */
  private bridge(rect: Rect, y: number) {
    const box = { x: rect.x - 6, y: y - 34, w: rect.w + 12, h: 68 };
    this.marks.draw(box, (g) => {
      g.fillStyle(0x000000, 0.18).fillRect(box.x, box.y + box.h, box.w, 6);
      g.fillStyle(0xc9ced6).fillRect(box.x, box.y, 5, box.h).fillRect(box.x + box.w - 5, box.y, 5, box.h);
    });
  }

  /** Рельсы поверх всего (в том числе поверх асфальта на переезде). */
  private railsOverlay(x: number, w: number) {
    const y = this.map.railwayY!;
    this.marks.draw({ x, y: y - 12, w, h: 24 }, (g) => {
      g.fillStyle(COLORS.rail).fillRect(x, y - 11, w, 3).fillRect(x, y + 8, w, 3);
    });
  }

  private drawRoad(road: MapRoad) {
    const rect = this.roadRect(road, 0);
    const city = (road.kind ?? 'city') === 'city';
    const walk = this.roadRect(road, city ? SIDEWALK : 6);
    this.occupied.push(this.roadRect(road, city ? SIDEWALK + 4 : 14));
    this.walks.draw(walk, (g) => g.fillStyle(city ? COLORS.sidewalk : 0xa99f8e).fillRect(walk.x, walk.y, walk.w, walk.h));
    this.ground.draw(rect, (g) => g.fillStyle(COLORS.asphalt).fillRect(rect.x, rect.y, rect.w, rect.h));
    if (road.kind === 'highway') {
      const a = this.graph.node(road.from);
      const b = this.graph.node(road.to);
      const vertical = a.x === b.x;
      const m = vertical
        ? { x: a.x - MEDIAN_WIDTH / 2, y: Math.min(a.y, b.y), w: MEDIAN_WIDTH, h: Math.abs(a.y - b.y) }
        : { x: Math.min(a.x, b.x), y: a.y - MEDIAN_WIDTH / 2, w: Math.abs(a.x - b.x), h: MEDIAN_WIDTH };
      this.marks.draw(m, (g) => {
        g.fillStyle(0x6d8b5a).fillRect(m.x, m.y, m.w, m.h);
        g.fillStyle(0xd0d4da);
        if (vertical) g.fillRect(a.x - 1, m.y, 2, m.h);
        else g.fillRect(m.x, a.y - 1, m.w, 2);
      });
    }
    // Рельсы видны и на переезде. Автомагистраль проходит над железной дорогой по мосту.
    const y = this.map.railwayY;
    if (y !== undefined && rect.y < y && rect.y + rect.h > y && rect.w < rect.h) {
      if (road.kind === 'highway') this.bridge(rect, y);
      else this.railsOverlay(rect.x, rect.w);
    }
  }

  private drawNode(id: string) {
    const node = this.graph.node(id);
    const r = this.graph.radius(id);
    if (node.kind === 'roundabout') {
      const box = { x: node.x - RING_OUTER - SIDEWALK, y: node.y - RING_OUTER - SIDEWALK, w: (RING_OUTER + SIDEWALK) * 2, h: (RING_OUTER + SIDEWALK) * 2 };
      this.occupied.push(box);
      this.walks.draw(box, (g) => g.fillStyle(COLORS.sidewalk).fillCircle(node.x, node.y, RING_OUTER + SIDEWALK));
      this.ground.draw(box, (g) => g.fillStyle(COLORS.asphalt).fillCircle(node.x, node.y, RING_OUTER));
      this.marks.draw(box, (g) => {
        g.fillStyle(COLORS.curb).fillCircle(node.x, node.y, RING_INNER + 3);
        g.fillStyle(COLORS.grassDark).fillCircle(node.x, node.y, RING_INNER);
      });
      this.decor.draw(box, (g) => {
        drawTree(g, node.x - 10, node.y - 6, 14);
        drawTree(g, node.x + 12, node.y + 10, 11);
      });
      return;
    }
    if (node.kind === 'end') {
      const R = DEAD_END_RADIUS + 10;
      const box = { x: node.x - R - 8, y: node.y - R - 8, w: (R + 8) * 2, h: (R + 8) * 2 };
      this.occupied.push(box);
      this.walks.draw(box, (g) => g.fillStyle(0xa99f8e).fillCircle(node.x, node.y, R + 6));
      this.ground.draw(box, (g) => g.fillStyle(COLORS.asphalt).fillCircle(node.x, node.y, R));
      return;
    }
    const box = { x: node.x - r, y: node.y - r, w: r * 2, h: r * 2 };
    const incident = this.map.roads.filter((rd) => rd.from === id || rd.to === id);
    const city = incident.every((rd) => (rd.kind ?? 'city') === 'city');
    const walk = city ? SIDEWALK : 6;
    this.walks.draw({ x: box.x - walk, y: box.y - walk, w: box.w + walk * 2, h: box.h + walk * 2 }, (g) =>
      g.fillStyle(city ? COLORS.sidewalk : 0xa99f8e).fillRect(box.x - walk, box.y - walk, box.w + walk * 2, box.h + walk * 2),
    );
    this.ground.draw(box, (g) => g.fillStyle(COLORS.asphalt).fillRect(box.x, box.y, box.w, box.h));
  }

  private drawMarkings(road: MapRoad) {
    const lane = this.graph.laneFor(road.id, road.to);
    const start = lane.start;
    const len = lane.length;
    const d = lane.dir;
    const n = lane.normal;
    const off = laneOffset(road);
    const center = (s: number) => ({ x: start.x - n.x * off + d.x * s, y: start.y - n.y * off + d.y * s });
    const dash = (from: { x: number; y: number }, s: number, len2: number, offset: number, w = 2, color = COLORS.marking) => {
      const p = { x: from.x + d.x * s + n.x * offset, y: from.y + d.y * s + n.y * offset };
      const rect = d.x !== 0 ? { x: Math.min(p.x, p.x + d.x * len2), y: p.y - w / 2, w: Math.abs(d.x * len2), h: w } : { x: p.x - w / 2, y: Math.min(p.y, p.y + d.y * len2), w, h: Math.abs(d.y * len2) };
      this.marks.draw(rect, (g) => g.fillStyle(color).fillRect(rect.x, rect.y, rect.w, rect.h));
    };
    const c0 = center(0);
    if (road.lanes === 2) {
      // Автомагистраль: прерывистые между полосами, сплошные по краям.
      for (const side of [-1, 1]) {
        dash(c0, 0, len, side * (MEDIAN_WIDTH / 2 + LANE_WIDTH), 2);
        dash(c0, 0, len, side * (MEDIAN_WIDTH / 2 + 2 * LANE_WIDTH - 4), 2);
      }
      return;
    }
    // Двухполосная дорога: прерывистая ось, у перекрёстков — короткая сплошная.
    for (let s = 24; s < len - 24; s += 34) dash(c0, s, Math.min(18, len - 24 - s), 0);
    dash(c0, 0, 18, 0);
    dash(c0, len - 18, 18, 0);
    if (road.kind === 'country') {
      dash(c0, 0, len, LANE_WIDTH - 3, 1.5);
      dash(c0, 0, len, -LANE_WIDTH + 3, 1.5);
    }
  }

  /** Постоянные элементы у точек интереса: переходы, стоп-линии, остановка, парковка, здания мини-игр. */
  private drawPointFeatures(scene: Phaser.Scene) {
    for (const point of this.points) {
      const stop = this.graph.pointStop(point);
      const { lane } = stop;
      const d = lane.dir;
      const n = lane.normal;
      const a = stop.anchor;
      switch (point.template) {
        case 'signalized': {
          const node = this.graph.node(point.toward);
          const r = this.graph.radius(node.id);
          for (const out of this.graph.outgoing.get(node.id) ?? []) {
            // Переход и стоп-линия на каждом подходе к перекрёстку.
            const dir = out.dir;
            const nn = out.normal;
            const zc = { x: node.x + dir.x * (r + 12), y: node.y + dir.y * (r + 12) };
            this.zebra(zc, dir, nn, LANE_WIDTH);
            const sl = { x: node.x + dir.x * (r + 26) - nn.x * 15, y: node.y + dir.y * (r + 26) - nn.y * 15 };
            this.bar(sl, nn, 28, 3);
          }
          break;
        }
        case 'crosswalk':
          this.zebra(a, d, n, LANE_WIDTH);
          break;
        case 'bus-stop': {
          // Заездной карман справа, за ним тротуар с павильоном.
          this.pocket(a, d, n, 150);
          const shelterAt = { x: a.x + n.x * (LANE_WIDTH + 28 + SIDEWALK + 8), y: a.y + n.y * (LANE_WIDTH + 28 + SIDEWALK + 8) };
          const along = Math.abs(d.x) > 0.5;
          const shelter = along ? { x: shelterAt.x - 26, y: shelterAt.y - 7, w: 52, h: 14 } : { x: shelterAt.x - 7, y: shelterAt.y - 26, w: 14, h: 52 };
          this.occupied.push({ x: shelter.x - 16, y: shelter.y - 16, w: shelter.w + 32, h: shelter.h + 32 });
          this.decor.draw(shelter, (g) => {
            g.fillStyle(0x000000, 0.2).fillRect(shelter.x + 3, shelter.y + 3, shelter.w, shelter.h);
            g.fillStyle(0x4a90c2).fillRect(shelter.x, shelter.y, shelter.w, shelter.h);
            g.fillStyle(0xffffff, 0.35).fillRect(shelter.x + 2, shelter.y + 2, shelter.w - 4, shelter.h - 4);
          });
          // Разметка 1.17 (жёлтый «зигзаг») в кармане.
          for (let k = -2; k < 2; k++) {
            const p = { x: a.x + n.x * (LANE_WIDTH + 24) + d.x * k * 22, y: a.y + n.y * (LANE_WIDTH + 24) + d.y * k * 22 };
            const q = { x: p.x + d.x * 11 - n.x * 16, y: p.y + d.y * 11 - n.y * 16 };
            const r2 = { x: p.x + d.x * 22, y: p.y + d.y * 22 };
            const box = { x: Math.min(p.x, q.x, r2.x) - 4, y: Math.min(p.y, q.y, r2.y) - 4, w: 50, h: 50 };
            this.marks.draw(box, (g) => g.lineStyle(2, COLORS.markingYellow).lineBetween(p.x, p.y, q.x, q.y).lineBetween(q.x, q.y, r2.x, r2.y));
          }
          break;
        }
        case 'parking': {
          // Карман для стоянки вдоль правого края, разлинованный на места.
          const len = 190;
          this.pocket(a, d, n, len);
          for (let k = -len / 2; k <= len / 2; k += 47.5) {
            const p = { x: a.x + n.x * LANE_WIDTH + d.x * k, y: a.y + n.y * LANE_WIDTH + d.y * k };
            const rect = Math.abs(d.x) > 0.5 ? { x: p.x - 1, y: Math.min(p.y, p.y + n.y * 26), w: 2, h: 26 } : { x: Math.min(p.x, p.x + n.x * 26), y: p.y - 1, w: 26, h: 2 };
            this.marks.draw(rect, (g) => g.fillStyle(COLORS.marking).fillRect(rect.x, rect.y, rect.w, rect.h));
          }
          break;
        }
        case 'classroom':
          this.landmark(scene, a, d, n, 0xe8b04b, 'АВТО\nШКОЛА', '#5a3d00');
          break;
        case 'garage':
          this.landmark(scene, a, d, n, 0x8d99ae, 'АВТО\nСЕРВИС', '#1b2430');
          break;
        case 'inspector':
          this.pocket(a, d, n, 120);
          this.landmark(scene, a, d, n, 0x1d4ed8, 'ДПС', '#ffffff', 70);
          break;
        case 'first-aid':
          this.pocket(a, d, n, 120);
          this.landmark(scene, a, d, n, 0xf8f9fa, '+', '#d62839', 60);
          break;
      }
    }
  }

  /** Здание мини-игры справа от дороги с крупной надписью (видна и в обзоре района). */
  private landmark(scene: Phaser.Scene, a: { x: number; y: number }, d: { x: number; y: number }, n: { x: number; y: number }, color: number, label: string, ink: string, size = 110) {
    const offset = LANE_WIDTH + SIDEWALK + 28 + size / 2;
    const back = { x: a.x + n.x * offset, y: a.y + n.y * offset };
    const along = Math.abs(d.x) > 0.5;
    const bw = along ? size * 1.35 : size;
    const bh = along ? size : size * 1.35;
    const rect = { x: back.x - bw / 2, y: back.y - bh / 2, w: bw, h: bh };
    this.occupied.push({ x: rect.x - 20, y: rect.y - 20, w: rect.w + 40, h: rect.h + 40 });
    this.decor.draw(rect, (g) => drawBuilding(g, rect.x, rect.y, rect.w, rect.h, color));
    scene.add
      .text(back.x, back.y, label, { fontFamily: 'system-ui, sans-serif', fontSize: label.length < 3 ? '30px' : '15px', fontStyle: 'bold', color: ink, align: 'center' })
      .setOrigin(0.5)
      .setDepth(3.5)
      .setResolution(4);
  }

  /** Асфальтовый карман справа от полосы (ширина 28) с тротуаром за ним. */
  private pocket(a: { x: number; y: number }, d: { x: number; y: number }, n: { x: number; y: number }, len: number) {
    const corner = (along: number, across: number) => ({ x: a.x + d.x * along + n.x * across, y: a.y + d.y * along + n.y * across });
    const box = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(p.x - q.x), h: Math.abs(p.y - q.y) });
    const walk = box(corner(-len / 2 - 20, LANE_WIDTH), corner(len / 2 + 20, LANE_WIDTH + 28 + SIDEWALK));
    const bay = box(corner(-len / 2, LANE_WIDTH - 1), corner(len / 2, LANE_WIDTH + 28));
    this.occupied.push({ x: walk.x - 8, y: walk.y - 8, w: walk.w + 16, h: walk.h + 16 });
    this.walks.draw(walk, (g) => g.fillStyle(COLORS.sidewalk).fillRect(walk.x, walk.y, walk.w, walk.h));
    this.ground.draw(bay, (g) => g.fillStyle(COLORS.asphaltDark).fillRect(bay.x, bay.y, bay.w, bay.h));
  }

  private zebra(center: { x: number; y: number }, dir: { x: number; y: number }, n: { x: number; y: number }, halfWidth: number) {
    const depth = 16;
    for (let k = -halfWidth + 4; k < halfWidth - 2; k += 8) {
      const p = { x: center.x + n.x * k, y: center.y + n.y * k };
      const rect = Math.abs(dir.x) > 0.5 ? { x: p.x - depth / 2, y: p.y, w: depth, h: 5 } : { x: p.x, y: p.y - depth / 2, w: 5, h: depth };
      this.marks.draw(rect, (g) => g.fillStyle(COLORS.marking).fillRect(rect.x, rect.y, rect.w, rect.h));
    }
  }

  private bar(p: { x: number; y: number }, n: { x: number; y: number }, len: number, w: number) {
    const rect = Math.abs(n.x) > 0.5 ? { x: p.x - len / 2, y: p.y - w / 2, w: len, h: w } : { x: p.x - w / 2, y: p.y - len / 2, w, h: len };
    this.marks.draw(rect, (g) => g.fillStyle(COLORS.marking).fillRect(rect.x, rect.y, rect.w, rect.h));
  }

  /** Кварталы: дома, дворы, деревья; за городом — перелески. */
  private drawBlocks(bounds: Rect) {
    const rnd = seeded(42);
    const countryY = this.map.countrysideY ?? Infinity;
    const free = (r: Rect) => !this.occupied.some((o) => overlaps(o, r));
    const cell = 64;
    for (let y = bounds.y; y < bounds.y + bounds.h; y += cell) {
      for (let x = bounds.x; x < bounds.x + bounds.w; x += cell) {
        const lot = { x: x + 4, y: y + 4, w: cell - 8, h: cell - 8 };
        if (!free(lot)) {
          // Деревья вдоль дорог там, где помещаются.
          const t = { x: x + cell / 2 - 10, y: y + cell / 2 - 10, w: 20, h: 20 };
          if (free(t) && rnd() < 0.5) this.decor.draw(t, (g) => drawTree(g, t.x + 10, t.y + 10, 9 + rnd() * 4));
          continue;
        }
        const inCity = y + cell < countryY;
        const roll = rnd();
        if (inCity && roll < 0.62) {
          // Дом, иногда сдвоенный с соседним участком справа.
          const wide = rnd() < 0.35 && free({ x: x + cell + 4, y: y + 4, w: cell - 8, h: cell - 8 });
          const w = wide ? cell * 2 - 12 : cell - 12;
          const h = cell - 12;
          const b = { x: x + 6, y: y + 6, w, h };
          this.occupied.push(b);
          const color = ROOF_COLORS[Math.floor(rnd() * ROOF_COLORS.length)];
          this.decor.draw(b, (g) => drawBuilding(g, b.x, b.y, b.w, b.h, color));
        } else if (inCity ? roll < 0.85 : roll < 0.35) {
          const n = inCity ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
          for (let i = 0; i < n; i++) {
            const tx = x + 14 + rnd() * (cell - 28);
            const ty = y + 14 + rnd() * (cell - 28);
            const r = 10 + rnd() * 8;
            this.decor.draw({ x: tx - r, y: ty - r, w: r * 2, h: r * 2 }, (g) => drawTree(g, tx, ty, r));
          }
        }
      }
    }
  }
}
