/**
 * Дуэль в реальном времени (этап 16): комната по коду или ссылке, раунды с обратным отсчётом,
 * итог раунда и дуэли. Логика — `duel/live.ts`, связь — посредник на Cloudflare.
 */
import { playSound } from '../audio/feedback.ts';
import type { Question } from '../data/types.ts';
import { LIVE, LIVE_KINDS, connectLive, isSituationId, liveLink, liveScore, liveVerdict, pickLiveItems, roundWinner, type LiveAnswer, type LiveKind, type LiveServerMessage, type LiveSocket, type RoundWinner } from '../duel/live.ts';
import { progress, recordAnswer, saveProgress } from '../progress/progress.ts';
import { shareBase } from '../pwa.ts';
import { getSettings, updateSettings } from '../settings.ts';
import { emptySituations, optionOrder, readMs, recordSituation } from '../situations/run.ts';
import type { Situation } from '../situations/types.ts';
import { el } from './dom.ts';
import { qrCode, shareLink } from './duelView.ts';
import { renderQuestionCard } from './questionCard.ts';
import { situationCard, type SituationCard } from './situationsView.ts';
import { showToast } from './toast.ts';

/** Во сколько раз дольше раунды — только для браузерных тестов на медленном сервере (`window.__liveSlow`). */
const slow = (): number => (import.meta.env.DEV ? ((window as unknown as { __liveSlow?: number }).__liveSlow ?? 1) : 1);

export interface LiveDeps {
  code: string;
  host: boolean;
  body: HTMLElement;
  scroller: HTMLElement;
  status: HTMLElement;
  score: HTMLElement;
  questions: readonly Question[];
  situations: readonly Situation[];
  alive: () => boolean;
  /** К дуэлям. */
  done: () => void;
  /** Новая комната (после дуэли). */
  again: () => void;
}

const short = (text: string) => (text.length > 70 ? `${text.slice(0, 68).replace(/\s+\S*$/, '')}…` : text);
const sec = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} с`;

export function runLive(d: LiveDeps): { stop: () => void } {
  const { body, status, score } = d;
  const sitById = new Map(d.situations.map((s) => [s.id, s]));
  const qById = new Map(d.questions.map((q) => [q.id, q]));
  let socket: LiveSocket | undefined;
  let card: SituationCard | undefined;
  let timer: number | undefined;
  let seat: 0 | 1 = d.host ? 0 : 1;
  let names: [string, string] = ['', ''];
  let items: string[] = [];
  let round = -1;
  let finished = false;
  let kind: LiveKind = 'mix';
  const mine: (LiveAnswer | undefined)[] = [];
  const reveals: ([LiveAnswer, LiveAnswer] | undefined)[] = [];
  const winners: RoundWinner[] = [];
  let wantNext = false;

  const stopTimers = () => {
    card?.stop();
    card = undefined;
    window.clearInterval(timer);
    timer = undefined;
  };
  const stop = () => {
    stopTimers();
    finished = true;
    socket?.close();
  };
  const show = (...nodes: (Node | string)[]) => {
    if (!d.alive()) return;
    body.replaceChildren(...nodes);
    d.scroller.scrollTop = 0;
  };
  const them = () => names[1 - seat] || 'Соперник';
  const updateScore = () => {
    const [a, b] = liveScore(winners);
    score.textContent = seat === 0 ? `${a} : ${b}` : `${b} : ${a}`;
  };
  const correctOf = (id: string) => (isSituationId(id) ? sitById.get(id)?.correct : qById.get(id)?.correct) ?? -1;
  const fail = (text: string) => {
    stop();
    status.textContent = '';
    show(el('p', { class: 'intro live-note' }, text), el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: d.done }, 'К дуэлям'));
  };

  // ─── Комната ─────────────────────────────────────────────────────────────
  const lobby = () => {
    status.textContent = '';
    if (!d.host) {
      show(el('section', { class: 'panel live-lobby' }, el('p', { class: 'live-code', 'aria-label': 'Код комнаты' }, d.code), el('p', {}, names[0] ? `${names[0]} выбирает задания — дуэль вот-вот начнётся.` : 'Ждём создателя комнаты…')));
      return;
    }
    const link = liveLink(shareBase(), d.code);
    const ready = !!names[1];
    const kinds = el(
      'div',
      { class: 'choices', role: 'group', 'aria-label': 'Задания' },
      ...LIVE_KINDS.map((k) =>
        el(
          'button',
          {
            class: `btn ${k.id === kind ? 'btn--primary' : 'btn--secondary'}`,
            type: 'button',
            'aria-pressed': String(k.id === kind),
            onclick: () => {
              kind = k.id;
              lobby();
            },
          },
          k.title,
        ),
      ),
    );
    show(
      el(
        'section',
        { class: 'panel live-lobby' },
        el('p', { class: 'panel__note' }, 'Код комнаты — скажи его другу или отправь ссылку:'),
        el('p', { class: 'live-code', 'aria-label': 'Код комнаты' }, d.code),
        qrCode(link, 'QR-код комнаты'),
        el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void shareLink(link, 'Дуэль ПДД', `Дуэль по ПДД в реальном времени! Код комнаты ${d.code}:`) }, 'Отправить ссылку'),
        el('p', { class: `live-peer${ready ? ' is-ready' : ''}`, 'aria-live': 'polite' }, ready ? `✅ ${names[1]} в комнате!` : '⏳ Ждём соперника…'),
      ),
      el('h2', { class: 'section-title' }, `Задания: ${LIVE.rounds} раундов`),
      kinds,
      el(
        'button',
        {
          class: 'btn btn--primary btn--lg live-start',
          type: 'button',
          disabled: !ready,
          onclick: () => {
            const sits = d.situations.map((s) => s.id);
            socket?.send({ t: 'setup', items: pickLiveItems(kind, sits, d.questions.map((q) => q.id)) });
          },
        },
        'Начать дуэль',
      ),
    );
  };

  // ─── Раунд ───────────────────────────────────────────────────────────────
  const requestNext = () => {
    if (reveals[round]) {
      socket?.send({ t: 'next', i: round });
      status.textContent = 'Ждём соперника…';
    } else {
      wantNext = true;
      status.textContent = 'Ждём ответа соперника…';
    }
  };

  const answer = (choice: number | null, ms: number) => {
    if (mine[round]) return;
    mine[round] = { choice, ms: Math.min(Math.round(ms), 60_000) };
    socket?.send({ t: 'answer', i: round, choice, ms: mine[round]!.ms });
    status.textContent = reveals[round] ? '' : 'Ответ отправлен. Ждём соперника…';
  };

  const playRound = (i: number) => {
    stopTimers();
    round = i;
    wantNext = false;
    const id = items[i];
    let count = 3;
    const countdown = el('p', { class: 'live-countdown', 'aria-live': 'assertive' }, String(count));
    status.textContent = `Раунд ${i + 1} из ${items.length}`;
    show(countdown);
    timer = window.setInterval(() => {
      count--;
      if (count > 0) {
        countdown.textContent = String(count);
        return;
      }
      window.clearInterval(timer);
      timer = undefined;
      if (isSituationId(id)) {
        const sit = sitById.get(id)!;
        card = situationCard(sit, import.meta.env.BASE_URL, {
          order: optionOrder(sit),
          limit: LIVE.situationSec * slow(),
          readMs: readMs(sit, false),
          last: i === items.length - 1,
          onAnswer: (choice, ms) => answer(choice, ms),
          onNext: requestNext,
        });
        show(card.element);
      } else {
        const q = qById.get(id)!;
        const questionSec = LIVE.questionSec * slow();
        const started = performance.now();
        const fill = el('div', { class: 'sit-timer__fill' });
        const secs = el('span', { class: 'sit-timer__secs' }, `${questionSec} с`);
        const bar = el('div', { class: 'sit-timer', role: 'timer', 'aria-label': 'Время на ответ' }, el('div', { class: 'sit-timer__bar' }, fill), secs);
        const next = el('button', { class: 'btn btn--primary btn--lg', type: 'button', hidden: true, onclick: requestNext }, i === items.length - 1 ? 'Итоги дуэли' : 'Дальше');
        const qCard = renderQuestionCard(q, (r) => {
          answer(r.chosen, performance.now() - started);
          window.clearInterval(timer);
          next.hidden = false;
        });
        timer = window.setInterval(() => {
          const left = questionSec * 1000 - (performance.now() - started);
          fill.style.width = `${Math.max(0, (left / (questionSec * 1000)) * 100)}%`;
          secs.textContent = `${Math.max(0, Math.ceil(left / 1000))} с`;
          if (left > 0 || mine[i]) return;
          window.clearInterval(timer);
          qCard.classList.add('is-timeout');
          answer(null, questionSec * 1000);
          secs.textContent = 'Время вышло';
          next.hidden = false;
        }, 100);
        show(bar, qCard, next);
      }
    }, 800);
  };

  const reveal = (i: number, answers: [LiveAnswer, LiveAnswer]) => {
    reveals[i] = answers;
    const w = roundWinner(answers, correctOf(items[i]));
    winners[i] = w;
    updateScore();
    const me = answers[seat];
    const other = answers[1 - seat];
    const text =
      w === seat ? `🏆 Раунд твой! ${sec(me.ms)} против ${sec(other.ms)}` : w === 1 - seat ? `Раунд за ${them()}: ${sec(other.ms)}${other.choice === correctOf(items[i]) && me.choice === correctOf(items[i]) ? ` против твоих ${sec(me.ms)}` : ''}` : w === 'draw' ? '🤝 Одновременно и верно — ничья' : 'Оба ошиблись — раунд ничей';
    playSound(w === seat ? 'correct' : w === 1 - seat ? 'wrong' : 'tick');
    status.textContent = text;
    if (wantNext) requestNext();
  };

  // ─── Итог ───────────────────────────────────────────────────────────────
  const finish = () => {
    finished = true;
    stopTimers();
    socket?.close();
    const now = Date.now();
    const data = progress();
    data.modes ??= {};
    const sits = (data.modes.situations ??= emptySituations());
    items.forEach((id, i) => {
      const a = mine[i];
      if (!a) return;
      const ok = a.choice === correctOf(id);
      if (isSituationId(id)) recordSituation(sits, id, ok, now);
      else recordAnswer(data, id, ok, now);
    });
    const s = liveScore(winners);
    const verdict = liveVerdict(s, seat);
    const live = (data.modes.live ??= { wins: 0, losses: 0, draws: 0 });
    if (verdict === 'win') {
      live.wins++;
      data.coins += LIVE.wonCoins;
    } else if (verdict === 'loss') live.losses++;
    else live.draws++;
    saveProgress();
    playSound(verdict === 'win' ? 'pass' : verdict === 'loss' ? 'fail' : 'reward');
    status.textContent = '';
    const myScore = s[seat];
    const theirs = s[1 - seat];
    show(
      el(
        'section',
        { class: `panel live-result is-${verdict}` },
        el('p', { class: 'live-verdict' }, verdict === 'win' ? 'Победа! 🏆' : verdict === 'loss' ? 'Поражение' : 'Ничья 🤝'),
        el('p', { class: 'live-final' }, `${names[seat]} ${myScore} : ${theirs} ${them()}`),
        verdict === 'win' ? el('p', { class: 'rewards__line rewards__xp' }, `+${LIVE.wonCoins} монет`) : '',
        el('p', { class: 'panel__note' }, `Всего живых дуэлей: побед ${live.wins}, поражений ${live.losses}, ничьих ${live.draws}.`),
      ),
      el(
        'ol',
        { class: 'live-rounds' },
        ...items.map((id, i) => {
          const r = reveals[i];
          const w = winners[i];
          const mark = w === seat ? '🏆' : w === 1 - seat ? '—' : w === 'draw' ? '🤝' : '✕';
          const what = isSituationId(id) ? `Ситуация: ${short(sitById.get(id)!.text)}` : `Вопрос ${id.replace(/^B(\d\d)-Q(\d\d)$/, (_, t, q) => `билет ${Number(t)}, №${Number(q)}`)}`;
          const ok = (a?: LiveAnswer) => (a ? (a.choice === correctOf(id) ? `✓ ${sec(a.ms)}` : a.choice === null ? 'время вышло' : `✕ ${sec(a.ms)}`) : '—');
          return el('li', {}, el('span', { class: 'live-rounds__mark', 'aria-hidden': 'true' }, mark), el('span', {}, el('b', {}, what), el('br'), `ты: ${ok(r?.[seat])} · ${them()}: ${ok(r?.[1 - seat])}`));
        }),
      ),
      el('p', { class: 'panel__note' }, 'Твои ответы на вопросы билетов ушли в прогресс и в работу над ошибками, как в тренировке.'),
      el('button', { class: 'btn btn--primary btn--lg', type: 'button', onclick: d.again }, 'Новая комната'),
      el('button', { class: 'btn btn--secondary', type: 'button', onclick: d.done }, 'К дуэлям'),
    );
  };

  // ─── Связь ──────────────────────────────────────────────────────────────
  const onMessage = (m: LiveServerMessage) => {
    if (!d.alive() || finished) return;
    switch (m.t) {
      case 'joined':
        seat = m.seat;
        names = m.names;
        if (round < 0) lobby();
        break;
      case 'start':
        items = m.items;
        names = m.names;
        if (items.some((id) => (isSituationId(id) ? !sitById.has(id) : !qById.has(id)))) {
          fail('В этой дуэли задания, которых нет в твоей версии игры. Обновите игру и попробуйте снова.');
          return;
        }
        updateScore();
        playSound('start');
        break;
      case 'round':
        playRound(m.i);
        break;
      case 'answered':
        if (!mine[m.i]) showToast('⚡ Соперник уже ответил — поторопись!');
        break;
      case 'reveal':
        reveal(m.i, m.answers);
        break;
      case 'end':
        finish();
        break;
      case 'left':
        fail(round < 0 ? 'Соперник вышел из комнаты.' : 'Соперник вышел из дуэли. Итог не засчитан.');
        break;
      case 'full':
        fail('В этой комнате уже двое. Попроси у друга новый код.');
        break;
      case 'error':
        if (m.e === 'alone') showToast('Соперник ещё не вошёл в комнату.');
        break;
    }
  };

  const name = getSettings().name;
  const connect = () => {
    status.textContent = 'Подключаемся к комнате…';
    show(el('p', { class: 'loading' }, `Комната ${d.code}`));
    socket = connectLive(d.code, {
      open: () => socket?.send({ t: 'hello', name: getSettings().name }),
      message: onMessage,
      close: () => {
        if (!finished && d.alive()) fail(round < 0 ? 'Не получилось подключиться к комнате. Проверь интернет и попробуй ещё раз.' : 'Связь с комнатой пропала. Итог не засчитан.');
      },
    });
    if (!socket) fail('Дуэль в реальном времени работает в опубликованной игре и только с интернетом.');
  };

  if (name) connect();
  else {
    const input = el('input', { class: 'plate-input live-name', type: 'text', maxlength: '20', autocomplete: 'nickname', placeholder: 'Твоё имя', 'aria-label': 'Твоё имя' }) as HTMLInputElement;
    show(
      el('p', { class: 'intro' }, 'Как тебя зовут? Имя увидит соперник.'),
      input,
      el(
        'button',
        {
          class: 'btn btn--primary btn--lg',
          type: 'button',
          onclick: () => {
            const value = input.value.trim();
            if (!value) return showToast('Напиши имя.');
            updateSettings({ name: value.slice(0, 20) });
            connect();
          },
        },
        'В комнату',
      ),
    );
  }
  return { stop };
}
