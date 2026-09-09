# World Map Generator Design

## Generator Goals
The generator should produce readable, explorable geography before it produces decoration. A good map should have coastlines, rivers, mountains, forests, dry regions, wetlands, settlements, and landmarks that feel connected.

## Inputs
- `seed`: string or number used to reproduce the same world.
- `width` and `height`: tile dimensions.
- `regionProfile`: broad mood such as coastal delta, inland plateau, river valley, forest edge, or mountain foothills.
- `relaxationLevel`: optional tuning value that can reduce danger and increase cozy discoveries.

## Output Tile Fields
Each tile should eventually include:
- `x`, `y`: grid position.
- `elevation`: normalized height value. `band()` in `classify.ts` reads it as one of three terraces — see below.
- `moisture`: normalized water availability.
- `temperature`: normalized climate value.
- `biome`: final terrain/biome classification.
- `features`: rivers, roads, ruins, groves, caves, settlements, shrines, ferry points, or creature nests.
- `discovered`: whether the player has visited or observed the tile.

## Generation Passes
1. **Seed setup:** initialize deterministic random functions.
2. **Elevation:** generate lowlands, hills, mountains, and sea basins.
3. **Water:** mark sea, coasts, lakes, wetlands, and river sources.
4. **Climate:** combine latitude-like bands with moisture and elevation.
5. **Biome classification:** choose terrain from elevation, moisture, and temperature.
6. **River carving:** route rivers downhill toward sea or wetlands.
7. **Settlements and paths:** place settlements near water, coast, plains, and route intersections.
8. **Landmarks:** place a small number of memorable points such as ancient observatories, giant banyans, hot springs, shell beaches, or hill shrines.
9. **Creature habitats:** populate encounter tables from biome and nearby features.
10. **Narrative labels:** generate discoverable place names and short descriptions.

## Height bands, and what reads them

`Tile.elevation` has been there from the beginning, and `classifyBiome` has always read the same two
constants to decide `hills` and `mountains`. Those constants *are* terraces, so `band(elevation)` in
`classify.ts` names them rather than adding anything:

| Band | Elevation | Biome it produces |
|---|---|---|
| 0 | ≤ `HILLS` (0.66) | lowland — plains, forest, wetland, desert, coast, sea |
| 1 | > 0.66, ≤ `MOUNTAINS` (0.82) | `hills` |
| 2 | > 0.82 | `mountains` |

The renderer draws a **cliff rim** wherever a tile's band is higher than an orthogonal neighbour's
— see `docs/rendering.md`. Nothing was added to the world model to make that possible, which is the
point: the height information was always present and simply unread.

Two consequences worth knowing before retuning either threshold:

- **`test/generator.test.ts` asserts against `THRESHOLDS`**, because a retune that starves a biome
  should fail the build rather than the playtest. The cliffs now inherit that guard.
- **Moving a threshold moves the cliffs too.** That is correct, and it is the lever for the
  complaint below.

## Resilience: what breaks when content is added, and what has been fixed

Written when the tileset was about to grow substantially, on the question *"why does changing one
map affect the others?"* The short answer is that there were **three separate coupling mechanisms**
and they were easy to confuse with each other. Two are now fixed; the rest is recorded here so the
next person does not have to rediscover it.

### The general rule

**Never let array position be part of the seed contract.** Every failure below is the same
mistake wearing a different hat: something chose an item with `hash % list.length`, so the
*length and order* of the list decided the answer, and any edit anywhere in the list moved
everything. The market answer is to hash the *identity* of each candidate and keep the best
scorer — rendezvous hashing, the same reason CDNs use consistent hashing instead of `% nodes`.
Adding a candidate can then only take what it wins outright.

### Fixed

| Was | Symptom | Now |
|---|---|---|
| Species picked by `hash % pool.length` | Adding one plant re-rolled **95.4% of tiles**, of which only 5.2% was the newcomer arriving — the rest was existing species swapping places on ground players had walked. Forced a `SAVE_VERSION` bump for a pure content addition. | `weightedPickFor` scores each species by `(tile, species id)`. A newcomer takes **4.8%**, all of it its own share. `source_index` is no longer load-bearing. |
| Places sited by `hash % candidates.length` over a row-order tile list | Removing **one tile** from a 400-tile pool moved **all six** of Lothal's places. Invalidated every searched e2e seed on any change to `src/world/`. | `pick` scores each candidate tile by its own coordinates. A place moves only when the ground under *it* changes. |
| Nothing excluded the start tile from placement | Never a rule — the modulo simply never landed there. When scoring replaced it, `play-test` put Kavik's Tower exactly on the tile the traveller wakes on, so the journey opened *inside* its destination and the arrival beat fired at boot. | `taken` is seeded with `world.start`. |
| Four e2e fixtures were **searched seeds** | Went stale four times; cost twelve CI failures once; the last re-search found *no* seed with the walk the spec wanted. | `startTileFor` adds `?at=poi_id` or `?at=x,y`, like the existing `?hour=`. A test says where it stands. |
| A failed tile sheet drew Phaser's `__MISSING` checkerboard silently | Black squares shipped to GitHub Pages and needed a bug report to notice. | `loadTileSheets` logs the key and URL, and records it in `missingSheets()`. Covered by `e2e/tiles.spec.ts`. |
| The world was regenerated from its seed on every load | Determinism was doing persistence's job, so **every** generator change moved the ground under saved journeys. `SAVE_VERSION` 7, 10 and 11 were all this, with no payload change. | `world/bake.ts` resolves a map once and stores it (5.6–9.5 KB). A journey keeps its ground; generator changes reach only new journeys. |
| A whole continent was generated and then remapped into each map's palette | `BECOMES` was global but fired per-map, so tuning one map re-terrained the others. It is why the Narmada hit 55.8% river the moment canon gave it a river. | `classifyBiome` takes the palette. Nothing outside it is ever generated, so nothing needs substituting; `BECOMES` is deleted. |

One measurement worth keeping: `tileHash` is FNV-1a and **does not avalanche on a change to its
last character**, so ids differing only in a trailing digit hash to near-consecutive values. A
modulo never noticed, because it reads the low bits of one hash; rendezvous compares whole hashes,
and without a finalizer the last of 21 equal candidates took 25.8% of tiles while another took
1.0%. Murmur3's `fmix32` brings it to 4.5–5.0% against an even 4.76%. Any future use of `tileHash`
for comparison rather than indexing needs the same treatment.

### Still open

Baking paid for itself immediately. The classifier rewrite below changes the shape of two of the
three maps and needed **no `SAVE_VERSION` bump at all** — an existing journey restores its baked
world and keeps the ground it started on, and only new journeys see the new generator. Before
baking that same change would have cost every player their progress.

Two things worth keeping from the classifier work:

**An absent biome's span is absorbed by its neighbour on the same axis, not redistributed.** The
axes are lists of upper bounds, so dropping an entry hands its span to whatever now sits above it —
no code, just the representation. That is also the behaviour you want, because a biome's span is
positional: `sea` is the low end of elevation, `wetland` the wet end of moisture.

**But absorption alone is not enough when nothing survives at the bottom.** Dropping `sea` and
`coast` from the Narmada handed everything below 0.36 — 54% of that map's tiles — to lowland
ground, giving a plateau with 69.5% plains and 2.5% hills. So a map that keeps *neither* sea nor
shore has its elevation lifted into the span it actually uses. A map that keeps a shore does not,
because the shore is the natural owner of the water below it: lifting Dwarka instead squeezed its
coast to 1.6% and left the seawalls standing on nothing. Measured both ways before choosing.

Note also that `normalize` rescales elevation to 0–1 *after* the terms are summed, with fixed
thresholds against that normalised range — so a local change to any additive term redistributes
everything. Damping the delta's spine drove hills from 6.7% to 25.9% this way. Measure all three
maps after touching any shaping term.

## The crossing, and what a fourth landform cost

The Aravali is the fourth field map and the first that is a **sequence** rather than a country:
stony shore, water, islands, far shore, walked in that order. Almost everything it needed was a
thing the generator could not say, and each one is now written down here because the next map like
it will need the same.

**A map's shape is canon's to state.** `proportion` — `square` or `portrait`, absent meaning
square — sits beside `relief` and `scale` on the field map. Drawn square the crossing could not be
any of its four bands properly at once: the sea had to read as a sea across the full width, which
left twelve rows of shore at each end with no room for relief and put the islands close enough to
read as one shape with a nick in it. 44×66 is the reference's own 2:3 and *fewer* tiles than
64×64, so nothing got slower.

**Islands are ellipses, not circles.** Round was why they had to be shrunk to make room for each
other: a circle wide enough to look right is also tall enough to close the gap. Nineteen across and
twelve deep, with fourteen rows of water between.

**The rock face hangs below the island, not around it.** The first version stamped `sky_underside`
just inside the ellipse, so the island's outermost tiles *became* rock — a grey moat that reads as
a crater, and a tile of walkable top lost all the way round to a biome that is deliberately not
walkable.

**Both shores are different countries**, which canon's own arrival text had said all along: near is
*"the ranges come down to the water in steps of grey stone"*, far is *"a green smudge that is not
Jambhudweepa"*. One term of elevation tilted south and one of moisture tilted north; measured, the
north is 289 forest and 1 hill, the south 158 hills and 17 mountains against 25 forest.

**`Tile.track` is a flag, not a biome** — the sea below it stays sea and stays navigable. The rail
runs between the islands only, because the islands are what hold the line up; ropes climb from each
shore, and a stub of derelict line runs inland from each landfall, which is canon's *"a rail-head,
a shed, and a line of iron"*. Which stretch is rail and which is rope is **derived** from where the
islands are (`railSpan`) rather than stored, so the drawing and the carriage's route cannot drift
apart.

**A shadow is what makes it float.** Grass to the edge, a face under the lip and cliffs along the
joint are all equally true of a sea stack; what separates a floating shelf is that light gets
underneath. It is a tinted quad rather than a sheet, special-cased in the scene like the marker
glyph.

Three of these were caught by tests that were **asking the wrong question**, which is the pattern
worth carrying forward: a cliff test that counted every cliff on the map and so passed at "over
twenty" while the islands had none; a route test that asked whether the run was continuous and one
column wide, while three parallel railways ran up the middle of the sea; and a walkability test
that asked whether the start was on land, but never which side of the water.

**1. `relief` cannot express visual relief.** Canyons, cliff faces and a two-tile-wide Narmada
were all asked for and none is expressible today. They belong with the classifier rewrite rather
than before it.

**2. Tiles for `lava_field`, the sky biomes and the train track — done, and the last of them
taught the most.**

All three have art and ship. What the work found is that *having a tile is not the same as having
the ground*, and the gap between those two is invisible to every test that was watching.

`classifyBiome` only ever emits the eight biomes in `ALL_TERRAIN`. `snow`, `sky_island`,
`sky_underside` and `lava_field` are not among them and never will be: they are **places**, not
climates, and a place is stamped onto finished ground after classification. `tableland.ts` stamps
the drifts, `crossing.ts` stamps the islands and the line — and for `lava_field` nobody ever wrote
the stamp.

So it had painted ground, a terrain frame, six decor props, basalt columns on the overdraw sheet,
25 creatures, 6 plants, a place in `data/biomes.json` and canon's palette entry for Dwarka with
four points of interest asking to stand on it. **And the map generated zero tiles of it on every
seed.** All four places silently took their second-choice terrain. Nothing failed, because nothing
asked whether any of it was on the map — that is now the first assertion in `test/basalt.test.ts`.

The rule this leaves: **a renderable biome that no module stamps is a biome that does not exist.**
When canon adds one, `basalt.ts` is the shape to copy — describe what the thing *is* (an old flow
the city was built on) so the rule picks out the map that has one, rather than naming the map.

**3. Hardening — done, and two of its three items were not real.**

The deferred list named load limits, malformed-canon handling and error recovery. Checking each
before writing code found that only the last one existed.

**Load limits are already gated.** Canon's `check_export_boundary.py` refuses a bundle over
560 KB, and it sits at 494 KB. That gate was added during the making-layer work and the note here
had not caught up.

**Malformed canon cannot happen at runtime.** The bundle is `import`ed, not fetched — Vite inlines
it at build time, so a broken `species.json` fails the build rather than reaching a player. Adding
runtime validation would be guarding against a state the architecture makes unreachable, and would
cost every load a parse it does not need.

**Error recovery was the real gap, and it was worse than "recovery".** There was no boundary
anywhere: React unmounts the whole tree when a render throws, so a single fault took the map, the
notes and the diary with it and left a white screen with no way back. `ui/Fallback.tsx` catches it
and offers the one thing that matters — a reload, which re-reads the save, and the seed, which is
the whole world in a word. It sits outside `StrictMode` so it also catches a fault during the
double render StrictMode performs in development, which is where a new bug shows up first.

## Known: the maps are the weakest part, and it is not the art

Recorded at the close of the art programme, when every ground biome had been made to tile and the
verdict on what remained was *"mountains look fine, so are forests now that it has a forest line.
The issues are the maps themselves."* Three observations, from playing all three field maps:

| Map | What is wrong | What that probably is |
|---|---|---|
| **Lothal** | hills and rivers tangled through the middle; nothing about it reads gracefully | two features interleaved at a scale finer than either reads at — a frequency problem in the fractal fields, not a palette one |
| **Narmada** | the plateau is beautiful; two further hill clusters have no cliff sides and no peaks | upland that never crosses `MOUNTAINS`, so it is band 1 throughout and no boundary exists to draw a rim along |
| **Dwarka** | one central cluster, structures scattered over plain, too easy to cross | placement and difficulty — where points of interest land and what `travelCost` charges |

**Narmada is the cheapest to test and the most likely to be a single number.** If those clusters sit
just under 0.82, they are band 1 with band 1 around them, and no threshold is crossed anywhere
inside them. Measure the elevation range of a cluster before changing anything: if the map's own
maximum barely reaches the threshold, the fix is the threshold or the shaping, not the drawing.

None of the three needs new art.

## Terrain Palette For Prototype
| Biome | Map Role | Early Visual Direction |
| --- | --- | --- |
| Sea | Boundary and ferry routes | Deep teal with soft waves |
| Coast | Transition and settlements | Sand, palms, shells |
| Plains | Easy travel | Warm grass and flowers |
| Forest | Dense discovery area | Rounded green canopies |
| Wetland | River and bird habitat | Reeds, shallow water |
| Hills | Route texture | Ochre bumps and shrubs |
| Mountains | Barriers and vistas | Lavender-gray peaks |
| Desert | Sparse mystery | Gold dunes and stones |
| River | Navigation and life | Bright blue winding line |
| Settlement | Rest and lore | Tiny clay roofs and flags |

## Creature Placement Rules
- Common creatures should be visible in safe biomes and near settlements.
- Rare creatures should require specific combinations, such as forest plus river or mountain plus dawn.
- Mythic creatures should be framed as awe-inspiring encounters, not enemies by default.
- The journal should record mood, tracks, habitat clues, and sketches.

## Prototype Algorithm
For the first implementation, avoid heavy dependencies:
- Use a small deterministic PRNG such as Mulberry32 or xorshift.
- Use smoothed random fields for elevation and moisture.
- Add a broad north/south or east/west gradient for climate.
- Classify terrain with threshold rules.
- Draw with simple rectangles and symbols before custom artwork exists.

## Success Criteria
A generated map is successful when:
- The player can visually identify several geographic regions.
- Rivers connect mountains or hills to sea, wetland, or lowland basins.
- Settlements mostly appear in believable places.
- Creature sightings are explainable from habitat.
- The map invites the player to ask, "What is over there?"
