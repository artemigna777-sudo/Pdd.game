/**
 * Секретный вход автора игры в статистику и «не считать мои заходы».
 * Хранится только на телефоне автора (в резервную копию не попадает).
 */
import { load, save } from '../storage.ts';

export interface AdminState {
  /** Вход открыт на этом телефоне (7 касаний по «Версия игры»). */
  unlocked: boolean;
  /** Не считать заходы с этого телефона. */
  selfIgnore: boolean;
}

const KEY = 'pdd-game:admin';

export function adminState(): AdminState {
  const raw = load<Partial<AdminState>>(KEY, {});
  return { unlocked: raw.unlocked === true, selfIgnore: raw.selfIgnore !== false };
}

/** Сохранить изменения. Лишнее из старых версий (ключ API) при этом стирается. */
export function updateAdmin(patch: Partial<AdminState>): AdminState {
  const next = { ...adminState(), ...patch };
  save(KEY, next);
  return next;
}
