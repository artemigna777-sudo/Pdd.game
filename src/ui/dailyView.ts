/**
 * Этап 6 в интерфейсе: готовность к экзамену, цель дня и серия, монеты и гараж.
 */
import { playSound } from '../audio/feedback.ts';
import { PAINTS, STICKERS, buyOrSelect, carLook, type CarLook, type StickerId } from '../progress/garage.ts';
import { COINS, currentStreak, type AnswerOutcome, type DailyState, type ProgressData } from '../progress/progress.ts';
import type { Readiness, Tip } from '../progress/readiness.ts';
import { SIGN_GROUPS } from '../signs/signs.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';
import { showToast } from './toast.ts';

const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

export function goalText(d: DailyState): string {
  const what = d.kind === 'review' ? 'Повторить ошибки' : d.kind === 'points' ? 'Пройти точки в городе' : d.kind === 'plan' ? 'План к экзамену на сегодня' : 'Ответить верно';
  return `${what}: ${Math.min(d.count, d.target)} из ${d.target}`;
}

/** Цель дня выполнена — сообщить (и порадовать звуком). */
export function goalToast(out: Pick<AnswerOutcome, 'goal'> | undefined, data: ProgressData): void {
  if (!out?.goal) return;
  showToast(`Цель дня выполнена! +${COINS.goal} монет · серия: ${days(currentStreak(data, Date.now()))}`);
  playSound('reward');
}

export interface StatusActions {
  progress(): void;
  garage(): void;
  /** «Мой экзамен»: если цель дня — план к экзамену. */
  plan(): void;
}

/** Строка статуса в меню: готовность, серия, цель дня, монеты. */
export function statusRow(data: ProgressData, daily: DailyState, readinessPercent: number | undefined, now: number, actions: StatusActions): HTMLElement {
  const streak = currentStreak(data, now);
  const pill = (icon: string, value: string, label: string, onclick: () => void, extra = '') =>
    el('button', { class: `status__pill${extra}`, type: 'button', 'aria-label': label, onclick }, el('span', { 'aria-hidden': 'true' }, icon), el('span', { class: 'status__value', 'aria-hidden': 'true' }, value));
  return el(
    'div',
    { class: 'status' },
    pill('🎓', readinessPercent === undefined ? '…' : `${readinessPercent}%`, `Готовность к экзамену: ${readinessPercent ?? 0}%`, actions.progress, ' status__pill--ready'),
    pill('🔥', String(streak), `Серия: ${days(streak)}`, actions.progress),
    pill(
      daily.done ? '✅' : daily.kind === 'plan' ? '📅' : '🎯',
      `${Math.min(daily.count, daily.target)}/${daily.target}`,
      `Цель дня. ${goalText(daily)}${daily.done ? ', выполнена' : ''}`,
      daily.kind === 'plan' ? actions.plan : actions.progress,
      daily.done ? ' is-done' : '',
    ),
    pill('🪙', String(data.coins), `Монеты: ${data.coins}. Гараж`, actions.garage),
  );
}

export interface ReadinessActions {
  tip(tip: Tip): void;
}

/** Карточка «Готовность к экзамену» с советами. */
export function readinessCard(r: Readiness, actions: ReadinessActions): HTMLElement {
  const fill = el('span', { class: `bar__fill bar__fill--${r.percent >= 90 ? 'ok' : r.percent >= 50 ? 'warn' : 'bad'}` });
  fill.style.width = `${r.percent}%`;
  const blocks = r.blocks.map((share, i) =>
    el('li', { class: i === r.weakest && share < 1 ? 'is-weak' : '' }, el('span', {}, `${i * 5 + 1}–${i * 5 + 5}`), el('strong', {}, `${Math.floor(share * 100)}%`)),
  );
  return el(
    'section',
    { class: 'panel readiness' },
    el('h2', { class: 'panel__title' }, 'Готовность к экзамену'),
    el('p', { class: 'big-number' }, `${r.percent}%`),
    el('span', { class: 'bar', role: 'img', 'aria-label': `Готовность ${r.percent}%` }, fill),
    el('p', { class: 'panel__note' }, `Освоено вопросов: ${r.mastered} из ${r.total}. Экзамены: сдано ${r.exams.passed} из последних ${r.exams.count || 5}.`),
    el('p', { class: 'panel__note' }, 'Освоено по блокам экзамена (номера вопросов в билете):'),
    el('ul', { class: 'blocks' }, ...blocks),
    r.tips.length ? el('h3', { class: 'readiness__tips-title' }, 'Что сделать, чтобы готовность выросла') : null,
    ...r.tips.map((t) =>
      t.action
        ? el('button', { class: 'tip', type: 'button', onclick: () => actions.tip(t) }, el('span', {}, t.text), el('span', { class: 'tip__go', 'aria-hidden': 'true' }, '→'))
        : el('p', { class: 'tip tip--text' }, t.text),
    ),
    el('p', { class: 'panel__note' }, 'Как считается: 60% — освоенные вопросы, 20% — самый слабый блок экзамена, 20% — последние 5 экзаменов.'),
  );
}

/** Карточка цели дня и серии. */
export function dailyCard(data: ProgressData, daily: DailyState, now: number): HTMLElement {
  const streak = currentStreak(data, now);
  const fill = el('span', { class: `bar__fill${daily.done ? ' bar__fill--ok' : ''}` });
  fill.style.width = `${(Math.min(daily.count, daily.target) / daily.target) * 100}%`;
  return el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title' }, daily.done ? 'Цель дня выполнена ✅' : 'Цель дня 🎯'),
    el('p', { class: 'rewards__line' }, goalText(daily)),
    el('span', { class: 'bar' }, fill),
    el('p', { class: 'panel__note' }, `За выполненную цель — ${COINS.goal} монет. Серия дней подряд: 🔥 ${days(streak)}, лучшая — ${days(Math.max(data.streak.best, streak))}.`),
  );
}

/** Машина сверху в SVG — для гаража (так же, как в игре: покраска, крыша курьера, наклейка). */
export function carSvg(look: CarLook): string {
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  const body = hex(look.color);
  const stickers: Record<StickerId, string> = {
    none: '',
    stripes: '<rect x="-4" y="-20" width="2.5" height="40" fill="#fff" opacity=".9"/><rect x="1.5" y="-20" width="2.5" height="40" fill="#fff" opacity=".9"/>',
    flash: '<path d="M1 -19 L-3 -14.5 L0 -14.5 L-1 -11 L3 -15.5 L0 -15.5 Z" fill="#ffd60a"/>',
    star: '<path d="M0 -19 L1 -16.8 L3.3 -16.6 L1.5 -15 L2.1 -12.7 L0 -14 L-2.1 -12.7 L-1.5 -15 L-3.3 -16.6 L-1 -16.8 Z" fill="#fff"/>',
    heart: '<path d="M0 -12.8 L-2.9 -16 A1.6 1.6 0 0 1 0 -17.3 A1.6 1.6 0 0 1 2.9 -16 Z" fill="#ff4d6d"/>',
    flames: '<path d="M-10 -18 L-6 -18 L-9 -6 Z M10 -18 L6 -18 L9 -6 Z" fill="#ff5400"/><path d="M-9.5 -18 L-7 -18 L-8.7 -11 Z M9.5 -18 L7 -18 L8.7 -11 Z" fill="#ffbd00"/>',
    triangle: '<path d="M0 -19.5 L-4 -12.5 L4 -12.5 Z" fill="#e63946"/><path d="M0 -17 L-2.2 -13.5 L2.2 -13.5 Z" fill="#fff"/>',
    diamond: '<path d="M0 -20 L4 -16 L0 -12 L-4 -16 Z" fill="#fff"/><path d="M0 -18.6 L2.6 -16 L0 -13.4 L-2.6 -16 Z" fill="#ffd60a"/>',
    ring: '<circle cx="0" cy="-16" r="3.6" fill="#e63946"/><circle cx="0" cy="-16" r="2.4" fill="#fff"/>',
    arrow: '<circle cx="0" cy="-16" r="3.6" fill="#1d6fd6"/><path d="M0 -18.6 L-1.9 -16.4 L1.9 -16.4 Z M-0.7 -16.6 H0.7 V-13.6 H-0.7 Z" fill="#fff"/>',
    checker: '<g><rect x="-4" y="-18" width="8" height="4" fill="#fff"/><rect x="-4" y="-18" width="2" height="2" fill="#1b1b1b"/><rect x="0" y="-18" width="2" height="2" fill="#1b1b1b"/><rect x="-2" y="-16" width="2" height="2" fill="#1b1b1b"/><rect x="2" y="-16" width="2" height="2" fill="#1b1b1b"/></g>',
  };
  return `<svg viewBox="-16 -24 32 50" aria-hidden="true">
    <rect x="-8" y="-16" width="22" height="40" rx="7" fill="#000" opacity=".25"/>
    <rect x="-11" y="-20" width="22" height="40" rx="7" fill="${body}"/>
    <rect x="-8" y="-12" width="16" height="7" rx="2" fill="#1d3557"/>
    <rect x="-8" y="-4" width="16" height="14" rx="3" fill="#ffd166"/>
    <rect x="-5" y="-2" width="10" height="9" fill="#c77d3a"/><rect x="-5" y="1.5" width="10" height="2" fill="#9c5c26"/>
    <rect x="-7" y="11" width="14" height="5" rx="2" fill="#1d3557"/>
    <rect x="-9" y="-19" width="5" height="3" fill="#fff3b0"/><rect x="4" y="-19" width="5" height="3" fill="#fff3b0"/>
    <rect x="-9" y="17" width="5" height="2" fill="#e63946"/><rect x="4" y="17" width="5" height="2" fill="#e63946"/>
    ${stickers[look.sticker]}
  </svg>`;
}

/** Гараж: покраска и наклейки за монеты. `onChange` — после покупки или выбора (сохранить прогресс). */
export function garageView(data: ProgressData, onChange: () => void): HTMLElement {
  const root = el('div', { class: 'garage' });
  const render = () => {
    const look = carLook(data);
    const preview = el('div', { class: 'garage__car' });
    preview.innerHTML = carSvg(look);
    const item = (id: string, name: string, price: number, swatch: HTMLElement, signGroup?: string) => {
      const owned = data.garage.owned.includes(id);
      const group = signGroup ? SIGN_GROUPS.find((g) => g.id === signGroup) : undefined;
      const selected = data.garage.paint === id || data.garage.sticker === id;
      return el(
        'button',
        {
          class: `garage__item${selected ? ' is-selected' : ''}`,
          type: 'button',
          'aria-pressed': String(selected),
          onclick: () => {
            const result = buyOrSelect(data, id);
            if (result === 'no-coins') {
              showToast(`Не хватает монет: нужно ${price}, есть ${data.coins}. Монеты — за верные ответы и цель дня.`);
              return;
            }
            if (result === 'locked') {
              showToast(`Эта наклейка — награда Знакодекса: собери все знаки группы «${group?.title ?? ''}».`);
              return;
            }
            if (result === 'bought') playSound('reward');
            onChange();
            render();
          },
        },
        swatch,
        el('span', { class: 'garage__name' }, name),
        el('span', { class: 'garage__price' }, selected ? 'выбрано' : owned ? (group ? 'есть' : 'куплено') : group ? '🔒 Знакодекс' : `🪙 ${price}`),
      );
    };
    const paints = PAINTS.map((p) => {
      const sw = el('span', { class: 'garage__swatch', 'aria-hidden': 'true' });
      sw.style.background = `#${p.color.toString(16).padStart(6, '0')}`;
      return item(p.id, p.name, p.price, sw);
    });
    const stickers = STICKERS.map((s) => {
      const sw = el('span', { class: 'garage__swatch garage__swatch--car', 'aria-hidden': 'true' });
      sw.innerHTML = carSvg({ color: look.color, sticker: s.id });
      return item(s.id, s.name, s.price, sw, s.signGroup);
    });
    root.replaceChildren(
      el('div', { class: 'garage__top' }, preview, el('p', { class: 'garage__coins' }, `🪙 ${data.coins}`, el('span', {}, 'монет'))),
      el('p', { class: 'panel__note' }, 'Монеты — за верные ответы, цель дня, пройденные главы и экзамены. Покраска и наклейки меняют только внешний вид машины.'),
      el('h2', { class: 'section-title' }, 'Покраска'),
      el('div', { class: 'garage__grid' }, ...paints),
      el('h2', { class: 'section-title' }, 'Наклейки'),
      el('div', { class: 'garage__grid' }, ...stickers),
    );
  };
  render();
  return root;
}
