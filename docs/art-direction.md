# Art direction — the rules, and what they cost

> **Mixed-art owner rule (18 November):** Inspect the element and approved references; ask if uncertain, and show new/replacement samples for selection before applying them, including code-native art. Preserve accepted exceptions. Current choices: JRPG rail bridge with proper shadow; lower road bridge retained; object shrubs/old grass; covered clay lamps. [Current delivery ledger](twin-walkway-phase.md).

> **Diary event artwork:** The Lower Courses, Stair Shaft, Flooded Undercroft and How the Tower Sat Down have dedicated 512×384 watercolors. The discovery plate shows buried wall sections and openings as evidence of the collapse. [Artwork rollout and delivery status](diary-event-overhaul-plan.md#73-coverage-inventory-and-rollout).

Use **The Lower Courses** as the visual reference for environment-led event cards. Let the
architecture, terrain, and visible evidence carry the foreground. In inhabited settings,
use at most a few small background figures where their activity helps establish the place.
Reserve foreground figures for events explicitly about a person. Match the local South of
Tethys culture and established portraits for appearance, clothing, hair, and material culture.
Use the local biome and canon flora, with varied silhouettes, scale, and spacing.

> **Cave/roads follow-up:** Yamantaka doubles in map scale; cave/cooker proportions, Maru cook reuse, sparse highland trees and masonry roads follow the simple NES direction. Cave-specific watercolor meal/sleep scenes show the traveller with both residents every night. [Exact delivery and prompts](twin-cave-roads-phase.md).

> **Approved terrain - 18 November 2026:** Muted sage is the selected cave/highland palette. Use sparse broad turf/stone patterns, stepped height/riverbank shading and soft earthy desert/grass seams, baked once into the existing ground layer. Lichen/olive are review alternatives only. [Decision, implementation and verification](twin-terrain-softening.md).

> **18 November landscape follow-up:** new shrubs explicitly use **nes jrpg sprite**, with half-size pairs at grass/desert seams and simple regular silhouettes at cliff lips. Reuse the old habitat decor. Smoke/haze/ripples are small cached voxel/pixel effects, capped and performance-checked; preserve the accepted building mix and Beedu. [Production ledger](twin-landscape-motion-phase.md).

> **18 November place-art delivery:** all 16 twin-valley stops now have individual preferred watercolor views. The 15 new panels are full-colour 512?224 PNGs, crop/resize only; the accepted courtyard stays unchanged. [Prompts, sources and delivery ledger](twin-place-views-phase.md).

> **18 November relocation:** the household now occupies the northeastern green highlands at (51,12), with a stream, foothills, bare mountains and border snowcaps. The historical POI id is preserved. See [terrain ledger](twin-highlands-jrpg-prompts.md).

## Current element-by-element direction — 17 November 2026

**This controls new art and overrides older blanket SNES / “never use NES” instructions.**
Accepted older maps and illustrations stay valid; historical production notes below are not
a request to repaint them.

| Element | Current art form | Characteristics |
| --- | --- | --- |
| Overworld people and helpers | **“nes jrpg sprite”** | Cute large round heads, small bodies, short limbs, expressive eyes, warm dark outlines and simple pixel clusters; use the carrier and approved Nemi/Mirlepa/Yamantaka as references |
| Wandering animals | **“nes jrpg sprite”** | Friendly expressive faces, recognizable ears/muzzle/bill/tail, compact bodies, proper right/left/front/back views |
| Ostrich/emu tram and new small map vehicles | **“nes jrpg sprite”** | Bird visibly pulls the carriage, clear wheels/harness/stride, genuine front/back views, existing frame sizes |
| Priest Kang and his map bust statue | **“nes jrpg sprite”** | Matching beard, headband and cloak; three simple sandstone quest stages; [prompt ledger](twin-kang-jrpg-prompts.md). Light-indigo dress; his dialogue portrait and bust event cards use the owner’s cozy watercolor reference |
| Northeast cave flags, cooker and bonfire | **“nes jrpg sprite”** | Simple 32px props with paired states; six five-day arrangements per journey month; [prompt ledger](twin-cave-jrpg-prompts.md) |
| Beedu on the map | **Small 16-bit SNES pixel sprite — sole creature exception** | Accepted art stays; curved ray wings, restrained colour ramps and tail, existing small atlas/singleton/shadow/path |
| Terrain, buildings, props, plants, boundaries | **Simple high-quality 8-bit NES-style map art** | Sparse detail and clear silhouettes/routes; quality comes from composition, layers, elevation/water separation and restrained gradient/contact shadows |
| NPC portraits and random faces | **Simple cozy watercolor and fine ink on warm paper** | Rich off-map detail; preserve age, culture and face/costume continuity. Kia: airy wraps/flowers. Kang: Priest-King reference with strong jaw |
| Mirlepa and Yamantaka portraits only | **JoJo-inspired anime in the existing earth palette** | Fair Tibetan-inspired fictional Denisovan faces and Kalash-inspired dress; Yamantaka has three heads. Their map sprites remain NES JRPG |
| Events, story/activity scenes, journey banners | **Simple cozy narrative watercolor / fine ink** | Readable moment, correct people/place and depth planes, composed for the card crop; not limited to NES detail |
| Place views | **Painted landscape watercolor** | Recognizable architecture/ecology, broad depth planes and wide-panel composition |
| Species notebook plates | **Watercolor natural-history field study** | Recognizable anatomy, warm paper and a few habitat strokes; separate from map sprites |
| UI marks, tools, categories and icons | **Existing SVG/code-native line art** | Established strokes and geometry, legible at UI size |

**Owner update, 18 November 2026:** retain the current mixture of building styles. Do not
redraw, recolour or reposition buildings in this phase. Landscape improvements are additive:
reuse suitable existing cliff/small-decor art and add sparse **“nes jrpg sprite”** dry-country
props. Keep routes, courts and cave walking space clear. Event/travel/arrival cards use the
broader-color cozy watercolor direction; the phase delivers nineteen event editions and two
travel banners. See [production ledger](twin-graphics-phase-2026-11-18.md).

Use the exact lowercase phrase **“nes jrpg sprite”** in new people, animal, tram and cave-prop prompts.
This is an aesthetic, not literal console hardware emulation. Do not add fine texture,
dithering or detailed SNES shading to those map prompts. Richer portraits/events remain allowed.

Delivery: prefer native low-resolution generation. If output is larger, crop and resize only,
preserving resulting RGBA samples; **no palette/colour reduction, quantization or dithering**.
The older quantized builds below describe legacy assets, not the current JRPG delivery path.
Track compact reproducible sources; keep large originals and review screenshots ignored.
Do not regenerate accepted Beedu during the animal/tram batch.

References: [original plan](twin-cities-art-plan.md), [people prompts](twin-overworld-jrpg-prompts.md),
[fauna/tram prompts](twin-fauna-jrpg-prompts.md).


> Picking up the art? Read **[Repainting South of Tethys](https://claude.ai/code/artifact/2ee2b8c5-e1e5-429a-ba41-334576ce8ba0)** first — the whole programme in
> one illustrated page, including what was tried and declined. Then this file for the rules, and
> `docs/plate-prompts.md` for what to actually generate. (Private artifact; ask the repo owner if
> the link 404s.)

`docs/art-brief.md` is the prompting document: what to ask an image model for, and the failures that
shaped each request. This is the layer above it — **why the art is the way it is**, which decisions
are settled, and which are still open.

Read this before proposing a change of direction. Two have been proposed and one was reverted; the
reasoning is here so a third does not repeat either.

## Colour variety — owner update, 17 November 2026

Future art should use a wider variety of colours. Cozy watercolor does not mean a uniform
sepia or yellow wash. Keep the accepted style, but give different scenes distinct palettes,
with useful warm/cool contrast and clean separation between people, architecture and landscape.

- Use varied clothing and accents: light indigo, cobalt/lapis, teal, leaf green, muted plum,
  terracotta, ochre and cream as appropriate to the scene and established character identities.
- Let water, sky, shade, vegetation and cloth retain their own hues. Warm paper and sunlight
  should not turn every material orange. Cool blue/violet shade may balance warm earth and brick.
- Select a few dominant hues plus restrained accents for each composition. Vary that choice
  between images; do not put every colour into every painting or push everything to saturation.
- Keep Kang's living dress light indigo. His carved hair/beard stay stone; the final bust's
  lapis eyes and sparse ochre/indigo paint are deliberate mineral/paint accents, not living flesh.
- Map art remains simple NES JRPG with small ramps and clear pixel masses. Wider hue choices
  do not add fine texture, extra shading steps or SNES detail. Beedu remains the accepted exception.
- Continue crop/resize-only delivery without palette reduction; accepted work is not automatically
  regenerated just to introduce this future-facing palette direction.

The owner also linked a shared ChatGPT discussion for specifics. Its contents could not be
retrieved here; this records the explicit request from this chat, not inferred quotations
or unverified rules from that linked discussion. Add any supplied excerpt to future prompts.

## Historical direction: 9 September 2026, three axes

**Corrected the same day.** The first version of this section said "solarpunk, and brighter" and
made *colour* carry the change — bright, saturated, living greens. That collapsed three independent
decisions into one and got the palette wrong. They are separated below, and the palette is the one
that did **not** move.

**This applies to new art only.** Nothing is being redrawn. Everything in `assets/` and
`src/ui/plates/` stays exactly as it is, and the direction below describes what the *next* asset
should look like, not a debt against the existing ones.

### "16-bit NES" was asked for, and those are two different machines

Worth resolving in writing, because a future reader will otherwise re-litigate it. The NES is an
**8-bit** console: three colours plus transparency per 8×8 tile, about 25 on screen from a fixed
54-colour hardware palette. It cannot express a wash, a soft gradient or a bounce light — the
hardware has nowhere to put them. **16-bit** means the SNES and Mega Drive era: 15-bit colour, up to
sixteen colours per sprite palette, and that is precisely the era of painterly, softly dithered
pixel art.

The September production direction was **16-bit, SNES-era**. Its blanket restriction on NES
wording is superseded for new overworld people, animals and trams by the current guide above.

**The pipeline already agreed with this before anyone said so.** `tools/build-sprite-sheet.js`
quantises every figure to a shared **22-colour** palette. That is 16-bit sizing. Under a real NES
constraint every sprite currently shipped would be illegal by a factor of seven.

### The three axes, and they are independent

| Axis | Setting | What it governs |
|---|---|---|
| **Pixelation** | **16-bit, SNES-era** | *How the pixels behave.* Two or three tones per material, hard edges, light dithering where tones meet, sixteen-ish colours per palette. **Changed.** |
| **Colouration** | **cozy colour e-ink: muted, desaturated, matte** | *What the colours are.* Every hue slightly washed, warm off-cream highlights, warm near-black instead of pure black. **Unchanged, and carried over whole.** |
| **Theme** | **bronze age moving directly to solarpunk** | *What is depicted and its mood.* Abundance, repair, infrastructure that works, growing things. **Changed.** |

Reading them as one is what produced the wrong first draft. A sprite can be shaded like a SNES
sprite and still be painted in a washed, matte palette — that combination is well precedented and is
roughly the register *Sword & Sworcery* and *Eastward* sit in. Nothing about 16-bit shading requires
saturated colour; the console could do either.

### Theme is a content axis, and it is the one that will misfire in a prompt

**Do not put "solarpunk" in a style block.** Image models read it as a prop list and return solar
panels, brass gauges and hanging gardens — anachronisms in a 4000 BCE setting, and canon decides
what exists here, not the renderer.

The theme belongs in the **subject** line instead, as what the picture is *of* and how it feels:
country that is being tended rather than exhausted, structures that are maintained, growth that
looks deliberate. *Bronze age moving directly to solarpunk* is a statement about the world's
trajectory — this civilisation skipping the extractive middle — and it shows up as **what is in the
frame**, not as what colour it is.

### The palette did not change, which un-does most of the first draft

Sprites keep the cozy colour e-ink palette: muted, desaturated, matte, warm off-cream highlights,
warm near-black rather than pure black. **The mixed-map problem the first draft worried about
mostly evaporates with it** — new sprites sit in the same palette as everything already in
`assets/`, so the only visible difference is that new figures are shaded with more tonal steps.

**The plates are the deliberate exception.** They are asked to be brighter, with water in motion —
see `docs/plate-prompts.md`. That is not an inconsistency: a plate is an illustration held close in
a notebook, where a sprite is 26×40 pixels on top of terrain and has to stay quiet enough not to
shout at the ground it is standing on.

### This reverses rule §3 below, deliberately

Rule §3 says *"Keep the palette. It was never the part that was wrong."* That was true when it was
written — every asset that had looked wrong had looked wrong for structure — and it is now
**overruled by preference rather than by evidence**, which is a legitimate reason and worth naming
as the actual one. The rule is kept below rather than deleted, because its reasoning still applies
to *structure*: a new asset that reads badly is still far more likely to be a silhouette or a
projection problem than a hue problem.

### Brightness is state, not style — and that resolves the whole argument

**The best version of this came last and supersedes the two above.** "Solarpunk, and brighter" is
not a palette the art is drawn in. It is **what the world becomes where Varuna has worked**:
buildings get upgraded, country gets tended, and those places brighten toward solarpunk while the
rest stays muted.

That reframes every difficulty this section has been circling:

- **The muted e-ink palette is the world's starting condition**, not an old direction to be replaced.
  It stays, and it is what "before" looks like.
- **Solarpunk brightness is the "after"**, applied per object rather than per sheet.
- **The mixed map is the mechanic, not a cost.** Two sections above worried that new bright art would
  sit badly beside old muted art. Under this reading that contrast is the entire point — you can see
  where you have been and what you have mended.
- **The global build-step brightness lift is now actively wrong**, not merely withdrawn. Lifting
  every existing sheet would erase precisely the distinction the mechanic depends on.

**The engine already does this once, which is the shape to copy.** `trackFrame(eastWest, overgrown)`
picks rail art from *world state* rather than from what the ground is made of — kept line where
something still runs, overgrown where nothing has for four hundred years. An upgraded building is
the same question asked of a hut: one thing, two appearances, chosen by what has happened to it.

So the art cost of the mechanic is **a second appearance per upgradeable thing**, not a second
palette for the game. Two routes, and neither is decided:

1. **A second frame per building**, drawn. Honest and expensive: it doubles the hut sheet.
2. **A palette shift at draw time** — the same frame, tinted and lifted toward the solarpunk end.
   Cheap, uniform, and it cannot add what a drawn upgrade would (panels, planting, repair).

Route 2 is the one to prototype, because it costs a tint and answers whether the *idea* reads before
anything is drawn twice.

**None of this is built and none of it is planned yet.** It is recorded here because it changes what
the direction is *for*: not a new look, a visible reward.

### What is left of the mixed-map cost

Much less than the first draft claimed, because the palette held. What does differ is *shading*: a
new figure carries more tonal steps than the ones drawn under the old flat-colour rule, so a fresh
sprite will read as slightly rounder beside an older one. That is a small and forgivable drift, and
it resolves as figures are replaced.

The build-step option is **withdrawn, and then withdrawn again for a better reason** — see the
section above. It existed to lift old art to a brighter palette; there is no brighter palette to
lift to, and under the progression reading a global lift would destroy the contrast the mechanic is
made of.

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

### 3. Keep the palette. It was never the part that was wrong. *(overruled 2026-09-09 — see the top of this file; kept because its argument about structure still holds)*

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

1. **Ship the fallback first.** *(Written before the marks came from canon; `SpeciesIcon.tsx` now
   reads `clade` and `growth_form` off the record rather than deriving anything.)* It already drew
   a mark for every plant
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
- ~~**`lava_field`.** Canon names it and 36 species live there; there is no tile, so `canon.ts`
  filters it out.~~ **Done.** The tile shipped, and then nothing appeared for another two months,
  because a tile makes a biome *drawable* and a stamp is what puts it on a map. See `art-brief.md`
  Asset 2b.
- **`Guyuk_walking.png`.** Sixteen clean frames of a canon character, held for later. It fails both
  layout checks Varuna's sheet passes, so its row order cannot be assumed — see `art-brief.md`.
- **Whether 128 is the right grid.** It quadrupled texture memory and broke three latent
  assumptions. It also looks considerably better. Worth revisiting only with a measurement, and only
  a *headed* one.

---

## Where an art file lives

One question sorts every picture in the repository: **what reads it?**

| What reads it | Where | Tracked |
|---|---|---|
| `src/` imports it and it ships | `assets/`, `src/ui/plates/` | yes |
| `tools/` reads it to build a sheet | `assets/source/` | yes |
| a doc embeds it with `![alt](…)` | `docs/images/` | yes |
| nothing — somebody looks at it | `dump/` | **no** |

The last row is the one that needs saying. `dump/endgame.png` is the target frame this entire
programme was measured against; it is named in three docs and three source comments and **opened by
no code path**. That is a real job and not one that needs 2.5 MB in every clone. `dump/` is
git-ignored and the file stays on disk — the same arrangement `assets/source/dump/` has always used
for rejected art, and `assets/source/plates/` for 80 MB of raw plates.

Two ways it goes wrong, both observed:

- **`git add -A` sweeps up a stray PNG.** A 6.4 MB map reached a canon commit that way, as a side
  effect of staging something unrelated.
- **Docs that name a moved file go stale silently.** `art-brief.md` said `endgame.png` was "in the
  repository root". Grep the filename after moving one.

None of this shrinks an existing clone: `.git` holds every old version of every binary, so ignoring
a file only stops new weight accruing. A history rewrite is the only thing that reclaims the rest,
and it breaks every clone and open pull request, so it is not on the table.


## Twin-valley terrain softening - 18 November 2026

Owner-requested height/bank gradients use coarse stepped pixel bands baked into the ground,
with wide irregular desert/grass transition bands. The cave meadow must be muted and lightly
patterned, not bright flat mint. The owner selected muted sage; lichen and olive remain review alternatives. See
[twin terrain softening](twin-terrain-softening.md). Keep broad NES clusters, no fine texture
or checkerboard dithering. This code-native terrain treatment does not edit accepted raster
assets, buildings, characters or painted cards.
