// What the traveller is carrying.
//
// **A satchel, and deliberately not a survival system.** Things are gathered, carried,
// stacked and spent in recipes. There is no weight limit, no slot count, nothing that
// spoils, and no hunger. You can always walk home.
//
// That is a narrower reversal of `kit.ts` than it looks. The kit argued two things: that
// there should be no slots, and that consumables would import "the genre that comes with
// managing it" -- lamp oil running dry, a reason you *must* return to a settlement, a fail
// state wearing a resource bar. The first is reversed here and the second is not. Cooking
// and crafting are things a player chooses to do, and a player who never opens this panel
// finishes the game.
//
// `kit.ts` stays exactly as it was. The bedroll, lamp, diary and staff are still fixed,
// still unmanaged, and still there from the first step -- canon now has entities for all
// four, which is a record of what the game already carried rather than a change to it.
//
// Pure, immutable, and free of React and Phaser: `save.ts` persists a Satchel, this reasons
// about one. Same division as `journey.ts`, which is the file this one is shaped after.

import { item, material, nameOf } from './making';

/**
 * How many of each material and item is held, keyed by canon id.
 *
 * One record rather than two, because every rule that reads it -- can this recipe be made,
 * what does this cost -- treats them identically, and a recipe's ingredient list mixes both.
 * Ids carry their own type as a prefix, so nothing is ambiguous.
 */
export type Satchel = Record<string, number>;

export const emptySatchel = (): Satchel => ({});

/** How many of something is held. Zero for anything never picked up. */
export function count(satchel: Satchel, id: string): number {
  return satchel[id] ?? 0;
}

export function holds(satchel: Satchel, id: string, n = 1): boolean {
  return count(satchel, id) >= n;
}

/** Add to the satchel. Returns a new Satchel; never mutates. */
export function add(satchel: Satchel, id: string, n = 1): Satchel {
  if (n <= 0) return satchel;
  return { ...satchel, [id]: count(satchel, id) + n };
}

/**
 * Take from the satchel, down to zero and no further.
 *
 * A stack that reaches zero is removed rather than left at 0, so `Object.keys` is the list of
 * what is actually carried and a panel does not have to filter. This also keeps the saved
 * payload from growing a permanent entry for everything ever touched.
 */
export function remove(satchel: Satchel, id: string, n = 1): Satchel {
  const left = count(satchel, id) - n;
  const next = { ...satchel };
  if (left > 0) next[id] = left;
  else delete next[id];
  return next;
}

/** Everything held, as ids, in a stable order so a panel does not reshuffle on every render. */
export function carried(satchel: Satchel): string[] {
  return Object.keys(satchel).sort();
}

/** What is held that is a material, for a panel that groups the two. */
export function materialsHeld(satchel: Satchel): string[] {
  return carried(satchel).filter((id) => material(id) !== null);
}

/** What is held that is a made object. */
export function itemsHeld(satchel: Satchel): string[] {
  return carried(satchel).filter((id) => item(id) !== null);
}

/**
 * Everything held that lets a person do a particular thing.
 *
 * The satchel's half of the affordance idea: a process needs something that burns, and this
 * answers whether the traveller has one, without the process ever naming a lamp.
 */
export function affording(satchel: Satchel, affordance: string): string[] {
  return itemsHeld(satchel).filter((id) => item(id)?.affords.includes(affordance as never));
}

/**
 * Whether anything carried affords this.
 *
 * Deliberately **not** `affording(...).length > 0`, which is how it was written first and is
 * the obvious way. `affording` goes through `itemsHeld`, which sorts the whole satchel to
 * return a stable list for a panel — and this is called from `canAdvance`, which runs for
 * every discovery on every tick. Sorting a satchel to answer a yes/no question took the
 * conversation suite from four seconds to thirteen.
 */
export function canDo(satchel: Satchel, affordance: string): boolean {
  for (const id in satchel) {
    if (item(id)?.affords.includes(affordance as never)) return true;
  }
  return false;
}

/** A line a panel or the diary can print, e.g. "Reed fibre x4". */
export function describe(satchel: Satchel, id: string): string {
  const n = count(satchel, id);
  return n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id);
}

/** How many separate things are carried. Not a limit — there is none — just a count. */
export function distinct(satchel: Satchel): number {
  return Object.keys(satchel).length;
}
