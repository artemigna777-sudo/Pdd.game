/**
 * Описание карты района: узлы (перекрёстки, повороты, тупики), дороги между ними
 * и точки интереса, где игрока ждут вопросы. Чистые данные, без Phaser.
 *
 * Координаты в пикселях мира: x вправо, y вниз (север сверху). Движение правостороннее.
 */
import type { TemplateId } from './templates.ts';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  /** junction — обычный перекрёсток или поворот; roundabout — кольцо; end — тупик с разворотом. */
  kind?: 'junction' | 'roundabout' | 'end';
}

export interface MapRoad {
  id: string;
  from: string;
  to: string;
  /** Полос в каждую сторону. */
  lanes?: 1 | 2;
  kind?: 'city' | 'country' | 'highway';
}

export interface MapPoint {
  id: string;
  template: TemplateId;
  /** Подпись на карте. */
  title: string;
  /** Дорога, по которой игрок подъезжает, и узел, к которому он едет. */
  road: string;
  toward: string;
  /** Для сцен на участке дороги: положение сцены вдоль полосы (0 — начало, 1 — конец). */
  at?: number;
}

export interface CityMap {
  id: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
  nodes: MapNode[];
  roads: MapRoad[];
  points: MapPoint[];
  /** Горизонтальная железная дорога через весь район (координата y). */
  railwayY?: number;
  /** Ниже этой линии начинается загород: поля и лес вместо кварталов. */
  countrysideY?: number;
}
