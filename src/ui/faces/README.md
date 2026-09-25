# Stranger faces

A **pool** of anonymous faces, dealt out to the road company — the carriers, drovers and pilgrims
the game puts on every map and canon never wrote down. Every other folder beside this one is looked
up by the name of what it depicts; this one is not. A face here belongs to nobody in particular
until `StrangerFace.tsx` deals it to somebody.

**Empty, and nothing waits for it.** Until a face lands, a stranger is drawn from their own look —
their skin, the headwear their body wears, and their clothes in the same dyes as the figure walking
the map (`src/content/looks.ts`). A painted face replaces that the moment the pool holds one.

## Naming

`<culture>-<f|m>-NN.png` — `harappan-m-03.png`, `kia-f-01.png`, `maru-m-02.png` — or `any-NN.png`
for a face that could be anybody. The culture is canon's id, one of the three peoples strangers
are drawn from (`STRANGER_CULTURES` in `src/content/travellers.ts`). `test/faces.test.ts` refuses
any other name, because a misnamed face matches no people and is never dealt.

Build them from `assets/source/faces/` with `node tools/build-plates.js --faces`.
`docs/face-prompts.md` has a ready-to-paste prompt for each of the twenty-two.

## How a face is chosen

From the stranger's own people's faces and the `any-` ones, by rendezvous hash of who they are
(`weightedPickFor` in `world/rng.ts`). So the same carrier has the same face on every machine and
every reload, and adding a face changes only the strangers it outright wins. A people with no
faces yet is dealt the `any-` ones; with none of those either, the drawn face.

The gender in the name is the painting's and goes no further: event prose calls a stranger *they*.

## What they are of

A head and shoulders, the same register and size as `src/ui/portraits/` (square, 256px after
`node tools/build-plates.js --portraits`, which squares, strips a frame and resizes). Working people
of the road in plain period dress — no wise elders, which `PersonPortrait.tsx` explains, and no
face that could be mistaken for one of canon's named people.

**Once accepted, a face is kept.** Add it to `src/ui/art-kept.json` like every other piece of art.
