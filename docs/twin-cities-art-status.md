# Harappan phased plan — completion audit

17 November 2026. Current companion to the [original plan](twin-cities-art-plan.md).
Counts are checked against the exported valley roster and delivered preferred paintings.
Existing pixel editions remain playable fallbacks; these are remaining paintings, not missing quests.

## Completed

- Accepted city map, north/south bridge correction, terrain depth, house/courtyard detail,
  riverbanks and terminal turns. No further detailed map repaint is required.
- Sixteen places and fifteen named NPC identities, ethnicity/language metadata and names,
  conversation goals, saved-map cave addition and optional story states.
- Beedu: accepted small SNES art, one coastal flyer, sand emergence/return, shadow,
  actual-sighting event and witness dialogue. Leave its accepted image unchanged.
- Cave: generated Mirlepa/Yamantaka NES JRPG sheets, alternating local walks/seated rests,
  intermittent helpers and prayer flags/Icmic cooker/bonfire with six monthly arrangements.
- Generated NES JRPG fox, otter, crane, pelican and sixteen ostrich-tram poses.
- Four generated named NES JRPG identities: Nemi, Kang, Mirlepa and Yamantaka. The other
  eleven retain existing compact NES sheets; replacements are optional scope.
- All thirteen main conversation portraits now have preferred painted deliveries, including
  Kang in light indigo. Denisovan portraits retain their approved anime exception.
- Kang's optional five-beat commission/site/preparation/carving/unveiling quest, persistent
  three-stage life-size NES JRPG bust, and distinct cozy watercolor carving/unveiling cards.
- Art direction matrix, prompt ledgers and ignored screenshot/raw-art storage.

## Remaining phases

| Phase | Required deliverable | Planning effort |
| --- | --- | --- |
| A. Events and travel | 19 event paintings, prioritizing cave welcome and Beedu sighting; 2 journey banners | 1–2 focused days |
| B. Place views | 15 cozy watercolor panels, including Windward Cave; maintain identity/ecology | 1–2 focused days |
| C. Integrated review | Card crops, map readability, dusk/fog, both input modes, cave timing, Beedu, tram turns, save/reload and frame cost; fix findings; exact-head CI and owner review/merge | 0.5–1 focused day, plus pipeline time |

**36 required illustrations remain: 19 events + 15 places + 2 journeys.** Previously 39;
Kang's portrait and two bust paintings close three items. Gameplay coding being complete does
not close the visual programme. Estimates allow generation/continuity iterations and are not
a completion promise. Run tests at phase boundaries.

Optional outside those 36: separate commission/site/preparation card takes, bespoke helper
portraits, generated replacements for the other eleven NPC sheets, and further seasonal
vegetation/bird/harness polish if retained at final review. No new date system, transport route,
quest gate or Beedu repaint is required.

## Verification and publication

Kang's portrait and both event paintings are registered as retained art and checked through
the actual conversation/event art resolvers. Beat-specific image selection is game presentation;
the existing story stays in canon. Current phase checks and exact-head CI status are recorded
in the implementation ledger/PR. Integrated visual/performance review above remains open.

## Exact remaining event paintings

Target `src/ui/events/`; simple cozy watercolor.

| Event | Required preferred filename |
| --- | --- |
| Two Cities, One Crossing | `happening_twin_arrival-painted.png` |
| The Bank We Kept | `happening_twin_bank-painted.png` |
| A Shadow Leaves the Sand | `happening_twin_beedu_flight-painted.png` |
| The Cool Side | `happening_twin_brick-painted.png` |
| A Place at Supper | `happening_twin_camp-painted.png` |
| The Longer Road | `happening_twin_carrier-painted.png` |
| Room Beside the Fire | `happening_twin_cave_arrival-painted.png` |
| What the Cities Kept | `happening_twin_closing-painted.png` |
| Where the Water Changes | `happening_twin_cove-painted.png` |
| The Drain Left Growing | `happening_twin_drain-painted.png` |
| The Empty Lane | `happening_twin_lane-painted.png` |
| The Bird Knows Both Yards | `happening_twin_ostrich-painted.png` |
| A Workshop With Tenants | `happening_twin_workshop-painted.png` |
| Between Arrivals | `happening_valley_bird_return-painted.png` |
| A Place at the Edge | `happening_valley_courtyard_return-painted.png` |
| The Next Repair | `happening_valley_reed_return-painted.png` |
| A Little Give | `happening_valley_seam-painted.png` |
| A Room for the Tide | `happening_valley_tide_room-painted.png` |
| The Sand That Stayed | `happening_valley_windbreak-painted.png` |

## Exact remaining place views

Target `src/ui/places/`; cozy watercolor.

| Place | Required preferred filename |
| --- | --- |
| The Raised Brick Quarter | `poi_brick_quarter-painted.png` |
| The Sheltered Caravan Ground | `poi_desert_ground-painted.png` |
| The Divided Drain | `poi_drain_court-painted.png` |
| The Dune Windbreak | `poi_dune_windbreak-painted.png` |
| The Earthen Workshop | `poi_earthen_workshop-painted.png` |
| Harappa Tram Yard | `poi_harappa_station-painted.png` |
| The Nesting Cove | `poi_nesting_cove-painted.png` |
| The Unroofed Rooms | `poi_nesting_ruins-painted.png` |
| The Windward Cave | `poi_northwest_cave_camp-painted.png` |
| The Planted Rooms | `poi_planted_ruins-painted.png` |
| The Three Channels | `poi_reed_junction-painted.png` |
| The Reedwright's Bank | `poi_reedwright_bank-painted.png` |
| The Open Crossing | `poi_twin_causeway-painted.png` |
| The Quiet Coves | `poi_twin_cove-painted.png` |
| The Southern Landing | `poi_twin_landing-painted.png` |

## Exact remaining journey banners

Target `src/ui/events/`. Existing journey paintings remain fallbacks.

- `journey-aravali-twins-painted.png`
- `journey-lothal-twins-painted.png`
