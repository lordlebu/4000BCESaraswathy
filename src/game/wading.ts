// How deep a walker stands in whatever they are standing in.
//
// Wading used to be one case: the sky pools, where the figure fades toward the feet under a water
// gradient. The ask was the same for the ground's own water, at two depths -- **a river to the
// waist, a swamp to the feet** -- so this is a table rather than a check for one biome.
//
// The sky pool keeps its own look, deliberately: the island art and its treatment are kept separate
// from the ground's. Everything else is drawn the way Pokemon and Stardew draw shallow water -- the
// part of the figure below the surface is cut away and the surface is drawn across the cut -- which
// needs no art, because it is the same frames with less of them showing.
//
// Free of Phaser, so `test/wading.test.ts` holds the table without a browser.

import type { Tile } from '../world/types';

/** How a walker is drawn on a tile: not wading, the sky pool's fade, or cut at a depth. */
export type Wade =
  | { kind: 'dry' }
  | { kind: 'sky' }
  /** `depth` is the share of the figure's height below the surface, 0 to 1. */
  | { kind: 'cut'; depth: number };

// Shares of the *frame*, set by looking rather than by anatomy. The travellers are drawn with the
// proportions of the art -- a large head and hat over a short body -- so a waist is about a third of
// the way up the frame, not half. Half was tried first and put the shoulders under the river.

/** To the waist. */
export const RIVER_DEPTH = 0.32;
/** The shins: a ford is where the river is shallow enough to cross, which is why it is the ford. */
export const FORD_DEPTH = 0.2;
/** The feet: a swamp is wet ground, level with the river's surface and barely under it. */
export const SWAMP_DEPTH = 0.1;

export function wadeFor(tile: Pick<Tile, 'biome' | 'ford' | 'bridge'> | undefined): Wade {
  if (!tile || tile.bridge) return { kind: 'dry' };
  if (tile.biome === 'sky_water') return { kind: 'sky' };
  if (tile.biome === 'river') return { kind: 'cut', depth: tile.ford ? FORD_DEPTH : RIVER_DEPTH };
  if (tile.biome === 'wetland') return { kind: 'cut', depth: SWAMP_DEPTH };
  return { kind: 'dry' };
}
