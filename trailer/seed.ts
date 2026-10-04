/**
 * Прогресс для записи трейлера: предыдущие главы пройдены, идёт текущая, есть повторы на сегодня,
 * серия дней и «Чистая езда». Всё получено обычными функциями игры, как при настоящей игре.
 */
import { readFileSync } from 'node:fs';
import { dayStart, deliver, emptyProgress, ensureDaily, markPoint, markSeen, recordAnswer, type ChapterInfo, type ProgressData } from '../src/progress/progress.ts';

interface Mapping {
  chapters: { id: string; points: { id: string; template: string }[] }[];
  questions: { id: string; chapter: string; point: string }[];
}

export const MAPPING: Mapping = JSON.parse(readFileSync(new URL('../data/mapping.json', import.meta.url), 'utf8'));

export function chapterInfo(id: string): ChapterInfo {
  const ch = MAPPING.chapters.find((c) => c.id === id)!;
  return { id, points: ch.points.map((p) => ({ id: p.id, questions: MAPPING.questions.filter((q) => q.chapter === id && q.point === p.id).map((q) => q.id) })) };
}

const DAY = 86_400_000;

export interface SeedOptions {
  /** Текущая глава; все предыдущие пройдены. */
  current?: string;
  /** Сколько точек текущей главы пройдено (все — глава готова к доставке). */
  points?: number;
  /** Показанные сюжетные сцены текущей главы. */
  seen?: string[];
  /** Гонка с Артёмом в текущей главе идёт. */
  race?: boolean;
}

export function trailerProgress(opts: SeedOptions = {}, now = Date.now()): ProgressData {
  const { current = 'ch3', points = 8, seen = ['intro', 'race', 'race:bet'], race = true } = opts;
  const data = emptyProgress();
  const order = MAPPING.chapters.map((c) => c.id);
  const before = order.slice(0, order.indexOf(current));
  before.forEach((id, i) => {
    const info = chapterInfo(id);
    const at = now - (before.length - i + 2) * 2 * DAY;
    for (const scene of ['prologue', 'intro', 'race', 'beat1', 'beat2', 'ready']) markSeen(data, id, scene);
    for (const p of info.points) {
      for (const q of p.questions) recordAnswer(data, q, true, at);
      markPoint(data, id, p.id, at);
    }
    deliver(data, info, at + 3600_000);
  });
  const info = chapterInfo(current);
  for (const scene of seen) markSeen(data, current, scene);
  const all = points >= info.points.length;
  info.points.slice(0, points).forEach((p, i) => {
    // Пока глава идёт — три ошибки ждут повтора сегодня; готовая к доставке глава — почти без ошибок.
    p.questions.forEach((q, j) => recordAnswer(data, q, all ? !(i === 0 && j === 0) : !(i < 3 && j === 0), now - 2 * DAY));
    markPoint(data, current, p.id, now - 2 * DAY);
  });
  const state = data.chapters[current];
  if (race) {
    const answers = info.points.slice(0, points).reduce((n, p) => n + p.questions.length, 0);
    state.race = { time: all ? 2900 : 640, answers, correct: Math.round(answers * 0.92) };
  }
  if (all) {
    state.side = { step: 2, done: now - DAY };
    state.drive = { violations: 0, distance: 30_000 };
  }
  data.streak = { count: 6, best: 6, last: dayStart(now, -1) };
  data.drive = { clean: 42_000, best: 61_000, total: 95_000, violations: 2, intro: now - 9 * DAY };
  ensureDaily(data, now);
  return data;
}
