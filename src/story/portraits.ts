/**
 * Портреты персонажей: лицо по плечи на фоне цвета героя. Нарисованы кодом в SVG, без файлов,
 * поэтому работают без интернета и почти ничего не весят. Внутри нет id (градиентов и масок),
 * так что один портрет можно показать на экране несколько раз. Круг делает CSS (`.avatar`).
 */
import { CHARACTERS, type CharacterId } from './story.ts';

export type PortraitId = Exclude<CharacterId, 'narrator'>;

const INK = '#2b2b2b';

interface Skin {
  skin: string;
  shade: string;
}

/** Плечи и одежда. */
const body = (fill: string, wide = false) =>
  wide
    ? `<path d="M2 96C4 79 18 70 34 67Q48 72 62 67C78 70 92 79 94 96Z" fill="${fill}"/>`
    : `<path d="M6 96C8 81 20 72 36 69Q48 74 60 69C76 72 88 81 90 96Z" fill="${fill}"/>`;

const neck = (s: Skin) => `<path d="M42 52V70Q48 75 54 70V52Z" fill="${s.shade}"/>`;

/** Голова с ушами. */
const head = (s: Skin, rx = 15.5, ry = 18.5) =>
  `<ellipse cx="${48 - rx - 0.5}" cy="45" rx="3.6" ry="5" fill="${s.skin}"/>` +
  `<ellipse cx="${48 + rx + 0.5}" cy="45" rx="3.6" ry="5" fill="${s.skin}"/>` +
  `<ellipse cx="48" cy="42" rx="${rx}" ry="${ry}" fill="${s.skin}"/>`;

/** Глаза с бликами. */
const eyes = (y = 44, color = INK) =>
  `<ellipse cx="42" cy="${y}" rx="2.1" ry="2.5" fill="${color}"/><ellipse cx="54" cy="${y}" rx="2.1" ry="2.5" fill="${color}"/>` +
  `<circle cx="42.8" cy="${y - 0.9}" r="0.75" fill="#fff"/><circle cx="54.8" cy="${y - 0.9}" r="0.75" fill="#fff"/>`;

/** Улыбающиеся (прищуренные) глаза. */
const happyEyes = (y = 44) =>
  `<path d="M39.3 ${y + 0.6}Q42 ${y - 2.4} 44.7 ${y + 0.6}M51.3 ${y + 0.6}Q54 ${y - 2.4} 56.7 ${y + 0.6}" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

const brows = (y: number, color: string, width = 1.8, lift = 1.4) =>
  `<path d="M38.2 ${y + 0.6}Q42 ${y - lift} 45.6 ${y + 0.4}M50.4 ${y + 0.4}Q54 ${y - lift} 57.8 ${y + 0.6}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;

const nose = (s: Skin) => `<path d="M48.4 46.5Q46.4 50.6 48.8 51.4" stroke="${s.shade}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;

const smile = (color: string, y = 55, w = 4.5) => `<path d="M${48 - w} ${y}Q48 ${y + 3.4} ${48 + w} ${y}" stroke="${color}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;

const cheeks = (color = '#ff8a80', opacity = 0.35, r = 3.4) =>
  `<circle cx="38.5" cy="50.5" r="${r}" fill="${color}" opacity="${opacity}"/><circle cx="57.5" cy="50.5" r="${r}" fill="${color}" opacity="${opacity}"/>`;

/** Светлый круг за головой — портрет не сливается с фоном. */
const halo = '<circle cx="48" cy="40" r="31" fill="#fff" opacity="0.14"/>';

const DRAW: Record<PortraitId, () => string> = {
  /** Инструктор: седые виски, очки, усы, рубашка с галстуком и пиджак. */
  victor: () => {
    const s = { skin: '#f0c4a2', shade: '#d6a07c' };
    return (
      halo +
      body('#24406e') +
      neck(s) +
      '<path d="M38 69L48 81L58 69Z" fill="#fff"/><path d="M46.2 72H49.8L51.4 85L48 89L44.6 85Z" fill="#c1121f"/>' +
      '<path d="M36 69L44 84L40 96M60 69L52 84L56 96" stroke="#16294a" stroke-width="1.6" fill="none"/>' +
      head(s) +
      '<path d="M32.2 47Q30 34 35.5 28.5L38.5 31.5Q35 37 35.6 47Z" fill="#b9b9b9"/>' +
      '<path d="M63.8 47Q66 34 60.5 28.5L57.5 31.5Q61 37 60.4 47Z" fill="#b9b9b9"/>' +
      '<ellipse cx="43" cy="29.5" rx="6" ry="3" fill="#fff" opacity="0.3"/>' +
      brows(37.4, '#8a8a8a', 2.2) +
      eyes(44) +
      '<circle cx="42" cy="44" r="4.6" fill="#fff" fill-opacity="0.18" stroke="#1d1d1d" stroke-width="1.5"/>' +
      '<circle cx="54" cy="44" r="4.6" fill="#fff" fill-opacity="0.18" stroke="#1d1d1d" stroke-width="1.5"/>' +
      '<path d="M46.6 43.6Q48 42.2 49.4 43.6M37.4 43.4L33 42.4M58.6 43.4L63 42.4" stroke="#1d1d1d" stroke-width="1.4" fill="none"/>' +
      nose(s) +
      '<path d="M41.6 52.2Q48 48.4 54.4 52.2Q51.4 54.8 48 53Q44.6 54.8 41.6 52.2Z" fill="#a3a3a3"/>' +
      smile('#9c5a44', 55.6, 3)
    );
  },

  /** Диспетчер: каштановый хвост, наушники с микрофоном, жёлтое поло «Стрелы». */
  marina: () => {
    const s = { skin: '#f6cfb3', shade: '#e0a988' };
    const hair = '#7a3420';
    return (
      halo +
      `<path d="M59 28Q78 34 72 62Q68 52 60 46Z" fill="${hair}"/>` +
      `<ellipse cx="48" cy="40" rx="17.5" ry="19.5" fill="${hair}"/>` +
      body('#ffd166') +
      '<path d="M38 69L44 77L48 72L52 77L58 69Q48 73 38 69Z" fill="#f4a261"/><path d="M48 72V84" stroke="#e0a03c" stroke-width="1.4"/>' +
      neck(s) +
      head(s) +
      `<path d="M32.4 41Q32 22 48 21.5Q64 22 63.6 41Q61 30 53 28Q46 34 36.5 33.5Q33.6 36 32.4 41Z" fill="${hair}"/>` +
      brows(38.2, '#5c2716', 1.6) +
      eyes(44.4) +
      '<path d="M39.6 42.2L38.4 41M56.4 42.2L57.6 41" stroke="#2b2b2b" stroke-width="1.1" stroke-linecap="round"/>' +
      nose(s) +
      cheeks('#ff8a80', 0.3) +
      '<path d="M43.6 54.4Q48 58.4 52.4 54.4Q48 55.8 43.6 54.4Z" fill="#c8553d"/>' +
      `<path d="M30.6 42Q30 17.4 48 17Q66 17.4 65.4 42" stroke="${INK}" stroke-width="2.6" fill="none"/>` +
      `<rect x="27.4" y="39" width="7" height="12" rx="3.2" fill="${INK}"/><rect x="61.6" y="39" width="7" height="12" rx="3.2" fill="${INK}"/>` +
      `<path d="M31 50Q32.6 58.6 41.4 57.4" stroke="${INK}" stroke-width="1.6" fill="none"/><circle cx="42" cy="57.2" r="1.9" fill="${INK}"/>`
    );
  },

  /** Инспектор ДПС: фуражка с красным околышем, светоотражающий жилет. */
  sokolov: () => {
    const s = { skin: '#edc19e', shade: '#d39f78' };
    return (
      halo +
      body('#c7e23b') +
      '<path d="M39 69L48 80L57 69Z" fill="#5b7590"/><path d="M46.6 72H49.4L50.4 82L48 85L45.6 82Z" fill="#1d2b3a"/>' +
      '<path d="M11 83H38V87.6H10.2ZM58 83H85.8L85 87.6H58Z" fill="#e9ecef"/>' +
      '<path d="M12.6 90H39V94.4H12ZM57 90H84L84.6 94.4H57Z" fill="#e9ecef"/>' +
      '<path d="M38 69V96M58 69V96" stroke="#9fb52a" stroke-width="1.4"/>' +
      '<circle cx="67" cy="79" r="2.6" fill="#e9c46a" stroke="#b08a2e" stroke-width="0.8"/>' +
      neck(s) +
      head(s) +
      '<path d="M32.6 44Q32.4 36 34.6 33L37 34Q35.4 38 35.6 44ZM63.4 44Q63.6 36 61.4 33L59 34Q60.6 38 60.4 44Z" fill="#4a3426"/>' +
      '<path d="M27 31Q28 15 48 14Q68 15 69 31Q48 35.4 27 31Z" fill="#2f3d52"/>' +
      '<path d="M30.6 30.6Q48 34.6 65.4 30.6L65.4 35.6Q48 39.4 30.6 35.6Z" fill="#c1121f"/>' +
      '<path d="M32.6 35.2Q48 41 63.4 35.2Q61 40.6 48 41.8Q35 40.6 32.6 35.2Z" fill="#111"/>' +
      '<circle cx="48" cy="31.6" r="2.7" fill="#e9c46a" stroke="#b08a2e" stroke-width="0.8"/>' +
      '<path d="M38.4 41.6L45.4 41.2M50.6 41.2L57.6 41.6" stroke="#3b2a20" stroke-width="2" stroke-linecap="round"/>' +
      eyes(45) +
      nose(s) +
      '<path d="M44.4 55.4H51.6" stroke="#9c5a44" stroke-width="1.7" stroke-linecap="round"/>'
    );
  },

  /** Хозяйка пекарни: белая косынка в горошек, румянец, фартук. */
  galina: () => {
    const s = { skin: '#f3c6a8', shade: '#dba584' };
    return (
      halo +
      body('#e07a8a') +
      '<path d="M35 75H61L64 96H32Z" fill="#fff"/><path d="M35 75L28 70M61 75L68 70" stroke="#fff" stroke-width="3"/>' +
      '<path d="M41 87H55" stroke="#e8c9cf" stroke-width="1.6"/>' +
      neck(s) +
      '<circle cx="31.4" cy="44" r="4.2" fill="#d6d6d6"/><circle cx="64.6" cy="44" r="4.2" fill="#d6d6d6"/>' +
      head(s, 16.5, 18) +
      '<path d="M30 39Q29 17 48 17Q67 17 66 39Q58 31.4 48 31.4Q38 31.4 30 39Z" fill="#fff"/>' +
      '<g fill="#e63946"><circle cx="39" cy="24" r="1.4"/><circle cx="48" cy="21.4" r="1.4"/><circle cx="57" cy="24" r="1.4"/><circle cx="34" cy="31" r="1.4"/><circle cx="43.6" cy="28" r="1.4"/><circle cx="52.4" cy="28" r="1.4"/><circle cx="62" cy="31" r="1.4"/></g>' +
      '<path d="M37 33.6Q48 30.2 59 33.6" stroke="#d6d6d6" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      brows(38.4, '#9a9a9a', 1.6, 1.8) +
      happyEyes(44) +
      nose(s) +
      cheeks('#ff6b6b', 0.45, 4) +
      '<path d="M42 53.2Q48 60.4 54 53.2Q48 55.6 42 53.2Z" fill="#9b3d3d"/>'
    );
  },

  /** Курьер-соперник: вихры, очки мопедиста на лбу, веснушки, жёлтая куртка «Стрелы». */
  artem: () => {
    const s = { skin: '#f2c6a0', shade: '#dba27c' };
    return (
      halo +
      body('#ffd166') +
      '<path d="M8 86Q48 80 88 86V90.6Q48 84.6 8.6 90.6Z" fill="#1b2430"/>' +
      '<path d="M36 69Q42 74 48 74Q54 74 60 69L57 66Q48 71 39 66Z" fill="#f4a261"/><path d="M48 74V96" stroke="#c99a2e" stroke-width="1.4"/>' +
      neck(s) +
      head(s) +
      '<path d="M31.4 39Q29 24 38 21L40 14.6L44.6 20.4L49.4 12.6L52.6 20.4L59 15L58.6 21.6Q67.6 26 64.6 39Q62 30 56 29.6Q50 32.4 44 29.4Q37 31.4 31.4 39Z" fill="#b5651d"/>' +
      `<path d="M31 32.4Q48 26 65 32.4" stroke="${INK}" stroke-width="2.8" fill="none"/>` +
      '<rect x="36.4" y="25" width="10.4" height="7.4" rx="3.4" fill="#9ad1f5" stroke="#333" stroke-width="1.5"/>' +
      '<rect x="49.2" y="25" width="10.4" height="7.4" rx="3.4" fill="#9ad1f5" stroke="#333" stroke-width="1.5"/>' +
      '<path d="M38.4 27.4L41 26.4M51.2 27.4L53.8 26.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>' +
      brows(37.4, '#7a4316', 1.8, 2.6) +
      eyes(44) +
      nose(s) +
      '<g fill="#c8875a"><circle cx="37.4" cy="49" r="0.8"/><circle cx="39.8" cy="50.4" r="0.8"/><circle cx="37.8" cy="51.8" r="0.8"/><circle cx="58.6" cy="49" r="0.8"/><circle cx="56.2" cy="50.4" r="0.8"/><circle cx="58.2" cy="51.8" r="0.8"/></g>' +
      '<path d="M41 52.4Q48 61.6 55 52.4Z" fill="#7a2e2e"/><path d="M41.8 52.8H54.2L53.4 54.6H42.6Z" fill="#fff"/>'
    );
  },

  /** Водитель фуры: борода, кепка, рубашка в клетку. */
  semyon: () => {
    const s = { skin: '#e3b08a', shade: '#c99470' };
    return (
      halo +
      body('#b5343c', true) +
      '<path d="M20 74V96M33 69V96M63 69V96M76 74V96M8 81H88M5.6 91H90.4" stroke="#7d1d24" stroke-width="2.2"/>' +
      '<path d="M37.6 68Q48 79 58.4 68Z" fill="#f1f1f1"/>' +
      neck(s) +
      head(s, 17.5, 19) +
      '<path d="M29.6 43Q30 63.4 48 65.6Q66 63.4 66.4 43Q64 52 57 53.6Q48 50.4 39 53.6Q32 52 29.6 43Z" fill="#4e342e"/>' +
      '<path d="M40.6 52.2Q48 48.6 55.4 52.2Q48 51.4 40.6 52.2Z" fill="#4e342e" stroke="#4e342e" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M44.2 55.6Q48 58.4 51.8 55.6Q48 56.4 44.2 55.6Z" fill="#d98888"/>' +
      '<path d="M28.4 34Q28 17 48 16Q68 17 67.6 34Z" fill="#d62828"/>' +
      '<path d="M37.6 18.6Q48 15.6 58.4 18.6L59 33.4H37Z" fill="#f1faee"/>' +
      '<path d="M27.6 33.4Q48 29.4 68.4 33.4Q73 36.4 70.6 38.6Q48 33.6 25.4 38.6Q23 36.4 27.6 33.4Z" fill="#a4161a"/>' +
      '<circle cx="48" cy="16.4" r="1.6" fill="#a4161a"/>' +
      brows(38.8, '#3b2620', 2.6, 0.6) +
      eyes(44.6) +
      nose(s)
    );
  },

  /** Фельдшер: каре, форма скорой со светоотражающей полосой, стетоскоп. */
  anya: () => {
    const s = { skin: '#f6d2b8', shade: '#e0ad8e' };
    const hair = '#2b1d17';
    return (
      halo +
      `<path d="M29 46Q27.6 19.6 48 19.6Q68.4 19.6 67 46V57.6Q62.6 59.6 60.6 55H35.4Q33.4 59.6 29 57.6Z" fill="${hair}"/>` +
      body('#1d3557') +
      '<path d="M9 84.6Q48 81 87 84.6V89.4Q48 85.6 9.6 89.4Z" fill="#cfd8dc"/>' +
      '<path d="M39.6 69L48 77L56.4 69Z" fill="#e63946"/>' +
      neck(s) +
      head(s) +
      `<path d="M31.8 37Q32.6 21.6 48 21.6Q63.4 21.6 64.2 37Q56 32.6 48 33.6Q40 32.6 31.8 37Z" fill="${hair}"/>` +
      brows(38.2, '#2b1d17', 1.6) +
      eyes(44.4) +
      '<path d="M39.6 42.2L38.4 41M56.4 42.2L57.6 41" stroke="#2b2b2b" stroke-width="1.1" stroke-linecap="round"/>' +
      nose(s) +
      cheeks('#ff8a80', 0.28) +
      smile('#c0504d', 54.6, 4) +
      '<path d="M39 69Q35 84 44.6 89.4M57 69Q61 84 51.4 89.4" stroke="#8d99ae" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="48" cy="90.4" r="3.6" fill="#adb5bd" stroke="#6c757d" stroke-width="1.2"/>'
    );
  },

  /** Механик: пышные усы, щетина, пятно масла на щеке, комбинезон с ключом в кармане. */
  gena: () => {
    const s = { skin: '#e6b38e', shade: '#cc9670' };
    return (
      halo +
      body('#c9d1d9') +
      '<path d="M33 79H63L66 96H30Z" fill="#2b4c7e"/><path d="M23 72L35 80M73 72L61 80" stroke="#2b4c7e" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="35.6" cy="81.2" r="1.8" fill="#e9c46a"/><circle cx="60.4" cy="81.2" r="1.8" fill="#e9c46a"/>' +
      '<rect x="40" y="85" width="16" height="9" rx="1.6" fill="#24406e"/>' +
      '<path d="M52 86.6V78.6" stroke="#adb5bd" stroke-width="2.4" stroke-linecap="round"/><circle cx="52" cy="77.2" r="2.6" fill="none" stroke="#adb5bd" stroke-width="2"/>' +
      neck(s) +
      head(s) +
      '<path d="M32.6 39Q32.6 25 41 23.4L42.6 27.6Q48 25.6 53.4 27.6L55 23.4Q63.4 25 63.4 39Q61.4 32.6 58.4 31.6L56.4 33.6Q48 31.4 39.6 33.6L37.6 31.6Q34.6 32.6 32.6 39Z" fill="#6b6b6b"/>' +
      '<path d="M65.2 37.6L69.4 50.6" stroke="#f4a261" stroke-width="2.4" stroke-linecap="round"/><path d="M69.4 50.6L70 52.4" stroke="#333" stroke-width="2" stroke-linecap="round"/>' +
      brows(37.8, '#5e5e5e', 2.6, 1) +
      eyes(44) +
      nose(s) +
      '<ellipse cx="57.6" cy="49.6" rx="3" ry="1.8" fill="#3d3d3d" opacity="0.35" transform="rotate(-20 57.6 49.6)"/>' +
      '<g fill="#7b5a44" opacity="0.45"><circle cx="43" cy="58.4" r="0.6"/><circle cx="46" cy="59.4" r="0.6"/><circle cx="49.6" cy="59.6" r="0.6"/><circle cx="52.8" cy="58.6" r="0.6"/><circle cx="40.4" cy="56.6" r="0.6"/><circle cx="55.4" cy="56.8" r="0.6"/></g>' +
      '<path d="M38.4 51.6Q43.4 47.6 48 50.2Q52.6 47.6 57.6 51.6Q57 55.6 52.4 54.2Q48 53 43.6 54.2Q39 55.6 38.4 51.6Z" fill="#8a8a8a"/>' +
      smile('#9c5a44', 56.2, 2.6)
    );
  },
};

/** SVG-портрет персонажа (квадрат 96×96 с фоном цвета героя). */
export function portraitSvg(id: PortraitId): string {
  return (
    `<svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="96" height="96" fill="${CHARACTERS[id].color}"/>${DRAW[id]()}</svg>`
  );
}

export const PORTRAIT_IDS = Object.keys(DRAW) as PortraitId[];
