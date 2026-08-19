// The day/night wash.
//
// It lives in `game/` but imports no Phaser, so it can be held to the same standard as the rest of
// the logic. The assertions are mostly about restraint: a cycle that never fully lifts, or that
// jumps, is worse than no cycle at all in a game whose whole pitch is calm.

import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  KM_PER_DAY,
  KM_PER_TILE,
  phaseAt,
  phaseFromClock,
  skyAt,
  startPhaseFor,
  travelTimeMs
} from '../src/game/dayNight';
import biomes from '../data/biomes.json';

const channels = (colour: number) => [(colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff];

/** The phase for a wall-clock hour, so the assertions below read as times of day. */
const clock = (hour: number, minute = 0) => phaseFromClock(new Date(2026, 7, 10, hour, minute, 0));

describe('travelTimeMs', () => {
  it('spends a day on thirty kilometres of walking and no less', () => {
    // The kilometres are the fixed part; how many tiles that is depends on the tile. A day is
    // eighty steps of easy going now rather than thirty, because a tile shrank when the maps grew
    // from 36 across to 48 and 64 -- see `KM_PER_TILE` for why that had to change.
    expect(travelTimeMs(1) * (KM_PER_DAY / KM_PER_TILE)).toBeCloseTo(DAY_MS, 6);
    expect(DAY_MS / travelTimeMs(1)).toBeCloseTo(80, 0);
  });

  it('charges rough ground more of the day than open ground', () => {
    expect(travelTimeMs(2)).toBe(travelTimeMs(1) * 2);
    expect(travelTimeMs(3)).toBe(travelTimeMs(1) * 3);
  });

  it('leaves a whole day in every walkable biome, so no tile can swallow one', () => {
    // A cost that crept up past three would mean a single tile costing more than a day's daylight,
    // and the sky would jump a phase on one step.
    for (const biome of biomes) {
      if (biome.travelCost === null) continue;
      expect(travelTimeMs(biome.travelCost), biome.id).toBeLessThan(DAY_MS / 2);
    }
  });

  it('crosses a field map in about a day, which is what the journal promises the player', () => {
    // `landmarkHint` says a landmark on the far side "will take most of the day". Field maps are
    // 48 and 64 tiles across; at a kilometre a tile that line had quietly become false, and the
    // tile was rescaled rather than the promise abandoned.
    for (const across of [48, 64]) {
      const day = (travelTimeMs(1) * across) / DAY_MS;
      expect(day, `${across} tiles`).toBeGreaterThan(0.5);
      expect(day, `${across} tiles`).toBeLessThan(1.2);
    }
  });
});

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

describe('startPhaseFor', () => {
  const noon = new Date(2026, 7, 10, 12, 0, 0);

  it('honours an ?hour= override so any time of day can be playtested', () => {
    expect(skyAt(startPhaseFor('6', noon)).label).toBe('first light');
    expect(skyAt(startPhaseFor('19', noon)).label).toBe('evening');
    expect(skyAt(startPhaseFor('22', noon)).label).toBe('night');
  });

  it('accepts a fractional hour', () => {
    expect(startPhaseFor('19.5', noon)).toBeCloseTo(startPhaseFor('19', noon) + 0.5 / 24, 6);
  });

  // A typo in the URL must never strand the map at midnight.
  it.each([null, '', '  ', 'nine', '24', '-1', 'NaN', 'Infinity'])(
    'falls back to the real clock for %p',
    (bad) => {
      expect(startPhaseFor(bad, noon)).toBe(phaseFromClock(noon));
    }
  );
});
