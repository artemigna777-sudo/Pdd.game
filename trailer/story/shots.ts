/**
 * Раскадровка ролика «Третья попытка» (≈51 с): парень дважды заваливает теорию, зубрит ночами, потом
 * между делом проходит билеты в игре — в автобусе, вечером, — и на третий раз сдаёт. Игра мелькает в кадре,
 * но не главная. Склейки — в такт музыке образца: тихое вступление до 14,13 с, дальше доля ≈ 0,7085 с.
 */
import {
  COL,
  H,
  OL,
  W,
  body,
  carSide,
  clock,
  cursor,
  dadHead,
  ell,
  examMonitor,
  g,
  gameScreen,
  gibdd,
  glow,
  heroHead,
  hoodieBust,
  mainRoadSign,
  palm,
  path,
  phone,
  rain,
  rect,
  sweaterBust,
  text,
  ticketPile,
  trafficLight,
  tube,
  windowFrame,
} from './art.ts';

/** Камера: центр кадра (fx, fy), масштаб в начале и в конце, сдвиг за кадр. */
export interface Cam {
  fx: number;
  fy: number;
  s0: number;
  s1: number;
  dx?: number;
  dy?: number;
}
/** Цветокоррекция кадра: тон (multiply), подсветка (screen), виньетка. */
export interface Grade {
  tint?: string;
  tintOp?: number;
  lift?: string;
  liftOp?: number;
  vignette?: number;
}
export interface Shot {
  name: string;
  bg: string;
  svg: string;
  cam: Cam;
  grade?: Grade;
  /** Анимации кадра: t0 — начало, t1 — конец кадра. */
  anim?: (t0: number, t1: number) => string;
}

const BEAT = 0.7085;
const DROP = 14.133;
const r3 = (x: number) => Math.round(x * 30) / 30;
/** Момент k долей после «дропа» (округлён до кадра). */
const b = (k: number) => +r3(DROP + k * BEAT).toFixed(3);

/** Склейки: тихая часть — как у образца, после «дропа» — по долям. */
export const CUTS = [0, 2.133, 4.267, 6.367, 8.5, 10.6, 12.367, b(0), b(2), b(5), b(7), b(9), b(12), b(15), b(16), b(18), b(19), b(20), b(22), b(24), b(32), b(34), b(37), b(40), b(44), b(46)];
export const END_CARD = b(48);
export const END = +(END_CARD + 3.45).toFixed(3);

// ─── Общие фоны ───────────────────────────────────────────────────────────────

const wallFloor = (wall: string, floor: string, fy: number) => rect(-200, -200, W + 400, fy + 200, wall, 0, 0) + rect(-200, fy, W + 400, H - fy + 400, floor, 0, 0) + path(`M-200,${fy} H${W + 200}`, 'none', 5);

/** Капюшон на голове (рисуется позади головы). */
const hood = (front: boolean) =>
  front
    ? path('M-92,40 C-104,-78 -58,-126 2,-124 C62,-126 106,-78 92,40', 'none', 6, `stroke="${COL.hoodieShade}"`)
    : path('M-104,90 C-124,-90 -64,-140 2,-138 C68,-140 124,-90 104,90 Z', COL.hoodie);

/** Затылок героя (вид со спины). */
const backHead = () => g(ell(-70, 12, 12, 19, COL.skin) + ell(70, 12, 12, 19, COL.skin) + rect(-18, 52, 36, 50, COL.skinShade) + path('M-76,10 C-84,-64 -40,-100 2,-100 C46,-100 86,-62 76,10 C70,60 40,80 0,80 C-40,80 -70,60 -76,10Z', COL.hair));

/** Ряд размытых экзаменационных столов с людьми (фон). */
function examRoomBlur(cold: boolean) {
  let s = rect(-200, -200, W + 400, 1500, cold ? '#8d98a3' : '#c9c1a8', 0, 0) + rect(-200, 1300, W + 400, 900, cold ? '#5d6570' : '#8f8470', 0, 0);
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 300;
    s += rect(x - 110, 760, 220, 150, '#2d3036', 10, 4) + rect(x - 95, 775, 190, 120, cold ? '#b9d4ec' : '#e9e6c8', 4, 0) + rect(x - 150, 960, 300, 40, '#6d6a66', 4, 4);
    s += g(ell(0, 0, 60, 70, ['#1d1a1e', '#5a3b2a', '#a07a4a', '#1d1a1e'][i]) + path('M-110,200 C-110,110 -70,70 0,70 C70,70 110,110 110,200Z', ['#5a6e8a', '#8a5a5a', '#5a8a6a', '#7a6a8a'][i]), `translate(${x} 1060)`);
  }
  return g(s, '', 'filter="url(#blur14)"');
}

/** Фон улицы для окна автобуса — полоса домов, повторяется для сдвига. */
function streetStrip(w: number, y: number) {
  let s = '';
  const cols = ['#c98f6a', '#d9c39a', '#9fb0b8', '#c7a7a0', '#b7c49a'];
  for (let i = 0; i < 12; i++) {
    const hgt = 380 + ((i * 97) % 220);
    s += rect(i * 260, y - hgt, 230, hgt, cols[i % 5], 4, 4);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) s += rect(i * 260 + 40 + c * 90, y - hgt + 50 + r * 110, 60, 70, '#eef3f6', 3, 3);
    if (i % 3 === 1) s += g(ell(0, -140, 90, 110, '#6f9a5a') + rect(-12, -40, 24, 60, '#7a5a3a', 0, 4), `translate(${i * 260 + 245} ${y})`);
  }
  void w;
  return s;
}

/** Календарь на стене (центр 0,0): `crossed` — сколько дней зачёркнуто сразу, класс .xday — по одному. */
function calendar(crossed: number, animated: number) {
  let s = rect(-420, -560, 840, 1120, '#f7f4ec', 10) + rect(-420, -560, 840, 160, '#c8463e', 10) + text(0, -462, 'ОКТЯБРЬ', 62, '#fff', 900, 'letter-spacing="8"');
  s += path('M-300,-600 V-530 M300,-600 V-530', 'none', 10);
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  days.forEach((d, i) => (s += text(-360 + i * 120, -340, d, 30, i > 4 ? '#c8463e' : '#555', 700)));
  for (let n = 1; n <= 31; n++) {
    const i = (n + 2) % 7;
    const r = Math.floor((n + 2) / 7);
    const x = -360 + i * 120;
    const y = -250 + r * 150;
    s += text(x, y, String(n), 48, '#333', 700);
    if (n <= crossed) s += path(`M${x - 34},${y - 50} L${x + 34},${y + 14} M${x + 34},${y - 50} L${x - 34},${y + 14}`, 'none', 7, 'stroke="#3a3a3a" opacity="0.75"');
    else if (n <= crossed + animated) s += path(`M${x - 34},${y - 50} L${x + 34},${y + 14} M${x + 34},${y - 50} L${x - 34},${y + 14}`, 'none', 7, `stroke="#3a3a3a" opacity="0" class="xday" data-n="${n - crossed}"`);
    if (n === 28) s += `<ellipse cx="${x}" cy="${y - 18}" rx="62" ry="52" fill="none" stroke="${COL.red}" stroke-width="9" class="circ" stroke-dasharray="380" stroke-dashoffset="0"/>` + text(x - 60, y + 66, 'ПЕРЕСДАЧА', 28, COL.red, 900);
  }
  return s;
}

/** Экзаменационный монитор крупно, с холодным свечением. */
function monitorShot(kind: 'fail' | 'fail2' | 'pass' | 'run', extra = '') {
  const glowCol = kind === 'pass' ? 'glowY' : 'glowB';
  return rect(-200, -200, W + 400, H + 400, kind === 'pass' ? '#3a4a3e' : '#2a313b', 0, 0) + glow(540, 900, 820, glowCol, 0.45) + g(examMonitor(kind), 'translate(540 860)') + extra;
}

// ─── Кадры ────────────────────────────────────────────────────────────────────

export const SHOTS: Shot[] = [
  {
    // 1. Крючок: результат на экране — «Экзамен не сдан».
    name: 'fail1',
    bg: '#2a313b',
    svg: monitorShot('fail', cursor(720, 1010, 'id="cur1"')),
    cam: { fx: 540, fy: 820, s0: 0.98, s1: 1.06 },
    grade: { tint: '#7d93b5', tintOp: 0.25, vignette: 0.55 },
    anim: (t0) => `tl.fromTo('#cur1', { x: 40, y: 30 }, { x: 0, y: 0, duration: 0.8, ease: 'power2.out' }, ${t0});`,
  },
  {
    // 2. Лицо в свете монитора.
    name: 'face-sad',
    bg: '#8d98a3',
    svg: examRoomBlur(true) + glow(540, 1100, 700, 'glowB', 0.5) + g(hoodieBust() + heroHead('sad', [0, 2]), 'translate(540 980) scale(2.5)', 'id="h2"'),
    cam: { fx: 540, fy: 1050, s0: 1.0, s1: 1.07 },
    grade: { tint: '#7a8fb0', tintOp: 0.3, vignette: 0.6 },
    anim: (t0, t1) => `tl.to('#h2', { y: 18, duration: ${(t1 - t0).toFixed(2)}, ease: 'sine.inOut' }, ${t0});`,
  },
  {
    // 3. Выходит из ГИБДД под дождём, в капюшоне.
    name: 'rain',
    bg: '#8e979e',
    svg:
      rect(-200, -200, W + 400, 1500, '#8e979e', 0, 0) +
      gibdd(540, 1240, false) +
      rect(-200, 1240, W + 400, 900, '#6d7378', 0, 0) +
      ell(300, 1560, 160, 26, '#8d969d', 0) +
      ell(820, 1700, 200, 30, '#8d969d', 0) +
      g(
        body({
          head: hood(false) + heroHead('sad', [0, 4]) + hood(true),
          arms: ['M-72,-226 Q-100,-140 -66,-70', 'M72,-226 Q100,-140 66,-70'],
          legs: ['M-36,0 L-46,140 L-40,280', 'M36,0 L54,130 L66,270'],
          hands: false,
        }),
        'translate(540 1480) scale(0.82)',
        'id="w3"',
      ) +
      g(rain(140, 3), '', 'class="rain"'),
    cam: { fx: 540, fy: 1100, s0: 1.0, s1: 1.05 },
    grade: { tint: '#8094a8', tintOp: 0.35, vignette: 0.5 },
    anim: (t0, t1) =>
      `tl.fromTo('#w3', { y: -30, scale: 0.97, transformOrigin: '50% 100%' }, { y: 40, scale: 1.04, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});
      tl.fromTo('.s2 .rain', { y: -500 }, { y: 400, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
  },
  {
    // 4. Ночь, уснул на билетах. 2:47.
    name: 'desk',
    bg: '#2b2733',
    svg:
      wallFloor('#4a4352', '#3a3240', 1500) +
      windowFrame(90, 330, 330, 460, '#1d2a45') +
      `<circle cx="330" cy="430" r="34" fill="#f2ecd0"/>` +
      clock(810, 520, 110, 2, 47) +
      glow(260, 1180, 520, 'glowY', 0.85) +
      rect(-100, 1250, W + 200, 70, COL.wood) +
      rect(-100, 1320, W + 200, 600, COL.woodDark, 0, 0) +
      g(path('M0,0 L-60,-170 L-150,-200', 'none', 12) + path('M-210,-260 L-90,-260 L-120,-170 L-180,-170 Z', '#e0b04a'), 'translate(240 1250)') +
      ticketPile(800, 1240, 9) +
      g(rect(-230, -40, 460, 40, '#f8f5ec', 3, 4), 'translate(540 1244) rotate(-3)') +
      g(tube('M-170,40 Q-20,70 150,40', COL.hoodie, 90) + g(heroHead('sleep'), 'translate(-10 -40) rotate(-78) scale(1.25)'), 'translate(500 1170)', 'id="h4"'),
    cam: { fx: 560, fy: 1080, s0: 1.25, s1: 1.32 },
    grade: { tint: '#6a5a7a', tintOp: 0.3, lift: '#ffb860', liftOp: 0.08, vignette: 0.65 },
    anim: (t0, t1) => `tl.to('#h4', { scaleY: 1.03, transformOrigin: '50% 100%', duration: 0.9, yoyo: true, repeat: ${Math.max(1, Math.round((t1 - t0) / 0.9) - 1)}, ease: 'sine.inOut' }, ${t0});`,
  },
  {
    // 5. Календарь: обвели день пересдачи.
    name: 'calendar',
    bg: '#cfc6b3',
    svg:
      rect(-200, -200, W + 400, H + 400, '#cfc6b3', 0, 0) +
      g(calendar(9, 0), 'translate(540 960)') +
      g(tube('M0,0 L260,420', COL.hoodie, 90) + g(palm(44), 'translate(0 0)') + g(rect(-12, -110, 24, 120, COL.red, 6, 4), 'rotate(-30)'), 'translate(700 1140)', 'id="hand5"'),
    cam: { fx: 600, fy: 1050, s0: 1.25, s1: 1.33 },
    grade: { tint: '#9a8f7a', tintOp: 0.2, vignette: 0.5 },
    anim: (t0) =>
      `tl.fromTo('.s4 .circ', { strokeDashoffset: 380 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, ${t0 + 0.2});
      tl.fromTo('#hand5', { x: 40, y: 30 }, { x: -20, y: -10, duration: 1.4, ease: 'sine.inOut' }, ${t0 + 0.1});`,
  },
  {
    // 6. Вторая попытка — снова «не сдан».
    name: 'fail2',
    bg: '#2a313b',
    svg: monitorShot('fail2'),
    cam: { fx: 540, fy: 760, s0: 1.35, s1: 1.45 },
    grade: { tint: '#7d93b5', tintOp: 0.25, vignette: 0.7 },
  },
  {
    // 7. Ночью в темноте, слеза; снизу светит телефон.
    name: 'tear',
    bg: '#111725',
    svg:
      rect(-200, -200, W + 400, H + 400, '#111725', 0, 0) +
      glow(540, 1500, 700, 'glowB', 0.55) +
      g(hoodieBust() + heroHead('cry', [0, 4]), 'translate(540 900) scale(2.7)') +
      g(path('M0,0 Q-9,14 0,22 Q9,14 0,0Z', '#bfe0ff', 3), 'translate(613 935) scale(2.2)', 'id="tear"') +
      g(rect(-120, -200, 240, 400, '#1d1d22', 30) + glow(0, -230, 260, 'glowB', 0.9), 'translate(540 1820) rotate(-6)'),
    cam: { fx: 540, fy: 960, s0: 1.0, s1: 1.08 },
    grade: { tint: '#4a5f8a', tintOp: 0.45, vignette: 0.75 },
    anim: (t0) => `tl.fromTo('#tear', { y: -10, opacity: 0 }, { y: 120, opacity: 1, duration: 1.4, ease: 'power1.in' }, ${t0 + 0.2});`,
  },
  {
    // 8. «Дроп»: утро, распахивает шторы, свет заливает комнату.
    name: 'curtains',
    bg: '#5a4a5e',
    svg:
      wallFloor('#5a4a5e', '#4a3c46', 1600) +
      g(rect(0, 0, 520, 760, '#fff6d8', 6, 7) + glow(260, 300, 420, 'glowW', 1) + `<circle cx="260" cy="260" r="80" fill="#fff" />` + path('M260,0 V760 M0,320 H520', 'none', 7), 'translate(280 360)') +
      `<path d="M800,1120 L1400,2200 L-300,2200 L280,1120 Z" fill="url(#sunbeam)" opacity="0.7" id="beam8"/>` +
      g(rect(-300, 0, 310, 900, '#8a5a8f', 8) + path('M-230,0 V900 M-150,0 V900 M-70,0 V900', 'none', 4, 'stroke="#6f4574"'), 'translate(540 300)', 'id="curL"') +
      g(rect(-10, 0, 310, 900, '#8a5a8f', 8) + path('M70,0 V900 M150,0 V900 M230,0 V900', 'none', 4, 'stroke="#6f4574"'), 'translate(540 300)', 'id="curR"') +
      g(
        body({
          head: backHead(),
          arms: ['M-72,-226 L-200,-380 L-250,-520', 'M72,-226 L200,-380 L250,-520'],
          legs: ['M-36,0 L-50,150 L-60,300', 'M36,0 L50,150 L60,300'],
        }),
        'translate(540 1500) scale(1.05)',
      ),
    cam: { fx: 540, fy: 1000, s0: 1.0, s1: 1.06 },
    grade: { tint: '#c9a070', tintOp: 0.12, lift: '#fff1c4', liftOp: 0.2, vignette: 0.35 },
    anim: (t0) =>
      `tl.fromTo('#curL', { x: 0 }, { x: -290, duration: 0.6, ease: 'power3.out' }, ${t0});
      tl.fromTo('#curR', { x: 0 }, { x: 290, duration: 0.6, ease: 'power3.out' }, ${t0});
      tl.fromTo('#beam8', { opacity: 0 }, { opacity: 0.8, duration: 0.5 }, ${t0 + 0.1});
      tl.fromTo('#burst', { opacity: 0.9 }, { opacity: 0, duration: 0.7, ease: 'power2.out', immediateRender: false }, ${t0});`,
  },
  {
    // 9. Автобус: у окна, в телефоне — сосредоточен, чуть улыбается.
    name: 'bus',
    bg: '#cfc1a6',
    svg:
      rect(-200, -200, W + 400, H + 400, '#b9ab94', 0, 0) +
      g(rect(-200, 200, 1500, 1000, '#a9c8dc', 0, 0) + g(streetStrip(3000, 1100), '', 'id="strip9"'), '', 'clip-path="url(#busWin)"') +
      `<clipPath id="busWin"><rect x="60" y="260" width="960" height="900" rx="40"/></clipPath>` +
      rect(60, 260, 960, 900, 'none', 40, 10) +
      path('M540,260 V1160', 'none', 10) +
      rect(-200, 1160, W + 400, 80, '#8e8a84', 0, 5) +
      g(rect(-240, -260, 480, 760, '#4f6f8f', 60) + rect(-200, -220, 400, 120, '#5f84aa', 30, 4), 'translate(830 1500)') +
      g(hoodieBust() + heroHead('focus', [-3, 8]) + g(phone(150, 280, gameScreen(150, 280)), 'translate(-40 330) rotate(-8)') + g(palm(30), 'translate(-120 410)') + g(palm(30), 'translate(40 420)'), 'translate(470 1150) scale(1.55)', 'id="h9"'),
    cam: { fx: 540, fy: 1100, s0: 1.0, s1: 1.05 },
    grade: { tint: '#d6a86a', tintOp: 0.15, lift: '#fff0c0', liftOp: 0.1, vignette: 0.4 },
    anim: (t0, t1) =>
      `tl.fromTo('#strip9', { x: 0 }, { x: -900, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});
      tl.to('#h9', { y: 8, duration: 0.18, yoyo: true, repeat: ${Math.round((t1 - t0) / 0.18)}, ease: 'sine.inOut' }, ${t0});`,
  },
  {
    // 10. Экран крупно: машина у зебры, пешеход, верный ответ.
    name: 'phone-game',
    bg: '#b9ab94',
    svg:
      rect(-200, -200, W + 400, H + 400, '#7d6f5e', 0, 0) +
      g(rect(-300, -200, 1700, 900, '#4f6f8f', 0, 0), 'translate(-100 1500)', 'filter="url(#blur14)"') +
      g(
        tube('M-420,760 L-330,420', COL.hoodie, 170) +
          tube('M420,760 L330,420', COL.hoodie, 170) +
          ell(-300, 360, 110, 150, COL.skin) +
          ell(300, 380, 110, 150, COL.skin) +
          phone(560, 1040, gameScreen(560, 1040, { check: true })) +
          tube('M-330,330 Q-280,240 -220,230', COL.skin, 64) +
          g(tube('M330,350 Q280,250 220,240', COL.skin, 64), '', 'id="thumb10"'),
        'translate(540 860)',
      ),
    cam: { fx: 540, fy: 900, s0: 1.0, s1: 1.06 },
    grade: { tint: '#d6a86a', tintOp: 0.12, vignette: 0.45 },
    anim: (t0) =>
      `tl.set('#gchk, #gopt', { opacity: 0 }, ${t0});
      tl.fromTo('#gcar', { y: 140 }, { y: 0, duration: 0.6, ease: 'power2.out' }, ${t0});
      tl.fromTo('#gped', { x: 0 }, { x: 160, duration: 1.1, ease: 'none' }, ${t0 + 0.1});
      tl.fromTo('#thumb10', { y: 0 }, { y: -30, duration: 0.15, yoyo: true, repeat: 1 }, ${t0 + 0.75});
      tl.to('#gopt', { opacity: 1, duration: 0.1 }, ${t0 + 0.85});
      tl.fromTo('#gchk', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, ${t0 + 0.9});`,
  },
  {
    // 11. В окне автобуса — та же ситуация в жизни: зебра, пешеход, красный.
    name: 'zebra',
    bg: '#a9c8dc',
    svg:
      rect(-200, -200, W + 400, 1100, '#a9c8dc', 0, 0) +
      streetStrip(2000, 1000) +
      path('M-200,1000 H1300 V2200 H-200Z', '#6b6b72', 0) +
      Array.from({ length: 7 }, (_, i) => path(`M${80 + i * 140},1180 L${140 + i * 140},1180 L${170 + i * 160},1520 L${80 + i * 160},1520Z`, '#efeee6', 0)).join('') +
      trafficLight(960, 560, 'red', 0.9) +
      g(
        body({
          head: g(ell(0, 0, 70, 80, COL.skin) + path('M-78,20 C-90,-70 -40,-104 0,-102 C46,-104 92,-64 76,30 C70,90 40,120 50,160 L80,160 C100,60 96,-10 76,30Z', '#8a4a2a') + `<g transform="translate(0 0)">${''}</g>`),
          arms: ['M-72,-226 Q-110,-130 -96,-40', 'M72,-226 Q110,-140 120,-60'],
          legs: ['M-36,0 L-80,150 L-110,280', 'M36,0 L70,140 L110,260'],
          coat: '#c76a5a',
          coatShade: '#a4534a',
          pants: '#4a4a5a',
        }),
        'translate(330 1300) scale(0.6)',
        'id="ped11"',
      ) +
      // Рама окна автобуса.
      path('M-200,-200 H1280 V2120 H-200 Z M40,140 V1780 H1040 V140 Z', '#8e8a84', 6, 'fill-rule="evenodd"'),
    cam: { fx: 540, fy: 1000, s0: 1.0, s1: 1.04 },
    grade: { tint: '#d6a86a', tintOp: 0.12, vignette: 0.45 },
    anim: (t0, t1) => `tl.fromTo('#ped11', { x: -60 }, { x: 260, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
  },
  {
    // 12. Вечер дома: на кровати с телефоном, улыбается; в корзине — смятые распечатки билетов.
    name: 'bed-warm',
    bg: '#6a4a3e',
    svg:
      wallFloor('#7a5a48', '#5a4034', 1450) +
      glow(220, 700, 520, 'glowY', 0.9) +
      g(path('M0,0 L0,-260', 'none', 10) + path('M-80,-360 L80,-360 L60,-260 L-60,-260Z', '#e9b75a'), 'translate(220 940)') +
      rect(520, 1150, 620, 360, '#5e7fa8', 30) +
      rect(560, 1080, 260, 120, '#efe9dc', 40) +
      g(hoodieBust() + heroHead('smile', [-4, 8]) + g(phone(150, 280, gameScreen(150, 280, { map: true })), 'translate(-30 330) rotate(-6)') + g(palm(30), 'translate(-110 400)') + g(palm(30), 'translate(50 410)'), 'translate(700 900) scale(1.25)') +
      g(path('M-110,0 L-90,240 L90,240 L110,0 Z', '#9aa3ab') + ell(-40, -10, 46, 40, '#f4f1e8') + ell(30, -24, 40, 36, '#f0ede2') + ell(0, -60, 44, 38, '#f6f3ea') + g(rect(-80, -60, 160, 110, '#fbf9f2', 4, 4) + text(0, -10, 'БИЛЕТЫ', 26, '#2b2b2b', 900), 'translate(-10 -110) rotate(-14)'), 'translate(260 1560)'),
    cam: { fx: 540, fy: 1100, s0: 1.0, s1: 1.06 },
    grade: { tint: '#e0a060', tintOp: 0.2, lift: '#ffd9a0', liftOp: 0.1, vignette: 0.55 },
  },
  {
    // 13. Кухня: папа поверх газеты косится на телефон сына.
    name: 'kitchen',
    bg: '#d9cdb5',
    svg:
      wallFloor('#d9cdb5', '#b9a98e', 1500) +
      windowFrame(380, 260, 320, 420, '#bcd8e8') +
      g(sweaterBust() + dadHead('skeptic', [-6, 0]), 'translate(800 1020) scale(1.15)') +
      g(rect(-200, -150, 300, 230, '#efebe1', 4) + rect(-180, -120, 120, 12, '#9a958a', 4, 0) + rect(-180, -96, 230, 8, '#bbb6aa', 4, 0) + rect(-180, -80, 230, 8, '#bbb6aa', 4, 0) + rect(-180, -64, 200, 8, '#bbb6aa', 4, 0), 'translate(880 1330) rotate(6)') +
      g(hoodieBust() + heroHead('focus', [6, 10]), 'translate(260 1050) scale(1.15)') +
      rect(-100, 1340, W + 200, 60, '#e9e2d2') +
      rect(-100, 1400, W + 200, 600, '#c9bda5', 0, 0) +
      ell(300, 1338, 110, 24, '#f6f3ec') +
      ell(300, 1330, 60, 12, '#e8b84a', 3) +
      g(phone(90, 170, gameScreen(90, 170)), 'translate(470 1320) rotate(80) scale(0.9)') +
      g(rect(-34, -60, 68, 70, '#d65a4a', 10) + path('M34,-40 q30,0 30,20 q0,20 -30,20', 'none', 6), 'translate(640 1336)'),
    cam: { fx: 540, fy: 1150, s0: 1.0, s1: 1.04 },
    grade: { tint: '#e0b070', tintOp: 0.12, lift: '#fff4d8', liftOp: 0.08, vignette: 0.45 },
  },
  {
    // 14. Папа крупно: бровь вверх.
    name: 'dad',
    bg: '#d9cdb5',
    svg: wallFloor('#d9cdb5', '#b9a98e', 1500) + g(windowFrame(380, 260, 320, 420, '#bcd8e8'), '', 'filter="url(#blur14)"') + g(sweaterBust() + dadHead('skeptic', [-8, 0]), 'translate(540 980) scale(2.6)'),
    cam: { fx: 540, fy: 980, s0: 1.0, s1: 1.04 },
    grade: { tint: '#e0b070', tintOp: 0.12, vignette: 0.5 },
  },
  {
    // 15. В машине: папа за рулём, сын показывает вперёд — «тут главная». Папа удивлён.
    name: 'car',
    bg: '#9fb4c2',
    svg:
      rect(-200, -200, W + 400, H + 400, '#3c3f45', 0, 0) +
      g(rect(-200, 300, 1500, 1100, '#cfe0ea', 0, 0) + g(sweaterBust() + dadHead('smile', [-10, -4]), 'translate(780 980) scale(1.25)') + g(hoodieBust() + heroHead('smile', [-10, -4]) + tube('M-120,200 L-230,20 L-260,-120', COL.hoodie, 46) + g(palm(24), 'translate(-260 -120)'), 'translate(380 1000) scale(1.15)') + g(path('M-150,0 A150,150 0 1 0 150,0 A150,150 0 1 0 -150,0 M-120,0 H120', 'none', 22, `stroke="${OL}"`) + path('M-150,0 A150,150 0 1 0 150,0 A150,150 0 1 0 -150,0', 'none', 12, 'stroke="#555"'), 'translate(760 1420)'), '', 'clip-path="url(#ws15)"') +
      `<clipPath id="ws15"><path d="M80,420 Q540,330 1000,420 L1060,1500 H20 Z"/></clipPath>` +
      path('M80,420 Q540,330 1000,420 L1060,1500 H20 Z', 'none', 12) +
      g(mainRoadSign(0, 0, 1.4), 'translate(110 520)', 'filter="url(#blur6)"') +
      rect(-200, 1500, W + 400, 700, '#2f3237', 0, 6),
    cam: { fx: 540, fy: 1000, s0: 1.0, s1: 1.05 },
    grade: { tint: '#e0b070', tintOp: 0.1, lift: '#fff4d8', liftOp: 0.08, vignette: 0.5 },
  },
  {
    // 16. Календарь: дни зачёркиваются один за другим.
    name: 'calendar-flip',
    bg: '#cfc6b3',
    svg: rect(-200, -200, W + 400, H + 400, '#cfc6b3', 0, 0) + g(calendar(9, 18), 'translate(540 960)'),
    cam: { fx: 540, fy: 1000, s0: 1.12, s1: 1.18 },
    grade: { tint: '#e0b070', tintOp: 0.12, vignette: 0.45 },
    anim: (t0, t1) => `tl.to('.s15 .xday', { opacity: 0.75, duration: 0.02, stagger: ${((t1 - t0 - 0.1) / 18).toFixed(3)} }, ${t0});`,
  },
  {
    // 17. Экран: карта района, точки одна за другой зелёные.
    name: 'phone-map',
    bg: '#7d6f5e',
    svg: rect(-200, -200, W + 400, H + 400, '#6a5a4e', 0, 0) + g(phone(560, 1040, gameScreen(560, 1040, { map: true })), 'translate(540 960)'),
    cam: { fx: 540, fy: 960, s0: 1.0, s1: 1.08 },
    grade: { tint: '#e0a060', tintOp: 0.18, vignette: 0.55 },
    anim: (t0, t1) => `tl.from('.s16 .mapchk', { opacity: 0, scale: 0.3, transformOrigin: '50% 50%', duration: 0.12, stagger: ${((t1 - t0 - 0.15) / 8).toFixed(3)} }, ${t0});`,
  },
  {
    // 18. Утро экзамена: у зеркала, собран и спокоен.
    name: 'mirror',
    bg: '#cfdde0',
    svg:
      rect(-200, -200, W + 400, H + 400, '#cfdde0', 0, 0) +
      Array.from({ length: 12 }, (_, r) => Array.from({ length: 8 }, (_, c) => rect(-60 + c * 160, -60 + r * 180, 160, 180, '#dbe7ea', 0, 2, 'stroke="#aebfc4"')).join('')).join('') +
      rect(170, 300, 740, 1060, '#b7cdd6', 30, 10) +
      g(rect(170, 300, 740, 1060, '#c9dde5', 30, 0) + g(hoodieBust() + heroHead('determined', [0, 0]), 'translate(540 900) scale(1.9)') + path('M300,420 L420,360 M320,520 L520,380', 'none', 10, 'stroke="#fff" opacity="0.5"'), '', 'clip-path="url(#mir)"') +
      `<clipPath id="mir"><rect x="170" y="300" width="740" height="1060" rx="30"/></clipPath>` +
      rect(140, 1380, 800, 70, '#f2f2ee', 12) +
      rect(-200, 1450, W + 400, 700, '#e9eef0', 0, 5),
    cam: { fx: 540, fy: 900, s0: 1.08, s1: 1.14 },
    grade: { lift: '#ffffff', liftOp: 0.08, vignette: 0.4 },
  },
  {
    // 19. Снова к зданию ГИБДД — теперь солнечно.
    name: 'sunny',
    bg: '#9fc8e6',
    svg:
      rect(-200, -200, W + 400, 1500, '#9fc8e6', 0, 0) +
      glow(900, 200, 500, 'glowY', 0.8) +
      g(ell(0, -180, 150, 190, '#6f9a5a') + rect(-16, -40, 32, 120, '#7a5a3a', 0, 4), 'translate(80 1240)') +
      gibdd(560, 1240, true) +
      rect(-200, 1240, W + 400, 900, '#c9c3b6', 0, 0) +
      g(
        body({
          head: backHead(),
          arms: ['M-72,-226 Q-96,-130 -80,-40', 'M72,-226 Q100,-140 92,-50'],
          legs: ['M-36,0 L-40,150 L-44,290', 'M36,0 L44,130 L40,260'],
        }),
        'translate(540 1700) scale(0.9)',
        'id="w19"',
      ),
    cam: { fx: 540, fy: 1100, s0: 1.0, s1: 1.04 },
    grade: { tint: '#f0c070', tintOp: 0.12, lift: '#fff6d8', liftOp: 0.12, vignette: 0.35 },
    anim: (t0, t1) => `tl.fromTo('#w19', { y: 40, scale: 1, transformOrigin: '50% 100%' }, { y: -70, scale: 0.9, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
  },
  {
    // 20. Экзамен идёт: вопрос за вопросом, клетки зеленеют.
    name: 'exam-run',
    bg: '#2a313b',
    svg: monitorShot('run', cursor(620, 975, 'id="cur20"')),
    cam: { fx: 540, fy: 820, s0: 1.0, s1: 1.2 },
    grade: { tint: '#7d93b5', tintOp: 0.2, vignette: 0.7 },
    anim: (t0, t1) => {
      const step = (t1 - t0 - 0.3) / 20;
      let s = '';
      for (let i = 0; i < 20; i++) {
        const t = (t0 + 0.15 + i * step).toFixed(3);
        s += `tl.set('.s19 .qcell[data-i="${i}"]', { attr: { fill: '${COL.green}' } }, ${t}); tl.set('#qn', { textContent: '${Math.min(20, i + 2)}' }, ${t});`;
        s += `tl.to('#cur20', { y: ${[0, 62, 124][i % 3]}, duration: ${(step * 0.6).toFixed(3)}, ease: 'power1.inOut' }, ${(t0 + i * step).toFixed(3)});`;
      }
      return s;
    },
  },
  {
    // 21. «Экзамен сдан».
    name: 'pass',
    bg: '#3a4a3e',
    svg: monitorShot('pass'),
    cam: { fx: 540, fy: 800, s0: 1.2, s1: 1.28 },
    grade: { lift: '#d8ffd8', liftOp: 0.06, vignette: 0.55 },
    anim: (t0) => `tl.fromTo('.s20 svg', { scale: 1.04, transformOrigin: '50% 45%' }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, ${t0});`,
  },
  {
    // 22. Лицо: не верит — и сияет.
    name: 'joy',
    bg: '#8d98a3',
    svg: examRoomBlur(false) + glow(540, 1000, 700, 'glowY', 0.55) + g(hoodieBust() + g(heroHead('surprise'), '', 'id="j1"') + g(heroHead('joy'), '', 'id="j2" opacity="0"'), 'translate(540 980) scale(2.5)'),
    cam: { fx: 540, fy: 1020, s0: 1.0, s1: 1.07 },
    grade: { tint: '#f0c070', tintOp: 0.12, lift: '#fff4d0', liftOp: 0.1, vignette: 0.5 },
    anim: (t0) => `tl.set('#j1', { opacity: 0 }, ${t0 + 0.7}); tl.set('#j2', { opacity: 1 }, ${t0 + 0.7});`,
  },
  {
    // 23. Выбегает на солнце, руки вверх; папа ждёт у машины.
    name: 'run-out',
    bg: '#9fc8e6',
    svg:
      rect(-200, -200, W + 400, 1500, '#9fc8e6', 0, 0) +
      gibdd(540, 1100, true) +
      rect(-200, 1100, W + 400, 900, '#c9c3b6', 0, 0) +
      g(carSide(0, 0, '#7a8c99'), 'translate(860 1330) scale(0.75)') +
      g(body({ head: dadHead('joy'), arms: ['M-72,-226 Q-90,-130 -80,-40', 'M72,-226 L150,-340 L170,-450'], legs: ['M-36,0 L-36,280', 'M36,0 L36,280'], coat: COL.dadSweater, coatShade: COL.dadSweaterShade }), 'translate(700 1240) scale(0.42)') +
      glow(900, 200, 600, 'glowW', 0.9) +
      g(
        body({
          head: heroHead('joy'),
          arms: ['M-72,-226 L-170,-360 L-190,-500', 'M72,-226 L170,-360 L190,-500'],
          legs: ['M-36,0 L-80,140 L-60,290', 'M36,0 L70,120 L120,220'],
        }),
        'translate(420 1560) scale(0.95)',
        'id="r23"',
      ),
    cam: { fx: 540, fy: 1150, s0: 1.0, s1: 1.05 },
    grade: { tint: '#f0c070', tintOp: 0.12, lift: '#fff6d8', liftOp: 0.15, vignette: 0.35 },
    anim: (t0) => `tl.fromTo('#r23', { y: -60, scale: 0.85, transformOrigin: '50% 100%' }, { y: 40, scale: 1.02, duration: 0.9, ease: 'power2.out' }, ${t0}); tl.to('#r23', { y: 20, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, ${t0 + 0.9});`,
  },
  {
    // 24. Папа обнимает. Тёплый контровой свет, пылинки.
    name: 'hug',
    bg: '#d8a060',
    svg:
      rect(-200, -200, W + 400, H + 400, '#c98f58', 0, 0) +
      glow(860, 500, 700, 'glowY', 1) +
      glow(860, 500, 300, 'glowW', 0.8) +
      g(sweaterBust(1.1) + dadHead('joy', [0, 0], true), 'translate(720 980) scale(2.0) rotate(8)') +
      g(hoodieBust() + heroHead('joy'), 'translate(360 1060) scale(2.0) rotate(-8)') +
      tube('M980,1500 Q620,1280 300,1480', COL.dadSweater, 110) +
      g(palm(52), 'translate(300 1480)') +
      Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 173) % 1080}" cy="${300 + ((i * 271) % 1400)}" r="${4 + (i % 4)}" fill="#fff4cf" opacity="0.8" class="mote"/>`).join(''),
    cam: { fx: 540, fy: 1050, s0: 1.0, s1: 1.07 },
    grade: { tint: '#f0b060', tintOp: 0.15, lift: '#fff0c0', liftOp: 0.12, vignette: 0.5 },
    anim: (t0, t1) => `tl.to('.s23 .mote', { y: -120, x: 40, duration: ${(t1 - t0).toFixed(2)}, ease: 'none', stagger: 0.02 }, ${t0});`,
  },
  {
    // 25. Едут домой на закате: сын в окне машины улыбается.
    name: 'drive',
    bg: '#f0a070',
    svg:
      rect(-200, -200, W + 400, 1500, '#f2a46e', 0, 0) +
      glow(540, 900, 700, 'glowY', 1) +
      `<circle cx="540" cy="980" r="140" fill="#ffe6a8"/>` +
      g(Array.from({ length: 9 }, (_, i) => rect(i * 150 - 100, 1150 - ((i * 83) % 260) - 120, 130, ((i * 83) % 260) + 120, '#a35a4a', 0, 0)).join(''), '', 'opacity="0.7"') +
      rect(-200, 1250, W + 400, 900, '#5e4a4a', 0, 0) +
      path('M-200,1450 H1300', 'none', 10, 'stroke="#e9d9b0" stroke-dasharray="70 60"') +
      g(carSide(0, 0, '#7a8c99') + g(heroHead('smile', [6, 0]), 'translate(110 -150) scale(0.42)') + g(dadHead('smile', [8, 0]), 'translate(-30 -158) scale(0.4)'), 'translate(540 1560) scale(1.5)', 'id="car25"'),
    cam: { fx: 540, fy: 1250, s0: 1.0, s1: 1.04 },
    grade: { tint: '#f09060', tintOp: 0.18, lift: '#ffd8a0', liftOp: 0.12, vignette: 0.45 },
    anim: (t0, t1) => `tl.fromTo('#car25', { x: -160 }, { x: 160, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
  },
  {
    // 26. Город сверху на закате — как карта в игре; жёлтая машина проезжает перекрёсток на зелёный.
    name: 'top',
    bg: '#7f8f62',
    svg: (() => {
      let s = rect(-400, -400, W + 800, H + 800, '#7f8f62', 0, 0);
      for (let i = -1; i < 6; i++) s += rect(-400, 160 + i * 420, W + 800, 130, '#5d5d64', 0, 0) + rect(60 + i * 420, -400, 130, H + 800, '#5d5d64', 0, 0);
      for (let i = -1; i < 6; i++) for (let j = -1; j < 4; j++) {
        const x = 230 + j * 420;
        const y = 330 + i * 420;
        s += rect(x, y, 220, 220, ['#c98f6a', '#d9c39a', '#a7b4bb', '#c7a7a0'][(i + j + 8) % 4], 8, 4) + rect(x + 14, y + 14, 220, 220, 'rgba(0,0,0,0.18)', 8, 0, 'style="mix-blend-mode:multiply"');
        if ((i + j) % 3 === 0) s += ell(x + 200, y + 220, 46, 46, '#5f8a4c', 4);
      }
      for (let k = 0; k < 6; k++) s += rect(70 + 420 + 6, 600 + k * 30, 14, 18, '#efeee6', 0, 0);
      s += g(rect(-28, -50, 56, 100, '#f2c230', 14, 4) + rect(-20, -28, 40, 26, '#3a4a5a', 4, 0), 'translate(545 1300)', 'id="topcar"');
      return s;
    })(),
    cam: { fx: 540, fy: 900, s0: 1.35, s1: 1.0 },
    grade: { tint: '#f0a060', tintOp: 0.22, lift: '#ffd8a0', liftOp: 0.1, vignette: 0.5 },
    anim: (t0, t1) => `tl.fromTo('#topcar', { y: 300 }, { y: -700, duration: ${(t1 - t0).toFixed(2)}, ease: 'none' }, ${t0});`,
  },
];

export { H, W };
