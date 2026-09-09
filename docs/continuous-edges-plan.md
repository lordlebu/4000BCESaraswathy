# Continuous edges

> *"cliff or tree edges shouldn't be considered as tiles — they need to nicely nudge into
> surrounding tiles."*

The complaint is about **silhouette**, not about rock. A rim in this game is drawn as a band against
one cell boundary, so its outer outline is a straight line exactly 128 pixels long, in line with
fifteen other straight lines. Whatever is painted inside that band, the shape says *tile*.

This is the same complaint the shoreline programme answered for water and the blend layer answered
for ground, and both are worth reading before starting here: `docs/shoreline-plan.md` and the torn
masks in `assets/edges.png`. **A rim is a slot** — `planCliffs` and `planTreeline` are one function
with two predicates and two sheets — so whatever is built here is built once and both get it.

## What is actually wrong, measured

Three separate causes, and only the third is about art.

**1. The outer outline is a straight line on the cell boundary.** Nothing varies it. The ground blend
already solved exactly this: `assets/edges.png` holds four edges × four variants of a torn mask that
reaches a third of a cell and varies its depth per column between 10% and 100%. The cliff and
treeline sheets do not use it.

**2. The rim stops inside its own cell.** `DEPTH.s = 0.48`, so a south face occupies the bottom 62px
of its own 128 and stops dead at the boundary. The comment in `tools/build-rims.js` claims south is
deep "so the face overhangs the tile below it" — it does not, and has never. Nothing of any rim has
ever been drawn outside the tile that owns it.

**3. Nothing bridges the foot.** A wall meets flat grass across one pixel row. Real rock sheds a
talus of loose stone into the ground below it, which is what makes a cliff read as standing *on*
something rather than being pasted over it. `planCliffJoints` already scatters stone — but only at a
run's *ends*, never along its base.

### And one that was worse than all three, now fixed

**Every treeline in the shipped game had a gap at every tile boundary.** Measured on
`assets/treeline.png` as it stood: the south band's depth at columns 0 and 127 was **0 on all four
variants**, so a run of forest edge was four islands with daylight between them rather than a wall
of trees. The cliff sheet mostly touched, so nothing ever pointed at the shared cause.

The cause was the intake, not the art. `tools/build-rims.js` cropped each frame to its content in
the *named* direction only and took the full cell across it, which is correct only if the painting
happens to run to its own cell edges. It now crops in both axes and stretches the perpendicular one
to fill the cell, so the join is made rather than hoped for. Both sheets now read the full 62px at
every column a neighbour has to meet.

**A third container problem moved into code at the same time.** The builder sliced the 4 × 4 grid at
exact quarters. A sheet arrived with its rows at y 25–144, 209–515, 604–818 and 842–1176 in a
1240-tall image — three of the four straddling a quarter cut — so every extracted cell was part of
one row plus part of the next, and every downstream measurement was of a cell that did not exist.
The grid is now found from the sheet's own gutters, with an even split as a reported fallback. That
is the same call as keying the magenta and cropping to content: the model reliably paints four rows
of four, and reliably will not put them on exact pixel boundaries.

**Merging by count, not by threshold.** Finding gutters means deciding whether a break in the art is
a gutter or a waist in one cell's painting, and a fixed width cannot tell them apart. It got it
wrong in both directions: at a sixtieth of the sheet it welded the south and west rows together,
because their gutter measured 15px where a row's own internal break measured 21. The runs are now
merged smallest-gap-first only until the count matches what is expected, which needs no threshold at
all — the expected count is the constraint. Both sheets slice with no fallback now, the treeline
included.

**And a fourth: a matte halo on art that arrives already cut out.** A sheet cut from its background
by a model carries a band of partial alpha around every shape, and that band holds the colour it was
cut *from* — 1,952 of one sheet's 33,111 semi-transparent pixels were saturated red or orange, which
is a red rim around every boulder once it is drawn over grass. Nothing in that art is red. `key`'s
de-fringe cannot help, because it works by knowing exactly which colour contaminated the pixel and
here it does not. So `harden` drops the band outright: an edge one pixel tighter, and no halo at any
alpha. **Soft alpha on pixel art is a defect anyway**, so this is not a compromise.

### And two measurements that decide what is worth building

**The median south-face run is one tile.** Across the four maps: 83 runs of one tile, 31 of two, 10
of three, 8 of four, 3 of five or more, longest 23. A rim here is nearly always a short stair, not a
long wall. So the pieces that make *joins* read well are worth far more than anything that makes a
long straight run look better — which is why the corner work was the right thing to do first.

**Speckle is not the cause, and smoothing is not the cure.** The obvious theory is that the high
ground is noise. It is not: 4 lone high tiles out of 1,199 on the Aravali, 0 of 857 on the Narmada.
A majority filter over the band grid was prototyped and moves the median run not at all — long runs
went 4 → 8 on one map and 7 → 5 on another. The short runs come from the *contour* being a diagonal
staircase, which is what a contour on a square grid is. **Do not spend a seed-breaking terrain change
on this.**

## The three mechanisms, cheapest first

None of the first two needs new art.

### A. A torn outer outline

Mask the rim's outer edge with the same torn masks the ground blend uses, keyed by `tileHash` so it
is deterministic and stable across a save. The rim's *inner* edge — the one against the cell it
belongs to — stays straight, because that side is buried under the ground it is the edge of.

Cost: one mask lookup at build time if the masks are composited into the sheet (34 frames rather
than 22), or a baked texture per (frame, mask) pair at runtime the way `shoreTextureKey` works.
**Prefer baking into the sheet.** The shoreline work measured the alternative and the lesson there
was that the cheap-looking half was the expensive one.

### B. Overhang, and a talus at the foot

Two halves of one idea: the rim reaches *past* its cell, and debris from it lands on the neighbour.

- **Overhang.** Give the outward-facing rim placement an `offset` so a fraction of it — start at 15%
  and measure — falls on the tile beyond. Depth already works out: a face on row *y* draws at
  `depthFor(y, undergrowth)` = 10y+1 and a player standing on row *y*+1 draws at 10y+15, so the
  player walks in front of an overhanging face rather than behind it. Check that before trusting it.
- **Talus.** Extend `planCliffJoints` from run-ends to run-bases: scree and small stones on the tile
  *below* a south face, thinning with distance, from the stones the decor sheet already carries.
  Same argument the joints already won on — the stone is both what hides the seam and what would
  actually be lying there.

### C. One rim module, so the treeline gets it too

`planCliffs` and `planTreeline` are the same pass with different predicates. Whatever A and B become,
they belong in one place that both call, with the reach and the talus prop as parameters. A forest
edge wants a canopy spilling into the open tile and leaf litter at its foot; a cliff wants rock
overhanging and scree. Same shape, different furniture.

**This is the part to get right structurally**, because the rim slot has already proved it is a slot:
the reference sheet that established the shape drew the identical structure in nine materials, one of
them a wooden palisade.

## What is deliberately not here

**Double-height faces and stacked terraces.** Parked by the author as an idea rather than a
requirement, and the terrain does not support it anyway: **1.4% of faces are a two-band drop and not
one of them faces south**, because `band()` returns only 0, 1 or 2. Building terracing today would
be art and code for something that draws on eleven tiles in the whole game, none of them the ones
you would see it on.

**A terrain change.** See the measurement above.

## The one thing that does need art

The corner pieces and the straight bands are **two different paintings**. Mean colour matches almost
exactly — `[128, 111, 92]` against `[135, 117, 94]` — but the corners are a fine cobble mosaic where
the bands are large smooth boulders, so adjacent tiles read as two rocks. No build-time transform
fixes texture frequency; only repainting one side to match the other does.

**When that round happens, commission the whole sheet at once** — sixteen edge frames and six corners
in one painting — rather than matching a new corner to an old band. That resolves the mismatch by
construction, which is the same argument that says a corner should be baked over the band it
continues rather than scaled to match it.

And state the numbers in the prompt, because the two things that went wrong twice were both
unstated: **which quarter of each corner cell must be empty**, and **that the rock runs off the cell
edge and is cut flat there**. `test/frames.test.ts` now checks the first automatically.
