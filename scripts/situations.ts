/**
 * Проверка ситуаций режима «Ситуации на дороге».
 *
 *   npm run situations
 *
 * Читает data/situations/*.json, выводит отчёт по разделам и завершается с ошибкой, если что-то не так.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { SECTIONS, type Situation } from '../src/situations/types.ts';
import { validateSituations } from '../src/situations/validate.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data', 'situations');

export function loadSituations(): Situation[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) as Situation[]);
}

const questions: Question[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8'));
const list = loadSituations();
const errors = validateSituations(list, new Set(questions.map((q) => q.id)));

console.log('Раздел                                 ситуаций  ур.1  ур.2  ур.3');
for (const [n, name] of Object.entries(SECTIONS)) {
  const sec = list.filter((s) => s.section === Number(n));
  if (!sec.length) continue;
  const lv = (l: number) => String(sec.filter((s) => s.level === l).length).padStart(6);
  console.log(`${n}. ${name}`.padEnd(40) + String(sec.length).padStart(7) + lv(1) + lv(2) + lv(3));
}
console.log(`Всего: ${list.length}, с похожими вопросами из билетов: ${list.filter((s) => s.related.length).length}`);
if (errors.length) {
  console.error(`\nОшибки (${errors.length}):\n` + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('Ошибок нет.');
