# Making-layer mark prompts — ready to paste

The sister of `docs/plate-prompts.md`, and much shorter, because **most of this set does not need
drawing at all.**

## What is actually missing

Canon marks the making layer by *category*, not by entity: 20 material classes, 10 item kinds,
17 processes. All 61 materials, 74 items and 82 recipes are covered by those 47 words, because a
recipe wears the mark of what it makes and a material the mark of what it is.

Of those 47, **43 have an emoji that genuinely fits** and are done — see `CLASS_MARK`, `KIND_MARK`
and `PROCESS_MARK` in `src/ui/ThingIcon.tsx`. Emoji are preferred wherever one is honest: they
theme themselves, cost nothing, need no attribution, and an exhaustive `Record` makes a missing
one a *build failure*, which a folder of files can never do.

**Four have no emoji that fits**, and they are exactly the Bronze-Age crafts Unicode never had
reason to encode:

| word | file to drop | stand-in today | why the stand-in is wrong |
|---|---|---|---|
| `casting` | `process-casting.svg` | 🫗 pouring vessel | pouring *something*, but not molten bronze into a mould |
| `grinding` | `process-grinding.svg` | ⚙️ gear | a quern is two flat stones, not a cog; the cog reads industrial |
| `pressing` | `process-pressing.svg` | 🫒 olive | the fruit, not the press — and canon presses sesame and mahua, not olives |
| `retting` | `process-retting.svg` | 🌾 sheaf | standing flax, where retting is flax *submerged and rotting* |

That is the whole queue. Four files.

## Where they go

`src/ui/marks/`, named `<namespace>-<word>` — `class-`, `kind-` or `process-`. The prefix is
required because **`physic` is both a material class and an item kind** (the bitter bark, and the
remedy made from it) and they must not share a picture.

Drop a file and it appears; nothing to register. `ThingIcon` keeps drawing the emoji until one
lands, so these can arrive one at a time and in any order.

**SVG is strongly preferred.** A mark is a line drawing at 20px, which is where a bitmap needs
three sizes and an SVG needs one — and an SVG stroked in `currentColor` themes itself for free,
the way `src/ui/ShelterMark.tsx` does. If a tool will only give you a PNG, ask for 512×512 on a
transparent background.

---

## The style block

Copy this once, then append one subject line.

> A single icon in the style of a tool-mark stamped into clay: one object, seen flat and side-on,
> drawn in even-weight dark strokes with no fill and no shading. Ancient South Asia, 4000 BCE — the
> object is wood, stone, fired clay or bronze, and nothing in it is machined or modern. Simple
> enough to read at twenty pixels: no more than about eight strokes, generous gaps, no fine
> detail, no texture, no hatching. Centred, filling most of a square frame with a small even
> margin. Pure black strokes on a fully transparent background. No colour, no gradient, no
> shadow, no perspective, no background scene, no ground line, no text, no label, no border,
> no frame, no watermark, no signature.
>
> **Subject:** *(one line from below)*

---

## Hard requirements

Carried over from `docs/art-brief.md`, where each one is written because an asset was lost to it:

1. **No text of any kind.** An icon sheet *looks* like it wants labels, so models add them
   unprompted. This is the most likely failure.
2. **No border or frame.** The panel draws its own.
3. **Transparent background**, not white. A white square is visible on the panel's paper and
   turns solid in dark theme.
4. **One object, filling the frame.** Not a scene, not a person using the tool, not a set of
   views.
5. **Square.** 512×512 or better if it is a bitmap.
6. **Readable at 20px.** This is the requirement most likely to be met on screen and failed in
   practice — check it small before accepting it.

---

## The four subjects

**`process-grinding.svg`**

> A saddle quern: one long flat stone lying on the ground with a smaller loaf-shaped hand stone
> resting on top of it, a scatter of loose grain in front. Seen from the side.

**`process-casting.svg`**

> A small crucible held in tongs, tipped, with a single line of molten metal running from its lip
> down into a flat two-piece stone mould below.

**`process-pressing.svg`**

> A simple lever press: a heavy horizontal beam weighted with a stone at one end, bearing down on
> a stacked basket of seed, with oil running into a shallow bowl beneath.

**`process-retting.svg`**

> A bundle of flax stems tied at both ends and lying submerged in a shallow pool, weighted down by
> a stone, with a waterline drawn across the bundle.

---

## What not to do

**Do not draw the other 43.** They have emoji that fit, and swapping a working emoji for a drawing
trades a build-time guarantee for a file that can go missing. If a whole hand-drawn set is wanted
later for visual coherence, that is a deliberate art decision to take all at once — not something
to arrive at by drawing one icon at a time until the emoji look inconsistent beside them.

**On icon packs.** [game-icons.net](https://game-icons.net) has all four of these (quern, crucible,
press, and a flax bundle) under CC BY 3.0. It is a good source and the fastest route. Be clear-eyed
that CC BY requires **per-icon attribution naming each artist**, which means an `ATTRIBUTION.md`,
a credits surface in the game, and third-party licence terms in a repo that currently has none.
For four icons that is a real cost against a small benefit; for a full 47-icon set it is probably
worth it.
