# Making-layer marks

Drop a file here and it appears. Nothing to register.

**Name it `<namespace>-<word>`**, where namespace is `class`, `kind` or `process` and word is
canon's own vocabulary word:

    class-fibre.svg      class-stone.svg      class-physic.svg
    kind-tool.svg        kind-container.svg   kind-physic.svg
    process-grinding.svg process-retting.svg

The namespace prefix is required because **`physic` is both a material class and an item kind** —
the bitter bark, and the remedy made from it. They must not share a picture.

SVG is preferred: a mark is a line drawing at 20px, which is where a bitmap needs three sizes and
an SVG needs one. If it uses `currentColor` for its strokes it will theme itself for free, the way
`ShelterMark.tsx` does.

Nothing breaks while these are missing. `ThingIcon` draws an emoji for every category and a file
here replaces one, individually, whenever it lands.

Forty-six files is the complete set. See `docs/mark-prompts.md` for what to ask an image model
for, and which to do first.
