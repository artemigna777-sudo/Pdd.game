/**
 * Статистика для автора игры: разбор ответов GoatCounter, отчёт за 30 дней, адрес счётчика,
 * воронка сюжета. Сама отправка выключена: код сайта не задан, а в тестах нет браузера.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StatsError, isoDay, loadReport, parseHits, parseNamed, parseTotal } from '../src/stats/goatcounter.ts';
import { countUrl, sourceOf, statsActive } from '../src/stats/track.ts';

const NOW = new Date(2026, 9, 7, 15, 0).getTime();

test('разбор «всего за период»: дни по порядку, мусор отброшен', () => {
  const r = parseTotal({ total: 42, stats: [{ day: '2026-10-07', daily: 5 }, { day: '2026-10-06T00:00:00Z', daily: '3' }, { day: 'вчера', daily: 9 }, null] });
  assert.equal(r.total, 42);
  assert.deepEqual(r.days, [
    { day: '2026-10-06', count: 3 },
    { day: '2026-10-07', count: 5 },
  ]);
  assert.deepEqual(parseTotal('не json'), { total: 0, days: [] });
});

test('разбор экранов и событий; названий и чисел', () => {
  const hits = parseHits({ hits: [{ path: '/', title: 'Меню', count: 7 }, { path: 'exam-pass', title: 'Экзамен сдан', event: true, count: 9 }, { title: 'без пути', count: 1 }] });
  assert.deepEqual(hits, [
    { path: 'exam-pass', title: 'Экзамен сдан', event: true, count: 9 },
    { path: '/', title: 'Меню', event: false, count: 7 },
  ]);
  assert.deepEqual(parseNamed({ stats: [{ name: 'Android', count: 3 }, { id: 'iOS', count: 8 }, { name: 'пусто', count: 0 }] }), [
    { name: 'iOS', count: 8 },
    { name: 'Android', count: 3 },
  ]);
});

test('отчёт: 30 дней с нулями, сегодня, 7 и 30 дней; ключ — в заголовке', async () => {
  const calls: { url: string; auth: string }[] = [];
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, auth: String((init?.headers as Record<string, string>).Authorization) });
    if (url.includes('stats/total') && url.includes('start=2026-10-01')) return reply({ total: 11, stats: [{ day: '2026-10-07', daily: 4 }] });
    if (url.includes('stats/total')) return reply({ total: 30, stats: [{ day: '2026-09-08', daily: 2 }, { day: '2026-10-07', daily: 4 }] });
    if (url.includes('stats/hits')) return reply({ hits: [{ path: '/city/ch1', title: 'Город: глава 1', count: 6 }] });
    if (url.includes('stats/toprefs')) return reply({ stats: [{ name: 'tiktok', count: 5 }] });
    return reply({ stats: [] });
  }) as typeof fetch;
  const r = await loadReport('kurier-pdd', 'secret-42', NOW, fetcher);
  assert.equal(r.days.length, 30);
  assert.deepEqual([r.days[0], r.days[29]], [
    { day: '2026-09-08', count: 2 },
    { day: '2026-10-07', count: 4 },
  ]);
  assert.equal(r.days.filter((d) => d.count === 0).length, 28, 'дни без посетителей — нули');
  assert.deepEqual([r.today, r.week, r.month], [4, 11, 30]);
  assert.deepEqual(r.refs, [{ name: 'tiktok', count: 5 }]);
  assert.equal(calls.length, 6);
  assert.ok(calls.every((c) => c.url.startsWith('https://kurier-pdd.goatcounter.com/api/v0/stats/') && c.auth === 'Bearer secret-42'));
  assert.ok(calls[0].url.includes('start=2026-09-08') && calls[0].url.includes('end=2026-10-07'));
});

test('отчёт: неверный ключ, ошибка сервера и нет сети — понятные ошибки', async () => {
  const fail = (status: number) => (async () => new Response('{}', { status })) as unknown as typeof fetch;
  await assert.rejects(loadReport('s', 't', NOW, fail(401)), (e: unknown) => e instanceof StatsError && e.kind === 'token');
  await assert.rejects(loadReport('s', 'ключ с пробелом', NOW, fail(200)), (e: unknown) => e instanceof StatsError && e.kind === 'token');
  await assert.rejects(loadReport('s', 't', NOW, fail(500)), (e: unknown) => e instanceof StatsError && e.kind === 'server');
  const offline = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await assert.rejects(loadReport('s', 't', NOW, offline), (e: unknown) => e instanceof StatsError && e.kind === 'network');
});

test('адрес счётчика: экран, событие, откуда пришли и метка из ссылки', () => {
  const url = new URL(countUrl('kurier-pdd', { p: 'exam-pass', t: 'Экзамен сдан', e: true, r: 'https://www.tiktok.com/', q: '?ref=tiktok' }, '390,844,3', 'abc'));
  assert.equal(url.origin + url.pathname, 'https://kurier-pdd.goatcounter.com/count');
  assert.deepEqual(Object.fromEntries(url.searchParams), { p: 'exam-pass', t: 'Экзамен сдан', s: '390,844,3', rnd: 'abc', e: 'true', r: 'https://www.tiktok.com/', q: '?ref=tiktok' });
  assert.equal(new URL(countUrl('x', { p: '/', t: 'Меню' }, '1,1,1', 'r')).searchParams.has('e'), false);
});

test('откуда пришли: метка из ссылки важнее сайта, свои переходы не считаются', () => {
  const origin = 'https://artemigna777-sudo.github.io';
  assert.equal(sourceOf('?ref=tiktok', '', origin), 'tiktok');
  assert.equal(sourceOf('?utm_source=telegram&utm_campaign=ads', 'https://t.me/', origin), 'telegram');
  assert.equal(sourceOf('?src=bio', '', origin), 'bio');
  assert.equal(sourceOf('', 'https://www.tiktok.com/', origin), 'https://www.tiktok.com/');
  assert.equal(sourceOf('', `${origin}/Pdd.game/`, origin), '');
  assert.equal(sourceOf('?ref=', '', origin), '');
  assert.equal(sourceOf('#duel=abc', '', origin), '');
});

test('без браузера (автотесты на Node) статистика не собирается', () => {
  assert.equal(statsActive(), false);
  assert.equal(isoDay(NOW), '2026-10-07');
});
