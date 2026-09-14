# Activity boards

What a place can *work*, how it says so, and the icons that carry it.

**Status: designed, not built.** The sleeping ladder in this sprint shipped; this did not. Written
first because it changes `placeAllows`, which is a rule canon co-owns — getting it wrong strands a
recipe, and canon's `check_playability.py` cannot see a narrowing the game makes on its own.

---

## The finding

Canon's seventeen processes name a site like this:

| Process | `performed_at` |
|---|---|
| tanning, firing, smelting, casting, grinding, brewing | `settlement` |
| boatbuilding | `settlement`, `travel_node` |
| the other ten | *(anywhere)* |

So **every settlement can do everything, and no place says what it actually has.** The Nomad
Ground — a drover and a hunter, no buildings — smelts bronze exactly as well as the Camp in the
Kilns, which is literally named after its kilns.

That is the flatness. It is not a canon bug: `performed_at` is answering "does this need a
building at all", which is a real question and the one canon should answer. What is missing is the
next question down, and it is a *game* question: **which bench.**

## Canon already answers it, and not through a field

The 37 points of interest carry no `stations` list. They carry something better, and it is already
exported:

| Place | Kind | Who stands there | What they teach |
|---|---|---|---|
| The Camp in the Kilns | settlement | Thrali *fisher*, Uma *roofer*, Bekh *keeper of what is left* | firing, weaving ×3, carving, drying |
| The Rail-Head | settlement | Hesh *line-keeper*, **Ila *apothecary*** | — |
| The High Camp | settlement | Marn *herder* | tanning, spinning, weaving |
| The Tide Market | settlement | Sura *bone-picker*, Pell *wall-keeper* | carving ×3, spinning, boatbuilding |
| Narmada University | settlement | Vessa *junior archivist* | carving ×2 |
| Nomad Ground | settlement | Terke *drover*, Anu *hunter* | carving |
| **The Quiet Atelier** | **archaeological_site** | **Ila *apothecary*** | — |

Read that last row again. **Canon has already broken the flat model**: the apothecary is standing
in an archaeological site, which `performed_at: [settlement]` says cannot work anything. The data
is ahead of the rule.

So the derivation is not an invention, it is a reading:

> **A station is a person at a bench.** A workshop with nobody who knows the craft is a shed.
> Canon does not carry a `stations` list — it carries who is standing where, what their trade is,
> and which recipes they teach — and *that is what a station is*.

This is the same move `gestures.ts` and `routine.ts` already make and document: derive from fields
canon has, say plainly what the authored field would need to say, and let canon add it later
without the game waiting. The exceptions here are exactly what `poi.stations` should eventually
enumerate.

## The eight stations

Grouped from the seventeen processes by **what the bench physically is**, not by what comes off it.
Three different processes produce a container; one fire does firing, smelting and casting.

| Station | Processes | What it is | Where, today |
|---|---|---|---|
| **Hearth** | cooking, brewing | a fire and a pot | anywhere you can build a fire |
| **Kiln** | firing, smelting, casting | one fire, hot enough | the Camp in the Kilns (Bekh) |
| **Quern** | grinding, pressing | stone on stone | a settlement |
| **Tannery** | tanning, retting | soaking, and the smell | the High Camp (Marn) |
| **Loom** | weaving, spinning | a frame and tension | Uma, Marn, Pell |
| **Bench** | carving, knapping | a seat and a blade | anywhere |
| **Apothecary** | purifying, drying | sorting, grinding, keeping | the Rail-Head and the Quiet Atelier (Ila) |
| **Slip** | boatbuilding | water, and room to lay a hull | a settlement or travel node |

Eight is the number that falls out; it was not chosen first. Two tests of the grouping: *would one
person build both of these in the same corner?* and *does one of canon's roles own it?* The kiln
passes both — smelting and casting are the same fire at different heats, which `making-gestures.ts`
already says in the process→gesture table.

## What it must not break

**A station may never make something unmakeable that canon says is reachable.** Canon's
`check_playability.py` decides a recipe is performable from `performed_at` alone; a narrowing made
game-side is invisible to it, and the two repositories would disagree while every check on both
sides stayed green. That is the cross-repo blind spot `session-craft` names, and it has bitten
before.

Two rules keep it honest:

1. **Additive first.** A station can *open* a process somewhere canon's `performed_at` would
   refuse — Ila's bench at the Quiet Atelier — and in the first pass it never closes one. Strictly
   more playable than today, so nothing can strand.
2. **A reachability test before any narrowing.** The game-side equivalent of
   `check_playability.py`: for each field map, every sited process must have at least one place on
   that map that works it. It fails by name, naming the process and the map. Narrowing ships only
   behind that test.

## How the board is displayed

**A strip of station marks under the place's name, and nothing else.** Not a grid of cards, not a
second modal, not a tab bar.

```
  ┌──────────────────────────────────────────┐
  │  The Camp in the Kilns          [Leave]  │
  │  settlement                              │
  │                                          │
  │   ◭ Kiln    ♨ Hearth   ⌗ Loom    ✦ Bench │   ← the board
  │                                          │
  │  Arrival prose …                         │
  └──────────────────────────────────────────┘
```

Five rules, each answering a fault this interface has already had:

- **It lives in `PlacePanel`, above the arrival prose and below the name.** A place already answers
  "what is here to look at, who is here to talk to, what is further in"; what it can *work* is the
  fourth of the same question and belongs in the same list, not behind a button.
- **A mark that is present is a control; one that is absent is not drawn at all.** This is the one
  place the repo's "every action is listed at every height, greyed with its reason" convention does
  *not* apply, and the distinction is real: a greyed row teaches that a mechanic exists, and the
  player already knows what a kiln is by the time they meet the second settlement. Drawing all
  eight everywhere would make the board say the same thing at every place, which is the flatness
  this exists to fix. **The absent ones are named in one line of prose underneath instead** — *"No
  kiln here, and nobody to work one."*
- **Pressing a mark opens the workshop filtered to that station.** The workshop stops being one
  list of eighty-three and becomes the bench you walked up to. It keeps its "Ready / Within reach"
  split inside the filter.
- **It is a readout at `peek` and a control at `read`.** The dock's heights already decide whether
  a *reason* is on screen; here they decide whether the marks are pressable, because a tappable
  mark owes the 44px floor and a readout owes 26 — measured, that is the difference between the
  board fitting on a landscape phone and pushing the arrival prose off it.
- **The person and the station are drawn together where canon pairs them.** Ila's portrait beside
  the apothecary mark is the whole derivation made visible, and it is the game teaching its own
  rule: *the bench is here because she is.*

## The icons

Eight marks, and they go where every other mark in this interface goes: `src/ui/marks/`, named
`station-kiln.svg`, `station-hearth.svg`, and so on — a fourth namespace alongside `class-`,
`kind-` and `process-`. `src/ui/art.ts` already globs the folder, so **they need no code at all.**

Until they land, `ThingIcon` draws the process emoji it already has. Nothing is blocked on art;
see `docs/art-placement.md`.

Line drawings at ~20px, `currentColor`, the same register as `ShelterMark` — which is the
precedent, and the reason to keep these as inline SVG rather than a sheet: eight glyphs do not earn
a pipeline, where the terrain art does because it tiles a world.

| Mark | Drawn as |
|---|---|
| Hearth | three stones and a flame between them |
| Kiln | a domed updraught kiln with its stoke-hole — not a chimney |
| Quern | two discs, the upper offset, with a handle peg |
| Tannery | a stretched hide on a frame, pegged at four corners |
| Loom | a warp-weighted upright, which is the Bronze Age one |
| Bench | a blade and a half-finished haft |
| Apothecary | a mortar with the pestle standing in it — **reuse Ila's portrait glyph**, which already exists in `PersonPortrait` |
| Slip | a hull's ribs on trestles, half-planked |

---

## Order of work

1. `content/stations.ts` — the eight, the process grouping, and the derivation from people and kind. Pure, tested.
2. The reachability test, before anything narrows.
3. `StationBoard` in `PlacePanel`, additive only.
4. Workshop filtering by station.
5. The eight marks. **Last, and never blocking.**
