// Where the places stand, and the roads between them.
//
// Measured before this: places scattered at random (Clark-Evans 0.95 to 1.02) with a quarter of the
// map often empty, joined by one nearest-neighbour chain. After: spread as a weight on the score,
// a spanning tree with a loop or two. The floors below sit under what was measured after, and well
// over what was measured before, so a return to the scatter fails here.

import { describe, expect, it } from 'vitest';
import { LOOPS, networkLegs } from '../src/world/routes';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';

describe('the road network', () => {
  it('joins every stop, with a spanning tree and at most a couple of loops', () => {
    const stops = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 20, y: 12 }
    ];
    const legs = networkLegs(stops);
    expect(legs.length).toBeGreaterThanOrEqual(stops.length - 1);
    expect(legs.length).toBeLessThanOrEqual(stops.length - 1 + LOOPS);
    // Connected: every stop reachable from the first over the legs.
    const reached = new Set([0]);
    for (let pass = 0; pass < stops.length; pass += 1) {
      for (const [a, b] of legs) {
        if (reached.has(a)) reached.add(b);
        if (reached.has(b)) reached.add(a);
      }
    }
    expect(reached.size).toBe(stops.length);
  });

  it('is the same network for the same places', () => {
    const stops = [{ x: 3, y: 4 }, { x: 30, y: 8 }, { x: 12, y: 40 }, { x: 44, y: 44 }];
    expect(networkLegs(stops)).toEqual(networkLegs(stops));
  });

  it('never adds a loop longer than the longest leg of the tree', () => {
    // A loop is a second way round between neighbours, not a shortcut across the map.
    const stops = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 60, y: 60 }];
    const legs = networkLegs(stops);
    const d = (a: number, b: number) =>
      Math.abs(stops[a]!.x - stops[b]!.x) + Math.abs(stops[a]!.y - stops[b]!.y);
    const tree = legs.slice(0, stops.length - 1);
    const longest = Math.max(...tree.map(([a, b]) => d(a, b)));
    for (const [a, b] of legs.slice(stops.length - 1)) expect(d(a, b)).toBeLessThanOrEqual(longest);
  });
});

describe('the places on every map', () => {
  for (const map of fieldMaps) {
    it(`${map.id}: are spread out rather than scattered, and reach most of the map`, () => {
      let clarkEvans = 0;
      let quarters = 0;
      const seeds = 10;
      for (let i = 0; i < seeds; i += 1) {
        const built = buildFieldMap(map, { seed: `layout-${i}` });
        const pts = built.placed.map((p) => p.at);
        const { width, height } = built.world;
        let nnSum = 0;
        for (const a of pts) {
          nnSum += Math.min(...pts.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
        }
        // Observed mean nearest-neighbour distance over what a random scatter would give.
        clarkEvans += nnSum / pts.length / (0.5 / Math.sqrt(pts.length / (width * height)));
        quarters += new Set(pts.map((p) => `${p.x < width / 2 ? 0 : 1}${p.y < height / 2 ? 0 : 1}`)).size;
      }
      // Measured: 1.13 to 1.30 after, 0.95 to 1.02 before.
      expect(clarkEvans / seeds, `${map.id}: places clustered like a random scatter`).toBeGreaterThan(1.08);
      // Measured: 3.6 to 4.0 quarters after, 3.1 to 3.8 before.
      expect(quarters / seeds, `${map.id}: a quarter of the map left empty`).toBeGreaterThanOrEqual(3.5);
    });
  }
});
