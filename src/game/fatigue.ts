// Getting tired, and sleeping it off.
//
// The first fail-state-adjacent system in a game whose CLAUDE.md opens with "Combat is absent by
// design", so the constraints matter more than the mechanic. Four of them, and they are
// invariants rather than intentions -- `test/fatigue.test.ts` asserts each:
//
//   1. Fatigue never makes a tile unwalkable. Canon's `check_playability.py` is a graph walk with
//      no concept of terrain or distance, so a map made impassable this way would be wrong in a
//      way canon's own checks cannot detect.
//   2. Fatigue never blocks a discovery. `canAdvance` must not learn this module exists.
//   3. A camp is always reachable -- guaranteed by `test/camps.test.ts`, which asserts every field
//      map has one.
//   4. The worst it does is slow you down and change the mood. It never stops you.
//
// Derived from the `travelled` accumulator the scene already keeps, minus a rest mark. Not a
// second clock: that argument has been had here before and settled.

import { DAY_MS, hoursToPhase, phaseAt, skyAt } from './dayNight';

/**
 * How much walking it takes to go from rested to spent, in the milliseconds `travelled` counts.
 *
 * **Measured against a real session rather than reasoned from the day length.** The obvious
 * derivation is `DAY_MS` -- one day's walking is one day's fatigue -- and it is wrong in practice.
 * `travelTimeMs` spends a day over thirty tiles of easy ground, but touring all six places on a
 * field map is 88 steps on Lothal and 185 on Narmada. Under that setting the traveller hits
 * maximum fatigue about a quarter of the way through and stays there, which is not a rhythm but a
 * flat 1.6x tax on most of the session.
 *
 * Four days of walking covers a whole map with something left, so fatigue builds across a journey
 * instead of saturating early, and camping is a thing you do once or twice rather than
 * immediately. The number is a judgement about pacing; the reasoning is what matters if it needs
 * to move again.
 */
export const DAY_OF_WALKING_MS = DAY_MS * 4;

/** The most fatigue can slow the walk. A pace, never a stop -- invariant 4. */
export const MAX_PACE = 1.6;

/** Below this, nothing is said and nothing changes. Most of a session sits here. */
const FRESH_BELOW = 0.35;

/**
 * How tired the traveller is, from 0 (rested) to 1 (spent).
 *
 * Linear, and clamped at both ends. Clamping the top is what keeps invariant 4 true no matter how
 * far someone walks: at 1 the pace is `MAX_PACE` and it stays there.
 */
export function fatigueAt(travelledMs: number, restedAtMs: number): number {
  const since = Math.max(0, travelledMs - restedAtMs);
  return Math.min(1, since / DAY_OF_WALKING_MS);
}

/**
 * The multiplier on a step's duration.
 *
 * Monotonic and bounded in [1, MAX_PACE]. The bound is the fail-state guard: a traveller at
 * maximum fatigue crossing the largest map at the worst terrain cost still arrives, and
 * `test/fatigue.test.ts` computes that worst case and asserts it is finite.
 */
export function paceFor(fatigue: number): number {
  const f = Math.min(1, Math.max(0, fatigue));
  return 1 + (MAX_PACE - 1) * f;
}

/**
 * Whether it is night, asked of the sky rather than worked out again here.
 *
 * `skyAt` already decides what hour it is and labels the wash it draws, so this reads that label.
 * The first version compared the phase against `21 / 24` and `4.5 / 24`, which is wrong twice
 * over: **phase 0 is 6 a.m., not midnight**, and duplicating the keyframe boundaries means the
 * two drift the moment either moves. It returned false at every hour of the day, and the unit
 * test missed it by constructing its fixtures with the same wrong conversion -- caught only by a
 * browser spec, where the camp button never appeared.
 */
export function isNight(travelledMs: number, startPhase: number, nowMs = 0): boolean {
  return skyAt(phaseAt(nowMs + travelledMs, startPhase)).label === 'night';
}

/**
 * Whether the traveller can bed down here.
 *
 * Both conditions, and both for the same reason: camping is meant to be the thing you do at the
 * end of a day's walk in a place with a fire, not a button that skips the dark.
 */
export function canCamp(atCamp: boolean, night: boolean): boolean {
  return atCamp && night;
}

/**
 * What resting sets the mark to, and where the clock lands.
 *
 * Sleeping advances `travelled` to the next first light -- 06:00, where the sky stops being
 * night -- so the sky agrees with having slept:
 * waking at midnight because the mechanic only moved a counter would be worse than not resting at
 * all. The new rest mark is that later time, so waking is fully rested.
 */
/**
 * Where the rest mark goes after something has taken a fraction of the tiredness away.
 *
 * **Pure, and out here rather than in the scene, because getting it backwards is invisible.**
 * `fatigueAt` measures `travelled - restedAt`, so *more* tiredness means the mark sitting further
 * behind the clock -- and both callers want to move it *forward*, which is the direction that reads
 * wrong in prose and right in arithmetic.
 *
 * It was written backwards first, inside `WorldScene` where no test could reach it. It
 * type-checked, read plausibly, and passed all 1,196 tests: adding to the mark instead of pulling
 * it back put it *ahead* of the clock, `fatigueAt` clamped the negative to zero, and every rung of
 * the shelter ladder silently restored everything. A tent, a bedroll and a whole night in town
 * would all have been the same night. That is the exact shape `docs/testing.md` is about -- the
 * rules that live outside the scene live outside it so this cannot happen.
 *
 * `fraction` is how much of the carried tiredness goes: 0 changes nothing, 1 is a full night.
 * Clamped at both ends, so a caller cannot produce a mark ahead of the clock (negative tiredness)
 * or behind where it started (tiredness invented out of nowhere).
 */
export function easedMark(travelledMs: number, restedAtMs: number, fraction: number): number {
  const carried = Math.max(0, travelledMs - restedAtMs);
  // **`Math.min`/`Math.max` do not clamp a NaN**, because every comparison with one is false -- so
  // the obvious two-sided clamp passes it straight through and the mark becomes NaN, which
  // `fatigueAt` then propagates into a pace and a tween duration. The fraction reaches here from a
  // lookup (`NIGHT_RESTORES[shelter] ?? 0`) and from an event payload React sends, so it is not a
  // value this file gets to assume. Zero is the safe direction: restore nothing rather than
  // everything. Found by a test that passed a NaN on purpose.
  const clears = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return travelledMs - carried * (1 - clears);
}

export function restUntilMorning(
  travelledMs: number,
  startPhase: number,
  nowMs = 0
): { travelledMs: number; restedAtMs: number } {
  const phase = phaseAt(nowMs + travelledMs, startPhase);
  // Six, not five. The keyframes hold the 'night' label from 21:00 all the way round to the first
  // light keyframe at 06:00 -- the 04:30 entry is the *last* night frame, not the end of it. Five
  // o'clock is therefore still night, so waking there left the camp button on screen and the
  // traveller able to sleep again immediately. Found by a browser spec, because the unit tests
  // asked `restUntilMorning` where it landed and not whether that was still dark.
  const morning = hoursToPhase(6);
  // How far round the dial to first light, always forwards.
  const ahead = ((morning - phase) % 1 + 1) % 1;
  const advanced = travelledMs + ahead * DAY_MS;
  return { travelledMs: advanced, restedAtMs: advanced };
}

/**
 * A line for the journal, or null when there is nothing worth saying.
 *
 * Silent below `FRESH_BELOW`, which is most of a session. A mood, never an instruction, and never
 * a warning -- nothing bad is going to happen, so a line that implies otherwise would be lying.
 */
export function fatigueNote(fatigue: number): string | null {
  if (fatigue < FRESH_BELOW) return null;
  if (fatigue < 0.6) return 'You have been walking a while.';
  if (fatigue < 0.85) return 'Your legs are heavy, and the light is going.';
  return 'You are worn through. Somewhere to sleep would be welcome.';
}

/** Whether the flag is on. Off is the shipped default for one release. */
export function fatigueEnabled(search: string): boolean {
  return new URLSearchParams(search).get('fatigue') === '1';
}
