# Portrait prompts — ready to paste

Eight people, eight prompts. **Each one is a single block you copy whole** — jump to
[The eight prompts](#the-eight-prompts); everything before it is why they say what they say.

The pipeline is the plates' pipeline. Drop what a tool gives you into `assets/source/portraits/`
under any name and run:

```bash
node tools/build-plates.js --portraits
```

It derives the name, squares the image, strips a painted frame, drops the bottom strip a watermark
sits in, resizes to 256px and writes `src/ui/portraits/<name>.png`. Nothing else to do — no list to
update, no code to change. Anybody without a portrait keeps their drawn silhouette, so these can
arrive one at a time, in any order.

---

## What canon does and does not say

Worth reading once, because it is the whole reason these prompts are written the way they are.

**Canon records no appearance for anybody** — no age, no build, no colouring, no face. So a painted
portrait is the *game* deciding what these people look like, which is a step outside the usual
discipline that canon owns what is true. That is a deliberate call and it is recorded here rather
than hidden.

What canon *does* give, and what every prompt below is built from:

| | trade | canon pronoun | age, and the canon that implies it |
|---|---|---|---|
| Bekh | keeper of what is left | she | older — has a daughter, quotes her grandmother, has moved the camp nine times |
| Marn | herder | he | working age — canon is pointed that he is "**not** a wise elder, a working herder with a job on" |
| Okhi | **senior** copyist | she | older — the rank is canon's word |
| Pell | wall-keeper and sweeper | he | middle — "has rebuilt the inner wall once in his life and expects his son to do it again" |
| Sura | bone-picker | she | working age — a family trade she has "never been asked" about |
| Thrali | fisher | he | middle — "I have set nets by feel for nineteen years"; his grandfather is dead |
| Uma | roofer | she | working age — "has cut that reed every spring of her life" |
| Vessa | **junior** archivist | she | young — the rank is canon's word |

Pronouns for Pell, Sura and Uma are not in their own entities; they are in the discoveries and
local knowledge that mention them (`his son`, `hers`, `her life`). They were looked up rather than
assumed, and nobody here is being guessed at.

**Nobody is a wise elder.** Canon says so in as many words about Marn, and it holds for all eight:
these are working people with jobs on. No beards, no staffs, no robes, no serene knowing smiles.
Varuna the traveller has those, and the contrast is the point — he is passing through and they live
here.

**No status markers canon has not given.** No jewellery, no insignia, no headdresses, no fine cloth.
Four of these eight would not leave if asked; none of them is important in the way a picture of an
important person is important.

---

## The eight prompts

**Each block below is the whole prompt.** Copy one, paste it into an image tool, done — there is
nothing to assemble and nothing to strip. The first four paragraphs are identical in all eight;
only the subject and the colour bias change.

An earlier version of this page kept the shared part in one place and the subjects in another,
which is tidier to maintain and worse to use: it made the reader splice two halves together and
delete a column of `>` markers first. Eight near-copies is the right trade when the reader is a
person with an image tool open.

### Thrali, fisher

Save what comes back as anything you like, then build it. The file becomes `thrali.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A delta fisher, a man of about forty, holding a hanging net gathered in one fist. Salt marsh and the brick edge of a drowned harbour basin behind him. He has fished by feel for nineteen years and has just been shown something he cannot unsee.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Uma, roofer

Save what comes back as anything you like, then build it. The file becomes `uma.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A roofer, a woman of working age, a bundle of cut reeds stood on end against her shoulder. Low kiln sheds and grey brick behind her. Practical and quick, mid-instruction - she is showing somebody how and is not waiting for them to catch up.

Bias the surrounding wash neutral grey-mauve (#6b5c6f) - a tint in the paper and the shadows, not a costume.
```

### Bekh, keeper of what is left

Save what comes back as anything you like, then build it. The file becomes `bekh.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: An older woman, keeper of a camp's stores, one hand resting on a stacked clay jar. Brick niches and the shadow of a kiln behind her. Steady and unsentimental; she has counted something four times and it keeps coming out the same.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Marn, herder

Save what comes back as anything you like, then build it. The file becomes `marn.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A herder of working age, a man, a hooked crook held in the crook of his arm rather than leant on. Terraced hillside and low cloud behind him. Emphatically not a wise elder - a working man with a job on and somewhere to be.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

### Pell, wall-keeper and sweeper

Save what comes back as anything you like, then build it. The file becomes `pell.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A wall-keeper and sweeper, a man in middle age, a long-handled broom with a splayed head held upright. A courtyard of fitted stone behind him. He has swept the same court for eleven years and finds nothing funny about it.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Sura, bone-picker

Save what comes back as anything you like, then build it. The file becomes `sura.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A bone-picker, a woman of working age, a flat sieve held level in both hands. A cut bank of shell and ash layers behind her. Sharp-eyed and matter-of-fact; she is looking at how things break, not for treasure.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Okhi, senior copyist

Save what comes back as anything you like, then build it. The file becomes `okhi.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A senior copyist, an older woman, a reed stylus held over the edge of a clay tablet. Deep shelving and stacked tablets behind her. Exacting, a little impatient, entirely certain about the one thing she is certain about.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

### Vessa, junior archivist

Save what comes back as anything you like, then build it. The file becomes `vessa.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with only a suggestion of where they are behind them - a few strokes, not a landscape. A working person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A junior archivist, a young woman, a reed stylus and a half-scored tablet held close. Shelved records and a high window behind her. Alert and slightly guarded - she has worked something out and has not found an acceptable way to say it.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

---

## Why the prompts say what they say

Nothing here is a step to follow — all of it is already inside every block above. It is written
down so that a ninth person, or a reworded prompt, keeps the parts that were paid for.

**Six rules, each one earned by a lost plate.** From `docs/art-brief.md`, unchanged for portraits:

1. **No text of any kind.** A notebook page *looks* like it should be labelled, so models add
   labels unprompted. This is the most likely failure.
2. **No border or frame.** The panel draws its own; a painted one reads as a picture of a picture.
3. **No watermark or signature.** A mark across the subject cannot be cropped out.
4. **One subject, filling the frame.** No sheet of studies, no multiple poses.
5. **Square**, and as large as the tool will give. The build downsamples and cannot invent detail.
6. **Lossless PNG.** Not JPEG.

Background is wanted, as with the plates — a portrait here is a small scene, so it is opaque and
needs no alpha channel.

**The colour bias carries the language.** The drawn silhouettes ink each person by what they speak,
because that is the axis the game turns on: words are learned from people, and which language a
word belongs to decides who else can hear it. The prompts bias the wash the same way so the two
treatments agree — Kia `#3d7a8c` for Bekh, Pell, Sura and Thrali; Maru `#8a6a3a` for Marn, Okhi and
Vessa; the neutral `#6b5c6f` for Uma, who speaks nothing canon has named. It is a tint in the paper,
never a uniform.

---

## What the tools actually returned

Thrali was generated by all three against the same block, exactly as the plate queue was, and Uma
and Bekh followed. The predictions in `docs/plate-prompts.md` held without a single change:

| | source | what the build had to do |
|---|---|---|
| ChatGPT | 1254x1254 PNG | nothing — square, unframed, clean |
| Gemini | 2048x2048 PNG, 8.7 MB | **49px painted frame stripped** |
| Grok | 784x1168 PNG | **squared, bottom 117px dropped** where it signs |

**Grok's was the one that shipped, and the reason is a new failure worth naming.**

Judged at 96px, which is the size a portrait is actually displayed at, not at the 256px the build
writes or the 1024px the tool returns. Two of them survive that and one does not: ChatGPT framed
Thrali wide, with the harbour and boats behind him, so at 96px his face is perhaps 25 pixels and
the background competes with it. It is the best of the three at full size and the worst at the size
that counts.

Between the other two, a measurement settled it. **Gemini leaves a soft white vignette that the
border detector cannot see.** The hard 49px frame came off; the pale fade inside it did not,
because the rule requires four flat edges agreeing in colour and a vignette is a gradient. Measured
on the built 256px file, the outer 4% of the image sits at luminance 243 against a centre of 106 —
a 137-point halo. Grok is 153 against 105, and ChatGPT 153 against 110, both ordinary painterly
falloff.

Inside a panel that draws its own edge, that halo reads as a second frame: a picture of a picture,
which is the thing requirement 2 exists to prevent. The frame rule caught the frame and let the
vignette through.

It is worth knowing that the obvious measurement pointed the other way. Contrast and
subject-versus-edge separation both scored Gemini highest by a wide margin — because both were
measuring the halo rather than the face. **The number was real and it was answering a different
question.**

So if a tool returns a vignette, the fix is upstream: ask again for *no soft white fade at the
edges, paint to the edge of the frame*. The build cannot take it off without guessing how much of
the picture to cut.

The other failure specific to people: **models drift towards a serene, wise, softly-lit elder** the
moment a prompt says "ancient". If that comes back, the fix is to say the trade and the task again
rather than to add adjectives — "a herder checking a terrace wall" holds where "not wise" does not.

---

## Framing is the failure that costs a portrait

Two of the three shipped so far are Grok's, and both times the deciding fault was the same one:
**how much of the person is in the frame.**

Everything else the build can fix. A frame is stripped, a watermark is cropped, an 8 MB source is
resampled, a portrait aspect is squared. Framing is the one thing it cannot touch, because cropping
in on a face means guessing where the face is — and a tool that returns a half-length figure has
already spent the pixels the portrait needed.

Measured at 96px, which is the size that decides it:

- **Grok** has returned a tight head-and-shoulders every time. Thrali and Uma both ship.
- **Gemini** frames correctly and adds a soft white vignette the border rule cannot see.
- **ChatGPT** frames wide, twice. Thrali came back with the harbour and boats behind him and a face
  about 25 pixels across. Bekh came back as a half-length torso study, undressed, with the head in
  the top corner — off-brief on the framing and on the *plain undyed cloth* the block asks for, and
  not a portrait this game can use. Neither was shipped.

The block already says *head and shoulders* and *filling most of the frame*. When a tool ignores
that, adding adjectives does not help; the fix is to say the crop as a measurement — **"head and
shoulders only, the head filling the upper third of the frame, nothing below the collarbone"** —
and to generate again.

---

## Curating per tool

The plate queue measured all three tools against one identical block and they disagreed about
almost everything — size, format, aspect, watermark, whether a frame was painted on. That table is
in `docs/plate-prompts.md` and applies here unchanged; the build strips what it can and the
requirements above cover the rest.

Both failures specific to people are recorded above: the vignette, and the drift towards a wise
elder.
