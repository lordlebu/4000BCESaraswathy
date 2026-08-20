# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Varuna's Field Diary** — a cozy 2D browser naturalist RPG. Combat is absent by design; creatures
are observed, not fought.

The player travels between authored **field maps** (three, joined by roads), walks each one,
stands in **points of interest**, talks to the people there, and looks closely at things. Looking
closely climbs a **discovery** one rung, and each rung rewrites its diary entry — *the diary is the
progression system*, and there are no experience points anywhere. Understanding things well enough
lets you settle **field questions**, possibly wrongly, and reach an **ending** where the people your
work helped either come with you or explain why they are staying.

The older loop — a procedural world with a landmark to find and a travel journal to export — still
runs underneath, deliberately kept. See "Known issues".

Stack: **React 19 + Phaser 4 + TypeScript + Vite**. React owns the DOM chrome, Phaser owns the map
canvas, and the game logic belongs to neither.

## Commands

```bash
npm install
npm run dev        # serve at http://localhost:4173 and open a browser
npm test           # vitest — rules and content under Node, panels under jsdom
npm run test:e2e   # playwright — does the game actually boot and draw?
npm run test:watch # vitest in watch mode
npm run typecheck  # tsc --noEmit
npm run build      # static bundle into dist/
npm run check:data # verify data/canon/ matches the canon release it came from
npm run build:sprite # rebuild assets/varuna-walk.png from assets/source/
```

### Sprite art is generated too

`assets/varuna-walk.png` is **built, not hand-made** — run `npm run build:sprite` rather than
editing it. The originals live in `assets/source/`.

Image models do not hand back usable game sprites. The first attempt had registration guides drawn
across the figure; the second painted the transparency checkerboard on as opaque grey and
compressed the art until a clean 7-pixel grid became 27,000 colours. `tools/build-sprite-sheet.js`
keys out a painted-on checkerboard when it has to, finds each figure, resamples to the game's grid
taking the **most common** colour per block (a mean is what made an early attempt look hazy), and
snaps everything to one 22-colour palette shared across frames. 1.3 KB for two frames, against the
418 KB the single unprocessed figure used to cost.

`docs/art-brief.md` carries the prompt and the failure post-mortem for regenerating art.

Run a single test file with `npx vitest run test/generator.test.ts`, or a single case with
`npx vitest run -t "some test name"`.

**Two suites, two jobs.** `test/` runs under Node and covers everything in `world/` and `content/`.
`e2e/` drives a real Chromium and is the only thing that can catch "Phaser booted but the canvas is
blank" — worth having because Phaser 4 is new enough that most published advice describes v3.
First run needs `npx playwright install chromium`. Vitest is scoped to `test/**/*.test.ts` in
`vite.config.ts` so it does not try to run the Playwright specs in Node.

Reading pixels back out of the Phaser canvas in-page does not work: the WebGL drawing buffer is
undefined after compositing unless `preserveDrawingBuffer` is set, which costs the real game
performance to serve a test. `e2e/game.spec.ts` screenshots the composited surface instead and
checks the PNG does not compress like a flat fill.

**Testing the deploy artifact.** `PLAYWRIGHT_BASE_URL` aims the browser suite at something already
running instead of starting a dev server — a `vite preview` of the subpath build, or the live Pages
URL. The subpath build is a genuinely different code path from dev, and a wrong `base` is the
classic way a Pages deploy goes blank. `base` is read from `DEPLOY_BASE` at config load, so
**`vite preview` needs the same env var as `vite build`** or it will serve at `/` while the HTML
asks for `/<repo>/`, which looks exactly like a broken build and is not:

```powershell
$env:DEPLOY_BASE = '/4000BCESaraswathy/'
npx vite build
npx vite preview --port 4180            # same env var, same shell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:4180/4000BCESaraswathy/'
npm run test:e2e
```

Navigation in the specs is relative (`?seed=x`, never `/?seed=x`) so a baseURL subpath is honoured.

`npm run build` respects `DEPLOY_BASE`, which the Pages workflow sets to `/<repo>/`. Locally and on
any plain static host it defaults to `/`.

**`pages.yml` is the only workflow that may deploy Pages.** Enabling Pages makes GitHub offer to
commit a `jekyll-gh-pages.yml` too — decline it. This is a Vite application, not a Jekyll site, so
that workflow would publish the rendered README instead of the game, and the two would contend for
the shared `pages` concurrency group.

## Architecture

### The data pipeline is one-directional, and it starts in another repository

```
SouthOfTethys/database/  →  utils/export_canon_bundle.py  →  data/canon/species.json
(canonical entity JSON)                                      data/canon/places.json
                                                             data/canon/knowledge.json
                                                             data/canon/world.json
                                                             ↓
                                                     src/content/canon.ts
                                                        (the adapter)
                                                             ↓
                                                     src/content/species.ts
```

**Everything in `data/canon/` is generated. Never hand-edit it.** Canon lives in the sibling
`SouthOfTethys` repository and now exports *its own shape* rather than this engine's: 424 entities
across species, places, discoveries and world. To change any of it, edit the canon entity there and
re-run `python utils/export_canon_bundle.py --apply`.

**`src/content/canon.ts` is the adapter, and the only place that knows both shapes.** Canon used to
be exported in this game's exact field list by a Python script in the other repo, which meant the
lore repo had to track the engine's data model and threw away everything that was not a species.
Now the mapping lives here. If a field is renamed on the way in, that file is the single place to
look. Canon changes when the fiction changes; the engine changes when the design does.

CI can no longer verify these by rebuilding them, because the canon they come from is not in this
checkout. `npm run check:data` compares them against `data/canon/canon.lock.json`, which carries the canon
version and a SHA-256 of each bundle file. That catches a hand-edit or a half-applied export. Hashes are
taken over LF-normalised content so the check survives a CRLF checkout.

`data/biomes.json` is still hand-written here, and is the one place biome colours, symbols,
walkability, travel costs, and journal descriptions live.

**`tools/build-species-data.js` is retired.** It used to build the data from `docs/bestiary.md` by
reading biome keywords out of each species' prose. Those heuristics are the origin of every biome,
mood and rarity tag now in canon — `utils/import_bestiary.py` in the other repo is a direct port —
so the file is kept as the readable reference for why a species landed where it did. It refuses to
run without `ALLOW_RETIRED_SPECIES_BUILD`, because running it would overwrite the export with a
narrower version of the same data.

Sky species and Asura conjurations remain `placement: "lore"` and never appear in play: the sky has
no ground-biome equivalent, and the tone question for the Asura horrors is still open.

### Layers, and the rules between them

- **`src/world/`** — deterministic generation. Seeded RNG (`rng.ts`), octave value-noise fields
  (`field.ts`), biome thresholds (`classify.ts`), river carving (`rivers.ts`), cost-aware routing
  (`pathfind.ts`), per-map landform shaping (`landform.ts`), the pass that eases the ground between
  placed points of interest (`routes.ts`), and the assembly in `generate.ts`.
- **`src/content/`** — the data layer. `canon.ts` adapts the canon bundle into engine shapes and is
  the only file that knows both; `species.ts` answers which creature and plant live on a tile;
  `journal.ts` turns that into prose; `conversation.ts` decides what a person says now;
  `camps.ts` and `kit.ts` answer where you can sleep and what you carry. All import their JSON at
  build time.
- **`src/game/`** — the only code that knows Phaser exists. `scenes/WorldScene.ts` draws tiles,
  moves the player, and manages fog; `tileTextures.ts` generates the tile art from `biomes.json`;
  `PhaserGame.tsx` owns the `Phaser.Game` lifecycle; `EventBus.ts` is the seam to React.
  `dayNight.ts`, `player.ts`, `night.ts`, `arrival.ts`, `fatigue.ts`, `frames.ts` and `scenePlan.ts`
  are the exceptions that import no Phaser, so `test/` can cover them — which is the whole reason
  the placement and night rules live outside the scene.
- **`src/ui/`** — React chrome. Journal panel, seed bar, layout, styles.

Four rules hold this together. Breaking any of them is how the codebase gets tangled:

1. **`world/` and `content/` import neither React nor Phaser.** They run under plain Node, so
   `test/` exercises the exact code that ships. Put new game logic here, not in a scene.
2. **Phaser is confined to `game/`.** Swapping engine versions — or engines — touches one folder.
3. **React never renders a tile.** The two sides talk over `EventBus` and nothing else. A scene
   never calls `setState`; React never holds a scene reference and pokes at sprites.
4. **Content lives in `data/*.json`.** No hardcoded creature or biome tables in TypeScript.

### Module systems differ by directory

The root `package.json` sets `"type": "module"`, so **`src/` is ESM**. `tools/package.json` sets
`"type": "commonjs"`, so **`tools/` is CommonJS** and uses `require`. This is intentional — it lets
the app sources use modern `import` syntax without rewriting the build script.

### Why the generator looks the way it does

The original generator built every field by smoothing white noise seven times. Repeated box blur
is a low-pass filter, so elevation collapsed to roughly 0.09–0.48 while `classifyBiome` wanted
`> 0.64` for hills — meaning hills, mountains, desert and rivers could **never** appear, and
`carveRiver` was dead code. Nearly half the bestiary was unreachable in play.

Terrain is now built from octaves of value noise over a seeded highland spine, and every field is
**normalised to 0–1 after shaping** so the classifier's upper thresholds are always reachable.
`test/generator.test.ts` asserts every seed produces hills, mountains and a river, so the bug
cannot come back quietly. If you retune `THRESHOLDS` in `classify.ts`, those tests are the contract
you are negotiating with.

**What decides a map's shape now.** Canon gives each field map a `relief` — `delta`, `island`,
`plateau` or `basin` — and `world/landform.ts` holds one shaper per landform, because one rule
cannot produce a harbour, an island and a plateau. It was producing a dome on all of them:
elevation rose toward the centre, high ground classifies as hills and forest at travel cost 2, and
the average tile went 1.15 at the rim to 1.98 in the middle. Every map was hardest exactly where
the walking happens.

Two rules in there are easy to get backwards and both were:

- **Raise the interior, never lower the rim.** The difference looks like a constant, and
  normalisation runs afterwards — but the sea threshold is a fixed fraction of the normalised
  range, so subtracting drags the world under water. Land fell from 63–86% across twenty seeds
  to 27–75%.
- **An easy middle means mid elevation and *low* moisture.** The only window yielding `plains` —
  the sole cheap non-coastal biome — is elevation 0.36–0.66 with moisture below 0.50. Raising
  moisture toward the middle, which is the intuitive way to make a delta feel like a delta, makes
  it more expensive.

`world/routes.ts` runs **after** placement and eases the ground along the routes between the
places, turning mountains to hills and wetland to river. That cannot be done while shaping,
because where the places landed is not known yet — and it is what makes a valley the path between
two places rather than a landform one happens to sit in.

**A tile is 0.375 km, not one.** `landmarkHint` promises a landmark on the far side "will take most
of the day", which was arithmetic when maps were 36 tiles across. They are 48 and 64 now, and the
promise had quietly become false: a day bought 23 steps of walking while the furthest tile from any
shelter measured 72. A day buys about eighty steps now, which is what makes "set out at dawn and
you can reach shelter" true rather than hopeful.

## The rules layer, and the one rule about it

`src/journey.ts` holds every rule about what a player knows and what that lets them do:
`canAdvance`, `blockedBy`, `entriesSoFar`, `linesFor`, `hear`, `canEnter`, `availableResolutions`,
`answer`, `gatherable`, `staying`, `disciplineProgress`, `languagesKnown`. All pure, all tested
under Node.

**The UI asks; it never reimplements.** A panel that reads `progress.rungs` to compute a percentage
is a second implementation of the ladder and will drift. If something a component needs is not
exposed, add a tested function here rather than computing it in the component.

This has bitten three times, each the same shape — a rule written, tested, and with no caller, so
the mechanic simply did not exist in the shipped game while every test passed:

- NPC dialogue never reached the adapter, so **no word could ever be learned**
- `answer` had no caller, so **a field question could not be settled**
- `gatherable` had no caller, so **the game had no ending**

The guard against the first of those is `test/adapterCoverage.test.ts`, which fails when canon
grows a field nothing adapts. The guard against the others is that at least one test per mechanic
must use only the paths a player has — `test/conversation.test.ts` walks both maps talking to
people and never calls `learn`.

## A requirement means two different things

Climbing a rung requires what it stands on to be **fully understood**. Forming a reading of a
question, or hearing a line, requires only that it has been **observed** (rung ≥ 1). A hypothesis
is built from what you have seen, not from what you have finished.

This is not a subtlety to tidy away. Under one uniform rule the wrong-but-early reading of a
question becomes unreachable, and Thrali can never hand over the word that completes the very
discovery he is waiting on. `utils/check_playability.py` in the canon repo duplicates both
readings; change them here and change them there.

## Known issues to be aware of

- **The landmark loop is kept deliberately.** The compass bearing to a great banyan and the arrival
  page it ends in predate points of interest, so there are two notions of arriving somewhere.
  Retiring the older one was proposed three times and declined: it works, its tests pass, and it is
  the shape the original game had. It goes only for a design reason, never as tidying.
- **`lava_field` cannot be drawn.** Canon names it and 36 species live there, but there is no tile,
  so `src/content/canon.ts` filters it out and those species keep `mountains` alongside it. The
  Ganges Lava Sea is unbuildable-looking until someone makes a 32×32 tile — see `docs/art-brief.md`,
  Asset 2b.
- **`feat/react-upgrade` is abandoned, not merged.** Its atmosphere components (`FogOfWar`,
  `DayNightCycle`, `AmbientParticles`) are DOM reimplementations of things Phaser does natively,
  and it carries a weaker generator. It survives only as a visual reference. Do not merge it.
- **Biome coverage is uneven, though no longer broken.** `settlement` and `plains` used to hold one
  and three creatures; canon species were tagged into them, and they now hold 6 and 7 creatures with
  8 plants each. `mountains` (51) and `desert` (35) are still far richer than `landmark` (4), because
  the bestiary was authored by region and the mountainous and arid regions are the biggest sections.
  85 species remain `placement: "lore"` — the sky and Asura sets, which are inert by design.
- Rivers usually terminate in wetland deltas rather than reaching open sea, and on Dwarka
  they cannot reach it at all: that map has no sea in its palette since it was dried out. That reads well for the
  Saraswati setting but does not literally meet the "rivers connect highlands to sea" line in
  `docs/world-generator.md`.
- There is **no back view of the player yet**. Walking away shows the front frame, which reads
  acceptably at this scale. A third frame drops into `src/game/player.ts` when the art arrives.

## Branches

**Feature branches always. Never commit to `main`**, and this is enforced rather than trusted: a
ruleset on the default branch blocks direct pushes, force pushes and deletions, and requires a
pull request whose `check` and `browser` jobs have both passed. There is **no bypass, for
anyone**, including the repository owner.

If a required check ever hangs or its workflow breaks, `main` cannot be merged to or repaired
until the rule is relaxed — Settings → Rules → Rulesets → *Protect main* → Enforcement:
**Disabled**, merge the fix, then back to Active.

This is why `browser` in `ci.yml` is written the way it is. It has no `paths-ignore` and no
job-level `if:`; the six expensive steps are skipped individually instead, so the job always
runs and always reports. A required check that does not report leaves a pull request pending
forever rather than failing it, and a documentation-only change that could never merge would be
worse than a five-minute suite.

**One branch, one PR for this repo.** The browser suite is slow, so batch game changes rather
than opening several PRs that each pay for it.

**Consolidate commits onto one branch rather than opening a branch per fix.** This is easy to
forget when the work arrives as a series of small corrections, and forgetting it is expensive: one
session produced `feat/npc-portraits`, `feat/poi-kind-markers`, `fix/landmark-tile` and
`fix/depth-corrections` as four separate branches, each paying for its own browser run, when three
of them touched no common file and could have been one.

The habit that avoids it: **before starting a new branch, ask whether the last one is still
unmerged.** If it is, and the new work does not depend on it having landed, commit onto it. Several
commits on one branch is the normal shape here, not an exception — each keeps its own message, and
the PR reads as a sequence rather than a pile.

Split into a second branch only when the work genuinely cannot travel with the first: it touches
another repository, it reverses something in the first, or it is urgent and the first is still
under review.

## Conventions

- Dependencies must justify themselves. The runtime is React and Phaser; that is the whole list.
  Dev dependencies are Vite, TypeScript, Vitest and Playwright.
- Determinism matters: the same seed must produce the same world and the same journal text. Do not
  introduce `Math.random()` or time-based values into `world/` or `content/` — all randomness comes
  from `world/rng.ts`. `game/dayNight.ts` is the one place allowed to read the wall clock, because
  what the sky looks like while you walk is presentation, not world state.
- Saved journeys live in `localStorage` keyed by seed and carry a `version`; bump `SAVE_VERSION` in
  `src/save.ts` when the payload shape changes so old saves are discarded rather than misread. It is
  at 7 — the collection replacing the old sketch list moved it to 6, and the landform work
  moved it again, because the same seed now generates different ground — and `Progress` (rungs, words,
  answered, questions) plus `collection` are the parts that matter.
- **Dev dependencies grew by three, for a reason.** `jsdom`, `@testing-library/react` and
  `@testing-library/dom` exist because three panel bugs reached a browser before anything noticed.
  Node stays the default test environment; panel files opt in with `// @vitest-environment jsdom`,
  so a stray browser dependency under `world/` or `content/` still fails rather than being hidden.
  Register `afterEach(cleanup)` yourself — Testing Library only does it under vitest globals, which
  this project does not use.
- **`docs/testing.md` is worth reading before writing a test here.** It records what the failures
  in this repository have actually cost, including the one that matters most: measure the signal
  before tuning a threshold.
- Field order in `generateWorld` is part of the seed contract. Reordering the `fractalField` and
  `highlandSpine` calls changes every existing map.
