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
import type { CityData, CityScene } from '../game/city/CityScene.ts';
import {
  canDeliver,
  chapterResult,
  chapterState,
  deliver,
  levelOf,
  markPoint,
  markSeen,
  percent,
  progress,
  recordAnswer,
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
import { plural } from './format.ts';
import { ICONS } from './icons.ts';
import { levelMeter, starsText } from './progressView.ts';
import { renderQuestionCard } from './questionCard.ts';
import { controlHint, settingsPanel } from './settingsPanel.ts';
import { showToast } from './toast.ts';

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
  const sheetFoot = el('footer', { class: 'sheet__foot', hidden: true }, go);
  const sheet = el('section', { class: 'sheet', 'aria-label': 'Вопрос', 'aria-hidden': 'true' }, sheetTitle, sheetBody, sheetFoot);
  const settings = el('div', { class: 'popover', hidden: true }, settingsPanel());
  const mapButton = iconButton(ICONS.map, 'Карта района', () => {
    if (!scene) return;
    scene.toggleOverview();
  });

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
    const parts = [`Точки ${r.pointsDone} из ${r.points}`, `верных ${percent(r.share)}%`];
    if (r.pointsWithMistakes.length) parts.push(`с ошибками: ${r.pointsWithMistakes.length}`);
    taskMeta.textContent = parts.join(' · ');
    task.classList.toggle('is-goal', goalShown);
  };

  const openSheet = () => {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    hint.hidden = true;
    // После анимации — сдвинуть камеру, чтобы сцена была видна над карточкой.
    window.setTimeout(() => {
      if (stopped || !scene) return;
      const top = sheet.getBoundingClientRect().top;
      scene.focusVisible(Math.max(0.2, top / window.innerHeight));
    }, 320);
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
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
  const cutscene = (lines: Line[], last?: string) => paused(() => playCutscene(lines, { last }));

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

  /** Посылка доставлена: финал главы, награды, следующая глава. */
  const onGoal = async () => {
    if (!info || !story || !mapping) return;
    if (!(await cutscene(story.finale, 'Награда'))) return;
    const out = deliver(progress(), info, Date.now());
    saveProgress();
    goalShown = false;
    scene?.removeGoal();
    hint.textContent = baseHint();
    updateTask();
    await paused(() => rewards(out));
  };

  const rewards = (out: DeliveryOutcome) => {
    const chapters = mapping!.chapters;
    const i = chapters.findIndex((c) => c.id === chapterId);
    const next = chapters[i + 1];
    const r = chapterResult(progress(), info!);
    const level = levelOf(progress().xp);
    const lines = [
      el('p', { class: 'rewards__stars', 'aria-label': `Звёзд: ${out.stars} из 3` }, starsText(out.stars)),
      el('p', { class: 'rewards__line' }, `Верных ответов в главе: ${percent(r.share)}%`),
      out.xp ? el('p', { class: 'rewards__line rewards__xp' }, `+${out.xp} опыта`) : null,
      levelMeter(level, progress().xp),
      el('p', { class: 'rewards__next' }, next ? `Открыта глава ${next.number}: «${next.title}»` : 'Открыт финал: подготовка к экзамену в ГИБДД'),
    ];
    const body = el('div', { class: 'rewards' }, ...lines);
    const hintStars = out.stars < 3 ? el('p', { class: 'rewards__hint' }, 'Звёзд станет больше, если исправить ошибки главы: 90% — две звезды, 100% — три.') : null;
    if (hintStars) body.append(hintStars);
    playSound('pass');
    levelUpToast(out.levelUp, false);
    return showModal(`Глава ${chapters[i].number} пройдена!`, body, [
      next ? { label: `Глава ${next.number}`, primary: true, onClick: () => nav.openChapter(next.id) } : { label: 'К финалу', primary: true, onClick: () => nav.openFinale() },
      { label: 'Остаться в районе' },
    ]);
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
      el(
        'p',
        { class: 'rewards__hint' },
        'Отметки на карте: жёлтая «?» и синяя «!» — новые точки; красная «!» — там были ошибки; зелёная «✓» — пройдена без ошибок, машина её проезжает (коснитесь её, чтобы пройти ещё раз).',
      ),
    ];
    let again = false;
    await paused(() =>
      showModal('Задание главы', el('div', { class: 'rewards' }, ...rows), [
        { label: 'Понятно', primary: true },
        { label: 'Вступление ещё раз', onClick: () => (again = true) },
      ]),
    );
    if (again) await cutscene(story.intro);
  };

  const host: CityData['host'] = {
    showQuestion(question, _placement, template, series) {
      if (stopped) return;
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
          const stars = info ? refreshStars(data, info) : undefined;
          saveProgress();
          if (out.xp) pop(`+${out.xp} опыта`);
          if (out.review === 'added' || out.review === 'reset') pop('В работу над ошибками', 'bad');
          if (out.review === 'cleared') pop('Ошибка закреплена!');
          levelUpToast(out.levelUp ?? stars?.levelUp);
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
      if (out.xp) pop(`+${out.xp} за точку`);
      levelUpToast(out.levelUp);
      hint.textContent = baseHint();
      updateTask();
      void advanceStory();
    },
    onGoal() {
      void onGoal();
    },
  };

  function showGo(label: string) {
    go.textContent = label;
    sheetFoot.hidden = false;
    go.focus({ preventScroll: true });
  }

  go.addEventListener('click', () => {
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
    pops,
    settings,
    hint,
    sheet,
  );

  const unsubscribe = onSettingsChange((s) => {
    scene?.setControl(s.control);
    hint.textContent = baseHint();
  });

  void Promise.all([loadQuestions(), loadMapping()]).then(async ([questions, loaded]) => {
    if (stopped) return;
    mapping = loaded;
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
    await created;
    if (!stopped) await advanceStory();
  });

  return {
    element,
    cleanup() {
      stopped = true;
      unsubscribe();
      if (game.scene.isActive('interior') || game.scene.isPaused('interior')) game.scene.stop('interior');
      if (game.scene.isActive('city') || game.scene.isPaused('city')) game.scene.stop('city');
      game.scene.wake('street');
    },
  };
}
