# The seven systems, reworked

Crafting, apothecary, cooking, building, stalking, fishing and resting — made simple, made
intuitive, and made to cost one press.

**Status: Phases 1, 2, 2b and 5 shipped and merged (PR #192). Phase 3 is art, handed over in
`docs/art-handover.md` and deliberately not a blocker. Phase 4 — activity boards — is designed in
`docs/activity-boards-plan.md` and not built.**

What is left is listed at the bottom of this file, under **What remains**.

Written during the work rather than after it, because the middle of it is where somebody else
needs to be able to pick it up. `docs/the-ground-that-gives.md` is the map to the resource layer
this sits on; this is the map to what was done to it.

---

## The finding

Seven systems were named. **Three of them did not exist**, and a fourth existed with no door.

| Named | What was actually there |
|---|---|
| crafting | `crafting.ts`, `making-chain.ts`, `WorkshopPanel` — real, and gated behind a timing minigame |
| stalking | a gesture in `gestures.ts` — real, and the same minigame |
| resting | `night.ts`, `fatigue.ts` — real, and the same minigame |
| cooking | `cooking.ts` — written, tested, and with **zero importers** for the whole of its life |
| apothecary | **nothing.** 7 canon `physic` items affording `heal`, craftable, inert |
| building | **nothing.** 2 canon `shelter` items, craftable, inert |
| fishing | **nothing.** 42 aquatic fauna and 6 materials off them, taken as though they were deer |

The fourth row is this codebase's signature fault, and `journey.ts` already lists three previous
instances of it at the top of its own file: *a mechanic written, tested, believed, and wired to
nothing*. Nothing failed. Nothing could: every question `cooking.ts` answered was answerable, and
nobody was asking.

The deeper version of the same fault ran through the whole making layer. **Eighty-three recipes,
and not one of them changed anything a player could feel.** You could smelt bronze, cast a blade,
haft a knife — and the knife did nothing. That is why the tree had no reason to be re-run.

### And the minigame was a toll on the loop

Every take, every craft and every night opened a card and ran a three-beat timing track:
`BEATS = 3` at `BEAT_MS = 1500`, so **4.5 seconds of rhythm-pressing per material**. A walk across
Lothal takes from forty-odd tiles. That is three minutes of pressing to fill a satchel.

It also contradicted rulings this repository had already written down:

- `nodes.ts` said a skill surface was something "this game does not have and would have to build on
  purpose" — and then one was built.
- `CLAUDE.md` said "the cozy reading of gathering is stooping once rather than running an
  interface".
- The floor was structural, so the minigame could only ever *add*. A player who ignored it got the
  old result; a player who played it got `+1`. The optimal play was to spend 4.5 seconds per reed.

---

## The industry check

Measured against the genre rather than against taste. Cozy games converge hard here:

| Convention | Who | Where we were |
|---|---|---|
| The core verb is **one press**, animation skippable | Animal Crossing DIY, Stardew crafting, Spiritfarer | 4 presses over 4.5s, per unit |
| **Never fail; vary the amount** | universal | already held — `tiers.ts`, `nodes.test.ts` |
| Craft from a list, ingredients pulled automatically | Stardew, Portia, Ooblets | already held — `making-chain.ts` runs the whole chain |
| Reward **preparation**, not reflexes | Stardew tool tiers, AC golden net, Spiritfarer's kitchen | nothing rewarded preparation |
| Using a carried thing happens **on the thing** | Stardew, AC, Spiritfarer, Cozy Grove | no use verb existed at all |
| No modal tax on a repeated act | Unpacking, A Short Hike, Dorfromantik | a modal per tile |

The one famous counter-example — Stardew's fishing — is also the single most complained-about
system in that game, and it fails on *your input*, which is a skill surface this game does not
have.

Two conventions we already met and kept: every action listed at all times with its reason
(`TileActions`, straight from Kittens Game and A Dark Room), and no inventory scarcity
(`satchel.ts`, `kit.ts`).

---

## Phase 1 — preparation replaces reflexes · **shipped**

**The timing track is gone. One press does the act.** The painted card, the prose and the Six Ages
composition all stay — what was deleted is the clock.

The grade still exists and still reads `clean` / `fair` / `clumsy`. What decides it is now two
things the player chose *before* they pressed anything:

|  | moment with you | moment against you |
|---|---|---|
| **carrying what it asks** | `clean` | `fair` |
| **empty-handed** | `fair` | `clumsy` |

Nothing here had to be invented. Both inputs were already modelled:

- **what it asks** is a canon *affordance*, never a named tool, so canon can add a fourth blade
  without the table moving — `stoop` wants `cut`, `work` wants `work`, `stalk` and `fish` want
  `deter`, and a **night wants nothing at all** because the kit's bedroll is always there and a
  night must never be lost for want of a thing to hold;
- **the moment** is `routine.ts` for a stalk or a cast (an animal that is feeding "has not decided
  yet whether you matter"), `fatigue.ts` for a stoop or a turn at the ground, and the shelter for a
  night.

`clumsy` remains exactly the old behaviour and never a failure. The floor is still structural:
`settle` starts from what the tile promised and can only add, and `test/activity.test.ts` asserts
it on the worst possible preparation, for every gesture.

**What this bought beyond speed.** The card now says what you brought *before* you commit — "Nothing
in the satchel cuts, so this is hands and patience." That sentence could not exist while the grade
came from reflexes, and it is the only thing in the game that tells a player to go and make a
knife.

**And three bug classes went with the clock.** A `setInterval` re-entered on every render whose
deps had to be read from a ref; a settle effect that paid twice when its flag doubled as its
content; a button replaced mid-reach because a beat timed out between Playwright resolving it and
clicking it, which read as CI flakiness for four runs. All three were only ever reachable because
there was a clock in a modal. `test/activityModal.test.tsx` now advances fake timers 60 seconds and
asserts nothing happens.

### Fishing, as the fourth gesture

`gestureFor` gained a water predicate, tested **before** the animal predicate — everything fished is
also an animal, so the broader test first makes `fish` unreachable, and it would fail silently as a
sawfish stalked across a riverbed. Read off canon's `clade`, which the bundle already carries for
all 256 fauna: **fish, mollusc, crustacean**. Crocodilians are deliberately excluded. You do not
fish for a croc.

---

## Phase 2 — one verb for apothecary, cooking and building · **shipped**

Three missing systems, `src/content/using.ts`, and **one verb**.

The obvious repair is three panels — an apothecary, a kitchen, a camp-builder. That is three
screens for a game whose whole interface budget is one dock with one occupant. So instead there is
one question, asked of anything in the satchel: **what is this for?** Canon has already answered
it, on the item, in `affords`.

| Affordance | Reads as | What using it does | Spent? |
|---|---|---|---|
| `heal` | Physic | eases tiredness by `REMEDY_EASES` (half) | yes |
| `eat` | Food | eases tiredness by `MEAL_EASES` (a quarter) | yes |
| `shelter` | Shelter | tonight is a camp's night, not the bare ground | **no** |

Those three are exactly canon's affordance words that are about the *person* rather than the work —
`cut`, `bind`, `work`, `mark` all answer a process, and `crafting.missingTools` already reads them.

**A shelter is never consumed, and that is the whole of "building".** You do not use up a tent by
sleeping under it. `night.shelterAt` already ranked four kinds of night; all that was missing was a
fourth thing for it to consider. So there is **no new save state** and no `SAVE_VERSION` bump — the
obvious design, a set of tiles you built on, would have discarded every existing journey for a
mechanic whose entire content is "the night went better".

And it closes the loop the making layer never had: **you craft a tent because the nights are bad,
and then the nights are better.**

### What did *not* change

There is still no hunger, no health, no spoilage and no stat a meal moves except a walking pace.
`fatigue.ts` holds four invariants whose whole content is that tiredness never stops you, which is
what makes it safe to expose to an item. A player who never opens the satchel still finishes the
game.

`cooking.ts` got its caller: the workshop has a **To cook** section. Cooking is not a second
crafting system — the module says so itself — so it gets a heading, not a screen. One import was
the whole fix.

---

## Phase 2b — six kinds of night, all worth the same · **shipped**

`bedroll`, `tent`, `camp`, `roof`, `settlement`, `palace` — and `NIGHT_RESTORES` is **flat**. Every
night that is a night restores the same. Only sitting it out with no shelter at all is worth
nothing, because that is not sleeping.

**A graded version was built and taken back out**, and the correction is worth recording because the
mistake was a tempting one. It read plausibly — a bedroll worth a third of a night in town — and it
was answering a question nobody had asked. The shelter kinds exist to be different **places**, not
different amounts: what a player gets out of where they slept is going to be an *event*, and an
event is a scene and a choice rather than a percentage.

So the ladder is a **vocabulary of six paintings and an event filter**. `rest-<shelter>.png` gives
each one its own night, and `Conditions.shelter` lets a dream happen only in the woods or a visitor
knock only in a town. That is a far better axis, and it is why Phase 5 exists.

`palace` is a grand settlement — the biggest place on a map, where the most people are. Not a royal
anything. `camps.isGrand` is a labelled placeholder rule (three or more people) that becomes a
one-line read of `poi.grand` the day canon authors one.

**And the arithmetic was backwards.** `easedMark` moved out of `WorldScene` into `fatigue.ts`
because the version written inside the scene added to the rest mark instead of pulling it back —
which put it ahead of the clock, clamped the negative to zero, and made every rung restore
everything. It type-checked, read plausibly and passed all 1,196 tests, because it lived where no
test could load it. Its new test then found a second fault: `Math.min`/`Math.max` do not clamp a
`NaN`.

---

## Phase 5 — events · **framework shipped, content not written**

Something happening to you, as opposed to something you did. `docs/events-plan.md` carries it.

A dream on the third night, an animal at the edge of the firelight, somebody arriving in the dark.
None are written. What is written is the shape they arrive in, so adding one is a row of data and a
painting rather than a feature.

**`EventCard` reuses `ActivityModal`'s furniture down to the class names**, because three surfaces
in this interface already turned out to be the same screen wearing different code. An event wants a
painting, a passage and a short list of plain choices — which is exactly that screen.

It is wired to **`night-passed`, which had no listener at all** until this: emitted every time
somebody slept, carrying everything a night needs, and read by nothing. The fourth instance of this
codebase's signature fault, and now a socket with something in it.

Two rulings: every option offered must be takeable (an option needing something the player lacks is
not offered, rather than offered greyed), and an event can never strand a player (if every choice is
gated, the last is offered anyway — a scene with no way out is a soft lock).

---

---

## Phase 3 — art · **not started, and not a blocker**

Every slot below renders something today. A painting **replaces** what is there; it never fills a
gap. They can arrive in any order, in any quantity, and each takes effect the moment the file
lands. See `docs/art-placement.md` for the manifest.

`src/ui/art.ts` is new and is the reason this is cheap: four near-identical loaders became one
registry globbing `./*/*`, so **a new folder of art needs no code at all**. Two were opened with
it — `src/ui/places/` and `src/ui/things/` — and both are already wired to a caller, because a
loader with no caller is the fault this document opens with.

---

## Where the numbers live

Unchanged and still the rule: **`tiers.ts` is the file to edit when the walk feels wrong.**
`REMEDY_EASES` and `MEAL_EASES` joined it. None of it is a fact about the world and none of it
needs a canon edit.

Canon was **not touched**. Every system here reads data the bundle already shipped.

---

## What is checked

- `test/activity.test.ts` — the grade table, the floor on the worst preparation, the water-before-
  animal ordering, and that no line of prose tells a player to press in time with anything.
- `test/activityModal.test.tsx` — one press, paid once, no clock, and the readiness clause renders.
- `test/using.test.ts` — every `heal`/`eat`/`shelter` item **in the real bundle** has a use, so a
  canon addition cannot land inert; and a shelter is never spent.
- `e2e/gathering.spec.ts`, `e2e/making.spec.ts`, `e2e/fatigue.spec.ts` — the three flows, driven in
  a real browser with plain clicks, because nothing can settle on its own any more.

1,184 unit tests across 75 files, and the three browser specs above, all green.


---

## Phase 4 — activity boards · **designed, not built**

Which bench a place has, said with an icon. `docs/activity-boards-plan.md` carries it in full.

The short version: canon's `performed_at` says only `settlement`, so every settlement works
everything and no place says what it actually has. But canon already answers the next question down
through **who is standing where** — and it has already broken its own flat model, because Ila the
apothecary stands in an archaeological site that `performed_at` says cannot work anything.

Eight stations, derived rather than authored, in the way `gestures.ts` and `routine.ts` already
derive. Additive before subtractive, and a reachability test before any narrowing — because a
narrowing made game-side is invisible to canon's `check_playability.py`, and the two repositories
would disagree while every check on both sides stayed green.

---

## What remains

Written at the end of the sprint so the next session does not have to reconstruct it. Nothing here
is blocking anything else; they are independent.

### Art — handed over, not started

`docs/art-handover.md` is the whole of it: the inventory, the order, prompts for the four slots that
had none, and every gotcha that has cost an asset. **38 files** take every folder except `plates/`
from nothing to complete at the category tier.

Every slot renders something today, so this can be picked up by anybody, in any order, at any time.

### Activity boards — designed, not built

`docs/activity-boards-plan.md`. Eight stations derived from who stands where; the board is a strip
of marks under the place's name. Held back deliberately: it changes `placeAllows`, which canon
co-owns, and a narrowing made game-side is invisible to canon's `check_playability.py` — both
repositories would disagree while every check on both sides stayed green.

Order of work is in that document. **Additive before subtractive, and a reachability test before
anything narrows.**

### Events — framework only

`docs/events-plan.md`. Three things, and the first is the one that matters:

- **No events are authored.** The registry is empty and the tests drive it that way.
- **`seen` belongs in the save.** It is a `useRef` today, because adding a field to `Journey` bumps
  `SAVE_VERSION` and discards every existing journey — and there is nothing yet to have seen. It
  moves in the same change that authors the first event.
- **`arriving` and `road` have no caller.** Declared and unused, which is the fault this whole
  sprint kept naming. They get one when they get content.

### Two numbers that are guesses

`REMEDY_EASES` (0.5) and `MEAL_EASES` (0.25) in `tiers.ts`. The *ordering* is right — a physic is
worth more than a meal — and the magnitudes have never been played. They want a playthrough, not an
argument.

### The endgame is out of scope and knows it

Settling down on the survival train is not ready. When it lands it changes one thing here: **a place
you built should outrank a roof somebody lends you**, which is a seventh rung on the shelter ladder
and belongs with that work rather than ahead of it.

### Doc drift found and fixed on the way out

Two claims had gone stale and are corrected in this sprint:

- **`placement: "lore"` is gone.** `CLAUDE.md` claimed 35 species were held back, and 85 before
  that; canon 2.22.0 carries none and all 341 reach the engine. Worth knowing twice: **nothing in
  `src/` reads `placement` at all**, so the holdback was never enforced game-side even while it was
  true of the data. `renderableBiomeIds` is what actually decides whether a species has ground.
- **The plate queue is 341, not 297.** Same cause.
