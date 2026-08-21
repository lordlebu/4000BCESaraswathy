# Endgame plan — getting the game to look like `endgame.png`

`endgame.png` (repo root, untracked) is the target frame: a painted wetland seen from above, a
figure standing in it, five parchment chips along the top, and a torn field-notebook page across
the bottom carrying a species plate.

This is what it would take to get there from where the game actually is today. The current frame
this was read against was captured from a dev server on `feat/solarpunk-spoken`, not from
`docs/images/screenshot.png`, which is two art generations out of date.

## Where this stands

| Phase | State |
|---|---|
| 00 · the direction call | Settled — painterly, and worth reopening (above) |
| 01 · resolution and the grid | **Shipped** — PR 66, 67 |
| 02 · density, water, fog | **Shipped** — PR 68 |
| 03 · the notebook page | **Shipped** — PR 69 |
| 04a · the plate work queue | **Shipped** — PR 70 |
| 04b–05 · painting the plates | Open, and now purely art |

What remains that is *not* art: the contact shadow and ambient light (item 7), and the shoreline
pass (item 4). Both are code and neither waits on anything.

Two companion documents came out of building it, and both hold things this plan got wrong:
`docs/rendering.md` for how the map is drawn and how to measure it, and `docs/art-direction.md` for
which art rules have actually been tested.

## The good news first

**The information architecture is already right.** Every element in the target exists in the
shipped game: Notes / Travel / Diary / Met / Map chips top-left, `+` and `−` top-right, a bottom
surface with the place name, an ambient "you can make out …" line, a letterspaced `CREATURES`
heading, an italic sighting line, and a plant section. Nothing in the target implies a mechanic
this game does not have. **The gap is entirely presentational**, and it is entirely on this side
of the repository line — canon owns the nouns, and none of the work below touches one.

That is worth stating plainly because it changes the shape of the plan. This is not "design the
game we meant to make". It is a rendering and styling programme against a design that is done.

---

## The decision that has to come first

`docs/art-brief.md` commits this project, in writing, to **cozy colour e-ink**: crisp pixel art,
flat colours per pixel, no gradients, **no drop shadows**, muted and matte, dithering welcome.
`tools/build-terrain.js` and `tools/build-sprite-sheet.js` exist to *enforce* that — they resample
painted source art down to a 32-pixel cell and quantise it onto a 40–48 colour palette.

`endgame.png` is the opposite of that brief. It is watercolour: soft gradients inside every shape,
ambient shading under every mass, a contact shadow under the figure, and no grid anywhere.

These cannot both be the direction. **Pick one, and amend `docs/art-brief.md` in the same commit**,
because every asset generated after this point is prompted from that file.

The recommendation here is to **take the painterly direction**, because `endgame.png` is the frame
this game is trying to be and there is no version of reaching it that keeps flat colour per pixel.

**An earlier draft of this plan justified that differently, and was wrong.** It claimed the painted
originals already existed in `assets/source/` and that the pipeline was throwing them away — that
the art had been paid for and only the build step stood between it and the screen. It had not.
Those files are 2048×2048 and 1–3 MB, which reads like painting; opening them shows pixel art drawn
large. `wetland.png` is a flat `#8fada8` field with hard-edged eight-pixel reed glyphs, and a
400×400 sample of most of the set finds only 439–1,400 distinct colours, from PNG noise rather than
gradients.

The consequence is a real cost, and it lands on the largest item in Phase 01: **eleven terrain
textures have to be generated**, which moves that work out of the code column and into the
art-bound one this plan calls unschedulable. The resolution raise was still worth doing on its own
— tiles now carry their real detail instead of a 2.5× upscale — but it buys sharpness, not paint.

**And with Phases 01 and 02 shipped, the recommendation above is worth reopening.** What has
actually closed the gap to the target frame is sharper tiles, blended edges, a scatter layer and
better points of interest — none of which required painted terrain. The eleven generations remain
the most expensive item on the board for the least certain gain, and the thing that fixed the
forest was a better canopy rather than a different medium. The direction is defensible on the
target frame alone; it is not defensible on cost, and it should be chosen deliberately rather than
drifted into. See `docs/art-direction.md`.

The one thing to keep from the old brief is the **palette**. The target frame sits comfortably
inside the existing paper/ink/biome swatches: muted, warm, low-saturation. That part was right.

---

## What is actually different, item by item

Read against the current frame, in rough order of what each one costs and what it buys.

### 1. The grid is visible, and in the target there is no grid at all

The loudest difference. Every tile in the current frame is a hard-edged opaque square with a seam on
all four sides, and where two biomes meet the boundary is a staircase. In the target, water becomes
bank becomes meadow with no straight line anywhere.

Three separate causes, needing three separate fixes:

**1a. The art is being upscaled 2.5× with bilinear filtering.** `TILES_ACROSS` is 16, so on a
1280-wide viewport a 32-pixel tile is drawn at roughly 80 pixels. `PhaserGame.tsx` sets no
`pixelArt` and no `roundPixels`, so Phaser 4's default linear filter smears every tile. This is the
muddiness in the current frame and it is a **one-line finding**: as shipped, the art is neither
crisp pixel art nor painted, but a blur of both. Under the pixel-art brief the fix is
`pixelArt: true`. Under the painterly brief the fix is to stop shipping 32-pixel art.

**1b. Raise `TILE_SIZE` from 32 to 96 or 128** and re-run `tools/build-terrain.js` at the new cell
size with the `quantise` step dropped for terrain. The source resolution is there — 2048² down to
128² is still a 16× reduction. Mechanically this is contained: `TILE_SIZE` is one exported constant
in `src/game/tileTextures.ts`, and the other cell sizes (`places` 32×40, `huts` 20×22, overdraw and
features 32×32) scale with it in `loadTileSheets` and `frames.ts`. Expect to fix the tests that
assert frame geometry; that is the contract being renegotiated, the same way `THRESHOLDS` is.

**1c. Blend the biome edges.** This is the real work and the thing that actually removes the grid.
Draw the ground as it is drawn now, then add **one layer above it** in which each tile draws its
*neighbours'* materials through a soft, irregular alpha mask. Where wetland meets plains, plains
bleeds into the wetland cell along a torn edge instead of stopping at it.

The mask set is generated, not painted — a handful of soft-edged noise masks per edge configuration,
built in `tools/` exactly the way `build-overdraw.js` generates grass, because a soft irregular
gradient is something a loop states precisely and an image model does not. What varies is *which*
neighbour, and that is data the plan already holds.

This belongs in **`src/game/scenePlan.ts`**, which is already the pure, Node-testable function from
a world to a list of placements. A blend layer is more placements. The rule holds: what to draw is
tested under Node, how to draw it is a dozen lines in the scene.

**1d. Tile variants.** Three or four per biome, so a field of plains does not repeat on an 80-pixel
beat. Cheap once 1b is done — crop four different regions out of the same 2048² source.

### 2. There is no fog in the target, and the current fog is the least finished thing on screen

`FOG_UNKNOWN` is 0.92 — near-opaque dark quads, hard-edged, one per tile, over roughly two thirds of
the current frame. It does more to make the game look unfinished than any missing asset.

The target shows a fully painted, fully visible scene. Two ways to reconcile that, and the choice is
a design one:

- **Drop fog on authored field maps.** The maps are hand-made, six points of interest each; the
  thing being discovered here is the *diary*, not the terrain. Fog is a procedural-world idea that
  arrived with the landmark loop.
- **Keep it, but as light rather than as tiles.** One soft radial mask centred on the traveller
  instead of 4,096 quads: unexplored ground reads as beyond the lamp, not behind a wall.

Either is a small change to `setFog` / the reveal path. Keeping the per-tile quads and merely
lowering the alpha is the option that will not work — the hard square edges are the problem, not
the darkness.

### 3. The scene is empty where the target is dense

Count the discrete objects in the target frame: lily pads, lotus flowers, reed clumps at three
scales, scattered rocks, a snail, a heron, low bushes, a shrine post, a chest, a pot. Around forty,
none centred in a cell, none on the same beat.

The current frame has generated grass blades (`build-overdraw.js`) and rare trees
(`build-features.js`, about one tile in twelve), all centred or offset by a fixed constant, all on
the grid.

This wants a **decor layer**:

- A new sheet, and a `decorPlan` alongside the existing plan in `scenePlan.ts`.
- **One to four props per tile, with sub-tile jitter.** The jitter is the whole point — it is what
  breaks the beat. Deterministic, from `tileHash`, so the seed contract holds.
- Depth-sorted by row, into the band `depthFor` already manages.
- Per-biome prop tables in **`data/biomes.json`**, already the one place per-biome art data lives.
  No hardcoded tables in TypeScript (rule 4).
- The occlusion bargain from `build-features.js` extends here and is the test: a prop may not hide
  the traveller. Props are small and sit low; anything tall stays rare and offset.

Art cost: roughly six to ten props across eleven biomes, so 60–80 small alpha sprites. They are
simple masses — a lily pad, a rock, a reed clump — which is the category that has generated cleanly
in this project every time. Trees and the bee colony are the category that has not.

### 4. Water

In the target, water is a painted teal with lily pads on it, reeds standing at its edge, and land
dissolving into it. In the current frame it is a flat blue speckle with a hard border.

Mostly falls out of 1c and 3. What it additionally wants is a **shoreline pass** — reeds and foam
placed on the *land* side of every water edge — and a slow shimmer, which the existing two-frame
`swayFrame` mechanism already supports without new machinery.

### 5. The notebook page

The best ratio of effort to result in the whole plan, because it is CSS and one component.

Deltas, read straight off the two frames:

| Target | Today |
|---|---|
| torn deckled edge, paper texture | flat rounded rectangle |
| a tab on the right edge | none |
| flower dingbat before the title | none |
| heavy serif title, strong weight contrast | light, low contrast |
| a bordered **species plate** with a painted illustration | text only |
| small leaf / creature glyphs beside names | none |
| italic ambient line, letterspaced small-caps heading | **already correct** |

The deckle is a `mask-image`; the grain is a repeating overlay; the tab and the dingbat are markup.
`src/ui/styles.css` and `JournalPanel.tsx`, and nothing in `src/game/` moves.

### 6. Species plates, and how not to drown in them

The plate is the element that most makes the target look like a finished game. It also has a long
tail behind it: the canon bundle holds **219 encounter fauna and 78 flora** that can appear in play.

Do not attempt 297 illustrations.

- **Ship the fallback first.** `SpeciesIcon.tsx` already draws a derived silhouette for every plant,
  coloured by the ground it grows on. Extend that to fauna via `bodyPlanOf`, and the plate slot is
  never empty. Every real plate that arrives afterwards improves something that already reads as
  finished — which is the only way a long tail is survivable.
- **Tiering by reachability does not work, and the script now says so.** This was the plan's idea
  and it is wrong: between them Dwarka, Lothal and the Narmada Plateau cover **ten of the eleven**
  biomes — everything but `landmark` — so all 297 placeable species are reachable and the filter
  removes nobody.

  `tools/reachable-species.js` therefore ranks by **how often** a player meets one instead: each
  biome's share of a map, divided by the competition for that ground, weighted by rarity. The
  weighting is not optional — the engine expands each species by `RARITY_WEIGHT`, so a mythic holds
  one pool slot where a common holds twelve, and the first unweighted version put nine Asura
  conjurations in the top twenty-five fauna. `test/adapterCoverage.test.ts` pins the copied
  constant.

  What that buys, as a share of all encounters:

  | Plates painted | Fauna covered | Flora covered |
  |---|---|---|
  | top 20 of each half | 47% | 33% |
  | top 40 | 63% | 55% |
  | top 60 | 73% | 74% |
  | top 100 | 85% | 90% |

  **Forty fauna and sixteen flora covers roughly half of everything a player will ever meet.** That
  is the tier-one list, and it is a work queue rather than a guess.
- **Plates are game assets, keyed by canon id.** They live in `assets/`, not in the canon bundle,
  and canon gains no `illustration` field. A picture is a view, and views belong here. That is the
  noun/verb test from the canon repo, applied.

### 7. Chips, figure, and light

- **Chips.** The target's are parchment-filled with a brown border and *drawn* icons — a book, a
  compass rose in a diamond, a closed book, a heart-shaped pouch, a folded map. Today they are cream
  pills with Unicode glyphs (`✒ ◇ ✎ ❧ ☰`). Five small icons and some CSS.
- **The figure.** In the target he is larger relative to the tile and has a soft contact shadow that
  sits him on the ground. Today he stands on a square. A contact shadow is an ellipse — and also
  explicitly forbidden by the current art brief, which is the decision above arriving again.
- **Light.** `WorldScene` already draws a `sky` rectangle above the fog and the player for the hour
  tint. That is the seam for a warm paper grain and a slight vignette: one more layer at the same
  depth, and the frame stops looking like flat sprites.

---

## Phases, as branches

`CLAUDE.md` is explicit that this repo batches — the browser suite is slow, so one branch, one PR,
several commits. These are five PRs, not twenty.

**PR 1 — Direction and the grid.** Amend `docs/art-brief.md`. Fix the filtering. Raise `TILE_SIZE`,
rebuild the sheets, fix the geometry tests. Land the edge-blend layer and its masks. *This is the PR
that changes what the game looks like; everything after it is refinement on top.*

**PR 2 — Emptiness.** Decor layer, sub-tile jitter, per-biome prop tables, shoreline pass, water
shimmer. Plus the fog decision, whichever way it goes.

**PR 3 — The page.** Notebook styling, chip icons, the species plate slot with the derived-silhouette
fallback, contact shadow, grain and vignette. All DOM and one scene layer; cheap, and it is what
makes a screenshot look like the target.

**PR 4 — Plates, tier one.** The reachability script, and the first batch of real illustrations.

**PR 5 onward — Plates, rolling.** Batched, because each browser run is expensive and a plate drop
breaks nothing.

---

## Two things that will bite

**Performance — settled, and not where this expected.** Written as a warning that the sprite count
would bite. It did not. The largest map carries 17,650 objects and runs at **7.0 ms a frame — about
143 fps — on real hardware**. There is no performance problem and no `RenderTexture` rewrite is
needed.

Getting to that answer cost a strategic detour worth recording. Frame time was measured in headless
Chromium, which renders WebGL through SwiftShader in software: it reported 67 ms, a crisis was
declared on that number, and a renderer rewrite onto Phaser tilemaps was recommended. The game had
been running at 143 fps throughout. **Launch headed to measure rendering, and print the renderer
string to prove which one you got** — see `docs/rendering.md`.

The useful half is the inverse: **CI is software-rendered**, so it does experience the 67 ms frame.
That is why walk-heavy specs began missing their 90-second budget when the decor layer landed. Read
a CI browser failure as *the scene got heavier*, not as *the game is slow*. Culling and the
half-tile decor cell earn their place on that basis alone.

And the lever, when one is needed, is **fill rate rather than object count**: frame cost tracks
canvas area almost linearly and is nearly flat against zoom. Ask what fraction of a new layer's cell
is actually opaque.

**The e2e suite is on your side here, once.** `e2e/game.spec.ts` asserts the composited PNG does not
compress like a flat fill — more detail can only help it. But `layout.spec.ts` and the zoom specs
reason about tile geometry, and `TILE_SIZE` moving will break them honestly rather than quietly. Fix
them inside PR 1 rather than deferring.

## What this plan does not touch

Canon. Not one entity, not one schema, not `data/canon/`. Every item above is a verb or a view. Also
untouched: `journey.ts` and every rule in it, the save payload and `SAVE_VERSION`, the landmark loop
(kept deliberately), and `feat/react-upgrade`, which stays abandoned.
