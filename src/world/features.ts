// Which feature stands on a tile, by name -- a fallen log, a bamboo clump, driftwood -- for the
// rules that need to know what a player can see.
//
// **The log you see is the log you take** (`docs/satchel-and-hearth.md`, phase 4; the owner's
// question of 2 October 2026: there are tree trunks in the game, why can nobody use them?). The map
// draws a fallen log on one forest tile in a dozen and a clump of bamboo on others, and nothing tied
// either to what the tile gave -- so a player could stand beside drawn bamboo and be offered none.
// `content/gathering.ts` now asks this, and a tile with a log on it always gives wood.
//
// **The picture is decided in `game/frames.ts`; this is the same decision, by name.** `content/`
// may not import `game/`, so the table below is that file's `FEATURES` in the same order, one row
// per feature with how many frames it draws from -- which is what the pick is weighted by.
// `test/features.test.ts` fails by name if the two ever disagree, so a feature added to the art and
// not here cannot quietly shift what every tile after it is said to hold.
//
// Pure and free of React and Phaser.

import { tileHash } from './rng';
import type { BiomeId } from './types';

/**
 * How rare a feature is: one tile in this many, before the per-biome choice.
 *
 * Twelve is what makes the trade safe. Features may reach row 4 of the cell where common overdraw
 * stops at 16, which is only acceptable because you meet one occasionally rather than walking
 * through a wood of them. Lowering this number is the thing that would make the map obstructive.
 */
export const FEATURE_RARITY = 12;

/** `game/frames.ts`'s `FEATURES`, by name: its ground, how many frames, and whether only on a rim. */
export const FEATURE_LAYOUT: readonly { name: string; biome: BiomeId; frames: number; rim?: true }[] = [
  { name: 'neem', biome: 'plains', frames: 2 },
  { name: 'anthill', biome: 'plains', frames: 2 },
  { name: 'bamboo', biome: 'forest', frames: 2 },
  { name: 'bees', biome: 'forest', frames: 2 },
  { name: 'log', biome: 'forest', frames: 1 },
  { name: 'mangroveWetland', biome: 'wetland', frames: 2 },
  { name: 'lotus', biome: 'wetland', frames: 1 },
  { name: 'tussock', biome: 'wetland', frames: 1 },
  { name: 'steppingStones', biome: 'river', frames: 1 },
  { name: 'datePalm', biome: 'settlement', frames: 2 },
  { name: 'tulsi', biome: 'settlement', frames: 1 },
  { name: 'woodpile', biome: 'settlement', frames: 1 },
  { name: 'mangroveCoast', biome: 'coast', frames: 2 },
  { name: 'driftwood', biome: 'coast', frames: 1 },
  { name: 'pine', biome: 'hills', frames: 2 },
  { name: 'boulder', biome: 'hills', frames: 1 },
  { name: 'cactus', biome: 'desert', frames: 2 },
  { name: 'snowPine', biome: 'snow', frames: 2 },
  { name: 'crystalCluster', biome: 'sky_island', frames: 2 },
  { name: 'basaltColumn', biome: 'lava_field', frames: 2 },
  { name: 'snowSnag', biome: 'snow', frames: 2 },
  { name: 'aeroMangrove', biome: 'sky_island', frames: 4, rim: true },
  { name: 'wadingMangrove', biome: 'sky_water', frames: 4 },
  { name: 'skyShrub', biome: 'sky_island', frames: 2 },
  { name: 'rootCurtain', biome: 'sky_underside', frames: 2 }
];

/** Every ground's picks, one entry per frame, for a rim tile and for an inland one. */
const [ON_RIM, INLAND] = (() => {
  const rim: Partial<Record<BiomeId, string[]>> = {};
  const inland: Partial<Record<BiomeId, string[]>> = {};
  for (const f of FEATURE_LAYOUT) {
    for (let i = 0; i < f.frames; i += 1) {
      (rim[f.biome] ??= []).push(f.name);
      if (!f.rim) (inland[f.biome] ??= []).push(f.name);
    }
  }
  return [rim, inland] as const;
})();

/** The picks for a ground, by name, one per frame -- what `featureFrame` chooses among. */
export function featurePicks(biome: BiomeId, onRim = true): readonly string[] {
  return (onRim ? ON_RIM : INLAND)[biome] ?? [];
}

/**
 * The feature drawn on this tile, by name, or null -- which is the usual answer.
 *
 * Rolled exactly as `game/scenePlan.ts` rolls it, on the same two hashes. `onRim` matters only on
 * the sky islands, the one ground with a feature that grows on its edge alone; everywhere else the
 * two lists are the same. The scene may still leave a feature undrawn -- inside a place's forecourt,
 * under a hut, inside a fence -- so this says what the tile is entitled to, and the scene draws a
 * subset of it.
 */
export function featureNameAt(seed: string, x: number, y: number, biome: BiomeId, onRim = false): string | null {
  if (tileHash(seed, x, y, 'feature-present') % FEATURE_RARITY !== 0) return null;
  const picks = featurePicks(biome, onRim);
  if (picks.length === 0) return null;
  return picks[tileHash(seed, x, y, 'feature-pick') % picks.length]!;
}
