// Which frame of which sheet each thing is drawn with.
//
// Free of Phaser on purpose. `tileTextures.ts` cannot be imported under Node -- it pulls in the
// whole engine -- and these lists are exactly what a test wants to check: that the art points at
// biomes and places canon actually names. Keeping them here is what lets `adapterCoverage.test.ts`
// read them without a browser.
//
// Order is load-bearing in the way canon's `source_index` is. `tools/build-terrain.js` writes the
// sheets in these orders and this file mirrors them, so changing one without the other silently
// repaints the world.

import type { BiomeId } from '../world/types';

/** Frame order of `assets/terrain.png`, matching TILES in tools/build-terrain.js. */
export const TERRAIN_ORDER: BiomeId[] = [
  'sea',
  'coast',
  'plains',
  'forest',
  'wetland',
  'hills',
  'mountains',
  'desert',
  'river',
  'settlement',
  'landmark'
];

/** Frame order of `assets/landmarks.png`, matching the ids in data/landmarks.json. */
export const LANDMARK_ORDER = [
  'great-banyan',
  'hot-spring',
  'shell-beach',
  'hill-shrine',
  'standing-stones',
  'heron-pool',
  'salt-pan'
];

/**
 * Frame order of `assets/places.png` — canon's archaeological sites, by point-of-interest id.
 *
 * These are canon ids, and a typo here fails silently: `placeFrame` returns null, the place keeps
 * the generic diamond, and the sprite drawn for it never appears. The Stepped Quarry spent a
 * release like that, wired to `poi_stepped_quarry` while canon calls it `poi_basalt_quarry`.
 * `adapterCoverage.test.ts` now checks every id against the bundle.
 */
export const PLACE_ORDER = [
  'poi_kavik_tower',
  'poi_silted_granary',
  'poi_long_archive',
  'poi_mooring_stones',
  'poi_drowned_seawall',
  'poi_customs_house',
  'poi_bone_midden',
  'poi_basalt_quarry'
];

/** How many hut variants the sheet carries, for the seeded per-tile pick. */
export const HUT_VARIANTS = 4;

/** Which frame of `assets/terrain.png` this biome is drawn with. */
export function tileFrame(biome: BiomeId): number {
  const index = TERRAIN_ORDER.indexOf(biome);
  // A biome with no tile falls back to plains rather than crashing: canon can name ground the art
  // has not caught up with, and an unexpected tile reads better than a blank map. `lava_field` is
  // the live case — canon marks it `renderable: false` precisely because this frame is missing.
  return index >= 0 ? index : TERRAIN_ORDER.indexOf('plains');
}

/** The frame for a landmark kind, or null if that kind has no art yet. */
export function landmarkFrame(kindId: string): number | null {
  const index = LANDMARK_ORDER.indexOf(kindId);
  return index >= 0 ? index : null;
}

/** The frame for an authored place, or null — most points of interest keep the diamond marker. */
export function placeFrame(poiId: string): number | null {
  const index = PLACE_ORDER.indexOf(poiId);
  return index >= 0 ? index : null;
}
