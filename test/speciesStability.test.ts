import { describe, it, expect } from 'vitest';
import { weightedPickFor } from '../src/world/rng';

/**
 * The property that lets canon grow without moving the ground under a saved journey.
 *
 * This is the regression test for the worst bug the project has had: twenty-five plants were
 * added to canon without a `source_index`, which changed the length and order of the per-biome
 * lists, which -- under a `hash % list.length` pick -- silently changed what grew on every tile
 * of those biomes on every map, including ground players had already walked. `weightedPickFor`
 * reads no position at all, so that class of failure is not expressible. These tests fail if
 * anyone reintroduces it.
 */

type Species = { id: string; rarity: 'common' | 'rare' | 'mythic' };
const RARITY_WEIGHT = { common: 12, rare: 4, mythic: 1 } as const;
const weightOf = (s: Species) => RARITY_WEIGHT[s.rarity];
const idOf = (s: Species) => s.id;

const TILES = Array.from({ length: 4096 }, (_, i) => ({ x: i % 64, y: Math.floor(i / 64) }));
const commons = (n: number, prefix = 'sp'): Species[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, rarity: 'common' as const }));

const pick = (list: Species[], tile: { x: number; y: number }) =>
  weightedPickFor(list, 'a-seed', tile, 'flora', idOf, weightOf);

describe('adding a species does not disturb the species already placed', () => {
  it('moves a tile only by winning it outright', () => {
    const before = commons(20);
    const after = [...before, { id: 'newcomer', rarity: 'common' as const }];

    let moved = 0;
    for (const tile of TILES) {
      const b = pick(before, tile)!.id;
      const a = pick(after, tile)!.id;
      if (b === a) continue;
      moved += 1;
      // The only legal change is "something else" -> "the new species". A tile swapping
      // between two pre-existing species is the reshuffle this design exists to prevent.
      expect(a).toBe('newcomer');
    }
    // It should take roughly its own even share, 1/21 ≈ 4.8%.
    expect(moved / TILES.length).toBeGreaterThan(0.02);
    expect(moved / TILES.length).toBeLessThan(0.08);
  });

  it('removing a species disturbs only the tiles it held', () => {
    const full = commons(15);
    const without = full.filter((s) => s.id !== 'sp-7');
    for (const tile of TILES) {
      const b = pick(full, tile)!.id;
      if (b === 'sp-7') continue;
      expect(pick(without, tile)!.id).toBe(b);
    }
  });

  it('ignores the order candidates are supplied in', () => {
    const list = commons(12);
    const reversed = [...list].reverse();
    for (const tile of TILES.slice(0, 500)) {
      expect(pick(list, tile)!.id).toBe(pick(reversed, tile)!.id);
    }
  });
});

describe('rarity still governs how often a species appears', () => {
  it('keeps a mythic uncommon in a pool half made of them', () => {
    // The case that put a horror in every second village when picking was uniform.
    const pool: Species[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, rarity: 'common' as const })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, rarity: 'mythic' as const }))
    ];
    let mythic = 0;
    for (const tile of TILES) {
      if (weightedPickFor(pool, 'a-seed', tile, 'creature', idOf, weightOf)!.rarity === 'mythic') {
        mythic += 1;
      }
    }
    // 6x1 against 6x12 -> 1/13 ≈ 7.7%.
    expect(mythic / TILES.length).toBeGreaterThan(0.04);
    expect(mythic / TILES.length).toBeLessThan(0.12);
  });

  it('gives equal weights an even share, which needs a well-mixed hash', () => {
    // Guards the `avalanche` step in `weightedPickFor`. Without it, ids differing only in a
    // trailing digit hash to near-consecutive values and the last candidate took 25.8%.
    const pool = commons(21);
    const counts = new Map<string, number>();
    for (const tile of TILES) {
      const id = pick(pool, tile)!.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect(counts.size).toBe(21);
    const shares = [...counts.values()].map((c) => c / TILES.length);
    const even = 1 / 21;
    expect(Math.min(...shares)).toBeGreaterThan(even * 0.6);
    expect(Math.max(...shares)).toBeLessThan(even * 1.6);
  });
});
