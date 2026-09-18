// Every painted thing in the interface, in one registry.
//
// **The rule the four art folders already worked by, made into one mechanism: adding art takes no
// code.** Drop a file into `src/ui/plates/` named after a species, or `src/ui/portraits/` named
// after a person, and it appears. Nothing to register, no list to keep in step. A list is one more
// thing to drift, and this project has paid for that kind of drift more than once.
//
// **What is new is that adding a whole new *kind* of art now takes no code either.** `plates.ts`,
// `marks.ts`, `scenes.ts` and `portraits.ts` were four files of the same twenty lines with four
// different globs, so a fifth kind of picture meant a fifth copy -- and the copies had already
// started to disagree, one admitting SVG and three not. The glob below is one directory level
// wider than any of theirs, so a new folder under `src/ui/` is picked up by existing code the
// moment somebody puts a file in it.
//
// That matters because of what is coming. The art queue is long and deliberately not a blocker:
// paintings for the points of interest, for the things the workshop makes, for each of canon's
// seventeen processes, for the shelter a night is spent under. **None of it gates any mechanic.**
// Every lookup here returns null for a missing file, every caller already draws something else
// when it does, and `docs/art-placement.md` is the manifest of what can be dropped where.
//
// The four named modules stay as the doors callers use. They are one line each now, and they keep
// their headers, because the *naming rules* differ between folders and that is the part that has
// actually cost time: a plate is named after the **engine** id and a portrait after the bare
// person, and a file under the wrong convention matches nothing, throws nothing, and quietly
// keeps drawing the fallback.

/**
 * Every image under a direct subfolder of `src/ui/`, keyed by folder and then by bare filename.
 *
 * `eager` rather than lazy, which every one of the four modules this replaces had already settled
 * on for the same reason: these are looked up **during render**, and a promise cannot be returned
 * from a component that has to decide *now* whether to draw a painting or a silhouette. Vite emits
 * them as ordinary hashed assets, so the browser fetches only the ones actually rendered -- eager
 * here means the *URL* is known at build time, not that the bytes are shipped up front.
 *
 * SVG is admitted alongside the bitmap formats because a mark is a line drawing at 20px, which is
 * exactly where a bitmap has to ship at three sizes and an SVG does not. Previously only
 * `marks.ts` allowed it, which meant whoever added the first SVG plate would have found out by it
 * silently not appearing.
 */
const files = import.meta.glob<string>('./*/*.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default'
});

/**
 * Every take of every name, keyed by folder and then by name.
 *
 * **A list rather than one image, because art is never replaced here.** A second painting of a
 * night does not supersede the first — both are kept and one is chosen, so a picture somebody made
 * goes on being seen. See `artTakes` for the naming and `docs/art-handover.md` for the rule.
 *
 * **Only the activity plate picks between takes**, and that is a scoping decision rather than a
 * limitation of this map. The plate is the painting in the middle of the screen when you do
 * something — `scenes/` and `events/` — and showing a different one of two nights is texture. A
 * species is not: a fauna plate is the record of *that animal*, and swapping between two drawings
 * of a desert fox mid-journey would read as two different foxes. Portraits are a face, a place view
 * is a place, a mark is a glyph. Those ask for one image and get `art(folder, name)`, which is take
 * one and stable.
 *
 * Sorted, so the order a filesystem happens to return files in cannot change which take a given
 * seed picks. Without that, the same journey would show different paintings on two machines, which
 * is the determinism rule broken by an accident of `readdir`.
 */
const byFolder = new Map<string, Map<string, string[]>>();
for (const [path, url] of Object.entries(files)) {
  // `./scenes/rest-camp.png` -> folder `scenes`, name `rest-camp`.
  // `./scenes/rest-camp.2.png` -> the same name, a second take.
  const parts = path.split('/');
  const folder = parts[parts.length - 2];
  const file = parts[parts.length - 1]!.replace(/\.[^.]+$/, '');
  // A trailing `.<digits>` is a take number, not part of the name. Anything else stays: a plate
  // named after a species with a dot in its id would otherwise lose half of itself.
  const name = file.replace(/\.\d+$/, '');
  if (!folder) continue;
  const within = byFolder.get(folder) ?? new Map<string, string[]>();
  within.set(name, [...(within.get(name) ?? []), url].sort());
  byFolder.set(folder, within);
}

/**
 * Every painting there is of this thing, in a stable order. Empty when there are none.
 *
 * **The naming is `<name>.png`, then `<name>.2.png`, `<name>.3.png`.** A take number is a trailing
 * `.<digits>` before the extension and is not part of the name, so `rest.2.png` is a second night
 * and `rest-camp.2.png` is a second night at a camp. Everything else in the filename still means
 * what it meant: `rest-camp` is the shelter variant, `stoop-mountains` the ground.
 *
 * Meaningful in `scenes/` and `events/` only — see above. A `.2` in any other folder is parsed the
 * same way and then never chosen, which is a file that will not draw; `test/artKept.test.ts` fails
 * on it rather than letting it sit there.
 */
export function artTakes(folder: string, name: string): readonly string[] {
  return byFolder.get(folder)?.get(name) ?? EMPTY;
}
const EMPTY: readonly string[] = Object.freeze([]);

/**
 * One painting of this thing, or null — which is the usual answer and not a problem.
 *
 * Null is the whole contract. Every caller has a fallback it draws instead, and that is a design
 * commitment rather than defensive coding: canon holds a few hundred species and one painted plate
 * is a good session's work, so the set will never be complete and no panel may wait for it.
 *
 * **`pick` chooses between takes and must be seeded, never random.** The determinism rule in this
 * codebase is absolute — the same seed must produce the same world and the same journal text — and
 * a painting is part of what a player sees. Callers pass a `tileHash`, like every other choice the
 * game makes. Omitted, the first take is used, which is what every caller did before there were
 * two of anything.
 */
export function art(folder: string, name: string, pick = 0): string | null {
  const takes = artTakes(folder, name);
  if (takes.length === 0) return null;
  // `>>> 0` rather than `Math.abs`: a hash is unsigned by intent and a negative pick would index
  // backwards off the end and return undefined, which reads as "no art" rather than as a bug.
  return takes[(pick >>> 0) % takes.length]!;
}

/**
 * The same, trying each name in turn.
 *
 * For art that narrows: a night at a camp before a night in general, `make-firing` before the
 * plain making scene. The fallback chain is the caller's to state, because only it knows which
 * way the narrowing runs.
 */
export function firstArt(
  folder: string,
  names: readonly (string | null | undefined)[],
  pick = 0
): string | null {
  for (const name of names) {
    if (!name) continue;
    const found = art(folder, name, pick);
    if (found) return found;
  }
  return null;
}

/**
 * How many images a folder holds, counting every take.
 *
 * Takes rather than names, because this answers "how much art is there" and two paintings of a
 * night are two paintings. `artNames` answers the other question.
 */
export function artCount(folder: string): number {
  let n = 0;
  for (const takes of byFolder.get(folder)?.values() ?? []) n += takes.length;
  return n;
}

/** Which art folders exist and have something in them. For the manifest test and for tooling. */
export function artFolders(): string[] {
  return [...byFolder.keys()].sort();
}

/**
 * Every name a folder holds, sorted.
 *
 * For the tests that check a folder against the thing it draws -- a portrait naming nobody, a
 * plate naming no species. Those checks are the only thing that can see a file under the wrong
 * naming convention, which matches nothing, throws nothing, and quietly keeps drawing the
 * fallback. An empty or absent folder gives an empty list rather than throwing, because that is
 * the state every art queue starts in.
 */
export function artNames(folder: string): string[] {
  return [...(byFolder.get(folder)?.keys() ?? [])].sort();
}
