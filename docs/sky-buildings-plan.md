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
