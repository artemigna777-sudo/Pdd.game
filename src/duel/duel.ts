/**
 * Дуэль (этап 10): 10 вопросов на скорость и ссылка-вызов другу. Сервера нет — вопросы, имя и
 * результат зашифрованы прямо в ссылке (`#duel=…`). Друг отвечает на те же вопросы, а его
 * ответная ссылка несёт оба результата, чтобы автор вызова тоже увидел итог.
 *
 * Дуэль «на честность»: ссылку можно подделать, но ни прогресс, ни награды от неё не зависят.
 */
import type { Question } from '../data/types.ts';

export const DUEL = {
  /** Вопросов в дуэли. */
  questions: 10,
  /** Самое длинное имя в ссылке. */
  nameMax: 20,
  /** Разница во времени меньше этой — ничья по времени (мс). */
  tieMs: 1000,
  /** Время дуэли больше этого считается испорченным (мс): 10 часов. */
  maxMs: 36_000_000,
} as const;

/** Результат одного игрока: имя, выбранные варианты по порядку вопросов, время (мс). */
export interface DuelSide {
  name: string;
  answers: number[];
  ms: number;
}

export interface DuelPayload {
  /** Идентификатор дуэли: по нему ответ находит вызов в истории. */
  id: string;
  /** Когда создан вызов (мс). */
  at: number;
  /** id вопросов по порядку. */
  q: string[];
  /** Автор вызова. */
  from: DuelSide;
  /** Ответивший — есть только в ответной ссылке. */
  to?: DuelSide;
}

/** Компактный вид в ссылке. */
interface Wire {
  v: 1;
  i: string;
  t: number;
  q: number[];
  f: [string, string, number];
  r?: [string, string, number];
}

const ID_RE = /^B(\d{2})-Q(\d{2})$/;

/** Номер вопроса в ссылке: (билет − 1) × 20 + (вопрос − 1). */
export function questionIndex(id: string): number {
  const m = ID_RE.exec(id);
  if (!m) throw new Error(`Неизвестный вопрос ${id}`);
  return (Number(m[1]) - 1) * 20 + Number(m[2]) - 1;
}

export function questionId(index: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `B${pad(Math.floor(index / 20) + 1)}-Q${pad((index % 20) + 1)}`;
}

/** Имя для ссылки: без переносов и лишних пробелов, не длиннее DUEL.nameMax. */
export function cleanName(name: string): string {
  return [...name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, DUEL.nameMax).join('').trim();
}

/** Новый идентификатор дуэли. */
export function newDuelId(rnd: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += Math.floor(rnd() * 36).toString(36);
  return id;
}

/** 10 разных вопросов из базы. */
export function pickDuelQuestions(ids: readonly string[], rnd: () => number = Math.random, count: number = DUEL.questions): string[] {
  const pool = [...ids];
  const out: string[] = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rnd() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const sideWire = (s: DuelSide): [string, string, number] => [cleanName(s.name) || 'Игрок', s.answers.join(''), Math.round(s.ms)];

/** Зашифровать дуэль для ссылки. */
export function encodeDuel(p: DuelPayload): string {
  const wire: Wire = { v: 1, i: p.id, t: Math.round(p.at), q: p.q.map(questionIndex), f: sideWire(p.from), ...(p.to ? { r: sideWire(p.to) } : {}) };
  return toBase64Url(new TextEncoder().encode(JSON.stringify(wire)));
}

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function parseSide(raw: unknown, count: number): DuelSide | undefined {
  if (!Array.isArray(raw) || raw.length !== 3) return undefined;
  const [name, answers, ms] = raw;
  if (typeof name !== 'string' || typeof answers !== 'string' || !/^\d+$/.test(answers) || answers.length !== count || !isInt(ms, 0, DUEL.maxMs)) return undefined;
  const clean = cleanName(name);
  if (!clean) return undefined;
  return { name: clean, answers: [...answers].map(Number), ms };
}

/** Разобрать дуэль из ссылки; испорченная или чужая — undefined. */
export function decodeDuel(text: string): DuelPayload | undefined {
  let wire: Partial<Wire>;
  try {
    wire = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(text.trim())));
  } catch {
    return undefined;
  }
  if (typeof wire !== 'object' || wire === null || wire.v !== 1) return undefined;
  if (typeof wire.i !== 'string' || !/^[0-9a-z]{6,12}$/.test(wire.i) || !isInt(wire.t, 0, Number.MAX_SAFE_INTEGER)) return undefined;
  const q = wire.q;
  if (!Array.isArray(q) || q.length !== DUEL.questions || !q.every((n) => isInt(n, 0, 9999)) || new Set(q).size !== q.length) return undefined;
  const from = parseSide(wire.f, q.length);
  if (!from) return undefined;
  const to = wire.r === undefined ? undefined : parseSide(wire.r, q.length);
  if (wire.r !== undefined && !to) return undefined;
  return { id: wire.i, at: wire.t, q: q.map(questionId), from, ...(to ? { to } : {}) };
}

/** Найти дуэль в адресе страницы (`#duel=…`). */
export function duelFromHash(hash: string): DuelPayload | undefined {
  const m = /^#duel=([A-Za-z0-9_-]+)$/.exec(hash);
  return m ? decodeDuel(m[1]) : undefined;
}

/**
 * Найти ссылку на дуэль в любом тексте: сообщение друга целиком, сама ссылка или только `#duel=…`.
 * Нужно, чтобы перенести вызов из браузера в игру на главном экране через буфер обмена.
 */
export function duelHashInText(text: string): string | undefined {
  const m = /#duel=([A-Za-z0-9_-]+)/.exec(text);
  return m ? `#duel=${m[1]}` : undefined;
}

/** Есть ли в адресе дуэль (даже испорченная) — чтобы сказать игроку, что ссылка не открылась. */
export const hashHasDuel = (hash: string): boolean => hash.startsWith('#duel=');

/** Ссылка на дуэль. */
export function duelLink(base: string, p: DuelPayload): string {
  return `${base.split('#')[0]}#duel=${encodeDuel(p)}`;
}

/** Все вопросы дуэли есть в базе, и выбранные варианты существуют. */
export function resolveDuel(p: DuelPayload, byId: ReadonlyMap<string, Question>): Question[] | undefined {
  const list = p.q.map((id) => byId.get(id));
  if (list.some((q) => !q)) return undefined;
  const qs = list as Question[];
  const fits = (s?: DuelSide) => !s || s.answers.every((a, i) => a < qs[i].options.length);
  return fits(p.from) && fits(p.to) ? qs : undefined;
}

/** Сколько верных ответов. */
export function duelScore(side: DuelSide, questions: readonly Question[]): number {
  return side.answers.filter((a, i) => a === questions[i]?.correct).length;
}

/** Кто победил: больше верных, при равенстве — быстрее; разница меньше секунды — ничья. */
export function duelWinner(a: DuelSide, b: DuelSide, questions: readonly Question[]): 'a' | 'b' | 'draw' {
  const sa = duelScore(a, questions);
  const sb = duelScore(b, questions);
  if (sa !== sb) return sa > sb ? 'a' : 'b';
  if (Math.abs(a.ms - b.ms) < DUEL.tieMs) return 'draw';
  return a.ms < b.ms ? 'a' : 'b';
}

/** «2:13» — время дуэли. */
export function duelTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 3600 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 3600)} ч ${Math.floor((s % 3600) / 60)} мин`;
}
