// Events that help (`docs/satchel-and-hearth.md`, phase 6; the owner's ruling, 2 October 2026).
//
// "Events only give me useless flint." Something dropped on the road, or found under what you were
// taking, used to be an even pick over whatever common thing the ground held, and flint is common on
// plains, hills and coast. Now the pick leans three in four towards what the pinned recipe or the
// next building stage still lacks, when the ground could hold it, and stops offering a stone that
// never renews once four are carried. Simulated over many seeded rolls on real tiles, as a player
// would meet them.

import { describe, expect, it } from 'vitest';
import { happeningNow, surroundingsAt, type Wanted } from '../src/content/happenings';
import type { Circumstance } from '../src/content/events';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { tileHash } from '../src/world/rng';
import { EVENT_LEANS_PERCENT } from '../src/content/tiers';

const built = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_narmada')!, { seed: 'a' });
const world = built.world;
const plains = world.tiles.flat().filter((t) => t.biome === 'plains').slice(0, 60);
const forest = world.tiles.flat().filter((t) => t.biome === 'forest').slice(0, 60);

const now = (occasion: Circumstance['occasion']): Circumstance => ({
  occasion,
  shelter: null,
  fieldMapId: 'field_map_narmada',
  day: 9,
  holds: [],
  seen: []
});

/** What `kind` turns up across these tiles and many days, with this much wanted and carried. */
function turnsUp(kind: 'dropped' | 'underneath', tiles: typeof plains, wanted: Wanted | null): string[] {
  const got: string[] = [];
  for (const t of tiles) {
    for (let day = 0; day < 20; day++) {
      const roll = (s: string) => tileHash(world.seed, t.x, t.y, `${kind}:${day}:${s}`);
      const around = surroundingsAt(world, t, 'field_map_narmada', null, roll, { wanted });
      if (!around) continue;
      // `dropped` only happens on a road; here the question is what it would hand over.
      const event = happeningNow(now(kind === 'dropped' ? 'road' : 'working'), roll, { ...around, onRoad: true }, [], { kind, asked: true });
      const gives = event?.choices.flatMap((c) => c.gives ?? []).map((g) => g.id) ?? [];
      got.push(...gives);
    }
  }
  return got;
}

const share = (list: string[], id: string) => list.filter((x) => x === id).length / Math.max(1, list.length);

describe('events lean towards what you are working towards', () => {
  it('turns up a wanted material about three times in four, where the ground holds it', () => {
    const before = turnsUp('dropped', forest, null);
    const after = turnsUp('dropped', forest, { materials: ['material_bamboo_cane'], kinds: [], carried: {} });
    expect(after.length).toBeGreaterThan(200);
    // Bamboo is one of several common forest things; wanted, it is most of what turns up.
    expect(share(after, 'material_bamboo_cane')).toBeGreaterThan(EVENT_LEANS_PERCENT / 100 - 0.08);
    expect(share(after, 'material_bamboo_cane')).toBeGreaterThan(share(before, 'material_bamboo_cane') * 2);
  });

  it('leans towards a kind, too: any timber, for a stage that takes any', () => {
    const after = turnsUp('dropped', forest, { materials: [], kinds: ['timber'], carried: {} });
    const timber = ['material_bamboo_cane', 'material_windfall_wood', 'material_teak_timber', 'material_mangrove_pole', 'material_sandalwood_billet'];
    expect(after.filter((x) => timber.includes(x)).length / after.length).toBeGreaterThan(0.6);
  });

  it('stops handing over flint once four are carried and nothing wants it', () => {
    const before = turnsUp('underneath', plains, null);
    expect(share(before, 'material_flint'), 'flint was not common under the plains to begin with').toBeGreaterThan(0.15);
    const after = turnsUp('underneath', plains, { materials: [], kinds: [], carried: { material_flint: 4 } });
    expect(after).not.toContain('material_flint');
    // But a knife pinned and two flint short, it comes back.
    const wanted = turnsUp('underneath', plains, { materials: ['material_flint'], kinds: [], carried: { material_flint: 4 } });
    expect(share(wanted, 'material_flint')).toBeGreaterThan(0.5);
  });

  it('picks exactly as before when nothing is wanted and nothing is carried', () => {
    // The lean is the only change: with nothing to lean towards, the same tiles hand over the same things.
    const a = turnsUp('dropped', plains, null);
    const b = turnsUp('dropped', plains, { materials: [], kinds: [], carried: {} });
    expect(b).toEqual(a);
  });
});
