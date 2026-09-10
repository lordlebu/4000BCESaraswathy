# The sky islands

> *"the size of the flying islands might increase… we can add cloud, waterfall as either overlay
> and shadow… keep objects separate from ground items so we don't break other stuff."*

The instinct behind the last clause is right, and it is already the architecture — so the cheap
half of this is cheaper than it looks. The other two asks each run into something measured and
recorded, and this plan is mostly about those.

## First, the reference cannot be drawn

The reference frame is a **three-quarter isometric** island: you see its top, its side, and the
roots hanging under it, all in one image. This game is a **top-down grid** — every tile is a flat
128px square seen from almost directly above, and there is no "side" of anything.

That is not a small gap. Changing projection means redrawing **every asset in the game**: fifteen
ground tiles at four variants each, 38 features, 39 decor props, five character sheets at four
rows, both rim sheets, the huts, the places, the landmarks. It is the entire art programme again,
and it would invalidate `docs/art-brief.md`, `docs/art-direction.md` and every prompt in them.

**So take the reference's ideas and not its projection.** The four things it actually shows are
all expressible top-down:

| The reference shows | Top-down equivalent | Exists? |
|---|---|---|
| the island's side, tapering | the `sky_underside` rim, shaped | **already there**, 83 tiles |
| roots hanging below | root curtains on the underside | **shipped** |
| a waterfall off the edge | an overlay anchored to the rim | new, cheap |
| clouds around and below | an overlay outside the island | new, see the warning |

**The taper is the interesting one**, because the rim is already how the game says "this is the
part of the island you can see from the side". It is stamped as a ring one elevation band below
the top, which is what gives it cliffs. Making it *taper* means shaping that ring — deeper at the
south, thinning east and west — rather than inventing a third dimension.

## Second, growing the islands costs shore, and that is written down

`crossing.ts` records the measurement, and it is unusually specific:

> *"Widened from a half, and then pulled back from seven tenths. A half left eight rows between the
> islands, which is less than an island is tall… Seven tenths separated them properly and cost too
> much: the shores fell to six or seven rows each, too thin for the landform shaper to raise any
> height on, and the map's high ground went with them. The Quiet Atelier stands high and had
> nowhere high to stand; The Kept Stones wants hills and the far shore had none left."*

> *"The separation is bought by making the islands smaller instead."*

So the islands are the size they are **because two points of interest need the shores**. Growing
them by widening `ISLAND_RADIUS_X`/`_Y` takes rows straight back off the shore and breaks the same
two POIs that were broken last time.

It was **44 × 66 = 2,904 tiles** with islands of radius 8 × 5 at `ISLANDS = [0.32, 0.66]`.

**The honest way to get bigger islands is to grow the map, not the islands' share** — and that is
what shipped. The Aravali is **52 × 78 = 4,056 tiles**, against a square large map's 4,096, which
is the bound that matters: the scene builds a sprite per tile, so tile count *is* frame cost, and
64 × 64 already passes the browser suite. The islands took the room across: radius **10 × 5**, 21
tiles wide against seventeen.

**Across only, and that asymmetry is the finding.** Depth is not competing with the map, it is
competing with the gap between the pair and the clearance off each bank. A 49-row strait holds two
elevens, a gap wider than either, and little else; twelve deep closes the gap to less than an
island is tall, which is the fault `crossing.ts` has already recorded twice. `ISLANDS` moved to
`[0.34, 0.66]` because at 0.32 the northern island came within a single row of the far shore's
beach — not touching, so nothing failed, but about to graze the sand.

**Growing the map broke one test, and the break was worth having.** `poi_kept_stones` stands high
on the far shore, and the far shore held **one** tile of band-1 ground in 478 — the placement had
been resting on a single tile of noise. At 52 × 78 it had none at all and the stones landed on a
beach in the map's corner. *The size did not cause that; it revealed it.*

The fix is in `landform.ts` and it answers a second complaint at the same time: `shore` drops every
edge of the map to water, which put a band of open sea above the far shore's forest — a strip of
nothing at the end of the country the player walks towards. **The far rim climbs instead**, the
shore drop fading out as a wall of stone comes in, so the rim is not asked to be a beach and a
mountain at once. Measured: far shore 348 band-1 and 23 band-2, near shore 339 and 25 — two
comparable countries, with the Aravali range still the taller.

**It is a seed change**, so `SAVE_VERSION` went to 14. The stamp decides biomes; every existing
journey generates different ground.

## Third, the layer separation you asked for already exists

`PlacementSheet` is a union of sheet names and `ROW_SLOT` is the depth ladder within a row.
Adding a cloud or a waterfall is **a new sheet name plus a slot**, and touches no ground rule at
all — exactly the isolation you are asking for. The flora sheet added last week is the worked
example: one entry in the union, one texture registered, and nothing in `world/` or `content/`
knew about it.

```
GROUND_DEPTH_BASE = 100, ROW_DEPTH = 10
  below 100 ...... flat ground: terrain 0, edge blend 50, shore 60
  underfoot ...... contact shadows, things lying flat
  undergrowth .... decor, cliff bands, talus
  marker
  walker ......... the traveller
  canopy ......... features, anything standing
```

A cloud wants to be **above the walker**; a waterfall wants to be **below the underside rim it
falls past**. Both are slots, not new machinery.

**The one real cost is fill, not structure.** `docs/rendering.md` budgets by blended pixels, not
object count — the decor layer's ~370 full-cell props measured 83 ms against a 67 ms frame and
turned the browser job red. A cloud layer is full-cell quads by nature, so it has to be counted
before it is drawn, not after.

## The pieces, cheapest first

### A. Cushion shrubs should not cast · **shipped**

Measured while answering a separate question: a cushion shrub is 128 × 90 and bottom-anchored, so
it covers its own contact ellipse. It belongs in `UNDERFOOT_FEATURES` beside the fallen log and the
tussock — *a shadow under something already lying on the ground is a smudge rather than a cue*,
which is the rule that set already exists for. The mangroves keep theirs and should.

### B. A shaped underside · **shipped**

Half of this was already right: `hangTheShelf` hangs the rock *below* the island rather than
ringing it, which is what stops the grass having a grey moat round it.

What was uniform is the **depth** — `SHELF_DEPTH = 2` under the middle of the island and under its
far tips alike, which says the rock is a border rather than a mass. It now tapers: deepest under
the centre column, thinning to `SHELF_MIN` at the east and west tips, following the ellipse the
island is already made of. Letting the taper reach zero was tried and is wrong — the outermost
columns then hang over open water with nothing under them, which reads as the grass being cut off
with scissors.

**83 → 112 underside tiles, and the walkable top is untouched at 296.** That last number is
asserted, because the shelf was moved out from under the island precisely so it would stop eating
walkable ground.

Two things the render showed that the numbers did not:

- The island's lower boundary is a **staircase**, because a curved edge on a square grid always is.
  With two rows of shelf it read as a thin curve; at four it is more visible. Measured, only **6 of
  112** underside tiles are pinched between island to their east and west, and none are stranded —
  so this is the contour, not a bug, and the cliff rim draws along it.
- The shade and the cast shadow are what make it read as *floating*, and both are runtime-baked
  textures with no file in `assets/`. Any renderer that loads `assets/*.png` will show flat grey
  rock over undarkened water and badly understate it.

### C. A waterfall · **art wanted**

An overlay, not ground. It hangs from a rim tile where fresh water meets the island edge, falls
through the underside rows, and thins out. Two frames, alternated by the machinery `SWAY_PERIOD`
already drives, so the motion is free.

It needs water on the island to fall from, which is **D**.

### D. Water on the island · **stamp work, no art**

`rivers.ts` carves on the elevation field before the islands are stamped, so there is no path by
which a river reaches one today. A pool on an island is a small stamp of `river` biome inside the
`sky_island` patch — which the tile art and the shore/bank emboss already handle, because they key
off biome rather than off where the biome came from.

**Check `check_playability.py` in the canon repo after this**: water on an island changes what is
walkable and what is reachable, and that simulation is the thing that catches a map you cannot
actually cross.

### E. Clouds · **shipped, outside the silhouette, and no art was needed**

Drifting cloud over the play area **hides the player and what they are standing on**. This is a
game about looking closely at things; an overlay that intermittently obscures the ground is
working against the only verb the game has. So what shipped is the version that does not have that
problem: **cloud on open water only** — `planClouds` emits a placement for a `sea` tile and nothing
else, never over walkable ground, a shore, a shelf, a point of interest, or the railway, which is
the only way across.

**It is built out of voxels a quarter of a tile across, and that turned out to be the cheap
option.** Sixteen quads a tile would put three thousand blended objects over the strait, which is
more than everything else on the map together — `docs/rendering.md` is clear that blended fill is
the budget. Baked into a texture, a cloud tile is **one quad with an alpha channel**: a tile of
water, drawn twice. Six patterns exist, picked per tile by hash, and `CLOUD_PATTERNS` lives in
`frames.ts` because the plan cannot import the texture builder and two copies of that number would
drift and then draw nothing.

**The shape lives across tiles, not inside one.** Hearts are hashed out of the sea and a soft
ellipse is stamped round each, so alpha falls from the middle outward — which is also why the
voxels inside a tile are *not* faded at its edge. Fading each cell out at its own boundary is the
obvious way to make one tile look like a puff, and a field of them is then a grid of puffs: the
tile seam arriving by a fourth route after the ground textures, the mottle and the rim layers each
had to be argued out of it.

Measured on the Aravali: **418 quads over 22.5% of the water**, in a scene of 7,041 placements, and
`npm run perf` on the software rasteriser puts it inside the noise floor — best frame 249.9 ms
before and 250.0 ms after. The coverage is *not* the reciprocal of `CLOUD_ONE_IN`, which is worth
knowing before tuning it: one heart in seventy covers 397 tiles and one in a hundred covers 418,
because sparser hearts overlap each other less.

**It does not move**, and that is deliberate for now. `SWAY_PERIOD` alternates two frames, which on
a bank of voxels is a flicker rather than a drift; real motion wants a tweened offset and belongs
with `game/dayNight.ts`, the one file allowed to read the wall clock, because what the sky looks
like while you walk is presentation rather than world state.

## What this plan will not do

**It will not change the projection.** See the top.

**It will not put cloud between the player and the ground.** See E — cloud is a sea tile or it is
nothing.

**It will not grow the islands at the shores' expense.** See the measurement in `crossing.ts`. The
map grew and the islands took the room across; down, the gap between the pair is the constraint and
it has not moved.

## The art actually wanted

One sheet, and it is not large:

1. **A waterfall**, two frames, falling from a rim edge and thinning downward.

**Cloud is off this list.** It was on it as "soft shapes with clear space around them", and the
answer turned out to be a texture built in code out of quarter-tile blocks — which is both cheaper
than a painted sheet and a better fit for pixel art than anything soft would have been. See E.

Everything else here is arithmetic on stamps and depth slots.

## Before believing any of it, render the whole scene

The lesson this programme keeps re-learning, most recently three times in one week: a picture of
one sheet over a flat colour is not what a player sees. The hedge maze hid behind exactly that,
and a compositor bug drew a *forest* tile under the islands for an entire review because it used
a biome index where `tileFrame` wants `index * TILE_VARIANTS + variant`.

An island silhouette is a whole-scene judgement — terrain, rim, decor, shade and overlay together
— and it will be misjudged the same way by the same shortcut.

---

# Round two: the islands as a place, not a shelf

Opened after the 52 × 78 map and the voxel cloud landed and the verdict on looking at it was that
the islands still read as *grey rock with something growing on it*. Six asks, one reference image,
and one of the six turns out to be constrained by a number.

## What the reference can and cannot buy, again

The reference is **isometric**. This game is near-top-down, and the top of the plan already records
why that is not negotiable. But the useful half of that sentence is what a top-down camera *can*
still show, and it is more than it looks: the cliff face, the treeline, the coast band and the
underside shade are all **rim layers** — art drawn on a boundary tile, showing a *side* in a view
that has no sides. Three of the six asks below are rim layers, and that is why they are affordable.

What genuinely cannot cross over: stilt-rooted trees seen in three-quarter view, a visible cliff
wall with ivy on it as one object, and the long tapering roots hanging in open air below the
island. The first two become rim layers. The third becomes a rim layer *hanging downward*, which
the codebase has not drawn before and is the one new mechanism here.

## The six, and what each one costs

### F. Grass on the island top · **art wanted**, and a number constrains it

`assets/source/sky_island.png` is a soft sage watercolour and the built tile reads as a faded lawn.
`data/biomes.json` calls it `#a8b6c6` — pale blue-grey — and describes it as *"a shelf of pale rock
adrift in open air, grass clinging to its rim"*. The ask is that it read as grass.

**The obvious green is not available.** `docs/art-direction.md` records that two grounds under about
25 apart in RGB stop being tellable apart, and that is why `hills` is olive rather than ochre.
Measured against the palette:

| candidate | nearest ground | distance |
|---|---|---|
| `#6f9e52` (a natural grass green) | **forest** `#4f9a5a` | **33** |
| `#86bb62` | plains `#9fc96b` | 30 |
| `#8ec46a` | plains `#9fc96b` | **18** |
| **`#7fb35e`** | plains `#9fc96b` | **41** (forest: 54) |

So the island's grass has to thread between `forest` below it and `plains` above it, and the window
is narrow. **`#7fb35e`** is the middle of it — a real grass green, 41 from plains and 54 from
forest, and 100 away from the pale grey it replaces.

**The mitigating fact, which is worth knowing before treating this as a hard wall:** an island tile
never touches `plains` or `forest` on the map. It borders `sea` and `sky_underside` and nothing
else, by construction in `crossing.ts`. The confusion this rule guards against is two grounds
*adjacent* on screen. So the real risk here is the overview map and the legend swatch, not the walk
— which is why the window can be threaded rather than abandoned.

### G. Rock, not rubble, on the underside · **art wanted**

The built `sky_underside` tile is brown-mauve gravel: it reads as dirt. Canon says *"the raw
underside of a floating shelf, root-hung and hollow"*. It should read as **broken stone** — blocky,
faceted, with real light on the facets — because the shelf is a piece of ground that was torn off
something, and torn rock has faces.

### H. Overhang bush on the rim · **art wanted, and it is a rim layer**

Vegetation spilling over the island's edge and hanging into the tile below. `planTreeline` is
already exactly this shape — a predicate over a boundary and a sheet of four edge frames — so the
mechanism costs a predicate (`sky_island` above, not-`sky_island` below) and a sheet name.

`rootCurtain` already exists on the flora sheet and is a *feature*: one item inside one underside
cell. This is different and both should stand — a curtain hangs under the rock, a bush spills over
the lip.

### I. A bigger, stranger tree · **art wanted**

`aeroMangrove` exists and is 128 × 128, drawn centred in its cell like every other feature. Canon's
Aero-Mangrove *"grows on the rim of a floating island and plunges its roots into open sky"*, and
the reference's trees are the most distinctive thing in it.

A tree that reads at that scale has to be **taller than its tile and bottom-anchored**, which is
the contract `places`, `huts` and `landmarks` already use — `PLACE_HEIGHT` is `TILE_SIZE / 32 * 40`
and the scene already sets `setOrigin(0.5, 1)` for those three sheets. So this is a fourth
bottom-anchored sheet rather than a new mechanism.

### D. Water on the island · **shipped** — see below

### C. A waterfall · **shipped, and no art was needed** — see below

## D and C together: the pool and the fall

These two ship as one piece because neither is worth anything alone, and neither needs art.

**`sky_water` is its own biome, not `river` with a filter.** A pool on a floating island is not the
Saraswati: canon puts *"rainwater falling upward"* under these shelves, and `data/biomes.json` is
the one place a biome's own journal line lives. Reusing `river` would print *"a bright river line
braids the land together"* about a pool hanging in the sky, and the alternative — special-casing
the prose by what the tile's neighbours are — is a second implementation of biome description that
will drift. Four biomes have been added this way already and the drill is known.

**Its tile is baked in code rather than painted**, which is the one piece of this that is cheaper
than it looks. `tileTextures.ts` already bakes six textures — the edge blend, the bank, the shore
band, the underside shade, the cloud and the placeholder — and the blend is the exact precedent:
draw a terrain frame into a canvas, composite something over it, hand Phaser a key. Sky water is
the `river` frame under a pale aquamarine wash: thinner, brighter and less blue than water with a
riverbed under it, because there is nothing under this one but air.

**The fall is voxels, and this is the case they suit better than the clouds did.** The cloud is
still because two alternated frames of voxel read as a flicker rather than a drift. Falling water
is the opposite: a column of quarter-tile voxels shifted by half a voxel between two frames, run
through the `SWAY_PERIOD` machinery that already alternates every swaying sprite, *is* falling —
the flicker is the effect. It costs one quad per tile, the same as the cloud, and no art.

Where it hangs: from a `sky_water` tile that touches the island's lower rim, down through the
`sky_underside` rows, thinning as it goes and ending in a few voxels of spray over open sea.

**`check_playability.py` in the canon repo has to be re-run after D.** Water on an island changes
what is walkable and what is reachable, and that simulation is the thing that catches a map you
cannot cross.

## What C and D measured

**69 tiles of water against 296 of island top** — about 35 of 183 per island, a fifth once the
channel and the slivers it strands are counted in. **39 tiles of falling water**, in a scene of
around 7,000 placements, at one quad each.

**The channel severs ground, and that was measured rather than feared.** The first build put the
pool in and `landform.test.ts` said the Aravali was "cut in two: expected 2031 to be 2035" — four
tiles, the wedge between the outflow and the island's own edge, walled off by water on one side and
open air on the other. Four tiles is not a place: nothing can be reached there and nothing will be
placed there, so `floodTheSlivers` makes it water, which is what it is. Steering the channel around
the wedge does not survive contact — where the wedge falls depends on the hashed pool offset and
the roughened island edge, so a rule that avoids it on this seed meets it on the next.

**The pool is unwalkable, and a test decided that.** It shipped walkable at cost 1 for one turn, on
the severing argument above. `frames.test.ts` failed immediately with *"walkable ground with nothing
lying on it"* — because a walkable biome is ground a player stands on, gathers from and reads a
journal entry about, and there is no decor for a pond. That is the right objection: a few tiles of
water about to go over a waterfall is not somewhere to stand.

**`sky_water` is deliberately not in any `seed_biomes`.** Putting it there to satisfy the palette
test would be the exact trap `CLAUDE.md` records about `lava_field` — the palette is what the
classifier divides elevation and moisture among, so a map listing it would come out roughly a third
sky water. `pourAPool` can only write over `sky_island`, which bounds it far better than a list
does: a delta cannot grow a pool however the palette is written.

## The order for what is left

F and G next — two texture swaps, and they will change the look of the map more than anything else
here. Then H and I, which are new sheets and new intakes.
