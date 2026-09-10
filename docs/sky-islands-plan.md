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

Today: the Aravali is **44 × 66 = 2,904 tiles**, islands are ellipses of radius 8 × 5 at
`ISLANDS = [0.32, 0.66]`, giving **296 island tiles and 83 underside**, occupying rows 15–48 and
columns 12–33.

**The honest way to get bigger islands is to grow the map, not the islands' share.** Lothal and the
Narmada are 48 and 64 across; the Aravali is 44 × 66. Taking it to something like 56 × 80 leaves
`STRAIT`, the shore rows and the POI relief exactly as measured, and buys island radius out of new
ground rather than out of the far shore.

**Either way it is a seed change**: the stamp decides biomes, so every existing journey generates
different ground. That is a `SAVE_VERSION` bump in `src/save.ts` — the same call the landform work
made — and it should be stated in the PR rather than discovered by a player.

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

### A. Cushion shrubs should not cast · **no art, one line**

Measured while answering a separate question: a cushion shrub is 128 × 90 and bottom-anchored, so
it covers its own contact ellipse. It belongs in `UNDERFOOT_FEATURES` beside the fallen log and the
tussock — *a shadow under something already lying on the ground is a smudge rather than a cue*,
which is the rule that set already exists for. The mangroves keep theirs and should.

### B. A shaped underside · **no art**

The rim is stamped as a uniform ring. Deepen it southward and thin it east–west so the island
reads as a body with a bottom rather than a disc with a border. This is arithmetic in
`stampIslands`, and the rim art already in the cliff sheet fills it — the same way the treeline
fills the rim slot with crowns.

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

### E. Clouds · **art wanted, and the one I would push back on**

Drifting cloud over the play area **hides the player and what they are standing on**. This is a
game about looking closely at things; an overlay that intermittently obscures the ground is
working against the only verb the game has.

Two versions that do not have that problem:

- **Cloud outside the island silhouette only** — over `sea` and `open_sky`, never over walkable
  ground. It frames the islands and sells the height without ever covering a discovery.
- **A parallax band at the map's edges**, below the ground layer entirely, so it reads as depth
  under the world rather than weather over it.

If cloud over the ground is wanted anyway, it should be **thin, slow and high-alpha**, and it
should be a setting rather than a fact — the same way the older landmark loop is kept.

`game/dayNight.ts` is the one file allowed to read the wall clock, because what the sky looks like
while you walk is presentation rather than world state. Drifting cloud belongs there or nowhere.

## What this plan will not do

**It will not change the projection.** See the top.

**It will not put cloud between the player and the ground by default.** See E.

**It will not grow the islands at the shores' expense.** See the measurement in `crossing.ts`. If
the map does not grow, the islands do not either.

## The art actually wanted

Two sheets, and neither is large:

1. **A waterfall**, two frames, falling from a rim edge and thinning downward.
2. **Cloud**, as soft shapes with clear space around them so they can be scattered rather than
   tiled.

Everything else here is arithmetic on stamps and depth slots.

## Before believing any of it, render the whole scene

The lesson this programme keeps re-learning, most recently three times in one week: a picture of
one sheet over a flat colour is not what a player sees. The hedge maze hid behind exactly that,
and a compositor bug drew a *forest* tile under the islands for an entire review because it used
a biome index where `tileFrame` wants `index * TILE_VARIANTS + variant`.

An island silhouette is a whole-scene judgement — terrain, rim, decor, shade and overlay together
— and it will be misjudged the same way by the same shortcut.
