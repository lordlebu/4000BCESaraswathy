# Species plate prompts — ready to paste

Copy the **style block** once, then append one **subject line** per plate. Every subject line below
is built from canon's own words for that species, so the picture and the field note agree.

Order matters and is not alphabetical: it is the order a player meets them, from
`node tools/reachable-species.js --top=40`. Painting the first twenty fauna covers roughly **47%
of every creature encounter in the game**; forty covers 63%. Nothing is blocked while they are
missing — the panel draws a derived silhouette for all 297 species — so these can arrive one at a
time, in any quantity, and each one immediately replaces a silhouette.

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

## Fauna — the first twenty

| # | File name | Subject line |
|---|---|---|
| 1 | `plate-caravan-dromedary.png` | A single-humped desert camel of the northern trade routes, chewing sideways, regarding the viewer with the patience of an animal that has walked further than you have. Dry hardpan and a low dune behind. |
| 2 | `plate-desert-fox.png` | A small fox with enormous ears, sitting alert on a low dune at dusk, watching a road out of frame. Sandy ochres, long shadows. |
| 3 | `plate-hill-macaque.png` | A macaque sitting on a stone wall at a village edge, caught mid-glance, looking studiedly innocent. Hill scrub and a hint of thatch behind. |
| 4 | `plate-honey-guide-bird.png` | A small brown bird perched on a thin branch, beak open mid-call, head turned back as if waiting to be followed. Dappled forest edge. |
| 5 | `plate-cliff-swift.png` | A swift in flight, wings swept into a long scythe shape, banking above plateau grass. Pale sky, a suggestion of cliff below. |
| 6 | `plate-plateau-wolf.png` | A lean highland wolf at a steady trot across open ground, seen side-on, not hunting — following a line. Dry upland grass, distant hills. |
| 7 | `plate-delta-monitor.png` | A long-bodied monitor lizard nosing along the ground beside wooden fish-drying racks, unhurried and entirely unbothered. Mangrove fringe. |
| 8 | `plate-mangrove-crab.png` | A heavy crab picking between arching mangrove roots, one claw raised high like a man carrying something awkward. Brackish mud and water. |
| 9 | `plate-painted-deer.png` | A small deer standing in tall grass, watching the viewer, its coat patterned with pale markings like fallen petals. Warm meadow light. |
| 10 | `plate-scythian-wild-ass.png` | A wiry wild ass of the northern steppe, standing side-on, built for stamina rather than speed. Dry open plain, big sky. |
| 11 | `plate-saltwater-gator-turtle.png` | An ancient armoured turtle with a heavily ridged shell like crocodile hide, half-submerged in a brackish delta canal. |
| 12 | `plate-monsoon-crane.png` | A tall white crane stepping carefully between reeds, head lowered as if reading the water. Grey rain-light. |
| 13 | `plate-delta-egret.png` | A white egret standing in shallow water, body folded tight like a closed umbrella, beginning to straighten. Reed flats. |
| 14 | `plate-canopy-langur.png` | A grey long-tailed leaf-monkey sitting on a high branch, looking down with an expression of mild disapproval. Forest canopy. |
| 15 | `plate-shell-turtle.png` | A turtle resting where river sand meets the tide, its shell covered in a map of old scratches. Wet sand, shallow water. |
| 16 | `plate-river-otter.png` | A freshwater otter rolling through shallow water, leaving rings of silver on the surface. Reeds and river stones. |
| 17 | `plate-steppe-plumed-elephantbird.png` | A very large flightless bird with long decorative plumes, standing tall on coastal grassland. Imposing but entirely calm. |
| 18 | `plate-cloud-antelope.png` | A slender pale antelope on a high ridge, standing in drifting mountain mist. Cool greys and thin light. |
| 19 | `plate-vindhya-leopard.png` | A leopard lying along a warm basalt ledge, relaxed, tail hanging. Dry hill scrub. Not snarling, not stalking. |
| 20 | `plate-basalt-cliff-hornbill.png` | A large hornbill with a heavy casqued bill, perched on a dark basalt outcrop. Highland cliff behind. |

## Flora — the first eight

Plants are drawn the same way, but **whole plant or a characteristic branch**, not a specimen
pressed flat, and rooted in the ground it grows on.

| # | File name | Subject line |
|---|---|---|
| 1 | `plate-saltreed.png` | Tall shoulder-high estuary reeds standing in brackish flood water, the kind cut for marsh-hut thatch. Grey-green, wind-leaned. |
| 2 | `plate-neem.png` | A neem tree shading a field edge, dense with small bitter leaves, grain sacks stored in its shade. |
| 3 | `plate-tamarind.png` | A tamarind tree leaning over a road, dark pods hanging like fingers, the earth beneath swept smooth by people who sit there. |
| 4 | `plate-asura-thorn.png` | Dense hooked scrub grown as a living fence, thorns prominent, on pale disturbed ground. Slightly unwelcoming. |
| 5 | `plate-bonewood-mangrove.png` | A mangrove with naturally curved, bone-pale hard timber and arching stilt roots, on a dark volcanic coast. |
| 6 | `plate-wild-indigo.png` | A scrubby wild indigo bush on dry upland ground, small leaves, a few deep blue-purple flower spikes. |
| 7 | `plate-mahua.png` | A flowering mahua tree of the dry plateau at night, pale blossoms falling and scattered on the ground beneath it. |
| 8 | `plate-iron-teak.png` | A tall dense highland teak, broad leaves, straight heavy trunk — timber cut for river craft and tower beams. |

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

Drop the files anywhere in the repo and say where. Then:

- **Plates** go to `assets/plates/`, keyed by the file names above. There is no build step for them
  yet — that gets written when the first batch arrives, and it is small.
- **Chip icons** go to `assets/source/` and are folded into a sheet the way the others are.
- Anything rejected goes in `assets/source/dump/` rather than being deleted. That directory is the
  provenance record, and auditing it once already improved twelve assets for the cost of choosing a
  different file.

**Do not worry about consistency between batches.** These are seen one at a time in a small panel,
never side by side, so a plate that is slightly off-key is worth far more than a plate that does not
exist. Send whatever comes out well and keep going down the list.

If a subject comes back wrong twice, skip it and move on — it keeps its silhouette, and that is
exactly what the fallback is for.
