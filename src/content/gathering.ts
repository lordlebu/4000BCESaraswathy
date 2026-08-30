// What the ground gives up.
//
// The entry point to the whole making layer: nothing can be crafted until something can be
// picked up, and this is the only thing that puts a material into a satchel from outside.
//
// Deterministic, and that is the point. The walk is seeded — the same seed builds the same
// world — so what a tile yields is answered from the tile and the seed rather than from a
// throw. Two players on one seed find the same reeds in the same place, which is what makes
// a seed worth sharing and what lets `test/` assert anything at all.
//
// Pure and free of React and Phaser.

import { type Material, materialsIn } from './making';
import { type Satchel, add } from './satchel';
import type { BiomeId, Point } from '../world/types';
import { tileHash } from '../world/rng';

/**
 * How likely each rarity is to be standing on a given tile.
 *
 * Common things are usually there and mythic ones almost never. These are the only numbers
 * in this file and they are a pacing judgement rather than a fact: a walk across a delta
 * should turn up reed constantly, clay often, and leviathan bone essentially never, because
 * the last is a thing you get from a beach after a whale has died.
 */
const CHANCE: Record<string, number> = {
  common: 0.34,
  rare: 0.08,
  mythic: 0.01
};

/**
 * What is standing on this tile, if anything.
 *
 * Built on `tileHash` rather than `createRandom`, and the difference is the whole point:
 * `tileHash` has no stream position, so a tile answers the same way however the player
 * reaches it — walk away, come back, reload the page, the reeds are still the reeds. A
 * stream would depend on how many tiles had been asked about first, which is exactly the
 * bug the comment on `tileHash` was written to prevent.
 *
 * Each material is salted by its own id, so adding a material to canon cannot change what a
 * tile already offered. That matters more here than it looks: array order is load-bearing
 * across this boundary, and this is the one place a new entity could have silently rewritten
 * an existing save's world.
 */
export function yieldsAt(seed: string, at: Point, biome: BiomeId): Material[] {
  return materialsIn(biome).filter((m) => {
    const roll = tileHash(seed, at.x, at.y, `gather:${m.id}`) / 4294967296;
    return roll < (CHANCE[m.rarity] ?? CHANCE.common);
  });
}

/** Whether there is anything to pick up here. What a prompt asks before it appears. */
export function anythingAt(seed: string, at: Point, biome: BiomeId): boolean {
  return yieldsAt(seed, at, biome).length > 0;
}

/**
 * Take everything this tile offers.
 *
 * One at a time is the obvious alternative and is worse: a tile with three things on it
 * would need three prompts, and the cozy reading of gathering is stooping once rather than
 * running an interface. Returns a new Satchel; never mutates.
 *
 * **A tile is never used up, and that is load-bearing beyond this file.** Walking back gives
 * the same reeds again, which is right for a game with no scarcity — but it is also the reason
 * canon's `check_playability.py` may ask "is this class obtainable at all" and ignore every
 * `count` in every recipe. Its closure is count-blind, and that is sound only because there is
 * no quantity a patient walker cannot reach.
 *
 * So if gathering ever depletes, canon's gate silently starts lying: it would keep passing
 * recipes no player could afford. `test/makingMatters.test.ts` pins the no-depletion half of
 * that bargain so the assumption cannot quietly stop being true.
 */
export function gather(
  satchel: Satchel,
  seed: string,
  at: Point,
  biome: BiomeId
): Satchel {
  let next = satchel;
  for (const m of yieldsAt(seed, at, biome)) next = add(next, m.id, 1);
  return next;
}

/**
 * What is here to take, in the present tense, or null when there is nothing.
 *
 * The counterpart to `gatheredLine`, and the one the field notes use. The difference matters:
 * that one is a record of something done and this is a lead. Without it the only way to find
 * out the ground has anything on it is to open a panel, which is the wrong way round — a
 * naturalist notices the reeds and *then* decides to cut them.
 */
export function underfootLine(seed: string, at: Point, biome: BiomeId): string | null {
  const here = yieldsAt(seed, at, biome);
  if (here.length === 0) return null;
  const names = here.map((m) => m.name.toLowerCase());
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `There is ${list} here, for the taking.`;
}

/**
 * A sentence for the diary, or null if there was nothing.
 *
 * In the diary's register rather than a pickup notification — the game's whole progression
 * system is a written journal, so a thing picked up is a thing noted.
 */
export function gatheredLine(seed: string, at: Point, biome: BiomeId): string | null {
  const got = yieldsAt(seed, at, biome);
  if (got.length === 0) return null;
  const names = got.map((m) => m.name.toLowerCase());
  if (names.length === 1) return `Picked up ${names[0]}.`;
  const last = names[names.length - 1];
  return `Picked up ${names.slice(0, -1).join(', ')} and ${last}.`;
}
