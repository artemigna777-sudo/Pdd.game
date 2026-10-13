/**
 * Дуэль в реальном времени (этап 16): двое одновременно отвечают на одни и те же задания —
 * ситуации этапа 15 и вопросы из билетов. Раунд выигрывает тот, кто ответил верно и быстрее.
 *
 * Связь — через посредника на Cloudflare (stats-worker/worker.js, комната `LiveRoom`, правила —
 * stats-worker/room.js): комната по коду или ссылке, без регистрации. Посредник не знает верных
 * ответов: кто выиграл раунд, обе игры считают одинаково по своим данным (`roundWinner`).
 */
import { STATS_PROXY } from '../config.ts';

/** Раундов в дуэли и секунд на ответ. */
export const LIVE = { rounds: 7, situationSec: 12, questionSec: 20, codeLength: 5, wonCoins: 10 } as const;
/** Ответили почти одновременно (меньше этой разницы, мс) — раунд вничью. */
export const LIVE_TIE_MS = 100;

/** Буквы кода комнаты: без похожих (0/O, 1/I). */
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function liveCode(rnd: () => number = Math.random): string {
  return Array.from({ length: LIVE.codeLength }, () => CODE_ABC[Math.floor(rnd() * CODE_ABC.length)]).join('');
}

/** Код комнаты из того, что ввёл игрок: сам код, ссылка `#live=…` или сообщение со ссылкой. */
export function parseLiveCode(text: string): string | undefined {
  const fromLink = /#live=([A-Za-z0-9]+)/.exec(text)?.[1];
  const raw = (fromLink ?? text).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === LIVE.codeLength && [...raw].every((c) => CODE_ABC.includes(c)) ? raw : undefined;
}

export const hashHasLive = (hash: string): boolean => hash.startsWith('#live=');

export function liveLink(base: string, code: string): string {
  return `${base.split('#')[0]}#live=${code}`;
}

export type LiveKind = 'mix' | 'situations' | 'tickets';
export const LIVE_KINDS: { id: LiveKind; title: string }[] = [
  { id: 'mix', title: 'Вперемешку' },
  { id: 'situations', title: 'Ситуации' },
  { id: 'tickets', title: 'Билеты' },
];

export const isSituationId = (id: string): boolean => /^S\d\d-\d\d$/.test(id);

function take<T>(list: readonly T[], n: number, rnd: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Задания дуэли: ситуации (без провокаций инспектора — там два варианта) и вопросы билетов. */
export function pickLiveItems(kind: LiveKind, situations: readonly string[], questions: readonly string[], rnd: () => number = Math.random): string[] {
  const sits = situations.filter(isSituationId);
  if (kind === 'situations') return take(sits, LIVE.rounds, rnd);
  if (kind === 'tickets') return take(questions, LIVE.rounds, rnd);
  const s = take(sits, Math.ceil(LIVE.rounds / 2), rnd);
  const q = take(questions, Math.floor(LIVE.rounds / 2), rnd);
  // Через одно: ситуация, вопрос, ситуация…
  return Array.from({ length: s.length + q.length }, (_, i) => (i % 2 === 0 ? s[i / 2] : q[(i - 1) / 2]));
}

export interface LiveAnswer {
  /** Выбранный вариант (номер в исходном списке) или null — время вышло. */
  choice: number | null;
  ms: number;
}

export type RoundWinner = 0 | 1 | 'draw' | 'none';

/** Кто выиграл раунд: верно и быстрее; оба ошиблись — никто; почти одновременно — ничья. */
export function roundWinner(answers: readonly [LiveAnswer, LiveAnswer], correct: number): RoundWinner {
  const ok = answers.map((a) => a.choice === correct);
  if (ok[0] && ok[1]) {
    const d = answers[0].ms - answers[1].ms;
    return Math.abs(d) < LIVE_TIE_MS ? 'draw' : d < 0 ? 0 : 1;
  }
  if (ok[0]) return 0;
  if (ok[1]) return 1;
  return 'none';
}

/** Счёт по раундам: [мест 0, места 1]. */
export function liveScore(rounds: readonly RoundWinner[]): [number, number] {
  return [rounds.filter((r) => r === 0).length, rounds.filter((r) => r === 1).length];
}

export function liveVerdict(score: readonly [number, number], seat: 0 | 1): 'win' | 'loss' | 'draw' {
  const mine = score[seat];
  const theirs = score[1 - seat];
  return mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw';
}

// ─── Связь ─────────────────────────────────────────────────────────────────────

/** Адрес комнат: опубликованная игра — посредник; в тестах — подмена (`window.__liveBase`). */
export function liveBase(): string | undefined {
  const test = (globalThis as { __liveBase?: string }).__liveBase;
  if (test) return test;
  return (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD ? STATS_PROXY.replace(/^http/, 'ws') : undefined;
}

export type LiveServerMessage =
  | { t: 'joined'; seat: 0 | 1; names: [string, string] }
  | { t: 'start'; items: string[]; names: [string, string] }
  | { t: 'round'; i: number }
  | { t: 'answered'; i: number }
  | { t: 'reveal'; i: number; answers: [LiveAnswer, LiveAnswer] }
  | { t: 'end' }
  | { t: 'left'; seat: 0 | 1 }
  | { t: 'full' }
  | { t: 'error'; e: string };

export interface LiveSocket {
  send(msg: object): void;
  close(): void;
}

/** Подключиться к комнате. `onClose` — связь пропала (или её закрыли). */
export function connectLive(code: string, on: { message: (m: LiveServerMessage) => void; open: () => void; close: () => void }, base = liveBase()): LiveSocket | undefined {
  if (!base) return undefined;
  let ws: WebSocket;
  try {
    ws = new WebSocket(`${base}/live/${code}`);
  } catch {
    return undefined;
  }
  let closed = false;
  ws.addEventListener('open', on.open);
  ws.addEventListener('message', (e) => {
    try {
      on.message(JSON.parse(String(e.data)) as LiveServerMessage);
    } catch {
      // Испорченное сообщение пропускаем.
    }
  });
  const gone = () => {
    if (closed) return;
    closed = true;
    on.close();
  };
  ws.addEventListener('close', gone);
  ws.addEventListener('error', gone);
  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => {
      closed = true;
      ws.close();
    },
  };
}
