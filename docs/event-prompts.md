# Event painting prompts — ready to paste

Sixteen paintings, one for each kind of woven event in `data/happenings.json`. **Each block below is
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

## What arrived — 2 October 2026

**The four meal paintings**, `woven-camp-meal-drovers`, `-pilgrims`, `-adventurers` and `-dacoits`,
sent from a phone through chat in four sizes and two formats (the pilgrims' a 1168 × 784 JPEG, the
rest PNG). The builder reads PNG only, so each was re-encoded at full size through the Chromium the
browser suite already has, rather than adding a decoder.

Each was built with an explicit crop, three of them for a reason the hard requirements name:

- **pilgrims** -- a "Grok" mark in the bottom right corner; cropped above and left of it.
- **drovers** -- a painted paper border all round; cropped inside it.
- **adventurers** -- **replaced the same day** by a second painting the owner sent ("use this"):
  1200 × 896 RGB, full-bleed with no border or mark, so only a 3-pixel sliver comes off each side to
  make it 4:3. It keeps what the owner liked in the first -- a spear leaning on the tent, kept on
  their word (2 October 2026): an adventurers' camp has its gear lying about. A first cut of the
  first painting cropped the spear away under the plan's *nothing held up, nothing drawn*; that rule
  is about nothing being held up *at* anybody, and the owner read the picture rightly. Nobody in it
  holds a weapon. The first painting's raw is on disk in the git-ignored
  `assets/source/dump/woven-camp-meal-adventurers.1.png`, and could come back as a `.2` take.
- **dacoits** -- a paper border, and a crayon logo with a sparkle in the bottom right; cropped
  inside the paper and above and left of both.

They show figures with faces, which the event brief asks to avoid. These were accepted as painted:
the people at a camp are the camp's own, and the card names them.

```bash
node tools/build-plates.js --events --force --only=woven-camp-meal-pilgrims --crop=150,0,987
node tools/build-plates.js --events --force --only=woven-camp-meal-drovers --crop=110,90,980
node tools/build-plates.js --events --force --only=woven-camp-meal-adventurers --crop=3,0,1194
node tools/build-plates.js --events --force --only=woven-camp-meal-dacoits --crop=100,84,950
```

**And `woven-camp`**, the general camp card, 1260 × 848 JPEG: no border or mark, so a centred 4:3
cut takes 65 pixels off each side, keeping the figure in ochre standing at the right. It is the last
fallback on the camp cards -- arriving, and talking to a camp's people -- behind each kind's own
painting, and all four kinds have one, so today nothing reaches it.

```bash
node tools/build-plates.js --events --force --only=woven-camp --crop=65,0,1130
```

## What arrived — 27 September 2026

**`woven-small-talk` and `woven-rumour-kept`**, the two Phase 2 paintings, both 768 × 512 and both
built to 512 × 384. The small-talk painting carried a torn-paper edge, measured at 11 to 31 pixels
deep on each side (the right edge reads deeper only because the pale sky matches the paper), and was
cropped just inside it; the other is full-bleed and built as it came. Two browser specs check each
card draws its own painting.

```bash
node tools/build-plates.js --events --force --only=woven-small-talk --crop=86,33,596
node tools/build-plates.js --events --force --only=woven-rumour-kept
```

---

## The prompts

### On the road (7)

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

#### `woven-small-talk` — Small talk on the road

Save as `assets/source/events/woven-small-talk.png`. Added 27 September 2026 with Phase 2 of the Settling In plan: walking with a stranger you have met.

Where it shows: across the top of the event card titled *On the road with {name}*, whenever the
player walks with a stranger they have already met, or the stranger falls in beside them unasked.
Under it the stranger's face and a line such as *"Rethik falls in beside you and talks easily about
the plains. People here know who you are now."*, often followed by where somebody is, or a place
worth seeing. The pointing hand is the rumour; nothing on the far side of it should be identifiable.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Two figures walking side by side along a dusty road in easy conversation, seen from a little behind: the traveller and a local walker with a bundle on one shoulder, who is pointing off the road across open country towards something out of frame. Late morning light, fields and a far line of trees.
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

### Arriving (4)

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

#### `woven-rumour-kept` — As you were told

Save as `assets/source/events/woven-rumour-kept.png`. Added 27 September 2026: arriving where a stranger's rumour sent you.

Where it shows: across the top of the card titled *As you were told*, the first time the player
reaches a place a stranger's rumour named. Under it: *"This is the Drowned Dockyard, where Rethik
sent you. It is as they said, and you are glad you came."* The same painting serves every place on
every map, so the place at the end of the path must stay generic -- a shape, not a landmark.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: The traveller's hands holding an open field notebook with a small ink sketch of a route and a place, and beyond the page, at the end of the path, the real place just coming into view - a low ruin or a cluster of shelters - matching the sketch. Soft morning light.
```

#### `woven-camp` — A camp where the roads do not reach

Save as `assets/source/events/woven-camp.png`. Added 27 September 2026 with Phase 3 of the Settling In plan: camps that pitch for a few days away from every road -- adventurers, a dacoit band, pilgrims or drovers.

Where it shows: across the top of the card when the traveller walks up to a camp. One painting serves all four kinds, so it must not say whose camp it is: under it the card says *Adventurers' fire*, *A dacoit band*, *Pilgrims resting* or *A drovers' fold*. Nobody in it is threatening; the dacoits in this world take a toll off salt carriers and nothing off the traveller.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A small camp in open country far from any road, seen from a little distance in the late afternoon: a lean-to of poles and hide, a low fire with a pot on three stones, a few bundles and a staff leaning on the lean-to, and two or three figures sitting round the fire, too far off to make out faces. Rough grass and a line of low hills behind. Quiet and ordinary, somewhere people stop for a few days and move on.
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

**Arrived 27 September 2026, all three**, built as `src/ui/events/happening_*.png` with their
underscores. No frame, edge or text to crop. The card draws them by id, and
`e2e/happenings.spec.ts` checks *Where you stop* is drawn from its own painting.

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

## The opening and the roads (Roads and Hands, 2 October 2026)

Mirrored from the plan page's prompt cards, built from the same list so the two cannot differ.
The opening's plates build with `node tools/build-plates.js --prologue`; the roads are event
paintings (`--events`), one per road whichever way it is travelled.

#### `prologue-1-road`

Save as `assets/source/prologue/prologue-1-road.png`. The first thing a new player sees. A cart on the delta road at first light, so the game opens on a journey and not on a menu.

Where it shows: Plate 1 of the opening, under two lines of text. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: First light on a raised earth road through reed beds and standing water. A two-wheeled ox cart seen from behind, a traveller with a satchel and a staff walking beside it, a rolled bedroll on the cart. Far ahead, low smoke rising from somewhere not yet visible. Egrets in the shallows.
```

#### `prologue-2-kit`

Save as `assets/source/prologue/prologue-2-kit.png`. The kit, introduced without a tutorial box: bedroll, lamp, notebook, staff.

Where it shows: Plate 2, when the text says what you carry and that you carry nothing else. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Seen from above, the traveller's hands laying out their kit on a cloth on the cart bed: a rolled bedroll, a small clay oil lamp, a cloth-bound notebook about a third full with ink sketches of plants, a worn staff. Morning light, reed shadows across the cloth.
```

#### `prologue-3-lothal`

Save as `assets/source/prologue/prologue-3-lothal.png`. Lothal emerging from the delta, from canon's own arrival prose: reeds, then reed-and-mud, then brick, washing on the third storey.

Where it shows: Plate 3, under the first lines of Lothal's arrival prose. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A delta town rising slowly out of reed country: reed huts at the edge, then reed-and-mud houses, then brick, and behind them an old many-storeyed brick tower half sunk and leaning, with washing hung across its third storey. Kilns with smoke. The cart road leading in. Seen from a little way off, morning.
```

#### `prologue-4-kilns`

Save as `assets/source/prologue/prologue-4-kilns.png`. Arriving at the Camp in the Kilns, where Uma's first line is waiting.

Where it shows: Plate 4, the last before you take control, standing on the Camp in the Kilns. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A camp of people of this world, seen from a little distance as the traveller walks up. At its heart a beautiful woman of this world, graceful and dignified, face in profile or three-quarter, absorbed in what she is doing, in dyed cloth - madder, indigo, turmeric, ochre - with a little gold, shell or bead. The traveller is not in the picture. Nobody looks at the viewer and nobody is threatening.

Subject: The kiln quarter of an old town: round brick kilns, warm, people living in and around them. A woman weaving a reed mat on the ground looks up and gestures, inviting someone to sit; a child watches from a doorway that used to be a flue. A pot on embers, mats drying.
```

#### `journey-dwarka-lothal`

Save as `assets/source/events/journey-dwarka-lothal.png`. The road to North Dwarka, which still follows a river that is no longer there.

Where it shows: The middle card of the ride between Lothal and Dwarka, either way. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: An ox cart on a pale dusty road that curves exactly like a river would, between banks of old dry silt. Cold desert light, thin scrub, a faint line of old shore far off. A traveller walking beside the cart, seen from behind, a scarf against the dust.
```

#### `journey-lothal-narmada`

Save as `assets/source/events/journey-lothal-narmada.png`. Up the scarp to the Narmada plateau: the road is the only part of the plateau anyone built.

Where it shows: The ride between Lothal and the Narmada. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A built stone road switchbacking up a dark basalt escarpment, green jungle below, a waterfall in a cleft. A cart and a traveller small on the road near the top, seen from behind, wind in the cloth. Clouds at the scarp's rim.
```

#### `journey-aravali-lothal`

Save as `assets/source/events/journey-aravali-lothal.png`. By sea from the delta to the Aravali shore: the crossing begins on water.

Where it shows: The voyage between Lothal and the Aravali. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A small sewn-plank boat with a square sail on a calm grey-green sea, the delta shore falling behind. A traveller sits in the bow with a satchel, seen from behind. Far ahead, impossibly, two islands hang in the air above the horizon.
```

#### `journey-aravali-narmada`

Save as `assets/source/events/journey-aravali-narmada.png`. Down from the plateau to the crossing shore.

Where it shows: The ride between the Narmada and the Aravali. Shape: 4:3, built to 512 × 384.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A cart track descending from high grassland toward a shingle shore and a strait, felt tents of a nomad camp on the shingle, a line of trestles striding out over the water. A traveller walking down beside the cart, seen from behind. Evening.
```

## The fire, at a camp (Roads and Hands, phase 5)

Both painted by the owner on 1 October 2026 and in the game. The woven kinds name their paintings
directly, so the files keep the names the owner gave them.

#### `woven-fireside` -- a night at somebody else's fire

Painted as `camp-night-fireside`: a storyteller at a camp fire under the stars, listeners wrapped in
blankets. Drawn on the card when the first night beside a camp is told at its fire.

#### `woven-fireside-visitor` -- something at the edge of the firelight

Painted as `camp-night-visitor`, with a second take: a woman sitting up from her bedding, two
eyeshines low in the grass beyond the fire. Drawn when a nocturnal animal comes to a camp's light.


## The people at a camp (Living Camps, 2 October 2026)

No new painting was needed for any phase, on the owner's ruling for this plan, and the card borrows
its camp's own. The four meal paintings below are the plan's one optional extra, asked for once the
plan was finished: nothing waits for them.

#### `woven-camp-talk` -- talking to somebody who keeps a camp

Draws the painting of the camp it is at -- `woven-camp-drovers`, `woven-camp-pilgrims`,
`woven-camp-adventurers` or `woven-camp-dacoits`, the owner's camp art of 1 October 2026 -- and
falls back to `woven-camp`. The people at a camp live there, so their card is the camp's picture.

#### `woven-camp-meal-drovers` -- The meal at a drovers' fold

Save as `assets/source/events/woven-camp-meal-drovers.png`. Drawn on the card when you sit with
somebody at a drovers camp at the meal (17:00 to 19:00), tried before `woven-camp-drovers` and falling
back to it until it exists (`artMoment` in `content/events.ts`).

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Dusk at a drovers' camp in open grassland: a felt tent, a fold of woven hurdles behind with goats settling inside it, a low fire on three stones. Three herders sit round the fire with bowls held in both hands; one pours warm milk from a pail into a bowl held out toward a traveller who sits with them, seen from behind. Millet cakes on a flat hot stone at the fire's edge. Warm firelight on faces too small to make out, the sky going violet over low hills.
```

#### `woven-camp-meal-pilgrims` -- The meal with pilgrims

Save as `assets/source/events/woven-camp-meal-pilgrims.png`. Drawn on the card when you sit with
somebody at a pilgrims camp at the meal (17:00 to 19:00), tried before `woven-camp-pilgrims` and falling
back to it until it exists (`artMoment` in `content/events.ts`).

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Dusk at a pilgrims' camp: a cloth shelter, a pole hung with coloured cloth strips, and a small cairn of stacked stones with an oil lamp burning on it. Three pilgrims sit round a low fire sharing rice from one clay pot, eating slowly, one with eyes closed as if humming. A traveller sits with them, seen from behind, a leaf plate on the knee. Quiet and devotional, the lamp a small warm point against a blue evening.
```

#### `woven-camp-meal-adventurers` -- The meal at the adventurers' fire

Save as `assets/source/events/woven-camp-meal-adventurers.png`. Drawn on the card when you sit with
somebody at a adventurers camp at the meal (17:00 to 19:00), tried before `woven-camp-adventurers` and falling
back to it until it exists (`artMoment` in `content/events.ts`).

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Dusk at an adventurers' camp: a lean-to of poles and hide, coils of rope, a hide stretched on a rack. Three young people sit round a fire, one pointing at a scratched map spread on the ground with a piece of flatbread, another laughing, a pot of stew on three stones. A traveller sits with them, seen from behind, being handed the flatbread. Cheerful and untidy, firelight on the map, a line of hills behind going dark.
```

#### `woven-camp-meal-dacoits` -- The meal with a dacoit band

Save as `assets/source/events/woven-camp-meal-dacoits.png`. Drawn on the card when you sit with
somebody at a dacoits camp at the meal (17:00 to 19:00), tried before `woven-camp-dacoits` and falling
back to it until it exists (`artMoment` in `content/events.ts`).

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Dusk at a dacoit band's camp in a dry hollow: a hide shelter, sacks of salt stacked by a tethering post, a low fire. Four rough-looking but friendly people sit round it passing a pot of salted fish from hand to hand; one offers the pot across the fire to a traveller seen from behind. Nobody holds a weapon and none is shown. They look poorer than they would like and are sharing anyway. Warm, wry, easy company.
```


## The wagon on its round (4 October 2026)

The owner's ask: the Sinauli wagon -- canon's grave-goods car, solid-wheeled and copper-sheathed --
still driven on North Dwarka, keeping a round of dry ground near the Caravan Ground. Meeting it is a
card, once a journey, and never in the first steps on the map. There is no horse on Jambhudweep, so
a humped zebu is in the traces.

#### `woven-passing` -- the Sinauli wagon, met ✅ arrived 4 October 2026

Painted by the owner on a sketchbook page and cropped to the painted area before building:
`crop (128, 102, 2320, 1746)` of the 2400 x 1792 raw, which is 4:3; the raw stays in the dump.

Save as `assets/source/events/woven-passing.png`. The card tries `woven-passing-sinauli-wagon` first
and falls back to this, so one painting serves until another patrol is ever written.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Open cold-desert scrub and dry grass on a flat basin under a pale sky, a caravan camp's tents small in the distance. In the middle ground a two-wheeled war car stands still on the dry ground: a small open box of dark teak with copper sheathing along every edge and rail, and two SOLID wheels each made of three planks with a copper rim and small triangular copper figures worked into the wheel face - no spokes. A single zebu BULL stands in the traces at the pole: tawny, with a tall fatty hump standing up over the shoulders, a deep dewlap and long upright horns, chewing. A warrior stands upright in the car, a woman or a man, in dyed cloth and a copper-studded leather cuirass, a long spear held upright, looking calmly toward the viewer. A traveller seen from behind in the foreground, one hand half raised. Still and watchful, not threatening.
```


## Alms on the step (4 October 2026)

The owner's ask: a card on reaching the Alms Step, the temple on the Aravali's first sky island, with
the owner's painting. Canon's `happening_alms_on_the_step`, drafted for the owner to rewrite. The card
draws it by id; until it arrives the card shows the scene it borrows.

#### `happening_alms_on_the_step` -- Alms on the step ✅ arrived 4 October 2026

The owner's painting is a woman carrying flowers up a cobbled path to a terracotta temple on a cliff
edge between waterfalls; canon's prose was rewritten to follow it. 2752 x 1536, built by the usual
centred 4:3 crop, which keeps the woman and the whole temple.

Save as `assets/source/events/happening_alms_on_the_step.png`, then `node tools/build-plates.js --events`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: An old domed temple on a high stepped plinth of pale stone, on a floating island in the sky: seven small spires around a dome that has split, a pointed doorway with dark behind it, lichen on the lower stones, dressed blocks lying scattered on the grass. On the worn middle of the bottom step, where feet have dished the stone, sits a leaf of cooked rice and a small clay lamp with a thin thread of smoke. A traveller's hand reaches toward the step. Worn names cut along the riser, too faint to read. Calm, quiet, morning light.
```

