# Portrait prompts — ready to paste

Eight people, eight prompts. Copy the **style block** once, then append one **subject line**.

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

What canon *does* give, and what every line below is built from:

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

## The style block

> Watercolour portrait from a field naturalist's notebook, ancient South Asia, 4000 BCE. Painted
> with visible brush and pigment granulation on off-cream paper. Muted, low-saturation colour —
> nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient shading.
> Warm near-black for the darks, never pure black.
>
> One person, head and shoulders, seen three-quarter or side-on, filling most of the frame, with
> only a suggestion of where they are behind them — a few strokes, not a landscape. A working
> person caught mid-task or holding the tool of their trade, in plain undyed cloth. Calm and
> unhurried; nobody is posing, nobody is presiding, and nobody is smiling for a picture.
>
> Not a portrait of an important person: no jewellery, no insignia, no headdress, no fine fabric,
> no staff, no robe. Not an elder or a sage.
>
> Square image, 1024×1024. Not photographic: no lens blur, no specular highlights, no 3D render.
> No text, no caption, no label, no border, no frame, no watermark, no signature, no grid.
>
> **Subject:** *(one line from below)*

---

## Hard requirements

Every one of these is here because a plate was lost to it. They apply unchanged.

1. **No text of any kind.** Not a name, not a caption. A notebook page *looks* like it should be
   labelled, so models add labels unprompted — this is the most likely failure.
2. **No border or frame.** The panel draws its own; a painted one reads as a picture of a picture.
3. **No watermark or signature.** A mark across the subject cannot be cropped out.
4. **One subject, filling the frame.** No sheet of studies, no multiple poses, no before-and-after.
5. **Square**, and as large as the tool will give. The build downsamples and cannot invent detail.
6. **Lossless PNG.** Not JPEG.

Background is wanted, as with the plates — a portrait here is a small scene, so it is opaque and
needs no alpha channel.

---

## The eight subjects

Each line names the trade, the tool, and the place, because those three are what canon actually
records. The tool is the same one the drawn silhouette gives them, so a painted portrait and an
unpainted one agree with each other.

**thrali** — A delta fisher, a man of about forty, holding a hanging net gathered in one fist. Salt
marsh and the brick edge of a drowned harbour basin behind him. He has fished by feel for nineteen
years and has just been shown something he cannot unsee.

**uma** — A roofer, a woman of working age, a bundle of cut reeds stood on end against her shoulder.
Low kiln sheds and grey brick behind her. Practical, quick, mid-instruction — she is showing
somebody how and is not waiting for them to catch up.

**bekh** — An older woman, keeper of a camp's stores, one hand resting on a stacked clay jar. Brick
niches and the shadow of a kiln behind her. Steady and unsentimental; she has counted something four
times and it keeps coming out the same.

**marn** — A herder of working age, a man, a hooked crook held in the crook of his arm rather than
leant on. Terraced hillside and low cloud behind him. Emphatically not a wise elder — a working man
with a job on and somewhere to be.

**pell** — A wall-keeper and sweeper, a man in middle age, a long-handled broom with a splayed head
held upright. A courtyard of fitted stone behind him. He has swept the same court for eleven years
and finds nothing funny about it.

**sura** — A bone-picker, a woman of working age, a flat sieve held level in both hands. A cut bank
of shell and ash layers behind her. Sharp-eyed and matter-of-fact; she is looking at *how things
break*, not for treasure.

**okhi** — A senior copyist, an older woman, a reed stylus held over the edge of a clay tablet. Deep
shelving and stacked tablets behind her. Exacting, a little impatient, entirely certain about the
one thing she is certain about.

**vessa** — A junior archivist, a young woman, a reed stylus and a half-scored tablet held close.
Shelved records and a high window behind her. Alert and slightly guarded — she has worked something
out and has not found an acceptable way to say it.

---

## A colour cue worth keeping

The silhouettes ink each person by the language they speak, because that is the axis the game turns
on — words are learned from people, and which language a word belongs to decides who else can hear
it. If a tool will take the hint, bias the palette the same way and the two treatments stay
consistent:

- **Kia** — Bekh, Pell, Sura, Thrali — cool blue-green ground, `#3d7a8c`
- **Maru** — Marn, Okhi, Vessa — warm ochre-brown ground, `#8a6a3a`
- **Uma** speaks nothing canon has named, and takes the neutral `#6b5c6f`

Do not let it become a costume. It is a bias in the surrounding wash, not a uniform.

---

## Curating per tool

The plate queue measured all three tools against one identical block and they disagreed about
almost everything — size, format, aspect, watermark, whether a frame was painted on. That table is
in `docs/plate-prompts.md` and applies here unchanged; the build strips what it can and the
requirements above cover the rest.

The one failure specific to people: **models drift towards a serene, wise, softly-lit elder** the
moment a prompt says "ancient". If that comes back, the fix is to say the trade and the task again
rather than to add adjectives — "a herder checking a terrace wall" holds where "not wise" does not.
