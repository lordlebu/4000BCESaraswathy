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

import { type Material, materials } from './making';
import { creatureFor, floraFor } from './species';
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
 * What each species gives up, keyed by the species' engine id.
 *
 * **Canon states this once, on the material, and never on the species.** `material.won_from`
 * names the flora and fauna a thing is taken from — `material_delta_rice` is won from
 * `flora_red_delta_rice` — and nothing on the species names the material back. That is canon's
 * ruling and it is the right way round: a material is a fact about stuff, and making the
 * species carry a list too would be the same fact authored twice, free to disagree with itself.
 *
 * So the index is built by inverting, here, at load. The cost is one pass over 62 materials
 * and the benefit is that the game never holds an opinion canon did not give it.
 *
 * This field was parsed into `Material.wonFrom` for months and read by **nothing** — canon
 * knew rice came from the rice plant, shipped that across the boundary, and the game threw it
 * away and picked materials by biome instead. This map is where that stops.
 */
const YIELDS = new Map<string, Material[]>();
for (const material of materials) {
  for (const species of material.wonFrom) {
    const list = YIELDS.get(species);
    if (list) list.push(material);
    else YIELDS.set(species, [material]);
  }
}

/** What this species gives up, or nothing. Most species give nothing, and that is fine. */
export function yieldsOf(speciesId: string): readonly Material[] {
  return YIELDS.get(speciesId) ?? EMPTY;
}
const EMPTY: readonly Material[] = Object.freeze([]);

/**
 * What the ground itself gives up, by biome.
 *
 * **Not everything is won from something alive, and canon says so in as many words:** the
 * material schema records that `won_from` may be absent because "canon knows salt-crust is salt
 * without owing anyone an account of which pan it was scraped from". Fifteen materials are like
 * that — flint, river clay, basalt, sandstone, copper, tin, ochre, the glasses — and they are
 * the entire mineral half of the crafting tree.
 *
 * This was found by measurement rather than by reading, and it is the fault this rewrite would
 * otherwise have shipped: keying every yield to the plant or the animal standing on the tile
 * made stone ungatherable *everywhere*, and two crafting tests failed on the spot because Uma's
 * commission needs a flint. A tile is a place as well as a habitat.
 *
 * So the rule is: **a material with a living source comes from that source; a material without
 * one comes from the ground.** Both still answer to `found_in`, and neither is picked from a
 * biome-wide list of everything.
 */
const FROM_THE_GROUND = new Map<string, Material[]>();
for (const material of materials) {
  if (material.wonFrom.length > 0) continue;
  for (const biome of material.foundIn) {
    const list = FROM_THE_GROUND.get(biome);
    if (list) list.push(material);
    else FROM_THE_GROUND.set(biome, [material]);
  }
}

/**
 * What is standing on this tile, if anything.
 *
 * **Asks the tile, not the biome, and that is the whole of this rewrite.**
 *
 * Every tile has always answered two questions that never consulted each other: `species.ts`
 * picked the one creature and the one plant standing here, and this picked materials from a
 * list of everything the *biome* can hold. So the reeds a player read about in the field notes
 * and the reeds they cut were decided separately, and a tile could offer boar tusk with no
 * boar in sight — canon's own `won_from` said where it came from and nothing read it.
 *
 * Now the plant and the creature on the tile are asked what they give up, and that is the
 * yield. **The reeds you cut are the reeds you were looking at.**
 *
 * What survives unchanged is the determinism. `creatureFor` and `floraFor` are keyed by tile
 * and seed exactly as this was, so a tile still answers the same way however the player
 * reaches it — walk away, come back, reload, and it is the same stand of rice. And each
 * material is still salted by its own id, so a canon addition cannot rewrite what a tile
 * already offered.
 *
 * The rarity roll stays too, and now means something narrower and truer: not "is this material
 * in this biome" but "is this plant, which is standing right here, worth taking from today".
 */
export function yieldsAt(
  seed: string,
  at: Point,
  biome: BiomeId,
  /**
   * Extra chance this tile holds a given material, because the ground nearby has been worked.
   *
   * The seam `nodes.revealedNear` uses to make stone *found* rather than regrown. Defaults to
   * nothing, so every caller that does not know about resource nodes -- the field notes, the
   * scene, the tests that measure what a fresh map holds -- keeps the world it always had.
   */
  moreLikely: (m: Material) => number = () => 0
): Material[] {
  const here = { x: at.x, y: at.y, biome };
  const standing = [floraFor(here, seed), creatureFor(here, seed)];

  const offered: Material[] = [];
  for (const species of standing) {
    if (!species) continue;
    for (const m of yieldsOf(species.id)) {
      // Canon's lint guarantees a material is only found where its sources live, so this
      // filter should never fire. It stays because the guarantee is canon's and this file is
      // the one that would silently offer desert rice if a bundle ever arrived unlinted.
      if (m.foundIn.includes(biome)) offered.push(m);
    }
  }
  // And what the ground is made of, which no plant has to be standing on for you to find.
  for (const m of FROM_THE_GROUND.get(biome) ?? EMPTY) offered.push(m);

  return offered.filter((m) => {
    const roll = tileHash(seed, at.x, at.y, `gather:${m.id}`) / 4294967296;
    return roll < (CHANCE[m.rarity] ?? CHANCE.common) + moreLikely(m);
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
  return carry(
    satchel,
    yieldsAt(seed, at, biome).map((material) => ({ material, count: 1 }))
  );
}

/**
 * Put a decided list of materials into the satchel.
 *
 * Split out from `gather` when resource nodes arrived, because "what does this tile grow" and
 * "what is left of it" became two questions with two answers -- and the second is `nodes.ts`'s
 * to answer. This is the part that was always only carrying.
 */
export function carry(satchel: Satchel, taken: readonly Haul[]): Satchel {
  let next = satchel;
  for (const { material, count } of taken) next = add(next, material.id, count);
  return next;
}

/**
 * One material and how many of it.
 *
 * Structurally the same as `nodes.Taking` and deliberately declared here rather than imported:
 * `nodes.ts` already imports this module, and pointing the arrow back would make a cycle. The
 * shape is two fields; the coupling would be for ever.
 */
export interface Haul {
  material: Material;
  count: number;
}

/**
 * What is here to take, in the present tense, or null when there is nothing.
 *
 * The counterpart to `gatheredLine`, and the one the field notes use. The difference matters:
 * that one is a record of something done and this is a lead. Without it the only way to find
 * out the ground has anything on it is to open a panel, which is the wrong way round — a
 * naturalist notices the reeds and *then* decides to cut them.
 *
 * **This says what grows here, not what is left of it**, and the default argument is why: the
 * field notes are written by the scene, which has no business knowing what one player has
 * already taken. A note reading "there is rice here" stays true of a stand somebody has been
 * cutting — the place is still a rice stand. What is *left* is a question the action panel
 * asks, by passing the list `nodes.ts` gives it.
 */
export function underfootLine(
  seed: string,
  at: Point,
  biome: BiomeId,
  here: readonly Material[] = yieldsAt(seed, at, biome)
): string | null {
  if (here.length === 0) return null;
  return `There is ${listOf(here.map((m) => m.name.toLowerCase()))} here, for the taking.`;
}

/**
 * A sentence for the diary, or null if there was nothing.
 *
 * In the diary's register rather than a pickup notification — the game's whole progression
 * system is a written journal, so a thing picked up is a thing noted.
 *
 * **A good cut says so.** Two reeds reads "two bundles of reed fibre" rather than a number in a
 * badge, because this is prose and the bonus should land as something noticed rather than as a
 * score. That is the whole of the reward: no failure, no die, just occasionally more.
 */
export function gatheredLine(
  seed: string,
  at: Point,
  biome: BiomeId,
  got: readonly Haul[] = yieldsAt(seed, at, biome).map((material) => ({ material, count: 1 }))
): string | null {
  if (got.length === 0) return null;
  return `Picked up ${listOf(got.map(amountOf))}.`;
}

/**
 * What is here and what shape it is in, or null when the ground holds nothing.
 *
 * **The predictability the design rests on.** A player decides whether to stoop by looking, so a
 * stand that has been cut has to read as cut *before* the decision rather than after it. This is
 * the line the action row shows, and it is why there is no hidden roll anywhere in gathering:
 * everything the player is deciding about is on the screen in front of them.
 *
 * Only worn ground is described. Saying "untouched" of every fresh tile would put the word on
 * screen constantly and make the interesting case invisible by drowning it.
 */
export function standingLine(
  here: readonly Haul[],
  worn: (m: Material) => boolean
): string | null {
  if (here.length === 0) return null;
  const cut = here.filter((h) => worn(h.material));
  const full = here.filter((h) => !worn(h.material));

  const parts: string[] = [];
  if (full.length > 0) parts.push(listOf(full.map(amountOf)));
  if (cut.length > 0) {
    parts.push(`${listOf(cut.map(amountOf))} on ground already worked`);
  }
  // It opens a sentence, so it is capitalised here rather than leaving every caller to do it.
  // Material names are lower-cased for use mid-sentence, which is where they are usually needed.
  const line = parts.join(', and ');
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`;
}

/** "two bundles of reed fibre", or just the name when one comes up. */
function amountOf({ material, count }: Haul): string {
  const name = material.name.toLowerCase();
  return count > 1 ? `${WORDS[count] ?? count} of ${name}` : name;
}

// Small numbers as words, because the journal is prose and "2 flint" is a spreadsheet. Nothing
// here ever gives more than a couple at once, so the list is deliberately short rather than a
// general number-speller nobody asked for.
const WORDS: Record<number, string> = { 2: 'two', 3: 'three' };

/** "a, b and c", the way the journal has always written a list. */
function listOf(names: readonly string[]): string {
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
