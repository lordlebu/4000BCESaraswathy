// Which points of interest have a painted view, and where it is.
//
// Authored place panoramas arrive through this registry, including preferred painted editions.
// `PlacePanel` also reads without a picture: drop a canon-id PNG into `src/ui/places/` and the
// existing caller shows it, without a second per-map lookup table.
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

import { artCount, preferredArt } from './art';

/**
 * The preferred painted view of a place, with category art or null as the fallback.
 *
 * Tries the place itself, then its kind. A caller that has only a kind passes it as both, which
 * is legal and simply skips the first lookup.
 */
export function placeArt(poiId: string, kind?: string | null): string | null {
  return preferredArt('places', [poiId, kind ? `kind-${kind}` : null]);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function placeArtCount(): number {
  return artCount('places');
}
