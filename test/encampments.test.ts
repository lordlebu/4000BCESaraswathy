// Camps that come and go where the roads do not reach.
//
// The rule is a pure function of seed, map and day, so it is held here on real maps: when a camp
// stands, how long, where, and that every map has somewhere for one -- a camp rule that never fires
// on a real map would be this codebase's signature fault.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps } from '../src/content/places';
import { isWalkable } from '../src/world/generate';
import {
  AWAY_FROM_PLACES,
  AWAY_FROM_ROADS,
  CYCLE_DAYS,
  FIRST_DAY,
  STAY_DAYS,
  atCamp,
  campGround,
  encampmentOn
} from '../src/content/encampments';
import { happeningNow, surroundingsAt } from '../src/content/happenings';
import { tileHash } from '../src/world/rng';

const built = (mapId: string, seed: string) => {
  const b = buildFieldMap(fieldMap(mapId)!, { seed });
  return { world: b.world, places: b.placed.map((p) => ({ poiId: p.poi.id, at: p.at })) };
};

describe('when a camp stands', () => {
  it('never on the first day, and for exactly its stay, one camp a turn', () => {
    for (const map of fieldMaps) {
      const { world, places } = built(map.id, 'camps-when');
      expect(encampmentOn(world, map.id, places, 0), `${map.id} has a camp on day 0`).toBeNull();
      const byId = new Map<string, number[]>();
      for (let day = 0; day < CYCLE_DAYS * 10; day += 1) {
        const camp = encampmentOn(world, map.id, places, day);
        if (!camp) continue;
        expect(day).toBeGreaterThanOrEqual(FIRST_DAY);
        expect(day).toBeGreaterThanOrEqual(camp.from);
        expect(day).toBeLessThan(camp.to);
        byId.set(camp.id, [...(byId.get(camp.id) ?? []), day]);
      }
      expect(byId.size, `${map.id} never has a camp in ten turns`).toBeGreaterThan(5);
      for (const [id, days] of byId) {
        expect(days.length, `${id} stood ${days.length} days`).toBeLessThanOrEqual(STAY_DAYS);
        for (let i = 1; i < days.length; i += 1) expect(days[i]! - days[i - 1]!, `${id} came and went`).toBe(1);
      }
    }
  });

  it('is the same camp, in the same place, for the same seed and day', () => {
    const a = built('field_map_narmada', 'camps-same');
    const b = built('field_map_narmada', 'camps-same');
    for (let day = 0; day < 30; day += 1) {
      expect(encampmentOn(b.world, 'field_map_narmada', b.places, day)).toEqual(
        encampmentOn(a.world, 'field_map_narmada', a.places, day)
      );
    }
  });
});

describe('where a camp stands', () => {
  it('on dry ground off every way, away from places and roads, on every map', () => {
    for (const map of fieldMaps) {
      for (let s = 0; s < 6; s += 1) {
        const { world, places } = built(map.id, `camps-where-${s}`);
        const ground = campGround(world, places.map((p) => p.at));
        expect(ground.length, `${map.id} seed ${s} has nowhere for a camp`).toBeGreaterThan(0);
        for (let day = 0; day < CYCLE_DAYS * 3; day += 1) {
          const camp = encampmentOn(world, map.id, places, day);
          if (!camp) continue;
          const tile = world.tiles[camp.at.y]![camp.at.x]!;
          expect(isWalkable(tile)).toBe(true);
          expect(tile.road || tile.ford || tile.bridge || tile.track).toBeFalsy();
          for (const p of places) {
            expect(Math.max(Math.abs(p.at.x - camp.at.x), Math.abs(p.at.y - camp.at.y))).toBeGreaterThanOrEqual(AWAY_FROM_PLACES);
          }
          for (const row of world.tiles) {
            for (const t of row) {
              if (!t.road) continue;
              expect(Math.max(Math.abs(t.x - camp.at.x), Math.abs(t.y - camp.at.y))).toBeGreaterThanOrEqual(AWAY_FROM_ROADS);
            }
          }
          expect(camp.near, 'a camp near nowhere').toBeTruthy();
        }
      }
    }
  });

  it('is walked up to from beside it, not from across the map', () => {
    const { world, places } = built('field_map_lothal', 'camps-beside');
    let camp = null;
    for (let day = 0; !camp && day < 30; day += 1) camp = encampmentOn(world, 'field_map_lothal', places, day);
    expect(camp).toBeTruthy();
    expect(atCamp(camp!, { x: camp!.at.x + 1, y: camp!.at.y })).toBe(true);
    expect(atCamp(camp!, camp!.at)).toBe(true);
    expect(atCamp(camp!, { x: camp!.at.x + 2, y: camp!.at.y })).toBe(false);
  });
});

describe('walking up to a camp', () => {
  it('opens its scene when asked for, though the road never rations one', () => {
    const { world, places } = built('field_map_lothal', 'camps');
    let camp = null;
    let day = 0;
    for (; !camp && day < 30; day += 1) camp = encampmentOn(world, 'field_map_lothal', places, day);
    const at = { x: camp!.at.x + 1, y: camp!.at.y };
    const roll = (s: string) => tileHash(world.seed, at.x, at.y, `camp:${s}`);
    const around = surroundingsAt(world, at, 'field_map_lothal', { timeOfDay: 'afternoon', weather: 'clear' }, roll, { camp });
    const now = { occasion: 'arriving' as const, shelter: null, fieldMapId: 'field_map_lothal', day, holds: [], seen: [] };
    const card = happeningNow(now, roll, around, [], { kind: 'camp', asked: true });
    expect(card?.id).toBe(`woven:camp:${camp!.id}`);
    // Once a camp: seen, it does not open again.
    expect(happeningNow({ ...now, seen: [card!.id] }, roll, around, [], { kind: 'camp', asked: true })).toBeNull();
    // And never rationed onto an ordinary arrival.
    const plain = surroundingsAt(world, at, 'field_map_lothal', { timeOfDay: 'afternoon', weather: 'clear' }, roll, {});
    for (let i = 0; i < 50; i += 1) {
      const r = (s: string) => tileHash(world.seed, i, 0, `plain:${s}`);
      expect(happeningNow({ ...now, day: 40 + i }, r, plain, [])?.id.startsWith('woven:camp:') ?? false).toBe(false);
    }
  });
});
