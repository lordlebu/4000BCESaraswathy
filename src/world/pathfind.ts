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
  if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height) return [];
  if (!isWalkable(tiles[to.y]![to.x]!)) return [];

  const key = (p: Point) => `${p.x},${p.y}`;
  const cameFrom = new Map<string, Point | null>([[key(from), null]]);
  const best = new Map<string, number>([[key(from), 0]]);

  // **A heap, not a sorted array.** This re-sorted the whole frontier on every step, on the
  // reasoning that a 64x64 map keeps it small. That held for one path; travellers, wanderers and
  // every tap all call this now, and a sort per pop is O(n log n) where a heap is O(log n). The
  // order below is total, so the heap pops exactly the sequence the sort did and no path changed.
  //
  // **The tie-break is load-bearing.** Ordering only by cost leaves equal-cost routes to be
  // resolved by whatever order the map happens to iterate in, which makes the same tap produce
  // different paths on different runs and would turn `e2e/playthrough.spec.ts` intermittent. So
  // ties fall to insertion order, then y, then x — total, and derived only from the grid.
  const frontier = new Heap<{ at: Point; cost: number; seq: number }>(
    (a, b) => a.cost - b.cost || a.at.y - b.at.y || a.at.x - b.at.x || a.seq - b.seq
  );
  frontier.push({ at: from, cost: 0, seq: 0 });
  let seq = 1;

  while (frontier.size) {
    const { at: tile, cost } = frontier.pop()!;

    if (tile.x === to.x && tile.y === to.y) {
      const path: Point[] = [];
      let step: Point | null | undefined = tile;
      while (step && !(step.x === from.x && step.y === from.y)) {
        path.push(step);
        step = cameFrom.get(key(step));
      }
      return path.reverse();
    }

    // Reached again more cheaply since being queued; that better entry is still to come.
    if (cost > (best.get(key(tile)) ?? Infinity)) continue;

    for (const next of orthogonalNeighbours(tile, width, height)) {
      const at = tiles[next.y]![next.x]!;
      if (!isWalkable(at)) continue;
      // A non-positive cost would let a cycle be walked for free and never terminate.
      const stepCost = Math.max(costOf(at), 1);
      const total = cost + stepCost;
      const nextKey = key(next);
      if (total >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, total);
      cameFrom.set(nextKey, tile);
      frontier.push({ at: next, cost: total, seq: seq++ });
    }
  }

  return [];
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
