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

## Decisions, 25 September 2026

The published plan asked nine questions. The owner took the recommendation on Q1 to Q6 and Q9, and
answered Q7 and Q8 directly.

| | Question | Decision | Status |
|---|---|---|---|
| Q1 | Should strangers walk every map? | Two road company on every map, **beside** canon's travellers, never instead of them (`ROAD_COMPANY_PER_MAP`) | **built** |
| Q2 | May two travellers share a body? | Road company wear the body of their trade; dyes tell them apart. Canon's named people keep distinct bodies | **built** |
| Q3 | Authored events: canon's or the game's? | Split: world-true events become a canon entity type; woven and player-only ones stay here. **Canon already uses `event_` for timeline history**, so the new type needs another name | recorded; canon work, Phase 4 |
| Q4 | Can strangers have names? | Canon exports a per-people list of given names, and the game deals them by hash | **built** (canon 2.29.0) |
| Q5 | May events remember between days? | Yes, in the what-you-know half of the save. First use: `met`, so a stranger recognises you | **built** |
| Q6 | How often? | Keep `WOVEN_ONE_IN` until the simulation report and a play session say otherwise | kept |
| Q7 | Faces | 22 faces by people and gender: Harappan 6 men and 4 women, Kia 4 men and 2 women, Maru 2 and 2, `any` 2. Prompts in `docs/face-prompts.md` | **pool built; art with the owner** |
| Q8 | Translation? | English only, with Jambhudweepan nouns. No message-format layer | recorded; nothing to build |
| Q9 | Save split first? | Yes | **built** |

The owner's list said "Harappan settler male" twice, 6 and then 4. The second is read as
**female**, which is what the prompts say. Correct it there if it meant something else.

### What was built for them

- **Strangers on every map (Q1, Q2).** A carrier walks every map, because loads go down every
  road. The second stranger follows canon's population: a Kia pilgrim where the map's named people
  mostly speak Kia, a Maru drover where they mostly speak Maru. Measured: the Narmada gets the
  drover; Lothal, Dwarka and the Aravali the pilgrim.
- **The save in two halves (Q9).** `KNOWLEDGE_VERSION` versions what you know: progress,
  collection, satchel, events seen, strangers met, the clock and who you are.
  `SAVE_VERSION` versions where you are: fog, the landmark, drawn nodes. **Ground moving now bumps
  only the second**, and the diary survives. A save from before the split reads as knowledge
  version 1, so nobody loses anything to this change either.
- **A stranger who knows you (Q5).** Choosing anything in a stranger's event records them in
  `met`. The next time the road brings them, it is *"A face you know"*, not a first meeting.
  Strangers are counted per map, since the carrier on Lothal and the carrier on Dwarka are two
  people.
- **Faces by people (Q7).** `<culture>-<f|m>-NN` or `any-NN`, dealt from the stranger's own people
  and the `any-` faces. `node tools/build-plates.js --faces` builds them.

### Found on the way, and fixed

- **Every map change kept the last map's people.** Phaser's `restart` reuses the scene instance,
  and `init` never reset the traveller or wanderer lists. So each map crossed added its roster to
  the last one's: destroyed sprites, still moved every tick and still reported to React. Measured
  in the new browser test: 5 travellers before a crossing, 10 after. Reset in `init` now.
- **Dyed sheets are released with their map**, animations included. Animations belong to the game,
  not the scene, and still name the frames of a removed texture. Removing only the texture would
  leave a returning look playing dead frames.
- **A new seed inherited the old one's `seen` list.** `generate` reloaded progress and the satchel
  but not the events, so the new journey saved the old one's as its own.

---

## Canon's peoples, surveyed

Asked for directly: *not only the Kia; which civilisations does the lore name, so the game adheres
to them?* Canon declares 27 cultures in `database/cultures.json`, across six epochs. What decides
whether one can walk these roads is **the era**: `DESIGN.md` sets the game in Epoch 5, after the
Great Shattering, and a people is alive there only if canon puts them there.

| People | In Epoch 5 on these maps? | What canon says | Used for strangers |
|---|---|---|---|
| **Harappan** | yes | the delta's settlers; Lothal is their half-buried city, survivors camped inside it; Mehtar carries the line into this era | carrier, every map |
| **Kia** | yes | "indigenous marsh-dwelling population of the delta, oral-tradition bound"; most of Lothal's, Dwarka's and the Aravali's people speak Kia | pilgrim |
| **Maru** | yes | the plateau herders, and the nomads at the Aravali's ford; everyone on the Narmada speaks Maru | drover |
| Silvershore | as stragglers | river lords of silver and debt; the Lothal camp holds "a Silvershore straggler" among its survivors | not yet; a candidate for a later face pair |
| Tamralinga | offstage | "keeps its ships and its pearl routes further east" of the Aravali coast | not yet; a candidate for a sea-trader at the rail-head |
| Explorer, ancient court | yes, as playable people | the Survival Train's Mithra and Guyuk, Malacite's claimed descent | never: the player's own cast |
| Jharwa, Vedda, Tushara | history | the Aravali massacre, the ford's first crossers, Guyuk's birth people; none alive in this era | never |
| Tuli, Vanara, Yaksha, celestial and the rest | other epochs or places | the Shattered Sea, deep antiquity, the gods | never |

**Faces and strangers follow the first three rows.** Silvershore and Tamralinga are real peoples of
this era who could plausibly be met. Each would be a small addition: a culture in
`STRANGER_CULTURES`, a road-company entry and a face pair. Neither is in the owner's list, so
neither was added.

---

## Names, and the rest of Phase 1 — 25 September 2026

**The first lore change this work needed.** Everything before it was a *view* (how a stranger
looks) or a *verb* (what happens to you), and the canon/game split gives both to the game. A name
is a *noun*, so it is canon's.

- **Canon 2.29.0** gives `harappan`, `kia` and `maru` twelve `given_names` each in
  `database/cultures.json`, written in each people's sound and checked against every person, place
  and word in canon. Its lint refuses a given name that already exists or that two peoples share.
  Exported as `peoples` in `places.json`, only for cultures that carry names. See canon's
  `docs/decisions.md`.
- **Dealt by rendezvous hash** in `givenNameFor`: the same stranger has the same name everywhere,
  and a name added to canon renames nobody already known.
- **Learned, not shown.** The road shows you "a carrier, with a loaded back"; any choice you make
  at a first meeting ends with their name, and *"A face you know"* opens with it. Names are
  ungendered, as canon's are, so a name can never contradict a face.
- **A new guard in `test/adapterCoverage.test.ts`**: every *collection* a bundle ships must be
  declared, not only every field. `peoples` passed every existing check while nothing read it.

**Phase 1 is done.** Its last two items:

- **Event words are data.** Every title, passage, label and line is in `data/happenings.json`,
  with named slots (`{a_animal}`, `{ground}`, `{name}`) and variants where one template says
  different things. The code keeps only when each can happen. `test/happenings.test.ts` holds the
  file and the code to each other: the same templates on both sides, no undeclared slot, no choice
  nothing offers, and no slot left unfilled in anything the four maps produce.
- **The inspector.** `window.__happen(occasion, kind?, shelter?)` opens an event through the real
  path with only the ration skipped. `e2e/happenings.spec.ts` uses it to prove a card opens and
  closes in a real page, and that a stranger tells you their name and greets you by it the next
  day. Both halves were proven to bite.

## Still open

- **Paintings.** The 22 faces are with the owner. The event paintings, `woven-<kind>` in
  `src/ui/events/`, are not started. Neither blocks anything.
- **Phase 2**: storylet weights and cooldowns, a pacing director, event chains, and a seed-sweep
  simulation report.
- **Authored events in canon (Q3)** need a new entity type, not `event_`.
- **More bodies.** A fourth traveller sheet is a row in `tools/characters.json` and an entry in
  `assets/looks.json`, chosen by eye. With re-dyeing, a new body buys a new *silhouette*, which is
  the one thing colour cannot.
