/**
 * Статистика через посредника (src/stats/proxy.ts): запросы с ключом автора, периоды от полуночи
 * по часам телефона, разбор ответов API GoatCounter, понятные ошибки. Посредник подменён.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHART_DAYS } from '../src/stats/goatcounter.ts';
import { ProxyError, apiTime, loadProxyReport, parseHits, parseNamed, parseTotal } from '../src/stats/proxy.ts';

const NOW = new Date(2026, 9, 7, 15, 30).getTime();
const PROXY = 'https://kurier-pdd-stats.example.workers.dev';
const KEY = 'c'.repeat(64);
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('разбор ответов API: всего и по дням, экраны и события, названия', () => {
  assert.deepEqual(parseTotal({ total: 12, stats: [{ day: '2026-10-07', daily: 5 }, { day: '2026-10-06T00:00:00Z', daily: '3' }, { day: 'вчера', daily: 9 }] }), {
    total: 12,
    days: [
      { day: '2026-10-06', count: 3 },
      { day: '2026-10-07', count: 5 },
    ],
  });
  assert.deepEqual(parseHits({ hits: [{ path: '/', count: 7 }, { path: 'exam-pass', event: true, count: 2 }, { path: '/', count: 1 }, { count: 4 }] }), { '/': 8, 'exam-pass': 2 });
  assert.deepEqual(parseNamed({ stats: [{ name: 'Android', count: 3 }, { id: 'iOS', count: 8 }, { name: 'пусто', count: 0 }] }), [
    { name: 'iOS', count: 8 },
    { name: 'Android', count: 3 },
  ]);
  assert.deepEqual(parseTotal('не json'), { total: 0, days: [] });
});

test('отчёт через посредника: ключ автора, периоды от полуночи по часам телефона, источники, телефоны, страны', async () => {
  const calls: { url: URL; auth: string | null; credentials?: RequestCredentials }[] = [];
  const day0 = apiTime(new Date(2026, 9, 7).getTime());
  const fetcher = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, auth: new Headers(init?.headers).get('Authorization'), credentials: init?.credentials });
    const page = url.pathname.replace('/api/v0/stats/', '');
    if (page === 'total') {
      const start = url.searchParams.get('start');
      if (start === day0) return reply({ total: 4, stats: [] });
      if (start === apiTime(new Date(2026, 9, 1).getTime())) return reply({ total: 11, stats: [] });
      return reply({ total: 30, stats: [{ day: '2026-10-06', daily: 7 }, { day: '2026-10-07', daily: 3 }] });
    }
    if (page === 'hits') return reply({ hits: [{ path: '/city/ch1', count: 6 }, { path: 'exam-pass', count: 2 }] });
    if (page === 'toprefs') return reply({ stats: [{ name: 'tiktok', count: 5 }, { name: '', id: '', count: 2 }] });
    if (page === 'systems') return reply({ stats: [{ name: 'iOS', count: 9 }] });
    return reply({ stats: [{ name: 'Russia', count: 9 }] });
  }) as typeof fetch;
  const r = await loadProxyReport(PROXY, KEY, NOW, fetcher);
  assert.equal(r.source, 'proxy');
  assert.deepEqual([r.today, r.week, r.month], [4, 11, 30]);
  assert.equal(r.days.length, CHART_DAYS);
  assert.deepEqual(r.days.slice(-2), [
    { day: '2026-10-06', count: 7 },
    { day: '2026-10-07', count: 4 },
  ], 'сегодняшний столбик — как плитка «Сегодня»');
  assert.deepEqual(r.counts, { '/city/ch1': 6, 'exam-pass': 2 });
  assert.deepEqual(r.refs, [{ name: 'tiktok', count: 5 }, { name: '', count: 2 }]);
  assert.deepEqual(r.systems, [{ name: 'iOS', count: 9 }]);
  assert.deepEqual(r.locations, [{ name: 'Russia', count: 9 }]);
  assert.equal(calls.length, 7);
  assert.ok(calls.every((c) => c.url.origin === PROXY && c.auth === `Bearer ${KEY}` && c.credentials === 'omit'));
  assert.equal(calls[0].url.searchParams.get('start'), day0, 'с полуночи по часам телефона, в UTC');
  assert.equal(calls[0].url.searchParams.get('end'), apiTime(NOW));
  assert.match(calls[0].url.searchParams.get('end')!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'без долей секунды');
});

test('ошибки посредника: ключ автора, настройка, ключ GoatCounter, сбой, нет связи', async () => {
  const fail = (status: number, body: unknown) => (async () => reply(body, status)) as unknown as typeof fetch;
  const kind = async (fetcher: typeof fetch) => {
    try {
      await loadProxyReport(PROXY, KEY, NOW, fetcher);
      return 'ok';
    } catch (e) {
      return e instanceof ProxyError ? e.kind : 'другая ошибка';
    }
  };
  assert.equal(await kind(fail(401, { error: 'key' })), 'key');
  assert.equal(await kind(fail(500, { error: 'setup' })), 'setup');
  assert.equal(await kind(fail(502, { error: 'gc-token' })), 'gc-token');
  assert.equal(await kind(fail(502, { error: 'gc-error', status: 500 })), 'server');
  assert.equal(await kind((async () => new Response('не json')) as unknown as typeof fetch), 'server');
  assert.equal(
    await kind((async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch),
    'network',
  );
});
