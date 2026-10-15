/**
 * Этап 6 в интерфейсе: готовность к экзамену, цель дня и серия, монеты и гараж.
 */
import { playHorn, playSound } from '../audio/feedback.ts';
import { CITY_THEMES, HORNS, MODELS, PAINTS, PLATE, STICKERS, buyOrSelect, buyOrSelectExtra, buyOrSelectTheme, carLook, hornOf, setPlate, type CarLook, type ModelId, type StickerId } from '../progress/garage.ts';
import { QTHEMES, QTHEME_CLASSIC, buyOrSelectQTheme, ownsQTheme, qtheme } from '../progress/qthemes.ts';
import { shopDiscount, shopPrice } from '../progress/storyProgress.ts';
import { COINS, currentStreak, type AnswerOutcome, type DailyState, type ProgressData } from '../progress/progress.ts';
import type { Readiness, Tip } from '../progress/readiness.ts';
import { SIGN_GROUPS } from '../signs/signs.ts';
import { el } from './dom.ts';
import { plural } from './format.ts';
import { autoQTheme, miniCard } from './qthemes/index.ts';
import { LOOKS } from './qthemes/looks.ts';
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
    pill('🪙', String(data.coins), `Монеты: ${data.coins}. Магазин`, actions.garage),
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
  const roof = '<rect x="-5" y="-2" width="10" height="9" fill="#c77d3a"/><rect x="-5" y="1.5" width="10" height="2" fill="#9c5c26"/>';
  const shadow = (w: number, h: number, r: number) => `<rect x="${-w / 2 + 3}" y="${-h / 2 + 4}" width="${w}" height="${h}" rx="${r}" fill="#000" opacity=".25"/>`;
  const lights = (w: number, h: number) =>
    `<rect x="${-w / 2 + 2}" y="${-h / 2 + 1}" width="5" height="3" fill="#fff3b0"/><rect x="${w / 2 - 7}" y="${-h / 2 + 1}" width="5" height="3" fill="#fff3b0"/>` +
    `<rect x="${-w / 2 + 2}" y="${h / 2 - 3}" width="5" height="2" fill="#e63946"/><rect x="${w / 2 - 7}" y="${h / 2 - 3}" width="5" height="2" fill="#e63946"/>`;
  const models: Record<ModelId, string> = {
    sedan: `${shadow(22, 40, 7)}<rect x="-11" y="-20" width="22" height="40" rx="7" fill="${body}"/><rect x="-8" y="-12" width="16" height="7" rx="2" fill="#1d3557"/><rect x="-8" y="-4" width="16" height="14" rx="3" fill="#ffd166"/>${roof}<rect x="-7" y="11" width="14" height="5" rx="2" fill="#1d3557"/>${lights(22, 40)}`,
    hatch: `${shadow(22, 36, 8)}<rect x="-11" y="-18" width="22" height="36" rx="8" fill="${body}"/><rect x="-8" y="-10" width="16" height="7" rx="2" fill="#1d3557"/><rect x="-8" y="-2" width="16" height="11" rx="3" fill="#ffd166"/>${roof}<rect x="-8" y="10" width="16" height="5" rx="2" fill="#1d3557"/>${lights(22, 36)}`,
    pickup: `${shadow(22, 42, 5)}<rect x="-11" y="-21" width="22" height="42" rx="5" fill="${body}"/><rect x="-8" y="-14" width="16" height="6" rx="2" fill="#1d3557"/><rect x="-8" y="-7" width="16" height="7" rx="2" fill="#ffd166"/><rect x="-8" y="2" width="16" height="18" fill="#000" opacity=".28"/><rect x="-7" y="4" width="7" height="7" fill="#c77d3a"/><rect x="1" y="6" width="6" height="6" fill="#c77d3a"/><rect x="-5" y="13" width="9" height="6" fill="#c77d3a"/>${lights(22, 42)}`,
    van: `${shadow(24, 44, 4)}<rect x="-12" y="-22" width="24" height="44" rx="4" fill="${body}"/><rect x="-9" y="-20" width="18" height="6" rx="2" fill="#1d3557"/><rect x="-11" y="-12" width="22" height="34" fill="#fff" opacity=".18"/><rect x="-11" y="-4" width="22" height="5" fill="#ffd166"/><g transform="translate(0 6)">${roof}</g>${lights(24, 44)}`,
    retro: `${shadow(22, 40, 9)}<circle cx="-9" cy="-12" r="5" fill="${body}"/><circle cx="9" cy="-12" r="5" fill="${body}"/><circle cx="-9" cy="12" r="5" fill="${body}"/><circle cx="9" cy="12" r="5" fill="${body}"/><rect x="-10" y="-20" width="20" height="40" rx="9" fill="${body}"/><rect x="-9" y="-21" width="18" height="2" fill="#d9dde3"/><rect x="-9" y="19" width="18" height="2" fill="#d9dde3"/><rect x="-7" y="-11" width="14" height="6" rx="3" fill="#1d3557"/><rect x="-7" y="-4" width="14" height="12" rx="4" fill="#ffd166"/>${roof}<rect x="-6" y="10" width="12" height="5" rx="2" fill="#1d3557"/><circle cx="-7" cy="-17" r="2" fill="#fff3b0"/><circle cx="7" cy="-17" r="2" fill="#fff3b0"/>`,
    electro: `${shadow(22, 40, 11)}<rect x="-11" y="-20" width="22" height="40" rx="11" fill="${body}"/><rect x="-8" y="-12" width="16" height="23" rx="6" fill="#1d3557" opacity=".9"/>${roof}<rect x="-8" y="-18.5" width="16" height="1.6" fill="#cff4ff"/><rect x="-8" y="17.5" width="16" height="1.4" fill="#e63946"/>`,
  };
  const plate = look.plate ? `<rect x="-9" y="21.5" width="18" height="4" rx="1" fill="#fff" stroke="#1b2430" stroke-width=".4"/><text x="0" y="24.7" font-size="3.2" font-weight="700" text-anchor="middle" fill="#1b2430" font-family="system-ui,sans-serif">${look.plate.replace(/[<>&"]/g, '')}</text>` : '';
  return `<svg viewBox="-16 -24 32 ${look.plate ? 52 : 50}" aria-hidden="true">${models[look.model] ?? models.sedan}${stickers[look.sticker]}${plate}</svg>`;
}

/** Магазин: темы города, покраска и наклейки за монеты. `onChange` — после покупки или выбора (сохранить прогресс). */
export function garageView(data: ProgressData, onChange: () => void, /** Карточки дополнительных сюжетов (их строит экран: им нужны данные игры). */ tales?: () => HTMLElement): HTMLElement {
  const root = el('div', { class: 'garage' });
  /** Клаксон, который уже прослушан: следующее касание его покупает. */
  let armedHorn: string | undefined;
  /** Оформление вопросов, которое уже показано: следующее касание его покупает. */
  let armedDesign: string | undefined;
  const render = () => {
    const look = carLook(data);
    const preview = el('div', { class: 'garage__car' });
    preview.innerHTML = carSvg(look);
    const item = (id: string, name: string, base: number, swatch: HTMLElement, signGroup?: string) => {
      const price = shopPrice(data, base);
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
      sw.innerHTML = carSvg({ color: look.color, sticker: s.id, model: look.model });
      return item(s.id, s.name, s.price, sw, s.signGroup);
    });
    const themeCard = (id: string | undefined, name: string, icon: string, base: number, colors: readonly string[], about: string) => {
      const owned = id === undefined || data.garage.owned.includes(`theme:${id}`);
      const selected = data.garage.theme === id;
      const price = shopPrice(data, base);
      const sw = el('span', { class: 'theme-swatch', 'aria-hidden': 'true' });
      // Кусочек улицы в цветах темы: газон, асфальт с разметкой, крыша дома.
      sw.innerHTML = `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="${colors[0]}"/><rect x="18" width="24" height="40" fill="${colors[1]}"/><rect x="29" y="3" width="2" height="10" fill="${colors[2]}"/><rect x="29" y="19" width="2" height="10" fill="${colors[2]}"/><rect x="2" y="6" width="12" height="14" fill="${colors[3]}"/><rect x="46" y="20" width="12" height="14" fill="${colors[3]}"/></svg>`;
      return el(
        'button',
        {
          class: `garage__item theme-item${selected ? ' is-selected' : ''}`,
          type: 'button',
          'aria-pressed': String(selected),
          'data-theme-id': id ?? 'classic',
          title: about,
          onclick: () => {
            const result = buyOrSelectTheme(data, id);
            if (result === 'no-coins') {
              showToast(`Не хватает монет: нужно ${price}, есть ${data.coins}. Монеты — за верные ответы и цель дня.`);
              return;
            }
            if (result === 'bought') {
              playSound('reward');
              showToast(`${icon} Тема «${name}» — уже в городе и в меню.`);
            }
            onChange();
            render();
          },
        },
        sw,
        el('span', { class: 'garage__name' }, `${icon} ${name}`),
        el('span', { class: 'garage__price' }, selected ? 'выбрано' : id === undefined ? 'бесплатно' : owned ? 'куплено' : `🪙 ${price}`),
      );
    };
    // ─── Модели, клаксоны, номер (этап 17) ─────────────────────────────────────
    const extraItem = (kind: 'model' | 'horn', id: string, name: string, base: number, swatch: HTMLElement) => {
      const key = `${kind}:${id}`;
      const owned = base === 0 || data.garage.owned.includes(key);
      const selected = kind === 'model' ? look.model === id : hornOf(data) === id;
      const price = shopPrice(data, base);
      return el(
        'button',
        {
          class: `garage__item${selected ? ' is-selected' : ''}`,
          type: 'button',
          'aria-pressed': String(selected),
          [`data-${kind}`]: id,
          onclick: () => {
            // Клаксон сначала можно послушать: первое касание — звук, второе — покупка.
            if (kind === 'horn' && !owned && armedHorn !== id) {
              armedHorn = id;
              playHorn(id);
              showToast(`Коснись ещё раз, чтобы купить клаксон «${name}» за ${price}.`);
              return;
            }
            const result = buyOrSelectExtra(data, kind, id);
            if (result === 'no-coins') {
              showToast(`Не хватает монет: нужно ${price}, есть ${data.coins}. Монеты — за верные ответы и цель дня.`);
              return;
            }
            armedHorn = undefined;
            if (kind === 'horn') playHorn(id);
            else if (result === 'bought') playSound('reward');
            onChange();
            render();
          },
        },
        swatch,
        el('span', { class: 'garage__name' }, name),
        el('span', { class: 'garage__price' }, selected ? 'выбрано' : base === 0 ? 'бесплатно' : owned ? 'куплено' : `🪙 ${price}`),
      );
    };
    const models = MODELS.map((m) => {
      const sw = el('span', { class: 'garage__swatch garage__swatch--car', 'aria-hidden': 'true' });
      sw.innerHTML = carSvg({ color: look.color, sticker: look.sticker, model: m.id });
      return extraItem('model', m.id, m.name, m.price, sw);
    });
    const horns = HORNS.map((h) => extraItem('horn', h.id, h.name, h.price, el('span', { class: 'garage__icon', 'aria-hidden': 'true' }, h.icon)));
    const plateOwned = data.garage.owned.includes('plate');
    const plateInput = el('input', { class: 'plate-input', type: 'text', maxlength: String(PLATE.max), autocomplete: 'off', placeholder: 'НИК', value: data.garage.plate ?? '', 'aria-label': 'Надпись на номере' }) as HTMLInputElement;
    const plateButton = el(
      'button',
      {
        class: 'btn btn--secondary',
        type: 'button',
        onclick: () => {
          const result = setPlate(data, plateInput.value);
          if (result === 'invalid') return showToast('Напиши ник: буквы, цифры, пробел или дефис, до 8 знаков.');
          if (result === 'no-coins') return showToast(`Не хватает монет: нужно ${shopPrice(data, PLATE.price)}, есть ${data.coins}.`);
          if (result === 'bought') playSound('reward');
          showToast(`Номер «${data.garage.plate}» — на машине.`);
          onChange();
          render();
        },
      },
      plateOwned ? 'Сохранить номер' : `Купить номер · 🪙 ${shopPrice(data, PLATE.price)}`,
    );
    const platePanel = el(
      'div',
      { class: 'plate-row' },
      el('span', { class: 'plate-preview', 'aria-hidden': 'true' }, data.garage.plate ?? 'НИК'),
      plateInput,
      plateButton,
    );
    // ─── Оформление вопросов ────────────────────────────────────────────────────
    const designCard = (id: string | undefined) => {
      const info = id && id !== QTHEME_CLASSIC ? qtheme(id) : undefined;
      const free = id === undefined || id === QTHEME_CLASSIC;
      const owned = free || ownsQTheme(data, id!);
      const selected = data.garage.qtheme === id;
      const price = info ? shopPrice(data, info.price) : 0;
      const name = id === undefined ? '✨ Авто' : id === QTHEME_CLASSIC ? 'Обычное' : `${info!.icon} ${info!.name}`;
      const city = info?.city ? CITY_THEMES.find((c) => c.id === info.city) : undefined;
      const auto = id === undefined ? autoQTheme() : undefined;
      const hint = id === undefined ? (auto === QTHEME_CLASSIC ? 'праздники и тема города' : `сейчас: ${qtheme(auto!)?.name ?? ''}`) : info?.when ?? '';
      const status = selected ? 'выбрано' : free ? 'бесплатно' : owned ? 'куплено' : city ? '🔒 тема города' : `🪙 ${price}`;
      return el(
        'button',
        {
          class: `garage__item design-item${selected ? ' is-selected' : ''}${armedDesign === id && id ? ' is-armed' : ''}`,
          type: 'button',
          'aria-pressed': String(selected),
          'data-design': id ?? 'auto',
          title: id && LOOKS[id] ? LOOKS[id].idea : undefined,
          onclick: () => {
            if (!owned && city) {
              showToast(`Это оформление идёт вместе с темой города «${city.name}».`);
              return;
            }
            // Сначала касание показывает цену, второе — покупает.
            if (!owned && armedDesign !== id) {
              armedDesign = id;
              showToast(`Коснись ещё раз, чтобы купить оформление «${info!.name}» за ${price}.`);
              render();
              return;
            }
            const result = buyOrSelectQTheme(data, id);
            if (result === 'no-coins') {
              showToast(`Не хватает монет: нужно ${price}, есть ${data.coins}. Монеты — за верные ответы и цель дня.`);
              return;
            }
            armedDesign = undefined;
            if (result === 'bought') {
              playSound('reward');
              showToast(`${info!.icon} Оформление «${info!.name}» — уже в вопросах.`);
            }
            onChange();
            render();
          },
        },
        miniCard(auto ?? id!),
        el('span', { class: 'garage__name' }, name),
        hint ? el('span', { class: 'design-item__hint' }, hint) : '',
        el('span', { class: 'garage__price' }, status),
      );
    };
    const designs = (group: string) => QTHEMES.filter((t) => t.group === group).map((t) => designCard(t.id));
    const themes = [themeCard(undefined, 'Обычный', '🏙', 0, ['#5b9a4f', '#40454e', '#eef0f2', '#c8553d'], 'Светофорск как есть.'), ...CITY_THEMES.map((t) => themeCard(t.id, t.name, t.icon, t.price, t.preview, t.about))];
    root.replaceChildren(
      el('div', { class: 'garage__top' }, preview, el('p', { class: 'garage__coins' }, `🪙 ${data.coins}`, el('span', {}, 'монет'))),
      el('p', { class: 'panel__note' }, 'Монеты — за верные ответы, цель дня, пройденные главы и экзамены. Всё в магазине меняет только внешний вид: на вопросы и ответы не влияет.'),
      shopDiscount(data) ? el('p', { class: 'panel__note garage__discount' }, `🔧 Скидка дяди Гены: −${Math.round(shopDiscount(data) * 100)}% — за дружбу.`) : '',
      tales ? el('h2', { class: 'section-title' }, 'Дополнительные сюжеты') : '',
      tales ? tales() : '',
      el('h2', { class: 'section-title' }, 'Оформление вопросов'),
      el('p', { class: 'panel__note' }, 'Форма карточки и ответов, номера, серия верных ответов, звуки и эффекты. Текст вопроса и ответы — как в билете. За полную серию — +5 монет. Праздничные оформления в свои дни включаются сами.'),
      el('div', { class: 'garage__grid garage__grid--designs' }, designCard(undefined), designCard(QTHEME_CLASSIC), ...designs('new')),
      el('h3', { class: 'garage__subtitle' }, 'Праздники'),
      el('div', { class: 'garage__grid garage__grid--designs' }, ...designs('holiday')),
      el('h3', { class: 'garage__subtitle' }, 'Вместе с темой города'),
      el('div', { class: 'garage__grid garage__grid--designs' }, ...designs('city')),
      el('h2', { class: 'section-title' }, 'Темы города'),
      el('p', { class: 'panel__note' }, 'Тема меняет весь город, пост ДПС и улицу в меню, а в режиме «Авто» — и вопросы.'),
      el('div', { class: 'garage__grid' }, ...themes),
      el('h2', { class: 'section-title' }, 'Модель машины'),
      el('div', { class: 'garage__grid' }, ...models),
      el('h2', { class: 'section-title' }, 'Покраска'),
      el('div', { class: 'garage__grid' }, ...paints),
      el('h2', { class: 'section-title' }, 'Наклейки'),
      el('div', { class: 'garage__grid' }, ...stickers),
      el('h2', { class: 'section-title' }, 'Клаксон'),
      el('p', { class: 'panel__note' }, 'Звучит, когда касаешься машины в меню и когда посылка доставлена.'),
      el('div', { class: 'garage__grid' }, ...horns),
      el('h2', { class: 'section-title' }, 'Номер с ником'),
      el('p', { class: 'panel__note' }, plateOwned ? 'Надпись можно менять бесплатно.' : `Свой номер под машиной в меню и в магазине. Один раз за 🪙 ${shopPrice(data, PLATE.price)}, потом надпись меняется бесплатно.`),
      platePanel,
    );
  };
  render();
  return root;
}
