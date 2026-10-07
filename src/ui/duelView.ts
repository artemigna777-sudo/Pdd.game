/**
 * Экраны дуэли (этап 10): начало и история, вызов от друга, итог со сравнением и ссылкой.
 */
import qrcode from 'qrcode-generator';
import type { Question } from '../data/types.ts';
import { DUEL, cleanName, duelHashInText, duelScore, duelTime, duelWinner, type DuelPayload, type DuelSide } from '../duel/duel.ts';
import type { DuelRecord, DuelStats } from '../duel/duelHistory.ts';
import { el } from './dom.ts';
import { dayLabel, plural, timeLabel } from './format.ts';
import { answerDetails } from './ticketHistoryView.ts';
import { showToast } from './toast.ts';
import { trackEvent } from '../stats/track.ts';

/** QR-код ссылки (SVG). */
export function qrCode(url: string, label: string): HTMLElement {
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  const box = el('div', { class: 'qr', role: 'img', 'aria-label': label });
  box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  return box;
}

/** Отправить ссылку: системное меню «Поделиться», иначе — скопировать. */
export async function shareLink(url: string, title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast('Ссылка скопирована — отправь её другу в мессенджере.');
    return 'copied';
  } catch {
    showToast('Не удалось скопировать — выдели ссылку под QR-кодом и скопируй её.');
    return 'failed';
  }
}

/** Поле имени для ссылки. */
function nameField(value: string, onChange: (name: string) => void): HTMLElement {
  const input = el('input', { class: 'field__input', type: 'text', maxlength: DUEL.nameMax, autocomplete: 'nickname', placeholder: 'Например, Артём', value });
  input.addEventListener('input', () => onChange(cleanName(input.value)));
  return el('label', { class: 'field' }, el('span', { class: 'field__label' }, 'Твоё имя в дуэли'), input);
}

/** Десять клеток: кто как ответил на каждый вопрос. */
function strip(side: DuelSide, questions: readonly Question[], who: string): HTMLElement {
  return el(
    'div',
    { class: 'duel-strip', role: 'img', 'aria-label': `${who}: верно ${duelScore(side, questions)} из ${questions.length}` },
    ...side.answers.map((a, i) => el('span', { class: `duel-strip__cell ${a === questions[i].correct ? 'is-ok' : 'is-bad'}` }, a === questions[i].correct ? '✓' : '✕')),
  );
}

function sideCard(side: DuelSide, questions: readonly Question[], label: string, win: boolean): HTMLElement {
  const score = duelScore(side, questions);
  return el(
    'div',
    { class: `duel-side${win ? ' is-winner' : ''}` },
    el('span', { class: 'duel-side__label' }, label),
    el('span', { class: 'duel-side__name' }, side.name),
    el('span', { class: 'duel-side__score' }, `${score} из ${questions.length}`),
    el('span', { class: 'duel-side__time' }, `⏱ ${duelTime(side.ms)}`),
    strip(side, questions, side.name),
  );
}

export interface DuelHubActions {
  name: string;
  setName: (name: string) => void;
  start: () => void;
  open: (r: DuelRecord) => void;
  /** Открыть вызов, вставленный из буфера обмена (`#duel=…`). */
  openLink: (hash: string) => void;
}

/**
 * «Вставить вызов от друга». Ссылка из мессенджера на телефоне открывается в браузере, а не в игре
 * на главном экране (на iPhone у них разные сохранения), поэтому вызов переносят через буфер обмена.
 */
function pasteSection(openLink: (hash: string) => void): HTMLElement {
  const input = el('input', { class: 'field__input', type: 'text', inputmode: 'url', autocomplete: 'off', placeholder: 'Вставь сюда ссылку из сообщения' });
  const field = el('label', { class: 'field', hidden: true }, el('span', { class: 'field__label' }, 'Ссылка на дуэль'), input);
  const go = (text: string): boolean => {
    const hash = duelHashInText(text);
    if (hash) openLink(hash);
    return !!hash;
  };
  const paste = el('button', { class: 'btn btn--secondary', type: 'button' }, '📋 Вставить вызов от друга');
  paste.onclick = async () => {
    try {
      if (go(await navigator.clipboard.readText())) return;
      showToast('В буфере нет ссылки на дуэль. Скопируй сообщение друга со ссылкой или вставь ссылку в поле.');
    } catch {
      // Браузер не дал прочитать буфер — вставить вручную.
    }
    field.hidden = false;
    input.focus();
  };
  input.addEventListener('input', () => {
    if (go(input.value)) input.value = '';
  });
  return el(
    'section',
    { class: 'panel duel-paste' },
    el('h2', { class: 'panel__title' }, 'Вызов от друга'),
    el('p', { class: 'panel__note' }, 'Ссылка открылась в браузере, а не здесь? Скопируй её и вставь сюда — дуэль пойдёт в твоё сохранение.'),
    paste,
    field,
  );
}

/**
 * Подсказка в браузере: ссылка открылась не в игре на главном экране, сохранение здесь своё.
 * `url` — та же ссылка, чтобы скопировать её и вставить в игре.
 */
export function elsewhereNotice(url: string, what: 'вызов' | 'итог'): HTMLElement {
  const copy = el('button', { class: 'btn btn--primary', type: 'button' }, what === 'вызов' ? 'Скопировать вызов' : 'Скопировать итог');
  const manual = el('input', { class: 'field__input', type: 'text', readonly: true, value: url, hidden: true, 'aria-label': 'Ссылка на дуэль' });
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Скопировано. Теперь открой «Курьер ПДД» с главного экрана.');
    } catch {
      manual.hidden = false;
      manual.select();
      showToast('Не получилось скопировать — выдели ссылку в поле и скопируй её.');
    }
  };
  return el(
    'section',
    { class: 'panel duel-elsewhere' },
    el('h2', { class: 'panel__title' }, '📱 Играешь с главного экрана?'),
    el(
      'p',
      { class: 'panel__note' },
      'Ссылки из мессенджеров открываются в браузере, а у игры на главном экране своё сохранение — здесь его не видно. Чтобы дуэль попала в твой прогресс:',
    ),
    el(
      'ol',
      { class: 'duel-elsewhere__steps' },
      el('li', {}, `Нажми «${copy.textContent}».`),
      el('li', {}, 'Открой «Курьер ПДД» с главного экрана.'),
      el('li', {}, '«Режимы» → «Дуэль» → «Вставить вызов от друга».'),
    ),
    copy,
    manual,
    el('p', { class: 'panel__note' }, what === 'вызов' ? 'Или сыграй прямо здесь — но ответы останутся в этом браузере.' : 'Или посмотри итог здесь — в истории дуэлей в игре он не появится.'),
  );
}

/** Начало: имя, «Новая дуэль», счёт и история. */
export function duelHubView(records: readonly DuelRecord[], stats: DuelStats, byId: ReadonlyMap<string, Question>, a: DuelHubActions): HTMLElement {
  let name = a.name;
  const start = el('button', { class: 'btn btn--primary btn--lg', type: 'button', disabled: !name }, 'Новая дуэль');
  start.onclick = () => {
    a.setName(name);
    a.start();
  };
  const rows = [...records]
    .sort((x, y) => y.updated - x.updated)
    .slice(0, 30)
    .map((r) => {
      const qs = r.q.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      const complete = qs.length === r.q.length;
      const mine = complete ? duelScore(r.me, qs) : 0;
      const result = r.them && complete ? duelWinner(r.me, r.them, qs) : undefined;
      const mark = result === 'a' ? ['tone-ok', '🏆'] : result === 'b' ? ['tone-bad', '✕'] : result === 'draw' ? ['tone-warn', '='] : ['tone-wait', '…'];
      const title = r.them ? `${result === 'a' ? 'Победа' : result === 'b' ? 'Поражение' : 'Ничья'} · ${r.them.name}` : 'Вызов ждёт ответа';
      const meta = [`${dayLabel(r.updated)}, ${timeLabel(r.updated)}`, `ты: ${mine} из ${r.q.length}`, r.them && complete ? `соперник: ${duelScore(r.them, qs)}` : ''].filter(Boolean).join(' · ');
      return el(
        'button',
        { class: 'attempt-row', type: 'button', onclick: () => a.open(r) },
        el('span', { class: `score-badge ${mark[0]}` }, mark[1]),
        el('span', { class: 'attempt-row__body' }, el('span', { class: 'attempt-row__title' }, title), el('span', { class: 'attempt-row__meta' }, meta)),
      );
    });
  return el(
    'div',
    { class: 'duel' },
    el(
      'section',
      { class: 'panel duel-intro' },
      el('h2', { class: 'panel__title' }, `${DUEL.questions} вопросов на скорость`),
      el('p', { class: 'panel__note' }, 'Ответь на 10 случайных вопросов из билетов — как на экзамене, без подсказок. Потом отправь другу ссылку: он ответит на те же вопросы, и вы увидите, кто лучше знает правила.'),
      el('p', { class: 'panel__note' }, 'Побеждает тот, у кого больше верных ответов, при равенстве — кто быстрее.'),
      nameField(name, (v) => {
        name = v;
        start.disabled = !v;
      }),
      start,
    ),
    pasteSection(a.openLink),
    el('h2', { class: 'section-title' }, 'Мои дуэли'),
    records.length
      ? el('p', { class: 'panel__note' }, `Побед: ${stats.wins} · поражений: ${stats.losses} · ничьих: ${stats.draws}${stats.waiting ? ` · ждут ответа: ${stats.waiting}` : ''}`)
      : el('p', { class: 'panel__note' }, 'Дуэлей ещё не было.'),
    el('div', { class: 'attempts' }, ...rows),
  );
}

/** Вызов от друга: его результат и «Принять вызов». */
export function duelInviteView(p: DuelPayload, questions: readonly Question[], a: { name: string; setName: (n: string) => void; accept: () => void }): HTMLElement {
  let name = a.name;
  const accept = el('button', { class: 'btn btn--primary btn--lg', type: 'button', disabled: !name }, 'Принять вызов');
  accept.onclick = () => {
    a.setName(name);
    a.accept();
  };
  const score = duelScore(p.from, questions);
  return el(
    'div',
    { class: 'duel' },
    el(
      'section',
      { class: 'result duel-invite' },
      el('p', { class: 'duel-invite__kicker' }, 'Тебя вызывают на дуэль!'),
      el('p', { class: 'duel-invite__name' }, p.from.name),
      el('p', { class: 'result__score' }, `${score} из ${questions.length}`),
      el('p', { class: 'result__label' }, `за ${duelTime(p.from.ms)} — сможешь лучше?`),
    ),
    el(
      'section',
      { class: 'panel' },
      el('p', { class: 'panel__note' }, `Те же ${questions.length} вопросов из билетов ПДД. Как на экзамене: верен ли ответ, видно только в конце. Побеждает тот, у кого больше верных, при равенстве — кто быстрее.`),
      nameField(name, (v) => {
        name = v;
        accept.disabled = !v;
      }),
      accept,
    ),
  );
}

export interface DuelResultActions {
  /** Ссылка: вызов (если соперника ещё нет) или ответ с обоими результатами. */
  link?: string;
  /** Ответить вызовом на другие вопросы / новая дуэль. */
  again: () => void;
}

/** Итог дуэли: сравнение, ссылка с QR-кодом и разбор ответов. */
export function duelResultView(r: DuelRecord, questions: readonly Question[], a: DuelResultActions): HTMLElement {
  const parts: HTMLElement[] = [];
  const myScore = duelScore(r.me, questions);
  if (!r.them) {
    parts.push(
      el(
        'section',
        { class: 'result' },
        el('p', { class: 'result__label' }, 'Твой результат'),
        el('p', { class: 'result__score' }, `${myScore} из ${questions.length}`),
        el('p', { class: 'result__note' }, `Время: ${duelTime(r.me.ms)}`),
      ),
    );
  } else {
    const w = duelWinner(r.me, r.them, questions);
    parts.push(
      el(
        'section',
        { class: `result duel-result is-${w === 'a' ? 'win' : w === 'b' ? 'loss' : 'draw'}` },
        el('p', { class: 'duel-result__verdict' }, w === 'a' ? 'Победа! 🏆' : w === 'b' ? 'Поражение' : 'Ничья'),
        el(
          'p',
          { class: 'result__note' },
          duelScore(r.me, questions) === duelScore(r.them, questions) && w !== 'draw' ? 'Верных ответов поровну — решило время.' : w === 'draw' ? 'Одинаково верных ответов и почти одинаковое время.' : '',
        ),
        el('div', { class: 'duel-versus' }, sideCard(r.me, questions, 'Ты', w === 'a'), sideCard(r.them, questions, 'Соперник', w === 'b')),
      ),
    );
  }
  if (a.link) {
    const waiting = !r.them;
    const text = waiting
      ? `Вызов на дуэль по билетам ПДД: ${myScore} из ${questions.length} за ${duelTime(r.me.ms)}. Сможешь лучше?`
      : `Итог дуэли по ПДД: ${r.me.name} — ${myScore} из ${questions.length}, ${r.them!.name} — ${duelScore(r.them!, questions)} из ${questions.length}.`;
    const title = waiting ? 'Дуэль по ПДД' : 'Итог дуэли по ПДД';
    const link = a.link;
    parts.push(
      el(
        'section',
        { class: 'panel duel-share' },
        el('h2', { class: 'panel__title' }, waiting ? 'Отправь вызов другу' : `Отправь результат: ${r.them!.name}`),
        el('p', { class: 'panel__note' }, waiting ? `Друг ответит на те же ${questions.length} вопросов и пришлёт ответную ссылку с итогом.` : 'По этой ссылке соперник увидит итог дуэли.'),
        el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: () => (trackEvent(waiting ? 'duel-challenge' : 'duel-reply', waiting ? 'Дуэль: отправили вызов' : 'Дуэль: отправили ответ'), void shareLink(link, title, text)) }, waiting ? 'Отправить вызов' : 'Отправить результат'),
        qrCode(link, 'QR-код ссылки на дуэль'),
        el('p', { class: 'panel__note' }, 'Или покажи QR-код — друг наведёт на него камеру телефона.'),
        el('input', { class: 'field__input duel-link', type: 'text', readonly: true, value: link, 'aria-label': 'Ссылка на дуэль', onfocus: (e: Event) => (e.target as HTMLInputElement).select() }),
      ),
    );
  }
  parts.push(el('button', { class: 'btn btn--secondary', type: 'button', onclick: a.again }, r.them ? (r.role === 'to' ? 'Ответный вызов' : 'Новая дуэль') : 'Новая дуэль'));
  const answers = questions.map((q, i) => {
    const d = answerDetails(q, r.me.answers[i], `Вопрос ${i + 1}`);
    if (r.them) {
      const ok = r.them.answers[i] === q.correct;
      d.querySelector('.answer__body')?.append(el('span', { class: `answer__them ${ok ? 'is-ok' : 'is-bad'}` }, `${r.them.name}: ${ok ? 'верно' : `ошибка (ответ ${r.them.answers[i] + 1})`}`));
    }
    return d;
  });
  parts.push(
    el(
      'section',
      { class: 'review', 'aria-label': 'Разбор ответов' },
      el('h2', { class: 'section-title' }, 'Разбор ответов'),
      el('p', { class: 'review__hint' }, `Ошибки раскрыты. ${questions.length - myScore ? `У тебя ${questions.length - myScore} ${plural(questions.length - myScore, ['ошибка', 'ошибки', 'ошибок'])} — они ушли в работу над ошибками.` : 'У тебя без ошибок!'}`),
      el('div', { class: 'answers' }, ...answers),
    ),
  );
  return el('div', { class: 'duel attempt' }, ...parts);
}
