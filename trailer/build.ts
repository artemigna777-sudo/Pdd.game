/**
 * Собирает композицию HyperFrames для трейлера: `trailer/video/index.html`.
 * Кадры игры — настоящие записи (`record.ts`), портреты и машина — те же, что в игре.
 *
 *   npx tsx trailer/build.ts
 *   cd trailer/video && npx hyperframes render -o ../kurier-pdd-trailer.mp4
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PORTRAIT_IDS, portraitSvg } from '../src/story/portraits.ts';
import { CHARACTERS } from '../src/story/story.ts';
import { carSvg } from '../src/ui/dailyView.ts';
import { SCENES, TIMELINE, type Scene } from './scenes.ts';

const dir = new URL('./video/', import.meta.url);
const font = (file: string) => readFileSync(new URL(`fonts/${file}`, dir)).toString('base64');
const car = carSvg({ color: 0xffb703, sticker: 'none' }).replace('<svg ', '<svg width="100%" height="100%" ');

/** «**слово**» — выделение жёлтым. */
const rich = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');

const W = 1080;
const H = 1920;
const { intro, outro, total } = TIMELINE;

const captions = SCENES.map((s, i) => `
      <div id="cap${i}" class="clip caption" data-start="${s.start}" data-duration="${s.duration}">
        <h2>${rich(s.title)}</h2>
        <p>${rich(s.sub)}</p>
      </div>`).join('');

const videos = SCENES.flatMap((s, i) =>
  s.clips.map((c, j) => `
          <video id="v${i}_${j}" class="clip shot" src="clips/${c.file}.mp4" data-start="${c.start}" data-duration="${c.duration}" data-media-start="${c.from}" muted playsinline></video>`),
).join('');

const cast = SCENES.find((s) => s.cast)!;
const castCards = PORTRAIT_IDS.map((id, i) => `
          <div class="person" id="person${i}">
            <div class="face">${portraitSvg(id)}</div>
            <b>${CHARACTERS[id].name}</b>
            <span>${CHARACTERS[id].role}</span>
          </div>`).join('');

/** Анимация подписей сцен и смены экранов. */
function sceneTweens(s: Scene, i: number): string {
  const end = s.start + s.duration;
  return `
      tl.fromTo('#cap${i} h2', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, ${s.start + 0.05});
      tl.fromTo('#cap${i} p', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, ${s.start + 0.2});
      tl.to('#cap${i}', { opacity: 0, y: -20, duration: 0.25, ease: 'power1.in' }, ${end - 0.25});`;
}

const html = `<!doctype html>
<html lang="ru" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Курьер ПДД — трейлер</title>
    <script src="gsap.min.js"></script>
    <style>
      @font-face {
        font-family: 'Montserrat';
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${font('montserrat-cyrillic.woff2')}) format('woff2');
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
      }
      @font-face {
        font-family: 'Montserrat';
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${font('montserrat-latin.woff2')}) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #1b2430; }
      #root {
        position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
        font-family: 'Montserrat', sans-serif; color: #f5f7fa;
        background: radial-gradient(120% 70% at 50% 35%, #2a3646 0%, #1b2430 55%, #121820 100%);
      }
      .lanes { position: absolute; inset: -240px 0 0 0; height: ${H + 240}px; opacity: 0.16;
        background:
          repeating-linear-gradient(to bottom, #f5f7fa 0 70px, transparent 70px 120px) 70px 0 / 10px 100% no-repeat,
          repeating-linear-gradient(to bottom, #f5f7fa 0 70px, transparent 70px 120px) ${W - 80}px 0 / 10px 100% no-repeat; }
      .glow { position: absolute; left: 50%; top: 1080px; width: 1100px; height: 1100px; margin: -550px 0 0 -550px;
        border-radius: 50%; background: radial-gradient(circle, rgba(255, 183, 3, 0.22), rgba(255, 183, 3, 0) 62%); }
      .hl { color: #ffb703; }

      /* Заставка */
      #intro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      #introCar { width: 300px; height: 470px; filter: drop-shadow(0 30px 40px rgba(0, 0, 0, 0.45)); }
      #introTitle { margin-top: 60px; font-size: 132px; font-weight: 900; letter-spacing: -4px; line-height: 1; }
      #introTitle .hl { display: inline-block; }
      #introSub { margin-top: 34px; font-size: 44px; font-weight: 600; color: #b8c2cf; text-align: center; line-height: 1.3; }

      /* Подписи сцен */
      .caption { position: absolute; left: 60px; right: 60px; top: 70px; height: 270px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
      .caption h2 { font-size: 68px; font-weight: 900; line-height: 1.08; letter-spacing: -1.5px; }
      .caption p { margin-top: 18px; font-size: 34px; font-weight: 600; color: #b8c2cf; line-height: 1.25; }

      /* Телефон с записью игры */
      #phone { position: absolute; left: 194px; top: 360px; width: 692px; height: 1460px; padding: 16px; border-radius: 64px;
        background: linear-gradient(160deg, #3a4656, #0d1218 40%, #0d1218 70%, #2c3746);
        box-shadow: 0 50px 90px rgba(0, 0, 0, 0.55), inset 0 0 0 3px rgba(255, 255, 255, 0.08); }
      #screen { position: relative; width: 660px; height: 1428px; border-radius: 48px; overflow: hidden; background: #000; }
      .shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

      /* Герои */
      #cast { position: absolute; left: 0; right: 0; top: 600px; display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 70px; padding: 0 40px; }
      .person { display: flex; flex-direction: column; align-items: center; text-align: center; }
      .face { width: 220px; height: 220px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 6px #f5f7fa, 0 20px 40px rgba(0, 0, 0, 0.45); }
      .face svg { display: block; }
      .person b { margin-top: 26px; font-size: 31px; font-weight: 800; line-height: 1.15; }
      .person span { margin-top: 8px; font-size: 23px; font-weight: 600; color: #b8c2cf; line-height: 1.2; }

      /* Финальная карточка */
      #outro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 70px; }
      #outroCar { width: 200px; height: 313px; filter: drop-shadow(0 24px 30px rgba(0, 0, 0, 0.45)); }
      #outroTitle { margin-top: 40px; font-size: 120px; font-weight: 900; letter-spacing: -3px; line-height: 1; }
      #outroFacts { margin-top: 40px; font-size: 38px; font-weight: 700; color: #f5f7fa; line-height: 1.35; }
      #outroCta { margin-top: 70px; font-size: 46px; font-weight: 800; }
      #outroUrl { margin-top: 30px; padding: 26px 40px; border-radius: 28px; background: #ffb703; color: #1b2430; font-size: 38px; font-weight: 800; letter-spacing: -0.5px; }
      #outroNote { margin-top: 30px; font-size: 32px; font-weight: 600; color: #b8c2cf; line-height: 1.35; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      <audio id="music" src="music.wav" data-start="0" data-duration="${total}" data-volume="1"></audio>
      <div class="lanes" id="lanes"></div>
      <div class="glow" id="glow"></div>

      <div id="intro" class="clip" data-start="0" data-duration="${intro + 0.6}">
        <div id="introCar">${car}</div>
        <h1 id="introTitle">Курьер <span class="hl">ПДД</span></h1>
        <p id="introSub">Игра для подготовки<br />к теории на права</p>
      </div>
${captions}

      <div id="phone">
        <div id="screen">${videos}
        </div>
      </div>

      <div id="cast" class="clip" data-start="${cast.start}" data-duration="${cast.duration}">${castCards}
      </div>

      <div id="outro" class="clip" data-start="${outro}" data-duration="${total - outro}">
        <div id="outroCar">${car}</div>
        <h1 id="outroTitle">Курьер <span class="hl">ПДД</span></h1>
        <p id="outroFacts">800 вопросов · 10 глав · 4 режима<br />экзамен как в ГИБДД</p>
        <p id="outroCta">Играй бесплатно в браузере</p>
        <p id="outroUrl">artemigna777-sudo.github.io/Pdd.game</p>
        <p id="outroNote">Работает без интернета.<br />Можно добавить на главный экран.</p>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      // Разметка дороги едет вниз — как будто машина едет вперёд.
      tl.fromTo('#lanes', { y: 0 }, { y: 240, duration: 1, ease: 'none', repeat: ${Math.ceil(total) - 1} }, 0);
      tl.fromTo('#glow', { scale: 0.9, opacity: 0.7 }, { scale: 1.08, opacity: 1, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: ${Math.ceil(total / 2) - 1} }, 0);

      // Заставка: машина подъезжает, название, подзаголовок.
      tl.fromTo('#introCar', { y: 900, rotation: 0 }, { y: 0, duration: 0.9, ease: 'power3.out' }, 0);
      tl.fromTo('#introTitle', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 0.6);
      tl.fromTo('#introSub', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }, 1.0);
      tl.to('#introCar', { y: -1400, duration: 0.6, ease: 'power2.in' }, ${intro - 0.55});
      tl.to(['#introTitle', '#introSub'], { opacity: 0, y: -60, duration: 0.4, ease: 'power1.in' }, ${intro - 0.4});

      // Телефон выезжает снизу, уходит на время знакомства с героями и в конце.
      tl.set('#phone', { y: 1700 }, 0);
      tl.to('#phone', { y: 0, duration: 0.7, ease: 'power3.out' }, ${intro - 0.45});
      tl.to('#phone', { y: 1700, duration: 0.5, ease: 'power2.in' }, ${cast.start - 0.35});
      tl.to('#phone', { y: 0, duration: 0.6, ease: 'power3.out' }, ${cast.start + cast.duration - 0.3});
      tl.to('#phone', { y: 1700, duration: 0.5, ease: 'power2.in' }, ${outro - 0.35});
${SCENES.map(sceneTweens).join('')}

      // Герои по одному.
      ${PORTRAIT_IDS.map((_, i) => `tl.fromTo('#person${i}', { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, ${(cast.start + 0.25 + i * 0.16).toFixed(2)});`).join('\n      ')}
      tl.to('#cast', { opacity: 0, duration: 0.25 }, ${cast.start + cast.duration - 0.25});

      // Финал.
      tl.fromTo('#outroCar', { y: 700, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, ${outro});
      tl.fromTo('#outroTitle', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, ${outro + 0.35});
      tl.fromTo('#outroFacts', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, ${outro + 0.7});
      tl.fromTo('#outroCta', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, ${outro + 1.1});
      tl.fromTo('#outroUrl', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }, ${outro + 1.4});
      tl.fromTo('#outroNote', { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${outro + 1.9});

      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

writeFileSync(new URL('index.html', dir), html);
console.log(`trailer/video/index.html: ${total.toFixed(1)} с, сцен ${SCENES.length}, кадров игры ${SCENES.reduce((n, s) => n + s.clips.length, 0)}`);
