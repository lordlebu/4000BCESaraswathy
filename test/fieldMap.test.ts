// Does a canon field map become ground the player can walk?
//
// This is the join the two-repo split exists for: canon names Lothal and its six points of
// interest, the generator lays terrain, and the placer puts the authored places on it. If
// any of that drifts, the Lothal slice stops being reachable and nobody notices until
// someone tries to walk it.

import { describe, expect, it } from 'vitest';
import { isWalkable } from '../src/world/generate';
import { buildFieldMap, poiAt } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, poi, poisOn, npcsAt, neighboursOf } from '../src/content/places';
import { band } from '../src/world/classify';
import { DEFAULT_SEED } from '../src/ui/seed';
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
    // Counted from canon rather than pinned to a number. The pin was 6 and canon gained a
    // seventh place -- the High Camp -- which made a passing test fail for the one reason it
    // should not: content arriving. What this is actually for is the line below.
    expect(built.placed).toHaveLength(narmada!.pointsOfInterest.length);
    expect(built.unplaced, 'a place canon authored has nowhere to stand').toEqual([]);
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
  /** The same world `mix` counts, built the same way, so the two never disagree. */
  function build(mapId: string) {
    return buildFieldMap(fieldMaps.find((m) => m.id === mapId)!, {});
  }

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

  it('puts a place on the ground it stands on', () => {
    // Every point of interest on Lothal and Dwarka used to sit on the lowest terrace while both
    // maps carried over a hundred and twenty hill tiles. Nothing was choosing badly -- `suitable`
    // matches on biome and no place on either map listed `hills`, so high ground was never a
    // candidate. `stands` is the word for what `terrain` could not say.
    for (const map of fieldMaps) {
      const built = buildFieldMap(map, { seed: map.id });
      for (const placed of built.placed) {
        const want = poi(placed.poi.id)?.stands ?? 'either';
        if (want === 'either') continue;
        const tile = built.world.tiles[placed.at.y]![placed.at.x]!;
        const high = band(tile.elevation) >= 1;
        expect(
          want === 'high' ? high : !high,
          `${placed.poi.id} stands '${want}' but sits on band ${band(tile.elevation)}`
        ).toBe(true);
      }
    }
  });

  it('treats height as a preference, never a filter', () => {
    // **The reason `heightBias` weights the score instead of rejecting candidates.** A filter
    // would refuse every low tile to a place that wants height, and on a map with no high ground
    // -- or whose high ground is already taken -- that loses the place entirely. A place that
    // cannot have what it wants must still be somewhere.
    let lost = 0;
    let total = 0;
    for (const map of fieldMaps) {
      for (let i = 1; i <= 6; i += 1) {
        const built = buildFieldMap(map, { seed: `stands-${i}` });
        total += built.placed.length + built.unplaced.length;
        lost += built.unplaced.length;
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(lost, 'a height preference must never cost a place its spot').toBe(0);
  });

  it('never generates ground a map is not made of', () => {
    // **The guarantee the constrained classifier exists to give.** Before it, the generator made a
    // whole continent against fixed thresholds and a hand-written `BECOMES` table swapped out
    // whatever the palette did not contain -- so this property held only because a substitution
    // pass repaired it afterwards, and every fault in that table showed up as a map quietly
    // becoming something else. `classifyBiome` now takes the palette, so there is nothing to
    // repair.
    //
    // `landmark` is stamped deliberately: it is the destination of the journey, it is authored
    // rather than classified, and no palette lists it.
    //
    // **A camp is the second of these, and it is the same kind of exception rather than a new
    // one.** The Aravali has no town -- canon does not put `settlement` in its palette, correctly,
    // because the people on that map are all passing through -- and a household that stops for the
    // night is a *place*, stamped after classification exactly like the landmark and the islands.
    // The felt goes down on `settlement` ground because that is what earns it tents and a name.
    //
    // So the exception is allowed only where a camp was actually pitched, and the next assertion
    // pins it to the camp's own footprint. Blanket-allowing `settlement` everywhere would let the
    // ruined-city patch back onto a map that has no city in it, which is the bug this pair exists
    // to catch.
    for (const map of fieldMaps) {
      const world = build(map.id).world;
      const allowed = new Set<string>([...map.seedBiomes, 'landmark']);
      if (world.camp) allowed.add('settlement');
      // **`sky_water` is exempt for the same reason `landmark` is, and the reason matters.** It is
      // a pool stamped inside the island patch after classification -- a place, not a climate.
      //
      // Putting it in `seed_biomes` to satisfy this test would be the exact trap `CLAUDE.md`
      // records about `lava_field`: the palette is what the classifier divides elevation and
      // moisture among, so a map listing it would come out roughly a third sky water. The stamp is
      // bounded by `pourAPool` instead -- it can only write over `sky_island`, so it cannot reach
      // a map with no island on it however this list is written.
      if (map.seedBiomes.includes('sky_island')) allowed.add('sky_water');
      const stray = [...mix(map.id).keys()].filter((biome) => !allowed.has(biome));
      expect(stray, `${map.id} generated ${stray.join(', ')}, which is not in its palette`).toEqual([]);
    }
  });

  it('puts no town on a map canon gave no town to', () => {
    // The Aravali grew a ruined city in the far south, clipped by the map edge and straddling the
    // railway, and named it -- at 57,22, which is open sea. Nothing in canon has ever mentioned a
    // settlement on that map. `settlement` was in its `seed_biomes`, and `applyPalette` grows a
    // patch wherever that word appears.
    //
    // The only felt allowed on it is the nomad camp's, and it must be exactly the camp.
    // **Across seeds, because one seed proves nothing here.** The patch centre is a hash, so on
    // any given seed it may land inside the strait and be painted over by water before anyone
    // sees it. Deleting the guard in `applyPalette` and running the default seed produced a clean
    // map and a passing test; the city was there and the sea had swallowed it. Eight seeds is
    // enough that a hash cannot hide a patch a twelfth of the map across in all of them.
    const map = fieldMaps.find((m) => m.id === 'field_map_aravali')!;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const world = buildFieldMap(map, { seed }).world;
      expect(world.settlement, `${seed}: a map with no town still named one`).toBeNull();

      const felt = world.tiles.flat().filter((t) => t.biome === 'settlement');
      expect(world.camp, `${seed}: the nomad ground got no tents`).not.toBeNull();
      for (const tile of felt) {
        const away = Math.abs(tile.x - world.camp!.at.x) + Math.abs(tile.y - world.camp!.at.y);
        expect(
          away,
          `${seed}: settlement at ${tile.x},${tile.y} is not part of the camp`
        ).toBeLessThanOrEqual(world.camp!.radius);
      }
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

describe('the landmark is somewhere a walker can get to', () => {
  it('is never walled in, on twelve seeds across every map', () => {
    // **The landmark is chosen against a world the palette then rewrites.** `placeLandmark` picks a
    // distant *reachable* tile, which is right for the procedural walk it was written for; a field
    // map then runs `applyPalette` over the whole grid and stamps a strait, two islands and a rail
    // across it, and none of that re-checks the earlier decision. The coordinates survive and the
    // ground under them does not.
    //
    // Measured before `groundTheLandmark`: on the Aravali, which is about half water, the landmark
    // came out ringed by open sea with no walkable neighbour on **six of twelve seeds**. The
    // compass in the older landmark loop pointed at a banyan nobody could stand beside, and
    // `landmarkHint` promised it was a day's walk away.
    //
    // Twelve seeds rather than one because that is what it took to see it: the default seed was
    // fine, which is why this went unnoticed for as long as the loop has existed.
    const seeds = ['aravali', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'seed-1', 'seed-2', 'zzz', 'q7'];
    for (const map of fieldMaps) {
      for (const seed of seeds) {
        const world = buildFieldMap(map, { seed }).world;
        const at = world.landmark;
        const around = [
          world.tiles[at.y]?.[at.x],
          world.tiles[at.y - 1]?.[at.x],
          world.tiles[at.y + 1]?.[at.x],
          world.tiles[at.y]?.[at.x - 1],
          world.tiles[at.y]?.[at.x + 1]
        ].filter((t) => t !== undefined);
        expect(
          around.some((t) => isWalkable(t!)),
          `${map.id} seed ${seed}: the landmark at ${at.x},${at.y} has no walkable tile beside it`
        ).toBe(true);
      }
    }
  });
});

describe('a point of interest stands on the ground canon gave it', () => {
  // **Canon can ask for ground the map does not produce, and nothing else would say so.**
  // `poi_alms_step` declares `terrain: ["sky_island"]` and `shore: near`, and the sky
  // islands are *stamped* after classification rather than emitted by the classifier -- which is
  // exactly the shape of the `lava_field` fault `CLAUDE.md` records: a biome with art, species and
  // points of interest asking to stand on it, and zero tiles of it on every seed, because nobody
  // had written the stamp. Every test passed throughout, because none asked whether any of it was
  // on the map.
  //
  // So this asks. It is cheap, and it is the only thing between a canon edit and a temple in
  // the sea.
  it('puts the alms step on an island, on every seed', () => {
    for (const seed of ['varuna', 'a', 'b', 'c', 'lothal', 'x']) {
      const scene = buildFieldMap(fieldMap('field_map_aravali')!, { seed });
      const placed = scene.placed.find((p) => p.poi.id === 'poi_alms_step');
      expect(placed, `seed ${seed}: the alms step was never placed at all`).toBeDefined();
      const tile = scene.world.tiles[placed!.at.y]?.[placed!.at.x];
      expect(
        tile?.biome,
        `seed ${seed}: the alms step stands at ${placed!.at.x},${placed!.at.y} on ${tile?.biome}`
      ).toBe('sky_island');
    }
  });
});

describe('nothing is built on the railway', () => {
  // **Found by looking at a render, not by a test.** The crossing uses the islands as its piers, so
  // the line runs straight across the only ground a sky point of interest can stand on, and the
  // placer was content to put one on the sleepers. It was invisible for as long as a place was a
  // 32-pixel diamond; the first two-tile painted windmill made it obvious in one frame. On the
  // default seed it was landing *two* places on the track, and one of them predated the mill.
  it('places nothing on a track tile, on any map or seed', () => {
    for (const map of fieldMaps) {
      for (const seed of [DEFAULT_SEED, 'a', 'b', 'c', 'x']) {
        const scene = buildFieldMap(map, { seed });
        const onTheLine = scene.placed
          .filter((p) => scene.world.tiles[p.at.y]?.[p.at.x]?.track)
          .map((p) => `${p.poi.id} at ${p.at.x},${p.at.y}`);
        expect(onTheLine, `${map.id}/${seed}: built on the railway`).toEqual([]);
      }
    }
  });

  it('still finds a home for everything canon lists', () => {
    // Taking tiles away from a placer can strand the last few, and the islands are narrow. This is
    // the guard that the fix above did not buy its tidiness with an unplaceable point of interest.
    for (const map of fieldMaps) {
      for (const seed of [DEFAULT_SEED, 'a', 'b']) {
        const scene = buildFieldMap(map, { seed });
        expect(scene.unplaced.map((p) => p.id), `${map.id}/${seed}: stranded`).toEqual([]);
      }
    }
  });
});
