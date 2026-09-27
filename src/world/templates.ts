/**
 * Каталог шаблонов сцен и мини-игр и их параметры.
 *
 * Шаблон собирает ситуацию на дороге (или мини-игру) из параметров вопроса (data/scenes.json).
 * Файл без зависимостей от Phaser: его использует и игра, и скрипты размещения и покрытия.
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
  'street',
  'highway',
  'night-road',
  'classroom',
  'inspector',
  'garage',
  'first-aid',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type Maneuver = 'straight' | 'left' | 'right' | 'uturn';
export type Consequence = 'fine' | 'hazard' | 'inspector' | 'instructor';
export type VehicleKind = 'car' | 'truck' | 'bus' | 'tram' | 'moto' | 'bicycle' | 'police' | 'ambulance' | 'tractor';
export type LightState = 'green' | 'green-blink' | 'yellow' | 'yellow-blink' | 'red' | 'red-yellow' | 'off';
export type Side = 'left' | 'right' | 'oncoming';

/** Мини-игра «Гараж»: что осматривает игрок. */
export const GARAGE_PARTS = {
  brakes: 'тормоза',
  steering: 'рулевое управление',
  lights: 'фары и фонари',
  wipers: 'стеклоочистители',
  tires: 'шины',
  engine: 'двигатель',
  exhaust: 'выпускная система',
  body: 'кузов и рама',
  cabin: 'салон',
  glass: 'стёкла',
  belts: 'ремни безопасности',
  horn: 'звуковой сигнал',
  hitch: 'буксирное устройство',
  cargo: 'груз на багажнике',
  'child-seat': 'детское кресло',
} as const;
export type GaragePart = keyof typeof GARAGE_PARTS;

/** Мини-игра «Инспектор»: с чего инспектор начинает разговор. */
export const INSPECTOR_CASES = ['documents', 'alcohol', 'accident', 'punishment', 'phone', 'belts', 'insurance', 'stop', 'fine'] as const;
export type InspectorCase = (typeof INSPECTOR_CASES)[number];

/**
 * Мини-игра «Аптечка»: шаг помощи пострадавшему. Порядок ключей — порядок шагов:
 * вопросы одной точки идут от вызова помощи к конкретным травмам.
 */
export const FIRST_AID_STEPS = {
  call: 'Вызов помощи',
  extract: 'Извлечение из машины',
  breathing: 'Проверка дыхания',
  unconscious: 'Без сознания',
  cpr: 'Реанимация',
  choking: 'Дыхательные пути',
  bleeding: 'Кровотечение',
  wound: 'Рана',
  head: 'Травма головы',
  spine: 'Травма позвоночника',
  fracture: 'Переломы',
  burn: 'Ожог',
  cold: 'Переохлаждение',
  medicine: 'Лекарства',
} as const;
export type Injury = keyof typeof FIRST_AID_STEPS;

/** Время суток и погода: доступны в любом шаблоне на дороге. */
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
  /** Дорожные знаки в сцене (номера по ПДД, например "2.1", "3.20"). Пустой список — знаков нет совсем. */
  signs?: string[];
  /** Кто по ситуации проезжает первым; игрок едет после них. */
  yieldTo?: Array<Side | 'pedestrians' | 'cyclist'>;

  // Перекрёстки
  light?: LightState;
  /** Дополнительная секция светофора со стрелкой (горит зелёным). */
  arrow?: 'left' | 'right' | 'straight';
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
  vehicle?: 'bus' | 'tram' | 'none';
  leaving?: boolean;
  barrier?: 'none' | 'open' | 'closed';
  train?: boolean;
  crosswalkAhead?: boolean;
  highBeam?: boolean;
  /** Препятствие (знак аварийной остановки) на полосе игрока. */
  obstacle?: boolean;

  // Мини-игры
  part?: GaragePart;
  case?: InspectorCase;
  injury?: Injury;
}

export interface TemplateInfo {
  id: TemplateId;
  title: string;
  /** Коротко — для подписи точки на карте. */
  short: string;
  /** Сцена вокруг узла (перекрёсток), в точке на участке дороги или мини-игра у здания. */
  anchor: 'node' | 'road';
  /** Мини-игра: своя сцена поверх города вместо ситуации на дороге. */
  minigame: boolean;
  /** Где на карте может стоять точка: на обычной дороге, на автомагистрали, на переезде. */
  place: 'city' | 'highway' | 'railway';
  consequence: Consequence;
  /** Для участков дороги: на сколько раньше точки сцены останавливается игрок. */
  stopOffset: number;
  /** Сколько вопросов подряд задаётся в одной точке. */
  series: number;
  /** Параметры, которые понимает шаблон (кроме общих). */
  params: Array<keyof SceneParams>;
}

const COMMON: Array<keyof SceneParams> = ['maneuver', 'conditions', 'consequence', 'signs', 'yieldTo'];
const TRAFFIC: Array<keyof SceneParams> = ['fromLeft', 'fromRight', 'oncoming', 'pedestrians', 'cyclist', 'emergency'];

const road = (id: TemplateId, title: string, short: string, rest: Partial<TemplateInfo> & Pick<TemplateInfo, 'consequence' | 'params'>): TemplateInfo => ({
  id,
  title,
  short,
  anchor: 'road',
  minigame: false,
  place: 'city',
  stopOffset: 0,
  series: 3,
  ...rest,
});

const node = (id: TemplateId, title: string, short: string, params: Array<keyof SceneParams>): TemplateInfo => ({
  id,
  title,
  short,
  anchor: 'node',
  minigame: false,
  place: 'city',
  consequence: id === 'signalized' ? 'inspector' : 'hazard',
  stopOffset: 0,
  series: 3,
  params,
});

const minigame = (id: TemplateId, title: string, short: string, params: Array<keyof SceneParams>, series: number): TemplateInfo => ({
  id,
  title,
  short,
  anchor: 'road',
  minigame: true,
  place: 'city',
  consequence: 'instructor',
  stopOffset: 0,
  series,
  params,
});

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  signalized: node('signalized', 'Регулируемый перекрёсток', 'Светофор', [...TRAFFIC, 'light', 'arrow', 'controller']),
  'uncontrolled-equal': node('uncontrolled-equal', 'Перекрёсток равнозначных дорог', 'Перекрёсток', TRAFFIC),
  'uncontrolled-priority': node('uncontrolled-priority', 'Перекрёсток неравнозначных дорог', 'Главная дорога', [...TRAFFIC, 'playerOn', 'mainRoad']),
  roundabout: node('roundabout', 'Круговое движение', 'Кольцо', [...TRAFFIC, 'playerOnRing']),
  crosswalk: road('crosswalk', 'Пешеходный переход', 'Переход', { consequence: 'hazard', stopOffset: 34, params: ['pedestrians', 'jam', 'oncoming'] }),
  'bus-stop': road('bus-stop', 'Остановка общественного транспорта', 'Остановка', {
    consequence: 'hazard',
    stopOffset: 110,
    params: ['vehicle', 'leaving', 'pedestrians', 'oncoming'],
  }),
  railway: road('railway', 'Железнодорожный переезд', 'Переезд', { consequence: 'hazard', stopOffset: 70, place: 'railway', params: ['barrier', 'train', 'light', 'ahead'] }),
  overtaking: road('overtaking', 'Обгон и встречный разъезд', 'Обгон', { consequence: 'hazard', params: ['ahead', 'leftSignal', 'marking', 'oncoming', 'obstacle'] }),
  parking: road('parking', 'Остановка и стоянка', 'Стоянка', { consequence: 'fine', params: ['crosswalkAhead', 'marking', 'oncoming'] }),
  'signs-marking': road('signs-marking', 'Знаки и разметка', 'Знаки', { consequence: 'inspector', stopOffset: 60, params: ['marking', 'ahead', 'oncoming'] }),
  street: road('street', 'На дороге', 'Дорога', { consequence: 'hazard', stopOffset: 30, params: ['marking', 'ahead', 'oncoming'] }),
  highway: road('highway', 'Автомагистраль', 'Магистраль', { consequence: 'inspector', place: 'highway', params: ['ahead', 'oncoming'] }),
  'night-road': road('night-road', 'Тёмное время суток и погода', 'Непогода', { consequence: 'hazard', params: ['oncoming', 'ahead', 'highBeam'] }),
  classroom: minigame('classroom', 'Автошкола: викторина', 'Автошкола', [], 5),
  inspector: minigame('inspector', 'Инспектор ДПС', 'Пост ДПС', ['case'], 4),
  garage: minigame('garage', 'Гараж: осмотр машины', 'Автосервис', ['part'], 4),
  'first-aid': minigame('first-aid', 'Аптечка: первая помощь', 'Аптечка', ['injury'], 4),
};

const VEHICLES = ['car', 'truck', 'bus', 'tram', 'moto', 'bicycle', 'police', 'ambulance', 'tractor'];
const ENUMS: Partial<Record<keyof SceneParams, readonly string[]>> = {
  maneuver: ['straight', 'left', 'right', 'uturn'],
  consequence: ['fine', 'hazard', 'inspector', 'instructor'],
  light: ['green', 'green-blink', 'yellow', 'yellow-blink', 'red', 'red-yellow', 'off'],
  arrow: ['left', 'right', 'straight'],
  controller: ['side', 'front', 'up', 'right-arm'],
  fromLeft: VEHICLES,
  fromRight: VEHICLES,
  oncoming: VEHICLES,
  ahead: VEHICLES,
  pedestrians: ['crossing', 'waiting', 'none'],
  playerOn: ['main', 'secondary'],
  mainRoad: ['straight', 'left', 'right'],
  marking: ['dashed', 'solid', 'double'],
  vehicle: ['bus', 'tram', 'none'],
  barrier: ['none', 'open', 'closed'],
  part: Object.keys(GARAGE_PARTS),
  case: INSPECTOR_CASES,
  injury: Object.keys(FIRST_AID_STEPS),
};

const BOOLEANS: Array<keyof SceneParams> = ['cyclist', 'emergency', 'playerOnRing', 'leftSignal', 'jam', 'leaving', 'train', 'crosswalkAhead', 'highBeam', 'obstacle'];

/** Параметры, без которых мини-игра не соберётся. */
const REQUIRED: Partial<Record<TemplateId, Array<keyof SceneParams>>> = {
  inspector: ['case'],
  garage: ['part'],
  'first-aid': ['injury'],
};

/** Проверка параметров сцены. Возвращает список проблем (пустой — всё в порядке). */
export function validateParams(template: TemplateId, params: unknown): string[] {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return ['params должен быть объектом'];
  const info = TEMPLATES[template];
  const allowed = new Set<string>([...(info.minigame ? [] : COMMON), ...info.params]);
  const problems: string[] = [];

  for (const key of REQUIRED[template] ?? []) {
    if (!(key in params)) problems.push(`шаблону «${template}» нужен параметр «${key}»`);
  }
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
