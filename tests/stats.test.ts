/**
 * Статистика для автора игры: числа из открытого счётчика GoatCounter, отчёт, список экранов
 * и событий, адрес подсчёта, «Сюжет». Сама отправка в тестах выключена: здесь нет браузера.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { EVENTS, SCREENS, chapterDone, trackedPaths } from '../src/stats/catalog.ts';
import { CHART_DAYS, StatsError, counterUrl, isoDay, loadReport, parseCount } from '../src/stats/goatcounter.ts';
import { countUrl, sourceOf, statsActive } from '../src/stats/track.ts';
import { storyFunnel } from '../src/ui/statsView.ts';

const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('ответ счётчика: число с разделителями, число, мусор', () => {
  assert.equal(parseCount({ count: '1,234' }), 1234);
  assert.equal(parseCount({ count: '1 234' }), 1234);
  assert.equal(parseCount({ count: 56 }), 56);
  assert.equal(parseCount({ count: '' }), 0);
  assert.equal(parseCount({}), 0);
  assert.equal(parseCount('не json'), 0);
});

test('адрес открытого счётчика: путь закодирован, период в параметрах', () => {
  assert.equal(counterUrl('kurier-pdd', 'TOTAL', '2026-10-01', '2026-10-07'), 'https://kurier-pdd.goatcounter.com/counter/TOTAL.json?start=2026-10-01&end=2026-10-07');
  assert.equal(counterUrl('k', '/city/ch1', 'a', 'b'), 'https://k.goatcounter.com/counter/%2Fcity%2Fch1.json?start=a&end=b');
  assert.equal(counterUrl('k', 'chapter-done/ch2', 'a', 'b'), 'https://k.goatcounter.com/counter/chapter-done%2Fch2.json?start=a&end=b');
});

test('отчёт: сегодня, 7 и 30 дней, дни графика, числа по адресам; без ключа и cookies', async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const fetcher = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    const path = decodeURIComponent(url.pathname.replace(/^\/counter\//, '').replace(/\.json$/, ''));
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    if (path === 'TOTAL') {
      if (start === end) return reply({ count: start === '2026-10-07' ? '4' : start === '2026-10-06' ? '7' : '0' });
      return reply({ count: start === '2026-10-01' ? '11' : '1,030' });
    }
    if (path === '/city/ch1') return reply({ count: '6' });
    if (path === 'boss-fail') return reply({ error: 'no such path' }, 404);
    if (path === 'install') return reply({}, 500);
    return reply({ count: '0' });
  }) as typeof fetch;
  const paths = trackedPaths(['ch1', 'ch2']);
  const r = await loadReport('kurier-pdd', paths, NOW, fetcher);
  assert.deepEqual([r.today, r.week, r.month], [4, 11, 1030]);
  assert.equal(r.days.length, CHART_DAYS);
  assert.deepEqual(r.days.slice(-2), [
    { day: '2026-10-06', count: 7 },
    { day: '2026-10-07', count: 4 },
  ]);
  assert.equal(r.days[0].day, isoDay(new Date(2026, 9, 7 - (CHART_DAYS - 1)).getTime()));
  assert.equal(r.counts['/city/ch1'], 6);
  assert.equal(r.counts['boss-fail'], 0, 'адреса, где никого не было (404), — ноль');
  assert.equal(r.failed, 1, 'ошибка сервера на одном адресе — ноль и отметка');
  assert.equal(Object.keys(r.counts).length, paths.length);
  assert.equal(calls.length, 3 + (CHART_DAYS - 1) + paths.length);
  assert.ok(calls.every((c) => c.url.origin === 'https://kurier-pdd.goatcounter.com' && c.init?.credentials === 'omit' && !c.init?.headers));
  const first = calls[0].url;
  assert.equal(first.pathname, '/counter/TOTAL.json', 'первым — посетители сегодня');
  assert.equal(first.searchParams.get('start'), '2026-10-07');
});

test('отчёт: счётчик выключен или нет сети — понятные ошибки', async () => {
  const status = (code: number) => (async () => reply({ error: 'disabled' }, code)) as unknown as typeof fetch;
  await assert.rejects(loadReport('s', [], NOW, status(403)), (e: unknown) => e instanceof StatsError && e.kind === 'disabled');
  await assert.rejects(loadReport('s', [], NOW, status(404)), (e: unknown) => e instanceof StatsError && e.kind === 'disabled');
  const offline = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await assert.rejects(loadReport('s', [], NOW, offline), (e: unknown) => e instanceof StatsError && e.kind === 'network');
});

test('«Сюжет»: открыли и прошли каждую главу, финал, экзамен-босс', () => {
  const rows = storyFunnel({ '/city/ch1': 12, [chapterDone('ch1')]: 5, '/city/ch2': 3, '/finale': 1, 'boss-pass': 1 }, [
    { id: 'ch1', title: 'Первый день' },
    { id: 'ch2', title: 'Знаки' },
  ]);
  assert.deepEqual(rows, [
    { name: 'Глава 1. Первый день', count: 12, note: 'прошли: 5' },
    { name: 'Глава 2. Знаки', count: 3, note: 'прошли: 0' },
    { name: 'Финал', count: 1 },
    { name: 'Экзамен-босс сдан', count: 1 },
  ]);
});

/** Все файлы .ts в папке и вложенных. */
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
  });

test('экран статистики спрашивает ровно то, что игра отправляет', () => {
  const code = sources('src')
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const sent = new Set([...code.matchAll(/track(?:Event|Once|OncePerDay)\(\s*(?:[\w.]+\s*\?\s*)?'([a-z-]+)'(?:\s*:\s*'([a-z-]+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean));
  const listed = new Set(EVENTS.map(([name]) => name));
  for (const name of sent) assert.ok(listed.has(name) || name === 'chapter-done', `событие «${name}» есть в списке экрана статистики`);
  for (const name of listed) assert.ok(sent.has(name), `событие «${name}» игра отправляет`);
  const app = readFileSync('src/ui/app.ts', 'utf8');
  for (const [path] of SCREENS) {
    if (path === '/') continue;
    const name = path.slice(1);
    assert.ok(app.includes(`${name}: '`) || app.includes(`'${name}': '`), `экран ${path} отправляется из app.ts`);
  }
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
