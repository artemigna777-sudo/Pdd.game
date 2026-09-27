/**
 * Районы города — по одному на главу. Кварталы строятся сеткой (см. builder.ts), загородные
 * районы дополнены дорогами через поля, железной дорогой и автомагистралью.
 *
 * Точки интереса на карте не задаются вручную: их расставляет `npm run mapping` по вопросам
 * главы (data/mapping.json).
 */
import type { CityMap, MapNode, MapRoad } from '../map.ts';
import { district, grid } from './builder.ts';

const city = (spec: Parameters<typeof grid>[0], id: string, title: string): CityMap => {
  const { nodes, roads } = grid(spec);
  return district({ id, title, nodes, roads });
};

/** Глава 1. Учебный городок вокруг автошколы, кольцо в центре. */
export const schoolTown = city({ cols: 5, rows: 3, spacing: 440, rings: ['C1'] }, 'school-town', 'Учебный городок');

/** Глава 2. Тихий спальный квартал со дворами. */
export const quietQuarter = city({ cols: 5, rows: 3, spacing: 440, rings: ['D1'] }, 'quiet-quarter', 'Тихий квартал');

/** Глава 3. Старый центр: плотная сетка улиц, много светофоров. */
export const oldCenter = city({ cols: 5, rows: 4, spacing: 420 }, 'old-center', 'Старый центр');

/** Глава 4. Проспект: длинные улицы, развороты и перестроения. */
export const avenue = city({ cols: 5, rows: 4, spacing: 440, rings: ['B2'] }, 'avenue', 'Проспект');

/** Глава 5. Новый район. */
export const newTown = city({ cols: 5, rows: 4, spacing: 440, rings: ['C1'] }, 'new-town', 'Новый район');

/** Глава 6. Соборная площадь: сложные перекрёстки. */
export const cathedralSquare = city({ cols: 6, rows: 4, spacing: 420, rings: ['C2'] }, 'cathedral-square', 'Соборная площадь');

/** Глава 7. Рыночный район. */
export const marketQuarter = city({ cols: 6, rows: 4, spacing: 420, rings: ['D1'] }, 'market-quarter', 'Рыночный район');

/** Глава 9. Промзона: склады, стоянки, автосервисы. */
export const industrialZone = city({ cols: 5, rows: 3, spacing: 460 }, 'industrial-zone', 'Промзона');

/**
 * Глава 8. Пригород и трасса: городок на севере, на юге — поля с тремя переездами
 * через железную дорогу и автомагистраль вдоль востока.
 *
 *   A0 ─ B0 ─ C0 ────── H0
 *   │    │    │         ║
 *   A1 ─ B1 ─ C1        ║   автомагистраль
 *   │    │    │         ║
 *  ═╪════╪════╪═══      ║   железная дорога
 *   │    │    │         ║
 *   P0 ─ P1 ─ P2 ────── HM
 *   │         │         ║
 *   S0 ────── S1 ────── H1
 */
export const suburbs: CityMap = (() => {
  const town = grid({ cols: 3, rows: 2, spacing: 440 });
  const nodes: MapNode[] = [
    ...town.nodes,
    { id: 'H0', x: 1500, y: 0 },
    { id: 'HM', x: 1500, y: 1500 },
    { id: 'H1', x: 1500, y: 2700 },
    { id: 'P0', x: 0, y: 1500 },
    { id: 'P1', x: 440, y: 1500 },
    { id: 'P2', x: 880, y: 1500 },
    { id: 'S0', x: 0, y: 2700 },
    { id: 'S1', x: 880, y: 2700 },
  ];
  const country = (from: string, to: string): MapRoad => ({ id: `${from}${to}`, from, to, kind: 'country' });
  const roads: MapRoad[] = [
    ...town.roads,
    { id: 'C0H0', from: 'C0', to: 'H0' },
    { id: 'H0HM', from: 'H0', to: 'HM', lanes: 2, kind: 'highway' },
    { id: 'HMH1', from: 'HM', to: 'H1', lanes: 2, kind: 'highway' },
    country('A1', 'P0'),
    country('B1', 'P1'),
    country('C1', 'P2'),
    country('P0', 'P1'),
    country('P1', 'P2'),
    country('P2', 'HM'),
    country('P0', 'S0'),
    country('S0', 'S1'),
    country('P2', 'S1'),
    country('S1', 'H1'),
  ];
  return district({ id: 'suburbs', title: 'Пригород и трасса', nodes, roads, railwayY: 1000, countrysideY: 700 });
})();

/**
 * Глава 10. Ночной город: кварталы, дорога через поля и участок автомагистрали.
 *
 *   A0 ─ B0 ─ C0 ─ D0 ────── H0
 *   │    │    │    │         ║
 *   A1 ─ B1 ─ C1 ─ D1        ║
 *   │    │    │    │         ║
 *   A2 ─ B2 ─ C2 ─ D2        ║
 *   │              │         ║
 *   P0 ─────────── P1 ────── H1
 */
export const nightCity: CityMap = (() => {
  const town = grid({ cols: 4, rows: 3, spacing: 440, rings: ['B1'] });
  const nodes: MapNode[] = [
    ...town.nodes,
    { id: 'H0', x: 1900, y: 0 },
    { id: 'H1', x: 1900, y: 1600 },
    { id: 'P0', x: 0, y: 1600 },
    { id: 'P1', x: 1320, y: 1600 },
  ];
  const roads: MapRoad[] = [
    ...town.roads,
    { id: 'D0H0', from: 'D0', to: 'H0' },
    { id: 'H0H1', from: 'H0', to: 'H1', lanes: 2, kind: 'highway' },
    { id: 'A2P0', from: 'A2', to: 'P0', kind: 'country' },
    { id: 'D2P1', from: 'D2', to: 'P1', kind: 'country' },
    { id: 'P0P1', from: 'P0', to: 'P1', kind: 'country' },
    { id: 'P1H1', from: 'P1', to: 'H1', kind: 'country' },
  ];
  return district({ id: 'night-city', title: 'Ночной город', nodes, roads, countrysideY: 1150 });
})();

export const DISTRICTS: CityMap[] = [schoolTown, quietQuarter, oldCenter, avenue, newTown, cathedralSquare, marketQuarter, suburbs, industrialZone, nightCity];
