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

/**
 * Deterministic pick from a list, keyed by tile.
 *
 * **Indexes by position, so the answer moves when the list does.** Kept for callers picking from
 * a list that is fixed by construction; anything drawing from authored content that can grow
 * wants `weightedPickFor` instead, for the reasons written there.
 */
export function pickFor<T>(list: readonly T[], seed: string, tile: { x: number; y: number }, salt: string): T | null {
  if (list.length === 0) return null;
  return list[tileHash(seed, tile.x, tile.y, salt) % list.length] ?? null;
}

/**
 * Deterministic weighted pick that **does not move when the list grows**.
 *
 * This is rendezvous hashing (highest random weight): score every candidate by hashing the tile
 * *together with that candidate's own id*, and keep the best. A candidate's score depends on
 * nothing but itself and the tile, so adding a new one can only take the tiles it outright wins --
 * every other tile keeps exactly what it had.
 *
 * That is the whole point, and it is worth being blunt about what it replaces. `pickFor` indexes
 * `hash % list.length`, so adding one plant to a biome changed the divisor and therefore re-rolled
 * **every tile of that biome on every map**. Ground the player had already walked grew something
 * else. That is what made canon's `source_index` load-bearing, what forced a `SAVE_VERSION` bump
 * for a pure content addition, and what silently changed what grew on saved ground when
 * twenty-five plants arrived without an index. None of those failures are expressible here:
 * position is never read, so there is no order to get wrong.
 *
 * Weights fold into the score rather than being applied by repeating entries in the list. The
 * standard form for weighted rendezvous hashing is `-weight / log(u)` for uniform `u` in (0, 1),
 * which yields exactly the intended proportions: a candidate of twice the weight wins twice the
 * tiles, without ever being duplicated. `tileHash` is mapped into (0, 1) with *both* ends open,
 * because `log(1)` is `0` and `log(0)` is `-Infinity`, and either would collapse the comparison.
 *
 * Ties break on `id`, so the result never depends on the order candidates were handed in.
 *
 * **`tileHash` alone is not mixed well enough to be compared against itself**, and this was
 * measured rather than assumed. Its FNV-1a body does not avalanche on a change to the last
 * character of its input, so ids that differ only in a trailing digit -- `s1`, `s2`, `s3`, which
 * is exactly the shape of an id list -- hash to near-consecutive values. Scored that way, the last
 * candidate took 25.8% of tiles and another took 1.0%, against an even share of 4.8%. A modulo
 * never noticed, because it only ever looks at the low bits of one hash; rendezvous compares
 * whole hashes against each other, so it depends on mixing that `pickFor` never needed.
 * `avalanche` is murmur3's `fmix32` finalizer, and it brings the same measurement to 4.5-5.0%.
 */
function avalanche(hash: number): number {
  let h = hash;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
export function weightedPickFor<T>(
  candidates: readonly T[],
  seed: string,
  tile: { x: number; y: number },
  salt: string,
  idOf: (item: T) => string,
  weightOf: (item: T) => number
): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  let bestId = '';

  for (const candidate of candidates) {
    const weight = weightOf(candidate);
    // Weightless is not in the running. Scoring it would still yield a finite number, and it
    // would still win any tile no other candidate wanted.
    if (weight <= 0) continue;

    const id = idOf(candidate);
    // (0, 1) exclusive: `+ 0.5` lifts the floor off zero, `2 ** 32` holds the ceiling below one.
    const unit = (avalanche(tileHash(seed, tile.x, tile.y, `${salt}:${id}`)) + 0.5) / 4294967296;
    const score = -weight / Math.log(unit);

    if (score > bestScore || (score === bestScore && id < bestId)) {
      best = candidate;
      bestScore = score;
      bestId = id;
    }
  }

  return best;
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
