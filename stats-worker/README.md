# Посредник статистики (Cloudflare Worker)

Отдаёт статистику GoatCounter только автору игры. Ключ GoatCounter хранится у посредника, а не в игре.
Игра показывает статистику на секретном экране («Настройки» → 7 касаний по «Версия игры» → пароль автора).

- Адрес: https://kurier-pdd-stats.artemigna777.workers.dev (в игре — `STATS_PROXY` в `src/config.ts`).
- Код: `worker.js`. В Cloudflare его загружает GitHub (`.github/workflows/stats-worker.yml`, `wrangler deploy`
  с настройками из `wrangler.jsonc`) при каждом изменении папки `stats-worker` в `main`, а ещё вручную: Actions →
  «Посредник статистики на Cloudflare» → Run workflow. Вставить код через редактор Cloudflare на iPhone не
  получается: в нём нет кнопки «Вставить».
- Для загрузки нужен секрет репозитория `CLOUDFLARE_API_TOKEN` (GitHub → Settings → Secrets and variables →
  Actions). Создаётся так: Cloudflare → профиль → **API Tokens** → **Create Token** → шаблон
  **Edit Cloudflare Workers**. Если у ключа доступ к нескольким аккаунтам — ещё `CLOUDFLARE_ACCOUNT_ID`.
- Секреты: kurier-pdd-stats → **Settings** → **Variables and Secrets** → **Add**, тип **Secret**.
  - `GC_TOKEN` — ключ API GoatCounter с правом «Read statistics». Создать его можно так: на сайте счётчика
    коснуться своего имени вверху → **API**.
  - `STATS_KEY` — ключ автора, 64 знака: только цифры и буквы a–f, без слов вроде «STATS_KEY —». Он получается
    из пароля автора (`authorKey` в `src/stats/author.ts`) и есть только у Артёма. Пробелы по краям не мешают,
    а если в значении есть лишнее, проверка адреса посредника скажет «STATS_KEY задан неверно».
- Проверка: открыть адрес посредника в браузере. Должно быть «Курьер ПДД: посредник статистики работает.».

Что посредник умеет:

- отвечает только на запросы с ключом автора (`Authorization: Bearer <STATS_KEY>`);
- читает только статистику: `/api/v0/stats/total`, `hits`, `toprefs`, `systems`, `locations` и т. п.;
- отвечает браузеру только со страниц игры (CORS).

Тесты — `tests/worker.test.ts`.

Если пароль автора сменить, нужно заменить и `STATS_KEY`.
