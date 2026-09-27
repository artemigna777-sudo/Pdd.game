/**
 * Каталог шаблонов сцен и их параметры.
 *
 * Шаблон собирает ситуацию на дороге из параметров вопроса (data/mapping.json).
 * Файл без зависимостей от Phaser: его использует и игра, и `npm run coverage`.
 */

export const TEMPLATE_IDS = [
  'signalized',
  'uncontrolled-equal',
  'uncontrolled-priority',
  'roundabout',
  'crosswalk',
  'bus-stop',
  'railway',
  'overtaking',
  'parking',
  'signs-marking',
  'highway',
  'night-road',
  'theory',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type Maneuver = 'straight' | 'left' | 'right' | 'uturn';
export type Consequence = 'fine' | 'hazard' | 'inspector' | 'instructor';
export type VehicleKind = 'car' | 'truck' | 'bus' | 'tram' | 'moto' | 'bicycle' | 'police' | 'ambulance' | 'tractor';
export type LightState = 'green' | 'green-blink' | 'yellow' | 'yellow-blink' | 'red' | 'red-yellow' | 'off';
export type Side = 'left' | 'right' | 'oncoming';

/** Время суток и погода: доступны в любом шаблоне. */
export interface Conditions {
  time?: 'day' | 'night';
  weather?: 'clear' | 'rain' | 'snow' | 'fog';
}

export interface SceneParams {
  /** Куда поедет игрок после вопроса (для перекрёстков). */
  maneuver?: Maneuver;
  conditions?: Conditions;
  /** Что показать при неправильном ответе; по умолчанию — своё у каждого шаблона. */
  consequence?: Consequence;
  /** Дорожные знаки в сцене (номера по ПДД, например "2.1", "3.20"). */
  signs?: string[];
  /** Кто по ситуации проезжает первым; игрок едет после них. */
  yieldTo?: Array<Side | 'pedestrians' | 'cyclist'>;

  // Перекрёстки
  light?: LightState;
  arrow?: 'left' | 'right';
  controller?: 'side' | 'front' | 'up' | 'right-arm';
  fromLeft?: VehicleKind;
  fromRight?: VehicleKind;
  oncoming?: VehicleKind;
  pedestrians?: 'crossing' | 'waiting' | 'none';
  cyclist?: boolean;
  emergency?: boolean;
  playerOn?: 'main' | 'secondary';
  mainRoad?: 'straight' | 'left' | 'right';
  playerOnRing?: boolean;

  // Участки дороги
  ahead?: VehicleKind;
  leftSignal?: boolean;
  marking?: 'dashed' | 'solid' | 'double';
  jam?: boolean;
  vehicle?: 'bus' | 'tram';
  leaving?: boolean;
  barrier?: 'none' | 'open' | 'closed';
  train?: boolean;
  crosswalkAhead?: boolean;
  highBeam?: boolean;
}

export interface TemplateInfo {
  id: TemplateId;
  title: string;
  /** Сцена вокруг узла (перекрёсток) или точки на участке дороги. */
  anchor: 'node' | 'road';
  consequence: Consequence;
  /** Для участков дороги: на сколько раньше точки сцены останавливается игрок. */
  stopOffset: number;
  /** Параметры, которые понимает шаблон (кроме общих). */
  params: Array<keyof SceneParams>;
}

const COMMON: Array<keyof SceneParams> = ['maneuver', 'conditions', 'consequence', 'signs', 'yieldTo'];
const TRAFFIC: Array<keyof SceneParams> = ['fromLeft', 'fromRight', 'oncoming', 'pedestrians', 'cyclist', 'emergency'];

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  signalized: {
    id: 'signalized',
    title: 'Регулируемый перекрёсток',
    anchor: 'node',
    consequence: 'inspector',
    stopOffset: 0,
    params: [...TRAFFIC, 'light', 'arrow', 'controller'],
  },
  'uncontrolled-equal': {
    id: 'uncontrolled-equal',
    title: 'Перекрёсток равнозначных дорог',
    anchor: 'node',
    consequence: 'hazard',
    stopOffset: 0,
    params: TRAFFIC,
  },
  'uncontrolled-priority': {
    id: 'uncontrolled-priority',
    title: 'Перекрёсток неравнозначных дорог',
    anchor: 'node',
    consequence: 'hazard',
    stopOffset: 0,
    params: [...TRAFFIC, 'playerOn', 'mainRoad'],
  },
  roundabout: {
    id: 'roundabout',
    title: 'Круговое движение',
    anchor: 'node',
    consequence: 'hazard',
    stopOffset: 0,
    params: [...TRAFFIC, 'playerOnRing'],
  },
  crosswalk: {
    id: 'crosswalk',
    title: 'Пешеходный переход',
    anchor: 'road',
    consequence: 'hazard',
    stopOffset: 34,
    params: ['pedestrians', 'jam', 'oncoming'],
  },
  'bus-stop': {
    id: 'bus-stop',
    title: 'Остановка общественного транспорта',
    anchor: 'road',
    consequence: 'hazard',
    stopOffset: 110,
    params: ['vehicle', 'leaving', 'pedestrians', 'oncoming'],
  },
  railway: {
    id: 'railway',
    title: 'Железнодорожный переезд',
    anchor: 'road',
    consequence: 'hazard',
    stopOffset: 70,
    params: ['barrier', 'train', 'light'],
  },
  overtaking: {
    id: 'overtaking',
    title: 'Обгон и встречный разъезд',
    anchor: 'road',
    consequence: 'hazard',
    stopOffset: 0,
    params: ['ahead', 'leftSignal', 'marking', 'oncoming'],
  },
  parking: {
    id: 'parking',
    title: 'Остановка и стоянка',
    anchor: 'road',
    consequence: 'fine',
    stopOffset: 0,
    params: ['crosswalkAhead', 'marking', 'oncoming'],
  },
  'signs-marking': {
    id: 'signs-marking',
    title: 'Знаки и разметка',
    anchor: 'road',
    consequence: 'inspector',
    stopOffset: 60,
    params: ['marking', 'ahead', 'oncoming'],
  },
  highway: {
    id: 'highway',
    title: 'Автомагистраль',
    anchor: 'road',
    consequence: 'inspector',
    stopOffset: 0,
    params: ['ahead', 'oncoming'],
  },
  'night-road': {
    id: 'night-road',
    title: 'Тёмное время суток и погода',
    anchor: 'road',
    consequence: 'hazard',
    stopOffset: 0,
    params: ['oncoming', 'ahead', 'highBeam'],
  },
  theory: {
    id: 'theory',
    title: 'Автошкола',
    anchor: 'road',
    consequence: 'instructor',
    stopOffset: 0,
    params: [],
  },
};

const ENUMS: Partial<Record<keyof SceneParams, readonly string[]>> = {
  maneuver: ['straight', 'left', 'right', 'uturn'],
  consequence: ['fine', 'hazard', 'inspector', 'instructor'],
  light: ['green', 'green-blink', 'yellow', 'yellow-blink', 'red', 'red-yellow', 'off'],
  arrow: ['left', 'right'],
  controller: ['side', 'front', 'up', 'right-arm'],
  fromLeft: ['car', 'truck', 'bus', 'tram', 'moto', 'bicycle', 'police', 'ambulance', 'tractor'],
  pedestrians: ['crossing', 'waiting', 'none'],
  playerOn: ['main', 'secondary'],
  mainRoad: ['straight', 'left', 'right'],
  marking: ['dashed', 'solid', 'double'],
  vehicle: ['bus', 'tram'],
  barrier: ['none', 'open', 'closed'],
};
ENUMS.fromRight = ENUMS.fromLeft;
ENUMS.oncoming = ENUMS.fromLeft;
ENUMS.ahead = ENUMS.fromLeft;

const BOOLEANS: Array<keyof SceneParams> = ['cyclist', 'emergency', 'playerOnRing', 'leftSignal', 'jam', 'leaving', 'train', 'crosswalkAhead', 'highBeam'];

/** Проверка параметров сцены. Возвращает список проблем (пустой — всё в порядке). */
export function validateParams(template: TemplateId, params: unknown): string[] {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return ['params должен быть объектом'];
  const info = TEMPLATES[template];
  const allowed = new Set<string>([...COMMON, ...info.params]);
  const problems: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key)) {
      problems.push(`шаблон «${template}» не понимает параметр «${key}»`);
      continue;
    }
    const k = key as keyof SceneParams;
    const options = ENUMS[k];
    if (options && !options.includes(value as string)) problems.push(`${key}: «${String(value)}» — допустимо ${options.join(', ')}`);
    if (BOOLEANS.includes(k) && typeof value !== 'boolean') problems.push(`${key}: ожидается true или false`);
    if (k === 'signs' && !(Array.isArray(value) && value.every((s) => typeof s === 'string' && /^\d+(\.\d+)*(\+[\d.]+)?$/.test(s)))) {
      problems.push('signs: ожидается список номеров знаков, например ["2.1", "3.20"]');
    }
    if (k === 'yieldTo' && !(Array.isArray(value) && value.every((s) => ['left', 'right', 'oncoming', 'pedestrians', 'cyclist'].includes(s)))) {
      problems.push('yieldTo: допустимо left, right, oncoming, pedestrians, cyclist');
    }
    if (k === 'conditions') {
      const c = value as Conditions;
      if (typeof c !== 'object' || c === null) problems.push('conditions: ожидается объект');
      else {
        if (c.time !== undefined && !['day', 'night'].includes(c.time)) problems.push('conditions.time: day или night');
        if (c.weather !== undefined && !['clear', 'rain', 'snow', 'fog'].includes(c.weather)) {
          problems.push('conditions.weather: clear, rain, snow или fog');
        }
      }
    }
  }
  return problems;
}
