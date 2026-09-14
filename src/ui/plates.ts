// Which species have a painted plate, and where it is.
//
// Canon holds a few hundred species a player can meet and one painted plate is a good session's
// work, so the set will never be complete and the panel must not wait for it: `SpeciesIcon` draws a derived
// silhouette for every species, and a plate replaces one, individually, whenever it arrives.
//
// **The whole point of this file is that adding a plate takes no code.** Drop a PNG into
// `src/ui/plates/` named after the species — `desert-fox.png` — and it appears. Nothing to
// register, no list to keep in step, no build step to remember. A list would be one more thing to
// drift out of date, and this project has paid for that kind of drift more than once.
//
// **The name is the *engine* id, not canon's.** `canon.ts` rewrites `fauna_desert_fox` into
// `desert-fox` on the way in -- prefix dropped, underscores to hyphens -- and that is the id every
// runtime record carries. Naming plates after the canon id looks right and silently matches
// nothing, which is exactly what happened the first time this was wired up.
//
// See `docs/plate-prompts.md` for what to ask an image model for, and the queue to work down.

import { art, artCount } from './art';

/**
 * The painted plate for this species, or null — which is the usual answer and not a problem.
 *
 * `speciesId` is the engine id off a runtime record, e.g. `desert-fox`.
 *
 * The loader itself is `art.ts`, shared with the portraits, the marks and the activity scenes:
 * four copies of the same twenty lines had already begun to disagree about which file extensions
 * they would accept. What stays here is the thing that is actually specific to this folder and
 * that has actually cost time — **the naming convention**, written at the top of this file.
 */
export function plateFor(speciesId: string): string | null {
  return art('plates', speciesId);
}

/** How many exist. Only used by a test, to keep the loader honest about an empty folder. */
export function plateCount(): number {
  return artCount('plates');
}
