/**
 * Размещение вопросов в игре (data/mapping.json).
 *
 *   npm run mapping
 *
 * Берёт разобранные вручную сцены вопросов (data/scenes.json: шаблон сцены или мини-игры и
 * параметры по картинке билета), раскладывает вопросы по главам (src/world/chapters.ts),
 * собирает их в серии и расставляет точки интереса на карте района каждой главы
 * (src/world/placement.ts). Результат детерминирован: повторный запуск даёт тот же файл.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { CHAPTERS, chapterOf } from '../src/world/chapters.ts';
import { MAPS, type ChapterData, type Mapping, type Placement, type SceneEntry } from '../src/world/mapping.ts';
import { makeSeries, placeSeries, type SeriesRequest } from '../src/world/placement.ts';
import { FIRST_AID_STEPS, TEMPLATE_IDS, type TemplateId } from '../src/world/templates.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const questions: Question[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8'));
const scenes: Record<string, SceneEntry> = JSON.parse(readFileSync(path.join(ROOT, 'data', 'scenes.json'), 'utf8'));

const missing = questions.filter((q) => !scenes[q.id]).map((q) => q.id);
if (missing.length) throw new Error(`В data/scenes.json нет сцен для вопросов: ${missing.join(', ')}`);

const STEP_ORDER = Object.keys(FIRST_AID_STEPS);
const stepIndex = (id: string) => STEP_ORDER.indexOf(scenes[id].params.injury ?? '');

const chapters: ChapterData[] = [];
const placements: Placement[] = [];

for (const spec of CHAPTERS) {
  const map = MAPS[spec.map];
  if (!map) throw new Error(`Глава ${spec.id}: нет карты «${spec.map}»`);
  const ids = questions.filter((q) => chapterOf(q) === spec.id).map((q) => q.id);
  const requests: SeriesRequest[] = [];
  for (const template of TEMPLATE_IDS) {
    let list = ids.filter((id) => scenes[id].template === template);
    // Аптечка: шаги помощи по порядку — от вызова скорой к конкретным травмам.
    if (template === 'first-aid') list = [...list].sort((a, b) => stepIndex(a) - stepIndex(b) || a.localeCompare(b));
    if (list.length) requests.push(...makeSeries(template as TemplateId, list));
  }
  const placed = placeSeries(map, requests);
  chapters.push({ id: spec.id, number: spec.number, title: spec.title, district: map.title, map: map.id, topics: spec.topics, points: placed.map((p) => p.point) });
  for (const { point, questions: series } of placed) {
    series.forEach((id, i) => placements.push({ id, chapter: spec.id, point: point.id, step: i + 1, template: point.template, params: scenes[id].params }));
  }
}

placements.sort((a, b) => a.id.localeCompare(b.id));
const result: Mapping = { chapters, questions: placements };

// Одна строка на точку и на вопрос: файл удобно читать и сравнивать.
const chapterLines = result.chapters.map((c) => {
  const { points, ...meta } = c;
  return [`    ${JSON.stringify(meta).slice(0, -1)},"points":[`, points.map((p) => `      ${JSON.stringify(p)}`).join(',\n'), '    ]}'].join('\n');
});
const lines = [
  '{',
  '  "chapters": [',
  chapterLines.join(',\n'),
  '  ],',
  '  "questions": [',
  result.questions.map((p) => `    ${JSON.stringify(p)}`).join(',\n'),
  '  ]',
  '}',
];
writeFileSync(path.join(ROOT, 'data', 'mapping.json'), lines.join('\n') + '\n');

for (const c of chapters) {
  const count = placements.filter((p) => p.chapter === c.id).length;
  console.log(`${c.id.padEnd(5)} ${c.title.padEnd(24)} ${String(count).padStart(3)} вопросов, ${String(c.points.length).padStart(2)} точек — ${c.district}`);
}
console.log(`data/mapping.json: ${placements.length} вопросов в ${chapters.length} главах.`);
