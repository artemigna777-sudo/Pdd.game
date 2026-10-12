/**
 * Экраны режима «Ситуации на дороге» (этап 15): ступени, карточка ситуации с таймером и итог заезда.
 * Ситуации не из билетов — это написано на каждой карточке.
 */
import { answerFeedback } from '../audio/feedback.ts';
import type { Question } from '../data/types.ts';
import { STAGES, SITUATIONS, isKnown, lockReason, type RunOutcome, type SituationRun, type SituationsState, type StageId } from '../situations/run.ts';
import { sceneSvg } from '../situations/scene.ts';
import { SECTIONS, type Situation } from '../situations/types.ts';
import { avatar } from './cutscene.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

export const NOT_FROM_TICKETS = 'не из билетов';

const notTickets = () => el('span', { class: 'chip chip--warn sit-badge', title: 'Ситуация составлена по ПДД, в экзаменационных билетах её нет' }, NOT_FROM_TICKETS);

/** «Билет 15, вопрос 10» по id «B15-Q10». */
export function ticketLabel(id: string): string {
  const m = /^B(\d+)-Q(\d+)$/.exec(id);
  return m ? `билет ${Number(m[1])}, вопрос ${Number(m[2])}` : id;
}

// ─── Главный экран режима ────────────────────────────────────────────────────────

export function situationsHubView(s: SituationsState, total: number, start: (stage: StageId) => void): HTMLElement {
  const solved = Object.keys(s.seen).filter((id) => isKnown(s, id)).length;
  const last = s.runs.at(-1);
  return el(
    'div',
    { class: 'sit-hub' },
    el(
      'section',
      { class: 'panel mode-intro' },
      el('p', { class: 'event-intro' }, avatar('victor', 'avatar--small'), el('span', {}, 'Виктор Петрович: «Билеты — это половина дела. А на дороге всё решают секунды. Давай потренируемся на живых ситуациях»')),
      el(
        'ul',
        { class: 'mode-rules' },
        el('li', {}, `🚦 заезд — ${SITUATIONS.perRun} ситуаций, на каждую — таймер;`),
        el('li', {}, '⏱ не успел — считается ошибкой;'),
        el('li', {}, '📖 у каждого ответа — пункт ПДД или КоАП и похожий вопрос из билетов, если он есть.'),
      ),
      el('p', { class: 'panel__note' }, notTickets(), ' Этих ситуаций нет в экзаменационных билетах: ответы составлены по ПДД. Они не влияют на готовность к экзамену и работу над ошибками.'),
    ),
    el('p', { class: 'sit-hub__stats' }, `Решено ситуаций: ${solved} из ${total}`, last ? ` · последний заезд: ${last.answers.filter((a) => a.correct).length} из ${last.answers.length}` : ''),
    el('h2', { class: 'section-title' }, 'Сложность'),
    el(
      'div',
      { class: 'sit-stages' },
      ...STAGES.map((st, i) => {
        const lock = lockReason(s, st.id);
        return el(
          'button',
          { class: `sit-stage${lock ? ' is-locked' : ''}`, type: 'button', disabled: !!lock, 'data-stage': st.id, onclick: () => start(st.id) },
          el('span', { class: 'sit-stage__num', 'aria-hidden': 'true' }, lock ? '🔒' : String(i + 1)),
          el('span', { class: 'sit-stage__body' }, el('span', { class: 'sit-stage__title' }, st.title), el('span', { class: 'sit-stage__note' }, lock ?? st.note)),
        );
      }),
    ),
  );
}

// ─── Карточка ситуации ──────────────────────────────────────────────────────────

export interface SituationCardOpts {
  /** Порядок вариантов: индексы исходного массива. */
  order: number[];
  /** Секунд на ответ. */
  limit: number;
  /** Сколько мс дать прочитать вопрос до вариантов. */
  readMs: number;
  /** Ответ дан (choice — исходный индекс или null, если время вышло); ms — сколько думал. */
  onAnswer: (choice: number | null, ms: number) => void;
  /** «Дальше» после разбора. */
  onNext: () => void;
  last: boolean;
}

export interface SituationCard {
  element: HTMLElement;
  /** Остановить таймеры (уход с экрана). */
  stop: () => void;
}

export function situationCard(sit: Situation, base: string, opts: SituationCardOpts): SituationCard {
  const scene = el('div', { class: 'sit-scene' });
  scene.innerHTML = sceneSvg(sit.scene, base);
  const fill = el('div', { class: 'sit-timer__fill' });
  const secs = el('span', { class: 'sit-timer__secs' }, `${opts.limit} с`);
  const timer = el('div', { class: 'sit-timer is-reading', role: 'timer', 'aria-label': 'Время на ответ' }, el('div', { class: 'sit-timer__bar' }, fill), secs);
  const feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const explanation = el('section', { class: 'explanation', 'aria-label': 'Пояснение', hidden: true });
  const next = el('button', { class: 'btn btn--primary btn--lg sit-next', type: 'button', hidden: true, onclick: () => opts.onNext() }, opts.last ? 'Итоги заезда' : 'Дальше');
  const buttons = opts.order.map((orig, k) =>
    el(
      'button',
      { class: 'option', type: 'button', 'data-orig': orig, onclick: () => choose(orig) },
      el('span', { class: 'option__num', 'aria-hidden': 'true' }, String(k + 1)),
      el('span', { class: 'option__text' }, sit.options[orig]),
    ),
  );
  const list = el('ol', { class: 'options sit-options is-hidden' }, ...buttons.map((b) => el('li', {}, b)));
  const ready = el('button', { class: 'btn btn--secondary sit-ready', type: 'button', onclick: () => showOptions() }, 'Читаю… показать варианты');

  const element = el(
    'article',
    { class: 'card sit-card', 'aria-label': `Ситуация ${sit.id}` },
    el('div', { class: 'card__meta' }, el('span', {}, SECTIONS[sit.section] ?? ''), notTickets()),
    scene,
    el('h2', { class: 'card__text' }, sit.text),
    timer,
    ready,
    list,
    feedback,
    explanation,
    next,
  );

  let shownAt = 0;
  let readTimer: number | undefined = window.setTimeout(showOptions, opts.readMs);
  let raf = 0;
  let answered = false;
  // Таймер ставится на паузу, когда игра свёрнута: иначе время выйдет, пока телефон в кармане.
  let pausedLeft: number | undefined;

  function left(): number {
    return opts.limit * 1000 - (performance.now() - shownAt);
  }

  function tick() {
    if (answered) return;
    const ms = left();
    fill.style.transform = `scaleX(${Math.max(0, ms / (opts.limit * 1000))})`;
    secs.textContent = `${Math.max(0, Math.ceil(ms / 1000))} с`;
    timer.classList.toggle('is-low', ms < 3000 && opts.limit > 3);
    if (ms <= 0) {
      finish(null);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function showOptions() {
    if (shownAt || answered) return;
    window.clearTimeout(readTimer);
    readTimer = undefined;
    ready.hidden = true;
    list.classList.remove('is-hidden');
    timer.classList.remove('is-reading');
    shownAt = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function onVisibility() {
    if (answered || !shownAt) return;
    if (document.hidden) {
      pausedLeft = left();
      cancelAnimationFrame(raf);
    } else if (pausedLeft !== undefined) {
      shownAt = performance.now() - (opts.limit * 1000 - pausedLeft);
      pausedLeft = undefined;
      raf = requestAnimationFrame(tick);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  function choose(orig: number) {
    if (answered || !shownAt) return;
    finish(orig);
  }

  function finish(choice: number | null) {
    answered = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    const ms = Math.round(Math.min(opts.limit * 1000, performance.now() - shownAt));
    const ok = choice === sit.correct;
    ready.hidden = true;
    list.classList.remove('is-hidden');
    timer.classList.add('is-done');
    buttons.forEach((b) => {
      const orig = Number(b.dataset.orig);
      b.disabled = true;
      if (orig === sit.correct) b.classList.add('is-correct');
      else if (orig === choice) b.classList.add('is-wrong');
    });
    answerFeedback(ok);
    const shown = opts.order.indexOf(sit.correct) + 1;
    feedback.className = `feedback ${ok ? 'feedback--ok' : 'feedback--bad'}`;
    feedback.replaceChildren(el('strong', {}, ok ? 'Верно!' : choice === null ? `Время вышло. Правильный ответ — ${shown}.` : `Неверно. Правильный ответ — ${shown}.`));
    explanation.replaceChildren(...explanationNodes(sit));
    explanation.hidden = false;
    next.hidden = false;
    opts.onAnswer(choice, ms);
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedback.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  }

  return {
    element,
    stop: () => {
      answered = true;
      window.clearTimeout(readTimer);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

/** Пояснение: почему так, пункты правил, похожие вопросы из билетов. */
function explanationNodes(sit: Situation): Node[] {
  const nodes: (HTMLElement | null)[] = [
    el('h3', { class: 'explanation__title' }, 'Почему так'),
    el('p', { class: 'explanation__text' }, sit.explanation),
    el('p', { class: 'sit-rules' }, ...sit.rules.map((r) => el('span', { class: 'chip sit-rule' }, r))),
    sit.related.length ? el('p', { class: 'explanation__source' }, `Похожий вопрос из билетов: ${sit.related.map(ticketLabel).join('; ')}.`) : null,
    el('p', { class: 'explanation__source' }, 'Ситуации нет в экзаменационных билетах: ответ составлен по ПДД и КоАП.'),
  ];
  return nodes.filter((n): n is HTMLElement => !!n);
}

// ─── Итог заезда ────────────────────────────────────────────────────────────────

export interface ResultActions {
  again: () => void;
  hub: () => void;
  /** Потренировать похожие вопросы из билетов (ids). */
  related: (ids: string[]) => void;
}

export function situationsResultView(run: SituationRun, out: RunOutcome, byId: Map<string, Situation>, questions: Map<string, Question>, actions: ResultActions): HTMLElement {
  const stage = STAGES.find((s) => s.id === run.stage)!;
  const wrong = run.answers.filter((a) => !a.correct);
  const slow = run.answers.filter((a) => a.choice === null).length;
  const related = [...new Set(wrong.flatMap((a) => byId.get(a.id)?.related ?? []))].filter((id) => questions.has(id));
  const unlocked = out.unlocked && STAGES.find((s) => s.id === out.unlocked);
  return el(
    'div',
    { class: 'sit-result' },
    el(
      'section',
      { class: 'result' },
      el('p', { class: 'result__score' }, `${out.correct} из ${out.total}`),
      el('p', { class: 'result__label' }, out.correct === out.total ? 'Чистый заезд!' : out.correct >= out.total * 0.7 ? 'Хороший заезд.' : 'Есть над чем поработать.'),
      el('p', { class: 'result__note' }, `Ступень «${stage.title}»${slow ? ` · не успел ответить: ${slow}` : ''}${out.coins ? ` · +${out.coins} ${plural(out.coins, ['монета', 'монеты', 'монет'])}` : ''}`),
      unlocked ? el('p', { class: 'result__note sit-unlocked' }, `🔓 Открыта ступень «${unlocked.title}»: ${unlocked.note}.`) : null,
    ),
    el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: actions.again }, 'Ещё заезд'),
    related.length ? el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => actions.related(related) }, `Похожие вопросы из билетов (${related.length})`) : null,
    el('button', { class: 'btn btn--secondary', type: 'button', onclick: actions.hub }, 'Выбрать сложность'),
    el('h2', { class: 'section-title' }, 'Разбор'),
    el(
      'ol',
      { class: 'sit-review' },
      ...run.answers.map((a) => {
        const sit = byId.get(a.id);
        if (!sit) return null;
        const body = el(
          'div',
          { class: 'sit-review__body', hidden: a.correct },
          el('p', { class: 'sit-review__answer' }, a.choice === null ? 'Время вышло.' : a.correct ? `Твой ответ верный: ${sit.options[a.choice]}` : `Твой ответ: ${sit.options[a.choice]}`),
          a.correct ? null : el('p', { class: 'sit-review__right' }, `Правильно: ${sit.options[sit.correct]}`),
          ...explanationNodes(sit),
        );
        const head = el(
          'button',
          { class: 'sit-review__head', type: 'button', 'aria-expanded': String(!a.correct), onclick: () => ((body.hidden = !body.hidden), head.setAttribute('aria-expanded', String(!body.hidden))) },
          el('span', { class: `sit-review__mark ${a.correct ? 'is-ok' : 'is-bad'}`, 'aria-label': a.correct ? 'верно' : 'ошибка' }, a.correct ? '✓' : '✕'),
          el('span', { class: 'sit-review__text' }, sit.text),
          el('span', { class: 'sit-review__time' }, `${(a.ms / 1000).toFixed(1)} из ${a.limit} с`),
        );
        return el('li', { class: 'sit-review__item' }, head, body);
      }),
    ),
  );
}
