/**
 * Видеоразборы партнёра: тайм-коды, ссылки на нужный вопрос, плеер в окне игры, проверка данных.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PARTNER, courseUrl, directUrl, embedUrl, formatTime, freeTickets, inCourseOnly, parseTime, partnerVideo, validatePartner, type PartnerData } from '../src/partner/partner.ts';

const starts = (first: string, n = 20) => Object.fromEntries([first, ...Array.from({ length: n - 1 }, (_, i) => `${i + 1}:${String((i * 7) % 60).padStart(2, '0')}`)].map((t, i) => [i + 1, t]));

const DATA: PartnerData = {
  author: 'Пётр',
  role: 'автоинструктор',
  course: { title: 'Учимся понимать ПДД через разбор билетов', url: 'https://school.example/course?ref=1' },
  tickets: {
    1: [{ url: 'https://www.youtube.com/watch?v=abcDEF12345', starts: starts('0:15') }],
    2: [
      { url: 'https://vkvideo.ru/video-123456_789012', starts: { 1: '0:10', 2: '1:00' } },
      { url: 'https://vkvideo.ru/video-123456_789013', starts: { 3: '0:02', 4: '2:14' } },
    ],
    3: [{ url: 'https://rutube.ru/video/0123456789abcdef0123456789abcdef/', starts: starts('0:20') }],
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
  assert.deepEqual(yt, { ticket: 1, number: 1, url: DATA.tickets[1][0].url, start: 15 });
  assert.equal(embedUrl(yt), 'https://www.youtube.com/embed/abcDEF12345?start=15&rel=0&playsinline=1');
  assert.equal(directUrl(yt), 'https://www.youtube.com/watch?v=abcDEF12345&t=15s');

  const vk = partnerVideo({ ticket: 2, number: 2 }, DATA)!;
  assert.equal(vk.start, 60);
  assert.equal(embedUrl(vk), 'https://vk.com/video_ext.php?oid=-123456&id=789012&hd=2&t=1m0s');
  assert.equal(directUrl(vk), 'https://vkvideo.ru/video-123456_789012?t=1m0s');
  // Вторая половина билета — в другом видео.
  const second = partnerVideo({ ticket: 2, number: 4 }, DATA)!;
  assert.equal(second.url, 'https://vkvideo.ru/video-123456_789013');
  assert.equal(embedUrl(second), 'https://vk.com/video_ext.php?oid=-123456&id=789013&hd=2&t=2m14s');
  assert.equal(partnerVideo({ ticket: 2, number: 5 }, DATA), undefined, 'вопроса нет ни в одном видео — кнопки нет');

  const rt = partnerVideo({ ticket: 3, number: 1 }, DATA)!;
  assert.equal(embedUrl(rt), 'https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef?t=20');

  // Страница не с видеохостинга — без плеера, открывается отдельно.
  const other = partnerVideo({ ticket: 1, number: 1 }, { ...DATA, tickets: { 1: [{ url: 'https://school.example/lesson/1', starts: starts('0:15') }] } })!;
  assert.equal(embedUrl(other), undefined);
  assert.equal(directUrl(other), 'https://school.example/lesson/1');

  assert.equal(partnerVideo({ ticket: 4, number: 1 }, DATA), undefined, 'у билета 4 видео нет');
  assert.equal(courseUrl(DATA), 'https://school.example/course?ref=1&utm_source=kurier-pdd&utm_medium=game');
});

test('видео Петра: билеты 1–3, все 60 вопросов, тайм-коды по порядку; дальше билетов нет', () => {
  assert.deepEqual(validatePartner(PARTNER), []);
  for (const ticket of [1, 2, 3])
    for (let number = 1; number <= 20; number++) {
      const v = partnerVideo({ ticket, number }, PARTNER);
      assert.ok(v?.start !== undefined, `билет ${ticket}, вопрос ${number}: есть видео и тайм-код`);
      assert.match(v!.url, /^https:\/\/vkvideo\.ru\/video-148551566_\d+$/);
      assert.match(embedUrl(v!)!, /^https:\/\/vk\.com\/video_ext\.php\?oid=-148551566&id=\d+&hd=2&t=\d+m\d+s$/);
    }
  // Билет 2: вопросы 1–11 и 12–20 — в разных видео; билет 3: 1–10 и 11–20.
  assert.notEqual(partnerVideo({ ticket: 2, number: 11 }, PARTNER)!.url, partnerVideo({ ticket: 2, number: 12 }, PARTNER)!.url);
  assert.notEqual(partnerVideo({ ticket: 3, number: 10 }, PARTNER)!.url, partnerVideo({ ticket: 3, number: 11 }, PARTNER)!.url);
  assert.equal(partnerVideo({ ticket: 1, number: 20 }, PARTNER)!.start, 53 * 60 + 30);
  assert.equal(partnerVideo({ ticket: 4, number: 1 }, PARTNER), undefined);
  assert.equal(
    courseUrl(PARTNER),
    'https://vk.com/market/product/128213-onlayn-kurs-quotuchimsya-ponimat-pdd-cherez-razbor-biletovquot-148551566-12559646?utm_source=kurier-pdd&utm_medium=game',
  );
});

test('билеты 4–40 Петра: разбор только в курсе; у билетов 1–3 — бесплатное видео', () => {
  assert.deepEqual(PARTNER.course?.tickets, [1, 40]);
  assert.equal(freeTickets(PARTNER), '1–3');
  for (let ticket = 1; ticket <= 40; ticket++)
    for (const number of [1, 20]) assert.equal(inCourseOnly({ ticket, number }, PARTNER), ticket > 3, `билет ${ticket}, вопрос ${number}`);
  // Курс без списка билетов или без ссылки — закрытого блока нет.
  assert.equal(inCourseOnly({ ticket: 4, number: 1 }, DATA), false);
  assert.equal(inCourseOnly({ ticket: 4, number: 1 }, { ...DATA, course: { title: 'Курс', url: 'http://x', tickets: [1, 40] } }), false);
  // Билет вне курса и вопрос без видео в билете с видео.
  const some: PartnerData = { ...DATA, course: { ...DATA.course!, tickets: [1, 10] } };
  assert.equal(inCourseOnly({ ticket: 11, number: 1 }, some), false);
  assert.equal(inCourseOnly({ ticket: 2, number: 5 }, some), true);
  assert.equal(inCourseOnly({ ticket: 2, number: 4 }, some), false);
  assert.equal(freeTickets({ ...DATA, tickets: { 1: DATA.tickets[1], 2: DATA.tickets[2], 5: DATA.tickets[3], 7: [{ url: 'http://x', starts: {} }] } }), '1–2, 5');
  assert.equal(freeTickets({ ...DATA, tickets: {} }), '');
});

test('проверка данных партнёра ловит ошибки', () => {
  assert.deepEqual(validatePartner(DATA), []);
  const bad: PartnerData = {
    ...DATA,
    course: { ...DATA.course!, tickets: [3, 41] },
    tickets: {
      41: [{ url: 'http://x', starts: { 1: '1:00', 2: '0:30', 3: 'ой', 25: '9:00' } }],
      5: [
        { url: 'https://a.example', starts: { 1: '0:10' } },
        { url: 'https://b.example', starts: { 1: '0:20' } },
      ],
    },
  };
  const errors = validatePartner(bad);
  for (const part of ['такого билета нет', 'https://', 'по возрастанию', '«ой»', 'вопроса 25', 'в двух видео', 'билеты 3–41']) assert.ok(errors.some((e) => e.includes(part)), part);
});
