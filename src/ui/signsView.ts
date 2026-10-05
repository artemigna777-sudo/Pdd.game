/**
 * Знакодекс (этап 11): альбом знаков по группам, карточка знака и сообщение о новом знаке.
 */
import type { ProgressData } from '../progress/progress.ts';
import { STICKERS } from '../progress/garage.ts';
import { RARITY_LABEL, groupStates, openSigns, rarityOf, type GroupState, type SignEntry, type SignsData } from '../signs/signs.ts';
import { showModal } from './cutscene.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';

let dataPromise: Promise<SignsData> | undefined;

/** Знаки (data/signs.json) — отдельным файлом, загружаются при первом обращении. */
export function loadSigns(): Promise<SignsData> {
  dataPromise ??= import('../../data/signs.json').then((m) => m.default as unknown as SignsData);
  return dataPromise;
}

const signUrl = (sign: SignEntry) => (sign.image ? import.meta.env.BASE_URL + sign.image : undefined);
/** «в 1 вопросе», «в 3 вопросах». */
const inQuestions = (n: number) => `в ${n} ${plural(n, ['вопросе', 'вопросах', 'вопросах'])}`;
const stickerName = (id: string) => STICKERS.find((s) => s.id === id)?.name ?? id;

/** Картинка знака; если в наборе картинки нет — табличка с номером. */
function signPicture(sign: SignEntry, cls: string): HTMLElement {
  const url = signUrl(sign);
  if (url) return el('img', { class: cls, src: url, alt: '', loading: 'lazy', decoding: 'async' });
  return el('span', { class: `${cls} sign-plate`, 'aria-hidden': 'true' }, sign.number);
}

export interface SignsActions {
  /** Тренировка вопросов знака («Найти»). */
  find: (sign: SignEntry) => void;
  /** Забрать награду за группу. */
  claim: (groupId: string) => void;
}

function rewardLine(g: GroupState, claim: (id: string) => void): HTMLElement {
  const prize = `🪙 ${g.group.coins}${g.group.sticker ? ` и наклейка «${stickerName(g.group.sticker)}»` : ''}`;
  if (g.claimed) return el('p', { class: 'signs-group__reward is-claimed' }, `Награда получена: ${prize} ✓`);
  if (g.complete) return el('button', { class: 'btn btn--primary signs-group__claim', type: 'button', onclick: () => claim(g.group.id) }, `Забрать награду: ${prize}`);
  return el('p', { class: 'signs-group__reward' }, `За всю группу: ${prize}`);
}

/** Карточка знака: большая картинка, название, описание из набора, «Найти». */
export function openSignCard(sign: SignEntry, open: boolean, source: SignsData['source'], find: () => void): void {
  const rarity = rarityOf(sign);
  const body = el(
    'div',
    { class: `sign-card is-${rarity}${open ? '' : ' is-locked'}` },
    signPicture(sign, 'sign-card__img'),
    el('p', { class: 'sign-card__meta' }, `${open ? `${sign.number}${sign.variants ? ` (${sign.variants.join(', ')})` : ''} · ` : ''}${RARITY_LABEL[rarity]} · ${inQuestions(sign.questions.length)}`),
  );
  if (open) {
    if (sign.text) body.append(el('p', { class: 'sign-card__text' }, sign.text));
    body.append(
      el(
        'p',
        { class: 'sign-card__source' },
        sign.text ? 'Описание и картинка: ' : 'Картинка: ',
        el('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.name),
      ),
    );
  } else {
    body.append(el('p', { class: 'sign-card__text' }, `Знак откроется, когда ответишь верно на вопрос, где он есть. Он встречается ${inQuestions(sign.questions.length)}.`));
  }
  void showModal(open ? sign.title : 'Закрытый знак', body, [
    { label: open ? 'Потренировать вопросы' : 'Найти', primary: !open, onClick: find },
    { label: 'Закрыть', primary: open },
  ]);
}

/** Альбом: сколько собрано, группы с прогрессом и наградой, сетка знаков. */
export function signsView(data: ProgressData, signsData: SignsData, a: SignsActions): HTMLElement {
  const { signs } = signsData;
  const open = openSigns(data, signs);
  const groups = groupStates(data, signs);
  const tile = (sign: SignEntry) => {
    const isOpen = open.has(sign.number);
    const rarity = rarityOf(sign);
    return el(
      'button',
      {
        class: `sign-tile is-${rarity}${isOpen ? '' : ' is-locked'}`,
        type: 'button',
        'aria-label': isOpen ? `${sign.number} ${sign.title}, ${RARITY_LABEL[rarity].toLowerCase()}` : `Закрытый знак, ${RARITY_LABEL[rarity].toLowerCase()}, ${inQuestions(sign.questions.length)}`,
        onclick: () => openSignCard(sign, isOpen, signsData.source, () => a.find(sign)),
      },
      signPicture(sign, 'sign-tile__img'),
      el('span', { class: 'sign-tile__num' }, isOpen ? sign.number : '?'),
      el('span', { class: 'sign-tile__title' }, isOpen ? sign.title : inQuestions(sign.questions.length)),
    );
  };
  const total = signs.length;
  return el(
    'div',
    { class: 'signs' },
    el(
      'section',
      { class: 'panel signs-head' },
      el('p', { class: 'big-number' }, `${open.size} из ${total}`, el('span', {}, 'знаков в альбоме')),
      el('p', { class: 'panel__note' }, 'Знаки из билетов ПДД. Знак открывается, когда ответишь верно на вопрос, где он есть: в городе, в билетах, на экзамене или в дуэли.'),
      el('span', { class: 'bar', role: 'img', 'aria-label': `Собрано знаков: ${open.size} из ${total}` }, el('span', { class: 'bar__fill', style: `width:${(open.size / total) * 100}%` })),
      el(
        'p',
        { class: 'signs-legend' },
        el('span', { class: 'signs-legend__item is-common' }, 'Обычный — в 4+ вопросах'),
        el('span', { class: 'signs-legend__item is-uncommon' }, 'Необычный — в 2–3'),
        el('span', { class: 'signs-legend__item is-rare' }, 'Редкий — в одном'),
      ),
    ),
    ...groups.map((g) =>
      el(
        'section',
        { class: `signs-group${g.complete ? ' is-complete' : ''}`, 'aria-label': g.group.title },
        el('h2', { class: 'section-title signs-group__title' }, el('span', {}, g.group.title), el('span', { class: 'signs-group__count' }, `${g.open} / ${g.signs.length}`)),
        el('span', { class: 'bar signs-group__bar', 'aria-hidden': 'true' }, el('span', { class: 'bar__fill', style: `width:${(g.open / g.signs.length) * 100}%` })),
        rewardLine(g, a.claim),
        el('div', { class: 'signs-grid' }, ...g.signs.map(tile)),
      ),
    ),
    el(
      'p',
      { class: 'signs-source' },
      'Названия, картинки и описания знаков — из открытого набора ',
      el('a', { href: signsData.source.url, target: '_blank', rel: 'noopener' }, signsData.source.name),
      '.',
      signsData.missing.length
        ? ` В наборе нет ${signsData.missing.length} ${plural(signsData.missing.length, ['знака', 'знаков', 'знаков'])} из билетов (${signsData.missing.map((m) => m.number).join(', ')}), поэтому их нет и в альбоме.`
        : '',
    ),
  );
}

// ─── Сообщение о новом знаке ─────────────────────────────────────────────────────

let chipTimer = 0;

/** Короткое сообщение вверху экрана: новый знак (или несколько) и собранная группа. */
export function showSignChip(fresh: readonly SignEntry[], completed: readonly string[]): void {
  const root = document.getElementById('sign-chip');
  if (!root || (!fresh.length && !completed.length)) return;
  window.clearTimeout(chipTimer);
  const first = fresh[0];
  const text = completed.length
    ? `${completed.length === 1 ? 'Группа знаков собрана' : 'Группы знаков собраны'}: ${completed.join(', ')}! Награда ждёт в Знакодексе.`
    : fresh.length === 1
      ? `Новый знак в Знакодексе: ${first.number} «${first.title}»`
      : `Новые знаки в Знакодексе: ${fresh.length}`;
  root.replaceChildren(first ? signPicture(first, 'sign-chip__img') : el('span', { class: 'sign-chip__icon', 'aria-hidden': 'true' }, '🏆'), el('span', { class: 'sign-chip__text' }, text));
  root.classList.add('is-visible');
  root.onclick = () => root.classList.remove('is-visible');
  chipTimer = window.setTimeout(() => root.classList.remove('is-visible'), completed.length ? 5000 : 3500);
}

/**
 * Следить за прогрессом и отмечать новые знаки и собранные группы — где бы ни был ответ:
 * в городе, в билетах, на экзамене (после него), в дуэли.
 */
export function watchNewSigns(progress: () => ProgressData, onChange: (fn: () => void) => void, sound: () => void): void {
  void loadSigns().then((d) => {
    let known = openSigns(progress(), d.signs);
    const complete = new Set(groupStates(progress(), d.signs).filter((g) => g.complete).map((g) => g.group.id));
    onChange(() => {
      const data = progress();
      const now = openSigns(data, d.signs);
      const fresh = d.signs.filter((s) => now.has(s.number) && !known.has(s.number));
      known = now;
      const groups = groupStates(data, d.signs).filter((g) => g.complete && !complete.has(g.group.id));
      groups.forEach((g) => complete.add(g.group.id));
      const unclaimed = groups.filter((g) => !g.claimed).map((g) => `«${g.group.title}»`);
      if (fresh.length || unclaimed.length) showSignChip(fresh, unclaimed);
      if (unclaimed.length) sound();
    });
  });
}
