# Stranger face prompts — ready to paste

Twenty-two faces for the road company, by people and gender. **Each block below is the whole
prompt**: copy one, paste it into an image tool, done. The watercolour style and the head-and-
shoulders framing are the portraits' own, from `docs/portrait-prompts.md`, so a face sits beside a
painted portrait without looking like a different game. What differs is the clothing, and that
difference is deliberate — see below.

## Getting them in

Save what comes back into `assets/source/faces/` under the name each block gives, then:

```bash
node tools/build-plates.js --faces
```

It squares the image, strips a painted frame, drops the watermark strip and writes
`src/ui/faces/<name>.png` at 256px. A tool's own prefix is stripped, so
`Gemini face-kia-m-01.png` lands as `kia-m-01.png`. Add each accepted face to
`src/ui/art-kept.json`, like all art.

**Nothing waits for the set.** A stranger whose people have no faces yet is dealt one of the
`any-` faces, and failing that the drawn face in their own dyes. So these can arrive one at a
time, in any order.

## How the pool is read

`<culture>-<f|m>-NN` or `any-NN`, and nothing else — `test/faces.test.ts` refuses any other name,
because a misnamed face matches no people and is never dealt. A stranger is dealt a face from
their own people's and the `any-` ones, by rendezvous hash of who they are, so adding a face
moves only the strangers it wins.

The gender is the painting's and goes no further. Every line of event prose calls a stranger
*they*.

## How these people look, and where that comes from

**Canon says, since 25 September 2026.** Each of the three peoples carries `dress` and
`art_reference` on its culture in canon's `database/cultures.json`, set by the owner. `dress` is
canon: what the people wear. `art_reference` names real-world peoples as a reference for faces and
builds, and is marked in every entry as reference only — nobody in this world is those peoples.
Every prompt below quotes both, so a painter never has to guess.

**Why the old prompts said plain undyed cloth and no jewellery.** Canon described nobody's
appearance, and art that invented it would have been the game writing canon. That rule was right
and is still the rule for anything canon has not said; what changed is that canon now says. The
strangers on the road had worn dyed cloth all along (`src/content/looks.ts`), so the plain-cloth
prompts had quietly come to disagree with the game.

| Pool | Canon culture | Dress, from canon | Reference looks | Wash |
|---|---|---|---|---|
| `harappan-*` | `harappan` | dyed cotton; gold, silver, lapis and carnelian when they have them | Gujarat, Sindh, Punjab; women married in from beyond the realm after Bengal and Odisha | fired-brick `#8c5e4a` |
| `kia-*` | `kia` | light dyed cloth; flowers in the hair or as garlands; hair coiled, braided and pinned with shell and bone | Maharashtra, the Konkan, Kerala; some Austronesian, as far as the Philippines | blue-green `#3d7a8c` |
| `maru-*` | `maru` | fur and skin over wool and felt, dyed cloth where traded | Himachal, Nepal; some Tibetan; not all East Asian | ochre-brown `#8a6a3a` |
| `any-*` | none | whatever the road has given | hard to place | grey-mauve `#6b5c6f` |

**Each face names one of the eight dyes the sprites wear** — madder, indigo, turmeric, lac, leaf,
ochre, undyed, charcoal — so the pool covers the same palette as the road.

**Three things every prompt asks for, and why.** An individual face rather than a type, because a
people drawn as a costume is the failure most likely to come back from a generator and the most
harmful one. Fully clothed with the shoulders and chest covered, because the first portraits came
back bare-chested when nothing said otherwise. And "striking" and "full-figured" rather than
anything stronger, because image tools read the stronger words as a request to glamorise.

**The named people's portraits are unchanged.** `docs/portrait-prompts.md` still asks for plain
cloth, and the seventeen painted portraits follow it. Whether to repaint them in their people's dress
is the owner's call; nothing here assumes it.

## What arrived — 26 September 2026

**Twenty-four faces are in the pool**: all twenty-two asked for, and two the owner added —
`kia-f-03` and `maru-f-03`. Any number is fine; the pool deals whatever is there.

**Every one survived the build.** All are 8-bit PNG, RGB or RGBA, from 512 to 2048 px, so each is
built *down* to 256; none needed its colours rescued, and the automatic frame-strip took only blank
paper (up to 111 px on the 2048 px sources). Each was checked by eye at 256 px and again at 40 px,
the size the event card actually draws a face.

**Eight needed a crop, and it is a technical fix, not an art note.** A half- or full-length figure
reads at 256 px and turns into a smudge at 40, so these were cropped to head and shoulders from
the painting as it is. `--crop` is not remembered by the build, so a `--force` rebuild would undo
it — these are the commands that reproduce what shipped:

```bash
node tools/build-plates.js --faces --force --only=harappan-f-01 --crop=66,10,300
node tools/build-plates.js --faces --force --only=harappan-f-02 --crop=133,13,330
node tools/build-plates.js --faces --force --only=harappan-f-04 --crop=270,25,637
node tools/build-plates.js --faces --force --only=kia-f-01 --crop=121,0,726
node tools/build-plates.js --faces --force --only=kia-f-02 --crop=215,0,735
node tools/build-plates.js --faces --force --only=kia-f-03 --crop=235,0,735
node tools/build-plates.js --faces --force --only=kia-m-04 --crop=70,0,300
node tools/build-plates.js --faces --force --only=maru-f-02 --crop=136,0,260
```

The last also keeps a small painted signature in `maru-f-02`'s bottom corner out of the frame, and
the third a strip of painted paper edge along `harappan-f-04`'s top.

**The two asuras are in the pool as Maru, for now**, at the owner's word: `maru-m-03` (from
`maru-m-asura01`, `--crop=95,15,230`) and `maru-f-04` (from `maru-f-asuraprincess01`, uncropped).
Until the asura people are written they are dealt like any Maru face — an asura may walk as a Maru
drover. When canon gives them a people of their own, they move to that people's names; see "The
asuras" in `docs/strangers-and-happenings.md` for what that takes.

---

## The prompts

### Harappan settlers (10)

#### `harappan-m-01`

Save the result as `assets/source/faces/harappan-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A carrier of about thirty, a man whose looks follow Sindh, in a madder-red cotton shawl with a single lapis bead on a cord at his throat, a rope-bound load frame on his back with one strap in his fist. The fired-brick street of a half-buried city behind him. Paused mid-stride, squinting down the road at how far is left.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-02`

Save the result as `assets/source/faces/harappan-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A cart-hand of about twenty, a young man whose looks follow Punjab, in undyed cotton with a small silver ring in one ear, forearms still grey with kiln ash. Low kiln sheds and stacked brick behind him. Wiping his brow with the back of a wrist.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-03`

Save the result as `assets/source/faces/harappan-m-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A trader of about fifty, a man whose looks follow Gujarat, in an indigo cotton wrap, a string of carnelian beads and a gold ring, a stoppered clay jar balanced on one shoulder. A doorway in old brick courses behind him. Polite and wary, weighing up a stranger.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-04`

Save the result as `assets/source/faces/harappan-m-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A brickmaker of about forty, a man whose looks follow Punjab, in an ochre cotton wrap with a plain silver bangle, a wooden brick mould tucked under one arm. Drowned courses of ancient brick behind him. Tired and good-humoured.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-05`

Save the result as `assets/source/faces/harappan-m-05.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A road trader of about thirty-five, a man whose looks follow Gujarat, a turmeric-yellow cloth wound round his head and a knotted counting cord running through his fingers. A cart track and a brick milestone behind him. Frowning at the count, lips moving.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-06`

Save the result as `assets/source/faces/harappan-m-06.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A water carrier of about twenty-five, a man whose looks follow Sindh, in a leaf-green cotton wrap with no ornament at all, a leather water skin slung across his chest. White salt flats behind him. Thirsty himself, glancing along the road.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-01`

Save the result as `assets/source/faces/harappan-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A carrier of about thirty, a striking woman whose looks follow Gujarat, in madder-red cotton with small silver earrings and anklets just out of frame, steadying a head-load with one raised hand. Fired-brick ruins behind her. Focused on the footing ahead.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-02`

Save the result as `assets/source/faces/harappan-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A kiln-tender of about forty-five, a woman whose looks follow Sindh, in ochre cotton with a gold stud in her nose, face flushed from the heat, a long wooden rake at the lower edge. The dim mouth of a kiln behind her. Matter-of-fact, in the middle of a job that will not wait.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-03`

Save the result as `assets/source/faces/harappan-f-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A bead-driller of about twenty, a striking young woman married in from beyond the realm, whose looks follow Bengal, in lac-crimson cotton with lapis drops at her ears, a small bow drill and a shell bead held close at the lower edge. A workbench of broken shell behind her. Concentrating hard.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-04`

Save the result as `assets/source/faces/harappan-f-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: Harappan settlers. They wear cotton, wrapped and draped, dyed or left the colour of the boll, and wear their wealth where it can be seen when they have any - a little gold or silver at the ear, wrist or nose, beads of lapis lazuli or carnelian. Families take wives from beyond their realm. For faces and builds, reference the peoples of Gujarat, Sindh and Punjab (reference only).

Subject: A market trader of about fifty, a woman married in from beyond the realm, whose looks follow Odisha, in indigo cotton with heavy gold earrings, a reed basket of dried fish on her hip. An awning and brick stalls behind her. Shrewd and faintly amused, the moment before naming a price.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

### Kia clan (6)

#### `kia-m-01`

Save the result as `assets/source/faces/kia-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A delta fisher of about thirty-five, a man whose looks follow the Konkan coast, a madder-red cloth over one shoulder and a red flower tucked behind his ear, his hair coiled high and pinned with bone, a wet net over the other shoulder. Reeds and tidewater behind him. Listening to something far off across the marsh.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-02`

Save the result as `assets/source/faces/kia-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A reed-cutter of about twenty, a young man whose looks follow Austronesian peoples of the Philippines, in a leaf-green wrap, his long hair braided and tied in an ornate knot with a white flower in it, a sheaf of cut reed and a bone knife at the lower edge. Mangrove roots behind him. Quick-eyed, half turned to go.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-03`

Save the result as `assets/source/faces/kia-m-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A marsh guide of about fifty, a man whose looks follow Kerala, in undyed cloth with a string of jasmine round his neck and grey hair drawn into a careful topknot, the top of a punt pole at the lower edge. Open channels and low mist behind him. Calm, weathered by salt wind.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-04`

Save the result as `assets/source/faces/kia-m-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A salt-raker of about thirty, a man whose looks follow Maharashtra, in turmeric-yellow cloth, his hair bound in an elaborate plait pinned with shell, a wooden rake over his shoulder. A white salt pan behind him. Eyes narrowed against the glare.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-f-01`

Save the result as `assets/source/faces/kia-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A keeper of remembered stories of about forty, a full-figured woman whose looks follow Kerala, in turmeric-yellow cloth with jasmine wound through an elaborately coiled mass of hair, mid-recitation with one hand raised as if counting back through generations. Mangrove shade behind her. Intent on getting the order right.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-f-02`

Save the result as `assets/source/faces/kia-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Kia, the delta's own marsh-dwelling clan. Light wrapped cloth in the marsh's colours; flowers worn in the hair, behind the ear or as a garland; hair dressed with care - coiled, braided, pinned with shell and bone - by men and women alike. Their women are full-figured. For faces and builds, reference the peoples of Maharashtra, the Konkan coast and Kerala, and for some, Austronesian peoples as far as the Philippines (reference only).

Subject: A crab-catcher of about twenty-five, a full-figured young woman whose looks follow Austronesian peoples of the Philippines, in indigo cloth with a red hibiscus behind her ear and her hair in ornate braids pinned with shell, a woven reed trap at the lower edge. Mudflats behind her. Amused at somebody's clumsiness just out of frame.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Maru herders and nomads (4)

#### `maru-m-01`

Save the result as `assets/source/faces/maru-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Maru, newer nomads of the uplands. They dress for cold nights and high ground: animal fur and skin - goat, sheep - worn as vests, cloaks and collars over wool and felt, with dyed cloth where they have traded for it. For faces and builds, reference the peoples of Himachal and Nepal, and for some, Tibetan peoples; not everybody among them looks East Asian (reference only).

Subject: A drover of about thirty, a man whose looks follow Himachal, in a goatskin vest with the hair still on over a madder-red wool tunic, a goad and a coil of goat-hair rope at the lower edge. A river ford behind him. Watching his animals somewhere past the viewer.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-m-02`

Save the result as `assets/source/faces/maru-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Maru, newer nomads of the uplands. They dress for cold nights and high ground: animal fur and skin - goat, sheep - worn as vests, cloaks and collars over wool and felt, with dyed cloth where they have traded for it. For faces and builds, reference the peoples of Himachal and Nepal, and for some, Tibetan peoples; not everybody among them looks East Asian (reference only).

Subject: A herder of about twenty, a young man whose looks follow Nepal, in a sheepskin cloak worn fleece-inward over undyed felt, a rolled felt blanket over one shoulder. A terraced hillside and low cloud behind him. Cold wind, breath just visible.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-f-01`

Save the result as `assets/source/faces/maru-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Maru, newer nomads of the uplands. They dress for cold nights and high ground: animal fur and skin - goat, sheep - worn as vests, cloaks and collars over wool and felt, with dyed cloth where they have traded for it. For faces and builds, reference the peoples of Himachal and Nepal, and for some, Tibetan peoples; not everybody among them looks East Asian (reference only).

Subject: A woman of about thirty-five whose looks follow Tibetan peoples, in a hide coat lined with fur and an indigo sash, her hair in two long braids, a skin bag of setting curd at the lower edge. A low felt tent behind her. Brisk, with somewhere to be before the light goes.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-f-02`

Save the result as `assets/source/faces/maru-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: the Maru, newer nomads of the uplands. They dress for cold nights and high ground: animal fur and skin - goat, sheep - worn as vests, cloaks and collars over wool and felt, with dyed cloth where they have traded for it. For faces and builds, reference the peoples of Himachal and Nepal, and for some, Tibetan peoples; not everybody among them looks East Asian (reference only).

Subject: A goatherd of about twenty, a young woman whose looks follow Himachal, in a goat-hair shawl with a fur collar over an ochre wool tunic, the head of a kid goat held in her arm at the lower edge. A dark basalt ledge behind her. Wind in her hair, half laughing at the goat.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

### Could be anybody (2)

#### `any-01`

Save the result as `assets/source/faces/any-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: impossible to say. A traveller whose origin, age and gender are hard to place, dressed in whatever the road has given them.

Subject: A traveller whose age, people and gender are hard to place, a hood of plain undyed cloth half-shadowing the face. Road dust and a long empty track behind. Looking past the viewer at the road ahead.

Bias the surrounding wash neutral grey-mauve (#6b5c6f) - a tint in the paper and the shadows, not a costume.
```

#### `any-02`

Save the result as `assets/source/faces/any-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in the dress of their own people as described below, with the shoulders and chest covered. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

An individual with a face of their own - specific, dignified and unglamorised - never a costume, a type or a caricature of a people. Not an important person: no crown, no insignia, no throne-room finery, whatever their people wear day to day. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Their people: impossible to say. A traveller whose origin, age and gender are hard to place, dressed in whatever the road has given them.

Subject: A wanderer of indeterminate age and gender, head wrapped in charcoal-grey cloth against the sun so only the eyes and brow are clear, a lean face. A pale desert-edge road behind. Steady and unreadable.

Bias the surrounding wash neutral grey-mauve (#6b5c6f) - a tint in the paper and the shadows, not a costume.
```

