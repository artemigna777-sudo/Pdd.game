/**
 * Экран города: интерфейс поверх Phaser-сцены CityScene (район одной главы).
 * Сверху — панель (назад, глава, счёт, карта, настройки), снизу — подсказка и выезжающая
 * карточка вопроса. В точке интереса может быть серия вопросов — они идут один за другим.
 * Касания мимо кнопок проходят в игру.
 */
import type * as Phaser from 'phaser';
import { loadMapping, loadQuestions } from '../data/questions.ts';
import type { CityData, CityScene } from '../game/city/CityScene.ts';
import { getSettings, onSettingsChange } from '../settings.ts';
import { el } from './dom.ts';
import { ICONS } from './icons.ts';
import { renderQuestionCard } from './questionCard.ts';
import { controlHint, settingsPanel } from './settingsPanel.ts';

export interface CityScreen {
  element: HTMLElement;
  cleanup: () => void;
}

function iconButton(icon: string, label: string, onclick: () => void): HTMLButtonElement {
  const b = el('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': label, onclick });
  b.innerHTML = icon;
  return b;
}

export function cityScreen(game: Phaser.Game, chapterId: string, onBack: () => void): CityScreen {
  let scene: CityScene | undefined;
  let answered = 0;
  let correct = 0;
  let stopped = false;
  let pointsDone = 0;
  let pointsTotal = 0;

  const score = el('span', { class: 'topbar__score', 'aria-label': 'Правильных ответов' });
  const title = el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, 'Загрузка…');
  const hint = el('p', { class: 'city-hint' });
  const baseHint = () => {
    const progress = pointsDone ? ` Пройдено точек: ${pointsDone} из ${pointsTotal}.` : '';
    return controlHint(getSettings().control) + progress;
  };
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
    onPointDone(done, total) {
      pointsDone = done;
      pointsTotal = total;
      hint.textContent = baseHint();
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
      iconButton(ICONS.back, 'В меню', onBack),
      title,
      score,
      mapButton,
      iconButton(ICONS.settings, 'Настройки', () => {
        settings.hidden = !settings.hidden;
      }),
    ),
    settings,
    hint,
    sheet,
  );

  const unsubscribe = onSettingsChange((s) => {
    scene?.setControl(s.control);
    hint.textContent = baseHint();
  });

  void Promise.all([loadQuestions(), loadMapping()]).then(([questions, mapping]) => {
    if (stopped) return;
    const chapter = mapping.chapters.find((c) => c.id === chapterId);
    title.textContent = chapter?.title ?? 'Город';
    pointsTotal = chapter?.points.length ?? 0;
    const data: CityData = { host, questions, mapping, chapter: chapterId, control: getSettings().control };
    game.scene.sleep('street');
    game.scene.start('city', data);
    scene = game.scene.getScene('city') as CityScene;
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
