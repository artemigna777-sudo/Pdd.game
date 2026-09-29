/**
 * Экран города: интерфейс поверх Phaser-сцены CityScene (район одной главы) и сюжет главы.
 * Сверху — панель (назад, глава, счёт, карта, настройки) и задание главы, снизу — подсказка
 * и выезжающая карточка вопроса. В точке интереса может быть серия вопросов — они идут один
 * за другим. Касания мимо кнопок проходят в игру.
 *
 * Сюжет: вступление главы → сцены по ходу (после трети и двух третей точек) → когда все точки
 * пройдены и верных от 80%, на карте появляется флажок доставки → финал главы и награды.
 */
import type * as Phaser from 'phaser';
import { playSound } from '../audio/feedback.ts';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import type { CityData, CityScene, RuleHint } from '../game/city/CityScene.ts';
import {
  addCleanDistance,
  canDeliver,
  chapterResult,
  chapterState,
  deliver,
  distanceLabel,
  driveState,
  levelOf,
  markPoint,
  markSeen,
  percent,
  progress,
  recordAnswer,
  recordViolation,
  refreshStars,
  saveProgress,
  type ChapterInfo,
  type DeliveryOutcome,
  type LevelInfo,
} from '../progress/progress.ts';
import { getSettings, onSettingsChange } from '../settings.ts';
import { PROLOGUE, STORY, beatThresholds, fill, type Line } from '../story/story.ts';
import { chapterInfo, type Mapping } from '../world/mapping.ts';
import { playCutscene, showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { durationLabel, plural } from './format.ts';
import { ICONS } from './icons.ts';
import { levelMeter, starsText } from './progressView.ts';
import { renderQuestionCard } from './questionCard.ts';
import { controlHint, settingsPanel } from './settingsPanel.ts';
import { goalToast } from './dailyView.ts';
import { shareResult } from './share.ts';
import { showToast } from './toast.ts';
import type { Question } from '../data/types.ts';
import { acceptSide, advanceSide, raceActive, raceAnswer, raceTick, rivalProgress, settleRace, sideStatus, sideStep, startRace, type RaceResult } from '../progress/race.ts';
import { RIVALS, RULES_INTRO, SIDE_QUESTS, raceReaction, sideDone } from '../story/extras.ts';
import { EVENTS, pickEventQuestion, pickQuestion } from '../world/events.ts';
import { CLEAN_XP } from '../progress/progress.ts';
import { RULES, questionsFor, type Violation } from '../world/rules.ts';
import { vibrateError } from '../audio/feedback.ts';

export interface CityScreen {
  element: HTMLElement;
  cleanup: () => void;
}

export interface CityNav {
  onBack(): void;
  /** Открыть другую главу (следующую после доставки). */
  openChapter(id: string): void;
  /** Открыть финал (после последней главы). */
  openFinale(): void;
}

function iconButton(icon: string, label: string, onclick: () => void): HTMLButtonElement {
  const b = el('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': label, onclick });
  b.innerHTML = icon;
  return b;
}

export function levelUpToast(level: LevelInfo | undefined, sound = true): void {
  if (!level) return;
  showToast(`Новый уровень ${level.number}: «${level.title}»!`);
  if (sound) playSound('reward');
}

export function cityScreen(game: Phaser.Game, chapterId: string, nav: CityNav): CityScreen {
  let scene: CityScene | undefined;
  let info: ChapterInfo | undefined;
  let mapping: Mapping | undefined;
  let answered = 0;
  let correct = 0;
  let stopped = false;
  let goalShown = false;
  const story = STORY[chapterId];
  const rival = RIVALS[chapterId];
  const quest = SIDE_QUESTS[chapterId];
  /** Поручение предлагали в этот заезд, и игрок отказался (предложим в следующий раз). */
  let sideDeclined = false;
  let questionsById = new Map<string, Question>();
  /** Карточка внизу: вопрос точки, вопрос события в пути или вопрос инспектора о нарушении. */
  let sheetMode: 'point' | 'event' | 'violation' = 'point';
  const recentEvents: string[] = [];
  const recentRules: string[] = [];
  /** Город замечает нарушения (этап 8; автотесты прежних этапов выключают). */
  const rulesOn = getSettings().rules;
  let rivalDone = false;

  const score = el('span', { class: 'topbar__score', 'aria-label': 'Правильных ответов' });
  const title = el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, 'Загрузка…');
  const taskGoal = el('span', { class: 'city-task__goal' }, story ? story.task : '');
  const taskMeta = el('span', { class: 'city-task__meta' });
  const task = el('button', { class: 'city-task', type: 'button', 'aria-label': 'Задание главы', onclick: () => void showTask() }, taskGoal, taskMeta);
  const pops = el('div', { class: 'xp-pops', 'aria-live': 'polite' });
  const hint = el('p', { class: 'city-hint' });
  const baseHint = () => (goalShown ? 'Флажок доставки на карте — поезжайте туда.' : controlHint(getSettings().control));
  hint.textContent = baseHint();
  const sheetTitle = el('p', { class: 'sheet__title' });
  const sheetBody = el('div', { class: 'sheet__body' });
  const go = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'Поехали');
  const skipEvent = el('button', { class: 'btn btn--quiet', type: 'button' }, 'Пропустить вопрос');
  const sheetFoot = el('footer', { class: 'sheet__foot', hidden: true }, go);
  // Вопрос события можно пропустить (вопрос точки — нет).
  const eventFoot = el('footer', { class: 'sheet__alt', hidden: true }, skipEvent);
  const sheet = el('section', { class: 'sheet', 'aria-label': 'Вопрос', 'aria-hidden': 'true' }, sheetTitle, sheetBody, sheetFoot, eventFoot);
  const settings = el('div', { class: 'popover', hidden: true }, settingsPanel());
  const mapButton = iconButton(ICONS.map, 'Карта района', () => {
    if (!scene) return;
    scene.toggleOverview();
  });

  // ─── Педали, спидометр, «Чистая езда» (этап 8) ───────────────────────────────

  const pedal = (kind: 'brake' | 'gas', label: string) => {
    const b = el('button', { class: `pedal pedal--${kind}`, type: 'button', 'aria-label': label, 'aria-pressed': 'false' }, el('span', { class: 'pedal__label' }, label));
    const set = (on: boolean) => {
      b.setAttribute('aria-pressed', String(on));
      scene?.setPedal(kind, on);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        // Палец чуть сполз с кнопки — педаль всё ещё нажата.
        b.setPointerCapture(e.pointerId);
      } catch {
        // Синтетическое событие без настоящего указателя — захват не нужен.
      }
      set(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => set(false));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return { el: b, release: () => set(false) };
  };
  const brake = pedal('brake', 'Тормоз');
  const gas = pedal('gas', 'Газ');
  const speed = el('span', { class: 'speedo__speed' }, '0');
  const limit = el('span', { class: 'speedo__limit', 'aria-label': 'Разрешённая скорость' }, '60');
  const clean = el('span', { class: 'speedo__clean' });
  const speedo = el('div', { class: 'speedo', role: 'status', 'aria-label': 'Спидометр' }, el('span', { class: 'speedo__row' }, speed, el('span', { class: 'speedo__unit' }, 'км/ч'), limit), clean);
  const drive = el('div', { class: 'drive', hidden: !rulesOn }, brake.el, speedo, gas.el);
  const ruleHint = el('p', { class: 'rule-hint', hidden: true, 'aria-live': 'polite' });

  /** Педали видны, когда машина едет сама по себе (не у точки, не в обзоре, не в разговоре). */
  let overviewOn = false;
  const updateDrive = () => {
    const show = rulesOn && !sheet.classList.contains('is-open') && !overviewOn;
    if (drive.hidden === show) drive.hidden = !show;
    if (!show) {
      brake.release();
      gas.release();
    }
  };

  const updateClean = () => {
    clean.textContent = `🛡 ${distanceLabel(driveState(progress()).clean)}`;
    clean.setAttribute('aria-label', `Чистая езда: ${distanceLabel(driveState(progress()).clean)} без нарушений`);
  };
  updateClean();
  let cleanTicks = 0;
  const driveTimer = window.setInterval(() => {
    if (stopped || !scene || !rulesOn || !game.scene.isActive('city')) return;
    const info = scene.drive;
    speed.textContent = String(info.kmh);
    limit.textContent = String(info.limit);
    speedo.classList.toggle('is-over', info.kmh > info.limit);
    const px = scene.takeClean();
    if (px > 0) {
      addCleanDistance(progress(), chapterId, px);
      updateClean();
      if (++cleanTicks % 30 === 0) saveProgress();
    }
  }, 150);

  const HINTS: Record<RuleHint['kind'], (h: RuleHint) => string> = {
    'red-light': () => 'Впереди красный — тормозите до стоп-линии.',
    pedestrian: () => 'Пешеход на переходе — остановитесь и пропустите.',
    speeding: (h) => `Здесь можно ${h.kind === 'speeding' ? h.limit : 60} км/ч — отпустите «Газ».`,
    'no-stopping': (h) =>
      h.kind === 'no-stopping'
        ? `Здесь стоять нельзя (${{ crosswalk: 'переход', junction: 'перекрёсток', railway: 'переезд', zone: 'знак «Остановка запрещена»' }[h.place]}) — проезжайте.`
        : '',
    oncoming: () => 'Сплошная линия: разворот через неё — выезд на встречную. Потяните назад ещё раз, если всё-таки нужно.',
  };
  const showRuleHint = (h: RuleHint | undefined) => {
    ruleHint.hidden = !h;
    if (h) ruleHint.textContent = `💡 ${HINTS[h.kind](h)}`;
  };

  const updateScore = () => {
    score.textContent = answered ? `${correct}/${answered}` : '';
  };

  /** Всплывающая отметка над картой: опыт, работа над ошибками. */
  const pop = (text: string, tone: 'xp' | 'bad' = 'xp') => {
    const item = el('span', { class: `xp-pop xp-pop--${tone}` }, text);
    pops.append(item);
    window.setTimeout(() => item.remove(), 1800);
  };

  const updateTask = () => {
    if (!info) return;
    const data = progress();
    const r = chapterResult(data, info);
    const state = data.chapters[chapterId];
    if (state?.delivered) taskGoal.textContent = `Глава пройдена · ${starsText(state.stars)}`;
    else if (goalShown && story) taskGoal.textContent = `Вези посылку: ${story.goal}`;
    else if (story) taskGoal.textContent = story.task;
    // На узком экране — короче, чтобы строка не переносилась.
    const narrow = window.innerWidth < 400;
    const parts = [narrow ? `Точки ${r.pointsDone}/${r.points}` : `Точки ${r.pointsDone} из ${r.points}`, `верных ${percent(r.share)}%`];
    if (r.pointsWithMistakes.length) parts.push(narrow ? `ошибки: ${r.pointsWithMistakes.length}` : `с ошибками: ${r.pointsWithMistakes.length}`);
    if (rival && raceActive(data, chapterId) && seen('race')) {
      const k = rivalProgress(data, info, rival);
      parts.push(k >= 1 ? (narrow ? '🛵 доставил' : '🛵 Артём доставил') : narrow ? `🛵 ${Math.floor(k * 100)}%` : `🛵 Артём ${Math.floor(k * 100)}%`);
    }
    taskMeta.textContent = parts.join(' · ');
    task.classList.toggle('is-goal', goalShown);
  };

  const openSheet = () => {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    hint.hidden = true;
    ruleHint.hidden = true;
    updateDrive();
    // После анимации — сдвинуть камеру, чтобы сцена была видна над карточкой.
    window.setTimeout(() => {
      if (stopped || !scene) return;
      const top = sheet.getBoundingClientRect().top;
      // Свободная полоса — между панелью задания сверху и карточкой снизу.
      const head = task.getBoundingClientRect().bottom;
      scene.focusVisible(Math.max(0.2, top / window.innerHeight), head / window.innerHeight);
    }, 320);
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    updateDrive();
  };

  /** Сцена или окно поверх города; город на это время замирает. false — экран уже закрыт. */
  const paused = async (show: () => Promise<void>): Promise<boolean> => {
    const pause = game.scene.isActive('city');
    if (pause) game.scene.pause('city');
    await show();
    if (stopped) return false;
    if (pause && game.scene.isPaused('city')) game.scene.resume('city');
    return true;
  };
  const cutscene = (lines: Line[], last?: string) => paused(() => playCutscene(lines, { last }).then(() => undefined));
  /** Сцена с выбором: undefined — экран закрыт. */
  const choose = async (lines: Line[], last?: string): Promise<string | null | undefined> => {
    let value: string | undefined;
    const ok = await paused(async () => {
      value = await playCutscene(lines, { last });
    });
    return ok ? (value ?? null) : undefined;
  };

  const seen = (id: string) => chapterState(progress(), chapterId).seen.includes(id);
  const see = (id: string) => {
    markSeen(progress(), chapterId, id);
    saveProgress();
  };

  /** Сюжет по ходу главы: сцены после трети и двух третей точек, флажок доставки. */
  const advanceStory = async () => {
    if (!info || !story || !scene) return;
    const data = progress();
    const r = chapterResult(data, info);
    const [first, second] = beatThresholds(r.points);
    for (const [i, need] of [first, second].entries()) {
      const id = `beat${i + 1}`;
      if (r.pointsDone >= need && !seen(id)) {
        if (!(await cutscene(story.beats[i], 'Дальше'))) return;
        see(id);
      }
    }
    if (data.chapters[chapterId]?.delivered || goalShown) return;
    // Поручение персонажа — после первой сюжетной сцены главы, пока посылку ещё рано везти.
    if (quest && seen('beat1') && sideStatus(data, chapterId) === 'none' && !sideDeclined && !canDeliver(r)) {
      if (!(await offerSide())) return;
    }
    if (canDeliver(r)) {
      if (!seen('ready')) {
        if (!(await cutscene(fill(story.ready, { percent: percent(r.share) }), 'Везу!'))) return;
        see('ready');
      } else showToast(`Флажок доставки на карте: ${story.goal}.`);
      goalShown = true;
      scene.showGoal(story.goal);
      hint.textContent = baseHint();
      updateTask();
    } else if (r.pointsDone === r.points && !seen('low')) {
      if (!(await cutscene(fill(story.low, { percent: percent(r.share) }), 'Понятно'))) return;
      see('low');
    }
  };

  // ─── Гонка с Артёмом ─────────────────────────────────────────────────────────

  /** Вызов Артёма в начале главы (один раз). false — экран закрыт. */
  const raceIntro = async (): Promise<boolean> => {
    if (!rival || !info || seen('race') || !raceActive(progress(), chapterId)) return true;
    const r = chapterResult(progress(), info);
    if (r.pointsDone >= r.points) return true;
    const value = await choose(rival.challenge, 'Поехали');
    if (value === undefined) return false;
    startRace(progress(), chapterId, r.points ? r.pointsDone / r.points : 0);
    see('race');
    if (value) see(`race:${value}`);
    updateTask();
    return true;
  };

  /** Время в районе: секунда за секундой, пока город открыт и не на паузе. */
  let ticks = 0;
  const raceTimer = window.setInterval(() => {
    if (stopped || !info || !rival || !seen('race') || document.hidden || !game.scene.isActive('city')) return;
    const data = progress();
    if (!raceActive(data, chapterId)) return;
    raceTick(data, chapterId, 1);
    const done = rivalProgress(data, info, rival) >= 1;
    if (done && !rivalDone) {
      rivalDone = true;
      scene?.setRival(false);
      showToast(`Артём уже доставил ${rival.parcel}! Но гонку решает ещё и точность.`);
    }
    if (++ticks % 10 === 0) saveProgress();
    updateTask();
  }, 1000);

  const raceView = (result: RaceResult) => {
    const cell = (text: string, win: boolean) => el('td', { class: win ? 'is-win' : '' }, text);
    const minutes = (sec: number) => durationLabel(sec * 1000);
    return el(
      'section',
      { class: 'race', 'aria-label': 'Гонка с Артёмом' },
      el('p', { class: 'race__title' }, '🛵 Гонка с Артёмом'),
      el(
        'table',
        { class: 'race__table' },
        el('tr', {}, el('th', {}, ''), el('th', {}, 'Время'), el('th', {}, 'Точность')),
        el('tr', {}, el('th', {}, 'Ты'), cell(minutes(result.you.time), result.faster === 'you'), cell(`${result.you.accuracy}%`, result.accurate === 'you')),
        el('tr', {}, el('th', {}, 'Артём'), cell(minutes(result.artem.time), result.faster === 'artem'), cell(`${result.artem.accuracy}%`, result.accurate === 'artem')),
      ),
      el('p', { class: 'race__quote' }, `Артём: «${raceReaction(result.faster, result.accurate).text}»`),
      result.coins ? el('p', { class: 'rewards__line rewards__xp' }, `+${result.coins} монет за гонку`) : null,
    );
  };

  // ─── Поручения ───────────────────────────────────────────────────────────────

  /** Предложить поручение. false — экран закрыт. */
  const offerSide = async (): Promise<boolean> => {
    if (!quest) return true;
    const value = await choose(quest.offer, 'Поехали');
    if (value === undefined) return false;
    if (value === 'accept') {
      acceptSide(progress(), chapterId);
      saveProgress();
      showSideMarker();
    } else sideDeclined = true;
    updateTask();
    return true;
  };

  const showSideMarker = () => {
    if (!quest || !scene || sideStatus(progress(), chapterId) !== 'taken') return;
    scene.showSide(quest.stops[Math.min(1, sideStep(progress(), chapterId))].label);
  };

  const onSide = async () => {
    if (!quest || sideStatus(progress(), chapterId) !== 'taken') return;
    const step = sideStep(progress(), chapterId);
    if (!(await cutscene(step === 0 ? quest.stops[0].lines : sideDone(quest), step === 0 ? 'Везу!' : 'Поехали'))) return;
    const out = advanceSide(progress(), chapterId, Date.now());
    saveProgress();
    scene?.removeSide();
    if (out.done) {
      if (out.coins) pop(`+${out.coins} монет`);
      if (out.xp) pop(`+${out.xp} опыта`);
      levelUpToast(out.levelUp);
      playSound('reward');
    } else showSideMarker();
    updateTask();
  };

  // ─── События в пути ──────────────────────────────────────────────────────────

  const onEvent = (kind: keyof typeof EVENTS) => {
    const ev = EVENTS[kind];
    const id = pickEventQuestion(kind, (qid) => progress().questions[qid], Math.random, recentEvents);
    const question = questionsById.get(id);
    if (stopped || !question) {
      scene?.endEvent();
      return;
    }
    recentEvents.unshift(id);
    recentEvents.length = Math.min(recentEvents.length, 4);
    sheetMode = 'event';
    sheetTitle.textContent = ev.title;
    sheetFoot.hidden = true;
    eventFoot.hidden = false;
    sheetBody.scrollTop = 0;
    sheetBody.replaceChildren(
      el('p', { class: 'event-intro' }, ev.intro),
      renderQuestionCard(question, (result) => {
        answered++;
        if (result.isCorrect) correct++;
        updateScore();
        const data = progress();
        const out = recordAnswer(data, question.id, result.isCorrect, Date.now());
        saveProgress();
        if (out.xp) pop(`+${out.xp} опыта`);
        if (out.coins) pop(`+${out.coins} монет`);
        if (out.review === 'added' || out.review === 'reset') pop('В работу над ошибками', 'bad');
        if (out.review === 'cleared') pop('Ошибка закреплена!');
        levelUpToast(out.levelUp);
        goalToast(out, data);
        eventFoot.hidden = true;
        showGo('Поехали');
      }),
    );
    openSheet();
  };

  // ─── Нарушения ───────────────────────────────────────────────────────────────

  /** Лейтенант Соколов остановил машину: вопрос из базы про нарушенное правило. */
  const onViolation = (v: Violation) => {
    const data = progress();
    recordViolation(data, chapterId);
    saveProgress();
    updateClean();
    vibrateError();
    playSound('wrong');
    pop('Чистая езда — с нуля', 'bad');
    const id = pickQuestion(questionsFor(v), (qid) => progress().questions[qid], Math.random, recentRules);
    const question = questionsById.get(id);
    if (stopped || !question) {
      scene?.endViolation();
      return;
    }
    recentRules.unshift(id);
    recentRules.length = Math.min(recentRules.length, 4);
    sheetMode = 'violation';
    sheetTitle.textContent = `Нарушение: ${RULES[v.kind].title}`;
    sheetFoot.hidden = true;
    eventFoot.hidden = true;
    sheetBody.scrollTop = 0;
    sheetBody.replaceChildren(
      el('p', { class: 'event-intro violation-intro' }, `Лейтенант Соколов: «${RULES[v.kind].says(v)} Проверим, знаете ли вы это правило».`),
      renderQuestionCard(question, (result) => {
        answered++;
        if (result.isCorrect) correct++;
        updateScore();
        const d = progress();
        const out = recordAnswer(d, question.id, result.isCorrect, Date.now());
        saveProgress();
        if (out.xp) pop(`+${out.xp} опыта`);
        if (out.coins) pop(`+${out.coins} монет`);
        if (out.review === 'added' || out.review === 'reset') pop('В работу над ошибками', 'bad');
        if (out.review === 'cleared') pop('Ошибка закреплена!');
        levelUpToast(out.levelUp);
        goalToast(out, d);
        showToast(result.isCorrect ? 'Соколов: «Правило знаете. На этот раз — предупреждение».' : 'Соколов: «Правило стоит повторить». Вопрос — в работе над ошибками.');
        showGo('Поехали');
      }),
    );
    openSheet();
  };

  /** Посылка доставлена: финал главы, награды, следующая глава. */
  const onGoal = async () => {
    if (!info || !story || !mapping) return;
    if (!(await cutscene(story.finale, 'Награда'))) return;
    const out = deliver(progress(), info, Date.now());
    const race = rival ? settleRace(progress(), info, rival, Date.now()) : undefined;
    saveProgress();
    goalShown = false;
    scene?.removeGoal();
    scene?.setRival(false);
    hint.textContent = baseHint();
    updateTask();
    await paused(() => rewards(out, race));
  };

  const cleanLine = (c: NonNullable<DeliveryOutcome['clean']>) =>
    c.star
      ? `🛡 Чистая езда: без нарушений — +1 ★ и +${c.xp} опыта`
      : `🛡 Чистая езда: ${c.violations} ${plural(c.violations, ['нарушение', 'нарушения', 'нарушений'])} — ${c.xp ? `+${c.xp} опыта` : 'без бонуса'}`;

  const rewards = (out: DeliveryOutcome, race?: RaceResult) => {
    const chapters = mapping!.chapters;
    const i = chapters.findIndex((c) => c.id === chapterId);
    const next = chapters[i + 1];
    const r = chapterResult(progress(), info!);
    const level = levelOf(progress().xp);
    const lines = [
      el('p', { class: 'rewards__stars', 'aria-label': `Звёзд: ${out.stars} из 3` }, starsText(out.stars)),
      el('p', { class: 'rewards__line' }, `Верных ответов в главе: ${percent(r.share)}%`),
      out.xp ? el('p', { class: 'rewards__line rewards__xp' }, `+${out.xp} опыта`) : null,
      out.clean ? el('p', { class: 'rewards__line rewards__clean' }, cleanLine(out.clean)) : null,
      levelMeter(level, progress().xp),
      race ? raceView(race) : null,
      el('p', { class: 'rewards__next' }, next ? `Открыта глава ${next.number}: «${next.title}»` : 'Открыт финал: подготовка к экзамену в ГИБДД'),
    ];
    const body = el('div', { class: 'rewards' }, ...lines);
    const hintStars = out.stars < 3 ? el('p', { class: 'rewards__hint' }, 'Звёзд станет больше, если исправить ошибки главы: 90% — две звезды, 100% — три.') : null;
    if (hintStars) body.append(hintStars);
    playSound('pass');
    levelUpToast(out.levelUp, false);
    return showModal(`Глава ${chapters[i].number} пройдена!`, body, [
      next ? { label: `Глава ${next.number}`, primary: true, onClick: () => nav.openChapter(next.id) } : { label: 'К финалу', primary: true, onClick: () => nav.openFinale() },
      {
        label: 'Поделиться',
        onClick: () =>
          void shareResult({
            kicker: `Глава ${chapters[i].number}: ${chapters[i].title}`,
            title: 'Глава пройдена!',
            big: starsText(out.stars),
            lines: [`Верных ответов: ${percent(r.share)}%`, `Уровень ${level.number}: «${level.title}»`],
          }),
      },
      { label: 'Остаться в районе' },
    ]);
  };

  /** «Чистая езда» в задании главы: счётчик, нарушения в главе и бонус при доставке. */
  const cleanTask = () => {
    const now = distanceLabel(driveState(progress()).clean);
    const n = progress().chapters[chapterId]?.drive?.violations ?? 0;
    const head = `🛡 Чистая езда: ${now} без нарушений. В этой главе ${n ? `${n} ${plural(n, ['нарушение', 'нарушения', 'нарушений'])}` : 'нарушений нет'}.`;
    if (progress().chapters[chapterId]?.delivered) return head;
    const xp = CLEAN_XP[n] ?? 0;
    return `${head} ${n === 0 ? `Без нарушений до доставки — +1 ★ и +${xp} опыта.` : xp ? `При доставке — +${xp} опыта.` : 'Бонуса за чистую езду в этой главе уже не будет.'}`;
  };

  /** Касание задания: подробности и вступление ещё раз. */
  const showTask = async () => {
    if (!info || !story) return;
    const r = chapterResult(progress(), info);
    const state = progress().chapters[chapterId];
    const need = Math.ceil(r.questions * 0.8);
    const rows = [
      el('p', { class: 'rewards__line' }, `Задание: ${story.task}.`),
      el('p', { class: 'rewards__line' }, `Пройдено точек: ${r.pointsDone} из ${r.points}.`),
      el('p', { class: 'rewards__line' }, `Верных ответов: ${r.correct} из ${r.questions} (${percent(r.share)}%). Для доставки нужно от 80% — ${need} ${plural(need, ['ответ', 'ответа', 'ответов'])}.`),
      r.pointsWithMistakes.length
        ? el('p', { class: 'rewards__line' }, `Красные точки — там были ошибки (${r.pointsWithMistakes.length}). В них повторятся только вопросы с ошибкой.`)
        : null,
      state?.delivered ? el('p', { class: 'rewards__line' }, `Глава пройдена: ${starsText(state.stars)}.`) : null,
      rulesOn ? el('p', { class: 'rewards__line' }, cleanTask()) : null,
      rival && raceActive(progress(), chapterId) && seen('race')
        ? el('p', { class: 'rewards__line' }, `Гонка: Артём везёт ${rival.parcel} — ${rivalProgress(progress(), info, rival) >= 1 ? 'уже доставил' : `проехал ${Math.floor(rivalProgress(progress(), info, rival) * 100)}% пути (🛵)`}. Итог — при доставке.`)
        : null,
      quest && sideStatus(progress(), chapterId) === 'taken'
        ? el('p', { class: 'rewards__line' }, `Поручение «${quest.title}»: оранжевая отметка «${quest.stops[Math.min(1, sideStep(progress(), chapterId))].label}».`)
        : null,
      quest && sideStatus(progress(), chapterId) === 'done' ? el('p', { class: 'rewards__line' }, `Поручение «${quest.title}» выполнено.`) : null,
      el(
        'p',
        { class: 'rewards__hint' },
        'Отметки на карте: жёлтая «?» и синяя «!» — новые точки; красная «!» — там были ошибки; зелёная «✓» — пройдена без ошибок, машина её проезжает (коснитесь её, чтобы пройти ещё раз).',
      ),
    ];
    let again = false;
    let takeSide = false;
    const canTake = !!quest && !state?.delivered && seen('beat1') && sideStatus(progress(), chapterId) === 'none';
    await paused(() =>
      showModal('Задание главы', el('div', { class: 'rewards' }, ...rows), [
        { label: 'Понятно', primary: true },
        ...(canTake ? [{ label: `Поручение: «${quest!.title}»`, onClick: () => (takeSide = true) }] : []),
        { label: 'Вступление ещё раз', onClick: () => (again = true) },
      ]),
    );
    if (takeSide) {
      sideDeclined = false;
      await offerSide();
    }
    if (again) await cutscene(story.intro);
  };

  const host: CityData['host'] = {
    showQuestion(question, _placement, template, series) {
      if (stopped) return;
      sheetMode = 'point';
      eventFoot.hidden = true;
      sheetTitle.textContent = series.caption ?? (series.total > 1 ? `${template.title} · вопрос ${series.index + 1} из ${series.total}` : template.title);
      sheetFoot.hidden = true;
      sheetBody.scrollTop = 0;
      sheetBody.replaceChildren(
        renderQuestionCard(question, (result) => {
          answered++;
          if (result.isCorrect) correct++;
          updateScore();
          const data = progress();
          const out = recordAnswer(data, question.id, result.isCorrect, Date.now());
          raceAnswer(data, chapterId, result.isCorrect);
          const stars = info ? refreshStars(data, info) : undefined;
          saveProgress();
          if (out.xp) pop(`+${out.xp} опыта`);
          if (out.review === 'added' || out.review === 'reset') pop('В работу над ошибками', 'bad');
          if (out.review === 'cleared') pop('Ошибка закреплена!');
          levelUpToast(out.levelUp ?? stars?.levelUp);
          goalToast(out, data);
          if (stars) showToast(`Новая звезда главы: ${starsText(stars.stars)}`);
          updateTask();

          const next = () => (scene?.hasNextInSeries ? 'Следующий вопрос' : undefined);
          if (result.isCorrect) {
            void scene?.answer(true).then(() => showGo(next() ?? 'Поехали'));
            return;
          }
          // Сначала — последствие в сцене, потом пояснение и правильный ответ.
          window.setTimeout(() => {
            if (stopped) return;
            closeSheet();
            void scene?.answer(false).then(() => {
              if (stopped) return;
              openSheet();
              showGo(next() ?? 'Понятно, едем дальше');
            });
          }, 900);
        }),
      );
      openSheet();
    },
    onOverviewChange(on) {
      overviewOn = on;
      updateDrive();
      mapButton.classList.toggle('is-active', on);
      mapButton.setAttribute('aria-pressed', String(on));
      hint.textContent = on ? 'Коснитесь места на карте, куда ехать.' : baseHint();
    },
    onSceneStart(minigame) {
      if (stopped) return;
      hint.textContent = minigame ? 'Коснитесь места, отмеченного жёлтым кругом.' : baseHint();
      hint.hidden = !minigame;
    },
    onPointDone(pointId) {
      const out = markPoint(progress(), chapterId, pointId);
      saveProgress();
      goalToast(out, progress());
      if (out.xp) pop(`+${out.xp} за точку`);
      levelUpToast(out.levelUp);
      hint.textContent = baseHint();
      updateTask();
      void advanceStory();
    },
    onGoal() {
      void onGoal();
    },
    onSide() {
      void onSide();
    },
    onEvent(kind) {
      onEvent(kind);
    },
    onViolation(v) {
      onViolation(v);
    },
    onHint(h) {
      if (!sheet.classList.contains('is-open')) showRuleHint(h);
      else ruleHint.hidden = true;
    },
  };

  function showGo(label: string) {
    go.textContent = label;
    sheetFoot.hidden = false;
    go.focus({ preventScroll: true });
  }

  const endEvent = () => {
    eventFoot.hidden = true;
    closeSheet();
    sheetMode = 'point';
    hint.textContent = baseHint();
    hint.hidden = false;
    scene?.endEvent();
  };
  skipEvent.addEventListener('click', endEvent);

  go.addEventListener('click', () => {
    if (sheetMode === 'event') {
      endEvent();
      return;
    }
    if (sheetMode === 'violation') {
      closeSheet();
      sheetMode = 'point';
      hint.textContent = baseHint();
      hint.hidden = false;
      scene?.endViolation();
      return;
    }
    closeSheet();
    hint.textContent = baseHint();
    // Следующий вопрос серии: подсказку не показываем, карточка скоро выедет снова.
    hint.hidden = !!scene?.hasNextInSeries;
    scene?.proceed();
  });

  const element = el(
    'div',
    { class: 'screen screen--city' },
    el(
      'header',
      { class: 'topbar topbar--city' },
      iconButton(ICONS.back, 'В меню', nav.onBack),
      title,
      score,
      mapButton,
      iconButton(ICONS.settings, 'Настройки', () => {
        settings.hidden = !settings.hidden;
      }),
    ),
    task,
    ruleHint,
    pops,
    settings,
    hint,
    drive,
    sheet,
  );
  element.classList.toggle('has-pedals', rulesOn);

  const unsubscribe = onSettingsChange((s) => {
    scene?.setControl(s.control);
    if (scene) scene.eventsEnabled = s.events;
    scene?.setDifficulty(s.difficulty);
    if (s.difficulty === 'expert') ruleHint.hidden = true;
    hint.textContent = baseHint();
  });

  void Promise.all([loadQuestions(), loadMapping()]).then(async ([questions, loaded]) => {
    if (stopped) return;
    mapping = loaded;
    questionsById = new Map(questions.map((q) => [q.id, q]));
    const chapter = mapping.chapters.find((c) => c.id === chapterId);
    title.textContent = chapter?.title ?? 'Город';
    info = chapterInfo(mapping, chapterId);
    const data: CityData = {
      host,
      questions,
      mapping,
      chapter: chapterId,
      control: getSettings().control,
      visited: [...chapterState(progress(), chapterId).points],
      isWrong: (id) => {
        const s = progress().questions[id];
        return !!s && !s.ok;
      },
      events: getSettings().events,
      rules: rulesOn,
      difficulty: getSettings().difficulty,
    };
    game.scene.sleep('street');
    const city = game.scene.getScene('city') as CityScene;
    // Сцена создаётся в следующем кадре: сюжет, которому нужна карта (флажок доставки), ждёт её.
    const created = new Promise<void>((resolve) => city.events.once('create', () => resolve()));
    game.scene.start('city', data);
    scene = city;
    updateTask();

    if (!story) return;
    if (chapterId === 'ch1' && !seen('prologue')) {
      if (!(await cutscene(PROLOGUE, 'Далее'))) return;
      see('prologue');
    }
    if (!seen('intro')) {
      if (!(await cutscene(story.intro))) return;
      see('intro');
    }
    if (!(await raceIntro())) return;
    await created;
    if (stopped) return;
    // Правила за рулём: один раз лейтенант Соколов рассказывает, что город теперь замечает нарушения.
    if (rulesOn && !progress().drive?.intro) {
      if (!(await cutscene(RULES_INTRO, 'Поехали'))) return;
      driveState(progress()).intro = Date.now();
      saveProgress();
    }
    // Артём ездит по району, пока не доставил свою посылку.
    if (rival && info && seen('race') && raceActive(progress(), chapterId) && rivalProgress(progress(), info, rival) < 1) scene.setRival(true);
    else rivalDone = true;
    showSideMarker();
    await advanceStory();
  });

  return {
    element,
    cleanup() {
      stopped = true;
      window.clearInterval(raceTimer);
      window.clearInterval(driveTimer);
      const px = scene?.takeClean() ?? 0;
      if (px > 0) addCleanDistance(progress(), chapterId, px);
      saveProgress();
      unsubscribe();
      if (game.scene.isActive('interior') || game.scene.isPaused('interior')) game.scene.stop('interior');
      if (game.scene.isActive('city') || game.scene.isPaused('city')) game.scene.stop('city');
      game.scene.wake('street');
    },
  };
}
