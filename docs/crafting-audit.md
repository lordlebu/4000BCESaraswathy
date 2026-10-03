# Crafting, audited (3 October 2026)

The owner stood at the loom in the Camp in the Kilns, on Lothal, with reeds for a reed mat. The game
still asked for a loom frame. Crafting had been raised more than once, and each time only the case in
front of us was fixed. This is the audit of the whole system, what was fixed, and what is left.

The illustrated version is the artifact
[Crafting, Audited](https://claude.ai/artifact/2ySSwv2kMqfXg5N7Yfuu6P). It is private, so treat this
file as the authoritative copy.

## Answers to two of the owner's questions

- **The kit was never removed.** `content/kit.ts` holds the bedroll, lamp, diary and staff, as it
  always has; the only thing ever moved out was the dugout, which became Thrali's loan. But the kit
  never gave crafting anything either: a new journey starts with an empty satchel and no tools.
- **"Rungs need only understanding" (game #243) was a different system with the same fault.**
  - That item dropped tool gates from *discovery rungs*, which never worked because no caller
    passed in what the traveller carries.
  - Here, the crafting rule never asked which bench the place has.

## What was wrong (F1–F7)

Measured with the game's own functions, each map built on 6 seeds. A material counts as findable if
it is on 3 or more tiles on at least 5 of the 6.

| | Fault | Size before the fix |
|---|---|---|
| F1 | A kept tool (loom frame, quern, brazier) was asked for at its own bench | 9–10 recipes on every map |
| F2 | The place's board showed a bench and the rule refused it. `stations.worksProcess` gave the right answer, but only a test called it | Aravali 21 recipe/place pairs, Dwarka 8, Narmada 4, Lothal 2 |
| F2b | Weaving at a loom still wanted "something that can work". A bench was never counted as the tool it is | every map |
| F3 | Recipes known from the start that the map's ground cannot supply | Aravali 24 of 70, Dwarka 29 of 74, Lothal 17 of 78, Narmada 17 of 80 |
| F4 | A new traveller with plenty of the map's raw was blocked on most known recipes by a tool. The workshop listed every tool that would do, whatever was carried | 62–71 blocked by a tool everywhere |
| F5 | Empty first satchel: few recipes need no tool | 6–8 makeable at once |
| F6 | The workshop greys out impossible recipes exactly like recipes that are one walk away | — |
| F7 | `criticalPath.test.ts` checks only taught recipes, starts from plenty, and never compares the board to the rule | — |

**Why F3 happens.**
- **No storage jar on the Aravali or Dwarka.** Grog is ground only from a storage jar, and only Bekh
  (Lothal) and Okhi (Narmada) teach the jar. Without grog there is no cooking pot, and without the
  pot there is no pitch, torch, water skin, oil, curd, venom, kuchla or mahua.
- **No salt anywhere on the Narmada.** That blocks 5 dishes.
- **Six materials are on 0–7 tiles of any map:** dates, myrrh, sandalwood, milk, shed snakeskin and
  boar tusk.

## What shipped

**Benches count** (`stations.ts`, `crafting.ts`):
- `benchAt(poi)` is the one way a `Bench` is built from a place.
- **A bench stands in for its carried form.** `stands_in_for` on the loom frame, grinding quern and
  charcoal brazier lets the bench there satisfy the tool (`benchStandsIn`).
- **A bench supplies what its own processes need** (`Station.supplies`, `benchSupplies`):
  - loom and quern: `work`
  - kiln: `burn`
  - tannery and apothecary: `contain`
  - **The hearth supplies nothing**, so a cook fire is still free only at a settlement or road stop
    (the owner's ruling of 2 October).
  - **The bench and the slip supply nothing**, so making the first knife stays a step.
- **`placeAllows` opens a process wherever the board lists its bench** (`benchOpens`). This is
  additive only, as the stations header always promised.

**The workshop names the tool to make** (`content/toolStep.ts`):
- For each missing affordance it picks the tool this satchel can make here and now, if there is one.
- When that tool needs a tool of its own, it names that one too, one level down.
- The reason row carries a **Make** or **Pin** button.

**`plan` never says "not blocked" with nothing to do.** At the wrong place it returned
`blocked: null` with no steps. The existing callers happened to guard against that; `toolStep` did
not, and claimed a bronze knife could be made "here and now" from an empty satchel.

**After:** what a new traveller can make at once somewhere on the map:

| Map | Before | After |
|---|---|---|
| Aravali | 7 | 17 |
| Dwarka | 7 | 16 |
| Lothal | 8 | 20 |
| Narmada | 6 | 20 |

Recipes blocked by a tool at every bench fell from 62–71 to 43–48. The workshop now points the way
out of every one of those.

**Tests.** Each was proved to bite by switching its mechanism off:
- `test/benches.test.ts`: the board and the rule agree; there is one answer, not two; no kept tool
  is asked for at its own bench; a kiln is a fire for firing but not for a stew.
- `test/toolStep.test.ts`: the tool choice, plus **a player-path walk**. On every map, a new
  traveller presses only the reason row's Make button and must come to cut, contain, work and cook.
  It is a ratchet (`STILL_OUT_OF_REACH`), and it is empty today.

## Phases 3 to 5, closed (3 October 2026, the owner's rulings: "I will go with your suggestions")

**Phase 3, "Not on this ground"** (`content/suppliable.ts`). `groundOf(world)` lists the materials
found on three tiles or more, walking the map once per world and only when the workshop opens.
`outOfReach` runs criticalPath's closure from plenty of that ground plus the satchel, at every bench
on the map. The workshop puts what is left under a collapsed heading, saying what nothing on the map
gives, still pinnable.
- **Labelled, never hidden** (ruling).
- Carrying the missing thing in from another map moves the recipe back up.
- A recipe short only of a tool is never set apart, because the tool step answers that.

**Phase 4, data:**
- **No starter tool** (ruling). The tool step replaces it.
- **The storage jar** is taught by Ila on the Aravali and Ushi on Dwarka (canon 3.4.0), so both maps
  can fire a cooking pot.
- **Salt on the Narmada** is **rock salt from bare mountain**, not salt crust on the dry flats. A
  material from the ground lies on every tile of its biome on every map, and salt on plains would
  have salted the whole game.
- **Milk on the Narmada** is **goat milk from the Vindhya cliff-goat**, game data only. The herders'
  plateau did not need a canon change.
- **Dates and myrrh on Dwarka** came from Dwarka becoming the cold desert canon says it is.
  - The classifier made desert only where it was hot. A palette that names desert now asks only that
    the ground be dry (`desertNeedsHeat`).
  - Dwarka now has 147–299 desert tiles, up from 11–48. `SAVE_VERSION` went to 19, and the diary
    survives the change.
  - Myrrh gum and indigo became common materials. Indigo had dropped below the findable line as
    desert took some of Dwarka's plains.
- **The comb, the boar spear and the serpent mantle are taught**, by Ila, Anu and Tolla.
  - Their materials are scarce where they are taught, not absent.
  - Making the materials common was measured and did not make them findable.
  - `criticalPath.test.ts` lists the three as rulings, not regressions.

**Phase 5, the ratchet** (`test/suppliable.test.ts`). It covers every known recipe on every map, not
only taught ones, measured the audit's way: six seeds, findable on five.

| Map | Never suppliable at the audit | Now |
|---|---|---|
| Aravali | 24 | 14 |
| Dwarka | 29 | 12 |
| Lothal | 17 | 12 |
| Narmada | 17 | 13 |

What is left is mostly one map's things wanted on another, which "Not on this ground" tells the
player to carry in: guggul and shilajit (Narmada), taro and dried fish (Lothal), dates and myrrh
(Dwarka). (The Narmada's 13 counts tag and part shortfalls that the first closure script did not, so
it is not comparable to that script's 9.)

## Closed (3 October 2026): the three scarce recipes, and what is left open

Game #247 and #248 and canon #161 are merged, and CI is green on `main`.

**Why the comb, the boar spear and the serpent mantle stay scarce.** A material reaches a tile in
two steps:
1. **Its source has to be standing there.** Boar tusk comes only from a tile where a boar is
   placed, sandalwood from a sandalwood tree, and shed snakeskin from the Vasuki. Placement is
   canon's: the species' rarity and biomes.
2. **The material then rolls its own chance** (`CHANCE` in `content/gathering.ts`): 34% for a common
   material and 8% for a rare one.

The audit raised step 2, making boar tusk and sandalwood common. That multiplied almost nothing by
four: sandalwood was on 0–1 tiles of a whole Aravali map, and boar tusk on 0–2. `criticalPath`
asks for three tiles on ten of twelve seeds, and it still failed, so the rarity went back.
Snakeskin was already common; its scarcity is the Vasuki's own. **The real lever is step 1**:
make the species commoner, or give it more biomes. That is a canon edit to what lives where, and
it was left alone.

**None of the three is tied to a quest.** Nothing in canon or the game asks for the recipes, their
items or their materials: no field question, story beat, event, homestead stage or other recipe.
Their only references are the recipe and the teaching line. What the items do in play:

| Item | Taught by | What it does |
|---|---|---|
| Boar spear | Anu, the Aravali | Affords `cut` and `deter`: a cutting tool, as a flint knife is |
| Serpent mantle | Tolla, the Narmada | Affords `shelter`: upgrades the night and is never spent (`using.ts`) |
| Sandalwood comb | Ila, the Aravali | Affords `trade` only. See below |

So their scarcity costs a player nothing they need. They are optional, specialist work, as the
owner ruled.

**Open: five items afford only `trade`, and nothing reads `trade`.** The shell bead, ammonite
pendant, sandalwood comb, seed ball and clay seal (the seal also affords `mark`) can be made, and
then nothing in the game uses them. No recipe takes them, no system reads the affordance, and no
homestead, event or person asks for them. (The camps' `'trade'` in `campLife.ts` is something a
runner does, not an item's affordance.) This predates the audit and is a design question, not a
fault: what trade means in a game with no money. Recorded here so the next look at making starts
from it.

**Open: the bench's blade.** The bench's board description says "a seat and a blade", but on
purpose the bench supplies no `cut`, so making a first knife stays a step. Reword the description,
or let the bench cut. The owner's call.

**Open, outside crafting: the map-crossing walk's time on CI.** On hosted runners
`e2e/playthrough.spec.ts` took between about three and eleven minutes on identical code. Its budget
is fifteen and the shard cap is 40 (`docs/testing.md`), but the cause of the swing is not known.

The audit scripts imported the game's own rules (`canMake`, `shortfalls`, `stationsAt`, `yieldsAt`,
`plan`). Their logic is folded into the test files above, so nothing depends on the scratchpad.
