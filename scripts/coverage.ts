/**
 * Покрытие: каждый вопрос из data/questions.json размещён в игре ровно один раз (data/mapping.json).
 *
 *   npm run coverage
 *
 * Падает, если вопрос не размещён, размещён дважды или размещение некорректно: неизвестный
 * вопрос, глава, точка на карте, шаблон или параметры сцены.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { MAPS, type Mapping } from '../src/world/mapping.ts';
import { TEMPLATES, TEMPLATE_IDS, validateParams, type TemplateId } from '../src/world/templates.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const questions: Question[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8'));
const mapping: Mapping = JSON.parse(readFileSync(path.join(ROOT, 'data', 'mapping.json'), 'utf8'));

const errors: string[] = [];
const known = new Set(questions.map((q) => q.id));
const placed = new Map<string, number>();
const chapters = new Map(mapping.chapters.map((c) => [c.id, c]));

for (const chapter of mapping.chapters) {
  if (!MAPS[chapter.map]) errors.push(`Глава «${chapter.id}»: нет карты «${chapter.map}»`);
}

for (const p of mapping.questions) {
  placed.set(p.id, (placed.get(p.id) ?? 0) + 1);
  const where = `${p.id}`;
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
  const point = MAPS[chapter.map]?.points.find((pt) => pt.id === p.point);
  if (!point) errors.push(`${where}: на карте «${chapter.map}» нет точки «${p.point}»`);
  else if (point.template !== p.template) {
    errors.push(`${where}: точка «${p.point}» — это «${point.template}», а в размещении «${p.template}»`);
  }
  for (const problem of validateParams(p.template, p.params)) errors.push(`${where}: ${problem}`);
  if (typeof p.auto !== 'boolean') errors.push(`${where}: поле auto должно быть true или false`);
}

const missing = questions.filter((q) => !placed.has(q.id)).map((q) => q.id);
const duplicates = [...placed].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n} раза)`);
for (const id of missing) errors.push(`${id}: вопрос не размещён`);
for (const d of duplicates) errors.push(`${d}: вопрос размещён больше одного раза`);

// Отчёт
const byTemplate = new Map<TemplateId, { total: number; manual: number }>();
for (const id of TEMPLATE_IDS) byTemplate.set(id, { total: 0, manual: 0 });
for (const p of mapping.questions) {
  const row = byTemplate.get(p.template);
  if (!row) continue;
  row.total++;
  if (!p.auto) row.manual++;
}
const coveredCount = questions.length - missing.length;
const manualCount = mapping.questions.filter((p) => !p.auto).length;

console.log('Покрытие вопросов (data/mapping.json)');
console.log(`  Вопросов в базе:        ${questions.length}`);
console.log(`  Размещено:              ${coveredCount} (${((coveredCount / questions.length) * 100).toFixed(1)}%)`);
console.log(`  Подобрано вручную:      ${manualCount}`);
console.log(`  Черновик по темам:      ${mapping.questions.length - manualCount}`);
console.log(`  Глав:                   ${mapping.chapters.length}`);
console.log('\n  Шаблон                              всего  вручную');
for (const [id, row] of byTemplate) {
  console.log(`  ${TEMPLATES[id].title.padEnd(36)}${String(row.total).padStart(5)}${String(row.manual).padStart(9)}`);
}
const emptyTemplates = [...byTemplate].filter(([, row]) => row.total === 0).map(([id]) => id);
if (emptyTemplates.length) console.log(`\n  Шаблоны без вопросов: ${emptyTemplates.join(', ')}`);

if (errors.length) {
  console.error(`\nОшибки (${errors.length}):`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  if (errors.length > 50) console.error(`  … и ещё ${errors.length - 50}`);
  process.exit(1);
}
console.log('\nПокрытие 100%: каждый вопрос размещён ровно один раз.');
