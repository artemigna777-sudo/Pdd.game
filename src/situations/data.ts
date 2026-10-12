import { provocationSituation, type Provocation, type Situation } from './types.ts';

let cache: Promise<Situation[]> | undefined;
let provoke: Promise<Situation[]> | undefined;

/** Ситуации режима «Ситуации на дороге» (отдельный файл сборки, как и вопросы). */
export function loadSituations(): Promise<Situation[]> {
  cache ??= Promise.all([import('../../data/situations/s07-09.json'), import('../../data/situations/s10-13.json')]).then((parts) =>
    parts.flatMap((m) => m.default as unknown as Situation[]),
  );
  return cache;
}

/** «Провокации инспектора» в виде ситуаций с вариантами «Выполняю» и «Нельзя». */
export function loadProvocations(): Promise<Situation[]> {
  provoke ??= import('../../data/situations/provoke/provocations.json').then((m) => (m.default as unknown as Provocation[]).map(provocationSituation));
  return provoke;
}
