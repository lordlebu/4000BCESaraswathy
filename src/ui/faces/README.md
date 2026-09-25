# Stranger faces

A **pool** of anonymous faces, dealt out to the road company — the carriers, drovers and pilgrims
the game puts on the road and canon never wrote down. Every other folder beside this one is looked
up by the name of what it depicts; this one is not. A face here belongs to nobody in particular
until `StrangerFace.tsx` deals it to somebody.

**Empty, and nothing waits for it.** Until a face lands, a stranger is drawn from their own look —
their skin, the headwear their body wears, and their clothes in the same dyes as the figure walking
the map (`src/content/looks.ts`). A painted face replaces that the moment the pool holds one.

## Naming

Anything, as long as it is not somebody's name: `face-01.png`, `face-02.png`. The name is never
looked up, only sorted, so what it says does not matter — but a file called `thrali.png` would read
as a portrait in the wrong folder, and `src/ui/portraits/` is where Thrali lives.

## How a face is chosen

By rendezvous hash of the stranger's id (`weightedPickFor` in `world/rng.ts`). So the same carrier
has the same face on every machine and every reload, and adding a face to the pool changes only the
strangers it outright wins — everybody else keeps the face they had.

## What they are of

A head and shoulders, the same register and size as `src/ui/portraits/` (square, 256px after
`node tools/build-plates.js --portraits`, which squares, strips a frame and resizes). Working people
of the road in plain period dress — no wise elders, which `PersonPortrait.tsx` explains, and no
face that could be mistaken for one of canon's named people.

**Once accepted, a face is kept.** Add it to `src/ui/art-kept.json` like every other piece of art.
