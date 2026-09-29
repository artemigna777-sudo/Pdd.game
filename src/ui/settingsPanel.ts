import { playSound, vibrateError } from '../audio/feedback.ts';
import { backupFileName, makeBackup, parseBackup, restoreBackup, type Backup } from '../backup.ts';
import { levelOf, sanitizeProgress } from '../progress/progress.ts';
import { getSettings, updateSettings, type ControlMode, type Theme } from '../settings.ts';
import type { Difficulty } from '../world/rules.ts';
import { load } from '../storage.ts';
import { playTutorial, showModal } from './cutscene.ts';
import { shareFile } from './share.ts';
import { el } from './dom.ts';

const OPTIONS: Array<{ mode: ControlMode; title: string; hint: string }> = [
  { mode: 'tap', title: 'Касание дороги', hint: 'Коснитесь места на дороге — машина сама проложит маршрут и поедет туда.' },
  { mode: 'joystick', title: 'Джойстик', hint: 'Прижмите палец к экрану и ведите в нужную сторону: машина едет по дороге и поворачивает на перекрёстках. Палец за оранжевым кольцом — «газ».' },
];

/**
 * Настройки: управление, звук и вибрация, вид (тема и шрифт), обучение. На полном экране
 * настроек (`full`) — ещё и резервная копия прогресса.
 */
export function settingsPanel(full = false): HTMLElement {
  const buttons = OPTIONS.map((o) =>
    el(
      'button',
      { class: 'choice', type: 'button', 'aria-pressed': String(getSettings().control === o.mode), onclick: () => select(o.mode) },
      el('span', { class: 'choice__title' }, o.title),
      el('span', { class: 'choice__hint' }, o.hint),
    ),
  );
  function select(mode: ControlMode) {
    updateSettings({ control: mode });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(OPTIONS[i].mode === mode)));
  }
  const toggle = (key: 'sound' | 'vibration' | 'bigText' | 'events', title: string, hint: string) => {
    const button = el(
      'button',
      { class: 'choice choice--toggle', type: 'button', 'aria-pressed': String(getSettings()[key]), onclick: () => flip() },
      el('span', { class: 'choice__title' }, title, el('span', { class: 'switch', 'aria-hidden': 'true' })),
      el('span', { class: 'choice__hint' }, hint),
    );
    const flip = () => {
      const on = !getSettings()[key];
      updateSettings({ [key]: on });
      button.setAttribute('aria-pressed', String(on));
      if (on && key === 'sound') playSound('correct');
      if (on && key === 'vibration') vibrateError();
    };
    return button;
  };
  const tutorial = el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void playTutorial() }, 'Показать обучение');
  return el(
    'section',
    { class: 'settings' },
    el('h2', { class: 'settings__title' }, 'Управление машиной'),
    el('div', { class: 'choices' }, ...buttons),
    el('h2', { class: 'settings__title settings__title--next' }, 'Город'),
    el(
      'div',
      { class: 'choices' },
      difficultyChoice(),
      toggle('events', 'События в пути', 'Иногда по дороге что-то случается: сзади скорая, на дорогу выкатился мяч, пошёл дождь. После события — вопрос по его теме.'),
    ),
    el('h2', { class: 'settings__title settings__title--next' }, 'Звук и вибрация'),
    el(
      'div',
      { class: 'choices' },
      toggle('sound', 'Звуки', 'Сигналы ответов, награды, экзамен, мотор и шум улицы в городе. На iPhone звука не будет, если включён беззвучный режим.'),
      toggle('vibration', 'Вибрация при ошибке', 'На Android — вибрация, на iPhone (iOS 18 и новее) — лёгкий отклик.'),
    ),
    el('h2', { class: 'settings__title settings__title--next' }, 'Вид'),
    el('div', { class: 'choices' }, themeChoice(), toggle('bigText', 'Крупный шрифт', 'Вопросы, варианты ответов, пояснения и реплики — крупнее.')),
    el('h2', { class: 'settings__title settings__title--next' }, 'Обучение'),
    tutorial,
    full ? backupSection() : null,
  );
}

const THEMES: Array<{ theme: Theme; title: string }> = [
  { theme: 'auto', title: 'Как в телефоне' },
  { theme: 'light', title: 'Светлая' },
  { theme: 'dark', title: 'Тёмная' },
];

const DIFFICULTIES: Array<{ difficulty: Difficulty; title: string }> = [
  { difficulty: 'novice', title: 'Новичок' },
  { difficulty: 'expert', title: 'Опытный' },
];

/** Правила за рулём: новичку — подсказки перед нарушением, опытному — без них. */
function difficultyChoice(): HTMLElement {
  const buttons = DIFFICULTIES.map((d) =>
    el('button', { class: 'segment__btn', type: 'button', 'aria-pressed': String(getSettings().difficulty === d.difficulty), onclick: () => select(d.difficulty) }, d.title),
  );
  function select(difficulty: Difficulty) {
    updateSettings({ difficulty });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(DIFFICULTIES[i].difficulty === difficulty)));
  }
  return el(
    'div',
    { class: 'choice' },
    el('span', { class: 'choice__title' }, 'Правила за рулём'),
    el('div', { class: 'segment', role: 'group', 'aria-label': 'Правила за рулём' }, ...buttons),
    el(
      'span',
      { class: 'choice__hint' },
      'Город замечает нарушения: красный, непропущенный пешеход, превышение скорости, разворот через сплошную, остановка там, где нельзя. Новичку — подсказка заранее, опытному — без подсказок (и стоять в запрещённом месте можно 3 секунды, а не 5).',
    ),
  );
}

/** Тема: три кнопки в ряд. */
function themeChoice(): HTMLElement {
  const buttons = THEMES.map((t) =>
    el('button', { class: 'segment__btn', type: 'button', 'aria-pressed': String(getSettings().theme === t.theme), onclick: () => select(t.theme) }, t.title),
  );
  function select(theme: Theme) {
    updateSettings({ theme });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(THEMES[i].theme === theme)));
  }
  return el('div', { class: 'choice' }, el('span', { class: 'choice__title' }, 'Тема'), el('div', { class: 'segment', role: 'group', 'aria-label': 'Тема' }, ...buttons));
}

/** Резервная копия прогресса: сохранить в файл и восстановить из файла. */
function backupSection(): HTMLElement {
  const input = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const status = el('p', { class: 'choice__hint', 'aria-live': 'polite' });
  const save = el(
    'button',
    {
      class: 'btn btn--secondary',
      type: 'button',
      onclick: async () => {
        const backup = makeBackup((key) => load<unknown>(key, null), Date.now());
        const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
        const result = await shareFile(blob, backupFileName(Date.now()), 'Курьер ПДД: прогресс');
        if (result !== 'cancelled') status.textContent = 'Файл готов. Сохраните его в надёжное место — например, в «Файлы» или себе в мессенджер.';
      },
    },
    'Сохранить прогресс в файл',
  );
  const restore = el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => input.click() }, 'Восстановить из файла');
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    let backup: Backup;
    try {
      backup = parseBackup(await file.text());
    } catch (e) {
      status.textContent = (e as Error).message;
      return;
    }
    const p = sanitizeProgress(backup.data['pdd-game:progress']);
    const answered = Object.keys(p.questions).length;
    const when = backup.savedAt ? new Date(backup.savedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'неизвестно когда';
    await showModal(
      'Восстановить прогресс?',
      el(
        'div',
        { class: 'rewards' },
        el('p', { class: 'rewards__line' }, `Копия от ${when}: уровень ${levelOf(p.xp).number}, отвечено вопросов — ${answered} из 800.`),
        el('p', { class: 'rewards__line' }, 'Текущий прогресс на этом телефоне заменится копией.'),
      ),
      [
        {
          label: 'Восстановить',
          primary: true,
          onClick: () => {
            const ok = restoreBackup(backup, (key, value) => {
              if (value === null) window.localStorage.removeItem(key);
              else window.localStorage.setItem(key, JSON.stringify(value));
            });
            if (ok) window.location.reload();
            else status.textContent = 'Не удалось записать данные: браузер не даёт сохранять (например, в приватном режиме).';
          },
        },
        { label: 'Отмена' },
      ],
    );
  });
  return el(
    'section',
    { class: 'backup' },
    el('h2', { class: 'settings__title settings__title--next' }, 'Резервная копия'),
    el(
      'p',
      { class: 'choice__hint' },
      'Прогресс хранится только в этом браузере. Сохраните его в файл, чтобы не потерять или перенести на другой телефон: на новом телефоне откройте игру и восстановите прогресс из файла.',
    ),
    el('div', { class: 'choices' }, save, restore),
    input,
    status,
  );
}

export function controlHint(mode: ControlMode): string {
  return mode === 'tap'
    ? 'Коснитесь дороги — машина поедет туда. Жёлтые круги с «?» — вопросы.'
    : 'Ведите пальцем в нужную сторону — машина поедет, за оранжевым кольцом — быстрее. Жёлтые круги с «?» — вопросы.';
}
