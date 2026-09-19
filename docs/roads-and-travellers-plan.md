# Roads and travellers — the programme, closed

> **Published, illustrated version:** [Roads and Travellers](https://claude.ai/artifact/75FV2pfAyXGpt1pCfXyKvm)
>
> Same content, laid out to be read rather than diffed: the four things pushed back on before any
> of it was built, the measurements, and the two sheets that were rejected and regenerated. It is
> the better thing to hand somebody picking this up.
>
> It is a **private** artifact — it opens for the repository owner and whoever they share it with,
> and 404s for everyone else. **This file is the authoritative copy**; nothing below depends on the
> link.

The road you walk between places, the people walking it, and everything that had to be true before
either of those read as anything. It started as *the roads do not join up* and finished as the
travel layer's art, because each thing fixed exposed the next.

## Closed — 2026-09-19

**This programme is finished.** What follows is the record, not a plan. The *Parked* section is
what was left undone deliberately; it is not a backlog, and each item is a fresh decision whenever
somebody wants it.

| Stage | State |
|---|---|
| The road reads as a road — 16-way mask sheet | **Shipped** — PR 194 |
| Camps: no fence, upland ground, spacing | **Shipped** — PR 194 |
| Travellers: the content layer and the rendering | **Shipped** — PR 194 |
| Canon: three species that only exist because people walk | **Shipped** — SouthOfTethys PR 129, taken in PR 194 |
| Canon: Kunch, Moonj, the straight-tusk and the dhole | **Shipped** — SouthOfTethys PR 130, taken in PR 194 |
| The browser suite, sharded four ways | **Shipped** — PR 195 |
| The traveller sorted by his feet, and the stall watchdog | **Shipped** — PR 196 |
| The ford crossings | **Shipped** — PR 197 |
| Travellers at half the player's size, on their own three sheets | **Shipped** — PR 197 |
| Three traveller sheets and the last three portraits | **Shipped** — PR 197, `docs/art-brief.md` Assets 7 and 8 |
| What a traveller is, said rather than drawn | **Shipped** — *Say how a traveller travels* |
| Drawing the mount | **Declined** — see below |

## The road

**Lothal had a road and drew less than half of it.** `fieldMap.ts` withholds the `road` flag on a
wet biome *on purpose* — canon sites the Nomad Ground at a **ford**, so paving the river would
contradict it — but the tile then said nothing at all, and the road ended at the water and resumed
beyond it.

| map | road tiles | crossings dropped | missing |
|---|---|---|---|
| **Lothal** | 54–87 | **23–42** | **a quarter to 44%** |
| Aravali | 116–169 | 0–17 | under 10% |
| Narmada | 98–126 | 1–15 | under 11% |
| Dwarka | 114–158 | 0–8 | under 6% |

The ford is the road's **third surface**, not a second feature: same `drawArm`, same `BAND` and
`MIDDLE`, one row down the same sheet, so it cannot drift out of alignment with the road it
continues. Stones rather than planks, 3-on-1-off with the gaps open so the river shows between
them. Nothing about walking changed — `river` is walkable at cost 1 and always was.

**And the road drew over the traveller.** The depth band was right; the *moment* was wrong. The
step tween sorted on `onStart` using the **destination** row, so walking north re-sorted the figure
into the row above before he had left the one he was standing in. `rowAtFoot` on `onUpdate` fixes
it, with a guard — Phaser flags the whole display list for re-sort on any depth write.

## The people on it

**Everybody else is half your size.** Travellers were sized by `TILE_SIZE / 32` at a second call
site — the same expression the player uses — so every figure on the road was drawn at exactly the
player's size. `FIGURE_CELL`, `figureScale` and `travellerScale` in `src/game/player.ts` are the
contract now. Half rather than a quarter because half is the only other whole number, and a
fractional scale makes pixel art shimmer.

**And they all wore the player's face.** `SHEETS` was the five *playable* characters, so on the map
you were on, one of the three might be wearing yours. `sheetsToUse` is **all or nothing** — it held
back through two sheets and fired on the third — and four tests proved that switchover *before any
of the art existed*, because a test written afterwards describes what happened instead of checking
it.

Three is the exact number rather than a compromise: `sheetFor` guarantees no repeat only while the
roster fits the list, and `TRAVELLERS_PER_MAP` is 3.

**Who is actually on each map**, measured after the canon pass: the Aravali is capped at three of
its five circuit-walkers, Dwarka and Lothal are filled exactly, and only Narmada is topped up — by
one piece of road company. Authoring Kunch and Moonj is what moved Lothal from two to three. Any
canon pass that gives somebody a second `found_at` moves these, so re-measure rather than trust
them.

## The art, and what it cost to learn

"Same process as Mithra" was a sentence, not a specification. It turned out to be measurable and
nothing was measuring it, so `tools/check-sprite.js` now does — and it fails three of the five
characters that shipped before it existed.

| sheet | speckle | mean run | stride | |
|---|---|---|---|---|
| traveller-carrier | **15.7%** | 1.81px | 6.5 / 7.0 | ok |
| traveller-pilgrim | 21.5% | 1.68px | **7.5 / 7.0** | ok |
| traveller-drover | 23.9% | 1.53px | 5.0 / 5.5 | ok |
| mithra | 26.8% | 1.59px | 5.0 / 5.0 | ok |
| guyuk / mehtar / malacite | 37–65% | 1.14–1.42px | — | **fail** |

Three findings overturned the obvious answer:

- **The colour target is a weak lever.** Rebuilding Mithra from the same source at 18→48 colours
  moved speckle only 19.8%→26.6%, and the five builds are visually identical at 8×. Seven points
  cannot explain a forty-point gap.
- **So it is the source art**, at the block size the builder samples with — it takes the most common
  colour per 8×8 block, and a block with no majority emits a pixel unrelated to its neighbours.
- **"No anti-aliasing" has never once been obeyed.** Every source sheet here is 38–43%
  semi-transparent pixels.

**The walk-cycle line in the brief was backwards and caused a reported shuffle.** `walkOrder` is
`[row+2, row+0, row+3, row+1]` — third, first, fourth, second — so the sheet must hold *two passing
poses then two contacts*. Measured in play order, Mithra closes to zero twice a cycle; Malacite
never closes at all.

Two sheets were rejected and regenerated. The drover's first attempt **passed every automated check
and was sent back anyway**: its back view filled 34 of 40 rows, because with the staff held out to
the side the box is wider than it is tall and `resample` fits it by width, so the figure shrank 15%
as it turned away. That is the honest limit of the checker — **it catches noise, not composition.**

## The faces

Fourteen of canon's seventeen people had a portrait, and the three without one were Anu, Kunch and
Moonj — **every one a circuit-walker**, because the portrait batch predates the travel layer.
`src/ui/portraits/` now holds seventeen against canon's seventeen: **everybody in canon has a
face.**

Two liberties were taken with the brief and both stand. Anu came back with a Central Asian face —
`docs/portrait-prompts.md` says canon records no appearance for anybody, so a portrait is the game
deciding, and it fits Terke's high-country people better than the brief did. Kunch's wrap came back
patterned, which rubs against *no fine cloth*, but block-printed cloth is period-ordinary.

## What a traveller is, said rather than drawn

**The mount was declined, and this is what replaced it.** Every traveller carries a `conveyance` and
none of it has ever been drawn; `vehicles.png` is built by `tools/build-terrain.js` and loaded by
nothing. Drawing it would have needed three pieces of art, a canon entity for Kunch's bird, and room
under a figure at half scale that there is not much of.

The call: a stranger met on a road is better **described** than illustrated. Talking to somebody who
walks a circuit shows three standing facts about them, in the register a character sheet uses —

| chip | what it says | where it comes from |
|---|---|---|
| `doing` | *On the road to Lothal Camp* / *Stopped at the Drowned Dockyard* | the scene, over `travellers-changed` |
| `who` | *Fisher* — canon's `role`, capitalised and otherwise verbatim | canon |
| `speaks` | *Speaks Kia* — which decides whether you understand them | canon |

**The derived conveyance is deliberately not a fourth chip, and the measurement is why.**
`conveyanceFor` reads a vehicle off the ground a circuit crosses. That is a fair guess for road
company the engine invented, and a contradiction for a person canon wrote: it gives **Kunch a reed
raft** where canon has him *"road singer, up on a bird"*, **Moonj an ox cart** where canon has him
*"driver, to a straight-tusk"*, and **Thrali the fisher a Harappan cart**. Canon's `role` is where
how-somebody-travels is said, so the role is shown verbatim and nothing is derived over the top of
it. A test asserts that no chip on any map ever names a vehicle.

The day canon authors the field outright — an `npc.travels_by` — it becomes a fourth chip and needs
no engine change beyond adding it.

Three notes on the build, each of which is a rule somewhere else in this repo:

- **`describeTraveller` is gone rather than kept.** It was written, tested and called by nothing —
  this codebase's signature fault, and it would have been the ninth instance. Its three cases are
  the `doing` chip now, so the writing survives and the dead function does not.
- **The seam sends state, not ticks.** `travellers-changed` fires when somebody changes what they
  are doing — twice a day, at dawn and at dusk — rather than on the tick that moves them, which is
  about a hundred times a day. It carries **places rather than tiles**, because a tile coordinate is
  not an answer to *where are you going* and React has no business holding one.
- **The browser is the only thing that can prove it exists.** The chips cross three seams that each
  have a passing unit test, and the mechanic still would not exist if the scene never sent the
  event. `e2e/talking.spec.ts` walks to Thrali and reads the chips off the screen with
  `document.elementFromPoint` rather than a bounding box, because a box is still reported for an
  element a scrolling ancestor has clipped away.

## Parked, not pending

| Item | What it needs |
|---|---|
| **Waypoints** — cairns, ford posts, boundary stones | Art and a placement pass. The road says *here is the way* and never *how far, and to what*. |
| **The stair where a road meets a scarp** | A rim-layer sheet and a rule in `routes.ts`. The road currently climbs a cliff as though it were flat. |
| **The landing at a dead end** | Canon has water routes the road stops dead at. A landing is where a road admits the next stretch is a boat. |
| **A sixth `travel` gesture** | Canon's `cross` items have no verb over them, the same shape as the `using.ts` gap. |
| **Road company you can talk to** | They carry no `npcId` and therefore no lines — canon owns vocabulary, and inventing some here would be the engine writing canon. So the chips are only ever seen on a canon person. |
| **The mount** | Declined above. Reopening it means art for an ox cart, a Harappan cart and a reed raft, plus a canon entity for Kunch's bird. |

## What this touched in canon

Canon changes when the fiction changes, and the travel layer needed it to twice:

- **Three species that only exist because people walk** — wayside knotgrass, traveller's burr and
  the drover's dog. The plan claimed canon had no ruderal; it does (`flora_datura`), and the claim
  was corrected when the entity was opened rather than reasoned about.
- **Kunch and Moonj**, the two people who exist because they travel, plus
  `fauna_narmada_straight_tusk` and the drover's dog re-cast as a dhole. With them came the `play`
  affordance, instruments as canon's eleventh item kind, and the **bamboomer** — which is not called
  a boomwhacker for trademark rather than taste. `docs/decisions.md` in the canon repo carries all
  of that.

## Also in this programme, and not about roads

- **The browser suite stopped killing itself.** `main` went red with nothing failing: 129 tests in a
  30-minute cap sized by a comment guessing "four or five". Sharded four ways with a gate job
  keeping the required check name. Nothing was skipped and no test moved off any branch. The
  numbers, and why they say which run they came off, are in `CLAUDE.md`.
- **A stall watchdog** for the freeze that will not reproduce here — `window.__stalls` and
  `localStorage`, so the next occurrence on a phone leaves a record. Four candidates were measured
  and cleared. **Still open**, and it is the one thing this programme did not finish.
