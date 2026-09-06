# Activity scene prompts — ready to paste

Three paintings, one per gesture. They fill the top of the activity modal, above the prose.

Built the same way as species plates: put the raw generation in `assets/source/scenes/`, then the
file goes to `src/ui/scenes/<gesture>.png`. Named exactly `stoop`, `stalk`, `work` — the glob keys
on the filename and nothing else.

**These are the only three.** Unlike the plate queue there is no priority order and no backlog: the
set is finishable in one sitting. Nothing is blocked while they are missing — a gesture with no
painting opens and plays with a blank parchment panel where the picture goes.

---

## The style block

Copy this once, then append one **subject line**.

> Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE.
> Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation
> colour — nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient
> shading. Warm near-black for the darks, never pure black. A person's hands and body at work,
> seen close and from the traveller's own side — this is a moment of doing, not a portrait.
> Unhurried and calm; there is no threat in this world and nothing is in danger. Landscape
> orientation, 4:3, 1024×768 or larger. Not photographic: no lens blur, no specular highlights, no
> 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.
>
> **Subject:** *(one line from below)*

### Subject lines

**`stoop.png`**
> Two weathered hands cutting river reeds low at the waterline with a small bronze blade, a
> gathered bundle already under one arm, wet green stems and dark water below, the far bank a few
> soft strokes.

**`stalk.png`**
> Seen from behind and low: a traveller in undyed linen crouched still in tall dry grass, weight
> on one hand, watching a large grazing animal at a distance across open ground in warm afternoon
> light. The animal is small in the frame and unbothered.

**`work.png`**
> Two hands striking a river cobble with a hammerstone on a stone anvil, pale chips and dust in
> the air, a scatter of struck flakes and a half-worked nodule on the bare ground beside it.

---

## Hard requirements

Same list as the species plates, and every one is here because an asset was lost to it:

1. **No text of any kind.** A naturalist illustration *looks* like it should be labelled, so
   models add labels unprompted. This is the most likely failure.
2. **No border or frame.** The card draws its own edge; a painted one reads as a picture of a
   picture.
3. **No watermark, no signature.** A mark across the subject cannot be cropped out.
4. **Landscape 4:3**, not square — this is the one place the scenes differ from plates. The modal
   crops to 4:3 (`object-fit: cover`), so a square image loses its top and bottom.
5. **Lossless PNG**, not JPEG.

## Two things worth knowing

**The traveller has no fixed face.** Five travellers are playable and any of them may be the one
gathering, so keep the person's face out of frame — hands, a shoulder, a back. This is why every
subject line above is framed close or from behind. It is a constraint that happens to produce the
better composition anyway.

**`stalk.png` is the least urgent of the three.** A stalk prefers the animal's *own* plate when one
exists, because the animal is the subject; the gesture scene is its fallback. So painting more
fauna plates does more for the stalk modal than painting `stalk.png` does.

## Tool notes

From the plate round, unchanged: **Grok** fixed everything it was asked to. **Gemini** adds painted
frames and ink outlines and needs the no-border clause repeated. **ChatGPT** is closest to correct
out of the box but sizes oddly. All three need the no-text clause.
