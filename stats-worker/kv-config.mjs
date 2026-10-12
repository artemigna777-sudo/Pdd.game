/**
 * Загрузка посредника (.github/workflows/stats-worker.yml): найти хранилище Workers KV для итогов дуэлей
 * и собрать wrangler.deploy.json — те же настройки, что wrangler.jsonc, плюс привязка `DUELS`.
 *
 *   node kv-config.mjs id < вывод «wrangler kv namespace list»   — напечатать номер хранилища или ничего
 *   DUELS_KV_ID=… node kv-config.mjs config                        — записать wrangler.deploy.json
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

/** Настройки wrangler с привязкой хранилища. */
export function deployConfig(jsonc, id) {
  const config = JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, ''));
  return { ...config, kv_namespaces: [{ binding: 'DUELS', id }] };
}

const [cmd] = process.argv.slice(2);
if (cmd === 'id') {
  const id = findKvId(readFileSync(0, 'utf8'));
  if (id) process.stdout.write(id);
} else if (cmd === 'config') {
  const id = process.env.DUELS_KV_ID;
  if (!id) throw new Error('Нет DUELS_KV_ID');
  const here = new URL('.', import.meta.url);
  writeFileSync(new URL('wrangler.deploy.json', here), JSON.stringify(deployConfig(readFileSync(new URL('wrangler.jsonc', here), 'utf8'), id), null, 2) + '\n');
}
