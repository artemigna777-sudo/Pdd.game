/**
 * Стили второй серии роликов (11–20). Как и в первой: почти без цвета, цветной только акцент.
 */
import type { Theme } from './engine.ts';

const MONT = "'Montserrat', sans-serif";
const SERIF = "'Liberation Serif', 'DejaVu Serif', serif";
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', monospace";
const GRAIN_D = 'url(grain-dark.png)';
const GRAIN_L = 'url(grain-light.png)';
const VIGNETTE = 'radial-gradient(75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)';

/** Старая бумага с тёмной печатью для кадров истории. */
const oldPaper = (labelFont: string, bg = '#e6e1d6') => ({
  bg,
  ink: '#1d1b18',
  fill: bg,
  accent: '#1d1b18',
  dark: false,
  stroke: 5,
  overlay: `${GRAIN_D}, ${VIGNETTE}`,
  font: MONT,
  labelBg: '#1d1b18',
  labelInk: '#efebe3',
  labelBorder: '#1d1b18',
  labelFont,
});

/** Светлые линии на тёмном для кадров истории. */
const darkPrint = (ink: string, accent: string, labelFont: string, bg = '#171615') => ({
  bg,
  ink,
  fill: bg,
  accent,
  dark: true,
  stroke: 5,
  overlay: `${GRAIN_L}, radial-gradient(75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)`,
  font: MONT,
  labelBg: ink,
  labelInk: bg,
  labelBorder: ink,
  labelFont,
});

export const THEMES2: Record<string, Theme> = {
  /** 11. Маркер на белой доске. */
  marker: {
    bg: 'radial-gradient(40% 20% at 30% 20%, rgba(0,0,0,0.035), transparent 70%), radial-gradient(30% 25% at 75% 70%, rgba(0,0,0,0.03), transparent 70%), #f6f6f3',
    ink: '#161616',
    fill: '#f6f6f3',
    accent: '#e63946',
    dark: false,
    stroke: 9,
    overlay: GRAIN_D,
    overlayBlend: 'multiply',
    font: MONT,
    cap: 'plain',
    capSize: 44,
    hist: oldPaper(SERIF),
  },
  /** 12. Театр теней: чёрные силуэты на закатном небе, цветной — только светофор. */
  silhouette: {
    bg: 'linear-gradient(#f4f0ea, #ddd5ca 62%, #c3bbaf)',
    ink: '#141414',
    fill: '#141414',
    accent: '#e5383b',
    dark: true,
    faceInk: '#f4f0ea',
    stroke: 8,
    overlay: GRAIN_D,
    overlayBlend: 'multiply',
    font: MONT,
    text: '#141414',
    cap: 'plain',
    decoCss: '.dcap span { text-shadow: none !important; }',
    hist: darkPrint('#ebe4d6', '#e5383b', SERIF),
  },
  /** 13. Наклейки: белые фигуры с белой каймой на графите. */
  sticker: {
    bg: 'radial-gradient(60% 45% at 50% 45%, #3a3e44, #24272b 85%)',
    ink: '#111',
    fill: '#ffffff',
    accent: '#ffd21f',
    dark: false,
    stroke: 6,
    lineFilter:
      'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 12px 10px rgba(0,0,0,0.45))',
    overlay: GRAIN_L,
    font: MONT,
    text: '#f4f4f4',
    cap: 'sticker',
    hist: oldPaper(SERIF, '#e9e4d8'),
  },
  /** 14. Нуар: кино в оттенках серого, субтитры и чёрные полосы. */
  noir: {
    bg: 'radial-gradient(70% 55% at 50% 48%, #3d3d3d, #0d0d0d 80%)',
    ink: '#ececec',
    fill: '#151515',
    accent: '#d62828',
    dark: true,
    stroke: 6,
    overlay: `${GRAIN_L}, ${VIGNETTE}`,
    font: MONT,
    cap: 'sub',
    capSize: 40,
    deco: '<div class="lbx lbt"></div><div class="lbx lbb"></div>',
    decoCss: '.lbx { position: absolute; left: 0; right: 0; height: 150px; background: #000; } .lbt { top: 0; } .lbb { bottom: 0; }',
    hist: oldPaper(SERIF, '#dad6ce'),
  },
  /** 15. Вышивка: линии — стежки нитками на льне, акцент — красная нитка. */
  stitch: {
    bg: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 6px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 2px, transparent 2px 7px), #ddd5c5',
    ink: '#2a2622',
    fill: '#e9e2d4',
    accent: '#c1121f',
    dark: false,
    stroke: 5,
    lineDash: '15 9',
    lineFilter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.28))',
    font: MONT,
    cap: 'patch',
    hist: darkPrint('#e9e2d4', '#c1121f', SERIF, '#1e1b18'),
  },
  /** 16. Трафарет баллончиком на бетоне, подписи — на малярном скотче. */
  stencil: {
    bg: 'radial-gradient(35% 25% at 25% 30%, rgba(0,0,0,0.08), transparent 70%), radial-gradient(30% 22% at 80% 75%, rgba(255,255,255,0.08), transparent 70%), #9c9c97',
    ink: '#141414',
    fill: '#a6a6a1',
    accent: '#ff6b1a',
    dark: false,
    stroke: 8,
    lineFilter: 'blur(0.9px) drop-shadow(0 0 2px rgba(0,0,0,0.35))',
    overlay: GRAIN_D,
    overlayBlend: 'multiply',
    font: MONT,
    cap: 'tape',
    decoCss: '.acc { text-shadow: 3px 3px 0 #111, -3px -3px 0 #111, 3px -3px 0 #111, -3px 3px 0 #111, 0 3px 0 #111, 0 -3px 0 #111, 3px 0 0 #111, -3px 0 0 #111; }',
    hist: { ...darkPrint('#e8e8e2', '#ff6b1a', MONT, '#1b1d1c'), labelBg: '#efe6c8', labelInk: '#111', labelBorder: '#efe6c8' },
  },
  /** 17. Светодиодное табло: линии из точек. */
  dots: {
    bg: 'radial-gradient(circle, rgba(255,255,255,0.07) 2px, transparent 2.6px) 0 0 / 18px 18px, #050608',
    ink: '#f4f4f4',
    fill: '#050608',
    accent: '#ffb000',
    dark: true,
    stroke: 9,
    lineDash: '0.1 17',
    lineFilter: 'drop-shadow(0 0 4px rgba(255,255,255,0.55))',
    font: MONO,
    cap: 'plain',
    capSize: 40,
    hist: oldPaper(MONO, '#e7e4da'),
  },
  /** 18. Пиксельный терминал: квадратные концы линий, моноширинный шрифт, строки развёртки. */
  pixel: {
    bg: '#0b0d10',
    ink: '#f0f0f0',
    fill: '#0b0d10',
    accent: '#3cff7a',
    dark: true,
    stroke: 7,
    lineCap: 'square',
    overlay: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 5px)',
    font: MONO,
    cap: 'term',
    capSize: 40,
    hist: { ...oldPaper(MONO, '#ecece6'), lineCap: 'square' },
  },
  /** 19. Тушь кистью на рисовой бумаге, красная печать. */
  sumi: {
    bg: 'radial-gradient(60% 45% at 50% 40%, #f7f3e9, #ebe4d4 90%)',
    ink: '#1a1a1a',
    fill: '#f3efe4',
    accent: '#c8102e',
    dark: false,
    stroke: 11,
    lineFilter: 'blur(0.5px)',
    overlay: GRAIN_D,
    overlayBlend: 'multiply',
    font: SERIF,
    cap: 'plain',
    capSize: 48,
    deco: '<div class="seal">ПДД</div>',
    decoCss: '.seal { position: absolute; right: 70px; bottom: 240px; width: 92px; height: 92px; border-radius: 10px; background: #c8102e; color: #f3efe4; font: 700 26px/92px serif; text-align: center; letter-spacing: 1px; opacity: 0.9; transform: rotate(4deg); }',
    hist: { ...darkPrint('#efe9dc', '#c8102e', SERIF, '#1b1b1b'), labelBg: '#c8102e', labelInk: '#fff', labelBorder: '#c8102e' },
  },
  /** 20. Домашняя видеокассета: строки развёртки, «REC», субтитры. */
  vhs: {
    bg: 'radial-gradient(70% 55% at 50% 45%, #26282c, #121315 85%)',
    ink: '#f2f2f2',
    fill: '#17181b',
    accent: '#ff3b30',
    dark: true,
    stroke: 6,
    lineFilter: 'blur(0.4px)',
    overlay: `repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px), ${GRAIN_L}`,
    font: MONT,
    cap: 'sub',
    capSize: 40,
    deco: '<div class="vhs rec"><b>●</b> REC</div><div class="vhs play">PLAY ▶</div><div class="vhs tc">SP 0:00:12</div>',
    decoCss:
      ".vhs { position: absolute; font: 700 38px 'DejaVu Sans Mono', monospace; color: #f2f2f2; text-shadow: 2px 2px 0 rgba(0,0,0,0.7); } .rec { left: 60px; top: 80px; } .rec b { color: #ff3b30; } .play { right: 60px; top: 80px; } .tc { left: 60px; bottom: 90px; font-size: 32px; }",
    hist: oldPaper(MONT, '#e2ded6'),
  },
};
