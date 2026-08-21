# Rendering — how the map gets drawn, and what it costs

`WorldScene` is the only file that knows Phaser exists. This is the part of it worth understanding
before changing anything: what the layers are, what each one is allowed to do, and how to measure
the cost of adding another.

## The layers, bottom to top

Six of them, and the rules between them are what stop this tangling. Three are scatter layers that
look similar and are not interchangeable — the difference is **where they sit relative to the
traveller**, and that decides everything else about them.

| Layer | Depth | Density | Relative to the player | Cell |
|---|---|---|---|---|
| **terrain** | 0 | one per tile | below | 128 |
| **edge blend** | 50 | 0–4 per tile | below | 128 |
| **decor** | row band, `underfoot` | 0–3 per tile | **below** | **64** |
| **huts / places / landmarks** | row band, `undergrowth` | sparse | row-sorted | 128 / 128×160 / 80×88 |
| **features** | row band, `undergrowth` | 1 tile in 12 | row-sorted, offset aside | 128 |
| **overdraw** | row band, `canopy` | 2 tiles in 3 | **above** | 128 |
| fog | 2000 | one per tile | above everything | 1×1 stretched |
| sky tint | 3000 | one rectangle | above everything | world-sized |

**Decor lies on the ground, so it can be dense and centred.** A stone drawn under the traveller's
boots is correct. That is the whole reason this layer is allowed one to three per tile when
features are one in twelve.

**Overdraw is waded into, so it must stay short.** Nothing above the halfway line of its cell —
grass to the knee reads as depth, grass to the chest loses the character.

**Features stand up, so they must stay rare and offset.** They may reach row 4 of the cell, which
is only survivable because you meet one occasionally and pass beside it rather than behind it.

Getting these confused is how the map becomes obstructive. `test/scenePlan.test.ts` asserts each
one separately.

## The plan/scene split

`src/game/scenePlan.ts` is a **pure function from a world to a list of placements**, free of Phaser
and tested under Node. `WorldScene` walks that list and calls `add.image`.

This is not tidiness. Three bugs reported from play in one session were all placement decisions
rather than drawing — grass over the traveller, paddy through a hut roof, a marker under salt grass
— and each is now one assertion that runs in milliseconds instead of a dev server, a scripted walk
and a screenshot.

**Put new decisions in the plan. Put only drawing in the scene.** A pixel position belongs to the
scene; "four tenths of a tile to the left" belongs to the plan.

## Culling

`cullToCamera` hides anything outside the camera's view plus a two-tile margin, and re-sweeps only
when the tile window actually changes — once a step, not once a frame.

It exists because a 64×64 map carries around **17,650 objects**: a tile, a fog quad, up to four
edge blends and up to three props per cell. Phaser submits the display list every frame whether or
not the camera is looking at it.

```
field_map_narmada: 4096 tiles | 17,650 objects
  = tiles 4096 + fog 4096 + decor 4709 + overdraw 2418 + edge-blend 1952 + features 339 + huts 33
```

## How to measure a frame, and the trap in it

**Headless Chromium renders WebGL in software.** Playwright's default headless browser reports
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …))` — a CPU rasteriser. It is roughly **ten times
slower** than the GPU a player has, and the difference is not a constant factor you can reason
around.

Measured on the same commit, same seed, same 1280×900 viewport:

| Renderer | Median frame | |
|---|---|---|
| Headless — SwiftShader (software) | **67 ms** | ~15 fps |
| Headed — Intel UHD via D3D11 | **7.0 ms** | ~143 fps |

This cost a whole strategic detour. A headless measurement was read as the game's real speed, a
performance crisis was declared, and a renderer rewrite onto Phaser tilemaps was recommended on the
strength of it. The game had been running at 143 fps the entire time.

**So: to measure rendering, launch headed.**

```js
const b = await chromium.launch({ headless: false });
// and confirm what you actually got:
gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)
```

Print the renderer string in any perf script. If it says SwiftShader, the number measures the
rasteriser, not the game.

### The corollary, which is the useful half

**CI *is* software-rendered, and that is a real constraint.** The browser job runs headless on a
runner with no GPU, so it experiences the 67 ms frame. That is why walk-heavy specs started missing
their 90-second budget when the decor layer landed, and why culling and the half-tile decor cell
were genuinely necessary — not for players, but so the suite finishes.

Read a CI browser failure as **"the scene got heavier"**, not as "the game is slow". Both fixes
still earn their place; the reasoning in the commit that introduced them does not, and is corrected
here.

## Fill rate is the thing that actually scales

Frame cost tracks **canvas area**, not object count. Measured headless, narmada, same scene:

| Viewport | Median frame |
|---|---|
| 400×300 | 17 ms |
| 800×600 | 33 ms |
| 1280×900 | 67 ms |
| 1600×1000 | 83 ms |

Almost perfectly linear in pixels, and nearly flat against zoom (0.21 → 1.25 moved it 83 → 67 ms).
So the lever is **how many times each screen pixel gets written**, not how many sprites exist.

That is why the decor sheet is on a **64-pixel cell rather than 128**. A pebble is a few dozen
pixels; in a full tile cell it is a quad over 95% transparent, and the GPU blends every one of
those pixels. With ~370 props on screen that was six million blended pixels a frame, and it doubled
the frame cost on its own.

**When adding a layer, ask what fraction of its cell is actually opaque.** If the answer is "a
little", shrink the cell.

## Optimising: the method, and every change made so far

The rule this section exists to enforce: **measure headed to know what a player gets, measure
headless to know what CI gets, and never quote one as the other.** They differ by roughly ten
times, and every wrong turn in this project's performance work came from confusing them.

### The two budgets

| | Median frame | What it constrains |
|---|---|---|
| Headed, real GPU | **7.0 ms** (~143 fps) | what the game feels like |
| Headless, SwiftShader | **67 ms** (~15 fps) | whether the browser suite finishes |

A change that costs nothing on the first can still turn the browser job red on the second. A
walk-heavy spec has ninety seconds; at 67 ms a frame it is already spending most of that on
rendering, so there is very little headroom for a new full-screen effect.

### The tool: `npm run perf`

```
npm run perf -- --save     record where you are, immediately before the change
npm run perf               measure again after it, and read the delta
```

It starts its own dev server, launches headless Chromium — the same SwiftShader rasteriser CI uses
— measures frame times, and compares against the baseline you recorded. It prints the renderer
string, so a machine that happens to give headless Chromium a real GPU is obvious rather than
silently reassuring.

**It compares the fastest frame, not the median.** A throttle spike or a background process can
only ever make a frame slower, so the minimum is the closest thing to *what this machine can do
with this scene*, and it drifts least. That is not a guess: validated by adding a full-screen pass
and taking it out again, the median read 283 → 483 → 550 ms while the minimum read 250 → 333 → 250.
The median called the restored code 33% slower than the baseline; the minimum correctly called it
unchanged.

**There is no threshold, and two attempts at one both failed.**

*A fixed millisecond budget* does not survive the machine. The same commit measured 67 ms in the
morning and 283 ms in the evening — fourfold, no code change, almost certainly heat from hours of
browser suites. Any budget tight enough to catch a real regression would have failed all evening.

*A ratio against a reference workload measured in the same run*, on the theory that when the machine
slows both slow together, is worse. Over four runs on identical code the raw frame time held within
300–383 ms while the ratio swung 0.89 to 2.16. Dividing by a second noisy measurement amplifies
noise rather than cancelling it.

So it is an **aid, not an oracle**: it reports a delta against something you recorded, and the noise
floor is 20%. Record the baseline immediately before the change — a baseline several heavy runs old
will report a regression that is really just the laptop warming up.

### How to A/B a change honestly

Both wrong turns here came from a single sample on a loaded machine, so:

1. Serve a build, then measure `requestAnimationFrame` intervals in-page and take the **median**,
   discarding the first twenty frames.
2. Do the same with the change disabled — a constant flipped, a layer hidden — rather than on a
   different commit, so nothing else moves.
3. **Repeat each side at least twice.** A single pair once read 9.3 s against 40.9 s for the same
   configuration; the machine, not the code, was the variable.
4. Print the renderer string. If it says SwiftShader, you are measuring the rasteriser.

Do **not** read pixels back from the canvas in-page to check what was drawn — the WebGL drawing
buffer is undefined after compositing without `preserveDrawingBuffer`, and it returns all zeros.
Screenshot the composited surface and analyse the PNG instead. Two measurements were silently
wrong before this was remembered.

### What has actually been changed, and what each bought

**Culling — `cullToCamera`.** Phaser submits the whole display list every frame, and a 64×64 map
carries ~17,650 objects. The tell was that frame cost tracked *map size* rather than window: 83 ms
on a 48×48 map against 133 ms on a 64×64 one. Now anything outside the view plus a two-tile margin
is hidden, and the sweep only runs when the tile window changes — once a step, not once a frame.
**133 ms → 83 ms.**

**A half-tile cell for decor.** A prop is a few dozen pixels; in a 128 cell it is a quad over 95%
transparent, and the GPU blends every one of those pixels. With ~370 props on screen that was six
million blended pixels a frame. The sheet moved to a 64 cell — a quarter of the fill, and the props
are proportionally larger, which they wanted anyway. **83 ms → 67 ms, matching `main`.**

**A vignette, added and then removed.** A soft darkening of the frame's edges. Free on a GPU and
**83 ms against 67 ms** in software — a 24% increase for the whole scene, which pushed four
walk-heavy specs past ninety seconds and turned the browser job red. It was the weakest of the
things it shipped with, so it went and the contact shadow stayed. If it returns it should be drawn
as four bands around the edge rather than one quad over the whole screen, since the transparent
middle still costs a blend per pixel.

**Sheets wrapped to 4,096 wide.** Not a speed change but a correctness one, and it belongs in the
same list because it was invisible to every test — see below.

### What was measured and found *not* to be a problem

Recording these matters as much as the wins, because a register that only ever grows teaches
nothing about its own accuracy.

- **Object count.** Predicted to triple toward ~25,000 and need `RenderTexture` baking. The largest
  map carries 17,650 objects and runs at 7.0 ms headed. No rescue was needed and none was built.
- **The edge-blend layer.** Predicted ~12,000 sprites; measured 1,952 on the largest map, over
  78–94 baked textures, because most tiles have no differing neighbour.
- **Fog quads and the sky rectangle.** Skipping them when fully transparent changed nothing
  measurable.
- **Zoom.** Frame cost is nearly flat against it — 0.21 to 1.25 moved it 83 → 67 ms — which is what
  first showed the cost is fill rate rather than visible tile count.

### The levers, in the order worth reaching for

1. **Shrink the cell** of any layer whose art does not fill it. Fill rate is what scales.
2. **Cull** anything static that the camera cannot see.
3. **Avoid full-screen passes.** Each one costs a whole canvas of blending every frame; the sky
   tint is already one, and a second was one too many.
4. **Bake combinations** rather than compositing per sprite — see the blend textures below.

## Sheets must fit in a texture

**Every sheet wraps into rows at 4,096 pixels.** `MAX_TEXTURE_SIZE` is 8,192 on ordinary hardware,
and past it the upload fails with `INVALID_VALUE: texImage2D` — the texture is never created and
every sprite drawn from it renders **black**.

This shipped. `overdraw.png` was a strip 2,208 wide when a cell was 32; moving the grid to 128
quadrupled it to 8,832, straight through the limit. Overdraw draws above the traveller, so the
symptom was black patches across the map and a player who vanished under the grass on his own tile.
Nothing warned: typecheck, 516 unit tests and 50 browser specs all passed, because a sheet's
dimensions are only a problem on a GPU.

Phaser indexes a spritesheet left-to-right then top-to-bottom, so wrapping changes no frame number
and every `*_ORDER` list in `frames.ts` still holds. `test/frames.test.ts` now asserts every sheet
is a whole number of cells and no larger than 8,192 — and counts frames by finding cells that hold
pixels, because a wrapped sheet is padded to a rectangle and capacity is only an upper bound.

## The blend textures

The edge layer draws a neighbour's terrain through a torn alpha mask. Rather than give each sprite
a Phaser mask — a `BitmapMask` costs a framebuffer and a second render pass *per object*, and a
`GeometryMask` cannot express an alpha gradient at all — the pair is baked once into a canvas
texture keyed `blend:<terrainFrame>:<maskFrame>`.

Eleven biomes by sixteen masks is 176 possible combinations; a map uses 78–94 of them. They are
built lazily at scene start and then drawn as ordinary images.

## Things that are true and easy to get wrong

- **`GRID` lives in `frames.ts`, not `tileTextures.ts`**, so a Node test can read it. When the grid
  moved from 32 to 128, three separate places had the old size baked in and none of them threw: the
  zoom fit rounded to an integer and clamped every desktop to quarter scale; the zoom step *added*
  one, which at a fractional fit is a doubling `Math.round` collapses; and the player was drawn at
  his native 26×40 on a grid four times larger. **A constant several files agree on silently is not
  one constant.**
- **Zoom limits are relative to the fit**, not absolute. They were integers because fractional zoom
  makes pixel art shimmer — true of the figure, which is still scaled by a whole number, and no
  longer true of the ground.
- **The fog is a plain quad, deliberately.** A soft-disc version was tried and reverted: overlapping
  discs bleed onto neighbours, so a cleared tile surrounded by unexplored ground collects a measured
  mean 0.26 and peak 0.49 and goes dark. Additive per-tile quads cannot be soft at the boundary
  *and* leave cleared ground clear. The real fix is a single `RenderTexture` filled once and
  **erased** through a soft brush — erasing subtracts instead of accumulating — which is a bigger
  change than a texture swap and has not been done.
