/**
 * Подсказка «на главный экран» (src/install.ts): где открыта игра — Safari, другой браузер на iPhone,
 * Android, браузер внутри TikTok, Instagram, Telegram — и какая инструкция ей подходит.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAddToHomeScreen, detectPlatform, inAppName, installGuide } from '../src/install.ts';

const IOS = (tail: string) => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${tail}`;
const ANDROID = (tail: string, wv = false) => `Mozilla/5.0 (Linux; Android 14; SM-A546B${wv ? ' Build/UP1A.231005.007; wv' : ''}) AppleWebKit/537.36 (KHTML, like Gecko) ${tail}`;

const UA = {
  iosSafari: IOS('Version/18.5 Mobile/15E148 Safari/604.1'),
  iosChrome: IOS('CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1'),
  iosTiktok: IOS('Mobile/15E148 musical_ly_41.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/ru Region/RU'),
  iosInstagram: IOS('Mobile/15E148 Instagram 350.0.0.25.104 (iPhone15,2; iOS 18_5; ru_RU; ru; scale=3.00; 1179x2556)'),
  iosWebView: IOS('Mobile/15E148'),
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome: ANDROID('Chrome/138.0.0.0 Mobile Safari/537.36'),
  samsung: ANDROID('SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'),
  androidTiktok: ANDROID('Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 trill_350003 JsSdk/1.0 NetType/WIFI AppName/musical_ly ByteLocale/ru', true),
  androidTelegram: ANDROID('Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 Telegram-Android/11.14.1', true),
  androidWebView: ANDROID('Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36', true),
  desktop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
};

test('где открыта игра: Safari, другой браузер, Android и встроенные браузеры приложений', () => {
  const at = (ua: string, extra: { standalone?: boolean; touchMac?: boolean } = {}) => detectPlatform({ ua, standalone: false, ...extra });
  assert.equal(at(UA.iosSafari), 'ios-safari');
  assert.equal(at(UA.iosChrome), 'ios-other');
  assert.equal(at(UA.iosTiktok), 'in-app-ios');
  assert.equal(at(UA.iosInstagram), 'in-app-ios');
  assert.equal(at(UA.iosWebView), 'in-app-ios', 'без «Safari/» — встроенный браузер');
  assert.equal(at(UA.ipadAsMac, { touchMac: true }), 'ios-safari', 'iPad в режиме «как на компьютере»');
  assert.equal(at(UA.ipadAsMac), 'desktop');
  assert.equal(at(UA.androidChrome), 'android');
  assert.equal(at(UA.samsung), 'android');
  assert.equal(at(UA.androidTiktok), 'in-app-android');
  assert.equal(at(UA.androidTelegram), 'in-app-android');
  assert.equal(at(UA.androidWebView), 'in-app-android', '«; wv)» — встроенный браузер Android');
  assert.equal(at(UA.desktop), 'desktop');
  assert.equal(at(UA.iosSafari, { standalone: true }), 'installed');
  assert.equal(at(UA.androidChrome, { standalone: true }), 'installed');
});

test('название приложения со встроенным браузером', () => {
  assert.equal(inAppName(UA.iosTiktok), 'TikTok');
  assert.equal(inAppName(UA.androidTiktok), 'TikTok');
  assert.equal(inAppName(UA.iosInstagram), 'Instagram');
  assert.equal(inAppName(UA.androidTelegram), 'Telegram');
  assert.equal(inAppName(UA.iosSafari), undefined);
  assert.equal(inAppName(UA.androidChrome), undefined, '«Linux» — не приложение LINE');
});

test('подсказка только на телефоне и только не с главного экрана', () => {
  for (const p of ['in-app-ios', 'in-app-android', 'ios-safari', 'ios-other', 'android'] as const) assert.equal(canAddToHomeScreen(p), true, p);
  assert.equal(canAddToHomeScreen('installed'), false);
  assert.equal(canAddToHomeScreen('desktop'), false);
});

test('инструкция для каждого телефона', () => {
  const safari = installGuide('ios-safari');
  assert.ok(safari.steps.some((s) => s.includes('«Поделиться»')));
  assert.ok(safari.steps.some((s) => s.includes('«На экран „Домой“»')));
  assert.ok(!safari.copyLink && !safari.prompt && !safari.progressNote);

  const tiktok = installGuide('in-app-ios', { app: 'TikTok', answered: 3 });
  assert.match(tiktok.lead, /внутри TikTok.*Safari/);
  assert.match(tiktok.steps[0], /«Открыть в браузере»/);
  assert.ok(tiktok.copyLink, 'если пункта нет — скопировать ссылку');
  assert.ok(tiktok.progressNote, 'прогресс отсюда сам не переедет');
  assert.equal(installGuide('in-app-ios').lead.includes('внутри приложения'), true);

  const chrome = installGuide('in-app-android', { app: 'Telegram' });
  assert.match(chrome.lead, /внутри Telegram.*Chrome/);
  assert.ok(chrome.copyLink && !chrome.progressNote);

  assert.ok(installGuide('ios-other').copyLink, 'нет пункта — открыть в Safari');

  const android = installGuide('android', { canPrompt: true, answered: 50 });
  assert.ok(android.prompt);
  assert.match(android.lead, /«Установить»/);
  assert.ok(!android.progressNote, 'на Android у Chrome и игры с главного экрана сохранение общее');
  assert.ok(!installGuide('android').prompt);
  assert.ok(installGuide('android').steps.some((s) => s.includes('«Добавить на главный экран»')));

  assert.deepEqual(installGuide('desktop').steps, []);
  assert.deepEqual(installGuide('installed').steps, []);
});
