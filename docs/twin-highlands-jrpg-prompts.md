# Northeast highlands — NES JRPG terrain

## Northeast highlands — owner update, 18 November 2026

The Windward Cave moves from the northwest desert to **(51,12) in the northeast**. Its stable
`poi_northwest_cave_camp` id remains for diaries, discoveries, conversations and quest references.
Fresh and saved twin-city maps receive the same bounded landscape addition; saved city ground,
buildings, roads, rail, other POIs and journey progress remain intact.

Completed in this follow-up: a cool sage/mint meadow distinct from the valley's existing grass;
rounded foothills, bare blue-grey mountains and snow-capped peaks on the north/east border;
and a narrow mountain stream joining the Saraswati. The meadow keeps both residents' local
walking/seated turns and rotating props clear. The northwest Gedrosian margin remains arid.
New ground and hill/mountain forms use **“nes jrpg sprite”**, compact crop/resize-only sources,
simple pixel shapes and layered light/shadow. Buildings and accepted Beedu are unchanged.
The earlier northwest cave instructions below are superseded by this relocation.
See [terrain prompts and rebuild](twin-highlands-jrpg-prompts.md).

The broader plan still has **15 required place-view paintings** and the final combined visual/
performance review pending. This terrain follow-up does not mark those finished.

## Generation and delivery

Built-in image generation, two atlas requests. Full originals stay in ignored `assets/source/events/`;
review captures stay in ignored `dump/twin-city-art-review/`. Tracked sources are 64×64 ground
and 96×80 forms; runtime copies are nearest-neighbour 4× (128px ground cells, 128×160px forms).
Only cropping and resizing are applied; original sampled RGB/alpha are preserved, without
palette reduction or quantization. Rebuild runtime copies with `python tools/build-twin-highlands.py`.

Ground frame order: sage meadow, mint meadow, slate, snow. Form frame order: two rounded hills,
two bare mountains, two snow-capped mountains. Snow biomes and snowy forms stay on the outer
north/east ridge. All terrain assets load only for the twin-city region.

## Exact ground prompt

> Asset type: seamless NES overworld ground tile atlas. Exact style: nes jrpg sprite, very simple 8-bit pixel art. Opaque square image containing exactly 2 columns by 2 rows of equal square tiles with no gaps, labels or dividing lines, designed at native 32 by 32 pixels per tile (64 by 64 total). Top left: soft cool sage green meadow ground, nearly solid with only a few tiny grass strokes. Top right: slightly lighter mint green meadow ground, nearly solid with few tiny grass strokes. Bottom left: muted blue-grey slate stone ground with a few large flat shadow patches. Bottom right: pale blue-white snowy ground with a few ice blue shadow patches. All four tile edges seamless. Flat orthographic top-down surfaces only. Quiet readable surfaces, broad chunky pixels, restrained colours, no dither, no gradients, no rocks or objects standing up, no mountains, no isometric diamonds, no borders, no perspective, no text. These ground tiles go under separately rendered hills and mountain sprites.

## Exact forms prompt

> Asset type: terrain sprite atlas for a tiny NES overworld. Create a transparent 3 columns by 2 rows sprite sheet, six isolated equal cells, no labels or grid lines. Exact style: nes jrpg sprite. Very simple cute 8-bit pixel art, broad chunky pixel clusters, few colours, crisp hard edges, no fine texture. Each cell designed as native 32 by 40 pixels, low resolution from generation. Row one: a low rounded mint-green foothill; a low rounded sage-green foothill with one slate rock; a bare blue-grey mountain with a dark indigo shadow face. Row two: a second bare slate-blue mountain; a taller mountain with a clear white snow cap and blue snow shadows; a second snow-capped mountain. Consistent top-down JRPG map three-quarter view, light from upper left, flat simple shadow layers. Mountain silhouettes wider at bottom, narrow at top. Entire silhouettes inside each cell, generous transparent separation. No buildings, people, plants, scenery backgrounds, photorealism, gradients or decorative tiny marks. Keep true transparent alpha background. Six sprites only.

## Phase-end validation

Typecheck, 59 targeted world/save/movement tests, canon lock validation, production build
and unchanged bundle budgets passed. The app is 213.5 KiB gzipped (220 KiB cap); canon is
130.3 KiB (350 KiB cap). New runtime terrain PNGs total 19,034 bytes. Loading the ending
panel on demand keeps the app within budget; its real settlement page was browser-checked.
Two targeted headless browser cases passed: cave assets/NE coordinates/alternating poses,
and the settlement ending page. Cave screenshots remain in ignored `test-results/`.
Lore schema/reference lint, playability, export-boundary and actual sibling-export comparison
passed. No save or bake version bump; the bounded terrain migration has its own region marker.
Full exact-head CI remains the merge gate; this is not a final performance review.

## CI correction ? 18 November 2026

The full CI unit job exposed four gaps outside the earlier targeted subset: the authored
mountain/snow ground was absent from canon's map palette, the green cave meadow used a lowland
height despite the POI's high-standing requirement, and two older art/snow tests still expected
the preceding inventory. Canon now declares mountains/snow. The meadow and foothills sit on the
upland terrace, with bare/snowy peaks higher still. Region migration revision 2 upgrades both
pre-highland saves and revision-1 previews without rebuilding towns or transport. Tests check
upland cave placement through reload and constrain twin-valley snow to the northeast border;
delta/basin maps still forbid snow. The arrival registry test expects the delivered painting.

The full local suite also found the older kulfi test's assumption that Narmada was the sole
snow-bearing map. It now includes twin-valley border snow while explicitly preserving the
Narmada-only kulfi crafting rule. No recipe restriction was relaxed. All four browser shards
of the original CI run passed; the reported failure was confined to the unit job.
