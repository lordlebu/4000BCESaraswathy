// Breadth-first path between two tiles, for click and tap to move.
//
// Keyboard players step one tile at a time, which is fine. On a phone there is no keyboard, so a
// tap has to mean "walk over there" — and walking there has to route around the sea rather than
// bump into it. BFS is the right tool: the grid is 36x24 and every step costs the same, so the
// first path found is the shortest one.

import { orthogonalNeighbours } from './rivers';
import type { Point, Tile } from './types';

/**
 * The shortest walkable path from `from` to `to`, excluding `from` itself.
 *
 * Returns an empty array when the target is unreachable or is the tile already stood on, so a tap
 * on the sea simply does nothing.
 */
export function findPath(
  tiles: Tile[][],
  width: number,
  height: number,
  from: Point,
  to: Point,
  isWalkable: (tile: Tile) => boolean
): Point[] {
  if (from.x === to.x && from.y === to.y) return [];
  if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height) return [];
  if (!isWalkable(tiles[to.y]![to.x]!)) return [];

  const key = (p: Point) => `${p.x},${p.y}`;
  const cameFrom = new Map<string, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];

  while (queue.length) {
    const tile = queue.shift()!;
    if (tile.x === to.x && tile.y === to.y) {
      const path: Point[] = [];
      let step: Point | null | undefined = tile;
      while (step && !(step.x === from.x && step.y === from.y)) {
        path.push(step);
        step = cameFrom.get(key(step));
      }
      return path.reverse();
    }
    for (const next of orthogonalNeighbours(tile, width, height)) {
      const nextKey = key(next);
      if (cameFrom.has(nextKey) || !isWalkable(tiles[next.y]![next.x]!)) continue;
      cameFrom.set(nextKey, tile);
      queue.push(next);
    }
  }

  return [];
}
