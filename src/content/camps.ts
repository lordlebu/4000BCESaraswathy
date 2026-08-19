// Where you can rest, and where you have not been yet.
//
// Both questions are answered from what canon already holds. A camp is not a new kind of thing:
// `poi.kind` has `settlement` and `travel_node` already, every field map has at least one of
// them, and the map already draws a travel node as a cold fire-ring. So this is a predicate over
// existing data rather than a feature with content behind it.
//
// Pure, and takes a built world rather than reaching for one, so the whole of it is testable
// under Node.

import type { PlacedPoi } from '../world/fieldMap';
import type { Point } from '../world/types';
import type { PointOfInterest } from './places';

/**
 * Somewhere the traveller can stop for the night.
 *
 * A settlement has people in it and a travel node exists to be halted at; both are places you
 * would sleep. The other four kinds are things you go and look at -- a quarry, a scar in the
 * glass, a drowned seawall -- and camping in them would read as strange.
 *
 * Phase 5's fatigue depends on a camp always being reachable, which is why `test/camps.test.ts`
 * asserts every map has one rather than trusting that it does.
 */
export function isCamp(poi: PointOfInterest): boolean {
  return poi.kind === 'settlement' || poi.kind === 'travel_node';
}

/** Manhattan distance, which is the metric the walk actually uses -- steps are orthogonal. */
export function stepsBetween(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * The closest of `among` to `from`, or null if there are none.
 *
 * Ties break on id so the answer does not depend on array order. Two camps the same distance
 * away would otherwise swap places between builds and take the hint's wording with them.
 */
function nearest(among: PlacedPoi[], from: Point): PlacedPoi | null {
  let best: PlacedPoi | null = null;
  for (const candidate of among) {
    if (!best) {
      best = candidate;
      continue;
    }
    const d = stepsBetween(candidate.at, from);
    const bestD = stepsBetween(best.at, from);
    if (d < bestD || (d === bestD && candidate.poi.id < best.poi.id)) best = candidate;
  }
  return best;
}

/** The nearest place to rest. Includes the one being stood on, at distance zero. */
export function nearestCamp(placed: PlacedPoi[], from: Point): PlacedPoi | null {
  return nearest(placed.filter((p) => isCamp(p.poi)), from);
}

/**
 * The nearest place the traveller has not stood on yet.
 *
 * "Not been to" is read from the fog rather than from a visit counter, because the fog is the
 * thing that is saved. A place whose tile has been walked over is somewhere you have been,
 * whether or not you opened its panel and read it.
 */
export function nearestUnvisited(
  placed: PlacedPoi[],
  from: Point,
  discovered: ReadonlySet<string>
): PlacedPoi | null {
  return nearest(
    placed.filter((p) => !discovered.has(`${p.at.x},${p.at.y}`)),
    from
  );
}
