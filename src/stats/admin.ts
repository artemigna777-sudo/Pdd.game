/**
 * Секретный вход автора игры в статистику и «не считать мои заходы».
 * Хранится только на телефоне автора (в резервную копию не попадает).
 * Вход действует, только если пароль был введён для нынешнего отпечатка (src/stats/author.ts).
 */
import { load, save } from '../storage.ts';
import { verifierId } from './author.ts';

export interface AdminState {
  /** Вход открыт на этом телефоне: 7 касаний по «Версия игры» и верный пароль. */
  unlocked: boolean;
  /** Ключ автора для посредника статистики (из пароля); пусто — входили до посредника. */
  key: string;
  /** Не считать заходы с этого телефона. */
  selfIgnore: boolean;
}

interface Stored {
  unlocked?: boolean;
  /** Метка отпечатка пароля, с которым открыт вход. */
  verified?: string;
  key?: string;
  selfIgnore?: boolean;
}

const KEY = 'pdd-game:admin';

export function adminState(): AdminState {
  const raw = load<Stored>(KEY, {});
  const unlocked = raw.unlocked === true && raw.verified === verifierId();
  return { unlocked, key: unlocked && typeof raw.key === 'string' && /^[0-9a-f]{64}$/.test(raw.key) ? raw.key : '', selfIgnore: raw.selfIgnore !== false };
}

/**
 * Сохранить изменения. Открывать вход (`unlocked: true`) — только после проверки пароля.
 * Лишнее из старых версий (ключ API GoatCounter, вход без пароля) при этом стирается.
 */
export function updateAdmin(patch: Partial<AdminState>): AdminState {
  const next = { ...adminState(), ...patch };
  const stored: Stored = next.unlocked ? { unlocked: true, verified: verifierId(), key: next.key || undefined, selfIgnore: next.selfIgnore } : { unlocked: false, selfIgnore: next.selfIgnore };
  save(KEY, stored);
  return next;
}
