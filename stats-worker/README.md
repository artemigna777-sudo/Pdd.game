# Посредник статистики (Cloudflare Worker)

Отдаёт статистику GoatCounter только автору игры. Ключ GoatCounter хранится у посредника, а не в игре.
Игра показывает статистику на секретном экране («Настройки» → 7 касаний по «Версия игры» → пароль автора).

- Адрес: https://kurier-pdd-stats.artemigna777.workers.dev (в игре — `STATS_PROXY` в `src/config.ts`).
- Код: `worker.js`. Его вставляют в Cloudflare целиком: Workers & Pages → kurier-pdd-stats → **Edit code** →
  выделить всё → вставить → **Deploy**.
- Секреты: kurier-pdd-stats → **Settings** → **Variables and Secrets** → **Add**, тип **Secret**.
  - `GC_TOKEN` — ключ API GoatCounter с правом «Read statistics». Создать его можно так: на сайте счётчика
    коснуться своего имени вверху → **API**.
  - `STATS_KEY` — ключ автора, 64 знака. Он получается из пароля автора (`authorKey` в `src/stats/author.ts`)
    и есть только у Артёма.
- Проверка: открыть адрес посредника в браузере. Должно быть «Курьер ПДД: посредник статистики работает.».

Что посредник умеет:

- отвечает только на запросы с ключом автора (`Authorization: Bearer <STATS_KEY>`);
- читает только статистику: `/api/v0/stats/total`, `hits`, `toprefs`, `systems`, `locations` и т. п.;
- отвечает браузеру только со страниц игры (CORS).

Тесты — `tests/worker.test.ts`.

Если пароль автора сменить, нужно заменить и `STATS_KEY`.
