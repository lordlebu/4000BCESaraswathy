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
import { GRID, DECOR_CELL } from './frames';

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
  FENCE_FRAME,
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
  tileFrame
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
export const DECOR_SHEET = 'decor';

/** The 1x1 white pixel the fog layer stretches over each tile. See `createTileTextures`. */
export const FOG_TEXTURE = 'fog:pixel';

/** The soft ellipse the traveller stands on. See `createTileTextures`. */
export const SHADOW_TEXTURE = 'shadow:contact';


/** Load every sheet. Call from `preload`. */
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
    decor: string;
  }
): void {
  const sheet = (key: string, url: string, frameWidth: number, frameHeight: number) => {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, url, { frameWidth, frameHeight });
  };
  sheet(TERRAIN_SHEET, urls.terrain, TILE_SIZE, TILE_SIZE);
  sheet(LANDMARK_SHEET, urls.landmarks, TILE_SIZE, TILE_SIZE);
  sheet(PLACE_SHEET, urls.places, TILE_SIZE, PLACE_HEIGHT);
  sheet(HUT_SHEET, urls.huts, HUT_WIDTH, HUT_HEIGHT);
  sheet(OVERDRAW_SHEET, urls.overdraw, TILE_SIZE, TILE_SIZE);
  sheet(FEATURE_SHEET, urls.features, TILE_SIZE, TILE_SIZE);
  sheet(EDGE_SHEET, urls.edges, TILE_SIZE, TILE_SIZE);
  sheet(DECOR_SHEET, urls.decor, DECOR_CELL, DECOR_CELL);
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
