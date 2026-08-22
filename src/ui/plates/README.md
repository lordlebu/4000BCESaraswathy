# Painted species plates

Drop a plate in here named after the species and it appears in the field notes. Nothing else to
do — no list to update, no build step.

    desert-fox.png
    neem.png

`png`, `webp` and `jpg` all work.

**The name is the engine id, not canon's.** Canon calls it `fauna_desert_fox`; the adapter turns
that into `desert-fox` — prefix dropped, underscores to hyphens — and that is what to name the
file. Getting this wrong matches nothing and fails silently.

    node -e "console.log(require('./src/content/canon.ts'))"   # no — it is TypeScript
    # just lower-case the species name and hyphenate it: Desert Fox -> desert-fox

Anything without a plate keeps its derived silhouette, which is the point of having one — see
`src/ui/SpeciesIcon.tsx`. The queue worth painting first, and the prompts for it, are in
`docs/plate-prompts.md`.
