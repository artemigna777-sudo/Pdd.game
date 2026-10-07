/**
 * Секретный экран автора игры: сколько людей заходит, откуда, что открывают и докуда доходят.
 * Вход — 7 касаний по «Версия игры» в настройках. Данные — GoatCounter (src/stats/).
 */
import { adminState, updateAdmin } from '../stats/admin.ts';
import { StatsError, loadReport, type Named, type PageCount, type StatsReport } from '../stats/goatcounter.ts';
import { statsSite } from '../stats/track.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

const people = (n: number) => `${n.toLocaleString('ru-RU')} ${plural(n, ['посетитель', 'посетителя', 'посетителей'])}`;
const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const siteUrl = () => `https://${statsSite()}.goatcounter.com`;

/** Отчёт за сессию игры: повторно не загружается, пока не нажать «Обновить». */
let cached: StatsReport | undefined;

/** Плитка с числом. */
function tile(label: string, value: number): HTMLElement {
  const text = value.toLocaleString('ru-RU');
  const size = text.length > 5 ? ' stat-tile__value--xl' : text.length > 3 ? ' stat-tile__value--lg' : '';
  return el('div', { class: 'stat-tile' }, el('p', { class: 'stat-tile__label' }, label), el('p', { class: `stat-tile__value${size}` }, text));
}

/** Столбики по дням: касание столбика показывает число. */
function dayChart(days: StatsReport['days']): HTMLElement {
  const max = Math.max(1, ...days.map((d) => d.count));
  const caption = el('p', { class: 'day-chart__caption', 'aria-live': 'polite' }, `Сегодня: ${people(days[days.length - 1].count)}. Коснись столбика, чтобы увидеть день.`);
  const bars = days.map((d, i) =>
    el(
      'button',
      {
        class: `day-chart__col${i === days.length - 1 ? ' is-today' : ''}`,
        type: 'button',
        'aria-label': `${shortDay(d.day)}: ${people(d.count)}`,
        onclick: (e: Event) => {
          caption.textContent = `${i === days.length - 1 ? 'Сегодня' : shortDay(d.day)}: ${people(d.count)}`;
          chart.querySelectorAll('.day-chart__col').forEach((b) => b.classList.toggle('is-picked', b === e.currentTarget));
        },
      },
      el('span', { class: 'day-chart__bar', style: `height: ${d.count ? Math.max(3, (d.count / max) * 100) : 0}%` }),
    ),
  );
  const chart = el(
    'figure',
    { class: 'day-chart' },
    el('div', { class: 'day-chart__plot' }, el('span', { class: 'day-chart__max' }, `макс. ${max}`), el('div', { class: 'day-chart__cols' }, ...bars)),
    el('div', { class: 'day-chart__axis', 'aria-hidden': 'true' }, el('span', {}, shortDay(days[0].day)), el('span', {}, shortDay(days[14].day)), el('span', {}, 'сегодня')),
  );
  return el('div', {}, chart, caption);
}

/** Список с полосками: название, число и доля от самого большого. */
function barList(rows: Named[], empty: string): HTMLElement {
  if (!rows.length) return el('p', { class: 'panel__note' }, empty);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return el(
    'ol',
    { class: 'bar-list' },
    ...rows.map((r) =>
      el(
        'li',
        { class: 'bar-list__row' },
        el('span', { class: 'bar-list__name' }, r.name),
        el('span', { class: 'bar-list__value' }, r.count.toLocaleString('ru-RU')),
        el('span', { class: 'bar-list__track', 'aria-hidden': 'true' }, el('span', { class: 'bar-list__fill', style: `width: ${r.count ? Math.max(2, (r.count / max) * 100) : 0}%` })),
      ),
    ),
  );
}

function section(title: string, note: string, body: HTMLElement): HTMLElement {
  return el('section', { class: 'panel' }, el('h2', { class: 'panel__title' }, title), note ? el('p', { class: 'panel__note' }, note) : null, body);
}

/** Сюжет: сколько людей открывали каждую главу, финал и сдали экзамен-босса. */
export function storyFunnel(pages: PageCount[], chapters: { id: string; title: string }[]): Named[] {
  const count = (path: string) => pages.find((p) => p.path === path)?.count ?? 0;
  return [
    ...chapters.map((c, i) => ({ name: `Глава ${i + 1}. ${c.title}`, count: count(`/city/${c.id}`) })),
    { name: 'Финал', count: count('/finale') },
    { name: 'Экзамен-босс сдан', count: count('boss-pass') },
  ];
}

function report(r: StatsReport, chapters: { id: string; title: string }[]): HTMLElement[] {
  const screens = r.pages.filter((p) => !p.event && !p.path.startsWith('/city/')).slice(0, 12);
  const events = r.pages.filter((p) => p.event);
  return [
    el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'panel__title' }, 'Посетители'),
      el('div', { class: 'stat-tiles' }, tile('Сегодня', r.today), tile('За 7 дней', r.week), tile('За 30 дней', r.month)),
      el('p', { class: 'panel__note' }, 'Человек за период: кто зашёл несколько раз за этот срок, считается один раз. Имён и телефонов счётчик не знает.'),
      dayChart(r.days),
    ),
    section('Сюжет: докуда дошли', 'Сколько человек за 30 дней открывали главу в городе.', barList(storyFunnel(r.pages, chapters), 'Пока никто не играл в сюжет.')),
    section('Что открывают', 'Экраны игры за 30 дней, кроме глав.', barList(screens.map((p) => ({ name: p.title || p.path, count: p.count })), 'Пока пусто.')),
    section('Что сделали', 'События за 30 дней: дошли до финала главы, сдали экзамен, отправили дуэль…', barList(events.map((p) => ({ name: p.title || p.path, count: p.count })), 'Событий пока не было.')),
    section('Откуда пришли', 'С каких сайтов и приложений перешли в игру. Ссылка с меткой (например, …/Pdd.game/?\u2060ref=\u2060tiktok) попадает сюда под этой меткой.', barList(r.refs.map((x) => ({ ...x, name: x.name || 'Напрямую' })), 'Пока все заходили напрямую.')),
    section('Телефоны', '', barList(r.systems, 'Пока пусто.')),
    section('Страны', '', barList(r.locations, 'Пока пусто.')),
    el('p', { class: 'panel__note stats-at' }, `Обновлено ${new Date(r.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`),
  ];
}

const FAILURE: Record<StatsError['kind'], string> = {
  token: 'Ключ не подошёл. Проверь, что он скопирован целиком и у него есть право «Read statistics».',
  network: 'Не получилось загрузить: нет интернета или браузер не дал загрузить статистику прямо в игре. Её всегда можно открыть на сайте счётчика.',
  server: 'Счётчик ответил ошибкой. Попробуй позже или открой статистику на сайте.',
};

/** Экран статистики. `chapters` — главы по порядку (для воронки сюжета). */
export function statsView(chapters: { id: string; title: string }[], onChange: () => void): HTMLElement {
  const root = el('div', { class: 'stats' });
  const admin = adminState();
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
          el('li', {}, 'На сайте счётчика: Settings → API → New API key, отметь «Read statistics» и вставь ключ ниже — статистика появится прямо здесь.'),
        ),
      ),
    );
  } else {
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel__title' }, 'Счётчик подключён'),
        el('p', { class: 'rewards__line' }, `Все данные и графики — на сайте счётчика ${site}.goatcounter.com.`),
        el('a', { class: 'btn btn--secondary', href: siteUrl(), target: '_blank', rel: 'noopener' }, 'Открыть полную статистику ↗'),
      ),
    );
  }

  // Ключ для просмотра прямо в игре.
  const keyPanel = el('section', { class: 'panel' }, el('h2', { class: 'panel__title' }, 'Ключ для просмотра'));
  if (admin.token) {
    keyPanel.append(
      el('p', { class: 'panel__note' }, 'Ключ сохранён только на этом телефоне.'),
      el(
        'div',
        { class: 'menu__row' },
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => ((cached = undefined), onChange()) }, 'Обновить'),
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => (updateAdmin({ token: '' }), (cached = undefined), onChange()) }, 'Забыть ключ'),
      ),
    );
  } else {
    const input = el('input', { class: 'field__input', type: 'password', autocomplete: 'off', placeholder: 'Ключ API GoatCounter', 'aria-label': 'Ключ API GoatCounter' });
    keyPanel.append(
      el('p', { class: 'panel__note' }, 'Ключ с правом «Read statistics» из настроек счётчика (Settings → API). Хранится только на этом телефоне.'),
      input,
      el(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          onclick: () => {
            const token = input.value.trim();
            if (!token) return input.focus();
            updateAdmin({ token });
            cached = undefined;
            onChange();
          },
        },
        'Сохранить ключ',
      ),
    );
  }
  root.append(keyPanel);

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

  if (site && admin.token) {
    const show = (r: StatsReport) => out.replaceChildren(...report(r, chapters));
    if (cached) show(cached);
    else {
      out.replaceChildren(el('p', { class: 'loading' }, 'Загружаю статистику…'));
      loadReport(site, admin.token).then(
        (r) => {
          cached = r;
          if (out.isConnected) show(r);
        },
        (e: unknown) => {
          const kind = e instanceof StatsError ? e.kind : 'network';
          out.replaceChildren(
            el(
              'section',
              { class: 'panel' },
              el('p', { class: 'banner banner--bad' }, FAILURE[kind]),
              el('a', { class: 'btn btn--secondary', href: siteUrl(), target: '_blank', rel: 'noopener' }, 'Открыть статистику на сайте ↗'),
            ),
          );
        },
      );
    }
  }
  return root;
}
