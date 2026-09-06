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

import type { Material } from './making';
import { isPresent, type Routine } from './routine';

/**
 * The three things a pair of hands can be doing.
 *
 * Measured over canon's 62 materials: 34 come from plants, 13 from animals, and 15 from no
 * living thing at all. That is not a tidy invention -- it is the shape of `won_from`, and it is
 * why three gestures cover the set without a fourth for awkward cases.
 */
export type Gesture = 'stoop' | 'stalk' | 'work';

/**
 * Which gesture this material asks for.
 *
 * `wonFrom` is the authority and `classes` is never consulted, which is a deliberate narrowing
 * after a wrong turn: keying on class looks richer -- `bone` and `hide` obviously mean an animal
 * -- but it disagrees with `won_from` on real entities, and `won_from` is the field canon lints.
 * A material with no living source is worked out of the ground whatever it is made of.
 *
 * `isAnimal` is injected rather than imported, because this module must not depend on the species
 * tables to answer a question about a material. The caller already holds them.
 */
export function gestureFor(material: Material, isAnimal: (speciesId: string) => boolean): Gesture {
  if (material.wonFrom.length === 0) return 'work';
  return material.wonFrom.some(isAnimal) ? 'stalk' : 'stoop';
}

/**
 * How hard this is, from 0 (a windfall) to 1 (the hardest thing on the map).
 *
 * Rarity is the spine of it, because a rare thing being harder to get is the one relationship a
 * player will expect without being told. Everything else here is a small nudge on top.
 *
 * **This is the game's number and canon must never carry it.** Canon says a leviathan is rare;
 * how many beats of a rhythm that is worth is pacing, and pacing is play. It is the same seam
 * `renews` and `DAYS_TO_RETURN` already sit on either side of.
 */
export const DIFFICULTY_BY_RARITY: Record<Material['rarity'], number> = {
  common: 0.25,
  rare: 0.55,
  mythic: 0.8
};

/**
 * A wary animal is harder to close on than a busy one.
 *
 * Straight off `routine.ts`, which already models what a creature is doing at this hour and in
 * this weather. A hunting animal is alert and working; a feeding one has, in the module's own
 * words, "not decided yet whether you matter". Calling means mist -- you can hear it and not see
 * it, which is the hardest case of the three.
 *
 * Resting and sheltering are absent from this table on purpose: `isPresent` already refuses those
 * before difficulty is ever asked, and giving them a number here would invite somebody to let a
 * player stalk an animal that is not there.
 */
const ALERTNESS: Partial<Record<Routine, number>> = {
  feeding: 0,
  hunting: 0.15,
  calling: 0.25
};

/**
 * The difficulty of one attempt, in [0, 1].
 *
 * `routine` is only consulted for a stalk, because it is only about animals. A clamp rather than
 * a raw sum, so adding another nudge later cannot push this past what the modal can render.
 */
export function difficultyOf(
  material: Material,
  gesture: Gesture,
  routine: Routine | null
): number {
  const base = DIFFICULTY_BY_RARITY[material.rarity];
  const alert = gesture === 'stalk' && routine ? (ALERTNESS[routine] ?? 0) : 0;
  return Math.min(1, Math.max(0, base + alert));
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

/** What the button says, and what the modal is titled. */
export const GESTURE_VERB: Record<Gesture, string> = {
  stoop: 'Cut and gather',
  stalk: 'Follow it',
  work: 'Work the ground'
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
    case 'stoop':
      return `Taking ${what} asks for a steady hand and a moment's patience. Cut with the rhythm, not against it.`;
    case 'stalk':
      return `You cannot simply take ${what}. Move while the animal is busy, and stop when it is not.`;
    case 'work':
      return `${materialName} comes out of the ground or it does not come at all. Strike where the stone wants to part.`;
  }
}
