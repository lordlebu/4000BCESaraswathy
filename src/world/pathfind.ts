// The path between two tiles, for click and tap to move.
//
// Keyboard players step one tile at a time, which is fine. On a phone there is no keyboard, so a
// tap has to mean "walk over there" — and walking there has to route around the sea rather than
// bump into it.
//
// This was breadth-first search, on the reasoning that every step costs the same. It does not:
// `travelCost` makes a mountain three times the walk of open plains, and the scene has always
// scaled each step's duration by it. Only the *route* ignored it, so a tap across a range walked
// straight over the top rather than around on level ground — visibly the wrong choice, and the
// slower one. Uniform-cost search fixes that and degrades to exactly the old behaviour when every
// tile costs the same, which is what the default `costOf` gives.

import { Heap } from './heap';
import { orthogonalNeighbours } from './rivers';
import type { Point, Tile } from './types';

/**
 * The cheapest walkable path from `from` to `to`, excluding `from` itself.
 *
 * Returns an empty array when the target is unreachable or is the tile already stood on, so a tap
 * on the sea simply does nothing.
 *
 * `costOf` is the cost of *entering* a tile, and defaults to a flat 1 — under which this returns
 * the same shortest path the old breadth-first version did. Callers that care about terrain pass
 * `travelCost`.
 */
export function findPath(
  tiles: Tile[][],
  width: number,
  height: number,
  from: Point,
  to: Point,
  isWalkable: (tile: Tile) => boolean,
  costOf: (tile: Tile) => number = () => 1
): Point[] {
  if (from.x === to.x && from.y === to.y) return [];
  const result = searchRoutes(tiles, width, height, from, isWalkable, costOf, to);
  if (!result.has(pointKey(to))) return [];
  const path: Point[] = [];
  let step: Point | null = { x: to.x, y: to.y };
  while (step && pointKey(step) !== pointKey(from)) {
    path.push(step);
    step = result.get(pointKey(step))?.previous ?? null;
  }
  return path.reverse();
}

export const pointKey = (p: Point): string => `${p.x},${p.y}`;
export interface RouteDistance { cost: number; steps: number; previous: Point | null }
export type DistanceMap = ReadonlyMap<string, RouteDistance>;

/** One search shared by all guidance candidates. Callers restrict passability to known ground. */
export function routeDistances(
  tiles: Tile[][], width: number, height: number, from: Point,
  passable: (tile: Tile) => boolean, costOf: (tile: Tile) => number = () => 1
): DistanceMap {
  return searchRoutes(tiles, width, height, from, passable, costOf);
}

function searchRoutes(
  tiles: Tile[][], width: number, height: number, from: Point,
  passable: (tile: Tile) => boolean, costOf: (tile: Tile) => number, to?: Point
): Map<string, RouteDistance> {
  const result = new Map<string, RouteDistance>();
  if (!tiles[from.y]?.[from.x]) return result;
  if (to && (!tiles[to.y]?.[to.x] || !passable(tiles[to.y]![to.x]!))) return result;
  result.set(pointKey(from), { cost: 0, steps: 0, previous: null });
  // Preserve tap-to-walk's established tie order. Guidance breaks equal costs by fewer steps.
  const frontier = new Heap<{ at: Point; cost: number; steps: number; seq: number }>(
    (a, b) => a.cost - b.cost || (!to ? a.steps - b.steps : 0) || a.at.y - b.at.y || a.at.x - b.at.x || a.seq - b.seq
  );
  frontier.push({ at: from, cost: 0, steps: 0, seq: 0 });
  let seq = 1;
  while (frontier.size) {
    const current = frontier.pop()!;
    const best = result.get(pointKey(current.at))!;
    if (current.cost > best.cost || (!to && current.steps > best.steps)) continue;
    if (to && pointKey(current.at) === pointKey(to)) break;
    for (const at of orthogonalNeighbours(current.at, width, height)) {
      const tile = tiles[at.y]![at.x]!;
      if (!passable(tile)) continue;
      const raw = costOf(tile);
      const cost = current.cost + (raw > 0 ? raw : 1);
      const steps = current.steps + 1;
      const old = result.get(pointKey(at));
      if (old && (cost > old.cost || (cost === old.cost && (to || steps >= old.steps)))) continue;
      result.set(pointKey(at), { cost, steps, previous: current.at });
      frontier.push({ at, cost, steps, seq: seq++ });
    }
  }
  return result;
}

/**
 * The walkable tile nearest `to` that can actually be reached from `from`, or null if that is
 * where the walker already stands.
 *
 * **So that a click never does nothing.** `findPath` returns an empty path for a tile it cannot
 * reach -- open sea, open sky, the far side of water -- and the scene took that as "stay put", with
 * no sign that anything was heard. That is how the Aravali's cut-off far shore read as a frozen
 * game rather than as a place you could not get to. Walking as close as the ground allows, and
 * marking the spot, is what point-and-click and strategy games have always done with it.
 *
 * Nearest by straight-line distance to the target, because that is what "as close as I can get"
 * means to the person who clicked; ties go to the tile nearer the walker, then to `y`, then to `x`,
 * so the same click chooses the same tile every time.
 */
export function nearestReachable(
  tiles: Tile[][],
  width: number,
  height: number,
  from: Point,
  to: Point,
  isWalkable: (tile: Tile) => boolean
): Point | null {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue: { at: Point; steps: number }[] = [{ at: from, steps: 0 }];
  let best: { at: Point; steps: number; gap: number } = {
    at: from,
    steps: 0,
    gap: Math.hypot(from.x - to.x, from.y - to.y)
  };

  for (let head = 0; head < queue.length; head += 1) {
    const { at, steps } = queue[head]!;
    const gap = Math.hypot(at.x - to.x, at.y - to.y);
    if (
      gap < best.gap ||
      (gap === best.gap &&
        (steps < best.steps ||
          (steps === best.steps && (at.y < best.at.y || (at.y === best.at.y && at.x < best.at.x)))))
    ) {
      best = { at, steps, gap };
    }
    for (const next of orthogonalNeighbours(at, width, height)) {
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isWalkable(tiles[next.y]![next.x]!)) continue;
      seen.add(key);
      queue.push({ at: next, steps: steps + 1 });
    }
  }

  return best.at.x === from.x && best.at.y === from.y ? null : best.at;
}
