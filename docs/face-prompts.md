# Stranger face prompts — ready to paste

Twenty-two faces for the road company, by people and gender. **Each block below is the whole
prompt**: copy one, paste it into an image tool, done. The first four paragraphs are the portrait
style from `docs/portrait-prompts.md`, word for word except where a portrait says "their trade"
and a stranger is simply on the road, so a face sits beside a painted portrait without looking
like a different game.

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

## Why these peoples, and these cues

The game is set in canon's **Epoch 5, after the Great Shattering** (`DESIGN.md`). Of the peoples
canon names, three are alive on these four maps in that era, and the road company are drawn from
them. See `docs/strangers-and-happenings.md` for the survey.

| Pool | Canon culture | Where canon puts them | Cues used | Wash |
|---|---|---|---|---|
| `harappan-*` | `harappan` | the delta's settlers; Lothal is their half-buried city, with survivors camped inside it | fired brick, kilns, loads, shell beads, carts | fired-brick `#8c5e4a` |
| `kia-*` | `kia` | "indigenous marsh-dwelling population of the delta", oral tradition | reeds, nets, tidewater, salt pans, mangrove | blue-green `#3d7a8c`, as Kia portraits |
| `maru-*` | `maru` | the plateau herders and the nomads of the Aravali's ford | fords, felt, goat-hair rope, curd, basalt terraces | ochre-brown `#8a6a3a`, as Maru portraits |
| `any-*` | none | anybody | hooded or wrapped, hard to place | grey-mauve `#6b5c6f`, as Uma's |

**No jewellery, even the canon kind.** Canon has a bead custom — one bead a season from a child's
birth — and it would be the truest detail here. It is left out because the portraits' rule is no
jewellery, and one face breaking it would make that face read as more important than the rest.
The bead-driller carries a bead as work instead.

---

## The prompts

### Harappan settlers (10)

#### `harappan-m-01`

Save the result as `assets/source/faces/harappan-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A carrier of about thirty, a man of the Harappan settlers, a rope-bound load frame on his back with one strap in his fist. The fired-brick street of a half-buried city behind him. Paused mid-stride, squinting down the road at how far is left.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-02`

Save the result as `assets/source/faces/harappan-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A cart-hand of about twenty, a young man of the Harappan settlers, forearms still grey with kiln ash. Low kiln sheds and stacked brick behind him. Wiping his brow with the back of a wrist, in the middle of a long day.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-03`

Save the result as `assets/source/faces/harappan-m-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A trader of about fifty, a man of the Harappan settlers, a stoppered clay jar balanced on one shoulder. A doorway in old brick courses behind him. Polite and wary, weighing up a stranger before he says anything.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-04`

Save the result as `assets/source/faces/harappan-m-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A brickmaker of about forty, a man of the Harappan settlers, a wooden brick mould tucked under one arm. Drowned courses of ancient brick behind him. Tired and good-humoured, the look of somebody who has rebuilt the same wall more than once.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-05`

Save the result as `assets/source/faces/harappan-m-05.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A road trader of about thirty-five, a man of the Harappan settlers, a knotted counting cord running through his fingers. A cart track and a brick milestone behind him. Frowning at the count, lips moving.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-m-06`

Save the result as `assets/source/faces/harappan-m-06.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A water carrier of about twenty-five, a man of the Harappan settlers, a leather water skin slung across his chest. White salt flats behind him. Thirsty himself, glancing along the road.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-01`

Save the result as `assets/source/faces/harappan-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A carrier of about thirty, a woman of the Harappan settlers, steadying a head-load with one raised hand. Fired-brick ruins behind her. Focused on the footing ahead rather than on the viewer.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-02`

Save the result as `assets/source/faces/harappan-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A kiln-tender of about forty-five, a woman of the Harappan settlers, face flushed from the heat, a long wooden rake at the lower edge. The dim mouth of a kiln behind her. Matter-of-fact, in the middle of a job that will not wait.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-03`

Save the result as `assets/source/faces/harappan-f-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A bead-driller of about twenty, a young woman of the Harappan settlers, a small bow drill and a shell bead held close at the lower edge. A workbench of broken shell behind her. Concentrating hard, not yet looking up.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

#### `harappan-f-04`

Save the result as `assets/source/faces/harappan-f-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A market trader of about fifty, a woman of the Harappan settlers, a reed basket of dried fish on her hip. An awning and brick stalls behind her. Shrewd and faintly amused, the moment before naming a price.

Bias the surrounding wash fired-brick red-brown (#8c5e4a) - a tint in the paper and the shadows, not a costume.
```

### Kia clan (6)

#### `kia-m-01`

Save the result as `assets/source/faces/kia-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A delta fisher of about thirty-five, a man of the Kia clan, a wet net over one shoulder. Reeds and tidewater behind him. Listening to something far off across the marsh.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-02`

Save the result as `assets/source/faces/kia-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A reed-cutter of about twenty, a young man of the Kia clan, a sheaf of cut reed and a bone knife at the lower edge. Mangrove roots behind him. Quick-eyed, half turned to go.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-03`

Save the result as `assets/source/faces/kia-m-03.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A marsh guide of about fifty, a man of the Kia clan, the top of a punt pole at the lower edge. Open channels and low mist behind him. Calm, skin weathered by salt wind, not a sage - he poles for a living.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-m-04`

Save the result as `assets/source/faces/kia-m-04.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A salt-raker of about thirty, a man of the Kia clan, a wooden rake over his shoulder. A white salt pan behind him. Eyes narrowed against the glare off the salt.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-f-01`

Save the result as `assets/source/faces/kia-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A keeper of remembered stories of about forty, a woman of the Kia clan, mid-recitation with one hand raised as if counting back through generations. Mangrove shade behind her. Intent on getting the order right; the clan keeps its history by mouth.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

#### `kia-f-02`

Save the result as `assets/source/faces/kia-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A crab-catcher of about twenty-five, a young woman of the Kia clan, a woven reed trap at the lower edge. Mudflats behind her. Amused at somebody's clumsiness just out of frame.

Bias the surrounding wash cool blue-green (#3d7a8c) - a tint in the paper and the shadows, not a costume.
```

### Maru herders and nomads (4)

#### `maru-m-01`

Save the result as `assets/source/faces/maru-m-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A drover of about thirty, a man of the Maru-speaking herders, a goad and a coil of goat-hair rope at the lower edge. A river ford behind him. Watching his animals somewhere past the viewer.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-m-02`

Save the result as `assets/source/faces/maru-m-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A herder of about twenty, a young man of the Maru-speaking herders, a rolled felt blanket over one shoulder. A terraced hillside and low cloud behind him. Cold wind, breath just visible.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-f-01`

Save the result as `assets/source/faces/maru-f-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A woman of about thirty-five of the Maru-speaking nomads, a skin bag of setting curd at the lower edge. A low felt tent behind her. Brisk, with somewhere to be before the light goes.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

#### `maru-f-02`

Save the result as `assets/source/faces/maru-f-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A goatherd of about twenty, a young woman of the Maru-speaking herders, the head of a kid goat held in her arm at the lower edge. A dark basalt ledge behind her. Wind in her hair, half laughing at the goat.

Bias the surrounding wash warm ochre-brown (#8a6a3a) - a tint in the paper and the shadows, not a costume.
```

### Could be anybody (2)

#### `any-01`

Save the result as `assets/source/faces/any-01.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A traveller whose age, people and gender are hard to place, a hood of plain undyed cloth half-shadowing the face. Road dust and a long empty track behind. Looking past the viewer at the road ahead.

Bias the surrounding wash neutral grey-mauve (#6b5c6f) - a tint in the paper and the shadows, not a costume.
```

#### `any-02`

Save the result as `assets/source/faces/any-02.png`.

```text
Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour - nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading. Warm near-black for the darks, never pure black.

One person, head and shoulders only: the head fills the upper third of the frame and the picture ends at the top of the chest, with at most a hint of what they carry at the lower edge. Seen three-quarter or side-on, with only a suggestion of where they are behind them - a few strokes, not a landscape. An ordinary traveller met on a road, fully clothed in plain, much-worn cloth that covers the shoulders and chest. Calm and unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.

Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric, no staff, no robe. Not an elder or a sage. Not a nude, a torso study, or a half-length figure - this is a head-and-shoulders portrait of somebody on the road.

Square image, 1024x1024. Not photographic: no lens blur, no specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.

Subject: A wanderer of indeterminate age and gender, head wrapped in plain cloth against the sun so only the eyes and brow are clear, a lean face. A pale desert-edge road behind. Steady and unreadable.

Bias the surrounding wash neutral grey-mauve (#6b5c6f) - a tint in the paper and the shadows, not a costume.
```

