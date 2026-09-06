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
npm run test:e2e:fast # the same, minus the @slow map crossing — what a PR runs
npm run test:e2e:slow # only the map crossing — what main and the nightly add
npm run test:ci    # the same suite in CI's container, at CI's size — see below
npm run test:watch # vitest in watch mode
npm run typecheck  # tsc --noEmit
npm run build      # static bundle into dist/
npm run check:data # verify data/canon/ matches the canon release it came from
npm run perf       # frame cost on the renderer CI has -- see docs/rendering.md
npm run build:sprite # rebuild assets/varuna-walk.png from assets/source/
```

### The browser suite is split, and the split is deliberate

The full map crossing in `playthrough.spec.ts` is tagged **`@slow`**. A pull request runs
everything else; `main` and a nightly schedule run the lot.

It is not a judgement on the test — it is the only one that walks a whole map and proves a real
playthrough finishes, and it has caught three separate bugs. It is also **four and a half minutes**
at a runner's size, because `STEP_MS` is 425 ms a tile and no test cleverness makes a tween finish
sooner. That is fine once and wrong on every push: it was most of a seventeen-minute job, and it
failed four times running for reasons unrelated to the change under review. **A check that is
usually red for reasons you did not cause is a check people learn to ignore**, which is worse than
not having it.

Nothing is skipped, only moved. The walk still guards every merge to `main`, and the nightly run
catches the case neither can — two pull requests that are green alone and break something once
they are both in.

### When CI fails and the suite passes here, run `npm run test:ci`

It runs the browser suite in `mcr.microsoft.com/playwright` at the version this repo pins,
constrained to **4 CPUs and 16 GB** — a hosted `ubuntu-latest` on a public repository. Both halves
matter, and the second one is the half that is easy to skip.

**Why it exists.** Four CI failures in a row were diagnosed by reading logs, because the suite
passed locally every time. Three commits went out against a failure nobody could reproduce and one
of them broke `main`. An attempt to stand in for CI with 4× CPU throttling *disproved itself*: the
version that had just failed CI passed under the throttle, faster than the fix did.

**The renderer is only half of it.** A developer machine draws through a real GPU and the runner
falls back to SwiftShader, so the image matters — but the first run of this script gave the
container sixteen cores and everything passed comfortably, which proves only that a sixteen-core
Linux box is not a GitHub runner. **A test that is quietly close to its budget only shows it at the
runner's size.**

**Getting the size right cuts both ways.** Two CPUs was tried first and fails three of the four
tests in `hours.spec.ts` — tests CI passes every time. A reproduction harsher than the thing it
reproduces invents failures nobody has. Calibrate by running a spec CI passes and tightening until
it stops: four is where local behaviour matches CI's. At four, the playthrough walk takes
**4.3 minutes**, which is exactly why it was failing against a four-minute budget and why that
budget is now eight.

```bash
npm run test:ci                              # whole suite
npm run test:ci e2e/playthrough.spec.ts      # one spec
CI_CPUS=2 CI_MEMORY=7g npm run test:ci       # a private repo's smaller runner
```

Linux dependencies live in a named Docker volume rather than the checkout, because `rolldown` and
`esbuild` ship per-platform binaries and this machine's `node_modules` cannot be used inside Linux.
First run installs them; later runs start immediately.

### The ground is finished; the maps are what is left

Fifteen biomes now, and the last four arrived as **patches rather than palettes** — a distinction
worth keeping, because getting it wrong is how a map becomes a third lava. `seed_biomes` is a
*climate* palette: the classifier divides elevation and moisture among whatever is listed, so
anything in it becomes a large region. `lava_field`, `snow`, `sky_island` and `sky_underside` are
places instead, stamped after classification the way the settlement already is — its comment says
why, and it is the whole rule: *a city is a place, not a climate*.

`snow` is not in `ELEVATION_ORDER` or `GROUND_PREFERENCE` at all, so the classifier **cannot**
produce it. It exists only where `world/tableland.ts` stamps it, which is what keeps it off a
delta.

All nine original ground biomes tile — `test/frames.test.ts` asserts every ordered variant pairing. `hills`
is olive rather than ochre (ochre sat 19 from `desert` in RGB, and under ~25 two grounds stop being
tellable apart). Cliffs and treelines are **rim** layers drawn on boundary tiles only; see
`docs/rendering.md` for why a ground texture cannot carry a slope, and `docs/art-brief.md` Asset 2d
for the sheet format and the prompt.

**The remaining complaints are terrain generation, not art**, and they are recorded in
`docs/world-generator.md`: Lothal's hills and rivers tangle at a scale neither reads at, two of
Narmada's hill clusters never cross `MOUNTAINS` so they get no cliff rim, and Dwarka is too easy to
cross. None needs new art.

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

### Where a large media file goes

**Ask what reads it.** That question sorts every picture in the repository, and it is the only test
that matters:

| What reads it | Where it lives | Tracked |
|---|---|---|
| `src/` imports it and it ships | `assets/`, `src/ui/plates/` | **yes** |
| a script in `tools/` reads it to build something | `assets/source/` | **yes** |
| a doc embeds it with `![alt](…)` | `docs/images/` | **yes** |
| **nothing** — a person looks at it | **`dump/`** | **no**, git-ignored |

A reference image is still worth keeping. `dump/endgame.png` is the frame this game's whole
rendering programme was measured against, and it is named in three docs and three source comments
— but no code path opens it, so 2.5 MB of it does not belong in everybody's clone. **Move, do not
delete:** `dump/` is git-ignored and the file stays on disk, the same arrangement
`assets/source/dump/` already uses for rejected art and `assets/source/plates/` for 80 MB of raw
plates.

Two things that make this go wrong:

- **`git add -A` will sweep up a stray PNG.** A 6.4 MB lore map reached a canon commit that way,
  as a side effect of staging a linter change. Check `git status` before staging when a large file
  is loose in the tree.
- **A doc that names a moved file goes stale silently.** `docs/art-brief.md` said `endgame.png` was
  "in the repository root" and was wrong the moment it moved. Grep for the filename after moving
  one.

And the limit of all this: `.git` is far larger than the tracked total, because history keeps every
old version of a binary. Ignoring a file stops new weight accruing; it does not shrink an existing
clone. Only a history rewrite does that, and it breaks every clone and every open pull request —
so this rule is about not making it worse, not about undoing it.


**Before touching the art, read the programme that produced it:**
[Repainting South of Tethys](https://claude.ai/code/artifact/2ee2b8c5-e1e5-429a-ba41-334576ce8ba0) — the illustrated version of `docs/endgame-plan.md`, closed in
August 2026. It records what was measured and declined as well as what shipped, which is the part
that saves time: the vignette and the dissolved shoreline both look like obvious wins and both were
built and reverted. The artifact is **private** — it opens for the repository owner and whoever
they share it with — so treat `docs/endgame-plan.md` as the authoritative copy and the link as the
readable one.

The art docs, in the order they are useful:

| File | What it holds |
|---|---|
| `docs/endgame-plan.md` | the programme, closed; what shipped, what is parked, what was declined |
| `docs/art-direction.md` | the five rules the art follows, and what each one cost to learn |
| `docs/art-brief.md` | prompt blocks for terrain, objects and figures |
| `docs/plate-prompts.md` | the species plate queue, per-tool prompt notes, and the emoji tables |
| `docs/rendering.md` | why the frame costs what it costs, and the four levers when it costs more |
| `docs/the-ground-that-gives.md` | gathering, resource nodes, and where the tuning numbers live |

Run a single test file with `npx vitest run test/generator.test.ts`, or a single case with
`npx vitest run -t "some test name"`.

**Two suites, two jobs.** `test/` runs under Node and covers everything in `world/` and `content/`.
`e2e/` drives a real Chromium and is the only thing that can catch "Phaser booted but the canvas is
blank" — worth having because Phaser 4 is new enough that most published advice describes v3.
First run needs `npx playwright install chromium`. Vitest is scoped to `test/**/*.test.ts` and
`test/**/*.test.tsx` in `vite.config.ts` so it does not try to run the Playwright specs in Node.

**A `.tsx` suite renders React and needs a DOM**, declared per file with
`// @vitest-environment jsdom` rather than globally — a global jsdom would hide a stray browser
import in `world/` or `content/` instead of catching it. Nine suites do this, and they earn their
keep: **every fault found in the interface work was found by rendering a component, and none by the
arithmetic underneath it.**

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
                                                             data/canon/crafting.json
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
  `camps.ts` and `kit.ts` answer where you can sleep and what the traveller always carries;
  `making.ts` adapts the crafting bundle and `satchel.ts`, `crafting.ts`, `gathering.ts`,
  `cooking.ts` and `vehicles.ts` are the rules over it. All import their JSON at
  build time.

  **A satchel is not the kit, and neither replaced the other.** `kit.ts` is the bedroll, lamp,
  diary and staff: fixed, unmanaged, there from the first step. `satchel.ts` is what gets
  picked up along the way. The kit's argument against consumables still stands — there is no
  weight, no spoilage and no hunger, and a player who never opens the satchel finishes the
  game.
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

### The resource layer, and where its numbers live

Four modules, and the split between them is the same canon/game split as everywhere else:

| Where | What it answers |
|---|---|
| canon's `material.won_from` | which species a material comes from |
| canon's `material.renews` | whether a place gives it again — an *ordering*, never a duration |
| `content/gathering.ts` | what a tile offers, from the species standing on it |
| `content/nodes.ts` | what is *left* of it, and what a worked node looks like |
| `content/tiers.ts` | every number the layer is tuned by |

**`tiers.ts` is the file to edit when the walk feels wrong.** Regrowth in days, stock by rarity,
the odds of a good cut, the stone-discovery constants — all of it, in one place, because they were
spread across two modules and tuning meant finding three tables and hoping there was not a fourth.
None of it is a fact about the world and none needs a canon edit.

Two rules in there are design rulings rather than numbers to tune past:

**Gathering never gives nothing.** Cozy games vary *how much*, not *whether*, and gathering is the
only thing that puts a material in a satchel — a failure roll would put a die in front of every
recipe and stack with depletion. `test/nodes.test.ts` fails by name if a material ever gives
nothing on an untouched node.

**Stone does not regrow; it is found.** `renews: never` is literally true — no emptied node ever
refills — but working the ground reveals more of it nearby, so the world does not run out. Making
common stone `slow` was the obvious alternative and is worse twice: untrue of a cut nodule, and
against a player working a district hard a thirty-day node is emptied thirty times before it
returns one.

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

**Always end with the pull request link.** Whenever work is pushed, the reply must carry the URL —
the PR itself if one exists, otherwise the `pull/new/<branch>` compare link the push prints. Not
the branch name, not "ready to open a PR", not a description of where to click: the link, so it can
be opened directly.

`gh` is **not installed on this machine**, so the PR usually cannot be opened for you. That does not
change the obligation, it just means the link is the compare URL and the title and body come with
it, ready to paste:

```
https://github.com/lordlebu/4000BCESaraswathy/pull/new/<branch>
```

Two habits that go with it, both learned by getting them wrong:

- **Push before reporting.** A link to an unpushed branch 404s. If the work is not ready to push,
  say that instead of offering a link.
- **One link, not several.** If a second branch was opened when it should have been a commit on the
  first, fix the branching before reporting rather than handing over two links and an explanation.

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
