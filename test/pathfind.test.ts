// Pathfinding, and specifically the thing that changed: routes now respect what the ground costs.
//
// The assertion that matters is `takes the longer way round an expensive ridge` — it fails on the
// old breadth-first implementation, which is what makes it evidence the change did anything. Every
// other test here guards against the change breaking something that already worked.

import { describe, expect, it } from 'vitest';
import { findPath, nearestReachable } from '../src/world/pathfind';
import { orthogonalNeighbours } from '../src/world/rivers';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { isWalkable } from '../src/world/generate';
import { stepCost } from '../src/content/species';
import { tileHash } from '../src/world/rng';
import type { BiomeId, Point, Tile } from '../src/world/types';

/** A grid from rows of single characters. `#` is unwalkable, `^` is dear, `.` is cheap. */
function grid(rows: string[]): { tiles: Tile[][]; width: number; height: number } {
  const tiles = rows.map((row, y) =>
    [...row].map((ch, x) => ({
      x,
      y,
      elevation: 0.5,
      moisture: 0.5,
      temperature: 0.5,
      // The character is carried in the biome so `costOf` and `isWalkable` can read it back.
      biome: (ch === '#' ? 'sea' : ch === '^' ? 'mountains' : 'plains') as BiomeId,
      riverBias: 0
    }))
  );
  return { tiles, width: rows[0]!.length, height: rows.length };
}

const walkable = (tile: Tile) => tile.biome !== 'sea';
/** The real ratio: `travelCost` makes mountains 3 and plains 1. */
const cost = (tile: Tile) => (tile.biome === 'mountains' ? 3 : 1);

function path(rows: string[], from: Point, to: Point, costOf?: (t: Tile) => number): Point[] {
  const { tiles, width, height } = grid(rows);
  return findPath(tiles, width, height, from, to, walkable, costOf);
}

const totalCost = (steps: Point[], rows: string[]) =>
  steps.reduce((sum, s) => sum + (rows[s.y]![s.x] === '^' ? 3 : 1), 0);

describe('findPath, unweighted', () => {
  it('walks a straight line', () => {
    expect(path(['....'], { x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 }
    ]);
  });

  it('excludes the tile already stood on', () => {
    const steps = path(['....'], { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(steps).not.toContainEqual({ x: 0, y: 0 });
  });

  it('returns nothing for the current tile, off the map, or unwalkable ground', () => {
    expect(path(['....'], { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    expect(path(['....'], { x: 0, y: 0 }, { x: 9, y: 0 })).toEqual([]);
    expect(path(['....'], { x: 0, y: 0 }, { x: -1, y: 0 })).toEqual([]);
    expect(path(['.#..'], { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });

  it('returns nothing when the target is walled off', () => {
    expect(path(['.#.', '.#.', '.#.'], { x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([]);
  });

  it('routes around unwalkable ground', () => {
    const steps = path(['..#.', '....'], { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(steps.at(-1)).toEqual({ x: 3, y: 0 });
    expect(steps).not.toContainEqual({ x: 2, y: 0 });
  });

  it('takes the shortest route when every tile costs the same', () => {
    // The old behaviour, preserved. A default `costOf` must not change any existing path.
    const rows = ['....', '....', '....'];
    expect(path(rows, { x: 0, y: 0 }, { x: 3, y: 2 })).toHaveLength(5);
  });
});

describe('findPath, cost-aware', () => {
  it('takes the longer way round an expensive ridge', () => {
    // The whole point, and the one assertion here that fails on the old breadth-first version.
    //
    // A range along the direct line with clear ground below it. Measured, not assumed: straight
    // through is 5 steps costing 13, round the bottom is 7 steps costing 7. The detour has to be
    // longer than the crossing for this to prove anything, and it is.
    //
    // The first fixture tried was a 4-wide grid, where a detour costs *more* than the crossing
    // because it must go down and come back up. Both routes agreed and the test failed for the
    // right reason — the fixture was wrong, not the search.
    const rows = [
      '.^^^^.',
      '......'
    ];
    const from = { x: 0, y: 0 };
    const to = { x: 5, y: 0 };

    const flat = path(rows, from, to);
    const aware = path(rows, from, to, cost);

    expect(flat).toHaveLength(5);
    expect(totalCost(flat, rows)).toBe(13);
    expect(aware).toHaveLength(7);
    expect(totalCost(aware, rows)).toBe(7);
    expect(aware.length).toBeGreaterThan(flat.length);
    // And it genuinely stays off the range rather than merely clipping less of it.
    expect(aware.filter((s) => rows[s.y]![s.x] === '^')).toHaveLength(0);
  });

  it('crosses expensive ground when there is no way round', () => {
    // Cost-awareness must not become cost-avoidance: a pass that is dear is still a pass.
    const rows = ['.^.'];
    expect(path(rows, { x: 0, y: 0 }, { x: 2, y: 0 }, cost)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  it('keeps the short route when the detour is no cheaper', () => {
    // The other half of the same rule, and worth pinning because it is counter-intuitive: on a
    // narrow grid a detour must descend and climb back, so going round a single mountain costs
    // the same 4 as going over it. A tie keeps the shorter path, which is the right answer.
    const rows = [
      '.^.',
      '...'
    ];
    const steps = path(rows, { x: 0, y: 0 }, { x: 2, y: 0 }, cost);
    expect(totalCost(steps, rows)).toBe(4);
    expect(steps).toHaveLength(2);
  });

  it('still finds nothing when the target is walled off', () => {
    expect(path(['.#.', '.#.', '.#.'], { x: 0, y: 0 }, { x: 2, y: 2 }, cost)).toEqual([]);
  });
});

describe('findPath is deterministic', () => {
  it('gives the same route for the same tap, twice', () => {
    // Not decoration. Equal-cost routes resolved by map iteration order would make the same tap
    // produce different paths on different runs, and the browser suite intermittent with it.
    const rows = ['....', '....', '....', '....'];
    const a = path(rows, { x: 0, y: 0 }, { x: 3, y: 3 }, cost);
    const b = path(rows, { x: 0, y: 0 }, { x: 3, y: 3 }, cost);
    expect(a).toEqual(b);
  });

  it('gives the same route with and without a flat cost function', () => {
    const rows = ['....', '.#..', '....'];
    const from = { x: 0, y: 0 };
    const to = { x: 3, y: 2 };
    expect(path(rows, from, to)).toEqual(path(rows, from, to, () => 1));
  });

  it('returns a contiguous orthogonal walk', () => {
    const rows = ['.^^^^.', '......'];
    const steps = [{ x: 0, y: 0 }, ...path(rows, { x: 0, y: 0 }, { x: 5, y: 0 }, cost)];
    for (let i = 1; i < steps.length; i += 1) {
      const d = Math.abs(steps[i]!.x - steps[i - 1]!.x) + Math.abs(steps[i]!.y - steps[i - 1]!.y);
      expect(d, `step ${i} is not a single orthogonal move`).toBe(1);
    }
  });
});

/**
 * `findPath` as it was before the heap: the whole frontier re-sorted on every step. Kept here as
 * the reference, so the claim that the heap changed no path is checked rather than argued.
 */
function sortedArrayPath(
  tiles: Tile[][], width: number, height: number, from: Point, to: Point,
  walk: (t: Tile) => boolean, costOf: (t: Tile) => number
): Point[] {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walk(tiles[to.y]![to.x]!)) return [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const cameFrom = new Map<string, Point | null>([[key(from), null]]);
  const best = new Map<string, number>([[key(from), 0]]);
  const frontier: { at: Point; cost: number; seq: number }[] = [{ at: from, cost: 0, seq: 0 }];
  let seq = 1;
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost || a.at.y - b.at.y || a.at.x - b.at.x || a.seq - b.seq);
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
    if (cost > (best.get(key(tile)) ?? Infinity)) continue;
    for (const next of orthogonalNeighbours(tile, width, height)) {
      const at = tiles[next.y]![next.x]!;
      if (!walk(at)) continue;
      const total = cost + Math.max(costOf(at), 1);
      if (total >= (best.get(key(next)) ?? Infinity)) continue;
      best.set(key(next), total);
      cameFrom.set(key(next), tile);
      frontier.push({ at: next, cost: total, seq: seq++ });
    }
  }
  return [];
}

describe('the heap changed no path', () => {
  // Equal-cost routes are everywhere on real ground, and the tie-break is what keeps a tap and a
  // traveller walking the same line on every run. A heap with the same total order must pop the
  // same sequence; this is the check that it does.
  for (const map of fieldMaps) {
    it(`${map.id}: the same path as the sorted array, on 40 real walks`, () => {
      const { world } = buildFieldMap(map, { seed: 'heap-test' });
      const open = world.tiles.flat().filter((t) => isWalkable(t));
      const cost = (t: Tile) => stepCost(t.biome);
      for (let i = 0; i < 40; i += 1) {
        const from = open[tileHash('heap-test', i, 0, 'from') % open.length]!;
        const to = open[tileHash('heap-test', i, 1, 'to') % open.length]!;
        expect(findPath(world.tiles, world.width, world.height, from, to, isWalkable, cost)).toEqual(
          sortedArrayPath(world.tiles, world.width, world.height, from, to, isWalkable, cost)
        );
      }
    });
  }
});

describe('a click on somewhere unreachable', () => {
  it('walks to the reachable tile nearest it', () => {
    const { tiles, width, height } = grid([
      '.....#...',
      '.....#...',
      '.....#...'
    ]);
    // The far side of the wall cannot be reached; the nearest tile this side of it can.
    expect(nearestReachable(tiles, width, height, { x: 0, y: 1 }, { x: 7, y: 1 }, walkable)).toEqual({ x: 4, y: 1 });
  });

  it('walks to the shore when the click is on the water', () => {
    const { tiles, width, height } = grid([
      '...##',
      '...##',
      '...##'
    ]);
    expect(nearestReachable(tiles, width, height, { x: 0, y: 0 }, { x: 4, y: 2 }, walkable)).toEqual({ x: 2, y: 2 });
  });

  it('says so when the walker is already as close as the ground allows', () => {
    const { tiles, width, height } = grid(['..#..']);
    expect(nearestReachable(tiles, width, height, { x: 1, y: 0 }, { x: 4, y: 0 }, walkable)).toBeNull();
  });

  it('breaks a tie the same way every time', () => {
    // Two tiles equally near the target: the one nearer the walker wins, then the upper one.
    const { tiles, width, height } = grid([
      '...',
      '.#.',
      '...'
    ]);
    const a = nearestReachable(tiles, width, height, { x: 0, y: 0 }, { x: 1, y: 1 }, walkable);
    expect(a).toEqual({ x: 1, y: 0 });
    expect(nearestReachable(tiles, width, height, { x: 0, y: 0 }, { x: 1, y: 1 }, walkable)).toEqual(a);
  });
});
