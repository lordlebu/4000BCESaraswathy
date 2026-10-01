# Store kit

Everything a listing asks for, written once. Paste from here into itch.io, Newgrounds, IndieDB or
any other page, so that every place describes the same game in the same words.

Written for the audience in [publishing.md](../publishing.md): teens and adults who like to read a
world in layers. Nothing here should make the game sound like an action game or a game for children.

## Name

**South of Tethys**

Subtitle, where a listing has room for one: *Jambhudweepa Adventure*

## One line

> A slow walk through an invented ancient South Asia, with a naturalist's notebook and no enemies.

## Short description

For fields with a limit of a sentence or two.

> You are Varuna, a naturalist crossing four countries south of an ancient sea. Look closely at what
> lives there, help the people you meet, and settle among them. No combat, no timer.

## Full description

```text
South of Tethys is a slow travel game set in Jambhudweepa, an invented ancient South Asia.

You are Varuna, a naturalist. You walk four countries: a river delta at Lothal, the basalt plateau
of the Narmada, a cold desert around the harbour at Dwarka, and the Aravali crossing. What is out
as you pass records itself in your collection. The people you meet know their ground better than
you do, and what they tell you turns into places to go and things to find out.

There is no combat and no threat. Creatures are observed, not fought. The feeling is a quiet
afternoon walk with a sketchbook.

WHAT IS IN IT

- More than 340 species of animals and plants, each placed where it would live and each with its
  own written entry
- Land that gives what is standing on it: cut the rice you were reading about, and find the reed
  bed visibly worked when you come back
- A day that passes as you walk, and a night you have to answer with a roof, a camp or your bedroll
- People on the road who can be talked to and who remember you
- Three places to settle, won by listening and by being vouched for, then built in three stages
- A field diary you can keep as text or as a picture
- A seed in the address, so a journey is a link you can send to someone

WHO IT IS FOR

Players who like to read a world in layers and come back to it. It is part of a larger body of
worldbuilding, The Ark of South Tethys, and the game shows one era of it.

HOW TO PLAY

Walk with WASD or the arrow keys, or tap where you want to go. Zoom with the + and - buttons, the
mouse wheel or a pinch. Press E to take what the ground offers and R to unroll your bedding.
It plays in the browser on a computer, tablet or phone. Your journey is saved in this browser.

READ THE WORLD

Everything the game does not show -- the peoples, the events, the eras -- is in the canon:
https://south-of-tethys-canon.vercel.app/

CONTACT

Questions, bugs and thoughts: https://x.com/landofmyst
```

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Walk | WASD or arrow keys | Tap a tile |
| Zoom | `+` and `-`, mouse wheel, `0` to fit | Pinch, or the on-screen buttons |
| Take what is here, or work the ground | `E` | The button in the panel |
| Unroll the bedding | `R` | The button in the panel |

## Classification

| Field | Value |
|---|---|
| Genre | Adventure |
| Tags | exploration, worldbuilding, story-rich, atmospheric, relaxing, cozy, crafting, procedural-generation, 2d, singleplayer |
| Audience | Teens and adults |
| Rating | Teen, until the owner rules otherwise |
| Content notes | No combat, no violence shown. The wider canon holds wars and a massacre; say so if a release brings any of it into play. |
| Generative AI | Yes: graphics, text and dialogue, code. No audio. |
| Price | Free |
| Contact | <https://x.com/landofmyst> |
| Lore portal | <https://south-of-tethys-canon.vercel.app/> |

## Screenshots

Taken from the built game by `node tools/store-shots.js`, at 1280 × 720. Retake them after a
release that changes how the game looks.

| File | What it shows |
|---|---|
| `01-lothal-morning.jpg` | The Lothal delta by day: coast, wetland, river and a bridge |
| `02-narmada-noon.jpg` | The Narmada plateau: plains under forested high ground |
| `03-dwarka-evening.jpg` | Dwarka after dark, the road lit by its lamps |
| `04-collection.jpg` | The collection, with written entries for what has been met |
| `05-map-and-travellers.jpg` | The map panel: controls, who you can walk as, and the legend |

Order them as numbered. The first is the one most listings show beside the title.

## Cover image

**Made 30 September 2026, and on the itch.io page.** `cover.jpg` is 630 x 500, the size itch.io
asks for and shows wherever the game is listed; `cover@2x.jpg` is 1260 x 1000 for anywhere that
wants a larger one. The same picture, cropped, serves as the thumbnail everywhere else.

The raw is 1408 x 1117 and 2.6 MB, kept untracked at `assets/source/dump/cover.png`. Its shape is
already 630:500, so the two here are a plain resize with nothing cropped:

```bash
python -c "from PIL import Image; im=Image.open('assets/source/dump/cover.png').convert('RGB'); im.resize((630,500),Image.LANCZOS).save('docs/store-kit/cover.jpg',quality=92,optimize=True); im.resize((1260,1000),Image.LANCZOS).save('docs/store-kit/cover@2x.jpg',quality=90,optimize=True)"
```

The prompt card it was made from, in the direction `docs/art-direction.md` sets for new art:

```text
Cover illustration for a slow exploration game, 16-bit SNES-era painterly pixel art with soft
watercolour washes. An old naturalist with a white beard, a blue robe and a gold headdress stands
small in the lower third with his back half-turned, a notebook in his hand, looking out over a wide
river delta at first light. Reed beds and lotus in the foreground, a wooden footbridge, a low
harbour town of brick and thatch in the middle distance with a small wind pump turning, a basalt
plateau and snow far behind. A kingfisher on a reed near him. Calm, warm, earthy palette: ochre,
reed green, river blue, no neon. Quiet and spacious, nothing threatening. No text, no lettering,
no border. Landscape, 630x500 composition with the upper-left third kept plain for a title.
```

The title is set in type afterwards; do not ask the image model for lettering.
