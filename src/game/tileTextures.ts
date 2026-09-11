// Tile and object artwork, loaded from the sheets built by `tools/build-terrain.js`.
//
// This file used to generate a coloured square with a glyph on it for each biome, and said that
// when real art arrived it would be replaced by an atlas load. That is what has happened, and
// `WorldScene` kept placing tiles exactly as it did before.
//
// The art is four sheets rather than one atlas because the frames are three different sizes:
// ground and landmark objects are square, the authored places are 4:5 so a tower can stand taller
// than the tile it occupies, and huts are smaller than a cell so ground shows around them. Every
// one of those is a ratio to `GRID` rather than a fixed pixel count -- see `frames.ts`.
//
// Which frame is which lives in `frames.ts`, which is free of Phaser so the tests can read it
// under Node. This file is only the engine half: loading the sheets, baking the edge blends, and
// building the fog disc.

import Phaser from 'phaser';
import { GRID, DECOR_CELL, SHORE_BAND, CLOUD_VOXELS, FALL_FRAMES, tileFrame, type Edge } from './frames';
import windmill from '../../assets/windmill.json';

export {
  GRID,
  DECOR_CELL,
  DECOR_ORDER,
  DECOR_VARIANTS,
  DECOR_BY_BIOME,
  decorFrame,
  decorCount,
  EDGE_ORDER,
  EDGE_STEP,
  EDGE_VARIANTS,
  blends,
  edgeMaskFrame,
  depthFor,
  ROW_SLOT,
  FEATURE_RARITY,
  FEATURES,
  FENCE_FIRST,
  FENCE_PIECES,
  FENCE_SIDE,
  fenceFrame,
  HUT_VARIANTS,
  OVERDRAW_REST,
  PRINTS_FRAME,
  SPLASH_FRAME,
  LANDMARK_ORDER,
  PLACE_ORDER,
  TERRAIN_ORDER,
  featureFrame,
  landmarkFrame,
  overdrawFrame,
  placeFrame,
  swayFrame,
  traceFrameFor,
  tileFrame,
  hasTileArt
} from './frames';

/**
 * The world grid, in pixels of art.
 *
 * 32 until the art direction changed. At 32 a tile was drawn at roughly 80 screen pixels on a
 * 1280-wide viewport -- a 2.5x upscale of its own texture -- which is why the shipped game looked
 * soft whatever the source art was.
 *
 * This is the *art* size, not a world measurement. Nothing about distance, travel cost or the
 * 0.375 km a tile represents changes with it; `WorldScene` multiplies tile coordinates by this to
 * get pixel positions, and the camera fits `TILES_ACROSS` of them to the screen either way.
 *
 * `tools/build-terrain.js` has the matching SCALE. Change one, change both.
 */
export const TILE_SIZE = GRID;

/** Places stand taller than their tile: a 32:40 ratio, scaled with everything else. */
const PLACE_HEIGHT = (TILE_SIZE / 32) * 40;

/** Huts sit inside a cell with ground showing around them: 20:22 at the same scale. */
const HUT_WIDTH = (TILE_SIZE / 32) * 20;
const HUT_HEIGHT = (TILE_SIZE / 32) * 22;

export const TERRAIN_SHEET = 'terrain';
export const LANDMARK_SHEET = 'landmarks';
export const PLACE_SHEET = 'places';
export const HUT_SHEET = 'huts';
export const OVERDRAW_SHEET = 'overdraw';
export const FEATURE_SHEET = 'features';
export const EDGE_SHEET = 'edges';
/** The rock face where a height terrace drops away. Same 4x4 layout as the torn masks. */
/** The painted flora sheet, built by `tools/build-flora.js`. */
export const FLORA_SHEET = 'flora';

/**
 * The aero-mangroves, which stand taller than their tile.
 *
 * A fourth bottom-anchored sheet beside `places`, `huts` and `landmarks`, and for their reason: a
 * tree whose roots are half its height cannot be drawn in a square cell without the canopy
 * vanishing. 32:44 at the same SCALE as everything else -- see TALL in tools/build-flora.js.
 */
export const TREE_SHEET = 'trees';
const TREE_HEIGHT = (TILE_SIZE / 32) * 44;

/**
 * Buildings bigger than a tile, painted rather than generated.
 *
 * **The only sheet here whose cell is wider than a tile, and it costs the engine nothing.**
 * `WorldScene` draws an anchored sprite with `setOrigin(0.5, 1)` and never calls
 * `setDisplaySize`, so a sheet's cell size *is* its size on screen -- which means "can a building
 * take more than one tile" was never a code question, only a number in a builder.
 *
 * 256 x 416 is two tiles wide and three and a quarter tall. At the `places` cell of 128 x 160 the
 * temple's seven spires merged into one lumpy ridge and its plinth courses became a grey stripe:
 * you could tell it was a pale ruin and not that it was a temple.
 *
 * What it does cost is worth knowing before it surprises somebody. A sprite this tall covers three
 * rows above its anchor, and one this wide overhangs half a tile either side of its column, so two
 * painted places landing adjacent would overlap. There is one painted place today. That is the
 * reason not to paint every point of interest at this size, rather than a defect in this one.
 */
export const MONUMENT_SHEET = 'monuments';
/** The mill's tower, and the wheel that turns on it — two sheets because only one of them moves. */
export const WINDMILL_SHEET = 'windmill';
export const BLADE_SHEET = 'blades';
/** Planks over the island notches — `track.png`'s four pieces again, in weathered timber. */
export const BRIDGE_SHEET = 'bridge';
const MONUMENT_WIDTH = TILE_SIZE * 2;
const MONUMENT_HEIGHT = (TILE_SIZE / 32) * 104;

export const CLIFF_SHEET = 'cliffs';
/** The wall of trees where a forest stops. Same layout again -- see `tools/build-rims.js`. */
export const TREELINE_SHEET = 'treeline';
/**
 * Growth spilling over the lip of a floating island. The third rim, same 4x4 layout as the other
 * two -- see `tools/build-rims.js` for why the format generalised to a plant.
 */
export const OVERHANG_SHEET = 'overhang';
export const DECOR_SHEET = 'decor';
/**
 * The railway, which is ground rather than scenery.
 *
 * A fourth scatter contract and the narrowest: flat, tile-filling, no sub-tile offset, drawn below
 * the traveller, and placed by `Tile.track` rather than by what the ground is made of. See
 * `tools/build-track.js` for why none of the other three fit.
 */
export const TRACK_SHEET = 'track';

/**
 * The rope crossing: the same four pieces as the rail, in hemp and timber.
 *
 * A second sheet rather than a second flag -- see `planTrack`. Built by `tools/build-rope.js` from
 * painted art at the same 32-pixel grid the rail is drawn at in code, so the two sit at the same
 * resolution and the same whole-number upscale.
 */
export const ROPE_SHEET = 'rope';

/**
 * The worn path between the places: the same four pieces again, in packed earth.
 *
 * Third sheet on one contract, which is the point of having a contract. Drawn in code by
 * `tools/build-road.js` after a painted sheet came back unable to tile -- see that file's header
 * and `docs/art-brief.md` Asset 2f. Alpha at the band's edges rather than a hard silhouette, so the
 * ground it is worn into shows through and the path sits *in* the grass rather than on it.
 */
export const ROAD_SHEET = 'road';

/** The 1x1 white pixel the fog layer stretches over each tile. See `createTileTextures`. */
export const FOG_TEXTURE = 'fog:pixel';

/** The soft ellipse the traveller stands on. See `createTileTextures`. */
export const SHADOW_TEXTURE = 'shadow:contact';


/**
 * Sheets that failed to load, by key, in the order they failed.
 *
 * Exported so a test or a diagnostic can ask. Phaser's own answer to a failed load is to hand
 * out a 32x32 magenta-and-black `__MISSING` checkerboard and carry on, which is why this went
 * unnoticed on GitHub Pages for as long as it did: the game looked like it was working and drew
 * black squares. A texture that silently substitutes itself is the worst possible failure mode
 * for art, because nothing anywhere reports it.
 */
const failedSheets: string[] = [];

/** Which sheets failed to load, if any. Empty when everything arrived. */
export function missingSheets(): readonly string[] {
  return failedSheets;
}

/**
 * Load every sheet. Call from `preload`.
 *
 * **A failed sheet says so.** Every load is watched, and a failure is logged with the key and
 * the URL that did not arrive, then recorded in `missingSheets()`. This is deliberately louder
 * than the rest of the engine: the tileset is about to grow a great deal, `tools/build-*.js`
 * generates ten sheets from art that lives outside this repository, and a sheet that is missing,
 * misnamed or half-built is the single most likely thing to go wrong. The checkerboard is not a
 * diagnosis; the key and the URL are.
 */
export function loadTileSheets(
  scene: Phaser.Scene,
  urls: {
    terrain: string;
    landmarks: string;
    places: string;
    huts: string;
    overdraw: string;
    features: string;
    edges: string;
    cliffs: string;
    flora: string;
    treeline: string;
    overhang: string;
    trees: string;
    monuments: string;
    windmill: string;
    blades: string;
    bridge: string;
    rope: string;
    road: string;
    decor: string;
    track: string;
  }
): void {
  // One handler for the whole batch rather than one per sheet: `loaderror` fires with the file
  // that failed, so a single listener names any of them. Registered before the queueing below,
  // because a cached-but-corrupt file can fail during the very first `load.spritesheet` call.
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    if (!failedSheets.includes(file.key)) failedSheets.push(file.key);
    console.error(
      `[tiles] sheet "${file.key}" failed to load from ${file.url}. ` +
        'Phaser will draw a magenta checkerboard in its place. ' +
        'Check that tools/build-*.js produced it and that it shipped in the bundle.'
    );
  });

  const sheet = (key: string, url: string, frameWidth: number, frameHeight: number) => {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, url, { frameWidth, frameHeight });
  };
  sheet(TERRAIN_SHEET, urls.terrain, TILE_SIZE, TILE_SIZE);
  sheet(LANDMARK_SHEET, urls.landmarks, TILE_SIZE, TILE_SIZE);
  sheet(PLACE_SHEET, urls.places, TILE_SIZE, PLACE_HEIGHT);
  sheet(MONUMENT_SHEET, urls.monuments, MONUMENT_WIDTH, MONUMENT_HEIGHT);
  sheet(WINDMILL_SHEET, urls.windmill, windmill.tower.width, windmill.tower.height);
  sheet(BLADE_SHEET, urls.blades, windmill.blade, windmill.blade);
  sheet(BRIDGE_SHEET, urls.bridge, TILE_SIZE, TILE_SIZE);
  sheet(HUT_SHEET, urls.huts, HUT_WIDTH, HUT_HEIGHT);
  sheet(OVERDRAW_SHEET, urls.overdraw, TILE_SIZE, TILE_SIZE);
  sheet(FEATURE_SHEET, urls.features, TILE_SIZE, TILE_SIZE);
  sheet(EDGE_SHEET, urls.edges, TILE_SIZE, TILE_SIZE);
  sheet(CLIFF_SHEET, urls.cliffs, TILE_SIZE, TILE_SIZE);
  sheet(FLORA_SHEET, urls.flora, TILE_SIZE, TILE_SIZE);
  sheet(TREE_SHEET, urls.trees, TILE_SIZE, TREE_HEIGHT);
  sheet(TREELINE_SHEET, urls.treeline, TILE_SIZE, TILE_SIZE);
  sheet(OVERHANG_SHEET, urls.overhang, TILE_SIZE, TILE_SIZE);
  sheet(DECOR_SHEET, urls.decor, DECOR_CELL, DECOR_CELL);
  sheet(TRACK_SHEET, urls.track, TILE_SIZE, TILE_SIZE);
  sheet(ROPE_SHEET, urls.rope, TILE_SIZE, TILE_SIZE);
  sheet(ROAD_SHEET, urls.road, TILE_SIZE, TILE_SIZE);
}

/**
 * Pre-multiply every terrain frame by every torn mask, once, at scene start.
 *
 * The blend layer wants "this biome, seen through that tear", and there are around twelve thousand
 * placements of it on a 64x64 map. Giving each sprite a Phaser mask is out of the question: a
 * `BitmapMask` costs a framebuffer and a second render pass *per object*, and a `GeometryMask`
 * cannot express an alpha gradient at all.
 *
 * But the *combinations* are few. Eleven biomes by sixteen masks is 176 textures, built once with
 * a canvas `destination-in` composite and then drawn as ordinary images -- so the scene pays for
 * 176 small canvas operations at startup and nothing at all per frame. Twelve thousand blend
 * sprites then batch exactly like twelve thousand tiles do.
 *
 * Keyed `blend:<terrainFrame>:<maskFrame>`, and built lazily: a map only uses the pairs its own
 * biomes produce, which is usually a third of the grid.
 */
export function blendTextureKey(scene: Phaser.Scene, terrainFrame: number, maskFrame: number): string {
  const key = `blend:${terrainFrame}:${maskFrame}`;
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const terrain = scene.textures.getFrame(TERRAIN_SHEET, terrainFrame);
  const mask = scene.textures.getFrame(EDGE_SHEET, maskFrame);
  if (!terrain || !mask) return key;

  // The ground bleeding in...
  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.drawImage(
    terrain.source.image as CanvasImageSource,
    terrain.cutX, terrain.cutY, terrain.cutWidth, terrain.cutHeight,
    0, 0, TILE_SIZE, TILE_SIZE
  );
  // ...keeping only where the tear says it may show.
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(
    mask.source.image as CanvasImageSource,
    mask.cutX, mask.cutY, mask.cutWidth, mask.cutHeight,
    0, 0, TILE_SIZE, TILE_SIZE
  );
  context.globalCompositeOperation = 'source-over';
  canvas.refresh();
  return key;
}

/**
 * The bank's shadow, baked once per edge and variant.
 *
 * **A band, not a cell.** The other baked texture here -- `blendTextureKey` -- is a whole tile,
 * because a bleed can start anywhere in one. A shore band is pinned to one edge and reaches three
 * eighths of the way in, so a full cell would be five eighths transparent and the GPU would blend
 * every pixel of it. At the worst on-screen count measured on Lothal that is the difference
 * between 2.82M and 1.06M pixels a frame; see `SHORE_BAND`.
 *
 * **The tear is not drawn here either.** `assets/edges.png` already holds four edges by four
 * variants of ragged alpha reaching a third of a cell, built for the blend layer, so the shore
 * fades out along the same irregular contour every other boundary on the map uses. Taking the
 * strip of that mask nearest the edge is the whole of the shape work.
 *
 * Three passes, and the last one is the one that matters:
 *
 *   1. a gradient from the waterline inward -- a pale wet line, then the darkest shade a few
 *      pixels in, then away to nothing;
 *   2. `destination-in` with the mask, so the fade ends raggedly rather than on a straight line;
 *   3. a short unmasked gradient over the first quarter of the band.
 *
 * Without (3) the shadow would be as thin as 4px wherever the tear happened to be shallow -- the
 * masks vary from a tenth of their reach to all of it -- and a bank's contact shadow that comes and
 * goes reads as dirt on the screen rather than as a bank. The ragged part is the *fade*; the
 * contact is continuous.
 *
 * Keyed `shore:<edge>:<maskFrame>`, so a map builds at most sixteen of them.
 */
/**
 * The shape of a band pinned to one edge of a cell, and the strip of a 128 frame it reads from.
 *
 * Shared by the two band layers because they are the same rectangle seen from opposite sides of
 * the waterline: the bank lip inside the land cell, the bank's shadow inside the water one.
 */
function bandGeometry(edge: Edge): {
  width: number;
  height: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  cutX: number;
  cutY: number;
  cutWidth: number;
  cutHeight: number;
} {
  const horizontal = edge === 'n' || edge === 's';
  const width = horizontal ? TILE_SIZE : SHORE_BAND;
  const height = horizontal ? SHORE_BAND : TILE_SIZE;
  return {
    width,
    height,
    // The waterline is the edge the other ground is on; the band reaches inward from there.
    from: { x: edge === 'e' ? width : 0, y: edge === 's' ? height : 0 },
    to: { x: edge === 'w' ? width : 0, y: edge === 'n' ? height : 0 },
    cutX: edge === 'e' ? TILE_SIZE - SHORE_BAND : 0,
    cutY: edge === 's' ? TILE_SIZE - SHORE_BAND : 0,
    cutWidth: horizontal ? TILE_SIZE : SHORE_BAND,
    cutHeight: horizontal ? SHORE_BAND : TILE_SIZE
  };
}

/**
 * The beach a stretch of land puts down where it meets water.
 *
 * The same pair `blendTextureKey` bakes -- a terrain frame behind a torn mask -- cut down to the
 * strip that can actually show. **That crop is not tidiness, it is the whole cost of the layer.**
 * Baking the bank as a full cell was measured on the densest shore on Lothal at 12% of the frame
 * on CI's software rasteriser, against a gate of 10, and the lip was the expensive half: 377 full
 * cells is more blended pixel than 643 bands. A mask that reaches a third of a cell cannot paint
 * anything past 48 pixels, so five eighths of that cell was a transparent quad the GPU blended
 * anyway.
 *
 * Keyed `bank:<terrainFrame>:<edge>:<maskFrame>`.
 */
export function bankTextureKey(
  scene: Phaser.Scene,
  terrainFrame: number,
  edge: Edge,
  maskFrame: number
): string {
  const key = `bank:${terrainFrame}:${edge}:${maskFrame}`;
  if (scene.textures.exists(key)) return key;

  const box = bandGeometry(edge);
  const canvas = scene.textures.createCanvas(key, box.width, box.height);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const terrain = scene.textures.getFrame(TERRAIN_SHEET, terrainFrame);
  const mask = scene.textures.getFrame(EDGE_SHEET, maskFrame);
  if (!terrain || !mask) return key;

  // The same strip of the source as of the mask, so the sand keeps the part of its own texture
  // that belongs against this edge rather than an arbitrary crop of the middle.
  context.drawImage(
    terrain.source.image as CanvasImageSource,
    terrain.cutX + box.cutX, terrain.cutY + box.cutY, box.cutWidth, box.cutHeight,
    0, 0, box.width, box.height
  );
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(
    mask.source.image as CanvasImageSource,
    mask.cutX + box.cutX, mask.cutY + box.cutY, box.cutWidth, box.cutHeight,
    0, 0, box.width, box.height
  );
  context.globalCompositeOperation = 'source-over';
  canvas.refresh();
  return key;
}

export function shoreTextureKey(scene: Phaser.Scene, edge: Edge, maskFrame: number): string {
  const key = `shore:${edge}:${maskFrame}`;
  if (scene.textures.exists(key)) return key;

  const horizontal = edge === 'n' || edge === 's';
  const box = bandGeometry(edge);
  const { width, height, from, to } = box;

  const canvas = scene.textures.createCanvas(key, width, height);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const mask = scene.textures.getFrame(EDGE_SHEET, maskFrame);
  if (!mask) return key;

  const full = context.createLinearGradient(from.x, from.y, to.x, to.y);
  // Wet sand catching the light, then the shade under the lip, then the open water. The dark is
  // the same ink `planIslandShadow` puts on the sea, because it is the same claim: light does not
  // get in here.
  full.addColorStop(0, 'rgba(232,201,130,0.42)');
  full.addColorStop(0.055, 'rgba(11,28,48,0.46)');
  full.addColorStop(0.34, 'rgba(11,28,48,0.30)');
  full.addColorStop(1, 'rgba(11,28,48,0)');
  context.fillStyle = full;
  context.fillRect(0, 0, width, height);

  // Only where the tear allows. The strip of the mask nearest this edge is the one whose alpha
  // runs from solid at the boundary to nothing inland, which is the profile the band wants.
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(
    mask.source.image as CanvasImageSource,
    mask.cutX + box.cutX, mask.cutY + box.cutY, box.cutWidth, box.cutHeight,
    0, 0, width, height
  );
  context.globalCompositeOperation = 'source-over';

  // The contact, which does not get to be ragged.
  const contactSpan = 0.26;
  const contact = context.createLinearGradient(
    from.x, from.y,
    horizontal ? from.x : from.x + (to.x - from.x) * contactSpan,
    horizontal ? from.y + (to.y - from.y) * contactSpan : from.y
  );
  contact.addColorStop(0, 'rgba(232,201,130,0.42)');
  contact.addColorStop(0.2, 'rgba(11,28,48,0.44)');
  contact.addColorStop(1, 'rgba(11,28,48,0)');
  context.fillStyle = contact;
  context.fillRect(
    edge === 'e' ? width - Math.round(width * contactSpan) : 0,
    edge === 's' ? height - Math.round(height * contactSpan) : 0,
    horizontal ? width : Math.round(width * contactSpan),
    horizontal ? Math.round(height * contactSpan) : height
  );

  canvas.refresh();
  return key;
}

/**
 * The shade on the underside of a floating shelf: dense against the rock above, gone by the bottom.
 *
 * **Ambient occlusion, and the same claim `planIslandShadow` makes about the sea.** That one
 * darkens the water below an island because light does not get underneath it; this darkens the
 * underside rock for the same reason and on the same gradient -- hard against the lip the island
 * hangs from, fading with distance from it. Without it the underside is a flat slab of stone lit
 * exactly like the top, which is the one thing it cannot be.
 *
 * A vertical gradient over the whole cell rather than a band, because the whole cell is in shade
 * and only the amount changes. One texture for the map: the underside is one biome, and every tile
 * of it wants the same fall-off.
 */
export function undersideShadeKey(scene: Phaser.Scene): string {
  const key = 'shade:underside';
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const fall = context.createLinearGradient(0, 0, 0, TILE_SIZE);
  // The same ink the island's shadow puts on the water, so the two read as one light doing one
  // thing rather than as two effects that happen to be dark.
  fall.addColorStop(0, 'rgba(11,28,48,0.52)');
  fall.addColorStop(0.45, 'rgba(11,28,48,0.28)');
  fall.addColorStop(1, 'rgba(11,28,48,0.04)');
  context.fillStyle = fall;
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  canvas.refresh();
  return key;
}

/**
 * Standing water on a floating island: the river tile under a pale wash.
 *
 * **Baked rather than painted, and that is the cheap half of adding this biome.** `tileTextures`
 * already bakes six textures and `blendTextureKey` is the exact precedent -- draw a terrain frame
 * into a canvas, composite something over it, hand Phaser a key. A second painted water tile would
 * have to be kept in step with the first by hand, and would mean a slot in `terrain.png` and a row
 * in `tools/build-terrain.js` for what is, honestly, the same water in a different light.
 *
 * **Paler and greener than the river, because there is nothing under it.** A river reads blue
 * partly from its own depth and partly from the bed: silt, stones, the shadow of a bank. A pool on
 * a shelf a thousand feet up has open air below the rock that holds it and sky above it, so it
 * goes thin, bright and toward aquamarine. Canon has rainwater falling *upward* under these
 * islands; the water on top of one should not look like the Saraswati.
 *
 * `screen` rather than a flat overlay: multiplying a wash over the tile would dull the highlights
 * that make water read as water, and those highlights are the whole of what the river tile has.
 */
export function skyWaterTileKey(scene: Phaser.Scene, variant: number): string {
  const key = `sky-water:${variant}`;
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const river = scene.textures.getFrame(TERRAIN_SHEET, tileFrame('river', variant));
  if (!river) return key;

  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.drawImage(
    river.source.image as CanvasImageSource,
    river.cutX, river.cutY, river.cutWidth, river.cutHeight,
    0, 0, TILE_SIZE, TILE_SIZE
  );
  context.globalCompositeOperation = 'screen';
  context.fillStyle = 'rgba(96,178,190,0.42)';
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.globalCompositeOperation = 'source-over';
  canvas.refresh();
  return key;
}

/**
 * One tile of falling water, built out of the same quarter-tile voxels the cloud is.
 *
 * **This is the case voxels suit better than the cloud did.** The cloud is deliberately still,
 * because alternating two frames of voxel reads as a flicker rather than a drift. Falling water is
 * the opposite: the flicker *is* the effect. Two frames whose voxel columns are offset by half a
 * voxel, run through the `SWAY_PERIOD` machinery that already alternates every swaying sprite, is
 * water going over an edge -- and it costs one quad per tile and no art at all.
 *
 * **Columns rather than a field, because water falls in threads.** Each voxel column runs the full
 * height of the tile at one brightness, so a stack of these tiles reads as continuous streaks down
 * the rock rather than as a grid of blocks. The gaps between columns are what makes it water and
 * not a wall, so a third of them are empty.
 */
export function waterfallTextureKey(scene: Phaser.Scene, frame: number): string {
  const key = `fall:${frame}`;
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  const voxel = TILE_SIZE / CLOUD_VOXELS;
  // Half a voxel between the two frames: enough that the eye reads movement, small enough that it
  // reads as the *same* water moving rather than as two different pictures.
  const drop = (frame % FALL_FRAMES) * (voxel / 2);

  let seed = Math.imul(frame + 7, 2654435761);
  const next = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed ^= seed >>> 13;
    return (seed >>> 0) / 4294967296;
  };

  for (let vx = 0; vx < CLOUD_VOXELS; vx += 1) {
    // A third of the columns are air. Water that filled the cell would be a pane of glass.
    if (next() < 0.34) continue;
    const bright = 0.45 + next() * 0.45;
    for (let vy = -1; vy < CLOUD_VOXELS + 1; vy += 1) {
      // Broken along its length as well as across it, so a thread has beads in it.
      const lit = next() < 0.2 ? bright * 0.45 : bright;
      context.globalAlpha = lit;
      context.fillStyle = next() < 0.4 ? '#bfe4f2' : '#eaf6fb';
      context.fillRect(vx * voxel, vy * voxel + drop, voxel, voxel);
    }
  }
  context.globalAlpha = 1;
  canvas.refresh();
  return key;
}

/**
 * One tile of cloud, built out of quarter-tile voxels at varying translucency.
 *
 * **Baked, and that is what makes it affordable.** The obvious way to draw sixteen voxels is
 * sixteen quads, which would put 3,000 blended objects over the Aravali's sea and cost more than
 * everything else on the map put together -- `docs/rendering.md` is clear that fill rate is the
 * budget and that blended fill is the expensive kind. Baked once into a texture, a cloud tile is
 * one quad with an alpha channel: the same cost as a tile of water, drawn twice.
 *
 * **The voxels are not shaded toward the tile's edge, deliberately.** Fading a cloud out at its own
 * cell boundary is the obvious way to make one tile look like a puff, and a field of them is then a
 * grid of puffs -- the tile seam arriving by a fourth route, after the ground textures, the
 * repeating mottle and the rim layers each had to be argued out of it. The *shape* of a cloud is
 * carried by `planClouds`, which fades a whole tile's alpha with its distance from the cloud's
 * heart. Inside a tile the voxels only vary, and a few of them are missing.
 *
 * The colour is the pale end of the sky rather than white: white on a dark sea is a hole in the
 * screen, and these sit over the same water the islands' shadow darkens.
 */
export function cloudTextureKey(scene: Phaser.Scene, pattern: number): string {
  const key = `cloud:${pattern}`;
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

  let seed = Math.imul(pattern + 1, 2654435761);
  const next = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed ^= seed >>> 13;
    return (seed >>> 0) / 4294967296;
  };

  const voxel = TILE_SIZE / CLOUD_VOXELS;
  for (let vy = 0; vy < CLOUD_VOXELS; vy += 1) {
    for (let vx = 0; vx < CLOUD_VOXELS; vx += 1) {
      const roll = next();
      // One voxel in six is simply absent, which is what keeps a bank of cloud ragged rather than
      // rectangular. The rest run from half-lit to nearly solid.
      if (roll < 0.16) continue;
      // Lit from above, like everything else on this map: the top row of voxels is the brightest.
      const lit = 1 - (vy / (CLOUD_VOXELS - 1)) * 0.22;
      context.globalAlpha = (0.5 + next() * 0.5) * lit;
      context.fillStyle = next() < 0.35 ? '#cfdcec' : '#e9f0f8';
      context.fillRect(vx * voxel, vy * voxel, voxel, voxel);
    }
  }
  context.globalAlpha = 1;

  canvas.refresh();
  return key;
}

/**
 * The water a wading traveller stands in, drawn over his legs.
 *
 * **One quad, not a second sprite, and that is the whole design.** The obvious build is two cropped
 * copies of the figure -- an upper half drawn normally and a lower half at reduced alpha -- and it
 * is worse twice: it doubles the sprite the walk animation drives, and it puts the waterline's
 * exact height in two places that have to agree forever.
 *
 * So the figure is drawn once, untouched, and this is laid over his lower half. It is the *water*
 * in front of him rather than a see-through version of him, which is also what is physically
 * happening, and it means the animation, the flip, the tint and the frame timing all stay in one
 * place and know nothing about wading.
 *
 * A gradient rather than a flat wash, because a hard line across the shins reads as a costume. It
 * is densest a little below the surface and thins downward, so more of him shows the deeper he
 * goes -- which is the wrong way round for real water and the right way round for reading a figure
 * at this size. The same trick and the same reason as `undersideShadeKey`.
 */
export function waterlineKey(scene: Phaser.Scene): string {
  const key = 'water:line';
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  const fall = context.createLinearGradient(0, 0, 0, TILE_SIZE);
  // The surface itself, brightest: a rim of lit water where the figure breaks it.
  fall.addColorStop(0, 'rgba(190,232,242,0.86)');
  fall.addColorStop(0.14, 'rgba(120,196,214,0.72)');
  fall.addColorStop(0.55, 'rgba(74,150,178,0.44)');
  fall.addColorStop(1, 'rgba(52,116,150,0.24)');
  context.fillStyle = fall;
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  canvas.refresh();
  return key;
}

/**
 * A stand-in tile for ground the art has not caught up with.
 *
 * **This is what stops new terrain waiting on a drawing.** `assets/terrain.png` is built by
 * `tools/build-terrain.js` from art in `assets/source/`, and that script converts art rather than
 * inventing it -- so a biome with no source PNG could not be drawn at all. Canon carries five such
 * biomes (`lava_field`, three sky biomes and `underworld`) and marks them `renderable: false` for
 * exactly that reason, which strands every species that lives only there.
 *
 * Nothing has to be invented to fill the gap, because `data/biomes.json` already gives every biome
 * a `color` and a `symbol` -- `~` for sea, `♣` for forest, `▲` for mountains. Those two fields were
 * written for the text map and between them describe a tile completely.
 *
 * **It has to look like ground, not like a debug swatch.** A flat fill with a white glyph on it
 * would read as a missing asset, which is worse than the checkerboard it replaces -- the point is
 * that a map using these should still be worth walking. So the tile is mottled in its own hue the
 * way the drawn tiles are, with the mark carried in a darker shade of the same colour rather than
 * in white. It reads as unfinished ground rather than as an error, which is exactly what it is.
 *
 * Built once per biome and variant, cached by Phaser under `placeholder:<biome>:<variant>`.
 */
export function placeholderTileKey(
  scene: Phaser.Scene,
  biome: string,
  colour: string,
  symbol: string,
  variant = 0
): string {
  const key = `placeholder:${biome}:${variant}`;
  if (scene.textures.exists(key)) return key;

  const canvas = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
  const context = canvas?.getContext();
  if (!canvas || !context) return key;

  const base = parseHex(colour);

  context.fillStyle = shade(base, 0);
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Mottling, seeded from the biome name and the variant so a field of these is varied but the
  // same tile is the same every load. Coarse blotches first, then finer grain over them -- which
  // is roughly what the drawn tiles do and is why they read as material rather than as fill.
  let seed = 0;
  for (const char of `${biome}:${variant}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const next = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed ^= seed >>> 13;
    return (seed >>> 0) / 4294967296;
  };

  for (let i = 0; i < 16; i += 1) {
    const r = TILE_SIZE * (0.12 + next() * 0.20);
    context.globalAlpha = 0.09 + next() * 0.10;
    context.fillStyle = shade(base, next() < 0.5 ? -0.26 : 0.20);
    context.beginPath();
    context.arc(next() * TILE_SIZE, next() * TILE_SIZE, r, 0, Math.PI * 2);
    context.fill();
  }
  for (let i = 0; i < 130; i += 1) {
    context.globalAlpha = 0.06 + next() * 0.10;
    context.fillStyle = shade(base, next() < 0.5 ? -0.34 : 0.26);
    const size = 2 + Math.floor(next() * 4);
    context.fillRect(next() * TILE_SIZE, next() * TILE_SIZE, size, size);
  }
  context.globalAlpha = 1;

  // **The mark goes on some tiles, not all of them.**
  //
  // Drawn on every tile it tiles -- a glyph dead centre of every cell is a regular grid, and a
  // screen of them reads as a debug overlay however well the ground underneath is coloured. Real
  // terrain art varies. So only one variant in four carries the mark and it sits off-centre,
  // which turns a stamp into an occasional feature on the ground: enough to tell you what you are
  // standing on when you look, invisible as a pattern when you do not.
  if (variant % 4 === 0) {
    context.font = `${Math.round(TILE_SIZE * 0.38)}px system-ui, "Segoe UI Symbol", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.globalAlpha = 0.30;
    context.fillStyle = shade(base, -0.5);
    context.fillText(
      symbol,
      TILE_SIZE * (0.34 + next() * 0.32),
      TILE_SIZE * (0.34 + next() * 0.32)
    );
    context.globalAlpha = 1;
  }

  canvas.refresh();
  return key;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(colour: string): Rgb {
  const hex = colour.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return { r: 140, g: 140, b: 140 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Lighten (positive) or darken (negative) toward white or black, by a fraction. */
function shade({ r, g, b }: Rgb, amount: number): string {
  const mix = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount))));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Build the fog pixel. Safe to call more than once — Phaser keeps textures across scene restarts,
 * so a second call would otherwise warn about a duplicate key.
 */
export function createTileTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG_TEXTURE)) return;

  // One white pixel, stretched over a tile.
  //
  // This was briefly a soft disc scaled past its cell, so neighbouring quads overlapped into cloud
  // with no straight edge. It looked better and was wrong: alpha from a fogged tile's disc lands on
  // its *neighbours*, so a cleared tile surrounded by unexplored ground collects the bleed from all
  // eight of them and goes dark. Measured at the settings that shipped, a cleared tile received a
  // mean 0.26 and a peak 0.49 -- enough to hide the traveller standing on it, which is exactly what
  // it did.
  //
  // The tension is structural rather than a bad constant. Additive per-tile quads cannot be soft at
  // the boundary *and* leave cleared ground clear: every setting that drops the bleed to nothing
  // also stops neighbouring fog from meeting, which puts the grid back as a lattice of seams. The
  // simulation is in the commit; no point on that curve is good.
  //
  // So the shape goes back to a plain quad, which has neither problem -- adjacent tiles at equal
  // alpha are seamless, and nothing reaches past its own cell. What is kept from the attempt is the
  // part that was independently right: the alphas are far lower than the 0.92 this started at, so
  // unexplored ground now shades the map instead of hiding it.
  //
  // The real fix is a single fog `RenderTexture` filled once and *erased* through a soft brush at
  // every known tile. Erasing subtracts rather than accumulates, so it is soft at the edge and
  // exact in the middle, which is both requirements at once. It needs a full redraw per step rather
  // than per frame and is a bigger change than a texture swap, so it is written down here rather
  // than rushed.
  const fog = scene.textures.createCanvas(FOG_TEXTURE, 1, 1);
  const context = fog?.getContext();
  if (fog && context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1, 1);
    fog.refresh();
  }

  createShadowTexture(scene);
}

/**
 * The contact shadow the traveller stands on.
 *
 * Without one he floats: a figure drawn over ground with no darkening beneath reads as pasted on
 * rather than standing, which is the single clearest difference between the shipped frame and
 * `endgame.png` once the ground itself stopped being a grid.
 *
 * The old art brief forbade shadows outright -- it wanted flat, matte, e-ink -- and the rewritten
 * one requires ambient shading under every mass. This is that rule applied to the one mass that
 * moves.
 *
 * A radial gradient rather than a flat ellipse, and squashed by the drawing rather than the
 * texture, so one 64-pixel square serves any figure at any scale.
 */
function createShadowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHADOW_TEXTURE)) return;
  const size = 64;
  const canvas = scene.textures.createCanvas(SHADOW_TEXTURE, size, size);
  const context = canvas?.getContext();
  if (!canvas || !context) return;
  const half = size / 2;
  const gradient = context.createRadialGradient(half, half, 0, half, half, half);
  // Held near-solid in the middle so the contact point reads, then away quickly. A linear falloff
  // gives a grey disc with a visible rim, which looks like a plate rather than a shadow.
  gradient.addColorStop(0, 'rgba(28,22,18,0.5)');
  gradient.addColorStop(0.45, 'rgba(28,22,18,0.3)');
  gradient.addColorStop(1, 'rgba(28,22,18,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  canvas.refresh();
}

/*
 * There is no vignette, and that is a measurement rather than an oversight.
 *
 * One was built and shipped: a soft radial darkening over the frame's edges, so the picture did not
 * end flat at the screen border. It looked mildly better and it cost too much in the one place that
 * matters for the build.
 *
 * A vignette is a full-screen alpha-blended quad every frame. On the GPU a player actually has,
 * that is free -- 7.0 ms a frame either way. On the software rasteriser headless Chromium uses,
 * and therefore on CI, it measured **83 ms a frame against 67 ms without**: a 24% increase for the
 * whole scene. That pushed four walk-heavy browser specs past their ninety-second budget and turned
 * the browser job red.
 *
 * The trade was not worth it. It is the weakest of the things added in that change -- the contact
 * shadow beside it is in the target frame and this was not -- so it went and the shadow stayed.
 *
 * If it comes back, it should be drawn as **four bands around the edge** rather than one quad over
 * the whole screen. The middle of a vignette is fully transparent and still costs a blend per
 * pixel; rasterising only the parts that are actually dark would cut most of the cost. That is real
 * work for a subtle effect, which is why it was not done now.
 */
