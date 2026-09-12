// The hour, as the dial reads it.
//
// **The assertion that matters is that the mark moves**, and it is the one that would have caught
// this codebase's signature bug in its interface form: an icon that renders, looks right in a
// screenshot, and says the same thing at six in the morning as at ten at night. Every case below
// that names a specific position exists to pin the geometry so that one is meaningful.

import { describe, expect, it } from 'vitest';
import { dialAt, markAt } from '../src/ui/dial';
import { hoursToPhase } from '../src/game/dayNight';

/** The dial at a clock hour, which is how a person thinks about it. */
const at = (hour: number) => dialAt(hoursToPhase(hour));

describe('where the day is', () => {
  it('puts noon at the top and midnight at the bottom', () => {
    const noon = markAt(at(12).turn);
    expect(noon.x).toBeCloseTo(0, 5);
    expect(noon.y).toBeCloseTo(-1, 5);

    const midnight = markAt(at(0).turn);
    expect(midnight.x).toBeCloseTo(0, 5);
    expect(midnight.y).toBeCloseTo(1, 5);
  });

  it('puts first light on the left and evening on the right', () => {
    // The sun comes up in the east and goes down in the west, and the dial is a picture of that
    // rather than a gauge that happens to fill up.
    expect(markAt(at(6).turn).x).toBeCloseTo(-1, 5);
    expect(markAt(at(18).turn).x).toBeCloseTo(1, 5);
  });

  it('climbs through the morning and falls through the afternoon', () => {
    // `y` grows downward, so higher in the sky is a smaller y.
    expect(markAt(at(9).turn).y).toBeLessThan(markAt(at(7).turn).y);
    expect(markAt(at(15).turn).y).toBeGreaterThan(markAt(at(13).turn).y);
  });
});

describe('sun or moon', () => {
  it('is the sun through the day and the moon through the night', () => {
    expect(at(9).body).toBe('sun');
    expect(at(12).body).toBe('sun');
    expect(at(17).body).toBe('sun');
    expect(at(23).body).toBe('moon');
    expect(at(3).body).toBe('moon');
  });

  it('agrees with the wash over the map about which it is', () => {
    // Read from `skyAt`'s own label rather than from a pair of thresholds here, so the dial and the
    // colour on the map cannot disagree about whether it is night -- which they would the first
    // time somebody moved a keyframe.
    expect(at(23).label).toBe('night');
    expect(at(12).label).toBe('noon');
  });
});

describe('the whole cycle', () => {
  it('never says the same thing at two different hours of the day', () => {
    // **The case that would catch an icon wired to nothing.** A mark that renders and never moves
    // passes every other test here by accident.
    const seen = new Set<string>();
    for (let hour = 0; hour < 24; hour += 1) {
      const { x, y } = markAt(at(hour).turn);
      seen.add(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    expect(seen.size, 'the mark does not move through the day').toBe(24);
  });

  it('names the hours in the engine\'s vocabulary, which has a midday canon lacks', () => {
    // Canon has no midday: its vocabulary jumps morning to afternoon, which is why the dial reads
    // the engine's sky rather than the `WorldMoment` handed to `journey.ts`.
    const names = new Set<string>();
    for (let hour = 0; hour < 24; hour += 1) names.add(at(hour).label);
    expect(names.has('noon')).toBe(true);
    expect(names.size).toBeGreaterThanOrEqual(5);
  });

  it('wraps rather than running off either end', () => {
    // The scene counts time up from the start of the journey and hands over whatever that is. Both
    // wraps are real: midnight, and the roll back round to first light.
    expect(dialAt(1).turn).toBeCloseTo(dialAt(0).turn, 5);
    expect(dialAt(-0.25).turn).toBeCloseTo(0.75, 5);
    expect(dialAt(2.5).turn).toBeCloseTo(0.5, 5);
  });
});
