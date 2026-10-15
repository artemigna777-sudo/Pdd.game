/**
 * Оформления вопросов: рисунки (SVG кодом), серия верных ответов, украшения карточки, эффекты
 * и звуки каждого оформления. Перенесено из примеров, одобренных Артёмом 15.10.2026.
 * Каталог, цены и даты праздников — `progress/qthemes.ts`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const svg = (vb: string, body: string, w?: number, h?: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${w ? ` width="${w}" height="${h}"` : ''}>${body}</svg>`;
/** SVG как картинка для CSS (`background-image`). */
export const url = (s: string): string => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const HEART = 'M20 36 C8 27 2 20 2 13 C2 7.5 6.5 3 12 3 C15.5 3 18.3 5 20 8 C21.7 5 24.5 3 28 3 C33.5 3 38 7.5 38 13 C38 20 32 27 20 36Z';
const STAR = '20,2 24.9,14.2 38,15.1 27.9,23.5 31.1,36.3 20,29.3 8.9,36.3 12.1,23.5 2,15.1 15.1,14.2';
const LEAF = 'M20 2 L23 11 L31 7 L28 16 L37 17 L30 23 L34 30 L24 28 L21 38 L19 38 L16 28 L6 30 L10 23 L3 17 L12 16 L9 7 L17 11 Z';
const pent = (cx: number, cy: number, r: number, rot = -90): string => Array.from({ length: 5 }, (_: unknown, i: number) => { const a = ((rot + i * 72) * Math.PI) / 180; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const burstPts = (cx: number, cy: number, r1: number, r2: number, n = 12): string => Array.from({ length: n * 2 }, (_: unknown, i: number) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');

/** Рисунки: каждый возвращает SVG-разметку. Параметры — цвета, номера, состояния. */
type Art = (...args: any[]) => string;
export const ART: Record<string, Art> = {
  ball: (c, glow) => svg('0 0 40 40', `${glow ? `<circle cx="20" cy="23" r="19" fill="${glow}" opacity=".45"/>` : ''}<rect x="16" y="0.5" width="8" height="6" rx="1.5" fill="#d9b54a"/><circle cx="20" cy="23" r="16" fill="${c}"/><path d="M5.5 21 Q20 28 34.5 21" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/><ellipse cx="13" cy="15.5" rx="4.5" ry="3" fill="#fff" fill-opacity=".55"/>`),
  ballCracked: () => svg('0 0 40 40', `<rect x="16" y="0.5" width="8" height="6" rx="1.5" fill="#a9a9a9"/><circle cx="20" cy="23" r="16" fill="#8e97a6"/><path d="M14 9 L19 17 L15 22 L21 28 L18 38" stroke="#fff" stroke-width="2" fill="none"/>`),
  bow: () => svg('0 0 92 52', `<path d="M46 26 C30 2 6 6 10 22 C12 32 30 30 46 26Z" fill="#d62839"/><path d="M46 26 C62 2 86 6 82 22 C80 32 62 30 46 26Z" fill="#d62839"/><path d="M46 26 C40 34 34 44 28 50 L36 50 L46 32 L56 50 L64 50 C58 44 52 34 46 26Z" fill="#b51d2e"/><ellipse cx="46" cy="26" rx="8" ry="7" fill="#ef4b5c"/><path d="M18 14 Q30 12 40 22" stroke="#ff8a95" stroke-width="2" fill="none"/>`),
  bulb: (on, c) => svg('0 0 20 30', `${on ? `<circle cx="10" cy="19" r="10" fill="${c}" opacity=".35"/>` : ''}<rect x="7" y="2" width="6" height="5" rx="1" fill="#6b6b6b"/><ellipse cx="10" cy="17" rx="6" ry="9" fill="${on ? c : '#5a6170'}"/>${on ? '<ellipse cx="8" cy="14" rx="2" ry="3" fill="#fff" opacity=".6"/>' : ''}`, 20, 30),
  heart: (c, extra = '') => svg('0 0 40 40', `<path d="${HEART}" fill="${c}"/>${extra}`),
  heartS: (c) => svg('0 0 40 40', `<path d="${HEART}" fill="${c}"/>`, 22, 22),
  heartBroken: () => svg('0 0 40 40', `<path d="${HEART}" fill="#b9a3ad"/><path d="M20 8 L16.5 15 L22.5 20 L17.5 26 L21 33" stroke="#fff" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`),
  heartPattern: () => svg('0 0 70 70', `<g transform="translate(8 8) scale(.4)"><path d="${HEART}" fill="#ff8fb1"/></g><g transform="translate(42 40) scale(.3)"><path d="${HEART}" fill="#f06292"/></g>`),
  star: (c, stroke = '#c9a646') => svg('0 0 40 40', `<polygon points="${STAR}" fill="${c}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>`),
  starPattern: () => svg('0 0 56 56', `<g transform="translate(6 6) scale(.35)"><polygon points="${STAR}" fill="#c9a646"/></g><g transform="translate(34 32) scale(.25)"><polygon points="${STAR}" fill="#c9a646"/></g>`),
  epaulette: (n) => svg('0 0 120 34', `<path d="M4 6 H104 L116 17 L104 28 H4 Z" fill="#3c4d24" stroke="#c9a646" stroke-width="2"/><path d="M4 17 H104" stroke="#d7b54a" stroke-width="2.5"/>${[0, 1, 2, 3].map((i) => `<g transform="translate(${14 + i * 22} 7) scale(.5)"><polygon points="${STAR}" fill="${i < n ? '#e7c85a' : '#55663a'}" stroke="${i < n ? '#a8862c' : '#4a5a30'}" stroke-width="2"/></g>`).join('')}<circle cx="106" cy="17" r="4" fill="#c9a646"/>`, 120, 34),
  medal: () => svg('0 0 60 90', `<path d="M14 0 H30 L36 34 H20 Z" fill="#b3141f"/><path d="M30 0 H46 L40 34 H24 Z" fill="#c9a646"/><circle cx="30" cy="58" r="22" fill="#e0b84a" stroke="#a8862c" stroke-width="3"/><polygon points="${STAR}" transform="translate(13 41) scale(.85)" fill="#b3141f"/>`),
  blin: (ok) => svg('0 0 40 40', `${ok ? '<g stroke="#ff9f1c" stroke-width="3" stroke-linecap="round"><path d="M20 1 V5"/><path d="M20 35 V39"/><path d="M1 20 H5"/><path d="M35 20 H39"/><path d="M6.6 6.6 L9.4 9.4"/><path d="M30.6 30.6 L33.4 33.4"/><path d="M6.6 33.4 L9.4 30.6"/><path d="M30.6 9.4 L33.4 6.6"/></g>' : ''}<circle cx="20" cy="20" r="${ok ? 13.5 : 17}" fill="#f2c14e" stroke="#c98a1e" stroke-width="1.5"/><ellipse cx="13" cy="15" rx="3" ry="2" fill="#d99a2b" opacity=".6"/><ellipse cx="26" cy="27" rx="3.5" ry="2.2" fill="#d99a2b" opacity=".6"/><ellipse cx="27" cy="13" rx="2" ry="1.5" fill="#d99a2b" opacity=".5"/>`),
  blinKom: () => svg('0 0 40 40', `<path d="M8 22 C5 14 12 6 19 9 C24 4 34 8 33 16 C38 21 33 32 25 31 C20 37 9 34 10 28 C6 27 6 24 8 22Z" fill="#c99a4a" stroke="#8a5f22" stroke-width="1.5"/><path d="M14 16 L18 19 M22 14 L25 18 M17 25 L22 24" stroke="#8a5f22" stroke-width="1.5"/>`),
  blinStack: (n) => svg('0 0 60 44', `<ellipse cx="30" cy="40" rx="28" ry="4" fill="#9aa0a6"/>${Array.from({ length: n }, (_, i) => `<ellipse cx="30" cy="${36 - i * 5}" rx="${24 - i}" ry="5" fill="#f2c14e" stroke="#c98a1e" stroke-width="1.2"/>`).join('')}${n >= 5 ? '<rect x="23" y="5" width="14" height="7" rx="2" fill="#fff6b0" stroke="#e0c95a"/>' : ''}`, 60, 44),
  embroidery: () => svg('0 0 36 18', `<path d="M9 2 L16 9 L9 16 L2 9 Z" fill="#c1272d"/><path d="M9 6 L12 9 L9 12 L6 9 Z" fill="#fff"/><path d="M27 4 L32 9 L27 14 L22 9 Z" fill="#1f6b3a"/>`),
  tulipBud: (c) => svg('0 0 40 40', `<path d="M20 26 V39" stroke="#3f8f4f" stroke-width="2.4"/><path d="M20 34 Q11 31 9 24 Q16 25 20 31" fill="#58b368"/><path d="M10 9 Q12 3 16 7 Q20 1 24 7 Q28 3 30 9 L30 18 Q30 28 20 28 Q10 28 10 18 Z" fill="${c}"/>`),
  tulipOpen: (c) => svg('0 0 40 40', `<path d="M20 26 V39" stroke="#3f8f4f" stroke-width="2.4"/><path d="M20 34 Q11 31 9 24 Q16 25 20 31" fill="#58b368"/><path d="M20 27 Q5 26 3 6 Q14 10 20 20 Q26 10 37 6 Q35 26 20 27Z" fill="${c}"/><path d="M20 22 Q14 12 20 3 Q26 12 20 22Z" fill="${c}" opacity=".85"/>`),
  tulipWilt: () => svg('0 0 40 40', `<path d="M20 39 Q20 26 26 20" stroke="#8aa36a" stroke-width="2.4" fill="none"/><g transform="rotate(38 26 18)"><path d="M14 8 Q16 2 20 6 Q24 0 28 6 L28 15 Q28 24 21 24 Q14 24 14 15 Z" fill="#d7a3b4"/></g>`),
  bouquet: (n) => svg('0 0 80 50', `${Array.from({ length: n }, (_, i) => { const x = 16 + i * 12; const c = ['#ef5b84', '#ff9f43', '#b05bd6', '#ff6f91', '#ffd400'][i]; return `<path d="M40 48 L${x} 18" stroke="#3f8f4f" stroke-width="2"/><path d="M${x - 6} 10 Q${x - 4} 4 ${x - 1} 7 Q${x + 2} 2 ${x + 5} 7 L${x + 5} 13 Q${x + 5} 20 ${x} 20 Q${x - 6} 20 ${x - 6} 13Z" fill="${c}"/>`; }).join('')}<path d="M30 40 L50 40 L46 50 L34 50Z" fill="#9ad3e6" opacity=".9"/>`, 80, 50),
  mimosa: () => svg('0 0 120 70', `<path d="M118 4 Q80 14 40 46" stroke="#5c8a3a" stroke-width="2.5" fill="none"/><g fill="#7bb05a"><ellipse cx="70" cy="22" rx="10" ry="3" transform="rotate(-30 70 22)"/><ellipse cx="54" cy="34" rx="10" ry="3" transform="rotate(-40 54 34)"/><ellipse cx="90" cy="12" rx="9" ry="3" transform="rotate(-20 90 12)"/></g><g fill="#ffd400"><circle cx="100" cy="18" r="5"/><circle cx="108" cy="24" r="4.5"/><circle cx="94" cy="26" r="4.5"/><circle cx="80" cy="30" r="5"/><circle cx="88" cy="36" r="4"/><circle cx="66" cy="40" r="5"/><circle cx="74" cy="46" r="4"/><circle cx="58" cy="50" r="4.5"/><circle cx="48" cy="56" r="4"/><circle cx="112" cy="10" r="4"/></g>`),
  tulips: () => svg('0 0 60 50', `<path d="M14 22 V50 M30 18 V50" stroke="#3f8f4f" stroke-width="2.4"/><path d="M6 8 Q8 2 11 5 Q14 0 17 5 Q20 2 22 8 L22 15 Q22 23 14 23 Q6 23 6 15Z" fill="#ef5b84"/><path d="M22 4 Q24 -2 27 1 Q30 -4 33 1 Q36 -2 38 4 L38 11 Q38 19 30 19 Q22 19 22 11Z" fill="#ff9f43"/>`),
  planet: (c, ring = '#c9d1ff', glow) => svg('0 0 40 40', `${glow ? `<circle cx="20" cy="20" r="19" fill="${glow}" opacity=".35"/>` : ''}<circle cx="20" cy="20" r="12.5" fill="${c}"/><ellipse cx="20" cy="20" rx="19" ry="5.5" fill="none" stroke="${ring}" stroke-width="2.2" transform="rotate(-18 20 20)"/><ellipse cx="15.5" cy="15" rx="4" ry="2.6" fill="#fff" opacity=".35"/>`),
  fuel: (n) => svg('0 0 130 26', `<rect x="1" y="4" width="112" height="18" rx="3" fill="#0b0d2a" stroke="#5ce1e6" stroke-width="2"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${5 + i * 21.5}" y="8" width="18" height="10" rx="1.5" fill="${i < n ? (n >= 5 ? '#3ddc84' : '#ffb703') : '#232a5e'}"/>`).join('')}<rect x="114" y="9" width="6" height="8" fill="#5ce1e6"/><path d="M124 6 L130 13 L124 20" stroke="#5ce1e6" stroke-width="2" fill="none"/>`, 130, 26),
  rocket: () => svg('0 0 40 60', `<path d="M20 2 C30 12 30 30 27 42 H13 C10 30 10 12 20 2Z" fill="#f1f3ff"/><circle cx="20" cy="20" r="5" fill="#4dabf7" stroke="#2b4c9b" stroke-width="2"/><path d="M13 32 L5 46 L13 42Z M27 32 L35 46 L27 42Z" fill="#e63946"/><path d="M15 44 Q20 60 25 44Z" fill="#ffb703"/>`),
  carnation: () => svg('0 0 64 76', `<path d="M30 30 Q28 52 22 76 M36 30 Q38 52 44 76" stroke="#3f7a3a" stroke-width="2.5" fill="none"/><g fill="#d1162b"><circle cx="24" cy="20" r="11"/><circle cx="42" cy="18" r="11"/><circle cx="33" cy="10" r="10"/></g>`),
  salutes: () => svg('0 0 400 200', ['#ffd166 60 50', '#ef476f 210 40', '#ffffff 330 70'].map((d) => { const [c, x, y] = d.split(' '); return Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `<line x1="${+x + Math.cos(a) * 8}" y1="${+y + Math.sin(a) * 8}" x2="${+x + Math.cos(a) * 30}" y2="${+y + Math.sin(a) * 30}" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`; }).join(''); }).join('')),
  medallion: (c, ring) => svg('0 0 40 40', `<circle cx="20" cy="20" r="17" fill="${c}" stroke="${ring}" stroke-width="3"/>`),
  lens: (lit, halo) => svg('0 0 40 40', `${halo ? `<circle cx="20" cy="20" r="19.5" fill="${halo}" opacity=".45"/>` : ''}<circle cx="20" cy="20" r="17" fill="#1d2228"/><circle cx="20" cy="20" r="13" fill="${lit || '#3e454f'}"/><ellipse cx="15" cy="14" rx="4" ry="2.5" fill="#fff" opacity=".25"/>`),
  lightMini: (green) => svg('0 0 12 30', `<rect x="0.5" y="0.5" width="11" height="29" rx="3" fill="#1d2228"/><circle cx="6" cy="7" r="3.2" fill="${green ? '#4a1d1d' : '#ff3b30'}"/><circle cx="6" cy="15" r="3.2" fill="#4a3e14"/><circle cx="6" cy="23" r="3.2" fill="${green ? '#2bd16b' : '#173d26'}"/>`, 12, 30),
  speed: (ok, bad) => svg('0 0 40 40', bad ? `<circle cx="20" cy="20" r="18" fill="#fff" stroke="#222" stroke-width="1.5"/><g stroke="#9aa0a6" stroke-width="2.5"><path d="M9 27 L27 9"/><path d="M13 31 L31 13"/><path d="M6 23 L23 6"/></g>` : `${ok ? '<circle cx="20" cy="20" r="19.5" fill="#2bd16b" opacity=".45"/>' : ''}<circle cx="20" cy="20" r="16.5" fill="#fff" stroke="#d0021b" stroke-width="5"/>`),
  speedometer: (n) => { const a = Math.PI * (1 - n / 5); const x = 40 + Math.cos(a) * 26, y = 40 - Math.sin(a) * 26; return svg('0 0 80 46', `<path d="M8 40 A32 32 0 0 1 72 40" fill="none" stroke="#c9ced6" stroke-width="6"/><path d="M8 40 A32 32 0 0 1 72 40" fill="none" stroke="${n >= 5 ? '#138a3c' : '#f4c430'}" stroke-width="6" pathLength="5" stroke-dasharray="${n} 5"/><line x1="40" y1="40" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#d0021b" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="40" r="4" fill="#1c1c1c"/>`, 80, 46); },
  pumpkin: (glow, sad, w) => svg('0 0 40 40', `${glow ? '<circle cx="20" cy="22" r="19" fill="#ffd27a" opacity=".5"/>' : ''}<path d="M19 4 Q22 1 24 3 L22 9 Z" fill="#3f7a3a"/><ellipse cx="13" cy="23" rx="9" ry="13" fill="${sad ? '#a77a4e' : '#ff7a1a'}"/><ellipse cx="27" cy="23" rx="9" ry="13" fill="${sad ? '#a77a4e' : '#ff7a1a'}"/><ellipse cx="20" cy="23" rx="9" ry="14" fill="${sad ? '#b88b5e' : '#ff8c2e'}"/>${glow && w ? '<path d="M13 19 L16 23 L10 23Z M27 19 L30 23 L24 23Z M13 29 Q20 34 27 29 Q20 31 13 29Z" fill="#ffe08a"/>' : ''}`, w, w),
  slime: () => svg('0 0 120 30', `<path d="M0 0 H120 V8 C112 8 112 22 106 22 C100 22 102 8 92 8 C84 8 86 14 80 14 C74 14 76 8 66 8 C58 8 60 26 52 26 C44 26 46 8 36 8 C28 8 30 16 24 16 C18 16 20 8 10 8 C4 8 6 18 0 14 Z" fill="#7be04a"/>`),
  bat: () => svg('0 0 60 30', `<path d="M30 10 C27 6 24 8 22 12 C18 6 10 4 2 8 C8 10 10 16 10 20 C14 16 20 18 22 22 C25 18 28 18 30 24 C32 18 35 18 38 22 C40 18 46 16 50 20 C50 16 52 10 58 8 C50 4 42 6 38 12 C36 8 33 6 30 10Z" fill="#120818"/><circle cx="28" cy="13" r="1" fill="#ffb347"/><circle cx="32" cy="13" r="1" fill="#ffb347"/>`),
  icicles: () => svg('0 0 60 24', `<path d="M0 0 H60 L56 4 L52 20 L48 4 L42 3 L38 14 L34 3 L28 4 L24 24 L20 4 L14 3 L10 12 L6 3 Z" fill="#cfe8fb" stroke="#9ccbee" stroke-width="1"/>`),
  crack: () => svg('0 0 300 60', `<path d="M40 0 L52 22 L44 34 L60 60 M52 22 L78 28 M200 0 L190 18 L206 30 L196 60 M206 30 L230 26" stroke="#7fa8d0" stroke-width="2" fill="none"/>`),
  snowman: (n) => svg('0 0 46 56', `${n >= 1 ? '<circle cx="23" cy="44" r="11" fill="#fff" stroke="#9ccbee" stroke-width="1.5"/>' : '<circle cx="23" cy="44" r="11" fill="none" stroke="#9ccbee" stroke-dasharray="3 3"/>'}${n >= 2 ? '<circle cx="23" cy="27" r="8" fill="#fff" stroke="#9ccbee" stroke-width="1.5"/><circle cx="23" cy="25" r="1.2" fill="#1f4f7a"/><circle cx="23" cy="29" r="1.2" fill="#1f4f7a"/>' : ''}${n >= 3 ? '<circle cx="23" cy="14" r="6" fill="#fff" stroke="#9ccbee" stroke-width="1.5"/><circle cx="21" cy="13" r="1" fill="#1f2a36"/><circle cx="25" cy="13" r="1" fill="#1f2a36"/>' : ''}${n >= 4 ? '<path d="M23 15 L31 17 L23 17Z" fill="#ff8c2e"/>' : ''}${n >= 5 ? '<rect x="17" y="3" width="12" height="5" rx="1" fill="#d62839"/><rect x="15" y="7" width="16" height="2.5" rx="1" fill="#b51d2e"/>' : ''}`, 46, 56),
  frostCorner: () => svg('0 0 80 80', `<g stroke="#bcd9f0" stroke-width="1.5" fill="none"><path d="M0 0 L40 40 M10 0 L40 30 M0 10 L30 40 M20 4 L26 14 M4 20 L14 26"/></g>`),
  maple: (c) => svg('0 0 40 40', `<path d="${LEAF}" fill="${c}"/><path d="M20 38 V22" stroke="#6b3a12" stroke-width="1.5"/>`),
  leafPattern: () => svg('0 0 120 120', `<g transform="translate(10 12) scale(.5) rotate(-20 20 20)"><path d="${LEAF}" fill="#ffb347"/></g><g transform="translate(70 60) scale(.45) rotate(30 20 20)"><path d="${LEAF}" fill="#e85d2a"/></g><g transform="translate(30 80) scale(.35)"><path d="${LEAF}" fill="#ffd166"/></g>`),
  apples: (n) => svg('0 0 112 22', Array.from({ length: 5 }, (_, i) => `<g transform="translate(${2 + i * 22} 2)"><circle cx="9" cy="11" r="8" fill="${i < n ? '#d62839' : '#9bbf6a'}"/><path d="M9 3 Q10 0 12 0" stroke="#6b3a12" stroke-width="1.5" fill="none"/><ellipse cx="13" cy="3" rx="3" ry="1.5" fill="#5a9e3a"/></g>`).join(''), 112, 22),
  bricks: (n) => svg('0 0 50 56', Array.from({ length: n }, (_, i) => { const c = ['#ffadad', '#a0c4ff', '#fdffb6', '#caffbf', '#cdb4db'][i]; const y = 46 - i * 10; return `<rect x="5" y="${y}" width="40" height="9" rx="2" fill="${c}" stroke="rgba(0,0,0,.25)"/><rect x="11" y="${y - 3}" width="7" height="3" rx="1" fill="${c}" stroke="rgba(0,0,0,.25)"/><rect x="32" y="${y - 3}" width="7" height="3" rx="1" fill="${c}" stroke="rgba(0,0,0,.25)"/>`; }).join(''), 50, 56),
  snow: () => svg('0 0 24 24', `<g stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7"/><path d="M9 4 L12 6.5 L15 4 M9 20 L12 17.5 L15 20"/></g>`),
  starP: (c) => svg('0 0 40 40', `<polygon points="${STAR}" fill="${c}"/>`),
  petal: (c) => svg('0 0 20 30', `<path d="M10 0 Q20 12 10 30 Q0 12 10 0Z" fill="${c}"/>`),
  dot: (c) => svg('0 0 10 10', `<circle cx="5" cy="5" r="5" fill="${c}"/>`),
  drop: () => svg('0 0 12 18', `<path d="M6 0 Q12 10 6 18 Q0 10 6 0Z" fill="#7cc4f2"/>`),
  check: () => svg('0 0 60 50', `<path d="M6 26 L22 42 L54 6" stroke="#d0021b" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".5s" fill="freeze"/></path>`),
  whistle: () => svg('0 0 40 30', `<path d="M4 12 H22 A10 10 0 1 1 12 22 H4 Z" fill="#c9ced6" stroke="#5a6270" stroke-width="2"/><circle cx="22" cy="20" r="4" fill="#5a6270"/>`),
  coin: () => svg('0 0 16 16', `<rect x="5" y="1" width="6" height="14" fill="#f8b800"/><rect x="3" y="3" width="10" height="10" fill="#f8b800"/><rect x="7" y="4" width="2" height="8" fill="#fce0a8"/><rect x="5" y="1" width="6" height="1" fill="#000" opacity=".3"/>`),
  pixHeart: (on) => svg('0 0 14 12', `<g fill="${on ? '#d82800' : '#7c7c7c'}"><rect x="1" y="1" width="4" height="2"/><rect x="9" y="1" width="4" height="2"/><rect x="0" y="3" width="14" height="4"/><rect x="1" y="7" width="12" height="2"/><rect x="3" y="9" width="8" height="1"/><rect x="5" y="10" width="4" height="1"/><rect x="6" y="11" width="2" height="1"/></g>${on ? '<rect x="2" y="3" width="2" height="2" fill="#fff"/>' : ''}`, 18, 16),
  stampStar: (on) => svg('0 0 40 40', `<polygon points="${STAR}" fill="${on ? '#c8102e' : 'none'}" stroke="#1a1a1a" stroke-width="2"/>`, 20, 20),
  jack: (on) => ART.pumpkin(on, !on, 22),
  journal: (n) => svg('0 0 120 26', `<rect x="1" y="1" width="118" height="24" fill="#fff" stroke="#b9cde6"/>${Array.from({ length: 5 }, (_, i) => `<line x1="${1 + (i + 1) * 23.6}" y1="1" x2="${1 + (i + 1) * 23.6}" y2="25" stroke="#b9cde6"/>${i < n ? `<text x="${13 + i * 23.6}" y="20" font-family="Caveat, cursive" font-size="20" font-weight="700" fill="#d0021b" text-anchor="middle">5</text>` : ''}`).join('')}`, 120, 26),
  /* GYM */
  plate: (rim, glow, broken) => svg('0 0 40 40', `${glow ? `<circle cx="20" cy="20" r="19.8" fill="${glow}" opacity=".45"/>` : ''}<circle cx="20" cy="20" r="18" fill="${rim}"/><circle cx="20" cy="20" r="17.2" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.4"/><circle cx="20" cy="20" r="12" fill="#1b1c1f"/><circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,255,255,.2)"/>${broken ? '<path d="M9 5 L15 14 L11 20 L18 27 L15 37" stroke="#111" stroke-width="2.4" fill="none"/>' : ''}`),
  dumbbell: () => svg('0 0 80 30', `<rect x="10" y="13" width="60" height="4" rx="2" fill="#b9bec6"/><rect x="3" y="3" width="9" height="24" rx="2" fill="#c6ff00"/><rect x="13" y="6.5" width="6" height="17" rx="2" fill="#2d3035" stroke="#c6ff00" stroke-width="1.5"/><rect x="68" y="3" width="9" height="24" rx="2" fill="#c6ff00"/><rect x="61" y="6.5" width="6" height="17" rx="2" fill="#2d3035" stroke="#c6ff00" stroke-width="1.5"/>`),
  barbell: (n) => { const cols = ['#d62828', '#1d5fbf', '#f4c430', '#2a9d55', '#e8e8e8']; let p = ''; for (let i = 0; i < n; i++) { const h = 30 - i * 4, y = 20 - h / 2; p += `<rect x="${30 - i * 7}" y="${y}" width="6" height="${h}" rx="1.5" fill="${cols[i]}" stroke="#000" stroke-opacity=".45"/><rect x="${84 + i * 7}" y="${y}" width="6" height="${h}" rx="1.5" fill="${cols[i]}" stroke="#000" stroke-opacity=".45"/>`; } return svg('0 0 120 40', `<rect x="1" y="18" width="118" height="4" rx="2" fill="#b9bec6"/><rect x="36" y="14.5" width="3" height="11" fill="#8a9099"/><rect x="81" y="14.5" width="3" height="11" fill="#8a9099"/>${p}`, 120, 40); },
  /* Котики */
  paw: (c, extra = '') => svg('0 0 40 40', `<ellipse cx="20" cy="25" rx="11.5" ry="10" fill="${c}"/><ellipse cx="7.5" cy="13" rx="3.7" ry="4.7" fill="${c}" transform="rotate(-20 7.5 13)"/><ellipse cx="15.5" cy="6.5" rx="3.7" ry="4.7" fill="${c}"/><ellipse cx="24.5" cy="6.5" rx="3.7" ry="4.7" fill="${c}"/><ellipse cx="32.5" cy="13" rx="3.7" ry="4.7" fill="${c}" transform="rotate(20 32.5 13)"/>${extra}`),
  catEar: () => svg('0 0 62 52', `<path d="M3 52 L14 5 Q16 0 21 3 L60 44 L60 52 Z" fill="#fffaf5"/><path d="M3 52 L14 5 Q16 0 21 3 L60 44" fill="none" stroke="#4a3b3b" stroke-width="3" stroke-linejoin="round"/><path d="M17 42 L20 15 L45 40 Z" fill="#ffb3c1"/>`),
  scratch: () => svg('0 0 64 44', `<g stroke="#d94f4f" stroke-width="3" stroke-linecap="round" opacity=".75"><path d="M8 4 L26 40"/><path d="M22 2 L40 40"/><path d="M36 4 L54 40"/></g>`),
  pawPattern: () => svg('0 0 90 90', `<g transform="translate(8 10) scale(.45)" opacity=".9">${'<ellipse cx="20" cy="25" rx="11.5" ry="10" fill="#f6c9ae"/><ellipse cx="8" cy="13" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="15.5" cy="6.5" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="24.5" cy="6.5" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="32" cy="13" rx="3.7" ry="4.7" fill="#f6c9ae"/>'}</g><g transform="translate(52 50) scale(.4) rotate(25 20 20)">${'<ellipse cx="20" cy="25" rx="11.5" ry="10" fill="#f6c9ae"/><ellipse cx="8" cy="13" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="15.5" cy="6.5" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="24.5" cy="6.5" rx="3.7" ry="4.7" fill="#f6c9ae"/><ellipse cx="32" cy="13" rx="3.7" ry="4.7" fill="#f6c9ae"/>'}</g>`),
  fishS: (on) => svg('0 0 30 18', `<ellipse cx="12" cy="9" rx="10" ry="6.5" fill="${on ? '#4dabf7' : '#e7d6cc'}"/><path d="M20 9 L29 2 L29 16 Z" fill="${on ? '#339af0' : '#dccabe'}"/>${on ? '<circle cx="7" cy="7.5" r="1.4" fill="#1c2430"/>' : ''}`, 30, 18),
  /* Футбол */
  soccer: (glow) => svg('0 0 40 40', `${glow ? `<circle cx="20" cy="20" r="19.8" fill="${glow}" opacity=".6"/>` : ''}<circle cx="20" cy="20" r="17" fill="#fff" stroke="#1b1b1b" stroke-width="1.6"/>${[0, 1, 2, 3, 4].map((k) => { const a = ((-90 + k * 72) * Math.PI) / 180; return `<polygon points="${pent(20 + Math.cos(a) * 14.2, 20 + Math.sin(a) * 14.2, 3.3, -90 + k * 72 + 180)}" fill="#1b1b1b"/>`; }).join('')}`),
  soccerS: (on) => on ? svg('0 0 40 40', `<circle cx="20" cy="20" r="17" fill="#fff" stroke="#1b1b1b" stroke-width="2"/><polygon points="${pent(20, 20, 6)}" fill="#1b1b1b"/>${[0, 1, 2, 3, 4].map((k) => { const a = ((-90 + k * 72) * Math.PI) / 180; return `<polygon points="${pent(20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14, 3.6, -90 + k * 72 + 180)}" fill="#1b1b1b"/>`; }).join('')}`, 20, 20) : svg('0 0 40 40', '<circle cx="20" cy="20" r="16" fill="none" stroke="#9fbf9f" stroke-width="3" stroke-dasharray="5 4"/>', 20, 20),
  ycard: () => svg('0 0 26 36', '<rect x="1" y="1" width="24" height="34" rx="3" fill="#ffd400" stroke="#b38f00" stroke-width="1.5"/><rect x="4" y="4" width="7" height="28" rx="2" fill="#fff" opacity=".35"/>'),
  net: () => svg('0 0 12 12', '<path d="M0 0 L12 12 M12 0 L0 12" stroke="#c9d6c9" stroke-width="1"/>'),
  /* Кино */
  perf: () => svg('0 0 22 22', '<rect width="22" height="22" fill="#000"/><rect x="6" y="5" width="10" height="12" rx="2" fill="#f2efe8"/>'),
  film: (n) => svg('0 0 130 30', `<rect width="130" height="30" fill="#111"/>${Array.from({ length: 13 }, (_, i) => `<rect x="${3 + i * 10}" y="2" width="5" height="3" rx="1" fill="#eee"/><rect x="${3 + i * 10}" y="25" width="5" height="3" rx="1" fill="#eee"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<rect x="${3 + i * 25.4}" y="7" width="22" height="16" rx="1.5" fill="${i < n ? '#e0b84a' : '#2b2b2b'}"/>${i < n ? `<g transform="translate(${7 + i * 25.4} 8) scale(.35)"><polygon points="${STAR}" fill="#fff8d6"/></g>` : ''}`).join('')}`, 130, 30),
  clapper: () => svg('0 0 40 34', '<rect x="2" y="12" width="36" height="20" rx="2" fill="#1c1c1c"/><path d="M2 12 L36 4 L38 10 L4 18 Z" fill="#fff"/><path d="M8 10.6 L12 16.6 M16 8.7 L20 14.7 M24 6.8 L28 12.8 M32 4.9 L36 10.9" stroke="#1c1c1c" stroke-width="3"/><rect x="6" y="20" width="28" height="2" fill="#fff" opacity=".6"/><rect x="6" y="25" width="18" height="2" fill="#fff" opacity=".6"/>'),
  /* Комикс */
  burst: (fill, stroke = '#111') => svg('0 0 40 40', `<polygon points="${burstPts(20, 20, 19, 13, 11)}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`),
  burstS: (on) => svg('0 0 40 40', `<polygon points="${burstPts(20, 20, 19, 12, 10)}" fill="${on ? '#ffd43b' : '#f1f3f5'}" stroke="${on ? '#111' : '#adb5bd'}" stroke-width="2.5" stroke-linejoin="round"/>`, 22, 22),
  powShape: (fill) => svg('0 0 120 84', `<polygon points="${Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; const r = i % 2 ? 0.7 : 1; return `${(60 + Math.cos(a) * 58 * r).toFixed(1)},${(42 + Math.sin(a) * 40 * r).toFixed(1)}`; }).join(' ')}" fill="${fill}" stroke="#111" stroke-width="3" stroke-linejoin="round"/>`),
  /* Хакер */
  codeRain: () => svg('0 0 120 240', Array.from({ length: 6 }, (_, c) => Array.from({ length: 12 }, (_, r) => `<text x="${6 + c * 20}" y="${16 + r * 20}" font-family="monospace" font-size="13" fill="#2bff6b" opacity="${((c * 7 + r * 3) % 10) / 14 + 0.05}">${(c * 3 + r * 5) % 3 ? '1' : '0'}</text>`).join('')).join('')),
  /* Граффити */
  brickWall: () => svg('0 0 64 40', '<rect width="64" height="40" fill="#6e3122"/><rect x="1" y="1" width="30" height="18" rx="1.5" fill="#a8553c"/><rect x="33" y="1" width="30" height="18" rx="1.5" fill="#9c4a33"/><rect x="-15" y="21" width="30" height="18" rx="1.5" fill="#9c4a33"/><rect x="17" y="21" width="30" height="18" rx="1.5" fill="#b05e44"/><rect x="49" y="21" width="30" height="18" rx="1.5" fill="#a8553c"/>'),
  tag: () => svg('0 0 96 44', '<path d="M10 30 L16 10 L26 22 L34 6 L42 22 L52 10 L58 30 Z" fill="#ffd60a" stroke="#111" stroke-width="3" stroke-linejoin="round"/><path d="M6 38 Q20 30 34 38 T62 36 T90 30" stroke="#ff2e93" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M66 14 Q74 4 82 14 Q90 24 80 28" stroke="#00a3e0" stroke-width="4" fill="none" stroke-linecap="round"/>'),
  splat: (c) => svg('0 0 40 40', `<path d="M20 4 C24 4 24 11 28 10 C33 8 36 13 32 17 C29 20 36 22 33 27 C30 31 26 27 24 32 C22 37 16 36 16 31 C16 27 9 31 7 26 C5 21 11 20 9 15 C7 10 13 7 15 10 C17 13 16 4 20 4Z" fill="${c}"/><circle cx="36" cy="6" r="2.5" fill="${c}"/><circle cx="5" cy="34" r="2" fill="${c}"/>`),
  drip: (c) => svg('0 0 10 22', `<path d="M3 0 H7 V14 Q10 19 5 22 Q0 19 3 14 Z" fill="${c}"/>`),
  /* Пираты */
  wheel: (c, broken) => svg('0 0 40 40', `${Array.from({ length: 8 }, (_, i) => { if (broken && (i === 1 || i === 4)) return ''; const a = (i / 8) * Math.PI * 2; return `<line x1="20" y1="20" x2="${(20 + Math.cos(a) * 18).toFixed(1)}" y2="${(20 + Math.sin(a) * 18).toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="${(20 + Math.cos(a) * 18).toFixed(1)}" cy="${(20 + Math.sin(a) * 18).toFixed(1)}" r="2.2" fill="${c}"/>`; }).join('')}<circle cx="20" cy="20" r="13" fill="none" stroke="${c}" stroke-width="3"/><circle cx="20" cy="20" r="9.5" fill="#3a2a1a" stroke="${c}" stroke-width="2"/>`),
  doubloon: () => svg('0 0 40 40', `<circle cx="20" cy="20" r="19.5" fill="#ffe066" opacity=".55"/><circle cx="20" cy="20" r="17" fill="#f2c94c" stroke="#b8860b" stroke-width="2"/>${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<circle cx="${(20 + Math.cos(a) * 14.5).toFixed(1)}" cy="${(20 + Math.sin(a) * 14.5).toFixed(1)}" r="1" fill="#b8860b"/>`; }).join('')}<circle cx="20" cy="20" r="10" fill="#6b4a00"/>`),
  goldCoin: () => svg('0 0 20 20', '<circle cx="10" cy="10" r="9" fill="#f2c94c" stroke="#b8860b" stroke-width="1.5"/><circle cx="10" cy="10" r="5" fill="none" stroke="#b8860b"/>'),
  xmark: () => svg('0 0 34 34', '<path d="M6 6 L28 28 M28 6 L6 28" stroke="#c1121f" stroke-width="5" stroke-linecap="round"/>'),
  waves: () => svg('0 0 80 26', '<path d="M0 14 Q10 6 20 14 T40 14 T60 14 T80 14" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/>'),
  anchor: () => svg('0 0 30 30', '<circle cx="15" cy="5" r="3.2" fill="none" stroke="#1d3f63" stroke-width="2.4"/><path d="M15 8 V27 M9 13 H21 M5 19 Q7 27 15 27 Q23 27 25 19" stroke="#1d3f63" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
  chest: (n) => svg('0 0 70 46', `${Array.from({ length: n }, (_, i) => `<circle cx="${18 + i * 8.5}" cy="${16 - (i % 2) * 4}" r="5" fill="#f2c94c" stroke="#b8860b" stroke-width="1.2"/>`).join('')}<path d="M10 20 Q35 ${n >= 5 ? 8 : 12} 60 20 L60 24 L10 24 Z" fill="${n >= 5 ? '#f2c94c' : '#6b4423'}"/><rect x="10" y="22" width="50" height="22" rx="2" fill="#8b5a2b" stroke="#4f3014" stroke-width="2"/><rect x="10" y="29" width="50" height="4" fill="#b8860b"/><rect x="31" y="27" width="8" height="9" rx="1.5" fill="#f2c94c" stroke="#4f3014"/>`, 70, 46),
  /* Динозавры */
  egg: (spot, cracked) => svg('0 0 40 40', `<ellipse cx="20" cy="21.5" rx="13" ry="16.5" fill="#f4eedf" stroke="#8d8371" stroke-width="1.5"/><circle cx="12.5" cy="15" r="2.6" fill="${spot}"/><circle cx="28" cy="26" r="3.2" fill="${spot}"/><circle cx="25.5" cy="11" r="1.8" fill="${spot}"/><circle cx="12" cy="30" r="2" fill="${spot}"/>${cracked ? '<path d="M8 22 L13 18 L17 23 L22 17 L26 22 L32 19" stroke="#5d5444" stroke-width="1.8" fill="none"/>' : ''}`),
  eggHatch: () => svg('0 0 40 40', '<circle cx="20" cy="22" r="19" fill="#b7e4a4" opacity=".6"/><ellipse cx="20" cy="10" rx="8.5" ry="8" fill="#7cb342"/><circle cx="17" cy="8" r="1.6" fill="#1c2430"/><circle cx="23" cy="8" r="1.6" fill="#1c2430"/><path d="M17 13 Q20 15 23 13" stroke="#1c2430" stroke-width="1.2" fill="none"/><path d="M7 20 L11 15 L15 20 L20 14 L25 20 L29 15 L33 20 L33 26 Q33 38 20 38 Q7 38 7 26 Z" fill="#f4eedf" stroke="#8d8371" stroke-width="1.5"/>'),
  eggStage: (n) => svg('0 0 46 50', n >= 5 ? '<ellipse cx="23" cy="13" rx="10" ry="9" fill="#7cb342"/><circle cx="19.5" cy="11" r="1.8" fill="#1c2430"/><circle cx="26.5" cy="11" r="1.8" fill="#1c2430"/><path d="M19 17 Q23 19.5 27 17" stroke="#1c2430" stroke-width="1.4" fill="none"/><path d="M8 26 L13 20 L18 26 L23 19 L28 26 L33 20 L38 26 L38 33 Q38 48 23 48 Q8 48 8 33 Z" fill="#f4eedf" stroke="#8d8371" stroke-width="1.5"/>' : `<ellipse cx="23" cy="28" rx="15" ry="19" fill="#f4eedf" stroke="#8d8371" stroke-width="1.5"/><circle cx="15" cy="20" r="2.6" fill="#7cb342"/><circle cx="31" cy="33" r="3.2" fill="#7cb342"/><circle cx="28" cy="16" r="1.8" fill="#7cb342"/>${['M14 30 L18 26 L22 31', 'M22 31 L26 25 L30 30', 'M18 12 L22 16 L20 21', 'M30 30 L34 26'].slice(0, n).map((d) => `<path d="${d}" stroke="#5d5444" stroke-width="1.8" fill="none"/>`).join('')}`, 46, 50),
  volcano: () => svg('0 0 160 110', '<path d="M20 110 L70 30 L92 30 L150 110 Z" fill="#7a5a44"/><path d="M70 30 L92 30 L86 40 L80 34 L74 42 Z" fill="#ff7b2e"/><g fill="#9e8e80" opacity=".8"><circle cx="82" cy="20" r="8"/><circle cx="92" cy="12" r="6"/><circle cx="100" cy="6" r="4"/></g>'),
  fern: () => svg('0 0 20 30', '<path d="M10 30 V2" stroke="#3f7a2a" stroke-width="1.6"/><g fill="#5f8f45"><ellipse cx="6" cy="8" rx="4" ry="2" transform="rotate(-30 6 8)"/><ellipse cx="14" cy="8" rx="4" ry="2" transform="rotate(30 14 8)"/><ellipse cx="5.5" cy="15" rx="4.5" ry="2" transform="rotate(-30 5.5 15)"/><ellipse cx="14.5" cy="15" rx="4.5" ry="2" transform="rotate(30 14.5 15)"/><ellipse cx="5" cy="22" rx="5" ry="2.2" transform="rotate(-30 5 22)"/><ellipse cx="15" cy="22" rx="5" ry="2.2" transform="rotate(30 15 22)"/></g>'),
  meteor: () => svg('0 0 44 44', '<path d="M44 0 L22 18 L26 22 Z" fill="#ffb347" opacity=".8"/><path d="M40 2 L18 22 L24 26 Z" fill="#ff7b2e" opacity=".8"/><circle cx="14" cy="30" r="11" fill="#6d5a4e" stroke="#3b2f28" stroke-width="2"/><circle cx="10" cy="27" r="2.5" fill="#4e4038"/><circle cx="17" cy="34" r="2" fill="#4e4038"/>'),
  dinoHead: () => svg('0 0 30 26', '<ellipse cx="15" cy="13" rx="12" ry="10" fill="#7cb342"/><circle cx="11" cy="10" r="1.8" fill="#1c2430"/><circle cx="19" cy="10" r="1.8" fill="#1c2430"/><path d="M9 17 Q15 21 21 17" stroke="#1c2430" stroke-width="1.6" fill="none"/><path d="M6 6 L8 2 L10 5 M20 5 L22 1 L24 6" stroke="#5f8f45" stroke-width="2" fill="none"/>'),
  /* Гжель */
  rose: (gold, pale) => { const c = pale ? '#a9b4c7' : '#1f4fa0'; return svg('0 0 40 40', `${gold ? `<circle cx="20" cy="20" r="19.6" fill="${gold}" opacity=".55"/>` : ''}<circle cx="20" cy="20" r="17" fill="${c}"/>${Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return `<path d="M${(20 + Math.cos(a) * 9).toFixed(1)} ${(20 + Math.sin(a) * 9).toFixed(1)} Q${(20 + Math.cos(a + 0.5) * 17).toFixed(1)} ${(20 + Math.sin(a + 0.5) * 17).toFixed(1)} ${(20 + Math.cos(a + 1) * 14).toFixed(1)} ${(20 + Math.sin(a + 1) * 14).toFixed(1)}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".85"/>`; }).join('')}<circle cx="20" cy="20" r="9" fill="${pale ? '#7d8aa3' : '#12306b'}"/>`); },
  swirl: () => svg('0 0 64 40', '<g stroke="#1f4fa0" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M4 36 Q4 6 30 6 Q46 6 46 18 Q46 28 36 28 Q28 28 28 20"/><path d="M14 36 Q16 18 32 16"/></g><circle cx="52" cy="10" r="5" fill="#1f4fa0"/><circle cx="52" cy="10" r="2" fill="#fff"/><g fill="#1f4fa0"><ellipse cx="22" cy="14" rx="4" ry="2" transform="rotate(-40 22 14)"/><ellipse cx="40" cy="36" rx="4" ry="2" transform="rotate(20 40 36)"/></g>'),
  crack2: () => svg('0 0 300 60', '<path d="M60 0 L72 20 L64 32 L80 60 M72 20 L98 26 M210 0 L200 18 L216 30 L206 60" stroke="#8a3b3b" stroke-width="1.6" fill="none"/>'),
  gzhelPattern: () => svg('0 0 70 70', `<g transform="translate(18 18)" fill="#1f4fa0">${Array.from({ length: 4 }, (_, i) => `<ellipse cx="0" cy="-6" rx="3" ry="6" transform="rotate(${i * 90})"/>`).join('')}<circle r="2.4" fill="#fff"/></g><circle cx="52" cy="50" r="2.5" fill="#1f4fa0"/><circle cx="58" cy="44" r="1.6" fill="#1f4fa0"/><circle cx="46" cy="56" r="1.6" fill="#1f4fa0"/>`),
  matryoshkas: (n) => { let x = 2, out = ''; for (let i = 0; i < 5; i++) { const s = 0.55 + i * 0.12; const w = 18 * s, h = 34 * s; const on = i < n; out += `<g transform="translate(${x.toFixed(1)} ${(40 - h).toFixed(1)}) scale(${s.toFixed(2)})"><path d="M9 0 C14 0 16 4 16 8 C18 12 18 26 16 30 Q9 35 2 30 C0 26 0 12 2 8 C2 4 4 0 9 0Z" fill="${on ? '#1f4fa0' : 'none'}" stroke="${on ? '#12306b' : '#b8c4dc'}" stroke-width="1.5"/><circle cx="9" cy="9" r="5" fill="#fff" stroke="${on ? '#12306b' : '#b8c4dc'}"/>${on ? '<circle cx="7.5" cy="8.5" r=".8" fill="#12306b"/><circle cx="10.5" cy="8.5" r=".8" fill="#12306b"/><circle cx="9" cy="22" r="3.2" fill="#fff"/>' : ''}</g>`; x += w + 4; } return svg('0 0 120 40', out, 120, 40); },
  /* Сакура */
  blossomPattern: () => svg('0 0 120 120', `<g fill="#ffb7c5" opacity=".9"><path d="M20 20 Q26 10 20 4 Q14 10 20 20Z" transform="rotate(30 20 12)"/><path d="M80 60 Q85 52 80 46 Q75 52 80 60Z" transform="rotate(-40 80 53)"/><path d="M50 100 Q54 94 50 89 Q46 94 50 100Z" transform="rotate(70 50 94)"/></g><g fill="#ffd1dc"><path d="M100 18 Q104 12 100 8 Q96 12 100 18Z" transform="rotate(10 100 13)"/></g>`),
  branch: (n) => svg('0 0 120 36', `<path d="M2 30 Q40 22 70 18 Q96 14 118 6" stroke="#5a3a28" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M50 22 Q56 30 64 30" stroke="#5a3a28" stroke-width="2" fill="none"/>${[[22, 24], [44, 19], [66, 30], [86, 13], [108, 8]].map(([x, y], i) => i < n ? `<g transform="translate(${x} ${y})">${Array.from({ length: 5 }, (_, k) => `<ellipse cx="0" cy="-4.5" rx="3.2" ry="4.6" fill="#ffb7c5" transform="rotate(${k * 72})"/>`).join('')}<circle r="2" fill="#e05a7a"/></g>` : `<circle cx="${x}" cy="${y}" r="2.6" fill="#c98a9a"/>`).join('')}`, 120, 36),
  /* Оригами */
  crane: (on) => svg('0 0 30 24', `<path d="M2 14 L12 12 L15 2 L18 12 L28 9 L20 16 L15 22 L10 16 Z" fill="${on ? '#ff8c69' : 'none'}" stroke="${on ? '#c4562f' : '#bfb6a5'}" stroke-width="1.4" stroke-linejoin="round"/>${on ? '<path d="M15 2 L15 22" stroke="#c4562f" stroke-width="1"/>' : ''}`, 26, 21),
  plane: () => svg('0 0 40 30', '<path d="M2 16 L38 2 L22 28 L18 19 Z" fill="#fff" stroke="#6d6658" stroke-width="1.6" stroke-linejoin="round"/><path d="M18 19 L38 2" stroke="#6d6658" stroke-width="1.4"/><path d="M18 19 L16 26 L22 28" fill="#e4dccb" stroke="#6d6658" stroke-width="1.2"/>'),
  paperBall: () => svg('0 0 30 30', '<path d="M8 5 L19 3 L27 10 L26 21 L18 27 L7 25 L3 15 Z" fill="#f2e6e8" stroke="#b0475b" stroke-width="1.5"/><path d="M8 5 L13 14 L27 10 M13 14 L7 25 M13 14 L18 27 M13 14 L3 15" stroke="#b0475b" stroke-width="1" fill="none"/>'),
  /* Детектив */
  paperclip: () => svg('0 0 14 32', '<path d="M4 8 V24 Q4 29 7 29 Q10 29 10 24 V6 Q10 2 7 2 Q4 2 4 6" stroke="#8a8f99" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  magnifier: (lens, ring = '#3a3a3a') => svg('0 0 40 40', `<line x1="27" y1="27" x2="37" y2="37" stroke="#5a4520" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="18" r="13" fill="${lens}" stroke="${ring}" stroke-width="3"/><path d="M10 13 Q12 9 16 8" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>`),
  cork: (n) => { const pts = [[12, 16], [36, 8], [60, 18], [84, 9], [108, 17]]; return svg('0 0 120 28', `<rect width="120" height="28" rx="3" fill="#c49a6c"/><g fill="#a97f52">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 37) % 118 + 1}" cy="${(i * 13) % 26 + 1}" r="1"/>`).join('')}</g>${n >= 2 ? `<polyline points="${pts.slice(0, n).map((p) => p.join(',')).join(' ')}" fill="none" stroke="#c1121f" stroke-width="1.6"/>` : ''}${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${i < n ? '#c1121f' : '#8a6a4a'}" stroke="#4a2a1a" stroke-width="1"/>`).join('')}`, 120, 28); },
  /* Подводный мир */
  fish: (c, glow) => svg('0 0 40 40', `${glow ? '<circle cx="20" cy="20" r="19.6" fill="#ffe066" opacity=".6"/>' : ''}<path d="M27 20 L39 10 L39 30 Z" fill="${c}"/><ellipse cx="16" cy="20" rx="14" ry="11" fill="${c}"/><path d="M22 10 Q26 14 25 20" stroke="#fff" stroke-width="1.4" fill="none" opacity=".5"/><circle cx="25" cy="17" r="2" fill="#fff"/><circle cx="25.4" cy="17" r="1" fill="#111"/>`),
  puffer: () => svg('0 0 40 40', `<circle cx="20" cy="21" r="13" fill="#e0b84a"/>${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${(20 + Math.cos(a) * 12).toFixed(1)}" y1="${(21 + Math.sin(a) * 12).toFixed(1)}" x2="${(20 + Math.cos(a) * 18).toFixed(1)}" y2="${(21 + Math.sin(a) * 18).toFixed(1)}" stroke="#a8862c" stroke-width="2" stroke-linecap="round"/>`; }).join('')}<circle cx="15" cy="17" r="2.2" fill="#fff"/><circle cx="15" cy="17" r="1.1" fill="#111"/><circle cx="25" cy="17" r="2.2" fill="#fff"/><circle cx="25" cy="17" r="1.1" fill="#111"/><ellipse cx="20" cy="26" rx="3" ry="2" fill="#7a5a10"/>`),
  bubbleRing: () => svg('0 0 20 20', '<circle cx="10" cy="10" r="8" fill="rgba(255,255,255,.15)" stroke="#bfe9ff" stroke-width="1.6"/><circle cx="7" cy="7" r="2" fill="#fff" opacity=".7"/>'),
  bubblePattern: () => svg('0 0 120 240', [[20, 30, 5], [80, 70, 3], [50, 120, 7], [100, 160, 4], [30, 200, 3], [70, 220, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="rgba(220,245,255,.55)" stroke-width="1.4"/>`).join('')),
  aquarium: (n) => svg('0 0 76 42', `<rect x="2" y="4" width="72" height="36" rx="4" fill="#d6f0ff" stroke="#4a90b8" stroke-width="2"/><rect x="4" y="10" width="68" height="28" rx="2" fill="#7cc4f2" opacity=".6"/><path d="M4 34 Q20 30 38 34 T72 33 V38 H4 Z" fill="#e8d3a3"/>${[[14, 18, '#e8590c'], [34, 26, '#7048e8'], [54, 16, '#1c7ed6'], [24, 30, '#f59f00'], [60, 28, '#e64980']].slice(0, n).map(([x, y, c]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="5" ry="3.4" fill="${c}"/><path d="M4 0 L8 -3 L8 3 Z" fill="${c}"/><circle cx="-2" cy="-.8" r=".8" fill="#fff"/></g>`).join('')}`, 76, 42),
};

export interface StreakLook {
  /** Картинка серии по числу верных ответов подряд. */
  art: (n: number) => string;
  label: (n: number) => string;
}

/** Серия верных ответов: картинка и подпись (длина серии — в каталоге). */
export const STREAK: Record<string, StreakLook> = {
  newyear: { art: (n) => ['#e63946', '#ffc300', '#3a86ff', '#2ec4b6', '#ff70a6'].map((c, i) => ART.bulb(i < n, c)).join(''), label: (n) => (n >= 5 ? 'Гирлянда горит!' : 'Зажги гирлянду') },
  valentine: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.heartS(i < n ? '#e63973' : '#f2c6d4')).join(''), label: (n) => (n >= 5 ? 'Любовь к ПДД взаимна' : 'Собери сердечки') },
  feb23: { art: (n) => ART.epaulette(n), label: (n) => ['Рядовой', 'Мл. лейтенант', 'Лейтенант', 'Ст. лейтенант', 'Капитан!'][n] },
  maslenitsa: { art: (n) => ART.blinStack(n), label: (n) => (n >= 5 ? 'Стопка блинов с маслом!' : 'Испеки стопку блинов') },
  mar8: { art: (n) => ART.bouquet(n), label: (n) => (n >= 5 ? 'Букет готов!' : 'Собери букет') },
  cosmos: { art: (n) => ART.fuel(n), label: (n) => (n >= 5 ? 'Готов к старту!' : 'Заправка ракеты') },
  gibdd: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.lightMini(i < n)).join(''), label: (n) => (n >= 5 ? 'Зелёная волна!' : 'Поймай зелёную волну') },
  school: { art: (n) => ART.journal(n), label: (n) => (n >= 5 ? 'Отличник!' : 'Пятёрки в журнале') },
  driver: { art: (n) => ART.speedometer(n), label: (n) => (n >= 5 ? 'Крейсерская скорость!' : 'Разгон без ошибок') },
  halloween: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.jack(i < n)).join(''), label: (n) => (n >= 5 ? 'Все тыквы светятся' : 'Зажги тыквы') },
  poster: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.stampStar(i < n)).join(''), label: (n) => (n >= 5 ? 'Отличник вождения!' : 'Звёзды отличника') },
  winter: { art: (n) => ART.snowman(n), label: (n) => (n >= 5 ? 'Снеговик готов!' : 'Слепи снеговика') },
  autumn: { art: (n) => ART.apples(n), label: (n) => (n >= 5 ? 'Урожай собран!' : 'Собери урожай') },
  toy: { art: (n) => ART.bricks(n), label: (n) => (n >= 5 ? 'Башня построена!' : 'Построй башню') },
  neon: { art: (n) => `<span style="font-family:'Russo One',sans-serif;font-size:22px;letter-spacing:.12em">${[...'ПРАВА'].map((ch, i) => `<span style="color:${i < n ? '#ff2bd6' : '#3b2a5c'};text-shadow:${i < n ? '0 0 8px #ff2bd6' : 'none'}">${ch}</span>`).join('')}</span>`, label: (n) => (n >= 5 ? 'Вывеска горит!' : 'Зажги вывеску') },
  pixel: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.pixHeart(i < n)).join(''), label: (n) => (n >= 5 ? 'КОМБО ×5!' : 'КОМБО') },
  gym: { art: (n) => ART.barbell(n), label: (n) => (n >= 5 ? 'Рекорд! 120 кг' : `Штанга ${20 + n * 20} кг`) },
  cats: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.fishS(i < n)).join(''), label: (n) => (n >= 5 ? 'Кот сыт и доволен' : 'Рыбки для кота') },
  football: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.soccerS(i < n)).join(''), label: (n) => (n >= 5 ? 'Пять голов подряд!' : 'Голы подряд') },
  cinema: { art: (n) => ART.film(n), label: (n) => (n >= 5 ? 'Снято с первого дубля!' : 'Кадры без ошибок') },
  comic: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.burstS(i < n)).join(''), label: (n) => (n >= 5 ? 'Суперсила на максимум!' : 'Суперсила') },
  hacker: { art: (n) => `<span style="font-family:'PT Mono',monospace;font-size:16px;color:#2bff6b;white-space:nowrap">[${'■'.repeat(n)}${'□'.repeat(5 - n)}] ${n * 20}%</span>`, label: (n) => (n >= 5 ? 'Доступ разрешён' : 'Загрузка знаний') },
  graffiti: { art: (n) => `<span style="font-family:'Rubik Wet Paint',cursive;font-size:24px;letter-spacing:.04em;line-height:1">${[...'КРУТО'].map((ch, i) => `<span style="color:${i < n ? ['#ff2e93', '#00a3e0', '#ff7a00', '#00a86b', '#7c3aed'][i] : '#cfcac0'}">${ch}</span>`).join('')}</span>`, label: (n) => (n >= 5 ? 'Шедевр!' : 'Тег на стене') },
  pirates: { art: (n) => ART.chest(n), label: (n) => (n >= 5 ? 'Сундук полон!' : 'Собери сокровища') },
  dino: { art: (n) => ART.eggStage(n), label: (n) => (n >= 5 ? 'Динозаврик вылупился!' : 'Высиди яйцо') },
  gzhel: { art: (n) => ART.matryoshkas(n), label: (n) => (n >= 5 ? 'Все матрёшки в сборе!' : 'Собери матрёшек') },
  sakura: { art: (n) => ART.branch(n), label: (n) => (n >= 5 ? 'Сакура в цвету!' : 'Распусти сакуру') },
  origami: { art: (n) => Array.from({ length: 5 }, (_, i) => ART.crane(i < n)).join(''), label: (n) => (n >= 5 ? 'Стая журавликов!' : 'Сложи журавликов') },
  noir: { art: (n) => ART.cork(n), label: (n) => (n >= 5 ? 'Дело раскрыто!' : 'Улики на доске') },
  ocean: { art: (n) => ART.aquarium(n), label: (n) => (n >= 5 ? 'Полный аквариум!' : 'Засели аквариум') },
};

/** Эффект после ответа: частицы, штамп, облачко, «взрыв», тряска и т. п. (`fx.ts`). */
export interface FxCfg {
  kind: string;
  parts?: string[];
  n?: number;
  text?: string;
  color?: string;
  bg?: string;
  font?: string;
  at?: 'option' | 'card';
  icon?: string;
  fill?: string;
  check?: boolean;
}

/** Звук: нота `[частота, начало, длительность, волна?, громкость?]` или именованный шум `['clank', начало?]`. */
export type SfxStep = (string | number)[];

export interface Look {
  id: string;
  /** Как выглядит карточка — описание для магазина. */
  idea: string;
  streak?: string;
  sound?: string;
  ok: string;
  bad: string;
  /** Подпись к «Верно!» и к «Неверно…». */
  flavor: [string, string];
  /** Украшения карточки (CSS-переменные `--deco-a/b/c`). */
  deco?: { a?: string; b?: string; c?: string };
  /** Номера вариантов: картинки по кругу, у верного и у ошибочного — свои. */
  nums?: string[];
  numOk?: string;
  numBad?: string;
  fx?: { ok?: FxCfg | FxCfg[]; bad?: FxCfg | FxCfg[] };
  sfx?: { ok: SfxStep[]; bad: SfxStep[] };
  /** Надпись на кнопке «Дальше». */
  nextLabel?: string;
}

const LIST: Look[] = [
  { id: 'classic', idea: 'Обычная карточка вопроса, как в игре сейчас.', ok: 'Зелёная подсветка.', bad: 'Красная подсветка.', flavor: ['', ''] },
  { id: 'newyear', idea: 'Карточка — подарочная коробка с бантом и рамкой-леденцом. Ответы — подарочные бирки с дырочкой, номера — ёлочные шары. Кнопка «Дальше» — леденец.',
    streak: 'Гирлянда: каждый верный ответ подряд зажигает лампочку.', sound: 'Колокольчики при верном ответе, глухое «дзынь» при ошибке.',
    ok: 'Бирка качается, шар горит золотом, разлетаются снежинки.', bad: 'Шар трескается, падает снег.',
    flavor: ['Ёлочка, гори!', 'Шарик треснул. Разбор ниже.'],
    deco: { a: ART.bow() }, nums: [ART.ball('#c1121f'), ART.ball('#1d5fbf'), ART.ball('#1e8a4c')], numOk: ART.ball('#e0a800', '#ffe680'), numBad: ART.ballCracked(),
    fx: { ok: { kind: 'burst', parts: [ART.snow(), ART.starP('#ffd54a'), ART.snow(), ART.starP('#fff3b0')], n: 18 }, bad: { kind: 'fall', parts: [ART.snow()], n: 10 } },
    sfx: { ok: [[1568, 0, .25, 'sine'], [2093, .1, .3, 'sine'], [2637, .2, .5, 'sine']], bad: [[330, 0, .25, 'triangle'], [262, .12, .35, 'triangle']] } },
  { id: 'valentine', idea: 'Карточка — конверт с клапаном и сердечком-печатью. Ответы — сердечные конфеты разных цветов с пунктирной каймой.',
    streak: 'Пять сердечек наполняются цветом.', sound: 'Нежный перезвон.',
    ok: 'Сердце бьётся, вверх летят сердечки.', bad: 'Сердце раскалывается.',
    flavor: ['Это любовь… к ПДД', 'Сердце разбито, но не навсегда'],
    deco: { a: ART.heart('#d10f47'), c: ART.heartPattern() }, nums: [ART.heart('#e63973'), ART.heart('#f06292'), ART.heart('#c2185b')], numOk: ART.heart('#d10f47', '<circle cx="31" cy="9" r="3" fill="#fff"/>'), numBad: ART.heartBroken(),
    fx: { ok: { kind: 'rise', parts: [ART.heart('#e63973'), ART.heart('#ff8fb1'), ART.heart('#c2185b')], n: 14 }, bad: { kind: 'drop', parts: [ART.heartBroken()], n: 1 } },
    sfx: { ok: [[1047, 0, .3, 'sine'], [1319, .12, .3, 'sine'], [1568, .24, .5, 'sine']], bad: [[440, 0, .3, 'sine'], [349, .15, .5, 'sine']] } },
  { id: 'feb23', idea: 'Карточка — стальная табличка со срезанными углами и заклёпками. Ответы — жетоны с отверстием, номера — звёзды.',
    streak: 'Погон: за каждый верный ответ подряд — звёздочка, от рядового до капитана.', sound: 'Короткий горн.',
    ok: 'Звезда золотая, опускается медаль.', bad: 'Штамп «Отставить!».',
    flavor: ['Так точно!', 'Отставить! Разбор ниже.'],
    deco: { c: ART.starPattern() }, nums: [ART.star('#b3141f'), ART.star('#b3141f'), ART.star('#b3141f')], numOk: ART.star('#e0b84a', '#8a6a14'), numBad: ART.star('#9aa0a6', '#6b7078'),
    fx: { ok: { kind: 'medal' }, bad: { kind: 'stamp', text: 'ОТСТАВИТЬ!', color: '#b3141f', at: 'option' } },
    sfx: { ok: [[523, 0, .15, 'square'], [659, .15, .15, 'square'], [784, .3, .35, 'square']], bad: [[196, 0, .18, 'square'], [196, .22, .3, 'square']] } },
  { id: 'maslenitsa', idea: 'Карточка — вышитый рушник с бахромой. Ответы — румяные блины с подпалинами, номера — блинчики.',
    streak: 'Стопка блинов растёт, на пятом — кусочек масла.', sound: 'Балалаечный перебор.',
    ok: 'Блин подлетает и становится солнышком.', bad: 'Блин сминается: «Первый блин комом».',
    flavor: ['Блин удался!', 'Первый блин комом'],
    deco: { a: ART.embroidery() }, nums: [ART.blin(), ART.blin(), ART.blin()], numOk: ART.blin(true), numBad: ART.blinKom(),
    fx: { ok: { kind: 'burst', parts: [ART.dot('#ffcf4a'), ART.dot('#ff9f1c'), ART.blin()], n: 12 }, bad: { kind: 'none' } },
    sfx: { ok: [[587, 0, .12, 'sawtooth'], [740, .08, .12, 'sawtooth'], [880, .16, .12, 'sawtooth'], [1175, .24, .3, 'sawtooth']], bad: [[220, 0, .2, 'sawtooth'], [185, .12, .3, 'sawtooth']] } },
  { id: 'mar8', idea: 'Карточка-открытка со срезанными уголками-лепестками, ветка мимозы и тюльпаны. Ответы — лепестки трёх весенних цветов.',
    streak: 'Букет: за каждый верный ответ — тюльпан в вазе.', sound: 'Колокольчики.',
    ok: 'Тюльпан распускается, летят лепестки.', bad: 'Тюльпан вянет.',
    flavor: ['Расцвело!', 'Лепесток опал. Разбор ниже.'],
    deco: { a: ART.mimosa(), b: ART.tulips() }, nums: [ART.tulipBud('#ef5b84'), ART.tulipBud('#ff9f43'), ART.tulipBud('#b05bd6')], numOk: ART.tulipOpen('#ef5b84'), numBad: ART.tulipWilt(),
    fx: { ok: { kind: 'rise', parts: [ART.petal('#ef5b84'), ART.dot('#ffd400'), ART.petal('#ff9f43')], n: 16 }, bad: { kind: 'drop', parts: [ART.petal('#d7a3b4')], n: 2 } },
    sfx: { ok: [[1319, 0, .3, 'sine'], [1760, .1, .4, 'sine']], bad: [[523, 0, .3, 'sine'], [392, .15, .4, 'sine']] } },
  { id: 'cosmos', idea: 'Карточка — пульт корабля со срезанными углами и сканлайнами, картинка в рамке экрана. Ответы — кнопки пульта с подсветкой, номера — планеты. Кнопка «ПУСК».',
    streak: 'Топливо: шкала заправки ракеты.', sound: 'Взлёт с гулом.',
    ok: 'Ракета взлетает мимо карточки.', bad: 'Пульт мигает красной тревогой.',
    flavor: ['Поехали!', 'Сбой на орбите. Разбор ниже.'],
    nums: [ART.planet('#4dabf7'), ART.planet('#f783ac'), ART.planet('#69db7c')], numOk: ART.planet('#3ddc84', '#b8f5d2', '#3ddc84'), numBad: ART.planet('#ff5a6e', '#ffc4cd'),
    fx: { ok: { kind: 'rocket' }, bad: { kind: 'none' } }, nextLabel: 'ПУСК ▶',
    sfx: { ok: [['sweep', 120, 900, 0, .9]], bad: [[880, 0, .12, 'square'], [880, .25, .12, 'square'], [880, .5, .12, 'square']] } },
  { id: 'victory', idea: 'Сдержанно: вечерний салют на фоне, красные гвоздики, золотая двойная рамка. Без шуток и без серии.',
    sound: 'Короткий торжественный аккорд.', ok: 'Над карточкой салют.', bad: 'Обычная подсветка, без эффектов.',
    flavor: ['Салют!', ''],
    deco: { a: ART.carnation(), c: ART.salutes() }, nums: [ART.medallion('#b3141f', '#c9a646'), ART.medallion('#b3141f', '#c9a646'), ART.medallion('#b3141f', '#c9a646')], numOk: ART.medallion('#e0b84a', '#a8862c'), numBad: ART.medallion('#8e939c', '#6b7078'),
    fx: { ok: { kind: 'salute' }, bad: { kind: 'none' } },
    sfx: { ok: [[523, 0, .6, 'triangle'], [659, 0, .6, 'triangle'], [784, 0, .6, 'triangle']], bad: [] } },
  { id: 'gibdd', idea: 'Карточка — синий дорожный знак на столбе. Ответы — белые указатели направления со стрелкой, номера — линзы светофора. «Дальше» — зелёный указатель.',
    streak: 'Зелёная волна: светофоры переключаются на зелёный.', sound: 'Свисток при ошибке, «дзынь» при верном.',
    ok: 'Указатель становится зелёным, линза горит зелёным.', bad: 'Указатель красный, свистит лейтенант Соколов.',
    flavor: ['Зелёный — проезжайте!', 'Свисток! Лейтенант Соколов просит остановиться.'],
    nums: [ART.lens(), ART.lens(), ART.lens()], numOk: ART.lens('#2bd16b', '#2bd16b'), numBad: ART.lens('#ff3b30', '#ff3b30'),
    fx: { ok: { kind: 'none' }, bad: { kind: 'bubble', text: 'Фьють!' } }, nextLabel: 'Поехали',
    sfx: { ok: [[1175, 0, .2, 'sine'], [1568, .1, .3, 'sine']], bad: [['whistle']] } },
  { id: 'school', idea: 'Карточка — лист тетради на пружине с оторванным краем и красными полями. Ответы — строчки с клеточками для галочки. «Дальше» написано ручкой.',
    streak: 'Журнал: пятёрки в клеточках.', sound: 'Скрип ручки.',
    ok: 'Галочка в клеточке и «5» на полях.', bad: 'Ответ подчёркнут волной, на полях «2».',
    flavor: ['Пятёрка!', 'Двойку можно исправить'],
    fx: { ok: { kind: 'mark', text: '5', check: true }, bad: { kind: 'mark', text: '2' } }, nextLabel: 'Дальше →',
    sfx: { ok: [['scribble', .35]], bad: [['scribble', .2], ['scribble', .2, .25]] } },
  { id: 'driver', idea: 'Карточка на асфальте с бегущей разметкой и полосой ограждения. Ответы — номерные знаки с болтами и флажком RUS, номера — знаки ограничения скорости.',
    streak: 'Спидометр: стрелка растёт с каждым верным ответом.', sound: 'Клаксон при верном ответе.',
    ok: 'Штамп «Техосмотр пройден».', bad: 'Знак «Конец ограничения» и «Штраф 0 ₽ — понарошку».',
    flavor: ['Счастливого пути!', 'Штраф понарошку. Разбор ниже.'],
    nums: [ART.speed(), ART.speed(), ART.speed()], numOk: ART.speed(true), numBad: ART.speed(false, true),
    fx: { ok: { kind: 'stamp', text: 'ТЕХОСМОТР ПРОЙДЕН', color: '#138a3c', at: 'card' }, bad: { kind: 'receipt' } }, nextLabel: 'Поехали',
    sfx: { ok: [[392, 0, .18, 'square'], [494, 0, .18, 'square'], [392, .25, .3, 'square'], [494, .25, .3, 'square']], bad: [[160, 0, .4, 'sawtooth']] } },
  { id: 'halloween', idea: 'Лиловая ночь с луной, со края карточки стекает зелёная слизь, с ответов капает. Номера — тыквы. У кнопки «Дальше» кошачьи ушки.',
    streak: 'Пять тыкв зажигаются по очереди.', sound: 'Жуткое «у-у-у».',
    ok: 'Тыква светится, летят искры.', bad: 'Пролетает летучая мышь: «Бу!».',
    flavor: ['Тыква сияет!', 'Бу! Разбор ниже.'],
    deco: { b: ART.slime() }, nums: [ART.pumpkin(), ART.pumpkin(), ART.pumpkin()], numOk: ART.pumpkin(true), numBad: ART.pumpkin(false, true),
    fx: { ok: { kind: 'burst', parts: [ART.dot('#ff9b3d'), ART.dot('#ffd27a'), ART.starP('#ffb347')], n: 14 }, bad: { kind: 'bat' } },
    sfx: { ok: [[659, 0, .25, 'triangle'], [988, .12, .4, 'triangle']], bad: [['sweep', 400, 180, 0, .9, 'sine']] } },
  { id: 'poster', idea: 'Ретро-плакат: бумага, чёрные рамки, красная лента «Соблюдай правила движения!», плакатный шрифт. Ответы — косые ленты с тенью.',
    streak: 'Звёзды отличника вождения.', sound: 'Глухой удар штампа.',
    ok: 'Штамп «ЗАЧЁТ».', bad: 'Штамп «ВНИМАНИЕ!».',
    flavor: ['Так держать!', 'Внимание на дороге!'],
    fx: { ok: { kind: 'stamp', text: 'ЗАЧЁТ', color: '#c8102e', at: 'card' }, bad: { kind: 'stamp', text: 'ВНИМАНИЕ!', color: '#c8102e', at: 'option' } }, nextLabel: 'ДАЛЬШЕ!',
    sfx: { ok: [['thud']], bad: [['thud'], ['thud', .18]] } },
  { id: 'winter', idea: 'Карточка — иней со снежной шапкой и сосульками. Ответы — ледяные блоки с бликом, номера — шестигранные снежинки.',
    streak: 'Снеговик лепится: три кома, морковка, ведро.', sound: 'Ледяной перезвон, хруст при ошибке.',
    ok: 'Лёд тает: блок зеленеет, капают капли.', bad: 'Лёд трескается.',
    flavor: ['Растаяло!', 'Лёд треснул. Разбор ниже.'],
    deco: { a: ART.icicles(), c: ART.crack() },
    fx: { ok: { kind: 'fallFrom', parts: [ART.drop()], n: 8 }, bad: { kind: 'none' } },
    sfx: { ok: [[2093, 0, .2, 'sine'], [2637, .07, .2, 'sine'], [3136, .14, .35, 'sine']], bad: [['crunch']] } },
  { id: 'autumn', idea: 'Карточка — крафтовая бумага, приклеенная скотчем, на фоне кленовые листья. Ответы — заплатки со строчкой, номера — кленовые листья.',
    streak: 'Урожай: яблоки краснеют.', sound: 'Шорох листьев.',
    ok: 'Лист становится золотым, кружит листопад.', bad: 'Лист вянет и падает.',
    flavor: ['Золотая осень!', 'Лист опал. Разбор ниже.'],
    deco: { c: ART.leafPattern() }, nums: [ART.maple('#e85d2a'), ART.maple('#ffb347'), ART.maple('#c0532a')], numOk: ART.maple('#e0a800'), numBad: ART.maple('#8a6a4a'),
    fx: { ok: { kind: 'fall', parts: [ART.maple('#ffb347'), ART.maple('#e85d2a'), ART.maple('#ffd166')], n: 14 }, bad: { kind: 'drop', parts: [ART.maple('#8a6a4a')], n: 1 } },
    sfx: { ok: [['rustle', .5]], bad: [['rustle', .25]] } },
  { id: 'toy', idea: 'Ответы — пластиковые кирпичики с пупырышками, разных цветов, с объёмной тенью. Карточка — игровой коврик.',
    streak: 'Башня из кирпичиков растёт.', sound: 'Пружинка «бойнь».',
    ok: 'Кирпичик подпрыгивает и защёлкивается.', bad: 'Кирпичик шатается.',
    flavor: ['Щёлк!', 'Упс! Разбор ниже.'],
    fx: { ok: { kind: 'burst', parts: [ART.dot('#ffadad'), ART.dot('#a0c4ff'), ART.dot('#fdffb6'), ART.dot('#caffbf')], n: 14 }, bad: { kind: 'none' } },
    sfx: { ok: [['sweep', 300, 900, 0, .25, 'sine']], bad: [['sweep', 500, 150, 0, .35, 'sine']] } },
  { id: 'neon', idea: 'Ответы — неоновые трубки, мерцают при нажатии. Карточка светится розовым. «Дальше» — жёлтая неоновая вывеска.',
    streak: 'Вывеска «ПРАВА» загорается по букве.', sound: 'Гудение неона, щелчок при ошибке.',
    ok: 'Трубка загорается зелёным.', bad: 'Трубка моргает и гаснет красным.',
    flavor: ['Зелёный свет!', 'Короткое замыкание. Разбор ниже.'],
    fx: { ok: { kind: 'none' }, bad: { kind: 'none' } },
    sfx: { ok: [[110, 0, .5, 'sawtooth', .05], [880, 0, .3, 'sine']], bad: [['zap']] } },
  { id: 'pixel', idea: '8-битная игра: пиксельные рамки, пиксельный шрифт в подписях, кнопки как в старой приставке. Текст вопроса и ответов обычным шрифтом, чтобы читался.',
    streak: 'Комбо: пиксельные сердечки.', sound: '8-битная монетка, звук проигрыша.',
    ok: 'Выпрыгивает монетка «+1».', bad: 'Кнопка мигает, «−1 ♥».',
    flavor: ['+1 МОНЕТА', 'ПОПРОБУЙ ЕЩЁ'],
    fx: { ok: { kind: 'coin' }, bad: { kind: 'pixlose' } }, nextLabel: 'ДАЛЕЕ ▶',
    sfx: { ok: [[988, 0, .08, 'square'], [1319, .08, .3, 'square']], bad: [[392, 0, .12, 'square'], [330, .12, .12, 'square'], [262, .24, .3, 'square']] } },
  { id: 'gym', idea: 'Тренажёрный зал: рифлёный металл и лаймовый неон. Каждый ответ — гантель с блинами по краям, номера — цветные блины штанги. Спортивный шрифт, косая кнопка «Следующий подход».',
    streak: 'Штанга: за каждый верный ответ подряд — ещё блин, от пустого грифа до рекорда 120 кг.', sound: 'Звон блинов при верном ответе, тяжёлый удар при ошибке.',
    ok: 'Гантель поднимается два раза, блины загораются, облачко магнезии, штамп «Лёгкий вес!».', bad: 'Гантель проседает, экран вздрагивает, штамп «Отказ!».',
    flavor: ['Есть повтор!', 'Ещё подход! Разбор ниже.'],
    deco: { a: ART.dumbbell() }, nums: [ART.plate('#d62828'), ART.plate('#1d5fbf'), ART.plate('#e0a800')], numOk: ART.plate('#c6ff00', '#c6ff00'), numBad: ART.plate('#5a5d63', null, true),
    fx: { ok: [{ kind: 'burst', parts: [ART.dot('#f5f5f5'), ART.dot('#d9d9d9'), ART.dot('#ffffff')], n: 18 }, { kind: 'stamp', text: 'ЛЁГКИЙ ВЕС!', color: '#c6ff00', bg: '#111', at: 'card', font: "'Oswald', sans-serif" }], bad: [{ kind: 'stamp', text: 'ОТКАЗ!', color: '#ff5252', bg: '#111', at: 'option', font: "'Oswald', sans-serif" }, { kind: 'shake' }] }, nextLabel: 'Следующий подход',
    sfx: { ok: [['clank'], ['clank', .3]], bad: [['thud'], ['clank', .05]] } },
  { id: 'cats', idea: 'Карточка — кошачья мордочка с ушками, фон в лапках. Ответы — мягкие подушки, номера — лапки.',
    streak: 'Рыбки для кота: за каждый верный ответ подряд — рыбка.', sound: '«Мяу» и мурчание при верном ответе, шипение при ошибке.',
    ok: 'Лапка зеленеет, вверх летят лапки и сердечки.', bad: 'На подушке остаются следы когтей.',
    flavor: ['Мур-р! Верно!', 'Кот недоволен. Разбор ниже.'],
    deco: { a: ART.catEar(), b: ART.scratch(), c: ART.pawPattern() }, nums: [ART.paw('#f06595'), ART.paw('#f08c00'), ART.paw('#9775fa')], numOk: ART.paw('#2f9e5b'), numBad: ART.paw('#b5a49b'),
    fx: { ok: { kind: 'rise', parts: [ART.paw('#ff8fab'), ART.heart('#ff6b8b'), ART.paw('#ffa94d')], n: 12 }, bad: { kind: 'none' } },
    sfx: { ok: [['meow'], ['purr', .6]], bad: [['hiss']] } },
  { id: 'football', idea: 'Газон с полосами и центральным кругом, над карточкой — сетка ворот. Ответы — участки поля с угловыми дугами, номера — мячи.',
    streak: 'Голы подряд: мячи в ряд.', sound: 'Рёв трибун при верном ответе, свисток судьи при ошибке.',
    ok: 'Ответ обводится жёлтым, штамп «ГОООЛ!», конфетти.', bad: 'Судья показывает жёлтую карточку.',
    flavor: ['Гол!', 'Жёлтая карточка. Разбор ниже.'],
    deco: { a: ART.net() }, nums: [ART.soccer(), ART.soccer(), ART.soccer()], numOk: ART.soccer('#ffe066'), numBad: ART.ycard(),
    fx: { ok: [{ kind: 'stamp', text: 'ГОООЛ!', color: '#1b5e20', at: 'card' }, { kind: 'burst', parts: [ART.dot('#ffe066'), ART.dot('#ffffff'), ART.dot('#69db7c')], n: 16 }], bad: { kind: 'yellowcard' } }, nextLabel: 'В атаку!',
    sfx: { ok: [['cheer']], bad: [['whistle']] } },
  { id: 'cinema', idea: 'Красный бархатный занавес и свет прожектора. Карточка — кадр киноплёнки с перфорацией. Ответы — билеты в кино с вырезами по бокам и линией отрыва.',
    streak: 'Плёнка: каждый верный ответ подряд — удачный кадр.', sound: 'Хлопушка и короткая фанфара.',
    ok: 'Хлопушка: «Снято!», летят золотые звёзды.', bad: 'Хлопушка: «Стоп! Дубль два».',
    flavor: ['Снято!', 'Стоп! Дубль два. Разбор ниже.'],
    deco: { a: ART.perf() },
    fx: { ok: [{ kind: 'bubble', text: 'Снято!', icon: 'clapper' }, { kind: 'burst', parts: [ART.starP('#e0b84a'), ART.starP('#fff3b0')], n: 12 }], bad: { kind: 'bubble', text: 'Стоп! Дубль два', icon: 'clapper' } }, nextLabel: 'Мотор!',
    sfx: { ok: [['clap'], [1047, .15, .3, 'sine'], [1568, .25, .4, 'sine']], bad: [['clap'], ['buzz', .12]] } },
  { id: 'comic', idea: 'Страница комикса: жёлтый растр, панель с толстой обводкой и тенью. Ответы — облачка реплик с хвостиками, номера — взрывы-звёзды.',
    streak: 'Суперсила: взрывы загораются по одному.', sound: 'Удар «бац», при ошибке — смешное «уа-уа-уа».',
    ok: 'Взрыв «БАЦ!» у ответа.', bad: 'Взрыв «ХРЯСЬ!», страница вздрагивает.',
    flavor: ['Бац! В точку!', 'Хрясь! Разбор ниже.'],
    nums: [ART.burst('#ffd43b'), ART.burst('#ffa8a8'), ART.burst('#74c0fc')], numOk: ART.burst('#8ce99a'), numBad: ART.burst('#ced4da'),
    fx: { ok: { kind: 'pow', text: 'БАЦ!', fill: '#ffd43b' }, bad: [{ kind: 'pow', text: 'ХРЯСЬ!', fill: '#ff8787' }, { kind: 'shake' }] }, nextLabel: 'Дальше!',
    sfx: { ok: [['punch']], bad: [[392, 0, .25, 'triangle'], [370, .25, .25, 'triangle'], [349, .5, .25, 'triangle'], [330, .75, .6, 'triangle']] } },
  { id: 'hacker', idea: 'Окно терминала на чёрном экране, по фону бегут нули и единицы. Ответы — строки команд с номером в скобках, после вопроса мигает курсор.',
    streak: 'Загрузка знаний: [■■■□□] 60%.', sound: 'Стук клавиш и писк, при ошибке — гудок.',
    ok: 'Строка загорается зелёным, «ДОСТУП РАЗРЕШЁН».', bad: 'Экран глючит, «ОШИБКА».',
    flavor: ['> верно_', '> ошибка. открываю разбор_'],
    deco: { c: ART.codeRain() },
    fx: { ok: { kind: 'stamp', text: 'ДОСТУП РАЗРЕШЁН', color: '#2bff6b', bg: '#040904', at: 'card', font: "'PT Mono', monospace" }, bad: [{ kind: 'glitch' }, { kind: 'stamp', text: 'ОШИБКА', color: '#ff4d4d', bg: '#040904', at: 'option', font: "'PT Mono', monospace" }] }, nextLabel: '> далее_',
    sfx: { ok: [['keys'], [1760, .45, .1, 'square', .05]], bad: [['buzz']] } },
  { id: 'graffiti', idea: 'Кирпичная стена, на карточке — тег с короной. Ответы обведены баллончиком розовым, голубым и оранжевым, вниз стекают потёки. Номера — кляксы.',
    streak: 'Тег на стене: слово «КРУТО» прорисовывается по букве.', sound: 'Стук шарика в баллончике и шипение краски.',
    ok: 'Брызги краски во все стороны.', bad: 'С ответа стекает краска.',
    flavor: ['Красиво!', 'Клякса. Разбор ниже.'],
    deco: { a: ART.tag(), c: ART.brickWall() },
    fx: { ok: { kind: 'burst', parts: [ART.splat('#ff2e93'), ART.splat('#00a3e0'), ART.splat('#ffd60a'), ART.splat('#00a86b')], n: 14 }, bad: { kind: 'fallFrom', parts: [ART.drip('#e0115f')], n: 6 } },
    sfx: { ok: [['rattle'], ['spray', .25]], bad: [['spray', 0, .2], [180, .2, .3, 'sawtooth', .05]] } },
  { id: 'pirates', idea: 'Карта сокровищ на фоне моря, в углу красный крестик. Ответы — доски палубы с гвоздями, номера — штурвалы.',
    streak: 'Сундук наполняется золотыми монетами.', sound: 'Звон монет, при ошибке — всплеск.',
    ok: 'Доска становится золотой, номер — дублоном, летят монеты.', bad: '«Человек за бортом!», брызги воды.',
    flavor: ['Йо-хо-хо! Верно!', 'Человек за бортом! Разбор ниже.'],
    deco: { a: ART.xmark(), c: ART.waves() }, nums: [ART.wheel('#f0d9a8'), ART.wheel('#f0d9a8'), ART.wheel('#f0d9a8')], numOk: ART.doubloon(), numBad: ART.wheel('#c9d6e0', true),
    fx: { ok: { kind: 'burst', parts: [ART.goldCoin()], n: 14 }, bad: [{ kind: 'bubble', text: 'Человек за бортом!', icon: 'anchor' }, { kind: 'fallFrom', parts: [ART.drop()], n: 8 }] }, nextLabel: 'Полный вперёд!',
    sfx: { ok: [['jingle']], bad: [['splash']] } },
  { id: 'dino', idea: 'Закат и вулкан. Карточка — каменная табличка, ответы — неровные каменные плиты, номера — яйца динозавров.',
    streak: 'Яйцо трескается с каждым верным ответом, на пятом вылупляется динозаврик.', sound: 'Добродушное «р-р-р», при ошибке — свист метеорита и удар.',
    ok: 'Плита подпрыгивает, из яйца выглядывает динозаврик: «Р-р-р!».', bad: 'Пролетает метеорит, земля вздрагивает. Мимо!',
    flavor: ['Р-р-р! Верно!', 'Метеорит пролетел мимо. Разбор ниже.'],
    deco: { c: ART.volcano() }, nums: [ART.egg('#7cb342'), ART.egg('#ff8a65'), ART.egg('#4fc3f7')], numOk: ART.eggHatch(), numBad: ART.egg('#9e9e9e', true),
    fx: { ok: [{ kind: 'bubble', text: 'Р-р-р!', icon: 'dinoHead' }, { kind: 'burst', parts: [ART.fern(), ART.dot('#9bc46b')], n: 10 }], bad: { kind: 'meteor' } },
    sfx: { ok: [['roar']], bad: [['sweep', 1400, 200, 0, .6, 'sawtooth'], ['thud', .62]] } },
  { id: 'gzhel', idea: 'Белый фарфор с синей росписью: двойная кайма, завитки по углам, фон в цветочках. Ответы — расписные плитки с двойной каймой, номера — гжельские розы.',
    streak: 'Матрёшки в гжельской росписи: от самой маленькой до самой большой.', sound: 'Звон фарфора, при ошибке — тонкий треск.',
    ok: 'Плитка светлеет, кружат синие лепестки.', bad: 'По плитке бежит трещинка.',
    flavor: ['Красота!', 'Трещинка. Разбор ниже.'],
    deco: { a: ART.swirl(), b: ART.crack2(), c: ART.gzhelPattern() }, nums: [ART.rose(), ART.rose(), ART.rose()], numOk: ART.rose('#e0b84a'), numBad: ART.rose(null, true),
    fx: { ok: { kind: 'rise', parts: [ART.petal('#1f4fa0'), ART.petal('#5b8bd8'), ART.dot('#1f4fa0')], n: 14 }, bad: { kind: 'none' } },
    sfx: { ok: [[2637, 0, .5, 'sine', .08], [3951, .06, .6, 'sine', .05]], bad: [['crack'], [523, .05, .3, 'sine', .05]] } },
  { id: 'sakura', idea: 'Свиток из рисовой бумаги на деревянных палочках, падают лепестки. Ответы — деревянные таблички на красных шнурках, номера — красные печати.',
    streak: 'Ветка сакуры: за каждый верный ответ подряд распускается цветок.', sound: 'Мягкие щипки струн.',
    ok: 'Печать зеленеет, облако лепестков.', bad: 'Ветер срывает один лепесток.',
    flavor: ['Гармония!', 'Ветер сорвал лепесток. Разбор ниже.'],
    deco: { c: ART.blossomPattern() },
    fx: { ok: { kind: 'burst', parts: [ART.petal('#ffb7c5'), ART.petal('#ff8fab'), ART.petal('#ffd1dc')], n: 18 }, bad: { kind: 'drop', parts: [ART.petal('#d8a7b1')], n: 1 } },
    sfx: { ok: [[587, 0, .5, 'triangle', .1], [659, .1, .5, 'triangle', .1], [880, .2, .7, 'triangle', .1]], bad: [[294, 0, .6, 'triangle', .1], [277, .2, .8, 'triangle', .1]] } },
  { id: 'origami', idea: 'Лист бумаги с загнутым уголком на фоне из сложенных треугольников. Ответы — цветные бумажные полоски со сгибом и загнутым краем, номера — ромбики.',
    streak: 'Бумажные журавлики: за каждый верный ответ — новый.', sound: 'Свист бумажного самолётика, при ошибке — шорох мятой бумаги.',
    ok: 'Из ответа вылетает бумажный самолётик.', bad: 'Полоска сминается, падает бумажный комок.',
    flavor: ['Полетели!', 'Скомкано. Разбор ниже.'],
    fx: { ok: { kind: 'plane' }, bad: { kind: 'drop', parts: [ART.paperBall()], n: 1 } },
    sfx: { ok: [['whoosh']], bad: [['crumple']] } },
  { id: 'noir', idea: 'Ночь, дождь и свет сквозь жалюзи. Карточка — папка «Дело №», картинка — фото улики. Ответы — карточки со скрепками, номера — лупы. Шрифт пишущей машинки.',
    streak: 'Доска улик: каждый верный ответ — булавка и красная нить.', sound: 'Пишущая машинка со звоночком, при ошибке — тревожный аккорд.',
    ok: 'Штамп «ДЕЛО РАСКРЫТО».', bad: 'Штамп «ЛОЖНЫЙ СЛЕД».',
    flavor: ['Элементарно!', 'Ложный след. Разбор ниже.'],
    deco: { a: ART.paperclip() }, nums: [ART.magnifier('#f6f1e2'), ART.magnifier('#f6f1e2'), ART.magnifier('#f6f1e2')], numOk: ART.magnifier('#cfe8c4', '#2f6b3a'), numBad: ART.magnifier('#f2c4bc', '#8b0000'),
    fx: { ok: { kind: 'stamp', text: 'ДЕЛО РАСКРЫТО', color: '#8b0000', at: 'card' }, bad: { kind: 'stamp', text: 'ЛОЖНЫЙ СЛЕД', color: '#8b0000', at: 'option' } }, nextLabel: 'Следующее дело',
    sfx: { ok: [['keys'], ['ding', .45]], bad: [[110, 0, 1, 'triangle', .14], [131, 0, 1, 'triangle', .1], [156, 0, 1, 'triangle', .1]] } },
  { id: 'ocean', idea: 'Глубина с лучами света и пузырьками. Карточка — латунный иллюминатор, ответы — стеклянные панели с пузырьками, номера — рыбки.',
    streak: 'Аквариум: за каждый верный ответ подряд — новая рыбка.', sound: 'Бульканье пузырьков.',
    ok: 'Рыбка золотеет, вверх идут пузырьки.', bad: 'Рыба-ёж надувается: «Пф!».',
    flavor: ['Буль-буль, верно!', 'Рыба-ёж надулась. Разбор ниже.'],
    deco: { c: ART.bubblePattern() }, nums: [ART.fish('#d9480f'), ART.fish('#6741d9'), ART.fish('#1971c2')], numOk: ART.fish('#138a7a', true), numBad: ART.puffer(),
    fx: { ok: { kind: 'rise', parts: [ART.bubbleRing()], n: 16 }, bad: { kind: 'bubble', text: 'Пф!', icon: 'puffer' } }, nextLabel: 'Плывём дальше',
    sfx: { ok: [['bubbles']], bad: [['sweep', 500, 120, 0, .4, 'sine']] } }
];

export const LOOKS: Record<string, Look> = Object.fromEntries(LIST.map((l) => [l.id, l]));
