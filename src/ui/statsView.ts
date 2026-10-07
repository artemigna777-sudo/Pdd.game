/**
 * Секретный экран автора игры: сколько людей заходит, что открывают, докуда доходят, откуда пришли.
 * Вход — 7 касаний по «Версия игры» в настройках и пароль автора. Числа — через посредника с ключом
 * автора (src/stats/proxy.ts); если он не ответил — из открытого счётчика GoatCounter
 * (src/stats/goatcounter.ts), там нет источников, телефонов и стран.
 */
import { adminState, updateAdmin } from '../stats/admin.ts';
import { EVENTS, FINALE, SCREENS, chapterDone, chapterPath, trackedPaths } from '../stats/catalog.ts';
import { StatsError, loadReport, type Named, type StatsReport } from '../stats/goatcounter.ts';
import { ProxyError, loadProxyReport, type ProxyFailure } from '../stats/proxy.ts';
import { statsProxy, statsSite } from '../stats/track.ts';
import { askAuthorPassword } from './authorLogin.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

const people = (n: number) => `${n.toLocaleString('ru-RU')} ${plural(n, ['посетитель', 'посетителя', 'посетителей'])}`;
const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const siteUrl = () => `https://${statsSite()}.goatcounter.com`;
/** Галочка в настройках счётчика, без которой игра не может взять числа. */
const SETTING = '«Allow adding visitor counts on your website»';

/** Строка списка: название, число и подпись под названием. */
type Row = Named & { note?: string };

/** Отчёт за сессию игры (и почему не через посредника): повторно не загружается, пока не нажать «Обновить». */
let cached: { report: StatsReport; proxyFailure?: ProxyFailure } | undefined;

/** Плитка с числом. */
function tile(label: string, value: number): HTMLElement {
  const text = value.toLocaleString('ru-RU');
  const size = text.length > 5 ? ' stat-tile__value--xl' : text.length > 3 ? ' stat-tile__value--lg' : '';
  return el('div', { class: 'stat-tile' }, el('p', { class: 'stat-tile__label' }, label), el('p', { class: `stat-tile__value${size}` }, text));
}

/** Столбики по дням: касание столбика показывает число. */
function dayChart(days: StatsReport['days']): HTMLElement {
  const max = Math.max(1, ...days.map((d) => d.count));
  const last = days.length - 1;
  const caption = el('p', { class: 'day-chart__caption', 'aria-live': 'polite' }, `Сегодня: ${people(days[last].count)}. Коснись столбика, чтобы увидеть день.`);
  const bars = days.map((d, i) =>
    el(
      'button',
      {
        class: `day-chart__col${i === last ? ' is-today' : ''}`,
        type: 'button',
        'aria-label': `${shortDay(d.day)}: ${people(d.count)}`,
        onclick: (e: Event) => {
          caption.textContent = `${i === last ? 'Сегодня' : shortDay(d.day)}: ${people(d.count)}`;
          chart.querySelectorAll('.day-chart__col').forEach((b) => b.classList.toggle('is-picked', b === e.currentTarget));
        },
      },
      el('span', { class: 'day-chart__bar', style: `height: ${d.count ? Math.max(3, (d.count / max) * 100) : 0}%` }),
    ),
  );
  const chart = el(
    'figure',
    { class: 'day-chart' },
    el(
      'div',
      { class: 'day-chart__plot' },
      el('span', { class: 'day-chart__max' }, `макс. ${max}`),
      el('div', { class: 'day-chart__cols', style: `grid-template-columns: repeat(${days.length}, minmax(0, 1fr))` }, ...bars),
    ),
    el('div', { class: 'day-chart__axis', 'aria-hidden': 'true' }, el('span', {}, shortDay(days[0].day)), el('span', {}, shortDay(days[Math.floor(last / 2)].day)), el('span', {}, 'сегодня')),
  );
  return el('div', {}, chart, caption);
}

/** Список с полосками: название, число и доля от самого большого. */
function barList(rows: Row[], empty: string): HTMLElement {
  if (!rows.some((r) => r.count > 0)) return el('p', { class: 'panel__note' }, empty);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return el(
    'ol',
    { class: 'bar-list' },
    ...rows.map((r) =>
      el(
        'li',
        { class: 'bar-list__row' },
        el('span', { class: 'bar-list__name' }, r.name, r.note ? el('span', { class: 'bar-list__note' }, r.note) : null),
        el('span', { class: 'bar-list__value' }, r.count.toLocaleString('ru-RU')),
        el('span', { class: 'bar-list__track', 'aria-hidden': 'true' }, el('span', { class: 'bar-list__fill', style: `width: ${r.count ? Math.max(2, (r.count / max) * 100) : 0}%` })),
      ),
    ),
  );
}

function section(title: string, note: string, body: HTMLElement): HTMLElement {
  return el('section', { class: 'panel' }, el('h2', { class: 'panel__title' }, title), note ? el('p', { class: 'panel__note' }, note) : null, body);
}

/** Сюжет: сколько людей открывали каждую главу и прошли её, финал и экзамен-босс. */
export function storyFunnel(counts: Record<string, number>, chapters: { id: string; title: string }[]): Row[] {
  const count = (path: string) => counts[path] ?? 0;
  return [
    ...chapters.map((c, i) => ({ name: `Глава ${i + 1}. ${c.title}`, count: count(chapterPath(c.id)), note: `прошли: ${count(chapterDone(c.id)).toLocaleString('ru-RU')}` })),
    { name: 'Финал', count: count(FINALE) },
    { name: 'Экзамен-босс сдан', count: count('boss-pass') },
  ];
}

/** Строки по списку адресов: от больших чисел к меньшим, нули — в конце. */
const ranked = (items: readonly (readonly [string, string])[], counts: Record<string, number>): Row[] =>
  items.map(([path, name]) => ({ name, count: counts[path] ?? 0 })).sort((a, b) => b.count - a.count);

function report(r: StatsReport, chapters: { id: string; title: string }[], refresh: () => void): HTMLElement[] {
  return [
    el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'panel__title' }, 'Посетители'),
      el('div', { class: 'stat-tiles' }, tile('Сегодня', r.today), tile('За 7 дней', r.week), tile('За 30 дней', r.month)),
      el('p', { class: 'panel__note' }, 'Человек за период: кто зашёл несколько раз за этот срок, считается один раз. Имён и телефонов счётчик не знает.'),
      dayChart(r.days),
    ),
    section('Сюжет: докуда дошли', 'Сколько человек за 30 дней открывали главу в городе и сколько её прошли.', barList(storyFunnel(r.counts, chapters), 'Пока никто не играл в сюжет.')),
    section('Что открывают', 'Экраны игры за 30 дней, кроме глав.', barList(ranked(SCREENS, r.counts), 'Пока пусто.')),
    section('Что сделали', 'События за 30 дней.', barList(ranked(EVENTS, r.counts), 'Событий пока не было.')),
    ...(r.refs && r.systems && r.locations
      ? [
          section('Откуда пришли', 'С каких сайтов и приложений перешли в игру за 30 дней. Метка из ссылки (например, «tiktok») — тоже здесь.', barList(r.refs.map((x) => ({ ...x, name: x.name || 'Напрямую' })), 'Пока все заходили напрямую.')),
          section('Телефоны', '', barList(r.systems, 'Пока пусто.')),
          section('Страны', '', barList(r.locations, 'Пока пусто.')),
        ]
      : [
          el(
            'section',
            { class: 'panel' },
            el('h2', { class: 'panel__title' }, 'Откуда пришли, телефоны, страны'),
            el('p', { class: 'panel__note' }, 'Открытый счётчик их не отдаёт — они на сайте счётчика и через посредника. Там же метка из ссылки (например, «tiktok»).'),
            el('a', { class: 'btn btn--secondary', href: siteUrl(), target: '_blank', rel: 'noopener' }, 'Открыть на сайте ↗'),
          ),
        ]),
    r.failed ? el('p', { class: 'panel__note' }, `Не загрузилось чисел: ${r.failed}, вместо них нули. Нажми «Обновить».`) : null,
    el(
      'div',
      { class: 'stats-at' },
      el('p', { class: 'panel__note' }, `Обновлено ${new Date(r.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`),
      el('button', { class: 'btn btn--secondary', type: 'button', onclick: refresh }, 'Обновить'),
    ),
  ].filter((x): x is HTMLElement => x !== null);
}

const PROXY_FAILURE: Record<ProxyFailure, string> = {
  key: 'Посредник не принял ключ автора: проверь секрет STATS_KEY в Cloudflare (Settings → Variables and Secrets) или войди в статистику заново.',
  setup: 'У посредника не заданы секреты GC_TOKEN и STATS_KEY: Cloudflare → kurier-pdd-stats → Settings → Variables and Secrets.',
  'gc-token': 'GoatCounter не принял ключ посредника: создай в GoatCounter новый ключ API с правом «Read statistics» и замени им секрет GC_TOKEN в Cloudflare.',
  server: 'Посредник ответил ошибкой.',
  network: 'Посредник не ответил: нет интернета или Cloudflare недоступен.',
};

const FAILURE: Record<StatsError['kind'], string> = {
  disabled: `Счётчик не отдал числа. На сайте счётчика открой Settings, отметь ${SETTING} и нажми Save.`,
  network: `Не получилось загрузить. Проверь интернет. Если интернет есть — на сайте счётчика открой Settings, отметь ${SETTING} и нажми Save.`,
};

/** Экран статистики. `chapters` — главы по порядку (для «Сюжета»). */
export function statsView(chapters: { id: string; title: string }[], onChange: () => void): HTMLElement {
  const root = el('div', { class: 'stats' });
  // Перезаписать вход без ключа API из прошлой версии.
  const admin = updateAdmin({});
  const site = statsSite();
  const out = el('div', { class: 'stats__report' });

  if (!site) {
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel__title' }, 'Счётчик ещё не подключён'),
        el('p', { class: 'rewards__line' }, 'Игра готова считать заходы, нужен бесплатный счётчик GoatCounter. Без cookies и без личных данных игроков.'),
        el(
          'ol',
          { class: 'stats-steps' },
          el('li', {}, 'Зарегистрируйся на goatcounter.com (Sign up): почта, пароль и код сайта, например kurier-pdd.'),
          el('li', {}, 'Пришли код сайта Claude — он впишет его в игру. После публикации игра начнёт считать заходы.'),
          el('li', {}, `На сайте счётчика открой Settings, отметь ${SETTING} и нажми Save — тогда статистика появится прямо здесь.`),
        ),
      ),
    );
  } else {
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel__title' }, 'Счётчик подключён'),
        el('p', { class: 'rewards__line' }, `Здесь — главное. Всё остальное — на сайте счётчика ${site}.goatcounter.com.`),
        el('a', { class: 'btn btn--secondary', href: siteUrl(), target: '_blank', rel: 'noopener' }, 'Открыть полную статистику ↗'),
      ),
    );
  }

  // Свои заходы не считать.
  const self = el(
    'button',
    {
      class: 'choice choice--toggle',
      type: 'button',
      'aria-pressed': String(admin.selfIgnore),
      onclick: () => {
        const on = !adminState().selfIgnore;
        updateAdmin({ selfIgnore: on });
        self.setAttribute('aria-pressed', String(on));
      },
    },
    el('span', { class: 'choice__title' }, 'Не считать мои заходы', el('span', { class: 'switch', 'aria-hidden': 'true' })),
    el('span', { class: 'choice__hint' }, 'Заходы с этого телефона не попадут в статистику.'),
  );
  root.append(el('div', { class: 'choices' }, self), out);

  if (site) {
    const refresh = () => ((cached = undefined), onChange());
    const proxy = statsProxy();
    // Вход до посредника: ключа автора на телефоне нет, его даёт только пароль.
    const relogin =
      proxy && !admin.key
        ? el(
            'section',
            { class: 'panel' },
            el('p', { class: 'banner' }, 'Статистика теперь идёт через посредника, только для автора. Введи пароль ещё раз — тогда здесь появятся и источники, телефоны, страны.'),
            el('button', { class: 'btn btn--primary', type: 'button', onclick: () => askAuthorPassword(refresh) }, 'Ввести пароль'),
          )
        : null;
    const proxyNote = (kind?: ProxyFailure) => (kind ? el('p', { class: 'banner banner--bad' }, `${PROXY_FAILURE[kind]} Пока показываю открытый счётчик.`) : null);
    const show = (c: NonNullable<typeof cached>) => out.replaceChildren(...[relogin, proxyNote(c.proxyFailure), ...report(c.report, chapters, refresh)].filter((x): x is HTMLElement => x !== null));
    if (cached) show(cached);
    else {
      out.replaceChildren(el('p', { class: 'loading' }, 'Загружаю статистику…'));
      let proxyFailure: ProxyFailure | undefined;
      const load = async (): Promise<StatsReport> => {
        if (proxy && admin.key) {
          try {
            return await loadProxyReport(proxy, admin.key);
          } catch (e) {
            proxyFailure = e instanceof ProxyError ? e.kind : 'network';
          }
        }
        return loadReport(site, trackedPaths(chapters.map((c) => c.id)));
      };
      load().then(
        (r) => {
          cached = { report: r, proxyFailure };
          if (out.isConnected) show(cached);
        },
        (e: unknown) => {
          const kind = e instanceof StatsError ? e.kind : 'network';
          out.replaceChildren(
            ...[
              relogin,
              proxyFailure ? el('p', { class: 'banner banner--bad' }, PROXY_FAILURE[proxyFailure]) : null,
              el(
                'section',
                { class: 'panel' },
                el('p', { class: 'banner banner--bad' }, FAILURE[kind]),
                el('a', { class: 'btn btn--secondary', href: siteUrl(), target: '_blank', rel: 'noopener' }, 'Открыть сайт счётчика ↗'),
                el('button', { class: 'btn btn--secondary', type: 'button', onclick: refresh }, 'Попробовать ещё раз'),
              ),
            ].filter((x): x is HTMLElement => x !== null),
          );
        },
      );
    }
  }
  return root;
}
