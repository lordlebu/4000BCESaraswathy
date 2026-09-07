// What your hands do to *make* a thing, as distinct from what you are making.
//
// **Keyed to the process, never to the recipe, and that is the whole design.** Canon holds 17
// processes and every one of its 82 recipes names one, so 17 gestures cover the set and each new
// recipe inherits one for free. Keying on recipes instead would mean 82 minigames, which is a
// thing nobody finishes, and the count only goes up.
//
// It also matters for where this is going. The setting is solarpunk: the tree starts at knapped
// flint and reaches engine parts and solar panels. **Casting a bronze pin and casting a machine
// part are the same gesture at different scales** -- pour, wait, break the mould -- and smelting
// copper and refining silicon are the same gesture at a different heat. The gesture library stays
// small because the *physics* is small; it is the materials that multiply. A late recipe arrives
// carrying an existing process, or it brings a genuinely new one and that is one new gesture,
// authored once, rather than a special case bolted onto a recipe.
//
// Measured across canon today: carving 23, cooking 12, weaving 8, firing 8, grinding 6, drying 5,
// casting 4, pressing 4, spinning 3, and seven more with one or two each. The top five cover 57 of
// 82, which is why the families below are shaped the way they are rather than evenly.
//
// Pure. No React, no Phaser, no clock.

import type { Gesture } from './gestures';

/**
 * The three shapes a making gesture can take, reusing the vocabulary the ground already taught.
 *
 * **Deliberately not a fourth set of verbs.** A player has already learned that `stoop` is patient
 * and rhythmic, `work` is force against resistance, and `stalk` is timing against something that
 * moves. Making does not need new physics -- it needs the same hands applied to a bench -- so
 * these map onto the gestures that exist, and the modal a player meets on their first reed is the
 * modal they meet at a kiln.
 *
 * `stalk` is the interesting reuse: firing, cooking, brewing and drying are all *waiting for the
 * right moment* rather than pushing harder, which is exactly what stalking is. Pulling a pot too
 * early and rushing an animal are the same mistake.
 */
export const PROCESS_GESTURE: Record<string, Gesture> = {
  // Force against resistance: the thing gives or it does not.
  process_knapping: 'work',
  process_smelting: 'work',
  process_grinding: 'work',
  process_casting: 'work',
  process_pressing: 'work',

  // Patience and rhythm: many small identical motions, and the rhythm is the skill.
  process_carving: 'stoop',
  process_weaving: 'stoop',
  process_spinning: 'stoop',
  process_retting: 'stoop',
  process_tanning: 'stoop',
  process_boatbuilding: 'stoop',
  process_purifying: 'stoop',

  /**
   * **Picking a thing up, which is not a bench job at all.**
   *
   * Canon names it a process for a reason it states itself: "every recipe chain has to start
   * somewhere, and a layer whose raw materials arrive by magic cannot be checked for
   * reachability". No recipe uses it -- it is the bottom of the chain, and the tile layer already
   * *is* this gesture.
   *
   * Mapped anyway rather than excepted, because the coverage test asks canon for the list and an
   * exception here would be a second place to remember. `stoop` is not a guess: it is literally
   * what `gestureFor` returns for a plant.
   */
  process_gathering: 'stoop',

  // Timing against something that is changing on its own, and will not wait.
  process_firing: 'stalk',
  process_cooking: 'stalk',
  process_brewing: 'stalk',
  process_drying: 'stalk'
};

/**
 * The gesture for a process, falling back to the patient one.
 *
 * **A new process gets a gesture rather than an error.** Canon may author one before anybody maps
 * it here, and a recipe that cannot be made because its process is unknown would be a canon change
 * silently breaking the game -- the exact coupling the two repositories exist to avoid. `stoop` is
 * the right default because it is the gentlest: it asks for patience and punishes nothing.
 */
export function gestureForProcess(processId: string): Gesture {
  return PROCESS_GESTURE[processId] ?? 'stoop';
}

/**
 * What the button says for a making activity.
 *
 * Named for the process rather than for the gesture, because a player at a bench is thinking "I am
 * firing this pot", not "I am performing a timing gesture". The gesture is how it plays; this is
 * what it *is*.
 */
export const PROCESS_VERB: Record<string, string> = {
  process_knapping: 'Knap it',
  process_smelting: 'Smelt it',
  process_grinding: 'Grind it',
  process_casting: 'Cast it',
  process_pressing: 'Press it',
  process_carving: 'Carve it',
  process_weaving: 'Weave it',
  process_spinning: 'Spin it',
  process_retting: 'Ret it',
  process_tanning: 'Tan it',
  process_boatbuilding: 'Build it',
  process_purifying: 'Purify it',
  process_firing: 'Fire it',
  process_cooking: 'Cook it',
  process_brewing: 'Brew it',
  process_drying: 'Dry it',
  process_gathering: 'Gather it'
};

/** What the button says, or a plain word when canon has authored a process nobody has named. */
export function verbForProcess(processId: string): string {
  return PROCESS_VERB[processId] ?? 'Make it';
}
