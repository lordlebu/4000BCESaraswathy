// What the player knows, and what that lets them do.
//
// Canon says what CAN be known; this is the other half — how far a particular player has
// got. Every rule about advancing a rung, answering a question or gathering someone at the
// end lives here, so the UI can ask questions rather than compute them.
//
// Free of React, Phaser and storage: `save.ts` persists a Journey, this reasons about one.
// That keeps the rules testable under plain Node and keeps the interface honest — a panel
// that wants to know whether a discovery can advance calls `canAdvance`, and does not
// reimplement the ladder.

import {
  type Discovery,
  type FieldQuestion,
  type Resolution,
  discoveries,
  discovery,
  fieldQuestion,
  lastRung,
  vocabulary,
  word
} from './content/knowledge';
import { type Line, npc, npcs, poi } from './content/places';
import { recipe } from './content/making';
import { type Satchel, canDo, count, emptySatchel, remove } from './content/satchel';
import { type Bench, openGround } from './content/crafting';
import { type Step, plan, runPlan } from './content/making-chain';

/** Where the world is, when a rung asks for a particular night or weather. */
export interface WorldMoment {
  timeOfDay: string;
  weather: string;
}

/**
 * What the player has got to.
 *
 * `rungs` maps a discovery id to the highest rung reached. Absent means unknown — rung 0 is
 * "noticed but not understood", which is a real state and distinct from never having seen it.
 */
export interface Progress {
  rungs: Record<string, number>;
  words: string[];
  /**
   * Recipes somebody showed the player how to make.
   *
   * Only the ones that had to be learned: a recipe canon gives no `taughtBy` is common
   * knowledge and is never listed here. So this is a short list, and an empty one is the
   * correct state for a player who has not talked to anybody — not an empty repertoire.
   */
  recipes: string[];
  /**
   * Recipes performed at least once, ever.
   *
   * Not derived from the satchel, and that is the whole reason it exists: the two things a
   * player makes *for other people* — Uma's mat, Pell's hawser — are handed over and gone, so
   * a keepsake that read the satchel would omit exactly the objects that mattered most. What
   * you did is not what you are still holding.
   */
  made: string[];
  /** Question id to the resolution index the player settled on. */
  answered: Record<string, number>;
  /**
   * Field questions the player has been handed.
   *
   * Separate from `answered`, because knowing a question is open is its own state and the
   * interesting part of the game happens between the two. Questions arrive from people.
   */
  questions: string[];
}

export const emptyProgress = (): Progress => ({
  rungs: {},
  words: [],
  recipes: [],
  made: [],
  answered: {},
  questions: []
});

/** The rung reached on a discovery, or -1 if it has never been noticed. */
export function rungOf(progress: Progress, id: string): number {
  return progress.rungs[id] ?? -1;
}

export function knowsWord(progress: Progress, id: string): boolean {
  return progress.words.includes(id);
}

/**
 * Whether the player can make this.
 *
 * True for anything common — canon says a recipe with no teacher is known from the first
 * step — and for anything somebody has since shown them. Note which way round the default
 * runs: silence in canon means *known* here, which is the opposite of how `requires` reads
 * and is deliberate. A making panel that starts empty teaches nobody that making exists.
 */
export function knowsRecipe(progress: Progress, id: string): boolean {
  const r = recipe(id);
  if (!r) return false;
  return r.taughtBy.length === 0 || progress.recipes.includes(id);
}

/** Whether the player has ever made this, whether or not they still hold it. */
export function hasMade(progress: Progress, recipeId: string): boolean {
  return progress.made.includes(recipeId);
}

export interface Crafted {
  progress: Progress;
  satchel: Satchel;
  /** The recipe performed, or null when nothing was. */
  made: string | null;
  /**
   * Every rung the chain ran, in order, ending with the one asked for.
   *
   * Empty when nothing was made. This is what the workshop prints -- *smelted the ore, poured
   * the ingot, cast the blade* -- and it is what keeps one click honest rather than magic: a
   * chain that silently consumes four materials is indistinguishable from a cheat, and one that
   * says what it did teaches the process it just spared you.
   */
  steps: Step[];
}

/**
 * Make something, and remember having made it.
 *
 * Both halves in one call, on the same reasoning as `hear`: `content/crafting.ts` owns whether
 * a recipe is possible and what it costs, and it must not learn what a `Progress` is — but a
 * caller left to record the making separately is a caller that will one day forget, and the
 * keepsake would quietly lose the object. So the composition lives here, where knowing and
 * carrying already meet.
 *
 * Refuses a recipe the player has not been shown, which `make` alone cannot check.
 */
export function craft(
  progress: Progress,
  satchel: Satchel,
  recipeId: string,
  bench: Bench = openGround()
): Crafted {
  // **The chain, not just the recipe.** Thirty-eight of eighty-two recipes need something else
  // made first, and asking a player to click each rung is the tedium that makes crafting a chore.
  // `plan` refuses a run it cannot finish whole, so this either does everything or nothing --
  // a half-made chain would spend materials and produce nothing, which is the worst outcome
  // available and has no undo.
  const run = plan(satchel, recipeId, bench, (id) => knowsRecipe(progress, id));
  if (run.blocked !== null || run.steps.length === 0) {
    return { progress, satchel, made: null, steps: [] };
  }

  // Every rung counts as made. The keepsake at the end lists what the player built, and a
  // chain that recorded only its last step would forget the four things it made on the way.
  let made = progress.made;
  for (const step of run.steps) {
    if (!made.includes(step.recipeId)) made = [...made, step.recipeId];
  }

  return {
    progress: made === progress.made ? progress : { ...progress, made },
    satchel: runPlan(satchel, run.steps, bench),
    made: recipeId,
    steps: run.steps
  };
}

/** Learn a recipe. Idempotent, and refuses one canon says nobody needs to teach. */
export function learnRecipe(progress: Progress, id: string): Progress {
  const r = recipe(id);
  if (!r || r.taughtBy.length === 0 || progress.recipes.includes(id)) return progress;
  return { ...progress, recipes: [...progress.recipes, id] };
}

/**
 * Whether a requirement is satisfied.
 *
 * Requirements name either a discovery — which must be fully understood, not merely
 * noticed — or a word, which is simply known or not.
 */
function holds(progress: Progress, requirement: string): boolean {
  if (requirement.startsWith('word_')) return knowsWord(progress, requirement);
  const d = discovery(requirement);
  if (!d) return false;
  return rungOf(progress, requirement) >= lastRung(d);
}

/**
 * Whether a requirement has been *observed* — seen closely enough to reason from.
 *
 * Deliberately weaker than `holds`, and the difference is the point. Climbing a rung asks
 * that what it stands on be understood. Forming a reading of a question asks only that the
 * player has looked: a hypothesis is built out of what you have seen, not out of what you
 * have finished. That is what lets the moon reading of the silver water be offered early and
 * be wrong, which is the whole shape of the mechanic.
 *
 * Rung 0 is "noticed in passing" and does not count; rung 1 is the first real look.
 */
function observed(progress: Progress, requirement: string): boolean {
  if (requirement.startsWith('word_')) return knowsWord(progress, requirement);
  return Boolean(discovery(requirement)) && rungOf(progress, requirement) >= 1;
}

function momentAllows(rungConditions: Discovery['rungs'][number]['conditions'], moment: WorldMoment | null): boolean {
  if (!rungConditions) return true;
  if (!moment) return false;
  const { timeOfDay, weather } = rungConditions;
  if (timeOfDay.length && !timeOfDay.includes(moment.timeOfDay)) return false;
  if (weather.length && !weather.includes(moment.weather)) return false;
  return true;
}

/**
 * Whether the next rung of a discovery is within reach right now.
 *
 * Three things can stop it: the ladder is finished, something it requires is not held, or
 * the world is not cooperating — a bloom that only shows on a still night after rain is not
 * available at noon, and saying so is the point rather than a limitation.
 */
export function canAdvance(
  progress: Progress,
  id: string,
  moment: WorldMoment | null = null,
  carrying: Satchel = emptySatchel()
): boolean {
  const d = discovery(id);
  if (!d) return false;
  const next = rungOf(progress, id) + 1;
  if (next > lastRung(d)) return false;
  const rung = d.rungs[next]!;
  return (
    rung.requires.every((r) => holds(progress, r)) &&
    momentAllows(rung.conditions, moment) &&
    hasTools(carrying, rung.needsTool)
  );
}

/**
 * Whether the traveller has what a rung asks them to be holding.
 *
 * `carrying` defaults to an empty satchel rather than being required, which keeps every
 * existing caller working and is honest for the twenty-five rungs that ask for nothing. The
 * six that do ask are all `cut`, `contain` or `carry` — never one of the four the kit already
 * affords, because a gate the player passes on their first step is not a gate.
 */
function hasTools(carrying: Satchel, needed: readonly string[]): boolean {
  // The early return is not decoration: this runs for every discovery on every tick, and all
  // but six rungs in the game ask for nothing.
  if (needed.length === 0) return true;
  return needed.every((n) => canDo(carrying, n));
}

/** Why the next rung is out of reach, for a UI that wants to say something useful. */
export function blockedBy(
  progress: Progress,
  id: string,
  moment: WorldMoment | null = null,
  carrying: Satchel = emptySatchel()
): string[] {
  const d = discovery(id);
  if (!d) return [];
  const next = rungOf(progress, id) + 1;
  if (next > lastRung(d)) return [];
  const rung = d.rungs[next]!;
  const missing = rung.requires.filter((r) => !holds(progress, r));
  if (!momentAllows(rung.conditions, moment)) missing.push('conditions');
  // Reported as `tool:cut` rather than as an id, because unlike everything else in this list
  // it is not a thing the player can go and look at — it is a thing they have to make.
  for (const need of rung.needsTool) {
    if (!canDo(carrying, need)) missing.push(`tool:${need}`);
  }
  return missing;
}

/** Advance a discovery by one rung if it can be. Returns a new Progress; never mutates. */
export function advance(
  progress: Progress,
  id: string,
  moment: WorldMoment | null = null,
  carrying: Satchel = emptySatchel()
): Progress {
  if (!canAdvance(progress, id, moment, carrying)) return progress;
  return { ...progress, rungs: { ...progress.rungs, [id]: rungOf(progress, id) + 1 } };
}

/** Learn a word. Words are the keys that open the Kia readings. */
export function learn(progress: Progress, wordId: string): Progress {
  if (!word(wordId) || knowsWord(progress, wordId)) return progress;
  return { ...progress, words: [...progress.words, wordId] };
}

export function knowsQuestion(progress: Progress, id: string): boolean {
  return progress.questions.includes(id);
}

/** The open questions the player is carrying, as entities. */
export function openQuestions(progress: Progress): FieldQuestion[] {
  return progress.questions
    .map((id) => fieldQuestion(id))
    .filter((q): q is FieldQuestion => q !== null);
}

/**
 * Take whatever a line hands over: a word, a question, or a discovery.
 *
 * A discovery arrives at rung 0 — noticed, not understood — which is what rung 0 has always
 * meant and why it is distinct from never having seen it. It bypasses that rung's conditions
 * deliberately: somebody told you, and being told is not the same as looking, which is exactly
 * the gap the rest of the ladder exists to close.
 *
 * Idempotent, so a player may re-hear a line without it meaning anything.
 */
function receive(progress: Progress, id: string): Progress {
  if (id.startsWith('word_')) return learn(progress, id);
  if (id.startsWith('recipe_')) return learnRecipe(progress, id);
  if (fieldQuestion(id)) {
    if (knowsQuestion(progress, id)) return progress;
    return { ...progress, questions: [...progress.questions, id] };
  }
  if (discovery(id) && rungOf(progress, id) < 0) {
    return { ...progress, rungs: { ...progress.rungs, [id]: 0 } };
  }
  return progress;
}

/**
 * What someone will say right now.
 *
 * Requirements are read as *observed* rather than finished. A person will talk about a thing
 * you have seen; making them wait until you have understood it would mean the word Thrali
 * gives could never be got, since the discovery it completes is the one he is waiting on.
 */
export function linesFor(
  progress: Progress,
  npcId: string,
  carrying: Satchel = emptySatchel()
): Line[] {
  const who = npc(npcId);
  if (!who) return [];
  return who.lines.filter(
    (l) =>
      l.requires.every((r) => observed(progress, r)) &&
      // A line with a price is not offered until it can be paid. Showing it greyed out would
      // be a shop; a person who has not been given anything simply has nothing to say yet.
      (l.costs === null || count(carrying, l.costs) > 0)
  );
}

/**
 * Hear one of them, and take what it gives.
 *
 * Indexed against the list `linesFor` returned, not against the NPC's full canon order, so a
 * caller cannot accidentally trigger a line the player has not unlocked.
 */
export interface Heard {
  progress: Progress;
  /** The satchel after any price was paid. The same object when nothing was owed. */
  satchel: Satchel;
  /** What was handed over, for a UI that wants to say so. Null when the line was free. */
  paid: string | null;
}

export function hear(
  progress: Progress,
  npcId: string,
  lineIndex: number,
  carrying: Satchel = emptySatchel()
): Heard {
  const line = linesFor(progress, npcId, carrying)[lineIndex];
  if (!line) return { progress, satchel: carrying, paid: null };
  // Both halves in one call, deliberately. A `pay` the caller has to remember beside `hear` is
  // the shape of the three mechanics this codebase has shipped with no caller — and a gift the
  // player keeps is worse than one they never gave, because it looks like it worked.
  return {
    progress: line.gives.reduce(receive, progress),
    satchel: line.costs ? remove(carrying, line.costs, 1) : carrying,
    paid: line.costs
  };
}

/**
 * Whether a line still has anything to hand over.
 *
 * The honest way to ask "has this been heard already?" without remembering that it was: a line
 * that gave you a word is spent once you hold the word. Deriving it keeps a list of prose out of
 * `Progress`, which is saved -- and a saved list of line texts would break the moment somebody
 * reworded a line.
 */
export function lineIsSpent(progress: Progress, line: Line): boolean {
  if (line.gives.length === 0) return false;
  return line.gives.every((g) => receive(progress, g) === progress);
}

/** Everything a person could still teach, for a UI that wants to show a lead. */
export function hasSomethingNew(progress: Progress, npcId: string): boolean {
  return linesFor(progress, npcId).some((l) => !lineIsSpent(progress, l));
}

/**
 * Whether the player has never spoken to this person.
 *
 * Drives the longer opening exchange: on a first meeting somebody introduces themselves in the
 * two or three lines their author gave them, and afterwards says the newest useful thing instead.
 *
 * **Derived, like everything else about a conversation.** A person has been met when something
 * they hand over has been taken, which is the same evidence `lineIsSpent` reads. The alternative
 * — a list of met people in `Progress` — is state that has to be saved, migrated and kept in step
 * with a bundle that can be re-exported underneath it.
 *
 * The one thing it cannot see is a person whose every line is free: nothing they say leaves a
 * trace, so every visit is a first meeting. That is Uma before a mat changes hands, and replaying
 * her introduction is the right behaviour anyway — she has nothing else to say yet.
 */
export function isFirstMeeting(progress: Progress, npcId: string): boolean {
  const who = npc(npcId);
  if (!who) return false;
  return !who.lines.some((l) => l.gives.length > 0 && lineIsSpent(progress, l));
}

/**
 * Whether a gated sub-location will open.
 *
 * Entry asks for understanding, not merely observation — the opposite of a conversation. The
 * stair is safe once you know how the tower fell, and having glanced at it is not that.
 */
export function canEnter(progress: Progress, poiId: string, subLocationId: string): boolean {
  const sub = poi(poiId)?.subLocations.find((s) => s.id === subLocationId);
  if (!sub) return false;
  return sub.requires.every((r) => holds(progress, r));
}

/** What is keeping the player out, as ids, for a UI that wants to say why. */
export function blockedFrom(progress: Progress, poiId: string, subLocationId: string): string[] {
  const sub = poi(poiId)?.subLocations.find((s) => s.id === subLocationId);
  if (!sub) return [];
  return sub.requires.filter((r) => !holds(progress, r));
}

/** What the diary currently reads for a discovery, or null if it has never been noticed. */
export function entryFor(progress: Progress, id: string): string | null {
  const d = discovery(id);
  const rung = rungOf(progress, id);
  if (!d || rung < 0) return null;
  return d.rungs[Math.min(rung, lastRung(d))]?.entry ?? null;
}

/**
 * Every entry the player has written for a discovery, oldest first.
 *
 * The diary keeps its crossings-out. A rung does not replace the one below it on the page —
 * it is written under it, and the earlier reading stays there struck through. That is the
 * whole progression system made visible: the player can see they thought the silver water was
 * the moon, and that they were wrong, without anyone telling them how the game works.
 *
 * The last element is the current reading; everything before it is superseded.
 */
export function entriesSoFar(progress: Progress, id: string): string[] {
  const d = discovery(id);
  const rung = rungOf(progress, id);
  if (!d || rung < 0) return [];
  return d.rungs.slice(0, Math.min(rung, lastRung(d)) + 1).map((r) => r.entry);
}

/** A discovery is finished when its ladder is climbed. */
export function isComplete(progress: Progress, id: string): boolean {
  const d = discovery(id);
  return Boolean(d) && rungOf(progress, id) >= lastRung(d!);
}

/**
 * The readings of a question the evidence currently supports.
 *
 * More than one can be reachable, and that is deliberate: the moon reading of the silver
 * water is available before the bloom is understood, is what the University would say, and
 * is wrong. A player who settles early should be able to be mistaken.
 *
 * Evidence counts as `observed` rather than `holds` — see above. Ordering still falls out on
 * its own without gating the early reading behind understanding: the sound reading of the
 * silver water names two discoveries where the moon reading names one, so a player who has
 * only stood at the water gets only the wrong answer, which is as it should be.
 */
export function availableResolutions(progress: Progress, questionId: string): Resolution[] {
  const q = fieldQuestion(questionId);
  if (!q) return [];
  return q.resolutions.filter((r) => r.requires.every((req) => observed(progress, req)));
}

/** Settle a question on one of its readings, right or wrong. */
export function answer(progress: Progress, questionId: string, resolutionIndex: number): Progress {
  const q = fieldQuestion(questionId);
  if (!q || !q.resolutions[resolutionIndex]) return progress;
  return { ...progress, answered: { ...progress.answered, [questionId]: resolutionIndex } };
}

/** Whether the reading the player settled on was the one that survives later evidence. */
export function answeredSoundly(progress: Progress, questionId: string): boolean | null {
  const chosen = progress.answered[questionId];
  if (chosen === undefined) return null;
  return fieldQuestion(questionId)?.resolutions[chosen]?.sound ?? null;
}

/**
 * The people the player could gather at the end.
 *
 * There is no roster and nothing separate is tracked: knowledge is how you help, so the
 * people you can gather are exactly those named by discoveries you finished — crossed with
 * whether they would come. Some would not. Bekh stays because somebody has to be there when
 * the rest go, and the ending is better for her refusing.
 */
export function gatherable(progress: Progress): string[] {
  const helped = new Set<string>();
  for (const d of discoveries) {
    if (!isComplete(progress, d.id)) continue;
    for (const who of d.helps) helped.add(who);
  }
  return npcs.filter((n) => n.wouldSettle && helped.has(n.id)).map((n) => n.id);
}

/**
 * The people you helped who will not come with you.
 *
 * The counterpart to `gatherable`, and not an afterthought: four of the ten people in the game
 * refuse, each for a different reason, and the ending is better for every one of them. Bekh
 * stays because somebody has to be there when the rest go. Pell because the wall is never
 * finished and that is not an argument for stopping. Teshk because the rope needs two people
 * and there are not two to spare. Okhi because eleven thousand volumes still need copying.
 *
 * A refusal is only reachable once you have actually helped them — you cannot be turned down
 * by someone you never did anything for.
 */
export function staying(progress: Progress): string[] {
  const helped = new Set<string>();
  for (const d of discoveries) {
    if (!isComplete(progress, d.id)) continue;
    for (const who of d.helps) helped.add(who);
  }
  return npcs.filter((n) => !n.wouldSettle && helped.has(n.id)).map((n) => n.id);
}

/** What the player has put back. The endgame settlement is built out of these. */
export function restored(progress: Progress): string[] {
  const out = new Set<string>();
  for (const d of discoveries) {
    if (isComplete(progress, d.id)) for (const r of d.restores) out.add(r);
  }
  return [...out];
}

/** Progress per discipline, for the knowledge tree. Counts rungs, not discoveries. */
export function disciplineProgress(progress: Progress): Record<string, { climbed: number; total: number }> {
  const out: Record<string, { climbed: number; total: number }> = {};
  for (const d of discoveries) {
    const bucket = (out[d.discipline] ??= { climbed: 0, total: 0 });
    bucket.total += d.rungs.length;
    bucket.climbed += Math.max(0, rungOf(progress, d.id) + 1);
  }
  return out;
}

/** Words held, grouped by language. Fluency is emergent rather than a level. */
export function languagesKnown(progress: Progress): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of vocabulary) {
    if (knowsWord(progress, w.id)) out[w.language] = (out[w.language] ?? 0) + 1;
  }
  return out;
}

export type { Discovery, FieldQuestion };
