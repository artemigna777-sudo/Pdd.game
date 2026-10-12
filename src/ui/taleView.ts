/**
 * Дополнительные сюжеты (этап 17): список с покупкой и прохождение — сцены с выбором,
 * испытания (ситуации этапа 15 и повторы своих ошибок из билетов), концовка.
 */
import { playSound } from '../audio/feedback.ts';
import type { Question } from '../data/types.ts';
import { progress, saveProgress, type ProgressData } from '../progress/progress.ts';
import { shopPrice } from '../progress/storyProgress.ts';
import { TALE_XP, buyTale, ownsTale, taleStateOf } from '../progress/taleProgress.ts';
import { emptySituations, isKnown, optionOrder, readMs, recordSituation } from '../situations/run.ts';
import type { Situation } from '../situations/types.ts';
import { decisionLines, resolveLines } from '../story/plot.ts';
import { TALES } from '../story/taleData.ts';
import { finishTale, pickTrial, restartTale, taleContext, taleDecide, taleScore, type Tale, type TrialItem } from '../story/tales.ts';
import { avatar, playCutscene, showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { renderQuestionCard } from './questionCard.ts';
import { situationCard, type SituationCard } from './situationsView.ts';
import { showToast } from './toast.ts';

/** Секунд на ситуацию в сюжете: как на первой ступени «Ситуаций». */
const TALE_LIMIT = 10;

/** Карточки дополнительных сюжетов: купить или играть. */
export function talesList(data: ProgressData, open: (id: string) => void, onChange: () => void): HTMLElement {
  const root = el('div', { class: 'tales' });
  const render = () => {
    root.replaceChildren(
      ...TALES.map((t) => {
        const owned = ownsTale(data, t.id);
        const state = data.tales?.[t.id];
        const got = Object.keys(state?.endings ?? {}).length;
        const price = shopPrice(data, t.price);
        const action = owned
          ? el('button', { class: 'btn btn--primary', type: 'button', onclick: () => open(t.id) }, state && state.step > 0 && state.step < t.steps.length ? 'Продолжить' : state?.runs ? 'Играть снова' : 'Играть')
          : el(
              'button',
              {
                class: 'btn btn--secondary',
                type: 'button',
                onclick: () =>
                  void showModal(`${t.icon} ${t.title}`, el('p', {}, `${t.about} Около ${t.minutes} минут, ${t.endings.length} концовки. Купить за 🪙 ${price}?`), [
                    {
                      label: `Купить за 🪙 ${price}`,
                      primary: true,
                      onClick: () => {
                        const r = buyTale(data, t.id);
                        if (r === 'no-coins') return showToast(`Не хватает монет: нужно ${price}, есть ${data.coins}. Монеты — за верные ответы и цель дня.`);
                        playSound('reward');
                        onChange();
                        render();
                        showToast(`${t.icon} «${t.title}» — твой. Можно начинать!`);
                      },
                    },
                    { label: 'Отмена' },
                  ]),
              },
              `Купить · 🪙 ${price}`,
            );
        return el(
          'article',
          { class: `tale-card${owned ? ' is-owned' : ''}`, 'data-tale': t.id },
          el('div', { class: 'tale-card__head' }, avatar(t.hero as never, 'avatar--small'), el('div', {}, el('h3', { class: 'tale-card__title' }, `${t.icon} ${t.title}`), el('p', { class: 'tale-card__meta' }, `≈ ${t.minutes} мин · концовок ${got} из ${t.endings.length}`))),
          el('p', { class: 'tale-card__about' }, t.about),
          action,
        );
      }),
    );
  };
  render();
  return root;
}

export interface TaleRunDeps {
  body: HTMLElement;
  scroller: HTMLElement;
  status: HTMLElement;
  bar: HTMLElement;
  /** Экран ещё открыт? */
  alive: () => boolean;
  /** Ответ на вопрос из билетов: прогресс, повторы, сообщения. Возвращает подсказку о повторе. */
  answerQuestion: (q: Question, correct: boolean) => string;
  done: () => void;
}

/** Пройти сюжет с того шага, где остановились. */
export function runTale(tale: Tale, situations: readonly Situation[], questions: readonly Question[], deps: TaleRunDeps): { stop: () => void } {
  const { body, scroller, status, bar } = deps;
  const data = progress();
  const state = taleStateOf(data, tale.id);
  const sitById = new Map(situations.map((x) => [x.id, x]));
  const qById = new Map(questions.map((q) => [q.id, q]));
  const used = new Set<string>();
  let card: SituationCard | undefined;
  const stop = () => card?.stop();

  const progressBar = () => {
    bar.style.width = `${(Math.min(state.step, tale.steps.length) / tale.steps.length) * 100}%`;
  };

  /** Сцена шага с развилкой; выбор записывается сразу. */
  const scene = async (i: number) => {
    const step = tale.steps[i];
    const ctx = taleContext(state, tale);
    const d = step.decision ? tale.decisions.find((x) => x.id === step.decision) : undefined;
    const lines = [...resolveLines(step.lines, ctx), ...(d && !ctx.decisions[d.id] ? decisionLines(d, ctx) : [])];
    await playCutscene(lines, {
      last: step.trial ? 'К испытанию' : 'Дальше',
      onChoice: (line, value) => {
        if (line.decision && taleDecide(state, tale, line.decision, value, Date.now())) saveProgress();
      },
    });
  };

  const trial = (i: number): Promise<void> =>
    new Promise((resolve) => {
      const step = tale.steps[i];
      if (!step.trial) return resolve();
      const items: TrialItem[] = pickTrial(step.trial, situations, questions, data.questions, used);
      let k = 0;
      const sitState = () => {
        data.modes ??= {};
        return (data.modes.situations ??= emptySituations());
      };
      const next = () => {
        k++;
        if (k < items.length) show();
        else {
          card?.stop();
          resolve();
        }
      };
      const show = () => {
        if (!deps.alive()) return;
        const item = items[k];
        used.add(item.id);
        status.textContent = `Шаг ${i + 1} из ${tale.steps.length} · «${step.title}» · задание ${k + 1} из ${items.length} · верных ${state.right} из ${state.total}`;
        card?.stop();
        if (item.kind === 'situation') {
          const sit = sitById.get(item.id)!;
          card = situationCard(sit, import.meta.env.BASE_URL, {
            order: optionOrder(sit),
            limit: TALE_LIMIT,
            readMs: readMs(sit, isKnown(sitState(), sit.id)),
            last: false,
            onAnswer: (choice) => {
              const correct = choice === sit.correct;
              recordSituation(sitState(), sit.id, correct, Date.now());
              state.total++;
              if (correct) state.right++;
              saveProgress();
            },
            onNext: next,
          });
          body.replaceChildren(card.element);
        } else {
          const q = qById.get(item.id)!;
          const note = el('p', { class: 'review-note', hidden: true });
          const go = el('button', { class: 'btn btn--primary btn--lg', type: 'button', hidden: true, onclick: next }, 'Дальше');
          body.replaceChildren(
            el('p', { class: 'tale-repeat' }, '🔁 Повтор из билетов: вопрос из твоих ошибок или из темы этого шага.'),
            renderQuestionCard(q, (r) => {
              state.total++;
              if (r.isCorrect) state.right++;
              note.textContent = deps.answerQuestion(q, r.isCorrect);
              note.hidden = !note.textContent;
              go.hidden = false;
            }),
            note,
            go,
          );
        }
        scroller.scrollTop = 0;
      };
      show();
    });

  const ending = async () => {
    const first = state.runs === 0;
    const out = finishTale(state, tale, Date.now());
    if (first) data.xp += TALE_XP;
    saveProgress();
    progressBar();
    playSound(out.score >= 0.8 ? 'pass' : 'reward');
    await playCutscene(out.ending.lines, { last: 'Конец' });
    if (!deps.alive()) return;
    if (out.fresh) showToast(`${out.ending.icon} Открыта концовка «${out.ending.title}»`);
    summary();
  };

  const summary = () => {
    status.textContent = '';
    const ctx = taleContext(state, tale);
    body.replaceChildren(
      el(
        'section',
        { class: 'panel tale-summary' },
        el('h2', { class: 'section-title' }, `${tale.icon} ${tale.title}`),
        el('p', {}, `Верных ответов: ${state.right} из ${state.total} (${Math.round(taleScore(state) * 100)}%).`),
        el(
          'ol',
          { class: 'story__decisions' },
          ...tale.decisions.flatMap((d) => {
            const o = d.options.find((x) => x.value === ctx.decisions[d.id]);
            return o ? [el('li', {}, el('b', {}, d.title), el('span', {}, ` — ${o.summary}`))] : [];
          }),
        ),
      ),
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'section-title' }, `Концовки · ${Object.keys(state.endings).length} из ${tale.endings.length}`),
        el(
          'ul',
          { class: 'endings' },
          ...tale.endings.map((e) => {
            const got = state.endings[e.id] !== undefined;
            return el(
              'li',
              { class: `ending${got ? ' is-open' : ''}`, 'data-ending': e.id },
              el('span', { class: 'ending__icon', 'aria-hidden': 'true' }, got ? e.icon : '🔒'),
              el('span', { class: 'ending__body' }, el('b', {}, e.title), el('span', { class: 'ending__hint' }, got ? 'Открыта' : e.hint)),
            );
          }),
        ),
      ),
      el(
        'button',
        {
          class: 'btn btn--primary btn--lg',
          type: 'button',
          onclick: () => {
            restartTale(state);
            saveProgress();
            void play();
          },
        },
        'Пройти заново',
      ),
      el('button', { class: 'btn btn--secondary', type: 'button', onclick: deps.done }, 'К сюжетам'),
    );
    scroller.scrollTop = 0;
  };

  const play = async () => {
    while (state.step < tale.steps.length) {
      if (!deps.alive()) return;
      progressBar();
      const i = state.step;
      body.replaceChildren(el('p', { class: 'intro tale-step' }, `Шаг ${i + 1} из ${tale.steps.length}: «${tale.steps[i].title}»`));
      await scene(i);
      if (!deps.alive()) return;
      await trial(i);
      if (!deps.alive()) return;
      state.step = i + 1;
      saveProgress();
    }
    await ending();
  };

  // Пройденный ранее сюжет открывается сводкой; начатый — продолжается с того же шага.
  if (state.step >= tale.steps.length) summary();
  else void play();
  return { stop };
}
