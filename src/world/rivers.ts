// River carving.
//
// In the vanilla prototype this was dead code: it only ran on hill and mountain tiles, and the
// flat elevation field meant there were never any. With `field.ts` fixed it runs for real, so the
// two things it always got wrong now matter:
//
//   * it could stop on a slope, leaving a river that started nowhere and ended nowhere;
//   * it walked into local minima and simply gave up.
//
// Both are handled here by treating a river as something that must reach water. If the downhill
// walk traps itself in a basin, the basin becomes a pool — which is a real landform, reads well in
// the journal, and means "every river ends in water" is a property the tests can hold us to.

import type { BiomeId, Point, Tile } from './types';
import { THRESHOLDS } from './classify';

/** Biomes a river is allowed to end in. */
const WATER: ReadonlySet<BiomeId> = new Set<BiomeId>(['sea', 'coast', 'wetland']);

/** Biomes a river must not overwrite as it passes through. */
const PROTECTED: ReadonlySet<BiomeId> = new Set<BiomeId>(['sea', 'coast', 'settlement', 'landmark']);

export function orthogonalNeighbours(tile: Point, width: number, height: number): Point[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 }
  ].filter((p) => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);
}

/**
 * Walk downhill from `source`, turning tiles into `river` until water is reached.
 *
 * Returns the carved path, or an empty array if the source was already water. `riverBias` is added
 * to the downhill comparison so two rivers starting side by side pick different valleys instead of
 * braiding into one line.
 */
export function carveRiver(tiles: Tile[][], width: number, height: number, source: Tile): Point[] {
  if (WATER.has(source.biome)) return [];

  const path: Point[] = [];
  const visited = new Set<string>();
  let current = source;

  for (let step = 0; step < width * height; step += 1) {
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) break;
    visited.add(key);

    // Termination is checked *before* overwriting, so arriving at a marsh ends the river rather
    // than painting over the very water we were looking for.
    if (WATER.has(current.biome) || current.elevation < THRESHOLDS.COAST) return path;

    if (!PROTECTED.has(current.biome)) {
      current.biome = 'river';
      path.push({ x: current.x, y: current.y });
    }

    const downhill = orthogonalNeighbours(current, width, height)
      .map(({ x, y }) => tiles[y]![x]!)
      .filter((tile) => !visited.has(`${tile.x},${tile.y}`))
      .sort((a, b) => a.elevation + a.riverBias - (b.elevation + b.riverBias))[0];

    // No unvisited neighbour, or every way out is uphill: this is a basin, so pool here.
    if (!downhill || downhill.elevation > current.elevation) {
      if (!PROTECTED.has(current.biome)) {
        current.biome = 'wetland';
        path.pop();
      }
      return path;
    }

    current = downhill;
  }

  return path;
}

/**
 * Pick river sources and carve them.
 *
 * Sources come from the highest ground so rivers read as running off the spine, and are spaced
 * apart so a 36x24 map does not end up with five streams leaving the same peak.
 */
export function carveRivers(
  tiles: Tile[][],
  width: number,
  height: number,
  sources: Tile[],
  minSpacing = 5
): Point[][] {
  const carved: Point[][] = [];
  const taken: Point[] = [];

  for (const source of sources) {
    const tooClose = taken.some((p) => Math.hypot(p.x - source.x, p.y - source.y) < minSpacing);
    if (tooClose) continue;
    const path = carveRiver(tiles, width, height, source);
    if (path.length < 2) continue;
    taken.push({ x: source.x, y: source.y });
    carved.push(path);
  }

  return carved;
}
