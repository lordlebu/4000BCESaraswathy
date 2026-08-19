// Fatigue, and the four invariants that keep it from becoming a fail state.
//
// `paceFor` being bounded and monotonic is the important one and is pinned hard. A game whose
// first design line is "combat is absent by design" cannot grow a way to lose by accident.

import { describe, expect, it } from 'vitest';
import {
  DAY_OF_WALKING_MS,
  MAX_PACE,
  canCamp,
  fatigueAt,
  fatigueEnabled,
  fatigueNote,
  isNight,
  paceFor,
  restUntilMorning
} from '../src/game/fatigue';
import {
  DAY_MS,
  hoursToPhase,
  phaseAt,
  startPhaseFor,
  travelTimeMs
} from '../src/game/dayNight';

describe('fatigueAt', () => {
  it('is zero when freshly rested and one after a full day of walking', () => {
    expect(fatigueAt(0, 0)).toBe(0);
    expect(fatigueAt(DAY_OF_WALKING_MS, 0)).toBe(1);
    expect(fatigueAt(DAY_OF_WALKING_MS / 2, 0)).toBeCloseTo(0.5);
  });

  it('clamps at one however far the traveller walks', () => {
    // Invariant 4 begins here: there is no state worse than spent.
    expect(fatigueAt(DAY_OF_WALKING_MS * 10, 0)).toBe(1);
    expect(fatigueAt(Number.MAX_SAFE_INTEGER, 0)).toBe(1);
  });

  it('measures from the rest mark, not from the start of the journey', () => {
    expect(fatigueAt(DAY_OF_WALKING_MS * 3, DAY_OF_WALKING_MS * 3)).toBe(0);
    expect(fatigueAt(DAY_OF_WALKING_MS * 3.5, DAY_OF_WALKING_MS * 3)).toBeCloseTo(0.5);
  });

  it('never goes negative, even if the mark is somehow ahead of the clock', () => {
    expect(fatigueAt(0, DAY_OF_WALKING_MS)).toBe(0);
  });
});

describe('paceFor is the fail-state guard', () => {
  it('is bounded in [1, MAX_PACE] across the whole range and beyond it', () => {
    for (const f of [-5, -0.1, 0, 0.25, 0.5, 0.75, 1, 1.1, 99]) {
      const pace = paceFor(f);
      expect(pace, `pace at ${f}`).toBeGreaterThanOrEqual(1);
      expect(pace, `pace at ${f}`).toBeLessThanOrEqual(MAX_PACE);
    }
  });

  it('is monotonic: more tired is never faster', () => {
    let previous = 0;
    for (let f = 0; f <= 1; f += 0.05) {
      const pace = paceFor(f);
      expect(pace).toBeGreaterThanOrEqual(previous);
      previous = pace;
    }
  });

  it('never stops the traveller', () => {
    // A pace, not a wall. Invariant 4 in one line.
    expect(paceFor(1)).toBeLessThan(Infinity);
    expect(paceFor(1)).toBe(MAX_PACE);
  });

  it('leaves the largest map crossable in bounded time at the worst of everything', () => {
    // The compounding check. 64x64 is the largest field map, so 126 steps corner to corner;
    // mountains are the dearest ground at travelCost 3; MAX_PACE is the heaviest fatigue.
    //
    // Computed rather than asserted against a number typed by hand, so it stays true if the day
    // length or the pace ceiling moves.
    const steps = 63 + 63;
    const worstStepMs = travelTimeMs(3) * MAX_PACE;
    const worstCrossingMs = steps * worstStepMs;
    const inDays = worstCrossingMs / DAY_MS;

    expect(Number.isFinite(worstCrossingMs)).toBe(true);
    // Roughly twenty days of in-game time at the very worst, which is a long walk and not a trap.
    expect(inDays).toBeLessThan(25);
    expect(inDays).toBeGreaterThan(0);
  });
});

describe('the curve is tuned against a real session, not a round number', () => {
  // Measured, not assumed. Touring all six places is 88 steps on Lothal at average cost 1.5 and
  // 185 on Narmada at 2.0. The first setting tried was `DAY_OF_WALKING_MS = DAY_MS`, the obvious
  // derivation, and it saturated a quarter of the way into Lothal -- a flat 1.6x tax on most of
  // the session rather than an arc. These pin the shape so retuning is a deliberate act.

  const after = (steps: number, cost: number) => fatigueAt(steps * travelTimeMs(cost), 0);

  it('leaves the traveller fresh early in a walk', () => {
    expect(after(22, 1.5)).toBeLessThan(0.35); // a quarter of Lothal: no note, no slowdown
  });

  it('has the traveller tiring by the end of a small map', () => {
    const end = after(88, 1.5);
    expect(end).toBeGreaterThan(0.9);
    expect(end).toBeLessThanOrEqual(1);
  });

  it('does not saturate before a small map is half walked', () => {
    // The failure the first setting had. Half of Lothal must still leave somewhere to go.
    expect(after(44, 1.5)).toBeLessThan(1);
  });
});

describe('camping', () => {
  it('needs both a camp and the dark', () => {
    expect(canCamp(true, true)).toBe(true);
    expect(canCamp(true, false)).toBe(false);
    expect(canCamp(false, true)).toBe(false);
    expect(canCamp(false, false)).toBe(false);
  });

  it('wakes the traveller in the morning, not merely at a reset counter', () => {
    // Sleeping has to move the sky too. Waking at midnight because the mechanic only touched a
    // number would read as broken.
    //
    // Hours go through `hoursToPhase`, never `hour / 24`. Phase 0 is 6 a.m., and writing the
    // conversion out by hand here is what hid a broken `isNight` from this file entirely.
    const at22 = hoursToPhase(22);
    const { travelledMs, restedAtMs } = restUntilMorning(0, at22);
    const phase = phaseAt(travelledMs, at22);
    expect(phase).toBeCloseTo(hoursToPhase(6), 3);
    expect(restedAtMs).toBe(travelledMs);
    expect(fatigueAt(travelledMs, restedAtMs)).toBe(0);
  });

  it('wakes into daylight, which is the point of waking', () => {
    // The assertion this file was missing. It checked *where* sleeping landed and never whether
    // that was still dark -- and it was: the keyframes hold 'night' from 21:00 round to the first
    // light frame at 06:00, so waking at five left the camp button on screen and let the
    // traveller sleep again on the spot. Caught by a browser spec instead of here.
    for (const hour of [21, 22, 23, 0, 2, 4]) {
      const start = hoursToPhase(hour);
      const { travelledMs } = restUntilMorning(0, start);
      expect(isNight(travelledMs, start), `slept at ${hour}:00 and it is still night`).toBe(false);
    }
  });

  it('always moves the clock forwards', () => {
    for (const startPhase of [0, 0.2, hoursToPhase(21), hoursToPhase(23.9), hoursToPhase(4)]) {
      const before = DAY_MS * 2;
      const { travelledMs } = restUntilMorning(before, startPhase);
      expect(travelledMs, `from phase ${startPhase}`).toBeGreaterThanOrEqual(before);
      expect(travelledMs - before).toBeLessThanOrEqual(DAY_MS);
    }
  });
});

describe('isNight', () => {
  it('is right for the hours a player can actually ask for', () => {
    // Through `startPhaseFor`, which is the path `?hour=` really takes. The unit test below uses
    // `hoursToPhase` directly and still passed while `isNight` was false at every hour of the
    // day, because it repeated the same wrong conversion the implementation had. Going through
    // the real entry point is what makes this test independent of the bug it guards.
    const at = (hour: string) => isNight(0, startPhaseFor(hour), 1000);
    for (const hour of ['21', '22', '23', '0', '2', '4']) {
      expect(at(hour), `${hour}:00 should be night`).toBe(true);
    }
    for (const hour of ['6', '9', '12', '16', '19']) {
      expect(at(hour), `${hour}:00 should not be night`).toBe(false);
    }
  });

  it('agrees with the sky: dark from 21:00 to 04:30', () => {
    const at = (hour: number) => isNight(0, hoursToPhase(hour));
    expect(at(22)).toBe(true);
    expect(at(2)).toBe(true);
    expect(at(4)).toBe(true);
    expect(at(12)).toBe(false);
    expect(at(19)).toBe(false);
    expect(at(6)).toBe(false);
  });
});

describe('fatigueNote', () => {
  it('says nothing for most of a session', () => {
    expect(fatigueNote(0)).toBeNull();
    expect(fatigueNote(0.2)).toBeNull();
  });

  it('speaks up as the day wears on', () => {
    expect(fatigueNote(0.5)).not.toBeNull();
    expect(fatigueNote(1)).not.toBeNull();
  });

  it('never warns, threatens or instructs', () => {
    // Nothing bad is going to happen, so a line implying otherwise would be a lie. This is a
    // mood, in the traveller's voice, and it is the only thing fatigue says out loud.
    for (const f of [0.4, 0.5, 0.7, 0.9, 1]) {
      const note = fatigueNote(f) ?? '';
      expect(note, `at ${f}`).not.toMatch(/must|should|need to|danger|warning|will die|hurry/i);
    }
  });
});

describe('the flag', () => {
  it('is off unless asked for, which is how this ships', () => {
    expect(fatigueEnabled('')).toBe(false);
    expect(fatigueEnabled('?seed=lothal')).toBe(false);
    expect(fatigueEnabled('?fatigue=0')).toBe(false);
    expect(fatigueEnabled('?fatigue=yes')).toBe(false);
    expect(fatigueEnabled('?fatigue=1')).toBe(true);
    expect(fatigueEnabled('?seed=lothal&fatigue=1')).toBe(true);
  });
});
