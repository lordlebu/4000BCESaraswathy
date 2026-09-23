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

/** A seed in the URL makes a journey shareable — the whole world travels in the link. */
export function seedFromUrl(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('seed');
  return fromQuery?.trim() || DEFAULT_SEED;
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
