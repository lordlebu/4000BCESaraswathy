# Event painting prompts — ready to paste

Thirteen paintings, one for each kind of woven event in `data/happenings.json`. **Each block below is
the whole prompt**: copy one, paste it into an image tool, done. The first paragraph is the shared
style block from `docs/art-handover.md`, unchanged, so these sit beside the activity scenes; the
second says what every event painting has to be.

## Getting them in

Save what comes back into `assets/source/events/` under the name each block gives, then:

```bash
node tools/build-plates.js --events
```

It crops to 4:3 — the event card's own shape — and writes `src/ui/events/<name>.png` at 512 px. Add
each accepted painting to `src/ui/art-kept.json`, like all art. **Nothing waits for the set**: an
event with no painting borrows the night's scene, and failing that shows a blank band.

## What every one of them has to be

- **One painting serves every event of its kind.** `woven-tracks` is the picture for every animal's
  tracks and `woven-company` for every stranger, so none may show a particular species, a
  particular face or a particular people.
- **The traveller from behind, at a distance, or as hands.** The player may be any of five
  travellers, so the painting must not decide which.
- **Dyed cloth, not plain costume.** The strangers on the road wear the eight dyes in
  `src/content/looks.ts`, and canon now says how each people dresses (see `docs/face-prompts.md`).
- **A woman by default** where a figure is seen. Canon's cast is nine women of fifteen, and a
  generator's default is not — see "Who these people are" in `docs/art-handover.md`.
- **The five hard requirements** from the handover, every time: no text, no border, no watermark,
  the right shape, lossless PNG.

`test/docs.test.ts` fails if a kind in `data/happenings.json` has no prompt here, so a new template
arrives with its art request.

## What arrived — 26 September 2026

**All thirteen, and a second take of `woven-dropped`**, built as `woven-dropped.2` — the card
chooses between takes on a seeded hash, so both are seen. Every one decoded and built cleanly to
512 × 384; the builder took the painted frame off four on its own.

**Six carried a torn-paper edge the builder did not see**, which the hard requirements count as a
frame: the card draws its own edge, and a painted one reads as a picture of a picture. Each was
cropped a few percent inside the paper. The build does not remember a crop, so these reproduce
what shipped:

```bash
node tools/build-plates.js --events --force --only=woven-company --crop=66,10,636
node tools/build-plates.js --events --force --only=woven-dropped --crop=66,10,636
node tools/build-plates.js --events --force --only=woven-tracks --crop=66,10,636
node tools/build-plates.js --events --force --only=woven-watched --crop=140,110,2140
node tools/build-plates.js --events --force --only=woven-cairn --crop=160,140,2080
node tools/build-plates.js --events --force --only=woven-dropped.2 --crop=170,150,2060
```

**`--crop` on a 4:3 kind was broken, and is fixed.** The explicit crop carried no height, so the
resampler read a *square* and squashed it into 4:3, and the edge check tested a square too. Nothing
had cropped a landscape kind before, so it had never shown. The crop now takes the kind's own
shape: `size` is the width and the height follows the aspect.

---

## The prompts

### On the road (6)

#### `woven-tracks` — Tracks across the path

Save as `assets/source/events/woven-tracks.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Fresh animal tracks pressed into damp earth, crossing a narrow footpath from one side to the other and vanishing into long grass. The tip of a walking staff and the edge of a sandalled foot at the bottom of the frame.
```

#### `woven-dropped` — Something on the road

Save as `assets/source/events/woven-dropped.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A small bundle fallen at the side of a worn dirt road - a twist of cloth spilling a little plant fibre and a lump of red earth - with the road running on, empty, into the distance.
```

#### `woven-company` — Company on the road

Save as `assets/source/events/woven-company.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Two figures walking side by side along a dusty road, seen from behind: the traveller, and a woman with a rope-bound load on her back. Long morning shadows, open country, an easy unhurried pace.
```

#### `woven-company-again` — A face you know

Save as `assets/source/events/woven-company-again.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: On the road ahead, a figure with a loaded back has stopped and half turned, one hand lifted in greeting towards the viewer. Late morning light, fields on either side, a long way still to walk.
```

#### `woven-kindness-returned` — Kindness returned

Save as `assets/source/events/woven-kindness-returned.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: At the side of a road, one person's hands holding out a small cloth-wrapped gift towards another's open hands. Faces out of frame. Warm low light, dust in the air, a milestone of old brick behind.
```

#### `woven-weather` — Rain, mist or storm on the road

Save as `assets/source/events/woven-weather.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Weather coming across open grassland in grey sheets, the traveller small in the middle distance with a cloak pulled up over the head, one bent tree nearby offering a little shelter.
```

### At night (3)

#### `woven-night-sounds` — Something beyond the lamp

Save as `assets/source/events/woven-night-sounds.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A small clay oil lamp turned low on the ground at night, its light fading out into dark scrub. At the very edge of the circle of light, two eyes faintly catch it. Calm and curious, not frightening.
```

#### `woven-dream` — A dream

Save as `assets/source/events/woven-dream.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A dreamlike wash of wide empty country at first light - river channels, grass, a low sky - with no people and nothing built anywhere. Edges soft and slightly dissolving, as if remembered rather than seen.
```

#### `woven-knock` — Somebody after dark

Save as `assets/source/events/woven-knock.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Seen from inside a lamp-lit shelter at night: the low doorway, and outside it in the dark a woman traveller with a load set down at her feet, asking to come in. Warm light inside, blue night outside.
```

### Arriving (2)

#### `woven-cairn` — Stones at the edge

Save as `assets/source/events/woven-cairn.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A knee-high pile of stacked stones at the edge of a place, many sizes, some mossed and some fresh, and a hand placing one more on top. A path runs past it into the place beyond.
```

#### `woven-cookfire` — A fire already lit

Save as `assets/source/events/woven-cookfire.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A cooking pot on three stones over a small fire at the edge of a mud-brick settlement, smoke rising straight up in still air, and a woman tending it lifting one hand to wave somebody over.
```

### While working (2)

#### `woven-watched` — Being watched

Save as `assets/source/events/woven-watched.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Hands in the foreground at work - cutting reeds with a small blade - and a few strides away a small wild animal sitting up in the grass, watching with open curiosity. The animal is soft and half-hidden, not any one species.
```

#### `woven-underneath` — Something underneath

Save as `assets/source/events/woven-underneath.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Close on hands brushing loose earth away from something just turned up by a digging stick - a nodule of stone, a lump of clay - with the rest of the day's gathering set aside in a basket.
```

## Written happenings (3) — canon's, 26 September 2026

Canon's `happening_` entities are single scenes rather than kinds, so **each painting is of one
particular moment**, and a particular place and person are fine; the traveller still stays anybody.
The card finds a painting by the happening's id, underscores and all (the builder keeps them since
this change), and borrows the night's scene or shows a blank band while one is missing. They are
drafts in canon until the owner approves them, so paint once the words have settled.

#### `happening_tower_standing` — The tower, standing

Lothal, at night, once the tower's collapse has been seen. Save as `assets/source/events/happening_tower_standing.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. One particular moment in one particular place, so the place and the people in it can be specific. The traveller, if seen at all, is seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A dream of a tall tower of fired brick and dressed stone, many storeys high, standing whole and upright on dry flat ground under a pale sky, where the real one lies sunk in a wet delta. A stair rises through its core. At shoulder height in the stair wall is a shaped, lined, empty niche, dark inside, with the faint sense that something in it is looking out - but nothing is shown in it. Edges soft and slightly dissolving, as if remembered rather than seen.
```

#### `happening_year_names` — Counting years

The Narmada road, once the moving spring has been seen. Save as `assets/source/events/happening_year_names.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. One particular moment in one particular place, so the place and the people in it can be specific. The traveller, if seen at all, is seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Late afternoon on a high dark-basalt plateau. An old Maru herder woman rests on a dry-stone terrace wall, wrapped in a goatskin coat worn hair-out and a felt cap, weathered upland face in the Himachali or Nepali manner. Below her, goats work a slope of old terraces. The traveller sits beside her on the wall, seen from behind, listening. Wide sky, long light, a spring's pale line of wet rock in the distance.
```

#### `happening_where_you_stop` — Where you stop

Arriving at North Dwarka's Caravan Ground. Save as `assets/source/events/happening_where_you_stop.png`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. One particular moment in one particular place, so the place and the people in it can be specific. The traveller, if seen at all, is seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Dusk at a caravan camp on bare cold-desert ground, on the exposed side of a low ridge. Donkeys hobbled, water skins stacked, a small fire in a ring of stones blackened by a great many fires before it. A Kia woman drover in dyed cloth, flowers in her ornately dressed hair, sets down a load and gestures at the ground as if the answer were obvious. The road curves into camp along a faint old shoreline, with no water anywhere near.
```
