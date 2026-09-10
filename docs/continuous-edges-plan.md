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

## The maze, which none of the three mechanisms addressed

Rendering the *whole scene* — terrain underneath, decor and joints included — rather than the cliff
sheet over a flat colour showed something the earlier pictures hid completely. The cliffs read as a
**hedge maze**: thin walls tracing every tile boundary, boxing in single squares of grass.

The cause is not the art and not the silhouette. `band()` quantises elevation to 0, 1 or 2, and that
boundary follows a noise contour, so at tile resolution it zigzags. Every zigzag is one more
axis-aligned wall segment — and a *low* tile ringed by higher neighbours gets four faces pointed at
it by those neighbours, which draws a pen around one square. There were 20 such tiles across the
four maps.

**Fixed by one majority pass over the bands, intersected with the real ones.** `cliffBands` in
`scenePlan.ts` smooths the grid, and `facesAt` draws a face only where the smoothed grid *and* the
real one both say the ground drops. The intersection is the important half: taking the smoothed grid
on its own is the obvious move and it invents rock, because a majority filter will raise a genuinely
low tile to match its neighbours and then a face gets drawn standing on lowland facing a neighbour
that is not below it. Two existing tests said so within a minute of trying it.

Faces drop about a third and boxed-in tiles go from 20 to 2. It is a **drawing decision, not a
terrain change**: biomes, walkability, travel cost and every saved journey come from
`world/classify.ts` at generation time and are untouched, so it needs no `SAVE_VERSION` bump.

**And the earlier measurement in this file reached the right answer by the wrong route.** It said
smoothing was not worth it, having measured horizontal *run length* — which barely moves. What moves
is the number of faces the contour generates at all, and that is what makes the maze. The conclusion
against a seed-breaking terrain change still holds; the reasoning under it did not.

### A one-tile wall, which is most of them

`cliffTurn` refused to cap a lone tile, on the argument that `cap-e` is rock down the left and
`cap-w` rock down the right, so together they would union into a solid block with the rubble buried
in the middle. **Drawn and looked at, that is not what happens.** The two overlap where both are
rock anyway, and the result crumbles at both ends with rock between them — which is what a lone stub
should be. What shipped instead was a slab with two square cuts.

It matters because it is the common case, not a corner of it: 18 of 26 south runs on the Aravali and
21 of 32 on the Narmada are a single tile.

Worth keeping as a method note. The refusal was reasoned about carefully and was wrong, and one
render of four options settled it in a minute — the same lesson as the sprite rows, where two pixel
heuristics both got it wrong and looking at the sheet was right.

## The three mechanisms, cheapest first

Mechanism B is **built**. A and C are not.

### A. A torn inner outline · **shipped, and the name was wrong**

Written up as a *torn outer outline*, and that was the wrong edge. A rim's outer silhouette was
never the problem: the art draws rubble and loose stone along it, and the overhang pushes it off the
boundary anyway. What ruled the grid was the **inner** edge — `place` lays each band as a rectangle,
so the top of every south face sat at exactly the same pixel across the whole cell, sixteen dead
straight lines to a screen.

`tear` in `build-rims.js` bites that line out with the masks `assets/edges.png` already holds, one
mask variant per band variant, so the wall's height now varies 70–80px across a cell where it was a
flat 66. Reusing the ground blend's masks rather than writing a second noise field is worth more
than the lines saved: a tear on a cliff then has the same character as a tear between two grounds,
so the map has one way of not being a grid rather than two that nearly match.

**Thresholded, not blended, and that is the whole difference between a tear and a fade.** Using the
mask's alpha as a multiplier is the obvious reading of it, and it was tried first: it gives a soft
gradient along the top of every wall, which is the dissolved shoreline `docs/endgame-plan.md`
records as built and reverted. A tear keeps a hard boundary and varies *where* it is; the mask's
per-column reach is exactly that variation, so the mask is read at its own scale rather than
stretched.

Two things it must not do, both guarded:

- **Cut through a corner's vertical arm.** That arm rises to the top of the cell and the tear works
  inward from a fixed line, so without a guard the bite opens a hole in the very turn the piece
  exists to draw. Columns whose art starts well above the band line are left alone.
- **Skip the caps.** They were excluded at first and that put a 9px step exactly where a cap meets
  the run it is ending — the thick end of a cap is the end that joins.

`test/frames.test.ts` asserts the spread rather than the shape: the shape is noise, and the claim is
only that the top is not a ruler. A flat top comes back as a spread of 0 and fails by name; a tear
deep enough to eat the band fails the second assertion beside it.

### A, as originally written

Mask the rim's outer edge with the same torn masks the ground blend uses, keyed by `tileHash` so it
is deterministic and stable across a save. The rim's *inner* edge — the one against the cell it
belongs to — stays straight, because that side is buried under the ground it is the edge of.

Cost: one mask lookup at build time if the masks are composited into the sheet (34 frames rather
than 22), or a baked texture per (frame, mask) pair at runtime the way `shoreTextureKey` works.
**Prefer baking into the sheet.** The shoreline work measured the alternative and the lesson there
was that the cheap-looking half was the expensive one.

### B. Overhang, and a talus at the foot · **shipped**

Two halves of one idea: the rim reaches *past* its cell, and debris from it lands on the neighbour.

- **Overhang.** `OVERHANG` in `scenePlan.ts` gives each face an offset — 12% of a tile downward for
  a south face, 6% sideways for east and west. **North is zero and that is not an oversight:** the
  other three are faces, and a wall overhangs what is below it, but north is a *lip*, the top of the
  break seen from above, and hanging it over the tile above would lay rock across ground that is
  higher than the rock. The sides get half the south face's reach because they are 28px wide against
  its 62 and the same absolute overhang would push most of the strip out of its own cell. Depth was
  checked rather than assumed: the player walks in front of an overhanging face.
- **Talus.** `planCliffTalus` scatters two or three stones on the tile *below* every south face,
  from `scree`, `pebbles` and `boulder-small` — 150, 136, 58 and 54 stones on the four maps. It
  keeps off roofs for the reason paddy once grew through one, and sheds nothing into water for the
  reason `cliffAt` refuses a face there at all.

**The treeline gets the overhang too**, which is mechanism C arriving early in the one place it was
free: a canopy spilling over the open ground beside it is exactly what a wall of trees should do.

### C. One rim module, so the treeline gets it too · **not built**

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
