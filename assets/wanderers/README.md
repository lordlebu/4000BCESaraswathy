# Painted animals for the overworld

One still picture per species **per facing**, named after the engine id — the id the canon bundle
uses, with the `fauna_` prefix dropped and underscores turned into hyphens — then the facing.

```
assets/wanderers/narmada-walking-whale-right.png
assets/wanderers/narmada-walking-whale-left.png
assets/wanderers/narmada-walking-whale-down.png
assets/wanderers/narmada-walking-whale-up.png
```

**Fewer is fine.** `facingArt` falls back along a chain, so an animal with only a right view is
drawn facing right whichever way it walks — better than not drawn at all. A bare
`<id>.png` with no facing still works and answers for every direction.

**The usual way in is a sheet.** Drop one image holding all four views in `assets/source/dump/`,
add its id to `SHEETS` in `tools/build-wanderers.js`, and run it — the frames are found by flooding
connected pixels rather than cut on a grid, because the three sheets that exist are a row of four,
a 2x2, and a row whose middle two animals touch.

Drop the file in and it appears. Nothing to register: `src/game/wandererArt.ts` globs this folder,
`WorldScene.wandererTexture` prefers a painting over the generated stand-in, and the browser check
in `e2e/wanderers.spec.ts` goes on passing either way.

## What to draw

**Four still views: right, left, down, up.** Not a walk cycle — nothing is animated, and asking a
painter for a *sequence* is a mistake this repository has already made and written down (a six-cell
sheet came back pixel-identical in every cell). Four distinct viewpoints of a standing animal is a
different ask and it works.

**Side on, standing on the ground.** The sprite is anchored at the bottom centre
(`setOrigin(0.5, 1)`), so the animal's feet belong at the very bottom edge of the image. A gap
there draws the animal floating above the grass, which is a fault that has shipped here before.

**Paint at any size; the game scales from the side view.** An animal is `WANDERER_LONG` tiles
long side-on — two, since the sivatherium was met at a traveller's height and read as a fawn at
Varuna's knee. `sizeWanderer` scales the `-right` view to that length and draws every other facing
at the same height, letting its width fall where it may. That is deliberate: scaling each frame to
*fit a box* made a long side view shrink while the narrow front view of the same animal did not, so
a whale was three times bigger walking towards you than walking across.

**So the side view's proportions set the size.** A repainted animal that changes shape changes how
tall it stands. `test/wanderers.test.ts` holds each painting to two tiles and fails by name if the
stand-in's `tall` in `frames.ts` no longer matches the new art.

**Transparent background**, not white and not magenta. Alpha zero renders as white in some
previews, so check the corner pixels are actually `rgba(0,0,0,0)` before sending it.

## After it lands

Add the path to `src/ui/art-kept.json` — `test/artKept.test.ts` fails by name in both directions,
and art is never deleted here. A better painting of the same animal is added as a second take
(`narmada-walking-whale.2.png`) rather than replacing the first.

Then look at it in the game before believing it:

```bash
npx playwright test e2e/wanderers.spec.ts
```
