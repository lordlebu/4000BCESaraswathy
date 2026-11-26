# Stranger faces

A **pool** of anonymous faces, dealt out to the road company — the carriers, drovers and pilgrims
the game puts on every map and canon never wrote down. Every other folder beside this one is looked
up by the name of what it depicts; this one is not. A face here belongs to nobody in particular
until `StrangerFace.tsx` deals it to somebody.

The traveller’s seeded look supplies skin, headwear and garment colours for both the map figure
and the portrait. Each eligible painting has appearance metadata in `StrangerFace.tsx`. The
illustrated portrait uses the same look when no painting matches.

## Naming

`<culture>-<f|m>-NN.png` — `harappan-m-03.png`, `kia-f-01.png`, `maru-m-02.png` — or `any-NN.png`
for a face that could be anybody. The culture is canon's id, one of the three peoples strangers
are drawn from (`STRANGER_CULTURES` in `src/content/travellers.ts`). `test/faces.test.ts` refuses
any other name, because a misnamed face matches no people and is never dealt.

Build them from `assets/source/faces/` with `node tools/build-plates.js --faces`.
`docs/face-prompts.md` has a ready-to-paste prompt for each of the twenty-two.

## How a face is chosen

Match headwear, skin and the visible garment dyes, then prefer matching paintings from the
stranger’s own culture. The selector uses the stable traveller id and given name to choose among
compatible paintings. Give an approved painting metadata when its dress matches a map body.

The gender in the name is the painting's and goes no further: event prose calls a stranger *they*.

## What they are of

A head and shoulders, the same register and size as `src/ui/portraits/` (square, 256px after
`node tools/build-plates.js --portraits`, which squares, strips a frame and resizes). Working people
of the road in plain period dress — no wise elders, which `PersonPortrait.tsx` explains, and no
face that could be mistaken for one of canon's named people.

**Once accepted, a face is kept.** Add it to `src/ui/art-kept.json` like every other piece of art.
