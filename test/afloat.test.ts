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
