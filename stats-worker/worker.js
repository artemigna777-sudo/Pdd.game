/**
 * Посредник статистики «Курьер ПДД» — Cloudflare Worker (kurier-pdd-stats.artemigna777.workers.dev).
 *
 * Зачем: API GoatCounter с ключом браузер из игры не пускает, а открытый счётчик виден всем.
 * Посредник хранит ключ GoatCounter у себя и отдаёт статистику только тому, кто знает ключ автора.
 * Ключ автора игра получает из пароля автора при входе (src/stats/author.ts, `authorKey`).
 *
 * Секреты в настройках Worker (Settings → Variables and Secrets, тип Secret):
 * - GC_TOKEN — ключ API GoatCounter с правом «Read statistics»;
 * - STATS_KEY — ключ автора (64 знака, Claude присылает его Артёму в чате).
 *
 * Ещё посредник передаёт итог дуэли автору вызова (этап 14): друг, ответив на вызов, оставляет здесь
 * свой результат (`PUT /duel/<номер>`), а игра автора забирает его (`GET /duel/<номер>`). Хранится
 * только имя, ответы и время ответившего, 30 дней — в хранилище Workers KV `DUELS`
 * (его создаёт и подключает загрузка через GitHub, .github/workflows/stats-worker.yml).
 *
 * Код загружает GitHub (.github/workflows/stats-worker.yml) при изменениях в main.
 */

const GOATCOUNTER = 'https://kurier-pdd.goatcounter.com';
/** Откуда можно спрашивать из браузера: игра на GitHub Pages и запуск на компьютере разработчика. */
const ORIGINS = ['https://artemigna777-sudo.github.io', 'http://localhost:5173', 'http://localhost:4173'];
/** Что можно спрашивать у GoatCounter: только чтение статистики. */
const ALLOWED = /^\/api\/v0\/stats\/(total|hits|toprefs|systems|locations|browsers|sizes|campaigns)$/;
/** Итог дуэли: номер дуэли, как в игре (src/duel/duel.ts). */
const DUEL_PATH = /^\/duel\/([0-9a-z]{6,12})$/;
/** Сколько хранить итог дуэли: 30 дней. */
const DUEL_TTL = 30 * 24 * 60 * 60;
/** Как в игре: вопросов в дуэли, длина имени, самое долгое время (мс). */
const DUEL_QUESTIONS = 10;
const DUEL_NAME_MAX = 20;
const DUEL_MAX_MS = 36_000_000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    const duel = DUEL_PATH.exec(url.pathname);
    if (duel) return duelRoute(request, env, duel[1], reply);
    if (request.method !== 'GET') return reply(405, { error: 'method' });

    // Секреты вставляют с телефона: лишние пробелы и переводы строки по краям не мешают.
    const gcToken = (env.GC_TOKEN || '').trim();
    const statsKey = (env.STATS_KEY || '').trim().toLowerCase();
    const keyOk = /^[0-9a-f]{64}$/.test(statsKey);
    // Проверка, что посредник работает: открыть адрес в браузере.
    if (url.pathname === '/') {
      const text = !gcToken || !statsKey
        ? 'Курьер ПДД: посредник запущен, но не заданы секреты GC_TOKEN и STATS_KEY.'
        : !keyOk
          ? 'Курьер ПДД: секрет STATS_KEY задан неверно — нужны только 64 знака (цифры и буквы a–f), без слов «STATS_KEY —».'
          : 'Курьер ПДД: посредник статистики работает.';
      return new Response(text, {
        headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    if (!gcToken || !keyOk) return reply(500, { error: 'setup' });
    if (!(await same(request.headers.get('Authorization') || '', `Bearer ${statsKey}`))) return reply(401, { error: 'key' });
    if (!ALLOWED.test(url.pathname)) return reply(404, { error: 'path' });

    let res;
    try {
      res = await fetch(GOATCOUNTER + url.pathname + url.search, { headers: { Authorization: `Bearer ${gcToken}`, Accept: 'application/json' } });
    } catch {
      return reply(502, { error: 'gc-network' });
    }
    if (res.status === 401 || res.status === 403) return reply(502, { error: 'gc-token' });
    if (!res.ok) return reply(502, { error: 'gc-error', status: res.status });
    return new Response(await res.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  },
};

/**
 * Итог дуэли. PUT — друг сохраняет свой результат (один раз: второй ответ на тот же вызов не
 * заменит первый), GET — автор вызова забирает его. Ничего, кроме имени, ответов и времени.
 */
async function duelRoute(request, env, id, reply) {
  const kv = env.DUELS;
  if (!kv) return reply(503, { error: 'kv' });
  const key = `duel:${id}`;
  if (request.method === 'GET') {
    const saved = await kv.get(key);
    return saved ? reply(200, JSON.parse(saved)) : reply(404, { error: 'none' });
  }
  if (request.method !== 'PUT') return reply(405, { error: 'method' });
  const text = await request.text();
  if (text.length > 1024) return reply(413, { error: 'size' });
  const side = cleanDuelSide(text);
  if (!side) return reply(400, { error: 'bad' });
  if (await kv.get(key)) return reply(409, { error: 'exists' });
  await kv.put(key, JSON.stringify(side), { expirationTtl: DUEL_TTL });
  return reply(201, { ok: true });
}

/** Результат ответившего: { name, answers: "0120…", ms } — или undefined, если что-то не так. */
function cleanDuelSide(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof raw !== 'object' || raw === null) return undefined;
  const name = typeof raw.name === 'string' ? [...raw.name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, DUEL_NAME_MAX).join('').trim() : '';
  const answers = raw.answers;
  const ms = raw.ms;
  if (!name || typeof answers !== 'string' || !new RegExp(`^\\d{${DUEL_QUESTIONS}}$`).test(answers)) return undefined;
  if (!Number.isInteger(ms) || ms < 0 || ms > DUEL_MAX_MS) return undefined;
  return { name, answers, ms };
}

/** Сравнить строки за одинаковое время (по отпечаткам SHA-256), чтобы ключ нельзя было подобрать по задержке. */
async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x);
  const v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}
