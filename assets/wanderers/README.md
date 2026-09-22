# Painted animals for the overworld

One still picture per species, named after its **engine id** — the id the canon bundle uses, with
the `fauna_` prefix dropped and underscores turned into hyphens.

```
assets/wanderers/narmada-walking-whale.png
```

Drop the file in and it appears. Nothing to register: `src/game/wandererArt.ts` globs this folder,
`WorldScene.wandererTexture` prefers a painting over the generated stand-in, and the browser check
in `e2e/wanderers.spec.ts` goes on passing either way.

## What to draw

**One image, facing right.** Not a sheet and not a sequence — the engine mirrors it for the other
direction. Asking a painter for a sequence is a mistake this repository has already made and
written down: a six-cell sheet came back pixel-identical in every cell.

**Side on, standing on the ground.** The sprite is anchored at the bottom centre
(`setOrigin(0.5, 1)`), so the animal's feet belong at the very bottom edge of the image. A gap
there draws the animal floating above the grass, which is a fault that has shipped here before.

**A cell's size is its size on screen.** `WorldScene` never calls `setDisplaySize` on these, so
whatever you paint is what appears. A tile is 128 pixels. The stand-in is 192 × 84 — about a tile
and a half long and two thirds of a tile tall — which is roughly right for a three-metre animal
beside a person who is one tile tall. Bigger than about two tiles and it reads as a landmark rather
than as something you can walk up to.

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
