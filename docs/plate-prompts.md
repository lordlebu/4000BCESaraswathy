# Species plate prompts — ready to paste

Copy the **style block** once, then append one **subject line** per plate. Every subject line below
is built from canon's own words for that species, so the picture and the field note agree.

Order matters and is not alphabetical: it is the order a player meets them, from
`node tools/reachable-species.js --top=40`. Painting the first twenty fauna covers roughly **47%
of every creature encounter in the game**; forty covers 63%. Nothing is blocked while they are
missing — the panel draws a derived silhouette for every unpainted animal — so these can arrive one
at a time, in any quantity, and each one immediately replaces a silhouette.

**Animals only.** Plants are drawn as an emoji and are not painted at all; see below for why.

---

## The style block

> Watercolour natural-history plate from a field naturalist's notebook, ancient South Asia,
> 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted,
> low-saturation colour — nothing neon, nothing that glows. Soft gradients within each shape and
> gentle ambient shading where the animal meets the ground. Warm near-black for the darks, never
> pure black. One animal, seen side-on or three-quarter, filling most of the frame, with only a
> suggestion of its habitat behind it — a few strokes, not a landscape. Calm and unhurried; there
> is no threat in this world and nothing is snarling or hunting. Square image, 1024×1024. Not
> photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label,
> no border, no frame, no watermark, no signature, no grid, no colour swatches.
>
> **Subject:** *(one line from below)*

---

## Hard requirements

Each one is here because an asset was lost to it. From `docs/art-brief.md`:

1. **No text of any kind.** Not a name, not a scale bar, not a caption. A naturalist plate *looks*
   like it should be labelled, so models add labels unprompted — this is the most likely failure.
2. **No border or frame.** The panel draws its own; a painted one inside it reads as a picture of a
   picture.
3. **No guides, no watermark, no signature.** A line drawn across the subject cannot be cropped out.
4. **One subject, filling the frame.** No sheet of studies, no multiple poses, no size comparison.
5. **Square**, and as large as the tool will give — 1024×1024 or better. The build step downsamples
   and cannot invent detail that was never there.
6. **Lossless PNG.** Not JPEG. Solid colour must stay solid.

Background is *wanted* here, unlike the terrain and object art — a plate is a small scene, so it is
opaque and needs no alpha channel.

---

## Curating the block per tool

Three tools generating in parallel — one takes the second subject, the next takes the third — is the
right way to work this queue, and it is worth thirty seconds to know how each one fails. All three
were given the identical block for `caravan-dromedary`. They disagreed about almost everything:

| | ChatGPT | Gemini | Grok |
|---|---|---|---|
| Size | 1254 × 1254 | 2048 × 2048 | 788 × 1176 → **1024 × 1024** |
| Format | PNG ✓ | PNG, 8.4 MB | **JPEG** → **PNG** ✓ |
| Aspect | square ✓ | square ✓ | **3:2 portrait** → square ✓ |
| Watermark | none ✓ | small sparkle | **"Grok" in words** → none ✓ |
| Style | watercolour ✓ | **ink-outlined** | watercolour ✓ |
| Habitat | full ✓ | thin → **full ✓** | full ✓ |
| Border | none ✓ | **painted frame** | none ✓ |

The arrows are the second round, after the notes below were added to the block. **Grok fixed
everything it was asked to** — square, PNG, 1024, no signature — which is the useful result here:
these are prompt problems, not tool problems.

Gemini half-fixed. The habitat clause worked and the fox is standing in real desert. The
anti-outline clause did not fully take, and it found a new way to disobey requirement 2: it painted
the fox inside a **cream frame**, a flat margin about 5% of the picture on all four sides. The
build now detects and strips that — a frame is flat on all four edges and one colour, which no
plate has by accident — so it is no longer worth a re-roll. Ask anyway.

ChatGPT's went in unaltered. The other two each need one sentence added, and neither needs the block
rewritten.

**ChatGPT — use the block as written.** It is the reference: no outlines, granulated pigment, the
animal filling the frame with its habitat established in a few strokes, no signature. Nothing to add.

**Gemini — add the anti-outline and habitat sentences.** It returns a clean, confident drawing that
is *inked and then coloured*, and it leaves the subject floating on bare paper with barely a mark
behind it. Both are now covered in the shared block, but say it twice for this one:

> Painting, not illustration: no ink outlines and no line art anywhere, every edge formed by where
> one wash of pigment meets another. The animal is standing in a real place — put the ground under
> its feet and a few strokes of its habitat behind it, not blank paper.

Add the frame clause too, since it did this even though the shared block already forbids it:

> No border, no frame, no painted edge, no margin of blank paper around the picture. The painting
> runs right to all four edges of the image.

Also expect a small sparkle mark in a bottom corner and roughly 8 MB of RGBA. Neither matters — the
build step flattens the alpha, and the mark is a handful of pixels at the size this is displayed.

**Grok — pin the format down before anything else, and then it is fine.** It was the only one that
ignored *square* and *PNG* and the only one that signed its work in readable letters. Told plainly,
it complied on every count, so this is worth pasting rather than working around:

> The image must be square, 1:1 aspect ratio, at least 1024 × 1024. Save as PNG, not JPEG. Leave the
> bottom edge clear — no signature, no watermark, no tool name in the corner.

If it still comes back portrait, that is fine and nothing is lost: squaring a portrait has to discard
that height anyway, so the build takes it off the bottom and the watermark goes with it. **JPEG is the
one that actually blocks** — there is no JPEG decoder in `tools/`, and there will not be one, because
the fix is upstream and free. Re-export and drop it in again.

---

## Fauna — the first twenty

✅ = painted and in the game. **All twenty.** By the encounter ranking that is roughly **47% of every
creature a player meets**; the next twenty would take it to 63%.

Two notes carried forward from painting them:

- **The Vindhya Leopard has a human face, on purpose.** Tendua is a leopard, and the plate is a
  deliberate hint at something later. It is not a bad generation and should not be re-rolled.
- **The Monsoon Crane kept its frame.** Gemini painted one 149px thick on one edge and 2px on
  another, and the stripper crops uniformly by the shallowest edge so it declines rather than cut
  into the picture. Cosmetic, and a re-roll with the frame clause is the cheap fix if it bothers
  you.

| # | File name | Subject line |
|---|---|---|
| 1 ✅ | `plate-caravan-dromedary.png` | A single-humped desert camel of the northern trade routes, chewing sideways, regarding the viewer with the patience of an animal that has walked further than you have. Dry hardpan and a low dune behind. |
| 2 ✅ | `plate-desert-fox.png` | A small fox with enormous ears, sitting alert on a low dune at dusk, watching a road out of frame. Sandy ochres, long shadows. |
| 3 ✅ | `plate-hill-macaque.png` | A macaque sitting on a stone wall at a village edge, caught mid-glance, looking studiedly innocent. Hill scrub and a hint of thatch behind. |
| 4 ✅ | `plate-honey-guide-bird.png` | A small brown bird perched on a thin branch, beak open mid-call, head turned back as if waiting to be followed. Dappled forest edge. |
| 5 ✅ | `plate-cliff-swift.png` | A swift in flight, wings swept into a long scythe shape, banking above plateau grass. Pale sky, a suggestion of cliff below. |
| 6 ✅ | `plate-plateau-wolf.png` | A lean highland wolf at a steady trot across open ground, seen side-on, not hunting — following a line. Dry upland grass, distant hills. |
| 7 ✅ | `plate-delta-monitor.png` | A long-bodied monitor lizard nosing along the ground beside wooden fish-drying racks, unhurried and entirely unbothered. Mangrove fringe. |
| 8 ✅ | `plate-mangrove-crab.png` | A heavy crab picking between arching mangrove roots, one claw raised high like a man carrying something awkward. Brackish mud and water. |
| 9 ✅ | `plate-painted-deer.png` | A small deer standing in tall grass, watching the viewer, its coat patterned with pale markings like fallen petals. Warm meadow light. |
| 10 ✅ | `plate-scythian-wild-ass.png` | A wiry wild ass of the northern steppe, standing side-on, built for stamina rather than speed. Dry open plain, big sky. |
| 11 ✅ | `plate-saltwater-gator-turtle.png` | An ancient armoured turtle with a heavily ridged shell like crocodile hide, half-submerged in a brackish delta canal. |
| 12 ✅ | `plate-monsoon-crane.png` | A tall white crane stepping carefully between reeds, head lowered as if reading the water. Grey rain-light. |
| 13 ✅ | `plate-delta-egret.png` | A white egret standing in shallow water, body folded tight like a closed umbrella, beginning to straighten. Reed flats. |
| 14 ✅ | `plate-canopy-langur.png` | A grey long-tailed leaf-monkey sitting on a high branch, looking down with an expression of mild disapproval. Forest canopy. |
| 15 ✅ | `plate-shell-turtle.png` | A turtle resting where river sand meets the tide, its shell covered in a map of old scratches. Wet sand, shallow water. |
| 16 ✅ | `plate-river-otter.png` | A freshwater otter rolling through shallow water, leaving rings of silver on the surface. Reeds and river stones. |
| 17 ✅ | `plate-steppe-plumed-elephantbird.png` | A very large flightless bird with long decorative plumes, standing tall on coastal grassland. Imposing but entirely calm. |
| 18 ✅ | `plate-cloud-antelope.png` | A slender pale antelope on a high ridge, standing in drifting mountain mist. Cool greys and thin light. |
| 19 ✅ | `plate-vindhya-leopard.png` | A leopard lying along a warm basalt ledge, relaxed, tail hanging. Dry hill scrub. Not snarling, not stalking. |
| 20 ✅ | `plate-basalt-cliff-hornbill.png` | A large hornbill with a heavy casqued bill, perched on a dark basalt outcrop. Highland cliff behind. |

## Flora — not painted at all

**Plants are an emoji, and that is the finished answer rather than a queue nobody has reached.**

The eight flora that used to be listed here are gone. A creature plate earns its block: it is the
thing you walked out to see, and `endgame.png` frames it that way. A plant is scenery you are
naming as you pass, and the right weight for that is a character on the line — 🌳 beside *Mappa
Mundi Banyan*, 🌾 beside *Saltreed* — the size of an emoji in a sentence, because that is exactly
what it is.

It is keyed on the **growth form**, not the species, so all ninety plants in canon are covered by
thirteen entries in `FORM_EMOJI` and a new plant needs no work. `Record<GrowthForm, string>` makes
the build fail if a form is ever added without a mark.

| Form | | Form | | Form | |
|---|---|---|---|---|---|
| tree | 🌳 | palm | 🌴 | vine | 🍃 |
| flower | 🌸 | grass | 🌾 | fern | 🌿 |
| moss | 🍀 | shrub | 🪴 | root | 🥕 |
| cactus | 🌵 | seaweed | 🪸 | pitcher | 🪤 |
| unknown | 🌱 | | | | |

Two are worth knowing about if a mark ever shows as an empty box: **🪸 seaweed** (Unicode 14, 2021)
and **🪴 shrub** (Unicode 12, 2019) are the newest. Everything else is Unicode 6.0 or 9.0 and safe
anywhere. A custom glyph could replace either without touching anything but the table.

---

## Five chip icons

A different job and a different style: these are **tiny interface marks**, not paintings. They sit
in the parchment buttons along the top of the screen, currently showing Unicode glyphs.

> Simple hand-drawn icon in warm dark brown ink on transparent background, the style of a mark
> stamped in a leather-bound field notebook. Flat, no shading, no gradient. Bold enough to read at
> 20 pixels. Centred, filling the frame, a couple of pixels of padding. Lossless PNG, real alpha
> channel, 256×256. No text, no frame, no background, no watermark.
>
> **Subject:** *(one line below)*

| File name | Subject line | Replaces |
|---|---|---|
| `chip-notes.png` | An open notebook seen from above, a quill lying across it. | ✒ |
| `chip-travel.png` | A compass rose inside a diamond outline. | ◇ |
| `chip-diary.png` | A closed book with a ribbon marker hanging from it. | ✎ |
| `chip-met.png` | A small heart-shaped pouch with a drawstring. | ❧ |
| `chip-map.png` | A folded map with visible creases. | ☰ |

---

## Sending them back

**Drop the file in `assets/source/plates/` under whatever name the tool gave it, and run:**

```bash
node tools/build-plates.js          # build anything not already built
node tools/build-plates.js --list   # what it would do, without doing it
node tools/build-plates.js --force  # redo them all
```

That is the whole procedure. The build works out the species id from the file name — `ChatGPTplate-caravan-dromedary.png`
and `Gemini_plate-caravan-dromedary.png` both mean `caravan-dromedary` — squares the image, takes the
bottom edge off a portrait, resizes to 384px, and writes `src/ui/plates/<id>.png`. Nothing else needs
touching: `src/ui/plates.ts` finds the file by name and the panel starts drawing it. There is no list
to update.

Three things it will tell you rather than guess at:

- **Two files claiming one subject.** The normal case when three tools are running the same queue.
  It names them and builds neither, because the alternative is that whichever name sorts lower
  silently replaces the plate you chose. Keep the one you want, move the rest to
  `assets/source/dump/`.
- **A JPEG.** Re-export as PNG.
- **A name it cannot read.** Rename it after the species.

The raws stay on this machine — `assets/source/plates/` is git-ignored the way `dump/` is, because
fifty-six sources at 2.6 MB is 145 MB of input that nothing ships. The built 100 KB plate is what
gets committed.

**Do not worry about consistency between batches.** These are seen one at a time in a small panel,
never side by side, so a plate that is slightly off-key is worth far more than a plate that does not
exist. Send whatever comes out well and keep going down the list.

If a subject comes back wrong twice, skip it and move on — it keeps its silhouette, and that is
exactly what the fallback is for.
