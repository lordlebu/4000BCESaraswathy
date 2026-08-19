// Saved journeys, keyed by seed.
//
// Ported from `src/main.js`. The rule that matters: the payload carries a version, and a save
// written by an older shape is **discarded rather than misread**. A half-understood save is worse
// than a fresh start — it shows the player fog and sketches that do not match the world they are
// standing in.

import { type Collection, readCollection } from './content/collection';
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
 */
export const SAVE_VERSION = 7;

export interface Journey {
  version: number;
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
}

const empty = (): Journey => ({
  version: SAVE_VERSION,
  discovered: [],
  collection: {},
  reached: false,
  progress: emptyProgress()
});

/** Anything unrecognisable becomes an empty progress rather than a half-read one. */
function readProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return emptyProgress();
  const raw = value as Partial<Progress>;
  return {
    rungs: raw.rungs && typeof raw.rungs === 'object' ? { ...raw.rungs } : {},
    words: Array.isArray(raw.words) ? raw.words : [],
    answered: raw.answered && typeof raw.answered === 'object' ? { ...raw.answered } : {},
    questions: Array.isArray(raw.questions) ? raw.questions : []
  };
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
      discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
      collection: readCollection(parsed.collection),
      reached: parsed.reached === true,
      progress: readProgress(parsed.progress)
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
  journey: Omit<Journey, 'version' | 'progress'> & { progress?: Progress }
): void {
  try {
    const payload: Journey = {
      version: SAVE_VERSION,
      ...journey,
      progress: journey.progress ?? loadJourney(seed).progress
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
