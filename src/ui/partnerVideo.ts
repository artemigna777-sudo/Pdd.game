/**
 * Видеоразбор партнёра под пояснением (после неверного ответа) и окно с видео поверх игры.
 * Если бесплатного видео нет, а билет разобран в курсе, — закрытый блок «разбор в курсе».
 * Данные и ссылки — `partner/partner.ts`.
 */
import { courseUrl, directUrl, embedUrl, formatTime, freeTickets, inCourseOnly, partnerData, partnerVideo, type PartnerData, type PartnerVideo } from '../partner/partner.ts';
import { trackEvent } from '../stats/track.ts';
import { showModal } from './cutscene.ts';
import { el } from './dom.ts';

/** Блок «Видеоразбор» для вопроса или undefined, если ни видео, ни курса к его билету нет. */
export function partnerBlock(q: { ticket: number; number: number }): HTMLElement | undefined {
  const data = partnerData();
  const v = partnerVideo(q, data);
  if (!v) return inCourseOnly(q, data) ? courseBlock(q, data) : undefined;
  return el(
    'div',
    { class: 'partner-video' },
    el('p', { class: 'partner-video__title' }, '🎥 Видеоразбор этого вопроса'),
    el(
      'p',
      { class: 'partner-video__text' },
      `${capital(data.role)} ${data.author} разбирает билет ${v.ticket} на видео${v.start !== undefined ? ` — вопрос ${v.number} начинается с ${formatTime(v.start)}` : ''}.`,
    ),
    el('button', { class: 'btn btn--secondary partner-video__open', type: 'button', onclick: () => openPartnerVideo(v) }, '▶ Смотреть разбор'),
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Закрытый блок: разбор этого вопроса — в онлайн-курсе, кнопка ведёт на страницу курса. */
function courseBlock(q: { ticket: number }, data: PartnerData): HTMLElement {
  const [from, to] = data.course!.tickets!;
  const all = from === 1 && to === 40 ? 'все 40 билетов' : `билеты ${from}–${to}`;
  const free = freeTickets(data);
  return el(
    'div',
    { class: 'partner-video partner-video--locked' },
    el('p', { class: 'partner-video__title' }, '🔒 Видеоразбор этого вопроса'),
    el(
      'p',
      { class: 'partner-video__text' },
      `Доступ к разбору вопросов билета ${q.ticket} — в онлайн-курсе «${data.course!.title}». ${capital(data.role)} ${data.author} разбирает в нём ${all}.`,
      free && ' Бесплатные видео — у билетов ',
      free && el('span', { class: 'partner-video__nowrap' }, `${free}.`),
    ),
    el(
      'a',
      {
        class: 'btn btn--secondary partner-video__open partner-video__course',
        href: courseUrl(data)!,
        target: '_blank',
        rel: 'noopener',
        onclick: () => trackEvent('partner-locked', 'Закрытый разбор: перешли к курсу'),
      },
      'Подробнее о курсе',
    ),
  );
}

/** Окно с видео поверх игры: закрыл — и вопрос на месте, видео останавливается. */
export function openPartnerVideo(v: PartnerVideo): void {
  trackEvent('partner-video', 'Видеоразбор партнёра: открыли');
  const data = partnerData();
  const embed = embedUrl(v);
  const direct = directUrl(v);
  const body = el('div', { class: 'partner-modal' });
  if (!navigator.onLine) body.append(el('p', { class: 'partner-modal__note' }, 'Видео смотрится с интернетом. Подключитесь к сети и откройте разбор ещё раз.'));
  else if (embed)
    body.append(
      el(
        'div',
        { class: 'partner-modal__frame' },
        el('iframe', {
          src: embed,
          title: `Видеоразбор: билет ${v.ticket}, вопрос ${v.number}`,
          allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
          allowfullscreen: true,
          referrerpolicy: 'strict-origin-when-cross-origin',
        }),
      ),
    );
  else body.append(el('p', { class: 'partner-modal__note' }, 'Видео откроется на сайте автора — после просмотра просто вернитесь в игру.'));
  body.append(
    el('p', { class: 'partner-modal__meta' }, `Билет ${v.ticket}, вопрос ${v.number}${v.start !== undefined ? ` · с ${formatTime(v.start)}` : ''} · ${data.role} ${data.author}`),
    el('a', { class: 'btn btn--secondary partner-modal__direct', href: direct, target: '_blank', rel: 'noopener' }, embed ? 'Открыть видео отдельно' : '▶ Открыть видео'),
  );
  const course = courseUrl(data);
  if (course && data.course)
    body.append(
      el(
        'p',
        { class: 'partner-modal__course' },
        `Все 40 билетов — в курсе «${data.course.title}». `,
        el('a', { href: course, target: '_blank', rel: 'noopener', onclick: () => trackEvent('partner-course', 'Курс партнёра: перешли') }, 'О курсе'),
      ),
    );
  void showModal(`Разбор: билет ${v.ticket}, вопрос ${v.number}`, body, [{ label: 'Вернуться к вопросу', primary: true }]);
}
