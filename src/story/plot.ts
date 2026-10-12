/**
 * Сюжет как в RPG (этап 17): развилки, отношения с героями, характер водителя и концовки.
 *
 * Выборы меняют историю, героев и концовку, но не вопросы: все вопросы базы встречаются в тех
 * же точках, главы открываются по очереди, а финал по-прежнему требует всех верных ответов.
 *
 * В сохранении хранятся только сами решения (`StoryState.choices`). Отношения и характер
 * каждый раз считаются заново из решений и выполненных поручений — поэтому «Вернуть решение»
 * просто меняет одно решение, и всё остальное пересчитывается само.
 */
import type { CharacterId, Choice, Line } from './story.ts';

export type HeroId = Exclude<CharacterId, 'narrator'>;
export const HEROES: HeroId[] = ['victor', 'marina', 'sokolov', 'galina', 'artem', 'semyon', 'anya', 'gena'];

/** Черты характера водителя: осторожность, отзывчивость, принципиальность. */
export type TraitId = 'careful' | 'kind' | 'honest';
export const TRAITS: Record<TraitId, { title: string; icon: string; /** Как зовут водителя, у которого эта черта главная. */ who: string }> = {
  careful: { title: 'Осторожность', icon: '🛡', who: 'Осторожный водитель' },
  kind: { title: 'Отзывчивость', icon: '🤝', who: 'Отзывчивый водитель' },
  honest: { title: 'Принципиальность', icon: '⚖️', who: 'Принципиальный водитель' },
};
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** Сердечек у героя: от 0 до 5. С инструктором и диспетчером знакомы с пролога — у них по одному. */
export const HEARTS_MAX = 5;
export const BOND_START: Record<HeroId, number> = { victor: 1, marina: 1, sokolov: 0, galina: 0, artem: 0, semyon: 0, anya: 0, gena: 0 };
/** Шкала черты характера. */
export const TRAIT_MAX = 10;
/** «Вернуть решение»: переиграть последнюю большую развилку. */
export const REWIND_PRICE = 200;

/** Условие: от него зависит, будет ли реплика, развилка, вариант ответа или концовка. */
export type Cond =
  /** Решение принято (и, если указано, выбран один из вариантов). */
  | { decided: string; is?: string | readonly string[] }
  /** Сердечек у героя не меньше `min` и не больше `max`. */
  | { bond: HeroId; min?: number; max?: number }
  /** У всех героев не меньше N сердечек. */
  | { bondsAll: number }
  | { trait: TraitId; min: number }
  /** Все черты не меньше N. */
  | { traitsAll: number }
  /** Поручение главы выполнено. */
  | { helped: string }
  | { all: readonly Cond[] }
  | { any: readonly Cond[] }
  | { not: Cond };

/** Что меняет выбор: сердечки героев и черты характера (можно и в минус). */
export interface Effect {
  bonds?: Partial<Record<HeroId, number>>;
  traits?: Partial<Record<TraitId, number>>;
}

export interface DecisionOption {
  value: string;
  label: string;
  /** Вариант есть, только если условие выполнено (например, Артём доверяет игроку). */
  when?: Cond;
  reply?: Line[];
  effect?: Effect;
  /** Коротко, что выбрано: для итогов и «Вернуть решение». */
  summary: string;
}

/** Сюжетные сцены главы, в которых бывают развилки. */
export type StoryScene = 'intro' | 'beat1' | 'beat2' | 'ready' | 'finale';

export interface Decision {
  /** `ch3.artem` — глава и короткое имя. */
  id: string;
  chapter: string;
  scene: StoryScene;
  /** Большая развилка (главы 3, 6, 9): меняет сцены, задания и концовку; её можно вернуть за монеты. */
  big?: boolean;
  /** Развилка бывает, только если условие выполнено. */
  when?: Cond;
  /** Вопрос развилки одной строкой — для итогов и «Вернуть решение». */
  title: string;
  /** Реплики перед выбором; последняя — сам вопрос, после неё кнопки. */
  lines: Line[];
  options: DecisionOption[];
}

export interface Ending {
  id: string;
  title: string;
  icon: string;
  /** Подсказка в галерее, пока концовка не открыта. */
  hint: string;
  /** Без условия — концовка по умолчанию (последняя в списке). */
  when?: Cond;
  lines: Line[];
}

/** Сохранённое состояние сюжета. */
export interface StoryState {
  /** Решения по порядку: какая развилка, что выбрано, когда. */
  choices: { id: string; value: string; at: number }[];
  /** Открытые концовки: id → когда открыта. */
  endings: Record<string, number>;
  /** Сколько раз возвращали решение. */
  rewinds: number;
}

export function emptyStory(): StoryState {
  return { choices: [], endings: {}, rewinds: 0 };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Только корректное из сохранения. Незнакомые развилки и концовки не мешают: их пропускает подсчёт. */
export function sanitizeStory(raw: unknown): StoryState | undefined {
  if (!isObj(raw)) return undefined;
  const story = emptyStory();
  if (Array.isArray(raw.choices)) {
    const byId = new Map<string, StoryState['choices'][number]>();
    for (const c of raw.choices) {
      if (!isObj(c) || typeof c.id !== 'string' || typeof c.value !== 'string' || !isInt(c.at)) continue;
      byId.delete(c.id);
      byId.set(c.id, { id: c.id, value: c.value, at: c.at });
    }
    story.choices = [...byId.values()];
  }
  if (isObj(raw.endings)) for (const [id, at] of Object.entries(raw.endings)) if (isInt(at)) story.endings[id] = at;
  if (isInt(raw.rewinds)) story.rewinds = raw.rewinds;
  return story;
}

// ─── Подсчёт: отношения, характер, условия ──────────────────────────────────────

/** Всё, от чего зависит сюжет в данный момент. */
export interface PlotContext {
  decisions: Record<string, string>;
  /** Главы, где поручение выполнено. */
  helped: string[];
  bonds: Record<HeroId, number>;
  traits: Record<TraitId, number>;
}

/** Откуда сюжет берёт данные: развилки и кто давал поручения в главах. */
export interface PlotSource {
  decisions: readonly Decision[];
  /** Глава → кто давал поручение (за выполненное — сердечко). */
  givers: Readonly<Record<string, CharacterId>>;
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

/** Выбор, если он есть среди вариантов развилки (иначе решение не считается: данные могли измениться). */
function chosenOption(source: PlotSource, id: string, value: string): { decision: Decision; option: DecisionOption } | undefined {
  const decision = source.decisions.find((d) => d.id === id);
  const option = decision?.options.find((o) => o.value === value);
  return decision && option ? { decision, option } : undefined;
}

export function plotContext(story: StoryState | undefined, helped: readonly string[], source: PlotSource): PlotContext {
  const bonds = { ...BOND_START };
  const traits: Record<TraitId, number> = { careful: 0, kind: 0, honest: 0 };
  const decisions: Record<string, string> = {};
  for (const c of story?.choices ?? []) {
    const found = chosenOption(source, c.id, c.value);
    if (!found) continue;
    decisions[c.id] = c.value;
    for (const [h, v] of Object.entries(found.option.effect?.bonds ?? {})) bonds[h as HeroId] += v ?? 0;
    for (const [t, v] of Object.entries(found.option.effect?.traits ?? {})) traits[t as TraitId] += v ?? 0;
  }
  for (const chapter of helped) {
    const giver = source.givers[chapter];
    if (giver && giver !== 'narrator') bonds[giver]++;
  }
  for (const h of HEROES) bonds[h] = clamp(bonds[h], HEARTS_MAX);
  for (const t of TRAIT_IDS) traits[t] = clamp(traits[t], TRAIT_MAX);
  return { decisions, helped: [...helped], bonds, traits };
}

export function check(cond: Cond | undefined, ctx: PlotContext): boolean {
  if (!cond) return true;
  if ('decided' in cond) {
    const value = ctx.decisions[cond.decided];
    if (value === undefined) return false;
    if (cond.is === undefined) return true;
    return typeof cond.is === 'string' ? cond.is === value : cond.is.includes(value);
  }
  if ('bond' in cond) {
    const v = ctx.bonds[cond.bond];
    return v >= (cond.min ?? 0) && v <= (cond.max ?? HEARTS_MAX);
  }
  if ('bondsAll' in cond) return HEROES.every((h) => ctx.bonds[h] >= cond.bondsAll);
  if ('trait' in cond) return ctx.traits[cond.trait] >= cond.min;
  if ('traitsAll' in cond) return TRAIT_IDS.every((t) => ctx.traits[t] >= cond.traitsAll);
  if ('helped' in cond) return ctx.helped.includes(cond.helped);
  if ('all' in cond) return cond.all.every((c) => check(c, ctx));
  if ('any' in cond) return cond.any.some((c) => check(c, ctx));
  return !check(cond.not, ctx);
}

/** Характер одной строкой: главная черта, «Уравновешенный водитель» при равенстве, «Новичок» без решений. */
export function characterTitle(traits: Record<TraitId, number>): string {
  const top = Math.max(...TRAIT_IDS.map((t) => traits[t]));
  if (top < 2) return 'Новичок за рулём';
  const leaders = TRAIT_IDS.filter((t) => traits[t] === top);
  return leaders.length === 1 ? TRAITS[leaders[0]].who : 'Уравновешенный водитель';
}

// ─── Сцены с развилками ────────────────────────────────────────────────────────

/** Реплики, условия которых выполнены (и так же — в ответах на выбор). */
export function resolveLines(lines: readonly Line[], ctx: PlotContext): Line[] {
  return lines
    .filter((l) => check(l.if, ctx))
    .map((l) => (l.choices ? { ...l, choices: l.choices.map((c) => (c.reply ? { ...c, reply: resolveLines(c.reply, ctx) } : c)) } : l));
}

/** Развилка в виде реплик: последняя — вопрос с кнопками, у неё `decision`, чтобы выбор записался. */
export function decisionLines(d: Decision, ctx: PlotContext): Line[] {
  const options = d.options.filter((o) => check(o.when, ctx));
  const lines = resolveLines(d.lines, ctx);
  const ask = lines.at(-1);
  if (!ask || !options.length) return [];
  const choices: Choice[] = options.map((o) => ({ label: o.label, value: o.value, ...(o.reply ? { reply: resolveLines(o.reply, ctx) } : {}) }));
  return [...lines.slice(0, -1), { ...ask, choices, decision: d.id }];
}

/** Развилки сцены, которые ещё не решены и условия которых выполнены. */
export function pendingDecisions(chapter: string, scene: StoryScene, ctx: PlotContext, source: PlotSource): Decision[] {
  return source.decisions.filter((d) => d.chapter === chapter && d.scene === scene && ctx.decisions[d.id] === undefined && check(d.when, ctx));
}

/** Сцена главы целиком: реплики по условиям, потом развилки этой сцены. */
export function sceneLines(chapter: string, scene: StoryScene, base: readonly Line[], ctx: PlotContext, source: PlotSource): Line[] {
  return [...resolveLines(base, ctx), ...pendingDecisions(chapter, scene, ctx, source).flatMap((d) => decisionLines(d, ctx))];
}

/** Записать решение. Повторное решение той же развилки заменяет прежнее. false — нет такой развилки или варианта. */
export function decide(story: StoryState, id: string, value: string, now: number, source: PlotSource): boolean {
  if (!chosenOption(source, id, value)) return false;
  story.choices = story.choices.filter((c) => c.id !== id);
  story.choices.push({ id, value, at: now });
  return true;
}

// ─── Концовки и «Вернуть решение» ────────────────────────────────────────────────

/** Концовка по решениям и отношениям: первая подходящая по списку (последняя — по умолчанию). */
export function endingFor(ctx: PlotContext, endings: readonly Ending[]): Ending {
  return endings.find((e) => check(e.when, ctx)) ?? endings[endings.length - 1];
}

/** Открыть концовку (когда сдан экзамен-босс). Возвращает её и то, новая ли она. */
export function unlockEnding(story: StoryState, ctx: PlotContext, endings: readonly Ending[], now: number): { ending: Ending; fresh: boolean } {
  const ending = endingFor(ctx, endings);
  const fresh = story.endings[ending.id] === undefined;
  if (fresh) story.endings[ending.id] = now;
  return { ending, fresh };
}

/** Последняя принятая большая развилка — её можно переиграть. */
export function lastBigDecision(story: StoryState | undefined, source: PlotSource): { decision: Decision; value: string } | undefined {
  for (const c of [...(story?.choices ?? [])].reverse()) {
    const found = chosenOption(source, c.id, c.value);
    if (found?.decision.big) return { decision: found.decision, value: c.value };
  }
  return undefined;
}

/**
 * «Вернуть решение»: заменить выбор в последней большой развилке. Монеты списывает вызывающий
 * (`spendCoins`) — здесь только сюжет. false — переигрывать нечего или выбор тот же.
 */
export function rewindDecision(story: StoryState, value: string, now: number, source: PlotSource): boolean {
  const last = lastBigDecision(story, source);
  if (!last || last.value === value || !last.decision.options.some((o) => o.value === value)) return false;
  const entry = story.choices.find((c) => c.id === last.decision.id);
  if (!entry) return false;
  entry.value = value;
  entry.at = now;
  story.rewinds++;
  return true;
}

// ─── Проверка данных ─────────────────────────────────────────────────────────────

const SCENES: StoryScene[] = ['intro', 'beat1', 'beat2', 'ready', 'finale'];

/** Ошибки в данных сюжета: развилки, варианты, условия и концовки. Пустой список — всё в порядке. */
export function validatePlot(source: PlotSource, endings: readonly Ending[], chapters: readonly string[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Decision>();
  for (const d of source.decisions) {
    if (byId.has(d.id)) errors.push(`${d.id}: развилка повторяется`);
    byId.set(d.id, d);
    if (!chapters.includes(d.chapter)) errors.push(`${d.id}: нет главы ${d.chapter}`);
    if (!d.id.startsWith(`${d.chapter}.`)) errors.push(`${d.id}: id должен начинаться с «${d.chapter}.»`);
    if (!SCENES.includes(d.scene)) errors.push(`${d.id}: нет сцены ${d.scene}`);
    if (!d.lines.length) errors.push(`${d.id}: нет реплик`);
    if (d.options.length < 2) errors.push(`${d.id}: меньше двух вариантов`);
    if (new Set(d.options.map((o) => o.value)).size !== d.options.length) errors.push(`${d.id}: варианты повторяются`);
    // Хотя бы один вариант без условия: развилку нельзя «застрять» без кнопок.
    if (!d.options.some((o) => !o.when)) errors.push(`${d.id}: у всех вариантов есть условия`);
  }
  const refs = (cond: Cond | undefined, where: string): void => {
    if (!cond) return;
    if ('decided' in cond) {
      const d = byId.get(cond.decided);
      if (!d) errors.push(`${where}: нет развилки ${cond.decided}`);
      const values = cond.is === undefined ? [] : typeof cond.is === 'string' ? [cond.is] : cond.is;
      for (const v of values) if (d && !d.options.some((o) => o.value === v)) errors.push(`${where}: у ${cond.decided} нет варианта ${v}`);
    } else if ('helped' in cond) {
      if (!chapters.includes(cond.helped)) errors.push(`${where}: нет главы ${cond.helped}`);
    } else if ('all' in cond) cond.all.forEach((c) => refs(c, where));
    else if ('any' in cond) cond.any.forEach((c) => refs(c, where));
    else if ('not' in cond) refs(cond.not, where);
  };
  const lineRefs = (lines: readonly Line[], where: string) => {
    for (const l of lines) {
      refs(l.if, where);
      for (const c of l.choices ?? []) lineRefs(c.reply ?? [], where);
    }
  };
  for (const d of source.decisions) {
    refs(d.when, d.id);
    lineRefs(d.lines, d.id);
    for (const o of d.options) {
      refs(o.when, `${d.id}/${o.value}`);
      lineRefs(o.reply ?? [], `${d.id}/${o.value}`);
    }
  }
  const endingIds = new Set<string>();
  for (const [i, e] of endings.entries()) {
    if (endingIds.has(e.id)) errors.push(`концовка ${e.id} повторяется`);
    endingIds.add(e.id);
    if (!e.lines.length) errors.push(`концовка ${e.id}: нет реплик`);
    const last = i === endings.length - 1;
    if (last && e.when) errors.push(`концовка ${e.id}: последняя концовка — по умолчанию, без условия`);
    if (!last && !e.when) errors.push(`концовка ${e.id}: без условия может быть только последняя`);
    refs(e.when, `концовка ${e.id}`);
    lineRefs(e.lines, `концовка ${e.id}`);
  }
  return errors;
}

/** Все реплики, на которые ссылается проверка: для проверки текстов в тестах. */
export function plotLines(source: PlotSource, endings: readonly Ending[]): Line[] {
  const out: Line[] = [];
  const add = (lines: readonly Line[]) => {
    for (const l of lines) {
      out.push(l);
      for (const c of l.choices ?? []) add(c.reply ?? []);
    }
  };
  for (const d of source.decisions) {
    add(d.lines);
    for (const o of d.options) add(o.reply ?? []);
  }
  for (const e of endings) add(e.lines);
  return out;
}
