# The Strait and the Shallows

The owner's art-focused plan of 3 October 2026, built the same day. The illustrated copy is the
artifact [The Strait and the Shallows](https://claude.ai/artifact/J7dvdn7uB8p65dLx1TFwEc), private to
the owner; this file is the authoritative one.

**Closed, 3 October 2026.** Every ask is built and painted; game #244 and #245, canon #159 and #160.
The one thing open is optional: a painted whale, to replace the one drawn in code.

Six asks, each with the owner's rulings as they were given, and what shipped.

## 1. The dugout is lent, not carried

**Ruling:** on Lothal the boat comes after a few days, once you reach the city and talk to the person,
so the first days show the water taking you to the knee (the wade) instead of a boat from the first
step. Settled when asked: Thrali lends it, from the third day, at the Camp in the Kilns or the Drowned
Dockyard, and the first-time card opens as it is handed over.

**Shipped:**

- Canon 3.2.0 carries `field_map.firsts`: who, where, the painting, the lines, and Thrali's `not_yet`.
  The game owns when -- `LEND_FROM_DAY` in `content/tiers.ts` (2, the third day counting from nought).
- `content/firsts.ts`: `boatOn`, `askAboutBoat`, `firstRide`, `firstEvent`. The loan is a flag in the
  save's knowledge half (`lent:<vehicle>`, `first:<id>`), so no save version moved.
- Talking to Thrali shows *Ask about a boat*. Before day three it is Thrali's "not yet"; from day three
  the card (the event card every moment uses), and on closing it the boat is in the scene's kit
  (`boat-lent`), kept across reloads and map crossings (`WorldSceneData.lent`).
- Cards are off under browser automation, like the front door; `?firsts=on` asks for them. `?lent=dugout`
  stands in for the walk to Thrali in the specs that paddle.

## 2. The shallows, and the hull a tenth smaller

**Ruling:** the shallows are the swamps and one or two tiles off the beach; the hull ten per cent
smaller. "Previously sea was not navigable, check thoroughly for new bugs."

**Shipped:**

- `shallowsOf` in `game/afloat.ts`: sea within `SHALLOW_REACH` (2) tiles of any walkable land. A step
  off the beach into them launches the dugout; deep water past them is refused. **Only the traveller's
  own step and routes ask** (`canStepOnto`): `isWalkable` is untouched, so travellers, camps and
  visitors keep the answers they had.
- The hull is shrunk once in `tools/build-river-craft.js` (`DUGOUT_SCALE` 0.9, the commonest colour per
  patch), 192 to 173 pixels side-on. The seat, cut, lift and wake were measured on the new pixels.
- **The bugs the sea would have caused**, found and fixed: a visitor walking up was placed on the
  traveller's own tile when no route reached it -- in the sea; they now walk to the shore beside the
  hull, or with no shore near the conversation opens with nobody drawn. And woven events that need
  ground (tracks, a stranger walking alongside, something buried) could fire on open water; `onWater`
  holds them back, which was already true of a river.
- Position is never saved, so a reload cannot strand anybody at sea.

## 3. Sleeping in the boat

**Ask:** a night afloat should have its own art.

**Shipped:** `dugout` is its own kind of night (`night.ts`): below a camp, above a tent (no tent goes up
on water), with its own diary line, rest row ("Sleep in the dugout"), icon, and painting slot
`rest-dugout`.

## 4. The first ride on the line

**Shipped:** the first press of *Ride* opens Hesh's card (canon's words) and *Board* sets the carriage
off; after that the button rides at once.

## 5. The strait's traffic

**Ruling:** three craft and a whale on the Aravali, for looking at only -- a Kelpfang-type outrigger the
size of a caravel that passes through the map, fishing boats that move about, and kites tethered to an
island's edge on a rope of three or four tiles with their shadows far below on the water; two kites at
Dwarka's caravan camp too. The boats sway slowly with water round them like the wading; they pass under
the line and never under an island. The whale disappears and emerges slowly.

**Shipped:**

- `tools/build-strait.js` cuts the owner's paintings (`assets/source/strait/painted/`) into one PNG a
  frame in `assets/strait/`, and writes `assets/strait.json`: each boat's hull centre, each kite's nose,
  the whale's blowhole. 35 frames; 660 KB on disk, squeezed on the way into `dist/`, and loaded only on
  the Aravali (the kites alone at Dwarka).
- `content/strait.ts`, pure: the ship's lane (a row of sea four deep, the channel between the islands
  on the Aravali), two fishing loops (rectangles of open water a tile clear of land and the line, away
  from the lane), two kites (an island edge with open air for the rope's length, the whole swing over
  open sea, kite and rope clear of the track), and six places for the whale (two tiles from anything).
  The ship crosses east, rests, crosses west; the boats go round their loops, so they are seen from
  all four sides.
- `game/systems/StraitView.ts`, the sixth system: a two-pixel swell on a three-second period, rounded to
  whole pixels; the bottom of each hull cropped at the surface with the wading's own ring on the
  waterline; boats at depth 99, under every row-sorted thing including the rail; kites at 1990, just
  under the fog; a sagging rope from the island's edge to the kite's nose; the kite's shadow, its own
  silhouette darkened and flattened, two tiles below on the water; the whale rising out of the surface
  over five seconds, spouting while up, and sinking over five.
- **Dwarka's kites are flown up, not out** (the owner, the same day): flown sideways over the ground
  the side-on frame read as a kite lying flat. They fly above the camp on the screen, fanned a little
  apart, always on the upright frame -- nose to the sky, streamers hanging towards the flyer -- with
  the line taken at the bridle under the body, and drawn above the fog (`STRAIT_DEPTH.aloft`, 2002):
  a kite high over the camp is seen from it whether or not the ground beneath has been walked. The
  Aravali's stay as they were, flown out over the water from an island's edge.
- **The sea is seen from above** (`seaSeenFrom`). A traveller's own sight is two tiles and nobody walks
  the open sea, so the traffic would have sailed under unexplored dark for a whole crossing. From an
  island or the line, the sea within eight tiles lifts to the remembered shade -- the twin of "the road
  ahead is seen from the road". Only sea, only on the Aravali.

**Measured:** `npm run perf -- --map=field_map_aravali --seed=varuna-0`, the strait on and off: median
250 ms and 267 ms, best 233 ms and 250 ms -- inside this machine's noise, the "on" run the faster. The
tool measures the map's starting view, where most of the traffic is out of sight; with everything on
screen at once the cost is the fill estimate, about an eighth more pixels than a bare frame.

## 6. A bedroll night on high ground

**Shipped:** `sceneFor` takes the ground for a night (`sceneNames`): the shelter on the biome, then on its
group, each at the moment first, before the shelter alone. `rest-bedroll-snow-midnight`,
`rest-bedroll-high-midnight` and `rest-bedroll-high-dawn` land where they should the day they are painted;
until then every night shows what it did.

## What CI found

- **The shallows spec walked sixty steps.** Its beach search accepted a line run *along* the coast,
  which stays shallow for as long as the coast does -- thirty tiles on the top row of its seed -- so
  the test took 1.5 minutes locally and ran out its three on CI. Straight out from a beach the
  shallows end within two tiles, and the search now asks for exactly that.
- **A camp's welcome opened over the landmark's page.** `playthrough.spec.ts` reached the landmark
  on a day its walk passed a camp, and was left facing *A dacoit band* with the page beneath it. The
  page now holds every card back (`pageOpenRef` in `useHappenings`); `e2e/happenings.spec.ts` asks
  for one while it is up and once it closes, and failed by name with the guard taken out.

## Pace, after a look in play

- **The outrigger raced, and it was the clock.** The ship and the boats first kept the journey's
  clock -- twice a day, a lap in a share of one -- which reads well standing still, where a day is an
  hour. But a step spends about 45 seconds of that clock, so while the traveller walked the
  outrigger jumped six tiles a step, fifteen a second. They now run on the scene's own clock, as the
  swell, the wind and the whale always did: `SHIP_PACE` half a tile a second (a fifth of walking),
  `FISHING_PACE` a tenth, a rest of `SHIP_REST_S` between crossings, and the scene opens with the
  ship already part-way across so an arrival is not met by an empty channel.
- **It slows under the line** (the owner's ask, the same day), so somebody on the rail or at a pier
  gets a long look at it passing beneath: within `SHIP_SLOW_REACH` (4) tiles of a rail column over
  the lane its pace eases to `SHIP_SLOW` (0.3) of itself, on a cosine, both ways. The crossing's
  timetable is laid out once per map (`timetable`), so where the ship is stays a pure function of the
  seed and the scene's clock. A crossing is about 133 seconds on `varuna-0`.
- `e2e/strait.spec.ts` walks the traveller and checks the outrigger moved no more than its pace;
  with the walking clock fed back in, it raced off the map and the spec failed by name. The unit
  test that it slows under the line first compared against `SHIP_SLOW` itself and passed with the
  slowing switched off; it now compares against the ship's speed in open water.

## The art, arrived

The owner's seven paintings, the same day, taken in by `tools/intake-strait-paintings.py` (crops
recorded there; only paper edges trimmed, and the two firsts left as painted vignettes):

- `events/first-afloat-lothal`, `events/first-ride-aravali`: the two firsts' cards.
- `scenes/rest-dugout`: a night afloat.
- `scenes/rest-bedroll-high-midnight`, `-high-dawn`, `-snow-midnight`: the ridge by night, a lady on
  the same ridge at dawn, and snow by night. Snow has no dawn of its own and wakes to the ridge's.
- **A sky island sleeps as high ground** (`NIGHT_GROUND_GROUP`): the owner put the lady's dawn on the
  ridge *or* an island. The island's top stays out of `high` for stooping, which has its own painting.
- `events/happening_the_strait_from_the_rim`: a woman at the rim watching the ships, after walking
  up. Canon 3.3.0's happening on first arriving at the First Pier -- the first floating island a
  player stands on -- drafted for the owner. She is somebody already there, never the traveller, so
  it fits whoever is playing.

The whale is still drawn in code (`tools/draw-strait-art.py`); a painted one is optional.

## Checks

- Unit: `test/afloat.test.ts`, `test/firsts.test.ts`, `test/strait.test.ts`, `test/scenes.test.ts`,
  `test/oneAtATime.test.tsx`, `test/night.test.ts`, `test/happenings.test.ts`, each new guard broken on
  purpose once and seen to fail by name.
- Browser: `e2e/dugout.spec.ts` (the shallows, the wade before the loan), `e2e/firsts.spec.ts` (not yet,
  the loan and its card, the first ride, each drawing its painting), `e2e/happenings.spec.ts` (the
  strait from the rim, with its painting, once), `e2e/strait.spec.ts` (everything on the map, no frame missing).
