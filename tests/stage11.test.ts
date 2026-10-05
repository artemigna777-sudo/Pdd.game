import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Question } from '../src/data/types.ts';
import { STICKERS, buyOrSelect } from '../src/progress/garage.ts';
import { emptyProgress, recordAnswer, sanitizeProgress } from '../src/progress/progress.ts';
import { SIGN_GROUPS, claimGroup, groupStates, isOpen, openSigns, rarityOf, type SignsData } from '../src/signs/signs.ts';

const QUESTIONS: Question[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const IDS = new Set(QUESTIONS.map((q) => q.id));
const SCENES: Record<string, { params: { signs?: string[] } }> = JSON.parse(readFileSync('data/scenes.json', 'utf8'));
const DATA: SignsData = JSON.parse(readFileSync('data/signs.json', 'utf8'));
const SIGNS = DATA.signs;
const NOW = new Date(2026, 9, 5, 12).getTime();

test('альбом: каждый знак из сцен билетов — в альбоме или в списке отсутствующих в наборе', () => {
  const inScenes = new Map<string, Set<string>>();
  for (const [id, scene] of Object.entries(SCENES)) {
    for (const combo of scene.params.signs ?? []) for (const n of combo.split('+')) (inScenes.get(n) ?? inScenes.set(n, new Set()).get(n)!).add(id);
  }
  const covered = new Map<string, string[]>();
  for (const s of SIGNS) for (const n of [s.number, ...(s.variants ?? [])]) covered.set(n, s.questions);
  for (const m of DATA.missing) covered.set(m.number, m.questions);
  for (const [n, ids] of inScenes) {
    assert.ok(covered.has(n), `знака ${n} нет ни в альбоме, ни в списке отсутствующих`);
    for (const id of ids) assert.ok(covered.get(n)!.includes(id), `у знака ${n} не указан вопрос ${id}`);
  }
  // Ничего лишнего: в альбоме только знаки из билетов, вопросы — из базы.
  for (const s of SIGNS) {
    assert.ok([s.number, ...(s.variants ?? [])].some((n) => inScenes.has(n)), `знака ${s.number} нет в билетах`);
    assert.ok(s.questions.length > 0 && s.questions.every((id) => IDS.has(id)));
    assert.ok(SIGN_GROUPS.some((g) => g.id === s.group));
    assert.ok(s.title.length > 2);
    if (s.image) assert.ok(existsSync(`public/${s.image}`), `нет картинки ${s.image}`);
    assert.ok(!s.text?.includes('Наказание'), `в описании ${s.number} остался штраф`);
  }
  assert.equal(new Set(SIGNS.map((s) => s.number)).size, SIGNS.length);
  assert.ok(SIGNS.length >= 120, `знаков в альбоме: ${SIGNS.length}`);
  assert.ok(DATA.missing.length <= 5);
  assert.equal(DATA.source.name, 'pdd_russia');
});

test('редкость: из одного вопроса — редкий, из 2–3 — необычный, из 4+ — обычный', () => {
  const sign = (n: number) => ({ number: 'x', title: 'x', group: 'warning', questions: Array.from({ length: n }, (_, i) => `Q${i}`) });
  assert.deepEqual([1, 2, 3, 4, 9].map((n) => rarityOf(sign(n))), ['rare', 'uncommon', 'uncommon', 'common', 'common']);
  const counts = { rare: 0, uncommon: 0, common: 0 };
  for (const s of SIGNS) counts[rarityOf(s)]++;
  assert.ok(counts.rare > 0 && counts.uncommon > 0 && counts.common > 0);
});

test('знак открывается верным ответом на вопрос с ним; ошибка не открывает', () => {
  const data = emptyProgress();
  const sign = SIGNS.find((s) => s.questions.length >= 2)!;
  recordAnswer(data, sign.questions[0], false, NOW);
  assert.equal(isOpen(data, sign), false);
  recordAnswer(data, sign.questions[1], true, NOW);
  assert.equal(isOpen(data, sign), true);
  // Потом ошибка на том же вопросе — знак остаётся открытым.
  recordAnswer(data, sign.questions[1], false, NOW + 1);
  assert.ok(openSigns(data, SIGNS).has(sign.number));
});

test('группа: награда только за собранную группу и один раз; наклейка появляется в гараже', () => {
  const data = emptyProgress();
  const priority = SIGNS.filter((s) => s.group === 'priority');
  // Один знак оставить закрытым: остальные открыть вопросами, где его нет.
  const last = priority.find((x) => priority.every((s) => s === x || s.questions.some((id) => !x.questions.includes(id))))!;
  for (const s of priority) if (s !== last) recordAnswer(data, s.questions.find((id) => !last.questions.includes(id))!, true, NOW);
  let state = groupStates(data, SIGNS).find((g) => g.group.id === 'priority')!;
  assert.deepEqual([state.open, state.complete], [priority.length - 1, false]);
  assert.equal(claimGroup(data, SIGNS, 'priority'), undefined);
  // Наклейка группы не продаётся.
  assert.equal(buyOrSelect(data, 'diamond'), 'locked');

  recordAnswer(data, last.questions[0], true, NOW);
  state = groupStates(data, SIGNS).find((g) => g.group.id === 'priority')!;
  assert.equal(state.complete, true);
  const coins = data.coins;
  assert.deepEqual(claimGroup(data, SIGNS, 'priority'), { coins: 50, sticker: 'diamond' });
  assert.equal(data.coins, coins + 50);
  assert.equal(claimGroup(data, SIGNS, 'priority'), undefined);
  assert.equal(data.coins, coins + 50);
  assert.equal(buyOrSelect(data, 'diamond'), 'selected');
  assert.equal(data.garage.sticker, 'diamond');

  // Сохраняется и проверяется при загрузке.
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back.signs, { claimed: ['priority'] });
  assert.equal(back.garage.sticker, 'diamond');
  assert.deepEqual(sanitizeProgress({ signs: { claimed: ['a', 'a', 5] } }).signs, { claimed: ['a'] });
});

test('наклейки Знакодекса есть у четырёх групп и есть в гараже', () => {
  for (const g of SIGN_GROUPS.filter((x) => x.sticker)) {
    const sticker = STICKERS.find((s) => s.id === g.sticker);
    assert.ok(sticker, `нет наклейки ${g.sticker}`);
    assert.equal(sticker.signGroup, g.id);
  }
  assert.equal(SIGN_GROUPS.filter((g) => g.sticker).length, 4);
});
