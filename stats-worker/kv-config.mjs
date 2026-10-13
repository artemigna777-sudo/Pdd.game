/**
 * Загрузка посредника (.github/workflows/stats-worker.yml): найти хранилище Workers KV для итогов дуэлей
 * и собрать wrangler.deploy.json — те же настройки, что wrangler.jsonc, плюс привязка `DUELS`.
 *
 *   node kv-config.mjs id < вывод «wrangler kv namespace list»   — напечатать номер хранилища или ничего
 *   DUELS_KV_ID=… node kv-config.mjs config [--no-live]            — записать wrangler.deploy.json
 *                                                                    (с комнатами дуэли LIVE или без них)
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** Название хранилища. Старые wrangler дописывают впереди имя Worker — подходит и так. */
export const KV_TITLE = 'kurier-pdd-duels';

/** Номер хранилища из вывода `wrangler kv namespace list` (JSON, возможно, с текстом вокруг). */
export function findKvId(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) return undefined;
  let list;
  try {
    list = JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
  const hit = Array.isArray(list) ? list.find((n) => n && typeof n.title === 'string' && (n.title === KV_TITLE || n.title.endsWith(`-${KV_TITLE}`))) : undefined;
  return hit && typeof hit.id === 'string' ? hit.id : undefined;
}

/** Комнаты дуэли в реальном времени (этап 16): Durable Object `LiveRoom`, привязка `LIVE`. */
export const LIVE_ROOMS = {
  durable_objects: { bindings: [{ name: 'LIVE', class_name: 'LiveRoom' }] },
  migrations: [{ tag: 'live-v1', new_sqlite_classes: ['LiveRoom'] }],
};

/** Настройки wrangler: привязка хранилища (если есть номер) и комнаты дуэли (если `live`). */
export function deployConfig(jsonc, id, live = true) {
  const config = JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, ''));
  return { ...config, ...(id ? { kv_namespaces: [{ binding: 'DUELS', id }] } : {}), ...(live ? LIVE_ROOMS : {}) };
}

const [cmd] = process.argv.slice(2);
if (cmd === 'id') {
  const id = findKvId(readFileSync(0, 'utf8'));
  if (id) process.stdout.write(id);
} else if (cmd === 'config') {
  // `config` — с комнатами дуэли, `config --no-live` — без них (если Cloudflare их не принял).
  const live = !process.argv.includes('--no-live');
  const here = new URL('.', import.meta.url);
  writeFileSync(new URL('wrangler.deploy.json', here), JSON.stringify(deployConfig(readFileSync(new URL('wrangler.jsonc', here), 'utf8'), process.env.DUELS_KV_ID, live), null, 2) + '\n');
}
