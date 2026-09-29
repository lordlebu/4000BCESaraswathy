// Do the right animals stand on the right side of the strait?
//
// Canon's ruling of 29 September 2026: the large mammals -- the elephants, the bears, the
// Laurasian wolf -- live in Mainland Asia, and the Aravali's northern shore is the edge of it a
// traveller walks. Jambhudweep's relicts, crocodylomorphs, giant amphibians, freshwater whales and
// flightless birds live on Jambhudweep and Gondwana, and never cross north.
//
// Seed-and-coordinate claims, so they belong here rather than in a browser: walk every tile of
// every map and ask the game's own `creatureFor` what stands there.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { creatureFor, creatures } from '../src/content/species';
import { landmassAt } from '../src/world/landmass';

const MAPS = ['field_map_lothal', 'field_map_narmada', 'field_map_dwarka', 'field_map_aravali'];

/** Every creature met, with the landmass of the tile it was met on. */
const met: { map: string; id: string; land: string | null; y: number }[] = [];
const landCount: Record<string, Record<string, number>> = {};
for (const id of MAPS) {
  const { world } = buildFieldMap(fieldMap(id)!);
  landCount[id] = {};
  world.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      const land = landmassAt(world.seed, { x, y });
      landCount[id]![String(land)] = (landCount[id]![String(land)] ?? 0) + 1;
      const c = creatureFor({ x, y, biome: tile.biome }, world.seed);
      if (c) met.push({ map: id, id: c.id, land, y });
    })
  );
}

const ASIAN = creatures.filter((c) => c.landmasses?.length === 1 && c.landmasses[0] === 'mainland_asia');
const RELICT = creatures.filter((c) => c.landmasses && !c.landmasses.includes('mainland_asia'));

describe('the strait divides the animals', () => {
  it('knows which species are Asian and which are Jambhudweep\'s own, so the checks below mean something', () => {
    expect(ASIAN.map((c) => c.id).sort()).toEqual(
      ['laurasian-wolf', 'narmada-cave-bear', 'narmada-straight-tusk', 'woolly-bactrian-croc'].sort()
    );
    expect(RELICT.length).toBeGreaterThan(15);
  });

  it('puts Mainland Asia on the Aravali\'s northern shore and nowhere else', () => {
    expect(landCount.field_map_aravali!.mainland_asia).toBeGreaterThan(300);
    expect(landCount.field_map_aravali!.jambhudweepa).toBeGreaterThan(300);
    for (const id of ['field_map_lothal', 'field_map_narmada', 'field_map_dwarka']) {
      expect(landCount[id]!.mainland_asia ?? 0, `${id} has Asian ground`).toBe(0);
    }
  });

  it('keeps the northern shore north of the strait', () => {
    // The flood stops at the sea: every Asian tile is in the top third of the map.
    const { world } = buildFieldMap(fieldMap('field_map_aravali')!);
    const H = world.tiles.length;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < world.tiles[0]!.length; x++)
        if (landmassAt(world.seed, { x, y }) === 'mainland_asia') expect(y).toBeLessThan(H / 3);
  });

  it.each(ASIAN.map((c) => c.id))('meets %s only in Mainland Asia', (id) => {
    const where = met.filter((m) => m.id === id);
    expect(where.every((m) => m.land === 'mainland_asia'), `${id} met off the northern shore`).toBe(true);
  });

  it('meets the elephant, the bear and the wolf at all, on the northern shore', () => {
    for (const id of ['narmada-straight-tusk', 'narmada-cave-bear', 'laurasian-wolf']) {
      expect(met.filter((m) => m.id === id).length, `${id} is never met`).toBeGreaterThan(0);
    }
  });

  it('never meets a Jambhudweep relict in Mainland Asia', () => {
    const relicts = new Set(RELICT.map((c) => c.id));
    const crossed = met.filter((m) => relicts.has(m.id) && m.land === 'mainland_asia').map((m) => m.id);
    expect([...new Set(crossed)]).toEqual([]);
  });
});
