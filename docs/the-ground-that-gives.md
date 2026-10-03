# The ground that gives

What a tile offers, what is left of it, and where the numbers live.

Written after the sprint that built it, as a map to five modules that have no other doc. The code
carries the reasoning; this says which file to open and why the layer is shaped as it is.

---

## The finding it exists to fix

Every tile used to answer **two questions that never consulted each other**.

`content/species.ts` picked the one creature and the one plant standing here. `content/gathering.ts`
picked materials from a list of everything the *biome* could hold. So the reeds a player read about
in the field notes and the reeds they cut were decided separately, and a tile could offer boar tusk
with no boar in sight.

Canon had already said where everything comes from. `material.won_from` names the species — rice
from the rice plant — the exporter shipped it, `making.ts` parsed it into `Material.wonFrom`, and
**nothing read it**. Measured at the time: 46 of 61 materials carried the field, 25 of them
disagreed with their own sources about which biomes they were in, and the sharpest case was
`material_ammonite_shell`, gathered on a `coast` while both its ammonites live in `lava_field` and
`mountains` — no biome in common at all.

That is fixed in canon (`lint_story.py` refuses it now) and in the game (`gathering.ts` asks the
tile). What follows is the layer that grew out of it.

---

## Five modules

| File | Answers |
|---|---|
| `material.won_from` (game data) | which species a material comes from |
| `material.regrows` (game data) | how soon a worked place gives it again: `quick`, `steady` or `slow`, sorted by use |
| `content/gathering.ts` | what a tile *offers*, from what is standing on it |
| `content/nodes.ts` | what is *left* of it, and how worked it looks |
| `content/tiers.ts` | every number the layer is tuned by |

### `gathering.ts` — what grows here

Inverts `won_from` at load into species → materials, then asks the plant and the creature the tile
actually holds. **The reeds you cut are the reeds you were looking at.**

Determinism is unchanged: `creatureFor` and `floraFor` are keyed by tile and seed, so a tile
answers the same way however the player reaches it.

**Fifteen materials come from the ground rather than from anything alive** — flint, clay, basalt,
sandstone, the ores, the glasses — because canon's schema says `won_from` may be absent: *"canon
knows salt-crust is salt without owing anyone an account of which pan it was scraped from."* Those
come from the biome. Missing that on the first attempt made stone ungatherable everywhere and
failed two of Uma's commission tests, which is how it was found — reading the code would not have.

### `nodes.ts` — what is left

The first state in the game that records an **absence**. Everything else a save holds is something
a player gained; this is what a place no longer has, and it is the one thing about a tile that
cannot be recomputed from the seed.

Kept as small as an exception can be: only tiles somebody drew from are stored, keyed per material
rather than per tile — stripping the reeds should not strip the clay under them — and a node grown
back to full is deleted rather than kept.

**Every material comes back, stone included** (2 October 2026, `docs/a-lighter-game.md`). Stone
used to be canon's `never`: an emptied node stayed empty and working the ground *revealed* more
nearby instead. Both went when the tiers stopped being chosen by lore — stone now sorts by use like
everything else, and `revealedNear` is gone.

### `tiers.ts` — the numbers

**The file to edit when the walk feels wrong.** Regrowth in days, stock by rarity, the odds of a
good cut — all in one place, because they were spread across two modules and tuning meant finding
three tables and hoping there was not a fourth.

**Regrowth is three tiers, sorted by use** (`REGROW_DAYS`: quick 3 days, steady 7, slow 14). A
material three or more recipes or building stages ask for is quick, one or two steady, none slow;
`content/regrowth.ts` counts and `test/regrowth.test.ts` fails if a stored tier drifts from the rule.
A material moved by hand goes in `REGROWTH_EXCEPTIONS` with its reason. None of it is a fact about
the world, and since 2 October 2026 none of it is canon's at all.

---

## Two design rulings, not numbers to tune past

**Gathering never gives nothing.** The brief asked for "a chance of actually collecting, like a
clicker game", and this is the chance of collecting *more* — never the chance of collecting
nothing. Cozy games vary how much rather than whether, and a hidden die teaches a player nothing
they can practise. Stardew's fishing does fail, but on your *input*, which is a skill surface this
game does not have: the only timed loops in the codebase are the typewriter and the app clock.

It also matters that gathering is the sole way a material enters a satchel. A failure roll would
put a die in front of every recipe and stack multiplicatively with depletion.

`test/nodes.test.ts` fails **by name** if a material ever gives nothing on an untouched node, so
this cannot be reversed quietly by somebody who thinks a die would be more exciting.

**The variance is visible before you commit.** A picked-over stand reads as picked over. That is
what makes a visible variance honest where a hidden one would not be — the player decides whether
to stoop by *looking*.

---

## What canon may and may not say

The split that settles every question here:

| Question | Whose | Why |
|---|---|---|
| What does this species yield? | canon | A fact about the world |
| Do material and species agree on biome? | canon lint | A contradiction in canon, caught in seconds |
| Whether it comes back at all | canon | A fact about the stuff |
| How many days that takes | game | Pacing, and a day is a unit of play |
| How much is on this node? | game | Quantity is about one player |
| Did *this* player take it? | save | Never canon |

Canon **cannot** count stock and does not try: `found_in` says which biomes hold a material and
nothing says how much, because stock depends on a seed canon has never seen.

## Waiting is never running out

A patient walker can reach any quantity of anything, because every material comes back at its
tier's pace. That used to be a bargain with canon's `check_playability.py`, which decided a recipe
was reachable without counting; making moved to the game and the bargain with it, so the game's own
`test/criticalPath.test.ts` and `test/reach.test.ts` hold it now.

## What acting on it costs the player

**One press. There is no clock anywhere in this layer**, and that is a ruling rather than a state
of the code.

For a while there was one. Taking a material opened a card and ran a three-beat timing track at
1,500 ms a beat — four and a half seconds per material, per craft, per night. The floor held
throughout, so it could only ever *add*: a player who ignored it got what the click had always
given and a player who played it got one more. Which means the optimal play was to spend four and a
half seconds on a reed, forty-odd times, to cross Lothal.

It also contradicted this document. `nodes.ts` says, where it explains why gathering never fails,
that a skill surface is something "this game does not have and would have to build on purpose" —
and then one was built, in front of the mechanic that sentence was defending.

**What replaced it reads off decisions the player had already made**, which is the half of the good
cut that was always missing. A stoop with something that `cut`s goes cleanly; one with tired hands
does not. A stalk while the animal is feeding goes cleanly; one while it is hunting does not. Both,
one, or neither — `clean`, `fair`, `clumsy`, and `clumsy` is exactly what the plain click gave.

So the two rulings at the top of this document are now three, and the third is the one that keeps
the other two honest:

> **Preparation is the skill, never reflexes.** Anything that grades a player on their hands rather
> than on what they chose to carry and when they chose to come is the wrong instrument for this
> game — and it is also the change most likely to undo *"gathering never gives nothing"* by
> accident, because an unready traveller reads so naturally as an empty hand.
