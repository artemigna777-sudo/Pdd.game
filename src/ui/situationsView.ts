/**
 * Экраны режима «Ситуации на дороге» (этап 15): ступени, карточка ситуации с таймером и итог заезда.
 * Ситуации не из билетов — это написано на каждой карточке.
 */
import { answerFeedback } from '../audio/feedback.ts';
import { speak, stopSpeaking } from '../audio/voice.ts';
import type { Question } from '../data/types.ts';
import { LIFE, STAGES, SITUATIONS, THEMES, lifeMatch, diaryPool, diarySkills, lockReason, provokeStats, runSkills, solvedCount, weakestSkill, type RunOutcome, type SituationRun, type SituationsState, type SkillStat, type StageId } from '../situations/run.ts';
import { sceneSvg } from '../situations/scene.ts';
import { PENALTY_FAIL, PENALTY_LABEL, SECTIONS, SKILLS, type Situation } from '../situations/types.ts';
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

export const STAGE_TITLE: Record<StageId, string> = {
  calm: 'Спокойно',
  mix: 'Микс',
  hard: 'Хардкор',
  provoke: 'Провокации инспектора',
  diary: 'Повторить слабое',
  night: 'Ночная езда',
  rain: 'Дождь и снег',
  highway: 'Трасса',
  yard: 'Дворы и парковки',
  life: 'Реальная жизнь',
};

/** Полоски навыков: доля верных ответов и (в заезде) среднее время. */
function skillBars(stats: readonly SkillStat[]): HTMLElement {
  return el(
    'ul',
    { class: 'skill-bars' },
    ...stats.map((x) => {
      const share = x.total ? x.right / x.total : 0;
      const fill = el('span', { class: `skill-bar__fill${share < 0.7 ? ' is-weak' : ''}` });
      fill.style.width = `${Math.round(share * 100)}%`;
      return el(
        'li',
        { class: 'skill-bar', 'data-skill': x.skill },
        el('span', { class: 'skill-bar__name' }, `${SKILLS[x.skill].icon} ${SKILLS[x.skill].title}`),
        el('span', { class: 'skill-bar__track', role: 'img', 'aria-label': `верно ${x.right} из ${x.total}` }, fill),
        el('span', { class: 'skill-bar__value' }, `${x.right} из ${x.total}`, x.ms !== undefined ? el('small', {}, ` · ${(x.ms / 1000).toFixed(1).replace('.', ',')} с`) : null),
      );
    }),
  );
}

/** Вывод по навыкам: самый слабый и совет. */
function skillVerdict(stats: readonly SkillStat[], empty: string): HTMLElement {
  const weak = weakestSkill(stats);
  if (!weak) return el('p', { class: 'skill-verdict is-ok' }, empty);
  const info = SKILLS[weak.skill];
  return el('p', { class: 'skill-verdict' }, el('b', {}, `Слабее всего — «${info.title}» (${weak.right} из ${weak.total}). `), `Совет: ${info.advice}.`);
}

export function situationsHubView(s: SituationsState, all: readonly Situation[], provocations: number, start: (stage: StageId) => void): HTMLElement {
  const total = all.length;
  const diary = diarySkills(s, all);
  const weak = diaryPool(s, all).length;
  const solved = solvedCount(s);
  const last = s.runs.filter((r) => r.stage !== 'provoke').at(-1);
  const pr = provokeStats(s);
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
        el('li', {}, `⚖️ ошибки — штрафные баллы, как на экзамене в ГИБДД: грубая — 7, средняя — 3, мелкая — 1. Набрал ${PENALTY_FAIL} — экзамен был бы не сдан;`),
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
    el('h2', { class: 'section-title' }, 'Темы'),
    el(
      'div',
      { class: 'sit-themes' },
      ...THEMES.map((t) => {
        const n = all.filter(t.match).length;
        return el(
          'button',
          { class: 'sit-theme', type: 'button', 'data-stage': t.id, onclick: () => start(t.id) },
          el('span', { class: 'sit-theme__icon', 'aria-hidden': 'true' }, t.icon),
          el('span', { class: 'sit-theme__title' }, t.title),
          el('span', { class: 'sit-theme__note' }, `${n} ${plural(n, ['ситуация', 'ситуации', 'ситуаций'])}`),
        );
      }),
    ),
    el(
      'button',
      { class: 'sit-stage sit-stage--life', type: 'button', 'data-stage': 'life', onclick: () => start('life') },
      el('span', { class: 'sit-stage__num', 'aria-hidden': 'true' }, '♾'),
      el(
        'span',
        { class: 'sit-stage__body' },
        el('span', { class: 'sit-stage__title' }, 'Реальная жизнь'),
        el('span', { class: 'sit-stage__note' }, `Без инспектора и без конца: ${all.filter(lifeMatch).length} городских ситуаций вперемешку, на таймере. ${LIFE.lives} ошибки — заезд окончен.`),
        s.life ? el('span', { class: 'sit-stage__note sit-stage__score' }, `🏆 Рекорд: ${s.life.best} · заездов: ${s.life.runs}`) : null,
      ),
    ),
    el('h2', { class: 'section-title' }, 'Дневник водителя'),
    el(
      'section',
      { class: 'panel sit-diary' },
      el('p', { class: 'panel__note' }, diary.length ? 'Все ответы на ситуации по навыкам: где ты ошибаешься чаще всего.' : 'Пока пусто: пройди заезд — дневник запомнит, где были ошибки, и предложит повторить именно их.'),
      diary.length ? skillBars(diary) : null,
      diary.length ? skillVerdict(diary, 'Ошибок пока нет — так держать!') : null,
      el(
        'button',
        { class: 'btn btn--secondary', type: 'button', 'data-stage': 'diary', disabled: !weak, onclick: () => start('diary') },
        weak ? `Повторить слабое (${Math.min(weak, SITUATIONS.perRun)})` : 'Повторять пока нечего',
      ),
    ),
    el('h2', { class: 'section-title' }, 'Провокации инспектора'),
    el(
      'button',
      { class: 'sit-stage sit-stage--provoke', type: 'button', 'data-stage': 'provoke', onclick: () => start('provoke') },
      avatar('sokolov', 'sit-stage__avatar'),
      el(
        'span',
        { class: 'sit-stage__body' },
        el('span', { class: 'sit-stage__title' }, 'Экзамен с подвохом'),
        el('span', { class: 'sit-stage__note' }, `Инспектор в машине даёт команды: одни можно выполнять, другие — нет. Решай: «Выполняю» или «Нельзя». ${provocations} ${plural(provocations, ['команда', 'команды', 'команд'])}, оценка отдельно.`),
        pr.last ? el('span', { class: 'sit-stage__note sit-stage__score' }, `Последний раз: ${pr.last.right} из ${pr.last.total} · лучший: ${pr.best}`) : null,
      ),
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
  /** Что сказать голосом инспектора, когда карточка появилась. */
  speak?: string;
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

  if (opts.speak) speak(opts.speak);
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
    if (!ok) feedback.append(el('span', { class: 'sit-penalty' }, `+${sit.penalty} ${plural(sit.penalty, ['штрафной балл', 'штрафных балла', 'штрафных баллов'])} — ${PENALTY_LABEL[sit.penalty]}`));
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
      stopSpeaking();
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

export function situationsResultView(run: SituationRun, out: RunOutcome, byId: Map<string, Situation>, questions: Map<string, Question>, actions: ResultActions, lifeBest?: number): HTMLElement {
  const provoke = run.stage === 'provoke';
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
      el('p', { class: 'result__score' }, run.stage === 'life' ? `${out.correct} ${plural(out.correct, ['верный', 'верных', 'верных'])}` : `${out.correct} из ${out.total}`),
      run.stage === 'life' ? el('p', { class: `result__note sit-life ${out.record ? 'is-record' : ''}` }, out.record ? '🏆 Новый рекорд!' : `Рекорд: ${lifeBest ?? out.correct}`) : null,
      el('p', { class: 'result__label' }, out.correct === out.total ? 'Чистый заезд!' : out.passed ? 'Хороший заезд.' : 'Есть над чем поработать.'),
      el(
        'p',
        { class: `sit-verdict ${out.passed ? 'is-ok' : 'is-bad'}` },
        `Штрафные баллы: ${out.points}. `,
        out.passed ? 'На экзамене в ГИБДД такой заезд был бы сдан.' : `На экзамене в ГИБДД — «не сдал»: набрано ${PENALTY_FAIL} и больше.`,
      ),
      provoke ? el('p', { class: 'result__note sit-provoke-score' }, `Провокаций распознано: ${run.answers.filter((a) => a.correct && a.choice === 1).length} из ${run.answers.filter((a) => byId.get(a.id)?.correct === 1).length} · законных команд выполнено: ${run.answers.filter((a) => a.correct && a.choice === 0).length} из ${run.answers.filter((a) => byId.get(a.id)?.correct === 0).length}`) : null,
      el('p', { class: 'result__note' }, `${provoke ? 'Провокации инспектора' : `Ступень «${STAGE_TITLE[run.stage]}»`}${slow ? ` · не успел ответить: ${slow}` : ''}${out.coins ? ` · +${out.coins} ${plural(out.coins, ['монета', 'монеты', 'монет'])}` : ''}`),
      unlocked ? el('p', { class: 'result__note sit-unlocked' }, `🔓 Открыта ступень «${unlocked.title}»: ${unlocked.note}.`) : null,
    ),
    el('h2', { class: 'section-title' }, 'Навыки в этом заезде'),
    skillBars(runSkills(run, byId)),
    skillVerdict(runSkills(run, byId), out.correct === out.total ? 'Ошибок нет — все навыки на высоте.' : 'Ошибки разные, явно слабого навыка нет.'),
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
          el('span', { class: 'sit-review__time' }, `${(a.ms / 1000).toFixed(1)} из ${a.limit} с`, a.penalty ? el('b', { class: 'sit-review__pen' }, ` +${a.penalty}`) : null),
        );
        return el('li', { class: 'sit-review__item' }, head, body);
      }),
    ),
  );
}
