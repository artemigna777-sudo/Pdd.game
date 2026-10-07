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
  /** Не считать заходы с этого телефона. */
  selfIgnore: boolean;
}

interface Stored {
  unlocked?: boolean;
  /** Метка отпечатка пароля, с которым открыт вход. */
  verified?: string;
  selfIgnore?: boolean;
}

const KEY = 'pdd-game:admin';

export function adminState(): AdminState {
  const raw = load<Stored>(KEY, {});
  return { unlocked: raw.unlocked === true && raw.verified === verifierId(), selfIgnore: raw.selfIgnore !== false };
}

/**
 * Сохранить изменения. Открывать вход (`unlocked: true`) — только после проверки пароля.
 * Лишнее из старых версий (ключ API, вход без пароля) при этом стирается.
 */
export function updateAdmin(patch: Partial<AdminState>): AdminState {
  const next = { ...adminState(), ...patch };
  const stored: Stored = next.unlocked ? { ...next, verified: verifierId() } : next;
  save(KEY, stored);
  return next;
}
