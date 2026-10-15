/**
 * Оформление карточки вопроса: какое показывать, как надеть его на карточку и что сделать после
 * ответа (серия, подпись, звук, эффекты). Текст вопроса, картинка билета и варианты ответа
 * остаются оригинальными (правило 3): меняются только рамки, цвета, номера и украшения.
 */
import './fonts.css';
import './qthemes.css';
import { QTHEME_CLASSIC, activeQTheme, bumpQStreak, qStreakNow } from '../../progress/qthemes.ts';
import { progress, saveProgress } from '../../progress/progress.ts';
import { getSettings } from '../../settings.ts';
import { showToast } from '../toast.ts';
import { playEffects } from './fx.ts';
import { LOOKS, STREAK, url, type Look } from './looks.ts';
import { playThemeSfx } from './sfx.ts';

/**
 * Праздники включаются сами, но не в автотестах: иначе тесты зависели бы от даты запуска.
 * Тест оформлений включает их явно (`window.__holidays`, только в режиме разработки).
 */
function holidaysAllowed(): boolean {
  if (!getSettings().holidays) return false;
  if (!navigator.webdriver) return true;
  return import.meta.env.DEV && Boolean((window as unknown as { __holidays?: boolean }).__holidays);
}

/** Что показал бы «Авто»: праздник, тема города или обычная карточка. */
export function autoQTheme(): string {
  const data = progress();
  const id = activeQTheme({ ...data, garage: { ...data.garage, qtheme: undefined } }, { holidays: holidaysAllowed(), now: new Date() });
  return LOOKS[id] ? id : QTHEME_CLASSIC;
}

/** Какое оформление сейчас у карточек вопросов. */
export function currentQTheme(): string {
  const id = activeQTheme(progress(), { holidays: holidaysAllowed(), now: new Date() });
  return LOOKS[id] && id !== QTHEME_CLASSIC ? id : QTHEME_CLASSIC;
}

/** Картинки номеров вариантов: по кругу, у верного и ошибочного — свои. */
function paintNums(card: HTMLElement, look: Look): void {
  card.querySelectorAll<HTMLElement>('.option').forEach((b, i) => {
    const num = b.querySelector<HTMLElement>('.option__num');
    if (!num) return;
    const art = b.classList.contains('is-correct') ? look.numOk : b.classList.contains('is-wrong') ? look.numBad : look.nums?.[i % look.nums.length];
    num.style.backgroundImage = art ? url(art) : '';
  });
}

function streakEl(themeId: string, n: number, max: number): HTMLElement {
  const box = document.createElement('div');
  box.className = 'qstreak';
  const s = STREAK[themeId];
  if (!s || !max) return box;
  const art = document.createElement('div');
  art.className = 'qstreak__art';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = s.art(n);
  const label = document.createElement('div');
  label.className = 'qstreak__label';
  const b = document.createElement('b');
  b.textContent = `${n}/${max}`;
  label.append(`${s.label(n)} `, b);
  box.append(art, label);
  return box;
}

export interface ThemedCard {
  id: string;
  look: Look;
}

/**
 * Надеть оформление на карточку (`article.card` с готовым содержимым). `streak` — показать серию:
 * только там, где верен ли ответ, видно сразу (не на экзамене и не в разборе).
 */
export function dressCard(card: HTMLElement, themeId: string, opts: { streak: boolean }): ThemedCard | undefined {
  const look = LOOKS[themeId];
  if (!look || themeId === QTHEME_CLASSIC) return undefined;
  const body = document.createElement('div');
  body.className = 'qcard__body';
  body.dataset.case = `ДЕЛО № ${card.dataset.ticket ?? ''}-${card.dataset.number ?? ''}`;
  body.append(...Array.from(card.childNodes));
  const fx = document.createElement('div');
  fx.className = 'qfx';
  fx.setAttribute('aria-hidden', 'true');
  card.append(body, fx);
  card.classList.add('qcard');
  card.dataset.qt = themeId;
  for (const k of ['a', 'b', 'c'] as const) {
    const art = look.deco?.[k];
    if (art) card.style.setProperty(`--deco-${k}`, url(art));
  }
  if (opts.streak) {
    const { n, max } = qStreakNow(progress(), themeId);
    if (max) body.querySelector('.card__meta')?.after(streakEl(themeId, n, max));
  }
  paintNums(card, look);
  return { id: themeId, look };
}

/** Подсветить ответ в оформлении: галочка и крестик, номера, подпись к «Верно!» / «Неверно…». */
export function revealThemed(card: HTMLElement, t: ThemedCard, ok: boolean): void {
  card.classList.add(ok ? 'qt-ok' : 'qt-bad');
  card.querySelectorAll<HTMLElement>('.option').forEach((b) => {
    if (b.querySelector('.qmark')) return;
    const mark = b.classList.contains('is-correct') ? '✓' : b.classList.contains('is-wrong') ? '✕' : '';
    if (!mark) return;
    const span = document.createElement('span');
    span.className = 'qmark';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = mark;
    b.append(span);
  });
  paintNums(card, t.look);
  const flavor = t.look.flavor[ok ? 0 : 1];
  const feedback = card.querySelector('.feedback');
  if (flavor && feedback && !feedback.querySelector('.qflavor')) {
    const span = document.createElement('span');
    span.className = 'qflavor';
    span.textContent = flavor;
    feedback.append(span);
  }
}

/**
 * Ответ на вопрос в оформлении: серия (полная — монеты), звук и эффекты. Звук оформления
 * заменяет обычный звук ответа.
 */
export function answerThemed(card: HTMLElement, t: ThemedCard, ok: boolean, chosen: HTMLElement): void {
  revealThemed(card, t, ok);
  const old = card.querySelector('.qstreak');
  if (old) {
    const data = progress();
    const s = bumpQStreak(data, t.id, ok);
    old.replaceWith(streakEl(t.id, s.n, s.max));
    saveProgress();
    if (s.coins) showToast(`Серия ${s.max} из ${s.max}! +${s.coins} монет`);
  }
  playThemeSfx(t.look.sfx?.[ok ? 'ok' : 'bad']);
  requestAnimationFrame(() => playEffects(card, t.look.fx?.[ok ? 'ok' : 'bad'], chosen));
}

/** Кнопка «Дальше» под карточкой — в стиле оформления. Возвращает надпись оформления. */
export function dressNext(button: HTMLElement, t: ThemedCard | undefined): string | undefined {
  button.classList.toggle('qnext', Boolean(t));
  if (t) button.dataset.qt = t.id;
  else delete button.dataset.qt;
  return t?.look.nextLabel;
}

/** Кнопка «Дальше» в стиле карточки, которая сейчас на экране. */
export function dressNextFor(button: HTMLElement, card: HTMLElement): string | undefined {
  const id = card.dataset.qt;
  return dressNext(button, id && id !== QTHEME_CLASSIC && LOOKS[id] ? { id, look: LOOKS[id] } : undefined);
}

/** Мини-карточка оформления для магазина: без текста вопроса, только форма и цвета. */
export function miniCard(themeId: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML =
    '<div class="card__meta"><span class="qmini-bar qmini-bar--short"></span><span class="chip">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>' +
    '<div class="card__image"></div><div class="card__text"><span class="qmini-bar"></span></div>' +
    '<ol class="options">' +
    [1, 2].map((n) => `<li><span class="option"><span class="option__num">${n}</span><span class="option__text"><span class="qmini-bar"></span></span></span></li>`).join('') +
    '</ol>';
  if (themeId === QTHEME_CLASSIC) {
    card.classList.add('qcard', 'qcard--mini');
    card.dataset.qt = QTHEME_CLASSIC;
    const body = document.createElement('div');
    body.className = 'qcard__body';
    body.append(...Array.from(card.childNodes));
    card.append(body);
    return card;
  }
  dressCard(card, themeId, { streak: false });
  card.classList.add('qcard--mini');
  return card;
}
