// Camps, and the hint that names where to go next.
//
// The load-bearing test here is `every map has a camp` -- Phase 5's fatigue is only survivable
// because resting is always possible, and that guarantee has to be checked rather than assumed.
// It is asserted against canon's real maps, not a fixture, so authoring a map without one fails.

import { describe, expect, it } from 'vitest';
import { isCamp, nearestCamp, nearestUnvisited, stepsBetween } from '../src/content/camps';
import { whereNextHint } from '../src/content/journal';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps, poisOn } from '../src/content/places';
import type { PlacedPoi } from '../src/world/fieldMap';
import type { PointOfInterest } from '../src/content/places';

const poi = (id: string, kind: string, x: number, y: number): PlacedPoi =>
  ({ poi: { id, name: id, kind } as PointOfInterest, at: { x, y } });

describe('isCamp', () => {
  it('accepts the two kinds you would sleep at', () => {
    expect(isCamp({ kind: 'settlement' } as PointOfInterest)).toBe(true);
    expect(isCamp({ kind: 'travel_node' } as PointOfInterest)).toBe(true);
  });

  it('rejects the four kinds you go to look at', () => {
    // Camping in a glass scar or a drowned seawall would read as strange.
    for (const kind of ['wilderness', 'eco_site', 'archaeological_site', 'anomaly']) {
      expect(isCamp({ kind } as PointOfInterest), `${kind} should not be a camp`).toBe(false);
    }
  });
});

describe('every field map has somewhere to rest', () => {
  it('is true of all four, against canon rather than a fixture', () => {
    // The invariant Phase 5 rests on. If this ever fails, fatigue is a trap rather than a
    // rhythm -- so it is checked here, where a new map without a camp fails immediately.
    for (const map of fieldMaps) {
      const camps = poisOn(map.id).filter(isCamp);
      expect(camps.length, `${map.id} has nowhere to camp`).toBeGreaterThan(0);
    }
  });

  it('places at least one of them on the built ground', () => {
    // Canon listing a camp is not the same as the engine finding it a tile.
    for (const map of fieldMaps) {
      const built = buildFieldMap(map, {});
      const camps = built.placed.filter((p) => isCamp(p.poi));
      expect(camps.length, `${map.id} has a camp in canon but none on the map`).toBeGreaterThan(0);
    }
  });
});

describe('nearestCamp', () => {
  const placed = [
    poi('far_camp', 'settlement', 20, 20),
    poi('near_camp', 'travel_node', 2, 0),
    poi('ruin', 'archaeological_site', 1, 0)
  ];

  it('finds the closest camp, ignoring closer things that are not camps', () => {
    expect(nearestCamp(placed, { x: 0, y: 0 })?.poi.id).toBe('near_camp');
  });

  it('returns the camp being stood on', () => {
    expect(nearestCamp(placed, { x: 2, y: 0 })?.poi.id).toBe('near_camp');
  });

  it('returns null when there is nowhere to rest', () => {
    expect(nearestCamp([poi('ruin', 'anomaly', 1, 1)], { x: 0, y: 0 })).toBeNull();
    expect(nearestCamp([], { x: 0, y: 0 })).toBeNull();
  });

  it('breaks ties on id, not on array order', () => {
    // Otherwise two equidistant camps swap between builds and the hint's wording goes with them.
    const a = [poi('b_camp', 'settlement', 1, 0), poi('a_camp', 'settlement', 0, 1)];
    expect(nearestCamp(a, { x: 0, y: 0 })?.poi.id).toBe('a_camp');
    expect(nearestCamp([...a].reverse(), { x: 0, y: 0 })?.poi.id).toBe('a_camp');
  });
});

describe('nearestUnvisited', () => {
  const placed = [poi('a', 'eco_site', 1, 0), poi('b', 'anomaly', 5, 0)];

  it('skips places whose tile has been walked over', () => {
    expect(nearestUnvisited(placed, { x: 0, y: 0 }, new Set(['1,0']))?.poi.id).toBe('b');
  });

  it('returns null once everywhere has been seen', () => {
    expect(nearestUnvisited(placed, { x: 0, y: 0 }, new Set(['1,0', '5,0']))).toBeNull();
  });

  it('reads visited from the fog, which is what gets saved', () => {
    expect(nearestUnvisited(placed, { x: 0, y: 0 }, new Set())?.poi.id).toBe('a');
  });
});

describe('whereNextHint', () => {
  const placed = [
    poi('Kavik\u2019s Tower', 'archaeological_site', 0, 6),
    poi('The Camp', 'settlement', 0, 20)
  ];

  it('names a place and a direction, not a step count', () => {
    const hint = whereNextHint(placed, { x: 0, y: 0 }, new Set());
    expect(hint).toContain('Kavik\u2019s Tower');
    expect(hint).toContain('south');
    expect(hint).not.toMatch(/\d/);
  });

  it('says a place is just there when it is close', () => {
    const hint = whereNextHint([poi('The Shrine', 'anomaly', 2, 0)], { x: 0, y: 0 }, new Set());
    expect(hint).toContain('just east of here');
  });

  it('does not tell you where the camp is while you are standing in it', () => {
    const hint = whereNextHint(placed, { x: 0, y: 20 }, new Set(['0,20']));
    expect(hint).not.toContain('for the night');
  });

  it('does not name the same place twice', () => {
    // A camp is also somewhere you have not been, so the nearest unvisited place is frequently
    // the nearest camp. Found by a test fixture that happened to arrange it that way, and it
    // read as "The Camp is just east of here. The Camp would do for the night."
    const both = [poi('The Camp', 'settlement', 2, 0)];
    const hint = whereNextHint(both, { x: 0, y: 0 }, new Set());
    expect(hint.match(/The Camp/g)).toHaveLength(1);
  });

  it('does not say a place is somewhere while you are standing on it', () => {
    // `bearingTo` answers 'here' at distance zero, so an unguarded template produced
    // "The Tide Market is just here of here." Found by printing the line for all four real maps,
    // not by a unit test -- every fixture happened to start the traveller off a place.
    const hint = whereNextHint([poi('The Tide Market', 'settlement', 0, 0)], { x: 0, y: 0 }, new Set());
    expect(hint).not.toContain('here of here');
    expect(hint).toBe('');
  });

  it('reads correctly on all four real maps', () => {
    // A guard against phrasing that only breaks with real data. Anything of the form
    // "X of here" where X is not a compass bearing is a template that has been handed 'here'.
    for (const map of fieldMaps) {
      const built = buildFieldMap(map, {});
      for (const from of [built.world.start, ...built.placed.map((p) => p.at)]) {
        const hint = whereNextHint(built.placed, from, new Set());
        expect(hint, `${map.id} from (${from.x},${from.y})`).not.toContain('here of here');
        expect(hint).not.toMatch(/undefined|null/);
      }
    }
  });

  it('says nothing at all rather than filling the line', () => {
    // Everywhere seen, and the only camp underfoot. An empty string is the honest answer; a
    // cheerful non-statement would be the map talking for the sake of talking.
    expect(whereNextHint(placed, { x: 0, y: 20 }, new Set(['0,6', '0,20']))).toBe('');
  });

  it('never nags: nothing here locks, gates or requires', () => {
    // The design is deliberately open, so this is a hint and not an instruction. No imperative.
    const hint = whereNextHint(placed, { x: 0, y: 0 }, new Set());
    expect(hint).not.toMatch(/must|should|need to|go to|you have to/i);
  });
});

describe('stepsBetween', () => {
  it('counts orthogonal steps, which is how the walk actually moves', () => {
    expect(stepsBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(stepsBetween({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });
});
