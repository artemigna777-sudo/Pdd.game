/**
 * Импорт экзаменационных билетов из PDF в data/questions.json.
 *
 *   npm run import               — берёт единственный PDF из data/raw/
 *   npm run import -- путь.pdf   — явный путь к файлу
 *
 * Что делает:
 *  1. Читает текст билетов: «Билет №N» → «Вопрос №N» → текст → «Варианты ответа:» → «1. …».
 *  2. Извлекает картинки билетов (исходные JPEG байт в байт) в public/images/.
 *  3. Читает «Таблицу правильных ответов» в конце файла.
 *  4. Определяет тему каждого вопроса (в файле тем нет, см. scripts/topics.ts).
 *  5. Сверяет всё между собой и падает, если что-то потерялось.
 *  6. Пишет data/questions.json и data/import-report.md.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { readPdfImages, readPdfText, type PageImage, type PageText, type TextLine } from './lib/pdf.ts';
import { classifyTopic } from './topics.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const OUT_JSON = path.join(ROOT, 'data', 'questions.json');
const OUT_REPORT = path.join(ROOT, 'data', 'import-report.md');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');

/** Нижний колонтитул страницы (ссылка на сайт и номер страницы). */
const FOOTER_Y = 790;
/** Левая граница строк, с которых начинается вариант ответа («1. …»). */
const OPTION_X_MAX = 55;

const RE_TOC_TICKET = /^Билет №(\d+)\s*\.{3,}/;
const RE_TICKET = /^Билет №(\d+)\s*$/;
const RE_QUESTION = /^Вопрос №(\d+)\s*$/;
const RE_OPTIONS = /^Варианты ответа:\s*$/;
const RE_OPTION = /^(\d+)\.\s+(.*)$/;
const RE_ANSWERS_TITLE = /^Таблица правильных ответов\s*$/;

interface RawQuestion {
  ticket: number;
  number: number;
  page: number;
  textLines: string[];
  options: string[][];
  image?: PageImage;
}

const errors: string[] = [];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Нормализует пробелы, не трогая смысл. */
function clean(text: string): string {
  return text.replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Склеивает перенесённые строки. Дефис в конце строки внутри составного слова сохраняем без пробела. */
function joinLines(lines: string[]): string {
  let result = '';
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    if (!result) result = line;
    else if (/[A-Za-zА-Яа-яЁё]-$/.test(result)) result += line;
    else result += ' ' + line;
  }
  return result;
}

async function findPdf(): Promise<string> {
  const arg = process.argv[2];
  if (arg) return path.resolve(arg);
  const pdfs = (await readdir(RAW_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (pdfs.length !== 1) {
    throw new Error(`В ${path.relative(ROOT, RAW_DIR)} должен лежать ровно один PDF, найдено: ${pdfs.length}`);
  }
  return path.join(RAW_DIR, pdfs[0]);
}

type Event = { kind: 'line'; line: TextLine } | { kind: 'image'; image: PageImage };

function parseQuestions(pages: PageText[], images: PageImage[]) {
  const tocTickets = new Set<number>();
  const questions: RawQuestion[] = [];
  const unassignedImages: PageImage[] = [];
  const coverImages: PageImage[] = [];
  let answersPage: PageText | undefined;

  let ticket = 0;
  let current: RawQuestion | undefined;
  let state: 'none' | 'text' | 'options' = 'none';

  for (const page of pages) {
    const lines = page.lines.filter((l) => l.y < FOOTER_Y);
    if (lines.some((l) => RE_ANSWERS_TITLE.test(clean(l.text)))) {
      answersPage = page;
      break;
    }

    const events: Event[] = [
      ...lines.map((line): Event => ({ kind: 'line', line })),
      ...images.filter((i) => i.page === page.page).map((image): Event => ({ kind: 'image', image })),
    ].sort((a, b) => (a.kind === 'line' ? a.line.y : a.image.y) - (b.kind === 'line' ? b.line.y : b.image.y));

    for (const event of events) {
      if (event.kind === 'image') {
        if (!ticket) coverImages.push(event.image);
        else if (current && state === 'text' && !current.image) current.image = event.image;
        else unassignedImages.push(event.image);
        continue;
      }

      const { line } = event;
      const text = clean(line.text);
      let m: RegExpMatchArray | null;

      if ((m = text.match(RE_TOC_TICKET))) {
        tocTickets.add(Number(m[1]));
      } else if ((m = text.match(RE_TICKET))) {
        ticket = Number(m[1]);
        current = undefined;
        state = 'none';
      } else if ((m = text.match(RE_QUESTION))) {
        if (!ticket) {
          errors.push(`стр. ${page.page}: «${text}» встретился до первого билета`);
          continue;
        }
        current = { ticket, number: Number(m[1]), page: page.page, textLines: [], options: [] };
        questions.push(current);
        state = 'text';
      } else if (RE_OPTIONS.test(text)) {
        if (!current || state !== 'text') errors.push(`стр. ${page.page}: «Варианты ответа» вне вопроса`);
        state = 'options';
      } else if (current && state === 'text') {
        current.textLines.push(line.text);
      } else if (current && state === 'options') {
        m = text.match(RE_OPTION);
        if (m && line.x < OPTION_X_MAX && Number(m[1]) === current.options.length + 1) {
          current.options.push([m[2]]);
        } else if (current.options.length > 0) {
          current.options[current.options.length - 1].push(line.text);
        } else {
          errors.push(`${current.ticket}/${current.number}: строка до первого варианта: «${text}»`);
        }
      }
    }
  }

  return { tocTickets, questions, unassignedImages, coverImages, answersPage };
}

/** Таблица правильных ответов: строки «Билет №N» и 20 цифр справа от них. */
function parseAnswers(page: PageText): Map<number, number[]> {
  const answers = new Map<number, number[]>();
  const labels = page.items
    .map((item) => ({ item, m: clean(item.text).match(/^Билет №(\d+)$/) }))
    .filter((l) => l.m);

  for (const { item, m } of labels) {
    const row = page.items
      .filter((i) => i !== item && Math.abs(i.y - item.y) <= 4 && i.x > item.x)
      .sort((a, b) => a.x - b.x)
      .flatMap((i) => clean(i.text).split(' ').filter(Boolean));
    if (row.some((v) => !/^\d$/.test(v))) {
      errors.push(`Таблица ответов, билет ${m![1]}: непонятные значения ${JSON.stringify(row)}`);
    }
    answers.set(Number(m![1]), row.map(Number));
  }
  return answers;
}

async function main() {
  const pdfPath = await findPdf();
  const data = new Uint8Array(await readFile(pdfPath));
  console.log(`Читаю ${path.relative(ROOT, pdfPath)} (${(data.length / 1024 / 1024).toFixed(1)} МБ)…`);

  const [pages, images] = await Promise.all([readPdfText(data), readPdfImages(data)]);
  const { tocTickets, questions: raw, unassignedImages, coverImages, answersPage } = parseQuestions(pages, images);

  if (!answersPage) throw new Error('Не найдена «Таблица правильных ответов»');
  const answers = parseAnswers(answersPage);

  // Сколько вопросов в билете: по самой длинной строке таблицы ответов (короткие строки — ошибка ниже).
  const perTicket = Math.max(...[...answers.values()].map((a) => a.length));
  const expectedTickets = tocTickets.size ? [...tocTickets].sort((a, b) => a - b) : [...answers.keys()];

  // Полнота: каждый билет из оглавления, каждый вопрос 1..perTicket, ровно один раз.
  const seen = new Map<string, RawQuestion>();
  for (const q of raw) {
    const key = `B${pad(q.ticket)}-Q${pad(q.number)}`;
    if (seen.has(key)) errors.push(`${key}: вопрос встретился дважды (стр. ${seen.get(key)!.page} и ${q.page})`);
    seen.set(key, q);
  }
  for (const t of expectedTickets) {
    for (let n = 1; n <= perTicket; n++) {
      if (!seen.has(`B${pad(t)}-Q${pad(n)}`)) errors.push(`B${pad(t)}-Q${pad(n)}: вопрос не найден в тексте`);
    }
    const row = answers.get(t);
    if (!row) errors.push(`Билет ${t}: нет строки в таблице ответов`);
    else if (row.length !== perTicket) errors.push(`Билет ${t}: в таблице ответов ${row.length} значений вместо ${perTicket}`);
  }
  for (const image of unassignedImages) {
    errors.push(`стр. ${image.page}: картинка ${image.name} не привязана ни к одному вопросу`);
  }

  await rm(IMAGES_DIR, { recursive: true, force: true });
  await mkdir(IMAGES_DIR, { recursive: true });

  const questions: Question[] = [];
  for (const q of raw) {
    const id = `B${pad(q.ticket)}-Q${pad(q.number)}`;
    const text = joinLines(q.textLines);
    const options = q.options.map(joinLines);
    const answer = answers.get(q.ticket)?.[q.number - 1];

    if (!text) errors.push(`${id}: пустой текст вопроса`);
    if (options.length < 2) errors.push(`${id}: вариантов меньше двух (${options.length})`);
    if (answer === undefined) errors.push(`${id}: нет правильного ответа в таблице`);
    else if (answer < 1 || answer > options.length) {
      errors.push(`${id}: правильный ответ ${answer}, а вариантов ${options.length}`);
    }

    let image: string | undefined;
    if (q.image) {
      const isJpeg = q.image.filter === 'DCTDecode' && q.image.bytes[0] === 0xff && q.image.bytes[1] === 0xd8;
      if (!isJpeg) {
        errors.push(`${id}: картинка ${q.image.name} не JPEG (фильтр ${q.image.filter || 'нет'})`);
      } else {
        image = `images/b${pad(q.ticket)}q${pad(q.number)}.jpg`;
        await writeFile(path.join(ROOT, 'public', image), q.image.bytes);
      }
    }

    const question: Question = {
      id,
      ticket: q.ticket,
      number: q.number,
      text,
      ...(image ? { image } : {}),
      options,
      correct: (answer ?? 0) - 1,
      topic: '',
    };
    question.topic = classifyTopic(question);
    questions.push(question);
  }

  questions.sort((a, b) => a.ticket - b.ticket || a.number - b.number);

  const withImages = questions.filter((q) => q.image).length;
  const topics = new Map<string, number>();
  for (const q of questions) topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);

  const report = [
    '# Отчёт импорта',
    '',
    `Файл: \`${path.relative(ROOT, pdfPath)}\`, страниц: ${pages.length}.`,
    '',
    '| Показатель | Значение |',
    '|---|---|',
    `| Билетов в оглавлении | ${expectedTickets.length} |`,
    `| Вопросов в билете | ${perTicket} |`,
    `| Ожидалось вопросов | ${expectedTickets.length * perTicket} |`,
    `| Импортировано вопросов | ${questions.length} |`,
    `| Из них с картинкой | ${withImages} |`,
    `| Картинок на страницах билетов | ${raw.filter((q) => q.image).length + unassignedImages.length} |`,
    `| Картинок на обложке (пропущены) | ${coverImages.length} |`,
    `| Картинок не привязано к вопросу | ${unassignedImages.length} |`,
    `| Правильных ответов в таблице | ${[...answers.values()].reduce((s, a) => s + a.length, 0)} |`,
    `| Пояснений в файле | нет |`,
    `| Ошибок | ${errors.length} |`,
    '',
    '## Темы',
    '',
    'В исходном файле тем нет, они определены автоматически по номеру вопроса в билете и по тексту (`scripts/topics.ts`).',
    '',
    '| Тема | Вопросов |',
    '|---|---|',
    ...[...topics.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `| ${t} | ${n} |`),
    '',
    ...(errors.length ? ['## Ошибки', '', ...errors.map((e) => `- ${e}`), ''] : []),
  ].join('\n');

  await writeFile(OUT_JSON, JSON.stringify(questions, null, 2) + '\n');
  await writeFile(OUT_REPORT, report);

  console.log(report);
  console.log(`\nЗаписано: ${path.relative(ROOT, OUT_JSON)}, ${withImages} картинок в ${path.relative(ROOT, IMAGES_DIR)}/`);
  if (errors.length) {
    console.error(`\nИмпорт завершён с ошибками: ${errors.length}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
