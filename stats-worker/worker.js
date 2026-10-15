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
 * И держит комнаты дуэли в реальном времени (этап 16): `GET /live/<код>` с WebSocket ведёт в комнату —
 * Durable Object `LiveRoom` (привязка `LIVE`). Правила комнаты — room.js. Комната ничего не хранит после
 * того, как оба игрока ушли.
 *
 * Таблица лидеров по опыту и монетам и готовность игроков к экзамену — Durable Object `Players`
 * (привязка `PLAYERS`, правила и SQL — players.js): игра присылает о себе `PUT /player`, таблицу берёт
 * `GET /board`, а готовность по десяткам процентов попадает в отчёт для автора.
 *
 * Код загружает GitHub (.github/workflows/stats-worker.yml) при изменениях в main.
 *
 * Отчёт для экрана статистики — одним запросом (`GET /api/report`): посредник сам спрашивает GoatCounter
 * и отдаёт игре только числа, несколько килобайт. Так экран открывается и там, где связь с зарубежными
 * сервисами обрывается после первых килобайт (у российских операторов, 15.10.2026), и не упирается
 * в ограничение частоты запросов API GoatCounter.
 */
import { RoomCore } from './room.js';
import { board, cleanUpdate, readyCounts, savePlayer, setup } from './players.js';

const GOATCOUNTER = 'https://kurier-pdd.goatcounter.com';
/** Откуда можно спрашивать из браузера: игра на GitHub Pages и запуск на компьютере разработчика. */
const ORIGINS = ['https://artemigna777-sudo.github.io', 'http://localhost:5173', 'http://localhost:4173'];
/** Что можно спрашивать у GoatCounter: только чтение статистики. */
const ALLOWED = /^\/api\/v0\/stats\/(total|hits|toprefs|systems|locations|browsers|sizes|campaigns)$/;
/** Время для API GoatCounter: RFC 3339 в UTC, без долей секунды (как шлёт игра). */
const API_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
/** Сколько раз повторить запрос, если GoatCounter ответил «слишком часто» (429), и самая долгая пауза. */
const GC_RETRIES = 3;
const GC_MAX_WAIT_MS = 3000;
/** Итог дуэли: номер дуэли, как в игре (src/duel/duel.ts). */
const DUEL_PATH = /^\/duel\/([0-9a-z]{6,12})$/;
/** Комната дуэли в реальном времени: код из заглавных латинских букв и цифр, как в игре (src/duel/live.ts). */
const LIVE_PATH = /^\/live\/([A-Z0-9]{4,8})$/;
/** Сколько хранить итог дуэли: 30 дней. */
const DUEL_TTL = 30 * 24 * 60 * 60;
/** Как в игре: вопросов в дуэли, длина имени, самое долгое время (мс). */
const DUEL_QUESTIONS = 10;
const DUEL_NAME_MAX = 20;
const DUEL_MAX_MS = 36_000_000;
/** Все игроки — в одном Durable Object. */
const PLAYERS_ID = 'all';

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
    const live = LIVE_PATH.exec(url.pathname);
    if (live) {
      if (!ORIGINS.includes(origin)) return reply(403, { error: 'origin' });
      if (request.headers.get('Upgrade') !== 'websocket') return reply(426, { error: 'websocket' });
      if (!env.LIVE) return reply(503, { error: 'live' });
      return env.LIVE.get(env.LIVE.idFromName(live[1])).fetch(request);
    }
    if (url.pathname === '/player' || url.pathname === '/board') return playersRoute(request, env, url, origin, reply);
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
    if (url.pathname === '/api/report') return reportRoute(url, gcToken, env, reply);
    if (!ALLOWED.test(url.pathname)) return reply(404, { error: 'path' });

    let res;
    try {
      res = await gcFetch(gcToken, url.pathname + url.search);
    } catch {
      return reply(502, { error: 'gc-network' });
    }
    if (res.status === 401 || res.status === 403) return reply(502, { error: 'gc-token' });
    if (!res.ok) return reply(502, { error: 'gc-error', status: res.status });
    return new Response(await res.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  },
};

/** Запрос к API GoatCounter с его ключом; на «слишком часто» (429) — пауза и повтор. */
async function gcFetch(gcToken, pathAndQuery) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(GOATCOUNTER + pathAndQuery, { headers: { Authorization: `Bearer ${gcToken}`, Accept: 'application/json' } });
    if (res.status !== 429 || attempt >= GC_RETRIES) return res;
    const reset = Number(res.headers.get('X-Rate-Limit-Reset'));
    await new Promise((done) => setTimeout(done, Math.min(GC_MAX_WAIT_MS, reset > 0 ? reset * 1000 : 1000)));
  }
}

/**
 * Отчёт для экрана статистики одним ответом: посетители сегодня, за 7 и 30 дней (`today`, `week`,
 * `month` — начала периодов, `end` — конец, как считает игра по часам телефона), по дням, по экранам
 * и событиям, откуда пришли, телефоны и страны, сколько игроков на какой готовности к экзамену (`ready`,
 * если подключены игроки). Только числа и названия — несколько килобайт.
 */
async function reportRoute(url, gcToken, env, reply) {
  const [today, week, month, end] = ['today', 'week', 'month', 'end'].map((k) => url.searchParams.get(k) || '');
  if (![today, week, month, end].every((t) => API_TIME.test(t))) return reply(400, { error: 'period' });
  const get = async (page, params) => {
    let res;
    try {
      res = await gcFetch(gcToken, `/api/v0/stats/${page}?${new URLSearchParams(params)}`);
    } catch {
      throw { error: 'gc-network' };
    }
    if (res.status === 401 || res.status === 403) throw { error: 'gc-token' };
    if (!res.ok) throw { error: 'gc-error', status: res.status };
    try {
      return await res.json();
    } catch {
      throw { error: 'gc-error', status: res.status };
    }
  };
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  const list = (v) => (Array.isArray(v) ? v : []);
  const named = (json) =>
    list(json && json.stats)
      .map((s) => [String((s && (s.name || s.id)) || ''), num(s && s.count)])
      .filter(([, n]) => n > 0);
  try {
    const month30 = { start: month, end };
    const t = await get('total', { start: today, end });
    const w = await get('total', { start: week, end });
    const m = await get('total', month30);
    const hits = await get('hits', { ...month30, limit: '100' });
    const refs = await get('toprefs', { ...month30, limit: '10' });
    const systems = await get('systems', { ...month30, limit: '10' });
    const locations = await get('locations', { ...month30, limit: '10' });
    const ready = await playersReady(env);
    const counts = {};
    for (const h of list(hits && hits.hits)) if (h && typeof h.path === 'string' && h.path) counts[h.path] = (counts[h.path] || 0) + num(h.count);
    return reply(200, {
      today: num(t && t.total),
      week: num(w && w.total),
      month: num(m && m.total),
      days: list(m && m.stats).map((d) => [String((d && d.day) || '').slice(0, 10), num(d && d.daily)]),
      counts,
      refs: named(refs),
      systems: named(systems),
      locations: named(locations),
      ...(ready ? { ready } : {}),
    });
  } catch (e) {
    return reply(502, e && e.error ? e : { error: 'gc-error' });
  }
}

/** Готовность игроков по десяткам процентов за 7 и 30 дней — или undefined, если игроки не подключены. */
async function playersReady(env) {
  if (!env.PLAYERS) return undefined;
  try {
    const res = await playersStub(env).fetch('https://players/ready');
    return res.ok ? await res.json() : undefined;
  } catch {
    return undefined;
  }
}

const playersStub = (env) => env.PLAYERS.get(env.PLAYERS.idFromName(PLAYERS_ID));

/**
 * Игроки. `PUT /player` — игра присылает о себе: номер (случайный), показывать ли в таблице, своё имя
 * (если введено), опыт, заработанные монеты, готовность; в ответе — имя в таблице (своё или ник). `GET /board?by=xp|coins&id=…` — таблица лидеров и своё место.
 */
async function playersRoute(request, env, url, origin, reply) {
  if (!ORIGINS.includes(origin)) return reply(403, { error: 'origin' });
  if (!env.PLAYERS) return reply(503, { error: 'players' });
  if (url.pathname === '/board') {
    if (request.method !== 'GET') return reply(405, { error: 'method' });
    const by = url.searchParams.get('by') === 'coins' ? 'coins' : 'xp';
    const id = url.searchParams.get('id') || '';
    const res = await playersStub(env).fetch(`https://players/board?${new URLSearchParams({ by, id })}`);
    // Ответ Durable Object — без заголовков CORS: браузер игры его не пропустит, поэтому — через `reply`.
    return res.ok ? reply(200, await res.json()) : reply(502, { error: 'players' });
  }
  if (request.method !== 'PUT') return reply(405, { error: 'method' });
  const text = await request.text();
  if (text.length > 1024) return reply(413, { error: 'size' });
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply(400, { error: 'bad' });
  }
  const upd = cleanUpdate(raw);
  if (upd.error) return reply(400, { error: upd.error });
  const res = await playersStub(env).fetch('https://players/player', { method: 'PUT', body: JSON.stringify(upd) });
  // В ответе — имя игрока в таблице: своё или ник, который посредник выдал при первом заходе.
  return res.ok ? reply(200, await res.json()) : reply(502, { error: 'players' });
}

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

/**
 * Комната дуэли в реальном времени — Durable Object: двое игроков на WebSocket, правила — RoomCore.
 * Пока кто-то подключён, комната живёт в памяти; когда оба ушли, она начинается заново.
 */
export class LiveRoom {
  constructor() {
    this.core = new RoomCore();
    this.sockets = [null, null];
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('websocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const seat = this.core.join();
    if (seat === undefined) {
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.sockets[seat] = server;
    server.addEventListener('message', (event) => {
      let msg;
      if (typeof event.data === 'string' && event.data.length <= 2000) {
        try {
          msg = JSON.parse(event.data);
        } catch {
          msg = undefined;
        }
      }
      this.send(this.core.message(seat, msg));
    });
    const gone = () => {
      if (this.sockets[seat] !== server) return;
      this.sockets[seat] = null;
      this.send(this.core.leave(seat));
      if (!this.sockets[0] && !this.sockets[1]) this.core = new RoomCore();
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(out) {
    for (const [to, msg] of out) {
      for (const seat of to === 'all' ? [0, 1] : [to]) {
        try {
          this.sockets[seat]?.send(JSON.stringify(msg));
        } catch {
          // Игрок уже отключился — сообщение ему не нужно.
        }
      }
    }
  }
}

/**
 * Игроки — Durable Object с SQLite: таблица лидеров и готовность. Отвечает только самому посреднику
 * (адреса `https://players/…`), всё уже проверено в `playersRoute`.
 */
export class Players {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    setup(this.sql);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    const now = Date.now();
    if (url.pathname === '/player' && request.method === 'PUT') {
      const upd = cleanUpdate(await request.json());
      if (upd.error) return new Response(JSON.stringify(upd), { status: 400 });
      return json({ ok: true, name: savePlayer(this.sql, upd, now) });
    }
    if (url.pathname === '/board') return json(board(this.sql, url.searchParams.get('by'), url.searchParams.get('id')));
    if (url.pathname === '/ready') return json(readyCounts(this.sql, now));
    return new Response('path', { status: 404 });
  }
}
