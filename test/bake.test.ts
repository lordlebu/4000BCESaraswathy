import { describe, expect, it } from 'vitest';
import { fieldMaps } from '../src/content/places';
import { creatureFor, floraFor, travelCost } from '../src/content/species';
import { BIOME_CODES, bakeWorld, rebake, restoreWorld, type BakedWorld } from '../src/world/bake';
import biomesData from '../data/biomes.json';
import type { BiomeId, Tile } from '../src/world/types';
import { reachableFrom } from '../src/world/generate';
import { buildFieldMap } from '../src/world/fieldMap';
import { band } from '../src/world/classify';

/**
 * A baked world has to be indistinguishable from the generated one, not merely plausible.
 *
 * The bake stores two characters a tile and reconstructs the rest, so the risk is a field that
 * something downstream reads and the bake quietly dropped. These tests walk everything the game
 * asks of a world after generation: the biome, the elevation band, travel cost, the species on a
 * tile, the rivers, the settlement, and where the places landed.
 */

const maps = fieldMaps;

describe('a world survives being baked and restored', () => {
  for (const map of maps) {
    it(`${map.id}: every tile reads back the same`, () => {
      const built = buildFieldMap(map, { seed: 'bake-test' });
      const back = rebake(built)!;
      expect(back).not.toBeNull();

      expect(back.world.width).toBe(built.world.width);
      expect(back.world.height).toBe(built.world.height);
      expect(back.world.seed).toBe(built.world.seed);

      for (let y = 0; y < built.world.height; y += 1) {
        for (let x = 0; x < built.world.width; x += 1) {
          const before = built.world.tiles[y]![x]!;
          const after = back.world.tiles[y]![x]!;
          // **The whole tile, less a named list of what is deliberately not kept.** This compared
          // biome, band and cost by name, so the four flags that grew on `Tile` later -- road,
          // ford, track, plank -- were never compared, never stored, and every reload lost them.
          // Naming what is *excluded* instead means a new field fails here until it is either
          // stored or added to this list with a reason.
          expect(atRest(after), `tile ${x},${y}`).toEqual(atRest(before));
          // The raw elevation is deliberately not preserved; the band is all anything reads.
          expect(band(after.elevation)).toBe(band(before.elevation));
          expect(travelCost(after.biome)).toBe(travelCost(before.biome));
        }
      }
    });

    it(`${map.id}: everywhere reachable before a reload is reachable after it`, () => {
      // The fault this format version exists for, stated as the player met it. The Aravali lost its
      // rail and planks on every reload, and with them 59% of the map and six of its twelve places.
      for (const seed of ['bake-test', 'a', 'b', 'c', 'd']) {
        const built = buildFieldMap(map, { seed });
        const back = rebake(built)!;
        const w = built.world;
        const before = reachableFrom(w.tiles, w.width, w.height, w.start);
        const after = reachableFrom(back.world.tiles, w.width, w.height, back.world.start);
        expect(after.size, `${seed}: reachable tiles after a reload`).toBe(before.size);
        for (const { poi, at } of built.placed) {
          expect(after.has(`${at.x},${at.y}`), `${seed}: ${poi.id} after a reload`).toBe(
            before.has(`${at.x},${at.y}`)
          );
        }
      }
    });

    it(`${map.id}: the same species stand on the same ground`, () => {
      const built = buildFieldMap(map, { seed: 'bake-test' });
      const back = rebake(built)!;
      for (let y = 0; y < built.world.height; y += 2) {
        for (let x = 0; x < built.world.width; x += 2) {
          const a = built.world.tiles[y]![x]!;
          const b = back.world.tiles[y]![x]!;
          expect(creatureFor(b, back.world.seed)?.id).toBe(creatureFor(a, built.world.seed)?.id);
          expect(floraFor(b, back.world.seed)?.id).toBe(floraFor(a, built.world.seed)?.id);
        }
      }
    });

    it(`${map.id}: places, rivers and the settlement come back whole`, () => {
      const built = buildFieldMap(map, { seed: 'bake-test' });
      const back = rebake(built)!;

      expect(back.world.start).toEqual(built.world.start);
      expect(back.world.landmark).toEqual(built.world.landmark);
      expect(back.world.settlement).toEqual(built.world.settlement);

      expect(back.world.rivers.map((r) => r.name)).toEqual(built.world.rivers.map((r) => r.name));
      expect(back.world.rivers.map((r) => r.path)).toEqual(built.world.rivers.map((r) => r.path));

      expect(back.placed.map((p) => [p.poi.id, p.at])).toEqual(
        built.placed.map((p) => [p.poi.id, p.at])
      );
      expect(back.unplaced.map((p) => p.id)).toEqual(built.unplaced.map((p) => p.id));
    });
  }
});

describe('every biome the engine knows can be stored', () => {
  it('has a code in BIOME_CODES', () => {
    // The gap that bit: five biomes were added to `BiomeId` and to `data/biomes.json` but not
    // here, so a world containing one failed to restore and was silently regenerated instead --
    // which looks exactly like the bake not working at all, and gives no clue why.
    const uncodeable = (biomesData as { id: string }[])
      .map((b) => b.id)
      .filter((id) => !BIOME_CODES.includes(id as BiomeId));
    expect(uncodeable, 'biomes with no character in the bake encoding').toEqual([]);
  });
});

describe('the stored band reads back as itself', () => {
  it('every band round-trips through its stored elevation', () => {
    // The one check that matters for `BAND_ELEVATION`, and the one that would have caught the
    // hand-written thresholds: a band, turned into an elevation and back, is the same band.
    // Getting `HILLS` wrong (0.55 rather than 0.66) put every upland tile a terrace too low.
    for (const n of [0, 1, 2] as const) {
      const built = buildFieldMap(maps[0]!, { seed: 'bake-test' });
      const baked = bakeWorld(built);
      baked.bands = baked.bands.map((row) => String(n).repeat(row.length));
      const back = restoreWorld(baked, maps[0]!)!;
      expect(band(back.world.tiles[0]![0]!.elevation)).toBe(n);
    }
  });
});

describe('the bake is small enough to keep', () => {
  it('stays well inside a localStorage budget on the largest map', () => {
    const large = maps.find((m) => m.scale === 'large') ?? maps[0]!;
    const bytes = JSON.stringify(bakeWorld(buildFieldMap(large, { seed: 'bake-test' }))).length;
    // Measured around 8 KB. A naive dump of `Tile[][]` is 635 KB, and the budget is roughly 5 MB.
    // The ceiling here is loose on purpose: it catches a field being stored per tile by accident,
    // which is the only way this number moves by an order of magnitude.
    expect(bytes).toBeLessThan(64 * 1024);
  });
});

describe('a bake that cannot be trusted is refused rather than half-read', () => {
  const built = () => buildFieldMap(maps[0]!, { seed: 'bake-test' });
  const bakedOf = () => JSON.parse(JSON.stringify(bakeWorld(built()))) as BakedWorld;

  it('refuses a different format version', () => {
    const baked = bakedOf();
    baked.bakeVersion += 1;
    expect(restoreWorld(baked, maps[0]!)).toBeNull();
  });

  it('refuses a bake belonging to another map', () => {
    const other = maps.find((m) => m.id !== maps[0]!.id)!;
    expect(restoreWorld(bakedOf(), other)).toBeNull();
  });

  it('refuses rows that do not match the stated size', () => {
    const baked = bakedOf();
    baked.biomes[3] = baked.biomes[3]!.slice(0, -1);
    expect(restoreWorld(baked, maps[0]!)).toBeNull();
  });

  it('refuses a flag character outside the flags it knows', () => {
    const baked = bakedOf();
    baked.flags[2] = 'z' + baked.flags[2]!.slice(1);
    expect(restoreWorld(baked, maps[0]!)).toBeNull();
  });

  it('refuses a version-2 bake, which has no flags, so the world is regenerated whole', () => {
    // Reading one would restore the ground and silently drop every road, ford, rail and plank --
    // the exact state this version exists to end.
    const baked = bakedOf() as Partial<BakedWorld>;
    baked.bakeVersion = 2;
    delete baked.flags;
    expect(restoreWorld(baked as BakedWorld, maps[0]!)).toBeNull();
  });

  it('refuses a biome character it does not know', () => {
    const baked = bakedOf();
    baked.biomes[2] = 'z' + baked.biomes[2]!.slice(1);
    expect(restoreWorld(baked, maps[0]!)).toBeNull();
  });

  it('drops a place canon no longer lists rather than inventing one', () => {
    const baked = bakedOf();
    baked.placed.push(['poi_that_canon_removed', 1, 1]);
    const back = restoreWorld(baked, maps[0]!)!;
    expect(back).not.toBeNull();
    expect(back.placed.some((p) => p.poi.id === 'poi_that_canon_removed')).toBe(false);
  });
});

/**
 * A tile without the fields a bake deliberately does not keep.
 *
 * `moisture`, `temperature` and `riverBias` are generator inputs nothing reads afterwards, and
 * `elevation` is kept only as its band -- compared separately. Everything else must come back.
 */
function atRest(tile: Tile): Partial<Tile> {
  const { moisture: _m, temperature: _t, riverBias: _r, elevation: _e, ...kept } = tile;
  // A flag set `false` means what an absent one means -- `thinRoad` clears a road tile by writing
  // `false` rather than deleting the key -- so the two are compared as the same thing.
  return Object.fromEntries(Object.entries(kept).filter(([, v]) => v !== false)) as Partial<Tile>;
}
