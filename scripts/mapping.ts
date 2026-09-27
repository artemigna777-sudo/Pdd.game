/**
 * Черновое размещение вопросов в игре (data/mapping.json).
 *
 *   npm run mapping
 *
 * Вопросы, размещённые вручную ("auto": false), не трогает. Остальным подбирает шаблон сцены
 * по теме и тексту вопроса, а параметры сцены — по ключевым словам (манёвр, сигнал светофора,
 * тёмное время суток, туман и т. п.). Такие записи помечены "auto": true: на этапе 3 их
 * пересматривают вручную, с учётом картинки билета.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { MAPS, type Chapter, type Mapping, type Placement } from '../src/world/mapping.ts';
import { TEMPLATES, type SceneParams, type TemplateId } from '../src/world/templates.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const QUESTIONS = path.join(ROOT, 'data', 'questions.json');
const MAPPING = path.join(ROOT, 'data', 'mapping.json');

const CHAPTER: Chapter = { id: 'test', title: 'Тестовый район', map: 'test' };

type Rule = [RegExp, TemplateId];

/** Шаблон по теме; внутри темы — уточнения по тексту вопроса (первое совпадение). */
const BY_TOPIC: Record<string, { rules?: Rule[]; fallback: TemplateId }> = {
  'Общие положения': { fallback: 'theory' },
  'Общие обязанности водителей': { fallback: 'theory' },
  'Дорожные знаки': { fallback: 'signs-marking' },
  'Дорожная разметка': { fallback: 'signs-marking' },
  'Сигналы светофора и регулировщика': { fallback: 'signalized' },
  'Специальные сигналы': { fallback: 'uncontrolled-equal' },
  'Указатели поворота и аварийная сигнализация': { rules: [[/аварийн/i, 'parking']], fallback: 'uncontrolled-equal' },
  'Начало движения и маневрирование': { rules: [[/автомагистрал/i, 'highway']], fallback: 'uncontrolled-equal' },
  'Расположение на проезжей части': {
    rules: [
      [/автомагистрал/i, 'highway'],
      [/вне населенн/i, 'overtaking'],
    ],
    fallback: 'signs-marking',
  },
  'Скорость движения': {
    rules: [
      [/автомагистрал/i, 'highway'],
      [/темное время/i, 'night-road'],
      [/вне населенн/i, 'overtaking'],
    ],
    fallback: 'signs-marking',
  },
  'Обгон, опережение, встречный разъезд': { fallback: 'overtaking' },
  'Остановка и стоянка': { fallback: 'parking' },
  'Проезд перекрёстков': {
    rules: [
      [/кругов/i, 'roundabout'],
      [/светофор|регулировщик/i, 'signalized'],
      [/главн|второстепенн/i, 'uncontrolled-priority'],
    ],
    fallback: 'uncontrolled-equal',
  },
  'Пешеходные переходы и остановки': { rules: [[/остановк|посадочн|трамва|автобус/i, 'bus-stop']], fallback: 'crosswalk' },
  'Железнодорожные переезды': { fallback: 'railway' },
  Автомагистрали: { fallback: 'highway' },
  'Жилые зоны': { fallback: 'signs-marking' },
  'Приоритет маршрутных ТС': { fallback: 'bus-stop' },
  'Световые приборы и звуковые сигналы': { fallback: 'night-road' },
  'Велосипедисты и мопеды': { fallback: 'signs-marking' },
  'Безопасность и техника управления': { rules: [[/туман|темное время|ночь|дожд|снег|метел|гололед/i, 'night-road']], fallback: 'theory' },
  // До мини-игр этапа 3 — в автошколе.
  Буксировка: { fallback: 'theory' },
  'Учебная езда': { fallback: 'theory' },
  'Перевозка людей и грузов': { fallback: 'theory' },
  'Неисправности и допуск ТС': { fallback: 'theory' },
  'Ответственность водителя': { fallback: 'theory' },
  'Первая помощь': { fallback: 'theory' },
};

function chooseTemplate(q: Question): TemplateId {
  const topic = BY_TOPIC[q.topic];
  if (!topic) throw new Error(`${q.id}: нет правила для темы «${q.topic}»`);
  for (const [pattern, template] of topic.rules ?? []) if (pattern.test(q.text)) return template;
  return topic.fallback;
}

/** Параметры сцены по ключевым словам в тексте вопроса. Только то, что можно понять из текста. */
function draftParams(q: Question, template: TemplateId): SceneParams {
  const text = q.text.toLowerCase().replace(/ё/g, 'е');
  const params: SceneParams = {};
  const allowed = new Set<string>(['maneuver', 'conditions', ...TEMPLATES[template].params]);
  const set = <K extends keyof SceneParams>(key: K, value: SceneParams[K]) => {
    if (allowed.has(key)) params[key] = value;
  };

  if (TEMPLATES[template].anchor === 'node') {
    if (/развернуться|разворот/.test(text)) set('maneuver', 'uturn');
    else if (/налево/.test(text)) set('maneuver', 'left');
    else if (/направо/.test(text)) set('maneuver', 'right');
    else if (/прямо|прямом направлении/.test(text)) set('maneuver', 'straight');
  }

  const conditions: NonNullable<SceneParams['conditions']> = {};
  if (/темное время|ночью|в темноте/.test(text)) conditions.time = 'night';
  if (/туман/.test(text)) conditions.weather = 'fog';
  else if (/дожд|морос/.test(text)) conditions.weather = 'rain';
  else if (/снег|метел|гололед/.test(text)) conditions.weather = 'snow';
  if (Object.keys(conditions).length) set('conditions', conditions);

  if (template === 'signalized') {
    if (/мигание зеленого|зеленый мигающ/.test(text)) set('light', 'green-blink');
    else if (/желт\S* мигающ|мигающ\S* желт|мигание желтого/.test(text)) set('light', 'yellow-blink');
    else if (/красного и желтого/.test(text)) set('light', 'red-yellow');
    if (/регулировщик/.test(text)) set('controller', 'side');
  }
  if (/проблесков|оперативн|специальн\S* (звуков|световы|сигнал)/.test(text)) set('emergency', true);
  if (template === 'railway' && /поезд/.test(text)) set('train', true);
  if (template === 'crosswalk' && /пешеход/.test(text)) set('pedestrians', 'crossing');
  if (template === 'bus-stop') {
    if (/трамва/.test(text)) set('vehicle', 'tram');
    else if (/автобус|маршрутн/.test(text)) set('vehicle', 'bus');
    if (/отъезжа|начина\S* движение/.test(text)) set('leaving', true);
  }
  if (template === 'night-road' && /дальн/.test(text)) set('highBeam', true);
  if (template === 'night-road' && !conditions.time && !conditions.weather) set('conditions', { time: 'night' });
  if (q.topic === 'Жилые зоны') set('signs', ['5.21']);
  return params;
}

const questions: Question[] = JSON.parse(readFileSync(QUESTIONS, 'utf8'));
const existing: Mapping = existsSync(MAPPING)
  ? JSON.parse(readFileSync(MAPPING, 'utf8'))
  : { chapters: [CHAPTER], questions: [] };

const manual = new Map(existing.questions.filter((p) => !p.auto).map((p) => [p.id, p]));
const map = MAPS[CHAPTER.map];
const pointFor = (template: TemplateId) => {
  const point = map.points.find((p) => p.template === template);
  if (!point) throw new Error(`На карте «${map.id}» нет точки для шаблона «${template}»`);
  return point.id;
};

const placements: Placement[] = questions.map((q) => {
  const kept = manual.get(q.id);
  if (kept) return kept;
  const template = chooseTemplate(q);
  return { id: q.id, chapter: CHAPTER.id, point: pointFor(template), template, params: draftParams(q, template), auto: true };
});

const result: Mapping = {
  chapters: existing.chapters.length ? existing.chapters : [CHAPTER],
  questions: placements,
};
// Одна строка на вопрос: файл удобно читать и сравнивать.
const lines = [
  '{',
  `  "chapters": ${JSON.stringify(result.chapters)},`,
  '  "questions": [',
  result.questions.map((p) => `    ${JSON.stringify(p)}`).join(',\n'),
  '  ]',
  '}',
];
writeFileSync(MAPPING, lines.join('\n') + '\n');

const auto = placements.filter((p) => p.auto).length;
console.log(`data/mapping.json: ${placements.length} вопросов, вручную ${placements.length - auto}, черновик ${auto}.`);
