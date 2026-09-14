// How an act goes, and what decides it.
//
// **The ruling this is built around, restated so it cannot be lost.** Gathering never gives
// nothing. `tiers.ts` says so where the odds live and `test/nodes.test.ts` fails by name if it is
// reversed, and putting a test of any kind in front of a material is exactly the change that
// would quietly undo it -- a poor attempt reads so naturally as an empty hand. So the floor is
// structural rather than remembered: `settle` starts from what the tile already promised and can
// only add.
//
// What varies is *how much* and *how well*.
//
// **What decides it is preparation, not reflexes, and that is this module's whole rewrite.** The
// grade used to come from three beats of a timing track: a marker swept a bar for four and a half
// seconds and the player pressed inside a band, per material, per craft, per night. Measured
// against the genre that is the wrong instrument twice over.
//
//   * It is a *tax on the loop*. A walk across Lothal takes from forty-odd tiles; at three beats
//     apiece that is three minutes of rhythm-pressing to fill a satchel. Animal Crossing's DIY
//     bench is one press and a skippable animation, Stardew's crafting menu is one click, and no
//     cozy game gates routine gathering on timing. The one famous exception -- Stardew's fishing
//     -- is also the single most complained-about system in that game.
//   * It rewarded the wrong thing. This is a game about **looking**, whose entire progression is a
//     written diary. A reflex test is the one skill the rest of it never asks for, and `nodes.ts`
//     had already said so in as many words: a skill surface "this game does not have and would
//     have to build on purpose".
//
// So the grade is read off decisions the player made *before* they pressed anything: what they
// chose to carry, and whether they picked their moment. Both are already modelled -- canon's
// affordances say what a tool lets you do, `routine.ts` says what an animal is busy with, and
// `fatigue.ts` says whether the hands are steady. Nothing new had to be invented to replace the
// track; it only had to be asked.
//
// That is also the cozy-genre convention rather than a local preference. Stardew rewards the
// upgraded axe, not the faster click; Spiritfarer rewards having built the kitchen; Animal
// Crossing rewards the golden net. **Preparation is a decision a player can make well while
// relaxed**, which is the whole of what the register asks for.
//
// Pure: no React, no Phaser, no clock. The caller owns the pixels, and -- unlike the version with
// a timer in it -- there is now nothing here a test has to simulate time to reach.

import type { Affordance, Material } from './making';
import type { Taking } from './nodes';
import type { Gesture } from './gestures';

/**
 * How an act went, for the sentence the journal writes.
 *
 * `clumsy` is not a failure and must never be rendered as one -- it is the ordinary outcome the
 * game had before any of this existed. The three words are about the *hands*, not about whether
 * the player deserves the material.
 */
export type Grade = 'clean' | 'fair' | 'clumsy';

/**
 * What the player brought to this act.
 *
 * Two booleans and the thing they are about, which is deliberately the smallest shape that can
 * carry a reason. A single "readiness" number would grade the same and say nothing, and the
 * *saying* is the point: a player who is told "nothing in the satchel cuts" has been handed the
 * next thing to make.
 */
export interface Preparation {
  /**
   * What this act asks to have in hand, or null when it asks for nothing.
   *
   * An affordance, never a named tool -- the same rule canon's processes follow. A stoop wants
   * something that `cut`s, and a flint knife, a bronze knife and a glass lancet all answer.
   */
  wants: Affordance | null;
  /** Whether something carried does it. */
  equipped: boolean;
  /**
   * Whether the moment is with you.
   *
   * What that means is the gesture's business and lives in `gestures.momentFavours`: an unhurried
   * animal for a stalk, a slack tide for a cast, steady hands for a stoop, the right bench for a
   * making. Passed in as an answer rather than recomputed, because the caller is the only thing
   * that holds the hour, the routine and the ground at once.
   */
  favourable: boolean;
}

/**
 * How it went.
 *
 * **Both halves, one half, or neither** -- which is the whole rule, and it is stated as a table
 * rather than as nested conditionals because a player has to be able to hold it in their head.
 * An act that asks for no tool is graded on its moment alone, which is the rest: a night is never
 * clumsy for want of something to hold.
 */
export function gradeOf({ wants, equipped, favourable }: Preparation): Grade {
  if (wants === null) return favourable ? 'clean' : 'fair';
  if (equipped && favourable) return 'clean';
  if (equipped || favourable) return 'fair';
  return 'clumsy';
}

/** How many extra of a material a clean act is worth. One. See `settle`. */
export const CLEAN_RUN_GIVES = 1;

/**
 * What the player leaves with.
 *
 * **The floor is the whole safety property.** `promised` is what `takeableAt` already said this
 * tile gives -- the good cut included -- and this function starts there and only ever adds. A
 * clumsy act returns exactly the old behaviour, so no amount of later tuning can turn preparation
 * into a gate without deleting the `Math.max`.
 *
 * A clean act adds one of the first material rather than one of each: the reward should be
 * legible in a sentence ("two of reed fibre"), and scaling every line item at once is how a cozy
 * game turns into a spreadsheet.
 */
export function settle(grade: Grade, promised: readonly Taking[]): Taking[] {
  const kept = promised.map((t) => ({ material: t.material, count: t.count }));
  if (kept.length === 0) return kept;
  if (grade === 'clean') {
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
 *
 * **`material` is nullable because a rest has none, and that was a mechanic nobody could see.**
 * The `rest` sentences never name a material -- a night is not about a thing -- and the caller had
 * no material to pass, so it skipped this function entirely and settled on an empty line. Every
 * rest line here was unreachable prose. Only `rest` may pass null: the other gestures always come
 * from a tile that promised something, and each of them names it.
 */
export function attemptLine(gesture: Gesture, grade: Grade, material: Material | null): string {
  const what = material?.name.toLowerCase() ?? 'it';
  if (grade === 'clean') {
    switch (gesture) {
      case 'rest':
        return `You slept well, and woke before the light with the day already in order.`;
      case 'stoop':
        return `Clean work. The ${what} came away whole, and there was more of it than the stand looked to hold.`;
      case 'stalk':
        return `It never knew. You took what you came for and left the animal to its afternoon.`;
      case 'fish':
        return `The water was with you. The ${what} came up on the first cast, and there was more of it than you expected.`;
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
      case 'fish':
        return `You waited longer than you meant to. The ${what} is in the satchel and the light has moved.`;
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
    case 'fish':
      return `Half the morning for this. The ${what} is yours and you have wet feet to show for it.`;
    case 'work':
      return `You worked it badly and the rock knew. The ${what} came out anyway, in pieces.`;
  }
}
