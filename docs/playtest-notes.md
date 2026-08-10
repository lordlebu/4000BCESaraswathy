# Playtest Notes

Findings from actually walking the map, newest first. The questions being answered are in
[src/PLAYTEST.md](../src/PLAYTEST.md).

The point of this file is the gap between "the tests pass" and "the game is good". Everything below
was green in CI at the time it was found.

---

## 2026-08-10 — first pass over the finished slice

Walked the five showcase seeds start to finish, plus the four times of day.

### Fixed: the same landmark kept turning up, in the wrong places

**Three of the five showcase seeds ended at a salt pan** — including `monsoon-evening`, a map of
215 forest and 122 wetland tiles with no desert on it anywhere. A salt flat on a monsoon shore is
not a place; it is a bug wearing a place's clothes.

Surveying 60 seeds showed the shape of it:

| Ground the landmark stood on | Before | After |
| --- | --- | --- |
| coast | 22 | 13 |
| plains | 17 | 8 |
| forest | 10 | 11 |
| wetland | 8 | 10 |
| desert | 1 | 7 |
| hills | 1 | 6 |
| river | 0 | 5 |

Two causes, both fixed:

1. **Placement, not content.** `placeLandmark` chose from tiles at least 60% of the way to the
   furthest reachable one — and the furthest ground is nearly always map edge, which is coast. So
   coast and plains took 39 of 60 seeds between them, and **standing stones, which only belong on
   high or dry ground, never appeared at all**. It now picks the *terrain* first and a tile second,
   which levels the ground types before anything else happens.
2. **Salt pan was listed for `coast` as well as `desert`.** Shell beach already covers a shoreline.
   Salt pan is desert-only now.

All seven landmark kinds appear across 60 seeds after the change. `test/names.test.ts` asserts at
least four distinct kinds and four distinct terrains across its twenty guardrail seeds — the old
assertion said "more than two", which is why this walked straight past it.

### Fixed: two canvases, again

The StrictMode double-mount bug came back, intermittently. The first fix cleared the container on
teardown, which only covers one of the two orderings: Phaser appends its canvas during an
*asynchronous* boot step, so when teardown lands before that, the abandoned game adds its canvas
afterwards and the sweep has already run. `PhaserGame` now clears on the way *in* as well, and
removes the game's own canvas by reference on the way out.

It presents as flakiness, which is exactly why it survived the first fix: the test that checks for
it passed on the run where another spec failed on the same cause.

### Fixed: the walk could deadlock a few tiles from the end

Not a game bug, but worth recording because it looked like one. `e2e/playthrough.spec.ts` walks by
tapping, and a tap is a pathfinding request — tap a tile that is sea or cut off and there is no
path, so nothing moves. Near the landmark it tapped a short hop south-east onto unwalkable ground
and then did it again, forever: stalled twice on exactly the same tile, *"Lamtala lies south-east of
here. You are close"*, 248 of 251 tiles explored.

It now steps once the journal says the place is close, and watches for a turn that achieved nothing.

### Still open

- **Mountains never host the landmark** (0 of 60). They are walkable and in the candidate set, but
  the highland spine tends to sit mid-map rather than in the far band, so it rarely qualifies on
  distance. Hot spring consequently appears about once in sixty. Not wrong, but the mountains are
  the best-looking terrain in the game and the journey never ends there.
- **`settlement` and `plains` are thin in the bestiary** — 1 and 3 encounterable creatures — so
  villages and open grassland repeat themselves. The bestiary has no village fauna to draw on;
  `tools/build-species-data.js` carries curated fallbacks.
- **Rivers usually end in wetland deltas** rather than reaching open sea. It reads well for the
  Saraswati setting but does not literally meet the "rivers connect highlands to sea" line in
  `docs/world-generator.md`.

### Not a bug

- The day/night wash is very subtle in the morning hours. That is deliberate — noon is fully clear
  on purpose, because a tint that never lifts reads as a broken colour profile rather than as light.
  Use `?hour=` to see the ends of the cycle.
