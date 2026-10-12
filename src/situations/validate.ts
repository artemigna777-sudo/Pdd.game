/**
 * Проверка данных ситуаций (data/situations/*.json): `npm run situations` и tests/situations.test.ts.
 */
import { SECTIONS, isSceneItem, type Situation } from './types.ts';

/** «ПДД 10.1», «ПДД 13.11(1)», «КоАП 12.9», «КоАП 12.15 ч. 4», «Знак 3.24», «Разметка 1.1», «ПДД, Приложение 1 (…)». */
const RULE = /^(ПДД \d+\.\d+(\(\d+\))?|ПДД, Приложение [12]( \(.+\))?|КоАП \d+\.\d+(\.\d+)?( ч\. \d+)?|Знак \d+\.\d+(\.\d+)?|Разметка \d+\.\d+(\.\d+)?|ОП \d+)$/;

const text = (v: unknown): v is string => typeof v === 'string' && v.trim() === v && v !== '';

export function validateSituations(list: Situation[], questionIds: Set<string>): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  list.forEach((s, i) => {
    const where = text(s.id) ? s.id : `#${i}`;
    const fail = (msg: string) => errors.push(`${where}: ${msg}`);
    if (!/^S\d{2}-\d{2}$/.test(s.id ?? '')) fail('id должен быть вида S07-01');
    else if (ids.has(s.id)) fail('повторяющийся id');
    ids.add(s.id);
    if (!(s.section in SECTIONS)) fail(`неизвестный раздел ${s.section}`);
    else if (Number(s.id?.slice(1, 3)) !== s.section) fail('номер раздела в id не совпадает с section');
    if (!text(s.text)) fail('нет текста');
    if (!Array.isArray(s.options) || s.options.length < 2 || s.options.length > 4) fail('нужно 2–4 варианта');
    else {
      if (!s.options.every(text)) fail('пустой вариант или пробелы по краям');
      if (new Set(s.options).size !== s.options.length) fail('повторяющиеся варианты');
      if (!Number.isInteger(s.correct) || s.correct < 0 || s.correct >= s.options.length) fail(`правильный ответ вне вариантов: ${s.correct}`);
    }
    if (!text(s.explanation)) fail('нет пояснения');
    if (!Array.isArray(s.rules) || s.rules.length === 0) fail('нет ссылки на ПДД или КоАП');
    else for (const r of s.rules) if (!RULE.test(r)) fail(`непонятная ссылка на правило: «${r}»`);
    if (!Array.isArray(s.related)) fail('нет списка похожих билетов');
    else for (const q of s.related) if (!questionIds.has(q)) fail(`похожего вопроса ${q} нет в базе`);
    if (![1, 2, 3].includes(s.level)) fail(`сложность должна быть 1–3: ${s.level}`);
    const sc = s.scene;
    if (!sc || !['city', 'highway', 'country', 'yard'].includes(sc.place)) fail('сцена: неизвестное место');
    else {
      if (!['day', 'night'].includes(sc.time)) fail('сцена: время — day или night');
      if (sc.weather !== undefined && !['rain', 'snow', 'fog', 'ice'].includes(sc.weather)) fail(`сцена: погода ${sc.weather}`);
      if (!Array.isArray(sc.items) || sc.items.length === 0) fail('сцена: нет предметов');
      else for (const it of sc.items) if (!isSceneItem(it)) fail(`сцена: незнакомый предмет «${it}»`);
    }
  });
  return errors;
}
