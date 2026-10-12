import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Question } from '../src/data/types.ts';
import { emptyProgress, sanitizeProgress } from '../src/progress/progress.ts';
import { SITUATIONS, diaryPool, diarySkills, provokeStats, runSkills, solvedCount, weakestSkill, emptySituations, finishRun, isKnown, limitFor, lockReason, optionOrder, pickRun, readMs, recordSituation, type SituationRun } from '../src/situations/run.ts';
import { sceneSvg } from '../src/situations/scene.ts';
import { OBEY, REFUSE, SKILLS, provocationSituation, type Provocation, type Situation } from '../src/situations/types.ts';
import { validateProvocations, validateSituations } from '../src/situations/validate.ts';

const QUESTIONS: Question[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const IDS = new Set(QUESTIONS.map((q) => q.id));
const LIST: Situation[] = readdirSync('data/situations')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(`data/situations/${f}`, 'utf8')));

test('ситуации: данные без ошибок, у каждой — ссылка на правила', () => {
  assert.ok(LIST.length >= 73);
  assert.deepEqual(validateSituations(LIST, IDS), []);
});

test('ситуации: проверка ловит ошибки', () => {
  const good = LIST[0];
  const bad = (patch: Partial<Situation>) => validateSituations([{ ...good, ...patch }], IDS);
  assert.match(bad({ correct: 5 }).join(), /вне вариантов/);
  assert.match(bad({ rules: [] }).join(), /нет ссылки/);
  assert.match(bad({ rules: ['где-то в правилах'] }).join(), /непонятная ссылка/);
  assert.match(bad({ related: ['B99-Q99'] }).join(), /нет в базе/);
  assert.match(bad({ scene: { ...good.scene, items: ['ufo'] } }).join(), /незнакомый предмет/);
  assert.match(bad({ section: 8 }).join(), /не совпадает/);
  assert.match(validateSituations([good, good], IDS).join(), /повторяющийся id/);
});

test('ситуации: правильный ответ не всегда на одном месте', () => {
  const places = new Set(LIST.map((s) => s.correct));
  assert.ok(places.size >= 3, 'правильные ответы стоят на одном и том же месте');
});

test('ситуации: правильный ответ не угадать по длине', () => {
  // Если верный вариант почти всегда самый длинный (или самый короткий), игрок научится угадывать.
  const rank = (s: Situation) => [...s.options].sort((a, b) => a.length - b.length).indexOf(s.options[s.correct]);
  const longest = LIST.filter((s) => rank(s) === s.options.length - 1).length;
  const shortest = LIST.filter((s) => rank(s) === 0).length;
  assert.ok(longest / LIST.length < 0.45, `верный ответ самый длинный в ${longest} из ${LIST.length}`);
  assert.ok(shortest / LIST.length < 0.45, `верный ответ самый короткий в ${shortest} из ${LIST.length}`);
});

test('ситуации: все семь разделов запроса', () => {
  assert.deepEqual([...new Set(LIST.map((s) => s.section))].sort((a, b) => a - b), [7, 8, 9, 10, 11, 12, 13]);
});

// ─── Заезд ───────────────────────────────────────────────────────────────────────


const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const NOW = new Date(2026, 9, 12, 12).getTime();

test('заезд «Спокойно»: 10 разных простых ситуаций, сначала новые и с ошибками', () => {
  const s = emptySituations();
  const run = pickRun(s, LIST, 'calm', seeded(1));
  assert.equal(run.length, SITUATIONS.perRun);
  assert.equal(new Set(run).size, run.length);
  assert.ok(run.every((x) => x.level === 1));
  // Все простые решены верно, кроме одной — она первая в очереди.
  const easy = LIST.filter((x) => x.level === 1);
  for (const x of easy) recordSituation(s, x.id, x.id !== easy[5].id, NOW);
  assert.ok(pickRun(s, LIST, 'calm', seeded(2)).includes(easy[5]));
  assert.ok(run.every((x) => limitFor(emptySituations(), 'calm', x.id) === SITUATIONS.slow));
});

test('заезд «Микс» и «Хардкор»: решённые — на 3 секунды', () => {
  const s = emptySituations();
  for (const x of LIST.slice(0, 12)) recordSituation(s, x.id, true, NOW);
  const mix = pickRun(s, LIST, 'mix', seeded(3));
  assert.equal(mix.length, 10);
  const fast = mix.filter((x) => limitFor(s, 'mix', x.id) === SITUATIONS.fast).length;
  assert.ok(fast >= 3 && fast <= 7, `быстрых ${fast}`);
  const hard = pickRun(s, LIST, 'hard', seeded(4));
  assert.equal(hard.length, 10);
  assert.ok(hard.every((x) => isKnown(s, x.id) && limitFor(s, 'hard', x.id) === SITUATIONS.fast));
  assert.equal(readMs(LIST[0], true), 1000);
  assert.ok(readMs(LIST[0], false) >= 1500 && readMs(LIST[0], false) <= 5000);
});

test('ступени открываются по очереди', () => {
  const s = emptySituations();
  assert.match(lockReason(s, 'mix')!, /7 верными/);
  const run = (stage: SituationRun['stage'], right: number): SituationRun => ({
    at: NOW,
    stage,
    answers: LIST.slice(0, 10).map((x, i) => ({ id: x.id, choice: i < right ? x.correct : null, correct: i < right, ms: 1000, limit: 10, penalty: i < right ? 0 : x.penalty })),
  });
  assert.equal(finishRun(s, run('calm', 6)).unlocked, undefined);
  const out = finishRun(s, run('calm', 7));
  assert.equal(out.unlocked, 'mix');
  assert.equal(out.coins, 7);
  // «Хардкор» — только когда решено 10 разных ситуаций.
  for (const x of LIST.slice(0, 9)) recordSituation(s, x.id, true, NOW);
  assert.equal(finishRun(s, run('mix', 9)).unlocked, undefined);
  assert.match(lockReason(s, 'hard')!, /сейчас 9/);
  recordSituation(s, LIST[9].id, true, NOW);
  assert.equal(finishRun(s, run('mix', 8)).unlocked, 'hard');
  assert.deepEqual(s.open, ['calm', 'mix', 'hard']);
  assert.equal(lockReason(s, 'hard'), undefined);
});

test('варианты перемешиваются, ситуации хранятся в прогрессе и переживают проверку', () => {
  const order = optionOrder(LIST[0], seeded(5));
  assert.deepEqual([...order].sort(), [0, 1, 2]);
  const data = emptyProgress();
  data.modes = { situations: emptySituations() };
  recordSituation(data.modes.situations!, 'S07-01', false, NOW);
  recordSituation(data.modes.situations!, 'S07-01', true, NOW + 1);
  finishRun(data.modes.situations!, { at: NOW, stage: 'calm', answers: [{ id: 'S07-01', choice: null, correct: false, ms: 10000, limit: 10, penalty: 3 }] });
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back.modes?.situations, data.modes.situations);
  // Испорченные записи отбрасываются, ступень «Спокойно» открыта всегда.
  const bad = sanitizeProgress({ modes: { situations: { seen: { 'S07-01': { n: 2, right: 5, wrong: 0, ok: true, at: 1 }, x: {} }, open: ['hard'], runs: [{ at: 1, stage: 'boss', answers: [] }] } } });
  assert.deepEqual(bad.modes?.situations, { seen: {}, open: ['calm', 'hard'], runs: [] });
  // Ответы на ситуации не трогают прогресс вопросов из билетов.
  assert.deepEqual(back.questions, {});
});

test('сцены: каждая ситуация рисуется, знаки берутся из картинок набора', () => {
  for (const x of LIST) {
    const svg = sceneSvg(x.scene, '/base/');
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), x.id);
    assert.doesNotMatch(svg, /undefined|NaN/, x.id);
    for (const m of svg.matchAll(/href="\/base\/signs\/([\d.]+)\.svg"/g)) assert.ok(existsSync(`public/signs/${m[1]}.svg`), `${x.id}: нет картинки знака ${m[1]}`);
  }
  // У двух сцен на одной странице — разные id градиентов.
  const a = sceneSvg(LIST[0].scene);
  const b = sceneSvg(LIST[0].scene);
  assert.notEqual(a.match(/id="glare-[^"]+"/)![0], b.match(/id="glare-[^"]+"/)![0]);
});

test('штрафные баллы: грубая — 7, средняя — 3, мелкая — 1; от 7 — «не сдал»', () => {
  const by = (p: number) => LIST.filter((x) => x.penalty === p);
  for (const p of [1, 3, 7]) assert.ok(by(p).length >= 5, `ошибок на ${p} балл(а) мало`);
  // Грубые: светофоры, регулировщики и «уступи дорогу» — все.
  assert.ok(LIST.filter((x) => x.section === 9).every((x) => x.penalty === 7));
  const s = emptySituations();
  const answer = (x: Situation, ok: boolean) => ({ id: x.id, choice: ok ? x.correct : null, correct: ok, ms: 1000, limit: 10, penalty: ok ? 0 : x.penalty });
  const two3 = by(3).slice(0, 2);
  const one1 = by(1)[0];
  // 3 + 3 = 6 — сдал бы; ещё мелкая — 7, не сдал.
  let out = finishRun(s, { at: NOW, stage: 'calm', answers: [...two3.map((x) => answer(x, false)), answer(LIST[0], true)] });
  assert.equal(out.points, 6);
  assert.equal(out.passed, true);
  out = finishRun(s, { at: NOW, stage: 'calm', answers: [...two3.map((x) => answer(x, false)), answer(one1, false)] });
  assert.equal(out.points, 7);
  assert.equal(out.passed, false);
  assert.equal(finishRun(s, { at: NOW, stage: 'calm', answers: [answer(by(7)[0], false)] }).passed, false);
  // Баллы переживают проверку сохранённых данных; у верного ответа баллов нет.
  const back = sanitizeProgress({ modes: { situations: { seen: {}, open: ['calm'], runs: [{ at: 1, stage: 'calm', answers: [answer(by(7)[0], false), { ...answer(LIST[0], true), penalty: 5 }] }] } } });
  assert.deepEqual(back.modes?.situations?.runs[0].answers.map((a) => a.penalty), [7, 0]);
});

// ─── Провокации инспектора ───────────────────────────────────────────────────────

const PROVOKE: Provocation[] = JSON.parse(readFileSync('data/situations/provoke/provocations.json', 'utf8'));

test('провокации: данные без ошибок, есть и законные команды, и «нельзя»', () => {
  assert.deepEqual(validateProvocations(PROVOKE, IDS), []);
  const obey = PROVOKE.filter((p) => p.obey).length;
  assert.ok(obey >= 4 && PROVOKE.length - obey >= 8, `законных ${obey} из ${PROVOKE.length}`);
  assert.match(validateProvocations([{ ...PROVOKE[0], scene: { ...PROVOKE[0].scene, items: ['solid-center'] } }], IDS).join(), /нет инспектора/);
  for (const p of PROVOKE) assert.doesNotMatch(sceneSvg(p.scene), /undefined|NaN/, p.id);
});

test('провокации: в карточке «Выполняю» и «Нельзя», отказ от законной команды — мелкая ошибка', () => {
  const legal = provocationSituation(PROVOKE.find((p) => p.obey)!);
  const trap = PROVOKE.find((p) => !p.obey && p.penalty === 7)!;
  assert.deepEqual(legal.options, [OBEY, REFUSE]);
  assert.equal(legal.correct, 0);
  assert.equal(legal.penalty, 1);
  assert.equal(provocationSituation(trap).correct, 1);
  assert.equal(provocationSituation(trap).penalty, 7);
  assert.match(provocationSituation(trap).text, /Инспектор: «.+»$/);
});

test('провокации: оцениваются отдельно и не открывают ступени', () => {
  const s = emptySituations();
  const list = PROVOKE.map(provocationSituation);
  const run = pickRun(s, list, 'provoke', seeded(7));
  assert.equal(run.length, 10);
  assert.equal(limitFor(s, 'provoke', run[0].id), SITUATIONS.slow);
  for (const x of run) recordSituation(s, x.id, true, NOW);
  const out = finishRun(s, { at: NOW, stage: 'provoke', answers: run.map((x) => ({ id: x.id, choice: x.correct, correct: true, ms: 1000, limit: 10, penalty: 0 })) });
  assert.equal(out.unlocked, undefined);
  assert.deepEqual(s.open, ['calm']);
  assert.equal(solvedCount(s), 0, 'провокации не считаются решёнными ситуациями');
  assert.deepEqual(provokeStats(s), { runs: 1, best: 10, last: { right: 10, total: 10 } });
  assert.equal(lockReason(s, 'provoke'), undefined);
  // Ответы на провокации переживают проверку сохранённых данных; «provoke» не попадает в открытые ступени.
  const back = sanitizeProgress(JSON.parse(JSON.stringify({ modes: { situations: { ...s, open: ['calm', 'provoke'] } } })));
  assert.equal(Object.keys(back.modes!.situations!.seen).length, 10);
  assert.deepEqual(back.modes!.situations!.open, ['calm']);
});

// ─── Статистика и «Дневник водителя» ─────────────────────────────────────────────

test('навыки: у каждого навыка несколько ситуаций', () => {
  for (const skill of Object.keys(SKILLS)) assert.ok(LIST.filter((x) => x.skill === skill).length >= (skill === 'inspector' ? 3 : 4), skill);
});

test('статистика заезда: навыки, время, самый слабый навык', () => {
  const byId = new Map(LIST.map((x) => [x.id, x]));
  const people = LIST.filter((x) => x.skill === 'people').slice(0, 3);
  const signals = LIST.filter((x) => x.skill === 'signals').slice(0, 2);
  const run = {
    at: NOW,
    stage: 'calm' as const,
    answers: [
      ...people.map((x, i) => ({ id: x.id, choice: i ? null : x.correct, correct: !i, ms: 3000, limit: 10, penalty: i ? x.penalty : 0 })),
      ...signals.map((x) => ({ id: x.id, choice: x.correct, correct: true, ms: 1000, limit: 10, penalty: 0 })),
    ],
  };
  const stats = runSkills(run, byId);
  assert.deepEqual(stats.find((x) => x.skill === 'people'), { skill: 'people', right: 1, total: 3, ms: 3000 });
  assert.deepEqual(stats.find((x) => x.skill === 'signals'), { skill: 'signals', right: 2, total: 2, ms: 1000 });
  assert.equal(weakestSkill(stats)?.skill, 'people');
  assert.equal(weakestSkill(stats.filter((x) => x.skill === 'signals')), undefined);
});

test('дневник водителя: копит ошибки по навыкам и предлагает повторить именно их', () => {
  const s = emptySituations();
  const [a, b, c, d] = LIST.filter((x) => x.skill === 'mirrors');
  recordSituation(s, a.id, false, NOW); // последний ответ неверный
  recordSituation(s, b.id, false, NOW);
  recordSituation(s, b.id, false, NOW + 1);
  recordSituation(s, b.id, true, NOW + 2); // исправил, но ошибок больше
  recordSituation(s, c.id, true, NOW); // всё верно — не повторять
  recordSituation(s, d.id, false, NOW);
  recordSituation(s, d.id, true, NOW + 1); // поровну — не повторять
  assert.deepEqual(diaryPool(s, LIST).map((x) => x.id), [a.id, b.id]);
  const diary = diarySkills(s, LIST);
  assert.deepEqual(diary, [{ skill: 'mirrors', right: 3, total: 7 }]);
  const run = pickRun(s, LIST, 'diary', seeded(9));
  assert.deepEqual(run.map((x) => x.id).sort(), [a.id, b.id].sort());
  // «Повторить слабое» ступени не открывает.
  finishRun(s, { at: NOW, stage: 'diary', answers: run.map((x) => ({ id: x.id, choice: x.correct, correct: true, ms: 1000, limit: 10, penalty: 0 })) });
  assert.deepEqual(s.open, ['calm']);
});
