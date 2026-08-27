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
