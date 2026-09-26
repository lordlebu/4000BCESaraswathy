# Strangers and happenings

Two asks, answered together because each turned out to need the other:

1. **A lightweight character generator** — small traveller sprites and faces, from a set of
   pregenerated bodies and faces, without touching the lore repository.
2. **Stronger events and activities** — and whether an event can be made on the fly.

**Status: concluded, 26 September 2026.** Both asks shipped, and every phase's work that could be
done without new art or new lore is done: strangers with faces and names, storylets with a pacer
and chains, the asura princess who walks up to you, written happenings from canon, and budgets on
the page's size. What is left waits on the owner's art or writing, and is listed at the end.

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
| Q3 | Authored events: canon's or the game's? | Split: world-true events become a canon entity type; woven and player-only ones stay here. **Canon already uses `event_` for timeline history**, so the new type is `happening_` | **built** (canon 2.31.0, three drafts) |
| Q4 | Can strangers have names? | Canon exports a per-people list of given names, and the game deals them by hash | **built** (canon 2.29.0) |
| Q5 | May events remember between days? | Yes, in the what-you-know half of the save. First use: `met`, so a stranger recognises you | **built** |
| Q6 | How often? | Kept until the simulation spoke; then, 26 September, on the recommendation: gathering one take in nine, and tracks and being watched at half weight | **tuned** |
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

- **Canon 2.29.0** gives `harappan` and `kia` twelve `given_names` each and `maru` sixteen in
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

## Phase 2: storylets, a pacer, chains, and a simulation — 25 September 2026

**Storylets.** Each kind in `data/happenings.json` now carries its own rules beside its words:
`weight`, `tags`, a `cooldown` before the kind can happen again at all, and `again_after`, the days
before the *same subject* can come round again (null means once). A dream of the wetland can recur a
month on; a first meeting never does. The day each event last happened is kept in the save
(`eventDays`, what-you-know half), so this survives a reload and a ground bump.

**The pacer** (`paceFor`, tuned in `tiers.ts` as `PACE`). The chance `WOVEN_ONE_IN` gives is leaned
on by how long the road has been quiet: a third as likely the same day as another event, two
thirds the day after, as written for two to four days, half again after five, twice after eight.
Never above `PACE_CEILING`. It is RimWorld's storyteller idea turned toward calm: it paces rhythm,
and there is no threat in it to pace.

**The first day belongs to the place** (`WOVEN_FROM_DAY`). Found by a browser spec, not designed
in: the pacer first counted a fresh journey as a long quiet stretch, which doubled the chance at
the very first arrival, and `e2e/talking.spec.ts` walked into the Drowned Dockyard to find a
*Stones at the edge* card covering Thrali. That is the worst moment for a card in play as well as
in a test. So nothing woven happens on day zero, and a fresh journey counts as an ordinary day.
Authored events and the inspector are not held back.

**Variety** (`pickWoven`). Events are picked by rendezvous over their ids, weighted, and a kind
sharing a tag with anything from the last three days weighs a third as much. Measured under test:
tracks the day after an animal at night come up well under three quarters as often.

**Chains.** A choice can leave a flag (`sets`), and a template can need one (`requires`); both
are in the words file, and flags live in the save. The first chain: make room for a stranger after
dark, and later on the road they hold out something of their people's (red delta rice from a
Harappan carrier, reed fibre from a Kia pilgrim, cliff-goat hair from a Maru drover). Turning
it down is a real choice too. `e2e/happenings.spec.ts` proves the flag reaches the saved journey.

**No stranger shares a name with another of their people**, on any map. The whole road is dealt
at once, each stranger taking their best-ranked name nobody of their people has.

### What the simulation measured

`test/simulation.test.ts` walks seeded journeys over all four maps through the real `happeningNow`:
a road question, an arrival, three takes and a night each day, choosing by hash so both branches
of every card get walked. It checks the storylet rules as it goes, and `npm run simulate` runs it
larger and prints the report. Measured at 25 journeys a map over 60 days (6,000 days of road):

| measure | value |
|---|---|
| woven events per day | 0.74 |
| days with at least one event | 63% |
| longest run of quiet days | 4 |
| road / night / arriving / working per day | 0.26 / 0.18 / 0.03 / 0.27 |
| materials given per 30 days | 1.8 |
| strangers recognised / kindnesses returned | 435 / 73 |
| storylet rule violations | 0 |

**Two findings, left for the owner rather than tuned** (Q6 said keep the ration until the report
and a play session speak):

- **Something happens on two days in three.** That is what the documented rations produce once
  the pacer has damped them. Work (one take in six) is as common as the road.
- **Animals are half of everything**: tracks, sounds at night and being watched together make up
  about 49%, because nearly every tile has an animal on it. Variety damping keeps them from
  running back to back; it does not change their share.

The simulation's bands (0.5 to 1.1 events a day, at most seven quiet days, no kind above 30%) sit
well outside what was measured, so they fail on a change of rhythm and not on noise. Proven to
bite: with `again_after` ignored, it reports every event that came back too soon.

**Decided, 26 September: both recommendations taken.** `WOVEN_ONE_IN.working` is nine, and in
`data/happenings.json` tracks weigh 1.5 (from 3) and being watched 1 (from 2). Measured the same way:

| measure | before | after |
|---|---|---|
| woven events per day | 0.74 | 0.68 |
| days with at least one event | 63% | 59% |
| working events per day | 0.27 | 0.19 |
| animals' share (tracks, night sounds, watched) | 51% | 46% |
| longest run of quiet days | 4 | 5 |

**Less than the recommendation promised, and said plainly.** It forecast about one day in two; it is
59%, because the pacer leans in after a quiet stretch and gives back some of what the ration took.
And sounds at night rose from 13% to 16%, filling part of the room tracks and watching gave up, since
nothing halved them. If the road still feels busy in play, night sounds are the next weight to
halve.

## The asuras — 26 September 2026

The owner drew two asura faces as kin of the Maru. **For now they are Maru** (`maru-m-03`,
`maru-f-04`) and are dealt as any Maru face is. The prose no longer names a stranger's dye, since a
painted face carries its own colours and could contradict it.

**Making them `asura_hybrid` and closely tied to the Maru is small in code and gated on two
things only the owner can supply: a few sentences of lore, and one sprite sheet.**

| Piece | Where | Size |
|---|---|---|
| Say they are alive now, and kin to the Maru | canon `cultures.json`: `asura_hybrid` today holds one character, in deep antiquity. It needs the era, a `kin` or similar link to `maru`, `dress`, `art_reference` and `given_names`. A lint check that the link names a real culture. | half a session, once the lore is written |
| Let them walk | game: `asura_hybrid` in `STRANGER_CULTURES`, one road-company entry, and a rule for where they walk — the natural one is *beside the Maru*, on the maps whose people are mostly Maru | under a session |
| Their faces | rename `maru-m-03` and `maru-f-04` to `asura_hybrid-m-01` and `-f-01`. The builder now keeps the underscore; before this change it would have built `asura-hybrid-…` and nobody would ever have been dealt it | minutes |
| Their body | a new traveller sheet, Asset 9 in `docs/art-brief.md`, then `looks.json` colours chosen by eye | art first; then under a session |

**Where the lore has to decide, not the code:** whether asuras are met on the road at all in this
era, or only in some places; whether they speak Maru; and what they are called. Canon removed
`asura` as a culture on purpose — it had meant a culture, a species and a creature prefix at once
— so `asura_hybrid` is the right existing home, and `maya_born` the other candidate.

## New bodies — 26 September 2026

**The Maru drover now walks as an upland nomad**, in fur and a red felt cap (`traveller-nomad`,
Asset 9), with its colours in `assets/looks.json` so each drover is still dyed as their own person.
The named travellers `sheetFor` deals keep the three original bodies. **The asura nomad and the
princess are built and staged**: a head taller than everybody, and drawn by nothing until the
asuras have a people and the princess her story. See Assets 9 and 10 in `docs/art-brief.md`.

## The Asura-Tainted Princess — can she be a real character? Yes

The owner asked whether the asura princess (`maru-f-04`) could become a fully fleshed character who
comes looking for the player with quests. **She can, and canon has done a third of the work.**

**What canon already says.** `character_asura_tainted_princess`: `asura_hybrid`, **immortal and
alive**, the child of Prince Varunesh and the asura princess Manjalaya. *"Heavy curled ram horns,
violet gemstones. Marked by Aryaman with golden constellations in dreams. Lives in eternal isolation
on a rocky plateau."* Her roles are `isolated_royal` and `dream_prophet`.

That settles the three questions that usually stall a character like this:

- **She can be in this era as herself.** Immortal and alive; no reincarnation to write.
- **She belongs to the Maru's country.** A rocky plateau is the Narmada, where everybody canon
  names speaks Maru — which is where the owner already put her.
- **She has a way to find you that the game already has.** She is a dream-prophet, and the game has
  night events. She can reach you in a dream long before she meets you on the road.

**The one lore question only the owner can answer:** *eternal isolation* is her canon, so why does
she leave the plateau now, and why for you? That is the spine of her quest line, and it should be
the owner's.

### What it would take

| Piece | Where | What | Size |
|---|---|---|---|
| Her story | canon, owner writes (or approves a draft) | why she comes down; three or four beats; what she asks and what she gives | the owner's writing |
| Authored encounters | canon | the new entity type Q3 decided on (not `event_`, which is the timeline): an occasion, what it requires, the lines, what each choice grants. Schema, template in `AUTHORING.md`, lint, export | 1–2 sessions |
| A quest ladder | canon | a discovery of her own, climbed by her encounters, so her quest lives in the diary like every other progression here. No new progression system | inside the above |
| Read them in the game | game | authored events from canon's bundle replace the empty `events` array; an event gains a `speaker` shown with her portrait | 1 session |
| She bumps into you | game | when one of her road encounters fires, the scene draws her sprite at the edge of view and walks her to the player before the card opens. A new scene behaviour, tested in the browser | 1 session |
| Her art | owner | the sprite (Asset 10 in `docs/art-brief.md`); her portrait is `maru-f-04`, moved out of the stranger pool so she is never also met as an anonymous drover | art |

**About four to five sessions of code across both repositories, once the story exists, and no new
dependency.** Everything it stands on is already built: authored events win over woven ones and
are unrationed; chains run on flags in the save; a ladder in the diary is how this game has always
shown progress; lines gated on what you hold are how every named person already speaks.

**The recommended shape, for the owner to rewrite:** she first appears in a dream on the Narmada
(night, requires nothing); the dream leaves a flag; days later, on the road, she is standing ahead
of you and asks one thing; doing it climbs her ladder a rung and unlocks the next. Three meetings,
each a rung, ending with her choosing to stay on her plateau or walk on with you — the game's ending
already asks every person you helped that question.

## She walks up and says hi — 26 September 2026

**The first step of her, shipped.** The owner gave her history (in canon now: the forbidden union,
the unicorn bled into a Dwarka Gate, the exile over the Tethys, her waking after the Cataclysm) and
asked only that she walk up and say hello — her quest stays unwritten.

- **Where:** the Cloud Stair, on the Narmada. The owner first said the Dwarka portal, then moved her,
  because the road's nomads walk the Narmada and not Dwarka. The Narmada is the plateau, and the
  Cloud Stair its anomaly.
- **Who:** `npc_asura_princess` in canon 2.30.0, linked to her character. Two lines: *"Hi. You walk
  like somebody who came a long way to look at a stair…"*, and one about the terraces growing more
  than goats, which hands over the terraces' question — the sound answer is contour irrigation for
  a population nobody recorded. That hand-over is what records meeting her in the diary.
- **How:** `content/visitors.ts` says that at the Cloud Stair, the first time, she comes over. The
  scene finds a tile three to six away with a way in, walks her up to stand beside you in her own
  taller sheet, and says so; the conversation opens. Everything after that is the ordinary
  conversation: her portrait (the owner's painting, moved out of the stranger pool so she is never
  also met as an anonymous drover), her lines, the diary.
- **Checked** in a browser by `e2e/happenings.spec.ts`, through the `__approach` inspector: she
  stops beside the traveller, drawn 88 px tall, and the dock opens on her portrait and "Hi."

## Written happenings: Phase 4 — 26 September 2026

**Q3, built.** What is true of the world is canon's; what the game weaves from a tile stays here.

- **Canon's new type is `happening_`**, in `database/happenings/` (canon 2.31.0), exported in
  `places.json` beside the people standing in the same places. It says where (maps, and for an
  arrival its points), on which of the game's four occasions, what must have been *seen*, the
  prose, and up to three choices granting what a line may grant. **It never says which day or how
  often**, the ruling `renews` already made. Canon's `check_playability.py` counts the grants and
  refuses one that is not a discovery, word, question or recipe.
- **The game reads them as its registry.** `events` in `src/content/events.ts` was an empty array
  wired to a caller for months; `fromCanon` now fills it. A written happening wins over a woven one
  whenever it can happen, is never rationed, and happens once. `Conditions` gained `pois`, because
  an arrival at one point is not an arrival at its neighbour.
- **Three drafts, one per map's thesis**, each granting only what another route already reaches,
  so nothing new becomes reachable and the owner can rewrite them freely:
  - *The tower, standing*: a Lothal night, once the tower's collapse is seen. You dream it whole
    and climb it, and at shoulder height the empty niche is not empty. Points at the Empty Niche.
  - *Counting years*: the Narmada road, once the moving spring is seen. An old herder names her
    years by what happened in them, back to *anu-shivit*, the year the water walked. Gives the
    word Vessa gives.
  - *Where you stop*: arriving at Dwarka's Caravan Ground, which has stood empty since it moved
    from the Dry Harbour. A drover says this is where you stop, because this is where you stop.
    Points at the road that follows water.
- **Checked** by `test/events.test.ts` (the adapter to what canon ships, and that an arrival is
  narrowed to its point, which was proven to bite) and in a browser by `e2e/happenings.spec.ts`:
  arriving at the Caravan Ground opens *Where you stop* through the real path, once. With the
  point left out of the wiring, the test gets a woven *A fire already lit* instead.
- **Art is optional.** Each draws `src/ui/events/<id>.png` if it exists, and the shelter's own scene
  if not.

**The budget, collected on again.** The three took canon's bundle to 558.9 KB of its 560. Canon now
withholds `notes` from regions, maps, points of interest and people as well: after reading every
reader of `places.json` in this repo, none reads it. 526.2 KB.

**And the page's own budget.** Canon's gate sees only canon's files. `tools/check-bundle-size.js`
(`npm run check:size`, in CI after the build) measures the app's chunk against 950 KB: 844.5 KB
today, Phaser not counted. That was Phase 4's last item: content budgets on every pull request.

## Still open, and why each waits

Nothing here blocks anything, and each waits on something only the owner can supply.

- **The three drafts**: rewrite or approve. Merging canon's pull request is the approval.
- **Paintings for the three happenings**, if wanted (`src/ui/events/happening_*.png`, the event
  painting brief in `docs/event-prompts.md`).
- **Asuras as their own people** (`asura_hybrid`, kin of the Maru): waits on the lore the owner said
  they would write. The code side is under a session, and the walking sheet is built.
- **The princess's quest**: unwritten, as asked.
- **Silvershore stragglers and Tamralinga traders**: recommended not yet. Each needs names in canon
  and a pair of faces.
- **Layered headwear and loads**: waits on hand-registered art parts. Image models have not
  returned them.
- **More bodies.** A fourth traveller sheet is a row in `tools/characters.json` and an entry in
  `assets/looks.json`, chosen by eye. With re-dyeing, a new body buys a new *silhouette*, which is
  the one thing colour cannot.
