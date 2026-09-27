import type { CityMap, MapPoint } from '../map.ts';

/**
 * Тестовый район (этап 2, теперь — для автотестов дорожного графа): сетка кварталов 3×3,
 * кольцо, автомагистраль на востоке и загородная дорога на юге через железнодорожный
 * переезд. testPoints — по точке интереса на шаблон.
 *
 *   A ─── B ─── C ════ H1
 *   │     │     │      ║  автомагистраль
 *   D ─── E ─── F      ║
 *   │     │     │      ║
 *   G ─── R ─── I      ║   R — кольцо
 *   │     │     │      ║
 *   J ─── K ─── M ════ H2
 *         │
 *         │  загородная дорога, переезд
 *         N  тупик с разворотом
 */
export const testDistrict: CityMap = {
  id: 'test',
  title: 'Тестовый район',
  bounds: { x: -320, y: -320, width: 2080, height: 3400 },
  railwayY: 2120,
  countrysideY: 1500,
  nodes: [
    { id: 'A', x: 0, y: 0 },
    { id: 'B', x: 480, y: 0 },
    { id: 'C', x: 960, y: 0 },
    { id: 'H1', x: 1440, y: 0 },
    { id: 'D', x: 0, y: 480 },
    { id: 'E', x: 480, y: 480 },
    { id: 'F', x: 960, y: 480 },
    { id: 'G', x: 0, y: 960 },
    { id: 'R', x: 480, y: 960, kind: 'roundabout' },
    { id: 'I', x: 960, y: 960 },
    { id: 'J', x: 0, y: 1440 },
    { id: 'K', x: 480, y: 1440 },
    { id: 'M', x: 960, y: 1440 },
    { id: 'H2', x: 1440, y: 1440 },
    { id: 'N', x: 480, y: 2800, kind: 'end' },
  ],
  roads: [
    { id: 'AB', from: 'A', to: 'B' },
    { id: 'BC', from: 'B', to: 'C' },
    { id: 'CH1', from: 'C', to: 'H1' },
    { id: 'AD', from: 'A', to: 'D' },
    { id: 'BE', from: 'B', to: 'E' },
    { id: 'CF', from: 'C', to: 'F' },
    { id: 'DE', from: 'D', to: 'E' },
    { id: 'EF', from: 'E', to: 'F' },
    { id: 'DG', from: 'D', to: 'G' },
    { id: 'ER', from: 'E', to: 'R' },
    { id: 'FI', from: 'F', to: 'I' },
    { id: 'GR', from: 'G', to: 'R' },
    { id: 'RI', from: 'R', to: 'I' },
    { id: 'GJ', from: 'G', to: 'J' },
    { id: 'RK', from: 'R', to: 'K' },
    { id: 'IM', from: 'I', to: 'M' },
    { id: 'JK', from: 'J', to: 'K' },
    { id: 'KM', from: 'K', to: 'M' },
    { id: 'MH2', from: 'M', to: 'H2' },
    { id: 'H1H2', from: 'H1', to: 'H2', lanes: 2, kind: 'highway' },
    { id: 'KN', from: 'K', to: 'N', kind: 'country' },
  ],
};

export const testPoints: MapPoint[] = [
  { id: 'lights', template: 'signalized', title: 'Светофор', road: 'ER', toward: 'E' },
  { id: 'ring', template: 'roundabout', title: 'Кольцо', road: 'ER', toward: 'R' },
  { id: 'main-road', template: 'uncontrolled-priority', title: 'Главная дорога', road: 'FI', toward: 'F' },
  { id: 'equal', template: 'uncontrolled-equal', title: 'Равнозначный перекрёсток', road: 'RI', toward: 'I' },
  { id: 'zebra', template: 'crosswalk', title: 'Пешеходный переход', road: 'BE', toward: 'E', at: 0.45 },
  { id: 'bus-stop', template: 'bus-stop', title: 'Остановка', road: 'DG', toward: 'G', at: 0.62 },
  { id: 'parking', template: 'parking', title: 'Парковка', road: 'JK', toward: 'K', at: 0.5 },
  { id: 'signs', template: 'signs-marking', title: 'Знаки', road: 'AB', toward: 'B', at: 0.62 },
  { id: 'highway', template: 'highway', title: 'Автомагистраль', road: 'H1H2', toward: 'H2', at: 0.45 },
  { id: 'overtake', template: 'overtaking', title: 'Обгон', road: 'KN', toward: 'N', at: 0.2 },
  { id: 'railway', template: 'railway', title: 'Переезд', road: 'KN', toward: 'N', at: 0.5 },
  { id: 'night', template: 'night-road', title: 'Ночная дорога', road: 'KN', toward: 'N', at: 0.8 },
  { id: 'school', template: 'classroom', title: 'Автошкола', road: 'AD', toward: 'D', at: 0.5 },
];
