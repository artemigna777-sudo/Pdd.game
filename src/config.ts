/** Название игры. Меняется здесь, в index.html и в манифесте (vite.config.ts). */
export const GAME_TITLE = 'Курьер ПДД';
export const GAME_SUBTITLE = 'Игра для подготовки к теории на права';

/** Откуда пояснения к ответам (в PDF с билетами их нет), см. data/raw/pdd_russia/SOURCE.md. */
export const EXPLANATIONS_SOURCE = { name: 'pdd_russia', url: 'https://github.com/etspring/pdd_russia' };

/**
 * Анонимная статистика: код сайта в GoatCounter (https://<код>.goatcounter.com). Пусто — статистика
 * не собирается. Что считается и как посмотреть — `src/stats/track.ts` и журнал в CLAUDE.md.
 */
export const STATS_SITE = 'kurier-pdd';

/**
 * Посредник статистики (Cloudflare Worker, код — stats-worker/worker.js): отдаёт статистику
 * GoatCounter только по ключу автора. Пусто — экран статистики берёт числа из открытого счётчика.
 */
export const STATS_PROXY = 'https://kurier-pdd-stats.artemigna777.workers.dev';
