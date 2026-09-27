/**
 * Показ прогресса: уровень и опыт, звёзды, экран «Прогресс» (вопросы, главы, темы, слабые
 * темы) и сводка «Разбора ошибок».
 */
import type { Question } from '../data/types.ts';
import {
  REVIEW_DAYS,
  chapterResult,
  dueReviews,
  isUnlocked,
  levelOf,
  nextReview,
  percent,
  reviewQueue,
  reviewStages,
  topicStats,
  weakTopics,
  type LevelInfo,
  type ProgressData,
  type TopicStat,
} from '../progress/progress.ts';
import { chapterInfo, type Mapping } from '../world/mapping.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

export const starsText = (stars: number): string => '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));

const nbsp = (s: string) => s.replace(/ /g, ' ');
const questionsWord = (n: number) => `${n} ${plural(n, ['вопрос', 'вопроса', 'вопросов'])}`;

/** Полоска с долей (0…1). */
function bar(share: number, tone?: string, label?: string): HTMLElement {
  const fill = el('span', { class: `bar__fill${tone ? ` bar__fill--${tone}` : ''}` });
  fill.style.width = `${Math.max(0, Math.min(1, share)) * 100}%`;
  return el('span', { class: 'bar', role: label ? 'img' : undefined, 'aria-label': label }, fill);
}

const toneOfShare = (share: number) => (share >= 0.8 ? 'ok' : share >= 0.5 ? 'warn' : 'bad');

/** Уровень водителя: номер, звание, полоска опыта до следующего уровня. */
export function levelMeter(level: LevelInfo, xp: number, compact = false): HTMLElement {
  const share = level.to ? (xp - level.from) / (level.to - level.from) : 1;
  const caption = level.to ? `${xp} / ${level.to} опыта` : `${xp} опыта · высший уровень`;
  return el(
    'div',
    { class: `level${compact ? ' level--compact' : ''}` },
    el('span', { class: 'level__num', 'aria-hidden': 'true' }, String(level.number)),
    el(
      'span',
      { class: 'level__body' },
      el('span', { class: 'level__title' }, `Уровень ${level.number} · ${level.title}`),
      bar(share, undefined, `Опыт: ${caption}`),
      el('span', { class: 'level__xp' }, caption),
    ),
  );
}

/** Дата повтора словами: «сегодня», «завтра», «через 3 дня», «5 октября». */
export function dueLabel(due: number, now: number): string {
  const days = Math.round((new Date(due).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'завтра';
  if (days < 7) return `через ${days} ${plural(days, ['день', 'дня', 'дней'])}`;
  return new Date(due).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export interface ProgressActions {
  train(topic: string): void;
  openChapter(id: string): void;
}

export function progressView(data: ProgressData, questions: readonly Question[], mapping: Mapping, actions: ProgressActions): HTMLElement {
  const total = questions.length;
  const answered = questions.filter((q) => data.questions[q.id]).length;
  const correct = questions.filter((q) => data.questions[q.id]?.ok).length;
  const wrong = answered - correct;
  const inReview = reviewQueue(data).length;
  const order = mapping.chapters.map((c) => c.id);

  const stacked = el(
    'span',
    { class: 'bar bar--stacked', role: 'img', 'aria-label': `Верно ${correct}, с ошибкой ${wrong}, не отвечено ${total - answered}` },
    el('span', { class: 'bar__fill bar__fill--ok', style: `width:${(correct / total) * 100}%` }),
    el('span', { class: 'bar__fill bar__fill--bad', style: `width:${(wrong / total) * 100}%` }),
  );

  const summary = el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, 'Вопросы базы'),
    el('p', { class: 'big-number' }, nbsp(`${answered} из ${total}`), el('span', {}, 'вопросов пройдено')),
    stacked,
    el(
      'ul',
      { class: 'legend' },
      el('li', { class: 'legend__ok' }, `Последний ответ верный: ${correct}`),
      el('li', { class: 'legend__bad' }, `С ошибкой: ${wrong}`),
      el('li', { class: 'legend__none' }, `Ещё не встречались: ${total - answered}`),
    ),
    el('p', { class: 'panel__note' }, `В работе над ошибками: ${questionsWord(inReview)}.`),
  );

  const chapters = el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, 'Главы'),
    el(
      'div',
      { class: 'rows' },
      ...mapping.chapters.map((c) => {
        const r = chapterResult(data, chapterInfo(mapping, c.id));
        const state = data.chapters[c.id];
        const open = isUnlocked(data, order, c.id);
        const status = state?.delivered ? `${starsText(state.stars)} · ${percent(r.share)}%` : open ? `точки ${r.pointsDone}/${r.points} · ${percent(r.share)}%` : 'закрыта';
        return el(
          'button',
          { class: 'row', type: 'button', disabled: !open, onclick: () => actions.openChapter(c.id) },
          el('span', { class: 'row__title' }, `${c.number}. ${c.title}`),
          el('span', { class: `row__value${state?.delivered ? ' row__value--stars' : ''}` }, status),
        );
      }),
    ),
  );

  const stats = topicStats(data, questions);
  const weak = weakTopics(stats);
  const topicRow = (t: TopicStat) =>
    el(
      'button',
      { class: 'topic', type: 'button', onclick: () => actions.train(t.topic), 'aria-label': `${t.topic}: ${t.answered ? `${percent(t.share)}% верных` : 'ещё нет ответов'}. Тренировать` },
      el('span', { class: 'topic__head' }, el('span', { class: 'topic__name' }, t.topic), el('span', { class: 'topic__pct' }, t.answered ? `${percent(t.share)}%` : '—')),
      bar(t.answered ? t.share : 0, t.answered ? toneOfShare(t.share) : undefined),
      el('span', { class: 'topic__meta' }, nbsp(`верно ${t.correct} из ${t.answered}`) + ' · ' + nbsp(`отвечено ${t.answered} из ${t.total}`)),
    );

  const weakPanel = el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, 'Слабые темы'),
    weak.length
      ? el('p', { class: 'panel__note' }, 'Меньше 80% верных ответов. Коснитесь темы, чтобы потренировать её вопросы: сначала те, где были ошибки.')
      : el('p', { class: 'panel__note' }, answered < 20 ? 'Пока мало ответов, чтобы найти слабые темы.' : 'Слабых тем нет: во всех темах от 80% верных.'),
    ...weak.map(topicRow),
  );

  const topics = el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, 'Все темы'),
    el('p', { class: 'panel__note' }, 'Процент — доля верных среди отвеченных вопросов темы (по последнему ответу).'),
    ...stats.map(topicRow),
  );

  return el('div', { class: 'progress-view' }, levelMeter(levelOf(data.xp), data.xp), summary, chapters, weakPanel, topics);
}

export interface ReviewActions {
  start(): void;
  practice(): void;
}

/** Сводка «Разбора ошибок»: что пора повторить сегодня и что ждёт своего дня. */
export function reviewView(data: ProgressData, now: number, actions: ReviewActions): HTMLElement {
  const due = dueReviews(data, now).length;
  const all = reviewQueue(data).length;
  const stages = reviewStages(data);
  const next = nextReview(data, now);
  const scheme = el(
    'p',
    { class: 'intro' },
    'Каждая ошибка возвращается на повтор через 1 день, потом через 3 дня и через 7 дней. Новая ошибка — снова через день. После трёх верных повторов вопрос считается закреплённым.',
  );
  if (!all) {
    return el('div', {}, scheme, el('div', { class: 'empty' }, el('p', {}, 'Ошибок, которые нужно закрепить, нет. Так держать!')));
  }
  const stageRows = REVIEW_DAYS.map((d, i) =>
    el('li', {}, `Повтор ${i + 1} из 3 (через ${d} ${plural(d, ['день', 'дня', 'дней'])}): ${questionsWord(stages[i])}`),
  );
  return el(
    'div',
    {},
    scheme,
    el(
      'section',
      { class: 'panel' },
      el('p', { class: 'big-number' }, String(due), el('span', {}, `${plural(due, ['вопрос', 'вопроса', 'вопросов'])} пора повторить сегодня`)),
      el('p', { class: 'panel__note' }, `Всего в работе над ошибками: ${questionsWord(all)}.`),
      next ? el('p', { class: 'panel__note' }, `Следующий повтор — ${dueLabel(next.due, now)}: ${questionsWord(next.count)}.`) : null,
      el('ul', { class: 'stages' }, ...stageRows),
    ),
    due
      ? el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: actions.start }, `Повторить сейчас (${due})`)
      : el('p', { class: 'intro' }, 'Сегодня повторять нечего — повторы появятся в свой день.'),
    el('button', { class: 'btn btn--secondary review__practice', type: 'button', onclick: actions.practice }, `Потренировать все ошибки (${all})`),
    el('p', { class: 'panel__note' }, 'Тренировка заранее полезна, но повтор засчитывается только в свой день.'),
  );
}
