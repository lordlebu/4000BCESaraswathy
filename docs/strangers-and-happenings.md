# Strangers and happenings

Two asks, answered together because each turned out to need the other:

1. **A lightweight character generator** — small traveller sprites and faces, from a set of
   pregenerated bodies and faces, without touching the lore repository.
2. **Stronger events and activities** — and whether an event can be made on the fly.

**Status: both shipped.** What follows is what was found, what was built, what was checked and
what is still open.

---

## 1. Strangers: three bodies, a road of people

### Is it possible without touching canon? Yes, and the boundary says so

The project's own test settles it: canon holds the **nouns**, and the game holds the **verbs** and
the **view**. What somebody looks like is a view. Canon records no appearance for anybody —
`PersonPortrait.tsx` says so, and refuses to invent one for a named person — and the road company in
`travellers.ts` (`company_carrier`, `company_drover`) are the engine's own invention, not canon
entities. So dressing them is the game dressing its own extras. **No canon file, schema or export
changes, and no canon version bump.**

### What was there

Three traveller-only bodies, built from painted sources by `tools/build-characters.js`: a carrier,
a drover and a pilgrim, each a 20-frame sheet of 26×40 cells, quantised to 12 colours. Every map
deals them out by position, so **the carrier on Lothal and the carrier on Dwarka were the same
person in the same clothes.** A new body costs a session of image prompting and a round of by-eye
row-order checks — `CLAUDE.md` records two pixel heuristics getting the row order wrong on two of
five characters.

### What was measured first

Each colour of each built sheet was lit magenta across every frame and looked at, at 6×. Then
whole garment groups were re-dyed and looked at again. Three things came out of that:

- **A garment is several near-identical colours, not one.** The sheets are speckled, so the
  pilgrim's hood is four indigos. Every one has to be listed or the garment comes out spotted.
- **Cloth and skin are cleanly separable on all three bodies.** Hue ranges do not overlap.
- **Keeping each pixel's own lightness keeps the painter's folds.** Swapping only hue and
  saturation re-dyes the cloth and leaves the shading where it was painted. Replacing each shade
  with a flat colour would erase it.

A fifth, paler skin step was tried and dropped: at 1.2× the carrier's skin went grey against his
own cream tunic.

### What was built

| Piece | What it does |
|---|---|
| `assets/looks.json` | per body: which painted colours are skin, cloth and a second garment, chosen by eye; what a face wears |
| `src/content/looks.ts` | eight period dyes (madder, indigo, turmeric, lac, leaf, ochre, undyed, charcoal), four skin tones, and `lookFor(who, body)` |
| `src/game/recolour.ts` | exact-match pixel remap, free of Phaser so Node can test it |
| `dyeSheet` in `src/game/player.ts` | builds the dyed sheet as a canvas texture at runtime, with the same frames and animations as the body |
| `src/ui/StrangerFace.tsx` | a face for a stranger: painted from the `src/ui/faces/` pool when it holds any, otherwise composed from the look |

**A look is a pure function of who is wearing it.** Named people are keyed on their canon id, so
Terke is dressed alike on every map; road company are keyed on the map as well, because the carrier
on Lothal is not the carrier on Dwarka. Nothing is saved, so there is **no `SAVE_VERSION` bump.**

**Rendezvous hashing, not a modulo**, so adding a dye re-dresses only the people it outright wins.
Measured in the test: under 20% of a crowd of 400 move to a ninth dye, and nobody swaps between two
old ones.

**Runtime, not build time**, because 3 bodies × 4 skins × 56 dye pairs is 672 sheets that would each
be a PNG in the bundle. A dyed sheet is one canvas the size of one body, made only for the handful
of people actually on the map. **The bundle grows by no image bytes**; the JS grew by 16 KB raw,
7 KB gzipped, across both features.

**The player is never re-dyed.** Only traveller bodies are in `looks.json`, and `lookFor` returns
null for anything else. A stranger in a recoloured Varuna is still Varuna.

### Faces

`src/ui/faces/` is a **pool** — the one art folder not looked up by the name of what it depicts. A
face is dealt to a stranger by rendezvous hash of their id. **It is empty today and nothing waits
for it**: until a face lands, the card draws the head-and-shoulders silhouette `PersonPortrait`
already uses, in the stranger's skin tone, with the headwear their body wears (wrap, turban, hood)
and their clothes in the same dyes as the figure on the road.

Both are read off the same table as the sprite, so **the card and the map cannot disagree** about
what somebody is wearing. One case needed a manifest entry rather than a rule: the drover's turban
is painted cream in every frame and never dyed, so `looks.json` names that colour for his face.

### What checks it

- `test/looks.test.ts`: every colour listed is **in the built sheet** (decoded from the PNG), so a
  rebuilt body with a stale manifest fails by name instead of silently dyeing nothing — proven by
  changing one colour by one unit; the dye changes the listed pixels and nothing else; a dyed ramp
  keeps its light order; looks are stable; every dye and skin tone is reached.
- `test/eventCard.test.tsx`: the face renders beside the title, in the swatches the figure wears.
- `e2e/road-company.spec.ts`: unchanged and passing — it fails on any missing texture or frame,
  which is what a badly cut dyed sheet would produce.
- A composite of every traveller on every map, plus a crowd of eighteen, rendered through the real
  `lookFor` → `recolourTable` → `recolourPixels` path and **looked at**.

---

## 2. Happenings: events made from what is here

### What was there

The event framework was complete and wired, with **zero events**. `events.ts` said so on purpose:
the shape shipped first so content would be a row of data rather than a feature. Three occasions
had live callers; nothing ever happened.

### Can an event be made on the fly? Yes, from facts the tile already has

Everything an ordinary happening is made of is already computed for every tile: the creature
`species.ts` puts there, the plant, the ground, the hour and the weather `moment.ts` reports, the
materials canon says the ground holds, the places on the map, and the road company walking it.
So a **template** is a sentence with holes plus a rule for when the holes can be filled, and it
produces an ordinary `GameEvent`. It uses the same card, the same `seen` list and the same seeded
roll. **One surface, two sources.**

| Occasion | Templates |
|---|---|
| `road` (once per day of walking) | tracks across the path · something dropped on the road · company on the road · weather turning |
| `night` (each sleep) | something beyond the lamp · a dream · somebody after dark |
| `arriving` (first arrival at a place) | stones at the edge · a fire already lit |
| `working` **(new)** (after a take) | being watched · something underneath |

### Three rulings

- **A woven event never grants knowledge.** Words and discoveries are canon's progression. A
  template may give a material, a direction, or ease tiredness — exactly what `travellers.ts` has
  always said road company give — and nothing else. Tested over every event the four maps produce.
- **Every choice is takeable, and every card has two.** "Leave it where it fell" is a choice with
  its own line, not a way of losing something.
- **Rationed, and once per subject.** `WOVEN_ONE_IN` in `tiers.ts`: one in three for road, night
  and arriving, one in six for working, because a take is the commonest act in the game. The rate
  is measured in the test. Ids name the template and the subject (`woven:tracks:painted-deer`), so
  the same tracks are never found twice and `seen` stays bounded by what the maps hold.

**Authored always wins, unrationed.** `happeningNow` asks `eventNow` first; a woven event is only
considered when nothing authored can happen.

### Strengthening the activity layer

Taking was the one act with no chance of anything happening around it, which made the busiest verb
in the game the least eventful. **`working` is the fourth occasion**, asked when a take's card
closes — after rather than during, so two cards never stand on each other. Choices gained two
optional fields, both through doors that already existed:

- `gives` puts a material in the satchel.
- `eases` goes through the scene's `ease` event, the one a remedy uses. A bowl by somebody's fire
  eases you exactly as a bowl from your own satchel does (`MEAL_EASES`).

### Found by reading the output, not by the tests

The first run's prose was generated across all four maps and read. It had four faults no assertion
would have caught:

- "You dream of the hills as **it** must have been": agreement with a plural ground
- "going up at **The** Rail-Head": canon titles places with a capital article
- "Wait it out under the **emerald harbor lotus**": now only trees, palms and shrubs shelter you
- "the ground gives up **sawfish bone**": now only materials with no `won_from` come out of the soil,
  the rule `gathering.ts` already keeps

Fixing the third left a weather card with **one** button where no tree stood, which the "every
card has two choices" test then caught. It now offers "Stand and let it pass".

### What checks it

`test/happenings.test.ts` walks all four real maps across four hours, four skies and every shelter,
and asserts the rulings over everything produced. The last test fails if **any template never fires
on any real map** — the guard against a rule too strict for any real tile, which is this codebase's
signature fault. Proven by making `cookfire`'s condition unreachable; the failure lists what did fire.

---

## Still open

- **Strangers only meet you on Narmada.** Aravali, Dwarka and Lothal fill all three traveller slots
  with canon's own circuit-walkers, so the road company — the only people a woven event can bring to
  you — exist on one map of four. Raising `TRAVELLERS_PER_MAP`, or letting company walk alongside the
  cap, is a design call rather than a fix, and `travellers.ts` records why the cap is three.
- **Narmada's road-company carrier wears the pilgrim's body.** `sheetFor` deals bodies by position
  so that no two travellers on a map share one (tested in `travellers.test.ts`), and Marn has
  already taken the carrier. So the one stranger a woven event can introduce is announced as *"a
  carrier, with a loaded back"* beside a hooded face. This predates the looks work, which only makes
  it visible. Re-dyeing removes the reason for the rule: two carriers in different dyes are two
  people. Matching road company to the body of their trade would fix it, but it reverses a tested
  guarantee, so it is left for a decision rather than changed here.
- **No browser spec forces a woven event open.** The path is typechecked and the rules are tested,
  but proving the card mounts in a real page needs a seed searched for a night that fires, or a hook
  to force one. Worth doing before the first *authored* event lands, which will use the same path.
- **Paintings.** `woven-<template>` in `src/ui/events/` (eleven of them), and faces in
  `src/ui/faces/`. Neither blocks anything.
- **More bodies.** A fourth traveller sheet is a row in `tools/characters.json` and an entry in
  `assets/looks.json` chosen by eye. With re-dyeing, a fourth body buys a new *silhouette*, which is
  the one thing colour cannot.
