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
  /** Штрафные баллы за неверный ответ, как на практическом экзамене: 7 — грубая ошибка, 3 — средняя, 1 — мелкая. */
  penalty: Penalty;
  /** Что проверяет ситуация — для статистики заезда и «Дневника водителя». */
  skill: Skill;
  /** Что сказать голосом инспектора (у провокаций — его команда). */
  speech?: string;
}

export type Skill = 'speed' | 'distance' | 'priority' | 'signals' | 'people' | 'mirrors' | 'weather' | 'control' | 'surprise' | 'inspector';

/** Навыки: название и совет, что повторить, если здесь ошибки. */
export const SKILLS: Record<Skill, { title: string; icon: string; advice: string }> = {
  priority: { title: 'Кто кому уступает', icon: '🔀', advice: 'перечитай правила проезда перекрёстков, выезда со двора и встречного разъезда (разделы 8, 11, 13 ПДД)' },
  signals: { title: 'Светофоры и регулировщики', icon: '🚦', advice: 'повтори значения сигналов светофора и жестов регулировщика (раздел 6 ПДД)' },
  people: { title: 'Пешеходы и велосипедисты', icon: '🚸', advice: 'чаще снижай скорость у переходов, остановок и припаркованных машин — пешеход может появиться внезапно' },
  mirrors: { title: 'Зеркала и обзор', icon: '🪞', advice: 'перед каждым манёвром: зеркало, взгляд через плечо, поворотник — и только потом руль' },
  distance: { title: 'Дистанция и интервал', icon: '↕️', advice: 'держи хотя бы 2 секунды до машины впереди, в дождь и гололёд — больше' },
  speed: { title: 'Скорость и знаки', icon: '⏱', advice: 'следи за знаками ограничения и снижай скорость заранее и плавно' },
  weather: { title: 'Ночь и непогода', icon: '🌧', advice: 'повтори правила световых приборов и выбор скорости по видимости (разделы 10 и 19 ПДД)' },
  control: { title: 'Управление машиной', icon: '🛞', advice: 'потренируй горку, гололёд и занос — тормози до поворота, рули плавно' },
  surprise: { title: 'Неожиданности', icon: '⚠️', advice: 'при любой неожиданности — тормози в своей полосе, без резких выездов на встречную' },
  inspector: { title: 'Инспектор и экзамен', icon: '👮', advice: 'помни: знаки и разметку отменяет только регулировщик, а не команда в машине' },
};

export type Penalty = 1 | 3 | 7;

/**
 * Штрафные баллы практического экзамена в ГИБДД (регламент МВД № 80 в редакции с 1 апреля 2024):
 * экзамен не сдан, если набрано 7 баллов и больше. В настоящем экзаменационном листе есть ещё
 * ошибки на 2 и 4 балла; в игре — три ступени: грубая, средняя, мелкая.
 */
export const PENALTY_FAIL = 7;
export const PENALTY_LABEL: Record<Penalty, string> = { 7: 'грубая ошибка', 3: 'средняя ошибка', 1: 'мелкая ошибка' };

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
  'hill', 'curb', 'solid-center', 'player-blinker', 'crosswalk', 'median-gap', 'wide-road', 'player-hazard', 'warning-triangle', 'yard-left', 'curve', 'bridge', 'pothole', 'puddle', 'dirt-road', 'no-markings', 'heavy-rain', 'fog-wall',
  // люди, велосипеды, животные
  'pedestrian-sidewalk', 'pedestrian-shoulder', 'pedestrian-dark', 'people-on-road', 'child-runout', 'child-behind-car',
  'door-opening', 'cyclist-right', 'cyclist-lane', 'animal', 'pedestrian-crossing', 'pedestrian-right-crossing',
]);

export const SIGN_ITEM = /^sign(-temp)?:\d+(\.\d+){1,2}(-\d+)?$/;
export const LIGHT_ITEM = /^light:(red|yellow|green|off|flash-yellow|flash-red)(\+arrow-(right|left|straight))?$/;
export const REGULATOR_ITEM = /^regulator:(up|side|wave|chest)$/;

export const isSceneItem = (item: string) =>
  SCENE_ITEMS.has(item) || SIGN_ITEM.test(item) || LIGHT_ITEM.test(item) || REGULATOR_ITEM.test(item);

/**
 * «Провокация инспектора» (этап 15): в машине на экзамене инспектор даёт команду, а игрок решает —
 * выполнять или сказать «нельзя». Формат data/situations/provoke/provocations.json.
 */
export interface Provocation {
  /** Например "P-01". */
  id: string;
  /** Где ты сейчас. */
  context: string;
  /** Что говорит инспектор (читается вслух). */
  command: string;
  /** true — команда законная, её нужно выполнять; false — правильно сказать «нельзя». */
  obey: boolean;
  explanation: string;
  rules: string[];
  related: string[];
  scene: SituationScene;
  penalty: Penalty;
}

export const OBEY = 'Выполняю';
export const REFUSE = 'Нельзя, так не поеду';

/** Провокация в виде ситуации для карточки: варианты «Выполняю» и «Нельзя». */
export function provocationSituation(p: Provocation): Situation {
  return {
    id: p.id,
    section: 10,
    text: `${p.context} Инспектор: «${p.command}»`,
    options: [OBEY, REFUSE],
    correct: p.obey ? 0 : 1,
    explanation: p.explanation,
    rules: p.rules,
    related: p.related,
    scene: p.scene,
    level: 1,
    // Отказ от законной команды — мелкая ошибка, выполнение незаконной — по тяжести нарушения.
    penalty: p.obey ? 1 : p.penalty,
    skill: 'inspector',
    speech: p.command,
  };
}
