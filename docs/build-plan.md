# Build Plan: From Two Prototypes To A Cozy Slice

This plan takes **South of Tethys: Jambhudweepa Adventure** from its current split state to a
finishable Milestone 3 cozy slice. It supersedes the milestone list in
[game-plan.md](game-plan.md) for sequencing purposes; that document remains the source of truth
for vision and tone.

**Chosen track:** adopt the React/Vite shell from `feat/react-upgrade`, but keep `main`'s
`src/generator.js` as the one and only world generator.

---

## 1. Where The Repo Actually Stands

The repo currently holds **two divergent prototypes** plus build leftovers.

| Track | Branch | Strengths | Problems |
| --- | --- | --- | --- |
| Vanilla canvas | `main` | Richer generator (elevation, moisture, temperature, river carving, reachability-checked landmark), a passing smoke test, no dependencies | Flat visuals, no fog, no day/night, no build tooling, no `package.json` |
| React/Vite | `feat/react-upgrade` (3 commits, unmerged) | ~1,800 lines of atmosphere work: fog of war, day/night cycle, ambient particles, biome ambience, animated player, debug overlay | Ships a **rewritten, weaker** generator (`src/world.js`), duplicate journal data, unpinned `latest` deps, no test script |

### Audit findings (verified, not speculative)

**Blocking — the generator does not do what the design says it does.**

1. **Hills, mountains, desert, and rivers can never appear.** `makeField` smooths a uniform random
   field 7 times, which collapses it toward 0.5. Measured over seed `jambhudweepa-evening`, the
   elevation field spans **0.094–0.478**, but [`classifyBiome`](../src/generator.js:74) requires
   `> 0.64` for hills and `> 0.78` for mountains. Zero tiles qualify. Because `highTiles` is
   therefore empty, [`carveRiver`](../src/generator.js:91) is **never called** — river carving is
   dead code. Three sample seeds produce only sea, coast, plains, forest, and a little wetland.
   This fails the success criteria in [world-generator.md](world-generator.md): rivers do not
   connect highlands to sea, and the player cannot identify several geographic regions.
2. **The smoke test does not catch it.** [`smoke-test.js:34`](../src/smoke-test.js:34) asserts
   "at least five biomes," and `settlement` + `landmark` are counted as biomes — so a map with no
   terrain relief at all still passes with 7.

**Correctness and consistency.**

3. **`creatureAction` prints "undefined presence."** [`journal.js:36`](../src/journal.js:36) reads
   `creature.mood`, but the `CREATURES` array in that same file has no `mood` field — only
   `data/creatures.json` does. Confirmed output: *"…remember its undefined presence."*
4. **The journal and the sketch button can disagree.** [`describeTile`](../src/journal.js:26)
   selects a creature by `(x + y) % n`, while the observe handler at
   [`main.js:127`](../src/main.js:127) takes the **first** biome match. On a multi-creature biome
   the player reads about a crane and sketches an otter.
5. **`data/*.json` is never loaded by anything.** `journal.js` and `generator.js` hardcode their
   own copies, and the three sources have already drifted: `data/creatures.json` uses
   `journalPrompt` + `mood`, `journal.js` uses `prompt`, the React branch uses `text` and silently
   **dropped Shell Turtle** — leaving 5 creatures against an MVP that calls for at least six.
   `data/biomes.json` carries a `travelCost` field no code reads.

**Repo hygiene and CI.**

6. **The release workflow cannot succeed.** `.github/workflows/npm-publish-github-packages.yml`
   runs `npm ci`, `npm test`, and `npm publish`, but `main` has **no `package.json`**, and the
   React branch defines no `test` script. Every release run fails. Publishing a game to a package
   registry is also the wrong target — this should deploy to GitHub Pages.
7. **`.gitignore` is an Adventure Game Studio template** (it ignores `Compiled/`, `*.crm.user`,
   `AudioCache/`) and does not ignore `node_modules/` or `dist/`, both of which currently sit
   untracked in the working tree.
8. **Nothing runs the smoke test** — no test script, no CI job.

**React branch specifics to fix during the merge.**

9. `src/world.js` drops temperature, `riverBias`, and river carving entirely; it picks the start
   with `.find()` (first walkable tile, so starts hug the map edge instead of varying by seed);
   and it calls `reachable()` **inside** a `.filter()`, running a full BFS per candidate tile.
10. `package.json` pins every dependency to `"latest"` — builds are not reproducible.
11. Two entry points exist (`/index.html` and `src/index.html`).

---

## 2. Target Architecture

One generator, one data source, React only for presentation.

```
data/            biomes.json, creatures.json   ← single source of truth for content
src/
  world/         generator.js (ported to ESM), classify.js, rivers.js, names.js
  content/       loaders that import data/*.json and validate shape
  components/    JourneyMap, FogOfWar, DayNightCycle, AmbientParticles, ...  (from react branch)
  App.jsx        state, input, journal, save/load
  index.css
test/            smoke tests + generator property tests, run by `npm test`
index.html       single Vite entry point
```

Rules that keep the two tracks from re-diverging:

- **Generation logic stays framework-free.** `src/world/*` imports no React and runs under plain
  Node, so the test suite exercises the exact code the game ships.
- **Content lives in `data/*.json`.** No hardcoded creature or biome tables in JS.
- **Anything the design docs promise gets a test**, so "silently does nothing" can't recur.

---

## 3. Phases

### Phase 0 — Consolidate and unblock

*Goal: one branch, one entry point, green CI. No gameplay change.*

| # | Task | Files |
| --- | --- | --- |
| 0.1 | Merge `feat/react-upgrade` into a working branch; keep its shell and components, **delete** `src/world.js` and `src/journal-data.js` | branch merge |
| 0.2 | Delete the vanilla entry points superseded by the React shell (`src/index.html`, `src/main.js`), keep `src/styles.css` tokens folded into `react.css` | `src/` |
| 0.3 | Replace the AGS `.gitignore` with a Node/Vite one (`node_modules/`, `dist/`, `.vite/`, `*.local`) | `.gitignore` |
| 0.4 | Pin real dependency versions; add `"test": "node --test test/"` and `"lint"` scripts | `package.json` |
| 0.5 | Replace the npm-publish workflow with **CI** (install → test → build) on push/PR, and **Pages deploy** on release | `.github/workflows/` |

**Done when:** `npm ci && npm test && npm run build` passes locally and in CI, `git status` is
clean, and one `index.html` boots the React app.

---

### Phase 1 — Fix the world generator (the real Milestone 1)

*Goal: maps that actually contain the terrain the design promises.*

| # | Task | Notes |
| --- | --- | --- |
| 1.1 | Port `src/generator.js` to ESM under `src/world/`, preserving elevation/moisture/temperature/`riverBias` | Delete the CommonJS `module.exports` tail |
| 1.2 | **Fix the flat-field bug.** Smoothing destroys range, so renormalize each field to 0–1 after smoothing (track min/max and rescale), and/or build elevation from 3–4 octaves of value noise at different scales instead of 7 blur passes over white noise | This is the highest-value change in the whole plan |
| 1.3 | Add a deliberate highland spine — a few seeded elevation peaks with radial falloff — so mountains form ridges rather than isolated pixels | `src/world/generator.js` |
| 1.4 | Re-tune `classifyBiome` thresholds against the corrected field; verify desert actually appears in the hot/dry band | `src/world/classify.js` |
| 1.5 | Confirm `carveRiver` now runs; make rivers terminate in sea, lake, or wetland and never dead-end mid-slope | `src/world/rivers.js` |
| 1.6 | Replace the drifted content tables with loaders over `data/creatures.json` and `data/biomes.json`; settle the field names on `mood` + `journalPrompt`; **restore Shell Turtle** to reach six creatures | `src/content/` |
| 1.7 | Make `data/biomes.json`'s `travelCost` real (it already exists) or delete the field | decide, don't leave it dead |

**Tests to add** (`test/generator.test.js`) — these are the guardrails against regression:

- every biome in `data/biomes.json` appears in at least one of 20 sample seeds;
- every seed produces ≥1 mountain tile, ≥1 hills tile, and ≥1 river tile;
- every river tile chain reaches sea, lake, or wetland;
- the landmark is reachable from the start (already covered — keep it);
- the same seed produces byte-identical output twice (determinism);
- the start tile is walkable and is not on the map border.

**Done when:** a rendered map at seeds `play-test`, `river-road`, and `monsoon-evening` visibly
shows highlands with rivers running to the coast, and the new tests fail if the flat-field bug
returns.

---

### Phase 2 — Exploration loop on the fixed world

*Goal: the React shell driving the good generator, with parity plus the atmosphere work.*

| # | Task |
| --- | --- |
| 2.1 | Point `App.jsx` at the ported generator; delete its local `BIOMES` map in favour of `data/biomes.json` (`walkable` derives from `travelCost === null`) |
| 2.2 | Fix the creature mismatch: one `creatureFor(tile)` helper used by **both** the journal text and the observe button; make selection seeded per tile rather than `(x+y) % n` |
| 2.3 | Fix `creatureAction`'s `mood` reference once creatures load from JSON |
| 2.4 | Port `main.js`'s seed-keyed `localStorage` save/load into React; version the payload (`{v:1, ...}`) and drop unreadable saves instead of throwing |
| 2.5 | Wire `FogOfWar` to the discovered-tiles set (replacing the ad-hoc reveal at `main.js:49`) |
| 2.6 | Keep `DayNightCycle`, `AmbientParticles`, `BiomeAmbience`; slow the cycle so a short session sees one gentle shift, not a strobe |
| 2.7 | Journal shows **nearby geography**, not just the current tile — MVP asks for it and it's what makes the map feel legible |
| 2.8 | Touch/click-to-move for mobile; keep WASD/arrows |

**Done when:** a player can generate a seed, wander, see fog lift, read a coherent journal, sketch
a creature, close the tab, reopen, and find their journey intact.

---

### Phase 3 — The cozy slice (Milestone 3)

*Goal: a session that ends with a feeling, not just a state change.*

| # | Task |
| --- | --- |
| 3.1 | **Landmark quest with a beat:** a hint at the start camp ("elders speak of a banyan east of the river"), a directional nudge in the journal, and a written journal page on arrival |
| 3.2 | **Generated place names** for settlements, rivers, and landmarks from a seeded syllable table — invented-but-evocative, per the game-plan's respectfulness pillar |
| 3.3 | **Landmark variety:** 5–6 kinds (giant banyan, hot spring, shell beach, hill shrine, old observatory) with distinct journal text and biome affinities |
| 3.4 | **Route hints** — settlements mention what lies two or three tiles beyond, turning the map into a conversation |
| 3.5 | **Audio placeholders:** one ambient loop per biome group and a soft footstep, behind a mute toggle that defaults to off |
| 3.6 | **Art pass:** replace glyphs with hand-drawn-style tile sprites; keep the glyph renderer behind a debug flag as a fallback |
| 3.7 | **Journal export** — download the travel log as text or an image. This is the shareable artifact and the natural end of a session |

**Done when:** a first-time player reaches a named landmark in 5–10 minutes and has a journal
worth reading afterward.

---

### Phase 4 — Ship the slice

| # | Task |
| --- | --- |
| 4.1 | GitHub Pages deploy on release; set Vite `base` so `/assets/` resolves under the repo subpath (today's `dist/index.html` uses absolute `/assets/`, which breaks on Pages) |
| 4.2 | Rewrite `README.md` to lead with a play link, a screenshot, and `npm install && npm run dev` |
| 4.3 | Update `src/PLAYTEST.md` for the React build; add 3–5 fixed playtest seeds |
| 4.4 | Add a `LICENSE` (none currently exists) |
| 4.5 | Playtest round with the questions already listed in `PLAYTEST.md`; log findings in `docs/playtest-notes.md` |

---

## 4. Design Questions — Recommended Answers

[game-plan.md](game-plan.md) leaves four open. Recommendations, so Phase 3 isn't blocked:

| Question | Recommendation |
| --- | --- |
| Region, island, or subcontinent scale? | **Region.** A 36×24 grid reads as one river basin with a coast. Subcontinent scale needs zoom levels the slice can't afford. |
| Time of day and monsoon seasons? | **Time of day, yes** — `DayNightCycle` already exists and costs nothing more. **Seasons, no** — defer past the slice. |
| Food and rest resources? | **No.** Frictionless exploration is the stated pillar; hunger meters are the fastest way to make a cozy game stressful. `travelCost` can slow movement without threatening the player. |
| Invented languages or a naming system? | **Seeded invented naming system** (Phase 3.2). Evokes ancient geography without claiming historical accuracy. |

---

## 5. Risks

| Risk | Mitigation |
| --- | --- |
| The generator rewrite (1.2/1.3) changes every existing seed | Accept it — current seeds produce flat maps. Choose and document new showcase seeds after the fix. |
| Merging the React branch buries `main`'s better generator again | Phase 0.1 deletes `world.js` **in the merge commit**, not later |
| Atmosphere components carry hidden perf cost on a 36×24 grid | Profile after 2.6; `AmbientParticles` (254 lines) and `BiomeAmbience` (363 lines) are the ones to watch |
| Scope creep into engine migration | The slice ships on Vite. Revisit Godot/Phaser only if animation needs outgrow the DOM. |

---

## 6. Definition Of Done For The Slice

1. `npm ci && npm test && npm run build` is green in CI.
2. Every biome in `data/biomes.json` can appear, and every generated map has highlands **and** at
   least one river reaching water.
3. Six or more creatures, each observable in its habitat, each recorded correctly in the journal.
4. A named landmark, discoverable in 5–10 minutes, that writes a journal page on arrival.
5. Journey persists across reloads and can be exported.
6. The game is playable from a public URL with no install.
