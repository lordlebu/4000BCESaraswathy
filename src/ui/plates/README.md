# Painted species plates

**This folder is written by a build step. Do not drop generated art in here** — put it in
`assets/source/plates/` and run:

```bash
node tools/build-plates.js
```

That squares the image, strips a painted frame if a tool added one, resizes to 384px, and writes
the file here under the right name. Nothing else to do: no list to update, no code to change.

    assets/source/plates/Gemini_plate-desert-fox.png   ->   src/ui/plates/desert-fox.png

## Why it matters where they go

`src/ui/plates.ts` globs *this* directory, so anything sitting here is bundled. A raw straight from
an image model is 2–8 MB against the ~100 KB of a built plate, and it lands under a name like
`gemini_plate-desert-fox` that no species will ever look up — so it ships megabytes and draws
nothing. That has now happened twice, which is why `test/platesFolder.test.ts` fails on it.

**The name is the engine id, not canon's.** Canon calls it `fauna_desert_fox`; the adapter turns
that into `desert-fox` — prefix dropped, underscores to hyphens — and that is what the file must be
called. The build works this out from the source file name, so it is only worth knowing when
something goes wrong.

Anything without a plate keeps its derived silhouette, which is the point of having one — see
`src/ui/SpeciesIcon.tsx`. The queue worth painting first, the prompts for it, and what to change
per image model are in `docs/plate-prompts.md`.
