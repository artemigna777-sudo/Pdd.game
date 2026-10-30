/**
 * «Дело на столе» №1 «Кто виноват?» — ролик на ~30 с без голоса: камера скользит по столу следователя от улики к улике
 * (фото перекрёстка, показания, запись регистратора, расчёт), в конце штамп «Виновен» и правило (п. 6.2 ПДД: жёлтый
 * сигнал запрещает движение, кроме случая, когда остановиться нельзя без экстренного торможения).
 * Музыка — из образца (`music/47-delo-1/music.wav`), озвучки нет: только субтитры-подписи улик.
 */
import { P, makeSubs, type Shot8, type Video8, type Word } from '../engine8.ts';
import { rng, svg, glow, carTop } from '../scenery8.ts';
import { toWords } from './v44-noch-doroga-3.ts';

/* ---------- Время: страницы стола ---------- */
const PAGE_T = [0, 3.0, 7.6, 12.6, 17.8, 22.0, 26.6];
const END = 32.5;
const PAGE_H = 1700;
const pageY = (k: number) => 960 + k * PAGE_H;
const MOVE = 0.8;

/* ---------- Бумага, скотч, нитки ---------- */
const FONT = `font-family="Montserrat"`;
const HAND = `font-family="Caveat"`;
const shadow = 'filter="url(#fSh)"';

const defsExtra = `<defs>
  <filter id="fSh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="10" dy="22" stdDeviation="14" flood-color="#000" flood-opacity="0.6"/></filter>
  <filter id="fRough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
  <filter id="fGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.35 0"/></filter>
  <linearGradient id="gWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a24"/><stop offset="0.5" stop-color="#6a4429"/><stop offset="1" stop-color="#523420"/></linearGradient>
  <linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0e4c4"/><stop offset="1" stop-color="#e2d3a8"/></linearGradient>
</defs>`;

/** Стол: доски, волокна, пятна. */
function desk(h: number): string {
  const r = rng(11);
  let planks = '';
  const wPlank = 180;
  for (let i = -1; i < 8; i++) {
    const x = i * wPlank;
    const tone = ['#5a3a24', '#654128', '#583722', '#6b4529'][((i % 4) + 4) % 4];
    planks += `<rect x="${x}" y="-300" width="${wPlank}" height="${h + 600}" fill="${tone}"/><rect x="${x}" y="-300" width="5" height="${h + 600}" fill="#2a190e" opacity="0.55"/>`;
    for (let g = 0; g < 26; g++) {
      const gx = x + 14 + r() * (wPlank - 28);
      const gy = -300 + r() * (h + 600);
      const len = 200 + r() * 900;
      planks += `<path d="M${gx.toFixed(0)} ${gy.toFixed(0)} q${(r() * 16 - 8).toFixed(0)} ${(len / 2).toFixed(0)} ${(r() * 10 - 5).toFixed(0)} ${len.toFixed(0)}" stroke="#2e1c10" stroke-width="${(1 + r() * 2).toFixed(1)}" fill="none" opacity="${(0.15 + r() * 0.2).toFixed(2)}"/>`;
    }
  }
  const stains = Array.from({ length: 14 }, () => `<circle cx="${(r() * 1000).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(20 + r() * 60).toFixed(0)}" fill="#1e120a" opacity="0.12"/>`).join('');
  return `<g>${planks}${stains}<rect x="-100" y="-300" width="1400" height="${h + 600}" filter="url(#fGrain)" opacity="0.7"/></g>`;
}

const tape = (x: number, y: number, rot: number) => `<rect x="${x - 70}" y="${y - 24}" width="140" height="48" fill="#e6d6a8" opacity="0.78" transform="rotate(${rot} ${x} ${y})"/>`;
const pin = (x: number, y: number) => `<circle cx="${x}" cy="${y + 6}" r="17" fill="#000" opacity="0.35"/><circle cx="${x}" cy="${y}" r="16" fill="#d92b2b"/><circle cx="${x - 5}" cy="${y - 5}" r="5" fill="#ff8a7a"/>`;
const clip = (x: number, y: number, rot: number) => `<path d="M${x} ${y} v90 a20 20 0 0 0 40 0 v-110 a30 30 0 0 0 -60 0 v100" stroke="#b9c0cf" stroke-width="7" fill="none" stroke-linecap="round" transform="rotate(${rot} ${x} ${y})"/>`;
const paper = (x: number, y: number, w: number, h: number, rot: number, inner: string, id = '') =>
  `<g ${id ? `id="${id}"` : ''}><g transform="translate(${x} ${y}) rotate(${rot})"><g ${shadow}><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#gPaper)"/></g><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#fGrain)" opacity="0.35"/>${inner}</g></g>`;
const typed = (x: number, y: number, size: number, text: string, fill = '#3a3f55', weight = 800) => `<text x="${x}" y="${y}" ${FONT} font-weight="${weight}" font-size="${size}" fill="${fill}" letter-spacing="2">${text}</text>`;
const hand = (x: number, y: number, size: number, text: string, fill = '#2a2f4a', rot = 0) => `<text x="${x}" y="${y}" ${HAND} font-weight="700" font-size="${size}" fill="${fill}" transform="rotate(${rot} ${x} ${y})">${text}</text>`;

/* ---------- Страница 0: папка «ДЕЛО №1» ---------- */
const page0 = (cx: number, cy: number) => `<g id="p0">
  <g transform="translate(${cx} ${cy}) rotate(-3)">
    <g ${shadow}><rect x="-390" y="-520" width="780" height="1040" rx="14" fill="#c8a468"/></g>
    <path d="M-390 -520 h300 l40 -60 h-340 a0 0 0 0 0 0 0 z" fill="#b88f52"/><rect x="-390" y="-520" width="780" height="1040" rx="14" filter="url(#fGrain)" opacity="0.6"/>
    <rect x="-300" y="-330" width="600" height="200" fill="#efe3c3"/>
    ${typed(-260, -245, 40, 'ОТДЕЛ ДТП', '#6a5a3a')}
    <text x="-260" y="-160" ${FONT} font-weight="900" font-size="110" fill="#8e1c1c">ДЕЛО №1</text>
    <g transform="translate(120 220) rotate(-14)" filter="url(#fRough)"><rect x="-230" y="-80" width="460" height="160" rx="14" fill="none" stroke="#c1272d" stroke-width="12"/><text x="0" y="28" text-anchor="middle" ${FONT} font-weight="900" font-size="100" fill="#c1272d">ДТП</text></g>
  </g>${clip(cx + 280, cy - 560, 10)}
</g>`;

/* ---------- Страница 1: фото перекрёстка ---------- */
const photo1 = (cx: number, cy: number) => {
  const sc = (inner: string) => `<g clip-path="url(#cpPhoto)">${inner}</g>`;
  const crossing = `<rect width="720" height="720" fill="#26301f"/>
    <rect x="260" y="0" width="200" height="720" fill="#3a3f4b"/><rect x="0" y="260" width="720" height="200" fill="#3a3f4b"/>
    <path d="M360 0 V250 M360 470 V720 M0 360 H250 M470 360 H720" stroke="#d8dbe6" stroke-width="8" stroke-dasharray="26 22"/>
    ${[0, 1, 2, 3, 4].map((k) => `<rect x="${270 + k * 40}" y="222" width="24" height="26" fill="#e8eaf2"/><rect x="${270 + k * 40}" y="472" width="24" height="26" fill="#e8eaf2"/>`).join('')}
    <rect x="262" y="240" width="196" height="8" fill="#e8eaf2"/><rect x="262" y="472" width="196" height="8" fill="#e8eaf2"/>
    <path d="M300 640 Q320 560 360 470" stroke="#0e1018" stroke-width="10" fill="none" opacity="0.7"/><path d="M420 640 Q410 560 380 480" stroke="#0e1018" stroke-width="10" fill="none" opacity="0.7"/><path d="M90 400 Q200 392 330 378" stroke="#0e1018" stroke-width="10" fill="none" opacity="0.7"/>
    <g transform="translate(500 250)"><rect x="-6" y="-120" width="12" height="130" fill="#10131f"/><rect x="-24" y="-190" width="48" height="84" rx="10" fill="#10131f"/><circle cx="0" cy="-166" r="11" fill="#401414"/><circle cx="0" cy="-138" r="11" fill="#ffc23d"/><circle cx="0" cy="-116" r="0" fill="#142a1a"/></g>
    ${carTop(372, 470, 12, '#2b2f3a', { s: 0.78 })}${carTop(300, 380, -78, '#e8eaf2', { s: 0.78 })}
    ${[[330, 420], [350, 440], [310, 400], [390, 450], [284, 420]].map(([x, y]) => `<rect x="${x}" y="${y}" width="9" height="9" fill="#bfe3ff" transform="rotate(${x % 70} ${x} ${y})" opacity="0.9"/>`).join('')}
    <rect width="720" height="720" fill="#000" opacity="0.18"/>`;
  return `<g id="p1">
    <defs><clipPath id="cpPhoto"><rect x="-360" y="-420" width="720" height="720" rx="6"/></clipPath></defs>
    <g transform="translate(${cx} ${cy}) rotate(2)"><g ${shadow}><rect x="-410" y="-470" width="820" height="980" fill="#f3efe4"/></g>
      <g transform="translate(0 0)">${sc(`<g transform="translate(-360 -420)">${crossing}</g>`)}</g>
      ${hand(-330, 420, 74, 'Улика №1: перекрёсток', '#2a2f4a', -1.5)}${hand(-330, 490, 56, 'светофор · две машины', '#5a5f78', -1)}
    </g>${tape(cx - 330, cy - 470, -34)}${tape(cx + 330, cy - 470, 30)}
  </g>`;
};

/* ---------- Страница 2: показания ---------- */
const page2 = (cx: number, cy: number) => `<g id="p2">
  ${paper(cx - 60, cy - 330, 760, 560, -3, `${typed(-320, -200, 34, 'ПОКАЗАНИЯ · ВОДИТЕЛЬ А')}<rect x="-320" y="-170" width="640" height="3" fill="#8a7a5a"/>${hand(-320, -60, 96, '«Ехал на жёлтый.', '#2a2f4a', -1)}${hand(-320, 60, 96, 'Всё по правилам.»', '#2a2f4a', -1)}<g transform="translate(220 150)" opacity="0.9"><circle r="70" fill="none" stroke="#2b4fae" stroke-width="9"/><text y="30" text-anchor="middle" ${FONT} font-weight="900" font-size="90" fill="#2b4fae">А</text></g>`, 'p2a')}
  ${paper(cx + 80, cy + 340, 740, 540, 3, `${typed(-310, -190, 34, 'ПОКАЗАНИЯ · ВОДИТЕЛЬ Б')}<rect x="-310" y="-160" width="620" height="3" fill="#8a7a5a"/>${hand(-310, -50, 100, '«Мне горел', '#2a2f4a', 1)}${hand(-310, 70, 100, 'зелёный.»', '#2a2f4a', 1)}<g transform="translate(210 140)" opacity="0.9"><circle r="70" fill="none" stroke="#2f7a3a" stroke-width="9"/><text y="30" text-anchor="middle" ${FONT} font-weight="900" font-size="90" fill="#2f7a3a">Б</text></g>`, 'p2b')}
  ${clip(cx + 270, cy - 620, -8)}
</g>`;

/* ---------- Страница 3: запись регистратора ---------- */
const page3 = (cx: number, cy: number) => `<g id="p3">
  <g transform="translate(${cx} ${cy}) rotate(-2)"><g ${shadow}><rect x="-440" y="-500" width="880" height="1000" fill="#f3efe4"/></g>
    <rect x="-400" y="-460" width="800" height="740" fill="#161c18"/>
    <g clip-path="url(#cpDash)"><defs><clipPath id="cpDash"><rect x="-400" y="-460" width="800" height="740"/></clipPath></defs>
      <rect x="-400" y="-460" width="800" height="360" fill="#2a3a44"/><path d="M-80 -100 L80 -100 L400 280 L-400 280 Z" fill="#2c3036"/><path d="M-6 -100 L6 -100 L40 280 L-40 280 Z" fill="#d8dbe6" opacity="0.7"/>
      <rect x="-340" y="-30" width="680" height="12" fill="#e8eaf2" opacity="0.8"/>
      <g transform="translate(180 -130)"><rect x="-5" y="0" width="10" height="130" fill="#0b0e14"/><rect x="-22" y="-80" width="44" height="80" rx="8" fill="#0b0e14"/><circle cx="0" cy="-62" r="10" fill="#401414"/><circle cx="0" cy="-40" r="10" fill="#ffd25a"/><circle cx="0" cy="-18" r="10" fill="#142a1a"/>${glow(0, -40, 120, 'gGlowY')}</g>
      <rect x="-400" y="170" width="800" height="110" fill="#0b0e14"/><path d="M-200 280 Q0 150 200 280 Z" fill="#171a22"/>
      <rect x="-400" y="-460" width="800" height="740" fill="#9ad0a8" opacity="0.07"/>
      ${typed(-380, -410, 36, '14:32:04', '#e8f5ea', 700)}${typed(-380, -366, 36, '40 КМ/Ч', '#e8f5ea', 700)}<circle cx="360" cy="-424" r="10" fill="#ff3b30"/>
      <g stroke="#ffd25a" stroke-width="7" fill="none"><path d="M-250 140 V-20 M-290 140 H-210 M-290 -20 H-210"/></g>
      <rect x="-380" y="30" width="170" height="70" rx="35" fill="#0b0e14" opacity="0.85"/>${typed(-295, 82, 44, '60 м', '#ffd25a', 900).replace('letter-spacing="2"', 'text-anchor="middle"')}
    </g>
    ${hand(-380, 390, 78, 'Улика №2: регистратор', '#2a2f4a', -1)}${hand(-380, 456, 56, 'жёлтый — за 60 метров до линии', '#8e1c1c', -1)}
  </g>${tape(cx - 380, cy - 500, -30)}${tape(cx + 380, cy - 500, 28)}${pin(cx + 330, cy - 560)}
</g>`;

/* ---------- Страница 4: расчёт ---------- */
const page4 = (cx: number, cy: number) => `<g id="p4">
  ${paper(cx, cy, 800, 980, 1.5, `<g opacity="0.25">${Array.from({ length: 22 }, (_, k) => `<path d="M-380 ${-460 + k * 44} H380" stroke="#6a8fc7" stroke-width="2"/>`).join('')}${Array.from({ length: 18 }, (_, k) => `<path d="M${-360 + k * 44} -470 V470" stroke="#6a8fc7" stroke-width="2"/>`).join('')}</g>
    ${typed(-340, -380, 38, 'РАСЧЁТ · ТОРМОЗНОЙ ПУТЬ')}
    <rect x="-340" y="-290" width="680" height="64" rx="10" fill="#3aa6c9"/>${typed(-320, -246, 36, 'ДО ЛИНИИ — 60 м', '#06222c', 900)}
    <rect id="bar4" x="-340" y="-170" width="226" height="64" rx="10" fill="#d92b2b"/>${typed(-320, -126, 36, '~20 м', '#fff', 900)}
    ${hand(-340, 40, 78, 'Остановиться — успевал.', '#2a2f4a', -1)}
    ${hand(-340, 150, 76, 'Скорость 40 км/ч:', '#5a5f78', -1)}${hand(-340, 230, 62, 'реакция + торможение ≈ 20 м', '#5a5f78', -1)}
    <g id="ck4" transform="translate(250 330)" stroke="#d92b2b" stroke-width="16" fill="none" stroke-linecap="round"><circle r="86"/><path d="M-44 6 L-10 40 L52 -40"/></g>`, 'p4a')}
  <g transform="translate(${cx - 260} ${cy + 560}) rotate(-8)"><ellipse rx="110" ry="108" fill="none" stroke="#5a3a24" stroke-width="14" opacity="0.5"/><ellipse rx="70" ry="64" fill="none" stroke="#5a3a24" stroke-width="5" opacity="0.4"/></g>
</g>`;

/* ---------- Страница 5: приговор ---------- */
const page5 = (cx: number, cy: number) => `<g id="p5">
  ${paper(cx, cy, 800, 1000, -1.5, `${typed(-340, -420, 40, 'ПОСТАНОВЛЕНИЕ')}${Array.from({ length: 9 }, (_, k) => `<rect x="-340" y="${-360 + k * 46}" width="${560 + ((k * 97) % 120)}" height="14" rx="4" fill="#b6a77f" opacity="0.8"/>`).join('')}
    ${typed(-340, 180, 34, 'ВОДИТЕЛЬ А', '#3a3f55')}
    ${hand(-340, 300, 94, 'п. 6.2', '#2b4fae', -1)}${hand(-340, 390, 68, 'жёлтый — это «стой»,', '#2a2f4a', -1)}${hand(-340, 456, 68, 'а не «успей»', '#2a2f4a', -1)}`, 'p5a')}
  <g id="stamp5" filter="url(#fRough)"><g transform="translate(${cx + 80} ${cy - 40}) rotate(-12)"><rect x="-330" y="-120" width="660" height="240" rx="26" fill="rgba(193,39,45,0.08)" stroke="#c1272d" stroke-width="16"/><text x="0" y="-8" text-anchor="middle" ${FONT} font-weight="900" font-size="96" fill="#c1272d">ВИНОВЕН</text><text x="0" y="78" text-anchor="middle" ${FONT} font-weight="900" font-size="72" fill="#c1272d">ВОДИТЕЛЬ А</text></g></g>
</g>`;

/* ---------- Страница 6: игра на столе ---------- */
const page6 = (cx: number, cy: number) => `<g id="p6">
  <g transform="translate(${cx} ${cy}) rotate(-4)"><g ${shadow}><rect x="-230" y="-460" width="460" height="920" rx="66" fill="#05070c"/></g>
    <svg x="-216" y="-446" width="432" height="892" viewBox="0 0 400 820"><rect width="400" height="820" rx="40" fill="#183a5e"/><image href="icon.png" x="80" y="190" width="240" height="240"/><text x="200" y="520" font-family="Montserrat" font-weight="900" font-size="44" fill="#fff" text-anchor="middle">Курьер ПДД</text><text x="200" y="572" font-family="Montserrat" font-weight="700" font-size="26" fill="#b9d6f2" text-anchor="middle">800 вопросов · 10 глав</text><rect x="70" y="640" width="260" height="76" rx="38" fill="${P.yellow}"/><text x="200" y="690" font-family="Montserrat" font-weight="900" font-size="32" fill="#10131f" text-anchor="middle">ИГРАТЬ</text></svg>
  </g>${paper(cx - 330, cy + 520, 380, 220, 7, `${typed(-150, -20, 26, 'ДЕЛО №2', '#8e1c1c', 900)}${hand(-150, 60, 52, 'в игре', '#2a2f4a')}`)}
</g>`;

/* ---------- Нитки между уликами ---------- */
const X = (k: number) => 540 + [0, 20, -10, 10, -10, 10, 0][k];
const thread = (a: number, b: number, pa: [number, number], pb: [number, number], id: string) =>
  `<path id="${id}" d="M${X(a) + pa[0]} ${pageY(a) + pa[1]} C${X(a) + 360} ${pageY(a) + 800} ${X(b) - 360} ${pageY(b) - 800} ${X(b) + pb[0]} ${pageY(b) + pb[1]}" stroke="#b3201f" stroke-width="7" fill="none" stroke-linecap="round"/>`;

const deskArt = `${defsExtra}<g id="desk">${desk(PAGE_H * 6 + 2400)}
  ${thread(1, 2, [330, -470], [-60, -330], 'th12')}${thread(2, 3, [80, 340], [330, -560], 'th23')}${thread(3, 4, [330, -560], [0, -300], 'th34')}
  ${page0(X(0), pageY(0))}${photo1(X(1), pageY(1))}${page2(X(2), pageY(2))}${page3(X(3), pageY(3))}${page4(X(4), pageY(4))}${page5(X(5), pageY(5))}${page6(X(6), pageY(6))}</g>`;

const shots: Shot8[] = [
  {
    t0: 0,
    t1: END,
    art: svg(deskArt),
    tweens: () => {
      const stops = [0, 1, 2, 3, 4, 5, 6];
      const cam = stops
        .map((k) => {
          const t = k === 0 ? 0 : PAGE_T[k] - 0.45;
          const sc = [1.0, 1.0, 0.98, 1.0, 1.02, 1.0, 1.04][k];
          return `tl.${k === 0 ? 'set' : 'to'}('#desk', { x: ${-(X(k) - 540)}, y: ${-(pageY(k) - 960) - 240}, scale: ${sc}, svgOrigin: '540 960'${k === 0 ? '' : `, duration: ${MOVE}, ease: 'power2.inOut'`} }, ${t.toFixed(2)});`;
        })
        .join('\n');
      const pop = (id: string, k: number, d = 0.5) => `tl.fromTo('#${id}', { opacity: 0, scale: 0.9, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' }, ${(PAGE_T[k] - 0.1 + d).toFixed(2)});`;
      const draw = (id: string, k: number) => `tl.fromTo('#${id}', { strokeDasharray: 3000, strokeDashoffset: 3000 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' }, ${(PAGE_T[k] - 0.4).toFixed(2)});`;
      return `${cam}
        ${pop('p1', 1, 0.2)}${pop('p2a', 2, 0.2)}${pop('p2b', 2, 1.0)}${pop('p3', 3, 0.2)}${pop('p4a', 4, 0.2)}${pop('p5a', 5, 0.2)}${pop('p6', 6, 0.2)}
        ${draw('th12', 2)}${draw('th23', 3)}${draw('th34', 4)}
        tl.fromTo('#bar4', { scaleX: 0, svgOrigin: '${X(4) - 340} ${pageY(4) - 140}' }, { scaleX: 1, duration: 0.8, ease: 'power2.out' }, ${(PAGE_T[4] + 1.0).toFixed(2)});
        tl.fromTo('#ck4', { opacity: 0, scale: 0.3, svgOrigin: '${X(4) + 250} ${pageY(4) + 330}' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.2)' }, ${(PAGE_T[4] + 2.6).toFixed(2)});
        tl.fromTo('#stamp5', { opacity: 0, scale: 2.2, svgOrigin: '${X(5) + 80} ${pageY(5) - 40}' }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power4.in' }, ${(PAGE_T[5] + 1.6).toFixed(2)});`;
    },
  },
];

/* ---------- Подписи улик (вместо озвучки) ---------- */
const caps = [
  [0.5, 2.8, 'Кто *виноват* в аварии?'],
  [3.4, 7.2, 'Улика 1. Перекрёсток. Светофор. Две машины.'],
  [8.0, 12.2, 'А: «Ехал на жёлтый». Б: «Мне горел *зелёный*».'],
  [13.0, 17.4, 'Улика 2. Регистратор: жёлтый за *60 метров*.'],
  [18.2, 21.6, 'Тормозной путь на 40 км/ч — около *20 метров*.'],
  [22.4, 26.2, 'Виноват *А*. Пункт 6.2: жёлтый — это *«стой»*.'],
  [27.0, 31.8, 'Больше 80 таких дел — в игре «Курьер ПДД».'],
] as const;
const cw = toWords(caps.map((c) => c[2]), caps.map((c) => [c[0], c[1]] as [number, number]));

export const v47: Video8 = {
  id: '47-delo-1',
  title: 'Дело на столе №1 — Кто виноват?',
  tag: 'ДЕЛО №1',
  end: END,
  shots,
  subs: makeSubs(cw.words as Word[], { color: cw.color }),
  overlays: [
    {
      t0: 0,
      t1: END,
      html: `<div style="position:absolute;inset:0;background:radial-gradient(60% 45% at 50% 42%, rgba(255,214,140,0.20), rgba(0,0,0,0) 70%), radial-gradient(90% 70% at 50% 45%, rgba(0,0,0,0) 40%, rgba(5,3,2,0.72) 100%);mix-blend-mode:normal;pointer-events:none"></div>`,
    },
    {
      t0: 28.4,
      t1: END,
      html: `<div id="bio" style="position:absolute;left:150px;right:150px;top:240px;height:120px;border-radius:60px;background:${P.yellow};display:flex;align-items:center;justify-content:center;gap:18px;font-weight:900;font-size:50px;color:#10131f;box-shadow:0 0 50px ${P.yellow}88">ССЫЛКА В БИО <span style="font-size:56px">↗</span></div>`,
      tweens: (t0: number) => `tl.fromTo('#bio', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, ${t0});tl.to('#bio', { scale: 1.06, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' }, ${t0 + 0.4});`,
    },
  ],
  clock: [[0, 'ПЕРЕКРЁСТОК · 14:32']],
  shakes: [[PAGE_T[5] + 1.65, 16, 0.5]],
  flashes: [[PAGE_T[5] + 1.65, 0.25, 0.3, '#ffffff']],
  plainFrom: 28.4,
};
