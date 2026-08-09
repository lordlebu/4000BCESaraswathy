// Saved journeys, keyed by seed.
//
// Ported from `src/main.js`. The rule that matters: the payload carries a version, and a save
// written by an older shape is **discarded rather than misread**. A half-understood save is worse
// than a fresh start — it shows the player fog and sketches that do not match the world they are
// standing in.

const PREFIX = 'south-of-tethys';

/** Bump when the payload shape changes. The Phaser shell reset it to 1; `reached` made it 3. */
export const SAVE_VERSION = 3;

export interface Journey {
  version: number;
  discovered: string[];
  observed: string[];
  /** Whether the landmark was found. Kept so the travel log survives a reload. */
  reached: boolean;
}

const empty = (): Journey => ({ version: SAVE_VERSION, discovered: [], observed: [], reached: false });

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
      observed: Array.isArray(parsed.observed) ? parsed.observed : [],
      reached: parsed.reached === true
    };
  } catch {
    localStorage.removeItem(key(seed));
    return empty();
  }
}

export function saveJourney(seed: string, journey: Omit<Journey, 'version'>): void {
  try {
    localStorage.setItem(key(seed), JSON.stringify({ version: SAVE_VERSION, ...journey }));
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
