// Turning three scalars into a biome.
//
// Thresholds are named constants rather than inline numbers because they are the contract between
// `field.ts` and the bestiary: if the elevation field stops spanning 0–1, HILLS and MOUNTAINS stop
// being reachable and a third of the creatures quietly vanish from the game. `test/generator.test.ts`
// asserts against these, so a retune that starves a biome fails the build instead of the playtest.

import type { TerrainBiomeId } from './types';

export const THRESHOLDS = {
  /** Below this is open water. */
  SEA: 0.3,
  /** Between SEA and this is beach. */
  COAST: 0.36,
  /** Above this is rolling upland. */
  HILLS: 0.66,
  /** Above this is peaks. Rivers are sourced here and in hills. */
  MOUNTAINS: 0.82,
  /** Standing water and reeds. */
  WETLAND_MOISTURE: 0.68,
  /** Closed canopy. */
  FOREST_MOISTURE: 0.5,
  /** Desert needs both halves: hot *and* dry. */
  DESERT_TEMPERATURE: 0.66,
  DESERT_MOISTURE: 0.32
} as const;

export function classifyBiome(elevation: number, moisture: number, temperature: number): TerrainBiomeId {
  if (elevation < THRESHOLDS.SEA) return 'sea';
  if (elevation < THRESHOLDS.COAST) return 'coast';
  if (elevation > THRESHOLDS.MOUNTAINS) return 'mountains';
  if (elevation > THRESHOLDS.HILLS) return 'hills';
  if (moisture > THRESHOLDS.WETLAND_MOISTURE) return 'wetland';
  if (moisture > THRESHOLDS.FOREST_MOISTURE) return 'forest';
  if (temperature > THRESHOLDS.DESERT_TEMPERATURE && moisture < THRESHOLDS.DESERT_MOISTURE) {
    return 'desert';
  }
  return 'plains';
}
