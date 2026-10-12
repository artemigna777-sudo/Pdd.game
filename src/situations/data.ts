import type { Situation } from './types.ts';

let cache: Promise<Situation[]> | undefined;

/** Ситуации режима «Ситуации на дороге» (отдельный файл сборки, как и вопросы). */
export function loadSituations(): Promise<Situation[]> {
  cache ??= Promise.all([import('../../data/situations/s07-09.json'), import('../../data/situations/s10-13.json')]).then((parts) =>
    parts.flatMap((m) => m.default as unknown as Situation[]),
  );
  return cache;
}
