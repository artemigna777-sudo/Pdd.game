/**
 * Пароль автора игры для секретного экрана статистики.
 *
 * Сервера у игры нет, поэтому пароль проверяется на телефоне. В коде лежит не сам пароль, а его
 * отпечаток PBKDF2-SHA-256 со случайной солью и 150 000 повторами: по нему пароль не восстановить,
 * а перебор случайного пароля из 12 знаков занял бы годы. Сам пароль знает только Артём.
 * Верный пароль запоминается на этом телефоне (src/stats/admin.ts), вводить его нужно один раз.
 */
import { load, save } from '../storage.ts';

export interface Verifier {
  /** Соль, hex. */
  salt: string;
  /** Отпечаток пароля, hex. */
  hash: string;
  iterations: number;
}

/** Отпечаток пароля автора. Новый пароль — новые соль и отпечаток (вход на телефонах сбросится). */
export const AUTHOR: Verifier = {
  salt: 'db07cc62d59af8f3229739c47df22029',
  hash: '5aeebd35698a59a8e65dd0aea17367d820634946f96b076853946172ef0f9f01',
  iterations: 150_000,
};

/** Режим разработки Vite. В автотестах на Node `import.meta.env` нет. */
const isDev = () => Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

/** Отпечаток для проверки. В режиме разработки браузерные тесты подставляют свой (`pdd-game:author-dev`). */
export function authorVerifier(): Verifier {
  if (isDev()) {
    const dev = load<Partial<Verifier> | null>('pdd-game:author-dev', null);
    if (dev && typeof dev.salt === 'string' && typeof dev.hash === 'string' && typeof dev.iterations === 'number') {
      return { salt: dev.salt, hash: dev.hash, iterations: dev.iterations };
    }
  }
  return AUTHOR;
}

/** Метка отпечатка: вход, запомненный со старым паролем, после смены пароля не действует. */
export const verifierId = (v: Verifier = authorVerifier()): string => v.hash.slice(0, 16);

/** Пароль без регистра, пробелов и дефисов: «K7M2 Q9XA-4TPE» = «k7m2q9xa4tpe». */
export const normalizePassword = (input: string): string => input.toLowerCase().replace(/[^a-z0-9]/g, '');

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);

/** Отпечаток пароля: PBKDF2-SHA-256, 32 байта. */
export async function passwordHash(input: string, salt: string, iterations: number): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey('raw', new TextEncoder().encode(normalizePassword(input)), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations }, key, 256);
  return hex(bits);
}

/** Верный ли пароль. */
export async function passwordMatches(input: string, v: Verifier = authorVerifier()): Promise<boolean> {
  if (!normalizePassword(input)) return false;
  return (await passwordHash(input, v.salt, v.iterations)) === v.hash;
}

/**
 * Ключ автора для посредника статистики (stats-worker): тот же PBKDF2, но с другой солью. Игра
 * считает его из пароля при входе и хранит на телефоне; в посреднике он лежит секретом STATS_KEY.
 * По отпечатку пароля ключ не получить, по ключу — пароль.
 */
export const KEY_SALT = '18da0d7a2dc59d90047d1019dd5c8fc2';

/** Ключ автора из пароля (повторов столько же, сколько у отпечатка пароля). */
export const authorKey = (input: string, v: Verifier = authorVerifier()): Promise<string> => passwordHash(input, KEY_SALT, v.iterations);

/** После стольких неверных попыток подряд вход закрывается на `LOCK_MS`. */
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 60_000;
const LOCK_KEY = 'pdd-game:author-lock';

interface LockState {
  /** Неверных попыток подряд. */
  fails: number;
  /** До какого времени вход закрыт. */
  until: number;
}

const lockState = (): LockState => {
  const raw = load<Partial<LockState>>(LOCK_KEY, {});
  return { fails: typeof raw.fails === 'number' ? raw.fails : 0, until: typeof raw.until === 'number' ? raw.until : 0 };
};

/** Сколько миллисекунд ещё закрыт вход (0 — можно пробовать). */
export const lockedFor = (now = Date.now()): number => Math.max(0, lockState().until - now);

/** Запомнить попытку: верная сбрасывает счётчик, пятая неверная подряд закрывает вход на минуту. */
export function recordAttempt(ok: boolean, now = Date.now()): void {
  if (ok) return save(LOCK_KEY, { fails: 0, until: 0 });
  const fails = lockState().fails + 1;
  save(LOCK_KEY, fails >= MAX_ATTEMPTS ? { fails: 0, until: now + LOCK_MS } : { fails, until: 0 });
}
