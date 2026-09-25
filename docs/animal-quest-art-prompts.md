# Art for the wandering animals — ready to paste

Every image the four animal quests want, with the prompt for each. Companion to
[`plate-prompts.md`](plate-prompts.md), which owns the species-plate style block and the
per-tool notes; this file does not repeat them.

**Status, 2026-09-22: the plates and the overworld sprites are done.** Groups A and B are painted
and in the game; C, D and E are still open and all three have working fallbacks, so they land one
at a time in any order and nothing waits on them.

| Group | | |
|---|---|---|
| A · species plates | **done** | 4 painted, built to `src/ui/plates/` |
| B · overworld sprites | **done** | 12 frames, four facings each, in `assets/wanderers/` |
| C · activity scenes | open | falls back to the plain gesture painting |
| D · event paintings | open | falls back to the night's own scene |
| E · thing plates | open | falls back to a `ThingIcon` mark — **and a mark is a fine answer here** |

Read the three hard rules below before generating anything. Each one is here because an asset was
lost to it.

---

## The three that will bite

**1. The folder decides the naming convention, and the two are different.**

| Folder | Name it | Example |
|---|---|---|
| `src/ui/plates/` | **engine id** — prefix dropped, underscores to hyphens | `sivatherium.png` |
| `src/ui/things/` | **canon id, kept whole** | `item_hill_curd.png` |
| `src/ui/events/` | the event id | `event_the_milking.png` |
| `assets/wanderers/` | **engine id** | `sivatherium.png` |

Getting this backwards ships a file that draws nothing. `things/` keeps canon ids because the
making layer cross-references harder than the species layer; `plates/` converts because that is
what the species adapter does.

**2. Plates go in `assets/source/plates/`, never straight into `src/ui/plates/`.**

```bash
node tools/build-plates.js
```

That squares it, strips a painted frame, resizes to 384px and writes it under the right name. A raw
model output is 2–8 MB against ~100 KB built, and it lands under a name no species will look up — so
it ships megabytes and draws nothing. This has happened twice; `test/platesFolder.test.ts` now fails
on it.

**3. Every file added under `src/ui/` needs a line in `src/ui/art-kept.json`** or
`test/artKept.test.ts` fails by name, in both directions. It covers `plates`, `marks`, `scenes`,
`portraits`, `places`, `things` and `events` — so groups A, C, D and E below. It does **not** cover
`assets/wanderers/` (group B), which is outside `src/ui/` and needs no manifest line.

Art is never deleted here. A better painting of the same thing is a second take
(`stalk-milk.2.png`), never a replacement — and a `.2` is only ever chosen in `scenes/` and
`events/`. Anywhere else it will never draw, and the test says so. **A fauna plate takes one image
and keeps it**, because it is the record of that animal.

---

## A. Species plates — four animals ✅ done

Square, 1024×1024, watercolour. **Use the style block from
[`plate-prompts.md`](plate-prompts.md)** — the 2026-09-09 one, brighter with water in motion — and
append one subject line below. Do not paraphrase the style block; it is the thing keeping twenty-four
plates looking like one set.

Drop into `assets/source/plates/`, then run the build.

| File name | Subject line |
|---|---|
| `plate-narmada-walking-whale.png` | A whale with legs, wading in a shallow river bend — the size of a large bullock, long-jawed, with short thick limbs planted on river gravel and the water breaking around them. Its head is a whale's head and the body is a swimmer's, but it is standing. Hill country and basalt behind, water moving over stone. Calm, heavy, entirely at home. |
| `plate-sivatherium.png` | A massive giraffid built like an ox, shoulder-high to a tall man, with two pairs of horns — small and conical above the eyes, broad and flat as open palms behind them. Standing side-on, browsing the high leaves of a hill-margin tree, unhurried and unbothered by being watched. Warm plateau light. |
| `plate-vasuki-indicus.png` | An immense constricting serpent, thick through as a man's chest, coiled in the shade of a rock shelf at the edge of the day. Desert hardpan, long light, a shed skin lying pale nearby. Still and unhurried — resting, not striking, not reared, mouth closed. |
| `plate-frilled-shringasaurus.png` | A horned reptile the size of an ox with a broad bony frill spreading back over its neck, thin enough that the low sun comes through it in red. Standing its ground side-on in dry upland scrub, horns forward, entirely calm. Not roaring and not charging. |

**Say "mouth closed" to the serpent and "not roaring" to the shringasaurus twice if a tool ignores
it.** Canon's own line is that nothing in this world is snarling or hunting, and a big reptile is
where models reach for a threat pose unprompted.

---

## B. Overworld sprites — three animals ✅ done

**This is the set that replaced live placeholder code.** The game drew a generated stand-in built
from canvas primitives in `wandererMarkerKey`; art in `assets/wanderers/` now supersedes it, and
the stand-in remains as the fallback for any animal added later.

Twelve frames in: **four facings each** — right, left, down, up — for the whale, the sivatherium
and Vasuki. Full spec in [`assets/wanderers/README.md`](../assets/wanderers/README.md).

### What the next one should ask for

> **Style:** Small pixel-art sprite for a top-down 2D game, side view. Painterly pixel art with
> soft dithering, not hard-edged 8-bit. Warm naturalistic colour, readable as a silhouette at a
> glance. Fully transparent background — no ground, no scenery, no border. No text, no watermark,
> no signature.
>
> **Subject:** Four views of the same animal in one image, evenly spaced and not overlapping:
> facing right, facing left, seen from the front, seen from behind. *(then the animal)*

Four *viewpoints* is a different ask from four frames of a walk cycle, and it worked first time.
A **sequence** is the thing not to ask for — a six-cell windmill sheet once came back
pixel-identical in every cell, which is why nothing here is animated.

### Three things learned taking these in

- **Ask for the four views in one image, then split it.** `tools/build-wanderers.js` finds each
  view as a connected run of opaque pixels rather than cutting on a grid, because the three sheets
  that arrived were a row of four, a 2×2, and a row whose middle two animals *touch at the muzzle*.
  An even-quarter split cut two of them in half — measured, not guessed.
- **Paint at any size.** `sizeWanderer` fits the *side view* to the animal's box in `frames.ts`
  and draws every other facing at that height. Scaling each facing to fit on its own was tried and
  is visibly wrong: a long side view hits the width bound and shrinks while the narrow front view of
  the same animal does not, so the whale came out three times bigger walking towards you than
  walking across.
- **A view is its blob, not its bounding box.** Cutting each view by its box brought a neighbour in
  wherever one reached into it: the sivatherium's front view shipped with the side view's tail and
  hind leg down its left edge. The builder now keeps each view's own pixels and glow, and
  `test/wanderers.test.ts` refuses a painted view with a second solid piece.
- **Transparent, and check it rather than trusting the preview.** These arrived with a soft halo
  around each animal (alpha under 40) which is invisible against grass, and a maximum alpha of 254
  rather than 255, which is invisible anywhere. Neither was worth a pass to fix — but *measure the
  corner pixels* before believing a background is clear.

On screen, against a traveller's 80px and the player's 160px, every animal is fitted to the
walking whale's box, two tiles long and 139px high (`WANDERER_BOX` in `src/game/frames.ts`):
**whale 255 × 139, Vasuki 256 × 97, sivatherium 128 × 193** side-on, the giraffid alone in a taller
box of its own. It got there in three steps, each set by looking at it in the game:
- At a traveller's height, the sivatherium read as a fawn at Varuna's knee.
- At two tiles long, it stood three tiles high, two and a half times the player.
- The whale at two tiles was the one that looked right, and the sivatherium was asked to stand
  slightly taller, at half the three tiles.

---

## C. Activity scenes — the moment of doing it · open

Goes in `src/ui/scenes/`. Named `<gesture>-<something>.png`; the gestures are `stoop`, `work`,
`stalk`, `fish`, `rest`. An unpainted variant falls back to the plain gesture, which already exists —
so these are all optional polish.

Wide-ish, the same register as the existing five: **the traveller's hands and the work**, not a
specimen and not a landscape.

> **Style:** Watercolour scene from a field naturalist's notebook, ancient South Asia, 4000 BCE.
> Visible brush and pigment granulation on off-cream paper. Solarpunk light: clean, bright, sunlit
> colour with warm bounce light in the shadows. Warm near-black for the darks, never pure black.
> Close on the hands and the work, the traveller present but not posed — this is a thing being done,
> not a portrait. Calm and unhurried. Not photographic: no lens blur, no 3D render. No text, no
> caption, no border, no frame, no watermark, no signature.
>
> **Subject:** *(one line below)*

| File | Subject |
|---|---|
| `stalk-milk.png` | A man's hands at the flank of a huge browsing animal, a wooden bowl held under her, milk coming in a thin thread. The animal is standing willingly and unbothered, her head out of frame above. Warm hill light, dry grass underfoot. |
| `stalk-shed.png` | A man lifting the end of an enormous shed snakeskin off desert rock, dry as paper, the pattern running away out of frame further than seems possible. Long low light, hardpan, a rock shelf behind. |
| `stalk-venom.png` | Careful hands holding a small desert viper behind the head over the rim of a clay cup, a few drops of clear venom running down the inside. Steady, unhurried, clinical. Dry sand, a folded cloth, no drama. |

---

## D. Event paintings — the scenes with a story in them · open

Goes in `src/ui/events/`, named after the event id. **Wide: the card crops to roughly 16:7, so
compose for a band rather than a square.** An event with no painting still fires and reads — the card
borrows the night's scene.

An event painting is **a moment happening to the traveller**, not a thing he is doing.

> **Style:** Watercolour scene from a field naturalist's notebook, ancient South Asia, 4000 BCE.
> Visible brush and pigment granulation on off-cream paper. Solarpunk light: clean, bright, sunlit
> colour, warm bounce light in the shadows, luminous pigment and never neon. Warm near-black for the
> darks, never pure black. **Wide panoramic composition, roughly 16:7 — a band, not a square.** A
> moment happening rather than a pose. Calm; nothing is threatening anyone. Not photographic: no
> lens blur, no 3D render. No text, no caption, no border, no frame, no watermark, no signature.
>
> **Subject:** *(one line below)*

| File | Subject |
|---|---|
| `event_the_whale_stands_up.png` | A river bend at low light. A whale-bodied animal is rising onto four short legs out of shallow water, streaming, its long jaw turning toward a small figure standing very still on the gravel bar. The figure is far to one side and small. Basalt hills behind. Astonishment, not danger. |
| `event_the_milking.png` | A hill margin in late afternoon. A huge four-horned giraffid stands among two or three others; a herder's child walks up to her shoulder with a bowl as though to a byre, while the traveller watches from a little way off, not yet trusted. Warm gold, long shadows. |
| `event_the_shed.png` | Desert rock in low sun. An enormous snakeskin lies shed in one piece along a ledge, eye-caps intact, running most of the width of the frame. The traveller stands at one end of it, holding a lamp, looking along its length. No snake in frame. |
| `event_the_pen_behind_the_stalls.png` | A market at low tide, fish stalls and wet stone. In a small pen against a wall, a young horned reptile faces into the corner, frill dull and thick. Two traders talk in the middle distance, not looking at it. The traveller is looking at it. Quiet, ordinary, wrong. |

**The last one is the whole quest and is worth the most care.** It should read as unremarkable
market business that you happen to be seeing properly for the first time — nobody in the picture is
being cruel, which is precisely the point.

---

## E. Thing plates — the made objects · open, and optional

Goes in `src/ui/things/`, **canon ids kept whole**. These replace an emoji mark that already works,
so they are the most optional group of all.

Square. Same style block as the species plates, with the subject being an object on a plain ground
rather than an animal.

| File | Subject |
|---|---|
| `item_hill_curd.png` | A shallow clay bowl of thick pale curd, sharp-set, a wooden spoon standing upright in it. Wrapped leaves beside it. Plain warm ground, morning light. |
| `item_serpent_mantle.png` | A shoulder cloak of oiled snakeskin laid out flat, the scale pattern running unbroken from collar to hem, supple and dark with oil. Plain ground. |
| `item_antivenin.png` | A small stoppered clay vial and a strip of neem bark on a folded cloth. Clinical, plain, unglamorous. Warm neutral ground. |
| `material_shed_snakeskin.png` | A length of dry shed snakeskin, pale and translucent as paper, coiled loosely on plain ground. The pattern visible through it. |
| `material_sivatherium_milk.png` | A wooden bowl of thick yellow-white milk, plain, on a dry stone surface. |
| `material_viper_venom.png` | A few drops of clear amber venom in the bottom of a small glass-like cup, on plain ground. Nothing menacing — it is a substance, not a threat. |

---

## Where each one lands

```
assets/source/plates/plate-sivatherium.png   -> build -> src/ui/plates/sivatherium.png
assets/wanderers/sivatherium.png                             (no build; glob picks it up)
src/ui/scenes/stalk-milk.png                                 (no build)
src/ui/events/event_the_milking.png                          (no build)
src/ui/things/item_hill_curd.png                             (no build)
```

Then add every new `src/ui/` path to `art-kept.json` (the `assets/wanderers/` ones need no line),
and look at it in the game before believing it:

```bash
npx playwright test e2e/wanderers.spec.ts
```

The `Read` tool renders images — open the file rather than reasoning about it. In one session that
caught five faults a full green suite did not see.
