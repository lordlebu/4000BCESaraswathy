# Twin Cities uplift

The November 25 rendering pilot fixed fractional-zoom terrain and fog alignment and installed the approved Harappa neem cast shadow. This follow-up applies the [seven-phase architecture roadmap](https://chatgpt.com/share/6b079b66-a214-83e8-a6ef-3236a79e629b?ogimg=plain) to the Twin Cities. The [earlier uplift discussion](https://chatgpt.com/s/t_6b07405e193481919c2f4c7d67ac51b3) sets the scope for rail and local landscape polish.

| Phase | Implementation and evidence |
| --- | --- |
| 1. Geography contract | A profile declares the map ID, dimensions, generation and authored anchors. The 16 Twin Cities places, two city identities, railway and crossing rows retain their established positions. No canon export change is needed. |
| 2. Generation stages | The ordered stages initialise landforms, carve the Saraswati and two tributaries, connect roads and lay out residential plots. Layout salts are separate from the fixed crossing seed. Generation tries up to 16 deterministic layouts and accepts the first one that passes validation. |
| 3. Twin Cities vertical slice | Generation 2 varies river width and bends, shoreline, foothills and house lots. The civic anchors and cave threshold are protected. New layouts reuse established building materials and contact shadows, pair occasional bank plants and align cached ripples with nearby flow. |
| 4. Journey storage | Twin Cities uses the same generator for seed links and fresh walks. The current bake is reused on reload. The reset clears obsolete journeys, bakes and the last seed while retaining screen preferences. |
| 5. Cross-map boundaries | The seam contract reads an authored strip of elevations, terrain and road crossings in either orientation. Two fixture maps exercise the same seam in opposite generation orders. The Twin Cities' existing travel links need no physical seam. |
| 6. Rendering and rail | Both profile fixtures use the shared terrain planning path. Game terrain still uses one atlas quad per tile with shared pixel alignment and fog. The approved rail atlas supplies terminal and corner frames, and carriage motion follows the same centreline. The existing rail bridge, fares and journey duration carry through. |
| 7. Onboarding and acceptance | The steps below reproduce the versioned layout and rail review. The fixed-seed suite covers 20 layouts. GitHub Actions runs the complete browser suite, including starting and reloading a generation-2 walk. The owner approved the two treatments and controls merge. |

## Reproduce the review

1. Start the game with `npm run dev`. Open `/?map=field_map_twins&seed=hybrid-review-0&door=open&firsts=off&events=off&at=poi_harappa_court&hour=18`. Use an isolated browser context for each comparison so each map receives the intended bake.
2. Visit the Harappa Tram Yard and Raised Brick Quarter and ride in both directions. For mobile, use a touch-enabled browser profile.
3. From both city centres, walk toward their neighbourhoods. Check the higher cave approach and its clear threshold, the two Saraswati crossings, and the landing at the gulf. At Harappa at dusk, check the neem shadow under the canopy and the fog edges over the court.
4. Run `npx vitest run test/twinHybrid.test.ts`. The suite checks bridge positions, repeatability, POI reachability, tributary geometry, lots, atlas frame count, rail motion and bake round trips. Check [PR #275](https://github.com/lordlebu/4000BCESaraswathy/pull/275) for the full browser results.

## Add a profile

Declare the dimensions and protected anchors in `MapProfile`. Supply a base layout and pass ordered deterministic stages to `generateFromProfile`. Use a separate salt for each independent layer and validate navigation after routes. Where published geography specifies a physical boundary, author one edge and apply it from both profiles with `applyProfileBoundary`; match strip lengths and test both orientations. Give the renderer a ground art selector, highland predicate and palette via `TerrainRenderProfile`. Test the resulting `terrainAtlasLayout` against the frame budget before wiring the renderer into gameplay.

## Original comparison from November 2026

The desktop and touch comparison covers eight views each, with current and proposed versions for a total of 32 captures. It includes the two bends and station approaches, both bridges, Windward Cave, Harappa at dusk, the Brick Quarter and the waterfront.

On the review seed the ground atlas uses 582 frames in generation 2 and 525 in generation 1, against a 768-frame budget. In local software-rendered Chromium the median of eight sampled view medians was 117 ms at the desktop viewport and 67 ms at the mobile viewport for both layouts. These measurements describe that local renderer. The approved production build puts startup at 169.39 KiB gzip against its 180 KiB budget. Typecheck and the canon lock passed. Production browser checks confirmed that the fresh layout survives reload and that the tram runs both ways with the approved rail.

## Release

The owner approved both treatments on November 26. The approved rail details and tram motion run on current Twin Cities maps. The owner retains merge after GitHub verifies the release commit.
