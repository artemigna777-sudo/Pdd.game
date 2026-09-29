/**
 * Сюжетные сцены поверх игры: реплики персонажей по одной, с аватаркой и именем.
 * «Далее» — следующая реплика, «Пропустить» — сразу к концу. Закрывается при смене экрана.
 */
import { CHARACTERS, type Line } from '../story/story.ts';
import { el } from './dom.ts';

let current: HTMLElement | undefined;

/**
 * Закрыть открытую сцену или окно при уходе с экрана. Промис сцены при этом не выполняется:
 * то, что ждало конца сцены, относится к закрытому экрану и продолжаться не должно.
 */
export function closeOverlay(): void {
  current?.remove();
  current = undefined;
}

function mount(root: HTMLElement) {
  closeOverlay();
  current = root;
  document.body.append(root);
  root.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
}

function unmount(root: HTMLElement) {
  if (current === root) current = undefined;
  root.remove();
}

/**
 * Показать реплики по одной. Промис выполняется, когда сцена закончилась или пропущена, и
 * возвращает выбор игрока, если в сцене был выбор (реплика с вариантами ответа).
 */
export function playCutscene(source: readonly Line[], opts: { last?: string } = {}): Promise<string | undefined> {
  if (!source.length) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const lines = [...source];
    let index = 0;
    let chosen: string | undefined;
    const avatar = el('span', { class: 'avatar', 'aria-hidden': 'true' });
    const name = el('span', { class: 'cutscene__name' });
    const role = el('span', { class: 'cutscene__role' });
    const who = el('div', { class: 'cutscene__who' }, avatar, el('span', { class: 'cutscene__names' }, name, role));
    const count = el('span', { class: 'cutscene__count' });
    const textEl = el('p', { class: 'cutscene__text', 'aria-live': 'polite' });
    const next = el('button', { class: 'btn btn--primary', type: 'button', 'data-focus': true });
    const skip = el('button', { class: 'btn btn--quiet', type: 'button' }, 'Пропустить');
    const actions = el('div', { class: 'cutscene__actions' }, skip, next);
    const choices = el('div', { class: 'cutscene__choices', role: 'group', 'aria-label': 'Ваш ответ', hidden: true });
    const card = el('div', { class: 'cutscene__card' }, el('div', { class: 'cutscene__head' }, who, count), textEl, actions, choices);
    const root = el('div', { class: 'cutscene', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Сюжет' }, card);

    const finish = () => {
      unmount(root);
      resolve(chosen);
    };
    const advance = () => {
      if (index < lines.length - 1) {
        index++;
        show();
      } else finish();
    };
    const show = () => {
      const line = lines[index];
      const narrator = line.who === 'narrator';
      const c = narrator ? undefined : CHARACTERS[line.who as keyof typeof CHARACTERS];
      who.hidden = narrator;
      if (c) {
        avatar.textContent = c.initials;
        avatar.style.background = c.color;
        name.textContent = c.name;
        role.textContent = c.role;
      }
      textEl.classList.toggle('is-narrator', narrator);
      textEl.textContent = line.text;
      count.textContent = lines.length > 1 ? `${index + 1}/${lines.length}` : '';
      const last = index === lines.length - 1;
      next.textContent = last ? (opts.last ?? 'Поехали') : 'Далее';
      skip.hidden = last;
      // Выбор: вместо «Далее» — варианты ответа; пропустить выбор нельзя.
      const options = line.choices ?? [];
      actions.hidden = options.length > 0;
      choices.hidden = options.length === 0;
      choices.replaceChildren(
        ...options.map((o, i) =>
          el(
            'button',
            {
              class: `btn ${i === 0 ? 'btn--primary' : 'btn--secondary'}`,
              type: 'button',
              onclick: () => {
                chosen = o.value;
                lines.splice(index + 1, 0, ...(o.reply ?? []));
                advance();
              },
            },
            o.label,
          ),
        ),
      );
      card.classList.remove('is-in');
      void card.offsetWidth;
      card.classList.add('is-in');
      if (options.length) choices.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    };
    next.addEventListener('click', advance);
    // «Пропустить» — к ближайшему выбору (его пропустить нельзя) или к концу сцены.
    skip.addEventListener('click', () => {
      const stop = lines.findIndex((l, i) => i > index && l.choices?.length);
      if (stop < 0) return finish();
      index = stop;
      show();
    });
    // Касание текста — тоже «Далее»: читать и листать одним пальцем.
    textEl.addEventListener('click', () => {
      if (actions.hidden) return;
      next.click();
    });
    show();
    mount(root);
  });
}

export interface ModalAction {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

/** Окно поверх игры (награды главы и т. п.). Промис выполняется после нажатия любой кнопки. */
export function showModal(title: string, body: HTMLElement, actions: ModalAction[]): Promise<void> {
  return new Promise((resolve) => {
    const root = el('div', { class: 'cutscene cutscene--modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const buttons = actions.map((a, i) =>
      el(
        'button',
        {
          class: `btn ${a.primary ? 'btn--primary btn--lg' : 'btn--secondary'}`,
          type: 'button',
          'data-focus': i === 0,
          onclick: () => {
            unmount(root);
            resolve();
            a.onClick?.();
          },
        },
        a.label,
      ),
    );
    root.append(el('div', { class: 'modal' }, el('h2', { class: 'modal__title' }, title), body, el('div', { class: 'modal__actions' }, ...buttons)));
    mount(root);
  });
}

export interface Slide {
  icon: string;
  title: string;
  text: string;
}

/** Обучение при первом запуске: несколько коротких слайдов. */
export const TUTORIAL: Slide[] = [
  {
    icon: '📦',
    title: 'Курьер ПДД',
    text: 'Все 800 вопросов экзамена ПДД (категории A, B, M) — в игре про курьера в городе Светофорске. Вопросы, картинки и ответы — из официальных билетов.',
  },
  {
    icon: '🚗',
    title: 'Езди по городу',
    text: 'Коснись дороги — машина поедет туда (или включи джойстик в настройках). На красный и перед пешеходами — педаль «Тормоз»: город замечает нарушения. У жёлтых «?» и синих «!» точек ждут вопросы. Чтобы пройти главу, нужно проехать все точки и набрать от 80% верных ответов.',
  },
  {
    icon: '🔁',
    title: 'Ошибки не страшны',
    text: 'Каждая ошибка вернётся на повтор через 1 день, потом через 3 и через 7 дней — пока не запомнится. Повторы ждут в «Разборе ошибок» в меню.',
  },
  {
    icon: '🏁',
    title: 'Финал — экзамен',
    text: 'Пройди 10 глав, закрепи все ошибки — и сдай экзамен-босса: 20 вопросов за 20 минут, как в ГИБДД. Тренировочный экзамен есть в меню всегда.',
  },
];

/** Показать обучение. Промис выполняется, когда слайды пролистаны или пропущены. */
export function playTutorial(slides: readonly Slide[] = TUTORIAL): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    const icon = el('span', { class: 'tutorial__icon', 'aria-hidden': 'true' });
    const title = el('h2', { class: 'tutorial__title' });
    const text = el('p', { class: 'tutorial__text' });
    const dots = el('div', { class: 'tutorial__dots', 'aria-hidden': 'true' }, ...slides.map(() => el('span', { class: 'tutorial__dot' })));
    const next = el('button', { class: 'btn btn--primary', type: 'button', 'data-focus': true });
    const skip = el('button', { class: 'btn btn--quiet', type: 'button' }, 'Пропустить');
    const card = el('div', { class: 'cutscene__card tutorial' }, icon, title, text, dots, el('div', { class: 'cutscene__actions' }, skip, next));
    const root = el('div', { class: 'cutscene cutscene--modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Обучение' }, card);
    const finish = () => {
      unmount(root);
      resolve();
    };
    const show = () => {
      const slide = slides[index];
      icon.textContent = slide.icon;
      title.textContent = slide.title;
      text.textContent = slide.text;
      [...dots.children].forEach((d, i) => d.classList.toggle('is-active', i === index));
      const last = index === slides.length - 1;
      next.textContent = last ? 'Начать' : 'Далее';
      skip.hidden = last;
      card.classList.remove('is-in');
      void card.offsetWidth;
      card.classList.add('is-in');
    };
    next.addEventListener('click', () => {
      if (index < slides.length - 1) {
        index++;
        show();
      } else finish();
    });
    skip.addEventListener('click', finish);
    show();
    mount(root);
  });
}
