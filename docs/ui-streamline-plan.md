# UI streamline plan — the map is the screen, and it is 27% of it

**Stages 1 to 4 have shipped; 5 and 6 have not.** This is the plan as argued, with the
measurements it was argued from, and each shipped stage marked where it sits. The plate view under
B′ shipped alongside them, and fault 7 carries a correction to its own first version. Read it alongside `docs/ui-handoff.md`, which is the design record for the arrangement this
proposes to change and explains why most of it is the way it is. That document's one live rule —
*ask `journey.ts`, do not reimplement it* — is untouched by everything below, and every stage here
is a rearrangement of presentation with no new rule in a component.

The headline claim of `src/ui/styles.css` is in its first line: **"The map is the screen."** That
was true of the arrangement it replaced, which was a web page containing a game. It is no longer
true of the arrangement that replaced it.

## What was measured

Chromium at four device sizes, `?seed=poi-252&hour=12`, standing on ordinary ground with nothing
opened — the resting state of the game. Coverage is the union of `.journal`, `.controls`,
`.satchel-strip` and `.zoom` sampled on a 4px grid. The panels are `rgba(255, 246, 223, 0.93)`
over a `blur(2px)`, so covered means covered: you cannot read the ground through them.

| Viewport | Chrome over the map | Map left |
|---|---|---|
| desktop 1280×800 | 48.3% | 51.7% |
| phone portrait 390×844 | 47.9% | 52.1% |
| small phone 360×800 | 48.2% | 51.8% |
| phone landscape 844×390 | **62.7%** | 37.3% |

Then the same measurement at the drowned dockyard (`?seed=dock-8&at=9,40`, two steps south),
standing in an authored place with one person in it — which is the state the game is *for*:

| Viewport | Chrome over the map | Map left | Place panel content shown |
|---|---|---|---|
| desktop 1280×800 | 73.0% | 27.0% | 349 of 477px — 73% |
| phone portrait 390×844 | 81.1% | 18.9% | 342 of 493px — 69% |
| phone landscape 844×390 | **82.9%** | **17.1%** | 135 of 473px — **29%** |

Two things fall out of that second table and they are the whole plan.

**The map is at its smallest exactly where the game happens.** A point of interest is where the
discoveries, the people and the diary entries are; it is also where five sixths of the screen stops
being the map. Somebody arriving somewhere sees less of where they arrived than at any other moment
of the walk.

**And the reading is worse at the same moment.** The place panel is a scroller, and on a landscape
phone it shows 29% of itself: a person's portrait, their name, and a sentence, inside a 135-pixel
window, with `Look closer`, the other people, and `Further in` all below the fold of a panel most
players will not think to scroll. The prose canon wrote for that place is the first casualty, and it
is the writing the place exists for.

A third thing, not visible in a number. At `poi_lothal_camp` three people — Bekh, Thrali and Uma —
render **simultaneously**, each with its own 96px portrait and its own running typewriter, stacked
in that same scroller. `Dialogue` is careful, paced, and worth the care; three of it at once in a
window that shows a third of itself is not a conversation, it is a noticeboard that moves.

## The verdict on the rest, which is mostly good

"Industry standards" deserves a fair answer and not just a list of complaints. Measured or read
directly:

- **Contrast passes.** `--ink` 13.1:1, `--muted` 5.9:1, `--surroundings` 6.7:1, `--accent` 4.7:1,
  and white on accent 4.75:1 — all over the 4.5:1 the WCAG AA body-text minimum asks for. The
  palette is not the problem and does not need touching. (The *exceptions* are in the fault list
  below, and they are all `opacity`, not colour.)
- **Touch targets are right** and are guarded: 44px minimum on `.control`, with
  `e2e/reachable.spec.ts` walking every control at six device sizes and refusing anything under 40px
  or off the edge. This is better than most shipped web games manage.
- **Every control is named.** `aria-label` on all of them, including the ones whose visible label
  the CSS drops on a short landscape phone — which is the case that usually gets missed.
- **There is a visible focus ring**, and the note in the stylesheet says it was added because there
  was not one.
- **`prefers-reduced-motion` is honoured where it matters** — `Dialogue` completes every beat
  instantly under it, which is the right reading of the setting rather than a token one.
- **Colour is never the only signal.** `.control-on` carries `aria-pressed` and a border change
  alongside the tint.
- **The state model is sound.** `surface.ts` arbitrates one panel slot instead of seven booleans
  negotiating, it is pure, and it is tested under Node. Nothing below replaces it; two stages extend
  it.
- **The activity card is the one place the interface already gets exactly right**, and it is the
  model for the rest. A 4:3 painted scene at the centre of the screen, the whole world stopped
  behind it, a card of `min(30rem, 100%)` that is neither full-bleed nor a strip — a player looks at
  a drawing of hands at work and then acts on it. It is also the cheapest art pipeline in the
  repository: `scenes.ts` globs `src/ui/scenes/*.png` by gesture id, so a new painting is a file and
  no code. **It keeps the centre of the screen, at its current size, and grows.** See the note under
  *What is declined* — the plan defends this rather than economising on it.
- **`TileActions` has the right ruling in it**: every action listed at all times, a blocked one
  greyed *with its reason* rather than hidden, because the reason is the teaching. That is the
  correct call for a clicker and it is kept — this plan moves those rows, it does not filter them.

So the faults are not in the taste, the accessibility floor, or the state model. They are in the
**arrangement**: what gets a permanent slot, what has to be scrolled to, and what happens when three
things want the bottom of the screen at once.

## The faults, in the order they cost the player something

### 1. Nothing ever yields the map back

`.journal` is `position: absolute`, pinned to the bottom edge, full bleed, `max-height: 38–46dvh`.
It is 320px tall and **1256px wide** on a 1280px desktop: a two-column prose grid stretched across
the entire screen. There is no state in which it gets smaller — only *gone*, via the Notes toggle,
which takes the field notes away entirely.

That is a binary where the game wants three settings. Most of the walk needs one line ("Hill, at
23, 41 — 4 discovered") and the action row. Arriving somewhere needs the prose. Nothing needs a
full-bleed band of it on every step.

### 2. The place panel is a scroller at the only moment that matters

Measured above: 29% of itself on a landscape phone, 69–73% elsewhere. It stacks *above* the notes
rather than replacing them (`.stage:has(.journal) .place-veil { bottom: calc(… + 42dvh) }`), so the
two divide the bottom of the screen and each gets half of a half.

The comment above that rule is right about the bug it fixed — suppressing the notes when a place
opened meant a journey that *started* on a place never showed them. The fix chose to divide the
space. The alternative it did not consider is that the two are never wanted at once, and one slot
with a switch in it gives each of them all of the space instead of half.

### 3. Everyone at a place talks at once

`PlacePanel` maps over `npcsAt(place.id)` and renders a `<Person>` for each, and every `<Person>`
mounts a live `Dialogue`. Canon has 15 people over 22 populated points of interest: 16 with one
person, 5 with two, and Lothal Camp with three. So a fifth of the inhabited places in the game start
two or three typewriters in one scroller, and the player's attention has nowhere to go.

Canon's lines average 32 words and run to 61. They are written to be listened to. Two at once is not
a presentation of them.

### 4. The things you can do are inside a panel of prose

`TileActions` renders as a `<section>` *inside* `JournalPanel`, below the surroundings, the notes
grid and the memory. The rows are the game's verbs — take what is here, work the ground, stop for
the night, board the carriage — and they sit under a scroll in a panel whose height is capped at
38dvh. On a phone with a full note grid they are below the fold of the one panel that is always
open.

The hotkeys are right and are derived from the same list, so E/R/B never drift from the buttons.
But `TileActions`' own header says it: *if it is not written on screen with a button beside it, it
does not exist*. A row you have to scroll a prose panel to reach is halfway to not being on screen.

### 5. Six hand-rolled modals, and not one of them traps focus

Eleven things render `role="dialog"`. Measured by tabbing:

| | `aria-modal` | Escape closes | Focus moves in | Focus trapped | Focus restored | Background inert |
|---|---|---|---|---|---|---|
| Diary / Progress | yes | yes | yes | **no** | **no** | **no** |
| CollectionPanel | yes | yes | yes | **no** | **no** | **no** |
| PeoplePanel | yes | yes | yes | **no** | **no** | **no** |
| Ending | yes | yes | yes | **no** | **no** | **no** |
| ActivityModal | yes | yes | yes | **no** | **no** | **no** |
| FieldKit | yes | **no** | **no** | **no** | **no** | **no** |
| SatchelPanel | yes | **no** | **no** | **no** | **no** | **no** |
| WorkshopPanel | yes | **no** | **no** | **no** | **no** | **no** |
| Overworld | yes | **no** | **no** | **no** | **no** | **no** |
| Controls sheet | **no** | **no** | **no** | **no** | **no** | **no** |
| FrontDoor | **no** | **no** | — | **no** | — | **no** |

With Records open, **8 of the next 10 tab stops are outside the dialog** — two presses and the
keyboard is in the control bar behind a veil it cannot see past. With Travel open, Escape does
nothing and the first five stops are all behind it. `aria-modal="true"` is a promise to a screen
reader that the rest of the page is unavailable, and every one of these panels makes that promise
and then leaves the rest of the page tabbable. That is worse than not claiming it.

This is six copies of the same twenty lines, five of which drifted. It wants one primitive.

### 6. Two of the seven controls are view state, not verbs

The bar holds: Here (contextual), Notes, Carrying, Travel, Records, Workshop (contextual), Map. It
is 96px and two rows on a 390px phone, and `reachable.spec.ts` already has a guard refusing a third
row — which is a test written because the bar is one button away from being a wall.

**Notes** and **Carrying** are show/hide switches for two things that should mostly just be there in
a smaller form. They exist because the only alternative the current layout offers is the full-bleed
band and the full-width ribbon. Give the dock a small resting height and one of them stops being
needed; give the strip its content width and the other does.

### 7. Muted text by `opacity` drops under the contrast floor · **fixed**

The palette passes; these did not, because they were opacity over it rather than a colour.

| | Effective contrast | |
|---|---|---|
| `.tile-action.is-blocked > button` — `opacity: 0.55` | **3.36:1** | a blocked action's **label** |
| the same, compounded with `.tile-action-detail`'s own `0.82` | **2.61:1** | what the ground holds |
| `.canon-type`, `.canon-distance` — `opacity: .55` | **3.36:1** | |
| `.canon-note` — `opacity: .65` | **4.46:1** | marginal |
| `.dialogue-beat:not(.dialogue-current)` — `0.66` | **4.60:1** | passes; left alone |

**A correction to the first version of this section, which got the target wrong.** It said the
blocked row's *reason* rendered at 3.36:1. It does not: `.tile-action-why` is a **sibling** of the
button, outside anything the button fades, at `--muted` and 5.89:1. What the alpha was dimming was
the label — *what the action is* — and, compounding with the detail line's own 0.82, the line
saying what is actually on the ground, at **2.61:1**. That is worse than the thing this section
originally complained about, and it was found by reading the markup rather than the stylesheet.

**And it was never a conformance failure.** WCAG 1.4.3 exempts an inactive user interface component
from the contrast minimum, and these rows are `disabled`. The argument for fixing it is this
interface's own: `TileActions` says a blocked row is *teaching* rather than inert — *a row reading
"needs a settlement" is how a player learns settlements do anything at all* — and a row cannot teach
what cannot comfortably be read. The exemption is a floor, not the design.

The fix is `--ink-faint` (`#75696f`, **4.87:1**) rather than an alpha, so it cannot multiply with
another one. Disabled stays carried by the `disabled` attribute, the cursor and the reason line —
none of which is a colour — and the decorative `aria-hidden` mark keeps a fade, being the one part
of the row that carries no reading. `test/tileActions.test.tsx` refuses an alpha on any ancestor of
the label, the detail or the reason.

The dialogue's already-said beats stay at 0.66. They measure 4.60:1, the dimming is doing real work
separating what is being said now from what was said a moment ago, and this repository's own rule is
to measure the signal before tuning a threshold.

### 8. One 2,286-line stylesheet with an ad-hoc z scale

`z-index` values in use: 2, 3, 4, 5, 35, 40, 60, 100 — no scale, and one comment in the file works
out a stacking conflict by reasoning about the numbers.

**It has now broken something, and the first new panel is what did it.** The opened plate card was
written as `.specimen` — a name already taken five hundred lines further down by the field kit's
comparison chips. Both declarations were valid, the later one won, and the card rendered as a
transparent 999-pixel lozenge with the album showing straight through its text; in the other
direction it was giving each of those chips `width: min(24rem, 100%)` and `overflow: hidden`.
Nothing failed. It was found by taking a screenshot.

One flat namespace, no way to say a name is spoken for, and a sheet long enough that nobody reads
the other end of it before picking a class name. Stage 6 is where this gets a scale and a split.

## The shape proposed

Four moves. They are independent enough to land in stages and they compose into one idea: **the
screen has one panel slot and a small always-on rail, not three regions competing for the bottom
half.**

### A. One dock, three heights

The field notes, the place, and (later) a conversation are never wanted at once. They become one
bottom dock that holds whichever is current, at one of three heights:

| Height | What shows | When |
|---|---|---|
| **peek** ~16dvh | the title line, the surroundings sentence, the action rail | the resting state of the walk |
| **read** 38dvh | today's field notes, or the place with its prose | opened, or on arriving somewhere |
| **full** 80dvh | the place with everything in it, a conversation | reading properly |

Peek is the new resting state, and it is the one number that decides whether this plan is worth
doing: it takes the resting chrome from 48% to about 26%, and it does it without removing anything —
the title, where you are, and every verb available on this tile are all still on screen.

`surface.ts` gains a `dockHeight` field and the actions to move it. It stays pure and stays tested
under Node; this is the same arbitration it already does, with a size on it.

**What this must not break:** the `initialSurface` ruling that the notes are the resting state
rather than an extra. Peek honours it — the notes are still there, at their heading, on every step.
Closing them entirely stays available and stays a `toggle`.

### B. The action rail is pinned, never scrolled

The currently *possible* actions move out of the scrolling notes and onto a rail in the dock's peek
row — always visible, at any dock height, at 44px. There are one to three of them on any tile.

The **blocked** rows keep their ruling and stay in the dock's read height, greyed, with their
reasons, exactly as now. Nothing is hidden: what moves is the subset a player can act on right now,
to somewhere it cannot be scrolled away from. The hotkeys keep deriving from the same `tileActions`
array, so the second copy this codebase has paid for before still cannot happen.

### B′. What a tile says it has, and how you act on it

Moves A and B say *where* the tile's information goes. This says what it looks like when it gets
there, because the current arrangement splits one fact across three places and the split is not
in the data.

**Today.** The flora and the fauna are two `<dl>` notes in a two-column grid — a name, a painted
plate or an emoji, and canon's prose. What the ground *offers* is nowhere near them: it is a
sentence inside the `detail` of a button. "Two bundles of reed fibre, and salt-crust on ground
already worked." That sentence is the only readout of a tile's resources in the game, it is
written as prose, and it is the subtitle of a verb.

**And the data does not agree with that split.** `yieldsAt` builds a tile's offering from exactly
three sources: the plant standing here, the animal standing here, and what the ground is made of.
Every material traces to one of them through canon's `won_from`. The reed fibre *is* the reed. The
notes name the reed in one column and a button describes its fibre in another, and nothing on
screen says they are the same thing.

**The proposal: one row of chips, and a chip is a button.**

The peek row holds `[where you are] · [what is here] · [what else you can do]`. The middle is a row
of chips, one per thing the tile holds:

| Chip | Reads | Does |
|---|---|---|
| a material | the gesture's mark, the name, `×2` | starts that gathering — `gestureFor` already says whether it is a stoop, a stalk or a work |
| the plant | its `SpeciesIcon`, its name | opens the read height at its note |
| the creature | its plate thumbnail or mark, its name | the same |

Three things follow from that, and each is the reason to do it rather than a consequence to
manage.

**The count is a number again.** `×2` scans; "two bundles of reed fibre" does not, and a player
reads this on every step. Depletion rides on the chip's own form rather than on a clause —
`conditionOf` already returns exactly three states, `untouched`, `picked-over` and `bare`, so they
become a full, half and hollow mark. Semantic state in shape as well as in words, which is what
lets a player see a worked district at a glance instead of reading four subtitles.

**The verb and its subject stop being separated.** Today the button says *Stoop* and its subtitle
says what for. A chip that is the material *and* the action says both in one object, and it is the
action a player takes on most steps of the game. The rail beside it then carries only the verbs
that are not about a particular thing — rest, ride, the workshop — which is three or four buttons
rather than one button and a sentence.

**A bare node keeps its chip.** Hollow, unpressable, with the reason in the read height. That is
`TileActions`' ruling held to exactly: *a disabled row reading "needs a settlement" is how a player
learns settlements do anything at all.* It is also the only place the game ever teaches that a
worked reed bed comes back and a flint nodule does not.

**The prose does not move into a chip.** Canon's writing about a species is the field notes' whole
point and it belongs at read height, with the painted plate given more room than the `<dd>` of a
two-column grid currently allows. The division is: **the chip is the index entry, the note is the
entry.** Peek says *there is a reed here, two bundles of it, and you may take them*; read says what
a reed is.

**The plate is a way in, and that part has shipped.** The twenty painted plates were drawn at 2.4em
in the album and 7.5em in the field notes, out of files that are 384 square — so nine tenths of
every painting was discarded at the one moment a player had gone looking for it. Pressing one now
opens it at full size with canon's prose underneath, in a card built on the activity card's shape.
See `src/ui/Specimen.tsx`. The same argument applies to the chips above: a thumbnail is an index
entry, and there should be somewhere for the entry itself to be.

**What this must not break.** `gatheredLine` and `standingLine` stay — they are the prose the
diary and the travel log keep, and this changes only what the dock draws. The blocked-action ruling
is honoured above rather than traded away. And the chip row is bounded by the data: a tile offers
what one plant, one animal and one ground between them yield, which is one to three materials in
the shipped bundle, so this is a row and not a wall.

**Where it leads.** The chip is the entrance to the activity card, and the card is the thing the
art is for. One tap on a thing you can see gets a painting of hands doing it — which is the loop
worth making short, and the reason this sits in stage 4 rather than waiting for the rest.

### C. A conversation is a mode, not a list item

`PlacePanel`'s "Who is here" becomes a row of portraits with names — a list of who, not three
running exchanges. Choosing one opens the conversation in the dock at **full** height: the portrait
at a size worth looking at, the beats beside it, one control to go on, and a way back to the place.

This is what the genre does and it is what makes the user's "conversations should be easily doable"
true. It also costs nothing in rules: `linesFor`, `meeting`, `beats`, `offerIn` and `moreAfter` are
already pure and already tested; what changes is which of them is mounted at a time.

**What this must not break:** `test/conversationFlow.test.ts` and `e2e/talking.spec.ts` reach
`.person` and `.dialogue-beat` directly. Both stay, and gain one step — choose the person first.
The `keepOnLeave` ruling (walking out mid-exchange still counts as having been told) is unchanged
and matters more here, not less, because leaving is now a navigation rather than a footstep.

### D. The bar comes down to four plus context

| Now | Proposed |
|---|---|
| Here *(contextual)* | **Here** *(contextual — opens the place in the dock)* |
| Notes | *gone — the dock's peek row is the notes, and it is always there* |
| Carrying | *gone — the strip takes its content width and stops being something to hide* |
| Travel | **Travel** |
| Records | **Records** |
| Workshop *(contextual)* | **Workshop** *(contextual)* |
| Map ☰ | **Map ☰** |
| zoom ± | zoom ± |

Four permanent buttons and two contextual ones: one row at 360px with labels intact, against two
rows now. The satchel strip sizes to its content (`width: max-content`, capped) rather than
stretching 1204px across a desktop for six items — which also stops it swallowing the top-left of
the map as a click target.

**What this must not break:** the satchel readout stays permanently on screen. That is a design
ruling with a documented reason (every other decision is read against what you carry) and this plan
shrinks it rather than hiding it behind anything.

## Stages

Each stage is independently mergeable and each names the test that proves it. They go on **one
branch** — the repo's rule, and doubly right here because the browser suite is slow and these all
touch the same files.

### Stage 1 — the modal primitive · **shipped**

One `<Modal>` in `src/ui/Modal.tsx`: veil, `role="dialog"`, `aria-modal`, Escape, focus in on open,
**focus trap**, **focus restored to the invoking control on close**, and `inert` on the stage behind
it. Diary, Collection, People, Ending, Activity, FieldKit, Satchel, Workshop, Overworld and the
Controls sheet adopt it; each keeps its own content and its own close button.

For the activity card this is the only change it gets in the whole plan, and it is a change to the
veil rather than to the card: the painting, the 4:3 box, the width and the centring are untouched.
What it gains is the trap and the restore, which matter *more* there than anywhere else — the modal
owns Space and the run, and a stray Tab currently puts the keyboard on the control bar behind it
while a gathering is live.

Do this first. It is the largest accessibility gain in the plan, it is invisible to a playtester, and
every later stage adds panels that would otherwise be a seventh and eighth copy of the same twenty
lines.

*Proved by:* a new `test/modal.test.tsx` (jsdom) asserting trap, restore and Escape on the
primitive, plus a new `e2e/keyboard.spec.ts` that opens each panel, tabs twelve times and requires
every stop to be inside the dialog. That spec is the one that would have caught all of this.

*Not in scope:* the native `<dialog>` element. It brings the trap and the inert backdrop for free
and is worth a look — but it also brings its own top-layer stacking, and a stylesheet with eight
ad-hoc z-indices is not the place to find that out in the same stage as ten panel migrations.
Revisit after stage 5.

### Stage 2 — the contrast fixes · **shipped**

`--ink-faint` replaces the `opacity` mutings above. A blocked row keeps its mark faded and its words
legible; the reason was never the one at risk, which is the correction recorded in fault 7.

*Proved by:* extending `test/tileActions.test.tsx` to assert the reason is not inside an
opacity-dimmed element, and a note in `docs/testing.md`. Cheap, and it closes the one place where
the code's own stated reasoning and the stylesheet disagree.

### Stage 3 — the dock · **shipped**

`surface.ts` gains `dockHeight: 'peek' | 'read' | 'full'` with actions to set it; `Here` becomes the
dock; `.journal` and `.place-veil` stop dividing the bottom of the screen and take turns in one slot.
Arriving somewhere puts the place in the dock at `read`; the notes go back to `peek` on leaving.
Drag-to-resize on touch, and the dock's header is the click target on a mouse.

*Proved by:* `test/surface.test.ts` extended for the new field — it is pure, so the arbitration is
provable without a browser, which is the whole reason that file exists. Plus the new budget spec
below.

*A new guard, in the repo's own habit of measuring the signal before tuning it.*
`e2e/chrome-budget.spec.ts` is that measurement as a check. Built, measured, and the numbers are
what they are rather than what the plan hoped:

| Map visible | Before | After | Guard |
|---|---|---|---|
| resting, desktop | 51.7% | **61.5%** | > 57% |
| resting, phone portrait | 52.1% | **59.6%** | > 55% |
| resting, small phone | 51.8% | **59.3%** | > 55% |
| resting, phone landscape | 37.3% | **53.2%** | > 48% |
| in a place, desktop | 27.0% | **36.0%** | > 31% |
| in a place, phone portrait | 18.9% | **35.2%** | > 30% |
| in a place, phone landscape | 17.1% | **14.7%** | — |
| the place's own writing shown, desktop | 73% | **65%** | — |
| the place's own writing shown, landscape | 29% | **25%** | > 21% |

**Three of those need saying plainly, and none of them is what the plan predicted.**

*The 70% was not reached.* Resting lands at 59–62% outside landscape. Most of the gap is the
control bar — two rows and a strip, 148 pixels of a phone — which is stage 6's. The rest is the
blocked action rows, below.

*Reading a place shows less of it than before, at reading height.* 65% against 73% on a desktop.
The dock pays for the handle and the rail — 117 pixels — before it pays for any writing, and the
old arrangement paid for neither because it had neither. **The answer is the third press**: the
handle now goes peek → read → full, and full is the whole page. That third step was not in the
plan; it was added because the measurement showed reading height alone was a step back, and a
height nothing could reach would have been this codebase's signature bug for the fourth time.

*Landscape-in-a-place went the wrong way.* 14.7% against 17.1%, on the one screen where every trade
bites at once. It is the honest cost of the rest of the stage and it is recorded rather than
massaged.

Numbers in a document go stale; these are a check now, so the next arrangement that quietly eats
the map fails rather than being noticed a year later. It belongs with `reachable.spec.ts` — both
are about arrangement rather than content, and both exist because a layout can look right in a
screenshot and be unusable in the hand.

**Four things this stage learned by looking, none of which a test would have said.**

*The rail had to come with the dock.* Folding the notes and the place into one slot hides every
verb the moment you stand somewhere — no taking a reed until you press Leave — so the actions moved
into the dock itself, below whichever occupant is showing. That is move B, a stage early, because
this stage does not work without it.

*Splitting the rail was tried and reverted.* Available verbs as chips in the dock, blocked rows with
their reasons in the part that scrolls: it reads well and it **hid the blocked rows at peek**, which
is not a detail of `TileActions`' ruling but the ruling itself — *every action is listed at all
times, because a greyed row reading "there is daylight left" is how a player learns resting exists*.
Every action is a chip at every height now, and what the height decides is whether the **reason**
is on screen, because a reason is a sentence and needs the room to be one. It costs about three
points of resting map and it is the correct three points to spend.

*The dock needed a ceiling.* At its most generous reading height on a landscape phone it reached up
under the control bar, which sits a layer above it, and **the grip ended up behind the satchel
strip** — unpressable, reported by the browser a hundred and fifty times as "waiting for element to
be visible, enabled and stable". `--dock-ceiling` keeps it clear by construction. Found in a
screenshot.

*And peek was hiding the wrong half of the footer.* The first cut hid all of it, which took the
dusk and fatigue lines with it — the two things in that panel that are about *walking* rather than
reading, and a player at peek is walking. The light going and legs giving out stay; the landmark
bearing and the tally of places wait for reading height. The browser suite caught that one, which
is the half of the split that had a test already.

*The last correction is the one that reverses this plan's own words.* Peek was written as "sized to
what it holds", on the reasoning that a tile with three things to do needs more room than a tile
with one. It does — and `hours.spec.ts` failed, measuring the panel at 137 pixels in one hour and
114 in another. The line saying what a creature is *doing* is the only text here that changes while
the player stands still, so a content-sized dock breathes as the day turns, React reports new
insets, and the camera refits: **the map moves under somebody who has not touched anything.** That
guard predates this plan and is right. Every height is fixed now and the body scrolls when the
content is taller. The cost is a little blank parchment under a quiet tile, which is the correct
thing to pay for a map that holds still.

### Stage 4 — the action rail · **shipped with stage 3**, the chips still to come

`TileActions` splits: the verbs that are not about a particular thing go to the rail in the dock's
peek row, blocked rows to the read height, both from the same array. Hotkeys unchanged. The
materials become chips per B′ above — mark, name, count, condition — and a chip starts its own
gathering.

*Proved by:* `test/tileActions.test.tsx` for the split, `e2e/gathering.spec.ts` and
`e2e/making.spec.ts` for the paths — both already drive these buttons and will need their selectors
moved, which is the useful kind of test churn.

### Stage 5 — conversation as a mode

`PlacePanel` lists people; a `Conversation` view owns the dock at full height. One person talking at
a time.

*Proved by:* `test/conversationFlow.test.tsx` (new, jsdom — the repo's own finding is that *every*
fault in the interface work was found by rendering a component), `e2e/talking.spec.ts` extended by
one step, and a case at `poi_lothal_camp` asserting exactly one `Dialogue` is mounted with three
people present.

### Stage 6 — the bar, and the stylesheet

Notes and Carrying leave the bar; the strip sizes to its content. `styles.css` gets `@layer` with a
named z scale (`--z-map: 1`, `--z-chrome: 10`, `--z-dock: 20`, `--z-modal: 40`, `--z-veil: 50`), and
splits along the regions it already comments as sections.

*Proved by:* `e2e/reachable.spec.ts`, unchanged, which should now find one row where it tolerates
two.

## What is declined, and why

**A radial or context menu on the map.** It is the tidiest possible answer to "where do the actions
go" and it is wrong for this game for the reason `TileActions` already gives: this is a clicker, not
an action game, and a mechanic that can only be found by pressing on the right thing does not exist
for the player who has not pressed it. The rail is always visible because that is the genre's rule.

**Hiding the satchel readout behind a button.** Ruled on already, with a reason that has not
changed.

**Shrinking, docking, or economising on the activity card.** It is centred, it stops the world, it
is `min(30rem, 100%)` with a 4:3 painting at the top of it, and **all of that stays**. This is the
one moment the game asks the player to look at a drawing rather than read a panel, and the drawings
are the reason to look. A "minimal UI" argument that reaches this card has gone wrong somewhere:
minimal means the resting state of the walk is the map, not that the game never fills the screen
with something worth filling it with. Three consequences follow, and they are commitments rather
than observations:

- **The dock never contains it.** Stages 3 and 5 give the dock the notes, the place and a
  conversation. An activity is not one of those — it is an interrupt with a picture, it already sits
  outside `Surface` in `surface.ts` for exactly that reason, and it stays there.
- **The art intake is untouched.** `scenes.ts` globs the folder and keys on the gesture id;
  `plates.ts` and `portraits.ts` do the same. Stage 1 swaps what draws the veil around the card and
  must not touch what draws the card. A new painting stays a file drop, and an unpainted gesture
  stays legal — `.activity-scene-blank` keeps the box so nothing jumps when art lands.
- **More actions is a reason for stage 4, not an argument against it.** The set today is four
  gestures — `stoop`, `stalk`, `work`, `rest` — with five paintings between them once `rest`'s two
  shelters are counted. As that set grows, so does the list of rows `TileActions` renders, and today
  those rows are inside a scrolling panel of prose capped at 38dvh. A rail that is always visible is
  what keeps the eighth action as findable as the first; the scrolling section is what makes the
  fifth one disappear. The plan gets *more* valuable as the drawings arrive, not less.

**A component library, a CSS framework, or a state manager.** Dependencies must justify themselves
and the runtime is React and Phaser. A focus trap is about forty lines; a headless UI library to get
it is a bad trade at this size.

**A dark theme.** The stylesheet's opening note explains why, and the reason is not laziness: the
painted species plates are opaque cream watercolour and would sit as bright rectangles in a dark
panel, which no CSS fixes from the outside. Unchanged by anything here.

**Retiring the landmark loop or the arrival page.** Declined three times for design reasons; this
plan is about arrangement and has no opinion on it. The arrival page keeps its own veil and adopts
the modal primitive in stage 1 like everything else.

**Touching `journey.ts`, `world/` or `content/`.** Nothing in this plan needs a rule changed. If a
stage finds it does, that is the signal to stop and add a tested function there rather than compute
it in a component — the one live rule from `docs/ui-handoff.md`, and the one this codebase has been
bitten by three times.

## What this plan is betting

That the game's problem is not its writing, its art, its rules or its accessibility floor — all of
which are in good shape — but that **a player standing in the most interesting place in the game can
see 17% of it through a window showing 29% of what it has to say.** Every stage above is in service
of those two numbers, and stage 3 carries almost all of it.
