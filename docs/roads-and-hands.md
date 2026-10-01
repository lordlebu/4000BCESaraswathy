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
