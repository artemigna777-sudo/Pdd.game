/**
 * «Наверстать историю» (этап 17): развилки «Турбо-Доставки» из сцен, которые игрок уже видел, —
 * у тех, кто прошёл главы до обновления. Развилки идут по порядку, как воспоминания; каждый выбор
 * сразу записывается и меняет отношения, характер и концовку.
 */
import { playSound } from '../audio/feedback.ts';
import { progress, saveProgress } from '../progress/progress.ts';
import { finishStory, missedDecisions, recordDecision, storyContext } from '../progress/storyProgress.ts';
import { decisionLines, type Ending } from '../story/plot.ts';
import type { Line } from '../story/story.ts';
import { playCutscene } from './cutscene.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';
import { showToast } from './toast.ts';

const chapterNumber = (id: string) => Number(id.replace(/\D/g, ''));

/** Сколько решений ждёт (по нынешним решениям; после выбора могут открыться новые). */
export const missedCount = (): number => missedDecisions(progress()).length;

/** Пройти пропущенные развилки. Возвращает, сколько решений принято; закрыли сцену — останавливается. */
export async function catchUpStory(): Promise<number> {
  let made = 0;
  for (;;) {
    const data = progress();
    const next = missedDecisions(data)[0];
    if (!next) break;
    const lines = decisionLines(next, storyContext(data));
    if (!lines.length) break;
    const head: Line[] = [
      ...(made === 0
        ? [{ who: 'narrator' as const, text: '⏪ Эти главы пройдены до того, как в Светофорске появилась «Турбо-Доставка». Вспомним, как всё было: решения изменят отношения с командой, характер и концовку.' }]
        : []),
      { who: 'narrator', text: `Глава ${chapterNumber(next.chapter)}. ${next.title}` },
    ];
    await playCutscene([...head, ...lines], {
      last: 'Дальше',
      onChoice: (line, value) => {
        if (line.decision && recordDecision(progress(), line.decision, value, Date.now())) saveProgress();
      },
    });
    // Сцену закрыли, не выбрав, — остальное подождёт.
    if (storyContext(progress()).decisions[next.id] === undefined) break;
    made++;
  }
  if (!made) return 0;
  playSound('reward');
  const data = progress();
  // История уже пройдена — концовка по новым решениям попадает в галерею.
  const ending: { ending: Ending; fresh: boolean } | undefined = data.finale.exam !== undefined ? finishStory(data, Date.now()) : undefined;
  saveProgress();
  if (ending?.fresh) showToast(`${ending.ending.icon} Открыта концовка «${ending.ending.title}» — смотри в галерее.`);
  else showToast(missedCount() ? `Решений принято: ${made}. Остальные ждут в «Моей истории».` : `Решений принято: ${made}. История наверстана — герои всё помнят.`);
  return made;
}

/** Плашка «Наверстать историю» (в «Моей истории» и в «Главах»); undefined — наверстывать нечего. */
export function catchUpPanel(after: () => void): HTMLElement | undefined {
  const count = missedCount();
  if (!count) return undefined;
  return el(
    'section',
    { class: 'panel story__catchup' },
    el('h2', { class: 'section-title' }, '⏪ Наверстать историю'),
    el('p', {}, `В пройденных главах появились развилки сюжета «Турбо-Доставка»: ${count} ${plural(count, ['решение ждёт', 'решения ждут', 'решений ждут'])}. От них зависят сердечки команды, характер водителя и концовка.`),
    el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => void catchUpStory().then(after) }, 'Вспомнить и решить'),
  );
}
