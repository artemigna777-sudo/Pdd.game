/**
 * Видеоразборы партнёра: тайм-коды, ссылки на нужный вопрос, плеер в окне игры, проверка данных.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PARTNER, courseUrl, directUrl, embedUrl, formatTime, parseTime, partnerVideo, validatePartner, type PartnerData } from '../src/partner/partner.ts';

const starts = (first: string | null) => [first, ...Array.from({ length: 19 }, (_, i) => `${i + 1}:${String((i * 7) % 60).padStart(2, '0')}`)];

const DATA: PartnerData = {
  author: 'Пётр',
  role: 'автоинструктор',
  course: { title: 'Учимся понимать ПДД через разбор билетов', url: 'https://school.example/course?ref=1' },
  tickets: {
    1: { url: 'https://www.youtube.com/watch?v=abcDEF12345', starts: starts('0:15') },
    2: { url: 'https://vkvideo.ru/video-123456_789012', starts: starts(null) },
    3: { url: 'https://rutube.ru/video/0123456789abcdef0123456789abcdef/', starts: starts('0:20') },
  },
};

test('тайм-коды: «м:сс» и «ч:мм:сс», ошибки — undefined', () => {
  assert.equal(parseTime('3:15'), 195);
  assert.equal(parseTime('1:02:03'), 3723);
  assert.equal(parseTime(' 0:05 '), 5);
  for (const bad of ['', '3', '3:7', '3:75', 'abc', null, undefined]) assert.equal(parseTime(bad), undefined, String(bad));
  assert.equal(formatTime(195), '3:15');
  assert.equal(formatTime(3723), '1:02:03');
});

test('видео вопроса: только для билетов со ссылкой; плеер и ссылка — сразу на нужном вопросе', () => {
  const yt = partnerVideo({ ticket: 1, number: 1 }, DATA)!;
  assert.deepEqual(yt, { ticket: 1, number: 1, url: DATA.tickets[1].url, start: 15 });
  assert.equal(embedUrl(yt), 'https://www.youtube.com/embed/abcDEF12345?start=15&rel=0&playsinline=1');
  assert.equal(directUrl(yt), 'https://www.youtube.com/watch?v=abcDEF12345&t=15s');

  const vk = partnerVideo({ ticket: 2, number: 2 }, DATA)!;
  assert.equal(vk.start, 60);
  assert.equal(embedUrl(vk), 'https://vk.com/video_ext.php?oid=-123456&id=789012&hd=2&t=1m0s');
  assert.equal(directUrl(vk), 'https://vkvideo.ru/video-123456_789012?t=1m0s');
  // Тайм-кода нет — видео с начала.
  assert.equal(partnerVideo({ ticket: 2, number: 1 }, DATA)!.start, undefined);

  const rt = partnerVideo({ ticket: 3, number: 1 }, DATA)!;
  assert.equal(embedUrl(rt), 'https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef?t=20');

  // Страница не с видеохостинга — без плеера, открывается отдельно.
  const other = partnerVideo({ ticket: 1, number: 1 }, { ...DATA, tickets: { 1: { url: 'https://school.example/lesson/1', starts: starts('0:15') } } })!;
  assert.equal(embedUrl(other), undefined);
  assert.equal(directUrl(other), 'https://school.example/lesson/1');

  assert.equal(partnerVideo({ ticket: 4, number: 1 }, DATA), undefined, 'у билета 4 видео нет');
  assert.equal(courseUrl(DATA), 'https://school.example/course?ref=1&utm_source=kurier-pdd&utm_medium=game');
});

test('данные партнёра: пока ссылок нет — кнопок нет; проверка ловит ошибки', () => {
  assert.deepEqual(validatePartner(PARTNER), []);
  for (const q of [1, 2, 3].flatMap((ticket) => Array.from({ length: 20 }, (_, i) => ({ ticket, number: i + 1 })))) assert.equal(partnerVideo(q, PARTNER), undefined);
  assert.deepEqual(validatePartner(DATA), []);
  const bad: PartnerData = { ...DATA, tickets: { 41: { url: 'http://x', starts: ['1:00', '0:30', 'ой'] } } };
  const errors = validatePartner(bad);
  assert.ok(errors.some((e) => e.includes('такого билета нет')));
  assert.ok(errors.some((e) => e.includes('https://')));
  assert.ok(errors.some((e) => e.includes('нужно 20')));
  assert.ok(errors.some((e) => e.includes('«ой»')));
  assert.ok(errors.some((e) => e.includes('по возрастанию')));
});
