// Does a canon field map become ground the player can walk?
//
// This is the join the two-repo split exists for: canon names Lothal and its six points of
// interest, the generator lays terrain, and the placer puts the authored places on it. If
// any of that drifts, the Lothal slice stops being reachable and nobody notices until
// someone tries to walk it.

import { describe, expect, it } from 'vitest';
import { buildFieldMap, poiAt } from '../src/world/fieldMap';
import { fieldMap, poisOn, npcsAt } from '../src/content/places';
import { biomes } from '../src/content/species';

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
