/**
 * Знакодекс (этап 11): альбом дорожных знаков из билетов (data/signs.json, public/signs/).
 *
 *   npm run signs
 *
 * Какие знаки есть в билетах — по разметке сцен (data/scenes.json, `params.signs`, сочетание
 * «знак + табличка» записано через «+»). Названия, картинки и описания — из открытого набора
 * pdd_russia (data/raw/pdd_russia/signs/, см. SOURCE.md); здесь они не придумываются, из
 * описаний убираются только штрафы, служебные пометки и лишние пробелы.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';
import { SIGN_GROUPS, type SignsData, type SignEntry } from '../src/signs/signs.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'data', 'raw', 'pdd_russia', 'signs');
const OUT_IMAGES = path.join(ROOT, 'public', 'signs');

/**
 * Номер в сценах → номер в наборе, когда в наборе одна запись на несколько вариантов знака
 * (1.4.1–1.4.6 — «Приближение к железнодорожному переезду», 6.21.1–6.21.2 — «Направление
 * движения к аварийному выходу»).
 */
const VARIANTS: Record<string, string> = { '1.4.1': '1.4', '1.4.3': '1.4', '6.21.2': '6.21' };

/** Знаки из билетов, которых в наборе нет: в альбом они не попадают, причина — в отчёте. */
const NOT_IN_SET: Record<string, string> = {
  '5.14': 'в наборе под номером 5.14 другой знак — «Конец полосы для велосипедистов» (5.14.3)',
  '5.14.2': 'знака «Полоса для велосипедистов» в наборе нет',
  '8.4.3': 'таблички 8.4.3 в наборе нет (есть только 8.4.3.1–8.4.3.3 без картинок)',
};

interface RawSign {
  number: string;
  title: string;
  image?: string;
  description?: string;
}

/** Описание из набора: без штрафов («Наказание…»), сносок и лишних пробелов. */
function cleanDescription(text: string): string {
  let t = text;
  for (const stop of ['Наказание', '--------', '<*>']) {
    const i = t.indexOf(stop);
    if (i >= 0) t = t.slice(0, i);
  }
  return t
    .replace(/\s+/g, ' ')
    .replace(/([.!?:;])(?=[А-ЯЁA-Z«])/g, '$1 ')
    .trim();
}

const numberKey = (n: string) => n.split('.').map(Number);
const byNumber = (a: string, b: string) => {
  const x = numberKey(a);
  const y = numberKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  return 0;
};

function main() {
  const questions: Question[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8'));
  const known = new Set(questions.map((q) => q.id));
  const scenes: Record<string, { params: { signs?: string[] } }> = JSON.parse(readFileSync(path.join(ROOT, 'data', 'scenes.json'), 'utf8'));
  const catalog: Record<string, Record<string, RawSign>> = JSON.parse(readFileSync(path.join(RAW, 'signs.json'), 'utf8'));

  // Знак → вопросы, в которых он есть.
  const uses = new Map<string, Set<string>>();
  const variants = new Map<string, Set<string>>();
  for (const [id, scene] of Object.entries(scenes)) {
    if (!known.has(id)) throw new Error(`В data/scenes.json вопрос ${id}, которого нет в базе`);
    for (const combo of scene.params.signs ?? []) {
      for (const part of combo.split('+')) {
        const number = VARIANTS[part] ?? part;
        if (!uses.has(number)) uses.set(number, new Set());
        uses.get(number)!.add(id);
        if (number !== part) {
          if (!variants.has(number)) variants.set(number, new Set());
          variants.get(number)!.add(part);
        }
      }
    }
  }

  const groupOf = new Map(SIGN_GROUPS.map((g) => [g.title, g.id]));
  const raw = new Map<string, { sign: RawSign; group: string }>();
  for (const [title, signs] of Object.entries(catalog)) {
    const group = groupOf.get(title);
    if (!group) throw new Error(`Неизвестная группа знаков в наборе: «${title}»`);
    for (const [number, sign] of Object.entries(signs)) raw.set(number, { sign, group });
  }

  rmSync(OUT_IMAGES, { recursive: true, force: true });
  mkdirSync(OUT_IMAGES, { recursive: true });
  const signs: SignEntry[] = [];
  const missing: SignsData['missing'] = [];
  const noImage: string[] = [];
  for (const number of [...uses.keys()].sort(byNumber)) {
    const ids = [...uses.get(number)!].sort();
    const found = raw.get(number);
    if (NOT_IN_SET[number] || !found) {
      missing.push({ number, questions: ids, reason: NOT_IN_SET[number] ?? 'знака нет в наборе' });
      continue;
    }
    const entry: SignEntry = { number, title: found.sign.title.trim(), group: found.group, questions: ids };
    const file = found.sign.image ? path.join(RAW, 'images', path.basename(found.sign.image)) : '';
    if (file && existsSync(file)) {
      copyFileSync(file, path.join(OUT_IMAGES, `${number}.svg`));
      entry.image = `signs/${number}.svg`;
    } else noImage.push(number);
    const text = cleanDescription(found.sign.description ?? '');
    if (text) entry.text = text;
    if (variants.has(number)) entry.variants = [...variants.get(number)!].sort(byNumber);
    signs.push(entry);
  }
  for (const number of Object.keys(NOT_IN_SET)) if (!uses.has(number)) throw new Error(`Знак ${number} из NOT_IN_SET больше не встречается в сценах`);

  // Картинки, которые больше не нужны, в data/raw не копятся.
  const used = new Set(signs.map((s) => raw.get(s.number)!.sign.image).filter(Boolean).map((p) => path.basename(p!)));
  const extra = readdirSync(path.join(RAW, 'images')).filter((f) => !used.has(f));
  if (extra.length) console.warn(`В data/raw/pdd_russia/signs/images лишние картинки: ${extra.join(', ')}`);

  const data: SignsData = {
    source: { name: 'pdd_russia', url: 'https://github.com/etspring/pdd_russia', commit: 'fa37933' },
    signs,
    missing,
  };
  writeFileSync(path.join(ROOT, 'data', 'signs.json'), JSON.stringify(data, null, 1) + '\n');

  const all = new Set(signs.flatMap((s) => s.questions));
  console.log(`Знакодекс: ${signs.length} знаков из ${uses.size} в билетах, в ${all.size} вопросах.`);
  for (const g of SIGN_GROUPS) console.log(`  ${g.title}: ${signs.filter((s) => s.group === g.id).length}`);
  const rare = (n: number) => signs.filter((s) => (n === 1 ? s.questions.length === 1 : n === 2 ? s.questions.length <= 3 && s.questions.length > 1 : s.questions.length >= 4)).length;
  console.log(`  редких ${rare(1)}, необычных ${rare(2)}, обычных ${rare(4)}`);
  if (noImage.length) console.log(`Без картинки в наборе: ${noImage.join(', ')}`);
  for (const m of missing) console.log(`Не вошёл в альбом: ${m.number} (${m.questions.join(', ')}) — ${m.reason}`);
}

main();
