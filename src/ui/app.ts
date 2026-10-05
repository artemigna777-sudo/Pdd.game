import type * as Phaser from 'phaser';
import { playSound, unlockAudioOnFirstTouch } from '../audio/feedback.ts';
import { GAME_SUBTITLE, GAME_TITLE } from '../config.ts';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import { allAttempts, findAttempt, recordAttempt, summarize } from '../data/ticketHistory.ts';
import type { Question } from '../data/types.ts';
import { EXAM_RULES, answerExam, blockOf, checkTime, clock, currentItem, extraCount, startExam } from '../exam/exam.ts';
import { allExams, findExam, recordExam } from '../exam/examHistory.ts';
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
  onProgressChange,
  percent,
  progress,
  recordAnswer,
  recordControl,
  recordExamPass,
  recordExamResult,
  recordPlanExam,
  setExamDate,
  clearExamDate,
  planDay,
  ensureDaily,
  reviewQueue,
  saveProgress,
  trainingSet,
  type AnswerOutcome,
} from '../progress/progress.ts';
import { readiness, blockLabel, type Tip } from '../progress/readiness.ts';
import { installMode, onInstallModeChange, promptInstall } from '../pwa.ts';
import { getSettings, updateSettings } from '../settings.ts';
import { duelFromHash, duelLink, duelTime, hashHasDuel, newDuelId, pickDuelQuestions, resolveDuel, type DuelPayload } from '../duel/duel.ts';
import { allDuels, duelStats, findDuel, saveAnswerToMine, saveChallenge, saveReply } from '../duel/duelHistory.ts';
import { FINALE_STORY, STORY } from '../story/story.ts';
import { chapterInfo } from '../world/mapping.ts';
import { TEMPLATES } from '../world/templates.ts';
import { cityScreen, levelUpToast } from './cityScreen.ts';
import { avatar, closeOverlay, playCutscene, playTutorial, showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { dailyCard, garageView, goalToast, readinessCard, statusRow } from './dailyView.ts';
import { countdownLabel, dateLabel, planLink, planView } from './planView.ts';
import { planSummary, refreshOrder } from '../progress/examPlan.ts';
import { examHistoryView, examResultView, examRulesView } from './examView.ts';
import { dayLabel, plural } from './format.ts';
import { ICONS } from './icons.ts';
import { dueLabel, levelMeter, progressView, reviewView, starsText } from './progressView.ts';
import { renderExamCard, renderQuestionCard, type AnswerResult } from './questionCard.ts';
import { settingsPanel } from './settingsPanel.ts';
import { attemptView, historyView, scoreBadge, ticketQuestions } from './ticketHistoryView.ts';
import { shareResult } from './share.ts';
import { showToast } from './toast.ts';
import { duelHubView, duelInviteView, duelResultView } from './duelView.ts';
import { districtPicker, modesView } from './modesView.ts';
import { patrolScreen } from './patrolScreen.ts';
import { courierScreen } from './courierScreen.ts';
import { COURIER } from '../progress/modes.ts';
import { loadSigns, signsView, watchNewSigns } from './signsView.ts';
import { claimGroup, openSigns, type SignEntry } from '../signs/signs.ts';

/**
 * Экраны: меню поверх анимированной улицы, главы сюжета и город-район главы, финал с
 * контрольными билетами, «Разбор ошибок», «Прогресс», «Мой экзамен», билеты целиком
 * с историей попыток и настройки.
 */
type DrillMode = 'review' | 'practice' | 'topic' | 'weak' | 'block' | 'fresh' | 'refresh' | 'sign';
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
  /** Серия вопросов: повтор ошибок, тренировка ошибок, темы, недоученных или новых вопросов. */
  | { name: 'drill'; mode: DrillMode; topic?: string; block?: number; sign?: string; ids?: string[]; via: 'review' | 'progress' | 'finale' | 'plan' | 'signs' }
  /** «Мой экзамен»: дата экзамена в ГИБДД и план к ней. */
  | { name: 'plan' }
  /** Гараж: покраска и наклейки машины за монеты. */
  | { name: 'garage' }
  | { name: 'finale' }
  /** Контрольный билет финала (номер места из трёх). */
  | { name: 'control'; slot: number }
  /** Экзамен: правила, история, начало тренировки. */
  | { name: 'exam' }
  /** Идущий экзамен: тренировка или экзамен-босс финала. */
  | { name: 'exam-run'; boss: boolean }
  /** Результат экзамена: сразу после экзамена (заменяет его в истории браузера) или из истории. */
  | { name: 'exam-result'; at: number; via: 'run' | 'history'; boss: boolean }
  /** «Режимы»: дуэль, Знакодекс, один день Соколова, смена курьера (этапы 10–13). */
  | { name: 'modes' }
  /** Дуэль: имя, новая дуэль, история. */
  | { name: 'duel' }
  /** Знакодекс (этап 11). */
  | { name: 'signs' }
  /** «Один день Соколова» (этап 12): выбор района и смена на посту. */
  | { name: 'patrol' }
  | { name: 'patrol-run'; chapter: string }
  /** Смена курьера (этап 13): выбор района, рекорды и сама смена. */
  | { name: 'courier' }
  | { name: 'courier-run'; chapter: string }
  /** Вызов от друга по ссылке. */
  | { name: 'duel-invite'; payload: DuelPayload }
  /** Идущая дуэль: новая или ответ на вызов. */
  | { name: 'duel-run'; invite?: DuelPayload }
  /** Итог дуэли из истории. */
  | { name: 'duel-result'; id: string; role: 'from' | 'to' };
type RouteName = Route['name'];
type TicketRoute = Extract<Route, { name: 'ticket' }>;
type AttemptRoute = Extract<Route, { name: 'attempt' }>;
type DrillRoute = Extract<Route, { name: 'drill' }>;
type ControlRoute = Extract<Route, { name: 'control' }>;
type ExamRunRoute = Extract<Route, { name: 'exam-run' }>;
type ExamResultRoute = Extract<Route, { name: 'exam-result' }>;
type DuelInviteRoute = Extract<Route, { name: 'duel-invite' }>;
type DuelRunRoute = Extract<Route, { name: 'duel-run' }>;
type DuelResultRoute = Extract<Route, { name: 'duel-result' }>;
/** Экраны, на которые ведёт «Назад». */
type BackTarget = 'menu' | 'chapters' | 'tickets' | 'history' | 'review' | 'progress' | 'finale' | 'exam' | 'plan' | 'modes' | 'duel' | 'signs' | 'patrol' | 'courier';

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
  exam: 1,
  garage: 1,
  plan: 1,
  'exam-run': 2,
  'exam-result': 2,
  modes: 1,
  duel: 2,
  signs: 2,
  patrol: 2,
  'patrol-run': 3,
  courier: 2,
  'courier-run': 3,
  'duel-invite': 3,
  'duel-run': 3,
  'duel-result': 3,
};

// Результат билета заменяет в истории браузера сам билет, поэтому у него глубина билета,
// а открытый из истории — на уровень глубже неё.
function depth(route: Route): number {
  if (route.name === 'attempt') return route.via === 'history' || route.via === 'control' ? 3 : 2;
  if (route.name === 'drill') return DEPTH[route.via] + 1;
  // Экзамен-босс открывается из финала (глубина 2), тренировка — из экрана экзамена (глубина 1).
  if (route.name === 'exam-run' || (route.name === 'exam-result' && route.via === 'run')) return route.boss ? 3 : 2;
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
    // Ссылка на дуэль (#duel=…): адрес очищается, чтобы «Назад» и перезагрузка не открывали её снова.
    const link = hashHasDuel(location.hash) ? location.hash : undefined;
    history.replaceState({ name: 'menu' }, '', link ? location.pathname + location.search : undefined);
    this.render({ name: 'menu' });
    unlockAudioOnFirstTouch();
    // Знакодекс: сообщение о новом знаке после любого верного ответа.
    window.setTimeout(() => watchNewSigns(progress, onProgressChange, () => playSound('reward')), 1500);
    if (link) void this.openDuelLink(link);
    // Первый запуск — короткое обучение (по ссылке на дуэль — в следующий раз, чтобы не мешать вызову).
    else if (!getSettings().tutorial) void playTutorial().then(() => updateSettings({ tutorial: true }));
    window.addEventListener('hashchange', () => {
      if (!hashHasDuel(location.hash)) return;
      const hash = location.hash;
      history.replaceState(history.state, '', location.pathname + location.search);
      void this.openDuelLink(hash);
    });
  }

  /** Открыть дуэль по ссылке: вызов, свой вызов или ответ с итогом. */
  private async openDuelLink(hash: string): Promise<void> {
    const payload = duelFromHash(hash);
    if (!payload) {
      showToast('Ссылка на дуэль повреждена — попросите друга отправить её ещё раз.');
      return;
    }
    const all = await loadQuestions();
    if (!resolveDuel(payload, new Map(all.map((q) => [q.id, q])))) {
      showToast('Эта дуэль не открылась: в ней вопросы, которых нет в этой версии игры. Обновите игру.');
      return;
    }
    const now = Date.now();
    let next: Route;
    if (payload.to) {
      // Ответ с итогом: мой ответ (открыт ещё раз) или ответ на мой вызов.
      if (findDuel(payload.id, 'to') && !findDuel(payload.id, 'from')) next = { name: 'duel-result', id: payload.id, role: 'to' };
      else {
        saveAnswerToMine({ ...payload, to: payload.to }, now);
        next = { name: 'duel-result', id: payload.id, role: 'from' };
        playSound('reward');
      }
    } else if (findDuel(payload.id, 'from')) next = { name: 'duel-result', id: payload.id, role: 'from' };
    else if (findDuel(payload.id, 'to')) next = { name: 'duel-result', id: payload.id, role: 'to' };
    else next = { name: 'duel-invite', payload };
    // Под дуэлью — «Режимы» и «Дуэль», чтобы «Назад» вёл по обычному пути.
    if (this.route.name !== 'modes' && this.route.name !== 'duel') this.open({ name: 'modes' });
    if (this.route.name !== 'duel') this.open({ name: 'duel' });
    this.open(next);
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
    setGameActive(this.game, route.name === 'menu' || route.name === 'city' || route.name === 'patrol-run' || route.name === 'courier-run');

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
        screen = this.page('Настройки', settingsPanel(true), { back: 'menu' });
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
      case 'exam':
        screen = this.examScreen();
        break;
      case 'exam-run':
        screen = this.examRunScreen(route);
        break;
      case 'exam-result':
        screen = this.examResultScreen(route);
        break;
      case 'garage':
        screen = this.page('Гараж', garageView(progress(), () => saveProgress()), { back: 'menu' });
        break;
      case 'plan':
        screen = this.planScreen();
        break;
      case 'modes':
        screen = this.modesScreen();
        break;
      case 'duel':
        screen = this.duelScreen();
        break;
      case 'signs':
        screen = this.signsScreen();
        break;
      case 'patrol':
        screen = this.patrolScreen();
        break;
      case 'patrol-run': {
        const run = patrolScreen(this.game, route.chapter, {
          onBack: () => this.back('patrol'),
          again: () => this.replace({ name: 'patrol-run', chapter: route.chapter }),
        });
        this.cleanup = run.cleanup;
        screen = run.element;
        break;
      }
      case 'courier':
        screen = this.courierScreen();
        break;
      case 'courier-run': {
        const run = courierScreen(this.game, route.chapter, {
          onBack: () => this.back('courier'),
          again: () => this.replace({ name: 'courier-run', chapter: route.chapter }),
        });
        this.cleanup = run.cleanup;
        screen = run.element;
        break;
      }
      case 'duel-invite':
        screen = this.duelInviteScreen(route);
        break;
      case 'duel-run':
        screen = this.duelRunScreen(route);
        break;
      case 'duel-result':
        screen = this.duelResultScreen(route);
        break;
    }
    this.root.replaceChildren(screen);
    screen.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }

  // ─── Меню ──────────────────────────────────────────────────────────────────────

  private menuScreen(): HTMLElement {
    const data = progress();
    const due = dueReviews(data, Date.now()).length;
    const now = Date.now();
    ensureDaily(data, now);
    saveProgress();
    const statusActions = { progress: () => this.open({ name: 'progress' }), garage: () => this.open({ name: 'garage' }), plan: () => this.open({ name: 'plan' }) };
    const status = el('div', { class: 'menu__status' }, statusRow(data, data.daily!, undefined, now, statusActions));
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
        story.textContent = data.finale.exam ? 'История пройдена ★' : allDone ? 'Финал: к экзамену' : started ? `Глава ${chapter.number}: ${chapter.title}` : 'Начать историю';
        story.onclick = () => this.open(allDone ? { name: 'finale' } : { name: 'city', chapter: current });
        const answered = questions.filter((q) => data.questions[q.id]).length;
        // Неразрывные пробелы, чтобы строка не рвалась между числом и словом.
        stats.textContent = `Пройдено вопросов: ${answered} из ${questions.length}`;
        const r = readiness(data, questions, allExams(), now);
        status.replaceChildren(statusRow(data, data.daily!, r.percent, now, statusActions));
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
    const settingsButton = el('button', { class: 'menu__settings', type: 'button', 'aria-label': 'Настройки', onclick: () => this.open({ name: 'settings' }) });
    settingsButton.innerHTML = ICONS.settings;
    const reviewButton = el(
      'button',
      { class: 'btn btn--secondary', type: 'button', 'aria-label': due ? `Разбор ошибок, пора повторить: ${due}` : 'Разбор ошибок', onclick: () => this.open({ name: 'review' }) },
      'Разбор ошибок',
      due ? el('span', { class: 'badge', 'aria-hidden': 'true' }, String(due)) : null,
    );

    // Под «Экзаменом» — сколько осталось до экзамена в ГИБДД, если дата указана.
    const countdown = countdownLabel(planSummary(data, now));
    const examButton = el(
      'button',
      { class: `btn btn--secondary${countdown ? ' btn--sub' : ''}`, type: 'button', 'aria-label': countdown ? `Экзамен. Экзамен в ГИБДД: ${countdown}` : undefined, onclick: () => this.open({ name: 'exam' }) },
      'Экзамен',
      countdown ? el('span', { class: 'btn__sub', 'aria-hidden': 'true' }, `📅 ${countdown}`) : null,
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
        el('div', { class: 'menu__top' }, level, settingsButton),
        story,
        el(
          'div',
          { class: 'menu__row' },
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'chapters' }) }, 'Главы'),
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'progress' }) }, 'Прогресс'),
        ),
        el(
          'div',
          { class: 'menu__row' },
          examButton,
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'tickets' }) }, 'Билеты'),
        ),
        el(
          'div',
          { class: 'menu__row menu__row--review' },
          reviewButton,
          el('button', { class: 'btn btn--secondary btn--modes', type: 'button', onclick: () => this.open({ name: 'modes' }) }, 'Режимы ✨'),
        ),
        install,
        iosHint,
        status,
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
            if (!seen.includes('epilogue')) {
              await playCutscene(FINALE_STORY.epilogue, { last: 'К экзамену' });
              if (this.route !== route) return;
              see('epilogue');
            }
            await playCutscene(FINALE_STORY.exam, { last: 'Начать экзамен' });
            if (this.route !== route) return;
            this.open({ name: 'exam-run', boss: true });
          },
        },
        st.ready ? 'Сдать экзамен в ГИБДД' : 'Экзамен — после всех пунктов',
      );
      if (data.finale.exam) {
        body.replaceChildren(
          el(
            'section',
            { class: 'result exam-result is-passed' },
            el('p', { class: 'exam-result__verdict' }, 'Права получены!'),
            el('p', { class: 'result__note' }, `Экзамен-босс сдан ${new Date(data.finale.exam).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}. История пройдена целиком.`),
            el(
              'p',
              { class: 'result__note' },
              `Уровень ${levelOf(data.xp).number} «${levelOf(data.xp).title}» · звёзд: ${order.reduce((sum, id) => sum + (data.chapters[id]?.stars ?? 0), 0)} из ${order.length * 3} · экзаменов сдано: ${allExams().filter((e) => e.passed).length}`,
            ),
          ),
          el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => void playCutscene(FINALE_STORY.passed, { last: 'Конец' }) }, 'Концовка ещё раз'),
          el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'exam' }) }, 'Тренировочный экзамен'),
        );
        return;
      }
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
      const data = progress();
      const now = Date.now();
      const daily = ensureDaily(data, now);
      const r = readiness(data, questions, allExams(), now);
      const order = mapping.chapters.map((c) => c.id);
      const tip = (t: Tip) => {
        if (t.action === 'review') this.open({ name: 'review' });
        else if (t.action === 'block') this.open({ name: 'drill', mode: 'block', block: t.block, via: 'progress' });
        else if (t.action === 'exam') this.open({ name: 'exam' });
        else if (t.action === 'story') this.open({ name: 'city', chapter: currentChapter(data, order) });
        else if (t.action === 'plan') this.open({ name: 'plan' });
      };
      const level = levelOf(data.xp);
      const share = el(
        'button',
        {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: () =>
            void shareResult({
              kicker: 'Мой прогресс',
              title: `Уровень ${level.number}: «${level.title}»`,
              big: `${r.percent}%`,
              lines: ['готовность к экзамену', `Освоено вопросов: ${r.mastered} из ${r.total}`],
            }),
        },
        'Поделиться',
      );
      body.replaceChildren(
        readinessCard(r, { tip }),
        planLink(data, now, () => this.open({ name: 'plan' })),
        dailyCard(data, daily, now),
        el('div', { class: 'menu__row progress-actions' }, el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.open({ name: 'garage' }) }, `Гараж · 🪙 ${data.coins}`), share),
        progressView(progress(), questions, mapping, {
          train: (topic) => this.open({ name: 'drill', mode: 'topic', topic, via: 'progress' }),
          openChapter: (id) => this.open({ name: 'city', chapter: id }),
        }),
      );
    });
    return this.page('Прогресс', body, { back: 'menu' });
  }

  // ─── Мой экзамен ───────────────────────────────────────────────────────────────

  private planScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    loadQuestions().then((questions) => {
      if (this.route !== route) return;
      const data = progress();
      const now = Date.now();
      ensureDaily(data, now);
      saveProgress();
      const ready = () => readiness(data, questions, allExams(), Date.now()).percent;
      const refresh = () => {
        saveProgress();
        this.replace({ name: 'plan' });
      };
      body.replaceChildren(
        planView(data, now, ready(), {
          setDate: (date) => {
            setExamDate(data, date, questions.length, Date.now());
            showToast(`План к экзамену ${dateLabel(date)} готов`);
            refresh();
          },
          clear: () =>
            void showModal('Убрать дату экзамена?', el('p', { class: 'rewards__line' }, 'План по дням исчезнет, а повторы ошибок снова пойдут через 1, 3 и 7 дней.'), [
              { label: 'Оставить', primary: true },
              {
                label: 'Убрать дату',
                onClick: () => {
                  clearExamDate(data, Date.now());
                  refresh();
                },
              },
            ]),
          result: (passed) => {
            recordExamResult(data, passed, ready(), Date.now());
            playSound(passed ? 'pass' : 'fail');
            refresh();
          },
          fresh: () => this.open({ name: 'drill', mode: 'fresh', via: 'plan' }),
          reviews: () => this.open({ name: 'drill', mode: 'review', via: 'plan' }),
          refresh: () => this.open({ name: 'drill', mode: 'refresh', via: 'plan' }),
          exam: () => this.open({ name: 'exam-run', boss: false }),
          share: () => {
            const r = data.plan?.result;
            if (r)
              void shareResult({
                kicker: 'Экзамен в ГИБДД',
                title: 'Теория сдана!',
                big: `${r.readiness}%`,
                lines: ['готовность в игре в день экзамена', `Уровень ${levelOf(data.xp).number}: «${levelOf(data.xp).title}»`],
              });
          },
        }),
      );
    });
    return this.page('Мой экзамен', body, { back: 'menu' });
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
      case 'block':
        ids = trainingSet(data, questions.filter((q) => blockOf(q.number) === route.block).map((q) => q.id), 15);
        break;
      case 'fresh': {
        // Новые вопросы по билетам подряд: сколько осталось по плану на сегодня, но не больше 20.
        const plan = planDay(data, Date.now());
        const left = plan ? plan.fresh.target - plan.fresh.done : 0;
        ids = questions.filter((q) => !data.questions[q.id]).slice(0, left > 0 ? Math.min(20, left) : 20).map((q) => q.id);
        break;
      }
      case 'sign':
        // «Найти» в Знакодексе: вопросы со знаком — сначала с ошибками, потом новые.
        ids = trainingSet(data, route.ids ?? [], 10);
        break;
      case 'refresh': {
        // Повторение пройденного: сначала там, где были ошибки, потом давно не встречавшееся.
        const plan = planDay(data, Date.now());
        const left = plan ? plan.refresh.target - plan.refresh.done : 0;
        ids = refreshOrder(data, questions, Date.now()).slice(0, left > 0 ? Math.min(20, left) : 20);
        break;
      }
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
  }

  private drillScreen(route: DrillRoute): HTMLElement {
    const titles: Record<DrillMode, string> = {
      review: 'Повтор ошибок',
      practice: 'Тренировка ошибок',
      topic: route.topic ?? 'Тема',
      weak: 'Недоученные вопросы',
      block: `Блок: ${blockLabel(route.block ?? 0)}`,
      fresh: 'Новые вопросы',
      refresh: 'Повторение пройденного',
      sign: `Знак ${route.sign ?? ''}`,
    };
    return this.quizPage(route, titles[route.mode], route.via, (all) => this.drillQuestions(route, all), (results, _ms, list, body) => {
      const right = results.filter((r) => r.isCorrect).length;
      const left = route.mode === 'review' ? dueReviews(progress(), Date.now()).length : 0;
      // Из «Моего экзамена» — сколько сделано по плану на сегодня.
      const plan = route.via === 'plan' ? planDay(progress(), Date.now()) : undefined;
      const task = plan && (route.mode === 'fresh' ? plan.fresh : route.mode === 'refresh' ? plan.refresh : plan.reviews);
      body.replaceChildren(
        el(
          'section',
          { class: 'result' },
          el('p', { class: 'result__score' }, `${right} из ${list.length}`),
          el('p', { class: 'result__label' }, right === list.length ? 'Все ответы верные!' : 'Ошибки вернутся на повтор завтра.'),
          route.mode === 'review' ? el('p', { class: 'result__note' }, left ? `Ещё пора повторить: ${left}.` : 'На сегодня повторы закончены.') : null,
          task?.target ? el('p', { class: 'result__note' }, `План на сегодня: ${Math.min(task.done, task.target)} из ${task.target}${task.done >= task.target ? ' ✅' : ''}.`) : null,
        ),
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => this.replace(route) }, 'Ещё серия'),
      );
    });
  }

  // ─── Экзамен ───────────────────────────────────────────────────────────────────

  private examScreen(): HTMLElement {
    const history = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const start = el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.open({ name: 'exam-run', boss: false }) }, 'Начать экзамен');
    const bossNote = progress().finale.exam
      ? 'Экзамен-босс уже сдан — права получены. Здесь можно тренироваться сколько угодно.'
      : 'Здесь — тренировка, она доступна всегда. Экзамен-босс ждёт в финале сюжета, после всех глав.';
    loadQuestions().then((questions) => {
      const byId = new Map(questions.map((q) => [q.id, q]));
      history.replaceChildren(examHistoryView(allExams(), byId, (a) => this.open({ name: 'exam-result', at: a.at, via: 'history', boss: a.boss })));
    });
    return this.page(
      'Экзамен',
      el(
        'div',
        { class: 'exam-hub' },
        planLink(progress(), Date.now(), () => this.open({ name: 'plan' })),
        examRulesView(),
        start,
        el('p', { class: 'panel__note' }, bossNote),
        el('h2', { class: 'section-title' }, 'История экзаменов'),
        history,
      ),
      { back: 'menu' },
    );
  }

  private examRunScreen(route: ExamRunRoute): HTMLElement {
    const back: BackTarget = route.boss ? 'finale' : 'exam';
    const timer = el('span', { class: 'topbar__score exam-timer', role: 'timer', 'aria-label': 'Осталось времени' }, clock(EXAM_RULES.minutes * 60_000));
    const bar = el('div', { class: 'progress__bar' });
    const progressEl = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0 }, bar);
    const status = el('p', { class: 'exam-status', 'aria-live': 'polite' });
    const body = el('div', { class: 'quiz' }, el('p', { class: 'loading' }, 'Загрузка…'));
    const answer = el('button', { class: 'btn btn--primary btn--lg', type: 'button', disabled: true }, 'Ответить');
    let ticker: number | undefined;
    const stop = () => window.clearInterval(ticker);
    this.cleanup = stop;

    const leave = () =>
      void showModal('Выйти из экзамена?', el('p', { class: 'rewards__line' }, 'Экзамен не будет засчитан, ответы не сохранятся.'), [
        { label: 'Продолжить экзамен', primary: true },
        { label: 'Выйти', onClick: () => this.back(back) },
      ]);
    const screen = this.page(route.boss ? 'Экзамен в ГИБДД' : 'Экзамен', el('div', {}, status, body), { back, aside: timer, progress: progressEl, footer: answer, onBack: leave });
    const scroller = screen.querySelector<HTMLElement>('.screen__body')!;

    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const byId = new Map(all.map((q) => [q.id, q]));
      const s = startExam(all, Date.now());
      let selected = -1;
      let lastTick = -1;
      playSound('start');

      const show = () => {
        const item = currentItem(s);
        if (!item) return;
        const q = byId.get(item.id)!;
        const index = s.results.length;
        const main = s.items.length - extraCount(s);
        status.textContent = item.extra
          ? `Дополнительный вопрос ${index - main + 1} из ${extraCount(s)} · блок ${item.block + 1} · без ошибок`
          : `Вопрос ${index + 1} из ${EXAM_RULES.questions} · блок ${item.block + 1}`;
        progressEl.setAttribute('aria-valuemax', String(s.items.length));
        progressEl.setAttribute('aria-valuenow', String(index));
        bar.style.width = `${(index / s.items.length) * 100}%`;
        selected = -1;
        answer.disabled = true;
        body.replaceChildren(
          renderExamCard(q, (i) => {
            selected = i;
            answer.disabled = false;
          }),
        );
        scroller.scrollTop = 0;
      };

      const finish = () => {
        stop();
        const now = Date.now();
        const outcome = s.outcome!;
        const data = progress();
        // Ответы идут в прогресс только теперь: во время экзамена ничто не подсказывает, верен ли ответ.
        const outcomes = s.chosen.map((chosen, i) => recordAnswer(data, s.items[i].id, chosen === byId.get(s.items[i].id)!.correct, now));
        const reward = outcome.passed ? recordExamPass(data, route.boss, now) : undefined;
        // Пробный экзамен засчитывается в план к экзамену в ГИБДД (сдан или нет).
        outcomes.push(recordPlanExam(data, now));
        saveProgress();
        const attempt = recordExam({
          at: now,
          ms: Math.min(now, outcome.at) - s.startedAt,
          passed: outcome.passed,
          ...(outcome.reason ? { reason: outcome.reason } : {}),
          boss: route.boss,
          items: s.items.map((i) => i.id),
          extra: extraCount(s),
          chosen: [...s.chosen],
        });
        playSound(outcome.passed ? 'pass' : 'fail');
        levelUpToast(reward?.levelUp, false);
        if (reward?.xp) showToast(`+${reward.xp} опыта · +${reward.coins ?? 0} монет`);
        goalToast(outcomes.find((o) => o.goal), data);
        const result: ExamResultRoute = { name: 'exam-result', at: attempt.at, via: 'run', boss: route.boss };
        const go = () => {
          if (this.route !== route) return;
          // Результат занимает место экзамена в истории браузера: «Назад» не начнёт экзамен заново.
          this.replace(result);
        };
        if (route.boss) void playCutscene(outcome.passed ? FINALE_STORY.passed : FINALE_STORY.failed, { last: outcome.passed ? 'Конец' : 'Понятно' }).then(go);
        else go();
      };

      answer.onclick = () => {
        const item = currentItem(s);
        if (!item || selected < 0) return;
        const before = extraCount(s);
        answerExam(s, selected, selected === byId.get(item.id)!.correct, all, Date.now());
        if (s.outcome) return finish();
        const added = extraCount(s) - before;
        if (added > 0) {
          body.replaceChildren();
          void showModal(
            'Дополнительные вопросы',
            el(
              'div',
              { class: 'rewards' },
              el('p', { class: 'rewards__line' }, `В основных вопросах есть ошибка. Дополнительно: ${added} ${plural(added, ['вопрос', 'вопроса', 'вопросов'])} из тех же блоков.`),
              el('p', { class: 'rewards__line' }, `Время увеличено на ${(added / EXAM_RULES.extraQuestions) * EXAM_RULES.extraMinutes} минут. Ошибаться в дополнительных вопросах нельзя.`),
            ),
            [{ label: 'Продолжить', primary: true }],
          ).then(show);
          return;
        }
        show();
      };

      const tick = () => {
        const left = s.deadline - Date.now();
        timer.textContent = clock(left);
        timer.classList.toggle('is-low', left <= 60_000);
        const seconds = Math.ceil(left / 1000);
        if (seconds <= 10 && seconds > 0 && seconds !== lastTick) {
          lastTick = seconds;
          playSound('tick');
        }
        if (checkTime(s, Date.now())) finish();
      };
      ticker = window.setInterval(tick, 250);
      tick();
      show();
    });
    return screen;
  }

  private examResultScreen(route: ExamResultRoute): HTMLElement {
    const attempt = findExam(route.at);
    const back: BackTarget = route.boss && route.via === 'run' ? 'finale' : 'exam';
    if (!attempt) return this.page('Экзамен', el('p', { class: 'intro' }, 'Этот экзамен не найден: возможно, данные игры были очищены.'), { back });
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const footer =
      back === 'finale'
        ? el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.back('finale') }, 'К финалу')
        : el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => this.back('exam', { name: 'exam-run', boss: false }) }, 'Сдать ещё раз');
    loadQuestions().then((questions) => {
      if (this.route !== route) return;
      const byId = new Map(questions.map((q) => [q.id, q]));
      const mistakes = attempt.chosen.some((c, i) => c !== byId.get(attempt.items[i])?.correct);
      const story =
        attempt.boss && attempt.passed
          ? el('p', { class: 'banner banner--ok' }, 'История пройдена! Права получены — поздравляем от всей «Стрелы».')
          : attempt.boss && mistakes
            ? el('p', { class: 'banner banner--bad' }, 'Ошибки ушли в работу над ошибками. Когда они будут закреплены повторами, экзамен-босс откроется снова.')
            : attempt.boss
              ? el('p', { class: 'banner banner--bad' }, 'Ошибок нет, но время вышло. Экзамен-босса можно сдать снова из финала.')
              : null;
      const main = attempt.items.length - attempt.extra;
      const right = attempt.chosen.filter((c, i) => c === byId.get(attempt.items[i])?.correct).length;
      const share = attempt.passed
        ? el(
            'button',
            {
              class: 'btn btn--secondary',
              type: 'button',
              onclick: () =>
                void shareResult({
                  kicker: attempt.boss ? 'Экзамен в ГИБДД' : 'Тренировочный экзамен',
                  title: attempt.boss ? 'Права получены!' : 'Экзамен сдан!',
                  big: `${right} из ${attempt.chosen.length}`,
                  lines: [`${main} основных вопросов${attempt.extra ? ` и ${attempt.extra} дополнительных` : ''}`, `Время: ${Math.max(1, Math.round(attempt.ms / 60000))} мин`],
                }),
            },
            'Поделиться результатом',
          )
        : null;
      body.replaceChildren(...[story, share, examResultView(attempt, byId)].filter((x): x is HTMLElement => !!x));
    });
    return this.page(attempt.boss ? 'Экзамен в ГИБДД' : 'Экзамен', body, { back, footer });
  }

  // ─── Режимы ────────────────────────────────────────────────────────────────────

  private modesScreen(): HTMLElement {
    const duels = allDuels();
    const cards = {
      duel: {
        icon: '⚔️',
        title: 'Дуэль',
        text: '10 вопросов на скорость и ссылка другу: кто лучше знает правила?',
        status: duels.length ? `Дуэлей: ${duels.length}` : 'Вызови друга',
        open: () => this.open({ name: 'duel' }),
      },
      signs: {
        icon: '🛑',
        title: 'Знакодекс',
        text: 'Альбом дорожных знаков из билетов: открывай знаки верными ответами.',
        status: '',
        open: () => this.open({ name: 'signs' }),
      },
      patrol: {
        icon: '🚓',
        title: 'Один день Соколова',
        text: 'Смена на посту ДПС: лови нарушителей на перекрёстке и отвечай на вопросы.',
        status: progress().modes?.patrol ? `Рекорд: ${progress().modes!.patrol!.best} очков` : '3 минуты на посту',
        open: () => this.open({ name: 'patrol' }),
      },
      courier: {
        icon: '📦',
        title: 'Смена курьера',
        text: '5 минут, заказ за заказом: вопрос у каждой двери, серия верных ответов — множитель до ×5.',
        status: progress().modes?.courier?.length ? `Рекорд: ${progress().modes!.courier![0].score} очков` : 'Таблица рекордов пуста',
        open: () => this.open({ name: 'courier' }),
      },
    };
    const list = () => modesView([cards.duel, cards.signs, cards.patrol, cards.courier]);
    const body = el('div', {}, list());
    const route = this.route;
    void Promise.all([loadQuestions(), loadSigns()]).then(([all, signs]) => {
      if (this.route !== route) return;
      if (duels.length) {
        const s = duelStats(duels, new Map(all.map((q) => [q.id, q])));
        cards.duel.status = `Побед: ${s.wins} · поражений: ${s.losses}${s.waiting ? ` · ждут ответа: ${s.waiting}` : ''}`;
      }
      cards.signs.status = `Собрано: ${openSigns(progress(), signs.signs).size} из ${signs.signs.length}`;
      body.replaceChildren(list());
    });
    return this.page('Режимы', body, { back: 'menu', intro: 'Ещё способы выучить правила — с друзьями, на время и за коллекцию.' });
  }

  private patrolScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    void loadMapping().then((mapping) => {
      if (this.route !== route) return;
      const data = progress();
      const order = mapping.chapters.map((c) => c.id);
      const rec = data.modes?.patrol;
      body.replaceChildren(
        el(
          'section',
          { class: 'panel mode-intro' },
          el('p', { class: 'event-intro' }, avatar('sokolov', 'avatar--small'), el('span', {}, 'Лейтенант Соколов: «Сегодня вы — инспектор. Три минуты на посту у перекрёстка: ловите нарушителей касанием»')),
          el(
            'ul',
            { class: 'mode-rules' },
            el('li', {}, '🔴 проезд на красный — смотрите на светофор;'),
            el('li', {}, '📡 превышение скорости — радар покажет, кто едет быстрее 80 км/ч;'),
            el('li', {}, '🅿️ остановка под знаком «Остановка запрещена» — машина встанет с аварийкой.'),
          ),
          el('p', { class: 'panel__note' }, 'Пойман — 100 очков и вопрос из билетов про это правило (верно — ещё 50). Остановили честного водителя — минус 50.'),
          rec ? el('p', { class: 'mode-record' }, `🏆 Рекорд: ${rec.best} очков · смен: ${rec.shifts}`) : null,
        ),
        el('h2', { class: 'section-title' }, 'Где заступить на смену'),
        districtPicker(
          mapping.chapters.filter((c) => isUnlocked(data, order, c.id)),
          (id) => this.open({ name: 'patrol-run', chapter: id }),
        ),
      );
    });
    return this.page('Один день Соколова', body, { back: 'modes' });
  }

  private courierScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    void loadMapping().then((mapping) => {
      if (this.route !== route) return;
      const data = progress();
      const order = mapping.chapters.map((c) => c.id);
      const records = data.modes?.courier ?? [];
      const district = (id: string) => mapping.chapters.find((c) => c.id === id)?.district ?? '';
      body.replaceChildren(
        el(
          'section',
          { class: 'panel mode-intro' },
          el('p', { class: 'event-intro' }, avatar('marina', 'avatar--small'), el('span', {}, 'Марина: «Срочная смена! Пять минут, заказы один за другим — флажок покажет адрес»')),
          el(
            'ul',
            { class: 'mode-rules' },
            el('li', {}, '📦 у каждой двери — вопрос из билетов: сначала повторы ошибок, потом новые;'),
            el('li', {}, `🔥 верно — ${COURIER.points} очков × множитель, серия растит его до ×${COURIER.maxMultiplier};`),
            el('li', {}, `⏱ ошибка — множитель с нуля и −${COURIER.wrongPenalty} с, нарушение правил — −${COURIER.violationPenalty} с.`),
          ),
        ),
        el('h2', { class: 'section-title' }, 'Район смены'),
        districtPicker(
          mapping.chapters.filter((c) => isUnlocked(data, order, c.id)),
          (id) => this.open({ name: 'courier-run', chapter: id }),
        ),
        el('h2', { class: 'section-title' }, 'Таблица рекордов'),
        records.length
          ? el(
              'ol',
              { class: 'records' },
              ...records.map((r, i) =>
                el(
                  'li',
                  { class: `records__row${i === 0 ? ' is-top' : ''}` },
                  el('span', { class: 'records__place' }, String(i + 1)),
                  el('span', { class: 'records__body' }, el('b', {}, `${r.score} ${plural(r.score, ['очко', 'очка', 'очков'])}`), el('span', {}, `${district(r.chapter)} · доставок ${r.deliveries} · точность ${r.answers ? Math.round((r.correct / r.answers) * 100) : 0}% · ${dayLabel(r.at)}`)),
                ),
              ),
            )
          : el('p', { class: 'panel__note' }, 'Смен ещё не было — первая сразу попадёт в таблицу.'),
      );
    });
    return this.page('Смена курьера', body, { back: 'modes' });
  }

  private signsScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    const render = () =>
      loadSigns().then((signs) => {
        if (this.route !== route) return;
        const scroller = body.closest('.screen__body');
        const top = scroller?.scrollTop ?? 0;
        body.replaceChildren(
          signsView(progress(), signs, {
            find: (sign: SignEntry) => this.open({ name: 'drill', mode: 'sign', sign: sign.number, ids: sign.questions, via: 'signs' }),
            claim: (groupId) => {
              const data = progress();
              const prize = claimGroup(data, signs.signs, groupId);
              if (!prize) return;
              saveProgress();
              playSound('reward');
              showToast(`Награда за группу: +${prize.coins} монет${prize.sticker ? ' и новая наклейка в гараже' : ''}!`);
              void render();
            },
          }),
        );
        if (scroller) scroller.scrollTop = top;
      });
    void render();
    return this.page('Знакодекс', body, { back: 'modes' });
  }

  private duelScreen(): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    const route = this.route;
    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const byId = new Map(all.map((q) => [q.id, q]));
      const records = allDuels();
      body.replaceChildren(
        duelHubView(records, duelStats(records, byId), byId, {
          name: getSettings().name,
          setName: (name) => updateSettings({ name }),
          start: () => this.open({ name: 'duel-run' }),
          open: (r) => this.open({ name: 'duel-result', id: r.id, role: r.role }),
        }),
      );
    });
    return this.page('Дуэль', body, { back: 'modes' });
  }

  private duelInviteScreen(route: DuelInviteRoute): HTMLElement {
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const qs = resolveDuel(route.payload, new Map(all.map((q) => [q.id, q])));
      if (!qs) {
        body.replaceChildren(el('p', { class: 'intro' }, 'В этой дуэли вопросы, которых нет в этой версии игры. Обновите игру.'));
        return;
      }
      body.replaceChildren(
        duelInviteView(route.payload, qs, {
          name: getSettings().name,
          setName: (name) => updateSettings({ name }),
          // Дуэль занимает место вызова: «Назад» после неё не откроет вызов снова.
          accept: () => this.replace({ name: 'duel-run', invite: route.payload }),
        }),
      );
    });
    return this.page('Вызов на дуэль', body, { back: 'duel' });
  }

  private duelRunScreen(route: DuelRunRoute): HTMLElement {
    const timer = el('span', { class: 'topbar__score duel-timer', role: 'timer', 'aria-label': 'Время дуэли' }, '0:00');
    const bar = el('div', { class: 'progress__bar' });
    const progressEl = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0 }, bar);
    const status = el('p', { class: 'exam-status', 'aria-live': 'polite' });
    const body = el('div', { class: 'quiz' }, el('p', { class: 'loading' }, 'Загрузка…'));
    const answer = el('button', { class: 'btn btn--primary btn--lg', type: 'button', disabled: true }, 'Ответить');
    let ticker: number | undefined;
    const stop = () => window.clearInterval(ticker);
    this.cleanup = stop;
    const leave = () =>
      void showModal('Выйти из дуэли?', el('p', { class: 'rewards__line' }, 'Дуэль не будет засчитана, ответы не сохранятся.'), [
        { label: 'Продолжить дуэль', primary: true },
        { label: 'Выйти', onClick: () => this.back('duel') },
      ]);
    const screen = this.page(route.invite ? `Дуэль с: ${route.invite.from.name}` : 'Дуэль', el('div', {}, status, body), { back: 'duel', aside: timer, progress: progressEl, footer: answer, onBack: leave });
    const scroller = screen.querySelector<HTMLElement>('.screen__body')!;

    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const byId = new Map(all.map((q) => [q.id, q]));
      const ids = route.invite ? route.invite.q : pickDuelQuestions(all.map((q) => q.id));
      const list = ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      if (list.length !== ids.length) {
        body.replaceChildren(el('p', { class: 'intro' }, 'В этой дуэли вопросы, которых нет в этой версии игры. Обновите игру.'));
        return;
      }
      const chosen: number[] = [];
      const startedAt = Date.now();
      let selected = -1;
      playSound('start');

      const show = () => {
        const q = list[chosen.length];
        status.textContent = `Вопрос ${chosen.length + 1} из ${list.length}`;
        progressEl.setAttribute('aria-valuemax', String(list.length));
        progressEl.setAttribute('aria-valuenow', String(chosen.length));
        bar.style.width = `${(chosen.length / list.length) * 100}%`;
        selected = -1;
        answer.disabled = true;
        answer.textContent = chosen.length === list.length - 1 ? 'Ответить и закончить' : 'Ответить';
        body.replaceChildren(
          renderExamCard(q, (i) => {
            selected = i;
            answer.disabled = false;
          }),
        );
        scroller.scrollTop = 0;
      };

      const finish = () => {
        stop();
        const now = Date.now();
        const ms = now - startedAt;
        const data = progress();
        // Ответы идут в прогресс только после дуэли: во время неё ничто не подсказывает, верен ли ответ.
        const outcomes = chosen.map((c, i) => recordAnswer(data, list[i].id, c === list[i].correct, now));
        saveProgress();
        const levelUp = outcomes.find((o) => o.levelUp)?.levelUp;
        levelUpToast(levelUp, false);
        goalToast(outcomes.find((o) => o.goal), data);
        const name = getSettings().name || 'Игрок';
        const right = chosen.filter((c, i) => c === list[i].correct).length;
        if (route.invite) {
          const p = { ...route.invite, to: { name, answers: chosen, ms } };
          saveReply(p, now);
          playSound(right >= p.from.answers.filter((a, i) => a === list[i].correct).length ? 'pass' : 'fail');
          this.replace({ name: 'duel-result', id: p.id, role: 'to' });
        } else {
          const p: DuelPayload = { id: newDuelId(), at: now, q: ids, from: { name, answers: chosen, ms } };
          saveChallenge(p, now);
          playSound('pass');
          this.replace({ name: 'duel-result', id: p.id, role: 'from' });
        }
      };

      answer.onclick = () => {
        if (selected < 0 || chosen.length >= list.length) return;
        chosen.push(selected);
        if (chosen.length === list.length) finish();
        else show();
      };

      const tick = () => (timer.textContent = duelTime(Date.now() - startedAt));
      ticker = window.setInterval(tick, 250);
      tick();
      show();
    });
    return screen;
  }

  private duelResultScreen(route: DuelResultRoute): HTMLElement {
    const record = findDuel(route.id, route.role);
    if (!record) return this.page('Дуэль', el('p', { class: 'intro' }, 'Эта дуэль не найдена: возможно, данные игры были очищены.'), { back: 'duel' });
    const body = el('div', {}, el('p', { class: 'loading' }, 'Загрузка…'));
    loadQuestions().then((all) => {
      if (this.route !== route) return;
      const byId = new Map(all.map((q) => [q.id, q]));
      const qs = record.q.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      if (qs.length !== record.q.length) {
        body.replaceChildren(el('p', { class: 'intro' }, 'В этой дуэли вопросы, которых нет в этой версии игры.'));
        return;
      }
      const base = location.href.split('#')[0];
      const link =
        record.role === 'from' && !record.them
          ? duelLink(base, { id: record.id, at: record.at, q: record.q, from: record.me })
          : record.role === 'to' && record.them
            ? duelLink(base, { id: record.id, at: record.at, q: record.q, from: record.them, to: record.me })
            : undefined;
      body.replaceChildren(duelResultView(record, qs, { link, again: () => this.back('duel', { name: 'duel-run' }) }));
    });
    return this.page('Дуэль', body, { back: 'duel' });
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
      playSound(out.passed ? 'pass' : 'fail');
      levelUpToast(out.levelUp, false);
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
            goalToast(out, data);
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
    opts: { back: BackTarget; intro?: string; aside?: HTMLElement; progress?: HTMLElement; footer?: HTMLElement; onBack?: () => void },
  ): HTMLElement {
    const backButton = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Назад', onclick: () => (opts.onBack ? opts.onBack() : this.back(opts.back)) });
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
