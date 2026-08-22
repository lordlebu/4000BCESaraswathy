// Which species have a painted plate, and where it is.
//
// Canon holds 297 species a player can meet. One painted plate is a good session's work, so the
// set will never be complete and the panel must not wait for it: `SpeciesIcon` draws a derived
// silhouette for every species, and a plate replaces one, individually, whenever it arrives.
//
// **The whole point of this file is that adding a plate takes no code.** Drop a PNG into
// `src/ui/plates/` named after the species — `desert-fox.png` — and it appears. Nothing to
// register, no list to keep in step, no build step to remember. A list would be one more thing to
// drift out of date, and this project has paid for that kind of drift more than once.
//
// **The name is the *engine* id, not canon's.** `canon.ts` rewrites `fauna_desert_fox` into
// `desert-fox` on the way in -- prefix dropped, underscores to hyphens -- and that is the id every
// runtime record carries. Naming plates after the canon id looks right and silently matches
// nothing, which is exactly what happened the first time this was wired up.
//
// See `docs/plate-prompts.md` for what to ask an image model for, and the queue to work down.

/**
 * Every plate in the folder, keyed by engine id.
 *
 * `eager` rather than lazy: these are looked up during render, and a promise cannot be returned
 * from a component that has to decide *now* whether to draw a plate or a silhouette. They are
 * small and there will be a few dozen at most; Vite emits them as ordinary hashed assets and the
 * browser fetches only the ones actually rendered.
 *
 * The glob is deliberately loose about the extension. Whoever adds a plate should not have to
 * discover that the loader only accepts one of them.
 */
const files = import.meta.glob<string>('./plates/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const byId = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const id = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  byId.set(id, url);
}

/**
 * The painted plate for this species, or null — which is the usual answer and not a problem.
 *
 * `speciesId` is the engine id off a runtime record, e.g. `desert-fox`.
 */
export function plateFor(speciesId: string): string | null {
  return byId.get(speciesId) ?? null;
}

/** How many exist. Only used by a test, to keep the loader honest about an empty folder. */
export function plateCount(): number {
  return byId.size;
}
