# Shoreline plan — an embossed bank, not a dissolved one

The shore is the last hard edge on the map. Every other boundary was softened in phase 07: two
biomes meeting bleed into each other through a torn mask, a height terrace grows a rock face, a
forest grows a treeline. Water was deliberately left out of all three, and what it has today is what
an opaque square gives you — a 128-pixel staircase between the ground and the water, with nothing on
either side of it.

This is the plan to fix that **without reopening the ruling that put it there**.

## The ruling this lives under, and why it is not in the way

`docs/endgame-plan.md` closed item 4 with a decision:

> **Water edges stay hard.** Item 4 wanted land dissolving into water. `blends()` in
> `src/game/frames.ts` deliberately excludes every land/water boundary — *"a shore is a line, and
> should stay one"* — so the dissolve is off the table.

That decision is correct and stays. Bleeding plains out over the sea turns a definite edge into a
vague one, and a coastline is the one boundary on the map that is genuinely definite: it is where
the land stops.

**An emboss is the opposite operation to a dissolve, and that is the whole idea here.** A dissolve
makes the line less certain. An emboss makes it *more* certain and moves it out of the plane: the
land keeps its exact outline, and the water beside it is modelled as a surface lying **below** that
outline, with a lit lip on the land side and the bank's shadow falling into the water. Nothing
bleeds across. The shore is still a line — it is a line with a thickness, a light side and a dark
side, instead of a cut between two flat colours.

Everything else on the map already works this way. `cliffAt` says exactly this about height and
`treelineAt` about forest: a ground texture shows what the ground is *made of*, and a drop is a
property of the boundary. A bank is a drop of about a metre. It gets the same treatment as a drop of
thirty, in the same slot, with shorter art.

So the two rulings sit together cleanly:

| | What it does to the outline | Verdict |
|---|---|---|
| The dissolve (declined) | makes the land's outline uncertain | stays declined |
| **The emboss (this plan)** | keeps the outline exactly and gives it relief | the work below |

This plan also takes over the other half of that item — **the shoreline pass**, parked as *"reeds
and foam on the land side of every water edge. Code, no art."* It is stage 3.

## What is there now, measured

Counted over all four field maps at their authored seeds, on the tiles a player can actually reach:

| Map | Size | Objects in the plan | Land→water edges | Land tiles touching water | Water tiles touching land |
|---|---|---|---|---|---|
| Lothal | 48×48 | 5,105 | **693** | 539 (23.4%) | 428 |
| Aravali | 64×64 | 7,570 | 623 | 466 (11.4%) | 432 |
| Narmada | 64×64 | 9,816 | 281 | 217 (5.3%) | 140 |
| Dwarka | 48×48 | 5,186 | 115 | 103 (4.5%) | 52 |

Two things in that table decide the design.

**Lothal is the map this is for.** Nearly a quarter of its tiles stand on a shore, its river is 495
of the 693 edges, and it is the map that teaches looking. Dwarka has no sea at all since it was
dried out, so every one of its 115 edges is a riverbank.

**The four directions are almost evenly split** — on Lothal, n 181 / e 154 / s 194 / w 164. There is
no "the shore mostly faces south" shortcut to be had; all four edges need art.

And the land on the far side of the line is not one material:

| Map | What the land side actually is |
|---|---|
| Lothal | plains 278, coast 208, wetland 108, forest 79, hills 11, settlement 7, landmark 2 |
| Aravali | coast 437, forest 88, plains 49, **sky_underside 35, sky_island 14** |
| Narmada | plains 241, forest 35, settlement 3, hills 2 |
| Dwarka | plains 100, coast 9, desert 5, settlement 1 |

The sky rows are the reason a shore predicate cannot simply be "not water". The Aravali crossing
puts a sky island and its underside over a strait; a sand beach along the rim of a floating island
is nonsense, and 49 edges would have got one.

## The design: three bands, and the eye crosses all three

Today the eye crosses **two** values — ground, then water. The whole improvement is that it crosses
five, over about two thirds of a tile:

```
   grass  →  ragged bank lip  →  the waterline  →  the bank's shadow  →  open water
            (land tile)         (the shared edge)  (water tile)
```

Each of those is one stage below, each ships on its own, and each is measurable by itself.

### Stage 1 — the shadow in the water

**One sprite per water-side shore edge**, drawn inside the water cell against the edge it shares
with land: darkest where it meets the bank, gone by about a third of a cell out, with a ragged inner
contour so it does not read as a painted stripe.

This is the stage that does the "below the land" work, and on its own it is most of the effect.
Water that carries the shadow of what it is beside stops being a blue square and becomes a surface
at a lower level.

- **Predicate.** `shoreAt(here, there)` in `frames.ts`, next to `cliffAt` and `treelineAt` and the
  same shape: `WATER.has(here) && !WATER.has(there) && !SKY.has(there)`. `WATER` already exists.
  `blends()` and `cliffAt()` are **not touched**.
- **Placement.** `planShore(world)` in `scenePlan.ts`, emitted after `planEdges` and before
  `planCliffs` — it is ground, and it draws over the sea/river blend that `planEdges` may already
  have put there. Depth is a flat `SHORE_DEPTH = 60`, above the edge blend's 50 and below the
  row-sorted band at 100, for the reason `planEdges` gives: this is ground, and row-sorting it would
  let a shadow from the row below draw over something standing in the row above.
- **The texture is baked, not painted.** `shoreTextureKey(scene, edge, maskFrame)` in
  `tileTextures.ts`, alongside `blendTextureKey` and built the same way: fill a gradient, then
  `destination-in` the torn mask so it only shows where the tear allows. Sixteen textures at most
  (four edges × four variants), built lazily at scene start.
- **The tear is already drawn.** `assets/edges.png` is exactly four edges × four variants of ragged
  alpha reaching a third of a cell, with a per-column depth between 10% and 100% of that. Reusing it
  costs nothing and makes the shore ragged in the same visual language as every other boundary on
  the map. The variant comes from `tileHash(seed, x, y, 'shore-<edge>')` — the same determinism the
  other two rims use.
- **Rule §1 of `docs/art-direction.md` says generate this rather than prompt it.** A gradient under a
  mask is a mass a loop can state exactly; the rule's failures were all silhouettes.

### Stage 2 — the bank lip on the land side

**One sprite per land-side shore edge where the land is not already sand**: a band of beach material
inside the land cell, ragged on its landward contour, so the ground does not run to the waterline as
grass.

Mechanically this is an ordinary edge blend whose source is a **third** biome — the `coast` tile,
drawn into a plains or forest cell through a torn mask. Nothing bleeds across the water line; the
land grows a beach on its own side of it. `blendTextureKey` already bakes exactly this pair, so the
naive version of this stage is a placement record and a lookup table.

The table is what keeps it honest:

| Land biome | Bank material | Why |
|---|---|---|
| plains, forest, hills, settlement, landmark, desert | `coast` | silt and sand is what a bank is |
| **coast** | none | it is already the beach; the shadow alone |
| **wetland** | none | a marsh has no beach — it gets reeds in stage 3 |
| **sky_island, sky_underside** | none | not a shore at all |

That table is not tidiness: it cuts the stage from 693 sprites to **377** on Lothal, 137 on Aravali,
281 on Narmada, 106 on Dwarka — because coast and wetland are 316 of Lothal's 693 edges and sky is
49 of Aravali's.

### Stage 3 — the shoreline pass (the parked item)

Reeds, driftwood and shells on the **land** side of a water edge, from props that already exist on
the decor sheet: `reed-tuft` and `marsh-stone` against a river, `pebbles`, `shell` and
`driftwood-small` against sea. One extra prop on a land tile that touches water, chosen from a shore
set rather than the tile's own biome set.

This is a change to `planDecor`'s prop choice for 539 tiles at worst, no new art, no new layer, and
it is the half of endgame item 4 that was always live. It is listed third because stages 1 and 2 may
well be enough, and a prop is the easiest thing here to overdo.

### Stage 4 — painted rim art, **only if 1–3 do not carry it**

If the generated bands read as a graphic rather than a bank, the fallback is a third rim sheet:
`shore.png`, one more row in `SHEETS` in `tools/build-rims.js`, a shallow `DEPTH`
(`{ n: 0.12, e: 0.14, s: 0.30, w: 0.14 }` — a bank is a berm, not a wall), and a 4×4 chroma-keyed
source from an image model.

**This stage is deliberately last and deliberately optional.** It is the only part that needs an
image-model round trip, and the plate queue in `docs/plate-prompts.md` is the standing claim on that
time. Do not start it until stages 1–3 have been looked at.

## The cost, and the number that decides the shape

Fill rate is what scales, not object count (`docs/rendering.md`). So the question the rendering doc
tells you to ask — *what fraction of its cell is actually opaque?* — is the design question here,
and the answer sets the texture size.

Densest on-screen count, measured as the worst 24×18 tile window on each map:

| Map | Worst 10×7 | Worst 20×14 | Worst 24×18 |
|---|---|---|---|
| Lothal | 46 | 117 | **172** |
| Aravali | 32 | 84 | 112 |
| Narmada | 38 | 77 | 95 |
| Dwarka | 25 | 54 | 73 |

At 172 sprites on screen:

| Shape | Pixels blended per frame | Against the decor precedent |
|---|---|---|
| Full 128 cell | 2.82 M | 47% of the mistake that doubled the frame |
| **128×48 band** | **1.06 M** | 17% |

The decor layer at ~370 props in full cells was 6.06 M blended pixels and cost 83 ms against 67 ms
on CI's software rasteriser; moving it to a 64 cell fixed it. That is the whole argument for baking
the shore band at **128×48 for n/s and 48×128 for e/w** rather than a full cell — the mask reaches a
third of 128, which is 43 pixels, so 48 holds all of the art and none of the empty.

The cost of that choice is one small thing in the scene: a band is not centred in its cell, so
`WorldScene` needs a four-entry origin table (`n → (0.5, 0)`, `s → (0.5, 1)`, and so on) and the
placement carries an `edge`. That is a pixel position, which is the scene's business — the plan says
which edge, the scene knows where the top of a cell is.

### The budget gate

The thing most likely to disrupt other work here is not the look, it is the browser job. A
walk-heavy spec has ninety seconds and already spends most of it rendering at 67 ms a frame.

So, per stage, and not negotiable:

1. `npm run perf -- --save` **immediately before** the change, then `npm run perf` after. The noise
   floor is 20%; a baseline recorded an hour ago measures the laptop warming up.
2. `npm run test:ci` — the whole browser suite at 4 CPUs and 16 GB. Not `npm run test:e2e` on the
   dev machine, which is the measurement that let three commits out against a failure nobody could
   reproduce.
3. If a stage costs more than ~10% of the frame on the software rasteriser, shrink the band before
   shipping it, not after.

## What this plan does not touch

The requirement was that it not disturb work already under way. It is written to touch nothing that
any other open thread reads:

| Not touched | Which work that protects |
|---|---|
| `src/world/**` — every file | the seed contract; the three terrain-generation complaints in `docs/world-generator.md` are about hills, cliff rims and Dwarka's crossing cost and stay exactly as they are |
| `SAVE_VERSION` in `src/save.ts` | no world change means no saved journey is discarded; it stays at 7 |
| `blends()`, `cliffAt()`, `treelineAt()` | the existing edge, cliff and treeline tests, and the "water edges stay hard" ruling itself |
| `data/canon/**`, `canon.lock.json`, and the whole `SouthOfTethys` repository | `npm run check:data`; nothing here is a fact about the world. A shore's shadow is a view, and views belong on this side of the line |
| `assets/**` in stages 1–3 | no image-model time, so no contention with the species plate queue; no new sheet, so no `MAX_TEXTURE_SIZE` risk and no change to `test/frames.test.ts` |
| `package.json` | no new dependency; the runtime is still React and Phaser |
| `data/biomes.json` | colours, walkability and travel costs are unchanged, so nothing in `content/` or the journal moves |

And the branch discipline: **all four stages go on one branch and one pull request**, because the
browser suite is slow and this repo has already paid for four branches that should have been one.

## Tests

A new `test/shore.test.ts`, run against all four real field maps rather than a fixture — the same
argument `test/scenePlan.test.ts` makes:

- every land/water boundary emits **exactly one** shadow band, on the water side;
- **no** shore placement where both sides are water, or where either side is a sky biome;
- a bank lip appears only where the table above allows one, and never on `coast` or `wetland`;
- shore depth is below `GROUND_DEPTH_BASE`, so it is ground and cannot draw over a hut;
- the same seed produces the same placements, in the same order.

Nothing new in `e2e/`. The playthrough walk already crosses both of Lothal's water bodies, which is
what would catch a texture that failed to bake.

## What was considered and is not being done

- **Blending land into water.** That is the declined dissolve, and reversing it is a design decision
  for the repository owner, not a rendering change.
- **A cliff rim along the bank.** This was effectively tried: before `cliffAt` excluded water, height
  alone put a rock face on **83 of Lothal's 234 faces** touching water, and turned a river valley
  into a stone-lined canal. A bank is not a cliff and must not be drawn with the cliff sheet.
- **Per-sprite Phaser masks.** A `BitmapMask` costs a framebuffer and a second render pass per
  object, and a `GeometryMask` cannot express an alpha gradient at all. Bake the pair, as
  `blendTextureKey` already does.
- **Generating a beach ring in `world/`.** Classifying a band of `coast` around every water body
  would look right and would change every map from every seed, discard every saved journey, and land
  in the middle of the terrain-generation complaints. The shore is a drawing problem.
- **A full-screen water pass or shader shimmer.** The vignette was built, measured at 24% of the
  frame in software, and removed. A second full-screen pass is the one lever `docs/rendering.md`
  says not to reach for.

## What could still go wrong

- **A river is walkable.** `data/biomes.json` marks `river` walkable and the player fords one. If the
  shadow reads as a drop rather than a bank, wading into it looks wrong — so keep the band shallow
  and light, and check it by walking in rather than by looking at a screenshot.
- **Decor floats over the shadow.** Lily pads on a shore tile are row-sorted at `underfoot` (depth
  ≥ 100) and the shadow sits at 60, so a pad inside the shaded band will not be shaded. Accept it
  first — suppressing decor on shore water tiles would cost 428 of Lothal's props, which is worse.
- **Dusk.** The sky tint is a full-screen rectangle above everything, and a dark band under a dark
  tint can go muddy. Look at a shore at dusk and at `FOG_REMEMBERED`, not only at noon.
- **The bands are drawn on different tiles**, so their two ragged contours never overlap and there is
  no double-outline risk — but they do both start from the same straight shared edge, and if both are
  cut too shallow that straight edge is still what the eye finds. The bank lip is what breaks it;
  stage 2 is not optional decoration.

## Effort

| Stage | Estimate | Ships on its own |
|---|---|---|
| 0 · baseline: `perf --save`, a screenshot of the same three shores on each map | half a session | — |
| 1 · the shadow in the water | one session | yes, and it is most of the effect |
| 2 · the bank lip | one session | yes |
| 3 · the shoreline props | half a session | yes |
| 4 · painted rim art | one session plus a generation round trip | only if 1–3 fall short |

Two to three sessions for a shore that reads as a bank, and a fourth only if the generated version
is not good enough — which, by rule §1, it usually is for a mass and usually is not for a silhouette.
