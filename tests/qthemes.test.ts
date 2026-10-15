/**
 * Оформления вопросов: каталог, покупка и выбор, праздники по датам, «Авто», серия и монеты.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buyOrSelectTheme } from '../src/progress/garage.ts';
import { emptyProgress, sanitizeProgress } from '../src/progress/progress.ts';
import { QSTREAK_COINS, QTHEMES, QTHEME_CLASSIC, activeQTheme, bumpQStreak, buyOrSelectQTheme, driverDay, holidayOn, holidayUntil, orthodoxEaster, ownsQTheme, qStreakNow, shopQThemes } from '../src/progress/qthemes.ts';

const d = (s: string) => new Date(`${s}T12:00:00`);

test('каталог: 15 новых тем, 11 праздников, 5 тем города; цены и серии', () => {
  const by = (g: string) => QTHEMES.filter((t) => t.group === g).map((t) => t.id);
  assert.equal(by('new').length, 15);
  assert.ok(by('new').includes('gym'));
  assert.deepEqual(by('holiday'), ['newyear', 'valentine', 'feb23', 'mar8', 'maslenitsa', 'cosmos', 'victory', 'gibdd', 'school', 'driver', 'halloween']);
  assert.deepEqual(by('city'), ['winter', 'autumn', 'toy', 'neon', 'pixel']);
  assert.equal(new Set(QTHEMES.map((t) => t.id)).size, QTHEMES.length);
  for (const t of QTHEMES) {
    if (t.group === 'city') assert.equal(t.price, 0, t.id);
    else assert.ok(t.price >= 300 && t.price <= 400, t.id);
    if (t.group === 'holiday') assert.ok(t.when, t.id);
  }
  // 9 Мая — сдержанно, без серии; 23 февраля — четыре звезды на погоне.
  assert.equal(QTHEMES.find((t) => t.id === 'victory')!.streak, 0);
  assert.equal(QTHEMES.find((t) => t.id === 'feb23')!.streak, 4);
});

test('праздники по датам: границы, Масленица по Пасхе, День автомобилиста', () => {
  assert.equal(orthodoxEaster(2026).toDateString(), new Date(2026, 3, 12).toDateString());
  assert.equal(orthodoxEaster(2027).toDateString(), new Date(2027, 4, 2).toDateString());
  assert.equal(driverDay(2026).toDateString(), new Date(2026, 9, 25).toDateString());
  assert.equal(driverDay(2027).toDateString(), new Date(2027, 9, 31).toDateString());

  const cases: [string, string | undefined][] = [
    ['2026-12-19', undefined],
    ['2026-12-20', 'newyear'],
    ['2027-01-01', 'newyear'],
    ['2027-01-10', 'newyear'],
    ['2027-01-11', undefined],
    ['2027-02-14', 'valentine'],
    ['2027-02-23', 'feb23'],
    // Масленица 2027: 8–14 марта; 8–9 марта — сначала 8 Марта.
    ['2027-03-07', 'mar8'],
    ['2027-03-09', 'mar8'],
    ['2027-03-10', 'maslenitsa'],
    ['2027-03-14', 'maslenitsa'],
    ['2027-03-15', undefined],
    // 2026: Масленица 16–22 февраля, 20–22 — уже 23 февраля.
    ['2026-02-16', 'maslenitsa'],
    ['2026-02-21', 'feb23'],
    ['2026-04-12', 'cosmos'],
    ['2026-05-09', 'victory'],
    ['2026-07-03', 'gibdd'],
    ['2026-08-25', 'school'],
    ['2026-09-05', 'school'],
    ['2026-09-06', undefined],
    // 2026: День автомобилиста 25 октября, ±3 дня; 28-го — он, 29-го — Хэллоуин.
    ['2026-10-21', undefined],
    ['2026-10-22', 'driver'],
    ['2026-10-28', 'driver'],
    ['2026-10-29', 'halloween'],
    ['2026-11-01', 'halloween'],
    ['2026-11-02', undefined],
    ['2026-10-15', undefined],
  ];
  for (const [date, want] of cases) assert.equal(holidayOn(d(date)), want, date);
});

test('покупка и выбор: за монеты один раз, «Авто», обычная карточка, тема города не продаётся отдельно', () => {
  const data = emptyProgress();
  data.coins = 340;
  assert.equal(buyOrSelectQTheme(data, 'gym'), 'no-coins');
  assert.equal(data.coins, 340);
  assert.equal(buyOrSelectQTheme(data, 'нет-такого'), 'unknown');
  assert.equal(buyOrSelectQTheme(data, 'winter'), 'locked');
  assert.equal(buyOrSelectQTheme(data, 'cats'), 'bought');
  assert.equal(data.coins, 40);
  assert.equal(data.garage.qtheme, 'cats');
  assert.equal(buyOrSelectQTheme(data, QTHEME_CLASSIC), 'selected');
  assert.equal(buyOrSelectQTheme(data, 'cats'), 'selected');
  assert.equal(data.coins, 40);
  assert.equal(buyOrSelectQTheme(data, undefined), 'selected');
  assert.equal(data.garage.qtheme, undefined);

  // Тема города открывает своё оформление.
  data.coins = 250;
  assert.equal(buyOrSelectTheme(data, 'winter'), 'bought');
  assert.ok(ownsQTheme(data, 'winter'));
  assert.equal(buyOrSelectQTheme(data, 'winter'), 'selected');

  // Сохранение: выбор и серия переживают перезапуск, мусор отбрасывается.
  data.garage.qstreak = 3;
  const back = sanitizeProgress(JSON.parse(JSON.stringify(data)));
  assert.equal(back.garage.qtheme, 'winter');
  assert.equal(back.garage.qstreak, 3);
  const bad = sanitizeProgress({ garage: { qtheme: '<script>', qstreak: 99, owned: [] } });
  assert.equal(bad.garage.qtheme, undefined);
  assert.equal(bad.garage.qstreak, undefined);
});

test('праздничное оформление: видно и продаётся только в дни своего праздника, купленное — навсегда', () => {
  const data = emptyProgress();
  data.coins = 1000;
  const ids = (list: { id: string }[]) => list.map((t) => t.id);
  // Не праздник: праздничных в магазине нет, купить нельзя.
  const plain = shopQThemes(data, d('2026-10-15'));
  assert.equal(plain.holidayNow, undefined);
  assert.equal(plain.until, undefined);
  assert.deepEqual(plain.owned, []);
  assert.equal(plain.fresh.length, 15);
  assert.ok(plain.fresh.every((t) => t.group === 'new'));
  assert.deepEqual(ids(plain.city), ['winter', 'autumn', 'toy', 'neon', 'pixel']);
  assert.equal(buyOrSelectQTheme(data, 'newyear', d('2026-10-15')), 'unavailable');
  assert.equal(buyOrSelectQTheme(data, 'halloween', d('2026-12-31')), 'unavailable');
  assert.equal(data.coins, 1000);

  // Праздник: виден только он, купить можно до последнего дня.
  const ny = shopQThemes(data, d('2026-12-31'));
  assert.equal(ny.holidayNow?.id, 'newyear');
  assert.equal(ny.until?.toDateString(), new Date(2027, 0, 10).toDateString());
  assert.equal(holidayUntil(d('2026-10-15')), undefined);
  assert.equal(buyOrSelectQTheme(data, 'newyear', d('2027-01-10')), 'bought');
  assert.equal(data.coins, 700);
  assert.equal(data.garage.qtheme, 'newyear');
  assert.deepEqual(shopQThemes(data, d('2027-01-05')).owned, []);

  // После праздника купленное остаётся: в «Моих праздничных», выбирается бесплатно.
  assert.deepEqual(ids(shopQThemes(data, d('2027-03-01')).owned), ['newyear']);
  assert.equal(buyOrSelectQTheme(data, QTHEME_CLASSIC, d('2027-03-01')), 'selected');
  assert.equal(buyOrSelectQTheme(data, 'newyear', d('2027-03-01')), 'selected');
  assert.equal(data.coins, 700);
  assert.equal(activeQTheme(data, { holidays: true, now: d('2027-03-01') }), 'newyear');
  // В другой праздник: сегодняшний — сверху, купленный — в «Моих праздничных».
  const mar8 = shopQThemes(data, d('2027-03-08'));
  assert.equal(mar8.holidayNow?.id, 'mar8');
  assert.deepEqual(ids(mar8.owned), ['newyear']);
});

test('«Авто»: свой выбор → праздник → тема города → обычная карточка', () => {
  const data = emptyProgress();
  const on = { holidays: true, now: d('2026-12-31') };
  const off = { holidays: false, now: d('2026-12-31') };
  const plain = { holidays: true, now: d('2026-10-15') };
  assert.equal(activeQTheme(data, plain), QTHEME_CLASSIC);
  assert.equal(activeQTheme(data, on), 'newyear');
  assert.equal(activeQTheme(data, off), QTHEME_CLASSIC);
  data.coins = 1000;
  buyOrSelectTheme(data, 'neon');
  assert.equal(activeQTheme(data, plain), 'neon');
  assert.equal(activeQTheme(data, on), 'newyear');
  assert.equal(activeQTheme(data, off), 'neon');
  buyOrSelectQTheme(data, 'gym');
  assert.equal(activeQTheme(data, on), 'gym');
  buyOrSelectQTheme(data, QTHEME_CLASSIC);
  assert.equal(activeQTheme(data, on), QTHEME_CLASSIC);
  // Выбор, которого у игрока нет (испорченное сохранение), не действует.
  data.garage.qtheme = 'sakura';
  assert.equal(activeQTheme(data, plain), 'neon');
});

test('серия: растёт с верными ответами, ошибка обнуляет, полная серия — монеты и заново', () => {
  const data = emptyProgress();
  assert.deepEqual(bumpQStreak(data, QTHEME_CLASSIC, true), { n: 0, max: 0, coins: 0 });
  assert.deepEqual(bumpQStreak(data, 'victory', true), { n: 0, max: 0, coins: 0 });
  for (let i = 1; i <= 4; i++) assert.deepEqual(bumpQStreak(data, 'gym', true), { n: i, max: 5, coins: 0 });
  assert.deepEqual(qStreakNow(data, 'gym'), { n: 4, max: 5 });
  assert.deepEqual(bumpQStreak(data, 'gym', true), { n: 5, max: 5, coins: QSTREAK_COINS });
  assert.equal(data.coins, QSTREAK_COINS);
  assert.deepEqual(qStreakNow(data, 'gym'), { n: 0, max: 5 });
  bumpQStreak(data, 'gym', true);
  bumpQStreak(data, 'gym', true);
  assert.deepEqual(bumpQStreak(data, 'gym', false), { n: 0, max: 5, coins: 0 });
  // У 23 февраля серия короче: четыре звезды.
  for (let i = 0; i < 3; i++) bumpQStreak(data, 'feb23', true);
  assert.deepEqual(bumpQStreak(data, 'feb23', true), { n: 4, max: 4, coins: QSTREAK_COINS });
});
