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
import { isWalkable } from './generate';
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

/**
 * Whether a route may pass through this tile. `isWalkable`'s answer, asked of `isWalkable`.
 *
 * **This used to be `tile.biome !== 'sea'` with a comment saying it mirrored `isWalkable`, and the
 * mirror had gone two biomes stale.** `UNWALKABLE` grew `open_sky` and `sky_underside` when the
 * floating islands were stamped, and nothing here noticed -- so every tour on the Aravali has been
 * routed *through the underside of an island*, which is open air with rock hanging in it.
 *
 * It was invisible for two reasons that both stopped being true at once. Easing changes nothing
 * there, because `EASED` has no entry for either biome; and nothing drew the line, so a route
 * through solid rock cost nothing and showed nowhere. Drawing the road is what surfaced it, and
 * `test/road.test.ts` failed by name on `road at 22,57 is on sky_underside`.
 *
 * Duplicating the *rule* was never the problem -- `CLAUDE.md` is explicit that `world/` may not
 * import the content layer, and `crossingCost` above duplicates the travel costs for that reason.
 * Duplicating it as a **different expression of the same idea** was: a set membership on one side
 * and a single inequality on the other cannot drift loudly. Calling the function removes the copy
 * entirely, and `generate.ts` imports nothing from here, so there is no cycle to pay for it.
 */
export function routable(tile: Tile): boolean {
  return isWalkable(tile);
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
 * The two facts an ease produces, which are not the same fact.
 *
 * **`eased` is not the road, and the comment that said it was cost a phase.** It holds only the
 * tiles whose *biome changed* -- so a route running over ground that was already cheap touches
 * nothing at all, and a drawing taken from it is a scatter of scraps where the country happened to
 * be hard. Measured across the four maps: 7 tiles against a 110-tile route on the Aravali, 13
 * against 123 on Dwarka, 21 against 93 on Lothal, 64 against 104 on Narmada. **Between 88% and 97%
 * of the road was missing**, and it was missing exactly where the walking is easiest, which is
 * where a path gets worn in real life.
 *
 * `line` is the road: every tile the route steps on, one wide, in the order it was walked.
 */
export interface EasedRoutes {
  /** Every tile the route stepped on, one tile wide. This is what draws a road. */
  line: Point[];
  /** Only the tiles whose biome the ease changed. This is what asserts the ground got softer. */
  eased: Point[];
}

/**
 * Soften the ground along the routes between `stops`, in place.
 *
 * Returns both the line the route walked and the tiles the easing changed -- see `EasedRoutes` for
 * why those are different and which one draws a road. Stops are joined in the order given: the
 * caller decides what the network looks like, because canon knows which places belong together and
 * this does not.
 *
 * **The line is computed leg by leg against ground earlier legs have already softened**, which is
 * the honest answer rather than an artefact: a second route to the same place follows the track
 * the first one cut, because by then that track is the cheapest ground there is. Re-running
 * `findPath` afterwards on the finished world would give a different and worse line, since every
 * leg would see softening that had not happened when it was walked.
 */
export function easeRoutes(
  tiles: Tile[][],
  width: number,
  height: number,
  stops: readonly Point[],
  { radius = 1, costOf = crossingCost, isWalkable = routable, keep }: EaseOptions = {}
): EasedRoutes {
  const eased: Point[] = [];
  const seen = new Set<string>();
  const line: Point[] = [];
  const walked = new Set<string>();

  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i]!;
    const to = stops[i + 1]!;
    // Cost-aware, so the eased route follows the line somebody would have walked anyway rather
    // than cutting a straight scar across the map.
    const path = findPath(tiles, width, height, from, to, isWalkable, costOf);

    for (const step of [from, ...path]) {
      // The line is the road, and it is collected whether or not this tile needed softening --
      // which is the whole difference between the two lists. Deduplicated across legs, because a
      // tour revisits its own junctions and a road drawn twice is a road drawn once.
      const here = `${step.x},${step.y}`;
      if (!walked.has(here)) {
        walked.add(here);
        line.push({ x: step.x, y: step.y });
      }

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          // Manhattan, so the corridor has soft ends rather than square ones.
          if (Math.abs(dx) + Math.abs(dy) > radius) continue;
          const tile = tiles[step.y + dy]?.[step.x + dx];
          if (!tile) continue;
          const softer = EASED[tile.biome];
          if (!softer) continue;
          const key = `${tile.x},${tile.y}`;
          if (seen.has(key) || keep?.has(key)) continue;
          seen.add(key);
          tile.biome = softer;
          eased.push({ x: tile.x, y: tile.y });
        }
      }
    }
  }

  return { line, eased };
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
