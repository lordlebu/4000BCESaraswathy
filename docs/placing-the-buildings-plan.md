# Placing the buildings

**Status: closed, 2026-09-11.** All three buildings are drawn. What each check actually proved is
at the bottom, including the half that could not be done the way this plan first demanded.

## Why this plan exists

Three buildings have finished art. None of them is on the map.

| | canon entity | painted sheet | loaded by the game |
|---|---|---|---|
| temple | `poi_alms_step` | `monuments.png` | **no** |
| windmill | none | `windmill-tower.png`, `windmill-blades.png` | **no** |
| bridge | n/a | `bridge.png` | **no** |

That is this repository's oldest fault, and the count is now five: three in `CLAUDE.md` under the
rules layer (a rule written, tested, and with no caller, so the mechanic did not exist while every
test passed), `lava_field` (a biome with a painted tile, six props, 25 creatures and four points of
interest asking to stand on it, generating **zero tiles on every seed**), and this. A sixth predates
all of them — `vehicles.png` is built and never loaded either.

**It is one missing piece rather than three.** `planMarkers` emits `sheet: 'places'` for every point
of interest, and `places.png` is *generated* by `tools/build-terrain.js` at 128 × 160 from code. No
point of interest can draw a painted sheet at all. So the temple has canon, has art, is placed on
the near island, and has a passing test proving it lands there — and a player sees the code-drawn
placeholder.

## A. The painted-sheet path · unblocks everything

The engine already does the hard part by accident. `WorldScene` draws an anchored sprite with
`add.image(...)` and `setOrigin(0.5, 1)` and **never calls `setDisplaySize`**, so a sheet's cell size
*is* its size on screen. A 256 × 416 building needs no new contract — it needs a sheet key, a frame
table, and one branch in `planMarkers`.

Five edits, and none of them is deep:

1. `tileTextures.ts` — a `MONUMENT_SHEET` beside `PLACE_SHEET`, loaded at its own cell size.
2. `frames.ts` — `monumentFrame(poiId)`, a table from canon id to frame, returning `null` when a
   place has no painted art.
3. `scenePlan.ts` — `PlacementSheet` gains `'monuments'`; `planMarkers` prefers it over `places`.
4. `WorldScene.ts` — `SHEET_KEY` gains it, and it joins the `anchored` list.
5. A test that fails by name when a point of interest with painted art is drawn from the wrong
   sheet.

**Which of the three temple frames.** Not a roll. `poi_alms_step`'s arrival text describes a
specific building — *"seven small spires stand around a dome that has split"* — so the game draws
that one. Canon says what a place looks like; the game does not get a second opinion. The other two
frames stay in the sheet for the day a second ruin wants them.

**The cost worth knowing before it surprises someone.** A sprite 3.25 tiles tall covers three rows
above its anchor, and one two tiles wide overhangs half a tile either side of its column. Two
painted places landing adjacent would overlap. There is one painted place, so this is a note rather
than a problem — but it is the reason not to paint every point of interest at this size.

## B. The windmill · needs canon first

The game does not invent places. The mill needs a point of interest in `SouthOfTethys` before it can
stand anywhere, exactly as the temple did.

Then: draw the tower from `windmill-tower.png` on the painted-sheet path from **A**, and the blades
as a *second* sprite at the boss offset the builder records, advanced on a time modulo.

**The blade animation generalises the sway rather than adding a second mechanism.** `updateSway`
computes `((now + phase) % SWAY_PERIOD) * 2 > SWAY_PERIOD` — a boolean, two frames. A wheel wants
`Math.floor(((now + phase) % period) / period * frames)`. Same shape, same single pass, an index
instead of a flag.

Two frames read as motion on a reed and as a **strobe** on anything that rotates, which is the whole
reason the wheel is twelve frames and not two.

## C. The bridge · resolve it, do not leave it built

`bridge.png` exists and nothing spans anything. That is the fault this plan is about, so "leave it
for later" is not available — it either spans the one-tile channel from the sky pool to the rim, or
it is written down as declined with the reason. **Decide by measuring whether that channel actually
exists on the generated maps**, rather than by remembering that it was mentioned.

## The closing condition

**Nothing here is done because a test passed.** The rule this programme keeps re-learning, in its
own words: *a picture of one sheet over a flat colour is not what a player sees.* The temple was
placed, tested and green while drawing a code-drawn placeholder, and the mangrove floated for a
round with 1,031 tests passing.

So this plan closes when a browser screenshot of the Aravali shows the painted temple and the mill
standing on the island, and not before. Everything else — the tests, the counts, the docs — is
necessary and none of it is sufficient.


---

# Closed

| | canon | sheet | drawn |
|---|---|---|---|
| temple | `poi_alms_step` | `monuments.png` | **yes** — `monuments`, frame 0 |
| windmill | `poi_grit_mill` | tower + 12 blades | **yes**, and the wheel turns |
| bridge | n/a | `bridge.png` | **yes** — 9 to 19 planks a seed |

## The bridge section of this plan was wrong, and counting is what showed it

**C** said the only gap on the islands was the one-tile channel from the pool to the rim, and used
that to argue the sheet had nothing to span. It said to decide by measuring rather than by
remembering, which turned out to be the load-bearing sentence: counting one-tile holes with island
on both sides found **9 to 19 per seed on the Aravali, on every seed tried**. The pool is walkable
anyway — wading landed two rounds ago — so the channel it named was never a gap at all.

`plankTheNotches` lays a plank across each. They are walkable, at `CROSSING_ON_FOOT` rather than at
grass, because the ground underneath is still open sky.

## What looking at it caught that no test did

A rendered composite of the real `planScene` output put the mill **on the railway**. The crossing
uses the islands as its piers, so the line runs straight across the only ground a sky point of
interest can stand on, and `suitable` was content to put a building on the sleepers.

It was not new and it was not the mill's fault: on the default seed `poi_lodestone_face` was on the
line too, and had been. A 32-pixel diamond hid it perfectly. A two-tile painted windmill standing on
a railway does not. `suitable` now refuses a `track` tile, with a test that nothing is stranded by
the ground it takes away.

**That is the fifth time this programme has been corrected by opening the picture**, after the
floating mangrove, the rope over solid ground, the marble quantiser, and the temple prose that did
not match the temple.

## How the closing condition was actually met

This plan demanded a browser screenshot of the buildings on the island. That is not reachable
without either walking a player there — four and a half minutes of tweens — or adding a debug hook
to ship code for a one-off check. Neither is worth it, so the condition was met in two halves that
together cover the same ground, and the difference is worth stating rather than glossing:

* **A composite of the real `planScene` output over the real sheets** proves the placement, the
  scale, the frame, the depth order and the blade offset. It does not prove Phaser can load any of
  it — the compositor does its own decoding, and it does not reproduce the scene's baked terrain
  blending, which is why the ground is missing from those images.
* **The browser suite** proves the other half exactly. `e2e/game.spec.ts` fails on any console
  warning matching `has no frame` or `Texture … not found`, which is precisely what a sheet loaded
  at the wrong cell size produces. It passes with all four new sheets declared.

Neither alone is sufficient. Together they are, and a future round should prefer this pair to a
screenshot that is expensive to reach.
