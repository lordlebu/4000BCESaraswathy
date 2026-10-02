# Activity scene prompts — ready to paste

Four paintings, one per gesture. They fill the top of the activity modal, above the prose.

Resting is one of them. It is not a *gathering* gesture -- nothing is won and nothing can go wrong
-- but it is the same shape of thing: you commit, something happens, and the journal says how the
night went. Giving it the same treatment is what makes the modal read as "this is what doing
something looks like" rather than as a minigame bolted onto gathering.

Built the same way as species plates: put the raw generation in `assets/source/scenes/`, then the
file goes to `src/ui/scenes/<gesture>.png`. Named exactly `stoop`, `stalk`, `work`, `rest` — the glob keys
on the filename and nothing else.

**These are the only four.** Unlike the plate queue there is no priority order and no backlog: the
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

**`stalk-follow.png`** — following an animal, with **no animal in it**. Added 2 October 2026, on
the owner's ruling that the act should fill the card rather than the animal's plate. The plain
`stalk.png` shows a buffalo, so it could not be the picture for following a deer; this one shows
only the tracks, and the card puts the animal's own plate small in its top-right corner.
> Seen from behind and low: a traveller crouched still in tall dry grass at the edge of a light
> wood, one hand parting the stems, looking out of frame to the right where something has just
> moved. Fresh cloven hoofprints pressed into the soft ground in front of them, a bent grass stem
> still swaying. No animal anywhere in the picture.

Arrived 1260 × 848 with a pencilled border ruled about 32 pixels in from the top and left; cropped
inside it. The face is half seen in profile, which the brief asks to avoid, and was accepted as
painted.

```
node tools/build-plates.js --scenes --force --only=stalk-follow --crop=40,36,1080
```

**`work.png`**
> Two hands striking a river cobble with a hammerstone on a stone anvil, pale chips and dust in
> the air, a scatter of struck flakes and a half-worked nodule on the bare ground beside it.

Taken from Grok, which came back portrait (784×1168) with its name in the bottom corner. The 4:3
band below keeps the hammer hand, the strike and the anvil, and leaves the watermark outside it. The
raw is gitignored, so this is the only record of the framing:

```
node tools/build-plates.js --scenes --force --only=work --crop=0,220,784
```

**`stoop-sky_island.png`** — wanted. The sky islands are high ground but not climbing ground, so
they are kept out of `stoop-high` and owed their own. What is taken there is lodestone moss, prana
pollen and the bark of the aero mangrove.
> Seen from behind and close: a traveller kneeling at the grassy rim of a floating island, one hand
> steadying a pale boulder furred with silver-green moss, the other cutting a strip of it free with
> a small blade. Beyond the rim the ground simply ends — open cloud below, and other islands hanging
> small and blue in the far haze, trailing roots.

Raw into `assets/source/scenes/` as `<tool>_scene-stoop-sky_island.png`, then
`node tools/build-plates.js --scenes`.

**`rest.png`**
> Hands unrolling a woven reed sleeping mat on flat ground at dusk, a satchel and an unlit oil lamp
> set down beside it, long blue evening shadows and the last warm light low across the grass.

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

**Following an animal draws `stalk-follow.png`, with the animal's plate inset** (since 2 October
2026). It used to draw the plate alone, because the animal was judged to be the subject -- and
because `stalk.png` shows a buffalo, which would be wrong for any other animal. A fishing card does
the same with `fish.png`, whose water shows no fish. With neither painting, the plate fills the card
as before.

## Tool notes

From the plate round, unchanged: **Grok** fixed everything it was asked to. **Gemini** adds painted
frames and ink outlines and needs the no-border clause repeated. **ChatGPT** is closest to correct
out of the box but sizes oddly. All three need the no-text clause.

## Crops recorded, 2026-09-29

```
node tools/build-plates.js --scenes --force --only=stoop-weaving --crop=35,35,860
node tools/build-plates.js --scenes --force --only=work-high --crop=9,0,850
node tools/build-plates.js --scenes --force --only=rest-roof.3 --crop=0,0,1480
```

`rest-roof.3` arrived as a Grok JPEG and was re-saved as PNG before building; the JPEG is kept in
`assets/source/dump/`. `rest-none` arrived as two moments, `rest-none-midnight` and
`rest-none-dawn`: the card shows the first while the night is chosen and the second once it is over.
