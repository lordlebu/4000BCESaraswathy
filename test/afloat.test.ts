// The dugout's rules: in the kit on Lothal, boarded by stepping into the river, left on dry land.

import { describe, expect, it } from 'vitest';
import { afloatAfter, paddleable, PADDLE_STEP, routeCost, stepCostAfloat } from '../src/game/afloat';
import { boatFor, DUGOUT } from '../src/content/kit';
import { fieldMaps } from '../src/content/places';
import { ROAD_STEP, stepCost } from '../src/content/species';

const river = { biome: 'river' as const };
const swamp = { biome: 'wetland' as const };
const grass = { biome: 'plains' as const };
const bridge = { biome: 'river' as const, bridge: true };

describe('who has a boat', () => {
  it('is Lothal, from the first morning, and nowhere else', () => {
    const withBoat = fieldMaps.filter((m) => boatFor(m.vehicles) !== null).map((m) => m.id);
    expect(withBoat).toEqual(['field_map_lothal']);
    expect(boatFor(['vehicle_log_dugout'])).toBe(DUGOUT);
  });
});

describe('getting in and out', () => {
  it('boards by stepping from a bank into the river', () => {
    expect(afloatAfter(false, river, true)).toBe(true);
  });

  it('does not board without a boat', () => {
    expect(afloatAfter(false, river, false)).toBe(false);
  });

  it('walks onto a bridge rather than launching under it', () => {
    expect(afloatAfter(false, bridge, true)).toBe(false);
  });

  it('wades a swamp on foot, and paddles on through one once afloat', () => {
    expect(afloatAfter(false, swamp, true)).toBe(false);
    expect(afloatAfter(true, swamp, true)).toBe(true);
  });

  it('steps ashore onto dry land, or onto a bridge', () => {
    expect(afloatAfter(true, grass, true)).toBe(false);
    expect(afloatAfter(true, bridge, true)).toBe(false);
    expect(paddleable(bridge)).toBe(false);
  });
});

describe('what it costs', () => {
  it('makes the river the quickest going on the map, in the dugout', () => {
    expect(stepCostAfloat(river, false, true)).toBe(PADDLE_STEP);
    expect(PADDLE_STEP).toBeLessThan(ROAD_STEP);
    expect(stepCostAfloat(river, false, false)).toBe(stepCost('river'));
  });

  it('sends a tap along the channel when there is a boat to paddle it', () => {
    expect(routeCost(river, true, false)).toBe(PADDLE_STEP);
    expect(routeCost(river, false, false)).toBe(stepCost('river'));
    expect(routeCost(swamp, true, false)).toBe(stepCost('wetland'));
    expect(routeCost(swamp, true, true)).toBe(PADDLE_STEP);
  });
});

// --- the shallows: swamp, and the sea within two tiles of land (the owner's ruling, 3 October 2026)

import { canStepOnto, SHALLOW_REACH, shallowsOf } from '../src/game/afloat';
import { isWalkable } from '../src/world/generate';
import { worldFor } from '../src/world/bake';
import { fieldMap } from '../src/content/places';
import type { BiomeId, Tile } from '../src/world/types';

/** A strip of ground: one row, read left to right, so a reach can be counted in tiles. */
function strip(...biomes: BiomeId[]) {
  const row = biomes.map((biome, x) => ({ x, y: 0, biome }) as unknown as Tile);
  return { tiles: [row], width: row.length, height: 1 };
}

describe('the shallows', () => {
  it('reach two tiles out from the shore and no further', () => {
    expect(SHALLOW_REACH).toBe(2);
    const w = strip('coast', 'sea', 'sea', 'sea', 'sea');
    const shallow = shallowsOf(w);
    expect(w.tiles[0]!.map((t) => shallow.has(t))).toEqual([false, true, true, false, false]);
  });

  it('are sea, never land or river, and count any walkable ground as shore', () => {
    const w = strip('plains', 'sea', 'sea', 'river', 'wetland');
    const shallow = shallowsOf(w);
    expect(w.tiles[0]!.map((t) => shallow.has(t))).toEqual([false, true, true, false, false]);
  });

  it('do not change what is walkable for anybody else', () => {
    const w = strip('coast', 'sea');
    const sea = w.tiles[0]![1]!;
    expect(shallowsOf(w).has(sea)).toBe(true);
    expect(isWalkable(sea), 'the sea became walkable for travellers and camps').toBe(false);
    expect(canStepOnto(sea, false, true), 'stepped onto the sea with no boat').toBe(false);
    expect(canStepOnto(sea, true, false), 'paddled out past the shallows').toBe(false);
    expect(canStepOnto(sea, true, true)).toBe(true);
  });

  it('board from the beach, carry on from swamp or river, and land on the beach', () => {
    const sea = { biome: 'sea' as const };
    const beach = { biome: 'coast' as const };
    expect(afloatAfter(false, sea, true, true), 'stepped off the beach and did not board').toBe(true);
    expect(afloatAfter(true, sea, true, true)).toBe(true);
    expect(afloatAfter(true, swamp, true, false), 'swamp stopped being water').toBe(true);
    expect(afloatAfter(true, river, true, false)).toBe(true);
    expect(afloatAfter(true, beach, true, false), 'stayed in the boat on the sand').toBe(false);
    expect(afloatAfter(false, sea, false, true)).toBe(false);
  });

  it('are the quick going for a route, with a boat', () => {
    const sea = { biome: 'sea' as const };
    expect(routeCost(sea, true, false, true)).toBe(PADDLE_STEP);
    expect(stepCostAfloat(sea, true, true, true)).toBe(PADDLE_STEP);
  });

  it('exist on Lothal, and the sea beyond them is still out of reach', () => {
    const lothal = worldFor(fieldMap('field_map_lothal')!, 'shallows').world;
    const shallow = shallowsOf(lothal);
    const sea = lothal.tiles.flat().filter((t) => t.biome === 'sea');
    expect(shallow.size, 'no shallows on Lothal').toBeGreaterThan(0);
    expect(shallow.size, 'every sea tile became shallows').toBeLessThan(sea.length);
    for (const t of shallow) expect(t.biome).toBe('sea');
  });
});
