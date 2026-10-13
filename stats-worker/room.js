/**
 * Комната дуэли в реальном времени (этап 16): двое игроков, одни и те же задания, раунд за раундом.
 *
 * Здесь только правила комнаты, без сети: что пришло от игрока и кому что отправить. Сеть — в
 * `LiveRoom` (worker.js, Durable Object с WebSocket) и в тестах (подмена WebSocket в браузере).
 *
 * Посредник не знает правильных ответов: он только раздаёт задания и пересылает ответы. Кто выиграл
 * раунд, считают обе игры одинаково — по своим данным (src/duel/live.ts).
 *
 * Сообщения игрока: hello {name}, setup {items} (только создатель комнаты), answer {i, choice, ms},
 * next {i}. Сообщения игрокам: joined {seat, names}, start {items, names}, round {i},
 * reveal {i, answers}, left {seat}, full, error {e}.
 */

export const LIVE = {
  /** Заданий в дуэли: от 1 до 10. */
  maxItems: 10,
  nameMax: 20,
  /** Самое долгое время ответа, мс. */
  maxMs: 60_000,
  /** Номер задания: ситуация «S07-01», провокация «P-01» или вопрос билета «B01-Q01». */
  item: /^(S\d\d-\d\d|P-\d\d|B\d\d-Q\d\d)$/,
};

const cleanName = (v) =>
  typeof v === 'string'
    ? [...v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, LIVE.nameMax).join('').trim()
    : '';

export class RoomCore {
  constructor() {
    /** Места 0 (создатель) и 1: имя или пусто. */
    this.names = ['', ''];
    this.present = [false, false];
    this.items = undefined;
    /** Текущий раунд и ответы в нём; кто уже готов к следующему. */
    this.round = -1;
    this.answers = [undefined, undefined];
    this.ready = [false, false];
    this.over = false;
  }

  /** Новое подключение: место или undefined, если комната занята. */
  join() {
    const seat = this.present.indexOf(false);
    if (seat < 0 || this.over) return undefined;
    this.present[seat] = true;
    return seat;
  }

  /** Сообщение от игрока на месте `seat`: список того, что отправить ([кому, сообщение]; кому — место или 'all'). */
  message(seat, msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return [[seat, { t: 'error', e: 'bad' }]];
    switch (msg.t) {
      case 'hello': {
        const name = cleanName(msg.name);
        if (!name) return [[seat, { t: 'error', e: 'name' }]];
        this.names[seat] = name;
        return [[seat, { t: 'joined', seat, names: this.names }], ...(this.present[1 - seat] ? [[1 - seat, { t: 'joined', seat: 1 - seat, names: this.names }]] : [])];
      }
      case 'setup': {
        if (seat !== 0 || this.items !== undefined) return [[seat, { t: 'error', e: 'setup' }]];
        const items = msg.items;
        if (!Array.isArray(items) || !items.length || items.length > LIVE.maxItems || !items.every((x) => typeof x === 'string' && LIVE.item.test(x)) || new Set(items).size !== items.length)
          return [[seat, { t: 'error', e: 'items' }]];
        if (!this.names[1]) return [[seat, { t: 'error', e: 'alone' }]];
        this.items = items;
        this.round = 0;
        return [
          ['all', { t: 'start', items, names: this.names }],
          ['all', { t: 'round', i: 0 }],
        ];
      }
      case 'answer': {
        const { i, choice, ms } = msg;
        if (this.items === undefined || i !== this.round || this.answers[seat]) return [[seat, { t: 'error', e: 'answer' }]];
        if (!(choice === null || (Number.isInteger(choice) && choice >= 0 && choice < 10)) || !Number.isInteger(ms) || ms < 0 || ms > LIVE.maxMs) return [[seat, { t: 'error', e: 'answer' }]];
        this.answers[seat] = { choice, ms };
        const out = [[1 - seat, { t: 'answered', i }]];
        if (this.answers[0] && this.answers[1]) out.push(['all', { t: 'reveal', i, answers: this.answers }]);
        return out;
      }
      case 'next': {
        if (this.items === undefined || msg.i !== this.round || !(this.answers[0] && this.answers[1])) return [];
        this.ready[seat] = true;
        if (!(this.ready[0] && this.ready[1])) return [];
        this.ready = [false, false];
        this.answers = [undefined, undefined];
        this.round++;
        if (this.round >= this.items.length) {
          this.over = true;
          return [['all', { t: 'end' }]];
        }
        return [['all', { t: 'round', i: this.round }]];
      }
      default:
        return [[seat, { t: 'error', e: 'bad' }]];
    }
  }

  /** Игрок ушёл: сопернику — «соперник вышел»; начатая дуэль на этом заканчивается. */
  leave(seat) {
    this.present[seat] = false;
    if (this.items !== undefined) this.over = true;
    else this.names[seat] = '';
    return this.present[1 - seat] ? [[1 - seat, { t: 'left', seat }]] : [];
  }
}
