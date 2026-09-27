import type * as Phaser from 'phaser';
import { GAME_SUBTITLE, GAME_TITLE } from '../config.ts';
import { loadQuestions } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import { setGameActive } from '../game/game.ts';
import { installMode, onInstallModeChange, promptInstall } from '../pwa.ts';
import { cityScreen } from './cityScreen.ts';
import { el } from './dom.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard, type AnswerResult } from './questionCard.ts';
import { settingsPanel } from './settingsPanel.ts';

/**
 * Экраны: меню поверх анимированной улицы, город (этап 2), билеты целиком и настройки.
 */
type Route = { name: 'menu' } | { name: 'city' } | { name: 'settings' } | { name: 'tickets' } | { name: 'ticket'; ticket: number };
type RouteName = Route['name'];
type TicketRoute = Extract<Route, { name: 'ticket' }>;

/** Глубина экрана: «Назад» уходит на экран с меньшей глубиной. */
const DEPTH: Record<RouteName, number> = { menu: 0, city: 1, settings: 1, tickets: 1, ticket: 2 };

function isRoute(value: unknown): value is Route {
  return typeof value === 'object' && value !== null && (value as Route).name in DEPTH;
}

export class App {
  private route: Route = { name: 'menu' };
  private cleanup: (() => void) | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly game: Phaser.Game,
  ) {}

  start(): void {
    // Системная кнопка «Назад» на Android возвращает на предыдущий экран, а не закрывает игру.
    window.addEventListener('popstate', (e) => this.render(isRoute(e.state) ? e.state : { name: 'menu' }));
    history.replaceState({ name: 'menu' }, '');
    this.render({ name: 'menu' });
  }

  private open(route: Route): void {
    history.pushState(route, '');
    this.render(route);
  }

  private back(to: 'menu' | 'tickets'): void {
    const steps = DEPTH[this.route.name] - DEPTH[to];
    if (steps > 0 && isRoute(history.state)) history.go(-steps);
    else this.render({ name: to });
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
    const grid = el('div', { class: 'tickets' }, el('p', { class: 'loading' }, 'Загрузка…'));
    loadQuestions().then((questions) => {
      const tickets = [...new Set(questions.map((q) => q.ticket))].sort((a, b) => a - b);
      grid.replaceChildren(
        ...tickets.map((ticket) =>
          el(
            'button',
            { class: 'ticket-btn', type: 'button', 'aria-label': `Билет ${ticket}`, onclick: () => this.open({ name: 'ticket', ticket }) },
            String(ticket),
          ),
        ),
      );
    });
    return this.page('Билеты', grid, { back: 'menu', intro: 'Выберите билет: 20 вопросов подряд, в конце — результат.' });
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
      const list = all.filter((q) => q.ticket === route.ticket).sort((a, b) => a.number - b.number);
      const results: AnswerResult[] = [];
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
          footer.hidden = true;
          body.replaceChildren(this.ticketResult(route, results));
          scroller.scrollTop = 0;
        } else {
          show(list[index]);
        }
      };

      updateStatus();
      show(list[0]);
    });

    return screen;
  }

  private ticketResult(route: TicketRoute, results: AnswerResult[]): HTMLElement {
    const correct = results.filter((r) => r.isCorrect).length;
    const mistakes = results.filter((r) => !r.isCorrect).map((r) => r.question.number);
    return el(
      'section',
      { class: 'result' },
      el('p', { class: 'result__score' }, String(correct), el('span', {}, ` из ${results.length}`)),
      el('p', { class: 'result__label' }, 'правильных ответов'),
      el('p', { class: 'result__mistakes' }, mistakes.length ? `Ошибки в вопросах: ${mistakes.join(', ')}` : 'Без ошибок!'),
      el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.render(route) }, 'Пройти билет ещё раз'),
      el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.back('tickets') }, 'Другой билет'),
    );
  }

  /** Экран со строкой заголовка, кнопкой «Назад» и прокручиваемым содержимым. */
  private page(
    title: string,
    content: HTMLElement,
    opts: { back: 'menu' | 'tickets'; intro?: string; aside?: HTMLElement; progress?: HTMLElement; footer?: HTMLElement },
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
