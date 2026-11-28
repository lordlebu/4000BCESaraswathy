# Harappan art plan — completion audit

This document records the art delivery at the time. The [current Twin Cities profile and save rules](twin-cities-uplift.md) and the [generated cook schedule](strangers-and-happenings.md#what-was-built-for-them) apply to the running game.

The [Twin Cities uplift](twin-cities-uplift.md) records the current seven-phase architecture,
versioned generation, railway review, and release decision.

## Rendering and shadow pilot — 25 November 2026

The approved Twin Cities terrain alignment uses nearest-neighbour atlas sampling and rounds
ground and fog quads to the same screen-pixel edges at fractional zoom. The original sage
palette, map geometry, and fog states are preserved.

The owner approved the [courtyard cast-shadow pilot](twin-cities-art-plan.md#courtyard-cast-shadow-pilot).
Harappa's neem now projects a warm, stepped shadow from the existing sprite. The scene uses
one cached 64 × 32 mask and one camera-culled ground sprite below actors and fog.
Desktop and mobile browser checks confirmed the shadow draws. Reload and map re-entry recreated
one shadow and kept the baked map and explored fog. Two samples per treatment in software-rendered
Chromium at 900 × 650 had 100 ms median frame intervals with the shadow on and off. Physical-device
performance is still unverified.

The review baseline includes 14 captures across Harappa, Mohenjo-daro, the river crossing,
Windward Cave and the desert–highland seam. It includes dusk, normal exploration fog, and
desktop and mobile sizes. The installed courtyard treatment was captured separately after
owner approval. Use the [current plan](twin-cities-art-plan.md#current-plan--twin-cities-art-pilot-25-november-2026)
for scope. The dated production records below are historical.


## Rail bridge, mixed verges and walkway follow-up - 18 November 2026

The owner approved the generated JRPG **rail** bridge with proper cast shading (upper crossing),
vegetation C (object shrubs at cliffs, old grass at borders), and covered clay walkway lamps.
The lower **road** bridge is accepted and retained. Otters gain a short bounded trail using the
accepted water ripple. [Selections, provenance, implementation and verification](twin-walkway-phase.md).
New/replacement art must be sampled for owner selection before applying it; mixed forms and
accepted exceptions are deliberate. Final phase checks pass: 3,863 unit tests, ten focused browser cases and
type/build/data/size gates (app 219.6/220 KiB gzip). Rail abutments overlap both banks; the
road bridge remains accepted. Owner review/merge and broader final review remain.


## Cave household and road follow-up - 18 November 2026

Implemented the owner's follow-up: Yamantaka at double map scale; a 1.5-tile cave body with
half-tile entrance; 75% Icmic cooker; reused Maru cook portrait/nomad sprite; sparse existing-style
highland trees/frozen conifers; stone/sandstone/brick road masks and small grassy path stones.
Every cave rest now selects shared-meal and three-companion sleeping paintings through the
actual standing-on POI, keeping other shelters unchanged. Both new rest paintings are delivered.
[Scope, provenance and verification](twin-cave-roads-phase.md). Muted sage and the very slow cave
schedule remain approved. Final phase checks pass: 3,860 unit tests, eight browser cases and
type/build/size/data gates (app 218.0/220 KiB gzip). Owner review/merge and the broader final
integrated review remain pending.

> **Current checkpoint - 18 November 2026:** Required illustration backlog: **0**. Muted sage is owner approved; terrain borders, shrubs, slow cave walks and bounded ambience are implemented. Final integrated visual/gameplay/save/hardware review and owner merge remain. [Terrain evidence](twin-terrain-softening.md).


## Terrain height and palette follow-up - 18 November 2026

The new map now bakes stepped height shading, river-bank bands and soft sand/turf/rock/snow
transitions directly into a shared ground atlas. Ground stays one quad per tile, with no new
per-frame animation or biome/elevation/save changes. The northeast meadow uses a muted sage
palette and sparse broad turf/stone clusters instead of the bright flat green. Cool lichen and
dry olive are available as development review samples; the owner selected sage.
See [terrain samples and implementation notes](twin-terrain-softening.md). Buildings, sprites,
portraits, event cards and the accepted Beedu remain unchanged. The owner approved muted sage. Eight combined browser checks pass; final
integrated review remains pending.


## Landscape and motion follow-up - 18 November 2026

The required illustration backlog remains **zero**. The owner added one focused landscape/
motion pass: simple NES JRPG cliff shrubs and half-size grass/desert border bushes, richer
older-map ground decor, very slow cave residents, cave smoke, subtle river ripples and localized
desert haze. These are implemented with capped static placements and small cached pixel effects;
phase-end browser, build and size checks pass. Desert haze remains after its measured on/off
comparison; the cave software-renderer samples are noisy, as recorded in the phase ledger.
The cave turn is now 120 seconds with a single slow out-and-back, independent of journey-time
jumps. Existing buildings, Beedu and saved geography remain accepted. See the
[landscape/motion ledger](twin-landscape-motion-phase.md) for scope, exact prompt and budgets.

After this pass, the required work is still the final integrated visual/gameplay/save/performance
review, resolving findings, and owner review/merge. Further character and seasonal art is optional.

Updated 18 November 2026. Companion to the [original plan](twin-cities-art-plan.md).

## Illustration production complete

**No required illustrations remain.** All sixteen authored places now have preferred painted
views: fifteen new full-colour 512?224 panoramas and the accepted Harappa courtyard. They use
cozy watercolor/fine ink, varied warm/cool palettes and each place's authored features. See
[the exact delivery inventory, prompts and rebuild ledger](twin-place-views-phase.md).

Other completed art/gameplay work:

- All twenty valley happenings have preferred paintings; both travel banners and the actual
  map-arrival card have paintings. Accepted earlier originals remain fallbacks.
- Thirteen main portraits, generated wildlife/tram, fifteen named map identities and culture/
  language data; global unknown/known stranger faces remain stable through introductions.
- Northeast Windward Cave at (51,12): distinct green meadow, stream, foothills, mountains and
  border snowcaps, with bounded migration of earlier saved maps and the stable historical POI id.
- Mirlepa/Yamantaka alternate local walks and seated turns; helpers and props rotate by journey day.
- Beedu flight/sighting/witness dialogue and Kang's optional five-beat bust quest, three map
  stages, corrected stone/clay texture and final lapis-eye/paint event cards.
- Shared sparse cliffs/decor and generated NES JRPG props, directional road bridges and separate
  road/rail gates. Ostrich tram uses 240ms/tile with its existing route/fare/day cost and turnaround.

Existing building styles, art, lots and proportions are explicitly retained. New map art stays
simple NES JRPG; accepted Beedu alone keeps small SNES art. Off-map place/event views stay painted.
Raw generations and screenshots remain in existing ignored desktop paths.

## Broader review and publication

| Work | Completion condition |
| --- | --- |
| Twin Cities visual review | The baseline and approved treatments cover both cities, the river crossing and highlands. New artwork proposals still require representative samples. |
| Save and performance | The browser reload and map re-entry check passed. Physical-device performance remains open. |
| Publication | Verify CI on the submitted revision and leave the merge to the owner. |

Expand art or lighting work only when a specific new issue or reviewed proposal justifies it.

## Optional work, outside the required illustration count

Generated replacements for eleven other already-present NES NPC sheets, bespoke helper portraits,
separate Kang commission/site/preparation takes and extra seasonal animation variants. None is
required to fill a missing portrait/place/event slot. Do not repaint accepted buildings or Beedu.
