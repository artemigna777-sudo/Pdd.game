/**
 * Педали «Тормоз» и «Газ», спидометр и подсказка новичку перед нарушением (этап 8). Общие для
 * города (главы) и смены курьера (этап 13).
 */
import type { DriveInfo, RuleHint } from '../game/city/CityScene.ts';
import { el } from './dom.ts';

const HINTS: Record<RuleHint['kind'], (h: RuleHint) => string> = {
  'red-light': () => 'Впереди красный — тормозите до стоп-линии.',
  pedestrian: () => 'Пешеход на переходе — остановитесь и пропустите.',
  speeding: (h) => `Здесь можно ${h.kind === 'speeding' ? h.limit : 60} км/ч — сбавьте скорость.`,
  'no-stopping': (h) =>
    h.kind === 'no-stopping' ? `Здесь стоять нельзя (${{ crosswalk: 'переход', junction: 'перекрёсток', railway: 'переезд', zone: 'знак «Остановка запрещена»' }[h.place]}) — проезжайте.` : '',
  oncoming: () => 'Сплошная линия: разворот через неё — выезд на встречную. Потяните назад ещё раз, если всё-таки нужно.',
};

export interface DrivePanel {
  /** Педали и спидометр внизу экрана. */
  drive: HTMLElement;
  /** Подсказка новичку. */
  ruleHint: HTMLElement;
  /** Строка под спидометром («Чистая езда»). */
  clean: HTMLElement;
  /** Отпустить обе педали. */
  release(): void;
  showHint(h: RuleHint | undefined): void;
  /** Показания спидометра. */
  setReadout(info: DriveInfo): void;
}

export function drivePanel(setPedal: (kind: 'brake' | 'gas', on: boolean) => void, visible: boolean): DrivePanel {
  const pedal = (kind: 'brake' | 'gas', label: string) => {
    const b = el('button', { class: `pedal pedal--${kind}`, type: 'button', 'aria-label': label, 'aria-pressed': 'false' }, el('span', { class: 'pedal__label' }, label));
    const set = (on: boolean) => {
      b.setAttribute('aria-pressed', String(on));
      setPedal(kind, on);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        // Палец чуть сполз с кнопки — педаль всё ещё нажата.
        b.setPointerCapture(e.pointerId);
      } catch {
        // Синтетическое событие без настоящего указателя — захват не нужен.
      }
      set(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(ev, () => set(false));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return { el: b, release: () => set(false) };
  };
  const brake = pedal('brake', 'Тормоз');
  const gas = pedal('gas', 'Газ');
  const speed = el('span', { class: 'speedo__speed' }, '0');
  const limit = el('span', { class: 'speedo__limit', 'aria-label': 'Разрешённая скорость' }, '60');
  const clean = el('span', { class: 'speedo__clean' });
  const speedo = el('div', { class: 'speedo', role: 'status', 'aria-label': 'Спидометр' }, el('span', { class: 'speedo__row' }, speed, el('span', { class: 'speedo__unit' }, 'км/ч'), limit), clean);
  const drive = el('div', { class: 'drive', hidden: !visible }, brake.el, speedo, gas.el);
  const ruleHint = el('p', { class: 'rule-hint', hidden: true, 'aria-live': 'polite' });
  return {
    drive,
    ruleHint,
    clean,
    release() {
      brake.release();
      gas.release();
    },
    showHint(h) {
      ruleHint.hidden = !h;
      if (h) ruleHint.textContent = `💡 ${HINTS[h.kind](h)}`;
    },
    setReadout(info) {
      speed.textContent = String(info.kmh);
      limit.textContent = String(info.limit);
      speedo.classList.toggle('is-over', info.kmh > info.limit);
    },
  };
}
