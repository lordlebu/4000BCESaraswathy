# What it will cost to grow

The third ask: *do the tools or the code need to change to expand the game and make it scale?*

**Short answer: the stack does not need to change; five practices do.** React 19, Phaser 4,
TypeScript 7, Vite 8, Vitest and Playwright are current and none of them is the constraint. What will
hurt as the game grows is how state is saved, how much lives in two files, how the documentation is
carried, and one join across the two repositories. Each is measured below, ordered by what it costs
a *player* before what it costs a developer.

Measured on `main` at `391853c`, 25 September 2026.

---

## 1. A save that survives the ground moving — **do first**

**What happens now.** `SAVE_VERSION` is at 18. A mismatch drops the whole save — rungs, words, answered
questions, the collection, the satchel — by design: *"a half-understood journey is worse than a fresh
one."* `save.ts` records why each bump happened, and most of them are not payload changes. They are
**the ground moving**: 14 (the Aravali grew), 15 (a sky pool), 16 (the pool made walkable) and 18
(the painted buildings placed) each changed which tiles exist, which invalidates a remembered
position, the fog mask and resource nodes.

**Why that will not scale.** Every new map, landform tweak or stamped biome is another bump, and each
one wipes every player's diary — the whole of this game's progression — to protect state that is
only about *where you are standing*.

**The change.** Split the payload in two, and version them separately:

| Half | Contents | Depends on the ground? |
|---|---|---|
| what you know | `progress`, `collection`, `seenEvents`, `satchel`, `characterId` | **no** |
| where you are | position, `discovered` fog, resource `nodes`, `reached` | yes |

A ground-moving change bumps only the second half: the player keeps everything they learned and
wakes at the map's start with fresh fog. A payload change to the first half still drops it, as
today. It is a contained edit to `save.ts` plus its tests, and it removes the single most expensive
consequence of adding content.

## 2. The two largest files are where every feature lands

| File | Lines | Changed in the last month |
|---|---|---|
| `src/game/scenes/WorldScene.ts` | 2,518 · 42 private methods | 46 commits — the most of any source file |
| `src/ui/App.tsx` | 1,578 · 23 `useState`, 10 `useRef`, 11 `useEffect` | 38 |
| `src/ui/styles.css` | 3,382 | 34 |

**Two features cost this session a workaround.** `maybeHappens` lives inside `App`'s bus effect,
because that effect is registered once and must read state through a ref, so the activity card could
only reach it by handing it out through a second ref. That is not a bug; it is a component doing the
work of about six.

**The change, incrementally rather than as a rewrite:**

- **`App.tsx` → hooks.** The seams already exist: `useHappenings` (the events, its `seen` list,
  `maybeHappens`), `useActivity` (taking, making, resting, the card), `useJourneySave`, `useTravellers`.
  Each takes `latest` and returns what the tree renders. No behaviour moves; the file becomes an
  arrangement of them.
- **`WorldScene.ts` → systems.** Travellers and wanderers, water and wading, riding, the lit road and
  night are each a cluster of private fields plus an `update*` method. Moving each into a class that
  takes the scene follows the split `dayNight.ts` and `fatigue.ts` already make, and it is what lets
  the next system land in its own file rather than as a 43rd method.

**Not recommended:** a state library. The rules are already pure (`journey.ts`) and tested under
Node. The problem is where orchestration lives, not how state is stored.

## 3. The documentation is now a cost every session pays

`CLAUDE.md` in this repo is **60 KB** and has changed 46 times in a month, more than any source file.
`docs/` holds 37 files and about 130,000 words. The history in it is valuable, and `session-craft`
exists because it is. But the whole of `CLAUDE.md` is loaded into every working session, most of it
is history rather than rules, and **its numbers rot**: it said `SAVE_VERSION` was 16 while the code
was at 18. That is fixed now, and `test/docs.test.ts` checks it.

**The change.** Keep `CLAUDE.md` to the rules, the commands and an index of the docs. Move the
narrative into the doc each section already points at. And keep extending `test/docs.test.ts`: every
number the prose states about the code is a test waiting to be written, and this session added one.

## 4. The layer rules were mostly unenforced — **done**

Rule 1 (`world/` and `content/` import neither React nor Phaser) was enforced only by accident:
Phaser throws under Node, React does not. So a `useMemo` in `content/` would have passed every test.
Rule 2 (Phaser only in `game/`) was not checked at all.

`test/layers.test.ts` now reads the imports and fails by file. It was proven by slipping a React
import into `content/looks.ts`. No lint dependency was added, per the conventions.

## 5. The join across the two repositories is still by hand

`utils/check_playability.py` in canon duplicates `holds` and `observed` from `src/journey.ts`, and
both `CLAUDE.md` files say *"change one, change both"*. Two languages, one rule, no shared check. That
is the same shape as `check:data` comparing against its own lock: every check green, two
repositories disagreeing.

**The change.** A small file of **test vectors**, JSON cases of *(progress, requirement) → allowed?*,
kept in canon and exported with the bundle. Both `test/journey.test.ts` and canon's lint assert
against it. The rule then lives in two places but is checked from one.

---

## Measured and fine for now

- **Bundle.** One 875 KB JS chunk (269 KB gzipped). Phaser is most of it; the four canon JSON files
  are about 580 KB raw before minification and are imported whole. Nothing is slow because of it
  today. Watch it when a fifth map lands, and the first move is a `manualChunks` split so Phaser caches
  separately from game code. Per-map dynamic import of canon data would be the second. Canon's own
  560 KB export gate still stands and was not touched.
- **CI.** 129 browser tests at about 45 CPU-minutes, sharded four ways to about 6.7 minutes a shard
  on a clean run. The limit is single long files (`reachable.spec.ts` alone is 6.6 minutes), which a
  shard cannot split. When it bites, split the file, not the shard count. `CLAUDE.md` already records
  why more shards barely help.
- **Node suite.** 1,736 tests in 96 files, 26 to 47 seconds locally. Healthy.
- **Art pipeline.** Bespoke and good. The re-dyeing in `docs/strangers-and-happenings.md` is the
  cheapest scaling move there is for people: variety from arithmetic, not paintings.
- **Content authoring.** Woven templates are TypeScript functions, which is right at eleven. Past
  about thirty, move the prose into a data file with named slots and keep only the conditions in code.
  Authored events still have the open question `events-plan.md` records, canon's or the game's, and
  the canon exporter already takes new entity types without Python edits, so either answer is cheap.

## Not recommended

- **Changing engine or framework.** Nothing measured points at Phaser or React.
- **Splitting `styles.css` or adopting `@layer`.** Already declined, with reasons, in `CLAUDE.md`.
  The duplicate-class guard is what prevents the real fault.
- **Migrating old saves field by field.** Item 1 gets most of the value with none of the
  half-understood-journey risk `save.ts` warns about.
