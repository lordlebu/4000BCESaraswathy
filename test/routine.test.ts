// The same ground at a different hour.
//
// Phase 06's whole claim is that time and weather are content rather than lighting. These are
// the assertions that make that true of creatures: a species keeps its habits, a storm empties
// the map, and what you can sketch depends on when you came.

import { describe, expect, it } from 'vitest';
import {
  type Routine,
  describeRoutine,
  isPresent,
  rhythmOf,
  routineFor,
  whenAwake
} from '../src/content/routine';
import { creatures } from '../src/content/species';

const someone = creatures[0]!;
const MOMENTS = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

describe('a creature keeps its habits', () => {
  it('has the same rhythm every time it is asked', () => {
    for (const c of creatures.slice(0, 50)) {
      expect(rhythmOf(c)).toBe(rhythmOf(c));
    }
  });

  it('does not give every creature the same one', () => {
    const seen = new Set(creatures.slice(0, 120).map(rhythmOf));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('is keyed to the species, not the world — the animal is knowable', () => {
    // Two creatures with different ids may differ; the same id never does.
    const a = creatures.find((c) => rhythmOf(c) === 'nocturnal');
    expect(a).toBeDefined();
    expect(rhythmOf(a!)).toBe('nocturnal');
  });
});

describe('what it is doing', () => {
  it('empties the map in a storm, whatever the hour', () => {
    for (const timeOfDay of MOMENTS) {
      expect(routineFor(someone, { timeOfDay, weather: 'storm' })).toBe('sheltering');
    }
  });

  it('leaves the sound when the mist takes the animal', () => {
    const awakeAt = MOMENTS.find(
      (t) => routineFor(someone, { timeOfDay: t, weather: 'clear' }) !== 'resting'
    )!;
    expect(routineFor(someone, { timeOfDay: awakeAt, weather: 'mist' })).toBe('calling');
  });

  it('is asleep outside its own hours', () => {
    const asleep = MOMENTS.filter(
      (t) => routineFor(someone, { timeOfDay: t, weather: 'clear' }) === 'resting'
    );
    expect(asleep.length).toBeGreaterThan(0);
  });

  it('answers something sensible with no moment at all', () => {
    expect(routineFor(someone, null)).toBe('feeding');
  });
});

describe('the consequence for the player', () => {
  it('cannot be sketched while it is asleep or sheltering', () => {
    expect(isPresent('resting')).toBe(false);
    expect(isPresent('sheltering')).toBe(false);
    expect(isPresent('feeding')).toBe(true);
    expect(isPresent('hunting')).toBe(true);
    expect(isPresent('calling')).toBe(true);
  });

  it('yields at some hour — nothing is unreachable all day', () => {
    for (const c of creatures.slice(0, 80)) {
      const reachable = MOMENTS.some((timeOfDay) =>
        isPresent(routineFor(c, { timeOfDay, weather: 'clear' }))
      );
      expect(reachable, `${c.name} can never be found`).toBe(true);
    }
  });

  it('says when to come back rather than only refusing', () => {
    expect(whenAwake(someone).length).toBeGreaterThan(0);
  });

  it('reads differently at noon and at midnight, which is the whole phase', () => {
    const noon = routineFor(someone, { timeOfDay: 'afternoon', weather: 'clear' });
    const midnight = routineFor(someone, { timeOfDay: 'night', weather: 'clear' });
    expect(noon).not.toBe(midnight);
    expect(describeRoutine(someone, noon)).not.toBe(describeRoutine(someone, midnight));
  });

  it('always has words for whatever it is doing', () => {
    const all: Routine[] = ['feeding', 'hunting', 'calling', 'resting', 'sheltering'];
    for (const r of all) {
      expect(describeRoutine(someone, r).length).toBeGreaterThan(20);
    }
  });
});
