// The painted scene behind an activity, and where it comes from.
//
// Modelled on `plates.ts` exactly, for the reason that file gives: **adding art must take no
// code.** Drop a built PNG into `src/ui/scenes/` named after the gesture -- `stoop.png` -- and it
// appears. No list, no registration, nothing to keep in step.
//
// Where this differs from a species plate is what it is *of*. A plate is one animal against a
// suggestion of habitat; a scene is a pair of hands at work, and the traveller is in it. That is
// what makes the modal read as an activity rather than as a bestiary entry that happens to have a
// button.
//
// **Three files is the whole set**, against 297 species -- so unlike plates, this can actually be
// finished, and the fallback matters less. It exists anyway: a gesture with no painting still
// opens, still plays, and simply has no picture. Nothing is blocked on art.

/**
 * Every activity scene in the folder, keyed by gesture.
 *
 * `eager` for the same reason plates are: the modal decides during render whether it has a
 * painting, and a component that must answer now cannot await a promise. Three images at ~100 KB
 * is a rounding error against the terrain sheets.
 */
const files = import.meta.glob<string>('./scenes/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const byGesture = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const id = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  byGesture.set(id, url);
}

/**
 * The painted scene for this gesture, or null — which is legal and simply means no picture yet.
 *
 * `variant` narrows it where one gesture happens in more than one kind of place. Resting is the
 * case that has one: a night under a mat on open ground and a night at a camp with a fire and
 * animals are different nights, and the game already models four shelter kinds -- so a single
 * painting was flattening a distinction canon and the rules layer both make.
 *
 * It falls back to the plain gesture, so adding `rest-roof.png` later is a file and no code, and
 * a variant with no painting is not an error.
 */
export function sceneFor(gesture: string, variant?: string | null): string | null {
  if (variant) {
    const narrowed = byGesture.get(`${gesture}-${variant}`);
    if (narrowed) return narrowed;
  }
  return byGesture.get(gesture) ?? null;
}
