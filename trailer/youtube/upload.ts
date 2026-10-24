/**
 * Загрузка ролика на свой канал YouTube (YouTube Data API v3), без лишних зависимостей — через fetch.
 *
 *   npx tsx trailer/youtube/upload.ts <файл.mp4> <описание.json>   — загрузить
 *   npx tsx trailer/youtube/upload.ts --check                       — проверить ключи и показать канал
 *   npx tsx trailer/youtube/upload.ts <файл.mp4> <описание.json> --dry-run — только проверить описание
 *   npx tsx trailer/youtube/upload.ts --update <описание.json>      — обновить название, описание и теги
 *                                                                     уже загруженного ролика (поле youtubeId)
 *
 * Ключи — из переменных окружения YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (см. README.md).
 * Токены нигде не печатаются и не сохраняются в файлы.
 */
import { readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';

export interface VideoMeta {
  /** До 100 знаков, с #Shorts. */
  title: string;
  description: string;
  tags?: string[];
  /** Время публикации, ISO 8601 (например 2026-10-25T09:00:00+03:00). Видео до него скрыто. */
  publishAt?: string;
  /** Номер уже загруженного ролика на YouTube — для --update. */
  youtubeId?: string;
}

/**
 * Хэштеги: в названии — не больше 2, всего — не больше 60 (иначе YouTube игнорирует все), лучше 12–15.
 * Первые три в описании YouTube показывает над названием, поэтому описание начинается с KEY_HASHTAGS.
 */
export const KEY_HASHTAGS = ['#Shorts', '#пдд', '#экзаменгибдд'];
/** Общие хэштеги по теме — из них берутся 9–10, плюс 1–2 по сюжету ролика. */
export const TOPIC_HASHTAGS = ['#билетыпдд', '#теорияпдд', '#экзаменпдд', '#пдд2026', '#права', '#водительскиеправа',
  '#автошкола', '#автошколаонлайн', '#вождение', '#сдатьнаправа', '#начинающийводитель', '#игра', '#обучение', '#лайфхак'];
/** Теги (поле tags, зрителю не видны): общие + слова хэштегов ролика без решётки. */
export const BASE_TAGS = ['пдд', 'пдд 2026', 'билеты пдд', 'экзамен гибдд', 'теория пдд', 'автошкола', 'курьер пдд'];

export const hashtagsOf = (text: string): string[] => text.match(/#[\p{L}\p{N}_]+/gu) ?? [];

const GAME_URL = 'https://artemigna777-sudo.github.io/Pdd.game/';
const CHUNK = 8 * 1024 * 1024; // кусок загрузки, кратен 256 КБ

/** Ошибки описания ролика; пустой список — всё в порядке. */
export function checkMeta(m: Partial<VideoMeta>): string[] {
  const errors: string[] = [];
  if (typeof m.title !== 'string' || !m.title.trim()) errors.push('нет title');
  else {
    if ([...m.title].length > 100) errors.push(`title длиннее 100 знаков (${[...m.title].length})`);
    if (/[<>]/.test(m.title)) errors.push('в title нельзя < и >');
    if (!/#shorts/i.test(m.title)) errors.push('в title нет #Shorts');
    if (hashtagsOf(m.title).length > 2) errors.push('в title больше 2 хэштегов — остальные в описание');
  }
  if (typeof m.description !== 'string' || !m.description.trim()) errors.push('нет description');
  else {
    if (Buffer.byteLength(m.description) > 5000) errors.push('description длиннее 5000 байт');
    if (/[<>]/.test(m.description)) errors.push('в description нельзя < и >');
    if (!m.description.includes(GAME_URL) || !m.description.includes('ref=youtube'))
      errors.push(`в description нет ссылки на игру с меткой: ${GAME_URL}?ref=youtube`);
    const tags = hashtagsOf(m.description);
    if (KEY_HASHTAGS.some((h, i) => tags[i]?.toLowerCase() !== h.toLowerCase()))
      errors.push(`description должен начинать хэштеги с ${KEY_HASHTAGS.join(' ')}`);
    if (tags.length < 10 || tags.length > 20) errors.push(`в description ${tags.length} хэштегов, нужно 10–20 (лучше 12–15)`);
    if (hashtagsOf(`${m.title ?? ''} ${m.description}`).length > 60) errors.push('больше 60 хэштегов — YouTube проигнорирует все');
  }
  if (m.tags !== undefined) {
    if (!Array.isArray(m.tags) || m.tags.some((t) => typeof t !== 'string')) errors.push('tags — не список строк');
    else if (m.tags.join(',').length > 500) errors.push('tags вместе длиннее 500 знаков');
  }
  if (m.publishAt !== undefined) {
    const t = Date.parse(m.publishAt);
    if (Number.isNaN(t)) errors.push('publishAt — не дата ISO 8601');
    else if (t < Date.now() + 15 * 60_000) errors.push('publishAt должен быть хотя бы через 15 минут');
  }
  return errors;
}

/** Тело запроса videos.insert. Пока приложение не прошло аудит Google, YouTube всё равно делает видео скрытым. */
export function videoResource(m: VideoMeta) {
  return {
    snippet: {
      title: m.title,
      description: m.description,
      tags: m.tags ?? [],
      categoryId: '27', // Education
      defaultLanguage: 'ru',
      defaultAudioLanguage: 'ru',
    },
    status: {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      ...(m.publishAt ? { publishAt: new Date(m.publishAt).toISOString() } : {}),
    },
  };
}

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Нет переменной окружения ${name} — добавь её в настройках окружения (см. trailer/youtube/README.md).`);
  return v;
}

async function accessToken(): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('YT_CLIENT_ID'),
      client_secret: env('YT_CLIENT_SECRET'),
      refresh_token: env('YT_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (j.access_token) return j.access_token;
  const hint =
    j.error === 'invalid_grant'
      ? 'refresh token отозван или устарел — получи новый в OAuth Playground'
      : j.error === 'invalid_client' || j.error === 'unauthorized_client'
        ? 'YT_CLIENT_ID / YT_CLIENT_SECRET не от того приложения, которым получен refresh token'
        : 'проверь ключи';
  throw new Error(`Google не выдал доступ (${r.status} ${j.error ?? ''}): ${hint}.`);
}

async function apiError(r: Response): Promise<Error> {
  const j = (await r.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
  const reason = j?.error?.errors?.[0]?.reason ?? '';
  const hint =
    reason === 'quotaExceeded'
      ? ' — дневной лимит API исчерпан (10 000 единиц, загрузка ~1600), попробуй завтра'
      : reason === 'uploadLimitExceeded'
        ? ' — YouTube ограничил число загрузок на канал за сутки'
        : '';
  return new Error(`YouTube ответил ${r.status} ${reason}: ${j?.error?.message ?? r.statusText}${hint}`);
}

async function channel(token: string) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw await apiError(r);
  const j = (await r.json()) as {
    items?: { id: string; snippet: { title: string; customUrl?: string }; statistics: { videoCount: string } }[];
  };
  const ch = j.items?.[0];
  if (!ch) throw new Error('У этого аккаунта Google нет канала YouTube.');
  return { id: ch.id, title: ch.snippet.title, handle: ch.snippet.customUrl ?? '', videos: Number(ch.statistics.videoCount) };
}

function readChunk(fd: number, start: number, size: number): Buffer {
  const buf = Buffer.alloc(size);
  let got = 0;
  while (got < size) got += readSync(fd, buf, got, size - got, start + got);
  return buf;
}

/** Resumable upload: создаём сеанс, шлём файл кусками; при обрыве спрашиваем, сколько дошло, и продолжаем. */
async function upload(token: string, file: string, meta: VideoMeta): Promise<string> {
  const size = statSync(file).size;
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-length': String(size),
        'x-upload-content-type': 'video/mp4',
      },
      body: JSON.stringify(videoResource(meta)),
    },
  );
  if (!init.ok) throw await apiError(init);
  const session = init.headers.get('location');
  if (!session) throw new Error('YouTube не вернул адрес сеанса загрузки.');

  const fd = openSync(file, 'r');
  try {
    let sent = 0;
    let failures = 0;
    while (true) {
      const end = Math.min(sent + CHUNK, size);
      let r: Response;
      try {
        r = await fetch(session, {
          method: 'PUT',
          headers: { 'content-length': String(end - sent), 'content-range': `bytes ${sent}-${end - 1}/${size}` },
          body: new Uint8Array(readChunk(fd, sent, end - sent)),
        });
      } catch {
        r = new Response(null, { status: 599 });
      }
      if (r.status === 200 || r.status === 201) {
        const j = (await r.json()) as { id: string };
        process.stdout.write(`\rЗагружено 100%      \n`);
        return j.id;
      }
      if (r.status === 308) {
        sent = rangeEnd(r.headers.get('range'));
        failures = 0;
        process.stdout.write(`\rЗагружено ${Math.floor((sent / size) * 100)}%`);
        continue;
      }
      if (r.status >= 500 || r.status === 429) {
        if (++failures > 5) throw new Error(`Загрузка оборвалась ${failures} раз подряд (последний ответ ${r.status}).`);
        await new Promise((ok) => setTimeout(ok, 2 ** failures * 1000));
        const st = await fetch(session, { method: 'PUT', headers: { 'content-range': `bytes */${size}` } }).catch(() => null);
        if (st?.status === 200 || st?.status === 201) return ((await st.json()) as { id: string }).id;
        if (st?.status === 308) sent = rangeEnd(st.headers.get('range'));
        continue;
      }
      throw await apiError(r);
    }
  } finally {
    closeSync(fd);
  }
}

/** Обновить название, описание и теги уже загруженного ролика (videos.update, part=snippet; ~50 единиц лимита). */
async function update(token: string, id: string, meta: VideoMeta): Promise<void> {
  const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id, snippet: videoResource(meta).snippet }),
  });
  if (!r.ok) throw await apiError(r);
}

/** «bytes=0-1234» → 1235 (сколько байт YouTube уже получил). */
export function rangeEnd(range: string | null): number {
  const m = range?.match(/bytes=0-(\d+)/);
  return m ? Number(m[1]) + 1 : 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const ch = await channel(await accessToken());
    console.log(`Канал: ${ch.title} ${ch.handle} · видео: ${ch.videos}`);
    return;
  }
  if (args[0] === '--update') {
    const metaFile = args[1];
    const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as VideoMeta;
    const errors = checkMeta({ ...meta, publishAt: undefined });
    if (!meta.youtubeId) errors.push('нет youtubeId — номера ролика на YouTube');
    if (errors.length) {
      console.error(`Описание ${metaFile} не подходит:\n- ${errors.join('\n- ')}`);
      process.exit(1);
    }
    await update(await accessToken(), meta.youtubeId!, meta);
    console.log(`Обновлено: https://studio.youtube.com/video/${meta.youtubeId}/edit`);
    return;
  }
  const [file, metaFile] = args.filter((a) => !a.startsWith('--'));
  if (!file || !metaFile) {
    console.error('Как запускать: npx tsx trailer/youtube/upload.ts <файл.mp4> <описание.json> [--dry-run]');
    process.exit(2);
  }
  statSync(file);
  const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as VideoMeta;
  const errors = checkMeta(meta);
  if (errors.length) {
    console.error(`Описание ${metaFile} не подходит:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  if (args.includes('--dry-run')) {
    console.log('Описание в порядке, загрузка пропущена (--dry-run).');
    return;
  }
  const token = await accessToken();
  const ch = await channel(token);
  console.log(`Канал: ${ch.title} ${ch.handle}. Загружаю ${file} (${(statSync(file).size / 1e6).toFixed(1)} МБ)…`);
  const id = await upload(token, file, meta);
  console.log(`Готово: https://studio.youtube.com/video/${id}/edit`);
  console.log(`Ссылка для зрителей (после открытия доступа): https://youtube.com/shorts/${id}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
}
