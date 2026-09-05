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
  capacityOf,
  conditionOf,
  draw,
  leftAt,
  noNodes,
  revealedNear,
  takeableAt
} from '../src/content/nodes';
import { DAYS_TO_RETURN } from '../src/content/tiers';
import { gatheredLine, standingLine, yieldsAt } from '../src/content/gathering';
import { REVEAL_CAP } from '../src/content/tiers';
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
      nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
      expect(leftAt(nodes, seed, at, m, 0), `after ${taken} taken`).toBe(full - taken);
    }
    expect(leftAt(nodes, seed, at, m, 0), 'worked out').toBe(0);
    expect(takeableAt(nodes, seed, at, biome, 0).map((x) => x.material.id)).not.toContain(m.id);
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
    for (let i = 0; i < full; i += 1) nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
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
    for (let i = 0; i < full; i += 1) nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);

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

    let nodes = draw(noNodes(), seed, at, [{ material: m, count: 1 }], 0);
    expect(Object.keys(nodes).length, 'a drawn node is remembered').toBe(1);

    // Take the last one on a day by which it has fully regrown: back to full, so nothing to say.
    nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], days * full);
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
    const nodes = draw(noNodes(), seed, at, [{ material: first, count: 1 }], 0);

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

    nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
    expect(conditionOf(nodes, seed, at, m, 0)).toBe(full > 1 ? 'picked-over' : 'bare');

    for (let i = 1; i < full; i += 1) nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
    expect(conditionOf(nodes, seed, at, m, 0)).toBe('bare');
  });
});

describe('a good cut', () => {
  /**
   * **The clicker reading, and deliberately only its bonus half.**
   *
   * The brief asked for "a chance of actually collecting, like a clicker game". This is the
   * chance of collecting *more*, and never the chance of collecting nothing -- cozy games vary
   * how much rather than whether, and a hidden roll returning nothing teaches a player nothing
   * they can practise. Stardew's fishing does fail, but it fails on your input, which is a skill
   * surface this game does not have.
   *
   * Measured across Lothal: 1,942 stoops, 2,421 items, 479 of them good -- a quarter, which is
   * frequent enough to be a texture and rare enough to still read as luck.
   */
  it('sometimes gives more, and never gives nothing', () => {
    let stoops = 0;
    let good = 0;
    for (const row of built.world.tiles) {
      for (const tile of row) {
        for (const h of takeableAt(noNodes(), seed, { x: tile.x, y: tile.y }, tile.biome, 0)) {
          stoops += 1;
          expect(h.count, `${h.material.id} gave nothing on an untouched node`).toBeGreaterThan(0);
          if (h.count > 1) good += 1;
        }
      }
    }
    expect(stoops, 'nothing on the map is takeable -- the fixture is wrong').toBeGreaterThan(0);
    // Neither always nor never, which is the whole claim. Bounds rather than an exact rate, so
    // retuning the odds does not break a test that is not about the odds.
    expect(good, 'no cut was ever a good one').toBeGreaterThan(0);
    expect(good, 'every cut was a good one -- the roll is not rolling').toBeLessThan(stoops);
  });

  /**
   * Predictable in the way that matters: the same stand on the same day always answers the same,
   * so a player cannot stand still and re-roll it. Coming back *tomorrow* is a different
   * question, which is what makes returning worth anything.
   */
  it('answers the same all day, and differently tomorrow', () => {
    const { at, biome } = tileWithSomething();
    const today = takeableAt(noNodes(), seed, at, biome, 5);
    const again = takeableAt(noNodes(), seed, at, biome, 5);
    expect(again.map((h) => h.count), 're-rolled within the day').toEqual(today.map((h) => h.count));

    // Over a fortnight the same tile must not give the identical answer every single day, or
    // the day is not in the roll at all.
    const spread = new Set<string>();
    for (let day = 0; day < 14; day += 1) {
      spread.add(takeableAt(noNodes(), seed, at, biome, day).map((h) => h.count).join(','));
    }
    expect(spread.size, 'every day gives exactly the same haul').toBeGreaterThan(1);
  });

  it('never gives more than the place has left', () => {
    const { at, biome } = tileWithSomething();
    const m = yieldsAt(seed, at, biome)[0]!;
    const full = capacityOf(seed, at, m);

    // Draw it down to exactly one and check no bonus can overdraw it.
    let nodes = noNodes();
    for (let i = 0; i < full - 1; i += 1) {
      nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
    }
    expect(leftAt(nodes, seed, at, m, 0)).toBe(1);

    for (let day = 0; day < 3; day += 1) {
      const here = takeableAt(nodes, seed, at, biome, day).find((h) => h.material.id === m.id);
      if (here) expect(here.count, 'took more than was there').toBeLessThanOrEqual(1);
    }
  });
});

describe('what the row says before you stoop', () => {
  const reed = materials.find((m) => m.id === 'material_reed_fibre')!;
  const clay = materials.find((m) => m.id === 'material_river_clay')!;

  it('names what is here', () => {
    expect(standingLine([{ material: reed, count: 1 }], () => false)).toBe('Reed fibre.');
  });

  it('says when a cut would be a good one', () => {
    expect(standingLine([{ material: reed, count: 2 }], () => false)).toBe('Two of reed fibre.');
  });

  /**
   * **The predictability the whole design rests on.** Worked ground has to read as worked
   * *before* the player decides, which is what makes a visible variance honest where a hidden
   * roll would not be.
   */
  it('says when the ground has already been worked', () => {
    const line = standingLine([{ material: reed, count: 1 }], (m) => m.id === reed.id);
    expect(line).toBe('Reed fibre on ground already worked.');
  });

  it('keeps the two apart when a tile holds both', () => {
    const line = standingLine(
      [{ material: reed, count: 1 }, { material: clay, count: 1 }],
      (m) => m.id === clay.id
    );
    expect(line).toBe('Reed fibre, and river clay on ground already worked.');
  });

  it('has nothing to say about bare ground', () => {
    expect(standingLine([], () => false)).toBeNull();
  });

  it('writes a good cut into the diary as prose, not a number', () => {
    const line = gatheredLine('seed', { x: 0, y: 0 }, 'wetland', [{ material: reed, count: 2 }]);
    expect(line).toBe('Picked up two of reed fibre.');
    expect(line, 'a bare digit belongs in a spreadsheet').not.toMatch(/\d/);
  });
});

describe('stone is found, not regrown', () => {
  /**
   * **The model, in one sentence: a cut nodule never comes back, and the world never runs out.**
   *
   * Canon says flint, ochre and sandstone renew `never`, and that stays literally true -- no
   * emptied node ever refills. What working the ground does instead is *reveal* more of it: a
   * quarry face exposes fresh rock behind the block you took, a flood rolls new cobbles into a
   * bed already picked over.
   *
   * The alternative was making stone `slow`, and it is worse twice: untrue of a nodule, and
   * measured against a player working a district hard, a thirty-day node is emptied thirty times
   * before it returns one -- so `slow` is `never` wearing a hat.
   */
  it('leaves a worked district still giving, without refilling anything', () => {
    const X0 = 10, Y0 = 10, N = 14;
    const stoneHere = (nodes: ReturnType<typeof noNodes>, day: number) => {
      let n = 0;
      for (let y = Y0; y < Y0 + N; y += 1) {
        for (let x = X0; x < X0 + N; x += 1) {
          for (const h of takeableAt(nodes, seed, { x, y }, built.world.tiles[y]![x]!.biome, day)) {
            if (h.material.renews === 'never') n += 1;
          }
        }
      }
      return n;
    };

    let nodes = noNodes();
    const before = stoneHere(nodes, 0);
    expect(before, 'no stone in the district -- the fixture is wrong').toBeGreaterThan(0);

    let taken = 0;
    for (let day = 0; day < 5; day += 1) {
      for (let y = Y0; y < Y0 + N; y += 1) {
        for (let x = X0; x < X0 + N; x += 1) {
          const at = { x, y };
          const take = takeableAt(nodes, seed, at, built.world.tiles[y]![x]!.biome, day);
          taken += take.filter((h) => h.material.renews === 'never').reduce((a, c) => a + c.count, 0);
          nodes = draw(nodes, seed, at, take, day);
        }
      }
    }

    // Far more stone came out than the district originally held, and it is still worth working.
    expect(taken, 'nothing was taken').toBeGreaterThan(before);

    // **A third of what it started with, not "more than nothing".** Removing discovery leaves
    // exactly 1 node standing out of 91 -- a straggler on a tile the sweep happened to reach
    // late -- and `toBeGreaterThan(0)` passed on it. A guard that a broken build satisfies by
    // one is not a guard, which is the third time this sprint an assertion needed watching fail
    // before it meant anything.
    expect(
      stoneHere(nodes, 5),
      'the district is worked out -- discovery is not revealing new seams'
    ).toBeGreaterThan(before / 3);
  });

  /**
   * Discovery must not become regrowth by the back door. **No individual node ever refills**,
   * which is what keeps `check_playability.py`'s lock-out report honest.
   */
  it('never refills a node that has been emptied', () => {
    const m = materials.find((x) => x.renews === 'never' && x.foundIn.length > 0)!;
    const at = { x: 3, y: 4 };
    const full = capacityOf(seed, at, m);

    let nodes = noNodes();
    for (let i = 0; i < full; i += 1) nodes = draw(nodes, seed, at, [{ material: m, count: 1 }], 0);
    expect(leftAt(nodes, seed, at, m, 0)).toBe(0);

    // Work out a whole district around it, so the reveal bonus is at its cap.
    for (let y = 0; y <= 8; y += 1) {
      for (let x = 0; x <= 8; x += 1) {
        const near = { x, y };
        for (let i = 0; i < capacityOf(seed, near, m); i += 1) {
          nodes = draw(nodes, seed, near, [{ material: m, count: 1 }], 0);
        }
      }
    }
    expect(revealedNear(nodes, at, m.id), 'the bonus did not build').toBeGreaterThan(0);
    expect(leftAt(nodes, seed, at, m, 36_500), `${m.id} refilled`).toBe(0);
  });

  /**
   * Only stone is discovered. A stripped reed bed says nothing about where the next one is; a
   * worked-out outcrop says a great deal about where the rock continues.
   */
  it('does not reveal anything that renews', () => {
    // A renewing material must gain nothing from worked ground: it comes back on a clock, and
    // giving it a discovery bonus too would be paying it twice.
    const reed = materials.find((m) => m.id === 'material_reed_fibre')!;
    expect(reed.renews, 'reed should renew, or this test proves nothing').not.toBe('never');

    const at = { x: 4, y: 4 };
    const fresh = yieldsAt(seed, at, 'wetland').map((m) => m.id).sort();
    // The strongest bonus the system can produce, offered to *everything*.
    const bribed = yieldsAt(seed, at, 'wetland', (m) => (m.renews === 'never' ? REVEAL_CAP : 0))
      .map((m) => m.id)
      .sort();

    const gained = bribed.filter((id) => !fresh.includes(id));
    for (const id of gained) {
      const m = materials.find((x) => x.id === id)!;
      expect(m.renews, `${id} was revealed and it renews on a clock`).toBe('never');
    }
  });
});
