import type * as Phaser from 'phaser';
import { GAME_SUBTITLE, GAME_TITLE } from '../config.ts';
import { loadQuestions } from '../data/questions.ts';
import { allAttempts, findAttempt, recordAttempt, summarize } from '../data/ticketHistory.ts';
import type { Question } from '../data/types.ts';
import { setGameActive } from '../game/game.ts';
import { installMode, onInstallModeChange, promptInstall } from '../pwa.ts';
import { cityScreen } from './cityScreen.ts';
import { el } from './dom.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard, type AnswerResult } from './questionCard.ts';
import { settingsPanel } from './settingsPanel.ts';
import { attemptView, historyView, scoreBadge, ticketQuestions } from './ticketHistoryView.ts';

/**
 * Экраны: меню поверх анимированной улицы, город (этап 2), билеты целиком, история
 * пройденных билетов с разбором ответов и настройки.
 */
type Route =
  | { name: 'menu' }
  | { name: 'city' }
  | { name: 'settings' }
  | { name: 'tickets' }
  | { name: 'ticket'; ticket: number }
  | { name: 'history' }
  /** Результат и разбор попытки: сразу после билета (`via: 'ticket'`) или из истории. */
  | { name: 'attempt'; at: number; via: 'ticket' | 'history' };
type RouteName = Route['name'];
type TicketRoute = Extract<Route, { name: 'ticket' }>;
type AttemptRoute = Extract<Route, { name: 'attempt' }>;
/** Экраны, на которые ведёт «Назад». */
type BackTarget = 'menu' | 'tickets' | 'history';

/** Глубина экрана: «Назад» уходит на экран с меньшей глубиной. */
const DEPTH: Record<RouteName, number> = { menu: 0, city: 1, settings: 1, tickets: 1, ticket: 2, history: 2, attempt: 2 };

// Результат билета заменяет в истории браузера сам билет, поэтому у него глубина билета,
// а открытый из истории — на уровень глубже неё.
const depth = (route: Route) => (route.name === 'attempt' && route.via === 'history' ? 3 : DEPTH[route.name]);

function isRoute(value: unknown): value is Route {
  return typeof value === 'object' && value !== null && (value as Route).name in DEPTH;
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
    this.route = route;
    setGameActive(this.game, route.name === 'menu' || route.name === 'city');

    let screen: HTMLElement;
    switch (route.name) {
      case 'menu':
        screen = this.menuScreen();
        break;
      case 'city': {
        const city = cityScreen(this.game, () => this.back('menu'));
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
        screen = this.quizScreen(route);
        break;
      case 'history':
        screen = this.historyScreen();
        break;
      case 'attempt':
        screen = this.attemptScreen(route);
        break;
    }
    this.root.replaceChildren(screen);
    screen.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }

  private menuScreen(): HTMLElement {
    const stats = el('p', { class: 'menu__stats' }, 'Загружаю вопросы…');
    loadQuestions().then(
      (questions) => {
        const tickets = new Set(questions.map((q) => q.ticket)).size;
        const withImages = questions.filter((q) => q.image).length;
        // Неразрывные пробелы внутри «800 вопросов», чтобы строка не рвалась между числом и словом.
        stats.textContent = [`${questions.length} вопросов`, `${tickets} билетов`, `${withImages} картинок`]
          .map((part) => part.replace(' ', '\u00A0'))
          .join(' · ');
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
        el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.open({ name: 'city' }) }, 'Поехать в город'),
        el(
          'div',
          { class: 'menu__row' },
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'tickets' }) }, 'Билеты'),
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'settings' }) }, 'Настройки'),
        ),
        install,
        iosHint,
        stats,
        el('p', { class: 'menu__note' }, 'Тестовый район: у жёлтых точек вас ждут ситуации с вопросами. Главы и сюжет появятся на следующих этапах.'),
      ),
    );
  }

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
    const back = route.via === 'history' ? 'history' : 'tickets';
    if (!attempt) {
      return this.page('Попытка', el('p', { class: 'intro' }, 'Эта попытка не найдена: возможно, данные игры были очищены.'), { back });
    }
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const retry = el(
      'button',
      { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.back('tickets', { name: 'ticket', ticket: attempt.ticket }) },
      'Пройти ещё раз',
    );
    loadQuestions().then((questions) => {
      if (this.route !== route) return;
      body.replaceChildren(attemptView(attempt, ticketQuestions(questions, attempt.ticket), allAttempts()));
    });
    return this.page(`Билет ${attempt.ticket}`, body, { back, footer: retry });
  }

  private quizScreen(route: TicketRoute): HTMLElement {
    const body = el('div', { class: 'quiz' }, el('p', { class: 'loading' }, 'Загрузка…'));
    const score = el('span', { class: 'topbar__score' });
    const bar = el('div', { class: 'progress__bar' });
    const progress = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0 }, bar);
    const next = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'Дальше');
    const screen = this.page(`Билет ${route.ticket}`, body, { back: 'tickets', aside: score, progress, footer: next });
    const scroller = screen.querySelector<HTMLElement>('.screen__body')!;
    const footer = screen.querySelector<HTMLElement>('.bottombar')!;
    footer.hidden = true;

    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const list = ticketQuestions(all, route.ticket);
      const results: AnswerResult[] = [];
      const startedAt = Date.now();
      let index = 0;

      const updateStatus = () => {
        const correct = results.filter((r) => r.isCorrect).length;
        score.textContent = `${correct}/${results.length}`;
        score.setAttribute('aria-label', `Правильно ${correct} из ${results.length}`);
        progress.setAttribute('aria-valuemax', String(list.length));
        progress.setAttribute('aria-valuenow', String(results.length));
        bar.style.width = `${(results.length / list.length) * 100}%`;
      };

      const show = (question: Question) => {
        footer.hidden = true;
        body.replaceChildren(
          renderQuestionCard(question, (result) => {
            results.push(result);
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
          const finishedAt = Date.now();
          const attempt = recordAttempt({
            ticket: route.ticket,
            at: finishedAt,
            ms: finishedAt - startedAt,
            answers: results.map((r) => r.chosen),
            correct: results.filter((r) => r.isCorrect).length,
          });
          // Результат занимает место билета в истории браузера: «Назад» и «Вперёд» не начнут билет заново.
          const result: AttemptRoute = { name: 'attempt', at: attempt.at, via: 'ticket' };
          history.replaceState(result, '');
          this.render(result);
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
