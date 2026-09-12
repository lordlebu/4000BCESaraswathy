# What is here, what time it is, and what you can put away

A second interface plan, opened after `docs/ui-streamline-plan.md` closed. That one was about
**how much of the screen the map keeps** — it went from 52% to 68% resting and 27% to 39% standing
in a place, and it is finished. This one is about **what the screen says once the map has the
room**, which is a different question and was never the first plan's.

Four items, reported from play:

1. What you are carrying should be something you can stop looking at.
2. The magnifying-glass buttons may not be needed on a touch screen, where pinch already works.
3. The flora, fauna and materials on a tile should be visible, not something you drag a panel open
   to read.
4. The time of day should be shown, and it is not shown anywhere at all.

**Two of the four are blocked by faults found while measuring them**, and both are the shape this
codebase keeps producing — something that passes every test because nothing was asking. They are
stage 1 and they are not optional.

---

## What was measured

Chromium, `?seed=dock-8&hour=12&at=9,40` — standing on plains, the resting state of the walk, at
four device sizes. Everything below is a measurement, not an impression.

### The dock at peek holds nothing about the tile you are standing on

This is the **complete** text of the dock at peek, identical at all four sizes:

> ✿ | Plains at 9, 40 | Open grassland rolls ahead, warm and easy on tired feet. | You can make out
> forest to the east, coast to the west and south, and river to the north. | ⛏ Work the ground | E |
> Unroll the bedding here | R

Now the same tile with the dock opened one notch, to reading height:

> **Creatures** — The cliff swift is feeding, and has not decided yet whether you matter. There is
> dung cake here, for the taking. **Cliff Swift** — Swifts cut the air above the grass in long
> scything arcs, too fast to count. **Growing here** — 🌸 **Poison Oleander** — Oleander flowers
> pink and cheerful on the dry margin. Nothing grazes it, and there is a reason for that.

Everything the tile actually holds — the animal, what it is doing, the plant, the material — is in
the second list. The first list is the *biome* and *what is in the next valley*. `.journal-notes` is
`display: none` at peek and that is deliberate; what was not noticed is that it takes **all** of the
tile's content with it.

**And the action chip does not fill the gap.** `Work the ground` carries a detail line reading
`"Dung cake."` — the answer to *what would I be taking* — and `.tile-action-detail` is hidden at
peek too. The verb is on screen; the object of it is not.

### Nothing on screen says what time it is

The whole of `#root`, as text, at four hours of the same day:

| `?hour=` | What the interface says about the time |
|---|---|
| 6 — first light | *nothing* |
| 12 — noon | *nothing* |
| 19 — evening | "The light is going." |
| 22 — night | "It is dark." |

Two binary warnings, and only once it is nearly too late. There is no clock, no sun, no hour
anywhere on screen. Meanwhile the hour decides:

- **whether an animal can be approached** — `routineFor(creature, moment)` is why the swift above is
  *feeding* rather than asleep, and `blockedReason` refuses a stalk at the wrong hour;
- **whether you may rest** — `"Not yet — there is daylight left."`;
- **whether a discovery will advance** — canon conditions gate on `time_of_day`.

The player is asked to reason about the hour by three separate systems and is never told it.

### Geometry, for the two items that cost pixels

| | desktop 1280×800 | phone 390×844 | small 360×800 | landscape 844×390 |
|---|---|---|---|---|
| dock at peek | 208 | 219 | 208 | **101** |
| — handle | 22 | 22 | 22 | 22 |
| — body (the notes) | 70 | 81 | 70 | **0** |
| — action rail | 115 | 115 | 115 | 115 |
| control bar | 1204×44 | 314×44 | 284×44 | 768×44 |
| satchel strip | 274×32 | 274×32 | 274×32 | 274×32 |
| zoom cluster | 44×94 | 44×94 | 44×94 | 44×94 |

The landscape column is the one to read twice, and it is the first fault.

---

## Two faults found while measuring, which block two of the four items

### P1 — on a landscape phone, the second action is below the bottom of the screen

Measured at 844×390, at peek:

```
rail   y = 299 .. 414        dock  y = 277 .. 378        viewport height 390
[⛏ Work the ground]   y = 308..352   ok
[Unroll the bedding here]  y = 358..402   OFF-BOTTOM by 12px
```

The dock is 101 pixels at peek (26dvh of 390). The handle and the rail alone want 137. The body is
squeezed to **zero**, the rail overflows the dock by 36 pixels, `overflow` is `visible` so nothing
scrolls, and the last twelve pixels of *Unroll the bedding here* are off the screen. The chips stack
into a column at that width rather than sitting in a row.

**Nothing in the suite asks.** `e2e/reachable.spec.ts` — the spec whose entire purpose is "can every
control actually be pressed", written after a button ran off the right edge of a phone — walks
`.controls .control, .zoom button`. The action rail is not in that selector. **The game's primary
verbs have never been checked for reachability**, and this is the fifth instance of this
repository's signature fault: built, tested, believed, and the test was not asking.

Item 3 puts *more* into the dock at peek. It cannot go in over this.

### P2 — a pinch also walks the traveller

`WorldScene` binds tap-to-walk with no guard at all:

```ts
this.input.on(Phaser.Input.Events.POINTER_UP, (pointer) => {
  const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  … this.queuedPath = findPath(…)
});
```

`updatePinch` tracks two pointers and steps the zoom. Nothing tells the tap handler that a pinch
happened. Lifting either finger at the end of a two-finger zoom fires `POINTER_UP`, and the
traveller sets off for wherever that finger was — spending in-game hours on a walk nobody asked for.

Item 2 proposes deleting the zoom buttons on touch **and handing the whole job to pinch**. That
cannot ship while pinch has this side effect. Fix first, remove second.

---

## The four moves

### A — the standing row: what is under you, at peek

**The trade, and it is a trade rather than an addition.** At peek the dock currently spends its body
on two lines: the biome's description, and the surroundings — *"You can make out forest to the east,
coast to the west and south, and river to the north."* That sentence is about **everywhere except
here**. At the one height whose whole job is *what is in front of you*, the panel is describing the
horizon.

So at peek, `.surroundings` gives up its place to a **standing row**: one line of chips naming what
is actually on this tile.

```
  🐦 Cliff Swift · feeding     🌸 Poison Oleander     ⛏ Dung cake
```

- **The creature**, with its routine as the second half of the chip — because *feeding* against
  *asleep* is the difference between a stalk that works and one that is refused, and that is already
  computed.
- **The plant**, with its `SpeciesIcon` mark.
- **Each material on offer**, from `takeableAt` — which already returns `{material, count}` and is
  already summarised into the chip detail the player cannot see.

Chips rather than prose: a chip is a target as well as a label, so tapping the creature opens its
plate, tapping the plant opens the plant, and tapping a material opens the take. The row is the
peek-height answer to *what is here*, and at reading height it steps aside for the full notes rather
than being repeated.

Nothing new is computed. `entry.creature`, `entry.flora`, `entry.doing` and `takeableAt` are all
already in `App.tsx`, already handed to the panels, and already thrown away at this height by one
`display: none`.

*Proved by:* a browser case asserting that, standing on a tile with a creature, a plant and a
material, all three are readable **without touching the handle** — and a unit case that the row
names exactly what `takeableAt` returned, so a material that stops being offered stops being named.

*What it costs:* measured, the swap is roughly even — the surroundings line is 21px on a desktop and
42px on a phone (it wraps), against a 32px chip row. The landscape case is P1's, and has to be
solved before this is measured at all.

### B — the satchel puts itself away, from where it is

**The switch exists and stage 6 buried it.** Putting the ribbon away was reported from play and has
had an off switch for months; stage 6 moved that switch out of the control bar and into the map
sheet, under *What is on screen*. That was right for the bar — a preference does not need a
permanent row — and it made the thing the player actually asked for **two taps deep inside a menu**,
with nothing on the strip itself saying it can be dismissed. The complaint is the direct cost of the
last plan's last stage, and it is fair.

So the strip carries its own dismiss: a `×` at its right-hand end.

**One structural note, because it is the whole of the work.** `.satchel-strip` is a single
`<button>` wrapping the entire readout. A `<button>` inside a `<button>` is invalid, and browsers
resolve it by discarding the inner one — so the dismiss cannot simply be added. The strip becomes a
`<div>` holding two buttons: the readout, which opens the full satchel as it does now, and the
dismiss. The accessible names carry the round trip, because a control that hides something has to
say where it went:

> *"Put the satchel away — bring it back from the Map sheet"*

*Declined, and worth writing down:* a 44px stub that stays behind so the strip can be summoned back
in place. It is a smaller permanent thing on screen, and a permanent thing on screen is exactly what
was asked to be rid of. The map sheet is a real, discoverable home for it and already holds the
switch.

*Proved by:* extending `reachable.spec.ts`'s existing *"the satchel ribbon can be put away for a
clean map"* case to do the round trip from the strip rather than from the sheet — the same
assertion, reached the way a player reaches it.

### C — the zoom buttons stand down on a touch screen

`@media (hover: none) and (pointer: coarse)` is already in this stylesheet, already hiding
`.tile-action-key` for exactly this reason, and already carries the note about why it is not a width
query: *a small desktop browser still has a keyboard*. The same rule hides `.zoom`.

**The counter-argument is in the code and deserves an answer.** `Controls.tsx` says: *"A mouse has a
wheel and a keyboard has +/−, but a phone has neither, and pinch is not something anyone thinks to
try on a map that fits the screen already."* That was a discoverability worry and it was reasonable.
Two things answer it: the map sheet already says *"Zoom with the + and − buttons, the mouse wheel,
or a pinch"* and is where a player looks for how to play, so the sentence is reworded to put pinch
first where the buttons are gone; and pinch on a map is now a decade-old convention that people
arrive already knowing.

**Be honest about the size of the prize.** The cluster is 44×94 — about **1.1%** of a landscape
phone. This is not a screen-budget move and should not be sold as one. What it buys is that the
top-right corner of the map stops holding two controls that duplicate a gesture the hand already
makes. The thing that makes it worth doing at all is P2, which is a real bug that only came to light
because the item was measured.

*Proved by:* a browser case under Playwright's `hasTouch` device emulation asserting the cluster is
absent and a pinch still changes `data-zoom`; and, for P2, that a pinch leaves the traveller where
they were.

### D — the hour, as a dial

A sun-and-moon mark in the control bar: one 44px readout whose pointer sits where the day is, filled
warm through the day and cool through the night, with the weather carried on it when there is
weather.

**Where the data comes from, and one boundary worth keeping.** `moment-changed` already crosses the
`EventBus` carrying `{ timeOfDay, weather }`, and `App.tsx` already holds it — so the wiring exists.
But that payload is a `WorldMoment`, handed straight to `journey.ts`, and is deliberately in
**canon's** vocabulary: `dawn | morning | afternoon | evening | night`, five values, with noon folded
into afternoon because canon has no midday. A dial driven off it cannot tell noon from four in the
afternoon.

So the sky is announced separately — `sky-changed`, carrying the engine's own label and phase from
`dayNight.ts` — rather than by widening `WorldMoment`. Canon's vocabulary stays canon's; the picture
of the sky is the engine's; `momentAt`'s mapping table between them keeps doing the one job it has.
Widening the shared payload to serve a picture is how the two vocabularies would quietly become one.

**Where it goes is a measurement, not a preference.** The bar is 314px of a 390px phone and 284px of
a 360px one — about 50px spare against gutters, and a 44px control just fits. *Just* fits is how the
bar became two rows the first time, and stage 6 spent a whole stage getting it back to one. So the
dial goes in the bar **only if `reachable.spec.ts` still finds one row at 360px**; if it does not, it
goes on the dock's head line beside *Plains at 9, 40*, which is the other place a player looks to
find out where and when they are. The test decides, not the plan.

*Proved by:* a unit case mapping phase to mark across the whole cycle, including the two wraps at
midnight and at first light; a browser case that `?hour=6` and `?hour=22` draw different marks, which
is the assertion that would have caught "the icon renders and never changes"; and the existing
one-row bound in `reachable.spec.ts`, unchanged, deciding where it lives.

**The extension into game design, since that was allowed.** A dial that only reports is worth having.
A dial that says *when the next thing happens* — how long until dusk, which is when resting unlocks
and half the bestiary changes what it is doing — is worth more, and is the same data. That is a
second step, after the first is on screen and has been lived with.

---

## Stages

| | What | Why this order |
|---|---|---|
| **1** | P1 and P2, and `reachable.spec.ts` extended to the action rail | Both are bugs; both block a later stage; the rail guard is overdue on its own |
| **2** | A — the standing row | The largest of the four, and the one the geometry of stage 1 makes possible |
| **3** | B and C — the satchel dismiss, the zoom on touch | Small, independent, and both are about giving the map back |
| **4** | D — the hour | New data across the bus, so it goes last and alone |

One branch, one pull request, per this repository's rule. Stage 1 is worth pushing before stage 2 is
written, because it is a fix rather than a change.

---

## What is declined

**A heads-up display over the map.** Chips floating on the canvas beside the traveller would answer
item 3 without spending any dock at all. It is declined because React never renders a tile — rule 3
of the four that hold this codebase together — and the alternative, drawing them in Phaser, puts
prose and a11y inside the scene. The dock is where writing lives.

**Removing the surroundings line.** Move A takes its place *at peek only*. It is a good sentence
about a real thing and it belongs at the height that is about reading.

**A numeric clock.** "14:32" is precise about a world that has never once been precise: canon says
`renews: fast`, not "in four days", and the whole `tiers.ts` split exists to keep durations out of
canon. A dial says *evening* the way the game says everything else.

**Hiding the action rail at peek to make room.** Tried and reverted during the last plan, and
`TileActions` is emphatic: every action is listed at all times, because a greyed row reading *"there
is daylight left"* is how a player learns resting exists.

**Making the satchel strip collapse to a count instead of vanishing.** A third state between showing
and gone. The ask was to stop having to look at it, and two states answer that; three is a thing to
learn.
