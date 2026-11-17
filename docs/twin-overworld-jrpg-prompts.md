# Approved NES JRPG overworld prompts

Built-in imagegen, transparent-background requests. Owner approved the three initial previews.
No paid API fallback was used. Raw PNGs remain unchanged in ignored desktop storage. Only compact
RGBA source atlases and runtime strips are tracked; no review screenshots are committed.

## Shared sheet prompt

```text
Use case: stylized-concept. Primary request: nes jrpg sprite. Make a production sprite sheet for this EXACT approved cute character in reference image 1. Keep the same face, skin, hair, hat, costume, palette and charm. Simple chunky 8-bit NES JRPG pixel art, big round chibi head and very small body, short limbs, few flat colours, clear facial expression. No extra texture or tiny details. Reference image 2 is the carrier sheet for proportion and animation clarity only.

LAYOUT: EXACTLY 20 separate complete figures in a strict evenly spaced grid, FOUR COLUMNS and FIVE ROWS. Each cell contains ONE complete figure. Transparent gaps between all cells. All standing figures have the SAME height and a matching baseline inside their cell. Each sprite should be framed as if it will be 26x40 pixels (34x40 for the three-headed character); generate chunky pixels from the start. Compose the canvas to fit the whole 4-column, 5-row sheet without clipping.

Row 1: facing SOUTH / toward viewer, four frames: idle, slight breathing idle, left foot forward, right foot forward.
Row 2: facing NORTH / completely away from viewer showing BACK OF HEAD and BACK OF CLOTHES, four corresponding idle and step frames. NO faces or eyes on any figure in this row.
Row 3: facing EAST / right profile, four corresponding idle and step frames, noses point right.
Row 4: facing WEST / left profile, four corresponding idle and step frames, noses point left.
Row 5: sitting cross-legged, four views in this exact order: SOUTH, NORTH, EAST, WEST. Seated figures are shorter with feet on the same baseline. All retain the complete head/hair/hat. Keep all three anatomical heads when relevant, sharing ONE body.

No text, no labels, no frame numbers, no border, no grid lines, no alignment marks, no background colour, no fake checkerboard, no glow, no bloom, no drop shadow. GENUINELY transparent background. Exactly 20 figures, no extras.
```

## nemi

```text
Character: Nemi, adult Harappan gardener. Her seed pouch, green wrap, hair bun and little sprig remain consistent.
```

Reference 1: approved preview `exec-5e2909a0-8551-4a11-be67-6a8b01a8c7ce.png`.
Reference 2: `assets/traveller-carrier-overworld.png`.
Generated sheet: `exec-7be746dd-d0e7-4f0a-ada4-e6dd17d38d3b.png`.
Ignored raw: `dump/twin-city-art-review/nes-jrpg-previews/twin-gardener-raw.png`.
Tracked normalized source: `assets/source/twins/people/twin-gardener-nes-jrpg.png`.

## mirlepa

```text
Character: Mirlepa, clearly adult fair Tibetan-inspired Denisovan meditator with dark beard, long hair, ochre Kalash-inspired cap, olive clothes and cream scarf. Calm smile and closed eyes in south view, as approved. Rows 1-4 must stand/walk (not sit); row 5 only sits cross-legged. Do not leave the hat or beard out of profile views.
```

Reference 1: approved preview `exec-7dee2232-eb3c-4cae-9721-4ab297aac3be.png`.
Reference 2: `assets/traveller-carrier-overworld.png`.
Generated sheet: `exec-c08eae41-9b93-458f-8d65-8af5e5d19c1f.png`.
Ignored raw: `dump/twin-city-art-review/nes-jrpg-previews/mirlepa-raw.png`.
Tracked normalized source: `assets/source/twins/people/mirlepa-nes-jrpg.png`.

## yamantaka

```text
Character: Yamantaka, clearly adult fair Tibetan-inspired Denisovan guardian with exactly THREE anatomical heads sharing ONE short torso and two arms/two legs. The approved three round smiling faces and indigo/cream/ochre Kalash-inspired coat must remain. Each and every one of the twenty figures must contain THREE heads, including north/back and east/west views. In profile all three heads may overlap partly but retain three distinct hair masses. No fourth head, no heads floating apart, no extra bodies. No gold or modern outfit.
```

Reference 1: approved preview `exec-d6b0853e-1cbc-43c3-89ae-d477b157fdcb.png`.
Reference 2: `assets/traveller-carrier-overworld.png`.
Generated sheet: `exec-177ef435-ea00-420d-af8e-2114ad603a52.png`.
Ignored raw: `dump/twin-city-art-review/nes-jrpg-previews/yamantaka-raw.png`.
Tracked normalized source: `assets/source/twins/people/yamantaka-nes-jrpg.png`.

## Delivery

`python tools/import-jrpg-sheet.py <raw> assets/source/twins/people/<id>-nes-jrpg.png --width 26`
(Yamantaka uses 34.) Import crops the reviewed grid and point-resizes at one shared pose scale;
alpha thresholds locate bounds only, not output colours. No quantization, colour/palette reduction,
dithering or opaque-alpha conversion. The tracked compact atlas is the reproducible build input.

`node tools/build-characters.js twin-gardener mirlepa yamantaka` rebuilds runtime sheets on a clean
checkout by copying each normalized source pose exactly into the existing 20-frame layout.
