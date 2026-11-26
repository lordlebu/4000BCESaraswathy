# Twin Cities highlands and place scenes

This is the follow-up to [the versioned Twin Cities uplift](twin-cities-uplift.md). The `twinScenery` development switch makes the artwork available for owner review. The production build uses the accepted scene until the owner selects the treatments.

## Review in the game

Use `npm run dev` and the same `seed`, `twinGen`, hour, position, and zoom on both sides. The baseline needs no scenery parameter. The review seed is `hybrid-review-0` with `twinGen=2`. Close the place panel to see the walking scene.

| `twinScenery` value | Views |
| --- | --- |
| `rounded`, `terraces`, `alpine` | Single relief treatment across the ridge and foothills. |
| `highlands` | Rounded lower slopes, stepped rock faces, pale snowcaps, the cave rock skirt, and stream margins. |
| `civic` | Harappa and Mohenjodaro, dry outskirts, the Earthen Workshop, Unroofed Rooms, Planted Rooms, and Divided Drain. |
| `outlying` | The Dune Windbreak and Reedwright’s Bank. |
| `all` | All three groups together. |

For the highlands compare the cave, the ridge around `55,5`, and the foothill approach around `44,18`. For each reworked place, compare the approach and the view from the anchor. Check Harappa at dusk and both cities with normal fog. Save raw review media outside the repository. Approve the changed art at desktop and touch-emulated gameplay sizes before enabling it by default.

## Composition and provenance

Relief uses biome, adjacency, and saved elevation bands. Shared edge midpoints join ground forms. Summit crowns come from connected plateau interiors and the cave skirt sits behind the approved entrance. Normal terrain still draws as one baked quad per cell. Terrain and fog share their pixel alignment. The logical pixel artwork is maintained as source in `twinSceneryTextures.ts` and is cached in Phaser at scene entry.

The six place scenes use canonical anchors and ground or prop art chosen for that place. The workshop has a workyard, the Unroofed Rooms show broken walls and nesting pockets, the Planted Rooms have maintained beds, and the Divided Drain has a masonry edge and a reed margin. The Dune Windbreak has a sheltered lee, and Reedwright’s Bank has a sorting area and reed-working tools. Existing painted panels remain the first illustration shown on opening each place.

The planner reserves transport, POIs, their access and residents, and story furniture. Outskirts reuse the approved earthen and brick housing mixture where dry space leaves a walking gap. Courtyard and garden treatments fill the smaller pockets. Static shadows follow the accepted neem projection. Masks are cached by frame, size, and projection class. Story state, navigation, terrain, and bakes continue to come from the loaded world.

## Verification

The placement suite checks both generations and sweeps 150 generation-2 seeds for reciprocal ridge edges, restore consistency, transport clearance, and the 768-frame terrain atlas limit. The browser regression exercises the real preview and reload path, then checks the accepted art path with the preview off. Run the full browser suite on GitHub only. Keep startup within 180 KiB gzip and record the comparison captures, atlas size, object counts, and local renderer timings before promotion. The owner retains merge.
