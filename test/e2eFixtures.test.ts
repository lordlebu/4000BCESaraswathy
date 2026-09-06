// The assumptions the browser specs stand on, checked in a second instead of six minutes.
//
// **Why this file exists.** `e2e/gathering.spec.ts` failed on main twice while passing locally,
// and the cause was not the browser, the timing, or the load: it was that the tile the spec walked
// to gives nothing. The spawn at 10,8 sits in barren wetland and the helper's right/down/left/up
// walked a square back to where it started, sampling four tiles rather than the twelve it looked
// like. That is a **fact about the generated world**, and the world builder is pure TypeScript that
// runs under Node in milliseconds.
//
// So a six-minute browser suite on `main` was being used to discover something a unit test could
// have said immediately -- and worse, `@slow` specs only run on `main`, so the answer arrived
// *after* the merge. The browser is the right tool for "does the wiring work"; it is the wrong
// tool for "does this coordinate have anything on it".
//
// The rule this file encodes: **an e2e fixture is a claim about the world, and claims about the
// world belong in unit tests.** When a spec hard-codes a seed and a coordinate, that pair is
// pinned here. If the terrain generator changes under it, this fails in the fast suite -- on the
// pull request, before the merge -- naming the spec that is about to break.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { noNodes, takeableAt } from '../src/content/nodes';
import { DEFAULT_SEED } from '../src/ui/seed';

/**
 * Every seed-and-coordinate pair a browser spec depends on.
 *
 * Adding a spec that boots to a particular tile means adding a row here. The cost is one line;
 * the alternative is finding out on `main` six minutes and one merge too late.
 */
const FIXTURES = [
  {
    spec: 'e2e/gathering.spec.ts',
    why: 'boots here because the ground gives; the whole spec is about taking something',
    seed: DEFAULT_SEED,
    map: 'field_map_lothal',
    at: { x: 8, y: 8 },
    gives: true
  }
] as const;

describe('what the browser specs stand on', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.spec} — ${fixture.at.x},${fixture.at.y} still ${fixture.gives ? 'gives' : 'gives nothing'}`, () => {
      const map = fieldMap(fixture.map);
      expect(map, `${fixture.map} is not a field map any more`).toBeTruthy();

      const { world } = buildFieldMap(map!, { seed: fixture.seed });
      const tile = world.tiles[fixture.at.y]?.[fixture.at.x];
      expect(tile, `${fixture.at.x},${fixture.at.y} is off the edge of ${fixture.map}`).toBeTruthy();

      const takeable = takeableAt(noNodes(), fixture.seed, fixture.at, tile!.biome, 0);

      if (fixture.gives) {
        expect(
          takeable.length,
          `${fixture.spec} boots to ${fixture.at.x},${fixture.at.y} and it now gives nothing — ` +
            `${fixture.why}. The spec will fail on main; pick another tile or change the spec.`
        ).toBeGreaterThan(0);
      } else {
        expect(takeable.length, `${fixture.at.x},${fixture.at.y} unexpectedly gives`).toBe(0);
      }
    });
  }

  /**
   * **The measurement that explains the original failure**, kept as a test so it cannot rot.
   *
   * Lothal yields on roughly half its tiles, which is what makes "walk a bit and you will find
   * something" sound reasonable -- and the spawn sits in the barren half, which is what made it
   * false. Both halves of that are worth pinning: if yield density ever collapses, every spec
   * that assumes ground gives is about to get strange, and this says so first.
   */
  it('Lothal still gives on a large minority of its ground', () => {
    const { world } = buildFieldMap(fieldMap('field_map_lothal')!, { seed: DEFAULT_SEED });
    let yields = 0;
    let total = 0;
    for (const row of world.tiles) {
      for (const tile of row) {
        total += 1;
        if (takeableAt(noNodes(), DEFAULT_SEED, { x: tile.x, y: tile.y }, tile.biome, 0).length > 0) {
          yields += 1;
        }
      }
    }
    // Measured at 1075 of 2304 (46.7%) when this was written. The bound is wide on purpose: this
    // guards against a collapse, not against ordinary content drift.
    expect(yields / total, `only ${yields} of ${total} tiles give anything`).toBeGreaterThan(0.2);
  });
});
