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

/**
 * The world grid, in pixels of art. `tileTextures.ts` re-exports this as the engine's TILE_SIZE.
 *
 * It lives here rather than there for the same reason everything else in this file does: a test
 * under Node cannot import `tileTextures.ts`, and "every sheet was built to the grid the engine
 * draws on" is precisely the kind of agreement that fails silently. When it moved from 32 to 128
 * the sheets and the scene disagreed for three separate reasons and none of them threw.
 *
 * `tools/build-terrain.js` has the matching SCALE, as do build-overdraw.js and build-features.js.
 */
export const GRID = 128;

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
  'landmark',
  // The sub-biomes, in the same order as TILES in tools/build-terrain.js -- a slot in the strip
  // is a biome only because these two lists agree.
  'lava_field',
  'snow',
  'sky_island',
  'sky_underside'
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
export const PLACE_ORDER: (string | null)[] = [
  'poi_kavik_tower',
  'poi_silted_granary',
  'poi_long_archive',
  // Retired with the Dry Harbour, and deliberately still here. `KIND_FRAMES` below is computed
  // from this array's length and the sprite sheet is laid out in this order, so removing an entry
  // would shift every frame after it and silently redraw half the places on the map. A null holds
  // the slot; `adapterCoverage.test.ts` knows to skip them rather than demanding canon name them.
  null,
  'poi_drowned_seawall',
  null,
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

/**
 * How many buildings the hut sheet carries, for the seeded per-tile pick.
 *
 * Six: four mud-brick huts and two felt yurts.  holds this to the sheet,
 * because the slicer finds figures automatically -- so adding a building and forgetting this
 * number would ship art the modulo never chooses.
 */
export const HUT_VARIANTS = 6;

/** Which frame of `assets/terrain.png` this biome is drawn with. */
/**
 * Crops per biome on `assets/terrain.png`. Matches TILE_VARIANTS in tools/build-terrain.js.
 *
 * A tile repeats every 128 screen pixels, and a repeat that regular is a grid by another name.
 * The edge blend removes the line *between* two biomes and does nothing about a field of one
 * stamping the same texture forty times, which is the other half of the same problem.
 */
export const TILE_VARIANTS = 4;

/**
 * The frame for a biome, optionally varied by position.
 *
 * Called with coordinates the tile picks one of its crops; called without, it gets the first --
 * which is what the edge blend wants, because the bleed is a thin sliver where a second crop would
 * read as noise rather than variety, and because keeping it fixed holds the baked-texture count
 * down (see `blendTextureKey`).
 */
export function tileFrame(biome: BiomeId, variant = 0): number {
  const index = TERRAIN_ORDER.indexOf(biome);
  // A biome with no tile falls back to plains rather than crashing. Callers that can draw a
  // placeholder instead should ask `hasTileArt` first -- drawing unknown ground as plains is a
  // lie about what the player is standing on, and was only ever acceptable because the
  // alternative was a blank map.
  const slot = index >= 0 ? index : TERRAIN_ORDER.indexOf('plains');
  return slot * TILE_VARIANTS + (variant % TILE_VARIANTS);
}

/**
 * Whether `assets/terrain.png` actually holds this biome.
 *
 * False means the art has not caught up, not that the biome is unreal -- canon names ground the
 * sheet has no drawing for, and `placeholderTileKey` draws it from the biome's own colour and
 * symbol rather than leaving it to be mistaken for plains.
 */
export function hasTileArt(biome: BiomeId): boolean {
  return TERRAIN_ORDER.includes(biome);
}

// --- decor ---------------------------------------------------------------

/**
 * Prop order of `assets/decor.png`, matching PROPS in tools/build-decor.js.
 *
 * Kept here beside `FEATURES` rather than in `data/biomes.json`, and that is a deliberate reading of
 * rule four. The rule forbids creature and biome *content* in TypeScript, which is why species and
 * journal prose live in JSON. A frame index is not content: it is one half of a contract with a
 * builder, and the other half is a list in a file in `tools/`. Splitting those two across a data
 * file would put the sheet's order somewhere a test cannot see it next to the code that indexes it,
 * which is exactly the drift `frames.ts` exists to prevent.
 */
export const DECOR_ORDER = [
  'lily-pad',
  'lotus',
  'reed-tuft',
  'marsh-stone',
  'pebbles',
  'wildflower',
  'clover',
  'twig',
  'leaf-litter',
  'mushroom',
  'forest-stone',
  'scree',
  'boulder-small',
  'desert-stone',
  'dry-brush',
  'shell',
  'driftwood-small',
  // The sub-biomes, in the order tools/build-decor.js emits them.
  'basalt-shard',
  'ash-patch',
  'lava-boulder',
  'sulphur-crust',
  'vent-mouth',
  'cinder-brush',
  'snow-stone',
  'wind-crust',
  'snow-twig',
  'snow-drift',
  'frost-tuft',
  'snow-tracks',
  'cushion-plant',
  'sky-stone',
  'wind-seed',
  'crystal-grit',
  'sky-moss',
  'crystal-flower'
] as const;

/**
 * The decor sheet's cell, which is *half* a tile. Matches CELL in tools/build-decor.js.
 *
 * Not GRID, and deliberately: a prop is a few dozen pixels of stone in a mostly-empty cell, and at
 * full tile size the transparent remainder still costs the GPU a blend per pixel. See the note in
 * the builder for what that measured.
 */
export const DECOR_CELL = GRID / 2;

/** Variants per prop. Matches VARIANTS in tools/build-decor.js. */
export const DECOR_VARIANTS = 3;

/** Which props lie on which ground. Mirrors the `biomes` list on each entry in the builder. */
export const DECOR_BY_BIOME: Partial<Record<BiomeId, readonly string[]>> = {
  river: ['lily-pad', 'reed-tuft', 'marsh-stone'],
  wetland: ['lily-pad', 'lotus', 'reed-tuft', 'marsh-stone'],
  plains: ['pebbles', 'wildflower', 'clover', 'twig'],
  settlement: ['pebbles', 'clover'],
  forest: ['twig', 'leaf-litter', 'mushroom', 'forest-stone'],
  hills: ['pebbles', 'twig', 'scree', 'boulder-small'],
  mountains: ['scree', 'boulder-small'],
  desert: ['desert-stone', 'dry-brush'],
  coast: ['pebbles', 'shell', 'driftwood-small'],
  // Cooled basalt. The ash is what keeps it from reading as one flat dark tile.
  lava_field: ['basalt-shard', 'ash-patch', 'lava-boulder', 'sulphur-crust', 'vent-mouth', 'cinder-brush'],
  // On snow the props are what shows *through* it: a white ground gets its depth from the things
  // it has not covered, so a buried stone and a bare twig do more here than they do anywhere else.
  snow: ['snow-stone', 'wind-crust', 'snow-twig', 'snow-drift', 'frost-tuft', 'snow-tracks'],
  // High turf, weathered stone, and the crystal the islands are known for.
  sky_island: ['cushion-plant', 'sky-stone', 'wind-seed', 'crystal-grit', 'sky-moss', 'crystal-flower']
  // `sea` is not walked on and `landmark` stays bare, so the destination is what the eye finds --
  // the same two exclusions the overdraw layer makes, for the same reasons. `sky_underside` joins
  // them: it is the far side of a boundary rather than ground, and nothing stands on it.
};

/** Frame index of one prop variant, or null if the name is not on the sheet. */
export function decorFrame(prop: string, variant: number): number | null {
  const index = DECOR_ORDER.indexOf(prop as (typeof DECOR_ORDER)[number]);
  if (index < 0) return null;
  return index * DECOR_VARIANTS + (variant % DECOR_VARIANTS);
}

/**
 * How many props a tile carries, from a hash.
 *
 * One to three, with two thirds of tiles getting at least one. Denser than the features layer by a
 * long way -- that is one tile in twelve -- because these lie flat and below the traveller, so they
 * cannot obstruct anything. The target frame holds around forty objects in a screen of roughly
 * sixteen by nine tiles, which is where this range comes from rather than from taste.
 */
export function decorCount(hash: number): number {
  const roll = hash % 6;
  if (roll < 2) return 0;
  if (roll < 4) return 1;
  if (roll === 4) return 2;
  return 3;
}

// --- the edge blend ------------------------------------------------------

/**
 * The four edges of a cell, in the order `tools/build-edges.js` writes them.
 *
 * Index into `assets/edges.png` is `EDGE_ORDER.indexOf(edge) * EDGE_VARIANTS + variant`.
 */
export const EDGE_ORDER = ['n', 'e', 's', 'w'] as const;
export type Edge = (typeof EDGE_ORDER)[number];

/** Torn variants per edge. Matches VARIANTS in tools/build-edges.js. */
export const EDGE_VARIANTS = 4;

/** Neighbour offset for each edge. */
export const EDGE_STEP: Record<Edge, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  e: { dx: 1, dy: 0 },
  s: { dx: 0, dy: 1 },
  w: { dx: -1, dy: 0 }
};

/** Frame index of one torn mask. */
export function edgeMaskFrame(edge: Edge, variant: number): number {
  return EDGE_ORDER.indexOf(edge) * EDGE_VARIANTS + (variant % EDGE_VARIANTS);
}

/**
 * Whether a boundary between two biomes should be blended at all.
 *
 * Not every pair should. The blend says *these two grounds meet gradually*, and some of them do
 * not: a coastline is where the land stops, and bleeding plains out over the sea turns a definite
 * edge into a vague one. Water keeps its outline. Everything else on land bleeds into everything
 * else on land.
 *
 * `sea` and `river` are the water set rather than a `walkable` test, because `mountains` is also
 * unwalkable and a mountain absolutely should merge into the hills below it.
 */
const WATER: ReadonlySet<BiomeId> = new Set<BiomeId>(['sea', 'river']);

export function blends(here: BiomeId, there: BiomeId): boolean {
  if (here === there) return false;
  // A shore is a line, and should stay one.
  if (WATER.has(here) !== WATER.has(there)) return false;
  return true;
}

// --- the cliff edge ------------------------------------------------------

/**
 * A cliff is drawn on the *high* tile, along the edge facing a lower one.
 *
 * The rule the reference frame taught, stated once: **ground textures do not carry height.** Grass
 * and dirt stay flat and quiet and say nothing about elevation; every bit of it is carried by a
 * drawn rock edge where high ground meets low. This is the predicate for "is there such a boundary
 * here", and it is deliberately the same shape as `blends` above -- ask the neighbour, get a
 * boolean, let the scene plan do the rest.
 *
 * Drawn on the high side rather than the low one because a cliff belongs to the ledge it is the
 * edge of. Unlike the torn blend, which both tiles emit so neither ends up holding a straight line,
 * exactly one side draws a cliff: two would put a rock face at the top *and* the bottom of the same
 * drop.
 *
 * **Water is excluded, and leaving it in was a real bug.** Rivers are carved after the elevation
 * field is laid down, so a river running through upland keeps the height of the ground it cut and
 * its neighbours do not. Height alone therefore said "draw a rock face here" along every bank --
 * and, where a river ran between two of its own tiles at different heights, *inside the water*.
 * Rendered on a real map, **83 of 234 cliff faces touched water**, which turned a river valley into
 * something that read as a stone-lined canal.
 *
 * `blends` above already refuses the mirror image of this for the mirror reason: a shoreline is
 * where the land stops, and bleeding two grounds across it turns a definite edge into a vague one.
 * A cliff makes the opposite mistake, putting a hard built-looking edge where the water already
 * draws its own.
 */
export function cliffAt(
  hereBand: number,
  thereBand: number,
  here: BiomeId,
  there: BiomeId
): boolean {
  if (WATER.has(here) || WATER.has(there)) return false;
  return hereBand > thereBand;
}

/**
 * Frame of one cliff face. Same layout as the torn masks, so `build-edges.js` needs no new
 * arithmetic and the sheet can be swapped in without touching the indexing.
 */
export function cliffFrame(edge: Edge, variant: number): number {
  return EDGE_ORDER.indexOf(edge) * EDGE_VARIANTS + (variant % EDGE_VARIANTS);
}

/**
 * A treeline is drawn on the *forest* tile, along the edge facing open ground.
 *
 * The same rim the cliff is, filled with trees instead of rock -- and the reference that taught the
 * shape proved it is a slot rather than a special case, by drawing the identical structure nine
 * times in nine materials, one of them a wooden palisade.
 *
 * Worth stating why this is not the tree layer that was rejected before. `forest-canopy.png` is
 * already a canopy seen from above, so scattering trees across forest tiles would draw trees on a
 * picture of treetops -- doubling sprites for nothing, which is why `FEATURES` has bamboo and bees
 * and logs for forest but no tree. A treeline is the opposite shape of work: it draws only on the
 * boundary, giving the forest a silhouette the flat texture cannot, and leaves the interior alone.
 * Measured on the real field maps it is 248 sprites at worst, about 5% more than the plan already
 * holds.
 */
export function treelineAt(here: BiomeId, there: BiomeId): boolean {
  return here === 'forest' && there !== 'forest';
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
/**
 * The first of sixteen fence pieces, one per side mask.
 *
 * There used to be one frame here, and it was a bottom rail -- so a fence could only honestly be
 * drawn along a settlement's southern edge, which is what the placement code did. That left about
 * 88% of a settlement's perimeter unfenced: seventeen boundary tiles against two fences drawn on
 * Lothal, four on Dwarka.
 */
export const FENCE_FIRST = OVERDRAW_REST * 2;

/** How many fence pieces the sheet carries: every combination of four sides. */
export const FENCE_PIECES = 16;

/** North, east, south, west, as the bits `fenceFrame` reads. */
export const FENCE_SIDE = { north: 1, east: 2, south: 4, west: 8 } as const;

/**
 * The fence piece for a tile whose given sides face open ground.
 *
 * A mask rather than four separate frames stacked, because two runs meeting at a corner have to
 * *join*: drawn as separate sprites they cross, and the corner reads as two fences passing each
 * other rather than one turning.
 */
export function fenceFrame(sides: number): number {
  return FENCE_FIRST + (sides & (FENCE_PIECES - 1));
}

/** Marks left underfoot, drawn once per step and faded out. */
export const PRINTS_FRAME = FENCE_FIRST + FENCE_PIECES;
export const SPLASH_FRAME = PRINTS_FRAME + 1;

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
  cactus: { biome: 'desert', frames: [24, 25] },
  // A snowfield and a sky island each get one tall thing, and on those two grounds it is
  // the only vertical there is.
  snowPine: { biome: 'snow', frames: [26, 27] },
  crystalCluster: { biome: 'sky_island', frames: [28, 29] },
  basaltColumn: { biome: 'lava_field', frames: [30, 31] },
  snowSnag: { biome: 'snow', frames: [32, 33] }
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
