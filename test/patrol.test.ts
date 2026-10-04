// The Sinauli wagon on its round: a craft that is a wanderer.
//
// **The owner's ask of 4 October 2026**: the Sinauli wagon walks like the animals do, on North Dwarka,
// around the Caravan Ground, on open dry ground -- desert, grass or hill, never marsh or water -- and
// mostly standing still. No errand hangs on it; meeting it is a card, once, and not the moment the
// traveller arrives. Each half of that is a rule below, measured across seeds rather than on the one
// seed that happens to work. That it reaches the screen is `e2e/wanderers.spec.ts`'s to say.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { PATROL_RANGE, isAlongside, wandererAt, wandererIdsOn, wanderersOn, type Wanderer } from '../src/content/wanderers';
import { wayBetween } from '../src/content/travellers';
import { happeningNow, surroundingsAt } from '../src/content/happenings';
import { PASSING_AFTER_STEPS } from '../src/content/tiers';
import { markerSize, wandererBuild } from '../src/game/frames';
import type { Circumstance } from '../src/content/events';
import type { World } from '../src/world/types';

const SEEDS = Array.from({ length: 12 }, (_, i) => `patrol-${i}`);
const DRY = ['desert', 'plains', 'hills'];
const WET = ['wetland', 'river', 'sea', 'coast', 'sky_water'];

function dwarka(seed: string) {
  const built = buildFieldMap(fieldMap('field_map_dwarka')!, { seed });
  const places = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
  return { world: built.world, places, home: places.find((p) => p.poiId === 'poi_caravan_camp')?.at ?? null };
}

const wagonOn = (world: World, places: { poiId: string; at: { x: number; y: number } }[]): Wanderer | null =>
  wanderersOn('field_map_dwarka', world, places).find((w) => w.vehicle === 'vehicle_sinauli_wagon') ?? null;

describe('the Sinauli wagon keeps a round near the Caravan Ground', () => {
  it('is on North Dwarka, and only there', () => {
    expect(wandererIdsOn('field_map_dwarka')).toContain('sinauli-wagon');
    for (const map of ['field_map_lothal', 'field_map_narmada', 'field_map_aravali']) {
      expect(wandererIdsOn(map), map).not.toContain('sinauli-wagon');
    }
  });

  it('wins a round on nearly every seed', () => {
    // Dropped where no dry ground lies near the Caravan Ground, as an animal whose habitat the map
    // lacks is. That is honest on one seed in many and a bug on most of them.
    const rounds = SEEDS.filter((seed) => {
      const { world, places } = dwarka(seed);
      return (wagonOn(world, places)?.circuit.length ?? 0) >= 2;
    });
    expect(rounds.length, `a round on ${rounds.length} of ${SEEDS.length} seeds`).toBeGreaterThanOrEqual(10);
  });

  it('stops only on open dry ground, within sight of the Caravan Ground', () => {
    for (const seed of SEEDS) {
      const { world, places, home } = dwarka(seed);
      const wagon = wagonOn(world, places);
      if (!wagon || !home) continue;
      for (const at of wagon.circuit) {
        const biome = world.tiles[at.y]![at.x]!.biome;
        expect(DRY, `${seed}: a stop on ${biome}`).toContain(biome);
        expect(Math.abs(at.x - home.x), `${seed}: a stop too far from the Caravan Ground`).toBeLessThanOrEqual(PATROL_RANGE);
        expect(Math.abs(at.y - home.y), `${seed}: a stop too far from the Caravan Ground`).toBeLessThanOrEqual(PATROL_RANGE);
      }
    }
  });

  it('never rolls through marsh or water on the way between its stops', () => {
    // The ways are what it is drawn along, so a dry set of stops joined across a river would still
    // put the wheels in it. Every leg, including the one home.
    let legs = 0;
    for (const seed of SEEDS) {
      const { world, places } = dwarka(seed);
      const wagon = wagonOn(world, places);
      if (!wagon) continue;
      const stops = wagon.circuit;
      stops.forEach((from, i) => {
        const to = stops[(i + 1) % stops.length]!;
        for (const at of wayBetween(world, from, to)) {
          const tile = world.tiles[at.y]![at.x]!;
          if (tile.bridge) continue;
          expect(WET, `${seed}: the way crosses ${tile.biome} at ${at.x},${at.y}`).not.toContain(tile.biome);
        }
        legs += 1;
      });
    }
    expect(legs, 'no leg was checked').toBeGreaterThan(0);
  });

  it('stands still most of the day', () => {
    const { world, places } = dwarka(SEEDS[0]!);
    const wagon = wagonOn(world, places)!;
    let still = 0;
    const samples = 96;
    for (let i = 0; i < samples; i += 1) {
      if (wandererAt(world, wagon, 3, i / samples)?.resting) still += 1;
    }
    expect(still / samples, 'standing for less than five-sixths of the day').toBeGreaterThanOrEqual(5 / 6);
    expect(still, 'it never moves at all').toBeLessThan(samples);
  });

  it('has a stand-in of its own until its painting arrives', () => {
    expect(wandererBuild('sinauli-wagon').shape).toBe('chariot');
    const { w, h } = markerSize('sinauli-wagon');
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });
});

describe('meeting it is a card, once, with nothing to take', () => {
  const { world, places } = dwarka(SEEDS[0]!);
  const wagon = wagonOn(world, places)!;
  const at = wagon.circuit[0]!;
  const now = (over: Partial<Circumstance> = {}): Circumstance => ({
    occasion: 'road',
    shelter: null,
    fieldMapId: 'field_map_dwarka',
    day: 4,
    holds: [],
    seen: [],
    ...over
  });
  const around = (passing: { id: string } | null) =>
    surroundingsAt(world, at, 'field_map_dwarka', { timeOfDay: 'morning', weather: 'clear' }, () => 0, { passing });
  const asked = { kind: 'passing', asked: true };

  it('opens when asked for by coming alongside', () => {
    const card = happeningNow(now(), () => 0, around({ id: wagon.id }), [], asked);
    expect(card?.id).toBe('woven:passing:sinauli-wagon');
    expect(card?.prose).toMatch(/Sinauli/);
    expect(card?.choices.length).toBe(2);
    // No errand: nothing granted, nothing given, nothing taken.
    for (const c of card?.choices ?? []) {
      expect(c.grants).toEqual([]);
      expect(c.gives ?? []).toEqual([]);
      expect(c.takes ?? []).toEqual([]);
    }
  });

  it('does not open without the wagon, and does not open twice', () => {
    expect(happeningNow(now(), () => 0, around(null), [], asked)).toBeNull();
    expect(happeningNow(now({ seen: ['woven:passing:sinauli-wagon'] }), () => 0, around({ id: wagon.id }), [], asked)).toBeNull();
  });

  it('is never rationed onto an ordinary day on the road', () => {
    // Weight nought, like a camp: only coming alongside opens it.
    for (let day = 0; day < 40; day += 1) {
      const card = happeningNow(now({ day }), () => 0, around({ id: wagon.id }), []);
      expect(card?.id ?? '').not.toMatch(/^woven:passing:/);
    }
  });

  it('waits until the traveller has walked a while on the map', () => {
    // The Caravan Ground is where Dwarka sets a traveller down and where the round is kept, so the
    // first steps would otherwise meet it. Most of a morning's walk -- `tile-entered` is about eighty a day.
    expect(PASSING_AFTER_STEPS).toBeGreaterThanOrEqual(30);
    expect(PASSING_AFTER_STEPS).toBeLessThanOrEqual(160);
  });

  it('counts coming alongside the way the animals do', () => {
    expect(isAlongside(at, { x: at.x + 1, y: at.y + 1 })).toBe(true);
    expect(isAlongside(at, { x: at.x + 2, y: at.y })).toBe(false);
  });
});
