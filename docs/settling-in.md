# Settling In

The endgame plan: arrive at a map, help its people, and settle there with their backing. The
readable version, with the phases, the pushback and the questions, is the published page
[Settling In](https://claude.ai/artifact/YTD1Y7MXFxtXRWStDaYm2c). This file is the repository's copy
of what was decided and what was measured, so it survives the page.

**Concluded 28 September 2026.** All six phases are built and merged: game #216–#219, canon
#141–#143. Lothal, Dwarka and the Narmada settle; the Aravali is the crossing. What the project
learned from it, and from everything before it, is in `docs/retrospective.md`.

## Decided, 27 September 2026

The owner took every recommendation:

| Question | Decision |
|---|---|
| Dacoits and gundas? | Yes, as people with wants. They never touch the player and nothing can be lost to them. |
| Must a map be settled before leaving? | No. The cart always runs; settling is how a map's story ends, not a toll. |
| One settlement per map? | Yes, small, and it stays as built with no upkeep. The last one built is home. |
| Fame and charisma? | No numbers. Standing on each map in four words, read from what the save already holds. |
| May building use up materials? | Yes. The first sink; gathering never fails, so nobody can get stuck. |
| Who writes the local figures? | Drafted in the lore repo, rewritten by the owner. Merging approves them. |
| "Map dive event"? | A scene card when you walk into a camp, not a separate small map. |
| Cart points on Lothal and Narmada? | The Camp in the Kilns, and the High Camp. |
| Build order? | Phase 1, then 2, then 5 on Lothal alone, then 4, 3 and 6. |

## Phase 1: who is here — built on `feat/who-is-here`

Three faults reported from play, and their causes, which were not what they looked like.

**You could not tell who was at a place.** `npcsAt` reads canon's `found_at` as a set, so the place
panel listed everybody who ever visits a place as if they were all there: Kunch at three Lothal
places at once. `content/presence.ts` answers from where people are, and the panel now opens with
who is here, their faces first, and one line saying where the others have gone. The map draws a pip
per person at each place's door, turmeric for somebody with something new to say.

**Nobody on the road could be spoken to.** There was no way in. The scene now reports who is walking
within six tiles (`nearby`), and the action rail names the nearest: "Talk to Kunch", or "Walk with
the carrier". Greyed with a reason until you are beside them. A stranger opens the company card about
that stranger, and a card the player asks for skips the storylet pacing.

**Travellers overlapped.** Everybody kept the same hours and the roads pull every leg onto the same
tiles. Measured over 8 seeds, 4 maps, 30 days and 100 moments a day: 5,775 of 96,000 moments had two
walkers on one tile. Staggered hours alone brought it to 4,665. `untangle` makes it 0.

Two things the browser suite found, and what was done:

- **The rail has room for two chips on a 360-pixel phone with a busy tile.** A talk row as a fourth
  chip ran off the bottom. People walk only by day, and by day the rest row can only say "there is
  daylight left", so while somebody is near the talk row takes the rest row's place. The rail is no
  longer than it was.
- **A separate line and list for who is away cost the place 4 points of its screen share** on a
  landscape phone (25% to 21%, against a floor of 21). Moving who is here to the top of the panel and
  folding the away news into one line under it costs nothing when everybody is in.

## Phase 2: standing, small talk and rumours — built on `ci/nightly-minutes`

The owner asked for Phase 2 on the same branch as the morning play-time workflow.

**Standing** (`content/standing.ts`) is four words -- a stranger here, heard of, known, trusted --
read off the save and never stored. Helping somebody on the map is what moves it; understanding four
things there counts too. The Overworld says it for the map you are on and each you have been to.
Some people do not care until you affect their lives: a stranger is warm once the map knows you, or
once you have helped somebody of their own people anywhere (`warmTo`).

**Small talk.** The first walk with a stranger is still the company card, which is where you learn
their name. After that, walking with them opens `small-talk`: a greeting by your standing, and from a
warm stranger, a rumour. A cold stranger is civil and brief.

**Rumours** (`content/rumours.ts`) are always true of the world and never knowledge: a place you have
not reached, a named person with news and where they are, a question somebody on this map is asking.
Asking the way leaves `heard:` and `told:` flags, and reaching the place a rumour named opens
`rumour-kept`, once, before anything else on that arrival. That is the owner's "conversation that
generates events"; Phase 3's camps become rumours of the same kind.

**Left for the lore repo:** named people noticing your standing, which is a line or two each and
canon's to write.

**The Aravali is not settled, by the owner's ruling of 27 September: "it is all about crossing the
sea."** No discovery there helps anybody there, which testing found and which is now the point
rather than a gap: its people are passing through, it can know you but not trust you, and the
settlement loop is for Lothal, Dwarka and the Narmada. Its cart points are the First Pier and the
Far Landing, and its story is the strait.

## Found and fixed: the Narmada was drawn above the Aravali

The owner: the Aravali is the topmost part of insular India, joined to Asia by the floating islands
and the line. The travel screen drew the Narmada Plateau above it. Nothing had moved: the Narmada's
pin was placed at (58, 20) on 19 August, before the regions were traced off the drawn map, and never
brought into its own region. Canon 2.33.0 moves it to (52, 42) and pins the Aravali at (51, 30) as
the topmost anchor. With both on the east, the travel screen then cut their names off; the drawing
now fits every name, measured in the browser.

## Somebody speaking first

The owner asked for chats that start without the player -- named people especially, on a first
meeting or when they want something. `content/bumping.ts` and `reasonToSpeak`: a first meeting
(chance 0.6, once ever), wanting something (0.5: a question they cannot settle, or a thing of theirs
you are carrying), a stranger passing (0.2); once a day per person, never over something else on
screen. It happens on coming alongside somebody on the road and a moment after walking into a place.

## Phase 3: camps that come and go

`content/encampments.ts`. One camp at a time: three days in each six, from the first day on, on dry
ground at least five tiles from any place and three from any road, ranked furthest from a road first.
The kind is one of adventurers, dacoits, pilgrims or drovers, and everything is seeded from the map
and the day, with nothing saved. People mention it while it stands (a `camp` rumour). Walking up to
it opens the `camp` card once, asked for rather than rationed: `force: {asked: true}` returns the
card before any weighting, because a weight-0 template otherwise never wins. Every choice is
takeable and none is worse.

**The browser spec found a bug older than camps.** The saved clock was never handed back to the
scene, so every reload was day 0, and day 0 has no camp. `PhaserGame` now takes `travelled`.

## Phase 4: cart points

Canon's `departs_from` names where each map is left from: the Camp in the Kilns, the High Camp, the
Caravan Ground, and the First Pier or the Far Landing. The travel screen reads the map anywhere and
offers the cart only there (`mayLeaveFrom`). Arriving sets you down at the next map's first
(`arrivalPoint`).

## Phase 5: settling Lothal

Canon's `homestead` type (`database/homesteads/`) declares each ground, its holder, their worries,
what answers each, and three building stages. `content/homestead.ts` holds every rule, and the save
holds only flags (`homestead:<map>:…`), so no version bump was needed. Asking needs the map to *know*
you. The Negotiation card offers everything you have, never only the right answers: listen, a word
of their tongue, show a finished discovery, have a helped person vouch, offer something carried. A
miss costs nothing. Each stage spends materials and needs helped people's hands, and the settlement
page lists who moves in.

**The owner's ruling after the first mill went up in the marsh:** a building stands only on dry,
level plains, desert, settlement or hills, off every road and clear of any cliff, within six tiles
of its ground. Measured over 40 seeds, 39 of Lothal's eastern-field grounds and 38 of the
granary's have room; the rest say there is no room rather than building wet.

## Phase 6: Dwarka and the Narmada

Each carries its map's thesis. On Dwarka, where local knowledge is simply right, Ushi at the salt
orchard and Jarro at the Caravan Ground are right before the player is: it is not the salt, and the
road goes the long way for a reason. On the Narmada, whose record begins at the wound, Ardhi, the
University's steward, trusts the survey; Tolla, the head herder, fears the wind the mill will
turn. Every ground on both maps had room on 40 of 40 seeds. The owner's art gives each map its own
finished building: the pump (with moving water) and still, and the scarp mill with a hive. Mills
stand taller than a tile, by the owner's rule.

## How long a map takes

`test/minutes.test.ts`, printed by `npm run simulate`, and run every morning at 06:00 IST by
`.github/workflows/playtime.yml`, which puts the report on the run's summary page and keeps it for
90 days. A floor, not a forecast: a nearest-first tour
of every place at the scene's step time and each tile's cost, every word read at 200 a minute, 1.5
seconds a press, each discovery counted once however many places offer it. Measured on 28
September over eight seeds, with the settling people in:

| map | places | people | rungs | words | walk | read | press | total | sittings |
|---|---|---|---|---|---|---|---|---|---|
| Aravali | 12 | 6 | 53 | 2,480 | 2.2 | 12.4 | 3.1 | 17.7 | 1.4 |
| Dwarka | 12 | 5 | 55 | 2,530 | 2.4 | 12.7 | 2.9 | 18.0 | 1.4 |
| Lothal | 6 | 6 | 78 | 3,393 | 1.4 | 17.0 | 4.3 | 22.7 | 1.8 |
| Narmada | 7 | 7 | 55 | 2,920 | 1.8 | 14.6 | 3.8 | 20.2 | 1.6 |

**Q10, the owner's answer: there is no time limit on a map.** The aim is 10 to 15 minutes of focus
per sitting, the usual length of a cozy-game session, so `sittings` is the total over 12.5. Every
map is past fifteen minutes as a floor, almost all of it reading, so a map is one and a half to two
sittings. What nothing checks yet is that each sitting has somewhere natural to stop.

Before the fix below, the same measurement gave the Aravali zero rungs and ten minutes.

## Found on the way: discoveries the place panel never offered

Canon attaches a discovery to a place from two sides: the place's `discoveries` list and the
discovery's own `found_at`. The panel read only the first. **Eighteen discoveries, at 26 places, are
named only in `found_at`** -- every discovery on the Aravali among them -- so they could never be
looked at, while the Overworld, which reads `found_at`, counted them toward the map's progress.
`offeredAt` in `content/knowledge.ts` now reads both, the place's own list first, and
`test/offered.test.ts` fails by name if a discovery's place does not offer it.
Canon's playability check treats `found_at` as the authority and only checks the other direction, so
it passed. This is the cross-repo blind spot the session notes describe: both halves green, and the
two repositories disagreeing about what a place holds.
