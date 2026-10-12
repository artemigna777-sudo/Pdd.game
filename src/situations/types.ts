/**
 * Ситуация режима «Ситуации на дороге» (этап 15). Формат data/situations/*.json.
 *
 * В отличие от билетов, вопросы, варианты и ответы ситуаций пишет Claude по пунктам ПДД и КоАП
 * (исключение из правила 1 CLAUDE.md). В игре они всегда помечены «не из билетов», в покрытие,
 * готовность и работу над ошибками билетов не входят.
 */
export interface Situation {
  /** Например "S07-01": раздел 7, ситуация 1. */
  id: string;
  /** Раздел запроса Артёма (docs/situations-request.md), 7–13. */
  section: number;
  text: string;
  options: string[];
  /** Индекс правильного варианта в options, с нуля. */
  correct: number;
  /** Почему так — со ссылками на пункты. */
  explanation: string;
  /** Пункты правил: «ПДД 10.1», «ПДД 13.11(1)», «КоАП 12.9», «Знак 3.24», «ПДД, Приложение 1 (…)». */
  rules: string[];
  /** Похожие вопросы из билетов (id из data/questions.json) — «Похожий билет». */
  related: string[];
  scene: SituationScene;
  /** 1 — простая, 2 — посложнее, 3 — хардкор. */
  level: 1 | 2 | 3;
}

export interface SituationScene {
  place: 'city' | 'highway' | 'country' | 'yard';
  time: 'day' | 'night';
  weather?: 'rain' | 'snow' | 'fog' | 'ice';
  /** Что нарисовать на сцене, см. SCENE_ITEMS. */
  items: string[];
}

export const SECTIONS: Record<number, string> = {
  7: 'Скорость и дистанция',
  8: 'Приоритеты и помехи',
  9: 'Светофоры и регулировщики',
  10: 'Сложные и провокационные ситуации',
  11: 'Зеркала и обзор',
  12: 'Ночь, дождь, снег',
  13: 'Разные ситуации',
};

/**
 * Словарь предметов сцены. Сцена режима (15.3) умеет рисовать каждый — проверка данных не пропустит
 * незнакомое слово. Кроме простых предметов есть составные:
 *   sign:3.24-40 / sign-temp:3.24-40 — знак (временный — на жёлтом фоне), после «-» число на знаке;
 *   light:red | yellow | green | off | flash-yellow | flash-red, «+arrow-right» — стрелка доп. секции;
 *   regulator:up | side | wave | chest — регулировщик.
 */
export const SCENE_ITEMS = new Set([
  // машины
  'car-behind', 'car-ahead-brake', 'car-ahead-close', 'oncoming-car', 'car-left-close', 'car-on-ring', 'car-on-road',
  'car-right-turning-right', 'car-stuck-in-crossroad', 'parked-car-own-side', 'dense-traffic', 'bus-leaving',
  'yard-exit-right-car', 'spray-ahead', 'bus-hazard', 'parked-cars', 'parked-car-oncoming-side', 'ambulance-behind',
  'car-blindspot-left', 'motorcycle-blindspot', 'car-hazard-ahead', 'car-right-waiting', 'loud-car', 'oncoming-highbeam',
  'one-way-oncoming', 'overtaking-car', 'accident-ahead', 'skid', 'reverse-parking', 'inspector-in-car',
  // места и дорога
  'equal-crossroad', 'roundabout', 'yard-exit', 'bus-stop', 'narrow-road', 'gas-station-exit', 'speed-bump', 'roadworks',
  'hill', 'curb', 'curve', 'bridge', 'pothole', 'puddle', 'dirt-road', 'no-markings', 'heavy-rain', 'fog-wall',
  // люди, велосипеды, животные
  'pedestrian-sidewalk', 'pedestrian-shoulder', 'pedestrian-dark', 'people-on-road', 'child-runout', 'child-behind-car',
  'door-opening', 'cyclist-right', 'cyclist-lane', 'animal',
]);

export const SIGN_ITEM = /^sign(-temp)?:\d+(\.\d+){1,2}(-\d+)?$/;
export const LIGHT_ITEM = /^light:(red|yellow|green|off|flash-yellow|flash-red)(\+arrow-(right|left|straight))?$/;
export const REGULATOR_ITEM = /^regulator:(up|side|wave|chest)$/;

export const isSceneItem = (item: string) =>
  SCENE_ITEMS.has(item) || SIGN_ITEM.test(item) || LIGHT_ITEM.test(item) || REGULATOR_ITEM.test(item);
