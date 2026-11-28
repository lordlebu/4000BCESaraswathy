# Cave household, highland trees and masonry roads - 18 November 2026

This document records the art delivery at the time. The [current Twin Cities profile and save rules](twin-cities-uplift.md) and the [generated cook schedule](strangers-and-happenings.md#what-was-built-for-them) apply to the running game.

## Implemented owner requests

- Yamantaka is twice his previous overworld display scale, walking and seated alike. His foot
  anchor, route and very slow two-minute turn remain unchanged; Mirlepa keeps his approved size.
- The cave body is 192px wide (1.5 map tiles), with a 64px (half-tile) entrance. Code-native broad
  stone masses match the simple objects atlas. The accepted older cave frame is retained.
- Icmic cookers use 75% display scale (96px cell instead of 128px) in both monthly variants.
- The visiting cook reuses the accepted `traveller-nomad` Maru body and stable `faces/maru-m-01.png`
  portrait. The cook's canon identity, language, availability and conversations are unchanged.
- Highland greenery reuses `objects.png` frame 11. A few simple frozen conifers sit on mountain/
  snow tiles. Seeded caps: 72 trees, 24 small path-side stone props; POIs, buildings, routes and
  cave walking space stay clear. No new colliders, species or saved-world generation. Named props/trees/road pieces use the
  existing tile culling, and monthly cooker variants still refresh correctly.
- Roads use matching 16-direction-mask sets for stone, sandstone and brick. Highlands/grassy
  approaches use stone; Harappa uses sandstone and Mohenjo-daro brick. Sand remains around the
  two desert stops. Track art, rail crossings and road bridges retain their existing behavior.

## Every cave night has the three companions

The activity rest card now receives the actual standing-on POI. Only the historical Windward
Cave id selects `rest-windward-cave-midnight.png` (shared meal) and
`rest-windward-cave-dawn.png` (three separate mats/quilts, all three companions asleep).
Yamantaka has three heads on one body in both paintings. The action reads "Stay the night in the cave". Other roofs/camps keep their existing
scene chain; shelter mechanics and save formats are unchanged. Every seeded take selects the
cave-specific pair, never a generic roof card. The traveller is a generic adult Varuna figure,
following the activity paintings' convention, rather than an avatar-dependent portrait.

Built-in imagegen used the accepted Mirlepa/Yamantaka portraits as identity references and the
cave place painting as setting reference. [Exact prompts](twin-cave-rest-prompts.json).
Original 1448x1086 outputs remain ignored under `assets/source/events/cave-roads/`.
Compact full-colour 512x384 sources: `assets/source/twins/rest-cave/`; identical runtime copies:
`src/ui/scenes/`. Import used resize only, no palette/colour/alpha reduction or dithering.
Both scene files are retained in `art-kept.json`.

Rebuild rest copies: `python tools/build-twin-cave-rest.py`.
Rebuild map props/roads: `node tools/build-twin-highland-life.js`.
The map additions are code-native NES shapes; no generated raster was recoloured.
Accepted buildings, Beedu, muted sage ground and all earlier paintings are retained.

## Phase boundary

The whole phase was implemented before combined verification. Final checks pass:
**3,860 unit tests across 176 files**, eight browser cases, typecheck, production build,
canon lock and size gates. App chunk: **218.0/220 KiB gzip**; no code-size budget increase.
The eight browser cases include actual Yamantaka/cave/cooker display dimensions, the reused
Maru cook portrait/body, the real rest action through both loaded paintings and morning exit,
the old cave household contract, legacy night behavior and the four landscape/motion contracts.

Reviewed runtime captures show the enlarged cave/household, frozen conifers, stone/sandstone
bridge approaches and both communal rest cards. All heads remain visible in the sleeping card.
Capture files remain in ignored `test-results/`. Pure tests verify the native cave entrance's
actual 64px dark span, seeded/tree/path-stone caps, all three road materials, route clearance,
unchanged saved world and the cave-only art choice across multiple seeded takes.

The first browser run exposed missing named-prop reporting/culling registration and a rest-test
keypress before the visible action was ready. New named props/trees/roads now enter normal tile
culling and monthly refresh, while named POI markers keep their existing reveal handling. The
rest check uses the actual enabled cave button. The complete eight-case rerun passed in 56.1s.

The broader final integrated visual/gameplay/save/hardware review and owner merge remain;
required art for this follow-up is two rest paintings, both delivered. No new full-screen or
per-frame drawing pass; trees/path stones are capped and camera-culled, road material changes
replace existing road images, and rest paintings load only when their activity card is shown.

Legacy activity-scene guards remain unchanged for existing indexed images. Only these two
owner-approved RGB scene names are allowed native truecolour, with the exact 512x384 dimension
guard, a bound based on native RGB pixel bytes and byte-identical compact-source delivery checks.
The first full unit run exposed four legacy encoding/size assumptions; the corrected focused
scene/new-map checks pass (163 tests). No palette quantization or blanket asset-budget increase.
