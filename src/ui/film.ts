/**
 * Проигрыватель анимированных сцен сюжета (`story/films.ts`, этап 18): SVG оживает анимациями
 * браузера, звуки — синтез, как у остальной игры. При «Уменьшить движение» сразу виден итоговый кадр.
 */
import { playSound } from '../audio/feedback.ts';
import { FILMS, type FilmId } from '../story/films.ts';

export interface FilmHandle {
  stop(): void;
}

const reduced = () => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Показать сцену в `host` (заменяет то, что там было). */
export function playFilm(host: HTMLElement, id: FilmId): FilmHandle {
  const film = FILMS[id];
  host.innerHTML = film.svg;
  host.dataset.film = id;
  host.setAttribute('aria-label', film.title);
  const anims: Animation[] = [];
  if (typeof Element.prototype.animate === 'function') {
    // Первая анимация свойства держит начальный кадр до своего начала (элемент ещё не появился);
    // следующие анимации того же свойства начинаются с того места, где кончилась предыдущая.
    const seen = new Set<string>();
    const steps = [...film.steps].sort((a, b) => a.at - b.at);
    for (const s of steps) {
      const props = Object.keys(s.kf[0]).filter((k) => k !== 'offset' && k !== 'easing');
      host.querySelectorAll<SVGElement>(s.sel).forEach((node, i) => {
        const keys = props.map((p) => `${s.sel}#${i}:${p}`);
        const fill: FillMode = keys.some((k) => seen.has(k)) ? 'forwards' : 'both';
        keys.forEach((k) => seen.add(k));
        anims.push(
          node.animate(s.kf, {
            delay: s.at * 1000,
            duration: s.dur * 1000,
            easing: s.ease ?? 'ease-out',
            iterations: s.times ?? 1,
            direction: s.alt ? 'alternate' : 'normal',
            fill,
          }),
        );
      });
    }
  }
  if (reduced()) {
    for (const a of anims) {
      if (a.effect?.getTiming().iterations === Infinity) a.cancel();
      else a.finish();
    }
    return { stop: () => anims.forEach((a) => a.cancel()) };
  }
  const timers = (film.sounds ?? []).map((s) => window.setTimeout(() => playSound(s.name), s.at * 1000));
  return {
    stop: () => {
      timers.forEach((t) => window.clearTimeout(t));
      anims.forEach((a) => a.cancel());
    },
  };
}
