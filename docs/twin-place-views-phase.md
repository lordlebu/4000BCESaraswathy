# Twin-valley place paintings ? 18 November 2026

Fifteen new preferred panoramas complete the sixteen-place illustration inventory alongside the
accepted Harappa courtyard. Simple cozy watercolor / spare fine ink, broad warm/cool palettes,
recognizable local architecture and ecology. The imagery is off-map; the existing NES overworld,
all buildings, courtyard painting and accepted small SNES Beedu remain unchanged.

## Delivery and exact prompts

Built-in imagegen, one request per place, with the accepted courtyard as a style/material reference.
The native outputs are about 1895?1896?830 despite lower-size requests. Center/subject crop and Lanczos
resize deliver 512?224 RGB PNGs. No palette reduction, quantization, recolouring or dithering.
The complete exact prompts, native dimensions, source/final SHA-256 hashes, bytes and paths are in
[`tools/twin-place-views.json`](../tools/twin-place-views.json). New files total **3,677,562 bytes**.

Final game files: `src/ui/places/<canon-poi-id>-painted.png`.
Raw sources: existing ignored `assets/source/events/twin-place-views/`.
Composites/import metadata: existing ignored `dump/twin-city-art-review/place-views/`.
Browser captures: ignored `test-results/`. No screenshots/raw generations are committed.

Rebuild from retained raw sources with `python tools/import-twin-place-views.py`.
The final PNGs are the tracked art; large raw generations intentionally stay out of Git.
The tool also accepts a generated-output import JSON path, using the same approved resize-only path.

## Delivered subjects

| Place | Preferred file | Bytes |
| --- | --- | ---: |
| The Raised Brick Quarter | `poi_brick_quarter-painted.png` | 241,486 |
| The Sheltered Caravan Ground | `poi_desert_ground-painted.png` | 236,080 |
| The Divided Drain | `poi_drain_court-painted.png` | 251,405 |
| The Dune Windbreak | `poi_dune_windbreak-painted.png` | 206,556 |
| The Earthen Workshop | `poi_earthen_workshop-painted.png` | 242,358 |
| Harappa Tram Yard | `poi_harappa_station-painted.png` | 235,640 |
| The Nesting Cove | `poi_nesting_cove-painted.png` | 247,296 |
| The Unroofed Rooms | `poi_nesting_ruins-painted.png` | 236,965 |
| The Windward Cave | `poi_northwest_cave_camp-painted.png` | 258,490 |
| The Planted Rooms | `poi_planted_ruins-painted.png` | 247,616 |
| The Three Channels | `poi_reed_junction-painted.png` | 248,714 |
| The Reedwright's Bank | `poi_reedwright_bank-painted.png` | 265,172 |
| The Open Crossing | `poi_twin_causeway-painted.png` | 259,497 |
| The Quiet Coves | `poi_twin_cove-painted.png` | 251,274 |
| The Southern Landing | `poi_twin_landing-painted.png` | 249,013 |

## Integration and next phase

The existing `placeArt` ? `preferredArt` ? `PlacePanel` path selects each new canon-id panel.
Sixteen stops therefore use their own view rather than a shared category filler. URL imports
stay separate from image fetching: only the active card should request its image. There is no
new map renderer, POI list in production code, image preload or gameplay/schema change.

The next required phase is the final combined visual/performance pass: crops/readability,
keyboard/touch and fog/dusk; cave alternation/helpers/monthly props; Beedu flight/event/dialogue;
tram speed/turnarounds; Kang's optional bust/painted-stone/lapis eyes; save/reload and measured
frame/load costs. Resolve actual findings, then owner review/merge. Additional character sheets,
commission variants and seasonal takes remain optional. No required illustrations remain.

## Phase-end findings and checks

Wide desktop cards initially cropped the station ostrich's head. The station painting was
recomposed with bird/carriage in the middle distance, then given a recorded subject crop;
the bird and carriage fit the shallow banner without increasing card height or hiding map space.
The first raw and exact edit prompt remain in the provenance manifest/ignored source history.
The fifteen new filenames were added to the retained-art manifest; none of its older entries
or earlier paintings were removed.

The first full unit run passed 3,769 tests and identified the fifteen missing retained-art entries.
After recording them, all 1,342 focused retained-art/delivery checks pass. Typecheck, canon-lock,
production build and size budgets pass (app about 213.7/220 KiB gzip; canon 130.4/350 KiB).
Desktop city/cave/coast callers and the mobile cave card pass browser checks. The request check
counts actual image downloads rather than Vite URL-module requests, and confirms only visited
place paintings are fetched. Final exact-head CI remains required; this is not the complete
map-wide visual/performance review.
