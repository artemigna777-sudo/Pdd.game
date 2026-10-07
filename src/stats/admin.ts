/**
 * Секретный вход автора игры в статистику: ключ GoatCounter и «не считать мои заходы».
 * Хранится только на телефоне автора (в резервную копию не попадает).
 */
import { load, save } from '../storage.ts';

export interface AdminState {
  /** Вход открыт на этом телефоне (7 касаний по «Версия игры»). */
  unlocked: boolean;
  /** Ключ API GoatCounter с правом «Read statistics». */
  token: string;
  /** Не считать заходы с этого телефона. */
  selfIgnore: boolean;
}

const KEY = 'pdd-game:admin';
const DEFAULTS: AdminState = { unlocked: false, token: '', selfIgnore: true };

export function adminState(): AdminState {
  const raw = load<Partial<AdminState>>(KEY, {});
  return {
    unlocked: raw.unlocked === true,
    token: typeof raw.token === 'string' ? raw.token : '',
    selfIgnore: raw.selfIgnore !== false,
  };
}

export function updateAdmin(patch: Partial<AdminState>): AdminState {
  const next = { ...adminState(), ...patch };
  save(KEY, next);
  return next;
}

export const ADMIN_DEFAULTS = DEFAULTS;
