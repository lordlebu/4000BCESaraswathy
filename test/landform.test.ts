// Landforms, and the one rule that keeps them from destroying the world.
//
// `shapers add, never subtract` is the load-bearing test here. Shaping by lowering the rim looks
// equivalent to shaping by raising the interior -- the difference is a constant and `normalize`
// runs afterwards anyway -- but the sea threshold is a fixed fraction of the normalised range, so
// subtracting drags the distribution under water. Doing it the wrong way round halved the land on
// every procedural seed before this test existed.

import { describe, expect, it } from 'vitest';
import { placeOf, shapeFor, type Relief } from '../src/world/landform';
import { generateWorld } from '../src/world/generate';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { isWalkable, reachableFrom } from '../src/world/generate';

const RELIEFS: readonly Relief[] = ['delta', 'island', 'plateau', 'basin'];

/** Every biome share on a built map. */
function mix(id: string): Map<string, number> {
  const map = fieldMaps.find((m) => m.id === id)!;
  const { world } = buildFieldMap(map, {});
  const tally = new Map<string, number>();
  for (const t of world.tiles.flat()) tally.set(t.biome, (tally.get(t.biome) ?? 0) + 1);
  const total = world.width * world.height;
  return new Map([...tally].map(([b, n]) => [b, n / total]));
}

describe('shapers raise the interior rather than lowering the rim', () => {
  it('never pushes the middle of a map below zero', () => {
    // The rule stated as an assertion. A shaper is free to cut a shoreline at the very edge, but
    // the interior must not be dragged down, because that is what floods a world.
    for (const relief of RELIEFS) {
      const middle = shapeFor(relief, { edgeDistance: 0.5, west: 0.5, north: 0.5 });
      expect(middle.elevation, `${relief} lowers its own interior`).toBeGreaterThanOrEqual(0);
    }
  });

  it('leaves the interior higher than the rim, for every landform', () => {
    for (const relief of RELIEFS) {
      const rim = shapeFor(relief, { edgeDistance: 0.02, west: 0.5, north: 0.5 });
      const middle = shapeFor(relief, { edgeDistance: 0.5, west: 0.5, north: 0.5 });
      expect(middle.elevation, `${relief} is not higher inland`).toBeGreaterThan(rim.elevation);
    }
  });
});

describe('the procedural world keeps its land', () => {
  it('stays in the range it had before landforms existed', () => {
    // Measured against the original generator: 63-86% land across twenty seeds, mean 75%. The
    // first version of the shapers gave 27-75% with a mean of 49% and put three seeds through the
    // floor `generator.test.ts` guards. This pins the budget rather than the exact numbers.
    const lands: number[] = [];
    for (let i = 1; i <= 20; i += 1) {
      const world = generateWorld({ seed: `landform-${i}` });
      const tiles = world.tiles.flat();
      lands.push(tiles.filter((t) => t.biome !== 'sea').length / tiles.length);
    }
    const mean = lands.reduce((a, b) => a + b, 0) / lands.length;
    expect(Math.min(...lands), 'a seed came out mostly sea').toBeGreaterThan(0.4);
    expect(mean, 'the world is losing land').toBeGreaterThan(0.6);
  });
});

describe('each map is the landform canon says it is', () => {
  it('gives the harbour its water', () => {
    // Lothal is a harbour and had no open sea at all before landforms -- the palette was
    // reclassifying every tile of it to coast.
    expect(mix('field_map_lothal').get('sea') ?? 0).toBeGreaterThan(0.05);
  });

  it('leaves Dwarka dry, because its sea left', () => {
    // Dwarka was an island; the Shattering took the water rather than the land, so it is a cold
    // desert around a dead harbour now. `coast` stays for the old waterline -- the seawalls have
    // to stand on something -- but open sea would contradict the whole map.
    expect(mix('field_map_dwarka').get('sea') ?? 0).toBe(0);
    expect(mix('field_map_dwarka').get('coast') ?? 0).toBeGreaterThan(0.05);
  });

  it('gives the plateau its flat green country', () => {
    // Canon's arrival text is the specification: "a flat green country the sea never reached".
    // The map was 62% forest and 35% hills at a uniform travel cost of 2 -- high country with no
    // flat anything in it.
    expect(mix('field_map_narmada').get('plains') ?? 0).toBeGreaterThan(0.15);
  });

  it('keeps the plateau dry, because the sea never reached it', () => {
    const m = mix('field_map_narmada');
    const water = ['sea', 'coast', 'wetland'].reduce((n, b) => n + (m.get(b) ?? 0), 0);
    expect(water).toBeLessThan(0.05);
  });

  it('leaves every map walkable end to end', () => {
    // The shapers cut coastlines. A coastline that severs the map is the failure mode, and it is
    // the one that would not show up in any biome percentage.
    for (const map of fieldMaps) {
      const { world, placed, unplaced } = buildFieldMap(map, {});
      const reached = reachableFrom(world.tiles, world.width, world.height, world.start);
      const walkable = world.tiles.flat().filter(isWalkable).length;
      expect(reached.size, `${map.id} is cut in two`).toBe(walkable);
      expect(unplaced, `${map.id} could not place every place`).toEqual([]);
      expect(placed.length).toBeGreaterThan(0);
    }
  });
});

describe('placeOf', () => {
  it('measures edge distance against the shorter side, not half of it', () => {
    // Halving looks like the obvious normalisation and doubles every shaper's reach: on the
    // default 36x24 procedural map it flooded 70% of the world.
    const centre = placeOf(18, 12, 36, 24);
    expect(centre.edgeDistance).toBeCloseTo(11 / 24, 2);
    expect(placeOf(0, 0, 36, 24).edgeDistance).toBe(0);
  });
});
