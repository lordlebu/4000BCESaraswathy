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
> pure black, matte and flat. Exactly 24 pixels wide by 32 pixels tall, true pixel art, every pixel
> a flat solid colour, hard edges, no anti-aliasing, no gradients, no dithering inside the figure.
> Save as lossless PNG with a genuine alpha channel: the background must be fully transparent, not
> a grey checkerboard. No grid, no guide lines, no centre cross, no alignment marks, no drop shadow,
> no border, no text, no watermark. One centred figure filling the frame, feet at the bottom edge.

If the model insists on producing something large, that is still fine **as long as it is lossless
and the blocks are clean** — `tools/build-sprite-sheet.js` resamples any size down to the game's
grid by taking the most common colour per block, which keeps edges hard.

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

> **Prompt (adapt the terrain word each time):**
> Seamless top-down 32×32 pixel art terrain tile of **[monsoon forest canopy]** for a cozy
> exploration game set in ancient South Asia. Cozy colour e-ink palette: muted desaturated colour,
> warm paper undertone, gentle contrast, matte and flat, faint paper grain. Tiles seamlessly on all
> four edges. Crisp pixel art, flat colour per pixel, no anti-aliasing. No grid lines, no guide
> marks, no border, no text, no watermark, no drop shadow.

Terrain descriptions to swap in: *calm warm shallow sea* · *pale shell and sand shore* · *open
warm grassland* · *monsoon forest canopy* · *reed marsh with shallow pools* · *rolling ochre hill
country* · *lavender-grey rocky peaks* · *gold dust desert with low stones* · *bright river water
running over stones* · *cluster of clay-roofed huts seen from above* · *a memorable place, a small
shrine platform*.

## Asset 3 — landmarks (nice to have)

Seven kinds, each 32×32, same rules: *great banyan* · *hot spring* · *shell beach* · *hill shrine*
· *standing stones* · *heron pool* · *salt pan*.

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

`assets/source/Varuna_emboss.png` and `assets/source/Mithra.png` are the current sheets: two
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


Varuna's sheet is two source images concatenated — `Varuna_emboss.png` for walking and
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
