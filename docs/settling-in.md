# Settling In

The endgame plan: arrive at a map, help its people, and settle there with their backing. The
readable version, with the phases, the pushback and the questions, is the published page
[Settling In](https://claude.ai/artifact/YTD1Y7MXFxtXRWStDaYm2c). This file is the repository's copy
of what was decided and what was measured, so it survives the page.

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

## How long a map takes

`test/minutes.test.ts`, printed by `npm run simulate`. A floor, not a forecast: a nearest-first tour
of every place at the scene's step time and each tile's cost, every word read at 200 a minute, 1.5
seconds a press, each discovery counted once however many places offer it. Measured on 27
September over eight seeds, after the fix below:

| map | places | people | rungs | words | walk | read | press | total |
|---|---|---|---|---|---|---|---|---|
| Aravali | 12 | 6 | 53 | 2,480 | 2.2 | 12.4 | 3.1 | 17.7 |
| Dwarka | 12 | 3 | 55 | 2,301 | 2.4 | 11.5 | 2.4 | 16.3 |
| Lothal | 6 | 4 | 78 | 3,198 | 1.4 | 16.0 | 3.9 | 21.3 |
| Narmada | 7 | 5 | 55 | 2,708 | 1.8 | 13.5 | 3.2 | 18.5 |

**Every map is already past fifteen minutes before any settling is added**, almost all of it
reading. The target in the plan assumed the maps were short; they are not. Settling adds about six
minutes, which puts the four at roughly 22 to 27. Either the target moves, or the diaries are
trimmed. That is the owner's call, on the plan page as Q10.

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
