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
