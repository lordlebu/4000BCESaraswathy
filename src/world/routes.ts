// Easing the ground between the places worth reaching.
//
// The three rules a field map has to obey are: the rim is hard, the middle is easier, and **the
// places are reachable however far out they sit**. The first two are functions of position and
// the shapers in `landform.ts` handle them. The third is not a function of position at all -- it
// depends on where the content ended up -- so it cannot be done while generating terrain. It has
// to happen after placement.
//
// That inverts the usual order, and the inversion is the point:
//
//     generate terrain  ->  place the points of interest  ->  ease the routes between them
//
// A valley is therefore literally the path between two places, rather than a landform that a
// place happens to sit in. It is also exactly the line Phase 6 wants to draw on the map, which is
// not a coincidence: the road and the drawing of the road should be the same fact.

import { findPath } from './pathfind';
import type { BiomeId, Point, Tile } from './types';

/**
 * What each biome becomes when a route is eased through it.
 *
 * Softening rather than flattening: hills become the plains between them, forest opens to the
 * clearing a track would follow, mountains drop to a pass. Wetland becomes river, which is the
 * delta's whole answer -- you do not drain a marsh to cross it, you follow the channel.
 *
 * Sea, coast, settlement and landmark are absent deliberately. A route must not fill in water,
 * pave a beach, or overwrite authored ground.
 */
const EASED: Partial<Record<BiomeId, BiomeId>> = {
  mountains: 'hills',
  hills: 'plains',
  forest: 'plains',
  wetland: 'river',
  desert: 'plains'
};

/**
 * What crossing each biome costs, for choosing where a route runs.
 *
 * Duplicated from `data/biomes.json` rather than imported, because `world/` stays independent of
 * the content layer -- the same reason `isWalkable` is duplicated in `generate.ts`, and
 * `test/species.test.ts` asserts the two agree. Only the *ordering* matters here: a route should
 * prefer cheap ground, and a table that disagreed on absolute values would still pick the same
 * line.
 */
const CROSSING: Partial<Record<BiomeId, number>> = {
  coast: 1, plains: 1, river: 1, settlement: 1, landmark: 1,
  forest: 2, wetland: 2, hills: 2, desert: 2,
  mountains: 3
};

/** Cost of entering a tile, on the same scale the game uses. */
export function crossingCost(tile: Tile): number {
  return CROSSING[tile.biome] ?? 1;
}

/** Only the sea stops a route, which mirrors `isWalkable` in `generate.ts`. */
export function routable(tile: Tile): boolean {
  return tile.biome !== 'sea';
}

export interface EaseOptions {
  /**
   * How wide the eased corridor is, in tiles either side of the line.
   *
   * One, and deliberately narrow. A three-wide corridor between six places erases the map's
   * character -- the point is a track through difficult country, not a cleared plain.
   *
   * Wet maps take two. A delta's interior is marsh by definition, so no shaping can make it cheap
   * and the only honest cheap ground is the channel network itself; a one-wide thread through 60%
   * wetland reads as a scratch rather than as the way people actually move. Measured: a delta at
   * radius 1 leaves the interior at cost 1.84, and the whole point of the landform is that you
   * follow the water.
   */
  radius?: number;
  /** Cost of entering a tile, so routes are eased along the way somebody would actually walk. */
  costOf?: (tile: Tile) => number;
  /** Whether a tile can be walked at all. Routes never cross water. */
  isWalkable?: (tile: Tile) => boolean;
  /**
   * Tiles a route may pass through but must not change.
   *
   * The places themselves, and the landmark. Easing runs after placement -- it has to, since it
   * needs to know where the places ended up -- so without this it can soften the very tile a place
   * was placed on and leave it standing on terrain canon forbids. `poi_silted_granary landed on
   * river` was exactly that: the granary is authored for settlement or wetland, and the route to
   * it turned its own tile into a channel.
   */
  keep?: ReadonlySet<string>;
}

/**
 * Soften the ground along the routes between `stops`, in place.
 *
 * Returns the tiles that were changed, which is what a caller needs to draw the road or to assert
 * that a route exists. Stops are joined in the order given: the caller decides what the network
 * looks like, because canon knows which places belong together and this does not.
 */
export function easeRoutes(
  tiles: Tile[][],
  width: number,
  height: number,
  stops: readonly Point[],
  { radius = 1, costOf = crossingCost, isWalkable = routable, keep }: EaseOptions = {}
): Point[] {
  const touched: Point[] = [];
  const seen = new Set<string>();

  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i]!;
    const to = stops[i + 1]!;
    // Cost-aware, so the eased route follows the line somebody would have walked anyway rather
    // than cutting a straight scar across the map.
    const path = findPath(tiles, width, height, from, to, isWalkable, costOf);

    for (const step of [from, ...path]) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          // Manhattan, so the corridor has soft ends rather than square ones.
          if (Math.abs(dx) + Math.abs(dy) > radius) continue;
          const tile = tiles[step.y + dy]?.[step.x + dx];
          if (!tile) continue;
          const eased = EASED[tile.biome];
          if (!eased) continue;
          const key = `${tile.x},${tile.y}`;
          if (seen.has(key) || keep?.has(key)) continue;
          seen.add(key);
          tile.biome = eased;
          touched.push({ x: tile.x, y: tile.y });
        }
      }
    }
  }

  return touched;
}

/**
 * Order stops into a route that does not double back.
 *
 * Nearest-neighbour from the first stop. Not optimal -- a travelling-salesman route would be --
 * but a naturalist walking a delta does not solve for the optimum either, and the difference is
 * invisible on six places. Deterministic, which matters more: ties break on position so the same
 * map eases the same routes every time.
 */
export function tourOrder(stops: readonly Point[], from: Point): Point[] {
  const left = [...stops];
  const order: Point[] = [];
  let at = from;
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    left.forEach((p, i) => {
      const d = Math.abs(p.x - at.x) + Math.abs(p.y - at.y);
      if (d < bestD || (d === bestD && (p.y < left[best]!.y || (p.y === left[best]!.y && p.x < left[best]!.x)))) {
        bestD = d;
        best = i;
      }
    });
    at = left[best]!;
    order.push(at);
    left.splice(best, 1);
  }
  return order;
}
