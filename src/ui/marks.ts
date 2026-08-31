// Which parts of the making layer have a drawn mark, and where it is.
//
// The sister of `plates.ts`, and deliberately the same shape: **adding a mark takes no code.**
// Drop a file into `src/ui/marks/` named after the thing it draws — `fibre.png`, `grinding.png` —
// and it appears. Nothing to register, no list to keep in step. A list is one more thing to drift,
// and this project has paid for that kind of drift more than once.
//
// **Forty-seven files is the whole set, not two hundred and seventeen.** Canon marks the making
// layer by *category* rather than by entity: 20 material classes, 10 item kinds, 17 processes. All
// 61 materials, 74 items and 82 recipes are covered by those, because a recipe wears the mark of
// what it makes and a material the mark of what it is. That is what makes hand-drawing the set
// tractable at all — and it is a decision `ThingIcon` already made, for reasons written there.
//
// **Nothing is blocked while a mark is missing.** `ThingIcon` draws an emoji for every category
// today and keeps doing so; a drawn mark replaces one, individually, whenever it arrives. So these
// can come in any order and any quantity, from an icon pack or an image model or a pen, and each
// one takes effect the moment the file lands.
//
// The name is the **canon vocabulary word with its namespace in front**: `class-fibre`,
// `kind-tool`, `process-grinding`. Those words are pinned two ways between
// `material_classes.json`, the `kind` enum and the types in `content/making.ts`, so a filename
// built from one cannot quietly mean nothing. Naming a file after the canon id instead looks right
// and matches nothing at all, which is the mistake `plates.ts` records making the first time it
// was wired up.
//
// **The prefix is not decoration, and dropping it was the first version of this file.** The three
// vocabularies overlap: `physic` is both a material class -- the bitter bark, scraped and dried --
// and an item kind, the remedy made from it. `ThingIcon` already draws them differently and is
// right to: the stuff and the thing made of it must never share a glyph, at exactly the moment a
// player is learning they are not the same. A flat map keyed on the bare word would have silently
// given one of them the other's picture. Forty-six distinct words across three namespaces, one
// collision, and it is in the pair where the confusion would matter most.
//
// See `docs/mark-prompts.md` for what to ask an image model for, and which to do first.

/**
 * Every mark in the folder, keyed by the vocabulary word it draws.
 *
 * `eager` for the same reason as the plates: these are looked up during render, and a component
 * deciding *now* whether to draw a picture or an emoji cannot await a promise. Forty-seven small
 * files at most; Vite emits them as ordinary hashed assets and the browser fetches only the ones
 * actually rendered.
 *
 * SVG is admitted alongside the bitmap formats, and is the better choice here — a mark is a line
 * drawing at 20px, which is exactly where a bitmap has to ship at three sizes and an SVG does not.
 */
const files = import.meta.glob<string>('./marks/*.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const byWord = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const word = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  byWord.set(word, url);
}

/**
 * The drawn mark for a vocabulary word, or null — which is the usual answer and not a problem.
 *
 * The namespace is required rather than inferred, because `physic` is a legal word in two of them
 * and means two different things. A caller always knows which it is rendering.
 */
export type MarkKind = 'class' | 'kind' | 'process';

export function markFor(namespace: MarkKind, word: string): string | null {
  return byWord.get(`${namespace}-${word}`) ?? null;
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function markCount(): number {
  return byWord.size;
}
