/**
 * Страницы билетов для поисковиков: `npm run seo` после `npm run build` (так делает публикация на GitHub Pages).
 *
 * Люди ищут «билет 12 вопрос 7 ПДД» — на каждый из 800 вопросов своя страница с картинкой, вариантами,
 * правильным ответом и пояснением, плюс страницы 40 билетов, тем и общий список. На каждой — кнопка
 * «Пройти билет в игре» (`#bilet=N`, метка `?ref=seo`). Пишет в `dist/bilety/` и `dist/sitemap.xml`.
 * В Android-сборку и в кэш игры страницы не попадают: их собирает только публикация сайта.
 * Тексты вопросов и ответы — из `data/questions.json` без изменений (правило 1 в CLAUDE.md).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Question } from '../src/data/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://artemigna777-sudo.github.io/Pdd.game/';
const OUT = path.join(DIST, 'bilety');
const TICKETS = 40;

const questions: Question[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8'));
const byTicket = new Map<number, Question[]>();
for (const q of questions) byTicket.set(q.ticket, [...(byTicket.get(q.ticket) ?? []), q]);
for (const list of byTicket.values()) list.sort((a, b) => a.number - b.number);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};
const slug = (s: string) =>
  [...s.toLowerCase()]
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const topics = [...new Set(questions.map((q) => q.topic))];
const topicSlug = new Map(topics.map((t) => [t, slug(t)]));

/** Адрес страницы относительно `bilety/` и полный адрес для поисковиков. */
const pagePath = {
  index: '',
  ticket: (t: number) => `${t}/`,
  question: (q: Question) => `${q.ticket}/${q.number}/`,
  topic: (t: string) => `tema/${topicSlug.get(t)}/`,
};
const abs = (p: string) => `${SITE}bilety/${p}`;

interface Crumb {
  name: string;
  path: string;
}

/** Общая разметка страницы; ссылки внутри — относительные (`up` — путь от страницы до `bilety/`). */
function page(opts: { path: string; title: string; description: string; crumbs: Crumb[]; body: string }): string {
  const depth = opts.path.split('/').filter(Boolean).length;
  const up = '../'.repeat(depth);
  const game = `${up}../`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: opts.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  };
  const crumbs = opts.crumbs
    .map((c, i) => (i === opts.crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${up}${c.path}">${esc(c.name)}</a>`))
    .join(' › ');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${abs(opts.path)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${abs(opts.path)}">
<meta property="og:image" content="${SITE}icons/icon-512.png">
<link rel="icon" href="${game}icons/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}s.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header><a class="brand" href="${game}?ref=seo"><img src="${game}icons/icon.svg" alt="" width="32" height="32">Курьер ПДД</a></header>
<main>
<nav class="crumbs">${crumbs}</nav>
${opts.body}
</main>
<footer>
<p>Тексты вопросов, картинки и правильные ответы — из экзаменационных билетов ПДД категорий A, B, M. Пояснения — из открытого набора <a href="https://github.com/etspring/pdd_russia" rel="nofollow">pdd_russia</a>.</p>
<p><a href="${game}?ref=seo">Игра «Курьер ПДД»</a> · <a href="${up}">Все билеты</a> · <a href="${game}privacy.html">Конфиденциальность</a></p>
</footer>
</body>
</html>
`;
}

const cta = (q: { ticket: number }, up: string, text: string) =>
  `<a class="cta" href="${up}../?ref=seo#bilet=${q.ticket}">${esc(text)}</a>
<p class="cta-sub">Бесплатно и без регистрации: сюжет, город, экзамен как в ГИБДД и повтор ошибок.</p>`;

const crumbsFor = (extra: Crumb[]): Crumb[] => [{ name: 'Билеты ПДД', path: pagePath.index }, ...extra];

function questionPage(q: Question): string {
  const list = byTicket.get(q.ticket)!;
  const i = list.indexOf(q);
  const prev = list[i - 1] ?? (q.ticket > 1 ? byTicket.get(q.ticket - 1)!.at(-1) : undefined);
  const next = list[i + 1] ?? (q.ticket < TICKETS ? byTicket.get(q.ticket + 1)![0] : undefined);
  const up = '../../';
  const options = q.options.map((o) => `<li>${esc(o)}</li>`).join('');
  const explanation = q.explanation
    ? `${q.explanation
        .split(/\n+/)
        .map((p) => `<p>${esc(p)}</p>`)
        .join('')}<p class="src">Пояснение — из открытого набора <a href="https://github.com/etspring/pdd_russia" rel="nofollow">pdd_russia</a>.</p>`
    : '';
  const nav = (x: Question | undefined, label: string) =>
    x ? `<a href="${up}${pagePath.question(x)}">${label}<br><small>Билет ${x.ticket}, вопрос ${x.number}</small></a>` : '<span></span>';
  const grid = list
    .map((x) => (x === q ? `<span class="on">${x.number}</span>` : `<a href="${up}${pagePath.question(x)}">${x.number}</a>`))
    .join('');
  const body = `<h1>Билет ${q.ticket}, вопрос ${q.number}</h1>
<p class="meta"><a href="${up}${pagePath.topic(q.topic)}">${esc(q.topic)}</a> · категории A, B, M</p>
<article class="q">
${q.image ? `<img src="${up}../${q.image}" alt="Картинка к вопросу ${q.number} билета ${q.ticket}">` : ''}
<p class="text">${esc(q.text)}</p>
<ol class="opts">${options}</ol>
<details>
<summary>Показать правильный ответ</summary>
<p class="answer">Правильный ответ: ${q.correct + 1}. ${esc(q.options[q.correct])}</p>
${explanation}
</details>
</article>
${cta(q, up, `Пройти весь билет ${q.ticket} в игре`)}
<nav class="pager">${nav(prev, '← Предыдущий')}${nav(next, 'Следующий →')}</nav>
<h2>Все вопросы билета ${q.ticket}</h2>
<nav class="grid">${grid}</nav>`;
  return page({
    path: pagePath.question(q),
    title: `Билет ${q.ticket}, вопрос ${q.number} ПДД A, B, M — ответ и пояснение`,
    description: `${clip(q.text, 140)} Правильный ответ и пояснение к вопросу ${q.number} билета ${q.ticket} ПДД.`,
    crumbs: crumbsFor([
      { name: `Билет ${q.ticket}`, path: pagePath.ticket(q.ticket) },
      { name: `Вопрос ${q.number}`, path: pagePath.question(q) },
    ]),
    body,
  });
}

const questionItem = (q: Question, up: string, label: string) =>
  `<li><a href="${up}${pagePath.question(q)}"><b>${esc(label)}</b> ${esc(clip(q.text, 110))}</a></li>`;

function ticketPage(t: number): string {
  const list = byTicket.get(t)!;
  const up = '../';
  const tickets = Array.from({ length: TICKETS }, (_, i) => i + 1)
    .map((n) => (n === t ? `<span class="on">${n}</span>` : `<a href="${up}${pagePath.ticket(n)}">${n}</a>`))
    .join('');
  const body = `<h1>Билет ${t} ПДД: 20 вопросов с ответами</h1>
<p class="lead">Экзаменационный билет ${t} для категорий A, B, M. У каждого вопроса — картинка, варианты, правильный ответ и пояснение.</p>
${cta({ ticket: t }, up, `Пройти билет ${t} в игре`)}
<ol class="list">${list.map((q) => questionItem(q, up, `${q.number}.`)).join('')}</ol>
<h2>Другие билеты</h2>
<nav class="grid">${tickets}</nav>`;
  return page({
    path: pagePath.ticket(t),
    title: `Билет ${t} ПДД A, B, M — 20 вопросов с ответами и пояснениями`,
    description: `Все 20 вопросов билета ${t} ПДД категорий A, B, M: картинки, правильные ответы и пояснения. Пройдите билет онлайн в игре.`,
    crumbs: crumbsFor([{ name: `Билет ${t}`, path: pagePath.ticket(t) }]),
    body,
  });
}

function topicPage(topic: string): string {
  const list = questions.filter((q) => q.topic === topic);
  const up = '../../';
  const body = `<h1>${esc(topic)}: вопросы из билетов ПДД</h1>
<p class="lead">${list.length} ${plural(list.length, 'вопрос', 'вопроса', 'вопросов')} по теме «${esc(topic)}» из 40 экзаменационных билетов категорий A, B, M — с правильными ответами и пояснениями.</p>
<a class="cta" href="${up}../?ref=seo">Тренироваться в игре</a>
<p class="cta-sub">Бесплатно и без регистрации: сюжет, город, экзамен как в ГИБДД и повтор ошибок.</p>
<ol class="list">${list.map((q) => questionItem(q, up, `Билет ${q.ticket}, вопрос ${q.number}.`)).join('')}</ol>`;
  return page({
    path: pagePath.topic(topic),
    title: `${topic} — вопросы ПДД из билетов с ответами`,
    description: `${list.length} ${plural(list.length, 'вопрос', 'вопроса', 'вопросов')} экзаменационных билетов ПДД по теме «${topic}» с ответами и пояснениями.`,
    crumbs: crumbsFor([{ name: topic, path: pagePath.topic(topic) }]),
    body,
  });
}

function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

function indexPage(): string {
  const tickets = Array.from({ length: TICKETS }, (_, i) => `<a href="${pagePath.ticket(i + 1)}">${i + 1}</a>`).join('');
  const themes = [...topics]
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((t) => `<li><a href="${pagePath.topic(t)}">${esc(t)}</a> <small>${questions.filter((q) => q.topic === t).length}</small></li>`)
    .join('');
  const body = `<h1>Билеты ПДД онлайн: 40 билетов A, B, M с ответами</h1>
<p class="lead">Все 800 вопросов экзаменационных билетов ПДД категорий A, B, M: картинки, правильные ответы и пояснения. Выберите билет или тему.</p>
<a class="cta" href="../?ref=seo">Готовиться к экзамену в игре</a>
<p class="cta-sub">«Курьер ПДД» — бесплатная игра: вы ездите по городу, и вопросы билетов встречаются прямо на дороге. Экзамен как в ГИБДД, повтор ошибок через 1, 3 и 7 дней, план к дате экзамена.</p>
<h2>Билеты</h2>
<nav class="grid">${tickets}</nav>
<h2>Темы</h2>
<ul class="topics">${themes}</ul>`;
  return page({
    path: pagePath.index,
    title: 'Билеты ПДД онлайн A, B, M — 40 билетов с ответами и пояснениями',
    description: 'Все 800 вопросов экзаменационных билетов ПДД категорий A, B, M с картинками, правильными ответами и пояснениями. Билеты и темы, экзамен онлайн в игре.',
    crumbs: [{ name: 'Билеты ПДД', path: pagePath.index }],
    body,
  });
}

const CSS = `:root{color-scheme:light dark;--bg:#f6f4ef;--text:#1d1f24;--muted:#5b606b;--card:#fff;--line:#e2ded4;--accent:#b86e00;--on:#1b2430;--ok:#1f7a3a}
@media (prefers-color-scheme:dark){:root{--bg:#12151b;--text:#eceff4;--muted:#a2a9b6;--card:#1b2029;--line:#2b3240;--accent:#ffb703;--on:#ffb703;--ok:#6fd08c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
header,main,footer{max-width:760px;margin:0 auto;padding:0 16px}header{padding-top:12px}
.brand{display:inline-flex;align-items:center;gap:10px;min-height:48px;font-weight:800;color:var(--text);text-decoration:none}
a{color:var(--accent)}h1{font-size:1.6rem;line-height:1.25;margin:8px 0}h2{font-size:1.2rem;margin:28px 0 10px}
.crumbs,.meta,.lead,.cta-sub,small,footer{color:var(--muted)}.crumbs{font-size:.9rem;margin-top:4px}
.q{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:12px 0}
.q img{display:block;width:100%;height:auto;border-radius:10px;margin-bottom:12px}.text{font-weight:600;margin:0 0 8px}
.opts{padding-left:1.3em;margin:0}.opts li{margin:8px 0}
details{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}summary{cursor:pointer;font-weight:700;color:var(--accent);min-height:44px;display:flex;align-items:center}
.answer{color:var(--ok);font-weight:700}.src{font-size:.9rem;color:var(--muted)}
.cta{display:flex;align-items:center;justify-content:center;min-height:52px;margin:18px 0 6px;padding:10px 18px;border-radius:14px;background:#ffb703;color:#1b2430;font-weight:800;text-decoration:none;text-align:center}
.cta-sub{margin:0 0 8px;font-size:.92rem}
.pager{display:flex;justify-content:space-between;gap:12px;margin:18px 0}.pager a{min-height:48px;text-decoration:none}
.grid{display:flex;flex-wrap:wrap;gap:8px}.grid a,.grid span{display:flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;border:1px solid var(--line);border-radius:12px;background:var(--card);text-decoration:none;font-weight:700}
.grid .on{background:var(--on);color:var(--bg);border-color:var(--on)}
.list{padding-left:0;list-style:none}.list li{margin:8px 0}.list a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text);text-decoration:none}
.list b{color:var(--accent)}.topics{padding-left:1.2em}.topics li{margin:6px 0}
footer{font-size:.88rem;padding-top:24px;padding-bottom:40px;border-top:1px solid var(--line);margin-top:32px}
`;

function write(rel: string, html: string): void {
  const file = path.join(OUT, rel, 'index.html');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, html);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 's.css'), CSS);
const paths: string[] = [pagePath.index];
write(pagePath.index, indexPage());
for (let t = 1; t <= TICKETS; t++) {
  write(pagePath.ticket(t), ticketPage(t));
  paths.push(pagePath.ticket(t));
}
for (const q of questions) {
  write(pagePath.question(q), questionPage(q));
  paths.push(pagePath.question(q));
}
for (const t of topics) {
  write(pagePath.topic(t), topicPage(t));
  paths.push(pagePath.topic(t));
}

const today = new Date().toISOString().slice(0, 10);
const urls = [SITE, ...paths.map(abs)].map((u) => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n');
writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`Страницы билетов: ${paths.length} (билеты ${TICKETS}, вопросы ${questions.length}, темы ${topics.length}) → dist/bilety, dist/sitemap.xml`);
