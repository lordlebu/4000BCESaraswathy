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
import creaturesData from '../../data/creatures.json';
import floraData from '../../data/flora.json';
import { pickFor } from '../world/rng';
import type { Biome, BiomeId, Creature, Flora, Placement, Point } from '../world/types';

export const biomes = biomesData as Biome[];
export const creatures = creaturesData as Creature[];
export const flora = floraData as Flora[];

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

const biomesById = new Map<BiomeId, Biome>(biomes.map((biome) => [biome.id, biome]));
// `lore` species — sky beings and Asura conjurations — are authored but never placed in play.
const creaturesByBiome = indexByBiome(creatures, 'encounter');
const floraByBiome = indexByBiome(flora, 'flavour');

export function biomeFor(biome: BiomeId): Biome | null {
  return biomesById.get(biome) ?? null;
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
  return pickFor(creaturesIn(tile.biome), seed, tile, 'creature');
}

export function floraFor(tile: Point & { biome: BiomeId }, seed: string): Flora | null {
  return pickFor(floraIn(tile.biome), seed, tile, 'flora');
}

/** Travel cost in "beats". `null` means impassable. Used by the scene to pace movement. */
export function travelCost(biome: BiomeId): number | null {
  return biomeFor(biome)?.travelCost ?? null;
}
