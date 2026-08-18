// Does a canon field map become ground the player can walk?
//
// This is the join the two-repo split exists for: canon names Lothal and its six points of
// interest, the generator lays terrain, and the placer puts the authored places on it. If
// any of that drifts, the Lothal slice stops being reachable and nobody notices until
// someone tries to walk it.

import { describe, expect, it } from 'vitest';
import { buildFieldMap, poiAt } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, poisOn, npcsAt, neighboursOf } from '../src/content/places';
import { biomes } from '../src/content/species';
import { landmarkKindFor } from '../src/content/landmarks';

const lothal = fieldMap('field_map_lothal');

describe('the Lothal field map', () => {
  it('exists in the canon bundle', () => {
    expect(lothal).not.toBeNull();
    expect(lothal!.seedBiomes).toContain('wetland');
    expect(poisOn('field_map_lothal')).toHaveLength(6);
  });

  it('builds ground with every authored place standing on it', () => {
    const built = buildFieldMap(lothal!);
    expect(built.placed).toHaveLength(6);
    expect(built.unplaced).toEqual([]);
  });

  it('puts each place on terrain canon allows', () => {
    const built = buildFieldMap(lothal!);
    for (const { poi, at } of built.placed) {
      const tile = built.world.tiles[at.y]![at.x]!;
      if (poi.terrain.length) {
        expect(poi.terrain, `${poi.id} landed on ${tile.biome}`).toContain(tile.biome);
      }
    }
  });

  it('never puts two places on the same tile', () => {
    const built = buildFieldMap(lothal!);
    const keys = built.placed.map((p) => `${p.at.x},${p.at.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is the same Lothal every time — this is a documented island, not a roguelike', () => {
    const a = buildFieldMap(lothal!);
    const b = buildFieldMap(lothal!);
    expect(a.placed.map((p) => [p.poi.id, p.at.x, p.at.y]))
      .toEqual(b.placed.map((p) => [p.poi.id, p.at.x, p.at.y]));
  });

  it('keeps places apart, so the map is worth crossing', () => {
    const built = buildFieldMap(lothal!);
    let closest = Infinity;
    for (const a of built.placed) {
      for (const b of built.placed) {
        if (a === b) continue;
        closest = Math.min(closest, Math.abs(a.at.x - b.at.x) + Math.abs(a.at.y - b.at.y));
      }
    }
    expect(closest).toBeGreaterThan(1);
  });

  it('can be asked what stands on a tile', () => {
    const built = buildFieldMap(lothal!);
    const first = built.placed[0]!;
    expect(poiAt(built, first.at)?.poi.id).toBe(first.poi.id);
    expect(poiAt(built, { x: -1, y: -1 })).toBeNull();
  });
});

describe('the Narmada plateau', () => {
  const narmada = fieldMap('field_map_narmada');

  it('is a different country from the delta, or the overworld is pointless', () => {
    expect(narmada).not.toBeNull();
    expect(narmada!.scale).toBe('large');
    // No palette overlap beyond settlement: hills and mountains against wetland and river.
    const shared = narmada!.seedBiomes.filter((b) => lothal!.seedBiomes.includes(b));
    expect(shared).toEqual(['settlement']);
  });

  it('builds ground with every authored place standing on it', () => {
    const built = buildFieldMap(narmada!);
    expect(built.placed).toHaveLength(6);
    expect(built.unplaced).toEqual([]);
  });

  it('puts each place on terrain canon allows', () => {
    const built = buildFieldMap(narmada!);
    for (const { poi, at } of built.placed) {
      const tile = built.world.tiles[at.y]![at.x]!;
      if (poi.terrain.length) {
        expect(poi.terrain, `${poi.id} landed on ${tile.biome}`).toContain(tile.biome);
      }
    }
  });

  it('is the same plateau every time', () => {
    const a = buildFieldMap(narmada!);
    const b = buildFieldMap(narmada!);
    expect(a.placed.map((p) => [p.poi.id, p.at.x, p.at.y]))
      .toEqual(b.placed.map((p) => [p.poi.id, p.at.x, p.at.y]));
  });

  it('gates the stair and the archive on work done elsewhere', () => {
    const stair = poisOn('field_map_narmada').find((p) => p.id === 'poi_cloud_stair')!;
    expect(stair.kind).toBe('anomaly');
    expect(stair.subLocations.filter((s) => s.requires.length > 0)).toHaveLength(1);
    const archive = poisOn('field_map_narmada').find((p) => p.id === 'poi_long_archive')!;
    expect(archive.subLocations.filter((s) => s.requires.length > 0)).toHaveLength(2);
  });

  it('has someone who would not come, like Lothal does', () => {
    expect(npcsAt('poi_long_archive').some((n) => !n.wouldSettle)).toBe(true);
  });
});

describe('the overworld', () => {
  it('joins the two maps', () => {
    expect(neighboursOf('field_map_lothal').map((m) => m.id)).toContain('field_map_narmada');
  });

  it('states every edge from both ends', () => {
    // A one-sided edge is a dead end nobody finds until a player walks into it.
    for (const from of fieldMaps) {
      for (const to of neighboursOf(from.id)) {
        expect(to.neighbours, `${to.id} does not name ${from.id} back`).toContain(from.id);
      }
    }
  });

  it('names no neighbour that does not exist', () => {
    for (const m of fieldMaps) {
      expect(neighboursOf(m.id)).toHaveLength(m.neighbours.length);
    }
  });
});

describe('what the places carry', () => {
  it('brings the camp across as a settlement that is also a ruin', () => {
    const camp = poisOn('field_map_lothal').find((p) => p.id === 'poi_lothal_camp')!;
    expect(camp.kind).toBe('settlement');
    expect(camp.ruinOf).toBe('settlement_lothal');
    expect(camp.arrival.length).toBeGreaterThan(40);
  });

  it('brings the tower across with its gated depths', () => {
    const tower = poisOn('field_map_lothal').find((p) => p.id === 'poi_kavik_tower')!;
    expect(tower.subLocations).toHaveLength(3);
    const gated = tower.subLocations.filter((s) => s.requires.length > 0);
    expect(gated.length).toBe(2);
  });

  it('stands the people somewhere', () => {
    const atCamp = npcsAt('poi_lothal_camp');
    expect(atCamp.map((n) => n.id)).toContain('npc_thrali');
    // Not everyone helped would follow you to a new village, and the ending is better for it.
    expect(atCamp.some((n) => !n.wouldSettle)).toBe(true);
  });

  it('only names biomes the engine can draw', () => {
    const known = new Set(biomes.map((b) => b.id));
    for (const b of lothal!.seedBiomes) expect(known.has(b)).toBe(true);
    for (const p of poisOn('field_map_lothal')) {
      for (const b of p.terrain) expect(known.has(b)).toBe(true);
    }
  });
});

describe('the destination stands on its own ground', () => {
  // The landmark tile was being reclassified away on every map. No field map lists `landmark` in
  // its palette -- and none should, since canon's `seed_biomes` describe the country and a
  // landmark is a place put on it -- so `applyPalette` swept it up with everything else. The end
  // of the whole journey was drawn as ordinary marsh, and the tile built for it never appeared.
  //
  // It hid because nothing asserted the one tile the journey is *about*: the terrain tests count
  // biomes across the map, where a single wrong tile is invisible.
  it('keeps the landmark tile on every field map', () => {
    for (const map of fieldMaps) {
      const { world } = buildFieldMap(map, {});
      const tile = world.tiles[world.landmark.y]![world.landmark.x]!;
      expect(tile.biome, `${map.id}: the landmark stands on ${tile.biome}`).toBe('landmark');
    }
  });

  it('still remembers what the ground was before the landmark took it', () => {
    // `terrain` is deliberately *not* the tile's biome -- it is what the tile was beforehand, and
    // it is how the content layer knows a shell beach belongs on a coast. Reading the two as if
    // they should agree is a mistake worth pinning down: they must differ.
    for (const map of fieldMaps) {
      const { world } = buildFieldMap(map, {});
      expect(world.landmark.terrain).not.toBe('landmark');
      const kind = landmarkKindFor(world.landmark, world.seed);
      expect(kind.terrain, `${map.id}: ${kind.name} does not belong on ${world.landmark.terrain}`)
        .toContain(world.landmark.terrain);
    }
  });
});
