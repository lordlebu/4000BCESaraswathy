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

/**
 * Frames for a *kind* of place, used when the place itself has no art.
 *
 * Sixteen of canon's twenty-four points of interest have no drawing of their own, and were all
 * showing the same diamond. A kind marker says more than that without claiming more than it knows:
 * reeds and standing water for an eco-site, a doorway leading nowhere for an anomaly, a roof and a
 * well for a place people live, worn steps for a wilderness, a cold fire-ring for a travel node.
 *
 * The last two were nearly left out on the argument that both are defined by what is *not* built
 * there. Seeing them drawn changed that: canon says "stone steps up a hillside", "steps up the old
 * wall, kept clear", and "where the road stops for the night" -- worn steps and a cold fire-ring
 * are made things, and the reading was too strict.
 */
const KIND_FRAMES: Record<string, number> = {
  eco_site: PLACE_ORDER.length,
  anomaly: PLACE_ORDER.length + 1,
  settlement: PLACE_ORDER.length + 2,
  wilderness: PLACE_ORDER.length + 3,
  travel_node: PLACE_ORDER.length + 4
};

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
export function placeFrame(poiId: string, kind?: string): number | null {
  const index = PLACE_ORDER.indexOf(poiId);
  if (index >= 0) return index;
  // A place canon has authored art for wins; otherwise its kind speaks for it. Falling back on
  // kind rather than on nothing is what closed the gap that made the Drowned Dockyard look absent.
  return kind !== undefined ? KIND_FRAMES[kind] ?? null : null;
}

// --- the layer above the player ------------------------------------------

/**
 * Frame layout of `assets/overdraw.png`, written by tools/build-overdraw.js.
 *
 * Four plants, three scatters each, at rest; then the same twelve leaning; then the fence. Frame
 * `n` and frame `n + OVERDRAW_REST` are therefore the two halves of one animation, which is the
 * arithmetic `swayFrame` below depends on.
 */
export const OVERDRAW_SCATTERS = 3;
export const OVERDRAW_PLANTS = [
  'grass-plains',
  'reeds-wetland',
  'paddy-settlement',
  'rushes-river',
  'barley-plains',
  'sagebrush-plains',
  'ferns-forest',
  'vine-forest',
  'saltgrass-coast',
  'moss-hills',
  'saltbush-desert'
];
export const OVERDRAW_REST = OVERDRAW_PLANTS.length * OVERDRAW_SCATTERS;
export const FENCE_FRAME = OVERDRAW_REST * 2;

/** Marks left underfoot, drawn once per step and faded out. */
export const PRINTS_FRAME = FENCE_FRAME + 1;
export const SPLASH_FRAME = FENCE_FRAME + 2;

/**
 * Which mark a step onto this ground leaves, or null where a step leaves nothing.
 *
 * Water and soft ground record a footfall; rock and grass do not. Restricting it that way is what
 * keeps the mark meaningful -- a trail across every surface is decoration, a trail across sand and
 * marsh is evidence of where you went.
 */
export function traceFrameFor(biome: BiomeId): number | null {
  if (biome === 'wetland' || biome === 'river') return SPLASH_FRAME;
  if (biome === 'coast' || biome === 'desert') return PRINTS_FRAME;
  return null;
}

/**
 * Which plant grows on which ground, or null where nothing does.
 *
 * Deliberately not every biome. Overdraw costs a sprite per tile and hides the player's legs, so
 * it earns its place only where a traveller would actually be wading through something: open
 * grassland, marsh, the planted margin of a settlement, and a river's edge. Forest is left alone
 * because its canopy is already the busiest tile in the set.
 */
const OVERDRAW_BY_BIOME: Partial<Record<BiomeId, number[]>> = {
  plains: [0, 4, 5],
  wetland: [1],
  settlement: [2],
  river: [3],
  forest: [6, 7],
  coast: [8],
  hills: [9],
  desert: [10]
};

/** The rest-frame for this biome and scatter, or null if nothing grows here. */
export function overdrawFrame(biome: BiomeId, scatter: number): number | null {
  const plants = OVERDRAW_BY_BIOME[biome];
  if (plants === undefined || plants.length === 0) return null;
  // Two rolls out of one hash: which plant grows here, and which of its three scatters this tile
  // gets. Plains carries grass, barley and sagebrush, so open country is not one repeated texture.
  const plant = plants[scatter % plants.length]!;
  return plant * OVERDRAW_SCATTERS + (Math.floor(scatter / plants.length) % OVERDRAW_SCATTERS);
}

/**
 * The leaning counterpart of a rest frame.
 *
 * Kept as arithmetic rather than a second lookup so the two halves cannot drift apart: if the
 * sheet grows a plant, both halves move together by construction.
 */
export function swayFrame(rest: number): number {
  return rest + OVERDRAW_REST;
}

// --- features: the tall things -------------------------------------------

/**
 * Frame layout of `assets/features.png`, written by tools/build-features.js.
 *
 * Each entry lists the frames that feature occupies. Anything with a trunk carries two mirrored
 * variants so a run of tiles does not build a hedge down one side of the map; low things that sit
 * centred carry one.
 */
export const FEATURES: Record<string, { biome: BiomeId; frames: number[] }> = {
  neem: { biome: 'plains', frames: [0, 1] },
  anthill: { biome: 'plains', frames: [2, 3] },
  bamboo: { biome: 'forest', frames: [4, 5] },
  bees: { biome: 'forest', frames: [6, 7] },
  log: { biome: 'forest', frames: [8] },
  mangroveWetland: { biome: 'wetland', frames: [9, 10] },
  lotus: { biome: 'wetland', frames: [11] },
  tussock: { biome: 'wetland', frames: [12] },
  steppingStones: { biome: 'river', frames: [13] },
  datePalm: { biome: 'settlement', frames: [14, 15] },
  tulsi: { biome: 'settlement', frames: [16] },
  woodpile: { biome: 'settlement', frames: [17] },
  mangroveCoast: { biome: 'coast', frames: [18, 19] },
  driftwood: { biome: 'coast', frames: [20] },
  pine: { biome: 'hills', frames: [21, 22] },
  boulder: { biome: 'hills', frames: [23] },
  cactus: { biome: 'desert', frames: [24, 25] }
};

/**
 * How rare a feature is: one tile in this many, before the per-biome choice.
 *
 * Twelve is what makes the trade safe. Features may reach row 4 of the cell where common overdraw
 * stops at 16, which is only acceptable because you meet one occasionally rather than walking
 * through a wood of them. Lowering this number is the thing that would make the map obstructive.
 */
export const FEATURE_RARITY = 12;

/** Every frame available on a given ground, flattened. */
const FEATURES_BY_BIOME = (() => {
  const index: Partial<Record<BiomeId, number[]>> = {};
  for (const entry of Object.values(FEATURES)) {
    (index[entry.biome] ??= []).push(...entry.frames);
  }
  return index;
})();

/** The feature frame for this tile, or null — which is the usual answer. */
export function featureFrame(biome: BiomeId, roll: number, pick: number): number | null {
  if (roll % FEATURE_RARITY !== 0) return null;
  const frames = FEATURES_BY_BIOME[biome];
  if (!frames || frames.length === 0) return null;
  return frames[pick % frames.length]!;
}

// --- how the world is stacked --------------------------------------------

/**
 * Depth for something standing on the ground, sorted by the row it stands on.
 *
 * A flat depth per layer does not work on a top-down map. Give every plant one number and the
 * player another, and a tuft of grass a dozen rows *south* of him -- nearer the camera, so it
 * belongs behind him -- still draws across his face. Depth is a global ordering and knows nothing
 * about position.
 *
 * So depth follows the row: further down the screen means nearer the viewer means drawn later. The
 * player is sorted by the same rule, which is what lets him pass behind the grass on his own tile
 * and in front of everything below it.
 *
 * Lives here rather than in the scene so it can be tested under Node, and because getting it wrong
 * is invisible until someone stands in the wrong place.
 */
export const GROUND_DEPTH_BASE = 100;
export const ROW_DEPTH = 10;

/**
 * Where in a row's ten slots each kind of thing sits.
 *
 * `underfoot` is for things that are a *surface* rather than something growing out of one: moss
 * crusting a hill stone, lily pads lying flat on water, stepping stones you cross by standing on
 * them. Drawing those above the traveller puts them over his boots, which reads as him sinking
 * into the ground.
 *
 * `marker` sits above the undergrowth and below the walker, and the ordering matters in both
 * directions. A landmark is the thing the player is walking *towards*, so a tuft of grass on its
 * tile must not hide it -- but arriving is the end of the journey, and a traveller who disappears
 * behind the banyan the moment he reaches it is worse than one standing in front of it. He is the
 * only thing on the map that is never occluded by something on his own tile.
 *
 * An earlier version put `marker` above `canopy`, which put it above the walker too. That was not
 * the intent and it took reaching a landmark in play to notice.
 */
export const ROW_SLOT = { underfoot: 0, undergrowth: 1, marker: 3, walker: 5, canopy: 8 } as const;

export function depthFor(row: number, slot: number): number {
  return GROUND_DEPTH_BASE + row * ROW_DEPTH + slot;
}

// --- what lies flat -------------------------------------------------------

/**
 * Overdraw plants that are a surface rather than something standing in one.
 *
 * Moss crusts a hill stone; a traveller walks on it, not through it. Everything else in the
 * overdraw sheet is grass, reeds or scrub, which he wades into -- and that difference is the whole
 * reason the layer exists, so getting it wrong on one entry is worth a lookup rather than a guess.
 */
const UNDERFOOT_PLANTS = new Set(['moss-hills']);

/**
 * Features low enough that the traveller passes them rather than through them.
 *
 * Lily pads and stepping stones are surfaces he stands on. The rest are objects that reach his
 * knee at most -- an anthill, a fallen log, a boulder, a woodpile, driftwood, a marsh tussock --
 * and an object that low drawn over him puts a boulder across his chest.
 *
 * Kept as a list rather than a height test, for the reason the moss case proved: height alone is
 * the wrong rule. A sagebrush is short *and* something you wade through, and lotus pads are the
 * tallest thing here at sixteen pixels while lying flat on the water. What decides it is what the
 * thing is.
 */
const UNDERFOOT_FEATURES = new Set([
  'lotus',
  'steppingStones',
  'anthill',
  'log',
  'driftwood',
  'boulder',
  'woodpile',
  'tussock'
]);

/** Does this overdraw frame lie on the ground rather than stand in it? */
export function overdrawIsUnderfoot(frame: number): boolean {
  const plant = OVERDRAW_PLANTS[Math.floor(frame / OVERDRAW_SCATTERS)];
  return plant !== undefined && UNDERFOOT_PLANTS.has(plant);
}

/** Does this feature frame lie on the ground rather than stand on it? */
export function featureIsUnderfoot(frame: number): boolean {
  for (const [name, entry] of Object.entries(FEATURES)) {
    if (entry.frames.includes(frame)) return UNDERFOOT_FEATURES.has(name);
  }
  return false;
}
