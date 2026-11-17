# Harappa and Mohenjodaro

## Latest Kang and phase status — 17 November 2026

Kang's NES JRPG sprite now wears **light indigo**. His conversation portrait and the statue
carving/unveiling cards use the owner's initial **simple cozy watercolor** style. The optional
five-beat bust quest and three persistent map stages are wired; these are distinct delivered
paintings, not a generic event fallback. Full-colour resize only. The current required art
backlog is **36 images**; see [the phased checklist](twin-cities-art-status.md) and
[original plan checkpoint](twin-cities-art-plan.md#conclusion-checkpoint--17-november-2026).

## Cave household update — 17 November 2026

Mirlepa and Yamantaka now take turns sitting and walking beside the northwest cave. Each
45-second turn leaves one in a generated seated pose while the other follows a short cardinal
out-and-back route. Both use the same approved twenty-pose NES JRPG sheet quality. The routes
stay on opposite sides, avoid other residents, props, water and the entrance, and follow restored
POI coordinates. This is local presentation; neither joins the three city circuit walkers.

Three **“nes jrpg sprite”** props — prayer flags, a fictional solarpunk Icmic cooker and a bonfire —
have paired visual states. Six arrangements change every five journey days and repeat after
thirty days. Returning on the same journey day gives the same arrangement. The cooker is a
fictional insulated terracotta/basket design with a brass reflector, not a historical technology
claim. This adds no fuel consumption, quest gate, combat or saved schema. Large generation
originals remain ignored. See [the prompt and rebuild ledger](twin-cave-jrpg-prompts.md).

> **Current art forms (17 November 2026):** Follow [the element-by-element guide](art-direction.md#current-element-by-element-direction--17-november-2026). New overworld people, wandering animals and trams use **“nes jrpg sprite”**; Beedu alone keeps its accepted small SNES art. Terrain/buildings remain simple NES; off-map portraits/events/places/plates remain painted, with the two Denisovan portrait exceptions. Older prompts below are production history where they conflict; new delivery uses resize only, without colour reduction.

Owner decisions, 14 November 2026. The small-island proposal is replaced by a 64×64
mainland map. The controlling art direction is now **simple 8-bit NES map art**, as settled in
[the current plan](twin-cities-art-plan.md). Existing accepted map work stays; improve composition,
shadows and depth without adding dense texture. Off-map paintings can remain rich.

Review captures and machine-specific measurements live locally under the already ignored
`dump/twin-city-art-review/`. Paths below are local references, not tracked or published media.

## Phases and review

| Phase | Implemented | Actual game captures |
| --- | --- | --- |
| Geography | 4,096 tiles, matching Narmada's size; northwest Gedrosian desert margin, dunes and hills; north–south Saraswati; southern delta and coves; southeast Tethys | Survey: `dump/twin-city-art-review/survey.png` |
| Architecture and scale | Two radius-four towns: 41 settlement tiles each, nine across, matching Dwarka's main city footprint. Ochre courtyard houses in Harappa, red fired brick in Mohenjodaro. Native 80×88 house frames match Lothal and Dwarka. | Harappa: `dump/twin-city-art-review/harappa.png`, Mohenjodaro: `dump/twin-city-art-review/mohenjodaro.png` |
| Boundaries and transport | Low walls meeting Harappa's northwest rocky shoulder and Mohenjodaro's eastern river terrace. Open road/rail gates; separate road and railway decks. Ostrich tram follows the bent track in both directions during daylight. | Causeway: `dump/twin-city-art-review/causeway.png`, mobile station: `dump/twin-city-art-review/mobile-station.png` |
| Life and diary | Twelve places, eight four-rung discoveries, two questions, knowledge-dependent dialogue and three visible local improvements | Delta: `dump/twin-city-art-review/delta.png`, coves: `dump/twin-city-art-review/coves.png`, desert: `dump/twin-city-art-review/desert.png` |
| Verification | Seeded geography, connected water network, reachable places, saved ground, boarding, nighttime rest, diary interaction and runtime art loading | `test/twinCities.test.ts`, `e2e/twin-cities.spec.ts` |

Walls are low surviving enclosures, consistent with rooms becoming habitats. Like existing
settlement palisades, they are scenery rather than a new collision system. Natural features
replace stretches of wall. Roads and rails remain clear of houses. The inhabited footprint
excludes the outlying tram yard and river landing. No new homestead is introduced.

## Population and encounters

| Content | Initial scope | Current scope |
| --- | ---: | ---: |
| Named NPCs | 8 | 10 |
| Named NPCs who also travel | 3 of those 8 | 3 of those 10 |
| Random road NPCs | 2 | 2 |
| Temporary camp residents | 3 at one active rotating camp | 3 at one active rotating camp |
| Maximum available identities, including a camp | 13 | 15 |
| Authored happenings | 12: 10 once-only, 2 recurring with a three-day cooldown | 18: 16 once-only, 2 recurring with a three-day cooldown |
| Points of interest | 12 | 15 |
| Discoveries / field questions | 8 / 2 | 8 / 2 |
| Moving wildlife | 4 | 4 |

The initial named people are Eru, Nemi, Tavra, Renu, Seli, Oru, Pavi and Denu.
Irekha repairs reed boats at the new bank; Ulenna watches the new nesting cove. Travelling does
not create another copy of a person. Camp residents are temporary road company.

Dry-ground plants remain sparse. Palms, acacias and grass concentrate along the river,
reeds occupy wetlands, and mangroves are limited to the southern delta. Moving wildlife
comprises desert foxes, river otters, monsoon cranes and Tethys pelicans. Mainland species
filtering excludes island-only species. Three camp clearings rotate under the existing
distance rules for roads and places.

All four moving species have dedicated sprites in four directions. Their display bounds
keep the smaller animals below hut width, avoiding the generic large-animal placeholder.

## Reproduce the art and demonstrations

`python tools/build-twins.py` builds the original terrain, houses, walls, natural edges,
routes, tram, portraits and notebook illustrations. Rooflines and tile patterns from the
first draft are retained, with stepped lighting ramps and small pixel clusters. Existing
map art is preserved. Houses use their own 80×88 sheet without runtime stretching.

Start `npm run dev`, then run `node tools/review-twins.js`. It photographs the running
Phaser game at seed `twin-review`, noon, at 1280×900 and 390×844. It clears browser storage
between pages so an old baked map cannot replace revised geography. The six location
pictures and survey use a **development-only fog reveal**: visual reviews, not a claimed
playthrough. The scale references use ordinary fog at identical camera zoom:

- Dwarka: `dump/twin-city-art-review/dwarka-scale.png`
- Harappa: `dump/twin-city-art-review/harappa-scale.png`
- Generator and placement measurements: `dump/twin-city-art-review/metrics.json`

Local demo:

```text
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_harappa_station
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_brick_quarter
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_twin_cove
```

Canon v3.7.0 owns places, people and writing; the game owns geography, art and transport
rules. Ground, journey and knowledge version numbers remain unchanged. Two-city metadata
is optional, preserving older maps and journeys. Map-size and bundle budgets are unchanged.
The workshop, collection, people and map panels load with the app so their first press
responds immediately. Small sprite assets remain separate cacheable files instead of
being embedded in JavaScript, keeping the app within its unchanged bundle budget.

## Follow-on implementation

The initial map and its CI repair were merged in game PR #259 and canon PR #166.
The next stages keep the existing ground, city footprints and 80×88 house scale.

| Stage | Work | Status |
| --- | --- | --- |
| 6 — Gameplay completion | Causeway hailing, introductions, repeat meetings and touch access; verify the existing diary, camp and transport loop | Implemented |
| 7 — Graphics | Additional SNES house/terrain variants, weathered enclosures, readable natural edges and tram animation; retain accepted art | Implemented |
| 8 — Expansion | A small content batch within the allowance below, after gameplay and graphics checks | Implemented: 2 people, 3 places, 6 events |

The conversation regression occurs when a visible stranger is still walking at dusk:
the daytime rule for chance encounters also rejected an explicit introduction. Explicit
requests now bypass that time gate, while automatic encounters retain it and unbridged
water remains excluded. Coverage includes the actual bridge, keyboard requests and touch.

## Completed graphics and expansion

`python tools/build-twins-polish.py` builds additive house, scenery, bank/cliff, tram and
new notebook assets. Accepted source PNGs are retained; seeded selection still uses all
eight original house frames alongside eight new native 80×88 variants. Gate posts leave
routes open. Moving water glints use the existing sway mechanism. The tram has four
walking poses in four directions and a short quarter-turn/reverse at each terminus.
Place markers are selected by ID, so adding places cannot shift their artwork.

Run `node tools/review-twins.js --polish` against the dev server for the current captures:

- Harappa: `dump/twin-city-art-review/polish/harappa.png`, Mohenjodaro: `dump/twin-city-art-review/polish/mohenjodaro.png`
- Causeway: `dump/twin-city-art-review/polish/causeway.png`, moving tram: `dump/twin-city-art-review/polish/tram-moving.png`
- Identical-scale references: Dwarka: `dump/twin-city-art-review/polish/dwarka-scale.png`, Harappa: `dump/twin-city-art-review/polish/harappa-scale.png`
- New places: dune windbreak: `dump/twin-city-art-review/polish/windbreak.png`, reedwright bank: `dump/twin-city-art-review/polish/reedwright.png`, nesting cove: `dump/twin-city-art-review/polish/nesting-cove.png`
- Mobile station: `dump/twin-city-art-review/polish/mobile-station.png`, survey: `dump/twin-city-art-review/polish/survey.png`, measurements: `dump/twin-city-art-review/polish/metrics.json`

The original location pictures above the follow-on section remain the earlier visual baseline.
Survey pictures reveal fog only for development art review. Touch behavior is separately
covered with an actual touch-enabled browser context.

The three new places offer six quiet happenings: wind shelter, a flexible boat seam,
leaving room for the tide, subsequent reed repairs, returning birds, and a courtyard's
unused edge. Knowledge gates use the existing discoveries; there is no new reward currency.
A separate return-entry notification lets knowledge-gated follow-ups open on a later
walk-in, without replaying the camera beat or firing on an unchanged tile. Its browser
regression was observed failing before the fix and passing afterward.
The original two random travellers retain their causeway circuits. New places previously
made both hash-selected stops coincide; the selection now preserves the original roster
and also handles duplicate stop choices safely.

Existing saved twin-city maps receive only the three missing stops and their road spurs.
Ground, old place coordinates, journal progress and all save versions are preserved. A full
storage quota keeps the restored map in memory rather than regenerating its ground.

Future passes can add seasonal changes, more household variation, richer terminal motion,
and further small content batches after playtesting. Keep expansion within the map's
existing traversal and diary rhythm rather than making wilderness uniformly busy.

Consistent object scale, readable routes, district identity and sparse wilderness follow
established tile-RPG practice; this is a design assessment, not an industry certification.
Browser checks cover transport and diary use. A full human playtest and performance review
on player hardware remain useful before release; software-renderer timings are not player FPS.

`npm run perf -- --map=field_map_twins --seed=twin-review --json` measures the region on
the available renderer. Readiness uses the actual scene rather than a journal heading
that an arrival panel can cover. Compare measurements taken in the same sitting.

### Verification for stages 6–8

The unit suite covers 3,570 passing tests (the art-document subprocess check required
a rerun with process access enabled); the production app is 212.7 KB gzipped against
the unchanged 220 KB budget. Regression guards were checked with the dusk answer and
additive saved-map restoration deliberately disabled, then restored. Browser checks cover
keyboard/tap/touch introductions, repeated meetings and reload identity, new event cards
and portraits, a physical walk away and back for the reed repair follow-up, both tram directions, nighttime rest and diary observation.

Both art builders reproduce their committed PNGs: 127 accepted images are unchanged,
and all 15 additional images reproduce exactly.

In one same-sitting headless SwiftShader comparison at seed `twin-review`, median
frame times were 216.7 ms for Narmada and 183.4 ms for the expanded valley (p90
266.7 / 233.3 ms). Neither run reported runtime errors. These diagnose the software
renderer; they are not measurements of player hardware or a before/after speedup.

All ten targeted browser cases also pass against a production build and preview using
`DEPLOY_BASE=/4000BCESaraswathy/`, including touch and the built asset URLs.
