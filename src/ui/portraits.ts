// Which people have a painted portrait, and where it is.
//
// The same arrangement as `plates.ts`, for the same reason: **adding a portrait takes no code.**
// Drop a PNG into `src/ui/portraits/` named after the person -- `thrali.png` -- and it appears.
// Nothing to register, no list to keep in step. A list would be one more thing to drift out of
// date, and this project has paid for that kind of drift more than once.
//
// Eight people is a small enough set that it will plausibly be finished, unlike the 297 species --
// but the panel must still not wait for it. `PersonPortrait` draws its silhouette for anybody
// unpainted, and a portrait replaces one individually, whenever it arrives.
//
// **The name is the person, not the canon id.** Canon calls the fisher `npc_thrali` and that is
// the id the runtime carries too -- npcs are not run through `engineId` the way species are. A
// file called `npc_thrali.png` would look right and match nothing, which is exactly the mistake
// the plates folder made twice. So the prefix is stripped here, in one place, and
// `test/portraits.test.ts` fails on a file that names nobody rather than letting it sit there
// drawing nothing.
//
// See `docs/portrait-prompts.md` for what to ask an image model for.

/**
 * Every portrait in the folder, keyed by the bare name.
 *
 * `eager` rather than lazy, exactly as the plates are: these are looked up during render, and a
 * promise cannot be returned from a component that has to decide *now* whether to draw a painting
 * or a silhouette. There are at most eight and Vite emits them as ordinary hashed assets, so the
 * browser fetches only the ones actually rendered.
 */
const files = import.meta.glob<string>('./portraits/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  byName.set(name, url);
}

/**
 * The bare name a portrait file carries, for a canon npc id.
 *
 * Exported so the test can check the folder against the cast without repeating the transform --
 * a second copy of this rule is how the file name and the lookup drift apart.
 */
export function portraitName(npcId: string): string {
  return npcId.replace(/^npc_/, '').toLowerCase().replace(/_/g, '-');
}

/** The painted portrait for this person, or null — which is the usual answer and not a problem. */
export function portraitFor(npcId: string): string | null {
  return byName.get(portraitName(npcId)) ?? null;
}

/** Every name the folder holds. Only used by a test, to keep the loader honest. */
export function portraitNames(): string[] {
  return [...byName.keys()];
}
