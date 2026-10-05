/**
 * «Один день Соколова» (этап 12): экран смены поверх Phaser-сцены PatrolScene. Сверху — время
 * смены, счёт и радар, снизу — подсказка и выезжающая карточка вопроса пойманному нарушителю.
 */
import type * as Phaser from 'phaser';
import { playSound, vibrateError } from '../audio/feedback.ts';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import type { PatrolData, PatrolScene } from '../game/patrol/PatrolScene.ts';
import { recordPatrol, type PatrolResult } from '../progress/modes.ts';
import { progress, recordAnswer, saveProgress } from '../progress/progress.ts';
import { getSettings } from '../settings.ts';
import { PATROL_INTRO } from '../story/extras.ts';
import { pickQuestion } from '../world/events.ts';
import { SHIFT_SECONDS, type Suspect } from '../world/patrol.ts';
import { RULES, questionsFor } from '../world/rules.ts';
import { levelUpToast } from './cityScreen.ts';
import { avatar, playCutscene, showModal } from './cutscene.ts';
import { goalToast } from './dailyView.ts';
import { el } from './dom.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard } from './questionCard.ts';

export interface PatrolNav {
  onBack(): void;
  /** Ещё одна смена в том же районе. */
  again(): void;
}

export interface PatrolScreenHandle {
  element: HTMLElement;
  cleanup: () => void;
}

/** Что сказал Соколов, когда нарушителя поймали. */
function caughtLine(s: Suspect): string {
  const v = s.violation!;
  if (v.kind === 'speeding') return `Радар показал ${v.kmh} км/ч, а здесь можно ${v.limit}. Нарушитель у обочины. А вы правило помните?`;
  if (v.kind === 'red-light') return 'Проехал на красный — остановили. А вы помните, что говорят правила о сигналах светофора?';
  return 'Встал под знаком «Остановка запрещена» — остановили. Проверим, знаете ли вы это правило.';
}

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function patrolScreen(game: Phaser.Game, chapterId: string, nav: PatrolNav): PatrolScreenHandle {
  let scene: PatrolScene | undefined;
  let stopped = false;
  let started = false;
  let ended = false;
  let questions = new Map<string, Question>();
  const recent: string[] = [];
  const result: PatrolResult = { caught: 0, missed: 0, wrong: 0, answers: 0, correct: 0 };
  const total = SHIFT_SECONDS * (getSettings().shiftScale ?? 1);
  let left = total;
  let lastTick = 0;

  const timer = el('span', { class: 'topbar__score patrol-timer', role: 'timer', 'aria-label': 'Время смены' }, time(left));
  const stat = (icon: string, label: string) => {
    const value = el('span', { class: 'patrol-stat__value' }, '0');
    return { node: el('span', { class: 'patrol-stat', 'aria-label': label }, el('span', { 'aria-hidden': 'true' }, icon), value), value };
  };
  const caught = stat('🚓', 'Поймано');
  const missed = stat('💨', 'Упущено');
  const wrong = stat('✕', 'Ошибочных остановок');
  const radar = el('span', { class: 'patrol-radar', 'aria-label': 'Радар' }, '📡 —');
  const pops = el('div', { class: 'xp-pops', 'aria-live': 'polite' });
  const hint = el('p', { class: 'city-hint patrol-hint' }, 'Коснитесь нарушителя: едет на красный, быстрее 80 км/ч или стоит под знаком «Остановка запрещена»');
  const sheetTitle = el('p', { class: 'sheet__title' });
  const sheetBody = el('div', { class: 'sheet__body' });
  const back = el('button', { class: 'btn btn--primary btn--lg', type: 'button' }, 'На пост');
  const sheetFoot = el('footer', { class: 'sheet__foot', hidden: true }, back);
  const sheet = el('section', { class: 'sheet', 'aria-label': 'Вопрос', 'aria-hidden': 'true' }, sheetTitle, sheetBody, sheetFoot);

  const pop = (text: string, tone: 'xp' | 'bad' = 'xp') => {
    const item = el('span', { class: `xp-pop xp-pop--${tone}` }, text);
    pops.append(item);
    window.setTimeout(() => item.remove(), 1800);
  };
  const update = () => {
    caught.value.textContent = String(result.caught);
    missed.value.textContent = String(result.missed);
    wrong.value.textContent = String(result.wrong);
    timer.textContent = time(Math.max(0, left));
    timer.classList.toggle('is-low', left <= 10);
  };

  const pauseScene = () => {
    if (game.scene.isActive('patrol')) game.scene.pause('patrol');
  };
  const resumeScene = () => {
    if (!stopped && !ended && game.scene.isPaused('patrol')) game.scene.resume('patrol');
  };
  const sheetOpen = () => sheet.classList.contains('is-open');
  const openSheet = () => {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    hint.hidden = true;
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    hint.hidden = false;
  };

  /** Пойман нарушитель: вопрос из базы про это правило. */
  const onCatch = (s: Suspect) => {
    if (ended) return;
    result.caught++;
    update();
    playSound('reward');
    pop('Поймал! +100');
    pauseScene();
    const v = s.violation!;
    const id = pickQuestion(questionsFor(v), (qid) => progress().questions[qid], Math.random, recent);
    const question = questions.get(id);
    if (!question) {
      scene?.release(s);
      resumeScene();
      return;
    }
    recent.unshift(id);
    recent.length = Math.min(recent.length, 4);
    sheetTitle.textContent = `Поймал! ${RULES[v.kind].title}`;
    sheetFoot.hidden = true;
    sheetBody.scrollTop = 0;
    sheetBody.replaceChildren(
      el('p', { class: 'event-intro violation-intro' }, avatar('sokolov', 'avatar--small'), el('span', {}, `Лейтенант Соколов: «${caughtLine(s)}»`)),
      renderQuestionCard(question, (r) => {
        result.answers++;
        if (r.isCorrect) {
          result.correct++;
          pop('Верно! +50');
        }
        const data = progress();
        const out = recordAnswer(data, question.id, r.isCorrect, Date.now());
        saveProgress();
        if (out.review === 'added' || out.review === 'reset') pop('В работу над ошибками', 'bad');
        levelUpToast(out.levelUp);
        goalToast(out, data);
        sheetFoot.hidden = false;
        back.onclick = () => {
          closeSheet();
          scene?.release(s);
          if (left <= 0) finish();
          else resumeScene();
        };
      }),
    );
    openSheet();
  };

  const host: PatrolData['host'] = {
    onCatch,
    onInnocent: () => {
      if (ended) return;
      result.wrong++;
      update();
      vibrateError();
      playSound('wrong');
      pop('Водитель ничего не нарушил: −50', 'bad');
    },
    onMiss: (s) => {
      if (ended) return;
      result.missed++;
      update();
      pop(`Упущен: ${RULES[s.violation!.kind].title.toLowerCase()}`, 'bad');
    },
    onRadar: (r) => {
      radar.textContent = r ? `📡 ${r.kmh} км/ч` : '📡 —';
      radar.classList.toggle('is-over', !!r && r.kmh >= r.limit + 20);
    },
  };

  /** Конец смены: итог, рекорд. */
  const finish = () => {
    if (ended || stopped) return;
    ended = true;
    pauseScene();
    const data = progress();
    const rec = recordPatrol(data, result);
    saveProgress();
    playSound(rec.record ? 'pass' : 'reward');
    const line = (label: string, value: string) => el('p', { class: 'rewards__line patrol-result__line' }, el('span', {}, label), el('b', {}, value));
    void showModal(
      rec.record ? 'Новый рекорд смены! 🏆' : 'Смена окончена',
      el(
        'div',
        { class: 'patrol-result' },
        el('p', { class: 'patrol-result__score' }, String(rec.score), el('span', {}, 'очков')),
        line('🚓 Поймано нарушителей', String(result.caught)),
        line('💨 Упущено', String(result.missed)),
        line('✕ Ошибочных остановок', String(result.wrong)),
        line('✅ Верных ответов', `${result.correct} из ${result.answers}`),
        el('p', { class: 'rewards__line' }, `Рекорд: ${rec.best}. Смен на посту: ${data.modes?.patrol?.shifts ?? 1}.`),
        el('p', { class: 'event-intro' }, avatar('sokolov', 'avatar--small'), el('span', {}, result.caught > result.missed + result.wrong ? 'Соколов: «Глаз намётан. Из вас вышел бы отличный инспектор!»' : 'Соколов: «Нарушителя видно по светофору, радару и знакам. В следующую смену — внимательнее».')),
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
    void showModal('Закончить смену?', el('p', { class: 'rewards__line' }, 'Смена не будет засчитана.'), [
      { label: 'Продолжить', primary: true, onClick: () => (sheetOpen() ? undefined : resumeScene()) },
      { label: 'Закончить', onClick: nav.onBack },
    ]);
  };
  const backButton = el('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': 'Назад', onclick: leave });
  backButton.innerHTML = ICONS.back;

  const element = el(
    'div',
    { class: 'screen screen--city screen--patrol' },
    el('header', { class: 'topbar topbar--city' }, backButton, el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, 'Пост ДПС'), timer),
    el('div', { class: 'patrol-hud' }, caught.node, missed.node, wrong.node, radar),
    pops,
    hint,
    sheet,
  );

  // Время смены идёт, только пока перекрёсток на экране (не во время вопроса и окон).
  const ticker = window.setInterval(() => {
    const now = performance.now();
    const dt = lastTick ? (now - lastTick) / 1000 : 0;
    lastTick = now;
    if (!started || ended || stopped || sheetOpen() || !game.scene.isActive('patrol')) return;
    const before = Math.ceil(left);
    left -= dt;
    if (left <= 10 && Math.ceil(left) < before && left > 0) playSound('tick');
    update();
    if (left <= 0) finish();
  }, 200);

  void Promise.all([loadQuestions(), loadMapping()]).then(async ([all, mapping]) => {
    if (stopped) return;
    questions = new Map(all.map((q) => [q.id, q]));
    const chapter = mapping.chapters.find((c) => c.id === chapterId) ?? mapping.chapters[0];
    const data: PatrolData = { host, map: chapter.map, points: chapter.points };
    game.scene.sleep('street');
    const patrol = game.scene.getScene('patrol') as PatrolScene;
    const created = new Promise<void>((resolve) => patrol.events.once('create', () => resolve()));
    game.scene.start('patrol', data);
    scene = patrol;
    await created;
    if (stopped) return;
    // Перед первой сменой — Соколов объясняет, что делать.
    if (!progress().modes?.patrol) {
      pauseScene();
      await playCutscene(PATROL_INTRO, { last: 'Заступить на смену' });
      if (stopped) return;
      resumeScene();
    }
    started = true;
    playSound('start');
  });

  return {
    element,
    cleanup() {
      stopped = true;
      window.clearInterval(ticker);
      if (game.scene.isActive('patrol') || game.scene.isPaused('patrol')) game.scene.stop('patrol');
      game.scene.wake('street');
    },
  };
}
