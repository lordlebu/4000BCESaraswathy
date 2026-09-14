// What your hands do to get a thing, as distinct from what the thing is.
//
// **The gap this closes.** Taking bladder oil off a beedu manta and picking rice off a stalk were
// the same click on the same row, so a player who went looking for hunting could not find it --
// not because it was missing, but because `gathering.ts` already asks `creatureFor` and hands the
// animal's material over with no more ceremony than a reed. Everything the resource layer built
// -- depletion, regrowth, good cuts, discovery -- resolved *behind* one button.
//
// This module says which of three gestures a material asks for. The modal that plays it is
// presentation; the odds it changes belong to `tiers.ts`; and what a place holds is still
// `nodes.ts`. This only answers "what are you doing with your hands".
//
// **Derived rather than authored, on purpose.** Canon could carry a `taken_by` field and one day
// should -- but it does not today, and the split falls out cleanly from fields canon already has:
// `wonFrom` names a species or does not, and the species is a plant or an animal. That is the
// whole rule. Deriving first means the game does not wait on a canon release, and it means the
// day somebody does author `taken_by` they will know from the exceptions here what the field
// actually needs to say. `routine.ts` derives a species' rhythm the same way and for the same
// stated reason.
//
// Pure. No React, no Phaser, no clock.

import type { Affordance, Material } from './making';
import { isPresent, type Routine } from './routine';

/**
 * The four things a pair of hands can be doing.
 *
 * Measured over canon's 68 materials: 34 come from plants, 13 from animals -- **three of those
 * from things that live in water** -- and 15 from no living thing at all. That is not a tidy
 * invention; it is the shape of `won_from`, and it is why these cover the set without a fifth for
 * awkward cases.
 */
export type Gesture = 'stoop' | 'stalk' | 'work' | 'fish' | 'rest';

/**
 * Which gesture this material asks for.
 *
 * `wonFrom` is the authority and `classes` is never consulted, which is a deliberate narrowing
 * after a wrong turn: keying on class looks richer -- `bone` and `hide` obviously mean an animal
 * -- but it disagrees with `won_from` on real entities, and `won_from` is the field canon lints.
 * A material with no living source is worked out of the ground whatever it is made of.
 *
 * **`isWater` is checked before `isAnimal`, and the order is the rule.** Everything fished is also
 * an animal, so testing the broader predicate first would make `fish` unreachable -- which is the
 * shape of the bug that had a sawfish stalked across a riverbed. Forty-two of canon's 256 fauna are
 * fish (19), molluscs (12) or crustaceans (11); between them they yield river fish, fish bone,
 * oyster shell, crayfish carapace, ammonite shell and beedu bladder oil.
 *
 * Both predicates are injected rather than imported, because this module must not depend on the
 * species tables to answer a question about a material. The caller already holds them.
 */
export function gestureFor(
  material: Material,
  isAnimal: (speciesId: string) => boolean,
  isWater: (speciesId: string) => boolean = () => false
): Gesture {
  if (material.wonFrom.length === 0) return 'work';
  if (material.wonFrom.some(isWater)) return 'fish';
  return material.wonFrom.some(isAnimal) ? 'stalk' : 'stoop';
}

/**
 * What each act asks you to be carrying, or null when it asks for nothing.
 *
 * **An affordance, never a named tool** -- the same rule canon's processes already follow, so a
 * flint knife, a bronze knife and a glass lancet all answer a stoop and canon can add a fourth
 * blade without this table moving. Every word here is one canon authors in `affordances.json`.
 *
 * The pairings are meant to be guessable before they are explained, because a player learns this
 * by noticing it: you cut with something that cuts, you break ground with something that works
 * it, and a wary animal is kept at arm's length by the thing that deters it. Fishing shares the
 * stalk's want because a harpoon and a reed spear are what canon gives a person to take a fish
 * with -- the two acts differ in where they happen and what they wait on, not in what they hold.
 *
 * **A rest wants nothing, and that is load-bearing.** The kit's bedroll is always there, so a
 * night can never be lost for want of a thing to hold; what a night is graded on is the shelter,
 * which `momentFavours` reads. Making the night need equipment would put the one unavoidable act
 * in the game behind an item.
 */
export const GESTURE_WANTS: Record<Gesture, Affordance | null> = {
  stoop: 'cut',
  stalk: 'deter',
  fish: 'deter',
  work: 'work',
  rest: null
};

/**
 * How alert an animal is, and so whether the moment is yours.
 *
 * Straight off `routine.ts`, which already models what a creature is doing at this hour and in
 * this weather. A **feeding** animal has, in that module's own words, "not decided yet whether you
 * matter", and that is the moment to move. A hunting one is alert and working; a calling one is
 * usually in mist, where you can hear it and not see it.
 *
 * Resting and sheltering are absent on purpose: `isPresent` already refuses those before this is
 * ever asked, and naming them here would invite somebody to let a player stalk an animal that is
 * not there.
 */
const UNHURRIED: Partial<Record<Routine, boolean>> = {
  feeding: true,
  hunting: false,
  calling: false
};

/**
 * Whether the moment is with you, which is half of how an act is graded.
 *
 * **The half a player controls by choosing when and where, rather than by choosing what to
 * carry.** `activity.gradeOf` takes this and the tool and grades on both, so a player who is
 * equipped but rushed and one who is ready but empty-handed both get the middle answer -- which
 * is the reading that makes either preparation worth making on its own.
 *
 * What "the moment" means is different per gesture and deliberately so:
 *
 *   * a **stalk** or a **cast** waits on the animal, so an unhurried one is the whole of it;
 *   * a **stoop** and a turn at the **ground** wait on the hands, so being worn out is what
 *     spoils them -- the one place `fatigue.ts` reaches the making layer, and it reaches it as a
 *     nudge on a floor that still gives, never as a refusal (invariant 4);
 *   * a **night** waits on the roof, which the caller reads off the shelter.
 *
 * `spent` and `sheltered` are the caller's answers rather than recomputed here, because `App` is
 * the only thing holding the hour, the fatigue and the ground at once. A default of "not spent,
 * and sheltered" keeps every test that asks a question about tools from having to state a mood.
 */
export function momentFavours(
  gesture: Gesture,
  routine: Routine | null,
  { spent = false, sheltered = true }: { spent?: boolean; sheltered?: boolean } = {}
): boolean {
  switch (gesture) {
    case 'stalk':
    case 'fish':
      // No routine at all means nothing is watching you -- a material off a shell bed or a
      // still pool. That is a good moment rather than an unknown one.
      return routine === null ? true : (UNHURRIED[routine] ?? false);
    case 'stoop':
    case 'work':
      return !spent;
    case 'rest':
      return sheltered;
  }
}

/**
 * Whether this can be attempted at all right now, and why not when it cannot.
 *
 * A string reason rather than a boolean, matching `TileAction.blocked`: the reason *is* the
 * teaching. "The animal is not here" sends a player back at a better hour, which is a mechanic;
 * a greyed button with no words is a dead end.
 *
 * Only the stalk can be refused. Ground and plants do not go anywhere.
 */
export function blockedReason(
  gesture: Gesture,
  routine: Routine | null,
  creatureName: string | null
): string | null {
  if (gesture !== 'stalk') return null;
  if (routine && !isPresent(routine)) {
    const who = creatureName ? `The ${creatureName.toLowerCase()}` : 'The animal';
    return `${who} is not here to be followed. Its sign is, which is not the same thing.`;
  }
  return null;
}

/**
 * What the button says, and what the modal is titled.
 *
 * `rest` is the quiet member of the family. It is not a gesture a material asks for -- `gestureFor`
 * never returns it -- but it is the same *shape* of thing: you commit, something happens, and the
 * journal says how it went. Putting it through the same modal is what makes the modal read as
 * "this is what doing something looks like" rather than as a gathering minigame that happens to
 * exist. It is also the gentlest way to teach that language, because nothing is at stake.
 */
export const GESTURE_VERB: Record<Gesture, string> = {
  stoop: 'Cut and gather',
  stalk: 'Follow it',
  fish: 'Fish the shallows',
  work: 'Work the ground',
  rest: 'Stop for the night'
};

/**
 * One line explaining what the player is about to do, in the traveller's register.
 *
 * Written for a reader rather than assembled from fragments -- the same rule `describeRoutine`
 * follows -- because this is the first thing the modal says and the journal is the whole of this
 * game's progression.
 */
export function gestureLine(gesture: Gesture, materialName: string): string {
  const what = materialName.toLowerCase();
  switch (gesture) {
    case 'rest':
      // Named for the shelter rather than for a material: `SHELTER_LABEL` already says what kind
      // of night this is, and the caller passes that word through.
      return `${materialName}. The light is going and there is nothing more to be done with it today.`;
    case 'stoop':
      return `Taking ${what} asks for a steady hand and a blade worth the name. Cut low, and leave the stand something.`;
    case 'stalk':
      return `You cannot simply take ${what}. Move while the animal is busy, and stop when it is not.`;
    case 'fish':
      return `${materialName} is in the water and in no hurry. A spear and a still moment, and it is yours.`;
    case 'work':
      return `${materialName} comes out of the ground or it does not come at all. Strike where the stone wants to part, and let the tool do it.`;
  }
}
