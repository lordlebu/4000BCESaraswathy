# Buildings on the sky islands

Opened when the islands started looking like country and stopped looking like anywhere. Grass,
rock, water, trees and weather are all *ground*; what the reference has and the map does not is
somebody having **built** there.

Three pieces, in the order they get easier: a bridge, a ruined temple, a turning windmill.

**Held apart from `docs/sky-islands-plan.md` deliberately.** That plan is ground and overlays, and
every item in it reuses a contract the engine already has. Two of the three below need a contract
that does not exist yet, and one needs an animation the codebase has never drawn. Folding them in
would make a plan nobody can finish in a pass.

## What already exists, and what it will not stretch to

The engine has **four** ways to put a thing on a tile, and it is worth being exact about which,
because the temptation is to reach for the nearest one and quietly break its contract.

| Contract | Cell | Anchored | Used by |
|---|---|---|---|
| ground tile | 128 × 128 | fills the cell | `terrain.png` |
| rim | 128 × 128, drawn on a boundary | leans out by a fixed offset | cliffs, treeline, overhang |
| feature | 128 × 128 | centred | `features.png`, `flora.png` |
| **bottom-anchored** | 128 × *taller* | stands on its tile, rises into the one above | places, huts, landmarks, **trees** |

The fourth is the one buildings want, and `trees.png` proved it generalises: a sheet, a height, and
one line in the scene's `anchored` test. **A single building is not new machinery.**

What *is* new is everything below.

## M. A bridge piece · **needs a run, not a stamp**

A bridge is not one sprite. It is a **run** with two ends and a middle that repeats, and the engine
has drawn exactly one of those: `planTrack`, which reads a tile flag and picks a frame from its
neighbours so a line knows which way it goes.

So the honest shape is `planTrack`'s, not a hut's:

- a `bridge?: boolean` flag on `Tile`, stamped where a span is authored;
- a sheet of run pieces — north–south, east–west, and the two ends;
- frames chosen from the neighbours, the way `trackFrame` already does.

**The open question is what it spans**, and it is a design question rather than an art one. Today
there is one gap on the islands worth bridging — the channel `pourAPool` cuts from the pool to the
rim — and it is one tile wide, which is a plank rather than a bridge. A bridge earns its sheet when
there are two pieces of island to join, and that wants either a second pool or an island stamped in
two lobes. **Do not draw the art before that is decided**: a bridge over nothing is the
`lava_field` fault again, where twenty-five drawings existed for ground the map never generated.

## N. A ruined temple · **the easy one, and it should go first**

A bottom-anchored figure on the `places` contract, which already carries seventeen frames at
128 × 160 and already falls back by kind. Nothing new in the engine at all.

It needs a canon entity to stand on — a point of interest in `SouthOfTethys` with `stands`,
`terrain` and `shore`, because the game does not invent places. That is the whole cost: one JSON
file, a re-export, and one frame in `places.png`.

**Faded off-white marble**, and the material is the point. Every built thing on the map so far is
mud brick, thatch, timber and iron; a marble ruin says a different people were here and are not any
more, which is the only thing on the islands that would say so. It also has to survive the palette
rule: near-white on a `#64ad37` island is the highest contrast anywhere on the map, so it wants to
be **warm and dirty** — bone, not paper — or it will read as a hole in the screen the way white
clouds did before they were pulled back to `#e9f0f8`.

## O. A windmill that turns · **the one with a real unknown in it**

Two problems, and only the first is solved.

**The building is easy.** Bottom-anchored, taller than its tile, exactly the tree contract.

**Solarpunk, not steampunk, and that is a change of direction.** The first ask named a steampunk
mill and the first prompt was written for one — riveted iron, rust, exposed gearing. What it should
be is **rounded glazed ceramic with fine pale woodwork on it**: soft bulging forms, carved bracing
and a fretwork balcony, brass only at the hub, plants growing up it.

The reason to keep it is that it gives the two buildings opposite jobs. **The temple is a ruin in
dead marble; the mill is cared for.** One says a people were here and are gone, the other says
somebody is here now — and the islands have nothing else on them that says either. Two derelicts
would say one thing twice.

**Both hit the same palette rule, and it is the one the clouds already failed.** Near-white on a
`#64ad37` island is the highest contrast anywhere on the map. The marble wants to be bone and the
glaze wants to be cream — warm off-white with a blue-grey in the shadows — or each reads as a hole
in the screen the way white clouds did before they were pulled back to `#e9f0f8`. The material
reads from the *form* here, not from the brightness: ceramic is what curves, marble is what has
straight broken edges.

**The blades are not.** Everything that moves on this map moves by `SWAY_PERIOD` — two frames
alternated on one beat, which is a reed leaning and a sheet of water falling and reads as motion
because those things twitch. **Rotation does not work that way.** Two frames of a turning blade is
a strobe; the eye needs four or more to read a direction, and it needs them evenly spaced.

Three ways out, and the choice should be measured rather than argued:

1. **A frame cycle.** Give the sheet six blade positions and drive them from the same clock with a
   longer period and a modulo rather than a halfway test. Cheapest, honest with pixel art, and it
   is what a SNES would have done.
2. **Rotate the sprite.** Phaser will spin a quad for nothing, but a rotated pixel sprite resamples
   on every frame — the exact shimmer `player.ts` scales by a whole number to avoid, and
   `art-direction.md` calls out.
3. **Bake the rotations.** Pre-rotate at build time into N frames and play them as (1). Same result
   as (1) with more machinery; only worth it if the art arrives as one blade rather than six.

**(1) is the recommendation**, and it wants the art drawn as six positions of the same mill rather
than six mills.

The second unknown is where it draws. A windmill is *tall* — taller than the tree, which is already
176 — and the depth model sorts by the row a thing stands on. A sprite three tiles high drawn at
its own row's depth covers whatever is two rows behind it, which is correct for a tower and wrong
if a point of interest is up there. That is measurable before any art exists: stamp a placeholder
at the height being considered and look.

## What the art measured, when it arrived

**The temple wanted more than a tile, and the measurement is why.** Its art is 448 x 731. Forced
into the `places` cell at 128 x 160, the seven shikhara spires merge into one lumpy ridge, the
carved bands on the drum vanish and the plinth courses become a single grey stripe -- you can tell
it is a pale ruin and not that it is a temple. At **256 x 416** every spire is separate, the arches
have depth, the steps read as steps and the fallen blocks are individual objects with lichen on
them.

It cost nothing in the engine. `WorldScene` draws an anchored sprite with `add.image(...)` and
`setOrigin(0.5, 1)` and **never calls `setDisplaySize`**, so a sheet's cell size *is* its on-screen
size: a wider cell is a wider building. What it costs instead is two facts worth knowing -- a
sprite three tiles tall covers three rows above its anchor, and one two tiles wide overhangs half a
tile either side of its column, so two places landing adjacent would overlap.

`tools/build-monuments.js` is the intake, at a cell per building rather than one shared cell, which
is the call `trees` already made when it left the flora sheet.

**A palette lesson that generalises past this sheet.** The first ingest picked its palette by
popularity and wrecked the marble: a temple is mostly one bright cream, so the top twenty-four kept
that and threw the mid-tones away, leaving near-white against near-black -- the exact "hole in the
screen" this document warns the marble must not become. It read as the art's fault and was not.
Median cut splits the colour *volume* instead, so a tone that is rare but far from everything else
keeps a slot. **A popularity palette ruins any subject that is mostly one colour**, which is most
buildings.

### The windmill's tower is right and its blades are not

The tower came back genuinely identical in all six frames -- same vertical extent, same centre --
so the hard half of the instruction landed. The blade cycle did not, and it shows both in the
numbers and on screen:

* frame 6 is **closer to frame 1 than frame 2 is** (6.5% against 8.0% silhouette difference over
  the blade band), which is the signature of turning past the loop point rather than stopping short
  of it;
* the step-to-step differences run **3.8% to 10.4%**, so the positions are not evenly spaced. Frames
  3 and 4 are nearly the same pose.

Played as a six-frame loop that is an uneven rotation with a stutter in it. Dropping a frame does
not fix it, because the remaining five are still unevenly spaced.

**Measuring the angles directly did not work**, and it is worth saying so rather than quoting the
numbers it produced: fitting a four-fold blade axis per frame gave a 31-35% concentration with the
hub estimate jumping between y 240 and y 380, which is not a lock. The silhouette comparison is the
evidence; the angle fit is not.

So the fix is a regeneration of the blades with the angles stated one by one, which
`docs/art-brief.md` Asset 2g now does. The framing does not need to change -- the art's 1:1.90 is
already close to the 1:1.875 cell it is built at.

## Closed, 2026-09-11 — and one thing here was wrong

All three buildings are drawn. See `docs/placing-the-buildings-plan.md` for how.

**The claim below that the only gap on the islands is one tile wide is false.** It was used to argue
the bridge sheet had nothing to span and should stay parked, and it survived two rounds because
nobody counted. There are **9 to 19** one-tile notches per seed on the Aravali with island on both
sides. The planks are laid across them now.

The status table below is kept as it stood rather than corrected in place, because the gap between
what it says and what shipped is the useful part.

## Where this stood before it closed, and the one piece that was missing

**Three buildings have art. None of them is on the map.** Measured by listing every sheet `src/`
loads against every sheet in `assets/`:

| | canon entity | painted sheet | **loaded by the game** |
|---|---|---|---|
| N — temple | `poi_alms_step` | `monuments.png` | **no** |
| O — windmill | none yet | `windmill-tower.png`, `windmill-blades.png` | **no** |
| M — bridge | n/a | `bridge.png` | **no**, correctly — nothing to span |

**It is one missing piece rather than three.** `scenePlan.ts` draws every point of interest with
`sheet: 'places'`, and `places.png` is *generated* by `tools/build-terrain.js`. There is no path by
which a point of interest can draw a **painted** sheet at all. So the temple has canon, has art, is
placed on the near island and has a passing test proving it lands there — and a player sees the
code-drawn placeholder.

That is this repository's oldest fault wearing new clothes. `CLAUDE.md` records it three times under
the rules layer (a rule written, tested, and with no caller, so the mechanic did not exist while
every test passed) and once more under `lava_field`, where a biome had a painted tile, six props,
25 creatures and four points of interest asking to stand on it and generated **zero tiles on every
seed**. A fourth instance already predates this programme: `vehicles.png` is built and never loaded
either.

**So the next piece of work is a painted-sheet path for points of interest**, and it finishes the
temple outright — no new art, no new canon, no decision needed. The windmill then needs only a canon
entity and the blade modulo; the bridge waits for a gap, as the order below already says.

**Do not close this programme until something painted is visible in a browser.** Closing it with
three undrawn sheets would file three fresh instances of the fault the programme exists to avoid.

## The order

**N first** — it needs no new contract, no new animation, and one canon entity. It is the piece
that most changes what the islands say.

**O second**, and start by measuring the depth question with a placeholder rather than with the
finished mill.

**M last, and only once there is something to span.**

## Before believing any of it, render the whole scene

The lesson this programme keeps re-learning. A picture of one sheet over a flat colour is not what
a player sees — the chunked ground looked fine as a texture and turned to mush at tile scale, and a
compositor bug drew a *forest* tile under the islands for an entire review.
