/**
 * Видеоразборы партнёра — автоинструктора Петра (тест сотрудничества, 13.10.2026).
 *
 * У Петра бесплатные видеоразборы первых трёх билетов: одно видео на билет, внутри — все 20 вопросов.
 * После неверного ответа на вопрос такого билета рядом с пояснением появляется кнопка «Смотреть
 * разбор»: видео открывается в окне поверх игры сразу на нужном вопросе (по тайм-коду). Билет без
 * ссылки кнопку не показывает — поэтому, пока ссылок нет, игроки ничего не видят.
 *
 * Данные — `PARTNER` ниже: ссылки и тайм-коды присылает Артём.
 */

export interface PartnerTicket {
  /** Ссылка на видео билета (YouTube, VK Видео, Rutube или любая страница). */
  url: string;
  /** Где в видео начинается каждый из 20 вопросов: «м:сс» или «ч:мм:сс»; null — не знаем. */
  starts: readonly (string | null)[];
}

export interface PartnerData {
  /** Как подписать автора видео. */
  author: string;
  role: string;
  /** Полный курс автора — ссылка под видео (необязательно). */
  course?: { title: string; url: string };
  /** Номер билета → видео. */
  tickets: Readonly<Record<number, PartnerTicket>>;
}

const none = Array.from({ length: 20 }, (): string | null => null);

export const PARTNER: PartnerData = {
  author: 'Пётр',
  role: 'автоинструктор',
  tickets: {
    1: { url: '', starts: none },
    2: { url: '', starts: none },
    3: { url: '', starts: none },
  },
};

/** Метка перехода из игры: по ней Пётр видит, что ученик пришёл из «Курьера ПДД». */
export const PARTNER_UTM = { utm_source: 'kurier-pdd', utm_medium: 'game' } as const;

/** Данные партнёра; в браузерных тестах — подмена (`window.__partner`). */
export function partnerData(): PartnerData {
  const test = (globalThis as { __partner?: PartnerData }).__partner;
  return test ?? PARTNER;
}

/** «3:15» → 195, «1:02:03» → 3723; что-то другое — undefined. */
export function parseTime(text: string | null | undefined): number | undefined {
  if (!text || !/^\d{1,2}(:\d{2}){1,2}$/.test(text.trim())) return undefined;
  const parts = text.trim().split(':').map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return undefined;
  return parts.reduce((s, p) => s * 60 + p, 0);
}

export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export interface PartnerVideo {
  ticket: number;
  number: number;
  url: string;
  /** С какой секунды начинается вопрос (если известно). */
  start?: number;
}

/** Видеоразбор вопроса или undefined, если для билета нет ссылки. */
export function partnerVideo(q: { ticket: number; number: number }, data: PartnerData = partnerData()): PartnerVideo | undefined {
  const t = data.tickets[q.ticket];
  if (!t?.url || !/^https:\/\//.test(t.url)) return undefined;
  const start = parseTime(t.starts[q.number - 1]);
  return { ticket: q.ticket, number: q.number, url: t.url, ...(start !== undefined ? { start } : {}) };
}

type Host = { kind: 'youtube'; id: string } | { kind: 'rutube'; id: string } | { kind: 'vk'; oid: string; id: string; hash?: string } | { kind: 'other' };

function host(url: string): Host {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'other' };
  }
  const h = u.hostname.replace(/^(www|m)\./, '');
  if (h === 'youtu.be') return { kind: 'youtube', id: u.pathname.slice(1) };
  if (h === 'youtube.com') {
    const id = u.searchParams.get('v') ?? /^\/(?:embed|shorts|live)\/([\w-]+)/.exec(u.pathname)?.[1];
    if (id) return { kind: 'youtube', id };
  }
  if (h === 'rutube.ru') {
    const id = /^\/(?:video|play\/embed)\/([\da-f]+)/.exec(u.pathname)?.[1];
    if (id) return { kind: 'rutube', id };
  }
  if (h === 'vk.com' || h === 'vkvideo.ru' || h === 'vk.ru') {
    if (u.pathname === '/video_ext.php') {
      const oid = u.searchParams.get('oid');
      const id = u.searchParams.get('id');
      if (oid && id) return { kind: 'vk', oid, id, hash: u.searchParams.get('hash') ?? undefined };
    }
    const m = /video(-?\d+)_(\d+)/.exec(u.pathname + (u.searchParams.get('z') ?? ''));
    if (m) return { kind: 'vk', oid: m[1], id: m[2] };
  }
  return { kind: 'other' };
}

const vkTime = (sec: number) => `${Math.floor(sec / 60)}m${sec % 60}s`;

/** Плеер для окна в игре (YouTube, Rutube, VK Видео); undefined — видео открывается отдельно. */
export function embedUrl(v: PartnerVideo): string | undefined {
  const h = host(v.url);
  const t = v.start ?? 0;
  if (h.kind === 'youtube') return `https://www.youtube.com/embed/${h.id}?start=${t}&rel=0&playsinline=1`;
  if (h.kind === 'rutube') return `https://rutube.ru/play/embed/${h.id}${t ? `?t=${t}` : ''}`;
  if (h.kind === 'vk') return `https://vk.com/video_ext.php?oid=${h.oid}&id=${h.id}${h.hash ? `&hash=${h.hash}` : ''}&hd=2${t ? `&t=${vkTime(t)}` : ''}`;
  return undefined;
}

/** Ссылка, чтобы открыть видео отдельно, — тоже сразу на нужном вопросе, если сайт это умеет. */
export function directUrl(v: PartnerVideo): string {
  const t = v.start;
  if (!t) return v.url;
  const h = host(v.url);
  const u = new URL(v.url);
  if (h.kind === 'youtube') u.searchParams.set('t', `${t}s`);
  else if (h.kind === 'rutube') u.searchParams.set('t', String(t));
  else if (h.kind === 'vk') u.searchParams.set('t', vkTime(t));
  return u.toString();
}

/** Ссылка на курс с меткой «из Курьера ПДД». */
export function courseUrl(data: PartnerData = partnerData()): string | undefined {
  const url = data.course?.url;
  if (!url || !/^https:\/\//.test(url)) return undefined;
  const u = new URL(url);
  for (const [k, v] of Object.entries(PARTNER_UTM)) u.searchParams.set(k, v);
  return u.toString();
}

/** Ошибки в данных партнёра. Пустой список — всё в порядке. */
export function validatePartner(data: PartnerData): string[] {
  const errors: string[] = [];
  for (const [key, t] of Object.entries(data.tickets)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > 40) errors.push(`билет ${key}: такого билета нет`);
    if (t.url && !/^https:\/\//.test(t.url)) errors.push(`билет ${key}: ссылка должна начинаться с https://`);
    if (t.starts.length !== 20) errors.push(`билет ${key}: тайм-кодов ${t.starts.length}, нужно 20`);
    t.starts.forEach((s, i) => {
      if (s !== null && parseTime(s) === undefined) errors.push(`билет ${key}, вопрос ${i + 1}: тайм-код «${s}» не похож на «м:сс»`);
    });
    const times = t.starts.map(parseTime).filter((x): x is number => x !== undefined);
    if (times.some((x, i) => i > 0 && x <= times[i - 1])) errors.push(`билет ${key}: тайм-коды должны идти по возрастанию`);
  }
  if (data.course?.url && !/^https:\/\//.test(data.course.url)) errors.push('курс: ссылка должна начинаться с https://');
  return errors;
}
