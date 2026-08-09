// Seeded randomness. Every random value in the game comes from here — `Math.random()` and
// anything time-based would break the promise that a seed always yields the same journey.
//
// The algorithms are carried over unchanged from the vanilla prototype (`src/generator.js` and
// `src/species.js`) so that seeds keep meaning the same thing across the port.

export type Random = () => number;

/** xmur3: turns a seed string into a generator of well-mixed 32-bit integers. */
function hashSeed(seed: string): () => number {
  const text = String(seed);
  let hash = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

/** mulberry32: small, fast, and good enough for terrain. Returns floats in [0, 1). */
function mulberry32(seedNumber: number): Random {
  let state = seedNumber;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The one way to start a random stream. Same seed in, same sequence out. */
export function createRandom(seed: string): Random {
  return mulberry32(hashSeed(seed)());
}

/**
 * A standalone hash for "what lives on this tile" style lookups.
 *
 * Unlike `createRandom`, this has no stream position, so a tile answers the same way however the
 * player reaches it — walk away, come back, reload the page, the crane is still the crane. The
 * world seed is mixed in so a new journey repopulates the map.
 */
export function tileHash(seed: string, x: number, y: number, salt: string): number {
  let hash = 2166136261;
  for (const char of `${seed}:${x},${y}:${salt}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Deterministic pick from a list, keyed by tile. Returns null for an empty list. */
export function pickFor<T>(list: readonly T[], seed: string, tile: { x: number; y: number }, salt: string): T | null {
  if (list.length === 0) return null;
  return list[tileHash(seed, tile.x, tile.y, salt) % list.length] ?? null;
}

/** Fisher-Yates against a seeded stream. `Array.sort(() => random() - 0.5)` is not a shuffle. */
export function shuffle<T>(list: readonly T[], random: Random): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}
