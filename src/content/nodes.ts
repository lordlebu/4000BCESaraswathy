// What a place has left, and when it will have it again.
//
// The first thing in this game that remembers a player *took* something. Everything else about a
// tile is derived — the biome from the seed, the species from the tile, what it yields from the
// species — and that is deliberate discipline rather than accident: `lineIsSpent` and `met()`
// both read `Progress` rather than storing lists of prose, because state you can recompute is
// state that cannot drift.
//
// Depletion cannot be derived. Two players on one seed standing on one tile differ precisely in
// what they have already taken, so this is the exception, and it is kept as small as an exception
// can be: **only the tiles somebody actually drew from are stored.** An untouched world costs
// nothing, which is what makes this affordable in a save keyed by seed.
//
// Pure and free of React and Phaser.

import { type Material, type Renewal } from './making';
import { yieldsAt } from './gathering';
import type { BiomeId, Point } from '../world/types';
import { tileHash } from '../world/rng';

/**
 * How long each renewal rate takes, in days.
 *
 * **Canon orders these and the game times them**, which is the split `renewal_rates.json`
 * states in its own note: canon says salt-crust returns faster than sandalwood and never says
 * in how many days, because the length of a day is a question about play. So these four numbers
 * are the game's, they are pacing rather than fact, and changing them needs no canon edit.
 *
 * Sized against the day the game actually has. `dayNight.ts` spends `DAY_MS` over about eighty
 * steps of ordinary walking, so three days is roughly a there-and-back across a field map: long
 * enough that a stripped reed bed is a thing you notice, short enough that noticing it is not a
 * punishment. Seven is a season's errand. Thirty is "not on this journey", which is what `slow`
 * means in canon's own gloss — a player will not see one of these return, and that is the point.
 */
export const DAYS_TO_RETURN: Record<Renewal, number | null> = {
  fast: 3,
  seasonal: 7,
  slow: 30,
  never: null
};

/**
 * How much a place holds before it is drawn down.
 *
 * Not a canon number: canon does not model a world's stock, and says so. Rarity is the honest
 * game-side proxy — a common reed bed is worth several visits and a mythic thing is one and done.
 *
 * The floor is 1 rather than 0, so a node that exists always gives at least once. A tile that
 * offers something and then refuses it is a bug wearing a mechanic's clothes.
 */
const STOCK: Record<string, number> = {
  common: 4,
  rare: 2,
  mythic: 1
};

/** A node the player has drawn from. Absent means untouched, which is the common case. */
export interface Drawn {
  /** How many are left. */
  left: number;
  /** The in-game day it was last taken from, so regrowth can be worked out from now. */
  day: number;
}

/** Every node a journey has touched, keyed by `x,y,materialId`. */
export type Nodes = Record<string, Drawn>;

export const noNodes = (): Nodes => ({});

/**
 * The key for one material on one tile.
 *
 * Per material rather than per tile, because a tile can hold three things and stripping the
 * reeds should not also strip the clay under them. That is the same reading `gather` already
 * takes when it picks up everything at once — the tile is a place with several things on it,
 * not a container with one.
 */
export function nodeKey(at: Point, materialId: string): string {
  return `${at.x},${at.y},${materialId}`;
}

/**
 * How much this node holds when full.
 *
 * Varied by tile so that two reed beds are not identical, and seeded so the variation is part of
 * the world rather than a throw: the same tile is always the better stand. Between the base and
 * base+2, so the shape of the number is legible — a good patch is visibly a good patch.
 */
export function capacityOf(seed: string, at: Point, m: Material): number {
  const base = STOCK[m.rarity] ?? STOCK.common!;
  return base + (tileHash(seed, at.x, at.y, `stock:${m.id}`) % 3);
}

/**
 * What this node holds right now, given how long it has had to come back.
 *
 * Regrowth is worked out from the day rather than ticked, which is the same reasoning `tileHash`
 * rests on: nothing has to be running for time to pass. A player who closes the tab for a week
 * of in-game days and returns finds the reeds back, and the game did not have to be watching.
 *
 * A `never` material does not come back. That is canon's word and it is honoured literally: a
 * fossil bed you have emptied is empty, and `check_playability.py` reports which of those sit in
 * one kind of ground precisely so this cannot strand somebody quietly.
 */
export function leftAt(
  nodes: Nodes,
  seed: string,
  at: Point,
  m: Material,
  today: number
): number {
  const full = capacityOf(seed, at, m);
  const drawn = nodes[nodeKey(at, m.id)];
  if (!drawn) return full;

  const days = DAYS_TO_RETURN[m.renews];
  if (days === null) return drawn.left;

  const back = Math.floor((today - drawn.day) / days);
  if (back <= 0) return drawn.left;
  return Math.min(full, drawn.left + back);
}

/**
 * One material and how many of it come up in a single stoop.
 *
 * A pair rather than a bare list, because "what is here" and "how much of it you get" became two
 * answers the moment a haul could vary -- and asking the second question twice, once to show the
 * player and once to take it, is how a UI ends up promising two reeds and handing over one.
 */
export interface Taking {
  material: Material;
  count: number;
}

/**
 * What is actually takeable here, after what has already been taken.
 *
 * The filter `gather` and every prompt should ask, rather than `yieldsAt` directly. The
 * distinction is the whole of this module: `yieldsAt` says what *grows* here and this says what
 * is *left*, and before nodes existed those were the same sentence.
 */
export function takeableAt(
  nodes: Nodes,
  seed: string,
  at: Point,
  biome: BiomeId,
  today: number
): Taking[] {
  const out: Taking[] = [];
  for (const material of yieldsAt(seed, at, biome)) {
    const left = leftAt(nodes, seed, at, material, today);
    if (left <= 0) continue;
    out.push({ material, count: handful(seed, at, material, today, left) });
  }
  return out;
}

/**
 * Draw one from each of the given materials, and say what the tile now holds.
 *
 * Returns a new `Nodes`; never mutates. A node that comes back to full is **deleted rather than
 * stored at full**, so a player who works a reed bed and returns a fortnight later leaves no
 * trace in the save — the record exists only while it says something the seed cannot.
 */
export function draw(
  nodes: Nodes,
  seed: string,
  at: Point,
  taken: readonly Taking[],
  today: number
): Nodes {
  let next = nodes;
  for (const { material: m, count } of taken) {
    const key = nodeKey(at, m.id);
    const left = leftAt(nodes, seed, at, m, today) - count;
    const full = capacityOf(seed, at, m);
    if (left >= full) {
      if (next[key] === undefined) continue;
      next = { ...next };
      delete next[key];
      continue;
    }
    next = { ...next, [key]: { left: Math.max(0, left), day: today } };
  }
  return next;
}

/**
 * How worked-over this tile looks, from untouched to bare.
 *
 * **The predictability the design asks for, and the reason there is no hidden roll.** A player
 * decides whether to stoop by looking, so the state a node is in has to be legible *before* the
 * decision rather than revealed after it. A stand that has been cut looks cut.
 *
 * Returned as a word rather than a number because the journal is prose and always has been —
 * this is a thing the field notes say, not a bar that fills.
 */
/**
 * How many come up in one stoop.
 *
 * **Always at least one, and sometimes more.** This is the whole of the "clicker" reading, and
 * it is deliberately the bonus half without the failure half: cozy games vary *how much* rather
 * than *whether*, and a hidden roll that returns nothing teaches the player nothing they can
 * practise. Stardew's fishing does fail, but it fails on your input -- a skill surface this game
 * does not have and would have to build on purpose.
 *
 * It also matters that gathering is the *only* thing that puts a material in a satchel. A chance
 * of nothing would put a die in front of every recipe in the game, and stack multiplicatively
 * with depletion, which is already a scarcity mechanic.
 *
 * Seeded on the tile, the material and the day, so it is predictable in the way that matters:
 * the same stand on the same day always gives the same, and coming back tomorrow is a different
 * question rather than a re-roll of the same one. No two visits in one afternoon can farm it.
 */
export function handful(
  seed: string,
  at: Point,
  m: Material,
  today: number,
  left: number
): number {
  if (left <= 0) return 0;
  // A quarter of stoops are good ones. Frequent enough to be a texture rather than an event,
  // rare enough that it still reads as luck when it happens.
  const roll = tileHash(seed, at.x, at.y, `handful:${m.id}:${today}`) % 4;
  return Math.min(left, roll === 0 ? 2 : 1);
}

export type Condition = 'untouched' | 'picked-over' | 'bare';

export function conditionOf(
  nodes: Nodes,
  seed: string,
  at: Point,
  m: Material,
  today: number
): Condition {
  const left = leftAt(nodes, seed, at, m, today);
  if (left <= 0) return 'bare';
  return left >= capacityOf(seed, at, m) ? 'untouched' : 'picked-over';
}
