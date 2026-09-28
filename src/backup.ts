/**
 * Резервная копия: весь прогресс игры в одном файле — чтобы перенести на другой телефон или
 * не потерять, если браузер очистит данные сайта.
 */
import { sanitizeAttempts } from './data/ticketHistory.ts';
import { sanitizeExams } from './exam/examHistory.ts';
import { sanitizeProgress } from './progress/progress.ts';

export const BACKUP_APP = 'kurier-pdd';
export const BACKUP_VERSION = 1;

/** Что сохраняется: ключи localStorage и проверка каждого значения. */
const PARTS: Record<string, (raw: unknown) => unknown> = {
  'pdd-game:progress': sanitizeProgress,
  'pdd-game:ticket-history': sanitizeAttempts,
  'pdd-game:exam-history': sanitizeExams,
  'pdd-game:settings': (raw) => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {}),
};

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  savedAt: number;
  data: Record<string, unknown>;
}

export function makeBackup(read: (key: string) => unknown, now: number): Backup {
  const data: Record<string, unknown> = {};
  for (const [key, clean] of Object.entries(PARTS)) {
    const raw = read(key);
    if (raw !== null && raw !== undefined) data[key] = clean(raw);
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, savedAt: now, data };
}

/** Разобрать файл резервной копии. Чужой или испорченный файл — ошибка с понятным текстом. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Это не файл резервной копии игры.');
  }
  const b = raw as Partial<Backup>;
  if (typeof raw !== 'object' || raw === null || b.app !== BACKUP_APP || typeof b.data !== 'object' || b.data === null) {
    throw new Error('Это не файл резервной копии игры.');
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new Error('Файл сохранён более новой версией игры — сначала обновите игру.');
  const data: Record<string, unknown> = {};
  for (const [key, clean] of Object.entries(PARTS)) if (key in b.data) data[key] = clean((b.data as Record<string, unknown>)[key]);
  return { app: BACKUP_APP, version: b.version, savedAt: typeof b.savedAt === 'number' ? b.savedAt : 0, data };
}

/** Записать копию в хранилище (текущие данные заменяются). Возвращает false, если хранилище недоступно. */
export function restoreBackup(backup: Backup, write: (key: string, value: unknown) => void): boolean {
  try {
    for (const key of Object.keys(PARTS)) write(key, backup.data[key] ?? null);
    return true;
  } catch {
    return false;
  }
}

export function backupFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kurier-pdd-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}
