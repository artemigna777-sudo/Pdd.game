/**
 * Этап 7: гонка с Артёмом, поручения персонажей, события в пути, выбор в диалогах, звук мотора.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { engineParams } from '../src/audio/cityAudio.ts';
import { RACE_COINS, acceptSide, advanceSide, raceAnswer, raceResult, raceTick, rivalProgress, settleRace, sideStatus, sideStep } from '../src/progress/race.ts';
import { emptyProgress, levelOf, sanitizeProgress, type ChapterInfo } from '../src/progress/progress.ts';
import { RIVALS, RIVAL_TIME, SIDE_QUESTS, SIDE_REWARD, raceReaction, rivalSeconds, sideDone } from '../src/story/extras.ts';
import { STORY, type Line } from '../src/story/story.ts';
import { CHAPTERS } from '../src/world/chapters.ts';
import { EVENTS, EVENT_KINDS, nextEventKind, pickEventQuestion } from '../src/world/events.ts';
import { seeded } from '../src/world/random.ts';

const QUESTIONS: { id: string; topic: string }[] = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const IDS = new Set(QUESTIONS.map((q) => q.id));

/** Глава из 10 точек по 3 вопроса. */
const chapter: ChapterInfo = { id: 'ch1', points: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, questions: [`q${i}a`, `q${i}b`, `q${i}c`] })) };

test('гонка: время и точность; итог — кто быстрее и кто точнее; монеты один раз', () => {
  const rival = RIVALS.ch1;
  const artemTime = rivalSeconds(rival, 30, 10);
  assert.equal(artemTime, Math.round((30 * RIVAL_TIME.question + 10 * RIVAL_TIME.point) * rival.pace));

  const data = emptyProgress();
  assert.equal(raceResult(data, chapter, rival), undefined, 'без ответов итога нет');
  raceTick(data, 'ch1', artemTime / 2);
  assert.equal(rivalProgress(data, chapter, rival), 0.5);
  for (let i = 0; i < 20; i++) raceAnswer(data, 'ch1', i % 10 !== 0); // 90% верных
  const r = raceResult(data, chapter, rival)!;
  assert.equal(r.you.accuracy, 90);
  assert.equal(r.faster, 'you');
  assert.equal(r.accurate, 'you');
  assert.equal(r.coins, RACE_COINS.faster + RACE_COINS.accurate);

  // Артём быстрее, ты точнее.
  raceTick(data, 'ch1', artemTime);
  const r2 = raceResult(data, chapter, rival)!;
  assert.deepEqual([r2.faster, r2.accurate], ['artem', 'you']);
  assert.equal(r2.coins, RACE_COINS.accurate);
  assert.match(raceReaction(r2.faster, r2.accurate).text, /Я быстрее/);
  // Реплика на каждый исход, в том числе на ничью.
  const outcomes = ['you', 'artem', 'tie'] as const;
  const texts = new Set(outcomes.flatMap((f) => outcomes.map((a) => raceReaction(f, a).text)));
  assert.equal(texts.size, 9);
  assert.doesNotMatch(raceReaction('tie', 'you').text, /быстрее/);

  const coins = data.coins;
  assert.equal(settleRace(data, chapter, rival, 5)?.coins, RACE_COINS.accurate);
  assert.equal(data.coins, coins + RACE_COINS.accurate);
  assert.equal(settleRace(data, chapter, rival, 6)?.coins, 0, 'второй раз монет нет');
  assert.equal(data.coins, coins + RACE_COINS.accurate);

  // После доставки гонка не идёт.
  data.chapters.ch1.delivered = 7;
  const time = data.chapters.ch1.race!.time;
  raceTick(data, 'ch1', 100);
  raceAnswer(data, 'ch1', true);
  assert.equal(data.chapters.ch1.race!.time, time);
});

test('поручение: взять → забрать → отвезти; награда один раз; прогресс переживает сохранение', () => {
  const data = emptyProgress();
  assert.equal(sideStatus(data, 'ch2'), 'none');
  acceptSide(data, 'ch2');
  assert.equal(sideStatus(data, 'ch2'), 'taken');
  assert.equal(sideStep(data, 'ch2'), 0);
  assert.deepEqual(advanceSide(data, 'ch2', 1), { done: false, coins: 0, xp: 0 });
  assert.equal(sideStep(data, 'ch2'), 1);
  const out = advanceSide(data, 'ch2', 2);
  assert.equal(out.done, true);
  assert.equal(out.coins, SIDE_REWARD.coins);
  assert.equal(data.coins, SIDE_REWARD.coins);
  assert.equal(data.xp, SIDE_REWARD.xp);
  assert.equal(levelOf(data.xp).number, 1);
  assert.equal(advanceSide(data, 'ch2', 3).coins, 0);
  assert.equal(sideStatus(data, 'ch2'), 'done');

  raceTick(data, 'ch2', 42);
  raceAnswer(data, 'ch2', true);
  const restored = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(restored.chapters.ch2.side, data.chapters.ch2.side);
  assert.deepEqual(restored.chapters.ch2.race, { time: 42, answers: 1, correct: 1 });
  // Испорченные записи отбрасываются.
  const broken = sanitizeProgress({ chapters: { ch2: { points: [], seen: [], stars: 0, race: { time: -1 }, side: { step: 9 } } } });
  assert.equal(broken.chapters.ch2.race, undefined);
  assert.equal(broken.chapters.ch2.side, undefined);
});

test('у каждой главы — гонка с Артёмом и поручение с выбором', () => {
  const choiceLines = (lines: Line[]) => lines.filter((l) => l.choices?.length);
  for (const c of CHAPTERS) {
    const rival = RIVALS[c.id];
    assert.ok(rival?.parcel, c.id);
    assert.ok(rival.accuracy > 50 && rival.accuracy < 100 && rival.pace >= 1 && rival.pace < 1.5, c.id);
    const bet = choiceLines(rival.challenge);
    assert.equal(bet.length, 1, `${c.id}: в вызове один выбор`);
    assert.deepEqual(bet[0].choices!.map((ch) => ch.value), ['bet', 'calm']);
    assert.equal(rival.challenge[rival.challenge.length - 1].choices?.length, 2, 'выбор — последней репликой');

    const quest = SIDE_QUESTS[c.id];
    assert.ok(quest?.title, c.id);
    const ask = choiceLines(quest.offer);
    assert.equal(ask.length, 1, `${c.id}: в просьбе один выбор`);
    assert.deepEqual(ask[0].choices!.map((ch) => ch.value), ['accept', 'decline']);
    assert.ok(ask[0].choices![0].reply![0].text.includes(quest.stops[0].label), 'согласие называет первую отметку');
    for (const stop of quest.stops) assert.ok(stop.label && stop.lines.length, c.id);
    assert.match(sideDone(quest).at(-1)!.text, /выполнено/);
  }
  // Места поручений не совпадают с местами доставки главы.
  for (const c of CHAPTERS) for (const stop of SIDE_QUESTS[c.id].stops) assert.notEqual(stop.label, STORY[c.id].goal);
});

test('события: вопросы — из базы; сначала ошибки, потом новые; одно и то же событие подряд не повторяется', () => {
  for (const kind of EVENT_KINDS) {
    const ev = EVENTS[kind];
    assert.ok(ev.questions.length >= 5, kind);
    for (const id of ev.questions) assert.ok(IDS.has(id), `${kind}: нет вопроса ${id}`);
    assert.equal(new Set(ev.questions).size, ev.questions.length, `${kind}: повтор`);
  }
  // Скорая — только вопросы темы «Специальные сигналы».
  const topic = new Map(QUESTIONS.map((q) => [q.id, q.topic]));
  for (const id of EVENTS.ambulance.questions) assert.equal(topic.get(id), 'Специальные сигналы');

  const rnd = seeded(3);
  const ids = EVENTS.rain.questions;
  const state = new Map<string, { ok: boolean }>(ids.map((id) => [id, { ok: true }]));
  state.set(ids[2], { ok: false });
  assert.equal(pickEventQuestion('rain', (id) => state.get(id), rnd), ids[2], 'ошибка — первой');
  state.set(ids[2], { ok: true });
  state.delete(ids[4]);
  assert.equal(pickEventQuestion('rain', (id) => state.get(id), rnd), ids[4], 'потом — не встречавшийся');
  // Только что заданный не повторяется, если есть другие.
  for (let i = 0; i < 20; i++) assert.notEqual(pickEventQuestion('rain', (id) => state.get(id), rnd, [ids[4]]), ids[4]);

  let last = nextEventKind(undefined, rnd);
  const seen = new Set([last]);
  for (let i = 0; i < 200; i++) {
    const k = nextEventKind(last, rnd);
    assert.notEqual(k, last);
    seen.add(k);
    last = k;
  }
  assert.equal(seen.size, EVENT_KINDS.length, 'случаются все события');
});

test('мотор: чем быстрее, тем выше и громче', () => {
  const stop = engineParams(0);
  const city = engineParams(150);
  const fast = engineParams(400);
  assert.ok(stop.freq < city.freq && city.freq <= fast.freq);
  assert.ok(stop.gain < city.gain && city.gain <= fast.gain);
  assert.deepEqual(engineParams(220), engineParams(1000), 'выше предела не растёт');
  assert.ok(fast.gain < 0.06, 'мотор тихий');
});

test('гонка, начатая посреди главы: Артёму засчитывается только оставшаяся часть', async () => {
  const { startRace, rivalTime } = await import('../src/progress/race.ts');
  const rival = RIVALS.ch1;
  const full = rivalSeconds(rival, 30, 10);
  const fresh = emptyProgress();
  startRace(fresh, 'ch1', 0);
  assert.equal(rivalTime(fresh, chapter, rival), full);
  const late = emptyProgress();
  startRace(late, 'ch1', 0.6);
  assert.equal(rivalTime(late, chapter, rival), Math.round(full * 0.4));
  // Повторный вызов ничего не меняет; значение переживает сохранение.
  startRace(late, 'ch1', 0);
  assert.equal(sanitizeProgress(JSON.parse(JSON.stringify(late))).chapters.ch1.race!.from, 0.6);
  // Пройденная глава — гонки нет.
  const done = emptyProgress();
  done.chapters.ch1 = { points: [], seen: [], stars: 3, delivered: 1 };
  startRace(done, 'ch1', 0.3);
  assert.equal(done.chapters.ch1.race, undefined);
});
