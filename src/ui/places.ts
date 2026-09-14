// Which points of interest have a painted view, and where it is.
//
// **A placement, deliberately ahead of the art.** Nothing in this folder yet, and the game does not
// wait for it: `PlacePanel` reads perfectly well without a picture and always has. What this file
// buys is that the *first* painting is a file and not a sprint -- drop `poi_lothal_camp.png` into
// `src/ui/places/` and the panel shows it.
//
// The same arrangement as `plates.ts`, for the reason that file gives, and by now the reason this
// repository keeps learning: **adding art must take no code.** A list is one more thing to drift.
//
// **The name is canon's poi id, kept whole.** Species are rewritten on the way in -- `fauna_desert_fox`
// becomes `desert-fox` -- and points of interest are not: `places.ts` carries `poi_glass_scar`
// exactly as canon writes it, and that is the id every runtime record holds. Naming a file
// `glass-scar.png` would look right and match nothing, which is precisely the mistake `plates.ts`
// records making the first time it was wired up, and `portraits.ts` records making again.
//
// **A kind is the fallback, and that is what makes this tractable.** Canon holds six `poi.kind`
// values against twenty-odd authored places, so six paintings -- `kind-settlement.png`,
// `kind-quarry.png` -- cover every place in the game before a single one is painted individually.
// That is the same bargain `marks.ts` struck: paint the *category* first, and let a specific one
// replace it whenever somebody has an afternoon.
//
// See `docs/art-placement.md` for the queue and what each should be of.

import { artCount, firstArt } from './art';

/**
 * The painted view of a place, or null — which is every place today and not a problem.
 *
 * Tries the place itself, then its kind. A caller that has only a kind passes it as both, which
 * is legal and simply skips the first lookup.
 */
export function placeArt(poiId: string, kind?: string | null): string | null {
  return firstArt('places', poiId, kind ? `kind-${kind}` : null);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function placeArtCount(): number {
  return artCount('places');
}
