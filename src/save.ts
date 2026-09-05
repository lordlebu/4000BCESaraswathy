// Saved journeys, keyed by seed.
//
// Ported from `src/main.js`. The rule that matters: the payload carries a version, and a save
// written by an older shape is **discarded rather than misread**. A half-understood save is worse
// than a fresh start — it shows the player fog and sketches that do not match the world they are
// standing in.

import { type Collection, readCollection } from './content/collection';
import { type Satchel, emptySatchel } from './content/satchel';
import { type Progress, emptyProgress } from './journey';

const PREFIX = 'south-of-tethys';

/**
 * Bump when the payload shape changes. The Phaser shell reset it to 1; `reached` made it 3;
 * carrying what the player has come to understand made it 4; the collection replacing the
 * sketch list made it 6, because `observed` changed from an array of names to a record keyed
 * by species id and a save written under the old shape cannot be read into the new one.
 *
 * **7 is the first bump where the shape did not change at all.** Lothal and Dwarka gained
 * biomes in their canon palettes, and the palette decides what every tile becomes -- so the
 * same seed now generates different ground, the authored places sit on different tiles, and
 * the fog and the sketches in an old save describe a world that is no longer there. The
 * payload would still parse, which is exactly the danger: it would be read, and be wrong.
 * Discarding it is the whole point of this constant.
 *
 * **8 adds the satchel.** A save written under 7 has no `satchel` key, and reading one as an
 * empty satchel would be defensible -- the player simply has nothing yet. It is discarded
 * anyway, on the rule this constant exists for: the payload shape changed, and a save that
 * parses under a shape it was not written for is the danger rather than the inconvenience.
 * The cost is real and small; the alternative is a special case that has to be remembered
 * every time the shape moves again.
 *
 * **9 adds what `Progress` learned about making**: `recipes`, the crafts somebody taught you,
 * and `made`, the crafts you have performed. Both would read as empty from a version 8 save
 * and both would be wrong in the same quiet way — the people would look as though they had
 * never taught you anything, and the keepsake at the end would list none of what you built.
 *
 * `recipes` landed one commit before this bump did, which is the mistake this constant exists
 * to catch and did not, because the edit that was supposed to raise it failed silently. Both
 * fields are covered by this one bump: the branch has not merged, so no save carries either.
 *
 * **10 is a bump where the shape did not change at all, like 7 before it.** Twenty-five plants
 * were added to canon without a `source_index`. Unindexed species sort last *by id*, so each
 * new one landed in the middle of that group and moved every species after it -- and the game
 * picks a tile's flora by indexing into a per-biome list. The same seed therefore grows
 * different plants than it did, and a save written before that describes a world that is no
 * longer there. It would parse perfectly, which is exactly the danger.
 *
 * Canon has frozen every species order and now refuses one without an index, so this cannot
 * recur. This bump is for the shift that already shipped.
 *
 * **11 is the last bump of that kind, and that is the point of it.** Species are no longer
 * picked by indexing into a per-biome list; they are picked by rendezvous hashing over their
 * ids, so a species' tile depends on nothing but that species and that tile. Adding one to
 * canon can now only take the tiles it wins outright -- measured at 4.8% of a biome's ground,
 * all of it the newcomer arriving -- where the old scheme moved 95.4%, of which 94.8% was
 * existing species swapping places for no reason at all.
 *
 * This bump is the one-time cost of crossing over: every tile is re-picked under the new
 * scheme, so a save written under 10 describes plants that are no longer there. After it,
 * **adding canon content is not a save-breaking change** and must not bump this again.
 *
 * ---
 *
 * **The world is now baked, which changes what this constant is for.** `world/bake.ts` resolves
 * a map once and stores it, so a journey keeps the ground it started on and a generator change
 * reaches only new journeys. Versions 7, 10 and 11 all existed *because the ground had moved
 * under an unchanged payload* -- and that reason is gone. There should not be another of that
 * kind.
 *
 * What still bumps this: the payload shape below changing, and a bump of `BAKE_VERSION`, since
 * a bake format change forces every world to be generated afresh and the fog and sketches are
 * tied to their ground. Both should be rare, and neither is the price of touching the generator.
 */
export const SAVE_VERSION = 11;

export interface Journey {
  version: number;
  /**
   * Who was walking.
   *
   * Optional rather than versioned: every save written before there was a choice has no field, and
   * absent means Varuna, which is who those journeys were. A bump would have invalidated them to
   * record something that was already true of all of them.
   */
  characterId?: string;
  discovered: string[];
  /**
   * The flora and fauna met, keyed by species id.
   *
   * Was `observed: string[]` -- creature names, appended by a button, read only to print a
   * list. See `content/collection.ts` for why both the key and the filling changed.
   */
  collection: Collection;
  /** Whether the landmark was found. Kept so the travel log survives a reload. */
  reached: boolean;
  /**
   * What the player knows.
   *
   * The game has no experience points, so this is the whole of progression: how far up each
   * discovery's ladder they have got, which words they hold, and which reading they settled
   * on for each field question. `src/journey.ts` holds every rule about advancing it; this
   * only stores it.
   */
  progress: Progress;
  /**
   * What the traveller is carrying, keyed by canon id.
   *
   * A flat record of counts, which is the whole of it: there is no weight, no slots and
   * nothing that spoils. See `content/satchel.ts` for why that is narrower than it sounds.
   */
  satchel: Satchel;
}

const empty = (): Journey => ({
  version: SAVE_VERSION,
  discovered: [],
  collection: {},
  reached: false,
  progress: emptyProgress(),
  satchel: emptySatchel()
});

/** Anything unrecognisable becomes an empty progress rather than a half-read one. */
function readProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return emptyProgress();
  const raw = value as Partial<Progress>;
  return {
    rungs: raw.rungs && typeof raw.rungs === 'object' ? { ...raw.rungs } : {},
    words: Array.isArray(raw.words) ? raw.words : [],
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
    made: Array.isArray(raw.made) ? raw.made : [],
    answered: raw.answered && typeof raw.answered === 'object' ? { ...raw.answered } : {},
    questions: Array.isArray(raw.questions) ? raw.questions : []
  };
}

/** Anything unrecognisable becomes an empty satchel, on the same terms as progress. */
function readSatchel(value: unknown): Satchel {
  if (!value || typeof value !== 'object') return emptySatchel();
  const out: Satchel = {};
  for (const [id, n] of Object.entries(value as Record<string, unknown>)) {
    // A count that is not a positive whole number is a corrupted stack, not a hint. Dropping
    // it keeps `carried()` honest -- every key in a satchel is something actually held.
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) out[id] = n;
  }
  return out;
}

function key(seed: string): string {
  return `${PREFIX}:${seed}`;
}

export function loadJourney(seed: string): Journey {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(seed));
  } catch {
    // Private browsing and blocked storage both throw here. The game still plays; it just forgets.
    return empty();
  }
  if (!raw) return empty();

  try {
    const parsed = JSON.parse(raw) as Partial<Journey>;
    if (parsed.version !== SAVE_VERSION) {
      localStorage.removeItem(key(seed));
      return empty();
    }
    return {
      version: SAVE_VERSION,
      // A string or nothing. An id the build no longer knows resolves to Varuna at the point of
      // use rather than here, so an old save naming a retired character still loads.
      characterId: typeof parsed.characterId === 'string' ? parsed.characterId : undefined,
      discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
      collection: readCollection(parsed.collection),
      reached: parsed.reached === true,
      progress: readProgress(parsed.progress),
      satchel: readSatchel(parsed.satchel)
    };
  } catch {
    localStorage.removeItem(key(seed));
    return empty();
  }
}

/**
 * `progress` is optional so a caller that does not yet track knowledge keeps working.
 *
 * The diary UI is being built separately; until it passes progress, saving without it is
 * correct rather than lossy — there is nothing to lose. Omitting it on a save that already
 * had some would be, so an absent value is read as empty only when nothing was stored.
 */
export function saveJourney(
  seed: string,
  journey: Omit<Journey, 'version' | 'progress' | 'satchel'> & {
    progress?: Progress;
    satchel?: Satchel;
  }
): void {
  try {
    // One read, not one per optional field. Both `progress` and `satchel` fall back to what
    // is already stored, and calling `loadJourney` twice would parse the same payload twice
    // on every save -- which happens on every step the player takes.
    const stored =
      journey.progress === undefined || journey.satchel === undefined ? loadJourney(seed) : null;
    const payload: Journey = {
      version: SAVE_VERSION,
      ...journey,
      progress: journey.progress ?? stored!.progress,
      satchel: journey.satchel ?? stored!.satchel
    };
    localStorage.setItem(key(seed), JSON.stringify(payload));
  } catch {
    // Storage full or blocked. Losing the save is survivable; crashing mid-walk is not.
  }
}

export function clearJourney(seed: string): void {
  try {
    localStorage.removeItem(key(seed));
  } catch {
    /* nothing to do */
  }
}
