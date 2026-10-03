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
 * **`pick` chooses between takes when there is more than one painting of the same thing.** A second
 * night is `rest.2.png` and does not replace `rest.png` — both are kept and one is shown. It must
 * be seeded rather than random; see `art.ts`.
 *
 * See `docs/art-placement.md` for the full list of filenames this folder will answer to.
 */
export function sceneFor(
  gesture: string,
  variant?: string | null,
  pick = 0,
  moment?: NightMoment | null,
  ground?: string | null
): string | null {
  return firstArt('scenes', sceneNames(gesture, variant, moment, ground), pick);
}

/**
 * The names `sceneFor` tries, most specific first. Exported so the order can be tested before any
 * of the paintings it names exists.
 *
 * **A night can be painted for its ground as well as its shelter** -- the owner's ask of 3 October
 * 2026, a bedroll on high ground. The biome first, then its group (`rest-bedroll-snow`, then
 * `rest-bedroll-high` on hills, mountains or snow), each at the moment before without it, and only
 * then the shelter alone. With no ground the chain is exactly what it was.
 */
export function sceneNames(
  gesture: string,
  variant?: string | null,
  moment?: NightMoment | null,
  ground?: string | null
): string[] {
  const group = variant ? GROUND_GROUP[variant] : undefined;
  const groundGroup = ground ? (gesture === 'rest' ? NIGHT_GROUND_GROUP : GROUND_GROUP)[ground] : undefined;
  const onGround = variant
    ? [ground, groundGroup].flatMap((g) => (g ? [moment ? `${gesture}-${variant}-${g}-${moment}` : null, `${gesture}-${variant}-${g}`] : []))
    : [];
  return [
    ...onGround,
    variant && moment ? `${gesture}-${variant}-${moment}` : null,
    variant ? `${gesture}-${variant}` : null,
    group ? `${gesture}-${group}` : null,
    gesture
  ].filter((n): n is string => n !== null);
}

/**
 * The two moments a night can be painted at: the dark while you settle, and the light you wake to.
 *
 * **One night, two pictures, and the card already has both states.** The activity card opens before
 * the night and settles after it, so `rest-none-midnight.png` draws while the player decides and
 * `rest-none-dawn.png` once the night is over. Either falls back to the plain shelter painting and
 * then to `rest.png`, so a shelter can have one of the pair, both or neither.
 */
export type NightMoment = 'midnight' | 'dawn';
export const NIGHT_MOMENTS: readonly NightMoment[] = ['midnight', 'dawn'];

/**
 * Kinds of ground that look alike enough to share a painting, keyed by biome.
 *
 * **One painting per biome was too narrow to be seen.** The cliff scene was `stoop-mountains`, and
 * mountain tiles almost always offer stone rather than a plant: across the four maps it could show
 * on 5 tiles, where a stoop on high ground happens 92 times. So a ground variant now tries its own
 * biome first, then its group, then the plain gesture -- `stoop-hills`, `stoop-high`, `stoop`. The
 * most specific painting that exists wins, and a biome can still have its own the day one is made.
 *
 * `high` is climbing ground: hills, mountains, snow, and the underside of a floating island. **The
 * top of a sky island is left out on purpose** -- high, but not climbed -- and has its own painting,
 * `stoop-sky_island`. Add a group only when a painting needs one.
 */
export const GROUND_GROUP: Readonly<Record<string, string>> = {
  hills: 'high',
  mountains: 'high',
  snow: 'high',
  // The underside of a floating island is a rock face with roots hanging off it: climbed, not
  // walked. The top of one is not, and has its own painting.
  sky_underside: 'high'
};

/**
 * The same, for a night: **a sky island's top sleeps as high ground.** Kept out of `high` above
 * because stooping there has its own painting; a night up there has none of its own, and the owner's
 * ruling of 3 October 2026 put the bedroll on the ridge and on the island in one painting -- the lady
 * on the ridge at dawn, `rest-bedroll-high-dawn`. So an island's night asks `high` too, and nothing
 * the stooping cards look up changes.
 */
export const NIGHT_GROUND_GROUP: Readonly<Record<string, string>> = { ...GROUND_GROUP, sky_island: 'high' };

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function sceneCount(): number {
  return artCount('scenes');
}
