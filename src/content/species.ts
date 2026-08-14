// The content layer: turns `data/*.json` into per-tile lookups.
//
// Ported from `src/species.js`, with two changes:
//
//   * the JSON is **imported** rather than fetched. Vite inlines it at build time, so there is no
//     network round-trip on first paint, no relative-path fragility, and a malformed data file is
//     a build failure rather than a blank journal panel;
//   * everything is typed against `world/types.ts`, so a renamed field in the generated data —
//     the class of bug that once printed "its undefined presence" to the player — cannot compile.
//
// Free of React and Phaser, so the tests exercise exactly what ships.

import biomesData from '../../data/biomes.json';
import { creatures as canonCreatures, flora as canonFlora } from './canon';
import { pickFor } from '../world/rng';
import type { Biome, BiomeId, Creature, Flora, Placement, Point, Rarity } from '../world/types';

// Biome presentation -- colour, symbol, walkability, travel cost, journal description --
// is authored here. Canon says which biomes exist; it has no opinion on what they look like.
export const biomes = biomesData as Biome[];

// Species come from canon through the adapter, which is the only place that knows how to
// turn canon's shape into this one.
export const creatures: Creature[] = canonCreatures;
export const flora: Flora[] = canonFlora;

function indexByBiome<T extends { biomes: BiomeId[]; placement: Placement }>(
  entries: T[],
  placement: Placement
): Partial<Record<BiomeId, T[]>> {
  const index: Partial<Record<BiomeId, T[]>> = {};
  for (const entry of entries) {
    if (entry.placement !== placement) continue;
    for (const biome of entry.biomes) {
      (index[biome] ??= []).push(entry);
    }
  }
  return index;
}

/**
 * How much of a biome's pool each species occupies.
 *
 * `rarity` sat in the data and in `types.ts` for a long time without anything reading it, so a
 * mythic Asura conjuration was exactly as likely as a heron. That is fine while every species in a
 * biome is ordinary wildlife and actively wrong once they are not: half the settlement pool is
 * Asura-tainted, and uniform picking put a horror in every second village.
 *
 * Weights are relative, not percentages. A biome of 6 common and 6 mythic species yields a mythic
 * about 8% of the time — seen occasionally, never routine.
 */
const RARITY_WEIGHT: Record<Rarity, number> = { common: 12, rare: 4, mythic: 1 };

/**
 * The same index, with each species repeated by its weight.
 *
 * Expanding the list rather than weighting the draw keeps `pickFor` a plain modulo over a stable
 * array, so a tile still resolves to the same species for the same seed and the determinism
 * contract is untouched. A few thousand array references is not worth optimising away.
 */
function weightByRarity<T extends { rarity: Rarity }>(
  index: Partial<Record<BiomeId, T[]>>
): Partial<Record<BiomeId, T[]>> {
  const out: Partial<Record<BiomeId, T[]>> = {};
  for (const [biome, entries] of Object.entries(index) as [BiomeId, T[]][]) {
    const pool: T[] = [];
    for (const entry of entries) {
      for (let i = 0; i < RARITY_WEIGHT[entry.rarity]; i += 1) pool.push(entry);
    }
    out[biome] = pool;
  }
  return out;
}

const biomesById = new Map<BiomeId, Biome>(biomes.map((biome) => [biome.id, biome]));
// `lore` species — sky beings held for a future sky mode — are authored but never placed in play.
const creaturesByBiome = indexByBiome(creatures, 'encounter');
const floraByBiome = indexByBiome(flora, 'flavour');
// Picking reads the weighted pools; `creaturesIn`/`floraIn` stay unique, which is what callers
// asking "what lives here?" mean.
const creaturePool = weightByRarity(creaturesByBiome);
const floraPool = weightByRarity(floraByBiome);

export function biomeFor(biome: BiomeId): Biome | null {
  return biomesById.get(biome) ?? null;
}

/**
 * Every species by its game id, flora and fauna together.
 *
 * Named `metSpecies` rather than `speciesFor` because `content/investigate.ts` already has a
 * `speciesFor`, and it looks things up in the *other* namespace -- canon ids like
 * `fauna_saltreed` rather than the bundle's `saltreed`. Two functions with one name differing
 * only in which id space they accept is exactly the confusion this phase exists to remove.
 */
const speciesById = new Map<string, Creature | Flora>(
  [...creatures, ...flora].map((s) => [s.id, s])
);

export function metSpecies(id: string): Creature | Flora | null {
  return speciesById.get(id) ?? null;
}

export function creaturesIn(biome: BiomeId): Creature[] {
  return creaturesByBiome[biome] ?? [];
}

export function floraIn(biome: BiomeId): Flora[] {
  return floraByBiome[biome] ?? [];
}

/**
 * The one creature that lives on a tile.
 *
 * Keyed by tile coordinates and the world seed rather than by a stream position, so the answer is
 * the same however the player arrives — walk away, come back, reload the page, and it is still the
 * same crane. `main.js` and `journal.js` used to disagree here (one indexed by `(x + y) % n`, the
 * other took the first match), so the player could read about a crane and sketch an otter. Both
 * the journal and the observe button call this.
 */
export function creatureFor(tile: Point & { biome: BiomeId }, seed: string): Creature | null {
  return pickFor(creaturePool[tile.biome] ?? [], seed, tile, 'creature');
}

export function floraFor(tile: Point & { biome: BiomeId }, seed: string): Flora | null {
  return pickFor(floraPool[tile.biome] ?? [], seed, tile, 'flora');
}

/** Travel cost in "beats". `null` means impassable. Used by the scene to pace movement. */
export function travelCost(biome: BiomeId): number | null {
  return biomeFor(biome)?.travelCost ?? null;
}
