# Event painting prompts â€” ready to paste

Thirteen paintings, one for each kind of woven event in `data/happenings.json`. **Each block below is
the whole prompt**: copy one, paste it into an image tool, done. The first paragraph is the shared
style block from `docs/art-handover.md`, unchanged, so these sit beside the activity scenes; the
second says what every event painting has to be.

## Getting them in

Save what comes back into `assets/source/events/` under the name each block gives, then:

```bash
node tools/build-plates.js --events
```

It crops to 4:3 â€” the event card's own shape â€” and writes `src/ui/events/<name>.png` at 512 px. Add
each accepted painting to `src/ui/art-kept.json`, like all art. **Nothing waits for the set**: an
event with no painting borrows the night's scene, and failing that shows a blank band.

## What every one of them has to be

- **One painting serves every event of its kind.** `woven-tracks` is the picture for every animal's
  tracks and `woven-company` for every stranger, so none may show a particular species, a
  particular face or a particular people.
- **The traveller from behind, at a distance, or as hands.** The player may be any of five
  travellers, so the painting must not decide which.
- **A woman by default** where a figure is seen. Canon's cast is nine women of fifteen, and a
  generator's default is not â€” see "Who these people are" in `docs/art-handover.md`.
- **The five hard requirements** from the handover, every time: no text, no border, no watermark,
  the right shape, lossless PNG.

`test/docs.test.ts` fails if a kind in `data/happenings.json` has no prompt here, so a new template
arrives with its art request.

---

## The prompts

### On the road (6)

#### `woven-tracks` — Tracks across the path

Save as `assets/source/events/woven-tracks.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Fresh animal tracks pressed into damp earth, crossing a narrow footpath from one side to the other and vanishing into long grass. The tip of a walking staff and the edge of a sandalled foot at the bottom of the frame.
```

#### `woven-dropped` — Something on the road

Save as `assets/source/events/woven-dropped.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: A small bundle fallen at the side of a worn dirt road - a twist of cloth spilling a little plant fibre and a lump of red earth - with the road running on, empty, into the distance.
```

#### `woven-company` — Company on the road

Save as `assets/source/events/woven-company.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Two figures walking side by side along a dusty road, seen from behind: the traveller, and a woman with a rope-bound load on her back. Long morning shadows, open country, an easy unhurried pace.
```

#### `woven-company-again` — A face you know

Save as `assets/source/events/woven-company-again.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: On the road ahead, a figure with a loaded back has stopped and half turned, one hand lifted in greeting towards the viewer. Late morning light, fields on either side, a long way still to walk.
```

#### `woven-kindness-returned` — Kindness returned

Save as `assets/source/events/woven-kindness-returned.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: At the side of a road, one person's hands holding out a small cloth-wrapped gift towards another's open hands. Faces out of frame. Warm low light, dust in the air, a milestone of old brick behind.
```

#### `woven-weather` — Rain, mist or storm on the road

Save as `assets/source/events/woven-weather.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Weather coming across open grassland in grey sheets, the traveller small in the middle distance with a cloak pulled up over the head, one bent tree nearby offering a little shelter.
```

### At night (3)

#### `woven-night-sounds` — Something beyond the lamp

Save as `assets/source/events/woven-night-sounds.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: A small clay oil lamp turned low on the ground at night, its light fading out into dark scrub. At the very edge of the circle of light, two eyes faintly catch it. Calm and curious, not frightening.
```

#### `woven-dream` — A dream

Save as `assets/source/events/woven-dream.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: A dreamlike wash of wide empty country at first light - river channels, grass, a low sky - with no people and nothing built anywhere. Edges soft and slightly dissolving, as if remembered rather than seen.
```

#### `woven-knock` — Somebody after dark

Save as `assets/source/events/woven-knock.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Seen from inside a lamp-lit shelter at night: the low doorway, and outside it in the dark a woman traveller with a load set down at her feet, asking to come in. Warm light inside, blue night outside.
```

### Arriving (2)

#### `woven-cairn` — Stones at the edge

Save as `assets/source/events/woven-cairn.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: A knee-high pile of stacked stones at the edge of a place, many sizes, some mossed and some fresh, and a hand placing one more on top. A path runs past it into the place beyond.
```

#### `woven-cookfire` — A fire already lit

Save as `assets/source/events/woven-cookfire.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: A cooking pot on three stones over a small fire at the edge of a mud-brick settlement, smoke rising straight up in still air, and a woman tending it lifting one hand to wave somebody over.
```

### While working (2)

#### `woven-watched` — Being watched

Save as `assets/source/events/woven-watched.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Hands in the foreground at work - cutting reeds with a small blade - and a few strides away a small wild animal sitting up in the grass, watching with open curiosity. The animal is soft and half-hidden, not any one species.
```

#### `woven-underneath` — Something underneath

Save as `assets/source/events/woven-underneath.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind.

Subject: Close on hands brushing loose earth away from something just turned up by a digging stick - a nodule of stone, a lump of clay - with the rest of the day's gathering set aside in a basket.
```

