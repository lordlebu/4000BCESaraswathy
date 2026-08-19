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

  // A sorted array rather than a binary heap. The largest map is 64x64, so the frontier is small
  // enough that the constant factor of a heap costs more than the sort saves, and a plain array is
  // a great deal easier to be sure is correct.
  //
  // **The tie-break is load-bearing.** Ordering only by cost leaves equal-cost routes to be
  // resolved by whatever order the map happens to iterate in, which makes the same tap produce
  // different paths on different runs and would turn `e2e/playthrough.spec.ts` intermittent. So
  // ties fall to insertion order, then y, then x — total, and derived only from the grid.
  const frontier: { at: Point; cost: number; seq: number }[] = [{ at: from, cost: 0, seq: 0 }];
  let seq = 1;

  while (frontier.length) {
    frontier.sort(
      (a, b) => a.cost - b.cost || a.at.y - b.at.y || a.at.x - b.at.x || a.seq - b.seq
    );
    const { at: tile, cost } = frontier.shift()!;

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
