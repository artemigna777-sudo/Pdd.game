/**
 * Таблица лидеров: по опыту и по заработанным монетам, общая для всех игроков (`board/board.ts`).
 * В ней все сразу — под ником вроде «user_1652», своё имя можно вписать здесь же.
 */
import { BOARD, boardName, cleanBoardName, fetchBoard, playerId, syncPlayer, type BoardBy, type BoardResult, type SendResult } from '../board/board.ts';
import { loadQuestions } from '../data/questions.ts';
import { allExams } from '../exam/examHistory.ts';
import { coinsEarned } from '../progress/earned.ts';
import { levelOf, progress } from '../progress/progress.ts';
import { readiness } from '../progress/readiness.ts';
import { getSettings, updateSettings } from '../settings.ts';
import { statsActive, trackEvent } from '../stats/track.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';
import { showToast } from './toast.ts';

/**
 * Сообщить посреднику опыт, заработанные монеты и (если статистика включена) готовность — раз в
 * несколько часов или сразу (`force`).
 */
export function syncMe(force = false): Promise<SendResult | 'skipped'> {
  const data = progress();
  return syncPlayer({
    xp: data.xp,
    coins: coinsEarned(data),
    force,
    // Готовность нужна только статистике автора: если игрок её выключил — не считается и не уходит.
    ready: async () => (statsActive() ? readiness(progress(), await loadQuestions(), allExams(), Date.now()).percent : undefined),
  });
}

/** Число с пробелами между разрядами: 12 300. */
const num = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, ' ');

const MEDALS = ['🥇', '🥈', '🥉'];

function row(place: number, name: string, value: number, by: BoardBy, me: boolean): HTMLElement {
  return el(
    'li',
    { class: `board__row${me ? ' is-me' : ''}`, ...(me ? { 'aria-current': 'true' } : {}) },
    el('span', { class: 'board__place', 'aria-label': `${place} место` }, MEDALS[place - 1] ?? String(place)),
    el('span', { class: 'board__name' }, name, me ? el('span', { class: 'board__you' }, ' — ты') : null),
    by === 'xp' ? el('span', { class: 'board__level' }, `ур. ${levelOf(value).number}`) : null,
    el('span', { class: 'board__value' }, `${num(value)}${by === 'xp' ? '' : ' 🪙'}`),
  );
}

/** Экран таблицы лидеров. */
export function boardView(): HTMLElement {
  let by: BoardBy = 'xp';
  let busy = false;
  const tabs = (['xp', 'coins'] as const).map((b) =>
    el('button', { class: 'segment__btn', type: 'button', 'aria-pressed': String(b === by), onclick: () => select(b) }, b === 'xp' ? '⭐ Опыт' : '🪙 Монеты'),
  );
  const note = el('p', { class: 'board__note' });
  const me = el('div', { class: 'board__me' });
  const list = el('div', { class: 'board__list', 'aria-live': 'polite' });
  const root = el(
    'div',
    { class: 'board' },
    me,
    el('div', { class: 'segment board__tabs', role: 'group', 'aria-label': 'Таблица по' }, ...tabs),
    note,
    list,
  );

  const select = (b: BoardBy) => {
    by = b;
    tabs.forEach((t, i) => t.setAttribute('aria-pressed', String((['xp', 'coins'] as const)[i] === by)));
    void show();
  };

  const offline = (text: string) =>
    list.replaceChildren(
      el('p', { class: 'board__empty' }, text),
      el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void show() }, 'Попробовать ещё раз'),
    );

  /** Своя карточка: имя в таблице, место и «Сменить имя». */
  const renderMe = (result?: BoardResult) => {
    const own = cleanBoardName(getSettings().boardName);
    const place = result?.me;
    const name = place?.name || boardName();
    me.replaceChildren(
      el(
        'div',
        { class: 'panel board__mine' },
        el('strong', {}, name ? `Ты в таблице как «${name}»` : 'Ты в таблице'),
        place && result ? el('p', { class: 'board__place-line' }, `${place.place}-е место из ${result.total} · ${num(place.value)} ${result.by === 'xp' ? 'опыта' : plural(place.value, ['монета', 'монеты', 'монет'])}`) : null,
        own ? null : el('p', { class: 'board__hint' }, 'Этот ник выдан случайно и ни у кого не повторяется. Можно вписать своё имя — его увидят все игроки.'),
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => renameForm() }, 'Сменить имя'),
      ),
    );
  };

  const renameForm = () => {
    const input = el('input', {
      class: 'field__input',
      type: 'text',
      maxlength: BOARD.nameMax,
      autocomplete: 'nickname',
      placeholder: 'Например, Маша',
      value: cleanBoardName(getSettings().boardName || getSettings().name),
      'aria-label': 'Имя в таблице',
    }) as HTMLInputElement;
    const save = el('button', { class: 'btn btn--primary', type: 'button' }, 'Сохранить имя');
    save.onclick = () => void rename(input.value, save);
    me.replaceChildren(
      el(
        'div',
        { class: 'panel board__join' },
        el('label', { class: 'field' }, el('span', { class: 'field__label' }, 'Имя в таблице'), input),
        el('p', { class: 'board__hint' }, 'Его увидят все игроки вместе с твоим опытом и монетами.'),
        save,
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void show() }, 'Отмена'),
      ),
    );
    input.focus();
  };

  /** Сменить имя: его проверяет посредник, без связи — не получится. */
  const rename = async (raw: string, button: HTMLButtonElement) => {
    const name = cleanBoardName(raw);
    if (!name) {
      showToast('Напиши имя — его увидят в таблице.');
      return;
    }
    if (busy) return;
    busy = true;
    button.disabled = true;
    const before = getSettings().boardName;
    updateSettings({ boardName: name });
    const res = await syncMe(true);
    busy = false;
    button.disabled = false;
    if (res !== 'ok') {
      updateSettings({ boardName: before });
      showToast(res === 'name' ? 'Такое имя нельзя показать в таблице — выбери другое.' : 'Нет связи с таблицей лидеров — попробуй позже.');
      return;
    }
    if (!before) trackEvent('board-name', 'Таблица лидеров: ввели своё имя');
    showToast('Имя в таблице изменено.');
    void show();
  };

  /** Загрузить таблицу (перед этим — отправить свои числа, чтобы место было свежим). */
  const show = async () => {
    note.textContent = by === 'xp' ? 'Опыт за всё время: за ответы, точки, главы и экзамены.' : 'Монеты, заработанные за всё время: покупки в магазине место не уменьшают.';
    renderMe();
    list.replaceChildren(el('p', { class: 'board__empty' }, 'Загружаю таблицу…'));
    const asked = by;
    await syncMe(true);
    const result = await fetchBoard(asked, playerId());
    if (asked !== by) return;
    if (result === 'offline' || result === 'error') {
      offline(result === 'offline' ? 'Нет связи с таблицей лидеров. Проверь интернет и попробуй ещё раз.' : 'Таблица лидеров сейчас недоступна. Попробуй чуть позже.');
      return;
    }
    renderMe(result);
    if (!result.top.length) {
      list.replaceChildren(el('p', { class: 'board__empty' }, 'Пока в таблице никого — стань первым!'));
      return;
    }
    const rows = result.top.map((r, i) => row(i + 1, r.name, r.value, by, !!r.me));
    const mine = result.me && !result.top.some((r) => r.me) ? [el('li', { class: 'board__gap', 'aria-hidden': 'true' }, '…'), row(result.me.place, result.me.name || boardName(), result.me.value, by, true)] : [];
    list.replaceChildren(
      el('ol', { class: 'board__rows' }, ...rows, ...mine),
      el('p', { class: 'board__total' }, `В таблице ${result.total} ${plural(result.total, ['игрок', 'игрока', 'игроков'])}`),
    );
  };

  void show();
  return root;
}
