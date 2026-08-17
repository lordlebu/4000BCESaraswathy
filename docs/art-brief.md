# Art Brief — South of Tethys

Copy the prompt blocks below into an image model. The **Hard requirements** section is the part
that matters most: the current sprite had registration guides baked into the artwork, which no
amount of cropping could remove.

---

## The game, in one paragraph

**South of Tethys: Jambhudweepa Adventure** is a cozy 2D top-down exploration game set in an
invented ancient South Asia — river deltas, monsoon forest, ochre hill country, a highland spine,
and a warm sea to the west. The player wanders a tile map on foot, reads a travel journal about the
terrain and the creatures and plants of each tile, and records a landmark. **There is no combat and
no threat.** Creatures are observed, not fought. The feeling to aim for is a quiet afternoon walk
with a sketchbook.

## Art direction: cozy colour e-ink

Think a **Kindle Colorsoft or Kaleido display**, not a backlit screen:

- **Muted, low-saturation colour.** Every hue reads as though slightly washed. No neon, no pure
  saturated primaries, nothing that glows.
- **Warm paper base**, never pure white. Off-cream, the colour of good sketchbook paper.
- **Gentle contrast.** Darks are a warm near-black (a deep plum-brown), not `#000000`.
- **Matte and flat.** No gloss, no bloom, no lens effects, no drop shadows, no gradients that look
  like plastic.
- A **faint paper grain** is welcome. Dithering and visible stipple in the style of an e-ink
  display is welcome.
- **Hand-drawn warmth** over technical polish. Slightly irregular lines are good.

Reference palette already in the game — new art should sit comfortably beside these:

| | |
| --- | --- |
| paper | `#fff6df` |
| ink | `#34263a` |
| sea | `#2f6f8f` |
| coast | `#e8c982` |
| plains | `#9fc96b` |
| forest | `#4f9a5a` |
| wetland | `#6fb7a8` |
| hills | `#b89b58` |
| mountains | `#8d8796` |
| desert | `#d9a95f` |
| river | `#4fa3d9` |
| settlement | `#c46b4f` |
| landmark | `#f2d16b` |

If anything, pull these **slightly further toward desaturated** for the e-ink feel.

---

## Hard requirements (this is where the last asset went wrong)

1. **Transparent background.** PNG with a real alpha channel. Not white, not a checkerboard drawn
   as pixels.
2. **No guides of any kind in the image.** No centre cross, no rule of thirds, no dashed alignment
   marks, no grid, no margin ticks, no ruler, no bounding box, no watermark, no signature, no
   caption or label text. The previous sprite had a vertical and horizontal centre line drawn
   straight through the character and it could not be cropped out.
3. **One subject, centred, filling the frame**, with only a couple of pixels of transparent
   padding. No mockup, no "presentation" framing, no shadow plate under the figure.
4. **Crisp pixel art at a stated small resolution** — see each asset below. If the model can only
   produce large images, that is fine as long as the art is genuinely blocky and each art pixel is
   a clean uniform square of colour with no anti-aliasing, no gradients inside a pixel, and no
   stray marks.
5. **Flat colours per pixel.** No soft airbrushed shading within a single art pixel.

---

## What went wrong with the first two attempts

Worth reading before generating again — both failures were in the *file*, not the drawing.

| Attempt | Problem | Why it could not be fixed in code |
| --- | --- | --- |
| `Varuna.png` | Registration guides — a centre cross — drawn **across the figure** | You cannot crop out a line that sits on top of the character |
| `Varuna_new.png` | The transparency checkerboard painted on as **opaque grey squares**, and the art **lossily compressed** | The checker greys are close enough to the artwork's greys that keying it out bites into the figures — it split 6 characters into 8 fragments. And compression turned a clean ~7px pixel grid into 27,000 colours and 3,422 one-pixel runs, which is what "hazy" looks like |

So, in priority order:

1. **Save as a real PNG with a real alpha channel.** Empty space must be *nothing*, not grey squares.
   If the tool only offers a checkerboard preview, export rather than screenshot.
2. **Lossless.** No JPEG, no "optimised" or "compressed" export. Solid blocks of colour must stay
   solid.
3. Everything in **Hard requirements** above still applies.

## Asset 0 — walk cycle, the thing actually needed now

Four directions, as **four separate PNG files** rather than one sheet. Separate files remove all
ambiguity about which pose is which — the last sheet had six poses and no way to tell front from
three-quarter.

| File | Pose |
| --- | --- |
| `varuna-down.png` | facing the viewer (walking toward camera) |
| `varuna-up.png` | seen from behind (walking away) |
| `varuna-right.png` | side view, facing right |
| `varuna-left.png` | side view, facing left — or skip it, the game mirrors `right` |

> **Prompt (change the facing each time):**
> Single pixel art sprite of an elderly travelling scholar for a cozy top-down exploration game,
> **facing [the viewer / away from the viewer / to the right]**. Wide-brimmed soft blue hat, deep
> muted indigo robe, grey beard, brown boots, satchel strap, wooden staff. Cozy colour e-ink
> palette: muted desaturated colour, warm off-cream highlights, warm near-black outlines instead of
> pure black, matte and flat. Exactly 26 pixels wide by 40 pixels tall, true pixel art, every pixel
> a flat solid colour, hard edges, no anti-aliasing, no gradients, no dithering inside the figure.
> Save as lossless PNG with a genuine alpha channel: the background must be fully transparent, not
> a grey checkerboard. No grid, no guide lines, no centre cross, no alignment marks, no drop shadow,
> no border, no text, no watermark. One centred figure filling the frame, feet at the bottom edge.

If the model insists on producing something large, that is still fine **as long as it is lossless
and the blocks are clean** — `tools/build-sprite-sheet.js` resamples any size down to the game's
grid by taking the most common colour per block, which keeps edges hard. Keep the 26:40
proportions though: a squarer source is drawn as a stockier figure than the cell wants.

## Asset 1 — the player (superseded by Asset 0 above)

**Varuna, a travelling scholar.** Currently: an older figure with a grey beard, a deep blue robe
and a wide-brimmed blue hat, brown boots and satchel straps, carrying a wooden staff. Keep that
character; the ask is a clean version in the e-ink palette, not a redesign.

> **Prompt:**
> Top-down-facing pixel art sprite of an elderly travelling scholar for a cozy exploration game.
> Wide-brimmed soft blue hat, deep muted indigo robe, grey beard, brown leather boots and satchel
> strap, wooden walking staff in one hand. Standing, facing the viewer, calm and unhurried. Cozy
> colour e-ink palette: muted desaturated colours, warm off-cream highlights, warm near-black
> outlines rather than pure black, matte and flat with no glow. 24 pixels wide by 32 pixels tall,
> crisp pixel art, flat colour per pixel, no anti-aliasing. Fully transparent background. No grid,
> no guide lines, no centre cross, no alignment marks, no shadow, no border, no text, no watermark.
> Single centred figure filling the frame.

**Also useful, same style and same canvas size, as separate images:** a side-facing walk pose
(facing right — the game mirrors it for left), and a seated or resting pose for arriving at a
landmark.

## Asset 2 — terrain tiles

The game currently draws tiles as a flat colour plus a glyph, generated in code. Real tile art is
the single biggest visual upgrade available. **Eleven tiles, each 32×32, each a separate
transparent PNG**, and they must tile seamlessly against themselves and each other:

`sea` · `coast` · `plains` · `forest` · `wetland` · `hills` · `mountains` · `desert` · `river` ·
`settlement` · `landmark`

**Two rules specific to tiles**, both learned the hard way from a generated set that had to be
thrown away:

1. **No border, frame, or outline around the tile.** A model asked for a "tile" very often draws a
   framed square. A dark edge on every cell turns the map into graph paper and is the least cozy
   thing the screen can do. The tile must read as a continuous surface with nothing marking where
   it stops.
2. **Keep the interior quiet.** Low internal contrast, no strong highlights, no single feature
   demanding attention. These sit under the player and repeat hundreds of times — texture, not
   illustration. Detailed painterly tiles measurably hurt figure legibility.

**Give the model the hex directly.** The values below are the existing biome colours pulled toward
the e-ink direction — chroma cut to about 55%, values compressed into a narrow band. Asking in
prose for "desaturated" gets ignored; a hex does not.

| tile | base colour | subject |
| --- | --- | --- |
| `sea` | `#2f6f8f` *(kept dark — see below)* | calm warm shallow sea |
| `coast` | `#c9b587` | pale shell and sand shore |
| `plains` | `#9eb582` | open warm grassland |
| `forest` | `#769f7c` | monsoon forest canopy |
| `wetland` | `#86aba4` | reed marsh with shallow pools |
| `hills` | `#ab9d7c` | rolling ochre hill country |
| `mountains` | `#96919c` | lavender-grey rocky peaks |
| `desert` | `#bea47b` | gold dust desert with low stones |
| `river` | `#7ba3c0` | river water running over stones |
| `settlement` | `#b18577` | cluster of clay-roofed huts seen from above |
| `landmark` | `#d8c48c` | a memorable place, a small shrine platform |

**`sea` is deliberately the exception.** It is the only non-walkable biome, so the player has to be
able to tell it from land at a glance. Everything else sits in a tight value band; sea stays darker
and a little more saturated than the rest. Do not soften it into the others.

> **Prompt (swap the subject and the hex each time):**
> Seamless top-down 32×32 pixel art terrain tile of **[monsoon forest canopy]** for a cozy
> exploration game set in ancient South Asia. Base colour approximately **[#769f7c]**, with only
> gentle variation around it. Cozy colour e-ink palette: muted desaturated colour, warm paper
> undertone, gentle contrast, matte and flat, faint paper grain. Quiet all-over texture, low
> internal contrast, no single focal point — this tile repeats hundreds of times under the player.
> Tiles seamlessly on all four edges. **No border, no frame, no outline around the edge of the
> tile** — the surface must continue past the edges with nothing marking where it stops. Crisp
> pixel art, flat colour per pixel, no anti-aliasing. No grid lines, no guide marks, no text, no
> watermark, no drop shadow.

### Asset 2b — `lava_field`, the twelfth tile (blocked, and blocking content)

`lava_field` is the one biome canon names that the engine cannot draw, and it is not a nicety:
**forty species live in the Ganges Lava Sea, and thirty-six of them are currently filed under
`mountains`** because there was nowhere better to put them. Canon now names the right ground;
the engine filters it straight back out, because a biome with no tile is not renderable.

Until this tile exists those species keep `mountains` alongside `lava_field` — deliberately, since
a species left with no drawable ground stops being placed in the world at all. **Once the tile
lands, tell the canon side and the pairing gets undone**, and the basalt plains become real
places you can stand on.

The region, in canon's own words: active volcanic rifts that cool and solidify into vast jagged
black basalt plains and lava fields, where magma meets ocean. Its fauna are armoured and
heat-resistant, often fused with volcanic minerals — obsidian carapaces, gastropods that build
shells out of basalt and metallic ore.

> **Prompt:**
> Seamless top-down 32×32 pixel art terrain tile of **cooled black basalt plain, cracked and
> jagged, with a dull ember glow deep in the fissures** for a cozy exploration game set in
> ancient South Asia. Cozy colour e-ink palette: muted desaturated colour, warm paper undertone,
> gentle contrast, matte and flat, faint paper grain. The glow is warm but restrained — this is
> a quiet dangerous place, not a fire effect. Tiles seamlessly on all four edges. Crisp pixel
> art, flat colour per pixel, no anti-aliasing. No grid lines, no guide marks, no border, no
> text, no watermark, no drop shadow.

Making it renderable is two steps once the PNG exists: add the tile in
`src/game/tileTextures.ts`, and set `renderable: true` on `lava_field` in the canon repo's
`database/biomes.json`, then re-export. Both are needed — the flag is what `src/content/canon.ts`
filters on.

## Asset 3 — landmarks

Seven kinds, each **32×32**, one transparent PNG each. These are the destination — arriving at one
is the end of a session and the emotional beat the whole slice is built around — so they earn more
detail than terrain does.

**How these differ from terrain:** a landmark is an *object standing on ground*, not ground. It
must have a transparent background so it can be drawn over whatever tile it happens to occupy, it
does **not** need to tile seamlessly, and it should have a clear silhouette that reads at a glance.
The one thing it shares with terrain is the no-border rule.

The descriptions below are the game's own words from `data/landmarks.json` — the journal tells the
player exactly this, so the art needs to match it rather than reinterpret it.

| file | stands on | what the player is told they see |
| --- | --- | --- |
| `landmark-great-banyan.png` | forest, plains | One tree has become a grove. Aerial roots have come down and taken hold until the trunk cannot be told from its children, and the shade beneath is cool enough to sleep in. |
| `landmark-hot-spring.png` | hills, mountains | Water comes up out of the rock steaming, gathers in a shallow bowl worn smooth, and goes off down the slope as a thread of mist. |
| `landmark-shell-beach.png` | coast | The tideline here is entirely shells, banked knee-deep and rattling with each wave, white and pink and the occasional deep violet. |
| `landmark-hill-shrine.png` | hills, forest, plains | A low platform of fitted stone, open to the weather, with a shallow dish worn into the top step by however many hands. |
| `landmark-standing-stones.png` | mountains, desert, hills | Seven stones set upright in a rough ring, tall as a person and leaning now, with the ground between them swept bare by wind. |
| `landmark-heron-pool.png` | wetland, river | A still backwater screened by reeds, the surface unbroken except where insects touch it, and herons standing in it like they were planted. |
| `landmark-salt-pan.png` | desert | A dry white plain, cracked into plates the size of hands, glaring under the sun and giving back the heat of it. |

> **Prompt (swap in one description):**
> Top-down 32×32 pixel art of a single landmark object for a cozy exploration game set in ancient
> South Asia: **[one tree that has become a grove, aerial roots come down and taken hold until the
> trunk cannot be told from its children, cool shade beneath]**. Seen from directly above, sitting
> on open ground. Cozy colour e-ink palette: muted desaturated colour, warm paper undertone, gentle
> contrast, matte and flat, faint paper grain. A clear readable silhouette — this is the
> destination and the player should recognise it immediately. **Fully transparent background**, so
> it can be drawn over any terrain; no ground plate, no base tile, no circle or square of ground
> under it. No border, no frame, no drop shadow. Crisp pixel art, flat colour per pixel, no
> anti-aliasing. Lossless PNG with a genuine alpha channel. No grid lines, no guide marks, no text,
> no watermark.

Two of these are ground-like and worth a note. **Shell beach** and **salt pan** describe a *stretch
of ground* rather than an object; draw them as an irregular patch with soft edges that fades to
transparent, not a hard-edged square, so they sit on the coast or desert tile without cutting a
rectangle out of it.

## Asset 4 — NPC portraits

Ten people, each a small portrait. **This is new capability, not a replacement**: NPCs currently
have no art at all and appear only as text in `PlacePanel.tsx`. That makes portraits the right ask
and overworld NPC sprites the wrong one — a portrait drops into the panel that already exists,
whereas walking NPCs need renderer work that has not been written.

**Size: 32×32**, transparent PNG, head and shoulders, facing the viewer. Same palette and drawing
style as the character sheets.

These people are the heart of the writing, so the brief matters more here than anywhere else. Two
things to hold on to:

- **Nobody here is a wise elder or a quest-giver.** They are working people with jobs on, caught
  mid-task. Canon is pointed about this — Marn is "pointedly not a wise elder — he is a working
  herder with a job on."
- **No fantasy costuming.** Ordinary ancient South Asian working clothes: undyed linen and cotton,
  simple wraps, sun-worn skin, practical. The player character's blue robe is distinctive precisely
  because everyone else is plain.

| file | who | drawing note |
| --- | --- | --- |
| `npc-thrali.png` | Thrali, fisher | Delta fisher. The first person the player can help. Weathered, middle-aged, salt-bleached wrap. |
| `npc-uma.png` | Uma, roofer | Keeps the camp's roofs on. Caught mid-job, reed bundle or cut reeds to hand. |
| `npc-bekh.png` | Bekh, keeper of what is left | The one who stays because somebody has to. Older woman, plain, unsentimental. |
| `npc-sura.png` | Sura, bone-picker | Four hundred years of stratigraphy as a family trade. Practical, dusty, unbothered. |
| `npc-marn.png` | Marn, herder | A working herder, *not* a sage. Sun-squint, staff, animals somewhere off-frame. |
| `npc-teshk.png` | Teshk, well-keeper | Stays because the rope needs two people and there are not two to spare. Rope, worn hands. |
| `npc-ravi.png` | Ravi, keeper of the customs house | Four generations of custody with nothing left to be custodian of. Tidy, formal, slightly absurd dignity. |
| `npc-pell.png` | Pell, wall-keeper and sweeper | Sweeps an interdimensional gate as municipal maintenance. Broom. Entirely matter-of-fact. |
| `npc-okhi.png` | Okhi, senior copyist | The one who will not come, and is right not to. Older scholar, ink-stained, certain. |
| `npc-vessa.png` | Vessa, junior archivist | Already most of the way to the answer and cannot say so acceptably. Younger, alert, holding back. |

> **Prompt (swap in one person):**
> Small pixel art portrait, head and shoulders, facing the viewer, of **[a weathered middle-aged
> delta fisher in a salt-bleached linen wrap]** for a cozy top-down exploration game set in ancient
> South Asia. An ordinary working person caught mid-task, not a hero and not a wise elder — plain
> undyed linen and cotton, sun-worn, practical, no jewellery or ornament, no fantasy costume.
> Calm and unhurried; there is no threat in this world. Cozy colour e-ink palette: muted
> desaturated colour, warm off-cream highlights, warm near-black outlines rather than pure black,
> matte and flat. 32 pixels by 32 pixels, crisp pixel art, flat colour per pixel, hard edges, no
> anti-aliasing, no gradients. Lossless PNG with a genuine alpha channel — fully transparent
> background, not a grey checkerboard. No border, no frame, no vignette, no drop shadow. No grid,
> no guide lines, no centre cross, no alignment marks, no text, no watermark.

At 32×32 a portrait is roughly eight pixels of face, so **silhouette and colour do the work** —
headwear, hair shape, and what they are holding are what distinguish one person from another, not
facial detail. If a person needs to be recognisable, give them one strong identifying shape.

---

## Delivering them back

Drop the files in `assets/` and tell me the filenames. Notes for wiring them up:

- **Tiles** go in as a swap inside `src/game/tileTextures.ts`, which is written so real art
  replaces the generated colour-and-glyph textures without `WorldScene.ts` changing at all.
- **The player** replaces `assets/Varuna.png`. If the new sprite is clean and already small, I will
  delete `src/game/playerTexture.ts` — it exists only to average the baked-in guides out of the
  current asset.
- **Please keep each file small.** The current `Varuna.png` is 418 KB for one sprite and dominates
  the whole download. A true 24×32 sprite should be well under 2 KB.

---

## Where the character art stands

`assets/source/Varuna_walking.png` and `assets/source/Mithra.png` are the current sheets: two
characters, each sixteen figures in four rows of four. Both rebuild with `npm run build:sprite`.

The layout was measured rather than assumed, and the measurements are worth keeping because they
are how a future sheet should be checked too:

- the back row carries almost no skin-toned pixels, which is what identifies it;
- the two profile rows match each other at 71–78% when one is mirrored but only 52–61% as-is, so
  they are a genuine left/right pair rather than one row used twice;
- the face sits right of the body's centre in row 2 and left of it in row 3, which settles which is
  which;
- within a row, frames 0 and 1 barely differ below the waist while 2 and 3 move the legs, so 0/1
  are the passing pose and 2/3 are the contacts.

Row order is therefore **down, up, right, left**, and the walk plays contact-pass-contact-pass.
Nothing is mirrored at runtime: mirroring a hand-drawn walk moves the satchel to the other
shoulder, which reads as a different person on alternate steps.

These two sheets are also the first that needed no cleaning at all — real alpha, no guides, no
checkerboard. The anti-aliased edges from the emboss are handled by point sampling and the palette
snap.


Varuna's sheet is two source images concatenated — `Varuna_walking.png` for walking and
`Varuna_sitting.png` for resting — so one texture carries all 32 frames. The sitting sheet uses the
same four-row order, confirmed the same way: 5 skin-toned pixels in its back row against ~115 in the
others, and the face right of the body's centre in one profile row and left in the other.

Seated figures come out slightly shorter than standing ones, which is right. It falls out of the
aspect ratio rather than being tuned: fitting each figure into the same cell puts the seated pose at
about 38 pixels against 40 for standing.

### Still missing

1. **Sitting for Mithra.** Varuna rests at the landmark; Mithra has a walk sheet only. Not urgent
   while she is unwired, but the pair should match once she has a role.
2. **A "writing in the journal" pose**, seated with the book open. The arrival is the emotional beat
   of the whole slice, and it is currently carried by the prose and a seated figure. One frame
   facing the viewer would be enough.

> **Prompt:** One pixel art frame of the same character **seated on the ground facing the viewer,
> writing in an open book on their lap**, for a cozy top-down exploration game. Same character, same
> palette, same scale and drawing style as the existing sheets. Lossless PNG with a genuine alpha
> channel — transparent background, not a grey checkerboard. No guides, no grid, no text, no
> watermark.
