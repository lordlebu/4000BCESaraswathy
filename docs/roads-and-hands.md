# Roads and Hands

The plan that followed the owner's play of Lothal on 1 October 2026. The published page is
<https://claude.ai/artifact/ChfGzFLRjhZsCaZCNXNkjH>; this file records what was built and why, so
the reasoning outlives the page.

The owner reported three things: they could not build the settlement or craft half of what the
first map offers, there is no opening and no sequence for crossing between maps, and temporary
camps appear without anything announcing them and all look the same.

## Answers the owner gave

| Question | Answer |
|---|---|
| How much should be craftable on the first map? | Everything Lothal's own people teach; recipes taught elsewhere say who teaches them and where |
| What replaces sinew as the first lashing? | Hand-twisted fibre cord, known from the start; sinew becomes the stronger lashing |
| Who is the opening about? | "You", unnamed, seen from behind; Captain Varuna and the Survival Train stay lore |
| Camp kinds per map? | No. The four shared kinds only; variety comes from props, paintings and events |

## Phase 0: what was broken

No design questions; each item is a bug or the test that would have caught it.

- **Crossing reset the clock.** `onTravelTo` restarted the scene without `travelled`, so `init`
  read nought and every crossing woke the traveller on the first morning: sky, camps, strangers'
  circuits and every node's regrowth. Guarded in the browser by `e2e/fielddiary.spec.ts`, which
  fails with the fix removed.
- **Picked-over ground followed you between maps.** Nodes were keyed `x,y,material` with no map,
  so stripping reeds at one spot on Lothal marked the same spot on the Narmada. The save now holds
  `nodesByMap`; an older flat `nodes` is read as Lothal's, so no save version moves and no fog is
  lost. `generate` also never reloaded nodes for the seed it switched to, and now does.
- **A reload forgot which map you were on.** The save keeps `fieldMapId`, outside both halves like
  `characterId`. A `?map=` in the address still wins.
- **Arriving on the Aravali put you on a floating island.** Canon 2.39.0 adds `arrives_at`, and
  the Aravali names the Rail-Head, which its arrival prose describes. `arrivalPoint` reads it.
- **27 plants grew nowhere.** `species.ts` placed only `flavour` flora, but canon's schema says
  `encounter` is "can be met". Ginger, mango, ashwagandha, kuchla, guggul and the rest now grow;
  canon's playability report confirms the world-level count of materials nothing yields went from
  14 to 0.
- **The workshop never ran its own chains.** Make was disabled unless a recipe was directly
  makeable, so `making-chain.ts` was unreachable from the UI. A recipe whose parts can be made
  from what is carried is now Ready, with a line saying what it makes first.
- **"You can see their smoke"** was said of a camp that had already struck. The card now checks
  the camp it was told of still stands.

## The critical-path test, and what it found

`test/criticalPath.test.ts` asks, for every map across twelve seeds, whether every recipe that
map's own people teach and every stage of its homestead can be made from materials its ground
offers reliably (on at least 10 of 12 seeds, on at least 3 tiles each). What cannot is listed in
`KNOWN_GAPS` as a ratchet: a new gap fails, and a closed one fails until it is struck off.

It corrected the first audit in one place and found worse in two:

- **Lothal's windmill can be built from Lothal's own ground.** Sinew is findable on enough seeds
  to count. What failed in play was that nothing *said* how to get there, which is Phase 1's
  visibility work rather than a content gap. Lothal's real gaps are four of its taught recipes:
  Uma's bedroll needs tree pitch, which grows nowhere there; Thrali's dried fish needs salt, which
  Lothal has none of; Bekh's salt box needs sandalwood, on 6 of 12 seeds at one tile each; and the
  bone harpoon needs fish bone, under three tiles on four seeds.
- **Dwarka's homestead cannot be finished from Dwarka.** The foundation needs palm husk (1-6
  tiles a map), and the sails need bamboo (1-2 tiles) and dates (8 of 12 seeds).
- **The Narmada cannot make what Okhi and Vessa teach.** Three need a bone awl, which only Sura
  on Dwarka teaches, and nothing there can fire a pot, because grog needs a storage jar only Bekh
  on Lothal teaches. Ink also needs lamp black, which nothing yields.

Canon's `check_playability.py` now prints the same per map (report-only until Phase 1 flips
`MAKING_PER_MAP_GATES`). The two measure differently on purpose: canon's cannot see rarity, and
this test can.

## Phase 1: crafting you can follow (canon 2.40.0-2.41.0)

- `content/sources.ts` says where every missing thing comes from: the animal or plant and the
  ground for a material, what goes into a made thing, which carried things would do a tool's job
  and how one is made, and who teaches a recipe and where they stand. The workshop puts that line
  under each reason and lists every recipe somebody could show you; the settling panel names a
  source for each need ("Reed rope: made from reed fibre").
- Pin one recipe (`PinnedRecipe`), and its needs stay in the dock while you gather. A readout,
  never a control: the dock cannot spare a 44-pixel chip at peek.
- Canon closed every gap the Phase 0 test measured: fibre cord and `process_twisting` (reed rope
  by hand), sea salt, deer hide, fish bone from river fish, a timber salt box, the palmyra palm and
  fossil ammonite on Dwarka, Okhi teaching the bone awl and the storage jar. `KNOWN_GAPS` is empty.
- The Vedda's sayings (`content/sayings.ts`), credited in the world only.

## Phase 2: settling you can see coming

`content/settlingRoad.ts` reads four steps off the save -- be known here, ask for ground, raise it,
settle -- and the diary leads with them (`SettlingSection`). The notes carry the next step at
reading height.

## Phase 3: the opening

- Canon 2.42.0 gives Lothal a `prologue`: the Walking Song alone, then four plates with two lines
  and a saying each. `Opening.tsx` plays it as a page of its own over the map booting behind it,
  with Skip and Continue on every card, and draws a stand-in until each painting lands
  (`node tools/build-plates.js --prologue` builds them from `assets/source/prologue/`).
- A new walk starts at the Camp in the Kilns, and **starting over now clears the save**: on a seed
  already walked, the door's "start a new walk" used to reload the old progress, satchel and flags.
- The first morning (`content/coach.ts`): one line at a time in the dock -- walk, talk to the
  weaver, cut four reeds, twist them into rope, knap a flint knife -- each done when the save says
  so. Uma's mat is not the first craft: it needs a loom frame and a working tool. So the morning
  ends at the knife and pins the mat. Hints can be turned off in the map sheet.
- `?opening=skip` passes over it for a test that sets out through the door.

## The owner's art, 1 October 2026

All eighteen pieces asked for arrived: the four opening plates, the four road paintings, a camp card
for each kind, the two night cards and the four camp prop sheets (the sheets are wired in Phase 5).
`tools/intake-roads-and-hands.py` records every repair, and only technical faults were repaired:
painted paper frames trimmed on four, and a "Grok" logo painted out of both Aravali roads from the
same rows to its left. The unnamed Gemini image is a second take of the night visitor
(`camp-night-visitor.2.png`). Browser specs assert the opening, the scarp road and a camp card draw
the owner's painting rather than a fallback.

- **A woven event can carry a per-variant painting** (`artVariant`), tried before its own: the camp
  card is the dacoits' own, not one picture of every camp.
- **The carts are drawn by elephantbirds**, because the paintings say so (canon 2.44.0).
- **Malacite and Mehtar are out of the traveller menu for now** (`PLAYABLE`), by the owner's word.
  Their sheets stay loaded, because strangers can still wear them.

## Phase 6: companions -- Guyuk's and the princess's arcs (canon 2.45.0)

The owner's arcs of 2 October 2026, with the owner's thirteen story paintings.

- **`content/storylines.ts`** plays canon's `storylines`: ordered beats, each a story card that comes
  when its moment does (arriving at a place, a night, a day's road), only once what it requires is
  held and what it asks is carried. A beat done is a flag, `story:<arc>:<beat>`; there is no quest
  system. A beat's choice can hand things over (`Choice.takes`).
- **Guyuk** (Aravali): a rumour of a herbalist, an empty Atelier, the ruins, rice at the Vedda Ford,
  mustard and dates at the Atelier where she teaches the seed ball, a supper, and the bond -- after
  which she is a walker.
- **The princess** (Narmada): opened by the Fourteen, the quarry tank, the terraces read, the
  University tank, the tablets, a supper, the bond, and her staying back for her people. The farewell
  painting (`asura-farewell`) is asked for on the plan page.
- **Walkers.** Varuna and Mithra walk from the first morning, Guyuk makes three when she joins; the
  menu is the roster and the player leads as any of them at will. Only the leader is drawn on the
  map, by the owner's word.
- **Shaka** is a barbarian from a distant land, asleep on the Aravali: a written happening.
- Story beats are asked before anything rationed or woven, at each moment.
