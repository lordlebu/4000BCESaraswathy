# Activity scenes

Three paintings, one per gesture: `stoop.png`, `stalk.png`, `work.png`.

Drop a built PNG in here and it appears — `src/ui/scenes.ts` globs this folder, exactly the way
`plates.ts` globs the species plates. No list to update, no code to change.

Unlike the 297 species plates, **this set can actually be finished**, so there is no queue and no
priority order. A gesture with no painting still opens, still plays, and simply shows a blank
parchment panel where the picture goes.

## What they are of

A species plate is one animal against a suggestion of habitat. A scene is **a pair of hands at
work** — the traveller is in it. That difference is what makes the modal read as an activity
rather than as a bestiary entry that happens to have a button.

| File | The moment |
|---|---|
| `stoop.png` | cutting or digging a plant — patient, close, both hands busy |
| `stalk.png` | moving low through cover toward an animal at a distance |
| `work.png` | striking stone with a hammerstone, chips flying |

A stalk prefers the **animal's own plate** when one exists — the animal is the subject — and falls
back to `stalk.png`. So `stalk.png` is the least urgent of the three.

The prompts are in `docs/activity-scene-prompts.md`.
