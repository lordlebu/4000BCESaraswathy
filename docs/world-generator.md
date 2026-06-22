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
- `elevation`: normalized height value.
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
