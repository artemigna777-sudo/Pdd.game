/** Название игры. Меняется здесь, в index.html и в манифесте (vite.config.ts). */
export const GAME_TITLE = 'Курьер ПДД';
export const GAME_SUBTITLE = 'Игра для подготовки к теории на права';

/** Откуда пояснения к ответам (в PDF с билетами их нет), см. data/raw/pdd_russia/SOURCE.md. */
export const EXPLANATIONS_SOURCE = { name: 'pdd_russia', url: 'https://github.com/etspring/pdd_russia' };

/**
 * Анонимная статистика: код сайта в GoatCounter (https://<код>.goatcounter.com). Пусто — статистика
 * не собирается. Что считается и как посмотреть — `src/stats/track.ts` и журнал в CLAUDE.md.
 */
export const STATS_SITE = '';
