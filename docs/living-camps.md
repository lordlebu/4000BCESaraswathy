# Living Camps

The plan, measured and built on 2 October 2026. The illustrated copy is the artifact
[Living Camps](https://claude.ai/artifact/HLHRPXUZiuXvLwTdE4jUD7), which is private to the owner;
this file is the authoritative one.

**The brief, from the owner:** camps in the wild should be visited by people for logistics and food,
have a leader and followers, all non-threatening, and people should walk the woods, shallows or hills
from the nearest road to reach one.

## What a camp was before this

A picture and a card. `encampments.ts` pitched one camp per map for three days in each six; the scene
drew a fire ring, a shelter and two props, and a smoke column that never changed with the hour.
Walking within a tile opened the camp's card once. The card named three people who were drawn
nowhere and could not be spoken to, and nobody visited: measured over six seeds, the closest any
traveller's route passed a camp was **10-19 tiles (median)**, and a player sees six.

## The owner's rulings (2 October 2026)

All six recommendations taken:

1. **Only road company visit or trade, never canon's named people.** A named person at a dacoit fire
   is a claim about them, and canon makes those.
2. **Camp people are the game's**, like road company: generated, with names from canon's peoples.
3. **The trodden way is drawn, never priced.** It costs what its ground costs. The walk is the point.
4. **One camp per map at a time**, as before.
5. **Back-to-back camps stay.** With pitching and striking drawn, one camp leaving the evening before
   another arrives reads as a changeover.
6. **No new art.** People wear the dyed stranger bodies; their card borrows the camp's painting.

## Phase 0: what was measured before any number was chosen

Six seeds (`a` to `f`), thirty days, every camp that stood, on `main` at 2cd0fe9. The way in is the
cheapest walk from a road a traveller uses, priced by `stepCostOn`.

| Map | Way in, median (max) | What it crosses |
|---|---|---|
| Lothal | 13 tiles (34) | plains 47%, coast 14%, forest 13%, wetland 12%, hills 12%, river 3% |
| Dwarka | 15 (24) | plains 92%, coast 3%, hills 3% |
| Narmada | 25 (46) | plains 72%, settlement 11%, hills 7%, forest 6%, snow 2% |
| Aravali | 21 (54), and 13 of 30 camps have none | hills 30%, coast 27%, plains 21%, forest 20% |

**How fast a traveller walks.** Every leg of every circuit, over its eleven hours: a median of
**3.45 tiles an hour**, nine in ten at **7.6 or slower**, the fastest 11.

**Runners.** Almost every camp day has a road traveller passing the turn-off. Whether the runner can
make the meeting depends on its pace. At the median 3.45, leaving after 7:00, it happened on 13-21%
of camp days; leaving from first light at 5 tiles an hour, 30-48% on three maps. Five was chosen: a
local who knows the way, unloaded going out. The Aravali's ways are too long at any ordinary pace.

**Visitors.** A visit replaces a leg with stop, turn-off, camp, turn-off, stop, which needed a
**median of 10-17 tiles an hour**. Capped at the 90th percentile of ordinary walking (7.5), visits
happen on a few days a month on three maps and never on the Aravali.

These rows were measured with the railway refused, before the owner ruled it walkable; see *The rail
line and the sky islands* below for the numbers since.

**After building**, the same six seeds give:

| Map | Camp days | Runner meets a traveller | A visitor comes |
|---|---|---|---|
| Lothal | 88 | 22 (25%) | 9 (10%) |
| Dwarka | 90 | 32 (36%) | 10 (11%) |
| Narmada | 90 | 13 (14%) | 4 (4%) |
| Aravali | 88 | 0 | 0 |

The Aravali having no comings and goings is the crossing being remote and its camps sitting where the
line is the only link. It is not a number to tune past, and it waits on the rail rethink.

**Frame cost with the extra walkers: none measurable.** Taken after the plan was built, on CI's
renderer (headless Chromium, SwiftShader), as `tools/perf.js` takes it -- the fastest and the middle
of ninety frames -- but standing beside a camp, which `npm run perf` cannot, since it always stands
on the map's first tile. Seed `camps`, Lothal, the same tile three to the west of a dacoit camp at
13:00, on day 3 when it stands and day 1 when there is no camp, alternated three times in one
sitting:

| | People drawn | Best frame | Median frame |
|---|---|---|---|
| Camp standing | 8 | 183.3 ms (199.9 on the first, cold, round) | 233.3 ms |
| No camp | 5 | 183.3 ms | 233.3 ms |

Three more figures, the camp's pieces, their shadows and the trodden way are inside the noise of a
frame that is all ground. Compare within one sitting only; `docs/rendering.md` says why.

## What was built

| Phase | Where | What it does |
|---|---|---|
| 1 People | `content/campLife.ts` `campPeople`, `campPlacements` | A leader, a runner and a watch per camp, each a `Traveller` with an empty circuit and a `campId`, standing on free tiles round the fire by what they are doing. The talk row, its marker, calling out and tapping all work for them unchanged. |
| 1 Talk | `happenings.ts` `campTalk`, `data/camp-life.json` | The leader's first word is the camp's own card. After that each person has a `camp-talk` card: what they are doing, one line of their own, and their name the first time. |
| 2 The day | `campActivity`, `campStage`, `tiers.ts` `CAMP_DAY` | Relight at five, chores, shade at noon, chores, meal at five, the kind's evening at seven, sleep at nine with one keeping the fire. The shelter goes up on the first morning and comes down on the last afternoon. Smoke is thick when the fire is fed and a thread at night; firelight glows after dark. |
| 2 Meal | `campTalk` | At the meal the card offers "Eat with them", which eases tiredness by `MEAL_EASES`. |
| 2 Night | `game/night.ts` `spendNight` | A night beside a camp is written in the words of whose camp it was. |
| 3 The way | `encampments.ts` `wayIn`, `travellers.ts` `walkedRoad` | The cheapest walk on foot from a road somebody uses (else any road; never the railway), drawn while the camp stands and faintly for the ash days, with the kind's own small prop where it leaves the road. |
| 4 Runners | `runnerErrand`, `phaseAfterMeeting` | The runner walks out to meet a road-company traveller whose leg passes the turn-off; both stand there an hour; the traveller goes on that much later. |
| 5 Visitors | `campVisitors`, `visitorAt` | On some days a road-company traveller's leg goes by the camp: out from their stop, two hours at the fire, on to their next. |

Each phase has a Node test in `test/campLife.test.ts` that asserts the rule *and* that it happens on
the real maps, and a browser test in `e2e/camp-life.spec.ts` that it reaches the screen. Each browser
test was checked by breaking what it guards.

## How the way is drawn, by the owner's notes on the first cut

The first cut drew dark brown dabs on every tile. They read well on the swamp and badly on grass, and
the owner asked for the way to be coloured by the tile under it, subtle on grass, and for every
ground -- snow, hills, grass, swamp, sand -- to have its own. Three treatments now, in
`game/campArt.ts`:

| Ground | Drawn as | Colour |
|---|---|---|
| swamp, shore, snow, sand (`PRINTED_GROUND`) | footprints | the painted tile's own average colour, deepened (`troddenColour`) |
| grass, hills, forest, the lanes | a thin line of worn ground, joined tile to tile | the painted tile's colour, a little darker, faint |
| river, mountain, lava (`CROSSED_GROUND`) | the same thin line | one pale neutral, barely there |
| the rails, the ropes, the sky pool (`carriesTint`) | the grass line | the colour of the ground the way came from |

**The colour comes from the painted tile, not `data/biomes.json`.** `groundColourAt` averages a five
by five grid of the tile picture's own pixels. The JSON colour is the flat placeholder the paintings
replaced, and a way tinted from it was green on yellow grass and vanished on the swamp.

## People on the road wade and slow, like the player

Asked by the owner while this was built, and done for every traveller, not only camp people:

- **They lose speed where the player does.** Progress along any path is weighted by `stepCostOn`
  (`indexAlong` in `travellers.ts`): a river tile takes three times a plain one, a road three
  quarters. Their day still starts and ends at their own hours; they make it up on the road. A test
  first caught the time being charged to the tile *before* the river, so people lingered on the bank.
- **They are drawn wading**, by the player's own rule (`wadeFor`): cut at the waist in a river, the
  shins at a ford, the feet in a swamp, faded into a sky pool (`wadeWalker` in the scene).

## The rail line and the sky islands: decided

Deferred for a moment, then decided by the owner on 2 October 2026:

- **The rails, the ropes and the sky pool are walkable, for everybody, as for the player.** A way in
  may use them. They are priced as the slowest going there is (`stepCostOn` over open water), so a
  way takes them only when nothing on land reaches, and over them it is drawn as the grass line in
  the colour of the ground it came from (`carriesTint`).
- **The sea and the ocean are not navigable, for anybody, as for the player.** `isWalkable` refuses
  them; only a rail, rope or plank over them is ground.
- **Camps may pitch anywhere a person can be, the sky islands included**, preferably the northern
  one, the Grit Mill's: one turn in two (`SKY_TURN_ONE_IN`) a camp on the Aravali looks there first.
  It keeps `AWAY_FROM_PLACES` (five tiles) from the mill like from any place.

**Is it too costly?** Measured over eight seeds and forty days:

| | Aravali | Lothal | Dwarka | Narmada |
|---|---|---|---|---|
| Camps on a sky island | 30 of 56 | - | - | - |
| Nearest a camp comes to the mill | 5 tiles (median 9) | - | - | - |
| Way in, median (max) | 11 (48) | 12 (34) | 14 (30) | 24 (46) |
| Runner meets a traveller | 34% of camp days | 32% | 29% | 14% |
| A visitor comes | 20% | 13% | 12% | 8% |
| `campGround`, once per map, cached | 2.9 ms (6.1 worst) | 0.6 | 0.9 | 2.7 |
| `wayIn`, once per camp, cached | 0.14 ms (2.9 worst) | 0.24 | 0.34 | 0.68 |
| Way sprites drawn, median (max) | 20 (77) | 20 (62) | 26 (46) | 46 (83) |

Cheap: both searches run once and are cached, and the way's sprites are small images shown tile by
tile as the fog lifts. The Aravali gained the most: its ways are a third the length they were when the
line was refused, and it now has runners and visitors.

**On the grass, never the edge** (the owner's note, from a screenshot of the first island camps: a
tent on the rim and a sack on the plank bridge). Everything a camp puts down -- fire, shelter, things,
people, a visitor -- stands only on `campable` ground: ground a camp pitches on, with no road, rail,
rope, plank, bridge or ford, and nothing beside it that nobody can stand on, so no rim over the sea or
the open sky; on a sky island every neighbour is the island's own grass. A site counts only if the
whole camp fits (`campFits`); where it does not, there is no camp. Measured over eight seeds there are
still 536-2,737 sites a map, camps stand on half the days as before, and 27 of 56 Aravali camps are on
an island.

**The temple at the alms step stands in the grass too.** It draws two tiles wide and three tall, and on
the island's rim it hung over the open sky. Its tile and all eight round it must now be island grass
(`NEEDS_GRASS_ROUND` in `world/fieldMap.ts`). It moved on 9 of 10 seeds measured and nothing else did
-- the Grit Mill stands on a single tile and stays where it is, on the owner's word. **A journey
already under way keeps its temple where it was**: the world is baked on first visit (`world/bake.ts`)
and a placement change reaches only new journeys, which is that file's whole purpose.

**A landmass with no road.** On seed `h` the Aravali's northern landmass has a place (the Kept Stones)
and not one road. A camp there leaves from the nearest place instead (`wayIn`'s last fallback).

**Nobody is drawn standing in the sea.** The owner asked whether people making room for each other
could be pushed into the ocean. `test/campLife.test.ts` repeats the scene's whole placement -- every
traveller, trader, visitor and camp person, then `untangle` -- on every map through the day, and
nobody lands on ground nobody can stand on: of 36,935 placements over four seeds, 560 stepped aside and
every one onto walkable ground, because `untangle` only steps onto a walkable neighbour.
`test/travellers.test.ts` pins that rule on a shore with sea on three sides, and fails if the check is
removed. The scene also hides anybody whose tile is not walkable rather than draw them in the water,
should a future change ever put them there.

## Where a camp stands, and how it is drawn

Three notes from the owner on screenshots of the finished camps, all on 2 October 2026.

**In a clearing, never in the jungle.** Forest was camp ground, and a lean-to pitched among the
canopy read as lost in the woods rather than as somewhere people had chosen. Forest is no longer in
`CAMP_GROUND`, so the fire and every piece stand on open ground, and woods may stand round the edge
of the clearing. Open ground still carries the odd lone tree, and one on the fire's tile or under the
tent put the camp back in the woods, so while a camp stands the scene fades out any standing feature
in the 3×3 round the fire and on every tile a piece uses, along with its contact shade, and puts it
back when the camp is struck (`clearCampGround`). Measured over eight seeds:

| Map | Sites with forest | Without | Days a camp stands |
|---|---|---|---|
| Lothal | 536-954 | 210-550 | 49%, unchanged |
| Dwarka | 572-932 | 572-932 | 50%, unchanged |
| Narmada | 2,654-2,891 | 1,817-2,531 | 50%, unchanged |
| Aravali | 564-675 | 209-450 | 49%, unchanged; 79 of 165 on a sky island, unchanged |

**Shadows under the pieces, tucked under the base.** The first cut gave each piece one ellipse the
width of the whole image, centred two pixels above the image's bottom edge. That edge is not the
ground: the props are cut from painted sheets with up to thirteen clear pixels under a tent and none
under a pack, so on the tents the shadow hung below the canvas as a separate grey disc. A second cut
measured the ground and centred the shadow just in front of it, and the owner read it at once: *a
shadow that starts below the art makes the art float*. Now:

- `footprintOf` reads each piece's pixels once: the lowest painted row, and how wide the piece is
  over the lowest eighth of it, which is the part touching the ground.
- `castUnder` lays two layers of the world's contact shade, both centred *above* that line: a broad,
  soft one, and a narrow, darker one along the line itself. The darkest part of each is hidden behind
  the piece where it meets the ground, and only the fringe shows, a few pixels in front and out at the
  sides. The soft layer is capped at 34 pixels deep, so a wide tent does not throw a pool.
- Flat things cast none: the fire ring and the drovers' thorn fold. The turn-off marker casts one.
- **People cast none.** Walkers, camp folk and visitors are drawn without a shadow, on the owner's
  standing ruling; only the player has one.

**Light at night.** Every camp's fire has glowed after dark since camps first had a fire, with the
street lamps' pool of light on their clock (`glowAt`). The pilgrims' cairn is painted with an oil lamp
alight, and it was dark at night. `CAMP_FLAMES` in `game/campArt.ts` names the flame's pixel, read off
the art, and the scene lights a smaller pool there on the same clock, both at the camp and on the
cairn that marks the turn-off, so the way in shows a light by the road after dark.
`test/campLife.test.ts` checks the named pixel is flame-coloured, so a repainted piece cannot leave
the light shining on bare ground. A new piece painted with a flame takes one line there.

## The meal, painted -- asked for, not waited on

The plan's one open question about art was whether the meal wanted a painting of its own, to be
decided after Phase 2. It was asked for once the plan was finished: four prompts, one per kind of
camp, are in `docs/event-prompts.md` as `woven-camp-meal-drovers`, `-pilgrims`, `-adventurers` and
`-dacoits`. **Nothing waits for them.** The card at the meal tries the meal painting first
(`artMoment` on the event, read by `EventCard`), then the kind's camp painting, then any camp, so a
painting shows the day its file lands in `src/ui/events/` and the card looks exactly as it does now
until then. `test/happenings.test.ts` holds the order.

**One question stays open, on purpose:** whether a map should ever have two camps at once. The plan
said to keep one and revisit after Phase 2 is *played*, and that needs a person playing it.

## Rules worth not undoing

- **Nobody follows the player, and only the leader calls you over.** Camp people keep to their
  spots and the way, and never fall in beside you the way road company may. The leader alone may
  call out as you come alongside, and only before you have heard the camp's own word: a first
  meeting, on the seeded once-a-day chance every named person keeps (`campCallers` in
  `campLife.ts`, read by `App.tsx`'s speak-first). Off under browser automation like all of
  speak-first; `?chatter=on` asks for it back.
- **A card never opens over another.** Walking up beside a camp's watch can also bring you beside
  the fire. The camp's welcome and the watch's word used to open in the same step, one silently
  replacing the other. Now the welcome comes first and the watch's word waits for it to close
  (`cardOpen` in `App.tsx`).
- **The people and the props share one layout rule.** `campSpots` lays out the shelter and things,
  and `standingRoom` keeps people off them. It was moved out of the scene for exactly that reason, and
  `test/campLife.test.ts` holds `PROPS_AROUND` to `CAMP_LAYOUT`.
- **The way in leaves from a road somebody walks**, not the nearest road, because a runner meets
  travellers there and a visitor turns off there.
- **Nothing is saved.** Who is at a camp, where they stand, the runner's day and the visitor's are
  all pure functions of seed, map, day and hour. No version moved.
- **A camp is in a clearing.** Forest is not camp ground, and lone trees on a camp's tiles are faded
  while it stands. A shadow is tucked under its piece, never in front of it.
