// The painted scene behind an activity, and where it comes from.
//
// Modelled on `plates.ts` exactly, for the reason that file gives: **adding art must take no
// code.** Drop a built PNG into `src/ui/scenes/` named after the gesture -- `stoop.png` -- and it
// appears. No list, no registration, nothing to keep in step.
//
// Where this differs from a species plate is what it is *of*. A plate is one animal against a
// suggestion of habitat; a scene is a pair of hands at work, and the traveller is in it. That is
// what makes the modal read as an activity rather than as a bestiary entry that happens to have a
// button.
//
// **Three files is the whole set**, against 297 species -- so unlike plates, this can actually be
// finished, and the fallback matters less. It exists anyway: a gesture with no painting still
// opens, still plays, and simply has no picture. Nothing is blocked on art.

import { artCount, firstArt } from './art';

/**
 * The painted scene for this gesture, or null — which is legal and simply means no picture yet.
 *
 * `variant` narrows it where one gesture happens in more than one kind of place, and there are now
 * two of those. A night under a mat on open ground and a night at a camp with a fire are different
 * nights, and the game already models four shelter kinds. A pot at a kiln and a man splitting reeds
 * are different work, and canon holds **seventeen processes** — so `make`-side variants are named
 * after the bare process word, the same word `PROCESS_MARK` keys on.
 *
 * It falls back to the plain gesture, so `rest-roof.png` or `stoop-firing.png` can land later as a
 * file and no code, and a variant with no painting is not an error. **Nothing is ever blocked on
 * art**: a gesture with no painting at all still opens, still works, and simply has no picture.
 *
 * See `docs/art-placement.md` for the full list of filenames this folder will answer to.
 */
export function sceneFor(gesture: string, variant?: string | null): string | null {
  return firstArt('scenes', variant ? `${gesture}-${variant}` : null, gesture);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function sceneCount(): number {
  return artCount('scenes');
}
