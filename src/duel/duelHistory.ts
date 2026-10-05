/**
 * История дуэлей на телефоне: свои вызовы (ждут ответа или уже с итогом) и ответы на чужие.
 */
import type { Question } from '../data/types.ts';
import { load, save } from '../storage.ts';
import { DUEL, cleanName, duelWinner, type DuelPayload, type DuelSide } from './duel.ts';

export interface DuelRecord {
  id: string;
  /** Когда создан вызов (мс). */
  at: number;
  /** Когда запись менялась последний раз (мс): по нему сортируется история. */
  updated: number;
  /** Мой вызов ('from') или мой ответ на чужой ('to'). */
  role: 'from' | 'to';
  q: string[];
  me: DuelSide;
  /** Соперник: у своего вызова — когда пришёл ответ. */
  them?: DuelSide;
}

const KEY = 'pdd-game:duels';
export const DUEL_HISTORY_LIMIT = 100;
const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min;

function cleanSide(raw: unknown, count: number): DuelSide | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const s = raw as Partial<DuelSide>;
  if (typeof s.name !== 'string' || !cleanName(s.name) || !Array.isArray(s.answers) || s.answers.length !== count || !s.answers.every((a) => isInt(a) && a < 10) || !isInt(s.ms) || s.ms > DUEL.maxMs) return undefined;
  return { name: cleanName(s.name), answers: [...s.answers], ms: s.ms };
}

export function sanitizeDuels(raw: unknown): DuelRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: DuelRecord[] = [];
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue;
    const d = r as Partial<DuelRecord>;
    if (typeof d.id !== 'string' || !/^[0-9a-z]{6,12}$/.test(d.id) || !isInt(d.at) || (d.role !== 'from' && d.role !== 'to')) continue;
    if (!Array.isArray(d.q) || d.q.length !== DUEL.questions || !d.q.every((x) => typeof x === 'string')) continue;
    const me = cleanSide(d.me, d.q.length);
    if (!me) continue;
    const them = d.them === undefined ? undefined : cleanSide(d.them, d.q.length);
    if (d.them !== undefined && !them) continue;
    if (out.some((x) => x.id === d.id && x.role === d.role)) continue;
    out.push({ id: d.id, at: d.at, updated: isInt(d.updated) ? d.updated : d.at, role: d.role, q: [...d.q], me, ...(them ? { them } : {}) });
  }
  return out.sort((a, b) => a.updated - b.updated).slice(-DUEL_HISTORY_LIMIT);
}

let memory: DuelRecord[] | undefined;
const all = () => (memory ??= sanitizeDuels(load<unknown>(KEY, [])));

export function allDuels(): DuelRecord[] {
  return [...all()];
}

export function findDuel(id: string, role?: 'from' | 'to'): DuelRecord | undefined {
  return all().find((d) => d.id === id && (!role || d.role === role));
}

function put(record: DuelRecord): DuelRecord {
  memory = [...all().filter((d) => !(d.id === record.id && d.role === record.role)), record].slice(-DUEL_HISTORY_LIMIT);
  save(KEY, memory);
  return record;
}

/** Свой вызов создан. */
export function saveChallenge(p: DuelPayload, now: number): DuelRecord {
  return put({ id: p.id, at: p.at, updated: now, role: 'from', q: [...p.q], me: p.from });
}

/** Свой ответ на чужой вызов. */
export function saveReply(p: DuelPayload & { to: DuelSide }, now: number): DuelRecord {
  return put({ id: p.id, at: p.at, updated: now, role: 'to', q: [...p.q], me: p.to, them: p.from });
}

/**
 * Пришла ссылка с ответом на мой вызов: дописать соперника. Если вызова нет в истории (другой
 * телефон или очищены данные) — запомнить дуэль как мою, раз ссылка пришла мне.
 */
export function saveAnswerToMine(p: DuelPayload & { to: DuelSide }, now: number): DuelRecord {
  const mine = findDuel(p.id, 'from');
  return put({ id: p.id, at: p.at, updated: now, role: 'from', q: [...p.q], me: mine?.me ?? p.from, them: p.to });
}

export interface DuelStats {
  wins: number;
  losses: number;
  draws: number;
  /** Мои вызовы без ответа. */
  waiting: number;
}

export function duelStats(records: readonly DuelRecord[], byId: ReadonlyMap<string, Question>): DuelStats {
  const s: DuelStats = { wins: 0, losses: 0, draws: 0, waiting: 0 };
  for (const r of records) {
    if (!r.them) {
      s.waiting++;
      continue;
    }
    const qs = r.q.map((id) => byId.get(id));
    if (qs.some((q) => !q)) continue;
    const w = duelWinner(r.me, r.them, qs as Question[]);
    if (w === 'a') s.wins++;
    else if (w === 'b') s.losses++;
    else s.draws++;
  }
  return s;
}

/** Для тестов: забыть копию в памяти. */
export function resetDuelCache(): void {
  memory = undefined;
}
