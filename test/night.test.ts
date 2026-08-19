// Night, shelter, and the kit.
//
// The load-bearing test is `has shelter within a day of anywhere a traveller can stand`. Everything
// else about the night system is mild by design; that one is the promise it rests on, and it is
// arithmetic against the real maps rather than a hope about pacing.

import { describe, expect, it } from 'vitest';
import { duskNote, isDark, lightLeft, shelterAt, spendNight } from '../src/game/night';
import { KIT, carries, useful } from '../src/content/kit';
import { DAY_MS, hoursToPhase, startPhaseFor, travelTimeMs } from '../src/game/dayNight';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { isCamp } from '../src/content/camps';
import { findPath } from '../src/world/pathfind';
import { isWalkable } from '../src/world/generate';
import { travelCost } from '../src/content/species';

describe('the day is long enough for the maps', () => {
  it('buys more steps than the furthest tile is from shelter', () => {
    // The promise: set out at dawn and you can always reach a roof or a camp. It stopped being
    // true when maps went from 36 tiles across to 48 and 64 — a day bought 23 steps of ordinary
    // walking while the furthest tile from shelter measured 72, so a traveller could be three days
    // from anywhere through no fault of their own. That is not a hard choice, it is a trap.
    const stepsPerDay = DAY_MS / travelTimeMs(1);
    expect(stepsPerDay).toBeGreaterThan(75);
  });

  it('leaves a real night, not a blink', () => {
    // A night short enough to walk through would make shelter pointless.
    const nightSteps = (DAY_MS * (9.3 / 24)) / travelTimeMs(1.3);
    expect(nightSteps).toBeGreaterThan(15);
  });
});

describe('lightLeft', () => {
  it('is full at first light and gone by dark', () => {
    expect(lightLeft(0, hoursToPhase(6))).toBeCloseTo(1, 1);
    expect(lightLeft(0, hoursToPhase(21))).toBe(0);
    expect(lightLeft(0, hoursToPhase(23))).toBe(0);
  });

  it('falls through the day rather than jumping', () => {
    const noon = lightLeft(0, hoursToPhase(12));
    const evening = lightLeft(0, hoursToPhase(19));
    expect(noon).toBeLessThan(1);
    expect(evening).toBeLessThan(noon);
    expect(evening).toBeGreaterThan(0);
  });
});

describe('isDark', () => {
  it('agrees with the sky at the hours a player can ask for', () => {
    // Through `startPhaseFor`, which is the path `?hour=` really takes. A previous version of this
    // check built its fixtures with a hand-written `hour / 24` and passed while the function under
    // test was false at every hour of the day.
    for (const h of ['21', '23', '0', '2', '4']) {
      expect(isDark(0, startPhaseFor(h), 1000), `${h}:00`).toBe(true);
    }
    for (const h of ['6', '9', '12', '16', '19']) {
      expect(isDark(0, startPhaseFor(h), 1000), `${h}:00`).toBe(false);
    }
  });
});

describe('shelterAt', () => {
  it('prefers a roof, then a camp, then the bedroll', () => {
    expect(shelterAt(true, true)).toBe('roof');
    expect(shelterAt(true, false)).toBe('roof');
    expect(shelterAt(false, true)).toBe('camp');
    expect(shelterAt(false, false)).toBe('bedroll');
  });

  it('always offers the bedroll, which is why he carries one', () => {
    // The answer to a map whose furthest corner is further than a day of ordinary walking from any
    // roof. Without it that corner would be a place you could be stranded rather than caught out.
    expect(shelterAt(false, false)).not.toBe('none');
  });
});

describe('spendNight', () => {
  it('rests you under a roof or at a camp, and not on open ground', () => {
    expect(spendNight('roof').rested).toBe(true);
    expect(spendNight('camp').rested).toBe(true);
    expect(spendNight('bedroll').rested).toBe(false);
    expect(spendNight('none').rested).toBe(false);
  });

  it('keeps the diary writing anywhere he has the lamp', () => {
    expect(spendNight('bedroll').writes).toBe(true);
    expect(spendNight('none').writes).toBe(false);
  });

  it('never threatens, because nothing bad happens', () => {
    // The worst outcome available is a wasted night. A line implying otherwise would be a lie.
    for (const s of ['roof', 'camp', 'bedroll', 'none'] as const) {
      expect(spendNight(s).entry, s).not.toMatch(/danger|hurry|must|warning|died|attack/i);
      expect(spendNight(s).entry.length, s).toBeGreaterThan(20);
    }
  });

  it('never moves the traveller, which is not modelled here on purpose', () => {
    // He wakes where he stopped. The type is the guarantee: there is nowhere for a new position to
    // be returned, so nothing downstream can teleport him while he was not looking.
    expect(Object.keys(spendNight('bedroll')).sort()).toEqual([
      'entry',
      'rested',
      'shelter',
      'writes'
    ]);
  });
});

describe('duskNote', () => {
  it('says nothing while there is light to work by', () => {
    expect(duskNote(1)).toBeNull();
    expect(duskNote(0.5)).toBeNull();
  });

  it('speaks up as the light goes, and is never an instruction', () => {
    expect(duskNote(0.2)).not.toBeNull();
    expect(duskNote(0.05)).not.toBeNull();
    expect(duskNote(0)).not.toBeNull();
    for (const l of [0.2, 0.05, 0]) {
      expect(duskNote(l)!).not.toMatch(/should|must|need to|go to|hurry/i);
    }
  });
});

describe('the kit', () => {
  it('carries a bedroll, which is the whole reason it exists', () => {
    expect(carries('bedroll')).toBe(true);
    expect(carries('lamp')).toBe(true);
  });

  it('carries nothing it was not given', () => {
    expect(carries('rope')).toBe(false);
    expect(carries('sword')).toBe(false);
  });

  it('separates the things that do something from the scenery', () => {
    const doers = useful().map((i) => i.id);
    expect(doers).toContain('bedroll');
    expect(doers).toContain('lamp');
    expect(doers).not.toContain('staff');
  });

  it('describes every piece without reading as a stat line', () => {
    // A kit, not an inventory. What is banned is the *shape* of a stat line -- a bare number with
    // a unit, or a bonus -- rather than the words themselves: the staff is "good for testing what
    // will hold your weight", which is prose, and a first version of this rejected it.
    for (const item of KIT) {
      expect(item.description.length, item.id).toBeGreaterThan(40);
      expect(item.description, item.id).not.toMatch(/[+-]\d|\d+\s*(kg|lb|slots?|uses?|hp)/i);
      expect(item.description, item.id).not.toMatch(/(durability|capacity|encumbrance)/i);
    }
  });
});

describe('every map keeps its promise', () => {
  it('has shelter within a day of anywhere a traveller can stand', () => {
    // The assertion the whole night system rests on, against canon's real maps. Shelter is a camp
    // or a place with a roof over part of it; the bedroll covers whatever this does not reach.
    const stepsPerDay = DAY_MS / travelTimeMs(1);

    for (const map of fieldMaps) {
      const built = buildFieldMap(map, {});
      const shelters = built.placed.filter(
        (p) => isCamp(p.poi) || (p.poi.subLocations ?? []).length > 0
      );
      expect(shelters.length, `${map.id} has nowhere to shelter`).toBeGreaterThan(0);

      // Sampled rather than exhaustive: every fortieth walkable tile is enough to catch a map whose
      // far corner is stranded, and an all-pairs walk of a 64x64 map is minutes rather than
      // milliseconds.
      const walkable = built.world.tiles.flat().filter(isWalkable);
      for (const tile of walkable.filter((_, i) => i % 40 === 0)) {
        const nearest = Math.min(
          ...shelters.map((s) => {
            const path = findPath(
              built.world.tiles,
              built.world.width,
              built.world.height,
              { x: tile.x, y: tile.y },
              s.at,
              isWalkable,
              (t) => travelCost(t.biome) ?? 1
            );
            return path.length || (tile.x === s.at.x && tile.y === s.at.y ? 0 : Infinity);
          })
        );
        expect(
          nearest,
          `${map.id}: (${tile.x},${tile.y}) is ${nearest} steps from shelter, more than a day`
        ).toBeLessThan(stepsPerDay * 1.5);
      }
    }
  });
});
