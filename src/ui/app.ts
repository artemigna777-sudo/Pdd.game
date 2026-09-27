import type * as Phaser from 'phaser';
import { GAME_SUBTITLE, GAME_TITLE } from '../config.ts';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import { allAttempts, findAttempt, recordAttempt, summarize } from '../data/ticketHistory.ts';
import type { Question } from '../data/types.ts';
import { setGameActive } from '../game/game.ts';
import {
  CONTROL_TICKETS,
  chapterResult,
  currentChapter,
  dueReviews,
  ensureControl,
  finaleStatus,
  isUnlocked,
  levelOf,
  percent,
  progress,
  recordAnswer,
  recordControl,
  reviewQueue,
  saveProgress,
  trainingSet,
  type AnswerOutcome,
} from '../progress/progress.ts';
import { installMode, onInstallModeChange, promptInstall } from '../pwa.ts';
import { FINALE_STORY, STORY } from '../story/story.ts';
import { chapterInfo } from '../world/mapping.ts';
import { TEMPLATES } from '../world/templates.ts';
import { cityScreen, levelUpToast } from './cityScreen.ts';
import { closeOverlay, playCutscene, showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';
import { ICONS } from './icons.ts';
import { dueLabel, levelMeter, progressView, reviewView, starsText } from './progressView.ts';
import { renderQuestionCard, type AnswerResult } from './questionCard.ts';
import { settingsPanel } from './settingsPanel.ts';
import { attemptView, historyView, scoreBadge, ticketQuestions } from './ticketHistoryView.ts';
import { showToast } from './toast.ts';

/**
 * Экраны: меню поверх анимированной улицы, главы сюжета и город-район главы, финал с
 * контрольными билетами, «Разбор ошибок», «Прогресс», билеты целиком с историей попыток
 * и настройки.
 */
type DrillMode = 'review' | 'practice' | 'topic' | 'weak';
type Route =
  | { name: 'menu' }
  | { name: 'chapters' }
  | { name: 'city'; chapter: string }
  | { name: 'settings' }
  | { name: 'tickets' }
  | { name: 'ticket'; ticket: number }
  | { name: 'history' }
  /** Результат и разбор попытки: сразу после билета, из истории или после контрольного билета. */
  | { name: 'attempt'; at: number; via: 'ticket' | 'history' | 'control'; control?: { passed: boolean; replacement?: number } }
  | { name: 'review' }
  | { name: 'progress' }
  /** Серия вопросов: повтор ошибок, тренировка ошибок, темы или недоученных вопросов. */
  | { name: 'drill'; mode: DrillMode; topic?: string; via: 'review' | 'progress' | 'finale' }
  | { name: 'finale' }
  /** Контрольный билет финала (номер места из трёх). */
  | { name: 'control'; slot: number };
type RouteName = Route['name'];
type TicketRoute = Extract<Route, { name: 'ticket' }>;
type AttemptRoute = Extract<Route, { name: 'attempt' }>;
type DrillRoute = Extract<Route, { name: 'drill' }>;
type ControlRoute = Extract<Route, { name: 'control' }>;
/** Экраны, на которые ведёт «Назад». */
type BackTarget = 'menu' | 'chapters' | 'tickets' | 'history' | 'review' | 'progress' | 'finale';

/** Глубина экрана: «Назад» уходит на экран с меньшей глубиной. */
const DEPTH: Record<RouteName, number> = {
  menu: 0,
  chapters: 1,
  city: 2,
  settings: 1,
  tickets: 1,
  ticket: 2,
  history: 2,
  attempt: 2,
  review: 1,
  progress: 1,
  drill: 2,
  finale: 2,
  control: 3,
};

// Результат билета заменяет в истории браузера сам билет, поэтому у него глубина билета,
// а открытый из истории — на уровень глубже неё.
function depth(route: Route): number {
  if (route.name === 'attempt') return route.via === 'history' || route.via === 'control' ? 3 : 2;
  if (route.name === 'drill') return DEPTH[route.via] + 1;
  return DEPTH[route.name];
}

function isRoute(value: unknown): value is Route {
  return typeof value === 'object' && value !== null && (value as Route).name in DEPTH;
}

/** Что сказать после ответа о работе над ошибками. */
function reviewNote(out: AnswerOutcome, due?: number): string {
  if (out.review === 'added') return 'Вопрос попал в работу над ошибками: повтор завтра.';
  if (out.review === 'reset') return 'Снова ошибка: повтор завтра, и отсчёт повторов начнётся заново.';
  if (out.review === 'cleared') return 'Ошибка закреплена: вопрос ушёл из работы над ошибками.';
  if (out.review === 'advanced' && due) return `Повтор засчитан. Следующий — ${dueLabel(due, Date.now())}.`;
  return '';
}

export class App {
  private route: Route = { name: 'menu' };
  private cleanup: (() => void) | undefined;
  /** Экран, который открыть после возврата «Назад» (например, билет заново из разбора). */
  private afterBack: Route | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly game: Phaser.Game,
  ) {}

  start(): void {
    // Системная кнопка «Назад» на Android возвращает на предыдущий экран, а не закрывает игру.
    window.addEventListener('popstate', (e) => {
      const next = this.afterBack;
      this.afterBack = undefined;
      if (next) this.open(next);
      else this.render(isRoute(e.state) ? e.state : { name: 'menu' });
    });
    history.replaceState({ name: 'menu' }, '');
    this.render({ name: 'menu' });
  }

  private open(route: Route): void {
    history.pushState(route, '');
    this.render(route);
  }

  /** Открыть экран вместо текущего (в истории браузера он займёт место текущего). */
  private replace(route: Route): void {
    history.replaceState(route, '');
    this.render(route);
  }

  /** Вернуться на экран `to`, а затем, если указано, открыть `then` поверх него. */
  private back(to: BackTarget, then?: Route): void {
    const steps = depth(this.route) - DEPTH[to];
    if (steps > 0 && isRoute(history.state)) {
      this.afterBack = then;
      history.go(-steps);
    } else {
      this.render({ name: to });
      if (then) this.open(then);
    }
  }

  private render(route: Route): void {
    this.cleanup?.();
    this.cleanup = undefined;
    closeOverlay();
    this.route = route;
    setGameActive(this.game, route.name === 'menu' || route.name === 'city');

    let screen: HTMLElement;
    switch (route.name) {
      case 'menu':
        screen = this.menuScreen();
        break;
      case 'chapters':
        screen = this.chaptersScreen();
        break;
      case 'city': {
        const city = cityScreen(this.game, route.chapter, {
          onBack: () => this.back('chapters'),
          openChapter: (id) => this.replace({ name: 'city', chapter: id }),
          openFinale: () => this.replace({ name: 'finale' }),
        });
        this.cleanup = city.cleanup;
        screen = city.element;
        break;
      }
      case 'settings':
        screen = this.page('Настройки', settingsPanel(), { back: 'menu' });
        break;
      case 'tickets':
        screen = this.ticketsScreen();
        break;
      case 'ticket':
        screen = this.ticketScreen(route);
        break;
      case 'history':
        screen = this.historyScreen();
        break;
      case 'attempt':
        screen = this.attemptScreen(route);
        break;
      case 'review':
        screen = this.reviewScreen();
        break;
      case 'progress':
        screen = this.progressScreen();
        break;
      case 'drill':
        screen = this.drillScreen(route);
        break;
      case 'finale':
        screen = this.finaleScreen();
        break;
      case 'control':
        screen = this.controlScreen(route);
        break;
    }
    this.root.replaceChildren(screen);
    screen.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }

  // ─── Меню ──────────────────────────────────────────────────────────────────────

  private menuScreen(): HTMLElement {
    const data = progress();
    const due = dueReviews(data, Date.now()).length;
    const stats = el('p', { class: 'menu__stats' }, 'Загружаю вопросы…');
    const story = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'Начать историю');
    story.onclick = () => this.open({ name: 'chapters' });
    Promise.all([loadQuestions(), loadMapping()]).then(
      ([questions, mapping]) => {
        const order = mapping.chapters.map((c) => c.id);
        const current = currentChapter(data, order);
        const chapter = mapping.chapters.find((c) => c.id === current)!;
        const allDone = order.every((id) => data.chapters[id]?.delivered);
        const started = Object.keys(data.chapters).length > 0 || Object.keys(data.questions).length > 0;
        story.textContent = allDone ? 'Финал: к экзамену' : started ? `Глава ${chapter.number}: ${chapter.title}` : 'Начать историю';
        story.onclick = () => this.open(allDone ? { name: 'finale' } : { name: 'city', chapter: current });
        const answered = questions.filter((q) => data.questions[q.id]).length;
        // Неразрывные пробелы, чтобы строка не рвалась между числом и словом.
        stats.textContent = `Пройдено вопросов: ${answered} из ${questions.length}`;
      },
      () => (stats.textContent = 'Не удалось загрузить вопросы. Обновите страницу.'),
    );

    const install = el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => promptInstall() }, 'Установить на телефон');
    const iosHint = el('p', { class: 'menu__hint' }, 'Чтобы установить игру, нажмите «Поделиться» → «На экран „Домой“».');
    const updateInstall = () => {
      const mode = installMode();
      install.hidden = mode !== 'prompt';
      iosHint.hidden = mode !== 'ios-hint';
    };
    updateInstall();
    this.cleanup = onInstallModeChange(updateInstall);

    const level = el('button', { class: 'menu__level', type: 'button', onclick: () => this.open({ name: 'progress' }) }, levelMeter(levelOf(data.xp), data.xp, true));
    const reviewButton = el(
      'button',
      { class: 'btn btn--secondary', type: 'button', 'aria-label': due ? `Разбор ошибок, пора повторить: ${due}` : 'Разбор ошибок', onclick: () => this.open({ name: 'review' }) },
      'Разбор ошибок',
      due ? el('span', { class: 'badge', 'aria-hidden': 'true' }, String(due)) : null,
    );

    return el(
      'div',
      { class: 'screen screen--menu' },
      el(
        'header',
        { class: 'hero' },
        el('h1', { class: 'hero__title', tabindex: -1, 'data-focus': true }, GAME_TITLE),
        el('p', { class: 'hero__subtitle' }, GAME_SUBTITLE),
      ),
      el(
        'div',
        { class: 'menu' },
        level,
        story,
        el(
          'div',
          { class: 'menu__row' },
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'chapters' }) }, 'Главы'),
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'progress' }) }, 'Прогресс'),
        ),
        reviewButton,
        el(
          'div',
          { class: 'menu__row' },
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'tickets' }) }, 'Билеты'),
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'settings' }) }, 'Настройки'),
        ),
        install,
        iosHint,
        stats,
      ),
    );
  }

  // ─── Главы и финал ─────────────────────────────────────────────────────────────

  private chaptersScreen(): HTMLElement {
    const list = el('div', { class: 'chapters' }, el('p', { class: 'loading' }, 'Загрузка…'));
    loadMapping().then((mapping) => {
      const data = progress();
      const order = mapping.chapters.map((c) => c.id);
      const cards = mapping.chapters.map((chapter, i) => {
        const open = isUnlocked(data, order, chapter.id);
        const state = data.chapters[chapter.id];
        const r = chapterResult(data, chapterInfo(mapping, chapter.id));
        const games = new Set(mapping.questions.filter((q) => q.chapter === chapter.id && TEMPLATES[q.template].minigame).map((q) => q.template));
        const count = r.questions;
        const meta = `${count} ${plural(count, ['вопрос', 'вопроса', 'вопросов'])} · ${chapter.points.length} ${plural(chapter.points.length, ['точка', 'точки', 'точек'])}`;
        const status = state?.delivered
          ? el('span', { class: 'chapter-card__status is-done' }, `${starsText(state.stars)} · пройдена · ${percent(r.share)}%`)
          : open
            ? el('span', { class: 'chapter-card__status' }, r.pointsDone ? `В пути: точки ${r.pointsDone} из ${r.points} · верных ${percent(r.share)}%` : 'Открыта — можно ехать')
            : el('span', { class: 'chapter-card__status is-locked' }, `Откроется после главы ${i}`);
        const task = STORY[chapter.id]?.task;
        return el(
          'button',
          {
            class: `chapter-card${open ? '' : ' is-locked'}${state?.delivered ? ' is-done' : ''}`,
            type: 'button',
            'aria-disabled': open ? undefined : 'true',
            onclick: () => {
              if (open) this.open({ name: 'city', chapter: chapter.id });
              else showToast(`Глава ${chapter.number} откроется, когда будет пройдена глава ${i}: все точки и от 80% верных ответов.`);
            },
          },
          el('span', { class: 'chapter-card__num' }, open ? String(chapter.number) : '🔒'),
          el(
            'span',
            { class: 'chapter-card__body' },
            el('span', { class: 'chapter-card__title' }, chapter.title),
            el('span', { class: 'chapter-card__district' }, chapter.district),
            task ? el('span', { class: 'chapter-card__task' }, `Задание: ${task}`) : null,
            el('span', { class: 'chapter-card__topics' }, chapter.topics.join(', ')),
            el('span', { class: 'chapter-card__meta' }, games.size ? `${meta} · мини-игры: ${[...games].map((t) => TEMPLATES[t].short).join(', ')}` : meta),
            status,
          ),
        );
      });
      const finale = finaleStatus(data, order, mapping.questions.map((q) => q.id));
      const finaleCard = el(
        'button',
        {
          class: `chapter-card chapter-card--finale${finale.open ? '' : ' is-locked'}`,
          type: 'button',
          'aria-disabled': finale.open ? undefined : 'true',
          onclick: () => {
            if (finale.open) this.open({ name: 'finale' });
            else showToast(`Финал откроется после главы ${mapping.chapters.length}.`);
          },
        },
        el('span', { class: 'chapter-card__num' }, finale.open ? '★' : '🔒'),
        el(
          'span',
          { class: 'chapter-card__body' },
          el('span', { class: 'chapter-card__title' }, 'Финал: экзамен'),
          el('span', { class: 'chapter-card__district' }, 'ГИБДД Светофорска'),
          el('span', { class: 'chapter-card__topics' }, 'Все вопросы базы — верно, все ошибки закреплены повторами, три контрольных билета без ошибок.'),
          el(
            'span',
            { class: `chapter-card__status${finale.open ? '' : ' is-locked'}` },
            finale.open ? `Верно: ${finale.correct} из ${finale.total} · на повторе: ${finale.review}` : `Откроется после главы ${mapping.chapters.length}`,
          ),
        ),
      );
      list.replaceChildren(...cards, finaleCard);
    });
    return this.page('Главы', list, {
      back: 'menu',
      intro: 'Сюжет идёт по главам: каждая — свой район и свои темы билетов. Следующая глава открывается, когда в текущей пройдены все точки и верных ответов от 80%.',
    });
  }

  private finaleScreen(): HTMLElement {
    const body = el('div', { class: 'finale' }, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    Promise.all([loadQuestions(), loadMapping()]).then(async ([questions, mapping]) => {
      if (this.route !== route) return;
      const data = progress();
      const order = mapping.chapters.map((c) => c.id);
      const ids = questions.map((q) => q.id);
      const tickets = new Set(questions.map((q) => q.ticket)).size;
      let st = finaleStatus(data, order, ids);
      if (!st.open) {
        body.replaceChildren(el('p', { class: 'intro' }, `Финал откроется после главы ${mapping.chapters.length}.`));
        return;
      }
      ensureControl(data, tickets);
      saveProgress();
      st = finaleStatus(data, order, ids);
      const seen = data.finale.seen;
      const see = (id: string) => {
        if (!seen.includes(id)) seen.push(id);
        saveProgress();
      };

      const now = Date.now();
      const due = dueReviews(data, now).length;
      const item = (done: boolean, title: string, detail: string, action?: HTMLElement) =>
        el(
          'li',
          { class: `check${done ? ' is-done' : ''}` },
          el('span', { class: 'check__mark', 'aria-label': done ? 'выполнено' : 'не выполнено' }, done ? '✓' : ''),
          el('span', { class: 'check__body' }, el('span', { class: 'check__title' }, title), el('span', { class: 'check__detail' }, detail), action ?? null),
        );
      const notOk = st.total - st.correct;
      const slots = st.control.map((slot, i) =>
        el(
          'button',
          {
            class: `btn ${slot.passed ? 'btn--secondary is-passed' : 'btn--primary'}`,
            type: 'button',
            disabled: slot.passed || !st.controlOpen,
            onclick: () => this.open({ name: 'control', slot: i }),
          },
          slot.passed ? `Билет ${slot.ticket} ✓` : `Билет ${slot.ticket}`,
        ),
      );
      const list = el(
        'ol',
        { class: 'checklist' },
        item(
          notOk === 0,
          'Все вопросы отвечены верно',
          `Последний ответ верный: ${st.correct} из ${st.total}.`,
          notOk ? el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'drill', mode: 'weak', via: 'finale' }) }, `Тренировать (${notOk})`) : undefined,
        ),
        item(
          st.review === 0,
          'Ошибки закреплены повторами',
          st.review ? `В работе над ошибками: ${st.review}. Пора повторить сегодня: ${due}.` : 'Повторы через 1, 3 и 7 дней пройдены — работа над ошибками пуста.',
          st.review ? el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'review' }) }, 'Разбор ошибок') : undefined,
        ),
        item(
          st.control.every((s) => s.passed),
          `Контрольные билеты без ошибок: ${st.control.filter((s) => s.passed).length} из ${CONTROL_TICKETS}`,
          st.controlOpen ? 'Ошибка — и вместо билета будет другой, а ошибка уйдёт на повтор.' : 'Откроются, когда выполнены первые два пункта.',
          el('div', { class: 'slots' }, ...slots),
        ),
      );
      const exam = el(
        'button',
        {
          class: 'btn btn--primary btn--lg',
          type: 'button',
          disabled: !st.ready,
          onclick: async () => {
            await playCutscene(FINALE_STORY.epilogue, { last: 'К экзамену' });
            if (this.route !== route) return;
            see('epilogue');
            await showModal(
              'Экзамен в ГИБДД',
              el(
                'div',
                { class: 'rewards' },
                el('p', { class: 'rewards__line' }, 'Экзамен-босс — 20 случайных вопросов за 20 минут по правилам ГИБДД — появится в следующем обновлении игры.'),
                el('p', { class: 'rewards__line' }, 'А пока можно решать билеты целиком: они в меню «Билеты».'),
              ),
              [{ label: 'Понятно', primary: true }],
            );
          },
        },
        st.ready ? 'К экзамену' : 'Экзамен — после всех пунктов',
      );
      body.replaceChildren(
        el('p', { class: 'intro' }, 'Экзамен — финальный босс. Путь к нему открыт, когда выполнены все три пункта.'),
        list,
        exam,
        el('button', { class: 'btn btn--quiet', type: 'button', onclick: () => void playCutscene(FINALE_STORY.intro, { last: 'Понятно' }) }, 'Что говорил Виктор Петрович'),
      );

      if (!seen.includes('intro')) {
        await playCutscene(FINALE_STORY.intro, { last: 'Понятно' });
        if (this.route !== route) return;
        see('intro');
      }
      if (st.controlOpen && !seen.includes('controls')) {
        await playCutscene(FINALE_STORY.controls, { last: 'Понятно' });
        if (this.route !== route) return;
        see('controls');
      }
    });
    return this.page('Финал', body, { back: 'chapters' });
  }

  // ─── Прогресс и разбор ошибок ─────────────────────────────────────────────────

  private progressScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    Promise.all([loadQuestions(), loadMapping()]).then(([questions, mapping]) => {
      if (this.route !== route) return;
      body.replaceChildren(
        progressView(progress(), questions, mapping, {
          train: (topic) => this.open({ name: 'drill', mode: 'topic', topic, via: 'progress' }),
          openChapter: (id) => this.open({ name: 'city', chapter: id }),
        }),
      );
    });
    return this.page('Прогресс', body, { back: 'menu' });
  }

  private reviewScreen(): HTMLElement {
    const body = reviewView(progress(), Date.now(), {
      start: () => this.open({ name: 'drill', mode: 'review', via: 'review' }),
      practice: () => this.open({ name: 'drill', mode: 'practice', via: 'review' }),
    });
    return this.page('Разбор ошибок', body, { back: 'menu' });
  }

  /** Вопросы серии тренировки. */
  private drillQuestions(route: DrillRoute, questions: Question[]): Question[] {
    const data = progress();
    const byId = new Map(questions.map((q) => [q.id, q]));
    let ids: string[];
    switch (route.mode) {
      case 'review':
        ids = dueReviews(data, Date.now());
        break;
      case 'practice':
        ids = reviewQueue(data).slice(0, 20);
        break;
      case 'topic':
        ids = trainingSet(data, questions.filter((q) => q.topic === route.topic).map((q) => q.id), 10);
        break;
      case 'weak':
        ids = trainingSet(data, questions.filter((q) => !data.questions[q.id]?.ok).map((q) => q.id), 20);
        break;
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
  }

  private drillScreen(route: DrillRoute): HTMLElement {
    const titles: Record<DrillMode, string> = { review: 'Повтор ошибок', practice: 'Тренировка ошибок', topic: route.topic ?? 'Тема', weak: 'Недоученные вопросы' };
    return this.quizPage(route, titles[route.mode], route.via, (all) => this.drillQuestions(route, all), (results, _ms, list, body) => {
      const right = results.filter((r) => r.isCorrect).length;
      const left = route.mode === 'review' ? dueReviews(progress(), Date.now()).length : 0;
      body.replaceChildren(
        el(
          'section',
          { class: 'result' },
          el('p', { class: 'result__score' }, `${right} из ${list.length}`),
          el('p', { class: 'result__label' }, right === list.length ? 'Все ответы верные!' : 'Ошибки вернутся на повтор завтра.'),
          route.mode === 'review' ? el('p', { class: 'result__note' }, left ? `Ещё пора повторить: ${left}.` : 'На сегодня повторы закончены.') : null,
        ),
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.replace(route) }, 'Ещё серия'),
      );
    });
  }

  // ─── Билеты ────────────────────────────────────────────────────────────────────

  private ticketsScreen(): HTMLElement {
    const { last } = summarize(allAttempts());
    const grid = el('div', { class: 'tickets' }, el('p', { class: 'loading' }, 'Загрузка…'));
    loadQuestions().then((questions) => {
      const tickets = [...new Set(questions.map((q) => q.ticket))].sort((a, b) => a - b);
      grid.replaceChildren(
        ...tickets.map((ticket) => {
          const attempt = last.get(ticket);
          return el(
            'button',
            {
              class: 'ticket-btn',
              type: 'button',
              'aria-label': attempt
                ? `Билет ${ticket}, последний результат ${attempt.correct} из ${attempt.answers.length}`
                : `Билет ${ticket}`,
              onclick: () => this.open({ name: 'ticket', ticket }),
            },
            el('span', { class: 'ticket-btn__num' }, String(ticket)),
            attempt ? scoreBadge(attempt, 'ticket-btn__score') : null,
          );
        }),
      );
    });
    const historyButton = el(
      'button',
      { class: 'btn btn--secondary tickets__history', type: 'button', onclick: () => this.open({ name: 'history' }) },
      'История попыток',
    );
    return this.page('Билеты', el('div', {}, historyButton, grid), {
      back: 'menu',
      intro: 'Выберите билет: 20 вопросов подряд, в конце — результат и разбор ответов. Под номером билета — последний результат.',
    });
  }

  private historyScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    loadQuestions().then((questions) => {
      const total = new Set(questions.map((q) => q.ticket)).size;
      body.replaceChildren(
        historyView(
          allAttempts(),
          total,
          (attempt) => this.open({ name: 'attempt', at: attempt.at, via: 'history' }),
          () => this.back('tickets'),
        ),
      );
    });
    return this.page('История попыток', body, { back: 'tickets' });
  }

  private attemptScreen(route: AttemptRoute): HTMLElement {
    const attempt = findAttempt(route.at);
    const back: BackTarget = route.via === 'history' ? 'history' : route.via === 'control' ? 'finale' : 'tickets';
    if (!attempt) {
      return this.page('Попытка', el('p', { class: 'intro' }, 'Эта попытка не найдена: возможно, данные игры были очищены.'), { back });
    }
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const footer =
      route.via === 'control'
        ? el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.back('finale') }, 'К финалу')
        : el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.back('tickets', { name: 'ticket', ticket: attempt.ticket }) }, 'Пройти ещё раз');
    loadQuestions().then((questions) => {
      if (this.route !== route) return;
      const view = attemptView(attempt, ticketQuestions(questions, attempt.ticket), allAttempts());
      const control = route.control;
      const banner = control
        ? el(
            'p',
            { class: `banner ${control.passed ? 'banner--ok' : 'banner--bad'}` },
            control.passed
              ? 'Контрольный билет пройден без ошибок!'
              : `Контрольный билет не засчитан: нужны все 20 верных. Ошибки ушли в работу над ошибками, а вместо этого билета теперь билет ${control.replacement}.`,
          )
        : null;
      body.replaceChildren(...[banner, view].filter((x): x is HTMLElement => !!x));
    });
    return this.page(route.via === 'control' ? `Контрольный билет ${attempt.ticket}` : `Билет ${attempt.ticket}`, body, { back, footer });
  }

  private ticketScreen(route: TicketRoute): HTMLElement {
    return this.quizPage(route, `Билет ${route.ticket}`, 'tickets', (all) => ticketQuestions(all, route.ticket), (results, ms) => {
      const attempt = this.saveAttempt(route.ticket, results, ms);
      // Результат занимает место билета в истории браузера: «Назад» и «Вперёд» не начнут билет заново.
      this.replace({ name: 'attempt', at: attempt.at, via: 'ticket' });
    });
  }

  private controlScreen(route: ControlRoute): HTMLElement {
    const slot = progress().finale.control[route.slot];
    if (!slot) return this.page('Контрольный билет', el('p', { class: 'intro' }, 'Контрольный билет не найден.'), { back: 'finale' });
    let tickets = 0;
    const pick = (all: Question[]) => {
      tickets = new Set(all.map((q) => q.ticket)).size;
      return ticketQuestions(all, slot.ticket);
    };
    return this.quizPage(route, `Контрольный билет ${slot.ticket}`, 'finale', pick, (results, ms) => {
      const attempt = this.saveAttempt(slot.ticket, results, ms);
      const mistakes = results.filter((r) => !r.isCorrect).length;
      const out = recordControl(progress(), route.slot, mistakes, tickets);
      saveProgress();
      levelUpToast(out.levelUp);
      this.replace({ name: 'attempt', at: attempt.at, via: 'control', control: { passed: out.passed, replacement: out.replacement } });
    });
  }

  private saveAttempt(ticket: number, results: AnswerResult[], ms: number) {
    return recordAttempt({
      ticket,
      at: Date.now(),
      ms,
      answers: results.map((r) => r.chosen),
      correct: results.filter((r) => r.isCorrect).length,
    });
  }

  /**
   * Вопросы по одному: карточка, «Дальше», в конце — `finish`. Каждый ответ идёт в прогресс
   * (опыт, работа над ошибками).
   */
  private quizPage(
    route: Route,
    title: string,
    back: BackTarget,
    pick: (all: Question[]) => Question[],
    finish: (results: AnswerResult[], ms: number, list: Question[], body: HTMLElement) => void,
  ): HTMLElement {
    const body = el('div', { class: 'quiz' }, el('p', { class: 'loading' }, 'Загрузка…'));
    const score = el('span', { class: 'topbar__score' });
    const bar = el('div', { class: 'progress__bar' });
    const progressEl = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0 }, bar);
    const note = el('p', { class: 'quiz__note', 'aria-live': 'polite' });
    const next = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'Дальше');
    const screen = this.page(title, body, { back, aside: score, progress: progressEl, footer: el('div', {}, note, next) });
    const scroller = screen.querySelector<HTMLElement>('.screen__body')!;
    const footer = screen.querySelector<HTMLElement>('.bottombar')!;
    footer.hidden = true;

    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const list = pick(all);
      if (!list.length) {
        body.replaceChildren(el('div', { class: 'empty' }, el('p', {}, 'Здесь пока нет вопросов.')));
        return;
      }
      const results: AnswerResult[] = [];
      const startedAt = Date.now();
      let index = 0;

      const updateStatus = () => {
        const correct = results.filter((r) => r.isCorrect).length;
        score.textContent = `${correct}/${results.length}`;
        score.setAttribute('aria-label', `Правильно ${correct} из ${results.length}`);
        progressEl.setAttribute('aria-valuemax', String(list.length));
        progressEl.setAttribute('aria-valuenow', String(results.length));
        bar.style.width = `${(results.length / list.length) * 100}%`;
      };

      const show = (question: Question) => {
        footer.hidden = true;
        body.replaceChildren(
          renderQuestionCard(question, (result) => {
            results.push(result);
            const data = progress();
            const out = recordAnswer(data, question.id, result.isCorrect, Date.now());
            saveProgress();
            levelUpToast(out.levelUp);
            note.textContent = reviewNote(out, data.questions[question.id].review?.due);
            note.hidden = !note.textContent;
            updateStatus();
            next.textContent = index === list.length - 1 ? 'Показать результат' : 'Дальше';
            footer.hidden = false;
          }),
        );
        scroller.scrollTop = 0;
      };

      next.onclick = () => {
        index++;
        if (index >= list.length) {
          footer.hidden = true;
          finish(results, Date.now() - startedAt, list, body);
        } else {
          show(list[index]);
        }
      };

      updateStatus();
      show(list[0]);
    });

    return screen;
  }

  /** Экран со строкой заголовка, кнопкой «Назад» и прокручиваемым содержимым. */
  private page(
    title: string,
    content: HTMLElement,
    opts: { back: BackTarget; intro?: string; aside?: HTMLElement; progress?: HTMLElement; footer?: HTMLElement },
  ): HTMLElement {
    const backButton = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Назад', onclick: () => this.back(opts.back) });
    backButton.innerHTML = ICONS.back;
    return el(
      'div',
      { class: 'screen screen--page' },
      el(
        'header',
        { class: 'topbar' },
        backButton,
        el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, title),
        opts.aside ?? el('span'),
      ),
      opts.progress ?? null,
      el('div', { class: 'screen__body' }, opts.intro ? el('p', { class: 'intro' }, opts.intro) : null, content),
      opts.footer ? el('footer', { class: 'bottombar' }, opts.footer) : null,
    );
  }
}
