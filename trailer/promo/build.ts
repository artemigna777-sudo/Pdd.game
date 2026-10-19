/**
 * Ролик для страницы приложения в RuStore (VK Видео): 1080×1920, 46 с. Настоящие кадры игры
 * (`record.ts`), рисованные кадры сюжета из `public/scenes`, кинетический текст, музыка (`music.ts`).
 *
 *   npx tsx trailer/promo/build.ts   → trailer/promo/video/index.html
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { carSvg } from '../../src/ui/dailyView.ts';
import { CUES, T } from './timeline.ts';

const dir = new URL('./video/', import.meta.url);
mkdirSync(new URL('scenes/', dir), { recursive: true });
copyFileSync(new URL('../video/gsap.min.js', import.meta.url), new URL('gsap.min.js', dir));
const font = (file: string) => readFileSync(new URL(`../video/fonts/${file}`, import.meta.url)).toString('base64');

/** Кадры сюжета: глава/файл. */
const ART = ['ch3/turbin', 'ch3/artem-close', 'ch6/phone', 'ch9/dashcam', 'ch3/crossroads'];
for (const a of ART) copyFileSync(new URL(`../../public/scenes/${a}.webp`, import.meta.url), new URL(`scenes/${a.replace('/', '-')}.webp`, dir));

const car = carSvg({ color: 0xffb703, sticker: 'none', model: 'sedan' }).replace('<svg ', '<svg width="100%" height="100%" ');
const W = 1080;
const H = 1920;

/**
 * Отрезки записей игры: файл, с какой секунды записи, начало и длина в ролике. `from` подобраны
 * так, чтобы ответ в карточке попадал на звук (`CUES`).
 */
const SHOTS: { id: string; file: string; from: number; start: number; duration: number }[] = [
  { id: 'q', file: 'question', from: 0.2, start: T.question, duration: 4 },
  { id: 'w', file: 'wrong', from: 0.2, start: T.wrong, duration: 4 },
  { id: 'm1', file: 'situations', from: 3.4, start: T.modes, duration: 1.5 },
  { id: 'm2', file: 'signs', from: 2.6, start: T.modes + 1.5, duration: 1.5 },
  { id: 'm3', file: 'duel', from: 0, start: T.modes + 3, duration: 1.5 },
  { id: 'm4a', file: 'theme-neon', from: 1, start: T.modes + 4.5, duration: 0.5 },
  { id: 'm4b', file: 'theme-winter', from: 1, start: T.modes + 5, duration: 0.5 },
  { id: 'm4c', file: 'theme-retro', from: 1, start: T.modes + 5.5, duration: 0.5 },
  { id: 'e', file: 'exam', from: 0.3, start: T.exam, duration: 4 },
];

/** Подпись сцены: первая строка белая, вторая — жёлтая с подчёркиванием. */
const caption = (id: string, a: string, b: string) => `
      <div class="cap" id="${id}">
        <div class="line"><div class="l1">${a}</div></div>
        <div class="line"><div class="l2"><span>${b}</span><i class="bar"></i></div></div>
      </div>`;
const capIn = (id: string, t: number) => `
      tl.fromTo('#${id} .l1', { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'power4.out' }, ${t});
      tl.fromTo('#${id} .l2', { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'power4.out' }, ${t + 0.12});
      tl.fromTo('#${id} .bar', { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power3.inOut' }, ${t + 0.3});`;
const capOut = (id: string, t: number) => `
      tl.to('#${id} .l1, #${id} .l2', { yPercent: -110, duration: 0.3, ease: 'power3.in', stagger: 0.05 }, ${t - 0.32});`;

const shots = SHOTS.map((s) => `
            <video id="${s.id}" class="clip shot" src="clips/${s.file}.mp4" data-start="${s.start}" data-duration="${s.duration}" data-media-start="${s.from}" muted playsinline></video>`).join('');

const MODES = [
  ['Ситуации на дороге', 'на время, как в жизни'],
  ['Знакодекс', 'собери все знаки'],
  ['Дуэль с другом', 'кто лучше знает правила'],
  ['Темы города', 'зима, неон, ретро'],
];

const STORY_LINES = ['Турбин зовёт Артёма в «Турбо»', '«Зарплата вдвое больше…»', 'Пекарню «Калач» хотят закрыть', 'Запись регистратора — у тебя'];
const CHOICES = ['Не уходи: «Стрела» — твоя команда', 'Давай вместе учить билеты', 'Решай сам: это твоя жизнь'];
const BADGES = ['800 вопросов', '10 глав сюжета', 'Экзамен как в ГИБДД', 'Работает без интернета'];

const html = `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Курьер ПДД — ролик RuStore</title>
    <script src="gsap.min.js"></script>
    <style>
      @font-face { font-family: 'M'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2'); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: 'M'; font-weight: 100 900; src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+2122, U+2212; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0d1219; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'M', sans-serif; color: #f5f7fa;
        background: radial-gradient(130% 80% at 50% 40%, #233046 0%, #121a26 55%, #0b1017 100%); }
      #world { position: absolute; inset: 0; }
      .full { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .hl { color: #ffb703; }

      /* Фон: город сверху */
      #city { filter: brightness(0.42) saturate(1.15); }
      #cityShade { position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 55%, rgba(13,18,25,0) 0%, rgba(13,18,25,.55) 70%, rgba(13,18,25,.92) 100%); }
      .streak { position: absolute; top: -600px; width: 10px; height: 520px; border-radius: 6px; background: linear-gradient(#ffb70300, #ffb703cc, #ffb70300); opacity: 0; }
      #glow { position: absolute; left: 50%; top: 1050px; width: 1300px; height: 1300px; margin: -650px 0 0 -650px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255,183,3,.22), rgba(255,183,3,0) 62%); opacity: 0; }

      /* Начало */
      #hook { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
      #n800 { font-size: 400px; font-weight: 900; letter-spacing: -18px; line-height: .9; color: #ffb703; }
      #n800sub { margin-top: 26px; font-size: 62px; font-weight: 800; letter-spacing: -1px; }
      #cram { position: absolute; left: 0; right: 0; top: 760px; text-align: center; font-size: 170px; font-weight: 900; letter-spacing: -6px; color: #8a96a8; }
      #cram i { position: absolute; left: 160px; right: 160px; top: 52%; height: 22px; background: #e63946; border-radius: 11px; transform-origin: left center; }
      #or { position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: 80px; font-weight: 700; color: #b8c2cf; }
      #drive { position: absolute; left: 0; right: 0; top: 820px; text-align: center; font-size: 168px; font-weight: 900; letter-spacing: -7px; color: #ffb703; line-height: 1; }
      #drive small { display: block; margin-top: 18px; font-size: 92px; letter-spacing: -3px; color: #fff; }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }

      /* Логотип */
      #logo { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      #logoCar { width: 300px; height: 470px; filter: drop-shadow(0 40px 50px rgba(0,0,0,.55)); }
      #logoTitle { margin-top: 70px; font-size: 126px; font-weight: 900; letter-spacing: -4px; line-height: 1; display: flex; gap: 30px; white-space: nowrap; }
      #logoTitle span { display: inline-block; }
      #logoDash { margin-top: 34px; display: flex; gap: 22px; }
      #logoDash i { width: 90px; height: 18px; border-radius: 9px; background: #ffb703; }
      #logoSub { margin-top: 40px; font-size: 54px; font-weight: 700; color: #d6dde6; text-align: center; line-height: 1.25; }

      /* Подписи */
      .cap { position: absolute; left: 90px; right: 90px; top: 150px; text-align: center; }
      .cap .line { overflow: hidden; padding: 4px 0 10px; }
      .l1 { font-size: 86px; font-weight: 900; letter-spacing: -2.5px; line-height: 1.05; }
      .l2 { position: relative; display: inline-block; white-space: nowrap; font-size: 86px; font-weight: 900; letter-spacing: -2.5px; line-height: 1.05; color: #ffb703; }
      .l2 span { position: relative; z-index: 1; }
      .bar { position: absolute; left: -10px; right: -10px; bottom: 2px; height: 20px; border-radius: 10px; background: rgba(255,183,3,.28); transform-origin: left center; }

      /* Телефон */
      .rig { position: absolute; left: 50%; top: 450px; width: 600px; height: 1261px; margin-left: -300px; }
      .phone { position: absolute; inset: 0; padding: 16px; border-radius: 76px;
        background: linear-gradient(155deg, #4a5668, #0c1016 35%, #0c1016 70%, #313d50);
        box-shadow: 0 70px 120px rgba(0,0,0,.6), inset 0 0 0 3px rgba(255,255,255,.08); }
      .screen { position: relative; width: 568px; height: 1229px; border-radius: 58px; overflow: hidden; background: #000; }
      .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }
      .shine { position: absolute; inset: 0; border-radius: 60px; background: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.16) 50%, rgba(255,255,255,0) 60%); background-size: 300% 100%; pointer-events: none; }
      .tint { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
      #tintOk { background: rgba(46, 196, 106, .35); }
      #tintBad { background: rgba(230, 57, 70, .4); }
      .sticker { position: absolute; padding: 22px 40px; border-radius: 30px; font-size: 64px; font-weight: 900; letter-spacing: -1px; box-shadow: 0 20px 40px rgba(0,0,0,.45); }
      #okSticker { right: 70px; top: 560px; background: #2ec46a; color: #fff; transform: rotate(8deg); }
      #badSticker { left: 60px; top: 560px; background: #e63946; color: #fff; transform: rotate(-8deg); }

      /* Сюжет */
      #story { position: absolute; inset: 0; background: #000; overflow: hidden; }
      .art { position: absolute; inset: -60px; width: calc(100% + 120px); height: calc(100% + 120px); object-fit: cover; opacity: 0; }
      .bars::before, .bars::after { content: ''; position: absolute; left: 0; right: 0; height: 170px; background: #000; z-index: 3; }
      .bars::before { top: 0; } .bars::after { bottom: 0; }
      #storyTitle { position: absolute; left: 0; right: 0; top: 230px; z-index: 4; text-align: center; font-size: 96px; font-weight: 900; letter-spacing: -3px; text-shadow: 0 6px 30px rgba(0,0,0,.7); }
      #storyTitle b { color: #ffb703; font-weight: 900; }
      .sub { position: absolute; left: 90px; right: 90px; bottom: 300px; z-index: 4; text-align: center; font-size: 52px; font-weight: 700; line-height: 1.25; opacity: 0;
        text-shadow: 0 4px 20px rgba(0,0,0,.9); }
      #choices { position: absolute; left: 100px; right: 100px; bottom: 260px; z-index: 4; display: flex; flex-direction: column; gap: 22px; }
      .choice { padding: 30px 30px; border-radius: 34px; background: #fff; color: #1b2430; font-size: 42px; font-weight: 800; text-align: center; box-shadow: 0 10px 0 #c9d1dc, 0 24px 40px rgba(0,0,0,.4); }
      .choice.pick { background: #ffb703; box-shadow: 0 10px 0 #c88d00, 0 24px 40px rgba(0,0,0,.4); }
      #endings { position: absolute; left: 0; right: 0; top: 400px; z-index: 4; text-align: center; font-size: 56px; font-weight: 800; color: #fff; opacity: 0; text-shadow: 0 4px 20px rgba(0,0,0,.8); }

      /* Режимы */
      #modeChip { position: absolute; left: 0; right: 0; top: 150px; text-align: center; }
      .mode { position: absolute; left: 90px; right: 90px; top: 0; opacity: 0; }
      .mode b { display: block; font-size: 92px; font-weight: 900; letter-spacing: -3px; line-height: 1.05; }
      .mode span { display: block; margin-top: 14px; font-size: 54px; font-weight: 800; color: #ffb703; }

      /* Экзамен */
      #timer { position: absolute; right: 60px; top: 520px; padding: 26px 40px; border-radius: 36px; background: #1b2430; border: 6px solid #ffb703;
        font-size: 96px; font-weight: 900; letter-spacing: -2px; color: #fff; box-shadow: 0 30px 60px rgba(0,0,0,.55); transform: rotate(6deg); opacity: 0; font-variant-numeric: tabular-nums; }

      /* Готовность */
      #ready { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      #ring { position: relative; width: 760px; height: 760px; }
      #ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
      #pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 240px; font-weight: 900; letter-spacing: -10px; }
      #pct small { font-size: 120px; margin-left: 6px; letter-spacing: 0; }
      #readyText { margin-top: 70px; font-size: 76px; font-weight: 900; letter-spacing: -2px; text-align: center; line-height: 1.1; }
      #readyNote { margin-top: 26px; font-size: 48px; font-weight: 700; color: #b8c2cf; text-align: center; line-height: 1.3; }
      .dot { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px; border-radius: 50%; opacity: 0; }

      /* Финал */
      #end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 100px; }
      #endCar { width: 210px; height: 330px; filter: drop-shadow(0 30px 40px rgba(0,0,0,.55)); }
      #endTitle { margin-top: 44px; font-size: 118px; font-weight: 900; letter-spacing: -5px; line-height: 1; white-space: nowrap; }
      #endTag { margin-top: 30px; font-size: 56px; font-weight: 800; line-height: 1.2; }
      #badges { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; width: 880px; }
      .badge { padding: 28px 20px; border-radius: 30px; background: rgba(255,255,255,.08); border: 3px solid rgba(255,255,255,.14); font-size: 40px; font-weight: 800; line-height: 1.15; }
      #cta { margin-top: 70px; padding: 38px 70px; border-radius: 48px; background: #ffb703; color: #1b2430; font-size: 64px; font-weight: 900; letter-spacing: -1px; box-shadow: 0 14px 0 #c88d00, 0 40px 60px rgba(0,0,0,.45); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.total}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${T.total}" data-volume="1"></audio>
      <div id="world">
        <video id="city" class="clip full" src="clips/city-tall.mp4" data-start="${T.logo}" data-duration="${T.story - T.logo}" data-media-start="0" muted playsinline></video>
        <video id="city2" class="clip full" src="clips/city-tall.mp4" data-start="${T.modes}" data-duration="${T.ready - T.modes}" data-media-start="3" muted playsinline style="filter: brightness(.42) saturate(1.15)"></video>
        <video id="city3" class="clip full" src="clips/city-tall.mp4" data-start="${T.end}" data-duration="${T.total - T.end}" data-media-start="8" muted playsinline style="filter: brightness(.42) saturate(1.15)"></video>
        <div id="cityShade"></div>
        <div id="glow"></div>
        ${[90, 230, 860, 990, 520].map((x, i) => `<i class="streak" id="st${i}" style="left:${x}px"></i>`).join('')}
      </div>

      <div id="hook" class="clip" data-start="0" data-duration="${T.logo}">
        <div id="n800wrap"><div id="n800">0</div><div id="n800sub">вопросов в билетах ПДД</div></div>
      </div>
      <div id="cram" class="clip" data-start="0.9" data-duration="1.25">Зубрить?<i></i></div>
      <div id="or" class="clip" data-start="2.1" data-duration="0.9">а можно…</div>
      <div id="drive" class="clip" data-start="${CUES.slam - 0.05}" data-duration="${T.logo - CUES.slam + 0.05}">ПРОЕХАТЬ<small>их по городу</small></div>

      <div id="logo" class="clip" data-start="${T.logo}" data-duration="${T.question - T.logo}">
        <div id="logoCar">${car}</div>
        <div id="logoTitle"><span>Курьер</span><span class="hl">ПДД</span></div>
        <div id="logoDash"><i></i><i></i><i></i></div>
        <div id="logoSub">игра для подготовки<br />к теории на права</div>
      </div>
${caption('capQ', 'Вопросы из билетов —', 'прямо на дороге')}
${caption('capW', 'Ошибся?', 'Увидишь, почему')}
${caption('capE', 'Экзамен как в ГИБДД', '20 вопросов · 20 минут')}

      <div class="rig" id="rig">
        <div class="phone" id="phone">
          <div class="screen">${shots}
            <div class="tint" id="tintOk"></div>
            <div class="tint" id="tintBad"></div>
            <div class="shine" id="shine"></div>
          </div>
        </div>
      </div>
      <div class="sticker" id="okSticker" style="opacity:0">Верно! ✓</div>
      <div class="sticker" id="badSticker" style="opacity:0">Неверно</div>

      <div id="modeChip">
        ${MODES.map(([a, b], i) => `<div class="mode" id="mode${i}"><b>${a}</b><span>${b}</span></div>`).join('')}
      </div>

      <div id="story" class="clip bars" data-start="${T.story}" data-duration="${T.modes - T.story}">
        ${ART.map((a, i) => `<img class="art" id="art${i}" src="scenes/${a.replace('/', '-')}.webp" />`).join('')}
        <div id="storyTitle">Сюжет <b>как в кино</b></div>
        ${STORY_LINES.map((l, i) => `<div class="sub" id="sub${i}">${l}</div>`).join('')}
        <div id="endings">Твой выбор меняет историю<br /><span class="hl">6 концовок</span></div>
        <div id="choices">${CHOICES.map((c, i) => `<div class="choice${i === 1 ? ' pick' : ''}" id="ch${i}">${c}</div>`).join('')}</div>
      </div>

      <div id="ready" class="clip" data-start="${T.ready}" data-duration="${T.end - T.ready}">
        <div id="ring">
          <svg viewBox="0 0 760 760" width="760" height="760">
            <circle cx="380" cy="380" r="330" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="48" />
            <circle id="arc" cx="380" cy="380" r="330" fill="none" stroke="#ffb703" stroke-width="48" stroke-linecap="round" stroke-dasharray="2073.45" stroke-dashoffset="2073.45" />
          </svg>
          <div id="pct"><span id="pctNum">0</span><small>%</small></div>
          ${Array.from({ length: 22 }, (_, i) => `<i class="dot" id="dot${i}" style="background:${['#ffb703', '#ffffff', '#2ec46a'][i % 3]}"></i>`).join('')}
        </div>
        <div id="readyText">Готовность <span class="hl">к экзамену</span></div>
        <div id="readyNote">Игра считает её по твоим ответам<br />и подсказывает, что повторить</div>
      </div>

      <div id="end" class="clip" data-start="${T.end}" data-duration="${T.total - T.end}">
        <div id="endCar">${car}</div>
        <div id="endTitle">Курьер <span class="hl">ПДД</span></div>
        <div id="endTag">Выучи все 800 вопросов — играя</div>
        <div id="badges">${BADGES.map((b, i) => `<div class="badge" id="badge${i}">${b}</div>`).join('')}</div>
        <div id="cta">Бесплатно в RuStore</div>
      </div>

      <div id="flash"></div>
    </div>
    <script>
      // Подписи в ширину кадра: длинные строки чуть мельче.
      const fit = () => {
        for (const e of document.querySelectorAll('.l1, .l2, .mode b, .mode span')) {
          e.style.whiteSpace = 'nowrap';
          e.style.display = 'inline-block';
          e.style.fontSize = '';
          let size = parseFloat(getComputedStyle(e).fontSize);
          while (e.getBoundingClientRect().width > 900 && size > 40) e.style.fontSize = (size -= 2) + 'px';
        }
      };
      fit();
      document.fonts.ready.then(fit);
      const tl = gsap.timeline({ paused: true });
      const flash = (t, a = 0.7) => { tl.fromTo('#flash', { opacity: a }, { opacity: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, t); };
      const shake = (t, s = 18) => { tl.fromTo('#root', { x: s, y: -s * 0.6 }, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1.2, 0.3)', immediateRender: false }, t); };

      // ─── Начало: 800 → «Зубрить?» → «ПРОЕХАТЬ» ───
      tl.fromTo('#n800', { innerText: 0, scale: 0.7 }, { innerText: 800, scale: 1, snap: { innerText: 10 }, duration: ${CUES.count}, ease: 'power3.out' }, 0);
      tl.fromTo('#n800sub', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.25);
      tl.to('#n800wrap', { y: -520, scale: 0.55, opacity: 0.35, duration: 0.5, ease: 'power3.inOut' }, 0.95);
      tl.fromTo('#cram', { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, 0.9);
      tl.fromTo('#cram i', { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power3.out' }, ${CUES.strike - 0.1});
      tl.to('#cram', { x: -1200, duration: 0.3, ease: 'power3.in' }, 1.95);
      tl.fromTo('#or', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 2.1);
      tl.to('#n800wrap', { opacity: 0, duration: 0.3 }, 2.6);
      tl.fromTo('#drive', { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power4.in' }, ${CUES.slam - 0.2});
      shake(${CUES.slam}, 26);
      flash(${CUES.slam}, 0.5);
      tl.fromTo('#drive small', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, ${CUES.slam + 0.25});
      tl.to('#drive', { scale: 6, opacity: 0, duration: 0.35, ease: 'power3.in' }, ${T.logo - 0.3});

      // ─── Логотип над городом ───
      tl.fromTo('#city', { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' }, ${T.logo});
      tl.fromTo('#glow', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1, ease: 'power2.out' }, ${T.logo});
      ${[0, 1, 2, 3, 4].map((i) => `tl.fromTo('#st${i}', { y: 0, opacity: 0.9 }, { y: 2700, opacity: 0.9, duration: ${0.7 + (i % 3) * 0.15}, ease: 'none', repeat: 4 }, ${T.logo + i * 0.13});`).join('\n      ')}
      tl.fromTo('#logoCar', { y: 1300 }, { y: 0, duration: 0.8, ease: 'power4.out' }, ${T.logo});
      tl.fromTo('#logoTitle span', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.8)', stagger: 0.15 }, ${T.logo + 0.5});
      tl.fromTo('#logoDash i', { scaleX: 0 }, { scaleX: 1, duration: 0.3, stagger: 0.1, ease: 'power3.out' }, ${T.logo + 0.9});
      tl.fromTo('#logoSub', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, ${T.logo + 1.2});
      tl.to('#logoCar', { y: -1600, duration: 0.55, ease: 'power3.in' }, ${T.question - 0.55});
      tl.to('#logoTitle, #logoDash, #logoSub', { opacity: 0, scale: 1.3, duration: 0.4, ease: 'power2.in' }, ${T.question - 0.4});

      // ─── Телефон: вопрос и ошибка ───
      tl.set('#rig', { y: 1700, rotationX: 0, rotationY: 0, transformPerspective: 2200 }, 0);
      tl.fromTo('#rig', { y: 1600, rotationX: 28, rotationY: -12, scale: 0.92 }, { y: 0, rotationX: 0, rotationY: 0, scale: 1, duration: 0.9, ease: 'power4.out' }, ${T.question - 0.25});
      tl.to('#rig', { rotationY: 4, rotationX: -2, duration: 3.2, ease: 'sine.inOut' }, ${T.question + 0.7});
      tl.to('#rig', { rotationY: -4, rotationX: 2, duration: 3.6, ease: 'sine.inOut' }, ${T.wrong + 0.1});
      tl.fromTo('#shine', { backgroundPosition: '120% 0' }, { backgroundPosition: '-60% 0', duration: 1.1, ease: 'power2.inOut' }, ${T.question + 0.5});
      ${capIn('capQ', T.question)}
      tl.fromTo('#tintOk', { opacity: 0.8 }, { opacity: 0, duration: 0.6, immediateRender: false }, ${CUES.right});
      tl.fromTo('#okSticker', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' }, ${CUES.right});
      tl.to('#okSticker', { scale: 0.6, opacity: 0, duration: 0.25 }, ${Math.min(CUES.right + 1.3, T.wrong - 0.3)});
      ${capOut('capQ', T.wrong)}
      flash(${T.wrong}, 0.35);
      ${capIn('capW', T.wrong)}
      tl.fromTo('#tintBad', { opacity: 0.85 }, { opacity: 0, duration: 0.7, immediateRender: false }, ${CUES.wrong});
      shake(${CUES.wrong}, 14);
      tl.fromTo('#badSticker', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' }, ${CUES.wrong});
      tl.to('#badSticker', { scale: 0.6, opacity: 0, duration: 0.25 }, ${CUES.wrong + 1.3});
      ${capOut('capW', T.story)}
      // Телефон улетает вверх — начинается кино.
      tl.to('#rig', { y: -2000, rotationX: -30, duration: 0.5, ease: 'power3.in' }, ${T.story - 0.45});
      tl.to('#glow', { opacity: 0, duration: 0.4 }, ${T.story - 0.4});

      // ─── Сюжет как в кино ───
      ${[0, 1, 2, 3].map((i) => `
      tl.fromTo('#art${i}', { opacity: 0, scale: ${i % 2 ? 1.18 : 1.02}, x: ${i % 2 ? 30 : -30} }, { opacity: 1, scale: ${i % 2 ? 1.02 : 1.16}, x: ${i % 2 ? -30 : 30}, duration: 1.9, ease: 'none' }, ${CUES.story[i]});
      tl.set('#art${i}', { opacity: 0 }, ${CUES.story[i + 1]});
      tl.fromTo('#sub${i}', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, ${CUES.story[i] + 0.2});
      tl.to('#sub${i}', { opacity: 0, duration: 0.2 }, ${CUES.story[i + 1] - 0.2});
      flash(${CUES.story[i]}, ${i ? 0.45 : 0.8});`).join('')}
      tl.fromTo('#storyTitle', { opacity: 0, scale: 1.4, letterSpacing: '20px' }, { opacity: 1, scale: 1, letterSpacing: '-3px', duration: 0.6, ease: 'power3.out' }, ${T.story + 0.1});
      tl.to('#storyTitle', { opacity: 0, y: -40, duration: 0.3 }, ${CUES.story[4] - 0.3});
      tl.fromTo('#art4', { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1.04, duration: 2, ease: 'power2.out' }, ${CUES.story[4]});
      flash(${CUES.story[4]}, 0.5);
      tl.fromTo('#endings', { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4 }, ${CUES.story[4] + 0.2});
      tl.fromTo('.choice', { y: 500, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.12 }, ${CUES.story[4] + 0.35});
      tl.to('#ch1', { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut' }, ${CUES.story[4] + 1.3});
      tl.to('#story', { opacity: 0, duration: 0.3 }, ${T.modes - 0.3});

      // ─── Режимы: карусель телефонов ───
      tl.set('#rig', { y: 0, x: 1400, rotationX: 0, rotationY: -25 }, ${T.modes - 0.3});
      tl.to('#rig', { x: 0, rotationY: 0, duration: 0.45, ease: 'power4.out' }, ${T.modes - 0.25});
      tl.to('#glow', { opacity: 1, duration: 0.4 }, ${T.modes - 0.2});
      ${CUES.modes.map((t, i) => `
      tl.fromTo('#mode${i}', { opacity: 0, x: 300 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out' }, ${t});
      tl.to('#mode${i}', { opacity: 0, x: -300, duration: 0.25, ease: 'power2.in' }, ${t + 1.25});${i ? `
      tl.fromTo('#rig', { x: 0, rotationY: 0 }, { x: -60, rotationY: 12, duration: 0.12, ease: 'power2.in', yoyo: true, repeat: 1, immediateRender: false }, ${t - 0.12});
      tl.fromTo('.screen', { filter: 'blur(14px)' }, { filter: 'blur(0px)', duration: 0.25, immediateRender: false }, ${t});` : ''}`).join('')}

      // ─── Экзамен ───
      ${capIn('capE', T.exam)}
      tl.fromTo('#rig', { rotationY: 0, scale: 1 }, { rotationY: -8, rotationX: 3, scale: 0.97, duration: 3.8, ease: 'sine.inOut', immediateRender: false }, ${T.exam});
      ${capOut('capE', T.ready)}
      tl.to('#rig', { y: 1800, rotationX: 25, duration: 0.45, ease: 'power3.in' }, ${T.ready - 0.45});

      // ─── Готовность ───
      tl.fromTo('#ring', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, ${T.ready});
      tl.fromTo('#arc', { strokeDashoffset: 2073.45 }, { strokeDashoffset: 0, duration: ${CUES.full - T.ready - 0.3}, ease: 'power2.inOut' }, ${T.ready + 0.3});
      tl.fromTo('#pctNum', { innerText: 0 }, { innerText: 100, snap: { innerText: 1 }, duration: ${CUES.full - T.ready - 0.3}, ease: 'power2.inOut' }, ${T.ready + 0.3});
      tl.fromTo('#readyText', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, ${T.ready + 0.5});
      tl.fromTo('#readyNote', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, ${T.ready + 0.8});
      tl.to('#ring', { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, ${CUES.full});
      flash(${CUES.full}, 0.35);
      ${Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const r = 430 + (i % 4) * 70;
        return `tl.fromTo('#dot${i}', { x: 0, y: 0, opacity: 1, scale: 1 }, { x: ${Math.round(Math.cos(a) * r)}, y: ${Math.round(Math.sin(a) * r)}, opacity: 0, scale: 0.4, duration: 0.9, ease: 'power3.out', immediateRender: false }, ${CUES.full});`;
      }).join('\n      ')}
      tl.to('#ready', { opacity: 0, scale: 0.9, duration: 0.3 }, ${T.end - 0.3});

      // ─── Финал ───
      tl.fromTo('#city3', { opacity: 0 }, { opacity: 1, duration: 0.6 }, ${T.end});
      tl.fromTo('#endCar', { y: 1200 }, { y: 0, duration: 0.8, ease: 'power4.out' }, ${T.end});
      tl.fromTo('#endTitle', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, ${T.end + 0.45});
      tl.fromTo('#endTag', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, ${T.end + 0.8});
      tl.fromTo('.badge', { y: 40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)', stagger: 0.12 }, ${T.end + 1.1});
      tl.fromTo('#cta', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, ${T.end + 1.9});
      tl.to('#cta', { scale: 1.05, duration: 0.5, yoyo: true, repeat: 7, ease: 'sine.inOut' }, ${T.end + 2.5});
      tl.to('#endCar', { y: -14, duration: 1, yoyo: true, repeat: 5, ease: 'sine.inOut' }, ${T.end + 1});

      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

writeFileSync(new URL('index.html', dir), html);
console.log(`trailer/promo/video/index.html: ${T.total} с`);
