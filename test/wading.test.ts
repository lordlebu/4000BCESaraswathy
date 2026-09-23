// How deep a walker stands in what they are standing in.
//
// The ask: the river to the waist, the swamp to the feet, the way the sky pools already wade. The
// sky pool keeps its own look on purpose. These hold the table; the screen was checked by eye.

import { describe, expect, it } from 'vitest';
import { FORD_DEPTH, RIVER_DEPTH, SWAMP_DEPTH, wadeFor } from '../src/game/wading';

describe('what a walker stands in', () => {
  it('stands to the waist in a river and to the feet in a swamp', () => {
    expect(wadeFor({ biome: 'river' })).toEqual({ kind: 'cut', depth: RIVER_DEPTH });
    expect(wadeFor({ biome: 'wetland' })).toEqual({ kind: 'cut', depth: SWAMP_DEPTH });
    expect(SWAMP_DEPTH).toBeLessThan(RIVER_DEPTH);
  });

  it('stands shallower at a ford, which is why it is the ford', () => {
    expect(wadeFor({ biome: 'river', ford: true })).toEqual({ kind: 'cut', depth: FORD_DEPTH });
    expect(FORD_DEPTH).toBeLessThan(RIVER_DEPTH);
    expect(FORD_DEPTH).toBeGreaterThan(SWAMP_DEPTH);
  });

  it('stays dry on a bridge, whatever is under it', () => {
    expect(wadeFor({ biome: 'river', bridge: true })).toEqual({ kind: 'dry' });
  });

  it('keeps the sky pools their own look', () => {
    expect(wadeFor({ biome: 'sky_water' })).toEqual({ kind: 'sky' });
  });

  it('is dry everywhere else', () => {
    for (const biome of ['plains', 'coast', 'forest', 'settlement', 'sky_island'] as const) {
      expect(wadeFor({ biome })).toEqual({ kind: 'dry' });
    }
    expect(wadeFor(undefined)).toEqual({ kind: 'dry' });
  });
});
