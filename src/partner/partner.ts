/**
 * Видеоразборы партнёра — автоинструктора Петра (тест сотрудничества, 13.10.2026).
 *
 * У Петра бесплатные видеоразборы первых трёх билетов в VK Видео: у билета 1 одно видео, у билетов
 * 2 и 3 — по два (первая и вторая половина вопросов). После неверного ответа на вопрос такого билета
 * рядом с пояснением появляется кнопка «Смотреть разбор»: видео открывается в окне поверх игры сразу
 * на нужном вопросе (по тайм-коду из описания видео). Билет без видео кнопку не показывает.
 *
 * Ссылки и тайм-коды — из описаний видео Петра (прислал Артём 13.10.2026). Номера вопросов у Петра
 * совпадают с билетами игры: на превью видны вопросы Б2 В11 и Б3 В11, тексты те же.
 */

export interface PartnerPart {
  /** Ссылка на видео (YouTube, VK Видео, Rutube или любая страница). */
  url: string;
  /** Номер вопроса → где он начинается в видео: «м:сс» или «ч:мм:сс». */
  starts: Readonly<Record<number, string>>;
}

export interface PartnerData {
  /** Как подписать автора видео. */
  author: string;
  role: string;
  /** Полный курс автора — ссылка под видео (необязательно). */
  course?: { title: string; url: string };
  /** Номер билета → видео этого билета (одно или несколько частей). */
  tickets: Readonly<Record<number, readonly PartnerPart[]>>;
}

/** Тайм-коды по порядку, начиная с вопроса `from`. */
const from = (first: number, times: string[]): Record<number, string> => Object.fromEntries(times.map((t, i) => [first + i, t]));

export const PARTNER: PartnerData = {
  author: 'Пётр',
  role: 'автоинструктор',
  tickets: {
    1: [
      {
        url: 'https://vkvideo.ru/video-148551566_456239208',
        starts: from(1, ['0:12', '3:35', '5:31', '8:03', '10:56', '16:15', '20:44', '22:10', '26:41', '30:05', '31:35', '35:05', '38:04', '39:01', '41:32', '44:29', '46:26', '48:28', '51:10', '53:30']),
      },
    ],
    2: [
      { url: 'https://vkvideo.ru/video-148551566_456239209', starts: from(1, ['0:53', '3:36', '6:08', '8:52', '11:58', '15:31', '20:11', '22:52', '26:37', '29:28', '32:02']) },
      { url: 'https://vkvideo.ru/video-148551566_456239210', starts: from(12, ['0:02', '2:14', '6:24', '8:35', '10:56', '13:46', '18:56', '22:38', '28:38']) },
    ],
    3: [
      { url: 'https://vkvideo.ru/video-148551566_456239215', starts: from(1, ['0:57', '2:19', '4:05', '7:10', '8:34', '10:37', '12:57', '15:39', '16:56', '20:06']) },
      { url: 'https://vkvideo.ru/video-148551566_456239216', starts: from(11, ['0:02', '2:48', '5:04', '6:44', '8:36', '12:10', '13:38', '16:43', '18:43', '21:14']) },
    ],
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

/** Видеоразбор вопроса или undefined, если в видео билета этого вопроса нет. */
export function partnerVideo(q: { ticket: number; number: number }, data: PartnerData = partnerData()): PartnerVideo | undefined {
  const part = data.tickets[q.ticket]?.find((p) => p.starts[q.number] !== undefined && /^https:\/\//.test(p.url));
  if (!part) return undefined;
  const start = parseTime(part.starts[q.number]);
  return { ticket: q.ticket, number: q.number, url: part.url, ...(start !== undefined ? { start } : {}) };
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
  for (const [key, parts] of Object.entries(data.tickets)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > 40) errors.push(`билет ${key}: такого билета нет`);
    const seen = new Set<number>();
    for (const part of parts) {
      if (!/^https:\/\//.test(part.url)) errors.push(`билет ${key}: ссылка «${part.url}» должна начинаться с https://`);
      const entries = Object.entries(part.starts)
        .map(([q, t]) => [Number(q), t] as const)
        .sort((a, b) => a[0] - b[0]);
      let last = -1;
      for (const [q, t] of entries) {
        if (!Number.isInteger(q) || q < 1 || q > 20) errors.push(`билет ${key}: вопроса ${q} в билете нет`);
        if (seen.has(q)) errors.push(`билет ${key}, вопрос ${q}: есть в двух видео`);
        seen.add(q);
        const sec = parseTime(t);
        if (sec === undefined) errors.push(`билет ${key}, вопрос ${q}: тайм-код «${t}» не похож на «м:сс»`);
        else if (sec <= last) errors.push(`билет ${key}, вопрос ${q}: тайм-коды должны идти по возрастанию`);
        else last = sec;
      }
    }
  }
  if (data.course?.url && !/^https:\/\//.test(data.course.url)) errors.push('курс: ссылка должна начинаться с https://');
  return errors;
}
