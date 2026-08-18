// Tile and object artwork, loaded from the sheets built by `tools/build-terrain.js`.
//
// This file used to generate a coloured square with a glyph on it for each biome, and said that
// when real art arrived it would be replaced by an atlas load using the same frame keys. That is
// what has happened: `WorldScene` still asks for `tileTextureKey(biome)` and gets a texture, so
// nothing about how the map is placed had to change.
//
// The art is four sheets rather than one atlas because the frames are three different sizes:
// ground is 32x32 and opaque, landmark objects are 32x32 with alpha, the authored places are
// 32x40 so a tower can stand taller than the tile it occupies, and huts are 20x22 so they sit
// inside a tile with ground showing around them.
//
// Frame order in each sheet is fixed by the builder and mirrored here. It is load-bearing in the
// same way canon's `source_index` is: reordering the constant silently repaints the world.

import Phaser from 'phaser';
import type { BiomeId } from '../world/types';

export const TILE_SIZE = 32;

/** Frame order of `assets/terrain.png`, matching TILES in tools/build-terrain.js. */
const TERRAIN_ORDER: BiomeId[] = [
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
const LANDMARK_ORDER = [
  'great-banyan',
  'hot-spring',
  'shell-beach',
  'hill-shrine',
  'standing-stones',
  'heron-pool',
  'salt-pan'
];

/** Frame order of `assets/places.png` — canon's archaeological sites, by point-of-interest id. */
const PLACE_ORDER = [
  'poi_kavik_tower',
  'poi_silted_granary',
  'poi_long_archive',
  'poi_mooring_stones',
  'poi_drowned_seawall',
  'poi_customs_house',
  'poi_bone_midden',
  'poi_stepped_quarry'
];

export const TERRAIN_SHEET = 'terrain';
export const LANDMARK_SHEET = 'landmarks';
export const PLACE_SHEET = 'places';
export const HUT_SHEET = 'huts';

/** How many hut variants the sheet carries, for the seeded per-tile pick. */
export const HUT_VARIANTS = 4;

/** The 1x1 white pixel the fog layer stretches over each tile. */
export const FOG_TEXTURE = 'fog:pixel';

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
