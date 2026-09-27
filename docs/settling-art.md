# Settling In — the art

Art for the settlement endgame in the [Settling In](https://claude.ai/artifact/YTD1Y7MXFxtXRWStDaYm2c)
plan, in the order the game will need it. **Lothal comes first** (Phase 5, by the build order the
owner chose), so everything here is for it: the solarpunk windmill rising out of the forest canopy,
the glass greenhouse in the spirit of the Quiet Atelier, and the three cards the settling loop opens.
Camps (Phase 3) and the cart ride (Phase 4) are asked for when their phases start.

The plan page shows these same prompts as copy-ready cards, generated from this file, so the two
cannot differ.

**Nothing waits for them.** Until a sprite arrives the map draws the building it has; until a
painting arrives the card borrows a scene or shows a blank band. Nothing is rejected for style, only
for a technical fault: a frame, a torn edge, text, or a build that breaks.

## Map sprites

Built like the windmill tower and wheel already in the game (`docs/art-brief.md`, Asset 2h): one
image on solid magenta, keyed out and scaled to the tile grid. **One image each, never a
sequence**: a sheet of stages comes back as the same building drawn several times, which is why the
windmill's stages are separate asks. The finished mill is the tower and wheel that already exist.

#### `windmill-stage-1` — The windmill, begun

Save as `assets/source/windmill-stage-1.png`.

The first stage of Lothal's settlement: the ground is agreed and building has started.

Where it shows: on the chosen ground on Lothal, among the trees, after the first building press. Two tiles tall, like the finished tower.

Shape: 128 × 256 on the grid, twice as tall as wide, bottom-anchored. Any source size at that ratio.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. The same solarpunk mill as the finished windmill tower already in the game: a smooth rounded tower in glazed ceramic, warm off-white (cream, bone and pale ivory with a faint blue-grey in the shadows, never pure white), with pale wooden joinery in honey and oak tones, visible pegged joints and the grain showing, and living plants growing on it. Clean and cared-for, nothing rusted or sooty. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

The image is twice as tall as it is wide, and the building stands on the bottom edge of the image with empty magenta above it.

Subject: The first stage of building the windmill tower: a round foundation course of glazed ceramic blocks, knee-high, with the first ring of the tower wall begun on it. A simple scaffold of pale wooden poles lashed with rope stands around it, a ladder leans on the scaffold, and a few stacked ceramic blocks and a coil of rope wait at its foot. No tower yet, no cap, no balcony. Most of the image above the foundation is empty magenta.

Negative: steampunk, rivets, rust, soot, smokestack, iron plating, gears, pipes, Victorian, grimy, multiple frames, sprite sheet, sails, blades, windmill vanes, finished tower.
```

#### `windmill-stage-2` — The windmill, halfway

Save as `assets/source/windmill-stage-2.png`.

The second stage: the tower is rising in its scaffolding, already taller than the trees around it.

Where it shows: in the same place after the second building press, replacing stage one. The third press draws the finished tower and turning wheel the game already has.

Shape: 128 × 256, bottom-anchored, on the same footprint as stage one so the change reads as growth.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. The same solarpunk mill as the finished windmill tower already in the game: a smooth rounded tower in glazed ceramic, warm off-white (cream, bone and pale ivory with a faint blue-grey in the shadows, never pure white), with pale wooden joinery in honey and oak tones, visible pegged joints and the grain showing, and living plants growing on it. Clean and cared-for, nothing rusted or sooty. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

The image is twice as tall as it is wide, and the building stands on the bottom edge of the image with empty magenta above it.

Subject: The windmill tower half built: the rounded ceramic wall has risen to about two-thirds of its final height and stops at an open, unfinished top edge with no dome cap. Pale wooden scaffolding wraps it to the top, with lashed poles, a plank walkway, and a simple rope-and-pulley hoist lifting one ceramic block. The fretwork balcony is half built. A bare brass mounting boss on the front face, with nothing on it.

Negative: steampunk, rivets, rust, soot, smokestack, iron plating, gears, pipes, Victorian, grimy, multiple frames, sprite sheet, sails, blades, windmill vanes, dome cap, finished roof.
```

#### `greenhouse` — The glass greenhouse

Save as `assets/source/greenhouse.png`.

The second building of Lothal's settlement, the owner's "something similar to the glass atelier, as a greenhouse". Canon's Quiet Atelier is *"a workshop of glass and benches, kept, and nobody in it"*; this is the settlement's living one.

Where it shows: beside the windmill on Lothal's chosen ground, after the last building press. About two tiles wide.

Shape: 256 × 192 on the grid, four wide by three tall, bottom-anchored. Any source size at that ratio.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. A solarpunk glasshouse from the same settlement as a glazed-ceramic windmill tower: pale green-tinted glass in pale wooden framing in honey and oak tones, visible pegged joints and the grain showing, on a low wall of warm off-white glazed ceramic, never pure white, with living plants in and around it. Clean and cared-for, nothing rusted or sooty. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

The image is four units wide by three tall, and the building stands on the bottom edge of the image with empty magenta above it.

Subject: A long low glasshouse with a rounded, arched roof of many small panes held in curved timber ribs, standing on a low ceramic wall. A wooden door at the front stands a little open. Inside, seen through the glass, rows of green plants in raised beds and a few climbing vines touching the roof. A ceramic rain barrel at one corner and a vine trailing outside. The glass is clean and the light passes through it.

Negative: steampunk, rivets, rust, soot, smokestack, iron plating, gears, pipes, Victorian, grimy, multiple frames, sprite sheet, iron frame, broken glass.
```

## Card paintings

Watercolour, in the same style as the fifteen event paintings (`docs/event-prompts.md`). Each serves
every map that settles, so none may show a particular place's landmark or a particular person's face.

#### `settle-ground` — Choosing the ground

Save as `assets/source/events/settle-ground.png`.

The card that opens when the player walks onto one of a map's settlement grounds, once the map knows them.

Where it shows: across the top of the card for a settlement ground, above its name and a line about the ground and whose it is.

Shape: landscape 4:3, built to 512 × 384 and drawn across the full width of the card, above its title. One painting serves every map that settles.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: A clearing at the edge of a forest in soft morning light, the traveller seen from behind standing in it with a staff, looking over the ground. A few wooden stakes with a line of cord between them already mark out a square on the grass, and a coil of cord lies at the traveller's feet. Tall trees around the clearing, their canopy high above.
```

#### `settle-negotiation` — Talking it through

Save as `assets/source/events/settle-negotiation.png`.

The negotiation with the ground's local figure (a morol, dada or gunda), which is talked through and never fought.

Where it shows: across the top of the negotiation card, above the local figure's words and the approaches you can take: listen, speak their tongue, show, vouch, offer.

Shape: landscape 4:3, built to 512 × 384 and drawn across the full width of the card, above its title. One painting serves every map that settles.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Two people sitting cross-legged on a woven mat in the shade of a great tree, facing each other across two small clay cups and a low brass tray: the traveller seen from behind and to one side, and across from them an older local person whose face is turned half away, one hand raised as if naming a condition. A few others stand at a respectful distance behind, listening. Calm and serious, not hostile.
```

#### `settle-home` — Settling in

Save as `assets/source/events/settle-home.png`.

The last card of a map: the settlement is built and the people who backed it move in. It heads the settlement page that replaces the old ending.

Where it shows: across the top of the settlement page, above who moves in, who stays where they are and why, and what was put back.

Shape: landscape 4:3, built to 512 × 384 and drawn across the full width of the card, above its title. One painting serves every map that settles.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Evening in a new small settlement among trees: a pale ceramic windmill tower with turning sails rising above the forest canopy, a glasshouse glowing warm from inside beside it, and a few people carrying bundles and a rolled mat along a path towards them, seen from behind and at a distance. Lamps being lit. Warm and quiet, a sense of arriving home.
```

## What arrived — 27 September 2026

**All six.** None had a fault that needed more than a crop, so none was sent back.

- **The windmill stages** arrived on real transparency rather than magenta, which the builder keys
  the same way. `tools/build-homestead.js` gives both one scale -- the one that fits the taller
  stage -- so the foundation comes out 121 pixels tall, the half-built tower 193, and the finished
  tower after them the full 256. Fitted each on its own, the mill would have shrunk as it was built.
- **The greenhouse** arrived on an uneven magenta (234,13,238 to 241,18,240), keyed on hue; 256 × 110
  in its 256 × 192 cell.
- **`settle-negotiation`** carried a painter's signature in the bottom-left corner, which counts as
  text; cropped above it. **`settle-home`** arrived at 1520 × 1150 and the builder dropped ten
  pixels to make 4:3. **`settle-ground`** built as it came.

```bash
node tools/build-homestead.js
node tools/build-plates.js --events --force --only=settle-ground
node tools/build-plates.js --events --force --only=settle-negotiation --crop=64,0,640
node tools/build-plates.js --events --force --only=settle-home
```

## After the art arrives

Drop the files in `assets/source/dump/`. The windmill stages build with the same keying and scaling
as the finished tower (`tools/build-windmill.js`), the greenhouse on the painted-sheet path in
`docs/placing-the-buildings-plan.md`, and the paintings with `node tools/build-plates.js --events`.
Each accepted piece goes in `src/ui/art-kept.json` and gets a browser check that the game draws it
rather than a fallback.
