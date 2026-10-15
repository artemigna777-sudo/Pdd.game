/**
 * Игроки у посредника: таблица лидеров по опыту и монетам и готовность к экзамену для статистики автора.
 *
 * Хранится только то, что игра присылает сама: случайный номер телефона-игры (не связан ни с чем),
 * своё имя для таблицы (если игрок его ввёл), опыт, заработанные монеты, готовность в процентах и когда
 * игрок был последний раз. Ещё — ник по умолчанию вроде «user_4821»: его выдаёт посредник при первом
 * заходе, случайный и ни у кого не повторяется. Кто не заходил год — удаляется.
 *
 * Здесь только правила и SQL — без Cloudflare, чтобы проверять в тестах. `sql` — как у Durable Object:
 * `sql.exec(запрос, ...значения)` возвращает строки (`.toArray()`).
 */

export const PLAYER = {
  /** Самое длинное имя в таблице. */
  nameMax: 16,
  /** Сколько строк в таблице лидеров. */
  top: 20,
  /** Самые большие опыт и монеты, которые принимаются. */
  maxValue: 10_000_000,
  /** Кто не заходил столько дней, удаляется. */
  keepDays: 365,
};

const DAY = 24 * 60 * 60 * 1000;
const ID = /^[A-Za-z0-9_-]{16,40}$/;

/**
 * Грубые слова в имени: имя не принимается. Корни, которые и в обычных словах встречаются только как
 * мат, — в любом месте имени; короткие — только в начале слова («хлеба», «употреблять» — можно).
 */
const BAD_ANYWHERE = /(хуй|хуе|хуё|хуя|пизд|залуп|гандон|шлюх|пидор|пидр|ебан|ёбан|ебат|ёбат|ебал|выеб|въеб|заеб|уеб|долбоеб|мудак|мудил|сучк|блядь|блять)/;
const BAD_WORD_START = /(?:^|[^а-яё])(?:ёб|еб|бля|сук[аи]|муд[ао]|дроч|хер)/;
const BAD_LATIN = /(hui|huy|huj|pizd|blya|blyat|suka|ebat|eblan|pidor|fuck|shit|bitch|cunt|dick)/;

/** Имя для таблицы: без управляющих знаков и лишних пробелов, не длиннее 16 знаков. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  return [...raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, PLAYER.nameMax).join('').trim();
}

/** Ники по умолчанию («user_4821») выдаёт только посредник: своё имя таким быть не может. */
const NICK_LIKE = /^user[\s_-]*\d+$/i;

/** Можно ли показывать имя всем. */
export function nameAllowed(name) {
  if (NICK_LIKE.test(name)) return false;
  const low = name.toLowerCase();
  const plain = low.replace(/[^а-яёa-z]/g, '');
  return !(BAD_ANYWHERE.test(low) || BAD_ANYWHERE.test(plain) || BAD_WORD_START.test(low) || BAD_LATIN.test(plain));
}

const count = (v) => (Number.isInteger(v) && v >= 0 && v <= PLAYER.maxValue ? v : undefined);

/**
 * Что прислала игра → { id, board, name?, xp?, coins?, ready? } или { error }.
 * `board` — показывать ли игрока в таблице: тогда нужны опыт и монеты, иначе они не хранятся.
 * `name` — своё имя; без него в таблице ник по умолчанию. `ready` — готовность 0–100: её игра
 * присылает, только если игрок не выключил анонимную статистику.
 */
export function cleanUpdate(raw) {
  if (typeof raw !== 'object' || raw === null) return { error: 'bad' };
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) return { error: 'id' };
  const out = { id: raw.id, board: raw.board === true };
  if (Number.isInteger(raw.ready) && raw.ready >= 0 && raw.ready <= 100) out.ready = raw.ready;
  if (!out.board) return out;
  const name = cleanName(raw.name);
  if (name && !nameAllowed(name)) return { error: 'name' };
  const xp = count(raw.xp);
  const coins = count(raw.coins);
  if (xp === undefined || coins === undefined) return { error: 'bad' };
  return { ...out, ...(name ? { name } : {}), xp, coins };
}

/** Таблица в хранилище Durable Object (создаётся один раз). */
export function setup(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT, nick TEXT NOT NULL, board INTEGER NOT NULL DEFAULT 0, xp INTEGER, coins INTEGER, ready INTEGER, seen INTEGER NOT NULL)');
  sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS players_nick ON players (nick)');
  sql.exec('CREATE INDEX IF NOT EXISTS players_xp ON players (board, xp)');
  sql.exec('CREATE INDEX IF NOT EXISTS players_coins ON players (board, coins)');
  sql.exec('CREATE INDEX IF NOT EXISTS players_seen ON players (seen)');
}

/**
 * Свободный ник по умолчанию: «user_» и случайные 4 цифры; если подряд попадаются занятые — 5 цифр,
 * потом 6 и т. д., так что ник всегда находится и ни у кого не повторяется.
 */
export function freeNick(sql, rnd = Math.random) {
  for (let i = 0; ; i++) {
    const min = 10 ** (3 + Math.floor(i / 10));
    const nick = `user_${min + Math.floor(rnd() * 9 * min)}`;
    if (!sql.exec('SELECT 1 FROM players WHERE nick = ?', nick).toArray().length) return nick;
  }
}

/**
 * Сохранить, что прислала игра, и вернуть имя игрока в таблице (своё или ник). Игра каждый раз
 * присылает всё о себе, поэтому запись заменяется целиком: стёрла своё имя — снова ник, выключила
 * статистику — стирается готовность. Ник выдаётся при первом заходе и больше не меняется.
 */
export function savePlayer(sql, upd, now, rnd = Math.random) {
  const nick = sql.exec('SELECT nick FROM players WHERE id = ?', upd.id).toArray()[0]?.nick ?? freeNick(sql, rnd);
  sql.exec(
    `INSERT INTO players (id, name, nick, board, xp, coins, ready, seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, board = excluded.board, xp = excluded.xp,
       coins = excluded.coins, ready = excluded.ready, seen = excluded.seen`,
    upd.id,
    upd.board ? (upd.name ?? null) : null,
    nick,
    upd.board ? 1 : 0,
    upd.board ? upd.xp : null,
    upd.board ? upd.coins : null,
    upd.ready ?? null,
    now,
  );
  sql.exec('DELETE FROM players WHERE seen < ?', now - PLAYER.keepDays * DAY);
  return upd.name ?? String(nick);
}

/**
 * Таблица лидеров по опыту (`xp`) или монетам (`coins`): первые 20, своё место и имя (если игрок
 * в таблице) и сколько всего игроков в таблице. Номера телефонов-игр не отдаются.
 */
export function board(sql, by, id) {
  const col = by === 'coins' ? 'coins' : 'xp';
  const rows = sql.exec(`SELECT id, COALESCE(name, nick) AS name, ${col} AS value FROM players WHERE board = 1 AND ${col} IS NOT NULL ORDER BY ${col} DESC, seen ASC LIMIT ?`, PLAYER.top).toArray();
  const total = Number(sql.exec(`SELECT COUNT(*) AS n FROM players WHERE board = 1 AND ${col} IS NOT NULL`).toArray()[0]?.n ?? 0);
  const out = { by: col, top: rows.map((r) => ({ name: String(r.name), value: Number(r.value), ...(r.id === id ? { me: true } : {}) })), total };
  const mine = typeof id === 'string' && ID.test(id) ? sql.exec(`SELECT ${col} AS value, board, COALESCE(name, nick) AS name FROM players WHERE id = ?`, id).toArray()[0] : undefined;
  if (mine && Number(mine.board) === 1 && mine.value !== null) {
    const above = Number(sql.exec(`SELECT COUNT(*) AS n FROM players WHERE board = 1 AND ${col} > ?`, mine.value).toArray()[0]?.n ?? 0);
    out.me = { place: above + 1, value: Number(mine.value), name: String(mine.name) };
  }
  return out;
}

/**
 * Готовность к экзамену для статистики автора: сколько игроков в каждом десятке процентов
 * (0–9, 10–19, … 90–100) среди заходивших за последние 7 и 30 дней.
 */
export function readyCounts(sql, now) {
  const period = (days) => {
    const out = Array(10).fill(0);
    for (const r of sql.exec('SELECT MIN(ready / 10, 9) AS b, COUNT(*) AS n FROM players WHERE ready IS NOT NULL AND seen >= ? GROUP BY b', now - days * DAY).toArray()) {
      const b = Number(r.b);
      if (b >= 0 && b <= 9) out[b] = Number(r.n);
    }
    return out;
  };
  return { d7: period(7), d30: period(30) };
}
