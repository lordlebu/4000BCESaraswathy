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

## What is left, with the owner's rulings (3 October: "I will go with your suggestions")

1. **Phase 3, "not on this ground."** Recipes whose materials this map's ground cannot supply go
   under a collapsed heading in the workshop, naming what is missing ("no dates grow here").
   - A recipe moves back up when the satchel carries the missing material from another map.
   - **Ruling: label them; do not hide them.**
   - Needs a pure `suppliableOn(mapId)` in `content/`. The reliable-material walk in
     `criticalPath.test.ts` is the shape, but it is too slow to run at render time, so precompute
     per map at build time or cache it per seed.
2. **Phase 4, data, all game-owned in `data/making/` except species placement:**
   - **No starter tool (ruling).** The workshop's tool step replaces it, and the kit stays as it is.
   - **Storage jar on the Aravali and Dwarka:** have someone there teach it, or add a pot-sherd
     material to their ruins that grinds to grog.
   - **Salt on the Narmada (ruling):** salt crust on the plateau's dry flats.
   - **Rare materials (ruling):**
     - Place dates and myrrh on Dwarka and milk on the Narmada, on enough tiles to find. That is
       species placement, which is canon's job.
     - Make the sandalwood, shed-snakeskin and boar-tusk recipes taught by somebody.
3. **Phase 5, tests:**
   - Extend `criticalPath.test.ts`, or add a sibling, to a ratchet over **every known** recipe, not
     only taught ones, starting from today's never-makeable lists above. A new entry fails; one that
     closes fails until it is struck off.
4. **Open question, not ruled on yet.** The bench's board description says "a seat and a blade", but
   the bench supplies no `cut`, on purpose. Either reword it or decide otherwise.

The audit scripts imported the game's own rules (`canMake`, `shortfalls`, `stationsAt`, `yieldsAt`,
`plan`). Their logic is folded into the two test files above, so nothing depends on the scratchpad.
