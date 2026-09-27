/**
 * Экран города: интерфейс поверх Phaser-сцены CityScene.
 * Сверху — панель (назад, район, счёт, карта, настройки), снизу — подсказка и выезжающая
 * карточка вопроса. Касания мимо кнопок проходят в игру.
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

const CHAPTER = 'test';

function iconButton(icon: string, label: string, onclick: () => void): HTMLButtonElement {
  const b = el('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': label, onclick });
  b.innerHTML = icon;
  return b;
}

export function cityScreen(game: Phaser.Game, onBack: () => void): CityScreen {
  let scene: CityScene | undefined;
  let answered = 0;
  let correct = 0;
  let stopped = false;

  const score = el('span', { class: 'topbar__score', 'aria-label': 'Правильных ответов' });
  const title = el('h1', { class: 'topbar__title', tabindex: -1, 'data-focus': true }, 'Загрузка…');
  const hint = el('p', { class: 'city-hint' }, controlHint(getSettings().control));
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
    showQuestion(question, _placement, template) {
      if (stopped) return;
      sheetTitle.textContent = template.title;
      sheetFoot.hidden = true;
      sheetBody.scrollTop = 0;
      sheetBody.replaceChildren(
        renderQuestionCard(question, (result) => {
          answered++;
          if (result.isCorrect) correct++;
          updateScore();
          if (result.isCorrect) {
            void scene?.answer(true).then(() => showGo('Поехали'));
            return;
          }
          // Сначала — последствие в сцене, потом пояснение и правильный ответ.
          window.setTimeout(() => {
            if (stopped) return;
            closeSheet();
            void scene?.answer(false).then(() => {
              if (stopped) return;
              openSheet();
              showGo('Понятно, едем дальше');
            });
          }, 900);
        }),
      );
      openSheet();
    },
    onOverviewChange(on) {
      mapButton.classList.toggle('is-active', on);
      mapButton.setAttribute('aria-pressed', String(on));
      hint.textContent = on ? 'Коснитесь места на карте, куда ехать.' : controlHint(getSettings().control);
    },
  };

  function showGo(label: string) {
    go.textContent = label;
    sheetFoot.hidden = false;
    go.focus({ preventScroll: true });
  }

  go.addEventListener('click', () => {
    closeSheet();
    hint.hidden = false;
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
    hint.textContent = controlHint(s.control);
  });

  void Promise.all([loadQuestions(), loadMapping()]).then(([questions, mapping]) => {
    if (stopped) return;
    const chapter = mapping.chapters.find((c) => c.id === CHAPTER);
    title.textContent = chapter?.title ?? 'Город';
    const data: CityData = { host, questions, mapping, chapter: CHAPTER, control: getSettings().control };
    game.scene.sleep('street');
    game.scene.start('city', data);
    scene = game.scene.getScene('city') as CityScene;
  });

  return {
    element,
    cleanup() {
      stopped = true;
      unsubscribe();
      if (game.scene.isActive('city') || game.scene.isPaused('city')) game.scene.stop('city');
      game.scene.wake('street');
    },
  };
}
