# Shoreline plan — an embossed bank, not a dissolved one

**Stages 1 to 3 have shipped and merged** (PR #168). What follows is the plan as it was argued,
corrected against the map as it stands after the crossing and basalt work, with what each stage
actually cost recorded where the estimate used to be. Stage 4 is still optional and still
unstarted.

The shore was the last hard edge on the map. Every other boundary was softened in phase 07: two
biomes meeting bleed into each other through a torn mask, a height terrace grows a rock face, a
forest grows a treeline. Water was deliberately left out of all three, and what it had was what an
opaque square gives you — a 128-pixel staircase between the ground and the water, with nothing on
either side of it.

This is how that was fixed **without reopening the ruling that put it there**.

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

### The argument was accepted here before it was made here

`planIslandShadow` shipped with the Aravali crossing, and it is this plan's thesis at a hundred
metres instead of one. An island's shadow on the sea exists because *"everything else about a
floating shelf — the grass to the edge, the rock face hanging under the lip, the cliffs along the
joint — is equally true of a sea stack. What separates them is that light gets underneath one of
them, and the water below goes dark."*

A bank is the same claim at a metre, and it inherits two decisions along with it: that a shadow on
water is **a tint rather than art**, and that it **fades with distance**, because the edge of a
hard-edged shadow is a second silhouette and the eye reads it as an object.

## What is there now, measured

Counted by running the real generators over all four field maps at their authored seeds. **These
numbers are not the ones this plan was written against** — the crossing work re-shaped the Aravali
to 44×66 and moved Lothal's river — which is the argument for re-running the count rather than
quoting it.

| Map | Size | Objects in the plan | Land→water edges | Of those, an island rim | Land tiles on a shore |
|---|---|---|---|---|---|
| Lothal | 48×48 | 5,187 | **643** | 0 | 497 (21.6%) |
| Aravali | 44×66 | 3,933 | 409 | **148** | 289 (10.0%) |
| Narmada | 64×64 | 9,841 | 281 | 0 | 217 (5.3%) |
| Dwarka | 48×48 | 5,195 | 115 | 0 | 103 (4.5%) |

**Lothal is the map this is for.** Over a fifth of its tiles stand on a shore, its river is 445 of
the 643 edges, and it is the map that teaches looking. Dwarka has no sea at all since it was dried
out, so every one of its 115 edges is a riverbank.

**The four directions come out almost even** — on Lothal, n 165 / e 145 / s 178 / w 155. There is
no "the shore mostly faces south" shortcut; all four edges need art.

And the land on the far side of the line is not one material:

| Map | What the land side is, by edge count |
|---|---|
| Lothal | plains 244 · coast 211 · forest 102 · wetland 69 · hills 8 · settlement 7 · landmark 2 |
| Aravali | coast 220 · **sky_island 84 · sky_underside 64** · plains 21 · forest 17 · hills 3 |
| Narmada | plains 241 · forest 35 · settlement 3 · hills 2 |
| Dwarka | plains 101 · coast 9 · desert 4 · settlement 1 |

Those two sky rows are the reason a shore predicate cannot simply be "not water", and the reason
is stronger than it was when this plan was drafted. **The island rims already carry two
treatments**: `crossing.ts` sets the underside a band below the island top *specifically* so
`cliffAt` can see the step and fill the rim with rock, and `planIslandShadow` darkens the sea
beneath it. A bank lip and a bank shadow would be a third and a fourth on one boundary — 148 edges
of it on the Aravali, more than a third of that map's shoreline.

## The design: three bands, and the eye crosses all three

Today the eye crosses **two** values — ground, then water. The whole improvement is that it crosses
five, over about two thirds of a tile:

```
   grass  →  ragged bank lip  →  the waterline  →  the bank's shadow  →  open water
            (land tile)         (the shared edge)  (water tile)
```

Each of those is one stage below, each ships on its own, and each is measurable by itself.

### Stage 1 — the shadow in the water · **shipped**

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

**What shipped needs three passes, not two.** A gradient, then `destination-in` with the mask
strip, then *a short unmasked gradient over the first quarter of the band*. Without the third, the
contact shadow is as thin as 4 px wherever the tear happens to be shallow — the masks vary from a
tenth of their nominal reach to all of it — and a bank's contact shadow that comes and goes reads
as dirt on the screen rather than as a bank. **The ragged part has to be the fade; the contact has
to be continuous.**

### Stage 2 — the bank lip on the land side · **shipped**

**One sprite per land-side shore edge where the land is not already sand**: a band of beach material
inside the land cell, ragged on its landward contour, so the ground does not run to the waterline as
grass.

Mechanically this is an ordinary edge blend whose source is a **third** biome — the `coast` tile,
drawn into a plains or forest cell through a torn mask. Nothing bleeds across the water line; the
land grows a beach on its own side of it.

**And it is a band, which is the correction this stage needed.** This section used to end by
noting that `blendTextureKey` already bakes exactly that pair, so the naive version was "a
placement record and a lookup table". That was true, it shipped that way first, and it is what put
the layer over its own budget — 377 full cells is more blended pixel than 643 bands, so the *lip*
was the expensive half, not the shadow. A mask reaching a third of a cell cannot paint past 48 px,
so five eighths of each of those cells was a transparent quad the GPU blended anyway.
`bankTextureKey` crops it to the strip that can show. See the cost section.

The table is what keeps it honest:

| Land biome | Bank material | Why |
|---|---|---|
| plains, forest, hills, settlement, landmark, desert | `coast` | silt and sand is what a bank is |
| **coast** | none | it is already the beach; the shadow alone |
| **wetland** | none | a marsh has no beach — it gets reeds in stage 3 |
| **sky_island, sky_underside** | none | not a shore at all |

That table is not tidiness: on the map as it stands it cuts the stage from 643 sprites to **363**
on Lothal and from 409 to **41** on the Aravali, because coast and wetland are 280 of Lothal's
edges and the island rims are 148 of the Aravali's. Anything absent from the table is absent on
purpose — no lip is the safe answer, and a biome that turns out to want one is a row here rather
than a change anywhere else.

### Stage 3 — the shoreline pass · **shipped**

Reeds, driftwood and shells on the **land** side of a water edge, from props that already exist on
the decor sheet: `reed-tuft` and `marsh-stone` against a river, `pebbles`, `shell` and
`driftwood-small` against sea. One extra prop on a land tile that touches water, chosen from a shore
set rather than the tile's own biome set.

No new art, no new layer, and it is the half of endgame item 4 that was always live. It is listed
third because stages 1 and 2 may well be enough, and a prop is the easiest thing here to overdo.

**What shipped is one detail past the plan**: the prop is pushed three tenths of a cell *toward*
the water it faces rather than jittered across the cell like ordinary decor, and it is
`planShoreProps` rather than a change inside `planDecor` — the choice is about the neighbour, and
every other prop on the map is about the tile. The offset is the difference between a shore and a
shore-shaped scattering, and `test/shore.test.ts` asserts it by stepping from each prop's offset to
the tile it leans toward and requiring water there.

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

Densest on-screen count, measured as the worst 24×18 tile window on each map, counting water-side
edges:

| Map | Worst 20×14 | Worst 24×18 |
|---|---|---|
| Lothal | 125 | **163** |
| Aravali | 78 | 96 |
| Narmada | 77 | 95 |
| Dwarka | 54 | 73 |

The decor layer is the precedent: ~370 props in full 128 cells was 6.06 M blended pixels and cost
83 ms a frame against 67 on CI's software rasteriser, and moving it to a 64 cell fixed it. A mask
reaching a third of 128 is 43 px, so a 48-px band holds all of the art and none of the empty.

### What it actually measured, and the correction it forced

`npm run perf` compares against a baseline you record immediately before the change, which is not
available from a session that has already made it — so this is the A/B the same doc describes:
same commit, same seed, same 1280×900 viewport, the layer flipped in place rather than measured
against another commit, two runs a side, standing at 20,18 on Lothal, which is the densest shore
window on the map this layer exists for. **Renderer: SwiftShader** — the software rasteriser, which
is the one that decides whether the browser job stays green.

Reading the **minimum** frame, which `docs/rendering.md` argues drifts least:

| | Min frame | Against the layer off |
|---|---|---|
| Layer off | 148.9 ms | — |
| **Bank as a full cell** | 166.7 ms | **+11.9%** |
| **Bank as a band** | 163.0 ms | **+9.5%** |

The medians agree on the shape — 161.6 → 182.5 → 177.3, so +12.9% and +9.7%.

**The gate below is ~10%, so the first of those failed it**, and the diagnosis is the useful part:
the shadow was already a band and the lip was not, and there are fewer lips than shadows. 377 full
cells is 6.18 M blended pixels against 643 bands at 3.95 M — so *the cheap-looking half was the
expensive one*, precisely because "reuse `blendTextureKey` and it's a lookup table" was the
line of least resistance. `bankTextureKey` crops it, and the layer comes in under the gate.

Two honest caveats on that 9.5%. It is **the worst place on the worst map** — the same walk on the
Narmada measures 142.9 ms with the layer on, below Lothal's figure with it off — and it is **not a
lot of headroom**. If a later layer wants some of the frame back, this one's band is the obvious
place to take it: 48 → 40 px is a fifth of it, and the only thing lost is the tail of a fade.

The cost of the band shape is one small thing in the scene: a band is not centred in its cell, so
`WorldScene` needs a four-entry origin table (`n → (0.5, 0)`, `s → (0.5, 1)`, and so on) and the
placement carries an `edge`. That is a pixel position, which is the scene's business — the plan
says which edge, the scene knows where the top of a cell is.

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

**All three are now paid, though (2) was paid by CI rather than locally.** `npm run perf` launches
its own Chromium at the revision this repo pins and the session that built stages 1–3 had a
different one installed, so the A/B above was measured through the same SwiftShader rasteriser by
the method the doc describes rather than by the tool; `npm run test:ci` needs Docker, which was not
available either. What settled it was PR #168: **`check` and `browser` both green**, and then the
full suite on `main` — the one that adds the `@slow` playthrough walk, which is the walk-heavy spec
a 9.5% frame cost was most likely to push past its budget.

**What the CI clock does *not* settle.** That PR's browser job ran 21.7 minutes against a
pre-shoreline band of 9.7–19.5 for the same fast suite, which looks like a cost — but the band is
the point: the same workflow on unchanged code has varied close to twofold, and `main`'s full-suite
runs sit anywhere from 10.2 to 21.2 minutes. One sample against noise that wide is not evidence of
anything, and reading it as one would be the mistake `docs/rendering.md` names twice (the morning
67 ms that was 283 ms by evening; the ratio-against-a-reference that amplified noise instead of
cancelling it). The minimum-frame A/B above is the measurement that means something, precisely
because it was taken with everything else held still.

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

`test/shore.test.ts`, ten cases, run against all four real field maps rather than a fixture — the
same argument `test/scenePlan.test.ts` makes. Three of them are written against the lesson in
`docs/handover-crossing-and-basalt.md` about assertions that pass while being about the wrong
thing:

- exactly one shadow band per water-side edge, on the water side, facing land, never twice;
- **the Aravali's islands specifically**, counted as sky edges and asserted at zero bands and zero
  lips — a map-wide count would have passed on that map's 261 mainland edges while the islands
  quietly grew beaches;
- a lip only where the material table allows one, and never on `coast` or `wetland`;
- every shore placement below `GROUND_DEPTH_BASE`, so it is ground and cannot draw over a hut;
- the mask index on the row for the edge the band is pinned to — a tear fading the wrong way is
  invisible to every other assertion here and obvious on screen;
- props leaning toward the water rather than jittered across the cell;
- the same plan twice, so a journey stays shareable in a link;
- and that all of it **reaches `planScene`**, because this repo has three rules that were written,
  tested, and had no caller, so the mechanic did not exist in the shipped game while every test
  passed.

**One existing test had to change, and it was wrong rather than inconvenient.**
`test/scenePlan.test.ts` exempted the flat ground band from its row-sorting rules by testing
`maskFrame !== undefined` — which names the edge blend rather than the category it belongs to, and
so failed the moment a second flat-ground layer arrived. It tests `depth < GROUND_DEPTH_BASE` now,
which is the actual rule. Its shoreline assertion also had to learn that a bank is not a blend:
`blends()` is unchanged and still refuses every land/water pair, and `planBank` is a third biome
inside one cell, which is a different thing and has its own test.

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
  shadow reads as a drop rather than a bank, wading into it looks wrong — so the band is kept
  shallow and light, and it wants checking by walking in rather than by looking at a screenshot.
  Two of the four maps ford rivers constantly; Dwarka has nothing but riverbank.
- **The bands are drawn on different tiles**, so their two ragged contours never overlap and there is
  no double-outline risk — but they do both start from the same straight shared edge, and if both are
  cut too shallow that straight edge is still what the eye finds. The bank lip is what breaks it,
  which is why stage 2 was never optional decoration — and why cropping it to a band was worth
  doing properly rather than dropping it to stay inside the budget.

## Effort

| Stage | Estimated | Actual |
|---|---|---|
| 0 · baseline | ½ session | folded into stage 1; the baseline was taken by flipping the layer |
| 1 · the shadow in the water | 1 session | as estimated |
| 2 · the bank lip | 1 session | as estimated, plus the band rebake the budget forced |
| 3 · the shoreline props | ½ session | as estimated |
| 4 · painted rim art | 1 session + a round trip | **not started, and still optional** |

Whether stage 4 is ever wanted is a question for somebody looking at a shore, not for this
document. By rule §1 of `docs/art-direction.md` — *generate textures, prompt silhouettes* — a
gradient under a mask is the case a loop wins, and the three that shipped are all that case.

## Closed since, and what is left

**The browser gate is paid.** PR #168 went green on both required jobs and merged; `main`'s
post-merge run repeats it with the `@slow` walk included. See the gate section for why the wall
clock alongside it proves less than it appears to.

**Dusk holds.** The specific worry was that a dark band under the full-screen sky tint would go
muddy. Screenshotted at noon and at dusk on the same Lothal shore: at dusk the contact shadow reads
as a warm-grey bank rather than a smear, and the sand lip still separates from the ground behind
it. *Night is not conclusively checked* — under a pinned wall clock the frame did not darken much,
so the tint at hour 22 was not really exercised. Dusk was the stated risk and dusk is answered.

Two things remain, and neither is a defect:

1. **Decor floats over the shadow.** Lily pads on a shore tile are row-sorted at `underfoot`
   (depth ≥ 100) and the band sits at 60, so a pad inside the shaded band is not shaded. Accepted
   deliberately: suppressing decor on shore water tiles would cost 385 of Lothal's props, which is
   the worse trade. Revisit only if somebody notices it in play.
2. **Stage 4, painted rim art.** Still optional, still unstarted, and still behind the plate queue
   for image-model time. The question is for somebody looking at a shore, not for this document.
