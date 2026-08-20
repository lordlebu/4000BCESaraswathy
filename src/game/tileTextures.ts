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
// under Node. This file is only the engine half: loading the sheets and the fog pixel.

import Phaser from 'phaser';
import { GRID } from './frames';

export {
  GRID,
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

/** The 1x1 white pixel the fog layer stretches over each tile. */
export const FOG_TEXTURE = 'fog:pixel';

/** Load every sheet. Call from `preload`. */
export function loadTileSheets(
  scene: Phaser.Scene,
  urls: { terrain: string; landmarks: string; places: string; huts: string; overdraw: string; features: string }
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
}

/**
 * Build the fog pixel. Safe to call more than once — Phaser keeps textures across scene restarts,
 * so a second call would otherwise warn about a duplicate key.
 */
export function createTileTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG_TEXTURE)) return;
  const fog = scene.textures.createCanvas(FOG_TEXTURE, 1, 1);
  const context = fog?.getContext();
  if (fog && context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1, 1);
    fog.refresh();
  }
}
