/**
 * «Мой экзамен» (этап 9): дата экзамена в ГИБДД, план на сегодня, прогноз и итог экзамена.
 */
import { planSummary, type Advice, type PlanSummary } from '../progress/examPlan.ts';
import { COINS, PLAN, planDay, type PlanTask, type ProgressData } from '../progress/progress.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

export interface PlanActions {
  setDate(date: number): void;
  clear(): void;
  result(passed: boolean): void;
  fresh(): void;
  reviews(): void;
  refresh(): void;
  exam(): void;
  share(): void;
}

const DAY_MS = 86_400_000;
const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
const questions = (n: number) => `${n} ${plural(n, ['вопрос', 'вопроса', 'вопросов'])}`;
const mistakes = (n: number) => `${n} ${plural(n, ['ошибка', 'ошибки', 'ошибок'])}`;

/** «18 октября». */
export const dateLabel = (ts: number): string => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

/** Сколько осталось до экзамена — коротко, для меню: «12 дн.», «завтра», «сегодня». */
export function countdownLabel(s: PlanSummary): string {
  if (s.state === 'none') return '';
  if (s.state === 'ask') return 'как прошёл?';
  if (s.state === 'done') return s.result!.passed ? 'сдан ✓' : 'не сдан';
  if (s.daysLeft === 0) return 'сегодня';
  if (s.daysLeft === 1) return 'завтра';
  return `через ${s.daysLeft} дн.`;
}

const startOfToday = (now: number) => new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
const toInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** «2026-10-18» → начало этого дня (местное время). */
function fromInput(value: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d.getTime() : undefined;
}

/** Выбор даты экзамена: сегодня или позже, не дальше чем через год. */
function dateForm(now: number, current: number | undefined, label: string, onPick: (date: number) => void): HTMLElement {
  const today = startOfToday(now);
  const max = today + 365 * DAY_MS;
  const input = el('input', { class: 'plan-date__input', type: 'date', id: 'plan-date', min: toInput(today), max: toInput(max), required: true });
  if (current !== undefined && current >= today) input.value = toInput(current);
  const error = el('p', { class: 'plan-date__error', role: 'alert' });
  const submit = el('button', { class: 'btn btn--primary btn--lg', type: 'submit' }, label);
  const check = () => {
    const date = fromInput(input.value);
    const msg = !input.value ? '' : date === undefined ? 'Не получилось прочитать дату.' : date < today ? 'Эта дата уже прошла.' : date > max ? 'Дата дальше чем через год.' : '';
    error.textContent = msg;
    submit.disabled = !input.value || !!msg;
    return msg ? undefined : date;
  };
  input.addEventListener('input', check);
  input.addEventListener('change', check);
  check();
  return el(
    'form',
    {
      class: 'plan-date',
      onsubmit: (e: Event) => {
        e.preventDefault();
        const date = check();
        if (date !== undefined) onPick(date);
      },
    },
    el('label', { class: 'plan-date__label', for: 'plan-date' }, 'Дата экзамена в ГИБДД'),
    input,
    error,
    submit,
  );
}

/** Строка задачи плана на сегодня: что сделать, сколько сделано, кнопка перехода. */
function taskRow(icon: string, title: string, task: PlanTask, go: () => void): HTMLElement {
  const done = task.done >= task.target;
  return el(
    'button',
    { class: `plan-task${done ? ' is-done' : ''}`, type: 'button', onclick: go },
    el('span', { class: 'plan-task__icon', 'aria-hidden': 'true' }, done ? '✅' : icon),
    el('span', { class: 'plan-task__title' }, title),
    el('span', { class: 'plan-task__count' }, `${Math.min(task.done, task.target)} из ${task.target}`),
    el('span', { class: 'tip__go', 'aria-hidden': 'true' }, '→'),
  );
}

function todayPanel(data: ProgressData, now: number, actions: PlanActions): HTMLElement {
  const day = planDay(data, now);
  const rows: HTMLElement[] = [];
  if (day?.fresh.target) rows.push(taskRow('🆕', 'Новые вопросы', day.fresh, actions.fresh));
  if (day?.reviews.target) rows.push(taskRow('🔁', 'Повторы ошибок', day.reviews, actions.reviews));
  if (day?.refresh.target) rows.push(taskRow('🧠', 'Повторение пройденного', day.refresh, actions.refresh));
  if (day?.exams.target) rows.push(taskRow('🎓', day.exams.target > 1 ? 'Пробные экзамены' : 'Пробный экзамен', day.exams, actions.exam));
  const all = rows.length > 0 && day ? [day.fresh, day.reviews, day.refresh, day.exams].every((t) => t.done >= t.target) : false;
  return el(
    'section',
    { class: 'panel plan-today' },
    el('h2', { class: 'panel__title' }, all ? 'Сегодня по плану — всё ✅' : 'Сегодня по плану'),
    ...rows,
    rows.length
      ? el('p', { class: 'panel__note' }, data.daily?.kind === 'plan' ? `План на сегодня — это цель дня: выполнишь всё — +${COINS.goal} монет и серия 🔥.` : 'Цель дня сегодня — обычная, план идёт вместе с ней.')
      : el('p', { class: 'panel__note' }, 'На сегодня в плане ничего нет: новые вопросы пройдены, а повторы ждут своего дня. Можно сдать пробный экзамен или поехать в город.'),
  );
}

const ADVICE: Record<Advice, (s: PlanSummary) => string> = {
  reviews: (s) => `Сначала — повторы ошибок на сегодня (${s.dueToday}): эти вопросы уже знакомы, их проще всего закрепить.`,
  unfixable: (s) => `${mistakes(s.unfixable)} не успеют пройти все три повтора. Всё равно повторяй их в свой день: каждый повтор помогает.`,
  fresh: () => 'Новые вопросы — каждый день по плану: пропущенный день добавит вопросов на остальные.',
  exams: () => 'Пробный экзамен — каждый день: он покажет, какой блок вопросов слабее.',
  move: () => 'Если экзамен можно перенести — укажи новую дату, и план пересчитается.',
};

/** «к 12 октября» или «сегодня», если это сегодня. */
const byDate = (ts: number, now: number) => (ts <= startOfToday(now) ? 'сегодня' : `к ${dateLabel(ts)}`);
const answers = (n: number) => `${n} ${plural(n, ['ответ', 'ответа', 'ответов'])}`;

function forecastPanel(s: PlanSummary, now: number): HTMLElement {
  const left = s.daysLeft!;
  const title = s.pace === 'ok' ? 'Успеваешь 👍' : s.pace === 'tight' ? 'Плотно, но можно успеть' : 'Всё пройти не успеть';
  const text =
    s.pace === 'ok'
      ? s.unseen
        ? `По ${s.perDay} новых вопросов в день — и все ${s.unseen} пройдены ${byDate(s.freshUntil!, now)}, за ${days(s.early!)} до экзамена. Дальше — закрепление: повторение пройденного и пробные экзамены.`
        : 'Все вопросы пройдены заранее ✅ Теперь закрепление: каждый день повторение пройденного (сначала там, где были ошибки), повторы ошибок и пробные экзамены.'
      : s.pace === 'late'
        ? s.perDay > PLAN.max
          ? `Чтобы пройти ${questions(s.unseen)}, которые ещё не встречались, нужно по ${s.perDay} в день. Это очень много.`
          : `Нужно в среднем ${answers(s.load)} в день: новые вопросы и повторы ошибок. Это очень много.`
        : s.squeezed
          ? left > PLAN.last
            ? `По плану новые вопросы уже должны были закончиться, а ${questions(s.unseen)} ещё не встречались. По ${s.perDay} в день — и все будут пройдены ${byDate(s.freshUntil!, now)}, за ${days(s.early!)} до экзамена.`
            : `До экзамена ${days(left)}, а ${questions(s.unseen)} ещё не встречались: пройди их сейчас, чтобы успеть повторить ошибки.`
          : s.perDay > PLAN.comfortable
            ? `Нужно по ${s.perDay} новых вопросов в день, без пропусков.`
            : s.load > PLAN.comfortable
              ? `Нужно в среднем ${answers(s.load)} в день: новые вопросы и повторы ошибок, без пропусков.`
              : 'Новые вопросы успеваешь, но не все ошибки успеют закрепиться тремя повторами.';
  return el(
    'section',
    { class: `panel plan-forecast plan-forecast--${s.pace}` },
    el('h2', { class: 'panel__title' }, title),
    el('p', { class: 'rewards__line' }, text),
    s.advice.length ? el('h3', { class: 'readiness__tips-title' }, 'Что делать в первую очередь') : null,
    s.advice.length ? el('ol', { class: 'plan-advice' }, ...s.advice.map((a) => el('li', {}, ADVICE[a](s)))) : null,
  );
}

/** Как устроен план: учёба заранее, закрепление, пробные экзамены, ошибки. */
function howPanel(s: PlanSummary, now: number): HTMLElement {
  const today = startOfToday(now);
  const items: [string, string][] = [];
  items.push([
    '📚',
    s.unseen
      ? `Учёба: все новые вопросы — заранее, не меньше ${PLAN.minPace} в день. Осталось ${s.unseen}: по ${s.perDay} в день — до ${s.freshUntil! <= today ? 'конца дня' : dateLabel(s.freshUntil!)}.`
      : 'Учёба: все вопросы пройдены ✅',
  ]);
  items.push([
    '🧠',
    `Закрепление: новых вопросов нет, каждый день — повторение пройденного: сначала вопросы и темы, где были ошибки, потом те, что давно не встречались. ${
      s.phase === 'learn' ? `Начнётся, как только пройдены все новые вопросы (по плану — не позже ${dateLabel(s.readyBy!)}).` : s.stale ? `Сейчас пора освежить: ${questions(s.stale)}.` : 'Всё пройденное свежее — новые вопросы для повторения появятся через неделю после ответа.'
    }`,
  ]);
  items.push([
    '🎓',
    s.examsFrom! <= today
      ? `Пробные экзамены: каждый день, в последние ${days(PLAN.last)} — по два.`
      : `Пробные экзамены: на закреплении — через день, с ${dateLabel(s.examsFrom!)} — каждый день, в последние ${days(PLAN.last)} — по два.`,
  ]);
  items.push(['🔁', `Ошибки: три повтора, как обычно, но промежутки короче, чтобы все успели до экзамена. Сейчас в работе: ${mistakes(s.reviews)}.`]);
  return el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, 'Как устроен план'),
    el('ul', { class: 'plan-how' }, ...items.map(([icon, text]) => el('li', {}, el('span', { class: 'plan-how__icon', 'aria-hidden': 'true' }, icon), el('span', {}, text)))),
  );
}

function resultButtons(actions: PlanActions): HTMLElement {
  return el(
    'div',
    { class: 'menu__row' },
    el('button', { class: 'btn btn--primary', type: 'button', onclick: () => actions.result(true) }, 'Сдан ✓'),
    el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => actions.result(false) }, 'Не сдан'),
  );
}

/** Экран «Мой экзамен». `readinessNow` — готовность сейчас (для вопроса об итоге), если уже посчитана. */
export function planView(data: ProgressData, now: number, readinessNow: number | undefined, actions: PlanActions): HTMLElement {
  const root = el('div', { class: 'plan' });
  const s = planSummary(data, now);
  const editing = el('div', {});
  const editButton = (label: string) =>
    el(
      'button',
      {
        class: 'btn btn--secondary',
        type: 'button',
        onclick: (e: Event) => {
          (e.currentTarget as HTMLElement).hidden = true;
          editing.replaceChildren(dateForm(now, s.date, 'Сохранить дату', actions.setDate));
          editing.querySelector('input')?.focus();
        },
      },
      label,
    );
  const clearButton = el('button', { class: 'btn btn--secondary plan-clear', type: 'button', onclick: actions.clear }, 'Убрать дату');

  if (s.state === 'none') {
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel__title' }, 'Когда твой экзамен в ГИБДД?'),
        el('p', { class: 'rewards__line' }, 'Укажи дату — игра составит план на каждый день. Сначала все новые вопросы — заранее, а оставшееся время до экзамена — закрепление: повторение пройденного, где были ошибки, и пробные экзамены.'),
        el('p', { class: 'panel__note' }, 'Повторы ошибок сожмутся под дату: все три повтора успеют до экзамена. Дату можно изменить или убрать.'),
        dateForm(now, undefined, 'Составить план', actions.setDate),
      ),
    );
    return root;
  }

  const date = dateLabel(s.date!);
  if (s.state === 'active') {
    const left = s.daysLeft!;
    root.append(
      el(
        'section',
        { class: 'panel plan-head' },
        el('p', { class: 'big-number' }, left === 1 ? 'Завтра' : String(left), el('span', {}, left === 1 ? `экзамен в ГИБДД, ${date}` : `${plural(left, ['день', 'дня', 'дней'])} до экзамена в ГИБДД, ${date}`)),
      ),
      todayPanel(data, now, actions),
      forecastPanel(s, now),
      howPanel(s, now),
      el('div', { class: 'menu__row plan-edit' }, editButton('Изменить дату'), clearButton),
      editing,
    );
  } else if (s.state === 'today') {
    root.append(
      el(
        'section',
        { class: 'panel plan-head' },
        el('p', { class: 'big-number' }, 'Сегодня 🍀', el('span', {}, `экзамен в ГИБДД, ${date}`)),
        el('p', { class: 'rewards__line' }, 'Удачи! Читай каждый вопрос до конца и смотри на картинку внимательно — время на экзамене есть.'),
        s.unfixable ? el('p', { class: 'panel__note' }, `Ещё не закреплено: ${mistakes(s.unfixable)}. Повтори их перед экзаменом.`) : null,
      ),
      // В день экзамена новых вопросов и пробных экзаменов нет: план — только повторы, если они есть.
      ...(planDay(data, now)?.reviews.target ? [todayPanel(data, now, actions)] : []),
      el('section', { class: 'panel' }, el('h2', { class: 'panel__title' }, 'Экзамен уже позади?'), el('p', { class: 'panel__note' }, 'Отметь результат — игра запомнит его вместе с готовностью в этот день.'), resultButtons(actions)),
      el('div', { class: 'menu__row plan-edit' }, editButton('Изменить дату'), clearButton),
      editing,
    );
  } else if (s.state === 'ask') {
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('h2', { class: 'panel__title' }, `Как прошёл экзамен ${date}?`),
        el('p', { class: 'rewards__line' }, `Отметь результат — игра запомнит его вместе с готовностью${readinessNow === undefined ? '' : `: сейчас она ${readinessNow}%`}. Так видно, насколько готовность в игре совпадает с настоящим экзаменом.`),
        resultButtons(actions),
      ),
      el('p', { class: 'panel__note plan-note' }, 'Экзамен перенесли? Укажи новую дату — план пересчитается.'),
      el('div', { class: 'menu__row plan-edit' }, editButton('Новая дата'), clearButton),
      editing,
    );
  } else {
    const r = s.result!;
    root.append(
      el(
        'section',
        { class: 'panel' },
        el('p', { class: `banner banner--${r.passed ? 'ok' : 'bad'} plan-result` }, r.passed ? `Экзамен ${date} сдан! 🎉` : `Экзамен ${date} не сдан`),
        el('p', { class: 'big-number' }, `${r.readiness}%`, el('span', {}, 'готовность в игре в тот день')),
        el(
          'p',
          { class: 'rewards__line' },
          r.passed ? 'Поздравляем! Теория позади.' : 'Не беда: укажи дату пересдачи — план пересчитается под неё.',
        ),
        r.passed ? el('button', { class: 'btn btn--secondary', type: 'button', onclick: actions.share }, 'Поделиться') : null,
      ),
      el('div', { class: 'menu__row plan-edit' }, editButton(r.passed ? 'Новая дата' : 'Дата пересдачи'), clearButton),
      editing,
    );
  }
  return root;
}

/** Ссылка на «Мой экзамен» для экрана экзамена и прогресса: дата и план на сегодня или приглашение указать дату. */
export function planLink(data: ProgressData, now: number, open: () => void): HTMLElement {
  const s = planSummary(data, now);
  const day = s.state === 'active' || s.state === 'today' ? planDay(data, now) : undefined;
  const tasks = day ? [day.fresh, day.reviews, day.exams].filter((t) => t.target > 0) : [];
  const done = tasks.filter((t) => t.done >= t.target).length;
  const text =
    s.state === 'none'
      ? 'Когда твой экзамен в ГИБДД? Укажи дату — игра составит план по дням.'
      : s.state === 'ask'
        ? `Как прошёл экзамен ${dateLabel(s.date!)}? Отметь результат.`
        : s.state === 'done'
          ? `Экзамен ${dateLabel(s.date!)}: ${s.result!.passed ? 'сдан' : 'не сдан'}, готовность в тот день — ${s.result!.readiness}%.`
          : `Экзамен в ГИБДД ${countdownLabel(s)}, ${dateLabel(s.date!)}.${tasks.length ? ` План на сегодня: ${done} из ${tasks.length}.` : ''}`;
  return el('button', { class: 'tip plan-link', type: 'button', onclick: open }, el('span', {}, `📅 ${text}`), el('span', { class: 'tip__go', 'aria-hidden': 'true' }, '→'));
}
