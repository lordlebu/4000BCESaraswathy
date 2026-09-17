// Which made things have a painted plate, and where it is.
//
// **A placement, deliberately ahead of the art**, and the third of the three this rework opened.
// Nothing in this folder yet; the satchel and the workshop both read fine without it, because
// `ThingIcon` already draws a mark for every category and has since the making layer landed.
//
// The same arrangement as `plates.ts`: **adding art takes no code.** Drop
// `item_bronze_knife.png` into `src/ui/things/` and it appears wherever that item is shown.
//
// **The name is canon's item id, kept whole** -- `item_bronze_knife`, not `bronze-knife`.
// `making.ts` states the rule at the top of its own file: canon ids are kept, not converted,
// because the making layer cross-references far harder than the species layer does and a second
// naming would be a second thing to get wrong. The runtime record carries `item_bronze_knife`, so
// that is what a file is called.
//
// **Seventy-five items is a long queue and it will never be a blocker.** `ThingIcon` covers the
// whole set today from ten `kind` marks, exactly as `marks.ts` covers 217 making entities from 47
// category drawings -- so a plate here is a *replacement* for something already on screen, never a
// gap being filled. They can arrive in any order, in any quantity, and each takes effect the
// moment the file lands.
//
// Materials share this folder and the same rule: `material_reed_fibre.png`. Canon ids are unique
// across both, and `nameOf` already answers to either, so one folder rather than two is one fewer
// convention to remember.
//
// See `docs/art-placement.md` for the queue.

import { artCount, firstArt } from './art';

/**
 * The painted plate for a made thing or a material, or null — which is all of them today.
 *
 * `kind` is the fallback, for the same reason the places folder has one: ten paintings named
 * `kind-tool.png`, `kind-container.png` and so on cover all seventy-five items, and an individual
 * plate replaces one whenever it arrives.
 */
export function thingArt(id: string, kind?: string | null): string | null {
  return firstArt('things', [id, kind ? `kind-${kind}` : null]);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function thingArtCount(): number {
  return artCount('things');
}
