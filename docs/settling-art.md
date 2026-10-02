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

## Dwarka and the Narmada — asked 27 September 2026

**Both maps settle now** (canon 2.35.0), and until these arrive they draw Lothal's mill and
glasshouse, which is wrong in a way a player will notice: Dwarka builds a **wind-pump over a well**
with a solar still beside it, because what a cold desert lacks is sweet water; the Narmada builds a
**mill on the scarp edge**, turned by the lift that comes up the escarpment. The unfinished stages
keep Lothal's scaffold sprites -- a scaffold is a scaffold -- so each map asks only for its finished
building, as a tower and a separate vane wheel exactly like the mill already in the game.

#### `windpump-tower` — Dwarka's wind-pump, without its vanes

Save as `assets/source/windpump-tower.png`.

The finished building on Dwarka: a wind-pump over the Caravan Ground's well, or the salt orchard's.

Where it shows: on the chosen ground on Dwarka, on sand and dry grass, once the third stage is built. Two tiles tall.

Shape: 128 × 256 on the grid, twice as tall as wide, bottom-anchored. The vanes are a separate image.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. The same solarpunk craft as the ceramic windmill already in the game - clean, cared-for, pale honey-coloured wood with pegged joints and the grain showing, living plants where they can take hold - but built for a cold desert harbour town: dressed sandstone and pale timber rather than glazed ceramic. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

Subject: A tall open lattice tower of pale weathered poles, guyed with thick three-strand rope to pegs, standing on a round well-head of dressed sandstone blocks. A pump rod runs down the middle of the lattice into the well; a small wooden trough on the well-head catches the water. At the top of the tower, a round hub where vanes would attach, but no vanes. The image is twice as tall as it is wide, and the tower stands on the bottom edge with empty magenta above it.

Negative: steampunk, iron, rivets, rust, soot, gears, pipes, Victorian, oil derrick, vanes, blades, sails, windmill cap, multiple frames, sprite sheet
```

#### `windpump-vanes` — Dwarka's wind-pump vanes

Save as `assets/source/windpump-vanes.png`.

The pump's turning wheel. The game spins it on the hub, on the same clock as the Grit Mill's.

Where it shows: on the hub at the top of `windpump-tower`.

Shape: square, face-on, the hub dead centre. Built to 96 × 96 like the mill's blades.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. Seen straight on, face-on, perfectly centred, as a flat wheel. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

Subject: A many-bladed wind-pump wheel of split bamboo slats, twelve to sixteen narrow vanes set at a slight angle round a small wooden hub, bound at the rim with rope. Pale honey bamboo, a little sun-bleached. Nothing else in the image.

Negative: tower, pole, ground, perspective, tilted, iron, metal, rivets, fewer than twelve vanes, four sails, multiple frames, sprite sheet
```

#### `still-house` — Dwarka's solar still

Save as `assets/source/still-house.png`.

Beside the pump, in place of Lothal's glasshouse: shallow trays of brine under slanted glass, where the sun takes the salt and leaves the water.

Where it shows: one tile beside the pump on Dwarka, once the third stage is built.

Shape: 256 × 192 on the grid, the same cell as the greenhouse, bottom-anchored.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. The same solarpunk glasswork as the Quiet Atelier's greenhouse - pale wood frames, clear pale-green glass, clean and cared-for - but low and long, built for sun rather than for plants. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

Subject: A low, long glasshouse only knee-to-waist high, its roof panes slanted towards the sun in a shallow ridge, sitting on a sandstone footing. Through the glass, shallow clay trays of pale brine with salt crusting at the edges, and beads of fresh water running down the inside of the panes into a wooden gutter that drips into a covered clay jar at one end. Two young date palms in pots beside it.

Negative: tall greenhouse, conservatory, dome, iron frame, rivets, rust, steampunk, plastic, modern, multiple frames, sprite sheet
```

#### `scarp-mill-tower` — The Narmada's scarp mill, without its sails

Save as `assets/source/scarp-mill-tower.png`.

The finished building on the Narmada: a mill on level ground near the University's yard or on the herders' top terrace, turned by the wind that stands up the scarp.

Where it shows: on the chosen ground on the Narmada plateau, on grass and hill, once the third stage is built. Two tiles tall.

Shape: 128 × 256 on the grid, twice as tall as wide, bottom-anchored. The sails are a separate image.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. The same solarpunk craft as the ceramic windmill already in the game - clean, cared-for, living plants where they can take hold - but built from the plateau's own black basalt and pale cane. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

Subject: A slender tower of pale bamboo cane, lashed at every joint with dark sinew, rising from a squat round footing of squared black basalt blocks. The tower tapers a little towards the top, where a small wooden cap carries a hub for sails, but no sails. A little moss and a flowering creeper on the basalt footing. The image is twice as tall as it is wide, and the tower stands on the bottom edge with empty magenta above it.

Negative: steampunk, iron, rivets, rust, soot, gears, pipes, Victorian, sails, blades, vanes, stone tower, brick, multiple frames, sprite sheet
```

#### `scarp-mill-sails` — The Narmada mill's sails

Save as `assets/source/scarp-mill-sails.png`.

The mill's turning wheel. The game spins it on the hub.

Where it shows: on the hub at the top of `scarp-mill-tower`.

Shape: square, face-on, the hub dead centre. Built to 96 × 96 like the mill's blades.

```text
16-bit SNES pixel art, seen from slightly above and in front, on a solid pure magenta background, hex #FF00FF. Seen straight on, face-on, perfectly centred, as a flat wheel. Limited palette, hard pixel edges, no anti-aliasing, no outline, no drop shadow, no ground, no sky, no text, no labels. Draw one image only: not a sequence, not a sprite sheet, not a grid, not the same building twice.

Subject: Four long windmill sails of scraped pale goat hide stretched on bamboo cane frames, laced to the spars with cord, round a small wooden hub. Warm cream and pale tan hide, a little translucent where the light comes through. Nothing else in the image.

Negative: tower, pole, ground, perspective, tilted, canvas, iron, metal, more than four sails, multiple frames, sprite sheet
```

#### And the people who hold the ground

Six portraits, in `docs/portrait-prompts.md` under **The holders of ground**: Hasme and Drel on
Lothal, Ushi and Jarro on Dwarka, Ardhi and Tolla on the Narmada. Until one arrives the profile
draws the ink figure with the tool of their trade, as it does for every stranger.

## The settlement page, per map — asked 27 September 2026

`settle-home` is Lothal's mill among the trees, and until now it headed every map's settlement page. The page now looks for `settle-home-<map>` first and falls back to it, so each of these shows the moment it is built.

#### `settle-home-dwarka` — Settling in, Dwarka

Save as `assets/source/events/settle-home-dwarka.png`.

Where it shows: across the top of Dwarka's settlement page, in place of Lothal's.

Shape: landscape 4:3, built to 512 × 384, like `settle-home`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Evening on a low sandy rise above a dry basin, beside an old stone well: a tall wind-pump of pale lashed poles with a many-vaned bamboo wheel turning against a pale sky, water running from its spout into a wooden trough, and beside it a long low glasshouse over shallow trays with young date palms in pots. A few people coming up the rise from a distant town, carrying bundles and a rolled mat, seen from behind; one lamp already lit in the glasshouse. Dry grass, pale dust, a line of old stone walls far off where the sea once was. Warm and quiet, a sense of arriving home.
```

#### `settle-home-narmada` — Settling in, the Narmada

Save as `assets/source/events/settle-home-narmada.png`.

Where it shows: across the top of the Narmada's settlement page, in place of Lothal's.

Shape: landscape 4:3, built to 512 × 384, like `settle-home`.

```text
Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.

Landscape, 4:3. A moment with a lone traveller in it, or just out of frame - seen from behind, at a distance, or only as hands - so that it could be any of the travellers a player might be. No particular animal species and no particular face: the same picture serves every event of its kind. Anybody seen wears dyed cloth - madder red, indigo, turmeric, ochre - as the peoples of this world do, never plain white costume.

Subject: Evening on the edge of a high green plateau above a dark basalt escarpment: a slender windmill of pale cane lashed with dark cord, four scraped-hide sails turning in the wind that rises up the scarp, and beside it a small glasshouse glowing warm from inside and a straw beehive on a little thatched stand. Stone terraces step away down the hillside with goats on them, and in the distance the long low halls of a university. People arriving from both directions at once, herders from the terraces and scholars from the halls, seen from behind and at a distance, not quite sure who should speak first. Lamps being lit. Warm and quiet, a sense of arriving home.
```

## What arrived — 27 September 2026, evening

**All five buildings, and an apiary nobody asked for.** None was sent back.

- **`still-house`** came back first with a transparency checkerboard painted into its pixels -- a
  technical fault, since no keyer can tell those squares from glass highlights -- and the owner
  re-exported it on real alpha the same evening. That second file is the source.
- **`windpump-tower`** splays its guy ropes well outside the lattice, so in the one-tile cell the
  ropes set the scale and the pump stood only a tile and a half tall. The owner's rule is that the
  mills stand taller than a tile, like the Grit Mill, so its cell is 192 × 288 instead: two and a
  quarter tiles, with the ropes half a tile into the neighbours. The scene places the wheel from
  each map's own cell, so nothing else had to know.
- **The pump's water moves**, at the owner's asking. The tower is built as six frames with a glint
  sliding down the spout and across the trough one pixel a frame, cycled by the scene every 720 ms
  (`moveWater` in the builder). The painted highlights could not be found by colour -- quantised,
  they are the trough's own cream -- so a cream pixel counts as water when two of its neighbours are.
- **The wheels** turn at build time exactly as the Grit Mill's does (`rotate` is shared from
  `build-windmill.js`), twelve frames to a quarter-turn. Both are 112 pixels, a little larger than
  the Grit Mill's 96, because both towers are slimmer and the sails read small beside them. Hubs
  were measured from the source's rows and then checked by eye in a composite: the pump's at
  49.9%, 3.1% of its cell, the scarp mill's at 49.5%, 5.4%.
- **`apiary`** is the owner's own addition, meant for the Narmada and smaller than the buildings:
  64 × 64, half a tile, drawn on the mill's far side from the glasshouse when that tile is dry, level
  ground. Canon's finished stage on the plateau now mentions the hive.
- The Narmada's glasshouse is Lothal's, as canon describes one of the same kind.

```bash
node tools/build-homestead.js
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

## What arrived — 2 October 2026

**Both settlement pages**, sent from a phone, each 1200 × 896 PNG, re-encoded to RGBA through the
browser suite's Chromium like the camp paintings in `docs/event-prompts.md`.

- **`settle-home-dwarka`** -- painted on a paper sheet with a torn edge all round; cropped inside it
  with ten pixels or more to spare. The wind-pump, the well and trough, the glasshouse with its lamp,
  people coming up from the town and the old walls where the sea was: everything the prompt asked.
- **`settle-home-narmada`** -- full-bleed, with a four-pointed sparkle mark in the bottom right; cut
  at x 1040, left of the mark, and 30 pixels down so the traveller's feet stay in. The windmill keeps
  most of its top sail, and the university halls stand on the right.

`Ending.tsx` already looked for `settle-home-<map>` first, so neither needed code; a panel test now
asserts each map reaches its own file, because a mistyped map id would fall back to Lothal's
painting without a sound.

```bash
node tools/build-plates.js --events --force --only=settle-home-dwarka --crop=62,40,1080
node tools/build-plates.js --events --force --only=settle-home-narmada --crop=0,30,1040
```

## After the art arrives

Drop the files in `assets/source/dump/`. The windmill stages build with the same keying and scaling
as the finished tower (`tools/build-windmill.js`), the greenhouse on the painted-sheet path in
`docs/placing-the-buildings-plan.md`, and the paintings with `node tools/build-plates.js --events`.
Each accepted piece goes in `src/ui/art-kept.json` and gets a browser check that the game draws it
rather than a fallback.
