/**
 * Эффекты после ответа в оформлении вопроса: частицы, штампы, облачка, «взрывы», тряска.
 * Слой эффектов лежит поверх карточки и не ловит касания. С настройкой телефона «Уменьшить
 * движение» — без анимации: только итоговая картинка, или ничего.
 */
import { ART, url, type FxCfg } from './looks.ts';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function div(cls: string, html?: string, text?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  if (html !== undefined) d.innerHTML = html;
  if (text !== undefined) d.textContent = text;
  return d;
}

function part(fx: HTMLElement, art: string, x: number, y: number, size: number): HTMLDivElement {
  const d = div('qpt', art);
  Object.assign(d.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
  fx.append(d);
  return d;
}

function play(d: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions): void {
  const a = d.animate(frames, opts);
  a.onfinish = () => d.remove();
}

interface Origin {
  x: number;
  y: number;
  w: number;
  h: number;
  opt: DOMRect;
  s: DOMRect;
}

function origin(screen: HTMLElement, opt: HTMLElement): Origin {
  const s = screen.getBoundingClientRect();
  const r = (opt.querySelector('.option__num') ?? opt).getBoundingClientRect();
  return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, w: s.width, h: s.height, opt: opt.getBoundingClientRect(), s };
}

/** Место под штамп справа в строке «Верно!» / «Неверно…». */
function feedbackBox(screen: HTMLElement): DOMRect {
  const f = screen.querySelector<HTMLElement>('.feedback');
  if (!f) return screen.getBoundingClientRect();
  f.classList.add('has-qstamp');
  return f.getBoundingClientRect();
}

/** Сыграть эффекты оформления после ответа. `screen` — карточка, `opt` — нажатый вариант. */
export function playEffects(screen: HTMLElement, cfgs: FxCfg | FxCfg[] | undefined, opt: HTMLElement): void {
  for (const cfg of ([] as FxCfg[]).concat(cfgs ?? [])) {
    try {
      one(screen, cfg, opt);
    } catch {
      // Эффект — украшение: ответ и пояснение уже на экране.
    }
  }
}

function one(screen: HTMLElement, cfg: FxCfg, opt: HTMLElement): void {
  if (cfg.kind === 'none') return;
  const fx = screen.querySelector<HTMLElement>('.qfx');
  if (!fx) return;
  const o = origin(screen, opt);
  const still = reduced();
  const parts = () => Array.from({ length: cfg.n ?? 0 }, (_, i) => cfg.parts![i % cfg.parts!.length]);
  const hold = (d: HTMLElement, frames: Keyframe[], ms = 2400) => d.animate(still ? [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }] : frames, { duration: ms, fill: 'forwards' });

  switch (cfg.kind) {
    case 'burst':
      if (still) return;
      for (const art of parts()) {
        const ang = rnd(0, Math.PI * 2);
        const dist = rnd(50, 140);
        const d = part(fx, art, o.x, o.y, rnd(12, 22));
        play(d, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist + 30}px)) scale(1) rotate(${rnd(-200, 200)}deg)`, opacity: 0 }], { duration: rnd(900, 1500), easing: 'cubic-bezier(.15,.7,.3,1)' });
      }
      return;
    case 'rise':
      if (still) return;
      parts().forEach((art, i) => {
        const d = part(fx, art, o.x + rnd(-20, 160), o.y, rnd(12, 24));
        const sway = rnd(-40, 40);
        play(d, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: `translate(calc(-50% + ${sway / 2}px), calc(-50% - 60px)) scale(1)`, opacity: 1, offset: 0.25 }, { transform: `translate(calc(-50% + ${sway}px), calc(-50% - ${rnd(160, 260)}px)) rotate(${rnd(-40, 40)}deg)`, opacity: 0 }], { duration: rnd(1400, 2200), delay: i * 60, easing: 'ease-out' });
      });
      return;
    case 'fall':
    case 'drop':
    case 'fallFrom': {
      if (still) return;
      const drop = cfg.kind === 'drop';
      const from = cfg.kind === 'fallFrom';
      parts().forEach((art, i) => {
        const sz = drop ? 30 : from ? 10 : rnd(12, 20);
        const x = drop ? o.x + i * 30 : from ? o.opt.left - o.s.left + rnd(20, o.opt.width - 20) : rnd(10, o.w - 10);
        const y0 = drop ? o.y : from ? o.opt.bottom - o.s.top : -10;
        const d = part(fx, art, x, y0, sz);
        play(d, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${from ? 0 : rnd(-30, 30)}px), calc(-50% + ${drop ? 160 : from ? 90 : o.h * 0.6}px)) rotate(${from ? 0 : rnd(-120, 120)}deg)`, opacity: 0 }], { duration: rnd(1200, 2000), delay: i * (from ? 140 : 110), easing: 'ease-in' });
      });
      return;
    }
    case 'medal': {
      if (still) return;
      const d = part(fx, ART.medal(), o.w - 56, -44, 64);
      d.style.height = '96px';
      play(d, [{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(-50%, calc(-50% + 96px))', offset: 0.25 }, { transform: 'translate(-50%, calc(-50% + 96px)) rotate(-6deg)', offset: 0.5 }, { transform: 'translate(-50%, calc(-50% + 96px)) rotate(4deg)', offset: 0.8 }, { transform: 'translate(-50%, calc(-50% + 76px))', opacity: 0 }], { duration: 2800, easing: 'ease-out' });
      return;
    }
    case 'stamp': {
      const s = div('qstamp', undefined, cfg.text ?? '');
      s.style.color = cfg.color ?? '#c8102e';
      if (cfg.bg) s.style.background = cfg.bg;
      if (cfg.font) s.style.fontFamily = cfg.font;
      if (cfg.at === 'option') Object.assign(s.style, { left: `${o.opt.right - o.s.left - 64}px`, top: `${o.opt.top - o.s.top - 2}px`, fontSize: '15px' });
      else {
        const f = feedbackBox(screen);
        Object.assign(s.style, { left: `${f.right - o.s.left - 64}px`, top: `${f.top - o.s.top + f.height / 2}px`, fontSize: '13px', whiteSpace: 'normal', width: '108px', textAlign: 'center', lineHeight: '1.15' });
      }
      fx.append(s);
      if (!still) s.animate([{ transform: 'translate(-50%,-50%) rotate(-8deg) scale(2.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.6,1)' });
      return;
    }
    case 'rocket': {
      if (still) return;
      const d = part(fx, ART.rocket(), o.w - 30, o.h + 40, 34);
      d.style.height = '52px';
      d.animate([{ transform: 'translate(-50%,-50%)' }, { transform: `translate(-50%, calc(-50% - ${o.h + 140}px))` }], { duration: 1700, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' }).onfinish = () => d.remove();
      for (let i = 0; i < 18; i++) {
        const y = o.h - i * (o.h / 18);
        const p = part(fx, ART.dot(i % 2 ? '#ffb703' : '#ff6b35'), o.w - 30 + rnd(-4, 4), y + 30, rnd(6, 11));
        play(p, [{ opacity: 0, transform: 'translate(-50%,-50%)' }, { opacity: 1, offset: 0.1 }, { opacity: 0, transform: `translate(calc(-50% + ${rnd(-14, 14)}px), calc(-50% + 30px)) scale(.3)` }], { duration: 900, delay: i * 85 });
      }
      return;
    }
    case 'salute':
      if (still) return;
      ([[o.w * 0.22, 60, '#ffd166'], [o.w * 0.55, 34, '#ef476f'], [o.w * 0.82, 80, '#ffffff'], [o.w * 0.4, 110, '#ffd166']] as const).forEach(([x, y, c], k) => {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const d = part(fx, ART.dot(c), x, y, 6);
          play(d, [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * 46}px), calc(-50% + ${Math.sin(a) * 46 + 18}px))`, opacity: 0 }], { duration: 1300, delay: k * 260, easing: 'cubic-bezier(.1,.8,.3,1)' });
        }
      });
      return;
    case 'bubble': {
      const b = div('qbubble', `<span class="qbubble__row"><span class="qbubble__icon">${ART[cfg.icon ?? 'whistle']?.() ?? ''}</span></span>`);
      b.querySelector('.qbubble__row')!.append(cfg.text ?? '');
      b.style.right = `${o.s.right - o.opt.right + 8}px`;
      b.style.top = `${o.opt.top - o.s.top - 22}px`;
      fx.append(b);
      hold(b, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.15 }, { transform: 'scale(1)', opacity: 1, offset: 0.25 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1)', opacity: 0 }]);
      return;
    }
    case 'mark': {
      const m = div('qhand', undefined, cfg.text ?? '');
      Object.assign(m.style, { left: '8px', top: `${o.opt.top - o.s.top + 4}px`, fontSize: '44px' });
      fx.append(m);
      if (!still) m.animate([{ opacity: 0, transform: 'scale(1.6) rotate(-12deg)' }, { opacity: 1, transform: 'scale(1) rotate(-6deg)' }], { duration: 360, fill: 'forwards' });
      if (cfg.check) {
        const c = div('qpt', ART.check());
        Object.assign(c.style, { left: `${o.x}px`, top: `${o.y - 4}px`, width: '42px', height: '34px' });
        fx.append(c);
      }
      return;
    }
    case 'receipt': {
      const f = feedbackBox(screen);
      const r = div('qbubble qreceipt', '<div class="qreceipt__head">КВИТАНЦИЯ</div><div class="qreceipt__sum">Штраф 0 ₽</div><div class="qreceipt__note">это понарошку</div>');
      r.style.top = `${f.top - o.s.top - 6}px`;
      fx.append(r);
      if (!still) r.animate([{ transform: 'translateY(30px) rotate(3deg)', opacity: 0 }, { transform: 'translateY(0) rotate(3deg)', opacity: 1 }], { duration: 450, easing: 'ease-out' });
      return;
    }
    case 'bat': {
      if (still) return;
      const d = part(fx, ART.bat(), -40, o.y, 64);
      d.style.height = '32px';
      play(d, [{ transform: 'translate(-50%,-50%) scale(.8)' }, { transform: `translate(calc(-50% + ${o.w * 0.5}px), calc(-50% - 50px)) scale(1.1)`, offset: 0.5 }, { transform: `translate(calc(-50% + ${o.w + 80}px), calc(-50% - 10px)) scale(.8)` }], { duration: 1600, easing: 'ease-in-out' });
      const im = screen.querySelector('.card__image')?.getBoundingClientRect();
      const b = div('qbubble', undefined, 'Бу!');
      Object.assign(b.style, im ? { left: `${im.right - o.s.left - 60}px`, top: `${im.top - o.s.top + 10}px` } : { right: '16px', top: '16px' });
      fx.append(b);
      b.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1800, fill: 'forwards' });
      return;
    }
    case 'coin': {
      const d = part(fx, ART.coin(), o.x, o.y - 10, 28);
      const l = div('qbubble qbubble--pixel', undefined, '+1');
      Object.assign(l.style, { left: `${o.x + 18}px`, top: `${o.y - 40}px` });
      fx.append(l);
      if (still) {
        d.remove();
        hold(l, [], 1400);
        return;
      }
      play(d, [{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(-50%, calc(-50% - 70px))', offset: 0.45 }, { transform: 'translate(-50%, calc(-50% - 40px))', opacity: 0 }], { duration: 900, easing: 'steps(8)' });
      l.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1400, fill: 'forwards' });
      return;
    }
    case 'pixlose': {
      const l = div('qbubble qbubble--pixel', `<span class="qbubble__row">−1 ${ART.pixHeart(true)}</span>`);
      Object.assign(l.style, { left: `${o.opt.right - o.s.left - 110}px`, top: `${o.opt.top - o.s.top - 22}px` });
      fx.append(l);
      hold(l, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-20px)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-26px)', opacity: 0 }], 1600);
      return;
    }
    case 'shake':
      if (!still) screen.animate([{ transform: 'translate(0)' }, { transform: 'translate(-7px, 2px)' }, { transform: 'translate(6px, -2px)' }, { transform: 'translate(-4px, 1px)' }, { transform: 'translate(2px, 0)' }, { transform: 'translate(0)' }], { duration: 420, easing: 'ease-out' });
      return;
    case 'glitch':
      if (!still) screen.animate([{ transform: 'translate(0)', filter: 'none' }, { transform: 'translate(-5px, 1px)', filter: 'hue-rotate(90deg) saturate(2)' }, { transform: 'translate(4px, -1px)', filter: 'none' }, { transform: 'translate(-2px, 0)', filter: 'hue-rotate(-70deg) contrast(1.4)' }, { transform: 'translate(0)', filter: 'none' }], { duration: 480, easing: 'steps(5)' });
      return;
    case 'pow': {
      const p = div('qpow', undefined, cfg.text ?? '');
      p.style.backgroundImage = url(ART.powShape(cfg.fill ?? '#ffd43b'));
      Object.assign(p.style, { left: `${o.opt.right - o.s.left - 66}px`, top: `${o.opt.top - o.s.top + 2}px` });
      fx.append(p);
      hold(p, [{ transform: 'translate(-50%,-50%) scale(.2) rotate(-30deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(-8deg)', opacity: 1, offset: 0.12 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.85 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 0 }]);
      return;
    }
    case 'yellowcard': {
      const d = part(fx, ART.ycard(), o.opt.right - o.s.left - 64, o.opt.top - o.s.top + o.opt.height / 2, 30);
      d.style.height = '42px';
      hold(d, [{ transform: 'translate(-50%,-50%) translateY(-70px) rotate(-40deg) scale(1.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(10deg)', opacity: 1, offset: 0.18 }, { transform: 'translate(-50%,-50%) rotate(10deg)', opacity: 1, offset: 0.85 }, { transform: 'translate(-50%,-50%) rotate(10deg)', opacity: 0 }]);
      return;
    }
    case 'plane': {
      if (still) return;
      const d = part(fx, ART.plane(), o.x, o.y, 44);
      d.style.height = '33px';
      play(d, [{ transform: 'translate(-50%,-50%) rotate(-6deg) scale(.5)', opacity: 0 }, { transform: 'translate(calc(-50% + 40px), calc(-50% - 16px)) rotate(-12deg) scale(1)', opacity: 1, offset: 0.18 }, { transform: `translate(calc(-50% + ${o.w * 0.45}px), calc(-50% - ${o.y * 0.35 + 20}px)) rotate(-4deg)`, offset: 0.55 }, { transform: `translate(calc(-50% + ${o.w + 40}px), calc(-50% - ${o.y + 60}px)) rotate(-28deg)`, opacity: 1 }], { duration: 1900, easing: 'ease-in' });
      return;
    }
    case 'meteor': {
      if (still) return;
      const tx = o.opt.right - o.s.left - 50;
      const ty = o.opt.bottom - o.s.top + 6;
      const d = part(fx, ART.meteor(), o.w + 40, -40, 46);
      const dx = o.w + 40 - tx;
      play(d, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% - ${dx}px), calc(-50% + ${ty + 40}px))`, opacity: 1, offset: 0.82 }, { transform: `translate(calc(-50% - ${dx}px), calc(-50% + ${ty + 40}px)) scale(1.8)`, opacity: 0 }], { duration: 950, easing: 'ease-in' });
      window.setTimeout(() => {
        for (let i = 0; i < 8; i++) {
          const a = Math.PI + (i / 7) * Math.PI;
          const p = part(fx, ART.dot('#8d8371'), tx, ty, 7);
          play(p, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * 36}px), calc(-50% + ${Math.sin(a) * 26}px))`, opacity: 0 }], { duration: 600, easing: 'ease-out' });
        }
        screen.animate([{ transform: 'translate(0)' }, { transform: 'translate(0, 5px)' }, { transform: 'translate(0, -3px)' }, { transform: 'translate(0)' }], { duration: 300 });
      }, 780);
      return;
    }
  }
}
