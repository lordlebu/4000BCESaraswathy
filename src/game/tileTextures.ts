// Tile and object artwork, loaded from the sheets built by `tools/build-terrain.js`.
//
// This file used to generate a coloured square with a glyph on it for each biome, and said that
// when real art arrived it would be replaced by an atlas load. That is what has happened, and
// `WorldScene` kept placing tiles exactly as it did before.
//
// The art is four sheets rather than one atlas because the frames are three different sizes:
// ground is 32x32 and opaque, landmark objects are 32x32 with alpha, the authored places are
// 32x40 so a tower can stand taller than the tile it occupies, and huts are 20x22 so they sit
// inside a tile with ground showing around them.
//
// Which frame is which lives in `frames.ts`, which is free of Phaser so the tests can read it
// under Node. This file is only the engine half: loading the sheets and the fog pixel.

import Phaser from 'phaser';

export {
  HUT_VARIANTS,
  LANDMARK_ORDER,
  PLACE_ORDER,
  TERRAIN_ORDER,
  landmarkFrame,
  placeFrame,
  tileFrame
} from './frames';

export const TILE_SIZE = 32;

export const TERRAIN_SHEET = 'terrain';
export const LANDMARK_SHEET = 'landmarks';
export const PLACE_SHEET = 'places';
export const HUT_SHEET = 'huts';

/** The 1x1 white pixel the fog layer stretches over each tile. */
export const FOG_TEXTURE = 'fog:pixel';

/** Load every sheet. Call from `preload`. */
export function loadTileSheets(
  scene: Phaser.Scene,
  urls: { terrain: string; landmarks: string; places: string; huts: string }
): void {
  const sheet = (key: string, url: string, frameWidth: number, frameHeight: number) => {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, url, { frameWidth, frameHeight });
  };
  sheet(TERRAIN_SHEET, urls.terrain, TILE_SIZE, TILE_SIZE);
  sheet(LANDMARK_SHEET, urls.landmarks, TILE_SIZE, TILE_SIZE);
  sheet(PLACE_SHEET, urls.places, TILE_SIZE, 40);
  sheet(HUT_SHEET, urls.huts, 20, 22);
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
