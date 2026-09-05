// A place that can be drawn down, and comes back.
//
// The first state in this game that records an *absence*. Everything else a save holds is
// something a player gained; this is what a place no longer has, and it is the one thing about a
// tile that cannot be recomputed from the seed.
//
// What these tests are for, in order of how expensive the fault would be:
//
//   * a `never` material really never returns -- canon says so and the whole `nothing_runs_out`
//     check in `check_playability.py` assumes the game honours it;
//   * a renewing one really does return, which is the half of the bargain that keeps canon
//     allowed to ignore counts;
//   * an untouched world costs nothing in the save, which is what makes this affordable at all.

import { describe, expect, it } from 'vitest';
import {
  DAYS_TO_RETURN,
  capacityOf,
  conditionOf,
  draw,
  leftAt,
  noNodes,
  takeableAt
} from '../src/content/nodes';
import { yieldsAt } from '../src/content/gathering';
import { materials } from '../src/content/making';
import { buildFieldMap } from '../src/world/fieldMap';
import type { BiomeId } from '../src/world/types';
import { fieldMap } from '../src/content/places';

const built = buildFieldMap(fieldMap('field_map_lothal')!);
const seed = built.world.seed;

/** A tile that actually offers something, so a test is never asserting about bare ground. */
function tileWithSomething(): { at: { x: number; y: number }; biome: BiomeId } {
  for (let y = 0; y < built.world.height; y += 1) {
    for (let x = 0; x < built.world.width; x += 1) {
      const tile = built.world.tiles[y]![x]!;
      if (yieldsAt(seed, { x, y }, tile.biome).length > 0) {
        return { at: { x, y }, biome: tile.biome };
      }
    }
  }
  throw new Error('no tile on Lothal offers anything -- the fixture is wrong');
}

describe('a place that has been drawn from', () => {
  it('gives less each time, and eventually nothing', () => {
    const { at, biome } = tileWithSomething();
    const m = yieldsAt(seed, at, biome)[0]!;
    const full = capacityOf(seed, at, m);
    expect(full, 'a node that exists must give at least once').toBeGreaterThan(0);

    let nodes = noNodes();
    for (let taken = 1; taken <= full; taken += 1) {
      nodes = draw(nodes, seed, at, [m], 0);
      expect(leftAt(nodes, seed, at, m, 0), `after ${taken} taken`).toBe(full - taken);
    }
    expect(leftAt(nodes, seed, at, m, 0), 'worked out').toBe(0);
    expect(takeableAt(nodes, seed, at, biome, 0).map((x) => x.id)).not.toContain(m.id);
  });

  /**
   * **The half of the bargain that keeps canon allowed to ignore counts.**
   *
   * `check_playability.py` decides a recipe is reachable without looking at any `count`, and
   * says in its own comment that this is sound only because a patient walker can reach any
   * quantity. Depletion does not break that for anything that renews -- waiting is not running
   * out -- and this is the game's half of that claim.
   */
  it('comes back, given the days canon asks for', () => {
    const { at, biome } = tileWithSomething();
    const m = yieldsAt(seed, at, biome).find((x) => x.renews !== 'never');
    if (!m) return; // nothing renewing on this tile; the never case is covered below
    const full = capacityOf(seed, at, m);
    const days = DAYS_TO_RETURN[m.renews]!;

    let nodes = noNodes();
    for (let i = 0; i < full; i += 1) nodes = draw(nodes, seed, at, [m], 0);
    expect(leftAt(nodes, seed, at, m, 0)).toBe(0);

    // The day before it is due, still nothing. Not merely "it grows back eventually".
    expect(leftAt(nodes, seed, at, m, days - 1), 'came back early').toBe(0);
    expect(leftAt(nodes, seed, at, m, days), 'did not come back on time').toBe(1);
    expect(leftAt(nodes, seed, at, m, days * full), 'did not refill').toBe(full);
    expect(leftAt(nodes, seed, at, m, days * full * 10), 'grew past full').toBe(full);
  });

  /**
   * **Canon's word, honoured literally.**
   *
   * `renews: never` is not slow, it is never: a fossil bed needs another death and an age of
   * rock. `check_playability.py` reports which never-renewing materials sit in one kind of
   * ground precisely so this cannot strand somebody quietly -- and that report is worthless if
   * the game quietly regrows them anyway.
   */
  it('never gives back what canon says never returns', () => {
    const m = materials.find((x) => x.renews === 'never' && x.foundIn.length > 0)!;
    expect(m, 'canon has no never-renewing material -- the fixture is wrong').toBeTruthy();
    const at = { x: 3, y: 4 };
    const full = capacityOf(seed, at, m);

    let nodes = noNodes();
    for (let i = 0; i < full; i += 1) nodes = draw(nodes, seed, at, [m], 0);

    expect(leftAt(nodes, seed, at, m, 0)).toBe(0);
    // A century of in-game days. Nothing.
    expect(leftAt(nodes, seed, at, m, 36_500), `${m.id} grew back`).toBe(0);
  });
});

describe('what the save has to hold', () => {
  /**
   * The reason this is affordable. A journey that has taken nothing stores nothing, and a node
   * that has grown back to full is deleted rather than kept -- so the record exists only while
   * it says something the seed cannot.
   */
  it('stores nothing for a world nobody has touched', () => {
    expect(Object.keys(noNodes())).toEqual([]);
  });

  it('forgets a node once it has grown back', () => {
    const { at, biome } = tileWithSomething();
    const m = yieldsAt(seed, at, biome).find((x) => x.renews !== 'never');
    if (!m) return;
    const days = DAYS_TO_RETURN[m.renews]!;
    const full = capacityOf(seed, at, m);

    let nodes = draw(noNodes(), seed, at, [m], 0);
    expect(Object.keys(nodes).length, 'a drawn node is remembered').toBe(1);

    // Take the last one on a day by which it has fully regrown: back to full, so nothing to say.
    nodes = draw(nodes, seed, at, [m], days * full);
    expect(leftAt(nodes, seed, at, m, days * full)).toBe(full - 1);
  });

  /**
   * Per material rather than per tile, because a tile can hold three things and stripping the
   * reeds should not also strip the clay under them.
   */
  it('draws one thing on a tile without touching the others', () => {
    // 501 tiles on Lothal hold two things or more. **The two must have different capacities**,
    // or this proves nothing: keying by tile alone stores one `left` for the whole tile, and if
    // both things hold the same amount, the untouched one reads correctly by coincidence. That
    // is exactly what happened on the first tile tried -- reed and clay both held 5 -- and the
    // sabotage passed.
    let found: { at: { x: number; y: number }; both: ReturnType<typeof yieldsAt> } | null = null;
    for (let y = 0; y < built.world.height && !found; y += 1) {
      for (let x = 0; x < built.world.width && !found; x += 1) {
        const at = { x, y };
        const here = yieldsAt(seed, at, built.world.tiles[y]![x]!.biome);
        if (here.length < 2) continue;
        // The second's capacity must differ from the first's *after one is taken*. Merely
        // differing is not enough: a tile-wide record would hold `first - 1`, and if that equals
        // the second's capacity it reads as untouched by coincidence. Reed 6 and clay 5 on the
        // very first candidate tile did exactly that, and the sabotage passed twice.
        if (capacityOf(seed, at, here[0]!) - 1 !== capacityOf(seed, at, here[1]!)) {
          found = { at, both: here };
        }
      }
    }
    expect(found, 'no tile on Lothal holds two things -- the fixture is wrong').toBeTruthy();

    const { at, both } = found!;
    const [first, second] = both as [(typeof both)[0], (typeof both)[0]];
    const nodes = draw(noNodes(), seed, at, [first], 0);

    expect(leftAt(nodes, seed, at, first, 0), 'the thing taken was not drawn down').toBe(
      capacityOf(seed, at, first) - 1
    );
    // Keying by tile alone would take this one too, which is the fault this guards.
    expect(leftAt(nodes, seed, at, second, 0), `${second.id} was disturbed`).toBe(
      capacityOf(seed, at, second)
    );
  });
});

describe('what a place looks like before you stoop', () => {
  /**
   * **The predictability the design asks for, and the reason there is no hidden roll.**
   *
   * A player decides whether to stoop by looking, so the state a node is in has to be legible
   * before the decision rather than revealed after it. A stand that has been cut looks cut.
   */
  it('reads untouched, then picked over, then bare', () => {
    const { at, biome } = tileWithSomething();
    const m = yieldsAt(seed, at, biome)[0]!;
    const full = capacityOf(seed, at, m);

    let nodes = noNodes();
    expect(conditionOf(nodes, seed, at, m, 0)).toBe('untouched');

    nodes = draw(nodes, seed, at, [m], 0);
    expect(conditionOf(nodes, seed, at, m, 0)).toBe(full > 1 ? 'picked-over' : 'bare');

    for (let i = 1; i < full; i += 1) nodes = draw(nodes, seed, at, [m], 0);
    expect(conditionOf(nodes, seed, at, m, 0)).toBe('bare');
  });
});
