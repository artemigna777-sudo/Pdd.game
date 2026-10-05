/**
 * Смена курьера (этап 13): 5 минут в районе открытой главы. Флажок на карте — следующий адрес,
 * у двери — вопрос из базы: верно — очки × множитель серии (до ×5), ошибка — множитель с нуля и
 * минус время, нарушение правил по дороге — тоже минус время. В конце — таблица рекордов.
 */
import type * as Phaser from 'phaser';
import { playSound, vibrateError } from '../audio/feedback.ts';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import type { CityData, CityScene } from '../game/city/CityScene.ts';
import { COURIER, courierAnswer, courierQuestion, recordCourier } from '../progress/modes.ts';
import { progress, recordAnswer, saveProgress } from '../progress/progress.ts';
import { getSettings } from '../settings.ts';
import { COURIER_INTRO } from '../story/extras.ts';
import { RULES } from '../world/rules.ts';
import { levelUpToast } from './cityScreen.ts';
import { avatar, playCutscene, showModal } from './cutscene.ts';
import { goalToast } from './dailyView.ts';
import { el } from './dom.ts';
import { drivePanel } from './drivePanel.ts';
import { plural } from './format.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard } from './questionCard.ts';

export interface CourierNav {
  onBack(): void;
  again(): void;
}

export interface CourierScreenHandle {
  element: HTMLElement;
  cleanup: () => void;
}

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Что привезти: только для настроения, на вопросы не влияет. */
const PARCELS = ['пиццу', 'букет', 'книги', 'торт', 'лекарства', 'ключи', 'кроссовки', 'пирожки', 'подарок', 'документы', 'чайник', 'фикус'];

export function courierScreen(game: Phaser.Game, chapterId: string, nav: CourierNav): CourierScreenHandle {
  let scene: CityScene | undefined;
  let stopped = false;
  let started = false;
  let ended = false;
  let ids: string[] = [];
  let local = new Set<string>();
  let questions = new Map<string, Question>();
  const recent: string[] = [];
  const rulesOn = getSettings().rules;
  const total = COURIER.seconds * (getSettings().shiftScale ?? 1);
  let left = total;
  let lastTick = 0;
  let score = 0;
  let multiplier = 1;
  let bestMultiplier = 1;
  let deliveries = 0;
  let answers = 0;
  let correct = 0;
  let order = 1;

  const timer = el('span', { class: 'topbar__score courier-timer', role: 'timer', 'aria-label': 'Время смены' }, time(left));
  const scoreEl = el('span', { class: 'patrol-stat courier-score', 'aria-label': 'Очки' }, '🏆 0');
  const multEl = el('span', { class: 'patrol-stat courier-mult', 'aria-label': 'Множитель серии' }, '×1');
  const delivEl = el('span', { class: 'patrol-stat', 'aria-label': 'Доставлено' }, '📦 0');
  const route = el('button', { class: 'courier-route', type: 'button', onclick: () => scene?.routeToGoal() }, '🚩 К адресу');
  const pops = el('div', { class: 'xp-pops', 'aria-live': 'polite' });
  const hint = el(
    'p',
    { class: 'city-hint courier-hint' },
    getSettings().control === 'joystick'
      ? 'Флажок — адрес заказа. Ведите машину джойстиком (стрелка у края экрана показывает, куда) или нажмите «К адресу».'
      : 'Флажок — адрес заказа. «К адресу» — машина сама проложит маршрут; можно и касаться дороги.',
  );
  const sheetTitle = el('p', { class: 'sheet__title' });
  const sheetBody = el('div', { class: 'sheet__body' });
  const next = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'Следующий заказ');
  const sheetFoot = el('footer', { class: 'sheet__foot', hidden: true }, next);
  const sheet = el('section', { class: 'sheet', 'aria-label': 'Вопрос', 'aria-hidden': 'true' }, sheetTitle, sheetBody, sheetFoot);
  const panel = drivePanel((kind, on) => scene?.setPedal(kind, on), rulesOn);
  panel.clean.textContent = '';

  const pop = (text: string, tone: 'xp' | 'bad' = 'xp') => {
    const item = el('span', { class: `xp-pop xp-pop--${tone}` }, text);
    pops.append(item);
    window.setTimeout(() => item.remove(), 1800);
  };
  const update = () => {
    scoreEl.textContent = `🏆 ${score}`;
    multEl.textContent = `×${multiplier}`;
    multEl.classList.toggle('is-hot', multiplier >= 3);
    delivEl.textContent = `📦 ${deliveries}`;
    timer.textContent = time(Math.max(0, left));
    timer.classList.toggle('is-low', left <= 15);
  };
  const sheetOpen = () => sheet.classList.contains('is-open');
  const pauseScene = () => {
    if (game.scene.isActive('city')) game.scene.pause('city');
  };
  const resumeScene = () => {
    if (!stopped && !ended && game.scene.isPaused('city')) game.scene.resume('city');
  };
  const openSheet = () => {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    hint.hidden = true;
    panel.drive.hidden = true;
    panel.release();
    panel.showHint(undefined);
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    // После первой доставки подсказка уже не нужна — карта свободнее.
    hint.hidden = deliveries > 0;
    panel.drive.hidden = !rulesOn;
  };
  const nextGoal = () => {
    const parcel = PARCELS[Math.floor(Math.random() * PARCELS.length)];
    scene?.showShiftGoal(`№${order}: ${parcel}`);
  };

  /** Доехали до адреса: вопрос из базы. */
  const onGoal = () => {
    if (ended) return;
    pauseScene();
    const id = courierQuestion(progress(), ids, local, Date.now(), recent);
    const question = questions.get(id);
    if (!question) return;
    recent.unshift(id);
    recent.length = Math.min(recent.length, 20);
    sheetTitle.textContent = `Заказ №${order} — у двери`;
    sheetFoot.hidden = true;
    sheetBody.scrollTop = 0;
    sheetBody.replaceChildren(
      el(
        'p',
        { class: 'event-intro' },
        avatar('marina', 'avatar--small'),
        el('span', {}, `Марина: «Клиент спрашивает. Ответишь верно — +${COURIER.points * multiplier} ${plural(COURIER.points * multiplier, ['очко', 'очка', 'очков'])}${multiplier > 1 ? ` (серия ×${multiplier})` : ''}».`),
      ),
      renderQuestionCard(question, (r) => {
        answers++;
        deliveries++;
        const out = courierAnswer(multiplier, r.isCorrect);
        if (r.isCorrect) {
          correct++;
          score += out.points;
          pop(`+${out.points}`);
          if (out.multiplier > multiplier) pop(`Серия ×${out.multiplier}!`);
        } else {
          left -= COURIER.wrongPenalty;
          pop(`Ошибка: −${COURIER.wrongPenalty} с, множитель ×1`, 'bad');
        }
        multiplier = out.multiplier;
        bestMultiplier = Math.max(bestMultiplier, multiplier);
        update();
        const data = progress();
        const res = recordAnswer(data, question.id, r.isCorrect, Date.now());
        saveProgress();
        if (res.review === 'added' || res.review === 'reset') pop('В работу над ошибками', 'bad');
        levelUpToast(res.levelUp);
        goalToast(res, data);
        order++;
        sheetFoot.hidden = false;
        next.textContent = left > 0 ? 'Следующий заказ' : 'Итоги смены';
        next.focus({ preventScroll: true });
      }),
    );
    openSheet();
  };

  next.addEventListener('click', () => {
    closeSheet();
    scene?.removeGoal();
    if (left <= 0) return finish();
    nextGoal();
    resumeScene();
  });

  const host: CityData['host'] = {
    showQuestion: () => undefined,
    onGoal,
    onViolation(v) {
      if (ended) return;
      left -= COURIER.violationPenalty;
      update();
      vibrateError();
      playSound('wrong');
      pop(`${RULES[v.kind].title}: −${COURIER.violationPenalty} с`, 'bad');
      window.setTimeout(() => scene?.endViolation(), 900);
    },
    onHint(h) {
      if (!sheetOpen()) panel.showHint(h);
    },
    onOverviewChange(on) {
      panel.drive.hidden = on || !rulesOn || sheetOpen();
      if (on) panel.release();
    },
  };

  /** Конец смены: очки, точность, место в таблице рекордов. */
  const finish = () => {
    if (ended || stopped) return;
    ended = true;
    pauseScene();
    const data = progress();
    const place = recordCourier(data, { score, deliveries, correct, answers, chapter: chapterId, at: Date.now() });
    saveProgress();
    playSound(place === 1 ? 'pass' : 'reward');
    const line = (label: string, value: string) => el('p', { class: 'rewards__line patrol-result__line' }, el('span', {}, label), el('b', {}, value));
    const accuracy = answers ? Math.round((correct / answers) * 100) : 0;
    void showModal(
      place === 1 ? 'Рекорд смены! 🏆' : 'Смена окончена',
      el(
        'div',
        { class: 'patrol-result' },
        el('p', { class: 'patrol-result__score' }, String(score), el('span', {}, plural(score, ['очко', 'очка', 'очков']))),
        line('📦 Доставлено', String(deliveries)),
        line('✅ Точность', `${accuracy}% (${correct} из ${answers})`),
        line('🔥 Лучший множитель', `×${bestMultiplier}`),
        el('p', { class: 'rewards__line' }, place ? `Место в таблице рекордов: ${place}.` : 'В таблицу рекордов смена не попала — в следующий раз получится!'),
        el('p', { class: 'event-intro' }, avatar('marina', 'avatar--small'), el('span', {}, deliveries >= 8 ? 'Марина: «Вот это темп! Клиенты в восторге».' : 'Марина: «Неплохо! Чем точнее ответы, тем быстрее растут очки».')),
      ),
      [
        { label: 'Ещё смена', primary: true, onClick: nav.again },
        { label: 'Выйти', onClick: nav.onBack },
      ],
    );
  };

  const leave = () => {
    if (ended || !started) return nav.onBack();
    pauseScene();
    void showModal('Закончить смену?', el('p', { class: 'rewards__line' }, 'Смена не попадёт в таблицу рекордов.'), [
      { label: 'Продолжить', primary: true, onClick: () => (sheetOpen() ? undefined : resumeScene()) },
      { label: 'Закончить', onClick: nav.onBack },
    ]);
  };
  const button = (icon: string, label: string, onclick: () => void) => {
    const b = el('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': label, onclick });
    b.innerHTML = icon;
    return b;
  };

  const element = el(
    'div',
    { class: `screen screen--city screen--courier${rulesOn ? ' has-pedals' : ''}` },
    el(
      'header',
      { class: 'topbar topbar--city' },
      button(ICONS.back, 'Назад', leave),
      el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, 'Смена курьера'),
      timer,
      button(ICONS.map, 'Карта района', () => scene?.toggleOverview()),
    ),
    el('div', { class: 'patrol-hud' }, scoreEl, multEl, delivEl),
    route,
    panel.ruleHint,
    pops,
    hint,
    panel.drive,
    sheet,
  );

  // Время идёт, пока город на экране (вопрос у двери время не отнимает).
  const ticker = window.setInterval(() => {
    const now = performance.now();
    const dt = lastTick ? (now - lastTick) / 1000 : 0;
    lastTick = now;
    if (scene && rulesOn && game.scene.isActive('city')) panel.setReadout(scene.drive);
    if (!started || ended || stopped || sheetOpen() || !game.scene.isActive('city')) return;
    const before = Math.ceil(left);
    left -= dt;
    if (left <= 10 && Math.ceil(left) < before && left > 0) playSound('tick');
    update();
    if (left <= 0) finish();
  }, 150);

  void Promise.all([loadQuestions(), loadMapping()]).then(async ([all, mapping]) => {
    if (stopped) return;
    questions = new Map(all.map((q) => [q.id, q]));
    ids = all.map((q) => q.id);
    local = new Set(mapping.questions.filter((p) => p.chapter === chapterId).map((p) => p.id));
    const data: CityData = {
      host,
      questions: all,
      mapping,
      chapter: chapterId,
      control: getSettings().control,
      visited: [],
      isWrong: () => false,
      events: false,
      rules: rulesOn,
      difficulty: getSettings().difficulty,
      shift: true,
    };
    game.scene.sleep('street');
    const city = game.scene.getScene('city') as CityScene;
    const created = new Promise<void>((resolve) => city.events.once('create', () => resolve()));
    game.scene.start('city', data);
    scene = city;
    await created;
    if (stopped) return;
    if (!progress().modes?.courier?.length) {
      pauseScene();
      await playCutscene(COURIER_INTRO, { last: 'Начать смену' });
      if (stopped) return;
      resumeScene();
    }
    nextGoal();
    started = true;
    playSound('start');
  });

  return {
    element,
    cleanup() {
      stopped = true;
      window.clearInterval(ticker);
      if (game.scene.isActive('city') || game.scene.isPaused('city')) game.scene.stop('city');
      game.scene.wake('street');
    },
  };
}
