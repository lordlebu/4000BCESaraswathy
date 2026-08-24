# Art Brief — South of Tethys

> **Where to put what comes back:** raw generations go in `assets/source/` if a tool reads them, or
> the git-ignored `assets/source/dump/` if they were rejected. Anything nobody's code opens — a
> reference frame, a mood board — goes in the git-ignored `dump/`. See *Where an art file lives* in
> `docs/art-direction.md`.
>
> Context for why any of this is shaped the way it is:
> **[Repainting South of Tethys](https://claude.ai/code/artifact/2ee2b8c5-e1e5-429a-ba41-334576ce8ba0)** — the rendering programme, closed August 2026, with the
> measurements behind each decision. Private artifact; ask the repo owner if the link 404s.

Copy the prompt blocks below into an image model. The **Hard requirements** section is the part
that matters most: the current sprite had registration guides baked into the artwork, which no
amount of cropping could remove.

---

## The game, in one paragraph

**South of Tethys: Jambhudweepa Adventure** is a cozy 2D top-down exploration game set in an
invented ancient South Asia — river deltas, monsoon forest, ochre hill country, a highland spine,
and a warm sea to the west. The player wanders a tile map on foot, reads a travel journal about the
terrain and the creatures and plants of each tile, and records a landmark. **There is no combat and
no threat.** Creatures are observed, not fought. The feeling to aim for is a quiet afternoon walk
with a sketchbook.

## Art direction: painted field study

**This section was rewritten, and the previous direction is gone.** The brief used to ask for
*cozy colour e-ink* — crisp pixel art, flat colour per pixel, no gradients, no drop shadows. That
was a real direction, honestly pursued, and everything in `assets/` today is the result of it.

It was abandoned because `endgame.png`, kept in the git-ignored `dump/`, is the frame this game is trying
to be, and it is watercolour. Everything below describes that frame.

**What is in `assets/source/` today is not painted, and it is worth being exact about this**, because
the mistake was nearly written into this document as a justification. The eleven terrain sources are
2048×2048 and 1–3 MB each, which reads like painting and is not: `wetland.png` is a flat `#8fada8`
field with hard-edged eight-pixel reed glyphs and blue blobs on it — pixel art drawn large. Sampling
a 400×400 region of each finds 439–1,400 distinct colours in most, and those come from PNG noise
rather than from gradients; only `river` and `desert` have real internal variation.

So the terrains **still have to be generated** as paint. `tools/build-terrain.js` was not destroying
painting; it was faithfully reproducing what it was given. The resolution raise to 128 was worth
doing on its own — tiles carry their real detail instead of a 2.5× upscale — but it buys sharpness,
not paint.

**Two of the eleven improved without generating anything**, by taking a better candidate that was
already sitting in `assets/source/dump/` — see the provenance section below. `wetland` and `forest`
are now the denser ChatGPT versions rather than the sparse Gemini ones. They are still pixel art;
they are simply much better pixel art, and worth having while the painted set is prompted.

Think a **watercolour field study in a naturalist's notebook**, not a screen at all:

- **Muted, low-saturation colour.** Unchanged, and the one thing carried over whole. Every hue
  reads as though slightly washed. No neon, no pure saturated primaries, nothing that glows.
- **Warm paper base**, never pure white. Off-cream, the colour of good sketchbook paper.
- **Gentle contrast.** Darks are a warm near-black (a deep plum-brown), not `#000000`.
- **Soft gradients within a shape are correct**, and are the point. A reed bed is lighter where
  the light falls on it. This is the direct reversal of the old rule.
- **Ambient shading under every mass.** Where a bush meets the ground there is a soft darkening.
  Where the figure stands there is a contact shadow. Both were previously forbidden; both are now
  required, because without them everything reads as pasted on.
- **No visible grid, at any zoom.** Nothing in the frame may reveal where one tile ends and the
  next begins. This is the hardest requirement in the document and the one most likely to be
  broken accidentally — see Asset 2.
- **Visible brush and pigment.** Edges that vary, pigment pooling slightly darker where a stroke
  ends, the granulation real watercolour leaves on paper. Irregularity is the texture.
- **Hand-drawn warmth** over technical polish. Unchanged, and now easier rather than harder.

What is *not* welcome, and would have been fine before: dithering, visible stipple, hard pixel
edges, anything that reads as a display rather than as paper.

Reference palette already in the game — new art should sit comfortably beside these:

| | |
| --- | --- |
| paper | `#fff6df` |
| ink | `#34263a` |
| sea | `#2f6f8f` |
| coast | `#e8c982` |
| plains | `#9fc96b` |
| forest | `#4f9a5a` |
| wetland | `#6fb7a8` |
| hills | `#b89b58` |
| mountains | `#8d8796` |
| desert | `#d9a95f` |
| river | `#4fa3d9` |
| settlement | `#c46b4f` |
| landmark | `#f2d16b` |

If anything, pull these **slightly further toward desaturated**. The palette survived the direction
change unchanged, because it was never the part that was wrong.

---

## Which assets this direction applies to

The change is **ground and objects, not figures**. That is a deliberate split, not an oversight.

| Asset | Direction | Why |
| --- | --- | --- |
| 2 · terrain tiles | **Painted**, 128×128 | Rebuilt from the 2048² source, see below |
| 2b · `lava_field` | **Painted**, 128×128 | Still blocked, still blocking content |
| 3 · landmarks | **Painted**, 128×128 | Objects standing on painted ground |
| *new* · decor props | **Painted** | Lily pads, rocks, reeds — see Asset 5 |
| 0 · walk cycle | **Pixel, unchanged** | `build-sprite-sheet.js` and its 22-colour palette stay exactly as they are |
| 1 · player (superseded) | **Pixel, unchanged** | Historical; kept for the post-mortem |
| 4 · NPC portraits | **Pixel, unchanged** | 32×32 in a DOM panel, never composited onto ground |

**The figures stay pixel art on purpose.** The sprite pipeline works, it cost three attempts to get
working, and the frames are 1.3 KB. A painted figure would also have to survive being drawn at
26×40 over painted ground, which is the hardest legibility problem in the project and buys the
least. Varuna reads as a drawn figure in a painted world — which is what `endgame.png` shows.

**Prompt blocks below Asset 2 that still say "cozy colour e-ink" and "crisp pixel art" have not
been converted.** For Assets 0, 1 and 4 that is correct and they should be used as written. For
Asset 2b and Asset 3 it is not — those need the painted prompt from Asset 2, adapted. They are
left unconverted rather than half-converted so it is obvious which is which.

---

## Hard requirements (this is where the last asset went wrong)

1. **Transparent background.** PNG with a real alpha channel. Not white, not a checkerboard drawn
   as pixels.
2. **No guides of any kind in the image.** No centre cross, no rule of thirds, no dashed alignment
   marks, no grid, no margin ticks, no ruler, no bounding box, no watermark, no signature, no
   caption or label text. The previous sprite had a vertical and horizontal centre line drawn
   straight through the character and it could not be cropped out.
3. **One subject, centred, filling the frame**, with only a couple of pixels of transparent
   padding. No mockup, no "presentation" framing. *A soft contact shadow directly beneath the
   subject is now wanted* — what is still forbidden is a rendered "plate", pedestal or reflection
   the subject is standing on.
4. **Large, and painted.** Ask for the biggest square the model will give you — 1024×1024 or
   2048×2048. The build step downsamples; it cannot invent detail that was never there. This is
   the direct reversal of the old requirement, which asked for crisp blocky pixels at a small
   stated size.
5. **Soft shading within a shape is correct.** Gradients, blended edges and pigment variation are
   what makes this read as paint. What is still forbidden is *photographic* rendering: no lens
   blur, no specular highlights, no 3D render, no plastic sheen.

---

## Where the art came from, and what was rejected

`assets/source/dump/` holds every candidate three image models produced — ChatGPT, Gemini and Grok
attempting the same subjects. It is **git-ignored**: 211 MB, and nothing builds from it. Only
`assets/source/` is read by `tools/build-terrain.js`. Keep the dump locally; it is the provenance
record and the place to look before generating anything new.

What the comparison settled, measured rather than eyeballed — colour count and the share of
horizontally adjacent pixel pairs that are identical, sampled from the middle of each image:

- **The Gemini terrains are the sparse ones.** `Gemini_Wetlands.png` is 82% flat pairs and 2,144
  colours: a bare field with a few reed glyphs. It hash-matches what shipped as `wetland.png`.
- **The ChatGPT terrains are denser and shaded.** `ChatGPT Wetlands.png` has five times the colour
  count and real pools; `monsoon forest canopy.png` has 28,579 colours against Gemini's 2,106 and
  only 3% flat pairs.
- **The Grok points of interest are smaller and carry a watermark.** Roughly 700×900 against
  ChatGPT's 1122×1402, and each has around 800 opaque light-grey pixels spelling "Grok" in the
  bottom-right corner. That is a real defect and this document's second hard requirement forbids it.

  **Their alpha is fine, though**, and an earlier version of this section said otherwise. It claimed
  the transparency checkerboard was painted into the opaque pixels — the failure that ruined
  `Varuna_new.png`. It is not: sampling the corners returns alpha 0, and the 61% transparent figure
  is genuine. The checkerboard is what an image *viewer* draws behind transparency, and reading a
  screenshot of a viewer as if it were the file is exactly the mistake that made the terrain sources
  look painted when they were pixel art. **Measure the alpha channel; do not look at the picture.**

So the current set is: **ChatGPT for most points of interest and for wetland and forest**, with
Kavik Tower deliberately kept as the Grok version — a tower half-buried in its own sand drift says
"silted" better than a clean building does, which is the whole point of that place. Its watermark
was stripped: 799 pixels, selected by being near-neutral and bright inside the bottom-right corner,
where the artwork is tan sand and nothing legitimate is grey.

When a subject needs regenerating, check the dump first — the alternative may already exist and be
better than what is in play.

### The forest floor, tried and rejected

Worth recording so it is not proposed a third time. The forest tile read as swampy — a mid-green
mottle too close to the wetland's, so two very different grounds looked alike. One diagnosis was
that a canopy is not ground at all: it is a thing at head height, and painting it into the floor
means the trees are everywhere and nowhere, with no trunks and no clearings. So the ground was
rebuilt as a *forest floor* — humus, leaf litter, roots, dappled light, generated in a tool — with
the tree density raised fourfold so the features layer supplied the wood.

It worked as designed and looked worse. Held up against the alternatives it is a brown tile, and a
brown forest beside a brown hill costs more separation than the green-on-green it fixed. The tool
and its output were deleted rather than left dead; `git log` has them.

**What actually fixed it was a better canopy**, not a different subject:
`ChatGPTmonsoon forest canopy.png` has distinct crowns and enough tonal range to read as woodland at
tile size, where the previous source was flat mottle. The lesson is the one this document keeps
relearning — when a tile is not working, suspect the art before the architecture.

---

## What went wrong with the first two attempts

Worth reading before generating again — both failures were in the *file*, not the drawing.

| Attempt | Problem | Why it could not be fixed in code |
| --- | --- | --- |
| `Varuna.png` | Registration guides — a centre cross — drawn **across the figure** | You cannot crop out a line that sits on top of the character |
| `Varuna_new.png` | The transparency checkerboard painted on as **opaque grey squares**, and the art **lossily compressed** | The checker greys are close enough to the artwork's greys that keying it out bites into the figures — it split 6 characters into 8 fragments. And compression turned a clean ~7px pixel grid into 27,000 colours and 3,422 one-pixel runs, which is what "hazy" looks like |

So, in priority order:

1. **Save as a real PNG with a real alpha channel.** Empty space must be *nothing*, not grey squares.
   If the tool only offers a checkerboard preview, export rather than screenshot.
2. **Lossless.** No JPEG, no "optimised" or "compressed" export. Solid blocks of colour must stay
   solid.
3. Everything in **Hard requirements** above still applies.

## Asset 0 — walk cycle, the thing actually needed now

Four directions, as **four separate PNG files** rather than one sheet. Separate files remove all
ambiguity about which pose is which — the last sheet had six poses and no way to tell front from
three-quarter.

| File | Pose |
| --- | --- |
| `varuna-down.png` | facing the viewer (walking toward camera) |
| `varuna-up.png` | seen from behind (walking away) |
| `varuna-right.png` | side view, facing right |
| `varuna-left.png` | side view, facing left — or skip it, the game mirrors `right` |

> **Prompt (change the facing each time):**
> Single pixel art sprite of an elderly travelling scholar for a cozy top-down exploration game,
> **facing [the viewer / away from the viewer / to the right]**. Wide-brimmed soft blue hat, deep
> muted indigo robe, grey beard, brown boots, satchel strap, wooden staff. Cozy colour e-ink
> palette: muted desaturated colour, warm off-cream highlights, warm near-black outlines instead of
> pure black, matte and flat. Exactly 26 pixels wide by 40 pixels tall, true pixel art, every pixel
> a flat solid colour, hard edges, no anti-aliasing, no gradients, no dithering inside the figure.
> Save as lossless PNG with a genuine alpha channel: the background must be fully transparent, not
> a grey checkerboard. No grid, no guide lines, no centre cross, no alignment marks, no drop shadow,
> no border, no text, no watermark. One centred figure filling the frame, feet at the bottom edge.

If the model insists on producing something large, that is still fine **as long as it is lossless
and the blocks are clean** — `tools/build-sprite-sheet.js` resamples any size down to the game's
grid by taking the most common colour per block, which keeps edges hard. Keep the 26:40
proportions though: a squarer source is drawn as a stockier figure than the cell wants.

## Asset 1 — the player (superseded by Asset 0 above)

**Varuna, a travelling scholar.** Currently: an older figure with a grey beard, a deep blue robe
and a wide-brimmed blue hat, brown boots and satchel straps, carrying a wooden staff. Keep that
character; the ask is a clean version in the e-ink palette, not a redesign.

> **Prompt:**
> Top-down-facing pixel art sprite of an elderly travelling scholar for a cozy exploration game.
> Wide-brimmed soft blue hat, deep muted indigo robe, grey beard, brown leather boots and satchel
> strap, wooden walking staff in one hand. Standing, facing the viewer, calm and unhurried. Cozy
> colour e-ink palette: muted desaturated colours, warm off-cream highlights, warm near-black
> outlines rather than pure black, matte and flat with no glow. 24 pixels wide by 32 pixels tall,
> crisp pixel art, flat colour per pixel, no anti-aliasing. Fully transparent background. No grid,
> no guide lines, no centre cross, no alignment marks, no shadow, no border, no text, no watermark.
> Single centred figure filling the frame.

**Also useful, same style and same canvas size, as separate images:** a side-facing walk pose
(facing right — the game mirrors it for left), and a seated or resting pose for arriving at a
landmark.

## Asset 2 — terrain tiles

**All eleven need generating**, against the painted direction. The versions in `assets/source/` are
pixel art drawn at 2048² — see the direction section above — so they are the right subjects at the
wrong medium, and are worth opening for reference before prompting.

`sea` · `coast` · `plains` · `forest` · `wetland` · `hills` · `mountains` · `desert` · `river` ·
`settlement` · `landmark`

**Tiles are 128×128, not 32×32.** They were 32 because the old direction wanted pixel art; at 32
they were drawn at roughly 80 pixels on a 1280-wide viewport and upscaled 2.5×, which is why the
game looked soft whatever the source. `tools/build-terrain.js` already emits 128 and already takes
the painted path — averaging rather than picking one colour per block, and no palette snap — so a
new source drops in with `node tools/build-terrain.js` and nothing else.

**Three rules specific to tiles.** The first two are unchanged and were learned the hard way from a
generated set that had to be thrown away. The third is new and is the whole reason this direction
is harder than the last one:

1. **No border, frame, or outline around the tile.** A model asked for a "tile" very often draws a
   framed square. A dark edge on every cell turns the map into graph paper and is the least cozy
   thing the screen can do. The tile must read as a continuous surface with nothing marking where
   it stops.
2. **Keep the interior quiet.** Low internal contrast, no strong highlights, no single feature
   demanding attention. These sit under the player and repeat hundreds of times — texture, not
   illustration.
3. **Quiet is now doing two jobs, and it is the harder one.** Under the old brief, flat tiles kept
   the figure legible for free. Painted tiles do not: detail under the player measurably hurt
   figure legibility, which is what the old brief recorded and it was right. The resolution is that
   **detail belongs in the decor layer, not in the ground** — props are placed objects with known
   positions that can be kept away from the figure, whereas a busy tile is everywhere at once.
   Keep the ground close to a wash. A tile that looks slightly boring on its own is correct; it is
   never seen on its own.

**Give the model the hex directly.** The values below are the existing biome colours pulled toward
the e-ink direction — chroma cut to about 55%, values compressed into a narrow band. Asking in
prose for "desaturated" gets ignored; a hex does not.

| tile | base colour | subject |
| --- | --- | --- |
| `sea` | `#2f6f8f` *(kept dark — see below)* | calm warm shallow sea |
| `coast` | `#c9b587` | pale shell and sand shore |
| `plains` | `#9eb582` | open warm grassland |
| `forest` | `#769f7c` | monsoon forest canopy |
| `wetland` | `#86aba4` | reed marsh with shallow pools |
| `hills` | `#ab9d7c` | rolling ochre hill country |
| `mountains` | `#96919c` | lavender-grey rocky peaks |
| `desert` | `#bea47b` | gold dust desert with low stones |
| `river` | `#7ba3c0` | river water running over stones |
| `settlement` | `#b18577` | cluster of clay-roofed huts seen from above |
| `landmark` | `#d8c48c` | a memorable place, a small shrine platform |

**`sea` is deliberately the exception.** It is the only non-walkable biome, so the player has to be
able to tell it from land at a glance. Everything else sits in a tight value band; sea stays darker
and a little more saturated than the rest. Do not soften it into the others.

> **Prompt (swap the subject and the hex each time):**
> Seamless top-down watercolour terrain texture of **[monsoon forest canopy]** for a cozy
> exploration game set in ancient South Asia, painted in a naturalist's field notebook. Base colour
> approximately **[#769f7c]**, with only gentle variation around it. Muted desaturated palette,
> warm paper undertone, gentle contrast, visible paper grain and pigment granulation. Soft blended
> edges and gentle gradients within shapes. Quiet all-over texture, low internal contrast, no single
> focal point — this repeats hundreds of times under the player and must not compete with him.
> Tiles seamlessly on all four edges. **No border, no frame, no outline around the edge** — the
> surface must continue past the edges with nothing marking where it stops. No grid lines, no guide
> marks, no text, no watermark. Not photographic: no lens blur, no specular highlight, no 3D render.
> 2048×2048.

**Regenerate only what is missing or wrong.** The eleven in `assets/source/` were painted for the
old brief but were painted, not pixelled — most should survive the direction change with a rebuild
rather than a reprompt. Look before you regenerate.

### Asset 2c — the three that need repainting, and the rule that changed

**Stop asking for a seamless tile. The pipeline guarantees it now.**

The prompt above asks for "Tiles seamlessly on all four edges", it has asked for that from the
start, and **every tile came back not tiling**. Measured as the brightness jump across a tile
boundary over the jump between ordinary neighbouring columns — 1.0× is invisible, past about 2.5×
reads as a line — seven of the nine ground biomes seamed, hills at 8.4× and forest at 9.5×. Only
`plains` and `coast` were clean, and only because their marks are 2–5 px, too small for a cut edge
to sever anything visible.

That is now fixed in `tools/build-terrain.js`: the four variants are wrapped and cross-faded onto a
shared 16 px border, so all sixteen pairings meet the same edge by construction. Hills is 0.8×.
`test/frames.test.ts` asserts it and fails on the old sheet.

**So seamlessness is no longer the artist's problem, and asking for it wastes a sentence the model
was ignoring anyway.** What the pipeline cannot do is invent a subject. That is what these three
prompts are for.

#### Why these three, specifically

| tile | seam after the fix | what is still wrong |
| --- | --- | --- |
| `hills` | 0.8× — perfect | **It is not hills.** A flat field of soft diagonal ripples: no slope, no ground plane, no consistent sun. Seamless, and reads as sand. |
| `forest` | 1.8× | Canopy blobs about half a tile across, so it reads as lumps rather than foliage. Also the lowest contrast range in the set (39 of 255). |
| `mountains` | 2.8× — the only one still visible | The one swatch with a genuine painted lighting gradient, **17 levels top to bottom**, plus a 6.3-level tone spread between crops. Lit from above like a picture, which no tiling ground can be. |

The other six are fine on the swatches already in the repository. **Do not regenerate them.**

#### The rule the old prompt was missing

The old prompt said "keep the interior quiet" and meant contrast. The real constraint is *scale*,
and it is the one thing that separated the two clean tiles from the seven broken ones:

> **No feature in the image may be larger than about a twelfth of its width.**

Measured on the built tiles, seven biomes sit at 2–7 px and the two worst offenders do not:
**`hills` is 18 px and `forest` 12 px**, against a threshold of about 11. (`mountains` measures
5 px — scale is not its problem, the lighting gradient is.)

This survives the border fix as a quality rule rather than a correctness one: a big feature still
repeats visibly across a field even when the edges match, because the *same shape* appears in
every tile.

A landform cannot be drawn into a ground texture. **Hills gets its shape from objects on the decor
layer** — scree, boulders, twigs, already wired for `hills` in `tools/build-decor.js` and currently
unused. The ground's job is to be believable dirt, and nothing more.

#### Three rules for all three prompts

1. **Flat, even lighting. No sun direction, no cast shadows, no vignette, no darkening at any
   edge.** This is what `mountains` gets wrong. A repeating texture lit from one side becomes a
   field of identically-lit patches, which is worse than a seam because it cannot be fixed in code.
2. **No feature larger than a twelfth of the width.** At 2048 that is about 170 px. Measure the
   biggest single shape, not the average.
3. **Fill the frame edge to edge.** No border, no frame, no vignette, no paper edge, no margin.
   The pipeline crops a 70% centre square, so anything decorative at the rim is wasted anyway.

---

> **Prompt — `hills` (`assets/source/hills.png`)**
>
> Top-down aerial view of **dry ochre hill-country ground: fine gritty soil, scattered small
> pebbles and grit, sparse patches of dry tussock grass, faint bare-earth scuffs** — a cozy
> exploration game set in ancient South Asia, painted in a naturalist's watercolour field notebook.
> Base colour approximately **#ab9d7c**, with only gentle variation around it. Muted desaturated
> palette, warm paper undertone, visible paper grain and pigment granulation, soft blended edges.
>
> **Flat even lighting from directly above. No sun direction, no cast shadows, no highlights, no
> vignette, no darkening toward any edge.** This is ground seen from straight overhead, not a
> landscape.
>
> **Every mark must be small: no feature larger than about 1/12 of the image width.** Many small
> scattered marks of varying size, evenly distributed, with no clustering and no empty regions. No
> hills, no ridges, no dunes, no slopes, no horizon, no large waves or ripples — this is the
> *surface* of the ground, not its shape.
>
> Quiet all-over texture, low contrast, no focal point. Fills the frame edge to edge. No border, no
> frame, no outline, no grid, no text, no watermark. Not photographic: no lens blur, no specular
> highlight, no 3D render. 2048×2048.

*Note the subject change.* The old swatch tried to draw hills — the landform — into a ground tile.
This asks for **what the ground of a hill is made of**, which is what a top-down tile can actually
show. The hills themselves come from the decor layer.

---

> **Prompt — `forest` (`assets/source/forest-canopy.png`)**
>
> Top-down aerial view of **dense monsoon forest canopy: many small overlapping leaf clusters,
> fine-grained foliage texture, occasional narrow dark gaps between crowns** — a cozy exploration
> game set in ancient South Asia, painted in a naturalist's watercolour field notebook. Base colour
> approximately **#769f7c**, with gentle variation around it and slightly more tonal range than a
> flat wash — a mix of deeper green shadow between clusters and lighter green on the leaves.
>
> **Flat even lighting from directly above. No sun direction, no cast shadows, no vignette, no
> darkening toward any edge.**
>
> **Leaf clusters must be small: no single crown or clump larger than about 1/12 of the image
> width.** Many small crowns rather than a few large ones, evenly distributed, no clustering and no
> empty regions. No individual trees, no trunks, no branches, no clearings, no paths.
>
> Quiet all-over texture, no focal point. Fills the frame edge to edge. No border, no frame, no
> outline, no grid, no text, no watermark. Not photographic: no lens blur, no specular highlight,
> no 3D render. 2048×2048.

*The one place to push contrast slightly.* Forest is the flattest tile in the set — a 39-level
range where others have 90–110 — which is why it reads as lumps rather than leaves. More tonal
range *within small marks* is wanted; more contrast between large shapes is not.

---

> **Prompt — `mountains` (`assets/source/mountains.png`)**
>
> Top-down aerial view of **high rocky mountain ground: broken grey stone, angular scree and rock
> fragments, patches of coarse grit, thin cracks in bare rock** — a cozy exploration game set in
> ancient South Asia, painted in a naturalist's watercolour field notebook. Base colour
> approximately **#96919c**, a cool lavender-grey, with only gentle variation around it. Muted
> desaturated palette, warm paper undertone, visible paper grain.
>
> **Flat even lighting from directly above. Absolutely no sun direction, no cast shadows, no
> highlights on one side of anything, no vignette, and no gradient from top to bottom or side to
> side.** The previous version was painted 17 levels brighter at the top than the bottom, which is
> the single worst thing a repeating ground texture can have.
>
> **Every rock and fragment must be small: no feature larger than about 1/12 of the image width.**
> The previous version already got this right — keep it. No peaks, no ridges, no cliffs, no
> summits, no horizon, no snow caps: this is the *rubble underfoot* at altitude, not a mountain
> seen from a distance.
>
> Quiet all-over texture, low contrast, no focal point. Fills the frame edge to edge. No border, no
> frame, no outline, no grid, no text, no watermark. Not photographic. 2048×2048.

*Same subject inversion as hills.* A mountain cannot be drawn top-down in a tile the player stands
on; the ground at altitude can.

---

#### Checking what comes back, before committing it

Drop the file into `assets/source/` and run the pipeline — then read the two numbers, because both
failures are invisible to the eye until the map is walked:

```bash
node tools/build-terrain.js      # rebuilds assets/terrain.png from the swatches
npx vitest run test/frames.test.ts   # asserts every variant pairing tiles, and that they differ
```

If the seam test fails, the art has something the border fix cannot absorb — almost always a
lighting gradient. If the *variety* test fails, the swatch is too uniform to be worth four
variants. Neither is a judgement of the painting; both are cheap to re-prompt with one rule
tightened.

### Asset 2b — `lava_field`, the twelfth tile (blocked, and blocking content)

`lava_field` is the one biome canon names that the engine cannot draw, and it is not a nicety:
**forty species live in the Ganges Lava Sea, and thirty-six of them are currently filed under
`mountains`** because there was nowhere better to put them. Canon now names the right ground;
the engine filters it straight back out, because a biome with no tile is not renderable.

Until this tile exists those species keep `mountains` alongside `lava_field` — deliberately, since
a species left with no drawable ground stops being placed in the world at all. **Once the tile
lands, tell the canon side and the pairing gets undone**, and the basalt plains become real
places you can stand on.

The region, in canon's own words: active volcanic rifts that cool and solidify into vast jagged
black basalt plains and lava fields, where magma meets ocean. Its fauna are armoured and
heat-resistant, often fused with volcanic minerals — obsidian carapaces, gastropods that build
shells out of basalt and metallic ore.

> **Prompt:**
> Seamless top-down 32×32 pixel art terrain tile of **cooled black basalt plain, cracked and
> jagged, with a dull ember glow deep in the fissures** for a cozy exploration game set in
> ancient South Asia. Cozy colour e-ink palette: muted desaturated colour, warm paper undertone,
> gentle contrast, matte and flat, faint paper grain. The glow is warm but restrained — this is
> a quiet dangerous place, not a fire effect. Tiles seamlessly on all four edges. Crisp pixel
> art, flat colour per pixel, no anti-aliasing. No grid lines, no guide marks, no border, no
> text, no watermark, no drop shadow.

Making it renderable is two steps once the PNG exists: add the tile in
`src/game/tileTextures.ts`, and set `renderable: true` on `lava_field` in the canon repo's
`database/biomes.json`, then re-export. Both are needed — the flag is what `src/content/canon.ts`
filters on.

## Asset 3 — landmarks

Seven kinds, each **32×32**, one transparent PNG each. These are the destination — arriving at one
is the end of a session and the emotional beat the whole slice is built around — so they earn more
detail than terrain does.

**How these differ from terrain:** a landmark is an *object standing on ground*, not ground. It
must have a transparent background so it can be drawn over whatever tile it happens to occupy, it
does **not** need to tile seamlessly, and it should have a clear silhouette that reads at a glance.
The one thing it shares with terrain is the no-border rule.

The descriptions below are the game's own words from `data/landmarks.json` — the journal tells the
player exactly this, so the art needs to match it rather than reinterpret it.

| file | stands on | what the player is told they see |
| --- | --- | --- |
| `landmark-great-banyan.png` | forest, plains | One tree has become a grove. Aerial roots have come down and taken hold until the trunk cannot be told from its children, and the shade beneath is cool enough to sleep in. |
| `landmark-hot-spring.png` | hills, mountains | Water comes up out of the rock steaming, gathers in a shallow bowl worn smooth, and goes off down the slope as a thread of mist. |
| `landmark-shell-beach.png` | coast | The tideline here is entirely shells, banked knee-deep and rattling with each wave, white and pink and the occasional deep violet. |
| `landmark-hill-shrine.png` | hills, forest, plains | A low platform of fitted stone, open to the weather, with a shallow dish worn into the top step by however many hands. |
| `landmark-standing-stones.png` | mountains, desert, hills | Seven stones set upright in a rough ring, tall as a person and leaning now, with the ground between them swept bare by wind. |
| `landmark-heron-pool.png` | wetland, river | A still backwater screened by reeds, the surface unbroken except where insects touch it, and herons standing in it like they were planted. |
| `landmark-salt-pan.png` | desert | A dry white plain, cracked into plates the size of hands, glaring under the sun and giving back the heat of it. |

> **Prompt (swap in one description):**
> Top-down 32×32 pixel art of a single landmark object for a cozy exploration game set in ancient
> South Asia: **[one tree that has become a grove, aerial roots come down and taken hold until the
> trunk cannot be told from its children, cool shade beneath]**. Seen from directly above, sitting
> on open ground. Cozy colour e-ink palette: muted desaturated colour, warm paper undertone, gentle
> contrast, matte and flat, faint paper grain. A clear readable silhouette — this is the
> destination and the player should recognise it immediately. **Fully transparent background**, so
> it can be drawn over any terrain; no ground plate, no base tile, no circle or square of ground
> under it. No border, no frame, no drop shadow. Crisp pixel art, flat colour per pixel, no
> anti-aliasing. Lossless PNG with a genuine alpha channel. No grid lines, no guide marks, no text,
> no watermark.

Two of these are ground-like and worth a note. **Shell beach** and **salt pan** describe a *stretch
of ground* rather than an object; draw them as an irregular patch with soft edges that fades to
transparent, not a hard-edged square, so they sit on the coast or desert tile without cutting a
rectangle out of it.

## Asset 4 — NPC portraits

Ten people, each a small portrait. **This is new capability, not a replacement**: NPCs currently
have no art at all and appear only as text in `PlacePanel.tsx`. That makes portraits the right ask
and overworld NPC sprites the wrong one — a portrait drops into the panel that already exists,
whereas walking NPCs need renderer work that has not been written.

**Size: 32×32**, transparent PNG, head and shoulders, facing the viewer. Same palette and drawing
style as the character sheets.

These people are the heart of the writing, so the brief matters more here than anywhere else. Two
things to hold on to:

- **Nobody here is a wise elder or a quest-giver.** They are working people with jobs on, caught
  mid-task. Canon is pointed about this — Marn is "pointedly not a wise elder — he is a working
  herder with a job on."
- **No fantasy costuming.** Ordinary ancient South Asian working clothes: undyed linen and cotton,
  simple wraps, sun-worn skin, practical. The player character's blue robe is distinctive precisely
  because everyone else is plain.

| file | who | drawing note |
| --- | --- | --- |
| `npc-thrali.png` | Thrali, fisher | Delta fisher. The first person the player can help. Weathered, middle-aged, salt-bleached wrap. |
| `npc-uma.png` | Uma, roofer | Keeps the camp's roofs on. Caught mid-job, reed bundle or cut reeds to hand. |
| `npc-bekh.png` | Bekh, keeper of what is left | The one who stays because somebody has to. Older woman, plain, unsentimental. |
| `npc-sura.png` | Sura, bone-picker | Four hundred years of stratigraphy as a family trade. Practical, dusty, unbothered. |
| `npc-marn.png` | Marn, herder | A working herder, *not* a sage. Sun-squint, staff, animals somewhere off-frame. |
| `npc-pell.png` | Pell, wall-keeper and sweeper | Sweeps an interdimensional gate as municipal maintenance. Broom. Entirely matter-of-fact. |
| `npc-okhi.png` | Okhi, senior copyist | The one who will not come, and is right not to. Older scholar, ink-stained, certain. |
| `npc-vessa.png` | Vessa, junior archivist | Already most of the way to the answer and cannot say so acceptably. Younger, alert, holding back. |

> **Prompt (swap in one person):**
> Small pixel art portrait, head and shoulders, facing the viewer, of **[a weathered middle-aged
> delta fisher in a salt-bleached linen wrap]** for a cozy top-down exploration game set in ancient
> South Asia. An ordinary working person caught mid-task, not a hero and not a wise elder — plain
> undyed linen and cotton, sun-worn, practical, no jewellery or ornament, no fantasy costume.
> Calm and unhurried; there is no threat in this world. Cozy colour e-ink palette: muted
> desaturated colour, warm off-cream highlights, warm near-black outlines rather than pure black,
> matte and flat. 32 pixels by 32 pixels, crisp pixel art, flat colour per pixel, hard edges, no
> anti-aliasing, no gradients. Lossless PNG with a genuine alpha channel — fully transparent
> background, not a grey checkerboard. No border, no frame, no vignette, no drop shadow. No grid,
> no guide lines, no centre cross, no alignment marks, no text, no watermark.

At 32×32 a portrait is roughly eight pixels of face, so **silhouette and colour do the work** —
headwear, hair shape, and what they are holding are what distinguish one person from another, not
facial detail. If a person needs to be recognisable, give them one strong identifying shape.

---

## Delivering them back

Drop the files in `assets/` and tell me the filenames. Notes for wiring them up:

- **Tiles** go in as a swap inside `src/game/tileTextures.ts`, which is written so real art
  replaces the generated colour-and-glyph textures without `WorldScene.ts` changing at all.
- **The player** replaces `assets/Varuna.png`. If the new sprite is clean and already small, I will
  delete `src/game/playerTexture.ts` — it exists only to average the baked-in guides out of the
  current asset.
- **Please keep each file small.** The current `Varuna.png` is 418 KB for one sprite and dominates
  the whole download. A true 24×32 sprite should be well under 2 KB.

---

## Where the character art stands

`assets/source/Varuna_walking.png` and `assets/source/Mithra.png` are the current sheets: two
characters, each sixteen figures in four rows of four. Both rebuild with `npm run build:sprite`.

The layout was measured rather than assumed, and the measurements are worth keeping because they
are how a future sheet should be checked too:

- the back row carries almost no skin-toned pixels, which is what identifies it;
- the two profile rows match each other at 71–78% when one is mirrored but only 52–61% as-is, so
  they are a genuine left/right pair rather than one row used twice;
- the face sits right of the body's centre in row 2 and left of it in row 3, which settles which is
  which;
- within a row, frames 0 and 1 barely differ below the waist while 2 and 3 move the legs, so 0/1
  are the passing pose and 2/3 are the contacts.

Row order is therefore **down, up, right, left**, and the walk plays contact-pass-contact-pass.
Nothing is mirrored at runtime: mirroring a hand-drawn walk moves the satchel to the other
shoulder, which reads as a different person on alternate steps.

These two sheets are also the first that needed no cleaning at all — real alpha, no guides, no
checkerboard. The anti-aliased edges from the emboss are handled by point sampling and the palette
snap.

### `Guyuk_walking.png` — held for later, and not yet verified

A third sheet is in `assets/source/`: sixteen figures of a steppe archer in a fur-lined cap, with a
bow, a quiver and silver braids. It is **not built and not wired into anything** — `CHARACTERS` in
`src/game/player.ts` still holds only Varuna and Mithra.

It is kept because canon has the character. `character_guyuk` in the SouthOfTethys repository is a
**teenage Tushara nomad girl**, epithet *Mongke* — which is where the original filename came from —
of `epoch_migrations`, who opens the crimson portal to Naraka Lok and alters her own bloodline
doing it. That places her in the deep-lore layer the game keeps `placement: "lore"` and inert, so
there is nowhere to put her yet; when there is, the art already exists.

**Two things to settle before building it**, because it does *not* pass the checks above that
Varuna's sheet passes:

| Check | Varuna | Guyuk |
| --- | --- | --- |
| Back row identified by skin-toned pixels | 1,389 against 5–6k — unmistakable | 16.9k against 25–28k — no clear minimum |
| Profile rows are a mirrored pair | 78% mirrored against 74% as-is | 52% mirrored against 56% as-is |

Neither result is evidence the sheet is *wrong*. The first is explained by the character: her
braids and fur brim are pale enough to swamp a skin-tone test that works on a dark-robed scholar.
The second is not explained, and means the row order and the left/right pairing **cannot be assumed
to be down-up-right-left** — settle both by eye before running the builder.

What it does have: a real alpha channel, 66.9% transparent, no checkerboard and no guides, at
1312×1199. So it is clean art of unverified layout, which is a much better position than the first
two attempts this document exists to describe.


Varuna's sheet is two source images concatenated — `Varuna_walking.png` for walking and
`Varuna_sitting.png` for resting — so one texture carries all 32 frames. The sitting sheet uses the
same four-row order, confirmed the same way: 5 skin-toned pixels in its back row against ~115 in the
others, and the face right of the body's centre in one profile row and left in the other.

Seated figures come out slightly shorter than standing ones, which is right. It falls out of the
aspect ratio rather than being tuned: fitting each figure into the same cell puts the seated pose at
about 38 pixels against 40 for standing.

### Still missing

1. **Sitting for Mithra.** Varuna rests at the landmark; Mithra has a walk sheet only. Not urgent
   while she is unwired, but the pair should match once she has a role.
2. **A "writing in the journal" pose**, seated with the book open. The arrival is the emotional beat
   of the whole slice, and it is currently carried by the prose and a seated figure. One frame
   facing the viewer would be enough.

> **Prompt:** One pixel art frame of the same character **seated on the ground facing the viewer,
> writing in an open book on their lap**, for a cozy top-down exploration game. Same character, same
> palette, same scale and drawing style as the existing sheets. Lossless PNG with a genuine alpha
> channel — transparent background, not a grey checkerboard. No guides, no grid, no text, no
> watermark.
