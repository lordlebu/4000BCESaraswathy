// The feature drawn on a tile, by name, and what it gives (`docs/satchel-and-hearth.md`, phase 4).
//
// **The log you see is the log you take.** `world/features.ts` repeats `game/frames.ts`'s feature
// table by name so the rules can ask it; these hold the two in step and hold the promise on the
// real maps, by asking the scene's own plan where it drew a log, driftwood or bamboo.

import { describe, expect, it } from 'vitest';
import { FEATURES, featureFrame } from '../src/game/frames';
import { FEATURE_LAYOUT, featureNameAt } from '../src/world/features';
import { planScene } from '../src/game/scenePlan';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { yieldsAt } from '../src/content/gathering';
import { tileHash } from '../src/world/rng';
import type { BiomeId } from '../src/world/types';

describe('the rules and the art agree about what a feature is', () => {
  it('lists every feature the art draws, in its order, with its frame count and rim', () => {
    const art = Object.entries(FEATURES).map(([name, f]) => ({ name, biome: f.biome, frames: f.frames.length, ...(f.rim ? { rim: true } : {}) }));
    expect(FEATURE_LAYOUT).toEqual(art);
  });

  it('names the feature the scene draws, tile for tile', () => {
    const built = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_narmada')!, { seed: 'a' });
    const w = built.world;
    let drawn = 0;
    for (const row of w.tiles) {
      for (const t of row) {
        if (t.biome === 'sky_island') continue;
        const pick = featureFrame(t.biome as BiomeId, tileHash(w.seed, t.x, t.y, 'feature-present'), tileHash(w.seed, t.x, t.y, 'feature-pick'), false);
        const name = featureNameAt(w.seed, t.x, t.y, t.biome);
        if (!pick) {
          expect(name).toBeNull();
          continue;
        }
        drawn++;
        const entry = FEATURES[name!]!;
        expect(entry.frames, `${t.x},${t.y}`).toContain(pick.frame);
        expect(entry.sheet ?? 'features').toBe(pick.sheet);
      }
    }
    expect(drawn).toBeGreaterThan(50);
  });
});

describe('the log you see is the log you take', () => {
  const GIVES: Record<number, string> = { 8: 'material_windfall_wood', 20: 'material_windfall_wood', 4: 'material_bamboo_cane', 5: 'material_bamboo_cane' };
  for (const map of fieldMaps) {
    it(`on ${map.id}, every drawn log, driftwood and bamboo gives what it is`, () => {
      let checked = 0;
      for (const seed of ['jambhudweepa-evening', 'a', 'b']) {
        const built = buildFieldMap(map, { seed });
        for (const p of planScene(built)) {
          if (p.sheet !== 'features' || !(p.frame in GIVES)) continue;
          const tile = built.world.tiles[p.y]![p.x]!;
          checked++;
          expect(yieldsAt(seed, tile, tile.biome).map((m) => m.id), `${p.x},${p.y} on ${tile.biome}`).toContain(GIVES[p.frame]);
        }
      }
      // Dwarka has no forest; every other map draws plenty.
      if (map.id !== 'field_map_dwarka') expect(checked).toBeGreaterThan(5);
    });
  }
});
