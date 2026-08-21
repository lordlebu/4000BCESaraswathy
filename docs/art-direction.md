# Art direction — the rules, and what they cost

`docs/art-brief.md` is the prompting document: what to ask an image model for, and the failures that
shaped each request. This is the layer above it — **why the art is the way it is**, which decisions
are settled, and which are still open.

Read this before proposing a change of direction. Two have been proposed and one was reverted; the
reasoning is here so a third does not repeat either.

## Where the direction actually stands

**Ground and objects: painted. Figures and portraits: pixel art.** That split is deliberate and is
recorded in `art-brief.md` as a table.

**But the ground is not painted yet.** What ships today is high-resolution *pixel art* at a 128
grid, and it looks good. The eleven painted terrains the direction calls for do not exist and would
have to be generated. That is the largest open item in the programme and the least certain.

### The premise for the change was false, and it matters

The direction changed from *cozy colour e-ink* to *painted field study* on the argument that
`assets/source/` already held eleven 2048² painted terrains which the build step was throwing away —
that the art had been paid for and only the pipeline stood in the way.

It had not. Those files are pixel art drawn large: `wetland.png` is a flat `#8fada8` field with
hard-edged eight-pixel reed glyphs, and sampling a 400×400 region of most of the set finds 439–1,400
distinct colours, from PNG noise rather than gradients. `build-terrain.js` was never destroying
painting — it was faithfully reproducing what it was given.

The direction can still be argued for on the target frame itself. It cannot be argued for on cost,
and **the honest current position is that the painterly terrain is unjustified until someone wants
it enough to pay for eleven generations.** What has actually improved the map so far — sharper
tiles, blended edges, scattered props, better points of interest — required none of it.

## The five rules that have held

These are the ones this project has tested rather than assumed.

### 1. Generate textures. Prompt silhouettes.

The single most reliable rule here, first written into `build-features.js` and confirmed every time
since.

- **Generated cleanly:** grass blades, edge masks, seventeen decor props, a forest floor, an
  anthill, a boulder, stepping stones, driftwood, a cactus. All *masses and textures* — things a
  loop can state exactly.
- **Failed when generated:** a neem tree drawn with ellipses is a green disc on a stick. Bamboo,
  palm, pine, mangrove and the bee colony are still placeholders wanting real art.

The test is whether the thing is defined by its **silhouette**. A lily pad is an ellipse with a
notch, so a loop wins. A tree is a shape you recognise, so an image model wins and a loop cannot.

### 2. The ground is quiet; the objects carry the interest.

Terrain repeats hundreds of times under the traveller and must not compete with him. Detail belongs
in placed objects, which have known positions and can be kept out of his way.

This is why the decor layer exists and why it was the change that most improved the map.

### 3. Keep the palette. It was never the part that was wrong.

The paper/ink/biome swatches in `art-brief.md` survived the direction change unchanged and should
survive the next one. Every asset that has looked wrong here looked wrong for *structure* — a
silhouette, a projection, a value range — never for hue.

### 4. Suspect the art before the architecture.

The forest tile read as swampy. The diagnosis was architectural: a canopy is not ground, it is a
thing at head height, so the ground should be the *forest floor* with trees as objects. That was
built — generated floor, tree density raised fourfold — and it worked exactly as designed and looked
worse, because a brown forest beside a brown hill loses more separation than the green-on-green it
fixed.

What fixed it was **a better canopy**: `ChatGPTmonsoon forest canopy.png` has distinct crowns and
real tonal range where the previous source was flat mottle.

The floor tool was deleted rather than left dead. `git log` has it.

### 5. Check the dump before generating anything.

`assets/source/dump/` holds every candidate three image models produced — 93 files, git-ignored,
211 MB, and nothing builds from it. It is the provenance record.

Auditing it once improved **twelve assets for the cost of choosing a different file**: nine points of
interest were shipping as small Grok assets with a visible watermark, and two terrains were sparse
Gemini versions where a much denser ChatGPT one existed. Kavik Tower is the deliberate exception,
kept as the Grok version because a tower half-buried in its own sand drift says *silted* better than
a clean building does — with its watermark stripped.

## Measure the file, not the picture

Two of this programme's wrong turns were the same mistake: **reading a rendered view as if it were
the asset.**

- The terrain sources looked painted because they are 2048² and 1–3 MB. Opening one and *measuring
  colour counts* showed pixel art.
- The Grok assets appeared to have the transparency checkerboard painted into their opaque pixels —
  the failure that ruined `Varuna_new.png`. Sampling the alpha channel returned 0. The checkerboard
  is what an image *viewer* draws behind transparency. Only the watermark was real.

Useful measurements, all cheap:

| Question | Measurement |
|---|---|
| Is this painted or pixel art? | distinct colours in a 400×400 sample; share of horizontally adjacent identical pairs |
| Is the alpha real? | sample corner pixels; count pixels with `a < 8` |
| Is there a watermark? | count near-neutral bright opaque pixels in the bottom-right eighth |
| Does a sheet's layout match the code? | count cells containing any non-transparent pixel |
| Will it upload to a GPU? | width and height ≤ 8,192 — see `docs/rendering.md` |

## The species plates, which are the real long pole

The canon bundle holds **219 encounter fauna and 78 flora** that can appear in play. One plate done
well is a session's work. **Do not attempt 297.**

The proven shape for a catalogue this size is a **derived visual grammar** with hand art reserved for
the few things a player stops and looks at:

1. **Ship the fallback first.** `SpeciesIcon.tsx` already draws a derived silhouette for every plant
   — shape from the name, colour from the ground it grows on. Extending it to fauna via `bodyPlanOf`
   means the plate slot is never empty, and every real plate that arrives afterwards improves
   something that already reads as finished. This is *code*, not illustration, and it is the highest
   -leverage art decision available.
2. **Then tier by reachability.** The three authored maps do not use all eleven biomes. Illustrate
   what can actually be met on them first — a fraction of 297.
3. **Plates are game assets keyed by canon id.** They live in `assets/`, and canon gains no
   `illustration` field. A picture is a view; views belong on this side of the line.

## Hard requirements that are not negotiable

From `art-brief.md`, restated because each was learned by losing an asset:

1. **Real alpha.** Not white, not a checkerboard drawn as pixels.
2. **No guides, no watermark, no caption.** A centre cross drawn *through* a figure cannot be
   cropped out.
3. **One subject, filling the frame.** A soft contact shadow beneath it is wanted; a rendered plate
   or pedestal is not.
4. **Large.** The build step downsamples and cannot invent detail that was never there.
5. **Not photographic.** No lens blur, no specular highlights, no 3D render.

## What is still open

- **The eleven painted terrains.** Unjustified on cost, defensible only on the target frame. Decide
  deliberately rather than by drift.
- **Real trees.** The forest features are bamboo, a bee colony and a fallen log. A convincing
  broadleaf wood needs prompted art, and the rule in §1 says a loop will not get there.
- **`lava_field`.** Canon names it and 36 species live there; there is no tile, so `canon.ts`
  filters it out.
- **`Guyuk_walking.png`.** Sixteen clean frames of a canon character, held for later. It fails both
  layout checks Varuna's sheet passes, so its row order cannot be assumed — see `art-brief.md`.
- **Whether 128 is the right grid.** It quadrupled texture memory and broke three latent
  assumptions. It also looks considerably better. Worth revisiting only with a measurement, and only
  a *headed* one.
