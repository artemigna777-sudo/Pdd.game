/**
 * Покрытие: каждый вопрос из data/questions.json размещён в игре ровно один раз (data/mapping.json).
 *
 *   npm run coverage
 *
 * Падает, если вопрос не размещён, размещён дважды или размещение некорректно: неизвестный
 * вопрос, глава, карта, точка, шаблон или параметры сцены; точка стоит не там, где её сцену
 * можно показать; mapping.json разошёлся с разобранными вручную сценами (data/scenes.json).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import type { CityMap, MapPoint } from '../src/world/map.ts';
import { MAPS, type Mapping, type SceneEntry } from '../src/world/mapping.ts';
import { TEMPLATES, TEMPLATE_IDS, validateParams, type TemplateId } from '../src/world/templates.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, 'data', file), 'utf8')) as T;
const questions = read<Question[]>('questions.json');
const mapping = read<Mapping>('mapping.json');
const scenes = read<Record<string, SceneEntry>>('scenes.json');

const errors: string[] = [];
const known = new Set(questions.map((q) => q.id));
const placed = new Map<string, number>();
const chapters = new Map(mapping.chapters.map((c) => [c.id, c]));

/** Можно ли показать сцену шаблона в этой точке карты. */
function checkPoint(map: CityMap, point: MapPoint): string | undefined {
  const road = map.roads.find((r) => r.id === point.road);
  if (!road) return `нет дороги «${point.road}»`;
  if (point.toward !== road.from && point.toward !== road.to) return `узел «${point.toward}» не конец дороги «${road.id}»`;
  const info = TEMPLATES[point.template];
  const node = map.nodes.find((n) => n.id === point.toward)!;
  if (info.anchor === 'node') {
    const incident = map.roads.filter((r) => r.from === node.id || r.to === node.id);
    if (point.template === 'roundabout') return node.kind === 'roundabout' ? undefined : `узел «${node.id}» не кольцо`;
    if (node.kind || incident.length !== 4) return `узел «${node.id}» — не перекрёсток четырёх дорог`;
    return undefined;
  }
  if (point.at === undefined || point.at <= 0 || point.at >= 1) return 'для сцены на дороге нужно at от 0 до 1';
  if (info.place === 'highway' && road.kind !== 'highway') return 'автомагистраль должна стоять на автомагистрали';
  if (info.place !== 'highway' && road.kind === 'highway') return 'на автомагистрали может стоять только сцена автомагистрали';
  if (info.place === 'railway') {
    const other = map.nodes.find((n) => n.id === (road.from === point.toward ? road.to : road.from))!;
    const y = other.y + (node.y - other.y) * point.at;
    if (map.railwayY === undefined || Math.abs(y - map.railwayY) > 1 || other.x !== node.x) return 'переезд должен стоять на железной дороге';
  }
  return undefined;
}

for (const chapter of mapping.chapters) {
  const map = MAPS[chapter.map];
  if (!map) {
    errors.push(`Глава «${chapter.id}»: нет карты «${chapter.map}»`);
    continue;
  }
  const ids = new Set<string>();
  const nodeKinds = new Map<string, string>();
  for (const point of chapter.points) {
    const where = `Глава ${chapter.id}, точка ${point.id}`;
    if (ids.has(point.id)) errors.push(`${where}: повторяется id`);
    ids.add(point.id);
    if (!TEMPLATE_IDS.includes(point.template)) {
      errors.push(`${where}: неизвестный шаблон «${point.template}»`);
      continue;
    }
    const problem = checkPoint(map, point);
    if (problem) errors.push(`${where}: ${problem}`);
    if (TEMPLATES[point.template].anchor === 'node') {
      // На узле со светофорами — только регулируемый перекрёсток, и наоборот.
      const kind = point.template === 'signalized' ? 'signalized' : 'other';
      if (nodeKinds.has(point.toward) && nodeKinds.get(point.toward) !== kind) errors.push(`${where}: на узле «${point.toward}» смешаны светофоры и перекрёсток без них`);
      nodeKinds.set(point.toward, kind);
    }
  }
}

for (const p of mapping.questions) {
  placed.set(p.id, (placed.get(p.id) ?? 0) + 1);
  const where = p.id;
  if (!known.has(p.id)) errors.push(`${where}: такого вопроса нет в questions.json`);
  if (!TEMPLATE_IDS.includes(p.template)) {
    errors.push(`${where}: неизвестный шаблон «${p.template}»`);
    continue;
  }
  const chapter = chapters.get(p.chapter);
  if (!chapter) {
    errors.push(`${where}: неизвестная глава «${p.chapter}»`);
    continue;
  }
  const point = chapter.points.find((pt) => pt.id === p.point);
  if (!point) errors.push(`${where}: в главе «${p.chapter}» нет точки «${p.point}»`);
  else if (point.template !== p.template) errors.push(`${where}: точка «${p.point}» — это «${point.template}», а в размещении «${p.template}»`);
  for (const problem of validateParams(p.template, p.params)) errors.push(`${where}: ${problem}`);
  const scene = scenes[p.id];
  if (!scene) errors.push(`${where}: нет сцены в data/scenes.json`);
  else if (scene.template !== p.template || JSON.stringify(scene.params) !== JSON.stringify(p.params)) {
    errors.push(`${where}: mapping.json разошёлся с data/scenes.json — запустите npm run mapping`);
  }
}

// Серии: номера по порядку, не длиннее, чем положено шаблону, пустых точек нет.
for (const chapter of mapping.chapters) {
  for (const point of chapter.points) {
    const series = mapping.questions.filter((q) => q.chapter === chapter.id && q.point === point.id).map((q) => q.step).sort((a, b) => a - b);
    const where = `Глава ${chapter.id}, точка ${point.id}`;
    if (!series.length) errors.push(`${where}: в точке нет вопросов`);
    else if (series.some((step, i) => step !== i + 1)) errors.push(`${where}: номера вопросов в серии не по порядку (${series.join(', ')})`);
    else if (series.length > TEMPLATES[point.template].series) errors.push(`${where}: ${series.length} вопросов в серии, для «${point.template}» не больше ${TEMPLATES[point.template].series}`);
  }
}

const missing = questions.filter((q) => !placed.has(q.id)).map((q) => q.id);
const duplicates = [...placed].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n} раза)`);
for (const id of missing) errors.push(`${id}: вопрос не размещён`);
for (const d of duplicates) errors.push(`${d}: вопрос размещён больше одного раза`);

// Отчёт
const coveredCount = questions.length - missing.length;
console.log('Покрытие вопросов (data/mapping.json)');
console.log(`  Вопросов в базе:  ${questions.length}`);
console.log(`  Размещено:        ${coveredCount} (${((coveredCount / questions.length) * 100).toFixed(1)}%)`);
console.log(`  Глав:             ${mapping.chapters.length}, точек на картах: ${mapping.chapters.reduce((s, c) => s + c.points.length, 0)}`);

console.log('\n  Глава                           вопросов  точек');
for (const c of mapping.chapters) {
  const count = mapping.questions.filter((q) => q.chapter === c.id).length;
  console.log(`  ${`${c.number}. ${c.title}`.padEnd(32)}${String(count).padStart(8)}${String(c.points.length).padStart(7)}`);
}

console.log('\n  Шаблон                               вопросов  точек');
for (const id of TEMPLATE_IDS) {
  const count = mapping.questions.filter((q) => q.template === id).length;
  const points = mapping.chapters.reduce((s, c) => s + c.points.filter((p) => p.template === id).length, 0);
  const tag = TEMPLATES[id as TemplateId].minigame ? ' (мини-игра)' : '';
  console.log(`  ${(TEMPLATES[id].title + tag).padEnd(37)}${String(count).padStart(8)}${String(points).padStart(7)}`);
}
if (errors.length) {
  console.error(`\nОшибки (${errors.length}):`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  if (errors.length > 50) console.error(`  … и ещё ${errors.length - 50}`);
  process.exit(1);
}
console.log('\nПокрытие 100%: каждый вопрос размещён ровно один раз.');
