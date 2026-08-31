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

    // Measured on the built ground, not on the palettes.
    //
    // This used to assert the two palettes shared nothing but `settlement`, which worked while
    // every palette was four entries deep. It stopped being a fair instrument once Lothal gained
    // forest and hills: the lists now overlap on three names while the maps remain completely
    // different places. Narmada comes out 64% hills and 33% forest with no water at all; Lothal
    // is 48% coast and 32% wetland with the woodland on the dry ground behind it.
    //
    // So ask the question directly. A plateau has no water; a delta is mostly water.
    const share = (map: typeof narmada, biome: string) => {
      const { world } = buildFieldMap(map!, {});
      const n = world.tiles.flat().filter((t) => t.biome === biome).length;
      return n / (world.width * world.height);
    };
    const water = (map: typeof narmada) =>
      share(map, 'wetland') + share(map, 'coast') + share(map, 'river') + share(map, 'sea');

    // **A river through it, not a marsh.** This used to assert the plateau was bone dry, and
    // that passed for the wrong reason: canon's palette had no `river`, so every channel the
    // generator cut was reclassified away and the map named ten watercourses that were hills.
    // Canon has given the Narmada the river it is named after, so the question is now whether
    // the water reads as a ribbon rather than as a wetland.
    expect(water(narmada), 'the plateau has no river on it').toBeGreaterThan(0.01);
    // 0.16 rather than a tighter figure, and the slack is honest: `carveRivers` cuts about 3%
    // of this map, and `routes.ts` then eases the ground between the six places, turning wetland
    // to river along every path it draws. Two sources, one number. Tightening this belongs with
    // the constrained-classifier rewrite noted in `fieldMap.ts`, not with another pass of
    // tuning the substitution table.
    expect(water(narmada), 'the plateau is a marsh, not a plateau').toBeLessThan(0.16);
    expect(water(lothal), 'the delta is not mostly water').toBeGreaterThan(0.5);
    // High ground rather than *mostly* hills. Canon's arrival text calls the plateau "a flat
    // green country the sea never reached" -- so a map that is 50% hills is the wrong place, and
    // this assertion was quietly demanding it. What matters is that the plateau is elevated and
    // dry, which the water check above already covers, and that it is not flat at the rim.
    const high = share(narmada, 'hills') + share(narmada, 'mountains') + share(narmada, 'plains');
    expect(high, 'the plateau has lost its tableland').toBeGreaterThan(0.7);
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

describe('every map has ground that is not all one thing', () => {
  /** How much of a built map each biome covers, as a fraction. */
  function mix(mapId: string): Map<string, number> {
    const map = fieldMaps.find((m) => m.id === mapId)!;
    const { world } = buildFieldMap(map, {});
    const tally = new Map<string, number>();
    for (const tile of world.tiles.flat()) {
      tally.set(tile.biome, (tally.get(tile.biome) ?? 0) + 1);
    }
    const total = world.width * world.height;
    return new Map([...tally].map(([biome, n]) => [biome, n / total]));
  }

  it('draws at least four biomes on every map', () => {
    // The bug this exists for: Lothal's palette was wetland, river, settlement and coast, and
    // because everything outside a palette is reclassified into the nearest thing inside it, the
    // finished map was 55% coast and 45% wetland. Two biomes, and it read as flat.
    //
    // Counting only what covers a real share of the map -- a palette entry that lands on nine
    // tiles out of two thousand is in the data but not on the screen.
    for (const map of fieldMaps) {
      const real = [...mix(map.id)].filter(([, share]) => share >= 0.01);
      expect(real.length, `${map.id} is only ${real.map(([b]) => b).join(' and ')}`)
        .toBeGreaterThanOrEqual(4);
    }
  });

  it('gives the delta maps somewhere that is not water', () => {
    // Named rather than derived from the palette, because the palette is the thing under test:
    // reading the expectation out of it would pass however the palette changed.
    expect(mix('field_map_lothal').get('forest') ?? 0).toBeGreaterThan(0.05);
    expect(mix('field_map_lothal').get('hills') ?? 0).toBeGreaterThan(0.01);
    expect(mix('field_map_dwarka').get('hills') ?? 0).toBeGreaterThan(0.01);
  });

  it('keeps the delta a delta', () => {
    // The other half, and the reason plains was left out of Lothal's palette. Adding it takes
    // back every reclassified plains tile at once and drops wetland from 45% to 2% -- richer
    // ground, but no longer a delta. Variety must not cost a map its thesis.
    //
    // `sea` and `river` count as water, which they obviously are. They were omitted when this was
    // written because neither existed on a delta map then: Lothal had no open sea at all and 0.5%
    // river. Leaving them out started failing the moment the landforms gave the harbour its water,
    // which is the test's definition going stale rather than the map getting worse.
    const m = mix('field_map_lothal');
    const wet = ['wetland', 'coast', 'sea', 'river'].reduce((n, b) => n + (m.get(b) ?? 0), 0);
    expect(wet, 'Lothal is no longer mostly water').toBeGreaterThan(0.5);
  });

  it('never generates ground a map is not made of', () => {
    // **The guarantee the constrained classifier exists to give.** Before it, the generator made a
    // whole continent against fixed thresholds and a hand-written `BECOMES` table swapped out
    // whatever the palette did not contain -- so this property held only because a substitution
    // pass repaired it afterwards, and every fault in that table showed up as a map quietly
    // becoming something else. `classifyBiome` now takes the palette, so there is nothing to
    // repair.
    //
    // `landmark` is the one exception and is stamped deliberately: it is the destination of the
    // journey, it is authored rather than classified, and no palette lists it.
    for (const map of fieldMaps) {
      const allowed = new Set<string>([...map.seedBiomes, 'landmark']);
      const stray = [...mix(map.id).keys()].filter((biome) => !allowed.has(biome));
      expect(stray, `${map.id} generated ${stray.join(', ')}, which is not in its palette`).toEqual([]);
    }
  });

  it('leaves Dwarka a waterline rather than water', () => {
    // **Dwarka used to be asserted "mostly water" alongside Lothal, and it should never have
    // been.** Canon is specific that the Shattering took the water and not the land, and
    // `landform.test.ts` asserts `sea === 0` on the grounds that open sea would contradict the
    // whole map. The two expectations were in direct tension and both held only because the old
    // substitution table turned 24% generated sea into coast -- so the number was measuring the
    // artefact rather than the place.
    //
    // What the map actually owes canon is the old waterline: the seawalls have to stand on
    // something. That is coast, and it is asserted as a floor rather than a majority.
    const m = mix('field_map_dwarka');
    expect(m.get('sea') ?? 0, 'the sea left; it must not come back').toBe(0);
    expect(m.get('coast') ?? 0, 'the old waterline is gone').toBeGreaterThan(0.05);
    const dry = (m.get('plains') ?? 0) + (m.get('desert') ?? 0) + (m.get('hills') ?? 0);
    expect(dry, 'a dead harbour in a cold desert should be mostly dry').toBeGreaterThan(0.4);
  });
});
