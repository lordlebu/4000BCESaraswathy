// The rock Dwarka is built on.
//
// **What this exists to catch is a whole biome that nothing draws.** `lava_field` had painted
// ground, six decor props, basalt columns on the overdraw sheet, a frame in the terrain sheet, a
// place in `data/biomes.json`, an entry in canon's palette for Dwarka and four points of interest
// asking to stand on it -- and no stamp anywhere. The classifier only ever emits the eight biomes
// in `ALL_TERRAIN`, so the map generated zero tiles of it on every seed and all four places
// silently took their second-choice terrain. Every test passed.
//
// So the first assertion here is the one nobody had written: is any of it on the map at all.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';

const dwarka = () => fieldMaps.find((m) => m.id === 'field_map_dwarka')!;
const SEEDS = ['', 'a', 'b', 'c', 'd', 'e'];
const build = (seed: string) => buildFieldMap(dwarka(), seed ? { seed } : {}).world;

describe('the ground Dwarka stands on', () => {
  it('is on the map at all', () => {
    for (const seed of SEEDS) {
      const world = build(seed);
      const basalt = world.tiles.flat().filter((t) => t.biome === 'lava_field');
      expect(basalt.length, `${seed || 'default'}: canon put lava_field in the palette and the map has none`).toBeGreaterThan(60);
      // And not so much that the country becomes the rock: it is what the city sits on, not Dwarka.
      expect(basalt.length / (world.width * world.height), `${seed || 'default'}: the map is mostly lava`).toBeLessThan(0.2);
    }
  });

  it('goes under the city, which is what canon says it does', () => {
    // "It goes under the wall, under the court, under the market. Somebody laid a city on top of
    // it and never had to quarry a stone." The rock is why the city is where it is, so the two
    // cannot be in different halves of the map.
    for (const seed of SEEDS) {
      const world = build(seed);
      const city = world.tiles.flat().filter((t) => t.biome === 'settlement');
      const basalt = world.tiles.flat().filter((t) => t.biome === 'lava_field');
      expect(city.length, `${seed || 'default'}: no city`).toBeGreaterThan(0);

      const touching = city.filter((t) =>
        basalt.some((b) => Math.abs(b.x - t.x) <= 1 && Math.abs(b.y - t.y) <= 1)
      );
      expect(
        touching.length / city.length,
        `${seed || 'default'}: only ${touching.length} of ${city.length} city tiles stand on the rock`
      ).toBeGreaterThan(0.35);
    }
  });

  it('names the city it actually built', () => {
    // `placeSettlement` names a tile in the generator and `applyPalette` grows the patch somewhere
    // else, from a different hash -- so every map had a named point with nothing on it and a city
    // with no name, never in the same place. One tile in forty fell within reach of the record.
    // Nothing compared them: the journal reads the record, the huts are drawn from the tiles.
    for (const map of fieldMaps) {
      const world = buildFieldMap(map, {}).world;
      const city = world.tiles.flat().filter((t) => t.biome === 'settlement');
      if (world.settlement === null) {
        // A map with no town can still have settlement ground: the Aravali's is the nomad camp,
        // which is felt rather than brick and is named by `World.camp` instead. That is the one
        // legitimate way to have the ground and no record.
        expect(city.length, `${map.id}: settlement ground with neither a record nor a camp`).toBe(
          world.camp === null ? 0 : city.length
        );
        continue;
      }
      const near = city.filter(
        (t) => Math.abs(t.x - world.settlement!.x) <= 2 && Math.abs(t.y - world.settlement!.y) <= 2
      );
      expect(
        near.length,
        `${map.id}: ${world.settlement.name} is named at ${world.settlement.x},${world.settlement.y}, where there is no city`
      ).toBeGreaterThan(0);
    }
  });

  it('puts the places that are made of it on it', () => {
    // Four points of interest name `lava_field` first: both gates, the shore whose trackways are
    // cut into the stone, and the fang bed. Canon writes `terrain` in preference order and the
    // picker was reading it as an unordered set, so The Black Pavement -- "the ground everything
    // here is built on" -- stood on sand with the rock a dozen tiles away.
    const built = buildFieldMap(dwarka(), {});
    const wanted = built.placed.filter((p) => p.poi.terrain[0] === 'lava_field');
    expect(wanted.length, 'no place claims the basalt').toBeGreaterThan(2);

    // **Except where canon asks for two things the map cannot give at once.** The Fang Bed wants
    // `lava_field` *and* `stands: high` -- bone in basalt in the volcanic highlands -- and whether
    // the flow reaches any high ground depends on whether the city landed near hills. Where it
    // does not, height wins and the place takes bare hills, which is `heightBias` working as
    // designed rather than the terrain preference failing. Asserted as "most of them", so a
    // regression that puts every lava place back on sand is still caught.
    const onTheRock = wanted.filter(
      ({ at }) => built.world.tiles[at.y]![at.x]!.biome === 'lava_field'
    );
    expect(
      onTheRock.length,
      `only ${onTheRock.length} of ${wanted.length} places named for the rock are standing on it`
    ).toBeGreaterThanOrEqual(wanted.length - 1);
  });

  it('leaves the maps that have no basalt alone', () => {
    // `lava_field` is in exactly one palette. A stamp that reached the others would be putting
    // volcanic rock in a river delta.
    for (const map of fieldMaps) {
      if (map.id === 'field_map_dwarka') continue;
      const world = buildFieldMap(map, {}).world;
      expect(
        world.tiles.flat().filter((t) => t.biome === 'lava_field').length,
        `${map.id} grew basalt it has no palette for`
      ).toBe(0);
    }
  });
});
