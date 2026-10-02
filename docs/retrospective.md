# Retrospective: from a lore database to a game you can settle in

Written 28 September 2026, when the Settling In plan closed, for the owner and for anybody picking
the project up. It covers both repositories from their first commits: the canon in
`SouthOfTethys` (July 2025) and this game (June 2026). The numbers were read from git and from the
public GitHub Actions API on the day, and the method is at the bottom so they can be taken again.

## Where it stands

| | Canon (`SouthOfTethys`) | Game (`4000BCESaraswathy`) |
|---|---|---|
| First commit | 29 July 2025 | 23 June 2026 |
| Commits on `main` | 489 | 739 |
| Merged pull requests | 143 | 219 |
| Size | 981 entities, canon 2.36.0 | ~35,400 lines of TypeScript in `src/` |
| Checks | lint, playability, export boundary | 1,427 declared unit tests (2,063 run), 42 browser specs |
| CI runs | 642 validate runs | 993 CI runs, median 15 minutes today |

What a player can do today: travel four field maps, leaving each only from its cart point. On
each map they walk, look closely, and climb discoveries whose rungs rewrite the diary. They talk to
the people who are actually there, and to strangers on the road, who remember them and pass on
rumours that turn into events. They find camps that come and go, gather and make things, and on
Lothal, Dwarka and the Narmada they talk a ground's holder round and build a settlement the
people move into. The Aravali is the crossing, and is never settled.

The art is owner-made and flows in continuously. 117 pieces are in `src/ui/art-kept.json`,
including 24 painted portraits, 24 species plates and 22 event paintings, and 47 built sprite
sheets sit in `assets/`. **None has ever been rejected for style.**

The canon's bundle is 553.1 KB against a 560 KB budget that is never raised.

**Since then, 2 October 2026: Living Camps, closed** (`docs/living-camps.md`, PRs #237 to #241).
The camps that came and went now have people on the ground -- a leader, a runner and a watch, a day
from relighting the fire to the night watch, a way worn in from the road, runners who trade with
travellers and visitors who come to eat -- and anyone walking the Aravali's line waits at the pier
while the carriage runs. `WorldScene.ts` was split into five views along the way and `App.tsx`
begun (item 2 below), and every painting asked for has arrived (item 6).

## How it got here

**July to September 2025: the canon, alone.** `SouthOfTethys` began as a lore database for a world
south of the Tethys sea: characters, a timeline, Docker, and a timeline visualisation. After
September 2025 it went quiet. There were two commits in March 2026 and nothing else for eleven months.

**June and July 2026: a plan and a prototype.** The game repo opened with planning documents
(#1), and a playable map-exploration prototype landed on 26 July (#2, #3).

**5 to 15 August: the vertical slice.** It was rebuilt on React, Phaser 4 and TypeScript (#8). The
canon learned to export itself to the game (#15, canon 1.1.0 at 414 entities) and got a retrieval
API (#17). The diary became the progression system (#24). Six "game batch" pull requests landed in
one day (#29–#34), followed by the three surfaces and the species collection. Published plans:
*State of Play*, *System Architecture*, *Three Surfaces*, *Varuna's Field Diary — Phased Plan*.

**18 to 25 August: art, and the first time it was played.** Next came the art pipeline, the
overworld, landforms, night and shelter, conversation, and the Mask thread. Then *What Playing It
Showed* found that maps were hardest to walk in the middle. Fatigue couldn't be felt. Solarpunk
never landed, because nobody reacted to being helped. Conversation was a form to fill in. Every
one of these was measured before anything was changed, and the causes were not what the symptoms
suggested. The Dry Harbour was retired as a fourth map with no story, and each map got a thesis.

**30 August to 1 September: the making layer.** Materials, recipes, processes and vehicles arrived,
along with the apothecary, the baked world, and the Here and workshop screens. *The Making Layer*
and *Verbs and Records*.

**5 to 8 September: people and ground.** Portraits arrived, and Varuna started speaking.
Travellers took to the roads. The ground began to give and to run down, and hands-at-work
activities arrived. The front door came next, then the Aravali crossing with its rails and basalt,
and the ground Dwarka stands on. Canon reached 2.13.0 and 923 entities.

**9 to 20 September: how it looks, and how it moves.** The coastal and riverbank graphics ran to 21
pull requests from one branch. After that came the UI streamline, the cozy-systems rework and the
travel overhaul.

**22 to 26 September: a living world.** Animals that move arrived, then milk, skins and a market,
roads and wet ground, rivers, boat and train art, and strangers with names, faces and happenings,
paced as storylets.

**27 and 28 September: Settling In.** Six phases in four game pull requests (#216–#219) and three
canon ones (#141–#143): who is here, standing and rumours, camps, cart points, homesteads on Lothal,
then Dwarka and the Narmada. See `docs/settling-in.md`.

In all, 30 plan pages were published over the nine weeks. Most put their questions to the owner
before anything was built, and most were closed with a record in `docs/`.

## What has worked

**The noun and verb split between the repositories.** Canon holds what exists and is true; the game
holds what a player did and how it looks. Canon exports its own shape and the game owns the
adapters. That is why this week added a whole entity type, homesteads, with one schema, one
adapter and no Python change on the game's account, and why six entity types before it were added
the same way. The rule has not needed revisiting since it was inverted in August.

**Determinism as a design rule, not a test convenience.** Travellers, wandering animals, camps,
rumours, strangers and standing are all pure functions of the seed, the map, the day and the hour.
The save's version has not moved since 11 September. The strangers, wanderers, storylets, camps,
standing and settling that shipped since then cost no migration, because none of them saves
anything it could recompute.

**Measuring before deciding.** The habit is the project's best one:

- Traveller overlaps fell from 5,775 of 96,000 moments to 0.
- Rendezvous hashing means new species take 4.8% of tiles, where before they moved 95.4%.
- Minutes per map are printed every morning.
- A build radius was set where 39 of 40 Lothal seeds have room.
- The focus-trap flake was reproduced at six workers before anything was changed.

Where it was skipped, it cost something: a threshold tuned blind, a CI cause diagnosed from a log,
a comment claiming an unmeasured 51 pixels.

**Pushback that kept the game's character.** The following were declined, each with reasons the
owner accepted:

- experience points and fame numbers;
- combat, including dacoits who fight;
- live AI-written dialogue;
- building anywhere on the map;
- an inventory that needs managing.

The game is still a naturalist's diary with no fail states, and that is a design result, not an
accident.

**Art that never blocks, and an intake that never judges taste.** Every system shipped with a drawn
stand-in. Owner art replaces it the day it arrives, with only technical faults repaired:

- a baked-in transparency checkerboard;
- an image tool's sparkle watermark;
- a signature in a corner.

The crop commands are recorded so every build can be reproduced.

## What has not

**Both sides green, the game broken.** The most expensive class of fault has been the gap between
the repositories, or between a check and the thing it claims to check. Each of these was found
late, and each had every gate passing:

- 18 discoveries were unreachable because the game read only one of the two sides canon
  attaches them from.
- Materials could be obtained somewhere but found nowhere, because rarity was ignored.
- A playability check passed a dependency cycle.
- The Aravali had nobody who could ever be helped.

**The browser suite is the bottleneck, and it got slower.** CI's median rose from 1 minute in early
August to 15 today. 97 of 993 runs failed, 16 of them on `main`. Almost all were browser specs that
depended on where things sit on the map or on timing, rarely on the logic, and this machine's GPU
cannot reproduce the CI renderer. The plates focus trap failed two runs in three on CI and never
locally until forced under load. The logic has been moved steadily into Vitest, and the unit job did not fail once in the 100 runs
measured for the Settling In plan. The browser suite should keep shrinking to wiring only.

**Branches got away more than once.** Three branches were once in flight with no way to tell what
had merged. Commits were orphaned twice by pushing to a branch whose pull request had already
merged, and this week a merged branch name was reused for a second pull request (#218 then #219).
Canon now has a push gate that refuses the broken case; the game still does not.

**The two big files kept growing.** Every plan since August promised new work would go into its own
modules rather than `App.tsx` and `WorldScene.ts`. During Settling In, `App.tsx` still grew from
1,654 lines to 2,168, and `WorldScene.ts` from 2,680 to 2,995. The rules themselves did go into
`content/`, so what grew is wiring. But a 2,000-line component is where every re-render bug lives,
and this week's focus bug was one.

**Faults that only playing would have found stayed hidden for weeks.** Three examples:

- The saved clock was never handed back to the scene, so every reload was day 0, for 22 days.
- The Narmada was drawn above the Aravali for 39 days.
- The first mill was built in a marsh.

Each was found by looking, not by a test. The owner is the only player, and play feedback has
come in two rounds, 19 August and 27 September, each finding faults that a thousand tests could not.

**Content outgrew the session.** The target was 10 to 15 minutes a map. Measured, each map is
already 18 to 23 minutes as a floor, almost all of it reading. The owner's answer was that there is
no limit, so a map is two sittings. That is a reasonable call, and it means each sitting needs a
natural place to stop, which nothing yet checks. **Answered 2 October 2026** (`docs/a-place-to-stop.md`): any night now
closes on the day's page and says it is a good place to stop, and the front door says where you
left off.

**The bundle is nearly full.** 553 of 560 KB. Every content batch now needs a lore/play split first,
and the easy ones (notes, sources, epochs) are spent.

## How it is progressing

**Fast, and with the brakes mostly working.** About 1,090 commits across both repositories landed
between 1 August and 28 September 2026, most days with several merged pull requests, and `main` has
stayed playable throughout. The share of work spent on verification is high (1,427 declared tests
against 35,000 lines) and it has paid for itself. Almost every fault above was caught before a
player saw it, and the ones that were not are the kind only play finds.

**The systems are complete; the game now needs play, not more systems.** The loop the owner
described on 27 September now runs end to end on three maps: arrive, help, build, settle, move on.
What is thin is how it feels, and that has been judged only by the owner, in two rounds of play. The next
gains are in pacing, stopping points, what a first-time player understands without the diary, and
whether negotiation feels like talking.

**The process has matured faster than the code structure.** Plans are published and answered
before building. Owner rulings are recorded as rulings, and lessons become checks: the push gate,
the fixture test, the export boundary, the bundle budget. The code has not had the same
discipline applied to its two largest files, and that debt is now the main structural risk.

## What to do next

1. **Play every map, start to settlement, and write down what was confusing, in a play-feedback
   round like 19 August's.** Do this before building anything new. The morning play-time report
   gives the minutes; a person gives the rest.
2. **Split `App.tsx` and `WorldScene.ts`,** into hooks by mode and renderers by thing (homestead,
   camp, travellers). A plan has promised it three times. Do it as its own branch, with no
   behaviour change, and gate it on the browser suite. **Begun 2 October 2026:** the camp's
   drawing, the road's people, the wandering animals, the homestead and the visitors who walk up
   moved to `game/systems/` (`CampView.ts`, `TravellerView.ts`, `WandererView.ts`,
   `HomesteadView.ts`, `VisitorView.ts`), taking `WorldScene.ts` from 3,923 lines to 2,529. What is
   left in the scene is the player -- walking, wading, the dugout, riding -- the ground, the fog,
   the sky and the camera, which is one system, and the scene's split stops there on purpose:
   riding was looked at and kept, because it is the player's own motion. **`App.tsx` was begun the
   same day:** the road's talk -- the talk row's target, calling out, the camp's people and the
   road's speak-first -- is `useRoadTalk.ts`, taking it from 2,547 lines to 2,403. **Carried on with
   Satchel and Hearth:** `useActivity`, `useHappenings`, `useSettling` and `useCrossing` moved with no
   change in behaviour, and the new guidance went straight into `useGuidance` rather than the file --
   2,403 lines to 1,747. What stays is the layout, the save and the bus listeners for state App
   owns.
3. **Give the game repo the canon's push gate,** and confirm in Settings that both repositories
   require their checks. The anonymous API still shows no required-check rule on either. **The gate
   half is done:** the game has `.claude/hooks/push-gate.sh` too. The Settings check is the owner's.
4. **A cross-repository contract test** that loads canon and the game's adapters together and
   fails when they disagree about what an entity is called or where it is offered. Every
   both-sides-green fault above would have been caught by one. **Made unnecessary on 2 October
   2026:** the making layer, where every such fault lived, moved to the game, and
   `test/gameOwned.test.ts` resolves the ids that still cross in both directions.
5. **Plan the bundle before the next content batch.** Loading each map's data only when that map
   is entered is the next step beyond withholding fields.
6. **The three paintings asked last all arrived on 2 October 2026:** `woven-camp`,
   `settle-home-dwarka` and `settle-home-narmada`. No painting is outstanding.
7. **A lighter game** (`docs/a-lighter-game.md`), after making moved to the game on 2 October 2026:
   rungs that need only understanding, and regrowth tiers sorted by how much the game uses a material
   rather than by real-world lore. Not started.

## How the numbers were taken

- Commits and pull requests come from `git rev-list --count origin/main` and
  `git rev-list --merges --count origin/main` on each repository.
- Lines are the summed lengths of `src/**/*.{ts,tsx}` at each date.
- Declared tests are `it(` and `test(` at line start in `test/`; the run count is what Vitest reports.
- CI figures are every completed run of `CI` (game) and `Validate Story World` (canon) from
  `/repos/lordlebu/<repo>/actions/runs`, grouped by ISO week.
- Minutes per map are from `npm run simulate`.
- Entity counts are from `database/index.json` at the commit nearest each date.
