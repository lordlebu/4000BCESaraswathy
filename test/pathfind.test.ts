// Pathfinding, and specifically the thing that changed: routes now respect what the ground costs.
//
// The assertion that matters is `takes the longer way round an expensive ridge` — it fails on the
// old breadth-first implementation, which is what makes it evidence the change did anything. Every
// other test here guards against the change breaking something that already worked.

import { describe, expect, it } from 'vitest';
import { findPath } from '../src/world/pathfind';
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
