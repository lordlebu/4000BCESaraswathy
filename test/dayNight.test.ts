// The day/night wash.
//
// It lives in `game/` but imports no Phaser, so it can be held to the same standard as the rest of
// the logic. The assertions are mostly about restraint: a cycle that never fully lifts, or that
// jumps, is worse than no cycle at all in a game whose whole pitch is calm.

import { describe, expect, it } from 'vitest';
import { DAY_MS, phaseAt, phaseFromClock, skyAt } from '../src/game/dayNight';

const channels = (colour: number) => [(colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff];

/** The phase for a wall-clock hour, so the assertions below read as times of day. */
const clock = (hour: number, minute = 0) => phaseFromClock(new Date(2026, 7, 10, hour, minute, 0));

describe('phaseAt', () => {
  it('runs from 0 to 1 across a day and wraps', () => {
    expect(phaseAt(0)).toBe(0);
    expect(phaseAt(DAY_MS / 2)).toBeCloseTo(0.5, 6);
    expect(phaseAt(DAY_MS)).toBe(0);
    expect(phaseAt(DAY_MS * 3.25)).toBeCloseTo(0.25, 6);
  });

  it('handles a negative clock without going out of range', () => {
    expect(phaseAt(-DAY_MS / 4)).toBeCloseTo(0.75, 6);
  });

  it('starts wherever the journey is told to start, and advances from there', () => {
    expect(phaseAt(0, 0.5)).toBeCloseTo(0.5, 6);
    expect(phaseAt(DAY_MS / 4, 0.5)).toBeCloseTo(0.75, 6);
    // And wraps past the end of the day rather than running off it.
    expect(phaseAt(DAY_MS / 2, 0.75)).toBeCloseTo(0.25, 6);
  });
});

describe('phaseFromClock', () => {
  it('always lands inside the day', () => {
    for (let h = 0; h < 24; h += 1) {
      const p = clock(h);
      expect(p, `${h}:00`).toBeGreaterThanOrEqual(0);
      expect(p, `${h}:00`).toBeLessThan(1);
    }
  });

  // The whole point: the map should look like the hour the player is actually in.
  it('opens on light that matches the wall clock', () => {
    expect(skyAt(clock(6)).label, 'six in the morning').toBe('first light');
    expect(skyAt(clock(12)).label, 'midday').toBe('noon');
    expect(skyAt(clock(21, 30)).label, 'half nine at night').toBe('night');
  });

  it('moves forward through the day as the clock does', () => {
    expect(clock(6)).toBeLessThan(clock(12));
    expect(clock(12)).toBeLessThan(clock(20));
  });
});

describe('skyAt', () => {
  it('is a valid colour and a sane alpha at every point in the day', () => {
    for (let i = 0; i <= 200; i += 1) {
      const sky = skyAt(i / 200);
      expect(sky.alpha, `phase ${i / 200}`).toBeGreaterThanOrEqual(0);
      expect(sky.alpha, `phase ${i / 200}`).toBeLessThanOrEqual(0.6);
      expect(sky.colour).toBeGreaterThanOrEqual(0);
      expect(sky.colour).toBeLessThanOrEqual(0xffffff);
      for (const c of channels(sky.colour)) {
        expect(c, `phase ${i / 200} colour ${sky.colour.toString(16)}`).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(255);
      }
      expect(sky.label).toBeTruthy();
    }
  });

  // A wash that never lifts reads as a broken colour profile rather than as daylight.
  it('passes through a completely clear noon', () => {
    // Interpolation lands on 1.4e-17 rather than a literal zero; nothing can see the difference.
    expect(skyAt(clock(12)).alpha).toBeCloseTo(0, 10);
  });

  it('is darkest at night and warm in the evening', () => {
    expect(skyAt(clock(22)).alpha).toBeGreaterThan(skyAt(clock(12)).alpha);
    expect(skyAt(clock(22)).label).toBe('night');
    expect(skyAt(clock(19)).label).toBe('evening');
    // Evening leans red; night leans blue.
    const [er, , eb] = channels(skyAt(clock(19)).colour);
    const [nr, , nb] = channels(skyAt(clock(22)).colour);
    expect(er).toBeGreaterThan(eb!);
    expect(nb).toBeGreaterThan(nr!);
  });

  it('never jumps — the wash changes gradually, including across midnight', () => {
    let previous = skyAt(0);
    for (let i = 1; i <= 400; i += 1) {
      const sky = skyAt(i / 400);
      expect(Math.abs(sky.alpha - previous.alpha), `jump at phase ${i / 400}`).toBeLessThan(0.05);
      const [pr, pg, pb] = channels(previous.colour);
      const [r, g, b] = channels(sky.colour);
      const step = Math.max(Math.abs(r! - pr!), Math.abs(g! - pg!), Math.abs(b! - pb!));
      expect(step, `colour jump at phase ${i / 400}`).toBeLessThan(24);
      previous = sky;
    }
  });

  it('wraps seamlessly: the end of the day is the beginning of the next', () => {
    expect(skyAt(1).colour).toBe(skyAt(0).colour);
    expect(skyAt(1).alpha).toBeCloseTo(skyAt(0).alpha, 6);
    // The last moments before six should already be all but first light, not a hard cut to it.
    const [r, g, b] = channels(skyAt(0.999).colour);
    const [dr, dg, db] = channels(skyAt(0).colour);
    expect(Math.max(Math.abs(r! - dr!), Math.abs(g! - dg!), Math.abs(b! - db!))).toBeLessThan(12);
  });

  // The reason DAY_MS is an hour rather than the eight minutes it started as. At eight minutes a
  // single session ran through all six phases, which is a strobe, not a sunset.
  it('a short session sees one gentle shift, not a strobe', () => {
    // Ten minutes of walking, sampled every thirty seconds.
    const walk = Array.from({ length: 20 }, (_, i) => skyAt(phaseAt(i * 30_000)));
    const labels = new Set(walk.map((s) => s.label));
    expect(labels.size, `saw ${[...labels].join(', ')}`).toBeLessThanOrEqual(3);
  });
});
