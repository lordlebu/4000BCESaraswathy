# Satchel and Hearth

The plan for making things easier, measured, built and closed on 2 October 2026. The illustrated copy
is the artifact [Satchel and Hearth](https://claude.ai/artifact/9tZsbcQLhQwXbDFf2V9vUe), which is
private to the owner; this file is the authoritative one.

**The brief, from the owner, after playing the Narmada:** a container could not be made because
bamboo was hard to find; forests only offered "Follow it"; a pinned recipe could not be unpinned;
dung could not be burned to cook; events handed out useless flint and should nudge towards what is
pinned; and the game should hand-hold more, the way other games do. Later, the same day: the trunks
drawn on the map should be good for something, and following an animal showed its plate instead of
the act.

The owner took every recommendation, and painted `stalk-follow.png` for the last of them.

## What was found, and why

Each was traced to a cause before anything was built. Numbers are the Narmada on the default seed
unless a range is given across five seeds.

| What the owner hit | The cause |
|---|---|
| No container | The carry basket wanted 2 bamboo and 4 fibre. Bamboo came from two plants, on 30 of 707 forest tiles (4%), and 2 to 10 tiles within 20 steps of the start. Twelve recipes named bamboo; nine took any timber. |
| Forests offer only "Follow it" | "Follow it" is the stalk gesture. 80% of forest tiles gave nothing: forest had no ground material, and 6 of its 14 kinds of tree gave nothing at all. Plains gave something on 88%. |
| Cannot unpin | Unpinning worked from the workshop, under a button that read "Pinned" -- and a recipe that became makeable moved to the Ready list, which had no pin button at all. |
| Dung will not cook | All 14 cooking recipes asked for a carried *item* that burns. Fuel was only ever a kiln's ingredient. |
| Events give flint | "Dropped on the road" and "found underneath" were an even pick over the ground's common things. Within 20 steps of the start: 500 to 1,150 flint, 0 to 50 bamboo. |
| No hand-holding | The first-morning coach stopped at the flint knife; with nothing pinned the dock said nothing about what to do. |
| Following shows the plate | On purpose: the plate was preferred because `stalk.png` shows a buffalo, which would be wrong for any other animal. |

## What shipped

**Following an animal shows the act.** `stalk-follow.png`, the owner's painting with no animal in it,
fills the activity card, and the animal's plate sits inset at the top right -- the bottom is where the
tracks are. Fishing does the same over `fish.png`. With no act painted, the plate fills the card as
before.

**Phase 0, a reach test** (`test/reach.test.ts`). On every map and five seeds, a container and a cook
fire must be makeable from what lies within 20 steps of the start, solved down to raw materials from
what `yieldsAt` and `capacityOf` put on those tiles. It failed on 4 of 20 before phase 4.

**Phase 1, `useActivity`.** Taking, making, resting, using and the activity card's props moved out of
`App.tsx`, with no change in behaviour.

**Phase 2, a pin you can see and change.** The pinned line in the dock is a control: tapping it opens
the workshop at the recipe with Unpin focused. Every recipe row can be pinned, ready ones included,
and the button says Unpin. The workshop names what is pinned at the top with Unpin beside it. The next
building stage can be pinned from the settling panel. `content/goals.ts` reads a pin -- a recipe id,
or `stage:<map>`, so no save bump -- and says what it still wants.

**Phase 3, a cook fire from fuel** (`crafting.fireFor`). For cooking only, the need for fire is met by
something carried that burns, as before; by a hearth at a settlement or a road's stopping place; or by
one carried fuel, lit from the kit's lamp and spent by the meal -- the most plentiful, never one the
dish needs. The workshop says which fuel a dish will burn before the press. Canon's
`check_playability.py` mirrors it in `needs_here`.

**Phase 4, windfall wood and kinds over species.** Canon 2.48.0: windfall wood (timber and fuel,
common, fast) from every placed tree and palm; the basket takes any fibre; the loom frame, mud shoes,
hide tent and grain bin take any timber; a homestead stage may ask for a `#tag`, and the Narmada's
tower and sails take any timber. In the game a standing tree always gives windfall wood, and a fallen
log, driftwood or bamboo drawn on a tile always gives what it is -- **the log you see is the log you
take** (`world/features.ts`, held to `game/frames.ts` by `test/features.test.ts`). Forest tiles that
give something: 20% to 57%.

**Phase 5, `useHappenings`.** The event card, asking whether anything happens, story beats, the
inspectors and what a choice does moved out of `App.tsx`, with no change in behaviour.

**Phase 6, events that help** (`pickFor` in `happenings.ts`, numbers in `tiers.ts`). Three in four,
on its own seeded roll, what turns up is something the pin or this map's next stage still lacks, by
id or kind, when the ground could hold it. A stone that never renews stops turning up once four are
carried, unless it is wanted. With nothing wanted, every pick is exactly as before.

**Phase 7, where to find it** (`content/finding.ts`). The pinned line names the nearest tile already
seen that still holds something the pin wants -- "bamboo cane, 12 steps north-east" -- or where to
look if none has been, and the map marks the tile with a small turmeric diamond. Seen ground only, on
the owner's ruling.

**Phase 8, the next step.** With the first morning over and nothing pinned, the dock says one next
step (`content/guide.ts`): the next building stage, as a button that pins it; then the map's road to
settling; then somebody with something new to say; then a place not yet seen. The diary leads with
**Goals**, listing all of them with Pin and Unpin. The Hints switch turns the line off with the coach.

## Rulings, all taken on 2 October 2026

1. Every tree gives wood: windfall wood, in canon.
2. Recipes that only need a pole take any timber; ones that need cane keep it.
3. Any carried fuel lights a cook fire, free at a hearth.
4. Events lean three in four towards what is wanted; stone stops at four carried.
5. The pointer names only ground already seen.
6. One pin; the Goals list holds the rest.
7. The next-step line is on by default, off with Hints.
8. Following an animal shows the act, with the plate inset.

## Rules worth not undoing

- **A pin is a recipe id or `stage:<map>`.** Anything that asks what is wanted asks `goals.ts`.
- **The cook fire is cooking's only.** A kiln still wants what a kiln wants.
- **`world/features.ts` must match `game/frames.ts`.** A feature added to the art and not there shifts
  what every later tile is said to hold; the test fails by name.
- **The pointer never points into fog.** Walking is how a map is known.
