// Playing out a gesture: the beats, what a press is worth, and what you leave with.
//
// **The ruling this is built around, restated so it cannot be lost.** Gathering never gives
// nothing. `tiers.ts` says so where the odds live and `test/nodes.test.ts` fails by name if it
// is reversed, and putting a minigame in front of a material is exactly the change that would
// quietly undo it -- a failed attempt reads so naturally as an empty hand. So the floor is
// structural here rather than remembered: `settle` starts from what the tile already promised
// and can only add. A player who presses nothing gets what the old single click gave them.
//
// What varies is *how much* and *how well*, which is the same shape the good cut already had.
// The minigame is the visible version of a die the game was already rolling.
//
// **Why a state machine and not a Phaser scene.** The world is Phaser's and the panels are
// React's, and this is a panel. It is also the part most likely to be tuned, so it lives in
// `content/` as a pure reducer: `begin` then `press` then `settle`, no clock inside it. The
// caller owns the timer, which is what lets a test play a perfect run and a terrible one in the
// same millisecond.

import type { Material } from './making';
import type { Taking } from './nodes';
import type { Gesture } from './gestures';

/**
 * How many beats a gesture runs for.
 *
 * Three: long enough to have a shape, short enough that a player gathering a dozen things in a
 * session is not fighting the interface. **This is the number to change when the walk feels
 * slow**, and it is deliberately not per-material -- a rare thing is harder, not longer, because
 * length is a tax on the player and difficulty is a question for their hands.
 */
export const BEATS = 3;

/**
 * How wide the band you are aiming at is, at difficulty 0 and at difficulty 1.
 *
 * Fractions of the track. The easy end is generous on purpose: the first thing a player ever
 * gathers should teach the gesture, not test it.
 */
export const BAND_WIDE = 0.42;
export const BAND_NARROW = 0.16;

/** How many extra of a material a flawless run is worth. One. See `settle`. */
export const CLEAN_RUN_GIVES = 1;

/** A single beat's outcome. `miss` costs nothing but the beat itself. */
export type Beat = 'hit' | 'miss';

export interface Attempt {
  gesture: Gesture;
  /** Where the aiming band sits on the track this beat, as a fraction in [0, 1). */
  bands: number[];
  /** How wide that band is, same units. Constant across the run. */
  width: number;
  beats: Beat[];
}

/**
 * Deal the bands for one attempt.
 *
 * Seeded from the tile and the material rather than from `Math.random`, like everything else
 * that decides what a place does -- so a tile plays the same way twice and a test can assert a
 * particular run. The day is in the salt because the good cut already varies by day; without it
 * a stand would offer the identical puzzle every morning for ever.
 */
export function begin(
  gesture: Gesture,
  difficulty: number,
  roll: (salt: string) => number
): Attempt {
  const width = BAND_WIDE - (BAND_WIDE - BAND_NARROW) * Math.min(1, Math.max(0, difficulty));
  const bands: number[] = [];
  for (let i = 0; i < BEATS; i += 1) {
    // Kept off both edges so a band is never half off the track, which reads as a bug rather
    // than as a hard beat.
    const room = 1 - width;
    bands.push((roll(`band:${i}`) % 1000) / 1000 * room);
  }
  return { gesture, bands, width, beats: [] };
}

/**
 * Press at `position` on the track, for the beat that has not been answered yet.
 *
 * Returns a new `Attempt`; never mutates. Pressing after the last beat is a no-op rather than an
 * error, because a player mashing the key at the end of a run should not see a crash.
 */
export function press(attempt: Attempt, position: number): Attempt {
  const i = attempt.beats.length;
  if (i >= BEATS) return attempt;
  const band = attempt.bands[i]!;
  const hit = position >= band && position <= band + attempt.width;
  return { ...attempt, beats: [...attempt.beats, hit ? 'hit' : 'miss'] };
}

/** A beat that ran out of time is a miss, and the run moves on. */
export function timeout(attempt: Attempt): Attempt {
  if (attempt.beats.length >= BEATS) return attempt;
  return { ...attempt, beats: [...attempt.beats, 'miss'] };
}

/** Whether every beat has been answered. */
export function isOver(attempt: Attempt): boolean {
  return attempt.beats.length >= BEATS;
}

export type Grade = 'clean' | 'fair' | 'clumsy';

/**
 * How the run went, for the sentence the journal writes.
 *
 * `clumsy` is not a failure and must never be rendered as one -- it is the ordinary outcome the
 * game had before any of this existed. The three words are about the *hands*, not about whether
 * the player deserves the material.
 */
export function gradeOf(attempt: Attempt): Grade {
  const hits = attempt.beats.filter((b) => b === 'hit').length;
  if (hits === BEATS) return 'clean';
  if (hits > 0) return 'fair';
  return 'clumsy';
}

/**
 * What the player leaves with.
 *
 * **The floor is the whole safety property.** `promised` is what `takeableAt` already said this
 * tile gives -- the good cut included -- and this function starts there and only ever adds. Every
 * beat missed returns exactly the old behaviour, so the minigame cannot make a player worse off
 * than the click it replaced, and no amount of later tuning can turn it into a failure roll
 * without deleting the `Math.max`.
 *
 * A clean run adds one of the first material rather than one of each: the reward for a good cut
 * should be legible in a sentence ("two of reed fibre"), and scaling every line item at once is
 * how a cozy game turns into a spreadsheet.
 */
export function settle(attempt: Attempt, promised: readonly Taking[]): Taking[] {
  const kept = promised.map((t) => ({ material: t.material, count: t.count }));
  if (kept.length === 0) return kept;
  if (gradeOf(attempt) === 'clean') {
    const first = kept[0]!;
    first.count = Math.max(first.count, first.count + CLEAN_RUN_GIVES);
  }
  return kept;
}

/**
 * The line the field notes get, in the traveller's voice.
 *
 * Written per grade and gesture rather than assembled, for the reason `describeRoutine` states:
 * this game's progression *is* the writing, and a sentence stitched from fragments reads like a
 * status bar.
 */
export function attemptLine(gesture: Gesture, grade: Grade, material: Material): string {
  const what = material.name.toLowerCase();
  if (grade === 'clean') {
    switch (gesture) {
      case 'rest':
        return `You slept well, and woke before the light with the day already in order.`;
      case 'stoop':
        return `Clean work. The ${what} came away whole, and there was more of it than the stand looked to hold.`;
      case 'stalk':
        return `It never knew. You took what you came for and left the animal to its afternoon.`;
      case 'work':
        return `The stone parted where you asked it to. A good seam, and it gave.`;
    }
  }
  if (grade === 'fair') {
    switch (gesture) {
      case 'rest':
        return `You slept, near enough. The morning is here either way.`;
      case 'stoop':
        return `Passable. Some of the ${what} tore, and what is in the satchel is honest enough.`;
      case 'stalk':
        return `It lifted its head twice and settled twice. You have what you needed.`;
      case 'work':
        return `Three strikes and one of them was right. The ${what} is out.`;
    }
  }
  switch (gesture) {
    case 'rest':
      // Never a failure, exactly like the others: a bad night is still a night, and the morning
      // arrives regardless. See the ruling at the top of this file.
      return `A poor night, and you are up before you meant to be. The day starts anyway.`;
    case 'stoop':
      return `Clumsy, and the ${what} shows it. Still enough to carry.`;
    case 'stalk':
      return `You were seen early and it moved off. What it left behind is in your hands.`;
    case 'work':
      return `You worked it badly and the rock knew. The ${what} came out anyway, in pieces.`;
  }
}
