/**
 * «Моя история» (этап 17): характер водителя, команда с сердечками, принятые решения,
 * «Вернуть решение» за монеты и галерея концовок.
 */
import { playSound } from '../audio/feedback.ts';
import type { ProgressData } from '../progress/progress.ts';
import { GENA_DISCOUNT, endingScene, rewind, storyContext } from '../progress/storyProgress.ts';
import { HEARTS_MAX, HEROES, REWIND_PRICE, TRAITS, TRAIT_IDS, TRAIT_MAX, characterTitle, check, lastBigDecision, type HeroId } from '../story/plot.ts';
import { CHARACTERS } from '../story/story.ts';
import { DECISIONS, ENDINGS, PLOT } from '../story/turbo.ts';
import { avatar, playCutscene, showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { showToast } from './toast.ts';

/** Что даёт дружба: подпись под героем. */
const PERKS: Partial<Record<HeroId, string>> = {
  gena: `от ${GENA_DISCOUNT.hearts} ♥ — скидка ${GENA_DISCOUNT.share * 100}% в гараже`,
};

const chapterNumber = (id: string) => Number(id.replace(/\D/g, ''));

function hearts(n: number): HTMLElement {
  return el('span', { class: 'hearts', role: 'img', 'aria-label': `${n} из ${HEARTS_MAX} сердечек` }, ...Array.from({ length: HEARTS_MAX }, (_, i) => el('span', { class: i < n ? 'is-on' : '' }, i < n ? '♥' : '♡')));
}

/** `onChange` — после «Вернуть решение» (сохранить прогресс). */
export function storyView(data: ProgressData, onChange: () => void): HTMLElement {
  const root = el('div', { class: 'story' });

  const render = () => {
    const ctx = storyContext(data);
    const decided = (data.story?.choices ?? []).flatMap((c) => {
      const d = DECISIONS.find((x) => x.id === c.id);
      const o = d?.options.find((x) => x.value === c.value);
      return d && o ? [{ d, o }] : [];
    });

    // ─── Характер ─────────────────────────────────────────────────────────────
    const traits = el(
      'ul',
      { class: 'skill-bars' },
      ...TRAIT_IDS.map((t) => {
        const fill = el('span', { class: 'skill-bar__fill' });
        fill.style.width = `${Math.round((ctx.traits[t] / TRAIT_MAX) * 100)}%`;
        return el(
          'li',
          { class: 'skill-bar', 'data-trait': t },
          el('span', { class: 'skill-bar__name' }, `${TRAITS[t].icon} ${TRAITS[t].title}`),
          el('span', { class: 'skill-bar__track', role: 'img', 'aria-label': `${ctx.traits[t]} из ${TRAIT_MAX}` }, fill),
          el('span', { class: 'skill-bar__value' }, `${ctx.traits[t]} из ${TRAIT_MAX}`),
        );
      }),
    );
    const character = el(
      'section',
      { class: 'panel story__character' },
      el('h2', { class: 'section-title' }, 'Характер водителя'),
      el('p', { class: 'story__title' }, characterTitle(ctx.traits)),
      traits,
      el('p', { class: 'panel__note' }, 'Характер складывается из решений в сюжете. Герои замечают его и вспоминают твои поступки.'),
    );

    // ─── Команда ──────────────────────────────────────────────────────────────
    const team = el(
      'ul',
      { class: 'team' },
      ...HEROES.map((h) => {
        const perk = PERKS[h];
        return el(
          'li',
          { class: 'team__hero', 'data-hero': h },
          avatar(h, 'avatar--small'),
          el(
            'span',
            { class: 'team__who' },
            el('span', { class: 'team__name' }, CHARACTERS[h].name),
            el('span', { class: 'team__role' }, CHARACTERS[h].role),
            perk ? el('span', { class: `team__perk${check({ bond: h, min: GENA_DISCOUNT.hearts }, ctx) ? ' is-on' : ''}` }, perk) : '',
          ),
          hearts(ctx.bonds[h]),
        );
      }),
    );
    const teamPanel = el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'section-title' }, 'Команда'),
      team,
      el('p', { class: 'panel__note' }, 'Сердечки — за решения в сюжете и выполненные поручения. Высокие отношения открывают новые варианты ответа и помощь героев.'),
    );

    // ─── Решения ──────────────────────────────────────────────────────────────
    const decisions = el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'section-title' }, 'Решения'),
      decided.length
        ? el(
            'ol',
            { class: 'story__decisions' },
            ...decided.map(({ d, o }) =>
              el('li', { class: d.big ? 'is-big' : '' }, el('span', { class: 'story__chapter' }, `Глава ${chapterNumber(d.chapter)}${d.big ? ' · большая развилка' : ''}`), el('b', {}, d.title), el('span', {}, ` — ${o.summary}`)),
            ),
          )
        : el('p', { class: 'panel__note' }, 'Решений пока нет. Они встречаются в сюжетных сценах глав.'),
    );

    // ─── Вернуть решение ──────────────────────────────────────────────────────
    const last = lastBigDecision(data.story, PLOT);
    const rewindPanel = el('section', { class: 'panel story__rewind' }, el('h2', { class: 'section-title' }, 'Вернуть решение'));
    if (!last) {
      rewindPanel.append(el('p', { class: 'panel__note' }, `Можно переиграть последнюю большую развилку (главы 3, 6 и 9) за 🪙 ${REWIND_PRICE}. Пока таких развилок не было.`));
    } else {
      const now = last.decision.options.find((o) => o.value === last.value);
      const others = last.decision.options.filter((o) => o.value !== last.value && check(o.when, ctx));
      rewindPanel.append(
        el('p', {}, `Глава ${chapterNumber(last.decision.chapter)}: «${last.decision.title}». Сейчас — ${now?.summary ?? ''}.`),
        el('p', { class: 'panel__note' }, `Переиграть за 🪙 ${REWIND_PRICE} (у тебя ${data.coins}). Если история уже пройдена, концовка сменится сразу.`),
        ...others.map((o) =>
          el(
            'button',
            {
              class: 'btn btn--secondary',
              type: 'button',
              onclick: () =>
                void showModal(
                  'Вернуть решение?',
                  el('p', {}, `«${o.label}» вместо «${now?.label ?? ''}». Это стоит 🪙 ${REWIND_PRICE}.`),
                  [
                    {
                      label: `Вернуть за 🪙 ${REWIND_PRICE}`,
                      primary: true,
                      onClick: () => {
                        const result = rewind(data, o.value, Date.now());
                        if (!result.ok) {
                          if (result.reason === 'coins') showToast(`Не хватает монет: нужно ${REWIND_PRICE}, есть ${data.coins}.`);
                          return;
                        }
                        onChange();
                        playSound('reward');
                        render();
                        if (result.ending) {
                          const { ending, fresh } = result.ending;
                          void playCutscene(endingScene(ending), { last: 'Конец' }).then(() => {
                            if (fresh) showToast(`${ending.icon} Открыта концовка «${ending.title}»`);
                            render();
                          });
                        } else showToast('Решение изменено. Герои запомнят новый выбор.');
                      },
                    },
                    { label: 'Отмена' },
                  ],
                ),
            },
            `${o.label} · 🪙 ${REWIND_PRICE}`,
          ),
        ),
      );
    }

    // ─── Галерея концовок ─────────────────────────────────────────────────────
    const open = data.story?.endings ?? {};
    const count = ENDINGS.filter((e) => open[e.id] !== undefined).length;
    const gallery = el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'section-title' }, `Галерея концовок · ${count} из ${ENDINGS.length}`),
      el(
        'ul',
        { class: 'endings' },
        ...ENDINGS.map((e) => {
          const got = open[e.id] !== undefined;
          const secret = e.id === 'secret' && !got;
          return el(
            'li',
            { class: `ending${got ? ' is-open' : ''}`, 'data-ending': e.id },
            el('span', { class: 'ending__icon', 'aria-hidden': 'true' }, got ? e.icon : '🔒'),
            el('span', { class: 'ending__body' }, el('b', {}, secret ? '???' : e.title), el('span', { class: 'ending__hint' }, got ? `Открыта ${new Date(open[e.id]).toLocaleDateString('ru-RU')}` : e.hint)),
            got ? el('button', { class: 'btn btn--secondary ending__play', type: 'button', onclick: () => void playCutscene(endingScene(e), { last: 'Конец' }) }, 'Смотреть') : '',
          );
        }),
      ),
      el('p', { class: 'panel__note' }, 'Концовка открывается, когда сдан экзамен-босс. Другие концовки — через «Вернуть решение».'),
    );

    root.replaceChildren(character, teamPanel, decisions, rewindPanel, gallery);
  };
  render();
  return root;
}
