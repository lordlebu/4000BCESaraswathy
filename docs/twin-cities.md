# Harappa and Mohenjodaro

Owner decisions, 14 November 2026. The small-island proposal is replaced by a 64×64
mainland map. The latest art direction is **SNES 16-bit**, replacing the earlier NES brief.

## Phases and review

| Phase | Implemented | Actual game captures |
| --- | --- | --- |
| Geography | 4,096 tiles, matching Narmada's size; northwest Gedrosian desert margin, dunes and hills; north–south Saraswati; southern delta and coves; southeast Tethys | [Survey](images/twins/survey.png) |
| Architecture and scale | Two radius-four towns: 41 settlement tiles each, nine across, matching Dwarka's main city footprint. Ochre courtyard houses in Harappa, red fired brick in Mohenjodaro. Native 80×88 house frames match Lothal and Dwarka. | [Harappa](images/twins/harappa.png), [Mohenjodaro](images/twins/mohenjodaro.png) |
| Boundaries and transport | Low walls meeting Harappa's northwest rocky shoulder and Mohenjodaro's eastern river terrace. Open road/rail gates; separate road and railway decks. Ostrich tram follows the bent track in both directions during daylight. | [Causeway](images/twins/causeway.png), [mobile station](images/twins/mobile-station.png) |
| Life and diary | Twelve places, eight four-rung discoveries, two questions, knowledge-dependent dialogue and three visible local improvements | [Delta](images/twins/delta.png), [coves](images/twins/coves.png), [desert](images/twins/desert.png) |
| Verification | Seeded geography, connected water network, reachable places, saved ground, boarding, nighttime rest, diary interaction and runtime art loading | `test/twinCities.test.ts`, `e2e/twin-cities.spec.ts` |

Walls are low surviving enclosures, consistent with rooms becoming habitats. Like existing
settlement palisades, they are scenery rather than a new collision system. Natural features
replace stretches of wall. Roads and rails remain clear of houses. The inhabited footprint
excludes the outlying tram yard and river landing. No new homestead is introduced.

## Population and encounters

| Content | Initial scope |
| --- | ---: |
| Named NPCs | 8 |
| Named NPCs who also travel | 3 of those 8 |
| Random road NPCs | 2 |
| Temporary camp residents | 3 at one active rotating camp |
| Maximum available identities, including a camp | 13 |
| Authored happenings | 12: 10 once-only, 2 recurring with a three-day cooldown |
| Points of interest | 12 |
| Discoveries / field questions | 8 / 2 |
| Moving wildlife | 4 |

The named people are Eru, Nemi, Tavra, Renu, Seli, Oru, Pavi and Denu. Travelling does
not create another copy of a person. Camp residents are temporary road company.

Dry-ground plants remain sparse. Palms, acacias and grass concentrate along the river,
reeds occupy wetlands, and mangroves are limited to the southern delta. Moving wildlife
comprises desert foxes, river otters, monsoon cranes and Tethys pelicans. Mainland species
filtering excludes island-only species. Three camp clearings rotate under the existing
distance rules for roads and places.

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

- [Dwarka](images/twins/dwarka-scale.png)
- [Harappa](images/twins/harappa-scale.png)
- [Generator and placement measurements](images/twins/metrics.json)

Local demo:

```text
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_harappa_station
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_brick_quarter
/?map=field_map_twins&seed=twin-review&hour=12&door=open&at=poi_twin_cove
```

Canon v3.6.0 owns places, people and writing; the game owns geography, art and transport
rules. Ground, journey and knowledge version numbers remain unchanged. Two-city metadata
is optional, preserving older maps and journeys. Map-size and bundle budgets are unchanged.
The main app loads secondary notebook/workshop/map panels lazily to stay within its budget.

## Later phases

Reserve **2–4 named NPCs, 3–4 places and 6–8 happenings** for a later content pass. Suitable
additions include a seasonal dune camp, reed boat repairs, a bird nesting cove, and return
visits to restored courtyards. Add through existing canon schemas and diary progression.

Further art review can refine cliff faces, water animation, gate silhouettes, household
variation and the ostrich's terminal movement. The working tram follows the actual bent
route and reverses direction; a bespoke animated turnaround remains an improvement.

Consistent object scale, readable routes, district identity and sparse wilderness follow
established tile-RPG practice; this is a design assessment, not an industry certification.
Browser checks cover transport and diary use. A full human playtest and performance review
on player hardware remain useful before release; software-renderer timings are not player FPS.
