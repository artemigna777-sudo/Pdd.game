/**
 * Проверка data/questions.json.
 *
 *   npm run validate
 *
 * У каждого вопроса должны быть: текст, минимум 2 варианта, правильный ответ в пределах
 * вариантов, существующая картинка (если указана), тема из списка. Выводит отчёт и
 * завершается с ошибкой, если что-то не так.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { TOPICS } from './topics.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const QUESTIONS = path.join(ROOT, 'data', 'questions.json');
const PUBLIC = path.join(ROOT, 'public');

const questions: Question[] = JSON.parse(readFileSync(QUESTIONS, 'utf8'));
const errors: string[] = [];
const warnings: string[] = [];
const topics = new Set<string>(TOPICS);

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const pad = (n: number) => String(n).padStart(2, '0');

const ids = new Set<string>();
const usedImages = new Set<string>();
const tickets = new Map<number, Set<number>>();

questions.forEach((q, index) => {
  const where = isNonEmptyString(q.id) ? q.id : `#${index}`;
  const fail = (msg: string) => errors.push(`${where}: ${msg}`);

  if (!isNonEmptyString(q.id)) fail('нет id');
  else if (ids.has(q.id)) fail('повторяющийся id');
  ids.add(q.id);

  if (!Number.isInteger(q.ticket) || q.ticket < 1) fail(`некорректный номер билета: ${q.ticket}`);
  if (!Number.isInteger(q.number) || q.number < 1) fail(`некорректный номер вопроса: ${q.number}`);
  if (q.id !== `B${pad(q.ticket)}-Q${pad(q.number)}`) fail(`id не совпадает с билетом ${q.ticket} и номером ${q.number}`);
  if (!tickets.has(q.ticket)) tickets.set(q.ticket, new Set());
  tickets.get(q.ticket)!.add(q.number);

  if (!isNonEmptyString(q.text)) fail('нет текста вопроса');

  if (!Array.isArray(q.options) || q.options.length < 2) {
    fail(`вариантов меньше двух: ${Array.isArray(q.options) ? q.options.length : 'нет'}`);
  } else {
    q.options.forEach((o, i) => {
      if (!isNonEmptyString(o)) fail(`пустой вариант ${i + 1}`);
    });
    if (new Set(q.options).size !== q.options.length) warnings.push(`${where}: есть одинаковые варианты`);
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
      fail(`правильный ответ (индекс ${q.correct}) вне пределов 0…${q.options.length - 1}`);
    }
  }

  if (q.image !== undefined) {
    const file = path.join(PUBLIC, q.image);
    if (!isNonEmptyString(q.image)) fail('пустой путь к картинке');
    else if (!existsSync(file)) fail(`картинка не найдена: public/${q.image}`);
    else {
      const head = readFileSync(file).subarray(0, 3);
      if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) fail(`картинка не JPEG: public/${q.image}`);
    }
    usedImages.add(q.image);
  }

  if (q.explanation !== undefined && !isNonEmptyString(q.explanation)) fail('пустое пояснение');
  if (!topics.has(q.topic)) fail(`неизвестная тема: «${q.topic}»`);
});

// Полнота билетов: во всех билетах одинаковое число вопросов, номера подряд с 1.
const perTicket = Math.max(0, ...[...tickets.values()].map((s) => s.size));
for (const [ticket, numbers] of [...tickets].sort((a, b) => a[0] - b[0])) {
  for (let n = 1; n <= perTicket; n++) {
    if (!numbers.has(n)) errors.push(`Билет ${ticket}: нет вопроса №${n}`);
  }
}

// Лишние файлы картинок, на которые никто не ссылается.
const imagesDir = path.join(PUBLIC, 'images');
if (existsSync(imagesDir)) {
  for (const file of readdirSync(imagesDir)) {
    if (!usedImages.has(`images/${file}`)) warnings.push(`public/images/${file}: картинка не используется`);
  }
}

const withImages = questions.filter((q) => q.image).length;
const byOptions = new Map<number, number>();
for (const q of questions) byOptions.set(q.options?.length ?? 0, (byOptions.get(q.options?.length ?? 0) ?? 0) + 1);
const brokenIds = new Set(errors.map((e) => e.split(':')[0]));

console.log('Проверка data/questions.json');
console.log(`  Вопросов:            ${questions.length}`);
console.log(`  Билетов:             ${tickets.size} (по ${perTicket} вопросов)`);
console.log(`  С картинками:        ${withImages}`);
console.log(`  Без картинок:        ${questions.length - withImages}`);
console.log(`  С пояснениями:       ${questions.filter((q) => q.explanation).length}`);
console.log(
  `  Число вариантов:     ${[...byOptions].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n} — ${c}`).join(', ')}`,
);
console.log(`  Тем:                 ${new Set(questions.map((q) => q.topic)).size} из ${TOPICS.length}`);
console.log(`  Вопросов с ошибками: ${brokenIds.size}`);

if (warnings.length) {
  console.log(`\nПредупреждения (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error(`\nОшибки (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nВсе вопросы в порядке.');
