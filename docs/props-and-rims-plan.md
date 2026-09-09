# Props and rims — shadows, cliff joints, and something growing on the islands

Three complaints about how the map reads, taken together because they are the same kind of problem:
**things that stand on the ground do not look like they are standing on it**, and **edges that
should be continuous stop dead**.

Written 2026-09-09. Two of the three are code and have shipped; the third is half code, half art,
and the art half has a prompt waiting at the bottom of this file.

---

## 1. Tree props had no shadows · **shipped**

A feature drawn on a tile is a sticker on the terrain: the eye gets no contact cue, so the trunk
floats however well the trunk is drawn. This is the cheapest depth cue in the book and the game
already owned the texture — the traveller has had a contact shadow since the phase that added him,
and `docs/rendering.md` records it as the thing that *survived* when the vignette was cut.

**One shadow per standing feature, at `underfoot`.** 184 of Narmada's 323 features get one.

**The other 139 deliberately do not.** A fallen log, stepping stones, a tussock and a woodpile lie
flat, and a shadow under something already lying on the ground is a smudge rather than a cue. The
test is `featureIsUnderfoot`, which is the same answer the depth slot is chosen from — so the two
cannot drift apart and start disagreeing about whether a thing stands up.

Sized in the scene rather than the plan (`0.5 × 0.17` of a cell against the traveller's
`0.62 × 0.2`), dropped `0.28` of a cell below centre because the feature sheet draws each object
standing on the lower third of its cell.

## 2. Cliff runs stop dead and corners notch · **shipped**

Measured, because "the cliffs look sharp" needed a number: **roughly a third of cliff tiles are
corners** — 84 of Narmada's 310, 42 of Lothal's 125, 46 of the Aravali's 208. So this is the common
case, not an edge case.

### The honest diagnosis, and where this is going

`cliffFrame(edge, variant)` picks from four directions and four variants **and asks nothing about
its neighbours**. That is why a run ends on a straight vertical cut no rock ever made, and why two
perpendicular faces on one tile do not turn into one another.

**Corrected after reading `place()` in `tools/build-rims.js`: the elbow is not a gap.** The south
band is laid across the *full* cell width and the east band down the *full* cell height, so on a
corner tile the two already overlap in the corner quadrant. Nothing is missing there. What is wrong
is that two different pieces of rock texture meet at a right angle in a T-junction — the face does
not *turn*, it collides with itself.

That changes what Asset 2e has to be, and the first draft of this plan had it backwards:

> **A corner frame replaces both bands on that tile. It does not fill a notch between them.**

Which in turn means the selection work is not only "pick a corner frame" — it is also **suppress the
two edge bands that corner stands in for**. A corner drawn *over* the existing pair would be a third
texture on top of a collision rather than a fix for it.

**The industry answer to this is autotiling** — choose the frame from a bitmask of which neighbours
share the state, with inner and outer corner pieces drawn for the purpose. Godot's terrain sets,
Tiled's Wang sets and RPG Maker's autotiles are all this. It is where this should end up, and the
blocker is not the selection logic: it is that **the sheet has no corner to select**. Four edge
bands cannot express a corner no matter how cleverly they are indexed.

### What shipped, which is the half that needed no art

**Rubble at the joint.** `planCliffJoints` asks the neighbours the question the rim layer never
asked — does this face carry on into the next tile, or stop here? — and puts a stone where the
answer is "stop": a boulder in an elbow where two faces meet, scree where a run ends. 101–261
placements per map, from stones the decor sheet already carries.

This is a real technique rather than a stopgap; scree gathers exactly where a face turns or ends,
so the stone is both what hides the seam and what would actually be lying there. It is also
explicitly what was asked for — *"at least connecting graphically or having stones between two
edges so they are not sharp"*.

**Be clear about what it does not do.** It softens the terminations. It does not make a rim *bend*.
A run of cliff still steps in 128-pixel squares, because a curve needs a curved piece and there
isn't one. Asset 2e below is that piece.

**The selection logic is already asking the right question**, so when corner frames exist only the
sheet changes.

### The other half, shipped: the art arrived and the rim turns

`assets/source/cliff-corners.png` is a 3 × 2 grid of six painted pieces, appended to the cliff sheet
as frames 16–21. `cliffTurn` in `frames.ts` decides what a tile does at its corners; `planCliffs`
emits the piece **and drops the bands it stands in for**; `planCliffJoints` stands down wherever a
piece now carries its own turn. Per map: 30 corners on Lothal and Dwarka, 60 on the Narmada, 63 on
the Aravali, and every one of the six pieces reaches every map.

Three rulings inside it that are not obvious from the code:

**Only the south corners exist.** The north lip is 26px against the south face's 62, so a turn there
is a quarter of the pixels and reads as a texture seam rather than a wrong corner. Four more
paintings for the least visible half was not worth another art round; north and west faces keep
their bands and the rubble they already had.

**`outer-*` and `inner-*` are used as two variants of one turn**, chosen by hash. That is *not* what
those names mean in a Godot terrain set, where the distinction is about the diagonal neighbour — but
it is what the paintings actually are, and inventing a diagonal rule the art does not draw would put
the wrong piece on half the corners.

**A one-tile wall takes no cap at either end.** `cap-e` is rock down the left and rubble to the
right; `cap-w` is its mirror. Emitting both on a lone tile unions them into a solid block with the
rubble buried in the middle, which says the opposite of what a cap is for. It keeps its plain band
and the scree at each end.

### What it cost, and what it still gets wrong

The cliff layer goes **769 sprites → 643 (−16.4%)** and **3.76M → 4.91M blended pixels (+30.9%)**,
because a corner is a full 128 quad where the two bands it replaces were 62 × 128 and 28 × 128.
Against the decor layer's measured 2.6 ms per million on SwiftShader that is about **+3 ms on a
67 ms frame**, and fewer draw calls.

Two things are honestly still wrong, both recorded rather than fixed:

**The corner art is a different painting from the band art.** Mean colour matches almost exactly —
`[128, 111, 92]` against `[135, 117, 94]` — but the corners are a fine cobble mosaic where the bands
are large smooth boulders, so adjacent tiles read as two rocks. No build-time transform fixes
texture frequency. Fixing it means repainting one side to match the other, which is its own art
round and is not scheduled.

**A corner's horizontal arm is 34px deep where a straight band is 62.** So a corner meeting a run on
its open side steps down. The caps do *not* have this problem — they land at 60–61px — because the
crop below fits them by width. Matching the corners too would need a 1.8× vertical stretch that
would stand every boulder up taller than the ones beside it, which is worse than the step.

### The two builder faults this found, which looked like art faults

Both were diagnosed as bad art first, and both were `tools/build-rims.js`:

**Keying a sheet that was already transparent.** `isKey`'s second branch removes the brief's "warm
paper undertone" (r > 205, g > 198, b > 168). A rejected candidate painted its limestone near-white,
so that branch ate the highlight off every boulder and the frames came back full of holes — which
read as a botched painting until the holes were traced back here. The builder now skips the key
entirely when the source already carries real alpha. On the sheet that shipped it would still have
punched out 0.6% of the stone as scattered white speckles.

**Resampling the whole cell.** Painted corners arrive with air around them — 62–74% of each cell was
empty — so scaling the cell whole left the rock stopping short of the boundary: **0px deep at the
left and right columns where a band is 62**, a gap in the wall *and* a step in its height. Cropping
to the art's own bounding box and fitting by width fixed both. Fitting by *area* instead is the trap:
the caps measure 433 × 202, and squaring that stands every boulder up 2× taller than the wall it is
ending.

## 3. The islands were bare rock with a gem on them · **shipped, and wants better art**

296 tiles of `sky_island` on the Aravali, and the only thing standing on any of them was a crystal
shard. The ground read as mineral and nothing else.

Two features added, and the split between them is `docs/art-direction.md` rule §1 applied
literally:

| | How it was made | Why |
|---|---|---|
| **Cushion shrub** | generated in `build-features.js` | A hummock is a **mass**, which is the case a loop draws well — the same case as scree, grass and the anthill. |
| **Wind-bent conifer** | generated, and **placeholder** | A tree is recognised by its **silhouette**, and the rule's own failure list is *neem, palm, pine, mangrove*. This is a fourth of that family: consistent with what ships, and no better. |

**And canon already names the right tree, which the placeholder is not.** The Aravali's flora is the
*Aero-Mangrove / Vayu-Vriksha* — *"trees growing on the absolute edges of floating islands, plunging
their roots downward into the open sky"*. A conifer is not that. The prompt below asks for what
canon actually describes.

## 4. The underside carried nothing at all · **shipped**

83 tiles of `sky_underside` on the Aravali with no prop of any kind. It had been excluded from the
decor table on the reading that it is *"the far side of a boundary rather than ground, and nothing
stands on it"*.

**The first half is right and the conclusion did not follow.** Nothing *stands* on it — but things
hang off it and wedge under it, which is most of what the underside of anything has on it. Canon
says so directly: the aero-mangrove "plunges its roots downward into the open sky".

Four props, and the constraint shaped all of them: `CEILING` in `tools/build-decor.js` clips this
layer to the bottom third of its cell, so **a full curtain of root cannot be a decor prop** — what
is drawn is the lower length of a root with the rock it comes out of on the tile above.

| Prop | What it is |
|---|---|
| `hanging-root`, `root-tangle` | `tuft` drawn upside down: strokes that fall from the ceiling rather than rising from a base |
| `cling-moss` | a patch, the one shape that works on a vertical face without implying a floor |
| `sky-nest` | a cup of twigs, wedged rather than placed — and **no eggs**, because eggs read as a thing to take and this is a game about looking |

Roots are **thick where they leave the rock and taper to the tip**. `stroke` takes one width, so a
root is drawn as a run of six segments with the width coming down along it — a root of even width
reads as string rather than wood.

**The large hanging roots are still wanted** and cannot come from this layer. They want the feature
layer, a 128 cell, and a drawn silhouette — see Asset 7 below, which now asks for a root curtain
as well.

## 5. The island now shades its own underside · **shipped**

Asked as *"can the sky isle tiles project shadow onto the underside tiles"* — and yes, easily,
because the geometry is already there: `crossing.ts` stamps the underside **directly below** the
island in the same grid, so "how much island is above me" is a lookup up the column.

**It is the same light `planIslandShadow` already casts**, asked from the other side of the rock.
That one darkens the *sea* below a shelf because light does not get under it; this darkens the
*shelf's own underside* for exactly the same reason. Both reach four rows, and they match on purpose
— two different reaches would show precisely at the rim, which is the one place a player is looking.

Two parts, and they compose:

| | |
|---|---|
| **within a tile** | a baked vertical gradient, dense against the rock above and nearly gone at the bottom |
| **between tiles** | alpha from how much island is overhead — deepest immediately under the shelf, easing off down the hanging rock, and never below a floor of 0.45 because the far side of a shelf is never lit like the top |

The gradient uses the same ink as the island's shadow on the water, so the two read as one light
doing one thing rather than as two dark effects that happen to coincide.

### What the reference frame shows that this does not yet do

The reference is columnar rock **tapering to a point** below each island, with rope ladders down
and the rail structure between the two. The underside here is a flat band of tiles instead: the
shade is right, the *silhouette* is not. That is a terrain-generation and art question rather than a
lighting one, and it is not in this plan — but it is the next thing that would move that map, and
Asset 7's root curtain is the small half of it.

---

## The art still wanted

### Asset 2e — cliff corners and caps · **delivered, in the sheet**

Kept below as the record of what was asked for and what four rounds of it produced, because the
prompt was wrong twice in ways that were not obvious until the frames were measured.

**What the prompt was missing.** "A lip along the top and a tall face down one side" describes a
*wall*. It never said the two things that decide whether a piece is usable:

1. **Which quarter of the cell must be empty.** A corner is drawn on the *high* tile, so the
   quadrant the rock does not wrap is flat plateau and something else draws there. Rounds one and
   two came back **73–93% rock in both top quadrants** — every corner would have covered the ground
   it was standing on. `test/frames.test.ts` now asserts this per piece, which is the one check that
   catches bad corner art without anybody looking at it.
2. **That the rock runs off the cell edge and is cut flat there.** A piece floating clear of its
   own boundary cannot butt against the straight band next door.

Two other rejections worth keeping: a sheet drawn in **isometric extruded prisms with black
keylines** (the map's rock is near-top-down and has no outlines anywhere), and a **coursed-masonry**
lip, which is the dry-stone-wall failure `docs/art-direction.md` already records. Both rejects are in
`assets/source/dump/`.

And the container moved into code rather than into the prompt, the same call the magenta background
already got: every generated sheet came back **3 across × 2 down** whatever was asked for, so
`build-rims.js` reads 3 × 2.

### The original ask, for the record

Extends the rim sheet in `docs/art-brief.md` Asset 2d, which already has a proven intake:
`tools/build-rims.js` keys a 4 × 4 magenta grid, and this is a fifth and sixth row of the same
thing. **No new pipeline** — the format is the one that works.

Six pieces, which is the minimum that lets a run read as continuous:

| Piece | What it is |
|---|---|
| outer corner ×2 | the convex elbow, where two faces meet and the rock turns away from you |
| inner corner ×2 | the concave elbow, where the ground wraps around a notch |
| end cap ×2 | where a run stops: the face tapering into rubble and soil rather than cut off square |

**Each corner cell must be a complete tile-corner of rock**, carrying both the along-the-top lip and
the tall face down one side, because it stands in for a north/south band *and* an east/west one. A
cell drawn as just the turn, meant to be laid over two existing bands, cannot be used — see the
diagnosis above.

Then `cliffFrame` grows a neighbour bitmask, `planCliffs` **stops emitting the two edge bands on a
tile that draws a corner**, and `planCliffJoints` becomes a fallback for grounds with no corner art
rather than the main event.

**Nothing of that selection work is worth writing before the frames exist.** A selector that picks
frames which are not on the sheet is the "written, tested, and never called" shape this repository
has shipped three mechanics without — and here it would be worse than inert, because suppressing the
edge bands in favour of a frame that does not exist would leave the corner tile blank. The pipeline
half is safe to build ahead of the art; the selection half is not.

### Asset 7 — sky-island flora, and the intake it needs first

**This one is not just a prompt.** `tools/build-features.js` *draws* every feature in code — there
is no path that ingests painted art into the features sheet, the way `build-rims.js` does for rims.
So Asset 7 is two jobs:

1. **`tools/build-flora.js`** — chroma-key intake for the features sheet, copied from
   `build-rims.js`: same magenta grid, same keying, same de-fringe. That file already solved this
   problem once and the solution transfers unchanged.
2. **The art**, prompted as below.

Wanted: the **aero-mangrove** canon describes, and a **cushion shrub** good enough to replace the
generated one. The mangrove is the one that matters — it is the silhouette the whole ground is
missing, and it is a silhouette a loop cannot draw.

> **Prompt — sky-island flora.** Same container rules as Asset 2d; only the subject changes.
>
> A **sprite sheet for a top-down 2D game**, drawn on a **solid pure magenta background, hex
> #FF00FF**, edge to edge, with **no transparency anywhere in the file** — the magenta is a
> chroma-key backdrop that will be removed later, so every pixel that is not artwork must be exactly
> that magenta.
>
> A **2 × 2 grid**, four cells, thin magenta gutters between them, each cell one plant seen from
> **slightly above and in front** — the three-quarter view a top-down game uses so a standing thing
> still shows its height. Each plant stands on nothing; no ground, no shadow, no pot, no baseline.
>
> - **Cells 1 and 2 — an aero-mangrove.** A small wind-shaped tree that grows on the *rim* of a
>   floating island, with a mass of pale aerial roots hanging **downward below the trunk**, trailing
>   into empty air rather than entering soil. The two cells lean opposite ways. Roots are the
>   character of this tree: about as much of the drawing as the crown. Foliage sparse, blue-green,
>   wind-combed to one side.
> - **Cells 3 and 4 — a cushion shrub.** A low, dense, wind-flattened hummock, wider than tall,
>   blue-green with paler tips on the upper surface. The two cells differ in outline. No flowers.
>
> If you can give a **second sheet**, the piece the decor layer cannot draw: a **2 × 1 grid of root
> curtains** — a heavy mass of woody roots hanging *straight down from the top edge of the cell*,
> filling most of the cell's height, thinning and fraying toward the bottom, with smaller
> tendrils breaking away from the main mass. Drawn as if growing out of rock just above the frame.
> Same magenta background, same palette, no ground and no baseline.
>
> **Palette:** cool blue-greens and pale grey-greens, a bleached grey-brown for wood and roots.
> Nothing saturated; this ground already carries a bright crystal and the plants must not compete
> with it.
>
> **Do not draw:** a mangrove standing in water, or any water at all; roots spreading sideways into
> ground; a rounded broadleaf canopy; a conifer; flowers, fruit or berries; any pot, rock, soil or
> baseline under the plant; outlines or drop shadows; text, labels, grids or registration marks.
>
> Large — at least 1024 × 1024 for the whole sheet. It is downsampled to a 32-pixel authoring grid
> and upscaled ×4, so detail below about a twelfth of a cell will not survive.

---

## What this cost, and what it is allowed to cost

Nothing here is free, and this repository's rule is that a layer states its price.

| Layer | Placements per map | Shape |
|---|---|---|
| feature shadows | 184 at worst (Narmada) | 64-cell texture, already loaded |
| cliff joints | 101–261 | decor sheet, 64 cell |
| sky flora | inside the existing feature budget — one tile in twelve, unchanged | 128 cell |

The joints are the one to watch: 261 on Narmada is comparable to the cliff layer itself. They are
half-cell decor sprites rather than full-cell quads, which is the lever `docs/rendering.md` says to
reach for first — but if the frame ever needs the budget back, thinning joints to elbows only
(dropping run-end caps) is the obvious cut, and it is a one-line change to the predicate.

**The browser suite is the gate**, as it was for the shoreline: `npm run test:ci`, and the frame
measured on the software rasteriser before and after.
