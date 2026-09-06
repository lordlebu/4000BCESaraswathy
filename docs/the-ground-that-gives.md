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
| canon `material.won_from` | which species a material comes from |
| canon `material.renews` | whether a place gives it again — an **ordering**, never a duration |
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

**Stone does not regrow; it is found.** `renews: never` is literally true and no emptied node ever
refills. What working the ground does instead is *reveal* more of it nearby: a quarry face exposes
fresh rock behind the block taken. Measured, a district that started with 91 stone nodes gave up
635 stone over five days and still offered 60.

`revealedNear` is on the walk's hot path and is indexed for it. It was quadratic first, and a
**test timing out** is what found that.

### `tiers.ts` — the numbers

**The file to edit when the walk feels wrong.** Regrowth in days, stock by rarity, the odds of a
good cut, the discovery constants — all in one place, because they were spread across two modules
and tuning meant finding three tables and hoping there was not a fourth.

None of it is a fact about the world and none needs a canon edit. Canon owns the *ordering*
(`renewal_rates.json` says so in its own note); this owns what the ordering means in days.

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

## The bargain with `check_playability.py`

That script decides a recipe is reachable without looking at any `count`, and says in its own
comment that this is sound only because a patient walker can reach any quantity.

Depletion does not break that for anything that renews — **waiting is not running out** — so
`fast`, `seasonal` and `slow` keep the old bargain exactly. Only `never` can strand somebody, and
`nothing_runs_out` in that script reports which never-renewing materials sit in one kind of ground.

The report is only worth having because the game keeps the other half of the promise. If a
`never` node ever regrows, that check silently becomes a list of nothing.
