// Which world this is.
//
// Lifted out of `App` when the error boundary needed it too. The boundary sits *above* `App` --
// it has to, or a throw during `App`'s own render would go uncaught -- so it cannot read the seed
// from a prop, and copying four lines into `main.tsx` is how two readings of the same URL drift
// apart. There is one now, and both callers use it.

/**
 * The world every player gets unless a link says otherwise.
 *
 * Exported so a test can measure **the world a player actually walks**. `buildFieldMap` defaults
 * its seed to the map's id, which is a different world -- correct, stable, and nobody's. A
 * measurement taken under that default says nothing about what is on screen, which is a trap
 * that has cost real time; see the note on `buildFieldMap`.
 */
export const DEFAULT_SEED = 'jambhudweepa-evening';

/** Where the last walk's seed is kept, so coming back without a link finds the same world. */
export const LAST_SEED_KEY = 'south-of-tethys:last-seed';

/**
 * Which seed a visit starts on, as a pure rule: a link's seed first; under automation the fixed
 * world every test measures; then the seed this browser last walked; and otherwise a new one.
 *
 * **The owner's ruling, 4 October 2026: whoever starts the game starts on a random seed.** Every
 * player used to begin on `jambhudweepa-evening`, so every first walk was the same map. Coming back
 * must still find the walk left off -- the save is keyed by seed -- which is why the last one is
 * remembered rather than a new one rolled on every load.
 */
export function chooseSeed(given: {
  query: string | null;
  automated: boolean;
  last: string | null;
  random: () => number;
}): string {
  const asked = given.query?.trim();
  if (asked) return asked;
  if (given.automated) return DEFAULT_SEED;
  return given.last?.trim() || randomSeed(given.random);
}

/** Remember the seed being walked, for the next visit that comes without a link. */
export function rememberSeed(seed: string): void {
  try {
    localStorage.setItem(LAST_SEED_KEY, seed);
  } catch {
    // Storage refused: the next visit rolls a new seed, which is the honest outcome.
  }
}

/** Chance from the browser's own source, for choosing a seed -- never for anything in the world. */
function cryptoRandom(): number {
  const one = new Uint32Array(1);
  globalThis.crypto.getRandomValues(one);
  return one[0]! / 2 ** 32;
}

let chosen: string | null = null;

/**
 * The seed this visit is on. A seed in the URL makes a journey shareable -- the whole world travels
 * in the link -- so a chosen seed is written into the address, and every later reading agrees.
 */
export function seedFromUrl(): string {
  const query = new URLSearchParams(window.location.search).get('seed');
  if (query?.trim()) return query.trim();
  if (chosen) return chosen;
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_SEED_KEY);
  } catch {
    last = null;
  }
  // Automation is the browser suite (`navigator.webdriver`) and the unit suite (Vitest's mode):
  // both measure the one fixed world, as the door's bypass does in `App`.
  const automated = Boolean(navigator.webdriver) || import.meta.env?.MODE === 'test';
  chosen = chooseSeed({ query: null, automated, last, random: cryptoRandom });
  if (!automated) {
    rememberSeed(chosen);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', chosen);
    window.history.replaceState(null, '', url);
  }
  return chosen;
}

/** A fresh seed from the browser's own chance: what "Start a new walk" sets out on. */
export function freshSeed(): string {
  return randomSeed(cryptoRandom);
}

/** Words a random seed is made of: a time or a weather, then something you might meet. */
const SEED_FIRST = [
  'monsoon', 'saffron', 'evening', 'dawn', 'salt', 'silt', 'amber', 'river',
  'dry', 'green', 'ember', 'misty', 'copper', 'reed', 'tide', 'dusk'
] as const;
const SEED_SECOND = [
  'heron', 'banyan', 'lotus', 'delta', 'crane', 'ferry', 'kiln', 'shrine',
  'lantern', 'harbour', 'jackal', 'mango', 'bead', 'mask', 'granary', 'ford'
] as const;

/**
 * A new seed, chosen for you, readable enough to say aloud and pass on: `monsoon-heron-42`.
 *
 * **Words rather than digits, because a seed here is something people share.** The whole world
 * travels in the link, and "try saffron-kiln-17" survives a conversation where a ten-digit number
 * does not. 16 x 16 x 100 is 25,600 maps, which is plenty for a button that means "surprise me";
 * anybody who wants a particular map types its seed instead.
 */
export function randomSeed(random: () => number = Math.random): string {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length]!;
  return `${pick(SEED_FIRST)}-${pick(SEED_SECOND)}-${Math.floor(random() * 100)}`;
}
